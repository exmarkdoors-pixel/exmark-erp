import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getAccountStatement, readAccountingStore } from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'ACCOUNT').toUpperCase() === 'PARTY' ? 'PARTY' : 'ACCOUNT';
    const accountId = searchParams.get('accountId') || undefined;
    const partyName = searchParams.get('partyName') || undefined;
    const partyType = searchParams.get('partyType') === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const statement = getAccountStatement({ mode, accountId, partyName, partyType, fromDate, toDate });
    const store = readAccountingStore();
    const customers = Array.from(
      new Set([
        ...store.salesInvoices.map((i) => i.customerName),
        ...store.paymentsIn.map((p) => p.customerName),
        ...store.creditNotes.map((c) => c.customerName),
      ].filter(Boolean))
    ).sort();
    const suppliers = Array.from(
      new Set([
        ...store.purchaseBills.map((b) => b.supplierName),
        ...store.paymentsOut.map((p) => p.supplierName),
      ].filter(Boolean))
    ).sort();

    return NextResponse.json({
      success: true,
      data: statement,
      parties: { customers, suppliers },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate account statement';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
