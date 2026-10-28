import { NextRequest, NextResponse } from 'next/server';
import {
  listQuotations,
  createQuotation,
  QuotationFilter,
  QuotationStatus,
} from '@/lib/services/quotationService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const filter: QuotationFilter = {};

    const status = searchParams.get('status') as QuotationStatus | null;
    if (status) filter.status = status;

    const customerId = searchParams.get('customerId');
    if (customerId) filter.customerId = customerId;

    const quotations = await listQuotations(filter);
    return NextResponse.json({ success: true, data: quotations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quotations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.customerId) {
      return NextResponse.json({ success: false, error: 'Customer is required' }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one door item is required' }, { status: 400 });
    }

    const quotation = await createQuotation({
      customerId: body.customerId,
      leadId: body.leadId || null,
      date: body.date || new Date().toISOString().split('T')[0],
      validUntil: body.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      discount: body.discount ? Number(body.discount) : 0,
      notes: body.notes?.trim() || undefined,
      items: body.items.map((item: {
        doorCategory?: string;
        doorModel: string;
        heightMm: number;
        widthMm: number;
        thicknessMm?: number;
        coreType?: string;
        finishColor?: string;
        quantity: number;
        unitPrice: number;
        gstRate?: number;
        totalPrice?: number;
      }) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          doorCategory: (item.doorCategory as 'FRP_DOORS' | 'WPC_DOORS') || 'FRP_DOORS',
          doorModel: item.doorModel,
          heightMm: Number(item.heightMm) || 2100,
          widthMm: Number(item.widthMm) || 900,
          thicknessMm: Number(item.thicknessMm) || 32,
          coreType: item.coreType,
          finishColor: item.finishColor,
          quantity: qty,
          unitPrice,
          gstRate: item.gstRate ?? 18,
          totalPrice: item.totalPrice ?? (qty * unitPrice),
        };
      }),
    });

    return NextResponse.json({ success: true, data: quotation }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
