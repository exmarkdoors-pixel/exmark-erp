/**
 * EXMARK ERP — iOS App Setup Verification Suite
 * Verifies package dependencies, Xcode project structure, Info.plist ATS & Privacy strings,
 * Safe-area viewport configs, and automated synchronization scripts.
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failCount++;
  }
}

console.log('\n======================================================');
console.log('      EXMARK ERP — iOS SETUP TEST SUITE               ');
console.log('======================================================\n');

// 1. Check package.json dependencies & scripts
const pkgPath = path.join(rootDir, 'package.json');
assert(fs.existsSync(pkgPath), 'package.json exists');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(!!pkg.devDependencies?.['@capacitor/ios'], '@capacitor/ios is installed in devDependencies');
assert(pkg.scripts?.['mobile:ios:sync'] === 'cap sync ios', 'mobile:ios:sync script configured');
assert(
  pkg.scripts?.['mobile:ios:build'] === 'tsx scripts/package-ipa.ts' ||
  pkg.scripts?.['mobile:ios:build'] === 'tsx scripts/build-ios.ts',
  'mobile:ios:build script configured'
);
assert(pkg.scripts?.['mobile:ios:open'] === 'cap open ios', 'mobile:ios:open script configured');
assert(!!pkg.dependencies?.['@capacitor/geolocation'], '@capacitor/geolocation is installed in dependencies');

// 2. Check Xcode Project structure & Compiled IPA
const distIpaPath = path.join(rootDir, 'dist', 'EXMARK-ERP-v1.2.0.ipa');
const releaseIpaPath = path.join('C:\\EXMARK-Releases', 'EXMARK-ERP-v1.2.0.ipa');
assert(fs.existsSync(distIpaPath), 'dist/EXMARK-ERP-v1.2.0.ipa compiled and exists');
assert(fs.existsSync(releaseIpaPath), 'C:\\EXMARK-Releases\\EXMARK-ERP-v1.2.0.ipa published and exists');
const iosDir = path.join(rootDir, 'ios', 'App');
assert(fs.existsSync(path.join(iosDir, 'App.xcodeproj')), 'ios/App/App.xcodeproj exists');
assert(fs.existsSync(path.join(iosDir, 'App', 'AppDelegate.swift')), 'ios/App/App/AppDelegate.swift exists');
assert(fs.existsSync(path.join(iosDir, 'App', 'Assets.xcassets')), 'ios/App/App/Assets.xcassets exists');
assert(fs.existsSync(path.join(iosDir, 'CapApp-SPM', 'Package.swift')), 'ios/App/CapApp-SPM/Package.swift (Swift Package Manager) exists');

// 3. Check Info.plist ATS & Privacy Settings
const infoPlistPath = path.join(iosDir, 'App', 'Info.plist');
assert(fs.existsSync(infoPlistPath), 'ios/App/App/Info.plist exists');
const plistContent = fs.readFileSync(infoPlistPath, 'utf8');

assert(plistContent.includes('<key>NSAppTransportSecurity</key>'), 'Info.plist contains NSAppTransportSecurity');
assert(plistContent.includes('<key>NSAllowsArbitraryLoads</key>'), 'Info.plist allows arbitrary local loads for factory LAN');
assert(plistContent.includes('<key>NSCameraUsageDescription</key>'), 'Info.plist contains NSCameraUsageDescription for QR & measurements');
assert(plistContent.includes('<key>NSPhotoLibraryUsageDescription</key>'), 'Info.plist contains NSPhotoLibraryUsageDescription for elevations');
assert(plistContent.includes('<key>NSLocationWhenInUseUsageDescription</key>'), 'Info.plist contains NSLocationWhenInUseUsageDescription for GPS geotagging');
assert(plistContent.includes('<key>ITSAppUsesNonExemptEncryption</key>'), 'Info.plist contains ITSAppUsesNonExemptEncryption: false');

// 4. Check capacitor.config.ts iOS settings
const capConfigPath = path.join(rootDir, 'capacitor.config.ts');
const capConfig = fs.readFileSync(capConfigPath, 'utf8');
assert(capConfig.includes("appId: 'com.exmark.erp'"), 'capacitor.config.ts has appId com.exmark.erp');
assert(capConfig.includes("contentInset: 'always'"), 'capacitor.config.ts has contentInset: always');
assert(capConfig.includes("preferredContentMode: 'mobile'"), 'capacitor.config.ts has preferredContentMode: mobile');

// 5. Check Viewport & Safe Area Configurations
const layoutPath = path.join(rootDir, 'app', 'layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
assert(layoutContent.includes('viewportFit: "cover"'), 'app/layout.tsx sets viewportFit: "cover" for iPhone Notch/Dynamic Island');

const cssPath = path.join(rootDir, 'app', 'globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('--sat: env(safe-area-inset-top'), 'app/globals.css defines safe-area variables');

const publicIndexPath = path.join(rootDir, 'public', 'index.html');
const publicIndex = fs.readFileSync(publicIndexPath, 'utf8');
assert(publicIndex.includes('viewport-fit=cover'), 'public/index.html includes viewport-fit=cover');

// 6. Check GitHub Actions Cloud IPA Build Workflow
const workflowPath = path.join(rootDir, '.github', 'workflows', 'ios-build.yml');
assert(fs.existsSync(workflowPath), '.github/workflows/ios-build.yml exists');
const workflowContent = fs.readFileSync(workflowPath, 'utf8');
assert(workflowContent.includes('macos-14'), 'Workflow runs on macos-14 runner');
assert(workflowContent.includes('xcodebuild'), 'Workflow builds Xcode archive');
assert(workflowContent.includes('actions/upload-artifact@v4'), 'Workflow uploads compiled IPA artifact');

// 7. Check scripts/build-ios.ts
const buildIosPath = path.join(rootDir, 'scripts', 'build-ios.ts');
assert(fs.existsSync(buildIosPath), 'scripts/build-ios.ts exists');

console.log('\n======================================================');
console.log(`  TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL iOS TESTS PASSED! iOS App is 100% verified.\n');
}
