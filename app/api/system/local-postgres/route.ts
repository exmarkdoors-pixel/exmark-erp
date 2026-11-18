import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { Client } from 'pg';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  buildLocalPostgresUrl,
  detectLocalPostgresInstallation,
  findLocalPgExecutable,
  getMaskedLocalPostgresConfig,
  readLocalPostgresConfig,
  saveLocalPostgresConfig,
} from '@/lib/services/localPostgresConfig';
import { resetPrismaClient } from '@/lib/prisma';
import { forceProbePostgres } from '@/lib/services/dbSyncEngine';
import { getBackupDir, getDataDir } from '@/lib/utils/dataPaths';

export const dynamic = 'force-dynamic';

async function probeLocalDatabase(cfg: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  const start = Date.now();
  const client = new Client({
    host: cfg.host || '127.0.0.1',
    port: Number(cfg.port) || 5432,
    user: cfg.user || 'postgres',
    password: cfg.password || '',
    database: cfg.database || 'exmark_erp',
    connectionTimeoutMillis: 2500,
  });

  try {
    await client.connect();
    const verRes = await client.query('SELECT version() AS v');
    const tblRes = await client.query(
      "SELECT COUNT(*)::int AS cnt FROM pg_tables WHERE schemaname = 'public'"
    );
    const sizeRes = await client.query(
      'SELECT ROUND(pg_database_size(current_database()) / 1048576.0, 2)::text AS mb'
    );
    const vaultRes = await client
      .query("SELECT COUNT(*)::int AS cnt FROM exmark_vault_stores")
      .catch(() => ({ rows: [{ cnt: 0 }] }));

    await client.end();
    const rawVer = String(verRes.rows[0]?.v || '');
    const shortVer = rawVer.split(',')[0] || rawVer;

    return {
      connected: true,
      latencyMs: Date.now() - start,
      pgVersion: shortVer,
      tableCount: Number(tblRes.rows[0]?.cnt || 0),
      vaultStoresInSql: Number(vaultRes.rows[0]?.cnt || 0),
      dbSizeMb: Number(sizeRes.rows[0]?.mb || 0),
      error: null as string | null,
    };
  } catch (err: unknown) {
    try {
      await client.end();
    } catch {
      // ignore
    }
    return {
      connected: false,
      latencyMs: Date.now() - start,
      pgVersion: null as string | null,
      tableCount: 0,
      vaultStoresInSql: 0,
      dbSizeMb: 0,
      error: err instanceof Error ? err.message : 'Unable to connect to local PostgreSQL',
    };
  }
}

async function syncJsonVaultToLocalPg(cfg: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}): Promise<{ syncedCount: number; skippedCount: number }> {
  const client = new Client({
    host: cfg.host || '127.0.0.1',
    port: Number(cfg.port) || 5432,
    user: cfg.user || 'postgres',
    password: cfg.password || '',
    database: cfg.database || 'exmark_erp',
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

    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('.') && !excluded.has(f));

    let syncedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      try {
        const full = path.join(dataDir, file);
        const content = fs.readFileSync(full, 'utf8');
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
        syncedCount++;
      } catch {
        skippedCount++;
      }
    }

    return { syncedCount, skippedCount };
  } finally {
    await client.end().catch(() => {});
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings');
    if (auth.errorResponse) return auth.errorResponse;

    const install = detectLocalPostgresInstallation();
    const maskedConfig = getMaskedLocalPostgresConfig();
    const fullConfig = readLocalPostgresConfig();

    const live =
      fullConfig && fullConfig.enabled
        ? await probeLocalDatabase(fullConfig)
        : {
            connected: false,
            latencyMs: 0,
            pgVersion: null,
            tableCount: 0,
            vaultStoresInSql: 0,
            dbSizeMb: 0,
            error: fullConfig ? 'Local PostgreSQL disabled in settings' : 'Local PostgreSQL password not configured yet',
          };

    return NextResponse.json({
      success: true,
      install,
      config: maskedConfig,
      live,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to inspect local PostgreSQL' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = String(body.action || '').toUpperCase();
    const existing = readLocalPostgresConfig();

    const candidate = {
      host: String(body.host || existing?.host || '127.0.0.1').trim(),
      port: Number(body.port || existing?.port || 5432),
      user: String(body.user || existing?.user || 'postgres').trim(),
      password:
        body.password !== undefined && body.password !== ''
          ? String(body.password)
          : existing?.password || '',
      database: String(body.database || existing?.database || 'exmark_erp').trim(),
    };

    if (action === 'TEST') {
      const live = await probeLocalDatabase(candidate);
      return NextResponse.json({
        success: live.connected,
        live,
        message: live.connected
          ? `Connected to ${live.pgVersion} (${live.tableCount} tables, ${live.latencyMs}ms)`
          : live.error || 'Connection failed',
      });
    }

    if (action === 'SAVE_AND_INIT') {
      // 1. Ensure database exists via maintenance 'postgres' DB
      const adminClient = new Client({
        host: candidate.host,
        port: candidate.port,
        user: candidate.user,
        password: candidate.password,
        database: 'postgres',
        connectionTimeoutMillis: 4000,
      });

      try {
        await adminClient.connect();
        const exists = await adminClient.query(
          'SELECT 1 FROM pg_database WHERE datname = $1',
          [candidate.database]
        );
        if (exists.rowCount === 0) {
          const safeDbName = candidate.database.replace(/[^a-zA-Z0-9_]/g, '');
          await adminClient.query(`CREATE DATABASE "${safeDbName}" WITH ENCODING 'UTF8';`);
        }
        await adminClient.end();
      } catch (err: unknown) {
        await adminClient.end().catch(() => {});
        return NextResponse.json(
          {
            success: false,
            error: `PostgreSQL authentication failed: ${err instanceof Error ? err.message : 'Check password'}`,
          },
          { status: 400 }
        );
      }

      // 2. Save encrypted persistent config in C:\EXMARK-ERP-DATA\local-postgres.json
      const saved = saveLocalPostgresConfig({ ...candidate, enabled: true });

      // 3. Update runtime process.env & reset Prisma pool immediately
      const url = buildLocalPostgresUrl(saved);
      process.env.DATABASE_URL = url;
      process.env.DIRECT_URL = url;
      resetPrismaClient();

      // 4. Sync all JSON vault stores into local PostgreSQL
      const syncRes = await syncJsonVaultToLocalPg(saved);
      await forceProbePostgres();
      const live = await probeLocalDatabase(saved);

      return NextResponse.json({
        success: true,
        config: getMaskedLocalPostgresConfig(),
        live,
        sync: syncRes,
        message: `Local PostgreSQL configured & synced (${syncRes.syncedCount} vault stores backed up to SQL).`,
      });
    }

    if (action === 'SYNC_VAULT') {
      if (!existing || !existing.password) {
        return NextResponse.json(
          { success: false, error: 'Configure and save your Local PostgreSQL password first.' },
          { status: 400 }
        );
      }
      const syncRes = await syncJsonVaultToLocalPg(existing);
      const live = await probeLocalDatabase(existing);
      return NextResponse.json({
        success: true,
        sync: syncRes,
        live,
        message: `Synced ${syncRes.syncedCount} factory stores into Local PostgreSQL (${existing.database}).`,
      });
    }

    if (action === 'BACKUP_SQL') {
      if (!existing || !existing.password) {
        return NextResponse.json(
          { success: false, error: 'Configure Local PostgreSQL credentials before running SQL backup.' },
          { status: 400 }
        );
      }
      const pgDump = findLocalPgExecutable('pg_dump');
      if (!pgDump) {
        return NextResponse.json(
          { success: false, error: 'pg_dump.exe not found in C:\\Program Files\\PostgreSQL\\*\\bin' },
          { status: 404 }
        );
      }

      const backupDir = getBackupDir();
      fs.mkdirSync(backupDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `exmark_erp_${ts}.dump`;
      const targetPath = path.join(backupDir, fileName);

      execFileSync(
        pgDump,
        [
          '-h',
          existing.host,
          '-p',
          String(existing.port),
          '-U',
          existing.user,
          '-d',
          existing.database,
          '-F',
          'c',
          '-b',
          '-f',
          targetPath,
        ],
        {
          env: { ...process.env, PGPASSWORD: existing.password },
          timeout: 30000,
        }
      );

      const sizeKb = Math.round(fs.statSync(targetPath).size / 1024);
      return NextResponse.json({
        success: true,
        fileName,
        targetPath,
        sizeKb,
        message: `SQL Backup created: ${fileName} (${sizeKb} KB)`,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Local PostgreSQL operation failed' },
      { status: 500 }
    );
  }
}
