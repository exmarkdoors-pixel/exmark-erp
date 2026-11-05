/**
 * EXMARK ERP — Automated Android APK Builder
 * Syncs web assets, resolves Android SDK paths, triggers Gradle wrapper,
 * and packages the final APK into dist/
 */

import fs from 'fs';
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

// 5. Copy output artifact to dist/
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const builtApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(builtApkPath)) {
  console.error(`❌ Generated APK not found at: ${builtApkPath}`);
  process.exit(1);
}

const targetApk1 = path.join(distDir, 'EXMARK-ERP-v0.1.0.apk');
const targetApk2 = path.join(distDir, 'EXMARK-ERP-Mobile-debug.apk');

fs.copyFileSync(builtApkPath, targetApk1);
fs.copyFileSync(builtApkPath, targetApk2);

const stats = fs.statSync(targetApk1);
const mb = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n======================================================');
console.log(`🎉 SUCCESS: Android APK Generated! (${mb} MB)`);
console.log(`   1. ${targetApk1}`);
console.log(`   2. ${targetApk2}`);
console.log('======================================================\n');
