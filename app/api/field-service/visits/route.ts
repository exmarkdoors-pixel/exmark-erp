import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getCustomerVisits,
  recordCustomerVisit,
} from '@/lib/services/fieldTrackingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId') || undefined;
    const date = searchParams.get('date') || undefined;
    const month = searchParams.get('month') || undefined;

    const visits = getCustomerVisits({ staffId, date, month });
    return NextResponse.json({ success: true, count: visits.length, data: visits });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load customer visits';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.customerName || !body.selfieUrl) {
      return NextResponse.json(
        { success: false, error: 'Customer name and geo-tagged selfie are required' },
        { status: 400 }
      );
    }

    const visit = await recordCustomerVisit({
      staffId: body.staffId || auth.user?.id || 'FIELD-01',
      staffCode: body.staffCode || auth.user?.employeeCode,
      staffName: body.staffName || auth.user?.name || 'Field Staff',
      staffRole: body.staffRole || auth.user?.role,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress || '',
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      accuracyMeters: typeof body.accuracyMeters === 'number' ? body.accuracyMeters : undefined,
      formattedAddress: body.formattedAddress || body.customerAddress || '',
      selfieUrl: body.selfieUrl,
      siteType: body.siteType || 'VILLA',
      stage: body.stage || 'SITE_SURVEY',
      doorCountEstimate: body.doorCountEstimate ? Number(body.doorCountEstimate) : undefined,
      requirementsNotes: body.requirementsNotes,
      followUpDate: body.followUpDate,
      autoCreateCustomerInCrm: body.autoCreateCustomerInCrm !== false,
    });

    return NextResponse.json({ success: true, visit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save customer visit';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
