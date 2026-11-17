/**
 * EXMARK ERP — Electron Self-Contained Standalone Payload Preparer
 *
 * 1. Builds production Next.js standalone server (NEXT_PUBLIC_FACTORY_MODE=true)
 * 2. Copies .next/standalone -> electron-staging/standalone
 * 3. Copies .next/static & public -> electron-staging/standalone/
 * 4. Scrubs .env*, local data/backups, and temporary artifacts so zero dev secrets leak into .exe
 * 5. Copies clean fresh-start factory JSON baselines -> electron-staging/seed-data
 * 6. Validates zero transactions in seed-data & verifies required runtime assets exist
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const nextDir = path.join(rootDir, '.next');
const standaloneSrc = path.join(nextDir, 'standalone');
const staticSrc = path.join(nextDir, 'static');
const publicSrc = path.join(rootDir, 'public');
const dataSrc = path.join(rootDir, 'data');

const stagingRoot = path.join(rootDir, 'electron-staging');
const stagedStandalone = path.join(stagingRoot, 'standalone');
const stagedSeedData = path.join(stagingRoot, 'seed-data');
const stagedRuntime = path.join(stagingRoot, 'runtime');

const TRANSACTION_ARRAY_STORES = [
  'customers-store.json',
  'leads-store.json',
  'quotations-store.json',
  'measurements-store.json',
  'production-store.json',
  'boq-store.json',
  'boq-extra-items.json',
  'purchases-store.json',
  'order-expenses-store.json',
  'whatsapp-store.json',
  'db-outbox-sync.json',
  'employees-store.json',
];

function rmSafe(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      // Ignore transient filesystem locks on Windows
    }
  }
}

function copyDirClean(src, dest, topLevelExcludeNames = new Set()) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (topLevelExcludeNames.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // Only apply repo-root exclusions at depth 0 so nested packages like node_modules/next/dist are preserved!
      copyDirClean(srcPath, destPath, new Set());
    } else if (entry.isSymbolicLink()) {
      const resolved = fs.realpathSync(srcPath);
      if (fs.statSync(resolved).isDirectory()) {
        copyDirClean(resolved, destPath, new Set());
      } else {
        fs.copyFileSync(resolved, destPath);
      }
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('========================================================================');
console.log('  EXMARK ERP — PREPARING SELF-CONTAINED WINDOWS DESKTOP STANDALONE');
console.log('========================================================================');

console.log('[0/5] Cleaning previous electron-staging & .next/standalone workspace...');
rmSafe(stagingRoot);
if (process.env.SKIP_NEXT_BUILD !== 'true') {
  rmSafe(standaloneSrc);
}

if (process.env.SKIP_NEXT_BUILD !== 'true') {
  console.log('[1/5] Running production Next.js standalone build (Factory Mode)...');
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const buildEnv = {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_PUBLIC_FACTORY_MODE: 'true',
    EXMARK_LOCAL_FACTORY: 'true',
    EXMARK_OMIT_HSTS: 'true',
    DATABASE_URL: '',
    DIRECT_URL: '',
  };
  try {
    execSync(`${npxBin} next build`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: buildEnv,
    });
  } catch {
    if (!fs.existsSync(path.join(standaloneSrc, 'server.js'))) {
      console.log('Retrying next build (acknowledging Next.js security advisory notice)...');
      execSync(`${npxBin} next build`, {
        cwd: rootDir,
        stdio: 'inherit',
        env: buildEnv,
      });
    }
  }
} else {
  console.log('[1/5] SKIP_NEXT_BUILD=true: reusing existing .next/standalone output...');
}

if (!fs.existsSync(path.join(standaloneSrc, 'server.js'))) {
  throw new Error(`Missing .next/standalone/server.js at ${standaloneSrc}. Ensure next.config.ts has output: 'standalone'.`);
}

console.log('[2/5] Preparing electron-staging directories...');
fs.mkdirSync(stagedStandalone, { recursive: true });
fs.mkdirSync(stagedSeedData, { recursive: true });
fs.mkdirSync(stagedRuntime, { recursive: true });

console.log('[3/5] Staging standalone server, static assets, @prisma runtime & clean node.exe...');
copyDirClean(standaloneSrc, stagedStandalone, new Set(['.git', 'dist', 'electron-staging', 'android', 'backups', 'scripts', 'docs']));

// Refresh runtime dependencies already selected in standalone/node_modules (skipping huge Next/SWC/Sharp traced trees)
// so Next.js standalone never misses package `dist/` entry files such as @prisma/client-runtime-utils or pg-protocol.
const SKIP_REFRESH_TOP_LEVEL = new Set(['next', '@next', '@swc', '@img', 'sharp', '.bin', '.cache']);
const stagedNodeModules = path.join(stagedStandalone, 'node_modules');
if (fs.existsSync(stagedNodeModules)) {
  for (const entry of fs.readdirSync(stagedNodeModules, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_REFRESH_TOP_LEVEL.has(entry.name)) continue;
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(stagedNodeModules, entry.name);
      for (const scopedPkg of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (!scopedPkg.isDirectory()) continue;
        const srcPkg = path.join(rootDir, 'node_modules', entry.name, scopedPkg.name);
        const destPkg = path.join(scopeDir, scopedPkg.name);
        if (fs.existsSync(srcPkg)) {
          copyDirClean(srcPkg, destPkg, new Set(['node_modules']));
        }
      }
    } else {
      const srcPkg = path.join(rootDir, 'node_modules', entry.name);
      const destPkg = path.join(stagedNodeModules, entry.name);
      if (fs.existsSync(srcPkg)) {
        copyDirClean(srcPkg, destPkg, new Set(['node_modules']));
      }
    }
  }
}

for (const pkgRel of ['@prisma', '.prisma', 'bcryptjs']) {
  const pkgSrc = path.join(rootDir, 'node_modules', pkgRel);
  const pkgDest = path.join(stagedNodeModules, pkgRel);
  if (fs.existsSync(pkgSrc)) {
    copyDirClean(pkgSrc, pkgDest);
  }
}

// Stage clean native node.exe runtime so packaged .exe boots Next.js 16 standalone in <5s offline
const runtimeNodeDest = path.join(stagedRuntime, path.basename(process.execPath));
fs.copyFileSync(process.execPath, runtimeNodeDest);

// Scrub any .env* or data/ directories that Next.js trace may have copied from workspace root
for (const entry of fs.readdirSync(stagedStandalone)) {
  if (entry.startsWith('.env') || entry === 'data' || entry === 'backups' || entry === 'dist') {
    rmSafe(path.join(stagedStandalone, entry));
  }
}

copyDirClean(staticSrc, path.join(stagedStandalone, '.next', 'static'));
copyDirClean(publicSrc, path.join(stagedStandalone, 'public'));

console.log('[4/5] Staging clean factory baseline JSON seeds (0 demo transactions)...');
const externalSeedOverride = fs.existsSync('C:\\EXMARK-ERP-DATA\\users-store.json') ? 'C:\\EXMARK-ERP-DATA' : null;

for (const file of fs.readdirSync(dataSrc)) {
  if (!file.endsWith('.json') || file.endsWith('.tmp')) continue;
  const srcFile = path.join(dataSrc, file);
  if (!fs.statSync(srcFile).isFile()) continue;

  // Verify transaction stores are strictly empty ([]) before bundling into installer
  if (TRANSACTION_ARRAY_STORES.includes(file)) {
    const parsed = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
    if (!Array.isArray(parsed) || parsed.length !== 0) {
      throw new Error(`Refusing to package non-empty transaction store ${file} (${Array.isArray(parsed) ? parsed.length : 'non-array'} entries). Run npm run erp:factory-clean first.`);
    }
  } else if (file === 'fixed-overheads-store.json') {
    const parsed = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
    if (!Array.isArray(parsed?.items) || parsed.items.length !== 0) {
      throw new Error(`Refusing to package non-empty fixed-overheads-store.json (${parsed?.items?.length ?? 'invalid'} items).`);
    }
  } else if (file === 'daybook-imports-store.json') {
    const parsed = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
    const batchCount = Array.isArray(parsed?.batches) ? parsed.batches.length : -1;
    const entryCount = Array.isArray(parsed?.entries) ? parsed.entries.length : -1;
    if (batchCount !== 0 || entryCount !== 0) {
      throw new Error(`Refusing to package non-empty daybook-imports-store.json (batches=${batchCount}, entries=${entryCount}).`);
    }
  }

  fs.copyFileSync(srcFile, path.join(stagedSeedData, file));
}

// Reset schema-version in seed-data to ensure fresh vault installs cleanly register target version
if (!fs.existsSync(path.join(stagedSeedData, 'users-store.json')) && externalSeedOverride) {
  // Note: ensureUsersStore() also auto-creates clean factory users on first launch if omitted,
  // or we don't copy custom machine users so a fresh factory install starts clean.
  console.log('      users-store.json will initialize cleanly on first boot via schemaMigrator.');
}

console.log('[5/5] Verifying staged Windows desktop assets & icon...');
const iconIco = path.join(publicSrc, 'icons', 'icon.ico');
if (!fs.existsSync(iconIco)) {
  throw new Error(`Windows icon missing at ${iconIco}`);
}

const serverJsExists = fs.existsSync(path.join(stagedStandalone, 'server.js'));
const nextServerEntryExists = fs.existsSync(
  path.join(stagedStandalone, 'node_modules', 'next', 'dist', 'server', 'next.js')
);
const turboProdRuntimeExists = fs.existsSync(
  path.join(stagedStandalone, 'node_modules', 'next', 'dist', 'compiled', 'next-server', 'app-route-turbo.runtime.prod.js')
);
const prismaUtilsExists = fs.existsSync(
  path.join(stagedStandalone, 'node_modules', '@prisma', 'client-runtime-utils', 'dist', 'index.js')
);
const pgProtocolExists = fs.existsSync(
  path.join(stagedStandalone, 'node_modules', 'pg-protocol', 'dist', 'index.js')
);
const runtimeNodeExists = fs.existsSync(path.join(stagedRuntime, path.basename(process.execPath)));
const nextPkgExists = fs.existsSync(path.join(stagedStandalone, 'node_modules', 'next', 'package.json'));
const staticExists = fs.existsSync(path.join(stagedStandalone, '.next', 'static'));
const seedFiles = fs.readdirSync(stagedSeedData).filter((f) => f.endsWith('.json'));

if (!serverJsExists || !nextPkgExists || !nextServerEntryExists || !turboProdRuntimeExists || !prismaUtilsExists || !pgProtocolExists || !runtimeNodeExists || !staticExists || seedFiles.length < 15) {
  throw new Error(
    `Staging verification failed: serverJs=${serverJsExists}, nextPkg=${nextPkgExists}, nextServerEntry=${nextServerEntryExists}, turboProdRuntime=${turboProdRuntimeExists}, prismaUtils=${prismaUtilsExists}, pgProtocol=${pgProtocolExists}, runtimeNode=${runtimeNodeExists}, static=${staticExists}, seedCount=${seedFiles.length}`
  );
}

console.log(`✓ Staging complete cleanly:`);
console.log(`  - Standalone server: ${stagedStandalone}`);
console.log(`  - Clean factory seed JSONs: ${seedFiles.length} stores (0 demo transactions verified)`);
console.log('========================================================================\n');
