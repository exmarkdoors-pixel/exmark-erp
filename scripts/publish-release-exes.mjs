/**
 * EXMARK ERP — Release EXE Publisher & Old-Build Cleaner
 *
 * Publishes verified Setup & Portable Windows .exe binaries from ./dist
 * into a clean standalone release folder (default: C:\EXMARK-Releases\),
 * generates RELEASE-INFO.txt with SHA-256 digests, and maintains a Windows
 * Desktop shortcut ("EXMARK ERP Releases.lnk") without touching C:\EXMARK-ERP-DATA.
 *
 * Flags:
 *   --clean-old   Remove superseded desktop EXE versions (e.g. 1.0.0) and stale *.tmp locks after publishing
 *   --open        Open C:\EXMARK-Releases in Windows Explorer when done
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = process.env.EXMARK_RELEASE_DIR?.trim() || 'C:\\EXMARK-Releases';
const MIN_EXE_BYTES = 50 * 1024 * 1024; // 50 MB sanity check for full self-contained binaries

function parseFlags(argv) {
  return {
    cleanOld: argv.includes('--clean-old'),
    openFolder: argv.includes('--open'),
  };
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function copyAtomic(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmpDest = `${dest}.tmp`;
  if (fs.existsSync(tmpDest)) {
    fs.rmSync(tmpDest, { force: true });
  }
  fs.copyFileSync(src, tmpDest);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { force: true });
      }
      fs.renameSync(tmpDest, dest);
      return;
    } catch (err) {
      if (attempt === 5) throw err;
      const until = Date.now() + 300 * attempt;
      while (Date.now() < until) {
        // Brief pause for Windows Defender scan release
      }
    }
  }
}

function createDesktopShortcut(targetFolder) {
  if (process.platform !== 'win32') return false;
  const desktopDir = path.join(os.homedir(), 'Desktop');
  if (!fs.existsSync(desktopDir)) return false;

  const shortcutPath = path.join(desktopDir, 'EXMARK ERP Releases.lnk');
  const iconCandidate = path.join(rootDir, 'public', 'icons', 'icon.ico');
  const iconPath = fs.existsSync(iconCandidate)
    ? `${iconCandidate},0`
    : 'C:\\Windows\\System32\\imageres.dll,3';

  try {
    execSync(
      'powershell -NoProfile -NonInteractive -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:EXM_LNK); $s.TargetPath = $env:EXM_TARGET; $s.WorkingDirectory = $env:EXM_TARGET; $s.Description = \'EXMARK ERP Final Windows Installers & Portable EXEs\'; $s.IconLocation = $env:EXM_ICON; $s.Save()"',
      {
        stdio: 'ignore',
        env: {
          ...process.env,
          EXM_LNK: shortcutPath,
          EXM_TARGET: targetFolder,
          EXM_ICON: iconPath,
        },
      }
    );
    return shortcutPath;
  } catch (err) {
    console.warn(`[Publish EXE] Could not create Desktop shortcut: ${err.message}`);
    return false;
  }
}

function cleanupOldArtifacts(currentVersion) {
  let removed = 0;
  const desktopVersionedPattern = /^(EXMARK ERP(?: Setup)? ([\d.]+)\.exe(?:\.blockmap)?|exmark-erp-([\d.]+)-.*\.nsis\.7z)$/i;

  for (const folder of [distDir, releaseDir]) {
    if (!fs.existsSync(folder)) continue;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory() && /^win-unpacked\.tmp$/i.test(entry.name)) {
        try {
          fs.rmSync(full, { recursive: true, force: true });
          removed++;
          console.log(`  - Cleaned stale temp dir: ${full}`);
        } catch (err) {
          console.warn(`  ! Could not remove ${full}: ${err.message}`);
        }
        continue;
      }
      if (entry.isFile() && /^win-unpacked\.tmp\.lock$/i.test(entry.name)) {
        try {
          fs.rmSync(full, { force: true });
          removed++;
          console.log(`  - Cleaned stale lock file: ${full}`);
        } catch (err) {
          console.warn(`  ! Could not remove ${full}: ${err.message}`);
        }
        continue;
      }

      const match = entry.name.match(desktopVersionedPattern);
      if (match) {
        const artifactVersion = match[2] || match[3];
        if (artifactVersion && artifactVersion !== currentVersion) {
          try {
            fs.rmSync(full, { force: true });
            removed++;
            console.log(`  - Cleaned superseded v${artifactVersion} artifact: ${full}`);
          } catch (err) {
            console.warn(`  ! Could not remove ${full}: ${err.message}`);
          }
        }
      }
    }
  }
  return removed;
}

async function main() {
  const { cleanOld, openFolder } = parseFlags(process.argv.slice(2));
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = String(pkg.version || '1.0.1').trim();
  const productName = 'EXMARK ERP';

  const expectedNames = [
    `${productName} Setup ${version}.exe`,
    `${productName} ${version}.exe`,
  ];

  const published = [];
  fs.mkdirSync(releaseDir, { recursive: true });

  console.log('========================================================================');
  console.log(`  EXMARK ERP v${version} — PUBLISHING FINAL WINDOWS EXEs`);
  console.log(`  Target Release Hub: ${releaseDir}`);
  console.log('========================================================================');

  for (const fileName of expectedNames) {
    const srcPath = path.join(distDir, fileName);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  ! Skipping missing build artifact: ${srcPath}`);
      continue;
    }
    const stat = fs.statSync(srcPath);
    if (stat.size < MIN_EXE_BYTES) {
      throw new Error(`Refusing to publish suspiciously small EXE (${stat.size} bytes): ${srcPath}`);
    }

    const destPath = path.join(releaseDir, fileName);
    copyAtomic(srcPath, destPath);
    const sha256 = await sha256File(destPath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    published.push({ fileName, destPath, sizeBytes: stat.size, sizeMb, sha256 });
    console.log(`  ✓ Published ${fileName} (${sizeMb} MB) -> ${destPath}`);
  }

  if (published.length === 0) {
    throw new Error(`No compiled v${version} .exe installers found in ${distDir}. Run "npm run desktop:build" first.`);
  }

  const nextVersion = pkg.dependencies?.next || '16.4.6';
  const infoLines = [
    `EXMARK ERP v${version} — Official Polished Windows Releases`,
    `Published At: ${new Date().toISOString()}`,
    `Framework Runtime: Next.js ${nextVersion} (Standalone) + Local PostgreSQL 18 SQL Server Ready`,
    `Release Folder: ${releaseDir}`,
    `Live Factory Data Vault (Untouched): C:\\EXMARK-ERP-DATA`,
    `Installed App Default Path (NSIS): %LocalAppData%\\Programs\\EXMARK ERP\\EXMARK ERP.exe`,
    '',
    'Key Release Highlights:',
    '- Local PostgreSQL 18 SQL Server integration with encrypted vault credentials & pg_dump backups',
    '- Fixed Quotation PDF colour accuracy for renamed & custom factory colours across all Tally & Vyapar themes',
    '- New 12L After-Packing Site Verification Pass (99x44mm, 2x6 A4 Grid) with Frame Opening, Finish Door, QR & Sign-Off',
    '- Simple UI Mode, Excel (.xlsx/.xls) Bulk Lead Import, and Hardened TryCloudflare Tunnel',
    '- Polished Desktop Shell (Live Local PG status in menu, About dialog, fixed SemVer updater & Ctrl+U)',
    '',
    'Verified Executables & SHA-256 Checksums:',
    ...published.map(
      (p) => `- ${p.fileName} (${p.sizeMb} MB / ${p.sizeBytes} bytes)\n  SHA-256: ${p.sha256}`
    ),
    '',
  ];
  fs.writeFileSync(path.join(releaseDir, 'RELEASE-INFO.txt'), infoLines.join('\r\n'), 'utf8');

  // Copy Offline SQL Server setup utilities & 1-click Local PostgreSQL 18 installer to C:\EXMARK-Releases\
  const rootInstallerBat = 'Install-EXMARK-Local-PostgreSQL.bat';
  const rootBatSrc = path.join(rootDir, rootInstallerBat);
  if (fs.existsSync(rootBatSrc)) {
    const dest = path.join(releaseDir, rootInstallerBat);
    copyAtomic(rootBatSrc, dest);
    console.log(`  ✓ Copied Local PostgreSQL 18 helper: ${rootInstallerBat} -> ${dest}`);
  }

  const scriptsDir = path.join(rootDir, 'scripts');
  const sqlHelperFiles = [
    'setup-offline-sql-server.bat',
    'backup-offline-sql.bat',
    'README-SQL-SERVER-SETUP.txt',
  ];
  for (const f of sqlHelperFiles) {
    const src = path.join(scriptsDir, f);
    const dest = path.join(releaseDir, f);
    if (fs.existsSync(src)) {
      copyAtomic(src, dest);
      console.log(`  ✓ Copied offline SQL helper: ${f} -> ${dest}`);
    }
  }

  const shortcutPath = createDesktopShortcut(releaseDir);
  if (shortcutPath) {
    console.log(`  ✓ Desktop Shortcut Ready: ${shortcutPath}`);
  }

  if (cleanOld) {
    const removed = cleanupOldArtifacts(version);
    console.log(`  ✓ Cleaned ${removed} superseded build file(s)/lock(s); C:\\EXMARK-ERP-DATA untouched.`);
  }

  if (openFolder && process.platform === 'win32') {
    spawn('explorer.exe', [releaseDir], { detached: true, stdio: 'ignore' }).unref();
  }

  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error(`\n✗ PUBLISH FAILED: ${err.message}\n`);
  process.exit(1);
});
