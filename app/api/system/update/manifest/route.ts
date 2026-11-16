import { NextResponse } from 'next/server';
import { checkForSystemUpdates } from '@/lib/services/updateManager';

export async function GET() {
  try {
    const updateInfo = await checkForSystemUpdates({ channel: 'production' });

    const manifest = {
      name: 'EXMARK ERP',
      currentVersion: updateInfo.currentVersion,
      latestVersion: updateInfo.latestVersion,
      updateAvailable: updateInfo.updateAvailable,
      releaseDate: updateInfo.releaseDate,
      releaseTag: updateInfo.releaseTag,
      releaseTitle: updateInfo.releaseTitle,
      changelog: updateInfo.changelog,
      downloads: {
        windowsSetupExe: updateInfo.assets.windowsSetupExe
          ? {
              filename: updateInfo.assets.windowsSetupExe.filename,
              url: updateInfo.assets.windowsSetupExe.downloadUrl,
              sizeBytes: updateInfo.assets.windowsSetupExe.sizeBytes,
            }
          : null,
        staffApk: updateInfo.assets.staffApk
          ? {
              filename: updateInfo.assets.staffApk.filename,
              url: updateInfo.assets.staffApk.downloadUrl,
              sizeBytes: updateInfo.assets.staffApk.sizeBytes,
            }
          : null,
      },
      lastCheckedAt: updateInfo.lastCheckedAt,
    };

    return NextResponse.json(manifest, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate update manifest';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
