import fs from 'fs';
import path from 'path';

function loadEnvLocalIfUnset(): void {
  if (!process.env.EXMARK_DATA_DIR) {
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        const content = fs.readFileSync(envLocalPath, 'utf8');
        const match = content.match(/^EXMARK_DATA_DIR=(.+)$/m);
        if (match) {
          process.env.EXMARK_DATA_DIR = match[1].trim().replace(/^["']|["']$/g, '');
        }
        const bMatch = content.match(/^EXMARK_BACKUP_DIR=(.+)$/m);
        if (bMatch && !process.env.EXMARK_BACKUP_DIR) {
          process.env.EXMARK_BACKUP_DIR = bMatch[1].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Resolves the authoritative data directory for all ERP JSON stores.
 * Uses process.env.EXMARK_DATA_DIR when set (physically separated from app code
 * so software updates never touch live factory data), falling back to ./data.
 */
export function getDataDir(): string {
  loadEnvLocalIfUnset();
  const configured = process.env.EXMARK_DATA_DIR?.trim();
  const dir = configured ? path.resolve(configured) : path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Let caller handle filesystem read/write errors cleanly
  }
  return dir;
}

/**
 * Resolves the authoritative directory for point-in-time SHA-256 backup snapshots.
 * Defaults to EXMARK_BACKUP_DIR -> <EXMARK_DATA_DIR>/backups -> ./backups.
 */
export function getBackupDir(): string {
  const explicitBackup = process.env.EXMARK_BACKUP_DIR?.trim();
  if (explicitBackup) {
    const resolved = path.resolve(explicitBackup);
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }
    return resolved;
  }

  const configuredDataDir = process.env.EXMARK_DATA_DIR?.trim();
  const dir = configuredDataDir
    ? path.join(path.resolve(configuredDataDir), 'backups')
    : path.join(process.cwd(), 'backups');

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Let caller handle filesystem read/write errors cleanly
  }
  return dir;
}

/**
 * Resolves the bundled factory seed-template data directory.
 * Uses EXMARK_BUNDLED_DATA_DIR inside packaged Electron builds, falling back to ./data.
 */
export function getBundledDataDir(): string {
  const configured = process.env.EXMARK_BUNDLED_DATA_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), 'data');
}

/**
 * Resolves the full file path for a specific ERP JSON store file.
 * If EXMARK_DATA_DIR points outside the bundled seed dir and the file is missing there,
 * safely copies the initial seed/template once without overwriting existing data.
 */
export function getDataFilePath(filename: string): string {
  const dataDir = getDataDir();
  const targetPath = path.join(dataDir, filename);
  const bundledDir = getBundledDataDir();

  if (
    process.env.EXMARK_AUTO_BOOTSTRAP !== 'false' &&
    path.resolve(dataDir) !== path.resolve(bundledDir) &&
    !fs.existsSync(targetPath)
  ) {
    const bundledPath = path.join(bundledDir, filename);
    if (fs.existsSync(bundledPath)) {
      try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(bundledPath, targetPath);
      } catch {
        // Ignore copy failure; service fallback will handle initialization
      }
    }
  }

  return targetPath;
}

/**
 * Returns metadata about whether an external data vault is active.
 */
export function getDataVaultStatus() {
  const activeDir = getDataDir();
  const bundledDir = getBundledDataDir();
  const isExternalVault = path.resolve(activeDir) !== path.resolve(bundledDir);
  return {
    dataDir: activeDir,
    backupDir: getBackupDir(),
    bundledDataDir: bundledDir,
    isExternalVault,
    envVarConfigured: Boolean(process.env.EXMARK_DATA_DIR?.trim()),
  };
}

const INTERNAL_UNSYNCED_STORES = new Set([
  'cloud-sync-state.json',
  'db-outbox-sync.json',
  'schema-version.json',
  'concurrency-store.json',
]);

type StoreWriteListener = (storeFilename: string) => void;
const storeWriteListeners = new Set<StoreWriteListener>();
let notifyingStoreWrite = false;

export function registerStoreWriteListener(listener: StoreWriteListener): () => void {
  storeWriteListeners.add(listener);
  return () => {
    storeWriteListeners.delete(listener);
  };
}

function notifyStoreWrite(filePath: string): void {
  if (notifyingStoreWrite || storeWriteListeners.size === 0) return;
  try {
    const filename = path.basename(filePath);
    if (!filename.endsWith('.json') || filename.startsWith('.') || INTERNAL_UNSYNCED_STORES.has(filename)) {
      return;
    }
    if (path.resolve(path.dirname(filePath)) !== path.resolve(getDataDir())) {
      return;
    }
    notifyingStoreWrite = true;
    for (const listener of storeWriteListeners) {
      try {
        listener(filename);
      } catch {
        // Sync listeners must never break primary local persistence
      }
    }
  } finally {
    notifyingStoreWrite = false;
  }
}

/**
 * Persists JSON cleanly with atomic tmp+rename and Windows Defender EPERM/EBUSY fallback.
 */
export function writeJsonSafe(filePath: string, data: unknown): void {
  const payload = JSON.stringify(data, null, 2);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, payload, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch {
    try {
      if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { force: true });
    } catch {
      // ignore temp cleanup failure
    }
    fs.writeFileSync(filePath, payload, 'utf8');
  }
  notifyStoreWrite(filePath);
}
