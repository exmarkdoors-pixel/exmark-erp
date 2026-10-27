import { NextRequest, NextResponse } from 'next/server';
import {
  listInvoices,
  createInvoice,
  InvoiceStatus,
} from '@/lib/services/financeService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as InvoiceStatus | null;
    const customerId = searchParams.get('customerId') || undefined;

    const invoices = await listInvoices({
      status: status || undefined,
      customerId,
    });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }
    if (!body.customerName?.trim()) {
      return NextResponse.json({ success: false, error: 'Customer Name is required' }, { status: 400 });
    }
    if (!body.subtotal || Number(body.subtotal) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid positive subtotal is required' }, { status: 400 });
    }

    const invoice = await createInvoice({
      salesOrderId: body.salesOrderId || null,
      customerId: body.customerId,
      customerName: body.customerName.trim(),
      subtotal: Number(body.subtotal),
      dueDate: body.dueDate,
      eWayBillNumber: body.eWayBillNumber || null,
    });

    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
