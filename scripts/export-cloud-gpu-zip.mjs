/**
 * EXMARK ERP — Cloud GPU Project Export Engine
 * Creates a clean, optimized ZIP archive for hosting on Cloud GPU pods / Linux VMs.
 * Automatically copies to project root and User Desktop.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ZIP_NAME = 'exmark-erp-cloud-gpu.zip';
const TARGET_ROOT_ZIP = path.join(rootDir, ZIP_NAME);
const DESKTOP_DIR = path.join(os.homedir(), 'Desktop');
const TARGET_DESKTOP_ZIP = path.join(DESKTOP_DIR, ZIP_NAME);
const STAGING_DIR = path.join(rootDir, '.temp-cloud-gpu-staging');

console.log('=== EXMARK ERP: EXPORTING CLOUD GPU PROJECT ARCHIVE ===\n');

// 1. Clean previous staging & zips
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// 2. Inclusion whitelist
const INCLUDE_DIRS = [
  'app',
  'components',
  'lib',
  'types',
  'public',
  'scripts',
  'prisma',
];

const INCLUDE_FILES = [
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'render.yaml',
  'AGENTS.md',
  'Dockerfile.cloud-gpu',
  'docker-compose.cloud-gpu.yml',
  'deploy-cloud-gpu.sh',
  '.env.cloud.example',
  'README-CLOUD-GPU.md',
];

// Helper recursive copy with ignore check
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (
        entry === 'node_modules' ||
        entry === '.next' ||
        entry === '.git' ||
        entry === 'data' ||
        entry === 'backups' ||
        entry === 'scratch' ||
        entry.endsWith('.log') ||
        entry === '.temp-cloud-gpu-staging' ||
        entry === 'dist' ||
        entry === 'android' ||
        entry === 'ios'
      ) {
        continue;
      }
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying application source trees into clean staging area...');

for (const dir of INCLUDE_DIRS) {
  const fullSrc = path.join(rootDir, dir);
  if (fs.existsSync(fullSrc)) {
    console.log(`  + Directory: ${dir}/`);
    copyRecursive(fullSrc, path.join(STAGING_DIR, dir));
  }
}

for (const file of INCLUDE_FILES) {
  const fullSrc = path.join(rootDir, file);
  if (fs.existsSync(fullSrc)) {
    console.log(`  + File: ${file}`);
    fs.copyFileSync(fullSrc, path.join(STAGING_DIR, file));
  }
}

// 3. Compress using PowerShell Compress-Archive
console.log('\nCompressing into high-efficiency ZIP archive...');

if (fs.existsSync(TARGET_ROOT_ZIP)) {
  fs.unlinkSync(TARGET_ROOT_ZIP);
}

try {
  // Use Windows native tar.exe for blazing-fast, non-locking zip compression
  execSync(`tar.exe -a -c -f "${TARGET_ROOT_ZIP}" *`, { cwd: STAGING_DIR, stdio: 'inherit' });
} catch (tarErr) {
  try {
    const psCommand = `Compress-Archive -Path '${STAGING_DIR}\\*' -DestinationPath '${TARGET_ROOT_ZIP}' -CompressionLevel Optimal -Force`;
    execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to compress archive:', err);
    process.exit(1);
  }
}

// 4. Verify file and calculate SHA-256
if (!fs.existsSync(TARGET_ROOT_ZIP)) {
  console.error('Error: Target zip file was not created.');
  process.exit(1);
}

const stats = fs.statSync(TARGET_ROOT_ZIP);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

const hash = crypto.createHash('sha256');
hash.update(fs.readFileSync(TARGET_ROOT_ZIP));
const sha256 = hash.digest('hex');

// 5. Copy to Desktop if available
let desktopCopied = false;
if (fs.existsSync(DESKTOP_DIR)) {
  try {
    fs.copyFileSync(TARGET_ROOT_ZIP, TARGET_DESKTOP_ZIP);
    desktopCopied = true;
  } catch (e) {
    console.warn('Could not copy directly to Desktop:', e.message);
  }
}

// 6. Clean up staging directory
fs.rmSync(STAGING_DIR, { recursive: true, force: true });

console.log('\n=== EXPORT COMPLETED SUCCESSFULLY! ===');
console.log(`✓ Archive:       ${TARGET_ROOT_ZIP}`);
console.log(`✓ Archive Size:  ${sizeMb} MB`);
console.log(`✓ SHA-256 Hash:  ${sha256}`);
if (desktopCopied) {
  console.log(`✓ Desktop Copy:  ${TARGET_DESKTOP_ZIP}`);
}
console.log('======================================\n');
