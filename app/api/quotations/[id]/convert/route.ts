import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotation,
  convertToOrder,
} from '@/lib/services/quotationService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const quotation = await getQuotation(id);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }

    if (body.advanceAmount !== undefined && Number(body.advanceAmount) < 0) {
      return NextResponse.json({ success: false, error: 'Advance amount cannot be negative' }, { status: 400 });
    }

    const converted = await convertToOrder(id);
    return NextResponse.json({
      success: true,
      message: 'Quotation converted to Sales Order',
      data: {
        quotation: converted,
        advanceRecorded: body.advanceAmount ?? 0,
        salesOrderRef: `EXM-SO-${Date.now().toString().slice(-4)}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
