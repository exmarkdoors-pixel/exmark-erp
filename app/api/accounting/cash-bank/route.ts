import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  computeCashBankWithBalances,
  createCashBankAccount,
  createContraTransfer,
  deleteCashBankAccount,
  deleteContraTransfer,
  getAccountStatement,
  readAccountingStore,
  updateCashBankAccount,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const store = readAccountingStore();
    const accounts = computeCashBankWithBalances(store);
    const { searchParams } = new URL(req.url);
    const passbookAccountId = searchParams.get('passbookAccountId') || '';

    let passbook = null;
    if (passbookAccountId) {
      const target = accounts.find((a) => a.id === passbookAccountId);
      if (target) {
        passbook = getAccountStatement({
          mode: 'ACCOUNT',
          accountId: target.coaAccountId,
          fromDate: searchParams.get('fromDate') || '2000-01-01',
          toDate: searchParams.get('toDate') || '2099-12-31',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        contraTransfers: store.contraTransfers,
        passbook,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load Cash & Bank accounts';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const kind = String(body.kind || 'ACCOUNT').toUpperCase();
    const createdBy = auth.user?.name || auth.user?.email || 'Super Admin';

    if (kind === 'CONTRA') {
      const record = createContraTransfer({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Contra Transfer ${record.voucherNumber} posted.` });
    }
    const account = createCashBankAccount(body);
    return NextResponse.json({ success: true, data: account, message: `Cash/Bank account "${account.name}" created.` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save Cash & Bank record';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing account id' }, { status: 400 });
    const updated = updateCashBankAccount(body.id, body);
    return NextResponse.json({ success: true, data: updated, message: `Updated "${updated.name}".` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update Cash/Bank account';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const kind = (searchParams.get('kind') || 'ACCOUNT').toUpperCase();
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    if (kind === 'CONTRA') {
      deleteContraTransfer(id);
      return NextResponse.json({ success: true, message: 'Contra transfer deleted.' });
    }
    const deleted = deleteCashBankAccount(id);
    return NextResponse.json({ success: true, data: deleted, message: `Deleted "${deleted.name}".` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete Cash & Bank item';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
