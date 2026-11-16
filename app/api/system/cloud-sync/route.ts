import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  detectLocalGoogleDriveFolders,
  saveCloudSyncSecrets,
  saveCloudSyncState,
} from '@/lib/services/cloudSyncConfigService';
import {
  getCloudSyncOverview,
  inspectCloudDiff,
  listDriveBackupsSafe,
  pullFromCloudSync,
  pushToCloudSync,
  restoreFromGoogleDriveBackupId,
  testCloudConnections,
} from '@/lib/services/cloudSyncService';
import { uploadVaultBackupToGoogleDrive } from '@/lib/services/googleDriveSyncService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const includeDiff = searchParams.get('diff') === 'true';
    const includeDriveList = searchParams.get('driveFiles') === 'true';

    const overview = await getCloudSyncOverview();
    const detectedDriveFolders = detectLocalGoogleDriveFolders();

    let remoteDiff = null;
    if (includeDiff && overview.secretsSummary.hasDatabaseUrl && overview.state.postgresEnabled) {
      try {
        remoteDiff = await inspectCloudDiff();
      } catch (err: unknown) {
        remoteDiff = {
          error: err instanceof Error ? err.message : 'Unable to fetch remote diff',
        };
      }
    }

    let driveBackups = null;
    if (includeDriveList && overview.state.driveEnabled) {
      try {
        driveBackups = await listDriveBackupsSafe();
      } catch (err: unknown) {
        driveBackups = {
          error: err instanceof Error ? err.message : 'Unable to list Google Drive backups',
        };
      }
    }

    return NextResponse.json({
      success: true,
      overview,
      detectedDriveFolders,
      remoteDiff,
      driveBackups,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load cloud sync overview';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = String(body?.action || '');

    if (action === 'SAVE_CONFIG') {
      const secretsPatch: Record<string, string> = {};
      if (body.clearDatabaseUrl === true) {
        secretsPatch.cloudDatabaseUrl = '';
      } else if (typeof body.cloudDatabaseUrl === 'string' && body.cloudDatabaseUrl.trim()) {
        secretsPatch.cloudDatabaseUrl = body.cloudDatabaseUrl.trim();
      }

      if (body.clearOAuth === true) {
        secretsPatch.oauthClientId = '';
        secretsPatch.oauthClientSecret = '';
        secretsPatch.oauthRefreshToken = '';
      } else {
        if (typeof body.oauthClientId === 'string' && body.oauthClientId.trim()) {
          secretsPatch.oauthClientId = body.oauthClientId.trim();
        }
        if (typeof body.oauthClientSecret === 'string' && body.oauthClientSecret.trim()) {
          secretsPatch.oauthClientSecret = body.oauthClientSecret.trim();
        }
        if (typeof body.oauthRefreshToken === 'string' && body.oauthRefreshToken.trim()) {
          secretsPatch.oauthRefreshToken = body.oauthRefreshToken.trim();
        }
      }

      if (body.clearWebhook === true) {
        secretsPatch.appsScriptWebhookUrl = '';
        secretsPatch.appsScriptToken = '';
      } else {
        if (typeof body.appsScriptWebhookUrl === 'string' && body.appsScriptWebhookUrl.trim()) {
          secretsPatch.appsScriptWebhookUrl = body.appsScriptWebhookUrl.trim();
        }
        if (typeof body.appsScriptToken === 'string' && body.appsScriptToken.trim()) {
          secretsPatch.appsScriptToken = body.appsScriptToken.trim();
        }
      }

      if (Object.keys(secretsPatch).length > 0) {
        saveCloudSyncSecrets(secretsPatch);
      }

      saveCloudSyncState({
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
        postgresEnabled: body.postgresEnabled !== undefined ? Boolean(body.postgresEnabled) : undefined,
        driveEnabled: body.driveEnabled !== undefined ? Boolean(body.driveEnabled) : undefined,
        driveMode: body.driveMode || undefined,
        driveLocalFolder: body.driveLocalFolder !== undefined ? String(body.driveLocalFolder) : undefined,
        googleAccountEmail:
          body.googleAccountEmail !== undefined ? String(body.googleAccountEmail).trim() : undefined,
        driveFolderName: body.driveFolderName !== undefined ? String(body.driveFolderName).trim() : undefined,
        autoSyncIntervalMinutes:
          body.autoSyncIntervalMinutes !== undefined ? Number(body.autoSyncIntervalMinutes) : undefined,
        driveRetentionCount:
          body.driveRetentionCount !== undefined ? Number(body.driveRetentionCount) : undefined,
        deviceName: body.deviceName !== undefined ? String(body.deviceName).trim() : undefined,
      });

      const overview = await getCloudSyncOverview();
      return NextResponse.json({
        success: true,
        message: 'Cloud Sync settings saved cleanly (credentials encrypted in .cloud-sync-secrets.enc).',
        overview,
      });
    }

    if (action === 'TEST_CONNECTION') {
      const overrideDbUrl =
        typeof body.cloudDatabaseUrl === 'string' && body.cloudDatabaseUrl.trim()
          ? body.cloudDatabaseUrl.trim()
          : undefined;
      const report = await testCloudConnections({ overrideDatabaseUrl: overrideDbUrl });
      return NextResponse.json({ success: true, report });
    }

    if (action === 'PUSH_NOW') {
      const result = await pushToCloudSync({
        forceAll: Boolean(body.forceAll),
        includeDrive: body.includeDrive !== undefined ? Boolean(body.includeDrive) : undefined,
      });
      const overview = await getCloudSyncOverview();
      return NextResponse.json({ success: result.success, result, overview });
    }

    if (action === 'INSPECT_DIFF') {
      const diff = await inspectCloudDiff();
      return NextResponse.json({ success: true, diff });
    }

    if (action === 'PULL_FROM_POSTGRES') {
      const mode = body.mode === 'OVERWRITE_ALL' ? 'OVERWRITE_ALL' : 'MERGE_NEWER';
      const result = await pullFromCloudSync({ mode });
      const overview = await getCloudSyncOverview();
      return NextResponse.json({ success: true, result, overview });
    }

    if (action === 'BACKUP_TO_DRIVE') {
      const result = await uploadVaultBackupToGoogleDrive();
      saveCloudSyncState({ lastDriveBackupAt: new Date().toISOString() });
      const overview = await getCloudSyncOverview();
      return NextResponse.json({ success: true, result, overview });
    }

    if (action === 'LIST_DRIVE_BACKUPS') {
      const files = await listDriveBackupsSafe();
      return NextResponse.json({ success: true, files });
    }

    if (action === 'RESTORE_DRIVE_BACKUP') {
      const fileId = String(body.fileId || '').trim();
      if (!fileId) {
        return NextResponse.json({ success: false, error: 'fileId is required.' }, { status: 400 });
      }
      const result = await restoreFromGoogleDriveBackupId(fileId);
      const overview = await getCloudSyncOverview();
      return NextResponse.json({ success: true, result, overview });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cloud Sync operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
