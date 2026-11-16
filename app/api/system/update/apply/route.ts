import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { executePreUpdateSafetyPipeline } from '@/lib/services/updateManager';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body optional
    }

    // Step 1: Always execute immutable point-in-time SHA-256 backup snapshot
    const pipelineResult = await executePreUpdateSafetyPipeline();

    return NextResponse.json({
      success: true,
      backupId: pipelineResult.preUpdateBackupId,
      checksumSha256: pipelineResult.checksumSha256,
      filesIncluded: pipelineResult.filesIncluded,
      verified: pipelineResult.verified,
      migrationStatus: pipelineResult.migrationStatus,
      message: pipelineResult.message,
      requestedAction: body.action || 'SAFE_PRE_UPDATE_BACKUP',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pre-update safety pipeline failed';
    console.error('[API /api/system/update/apply] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
