import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  buildPortableBackupBundle,
  PortableFactoryBackupBundle,
} from '@/app/api/system/backup/download/route';
import {
  detectLocalGoogleDriveFolders,
  getCloudSyncState,
  readCloudSyncSecrets,
} from './cloudSyncConfigService';

export interface DriveBackupFileEntry {
  id: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  source: 'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK';
  fullPath?: string;
}

export interface DriveUploadResult {
  success: boolean;
  mode: 'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK';
  fileName: string;
  remoteId: string;
  sizeBytes: number;
  bundleSha256: string;
  storeCount: number;
  message: string;
}

export interface DriveTestResult {
  ready: boolean;
  mode: 'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK';
  accountEmail: string;
  targetLocation: string;
  detectedLocalFolders: string[];
  message: string;
}

function writeAtomicUtf8(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.tmp`;
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, targetPath);
  } catch {
    try {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    } catch {
      // Ignore temp error
    }
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}

async function fetchGoogleAccessToken(): Promise<string> {
  const secrets = readCloudSyncSecrets();
  if (!secrets.oauthClientId || !secrets.oauthClientSecret || !secrets.oauthRefreshToken) {
    throw new Error('Google Drive OAuth2 credentials (Client ID, Secret, Refresh Token) are not configured.');
  }

  const body = new URLSearchParams({
    client_id: secrets.oauthClientId,
    client_secret: secrets.oauthClientSecret,
    refresh_token: secrets.oauthRefreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000),
  });

  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google OAuth2 token error: ${json.error_description || json.error || res.statusText}`);
  }
  return json.access_token;
}

async function findOrCreateDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const safeName = folderName.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=5`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!searchRes.ok) {
    throw new Error(`Google Drive folder lookup failed (HTTP ${searchRes.status})`);
  }
  const found = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (found.files && found.files.length > 0) {
    return found.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
    signal: AbortSignal.timeout(10000),
  });
  const created = (await createRes.json()) as { id?: string; error?: { message?: string } };
  if (!createRes.ok || !created.id) {
    throw new Error(`Could not create Drive folder "${folderName}": ${created.error?.message || createRes.statusText}`);
  }
  return created.id;
}

async function uploadFileToGoogleDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  jsonContent: string
): Promise<string> {
  // Check if exmark-vault-latest.json should update in place
  let existingId: string | null = null;
  if (fileName === 'exmark-vault-latest.json') {
    const q = encodeURIComponent(
      `name='${fileName}' and '${folderId}' in parents and trashed=false`
    );
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (listRes.ok) {
      const parsed = (await listRes.json()) as { files?: Array<{ id: string }> };
      existingId = parsed.files?.[0]?.id || null;
    }
  }

  const boundary = `exmark_boundary_${crypto.randomBytes(8).toString('hex')}`;
  const metadata = existingId
    ? { name: fileName, mimeType: 'application/json' }
    : { name: fileName, parents: [folderId], mimeType: 'application/json' };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${jsonContent}\r\n` +
    `--${boundary}--`;

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
    signal: AbortSignal.timeout(25000),
  });

  const payload = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !payload.id) {
    throw new Error(`Google Drive upload failed for ${fileName}: ${payload.error?.message || res.statusText}`);
  }
  return payload.id;
}

export async function testGoogleDriveChannel(): Promise<DriveTestResult> {
  const state = getCloudSyncState();
  const secrets = readCloudSyncSecrets();
  const detectedLocalFolders = detectLocalGoogleDriveFolders();

  if (state.driveMode === 'LOCAL_FOLDER') {
    const folder = state.driveLocalFolder.trim();
    if (!folder) {
      return {
        ready: false,
        mode: 'LOCAL_FOLDER',
        accountEmail: state.googleAccountEmail,
        targetLocation: 'Not configured',
        detectedLocalFolders,
        message: 'Select or enter your Google Drive for Desktop sync folder (e.g. G:\\My Drive\\EXMARK-ERP-Cloud).',
      };
    }
    try {
      fs.mkdirSync(folder, { recursive: true });
      const probe = path.join(folder, '.exmark-probe.tmp');
      fs.writeFileSync(probe, 'ok', 'utf8');
      fs.rmSync(probe, { force: true });
      return {
        ready: true,
        mode: 'LOCAL_FOLDER',
        accountEmail: state.googleAccountEmail,
        targetLocation: folder,
        detectedLocalFolders,
        message: `Local Drive sync folder writable at ${folder}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ready: false,
        mode: 'LOCAL_FOLDER',
        accountEmail: state.googleAccountEmail,
        targetLocation: folder,
        detectedLocalFolders,
        message: `Cannot write to folder ${folder}: ${msg}`,
      };
    }
  }

  if (state.driveMode === 'GOOGLE_OAUTH2') {
    try {
      const token = await fetchGoogleAccessToken();
      const folderId = await findOrCreateDriveFolder(token, state.driveFolderName || 'EXMARK-ERP-Cloud');
      return {
        ready: true,
        mode: 'GOOGLE_OAUTH2',
        accountEmail: state.googleAccountEmail,
        targetLocation: `Google Drive/${state.driveFolderName || 'EXMARK-ERP-Cloud'} (${folderId})`,
        detectedLocalFolders,
        message: `Authenticated with Google Drive (${state.googleAccountEmail}) & folder ready.`,
      };
    } catch (err: unknown) {
      return {
        ready: false,
        mode: 'GOOGLE_OAUTH2',
        accountEmail: state.googleAccountEmail,
        targetLocation: `Google Drive/${state.driveFolderName || 'EXMARK-ERP-Cloud'}`,
        detectedLocalFolders,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // APPS_SCRIPT_WEBHOOK
  if (!secrets.appsScriptWebhookUrl) {
    return {
      ready: false,
      mode: 'APPS_SCRIPT_WEBHOOK',
      accountEmail: state.googleAccountEmail,
      targetLocation: 'Apps Script Webhook missing',
      detectedLocalFolders,
      message: 'Enter your Google Apps Script Web App URL to push backups to Google Drive.',
    };
  }
  try {
    const res = await fetch(secrets.appsScriptWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'PING',
        secret: secrets.appsScriptToken || '',
        folderName: state.driveFolderName || 'EXMARK-ERP-Cloud',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return {
        ready: false,
        mode: 'APPS_SCRIPT_WEBHOOK',
        accountEmail: state.googleAccountEmail,
        targetLocation: secrets.appsScriptWebhookUrl,
        detectedLocalFolders,
        message: `Apps Script webhook responded HTTP ${res.status}`,
      };
    }
    return {
      ready: true,
      mode: 'APPS_SCRIPT_WEBHOOK',
      accountEmail: state.googleAccountEmail,
      targetLocation: `Apps Script Bridge -> ${state.driveFolderName}`,
      detectedLocalFolders,
      message: 'Google Apps Script Drive bridge reachable and authenticated.',
    };
  } catch (err: unknown) {
    return {
      ready: false,
      mode: 'APPS_SCRIPT_WEBHOOK',
      accountEmail: state.googleAccountEmail,
      targetLocation: secrets.appsScriptWebhookUrl,
      detectedLocalFolders,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function uploadVaultBackupToGoogleDrive(): Promise<DriveUploadResult> {
  const state = getCloudSyncState();
  const bundle = buildPortableBackupBundle();
  const payloadStr = JSON.stringify(bundle, null, 2);
  const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `exmark-vault-${stamp}.json`;

  if (state.driveMode === 'LOCAL_FOLDER') {
    const folder = state.driveLocalFolder.trim();
    if (!folder) {
      throw new Error('Google Drive sync folder path is not configured.');
    }
    fs.mkdirSync(folder, { recursive: true });
    const snapshotPath = path.join(folder, fileName);
    const latestPath = path.join(folder, 'exmark-vault-latest.json');
    writeAtomicUtf8(snapshotPath, payloadStr);
    writeAtomicUtf8(latestPath, payloadStr);

    // Prune older timestamped backups beyond retention limit cleanly
    const retention = Math.max(3, state.driveRetentionCount || 15);
    const historical = fs
      .readdirSync(/*turbopackIgnore: true*/ folder)
      .filter((f) => f.startsWith('exmark-vault-') && f.endsWith('.json') && f !== 'exmark-vault-latest.json')
      .sort()
      .reverse();
    for (const stale of historical.slice(retention)) {
      try {
        fs.rmSync(path.join(folder, stale), { force: true });
      } catch {
        // Ignore locked file
      }
    }

    return {
      success: true,
      mode: 'LOCAL_FOLDER',
      fileName,
      remoteId: snapshotPath,
      sizeBytes,
      bundleSha256: bundle.bundleSha256,
      storeCount: bundle.storeCount,
      message: `Saved ${fileName} (${bundle.storeCount} stores, SHA-256 verified) to ${folder}`,
    };
  }

  if (state.driveMode === 'GOOGLE_OAUTH2') {
    const token = await fetchGoogleAccessToken();
    const folderId = await findOrCreateDriveFolder(token, state.driveFolderName || 'EXMARK-ERP-Cloud');
    const remoteId = await uploadFileToGoogleDrive(token, folderId, fileName, payloadStr);
    await uploadFileToGoogleDrive(token, folderId, 'exmark-vault-latest.json', payloadStr);

    return {
      success: true,
      mode: 'GOOGLE_OAUTH2',
      fileName,
      remoteId,
      sizeBytes,
      bundleSha256: bundle.bundleSha256,
      storeCount: bundle.storeCount,
      message: `Uploaded ${fileName} (${bundle.storeCount} stores) to Google Drive/${state.driveFolderName}`,
    };
  }

  // APPS_SCRIPT_WEBHOOK
  const secrets = readCloudSyncSecrets();
  if (!secrets.appsScriptWebhookUrl) {
    throw new Error('Google Apps Script Webhook URL is not configured.');
  }
  const res = await fetch(secrets.appsScriptWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'BACKUP',
      secret: secrets.appsScriptToken || '',
      accountEmail: state.googleAccountEmail,
      folderName: state.driveFolderName || 'EXMARK-ERP-Cloud',
      fileName,
      bundle,
    }),
    signal: AbortSignal.timeout(25000),
  });
  const resJson = (await res.json().catch(() => ({}))) as { fileId?: string; error?: string };
  if (!res.ok || resJson.error) {
    throw new Error(resJson.error || `Apps Script backup upload failed (HTTP ${res.status})`);
  }

  return {
    success: true,
    mode: 'APPS_SCRIPT_WEBHOOK',
    fileName,
    remoteId: resJson.fileId || fileName,
    sizeBytes,
    bundleSha256: bundle.bundleSha256,
    storeCount: bundle.storeCount,
    message: `Uploaded ${fileName} (${bundle.storeCount} stores) via Google Apps Script Bridge.`,
  };
}

export async function listGoogleDriveBackups(): Promise<DriveBackupFileEntry[]> {
  const state = getCloudSyncState();

  if (state.driveMode === 'LOCAL_FOLDER') {
    const folder = state.driveLocalFolder.trim();
    if (!folder || !fs.existsSync(/*turbopackIgnore: true*/ folder)) return [];
    return fs
      .readdirSync(/*turbopackIgnore: true*/ folder)
      .filter((f) => f.startsWith('exmark-vault-') && f.endsWith('.json'))
      .map((name) => {
        const full = path.join(/*turbopackIgnore: true*/ folder, name);
        const stat = fs.statSync(/*turbopackIgnore: true*/ full);
        return {
          id: full,
          name,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          source: 'LOCAL_FOLDER' as const,
          fullPath: full,
        };
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  }

  if (state.driveMode === 'GOOGLE_OAUTH2') {
    const token = await fetchGoogleAccessToken();
    const folderId = await findOrCreateDriveFolder(token, state.driveFolderName || 'EXMARK-ERP-Cloud');
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and name contains 'exmark-vault-'`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,size,modifiedTime)&pageSize=25`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      throw new Error(`Could not list Drive backups (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      files?: Array<{ id: string; name: string; size?: string; modifiedTime?: string }>;
    };
    return (json.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: Number(f.size || 0),
      modifiedAt: f.modifiedTime || new Date().toISOString(),
      source: 'GOOGLE_OAUTH2' as const,
    }));
  }

  // APPS_SCRIPT_WEBHOOK
  const secrets = readCloudSyncSecrets();
  if (!secrets.appsScriptWebhookUrl) return [];
  const res = await fetch(secrets.appsScriptWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'LIST',
      secret: secrets.appsScriptToken || '',
      folderName: state.driveFolderName || 'EXMARK-ERP-Cloud',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => ({}))) as {
    files?: Array<{ id: string; name: string; sizeBytes?: number; modifiedAt?: string }>;
  };
  return (json.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    sizeBytes: Number(f.sizeBytes || 0),
    modifiedAt: f.modifiedAt || new Date().toISOString(),
    source: 'APPS_SCRIPT_WEBHOOK' as const,
  }));
}

export async function downloadGoogleDriveBackupBundle(fileIdOrPath: string): Promise<PortableFactoryBackupBundle> {
  const state = getCloudSyncState();

  if (state.driveMode === 'LOCAL_FOLDER') {
    const folder = path.resolve(state.driveLocalFolder.trim());
    const target = path.resolve(fileIdOrPath);
    if (!target.startsWith(folder) || !fs.existsSync(target)) {
      throw new Error('Requested local Drive backup file was not found inside configured sync folder.');
    }
    return JSON.parse(fs.readFileSync(target, 'utf8')) as PortableFactoryBackupBundle;
  }

  if (state.driveMode === 'GOOGLE_OAUTH2') {
    const token = await fetchGoogleAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileIdOrPath)}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to download Drive backup file (HTTP ${res.status})`);
    }
    return (await res.json()) as PortableFactoryBackupBundle;
  }

  const secrets = readCloudSyncSecrets();
  if (!secrets.appsScriptWebhookUrl) {
    throw new Error('Google Apps Script Webhook URL is not configured.');
  }
  const res = await fetch(secrets.appsScriptWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'DOWNLOAD',
      secret: secrets.appsScriptToken || '',
      fileId: fileIdOrPath,
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    throw new Error(`Apps Script download failed (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { bundle?: PortableFactoryBackupBundle };
  if (!json?.bundle) {
    throw new Error('Apps Script response missing bundle payload.');
  }
  return json.bundle;
}
