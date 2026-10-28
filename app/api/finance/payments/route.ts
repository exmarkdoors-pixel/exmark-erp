import { NextRequest, NextResponse } from 'next/server';
import {
  listPayments,
  recordPayment,
  PaymentMode,
} from '@/lib/services/financeService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts', ['Super Admin', 'Management', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const payments = await listPayments();
    return NextResponse.json({ success: true, data: payments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts', ['Super Admin', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.customerId) {
      return NextResponse.json({ success: false, error: 'Customer is required' }, { status: 400 });
    }
    if (!body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid positive payment amount is required' }, { status: 400 });
    }
    if (!body.paymentMode) {
      return NextResponse.json({ success: false, error: 'Payment mode is required' }, { status: 400 });
    }

    const payment = await recordPayment({
      invoiceId: body.invoiceId || null,
      customerId: body.customerId,
      customerName: body.customerName || 'Customer',
      amount: Number(body.amount),
      paymentMode: body.paymentMode as PaymentMode,
      referenceNumber: body.referenceNumber || null,
      notes: body.notes?.trim(),
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record payment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
