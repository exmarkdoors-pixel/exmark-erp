import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  createChartAccount,
  deleteChartAccount,
  listChartOfAccounts,
  updateChartAccount,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const accounts = listChartOfAccounts();
    return NextResponse.json({ success: true, data: accounts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load Chart of Accounts';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const created = createChartAccount(body);
    return NextResponse.json({
      success: true,
      data: created,
      message: `Account ${created.code} — ${created.name} created.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create account';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing account id' }, { status: 400 });
    const updated = updateChartAccount(body.id, body);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Account ${updated.code} — ${updated.name} updated.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update account';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ success: false, error: 'Missing account id' }, { status: 400 });
    const deleted = deleteChartAccount(id);
    return NextResponse.json({
      success: true,
      data: deleted,
      message: `Account "${deleted.name}" deleted from Chart of Accounts.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete account';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
