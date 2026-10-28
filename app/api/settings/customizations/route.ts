import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveConfiguration,
  getDraftConfiguration,
  getRevisionHistory,
  saveDraftConfiguration,
  publishConfiguration,
  rollbackConfiguration,
} from '@/lib/services/customizationService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'active';

    if (view === 'revisions') {
      const revisions = await getRevisionHistory();
      return NextResponse.json({ success: true, count: revisions.length, data: revisions });
    }

    if (view === 'draft') {
      const draft = await getDraftConfiguration();
      return NextResponse.json({ success: true, data: draft });
    }

    const active = await getActiveConfiguration();
    return NextResponse.json({ success: true, data: active });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve configuration';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only Super Admin and Management can modify or publish settings
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = body.action as 'SAVE_DRAFT' | 'PUBLISH' | 'ROLLBACK';
    const userName = auth.user?.name || 'Administrator';

    if (action === 'SAVE_DRAFT') {
      const draft = await saveDraftConfiguration(body.draft, userName);
      return NextResponse.json({
        success: true,
        message: 'Settings draft saved successfully.',
        data: draft,
      });
    }

    if (action === 'PUBLISH') {
      const changelog = body.changelog || 'Published updated ERP plant configuration.';
      const result = await publishConfiguration(changelog, userName);
      return NextResponse.json({
        success: true,
        message: `Version ${result.published.version} published successfully.`,
        data: result.published,
        revision: result.revision,
      });
    }

    if (action === 'ROLLBACK') {
      const targetVersion = Number(body.targetVersion);
      if (!targetVersion || targetVersion < 1) {
        return NextResponse.json(
          { success: false, error: 'Valid target version number is required for rollback.' },
          { status: 400 }
        );
      }
      const rolledBack = await rollbackConfiguration(targetVersion, userName);
      return NextResponse.json({
        success: true,
        message: `Successfully rolled back to configuration version ${targetVersion}.`,
        data: rolledBack,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Supported: SAVE_DRAFT, PUBLISH, ROLLBACK.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process configuration update';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
