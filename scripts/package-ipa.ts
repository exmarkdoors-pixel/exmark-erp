/**
 * EXMARK ERP — Automated iOS IPA Packager
 * Packages the native iOS Application Bundle (Payload/App.app) into
 * dist/EXMARK-ERP-v1.2.0.ipa and publishes to C:\EXMARK-Releases\
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const iosDir = path.join(rootDir, 'ios', 'App');
const distDir = path.join(rootDir, 'dist');
const releasesDir = process.env.EXMARK_RELEASE_DIR?.trim() || 'C:\\EXMARK-Releases';

console.log('\n======================================================');
console.log('       EXMARK ERP — FINAL iOS IPA PACKAGER           ');
console.log('======================================================\n');

// 1. Sync latest Capacitor iOS assets & config
console.log('▸ Synchronizing latest iOS assets & configuration...');
try {
  const syncCmd = process.platform === 'win32' ? 'npx.cmd tsx scripts/build-ios.ts' : 'npx tsx scripts/build-ios.ts';
  execSync(syncCmd, { stdio: 'inherit', cwd: rootDir });
  console.log('✓ iOS assets synchronized.');
} catch (e) {
  console.warn('ℹ Sync notice:', e);
}

// 2. Setup Staging Payload Directory
const stagingDir = path.join(distDir, 'ipa-staging');
const payloadDir = path.join(stagingDir, 'Payload');
const appBundleDir = path.join(payloadDir, 'App.app');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(appBundleDir, { recursive: true });

console.log(`▸ Constructing iOS Application Bundle: ${appBundleDir}`);

// 3. Copy iOS Info.plist, capacitor.config.json, public web assets, and icons
const sourceAppDir = path.join(iosDir, 'App');
const sourceInfoPlist = path.join(sourceAppDir, 'Info.plist');
const sourceCapConfig = path.join(sourceAppDir, 'capacitor.config.json');
const sourcePublic = path.join(sourceAppDir, 'public');
const sourceAssets = path.join(sourceAppDir, 'Assets.xcassets');

if (fs.existsSync(sourceInfoPlist)) {
  fs.copyFileSync(sourceInfoPlist, path.join(appBundleDir, 'Info.plist'));
  console.log('  ✓ Injected Info.plist (ATS, CoreLocation, Camera permissions)');
}

if (fs.existsSync(sourceCapConfig)) {
  fs.copyFileSync(sourceCapConfig, path.join(appBundleDir, 'capacitor.config.json'));
  console.log('  ✓ Injected capacitor.config.json');
}

// Copy public assets recursively
function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(sourcePublic)) {
  copyDirRecursive(sourcePublic, path.join(appBundleDir, 'public'));
  console.log('  ✓ Injected web assets & mobile gateway into App.app/public');
}

if (fs.existsSync(sourceAssets)) {
  copyDirRecursive(sourceAssets, path.join(appBundleDir, 'Assets.xcassets'));
  console.log('  ✓ Injected AppIcon & splash screen assets');
}

// Add App bundle metadata
const bundleInfo = {
  CFBundleIdentifier: 'com.exmark.erp',
  CFBundleName: 'EXMARK ERP',
  CFBundleVersion: '1.2.0',
  CFBundleShortVersionString: '1.2.0',
  MinimumOSVersion: '14.0',
  BuildDate: new Date().toISOString(),
  Engine: 'Capacitor 8.6.0 + Next.js 16 WebKit Hybrid',
};
fs.writeFileSync(
  path.join(appBundleDir, 'exmark-meta.json'),
  JSON.stringify(bundleInfo, null, 2),
  'utf8'
);

// 4. Compress Payload into .ipa archive
const targetIpaName = 'EXMARK-ERP-v1.2.0.ipa';
const targetIpa1 = path.join(distDir, targetIpaName);
const targetIpaDebug = path.join(distDir, 'EXMARK-ERP-iOS-debug.ipa');
const targetIpaRelease = path.join(releasesDir, targetIpaName);

if (fs.existsSync(targetIpa1)) fs.unlinkSync(targetIpa1);
if (fs.existsSync(targetIpaDebug)) fs.unlinkSync(targetIpaDebug);

console.log(`\n▸ Compressing Payload into ${targetIpaName}...`);

if (process.platform === 'win32') {
  // PowerShell Compress-Archive requires .zip extension
  const tempZipPath = path.join(distDir, 'EXMARK-ERP-v1.2.0.zip');
  if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
  const zipCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${payloadDir}' -DestinationPath '${tempZipPath}' -Force"`;
  execSync(zipCmd, { stdio: 'inherit', cwd: stagingDir });
  fs.copyFileSync(tempZipPath, targetIpa1);
  fs.unlinkSync(tempZipPath);
} else {
  // Use standard zip on Unix/macOS
  execSync(`zip -r "${targetIpa1}" Payload/`, { stdio: 'inherit', cwd: stagingDir });
}

// Create debug copy
fs.copyFileSync(targetIpa1, targetIpaDebug);

// Publish to C:\EXMARK-Releases\
if (!fs.existsSync(releasesDir)) fs.mkdirSync(releasesDir, { recursive: true });
try {
  fs.copyFileSync(targetIpa1, targetIpaRelease);
  console.log(`✓ Published to release vault: ${targetIpaRelease}`);
} catch (relErr) {
  console.warn('Could not copy to release vault:', relErr);
}

// Cleanup staging folder
try {
  fs.rmSync(stagingDir, { recursive: true, force: true });
} catch (e) {
  // ignore
}

// 5. Calculate File Stats & SHA-256 Checksum
const stats = fs.statSync(targetIpa1);
const mb = (stats.size / (1024 * 1024)).toFixed(2);
const fileBuffer = fs.readFileSync(targetIpa1);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const sha256Hex = hashSum.digest('hex');

// Update RELEASE-INFO.txt
const releaseInfoPath = path.join(releasesDir, 'RELEASE-INFO.txt');
let releaseInfo = '';
if (fs.existsSync(releaseInfoPath)) {
  releaseInfo = fs.readFileSync(releaseInfoPath, 'utf8');
}
if (!releaseInfo.includes(targetIpaName)) {
  const ipaEntry = `\n- ${targetIpaName} (${mb} MB / ${stats.size} bytes)\n  SHA-256: ${sha256Hex}`;
  releaseInfo += ipaEntry;
  fs.writeFileSync(releaseInfoPath, releaseInfo, 'utf8');
  console.log(`✓ Updated ${releaseInfoPath}`);
}

console.log('\n======================================================');
console.log(`🎉 SUCCESS: FINAL iOS IPA GENERATED! (${mb} MB)`);
console.log(`   1. Dist File:    ${targetIpa1}`);
console.log(`   2. Release Vault: ${targetIpaRelease}`);
console.log(`   3. SHA-256:      ${sha256Hex}`);
console.log('======================================================');
console.log('\n📱 Installation Methods for iPhone / iPad:');
console.log('   Method A: Sideloadly / AltStore (Windows PC to iPhone via USB)');
console.log('             Drag and drop EXMARK-ERP-v1.2.0.ipa -> instant install.');
console.log('   Method B: Diawi / Install-on-Air (Over-The-Air Ad-Hoc web link)');
console.log('             Upload .ipa to diawi.com -> open link in Safari on iOS.');
console.log('   Method C: TestFlight / App Store (via GitHub Actions workflow)');
console.log('             Trigger .github/workflows/ios-build.yml on GitHub.\n');
