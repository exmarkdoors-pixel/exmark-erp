import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { getDataDir, getDataFilePath } from '@/lib/utils/dataPaths';
import { sanitizeDatabaseUrl } from '@/lib/prisma';

export type GoogleDriveSyncMode = 'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK';

export interface CloudSyncLogEntry {
  id: string;
  timestamp: string;
  kind: 'POSTGRES_PUSH' | 'POSTGRES_PULL' | 'DRIVE_BACKUP' | 'DRIVE_RESTORE' | 'OUTBOX';
  status: 'SUCCESS' | 'PARTIAL' | 'ERROR';
  summary: string;
  storesAffected: number;
  durationMs: number;
}

export interface CloudSyncState {
  enabled: boolean;
  postgresEnabled: boolean;
  driveEnabled: boolean;
  driveMode: GoogleDriveSyncMode;
  driveLocalFolder: string;
  googleAccountEmail: string;
  driveFolderName: string;
  autoSyncIntervalMinutes: number; // 0 = manual only
  driveRetentionCount: number;
  deviceName: string;
  dirtyStores: string[];
  lastSyncedHashes: Record<string, string>;
  lastPostgresSyncAt: string | null;
  lastDriveBackupAt: string | null;
  lastError: string | null;
  history: CloudSyncLogEntry[];
  updatedAt: string;
}

export interface CloudSyncSecrets {
  cloudDatabaseUrl?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
  appsScriptWebhookUrl?: string;
  appsScriptToken?: string;
}

export interface MaskedCloudSecretsSummary {
  hasDatabaseUrl: boolean;
  maskedDatabaseUrl: string | null;
  hasOAuthCredentials: boolean;
  hasAppsScriptWebhook: boolean;
}

export const CLOUD_SYNC_EXCLUDED_FILES = new Set([
  'cloud-sync-state.json',
  'db-outbox-sync.json',
  'schema-version.json',
  'concurrency-store.json',
]);

const getStateFilePath = () => getDataFilePath('cloud-sync-state.json');
const getSecretsFilePath = () => path.join(getDataDir(), '.cloud-sync-secrets.enc');
const getVaultKeyFilePath = () => path.join(getDataDir(), '.vault-sync.key');

function writeAtomicUtf8(targetPath: string, content: string, mode?: number): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.tmp`;
  try {
    fs.writeFileSync(tmp, content, mode ? { encoding: 'utf8', mode } : 'utf8');
    fs.renameSync(tmp, targetPath);
  } catch {
    try {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    } catch {
      // ignore cleanup error
    }
    fs.writeFileSync(targetPath, content, mode ? { encoding: 'utf8', mode } : 'utf8');
  }
}

function getOrCreateVaultEncryptionKey(): Buffer {
  const keyPath = getVaultKeyFilePath();
  if (fs.existsSync(keyPath)) {
    try {
      const hex = fs.readFileSync(keyPath, 'utf8').trim();
      if (/^[a-f0-9]{64}$/i.test(hex)) {
        return Buffer.from(hex, 'hex');
      }
    } catch {
      // Regenerate below if unreadable
    }
  }
  const key = crypto.randomBytes(32);
  writeAtomicUtf8(keyPath, key.toString('hex'), 0o600);
  return key;
}

export function detectLocalGoogleDriveFolders(): string[] {
  const candidates: string[] = [];
  const home = os.homedir();

  for (const driveLetter of ['G', 'H', 'D', 'E']) {
    for (const sub of ['My Drive', 'Google Drive']) {
      const p = `${driveLetter}:\\${sub}`;
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) candidates.push(path.join(p, 'EXMARK-ERP-Cloud'));
    }
  }

  for (const sub of ['Google Drive', 'GoogleDrive', 'My Drive', 'OneDrive']) {
    const p = path.join(/*turbopackIgnore: true*/ home, sub);
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) candidates.push(path.join(p, 'EXMARK-ERP-Cloud'));
  }

  return Array.from(new Set(candidates));
}

function defaultCloudSyncState(): CloudSyncState {
  const detectedFolders = detectLocalGoogleDriveFolders();
  return {
    enabled: false,
    postgresEnabled: false,
    driveEnabled: false,
    driveMode: 'LOCAL_FOLDER',
    driveLocalFolder: detectedFolders[0] || '',
    googleAccountEmail: 'exmarkdoors@gmail.com',
    driveFolderName: 'EXMARK-ERP-Cloud',
    autoSyncIntervalMinutes: 0,
    driveRetentionCount: 15,
    deviceName: os.hostname() || 'EXMARK-WORKSTATION',
    dirtyStores: [],
    lastSyncedHashes: {},
    lastPostgresSyncAt: null,
    lastDriveBackupAt: null,
    lastError: null,
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getCloudSyncState(): CloudSyncState {
  const defaults = defaultCloudSyncState();
  const statePath = getStateFilePath();
  try {
    if (!fs.existsSync(statePath)) {
      writeAtomicUtf8(statePath, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Partial<CloudSyncState>;
    return {
      ...defaults,
      ...parsed,
      dirtyStores: Array.isArray(parsed.dirtyStores) ? parsed.dirtyStores : [],
      lastSyncedHashes:
        parsed.lastSyncedHashes && typeof parsed.lastSyncedHashes === 'object'
          ? parsed.lastSyncedHashes
          : {},
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : [],
    };
  } catch {
    return defaults;
  }
}

export function saveCloudSyncState(partial: Partial<CloudSyncState>): CloudSyncState {
  const current = getCloudSyncState();
  const next: CloudSyncState = {
    ...current,
    ...partial,
    dirtyStores: Array.from(new Set(partial.dirtyStores ?? current.dirtyStores)),
    history: (partial.history ?? current.history).slice(0, 20),
    updatedAt: new Date().toISOString(),
  };
  writeAtomicUtf8(getStateFilePath(), JSON.stringify(next, null, 2));
  return next;
}

export function appendCloudSyncHistory(entry: Omit<CloudSyncLogEntry, 'id' | 'timestamp'>): CloudSyncState {
  const current = getCloudSyncState();
  const fullEntry: CloudSyncLogEntry = {
    id: `sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  return saveCloudSyncState({
    history: [fullEntry, ...current.history].slice(0, 20),
    lastError: entry.status === 'ERROR' ? entry.summary : null,
  });
}

export function markCloudStoreDirty(storeFilename: string): void {
  const cleanName = path.basename(storeFilename);
  if (!cleanName.endsWith('.json') || cleanName.startsWith('.') || CLOUD_SYNC_EXCLUDED_FILES.has(cleanName)) {
    return;
  }
  const current = getCloudSyncState();
  if (!current.dirtyStores.includes(cleanName)) {
    saveCloudSyncState({ dirtyStores: [...current.dirtyStores, cleanName] });
  }
}

export function readCloudSyncSecrets(): CloudSyncSecrets {
  const secretPath = getSecretsFilePath();
  if (!fs.existsSync(secretPath)) return {};

  try {
    const raw = JSON.parse(fs.readFileSync(secretPath, 'utf8')) as {
      iv: string;
      tag: string;
      ciphertext: string;
    };
    if (!raw?.iv || !raw?.tag || !raw?.ciphertext) return {};
    const key = getOrCreateVaultEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(raw.tag, 'hex'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(raw.ciphertext, 'hex')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plain) as CloudSyncSecrets;
  } catch {
    return {};
  }
}

export function saveCloudSyncSecrets(patch: Partial<CloudSyncSecrets>): CloudSyncSecrets {
  const current = readCloudSyncSecrets();
  const merged: CloudSyncSecrets = { ...current };

  if (patch.cloudDatabaseUrl !== undefined) {
    const clean = sanitizeDatabaseUrl(patch.cloudDatabaseUrl);
    if (clean) merged.cloudDatabaseUrl = clean;
    else delete merged.cloudDatabaseUrl;
  }
  for (const key of [
    'oauthClientId',
    'oauthClientSecret',
    'oauthRefreshToken',
    'appsScriptWebhookUrl',
    'appsScriptToken',
  ] as const) {
    if (patch[key] !== undefined) {
      const val = String(patch[key] || '').trim();
      if (val) merged[key] = val;
      else delete merged[key];
    }
  }

  const secretKey = getOrCreateVaultEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(merged), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  writeAtomicUtf8(
    getSecretsFilePath(),
    JSON.stringify({
      alg: 'aes-256-gcm',
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted.toString('hex'),
    }),
    0o600
  );

  return merged;
}

export function maskDatabaseUrlForUi(rawUrl?: string): string | null {
  const clean = sanitizeDatabaseUrl(rawUrl);
  if (!clean) return null;
  try {
    const u = new URL(clean);
    const port = u.port ? `:${u.port}` : '';
    const db = u.pathname && u.pathname !== '/' ? u.pathname : '';
    return `${u.protocol}//***@${u.hostname}${port}${db}`;
  } catch {
    return 'postgresql://*** (configured)';
  }
}

export function getMaskedSecretsSummary(): MaskedCloudSecretsSummary {
  const secrets = readCloudSyncSecrets();
  const envUrl = sanitizeDatabaseUrl(process.env.EXMARK_CLOUD_DATABASE_URL || process.env.DATABASE_URL);
  const isEnvRealCloud =
    Boolean(envUrl) &&
    !envUrl.includes('localhost:5432') &&
    !envUrl.includes('127.0.0.1:5432') &&
    !envUrl.includes('.internal');

  const activeDb = secrets.cloudDatabaseUrl || (isEnvRealCloud ? envUrl : '');

  return {
    hasDatabaseUrl: Boolean(activeDb),
    maskedDatabaseUrl: maskDatabaseUrlForUi(activeDb),
    hasOAuthCredentials: Boolean(
      secrets.oauthClientId && secrets.oauthClientSecret && secrets.oauthRefreshToken
    ),
    hasAppsScriptWebhook: Boolean(secrets.appsScriptWebhookUrl),
  };
}

/**
 * Resolves the active PostgreSQL URL usable for cloud sync without triggering false localhost:5432 failures.
 */
export function getActiveCloudDatabaseUrl(): string {
  const explicitCloud = sanitizeDatabaseUrl(process.env.EXMARK_CLOUD_DATABASE_URL);
  if (explicitCloud) return explicitCloud;

  const state = getCloudSyncState();
  const secrets = readCloudSyncSecrets();
  if (state.postgresEnabled && secrets.cloudDatabaseUrl) {
    return secrets.cloudDatabaseUrl;
  }

  const envDb = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (
    envDb &&
    !envDb.includes('staging-db.exmarkdoors.internal') &&
    (process.env.STRICT_POSTGRES === 'true' ||
      (!envDb.includes('localhost:5432') && !envDb.includes('127.0.0.1:5432')))
  ) {
    return envDb;
  }

  return '';
}
