import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getBackupDir, getDataDir, getDataFilePath } from '@/lib/utils/dataPaths';
import { createBackupSnapshot, verifyBackupIntegrity } from '@/lib/services/backupService';
import type { PortableFactoryBackupBundle } from '../download/route';

function isSafeStoreFilename(name: string): boolean {
  return (
    typeof name === 'string' &&
    name.endsWith('.json') &&
    !name.includes('..') &&
    !name.includes('/') &&
    !name.includes('\\') &&
    path.basename(name) === name
  );
}

function writeAtomicUtf8(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export async function restoreFromBundle(
  bundle: PortableFactoryBackupBundle
): Promise<{ restoredFiles: string[]; preRestoreBackupId: string }> {
  if (
    !bundle ||
    typeof bundle !== 'object' ||
    !Array.isArray(bundle.manifest) ||
    !bundle.stores ||
    typeof bundle.stores !== 'object'
  ) {
    throw new Error('Invalid backup bundle structure.');
  }

  const expectedBundleHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(bundle.manifest))
    .digest('hex');

  if (bundle.bundleSha256 && bundle.bundleSha256 !== expectedBundleHash) {
    throw new Error('Bundle manifest SHA-256 verification failed. File may be corrupted or modified.');
  }

  const verifiedEntries: Array<{ filename: string; content: string }> = [];
  for (const entry of bundle.manifest) {
    if (!isSafeStoreFilename(entry.filename)) {
      throw new Error(`Unsafe filename detected in backup manifest: ${entry.filename}`);
    }
    const content = bundle.stores[entry.filename];
    if (typeof content !== 'string') {
      throw new Error(`Missing store payload for ${entry.filename}`);
    }
    const actualHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    if (actualHash !== entry.sha256) {
      throw new Error(`SHA-256 checksum mismatch for ${entry.filename}. Restore aborted.`);
    }
    JSON.parse(content);
    verifiedEntries.push({ filename: entry.filename, content });
  }

  const preRestore = await createBackupSnapshot('PRE_RESTORE');

  for (const item of verifiedEntries) {
    writeAtomicUtf8(getDataFilePath(item.filename), item.content);
  }

  return {
    restoredFiles: verifiedEntries.map((e) => e.filename),
    preRestoreBackupId: preRestore.backupId,
  };
}

export async function restoreFromSnapshotId(
  backupId: string
): Promise<{ restoredFiles: string[]; preRestoreBackupId: string }> {
  if (!backupId || path.basename(backupId) !== backupId || backupId.includes('..')) {
    throw new Error('Invalid snapshot backup ID.');
  }

  const integrity = await verifyBackupIntegrity(backupId);
  if (!integrity.valid) {
    throw new Error(`Snapshot integrity verification failed: ${integrity.errors.join('; ')}`);
  }

  const snapshotDir = path.join(getBackupDir(), backupId);
  const files = fs
    .readdirSync(snapshotDir)
    .filter((f) => isSafeStoreFilename(f) && f !== 'backup-meta.json');

  const preRestore = await createBackupSnapshot('PRE_RESTORE');
  const restoredFiles: string[] = [];

  for (const filename of files) {
    const content = fs.readFileSync(path.join(snapshotDir, filename), 'utf8');
    JSON.parse(content);
    writeAtomicUtf8(getDataFilePath(filename), content);
    restoredFiles.push(filename);
  }

  return {
    restoredFiles,
    preRestoreBackupId: preRestore.backupId,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (body.bundle) {
      const result = await restoreFromBundle(body.bundle as PortableFactoryBackupBundle);
      return NextResponse.json({
        success: true,
        message: `Verified SHA-256 checksums and restored ${result.restoredFiles.length} stores cleanly.`,
        ...result,
        dataDir: getDataDir(),
      });
    }

    if (body.backupId) {
      const result = await restoreFromSnapshotId(String(body.backupId));
      return NextResponse.json({
        success: true,
        message: `Restored snapshot ${body.backupId} (${result.restoredFiles.length} stores verified).`,
        ...result,
        dataDir: getDataDir(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide either a portable backup bundle or a local backupId.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Restore failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
