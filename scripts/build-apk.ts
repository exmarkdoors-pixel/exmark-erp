/**
 * EXMARK ERP — Automated Android APK Builder
 * Syncs web assets, resolves Android SDK paths, triggers Gradle wrapper,
 * and packages the final APK into dist/ and C:\EXMARK-Releases\
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const distDir = path.join(rootDir, 'dist');
const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
const defaultSdkPath = path.join(localAppData, 'Android', 'Sdk');

console.log('\n======================================================');
console.log('  EXMARK ERP — ANDROID APK COMPILER & PACKAGER       ');
console.log('======================================================\n');

// 0. Auto-detect host LAN IP address
function detectPrimaryLanIp(): string {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.') || iface.address.startsWith('172.')) {
          return iface.address;
        }
      }
    }
  }
  return '192.168.1.3';
}

import crypto from 'crypto';

const primaryIp = detectPrimaryLanIp();
const serverPort = process.env.ERP_PORT || '4000';
const activeServerUrl = `http://${primaryIp}:${serverPort}/mobile`;
console.log(`✓ Detected Host Factory LAN IP: ${primaryIp} (${activeServerUrl})`);

// Synchronize capacitor.config.ts with active LAN IP & mobile staff gateway
const capConfigPath = path.join(rootDir, 'capacitor.config.ts');
const capConfigContent = `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.exmark.erp',
  appName: 'EXMARK Staff',
  webDir: 'public',
  server: {
    url: '${activeServerUrl}',
    cleartext: true,
    errorPath: 'index.html',
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
  },
};

export default config;
`;
fs.writeFileSync(capConfigPath, capConfigContent, 'utf8');
console.log(`✓ Updated ${capConfigPath} -> ${activeServerUrl}`);

// 1. Resolve Android SDK path
const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdkPath;
if (!fs.existsSync(sdkPath)) {
  console.error(`❌ Android SDK not found at: ${sdkPath}`);
  process.exit(1);
}
console.log(`✓ Android SDK Located: ${sdkPath}`);

// 2. Ensure android/local.properties is populated
const localPropsPath = path.join(androidDir, 'local.properties');
const sdkEscaped = sdkPath.replace(/\\/g, '/');
fs.writeFileSync(localPropsPath, `sdk.dir=${sdkEscaped}\n`, 'utf8');
console.log(`✓ Synchronized ${localPropsPath}`);

// 3. Sync capacitor web assets
console.log('▸ Syncing web assets via Capacitor...');
try {
  execSync('npx cap sync android', { stdio: 'inherit', cwd: rootDir });
  console.log('✓ Capacitor sync complete.');
} catch (err) {
  console.error('❌ Capacitor sync failed:', err);
  process.exit(1);
}

// 4. Run Gradle Build
console.log('\n▸ Compiling Android APK with Gradle wrapper...');
const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
try {
  execSync(`${gradlewCmd} assembleDebug`, {
    stdio: 'inherit',
    cwd: androidDir,
    env: {
      ...process.env,
      ANDROID_HOME: sdkPath,
      ANDROID_SDK_ROOT: sdkPath,
    },
  });
  console.log('✓ Gradle build succeeded.');
} catch (err) {
  console.error('❌ Gradle build failed:', err);
  process.exit(1);
}

// 5. Copy output artifact to dist/ and C:\EXMARK-Releases\
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const builtApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(builtApkPath)) {
  console.error(`❌ Generated APK not found at: ${builtApkPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = String(pkg.version || '1.2.1').trim();

const targetApk1 = path.join(distDir, `EXMARK-ERP-v${version}.apk`);
const targetApk2 = path.join(distDir, `EXMARK-Staff-v${version}.apk`);
const targetApk3 = path.join(distDir, 'EXMARK-ERP-Mobile-debug.apk');
const releasesDir = process.env.EXMARK_RELEASE_DIR?.trim() || 'C:\\EXMARK-Releases';
const targetApkRelease1 = path.join(releasesDir, `EXMARK-ERP-v${version}.apk`);
const targetApkRelease2 = path.join(releasesDir, `EXMARK-Staff-v${version}.apk`);

fs.copyFileSync(builtApkPath, targetApk1);
fs.copyFileSync(builtApkPath, targetApk2);
fs.copyFileSync(builtApkPath, targetApk3);

try {
  if (!fs.existsSync(releasesDir)) fs.mkdirSync(releasesDir, { recursive: true });
  fs.copyFileSync(builtApkPath, targetApkRelease1);
  fs.copyFileSync(builtApkPath, targetApkRelease2);
} catch (e) {
  console.warn('Could not copy APK to release dir:', e);
}

const stats = fs.statSync(targetApk1);
const mb = (stats.size / (1024 * 1024)).toFixed(2);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(targetApk1)).digest('hex');

// Update RELEASE-INFO.txt
const releaseInfoPath = path.join(releasesDir, 'RELEASE-INFO.txt');
try {
  const releaseInfo = `======================================================
EXMARK ERP & STAFF MOBILE SUITE v${version}
Build Timestamp: ${new Date().toISOString()}
Target Factory LAN Server: ${activeServerUrl}
======================================================

FILES IN THIS DISTRIBUTION:
- EXMARK-Staff-v${version}.apk     (${mb} MB) [Staff Terminal: Driver/Field/Installer/Floor/Manager]
  SHA256: ${sha256}
- EXMARK-ERP-v${version}.apk       (${mb} MB) [All-in-one Android Bundle]
  SHA256: ${sha256}
- EXMARK-ERP-v1.2.0.ipa       (3.78 MB)  [iOS Enterprise / Ad-Hoc Payload]
- EXMARK ERP Setup ${version}.exe  (Pending Desktop Build)   [Windows Desktop Installer]
- EXMARK ERP ${version}.exe        (Pending Desktop Build)   [Windows Standalone Portable]

OPERATIONAL STAFF ROLES CONFIGURED:
- DRIVER: Active trips, GPS navigation, gate pass, delivery sign-off
- FIELD STAFF: On-site door measurement, site audit checklist
- INSTALLER: Fitting work orders, installation sign-off, customer signatures
- FLOOR OPERATOR: CNC routing, hydraulic press, door curing, QA barcode scan
- MANAGER: Floor cockpit, live machine status, fleet tracker, order dispatch
`;
  fs.writeFileSync(releaseInfoPath, releaseInfo, 'utf8');
} catch (e) {
  console.warn('Could not write RELEASE-INFO.txt:', e);
}

console.log('\n======================================================');
console.log(`🎉 SUCCESS: Android Staff APK Generated! (${mb} MB)`);
console.log(`   SHA256: ${sha256}`);
console.log(`   1. ${targetApk1}`);
console.log(`   2. ${targetApk2}`);
console.log(`   3. ${targetApkRelease1}`);
console.log(`   4. ${targetApkRelease2}`);
console.log(`   Target Gateway: ${activeServerUrl}`);
console.log('======================================================\n');
