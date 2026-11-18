import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  createCreditNote,
  createOtherIncome,
  createPaymentIn,
  createSalesInvoice,
  deleteCreditNote,
  deleteOtherIncome,
  deletePaymentIn,
  deleteSalesInvoice,
  readAccountingStore,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const store = readAccountingStore();
    return NextResponse.json({
      success: true,
      data: {
        salesInvoices: store.salesInvoices,
        paymentsIn: store.paymentsIn,
        creditNotes: store.creditNotes,
        otherIncomes: store.otherIncomes,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load sales accounting ledger';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const kind = String(body.kind || '').toUpperCase();
    const createdBy = auth.user?.name || auth.user?.email || 'Super Admin';

    if (kind === 'SALES_INVOICE') {
      const record = createSalesInvoice({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Sales Invoice ${record.invoiceNumber} created.` });
    }
    if (kind === 'PAYMENT_IN') {
      const record = createPaymentIn({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Payment In ${record.receiptNumber} recorded.` });
    }
    if (kind === 'CREDIT_NOTE') {
      const record = createCreditNote({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Credit Note ${record.creditNoteNumber} issued.` });
    }
    if (kind === 'OTHER_INCOME') {
      const record = createOtherIncome({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Other Income ${record.voucherNumber} recorded.` });
    }

    return NextResponse.json({ success: false, error: `Unsupported sales accounting kind: ${kind}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record sales transaction';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const kind = (searchParams.get('kind') || '').toUpperCase();
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });

    if (kind === 'SALES_INVOICE') deleteSalesInvoice(id);
    else if (kind === 'PAYMENT_IN') deletePaymentIn(id);
    else if (kind === 'CREDIT_NOTE') deleteCreditNote(id);
    else if (kind === 'OTHER_INCOME') deleteOtherIncome(id);
    else return NextResponse.json({ success: false, error: `Unsupported kind: ${kind}` }, { status: 400 });

    return NextResponse.json({ success: true, message: 'Entry deleted and journal reversed.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete sales entry';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
