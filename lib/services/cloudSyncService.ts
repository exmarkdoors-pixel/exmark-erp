import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { detectPostgresProvider, getCloudPrismaClient, sanitizeDatabaseUrl } from '@/lib/prisma';
import { getDataDir, getDataFilePath, registerStoreWriteListener } from '@/lib/utils/dataPaths';
import { getAppVersion } from './schemaMigrator';
import { createBackupSnapshot } from './backupService';
import { restoreFromBundle } from '@/app/api/system/backup/restore/route';
import {
  appendCloudSyncHistory,
  CLOUD_SYNC_EXCLUDED_FILES,
  getActiveCloudDatabaseUrl,
  getCloudSyncState,
  getMaskedSecretsSummary,
  markCloudStoreDirty,
  saveCloudSyncState,
} from './cloudSyncConfigService';
import { forceProbePostgres, isCloudEnvironment, reconcileOutboxToPostgres } from './dbSyncEngine';
import {
  downloadGoogleDriveBackupBundle,
  DriveTestResult,
  listGoogleDriveBackups,
  testGoogleDriveChannel,
  uploadVaultBackupToGoogleDrive,
} from './googleDriveSyncService';

export interface LocalStoreFileInfo {
  storeKey: string;
  sha256: string;
  sizeBytes: number;
  content: string;
  mtimeMs: number;
}

export interface RemoteStoreMeta {
  storeKey: string;
  sha256: string;
  revision: number;
  sizeBytes: number;
  appVersion: string;
  deviceName: string | null;
  updatedAt: string;
}

export interface StoreSyncDiffItem {
  storeKey: string;
  status: 'IN_SYNC' | 'LOCAL_ONLY' | 'REMOTE_ONLY' | 'MODIFIED';
  localBytes: number;
  remoteBytes: number;
  localSha256: string | null;
  remoteSha256: string | null;
  remoteUpdatedAt: string | null;
  remoteDevice: string | null;
}

export interface CloudConnectionTestReport {
  postgres: {
    configured: boolean;
    reachable: boolean;
    tableReady: boolean;
    remoteStoresCount: number;
    latencyMs: number;
    maskedUrl: string | null;
    provider?: string;
    providerKind?: string;
    message: string;
  };
  drive: DriveTestResult;
}

export interface CloudPushReport {
  success: boolean;
  postgres: {
    attempted: boolean;
    pushedCount: number;
    skippedUnchangedCount: number;
    outboxSynced: number;
    outboxFailed: number;
    error: string | null;
  };
  drive: {
    attempted: boolean;
    fileName: string | null;
    bundleSha256: string | null;
    error: string | null;
  };
  durationMs: number;
}

export interface CloudPullReport {
  success: boolean;
  preRestoreBackupId: string;
  restoredStores: string[];
  skippedStores: string[];
  mode: 'MERGE_NEWER' | 'OVERWRITE_ALL';
  durationMs: number;
}

const ENSURE_CLOUD_VAULT_DDL = `
CREATE TABLE IF NOT EXISTS "CloudVaultStore" (
  "storeKey" TEXT NOT NULL PRIMARY KEY,
  "sha256" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "sizeBytes" INTEGER NOT NULL,
  "appVersion" TEXT NOT NULL DEFAULT '1.0.1',
  "deviceName" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

let observerRegistered = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let autoSyncInFlight = false;
let suppressDirtyTracking = false;

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function collectLocalVaultStores(): LocalStoreFileInfo[] {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) return [];

  const results: LocalStoreFileInfo[] = [];
  for (const file of fs.readdirSync(dataDir).sort()) {
    if (!file.endsWith('.json') || file.startsWith('.') || CLOUD_SYNC_EXCLUDED_FILES.has(file)) {
      continue;
    }
    const fullPath = path.join(dataDir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      results.push({
        storeKey: file,
        sha256: computeSha256(content),
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        content,
        mtimeMs: stat.mtimeMs,
      });
    } catch {
      // Skip unreadable file cleanly
    }
  }
  return results;
}

function writeStoreAtomic(filename: string, content: string): void {
  const targetPath = getDataFilePath(filename);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.tmp`;
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, targetPath);
  } catch {
    try {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    } catch {
      // ignore cleanup
    }
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}

export async function ensureCloudVaultSchema(client: PrismaClient): Promise<void> {
  await client.$executeRawUnsafe(ENSURE_CLOUD_VAULT_DDL);
}

export function registerCloudAutoSyncObserver(): void {
  if (observerRegistered) return;
  observerRegistered = true;

  registerStoreWriteListener((storeFilename) => {
    if (suppressDirtyTracking) return;
    markCloudStoreDirty(storeFilename);
    scheduleAutoSyncIfNeeded();
  });
}

function scheduleAutoSyncIfNeeded(): void {
  const state = getCloudSyncState();
  if (!state.enabled || (!state.postgresEnabled && !state.driveEnabled)) return;
  if (!state.autoSyncIntervalMinutes || state.autoSyncIntervalMinutes <= 0) return;

  const waitMs = Math.max(15000, Math.min(state.autoSyncIntervalMinutes * 60 * 1000, 5 * 60 * 1000));
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (autoSyncInFlight) return;
    autoSyncInFlight = true;
    pushToCloudSync({ forceAll: false, includeDrive: state.driveEnabled })
      .catch(() => {})
      .finally(() => {
        autoSyncInFlight = false;
      });
  }, waitMs);
  if (typeof debounceTimer.unref === 'function') {
    debounceTimer.unref();
  }
}

export async function testCloudConnections(options?: {
  overrideDatabaseUrl?: string;
  prismaClientOverride?: PrismaClient;
}): Promise<CloudConnectionTestReport> {
  const activeUrl = sanitizeDatabaseUrl(options?.overrideDatabaseUrl) || getActiveCloudDatabaseUrl();
  const masked = getMaskedSecretsSummary().maskedDatabaseUrl;
  const providerInfo = detectPostgresProvider(activeUrl);
  const start = Date.now();

  let pgResult: CloudConnectionTestReport['postgres'] = {
    configured: Boolean(activeUrl),
    reachable: false,
    tableReady: false,
    remoteStoresCount: 0,
    latencyMs: 0,
    maskedUrl: activeUrl ? masked || 'postgresql://*** (configured)' : null,
    provider: activeUrl ? providerInfo.label : undefined,
    providerKind: activeUrl ? providerInfo.kind : undefined,
    message: activeUrl
      ? 'Not tested yet'
      : 'No Neon / Supabase PostgreSQL URL saved. Paste your Neon PostgreSQL connection string in Settings to enable Cloud SQL Sync.',
  };

  if (activeUrl || options?.prismaClientOverride) {
    const client = options?.prismaClientOverride || getCloudPrismaClient(activeUrl);
    const runProbe = async () => {
      await client.$queryRaw`SELECT 1 AS alive`;
      await ensureCloudVaultSchema(client);
      return await client.cloudVaultStore.count();
    };

    try {
      let count: number;
      try {
        count = await runProbe();
      } catch (firstErr) {
        // Neon serverless computes wake from scale-to-zero in ~0.5-2s; retry once cleanly on cold-start
        if (providerInfo.kind === 'NEON') {
          await new Promise((r) => setTimeout(r, 1200));
          count = await runProbe();
        } else {
          throw firstErr;
        }
      }
      pgResult = {
        configured: true,
        reachable: true,
        tableReady: true,
        remoteStoresCount: count,
        latencyMs: Date.now() - start,
        maskedUrl: activeUrl ? masked || 'postgresql://*** (configured)' : 'mock-client',
        provider: providerInfo.label,
        providerKind: providerInfo.kind,
        message: `Connected cleanly to ${providerInfo.label} (${count} cloud stores indexed, ${Date.now() - start}ms).`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint =
        providerInfo.kind === 'SUPABASE_DIRECT_IPV6'
          ? ' Hint: Supabase direct URLs (db.*.supabase.co) are IPv6-only; use the Session Pooler URL (*.pooler.supabase.com:5432) or switch to Neon PostgreSQL.'
          : '';
      pgResult = {
        ...pgResult,
        configured: true,
        reachable: false,
        tableReady: false,
        latencyMs: Date.now() - start,
        provider: providerInfo.label,
        providerKind: providerInfo.kind,
        message: `${providerInfo.label} connection failed: ${msg}${hint}`,
      };
    }
  }

  const drive = await testGoogleDriveChannel();
  return { postgres: pgResult, drive };
}

export async function pushToCloudSync(options?: {
  forceAll?: boolean;
  includeDrive?: boolean;
  overrideDatabaseUrl?: string;
  prismaClientOverride?: PrismaClient;
}): Promise<CloudPushReport> {
  const startedAt = Date.now();
  const state = getCloudSyncState();
  const activeUrl = sanitizeDatabaseUrl(options?.overrideDatabaseUrl) || getActiveCloudDatabaseUrl();
  const usePostgres = Boolean(options?.prismaClientOverride || (state.postgresEnabled && activeUrl) || options?.overrideDatabaseUrl);
  const useDrive = options?.includeDrive ?? state.driveEnabled;

  const pgStats: CloudPushReport['postgres'] = {
    attempted: usePostgres,
    pushedCount: 0,
    skippedUnchangedCount: 0,
    outboxSynced: 0,
    outboxFailed: 0,
    error: null,
  };

  const driveStats: CloudPushReport['drive'] = {
    attempted: useDrive,
    fileName: null,
    bundleSha256: null,
    error: null,
  };

  const localStores = collectLocalVaultStores();
  const updatedHashes: Record<string, string> = { ...state.lastSyncedHashes };

  if (usePostgres) {
    try {
      const client = options?.prismaClientOverride || getCloudPrismaClient(activeUrl);
      await ensureCloudVaultSchema(client);

      const remoteRows = await client.cloudVaultStore.findMany({
        select: { storeKey: true, sha256: true, revision: true },
      });
      const remoteMap = new Map<string, { sha256: string; revision: number }>();
      for (const r of remoteRows) {
        remoteMap.set(r.storeKey, { sha256: r.sha256, revision: r.revision });
      }

      const appVer = getAppVersion();
      for (const store of localStores) {
        const remote = remoteMap.get(store.storeKey);
        if (!options?.forceAll && remote && remote.sha256 === store.sha256) {
          pgStats.skippedUnchangedCount++;
          updatedHashes[store.storeKey] = store.sha256;
          continue;
        }

        const nextRevision = remote ? remote.revision + 1 : 1;
        await client.cloudVaultStore.upsert({
          where: { storeKey: store.storeKey },
          create: {
            storeKey: store.storeKey,
            sha256: store.sha256,
            payloadJson: store.content,
            revision: 1,
            sizeBytes: store.sizeBytes,
            appVersion: appVer,
            deviceName: state.deviceName,
          },
          update: {
            sha256: store.sha256,
            payloadJson: store.content,
            revision: nextRevision,
            sizeBytes: store.sizeBytes,
            appVersion: appVer,
            deviceName: state.deviceName,
          },
        });
        pgStats.pushedCount++;
        updatedHashes[store.storeKey] = store.sha256;
      }

      const outboxRes = await reconcileOutboxToPostgres(client);
      pgStats.outboxSynced = outboxRes.synced;
      pgStats.outboxFailed = outboxRes.failed;

      saveCloudSyncState({
        dirtyStores: [],
        lastSyncedHashes: updatedHashes,
        lastPostgresSyncAt: new Date().toISOString(),
        lastError: null,
      });
    } catch (err: unknown) {
      pgStats.error = err instanceof Error ? err.message : String(err);
    }
  }

  if (useDrive) {
    try {
      const uploadRes = await uploadVaultBackupToGoogleDrive();
      driveStats.fileName = uploadRes.fileName;
      driveStats.bundleSha256 = uploadRes.bundleSha256;
      saveCloudSyncState({
        lastDriveBackupAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      driveStats.error = err instanceof Error ? err.message : String(err);
    }
  }

  const durationMs = Date.now() - startedAt;
  const anyError = Boolean(pgStats.error || driveStats.error);
  const allFailed =
    (pgStats.attempted && Boolean(pgStats.error) && !driveStats.attempted) ||
    (driveStats.attempted && Boolean(driveStats.error) && !pgStats.attempted) ||
    (pgStats.attempted && driveStats.attempted && Boolean(pgStats.error) && Boolean(driveStats.error));

  const summaryParts: string[] = [];
  if (pgStats.attempted) {
    summaryParts.push(
      pgStats.error
        ? `Postgres error: ${pgStats.error}`
        : `Postgres: ${pgStats.pushedCount} pushed, ${pgStats.skippedUnchangedCount} up-to-date`
    );
  }
  if (driveStats.attempted) {
    summaryParts.push(
      driveStats.error
        ? `Drive error: ${driveStats.error}`
        : `Drive: uploaded ${driveStats.fileName}`
    );
  }
  if (summaryParts.length === 0) {
    summaryParts.push('Cloud sync channels are disabled.');
  }

  appendCloudSyncHistory({
    kind: pgStats.attempted ? 'POSTGRES_PUSH' : 'DRIVE_BACKUP',
    status: allFailed ? 'ERROR' : anyError ? 'PARTIAL' : 'SUCCESS',
    summary: summaryParts.join(' | '),
    storesAffected: pgStats.pushedCount + (driveStats.fileName ? localStores.length : 0),
    durationMs,
  });

  if (!options?.prismaClientOverride) {
    await forceProbePostgres().catch(() => false);
  }

  return {
    success: !allFailed,
    postgres: pgStats,
    drive: driveStats,
    durationMs,
  };
}

export async function inspectCloudDiff(options?: {
  overrideDatabaseUrl?: string;
  prismaClientOverride?: PrismaClient;
}): Promise<StoreSyncDiffItem[]> {
  const activeUrl = sanitizeDatabaseUrl(options?.overrideDatabaseUrl) || getActiveCloudDatabaseUrl();
  if (!activeUrl && !options?.prismaClientOverride) {
    throw new Error('PostgreSQL Cloud Sync URL is not configured.');
  }

  const client = options?.prismaClientOverride || getCloudPrismaClient(activeUrl);
  await ensureCloudVaultSchema(client);

  const localStores = collectLocalVaultStores();
  const localMap = new Map(localStores.map((s) => [s.storeKey, s]));

  const remoteRows = await client.cloudVaultStore.findMany({
    select: { storeKey: true, sha256: true, sizeBytes: true, updatedAt: true, deviceName: true },
  });
  const remoteMap = new Map(remoteRows.map((r) => [r.storeKey, r]));

  const keys = Array.from(new Set([...localMap.keys(), ...remoteMap.keys()])).sort();
  return keys.map((storeKey) => {
    const local = localMap.get(storeKey);
    const remote = remoteMap.get(storeKey);

    let status: StoreSyncDiffItem['status'] = 'IN_SYNC';
    if (local && !remote) status = 'LOCAL_ONLY';
    else if (!local && remote) status = 'REMOTE_ONLY';
    else if (local && remote && local.sha256 !== remote.sha256) status = 'MODIFIED';

    return {
      storeKey,
      status,
      localBytes: local?.sizeBytes || 0,
      remoteBytes: remote?.sizeBytes || 0,
      localSha256: local?.sha256 || null,
      remoteSha256: remote?.sha256 || null,
      remoteUpdatedAt: remote?.updatedAt ? new Date(remote.updatedAt).toISOString() : null,
      remoteDevice: remote?.deviceName || null,
    };
  });
}

export async function pullFromCloudSync(options: {
  mode: 'MERGE_NEWER' | 'OVERWRITE_ALL';
  overrideDatabaseUrl?: string;
  prismaClientOverride?: PrismaClient;
}): Promise<CloudPullReport> {
  const startedAt = Date.now();
  const activeUrl = sanitizeDatabaseUrl(options.overrideDatabaseUrl) || getActiveCloudDatabaseUrl();
  if (!activeUrl && !options.prismaClientOverride) {
    throw new Error('PostgreSQL Cloud Sync URL is not configured.');
  }

  const client = options.prismaClientOverride || getCloudPrismaClient(activeUrl);
  await ensureCloudVaultSchema(client);

  const preRestore = await createBackupSnapshot('PRE_RESTORE');
  const localStores = collectLocalVaultStores();
  const localMap = new Map(localStores.map((s) => [s.storeKey, s]));

  const remoteRows = await client.cloudVaultStore.findMany();
  const restoredStores: string[] = [];
  const skippedStores: string[] = [];
  const nextHashes: Record<string, string> = { ...getCloudSyncState().lastSyncedHashes };

  suppressDirtyTracking = true;
  try {
    for (const row of remoteRows) {
      if (
        !row.storeKey.endsWith('.json') ||
        row.storeKey.startsWith('.') ||
        CLOUD_SYNC_EXCLUDED_FILES.has(row.storeKey)
      ) {
        skippedStores.push(row.storeKey);
        continue;
      }

      const computedHash = computeSha256(row.payloadJson);
      if (computedHash !== row.sha256) {
        throw new Error(`Integrity verification failed for remote store ${row.storeKey}. Pull aborted.`);
      }
      JSON.parse(row.payloadJson);

      const local = localMap.get(row.storeKey);
      if (local && local.sha256 === row.sha256) {
        skippedStores.push(row.storeKey);
        nextHashes[row.storeKey] = row.sha256;
        continue;
      }

      const remoteUpdatedMs = new Date(row.updatedAt).getTime();
      if (options.mode === 'MERGE_NEWER' && local && local.mtimeMs > remoteUpdatedMs + 2000) {
        // Local edit is strictly newer than remote snapshot — keep local change safe
        skippedStores.push(row.storeKey);
        continue;
      }

      writeStoreAtomic(row.storeKey, row.payloadJson);
      restoredStores.push(row.storeKey);
      nextHashes[row.storeKey] = row.sha256;
    }

    saveCloudSyncState({
      lastSyncedHashes: nextHashes,
      lastPostgresSyncAt: new Date().toISOString(),
    });
  } finally {
    suppressDirtyTracking = false;
  }

  const durationMs = Date.now() - startedAt;
  appendCloudSyncHistory({
    kind: 'POSTGRES_PULL',
    status: 'SUCCESS',
    summary: `Pulled ${restoredStores.length} store(s) from Cloud PostgreSQL (${skippedStores.length} skipped). Pre-restore: ${preRestore.backupId}`,
    storesAffected: restoredStores.length,
    durationMs,
  });

  return {
    success: true,
    preRestoreBackupId: preRestore.backupId,
    restoredStores,
    skippedStores,
    mode: options.mode,
    durationMs,
  };
}

export async function restoreFromGoogleDriveBackupId(fileIdOrPath: string): Promise<{
  restoredFiles: string[];
  preRestoreBackupId: string;
}> {
  const startedAt = Date.now();
  const bundle = await downloadGoogleDriveBackupBundle(fileIdOrPath);
  suppressDirtyTracking = true;
  try {
    const result = await restoreFromBundle(bundle);
    saveCloudSyncState({
      lastDriveBackupAt: new Date().toISOString(),
    });
    appendCloudSyncHistory({
      kind: 'DRIVE_RESTORE',
      status: 'SUCCESS',
      summary: `Restored ${result.restoredFiles.length} stores from Google Drive snapshot. Pre-restore: ${result.preRestoreBackupId}`,
      storesAffected: result.restoredFiles.length,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } finally {
    suppressDirtyTracking = false;
  }
}

export async function getCloudSyncOverview() {
  registerCloudAutoSyncObserver();
  const state = getCloudSyncState();
  const secretsSummary = getMaskedSecretsSummary();
  const localStores = collectLocalVaultStores();

  const dirtySet = new Set(state.dirtyStores);
  for (const store of localStores) {
    if (state.lastSyncedHashes[store.storeKey] !== store.sha256) {
      dirtySet.add(store.storeKey);
    }
  }

  return {
    state: {
      ...state,
      dirtyStores: Array.from(dirtySet).sort(),
    },
    secretsSummary,
    localStoreCount: localStores.length,
    isCloudRuntime: isCloudEnvironment(),
  };
}

export async function listDriveBackupsSafe() {
  return listGoogleDriveBackups();
}

let cloudHydrated = false;

/**
 * Hydrates ephemeral cloud runtime stores from PostgreSQL CloudVaultStore once on boot
 * when running in Cloud/Render environment with active DATABASE_URL and empty local quotes.
 */
export async function hydrateCloudVaultOnBoot(prismaClientOverride?: PrismaClient): Promise<boolean> {
  registerCloudAutoSyncObserver();
  if (cloudHydrated) return false;
  cloudHydrated = true;

  if (!isCloudEnvironment() && !prismaClientOverride) return false;
  const activeUrl = getActiveCloudDatabaseUrl();
  if (!activeUrl && !prismaClientOverride) return false;

  try {
    const quotePath = getDataFilePath('quotations-store.json');
    const localHasQuotes =
      fs.existsSync(quotePath) &&
      (() => {
        try {
          const arr = JSON.parse(fs.readFileSync(quotePath, 'utf8'));
          return Array.isArray(arr) && arr.length > 0;
        } catch {
          return false;
        }
      })();
    if (localHasQuotes) return false;

    const client = prismaClientOverride || getCloudPrismaClient(activeUrl);
    await ensureCloudVaultSchema(client);
    const remoteRows = await client.cloudVaultStore.findMany();
    if (!remoteRows || remoteRows.length === 0) return false;

    suppressDirtyTracking = true;
    try {
      for (const row of remoteRows) {
        if (!row.storeKey.endsWith('.json') || row.storeKey.startsWith('.') || CLOUD_SYNC_EXCLUDED_FILES.has(row.storeKey)) {
          continue;
        }
        if (computeSha256(row.payloadJson) !== row.sha256) continue;
        JSON.parse(row.payloadJson);
        writeStoreAtomic(row.storeKey, row.payloadJson);
      }
    } finally {
      suppressDirtyTracking = false;
    }
    return true;
  } catch (err) {
    console.warn('[CloudSync] Boot hydration warning:', err);
    return false;
  }
}
