import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { checkForSystemUpdates } from '@/lib/services/updateManager';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const channel = (url.searchParams.get('channel') as 'production' | 'staging') || 'production';
    const forceRefresh = url.searchParams.get('force') === 'true';

    const updateInfo = await checkForSystemUpdates({ channel, forceRefresh });

    return NextResponse.json({
      success: true,
      ...updateInfo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check for system updates';
    console.error('[API /api/system/update/check] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
