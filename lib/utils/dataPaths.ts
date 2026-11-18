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

export const DEFAULT_COMPANY_ID = 'comp-default';
export const COMPANIES_REGISTRY_FILENAME = 'companies-registry.json';

/**
 * Files shared globally across all companies in the ERP installation so staff logins,
 * role permissions, session signing secrets, company registry, and cloud sync config
 * remain intact when switching between companies.
 */
const GLOBAL_SHARED_FILES = new Set([
  '.exmark-auth-secret',
  'users-store.json',
  'rbac-roles.json',
  'auth-security-config.json',
  COMPANIES_REGISTRY_FILENAME,
  'cloud-sync-config.json',
  'cloud-sync-state.json',
  'local-postgres-config.json',
  'db-outbox-sync.json',
  'schema-version.json',
]);

let cachedActiveCompany: { rootDir: string; mtimeMs: number; companyId: string } | null = null;

/**
 * Clears the cached active company ID (called immediately on company switch/create/delete).
 */
export function invalidateActiveCompanyCache(): void {
  cachedActiveCompany = null;
}

/**
 * Resolves the root data directory (shared vault root, independent of active company).
 */
export function getRootDataDir(): string {
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
 * Reads the currently active company ID from `<rootDataDir>/companies-registry.json`.
 * Defaults to `comp-default` so existing single-company vaults stay 100% untouched.
 */
export function getActiveCompanyId(): string {
  const rootDir = getRootDataDir();
  const regPath = path.join(rootDir, COMPANIES_REGISTRY_FILENAME);
  try {
    if (!fs.existsSync(regPath)) {
      return DEFAULT_COMPANY_ID;
    }
    const stat = fs.statSync(regPath);
    if (
      cachedActiveCompany &&
      cachedActiveCompany.rootDir === rootDir &&
      cachedActiveCompany.mtimeMs === stat.mtimeMs
    ) {
      return cachedActiveCompany.companyId;
    }
    const parsed = JSON.parse(fs.readFileSync(regPath, 'utf8')) as { activeCompanyId?: string };
    const id = parsed?.activeCompanyId && typeof parsed.activeCompanyId === 'string'
      ? parsed.activeCompanyId.trim() || DEFAULT_COMPANY_ID
      : DEFAULT_COMPANY_ID;
    cachedActiveCompany = { rootDir, mtimeMs: stat.mtimeMs, companyId: id };
    return id;
  } catch {
    return DEFAULT_COMPANY_ID;
  }
}

/**
 * Resolves the isolated data directory for a specific company ID.
 * `comp-default` maps directly to `getRootDataDir()` for zero-risk backward compatibility.
 */
export function getCompanyDataDir(companyId: string): string {
  const rootDir = getRootDataDir();
  if (!companyId || companyId === DEFAULT_COMPANY_ID) {
    return rootDir;
  }
  const safeId = companyId.replace(/[^a-zA-Z0-9_-]/g, '');
  const companyDir = path.join(rootDir, 'companies', safeId);
  try {
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }
  } catch {
    // Let caller handle filesystem read/write errors cleanly
  }
  return companyDir;
}

/**
 * Resolves the authoritative data directory for the currently active company's ERP JSON stores.
 * Uses process.env.EXMARK_DATA_DIR when set (physically separated from app code
 * so software updates never touch live factory data), falling back to ./data.
 */
export function getDataDir(): string {
  return getCompanyDataDir(getActiveCompanyId());
}

/**
 * Resolves the authoritative directory for point-in-time SHA-256 backup snapshots.
 * Defaults to EXMARK_BACKUP_DIR -> <EXMARK_DATA_DIR>/backups -> ./backups.
 */
export function getBackupDir(): string {
  loadEnvLocalIfUnset();
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
 * Global auth/config/registry files always live in the shared root vault;
 * business stores resolve to the currently active company's isolated directory.
 * For newly created secondary companies, bundled demo seeds are never auto-copied
 * so each new company begins with a clean zero-data vault.
 */
export function getDataFilePath(filename: string): string {
  if (GLOBAL_SHARED_FILES.has(filename)) {
    const rootDir = getRootDataDir();
    const targetPath = path.join(rootDir, filename);
    const bundledDir = getBundledDataDir();
    if (
      process.env.EXMARK_AUTO_BOOTSTRAP !== 'false' &&
      path.resolve(rootDir) !== path.resolve(bundledDir) &&
      !fs.existsSync(targetPath)
    ) {
      const bundledPath = path.join(bundledDir, filename);
      if (fs.existsSync(bundledPath)) {
        try {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.copyFileSync(bundledPath, targetPath);
        } catch {
          // Ignore copy failure
        }
      }
    }
    return targetPath;
  }

  const activeCompanyId = getActiveCompanyId();
  const dataDir = getCompanyDataDir(activeCompanyId);
  const targetPath = path.join(dataDir, filename);
  const bundledDir = getBundledDataDir();

  // Only bootstrap bundled seed files for the default company; new secondary companies start spotless
  if (
    activeCompanyId === DEFAULT_COMPANY_ID &&
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
