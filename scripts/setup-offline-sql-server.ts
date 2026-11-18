/**
 * EXMARK ERP — Offline PostgreSQL SQL Server Setup & Schema Initializer
 *
 * Automates:
 * 1. Probing local PostgreSQL Windows Service (18/17/16/15/14) on 127.0.0.1:5432
 * 2. Creating `exmark_erp` relational database if missing
 * 3. Saving AES-256-GCM encrypted credentials to C:\EXMARK-ERP-DATA\local-postgres.json
 * 4. Deploying Prisma relational schema (30+ tables & indexes) via `prisma db push`
 * 5. Syncing all live JSON vault stores into `exmark_vault_stores` & relational tables
 * 6. Updating `.env.local` with URL-encoded local PostgreSQL connection string
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import crypto from 'crypto';
import pg from 'pg';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  buildLocalPostgresUrl,
  detectLocalPostgresInstallation,
  saveLocalPostgresConfig,
} from '../lib/services/localPostgresConfig';
import { getDataDir } from '../lib/utils/dataPaths';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

interface SetupConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  migrateJson: boolean;
}

function parseArgs(): SetupConfig {
  const args = process.argv.slice(2);
  const config: SetupConfig = {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'exmark_erp',
    migrateJson: true,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--no-json-migrate') config.migrateJson = false;
    else if (a === '--host' && args[i + 1]) config.host = args[++i];
    else if (a === '--port' && args[i + 1]) config.port = Number(args[++i]);
    else if (a === '--user' && args[i + 1]) config.user = args[++i];
    else if (a === '--password' && args[i + 1]) config.password = args[++i];
    else if (a === '--database' && args[i + 1]) config.database = args[++i];
  }

  return config;
}

function checkPortOpen(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, host);
  });
}

async function ensureDatabaseExists(config: SetupConfig): Promise<{ ok: boolean; version?: string }> {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
    connectionTimeoutMillis: 4000,
  });

  try {
    await client.connect();
    const verRes = await client.query('SELECT version() AS v');
    const shortVer = String(verRes.rows[0]?.v || '').split(',')[0];

    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );

    if (res.rowCount === 0) {
      console.log(`[SQL Setup] Database '${config.database}' not found. Creating database...`);
      const safeDb = config.database.replace(/[^a-zA-Z0-9_]/g, '');
      await client.query(`CREATE DATABASE "${safeDb}" WITH ENCODING 'UTF8';`);
      console.log(`[SQL Setup] ✓ Database '${safeDb}' created successfully.`);
    } else {
      console.log(`[SQL Setup] ✓ Database '${config.database}' already exists.`);
    }
    await client.end();
    return { ok: true, version: shortVer };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[SQL Setup] Failed to connect to PostgreSQL: ${error.message}`);
    try {
      await client.end();
    } catch {
      // ignore
    }
    return { ok: false };
  }
}

async function syncAllVaultJsonFilesToSql(config: SetupConfig): Promise<{ synced: number; tables: number }> {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 4000,
  });

  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS exmark_vault_stores (
        store_name TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        sha256_hash TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const dataDir = getDataDir();
    const excluded = new Set([
      'local-postgres.json',
      'cloud-sync-state.json',
      'db-outbox-sync.json',
      'cloud-tunnel.json',
      'cloud-tunnel-config.json',
    ]);

    let synced = 0;
    if (fs.existsSync(dataDir)) {
      const files = fs
        .readdirSync(dataDir)
        .filter((f) => f.endsWith('.json') && !f.startsWith('.') && !excluded.has(f));

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          await client.query(
            `
            INSERT INTO exmark_vault_stores (store_name, payload_json, sha256_hash, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (store_name)
            DO UPDATE SET payload_json = EXCLUDED.payload_json, sha256_hash = EXCLUDED.sha256_hash, updated_at = NOW();
            `,
            [file, content, hash]
          );
          synced++;
        } catch {
          // continue on individual unreadable file
        }
      }
    }

    const tblRes = await client.query(
      "SELECT COUNT(*)::int AS cnt FROM pg_tables WHERE schemaname = 'public'"
    );
    return { synced, tables: Number(tblRes.rows[0]?.cnt || 0) };
  } finally {
    await client.end().catch(() => {});
  }
}

function updateEnvLocal(databaseUrl: string): void {
  const envLocalPath = path.join(rootDir, '.env.local');
  let content = '';
  if (fs.existsSync(envLocalPath)) {
    content = fs.readFileSync(envLocalPath, 'utf8');
  }

  const lines = content.split(/\r?\n/);
  let hasDbUrl = false;
  let hasDirectUrl = false;
  let hasLocalFactory = false;

  const nextLines = lines
    .filter((line) => !line.startsWith('EXMARK_CLOUD_DATABASE_URL='))
    .map((line) => {
      if (line.startsWith('DATABASE_URL=')) {
        hasDbUrl = true;
        return `DATABASE_URL="${databaseUrl}"`;
      }
      if (line.startsWith('DIRECT_URL=')) {
        hasDirectUrl = true;
        return `DIRECT_URL="${databaseUrl}"`;
      }
      if (line.startsWith('EXMARK_LOCAL_FACTORY=')) {
        hasLocalFactory = true;
        return 'EXMARK_LOCAL_FACTORY=true';
      }
      return line;
    });

  if (!hasDbUrl) nextLines.push(`DATABASE_URL="${databaseUrl}"`);
  if (!hasDirectUrl) nextLines.push(`DIRECT_URL="${databaseUrl}"`);
  if (!hasLocalFactory) nextLines.push('EXMARK_LOCAL_FACTORY=true');

  fs.writeFileSync(envLocalPath, nextLines.join('\n').trim() + '\n', 'utf8');
  console.log('[SQL Setup] ✓ Updated .env.local with local PostgreSQL URL.');
}

async function main() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — LOCAL POSTGRESQL SQL SERVER CONFIGURATOR');
  console.log('  Factory Relational Database & Vault Initializer');
  console.log('========================================================================\n');

  const config = parseArgs();
  const install = detectLocalPostgresInstallation();

  console.log(`Detected Engine:    ${install.versionDetected || 'PostgreSQL'} (${install.serviceName || 'Local Service'}: ${install.serviceStatus})`);
  console.log(`Target SQL Server:  ${config.host}:${config.port}`);
  console.log(`Database Name:      ${config.database}`);
  console.log(`Database User:      ${config.user}`);
  console.log('------------------------------------------------------------------------');

  // Step 1: Check TCP Port
  console.log(`[1/5] Checking if PostgreSQL is listening on ${config.host}:${config.port}...`);
  const isOpen = await checkPortOpen(config.host, config.port);
  if (!isOpen) {
    console.error(`\n❌ [ERROR] PostgreSQL is NOT responding on ${config.host}:${config.port}.`);
    console.error('Please start your PostgreSQL Windows Service (e.g. postgresql-x64-18) via services.msc.');
    process.exit(1);
  }
  console.log(`      ✓ PostgreSQL service detected online on port ${config.port}.`);

  // Step 2: Ensure database exists
  console.log(`\n[2/5] Authenticating & verifying database '${config.database}'...`);
  const dbCheck = await ensureDatabaseExists(config);
  if (!dbCheck.ok) {
    console.error(`\n❌ [ERROR] Could not authenticate to PostgreSQL with user '${config.user}'.`);
    console.error('Re-run with: npx.cmd tsx scripts/setup-offline-sql-server.ts --password YOUR_PASSWORD');
    process.exit(1);
  }
  if (dbCheck.version) {
    console.log(`      ✓ Verified Engine: ${dbCheck.version}`);
  }

  const databaseUrl = buildLocalPostgresUrl(config);

  // Step 3: Save encrypted vault config & update .env.local
  console.log('\n[3/5] Saving AES-256-GCM encrypted local-postgres.json & updating .env.local...');
  saveLocalPostgresConfig({
    enabled: true,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });
  updateEnvLocal(databaseUrl);
  console.log('      ✓ Saved encrypted C:\\EXMARK-ERP-DATA\\local-postgres.json (shared with Desktop .exe).');

  // Step 4: Deploy Prisma Relational Schema
  console.log(`\n[4/5] Deploying Prisma Relational Schema to '${config.database}'...`);
  try {
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
    };
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxBin} prisma db push`, {
      cwd: rootDir,
      env,
      stdio: 'inherit',
    });
    console.log('      ✓ All Prisma relational tables, foreign keys, and indexes deployed cleanly.');
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n❌ [ERROR] Prisma db push failed: ${error.message}`);
    process.exit(1);
  }

  // Step 5: Sync Vault JSON stores + optional relational migration
  if (config.migrateJson) {
    console.log('\n[5/5] Syncing all live C:\\EXMARK-ERP-DATA vault stores into PostgreSQL...');
    const vaultRes = await syncAllVaultJsonFilesToSql(config);
    console.log(`      ✓ Synced ${vaultRes.synced} factory JSON vault stores into exmark_vault_stores.`);
    console.log(`      ✓ Total PostgreSQL public tables active: ${vaultRes.tables}.`);

    try {
      process.env.DATABASE_URL = databaseUrl;
      process.env.DIRECT_URL = databaseUrl;
      const { runMigration } = await import('./migrate-json-to-postgres');
      const summary = await runMigration({ dryRun: false });
      console.log(`      ✓ Relational entity migration completed in ${summary.executionTimeMs}ms (${summary.storesAnalyzed} stores analyzed).`);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn(`      ⚠️ Relational entity migration note: ${error.message}`);
    }
  } else {
    console.log('\n[5/5] Skipping JSON migration (--no-json-migrate passed).');
  }

  console.log('\n========================================================================');
  console.log('  ✓ LOCAL POSTGRESQL SERVER SETUP COMPLETED SUCCESSFULLY!');
  console.log('========================================================================');
  console.log(`  Database:       ${config.database} @ ${config.host}:${config.port}`);
  console.log('  Vault Config:   C:\\EXMARK-ERP-DATA\\local-postgres.json (Encrypted)');
  console.log('  Mode:           100% Local Factory PostgreSQL Primary');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during SQL Server setup:', err);
  process.exit(1);
});
