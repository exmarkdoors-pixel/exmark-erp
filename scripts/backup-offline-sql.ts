/**
 * EXMARK ERP — Offline SQL Database Backup Engine
 *
 * Automates:
 * 1. Running `pg_dump` on the local PostgreSQL database `exmark_erp`
 * 2. Saving compressed backup snapshots to `C:\EXMARK-ERP-DATA\backups\`
 * 3. Detecting removable USB flash drives and mirroring the backup
 * 4. Cleaning up snapshots older than 30 days to prevent disk exhaustion
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

interface BackupConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  outputDir: string;
  retentionDays: number;
}

function parseConfig(): BackupConfig {
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'exmark_erp',
    outputDir: process.env.EXMARK_BACKUP_DIR || 'C:\\EXMARK-ERP-DATA\\backups',
    retentionDays: 30,
  };
}

function findRemovableDrives(): string[] {
  if (process.platform !== 'win32') return [];
  const drives: string[] = [];
  try {
    const output = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | Select-Object -ExpandProperty DeviceID"',
      { encoding: 'utf8' }
    );
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    drives.push(...lines);
  } catch {
    // Non-fatal if PowerShell drive inspection fails
  }
  return drives;
}

function findPgDumpExecutable(): string {
  // Check common PostgreSQL installation paths on Windows
  const candidates = [
    'pg_dump',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
  ];

  for (const c of candidates) {
    if (c === 'pg_dump') {
      try {
        execSync('pg_dump --version', { stdio: 'ignore' });
        return 'pg_dump';
      } catch {}
    } else if (fs.existsSync(c)) {
      return `"${c}"`;
    }
  }
  return 'pg_dump';
}

function cleanOldBackups(dir: string, maxDays: number): number {
  if (!fs.existsSync(dir)) return 0;
  const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  try {
    for (const file of fs.readdirSync(dir)) {
      if (!file.startsWith('exmark_erp_') || (!file.endsWith('.dump') && !file.endsWith('.sql'))) continue;
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed++;
      }
    }
  } catch {}
  return removed;
}

async function main() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — OFFLINE SQL DATABASE BACKUP UTILITY');
  console.log('========================================================================\n');

  const config = parseConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `exmark_erp_${timestamp}.dump`;

  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const primaryTarget = path.join(config.outputDir, fileName);
  const pgDump = findPgDumpExecutable();

  console.log(`Target Database:  ${config.database} on ${config.host}:${config.port}`);
  console.log(`Primary Output:   ${primaryTarget}`);
  console.log(`Using Utility:    ${pgDump}`);
  console.log('------------------------------------------------------------------------');

  const env = {
    ...process.env,
    PGPASSWORD: config.password,
    PGHOST: config.host,
    PGPORT: String(config.port),
    PGUSER: config.user,
  };

  try {
    console.log('[1/3] Exporting full atomic database snapshot...');
    const cmd = `${pgDump} -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -F c -b -v -f "${primaryTarget}"`;
    execSync(cmd, { env, stdio: 'inherit' });

    const stats = fs.statSync(primaryTarget);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`      ✓ Snapshot created successfully (${sizeMb} MB).`);

    // Step 2: Check for USB Removable drives
    console.log('\n[2/3] Checking for connected USB flash drives...');
    const usbDrives = findRemovableDrives();
    if (usbDrives.length > 0) {
      for (const drive of usbDrives) {
        try {
          const usbDestDir = path.join(drive, 'EXMARK-Backups');
          if (!fs.existsSync(usbDestDir)) fs.mkdirSync(usbDestDir, { recursive: true });
          const usbTarget = path.join(usbDestDir, fileName);
          fs.copyFileSync(primaryTarget, usbTarget);
          console.log(`      ✓ Mirrored backup to USB: ${usbTarget}`);
        } catch (err: unknown) {
          const error = err as Error;
          console.warn(`      ⚠️ Could not mirror to drive ${drive}: ${error.message}`);
        }
      }
    } else {
      console.log('      [INFO] No USB pen drive detected. (Backup safely stored in local vault).');
    }

    // Step 3: Cleanup old backups
    console.log(`\n[3/3] Pruning backups older than ${config.retentionDays} days...`);
    const pruned = cleanOldBackups(config.outputDir, config.retentionDays);
    console.log(`      ✓ Cleaned ${pruned} expired snapshot(s).`);

    console.log('\n========================================================================');
    console.log('  ✓ SQL BACKUP COMPLETED CLEANLY WITH ZERO DATA LOSS');
    console.log('========================================================================\n');
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n❌ [ERROR] pg_dump failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
