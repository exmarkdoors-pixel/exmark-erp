import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getDataDir } from '@/lib/utils/dataPaths';
import { getAppVersion, getSchemaStatus } from '@/lib/services/schemaMigrator';

export interface BackupFileChecksum {
  filename: string;
  sha256: string;
  bytes: number;
}

export interface PortableFactoryBackupBundle {
  bundleVersion: number;
  exportedAt: string;
  appVersion: string;
  schemaVersion: number;
  dataDir: string;
  storeCount: number;
  manifest: BackupFileChecksum[];
  bundleSha256: string;
  stores: Record<string, string>;
}

export function buildPortableBackupBundle(): PortableFactoryBackupBundle {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const files = fs
    .readdirSync(dataDir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('.') && name !== 'cloud-sync-state.json')
    .sort();

  const stores: Record<string, string> = {};
  const manifest: BackupFileChecksum[] = [];

  for (const filename of files) {
    const fullPath = path.join(dataDir, filename);
    if (!fs.statSync(fullPath).isFile()) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const sha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    stores[filename] = content;
    manifest.push({
      filename,
      sha256,
      bytes: Buffer.byteLength(content, 'utf8'),
    });
  }

  const bundleSha256 = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex');

  const schemaStatus = getSchemaStatus();

  return {
    bundleVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    schemaVersion: schemaStatus.schemaVersion,
    dataDir,
    storeCount: manifest.length,
    manifest,
    bundleSha256,
    stores,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const bundle = buildPortableBackupBundle();
    const dateStamp = new Date().toISOString().split('T')[0];

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="exmark-factory-backup-${dateStamp}.json"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate backup download';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
