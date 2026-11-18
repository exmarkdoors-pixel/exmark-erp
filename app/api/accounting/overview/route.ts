import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getAccountingOverview, updateAccountingSettings } from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const overview = getAccountingOverview();
    return NextResponse.json({ success: true, data: overview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load accounting overview';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const settings = updateAccountingSettings({ gstEnabled: body?.gstEnabled });
    return NextResponse.json({
      success: true,
      data: settings,
      message: settings.gstEnabled ? 'GST tax billing enabled.' : 'GST disabled — running in Direct Sales (Non-GST) mode.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update accounting settings';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
