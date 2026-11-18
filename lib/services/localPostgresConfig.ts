import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync, execSync } from 'child_process';
import { getDataDir, getDataFilePath } from '@/lib/utils/dataPaths';

export interface LocalPostgresConfig {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  updatedAt: string;
}

export interface MaskedLocalPostgresConfig {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  hasPassword: boolean;
  maskedUrl: string;
  updatedAt: string;
}

export interface LocalPostgresInstallInfo {
  installed: boolean;
  versionDetected: string | null;
  serviceName: string | null;
  serviceStatus: 'Running' | 'Stopped' | 'NotFound' | 'Unknown';
  pgDumpPath: string | null;
  psqlPath: string | null;
}

interface StoredLocalPostgresFile {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  passwordEnc?: string;
  updatedAt: string;
}

const getConfigPath = () => getDataFilePath('local-postgres.json');
const getVaultKeyPath = () => path.join(getDataDir(), '.vault-sync.key');

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

function getOrCreateVaultKey(): Buffer {
  const keyPath = getVaultKeyPath();
  if (fs.existsSync(keyPath)) {
    try {
      const hex = fs.readFileSync(keyPath, 'utf8').trim();
      if (/^[a-f0-9]{64}$/i.test(hex)) {
        return Buffer.from(hex, 'hex');
      }
    } catch {
      // regenerate below
    }
  }
  const key = crypto.randomBytes(32);
  writeAtomicUtf8(keyPath, key.toString('hex'), 0o600);
  return key;
}

export function encryptVaultSecret(plain: string): string {
  if (!plain) return '';
  const key = getOrCreateVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptVaultSecret(encoded?: string): string {
  if (!encoded) return '';
  if (!encoded.startsWith('enc1:')) return encoded;
  try {
    const [, ivHex, tagHex, dataHex] = encoded.split(':');
    if (!ivHex || !tagHex || !dataHex) return '';
    const key = getOrCreateVaultKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function buildLocalPostgresUrl(cfg: {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}): string {
  const host = (cfg.host || '127.0.0.1').trim();
  const port = Number(cfg.port) || 5432;
  const user = encodeURIComponent((cfg.user || 'postgres').trim());
  const pass = cfg.password ? `:${encodeURIComponent(cfg.password)}` : '';
  const db = encodeURIComponent((cfg.database || 'exmark_erp').trim());
  return `postgresql://${user}${pass}@${host}:${port}/${db}?schema=public`;
}

export function readLocalPostgresConfig(): LocalPostgresConfig | null {
  const cfgPath = getConfigPath();
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as StoredLocalPostgresFile;
    if (!raw || typeof raw !== 'object') return null;
    return {
      enabled: raw.enabled !== false,
      host: raw.host || '127.0.0.1',
      port: Number(raw.port) || 5432,
      database: raw.database || 'exmark_erp',
      user: raw.user || 'postgres',
      password: decryptVaultSecret(raw.passwordEnc),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveLocalPostgresConfig(input: {
  enabled?: boolean;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}): LocalPostgresConfig {
  const existing = readLocalPostgresConfig();
  const resolvedPassword =
    input.password !== undefined && input.password !== ''
      ? input.password
      : existing?.password || '';

  const next: LocalPostgresConfig = {
    enabled: input.enabled !== undefined ? input.enabled : existing?.enabled ?? true,
    host: (input.host || existing?.host || '127.0.0.1').trim(),
    port: Number(input.port || existing?.port || 5432),
    database: (input.database || existing?.database || 'exmark_erp').trim(),
    user: (input.user || existing?.user || 'postgres').trim(),
    password: resolvedPassword,
    updatedAt: new Date().toISOString(),
  };

  const toStore: StoredLocalPostgresFile = {
    enabled: next.enabled,
    host: next.host,
    port: next.port,
    database: next.database,
    user: next.user,
    passwordEnc: resolvedPassword ? encryptVaultSecret(resolvedPassword) : '',
    updatedAt: next.updatedAt,
  };

  writeAtomicUtf8(getConfigPath(), JSON.stringify(toStore, null, 2), 0o600);
  return next;
}

export function getLocalPostgresUrl(): string {
  const cfg = readLocalPostgresConfig();
  if (!cfg || !cfg.enabled) return '';
  return buildLocalPostgresUrl(cfg);
}

export function getMaskedLocalPostgresConfig(): MaskedLocalPostgresConfig {
  const cfg = readLocalPostgresConfig();
  const host = cfg?.host || '127.0.0.1';
  const port = cfg?.port || 5432;
  const database = cfg?.database || 'exmark_erp';
  const user = cfg?.user || 'postgres';
  const hasPassword = Boolean(cfg?.password);

  return {
    enabled: Boolean(cfg?.enabled),
    host,
    port,
    database,
    user,
    hasPassword,
    maskedUrl: `postgresql://${user}:${hasPassword ? '••••••••' : ''}@${host}:${port}/${database}?schema=public`,
    updatedAt: cfg?.updatedAt || '',
  };
}

function getWindowsProgramFilesDir(): string {
  const fromEnv = process.env['ProgramFiles'] || process.env['PROGRAMFILES'];
  if (fromEnv) return fromEnv;
  return ['C:', 'Program Files'].join(path.sep);
}

function dynamicExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath) !== null;
  } catch {
    return false;
  }
}

export function findLocalPgExecutable(tool: 'pg_dump' | 'psql'): string | null {
  const versions = ['18', '17', '16', '15', '14', '13'];
  if (process.platform === 'win32') {
    const pgRoot = path.join(getWindowsProgramFilesDir(), 'PostgreSQL');
    for (const v of versions) {
      const candidate = path.join(pgRoot, v, 'bin', `${tool}.exe`);
      if (dynamicExists(candidate)) {
        return candidate;
      }
    }
  }
  try {
    execSync(`${tool} --version`, { stdio: 'ignore' });
    return tool;
  } catch {
    return null;
  }
}

export function detectLocalPostgresInstallation(): LocalPostgresInstallInfo {
  const versions = ['18', '17', '16', '15', '14', '13'];
  let versionDetected: string | null = null;
  let pgDumpPath = findLocalPgExecutable('pg_dump');
  let psqlPath = findLocalPgExecutable('psql');

  if (process.platform === 'win32') {
    const pgRoot = path.join(getWindowsProgramFilesDir(), 'PostgreSQL');
    for (const v of versions) {
      const binDir = path.join(pgRoot, v, 'bin');
      if (dynamicExists(binDir)) {
        versionDetected = `PostgreSQL ${v}`;
        const dumpExe = path.join(binDir, 'pg_dump.exe');
        const psqlExe = path.join(binDir, 'psql.exe');
        if (!pgDumpPath && dynamicExists(dumpExe)) {
          pgDumpPath = dumpExe;
        }
        if (!psqlPath && dynamicExists(psqlExe)) {
          psqlPath = psqlExe;
        }
        break;
      }
    }
  }

  let serviceName: string | null = null;
  let serviceStatus: LocalPostgresInstallInfo['serviceStatus'] = 'Unknown';

  if (process.platform === 'win32') {
    try {
      const out = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          "Get-Service -Name '*postgres*' -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { $_.Name + '|' + $_.Status }",
        ],
        { encoding: 'utf8', timeout: 3000 }
      ).trim();
      if (out && out.includes('|')) {
        const [name, status] = out.split('|');
        serviceName = name.trim();
        if (status.trim().toLowerCase() === 'running') serviceStatus = 'Running';
        else serviceStatus = 'Stopped';
      } else {
        serviceStatus = 'NotFound';
      }
    } catch {
      serviceStatus = 'Unknown';
    }
  }

  return {
    installed: Boolean(versionDetected || pgDumpPath || serviceName),
    versionDetected,
    serviceName,
    serviceStatus,
    pgDumpPath,
    psqlPath,
  };
}
