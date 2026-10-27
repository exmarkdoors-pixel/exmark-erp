import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface BackupSnapshotMeta {
  backupId: string; // EXM-BAK-20261028-120000
  timestamp: string;
  filesCount: number;
  totalSizeBytes: number;
  sha256Checksum: string;
  status: 'VERIFIED' | 'CORRUPTED' | 'CREATING';
  storesIncluded: string[];
  manifest: Record<string, { size: number; sha256: string }>;
}

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDirectories() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function calculateFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Creates a complete point-in-time backup snapshot of all business data stores.
 */
export async function createBackupSnapshot(trigger: 'SCHEDULED' | 'MANUAL' = 'MANUAL'): Promise<BackupSnapshotMeta> {
  ensureDirectories();

  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupId = `EXM-BAK-${dateStr}-${trigger.slice(0, 3)}`;
  const targetDir = path.join(BACKUP_DIR, backupId);

  fs.mkdirSync(targetDir, { recursive: true });

  const storesIncluded: string[] = [];
  const manifest: Record<string, { size: number; sha256: string }> = {};
  let totalSizeBytes = 0;

  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const srcPath = path.join(DATA_DIR, file);
      const destPath = path.join(targetDir, file);

      const content = fs.readFileSync(srcPath);
      fs.writeFileSync(destPath, content);

      const size = content.length;
      const fileHash = calculateFileSha256(destPath);

      totalSizeBytes += size;
      storesIncluded.push(file);
      manifest[file] = { size, sha256: fileHash };
    }
  }

  // Combined master hash
  const masterHasher = crypto.createHash('sha256');
  Object.keys(manifest)
    .sort()
    .forEach((key) => {
      masterHasher.update(`${key}:${manifest[key].sha256}`);
    });
  const sha256Checksum = masterHasher.digest('hex');

  const meta: BackupSnapshotMeta = {
    backupId,
    timestamp: now.toISOString(),
    filesCount: storesIncluded.length,
    totalSizeBytes,
    sha256Checksum,
    status: 'VERIFIED',
    storesIncluded,
    manifest,
  };

  fs.writeFileSync(
    path.join(targetDir, 'backup-meta.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  );

  return meta;
}

/**
 * Lists all existing backup snapshots with integrity status.
 */
export async function listBackupSnapshots(): Promise<BackupSnapshotMeta[]> {
  ensureDirectories();
  const entries = fs.readdirSync(BACKUP_DIR);
  const snapshots: BackupSnapshotMeta[] = [];

  for (const entry of entries) {
    const metaPath = path.join(BACKUP_DIR, entry, 'backup-meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as BackupSnapshotMeta;
        snapshots.push(meta);
      } catch {
        // Skip corrupted meta
      }
    }
  }

  return snapshots.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Verifies integrity of a specific backup snapshot by recalculating SHA-256 hashes.
 */
export async function verifyBackupIntegrity(backupId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const targetDir = path.join(BACKUP_DIR, backupId);
  const metaPath = path.join(targetDir, 'backup-meta.json');

  if (!fs.existsSync(metaPath)) {
    return { valid: false, errors: [`Backup ${backupId} metadata file not found`] };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as BackupSnapshotMeta;
  const errors: string[] = [];

  for (const [file, expected] of Object.entries(meta.manifest)) {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing store file: ${file}`);
      continue;
    }

    const currentHash = calculateFileSha256(filePath);
    if (currentHash !== expected.sha256) {
      errors.push(`Integrity mismatch on ${file}: expected ${expected.sha256}, got ${currentHash}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
