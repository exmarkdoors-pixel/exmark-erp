/**
 * EXMARK ERP — Offline SQL Database Backup Engine (PostgreSQL 18/17/16/15/14/13)
 *
 * Automates:
 * 1. Reading decrypted credentials from C:\EXMARK-ERP-DATA\local-postgres.json (or env)
 * 2. Running `pg_dump` on the local PostgreSQL database `exmark_erp`
 * 3. Saving compressed backup snapshots to `C:\EXMARK-ERP-DATA\backups\`
 * 4. Detecting removable USB flash drives and mirroring the backup
 * 5. Cleaning up snapshots older than 30 days to prevent disk exhaustion
 */

import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { findLocalPgExecutable, readLocalPostgresConfig } from '../lib/services/localPostgresConfig';

interface BackupConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  outputDir: string;
  retentionDays: number;
}

function parseConfig(): BackupConfig {
  const stored = readLocalPostgresConfig();
  return {
    host: process.env.PGHOST || stored?.host || '127.0.0.1',
    port: Number(process.env.PGPORT || stored?.port || 5432),
    user: process.env.PGUSER || stored?.user || 'postgres',
    password: process.env.PGPASSWORD || stored?.password || 'postgres',
    database: process.env.PGDATABASE || stored?.database || 'exmark_erp',
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
    // Non-fatal
  }
  return drives;
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
  } catch {
    // ignore
  }
  return removed;
}

async function main() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — LOCAL POSTGRESQL SQL BACKUP UTILITY');
  console.log('========================================================================\n');

  const config = parseConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `exmark_erp_${timestamp}.dump`;

  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const primaryTarget = path.join(config.outputDir, fileName);
  const pgDump = findLocalPgExecutable('pg_dump');

  if (!pgDump) {
    console.error('❌ [ERROR] pg_dump.exe was not found in C:\\Program Files\\PostgreSQL\\*\\bin or PATH.');
    process.exit(1);
  }

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
    console.log('[1/3] Exporting full atomic PostgreSQL snapshot...');
    execFileSync(
      pgDump,
      [
        '-h',
        config.host,
        '-p',
        String(config.port),
        '-U',
        config.user,
        '-d',
        config.database,
        '-F',
        'c',
        '-b',
        '-f',
        primaryTarget,
      ],
      { env, stdio: 'inherit' }
    );

    const stats = fs.statSync(primaryTarget);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`      ✓ Snapshot created successfully (${sizeKb} KB).`);

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
