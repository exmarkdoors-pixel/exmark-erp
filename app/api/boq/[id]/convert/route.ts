import { NextRequest, NextResponse } from 'next/server';
import {
  getBoq,
  convertToQuotation,
} from '@/lib/services/boqService';
import { createQuotation } from '@/lib/services/quotationService';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const boq = await getBoq(id);
    if (!boq) {
      return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
    }

    if (!boq.items || boq.items.length === 0) {
      return NextResponse.json({ success: false, error: 'BOQ must have at least one item to convert' }, { status: 400 });
    }

    // Convert status in BOQ
    const updatedBoq = await convertToQuotation(id);

    // Create corresponding quotation
    const quotation = await createQuotation({
      customerId: boq.customerId || boq.id,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: `Converted from BOQ ${boq.boqNumber} - Project: ${boq.projectName}`,
      items: boq.items.map((item) => ({
        doorCategory: item.productCategory === 'WPC' ? 'WPC_DOORS' : 'FRP_DOORS',
        doorModel: item.model,
        heightMm: item.heightMm,
        widthMm: item.widthMm,
        thicknessMm: 32,
        quantity: item.quantity,
        unitPrice: item.unitRate,
        gstRate: item.taxRate,
        totalPrice: item.amount,
      })),
    });

    return NextResponse.json({
      success: true,
      message: 'BOQ successfully converted to Quotation',
      data: {
        boq: updatedBoq,
        quotation,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert BOQ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
