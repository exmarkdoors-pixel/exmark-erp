import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listPartyToPartyPayments,
  createPartyToPartyPayment,
  deletePartyToPartyPayment,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const search = searchParams.get('search') || undefined;

    const list = listPartyToPartyPayments({ fromDate, toDate, search });
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load Party-to-Party payments';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const createdBy = auth.user?.name || auth.user?.email || 'Super Admin';

    const record = createPartyToPartyPayment({
      ...body,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: `Party to Party Payment ${record.voucherNumber} recorded successfully.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record Party to Party payment';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id') || '';
    if (!id) {
      try {
        const body = await req.json();
        id = body.id || '';
      } catch {
        // body might be empty
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing payment record ID' }, { status: 400 });
    }

    deletePartyToPartyPayment(id);
    return NextResponse.json({
      success: true,
      message: 'Party to Party payment deleted and journal entry reversed.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete Party to Party payment';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
