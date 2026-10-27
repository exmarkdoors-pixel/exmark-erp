import { NextRequest, NextResponse } from 'next/server';
import {
  getBoq,
  addBoqItem,
  deleteBoqItem,
  importBoqFromCsv,
  BoqProductCategory,
} from '@/lib/services/boqService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const boq = await getBoq(id);
    if (!boq) {
      return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: boq.items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch items';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Handle CSV bulk import
    if (body.csvPayload) {
      const updatedBoq = await importBoqFromCsv(id, body.csvPayload);
      return NextResponse.json({ success: true, data: updatedBoq });
    }

    if (!body.model?.trim()) {
      return NextResponse.json({ success: false, error: 'Door model is required' }, { status: 400 });
    }

    const qty = Number(body.quantity) || 1;
    const unitRate = Number(body.unitRate) || 0;
    const amount = body.amount ? Number(body.amount) : qty * unitRate;

    const updatedBoq = await addBoqItem(id, {
      itemCode: body.itemCode || `ITM-${Date.now().toString().slice(-4)}`,
      productCategory: (body.productCategory as BoqProductCategory) || 'FRP',
      model: body.model.trim(),
      description: body.description?.trim(),
      frameDetails: body.frameDetails?.trim(),
      heightMm: Number(body.heightMm) || 2100,
      widthMm: Number(body.widthMm) || 900,
      quantity: qty,
      unitRate,
      amount,
      taxRate: Number(body.taxRate) || 18,
      transportRate: Number(body.transportRate) || 0,
      installationRate: Number(body.installationRate) || 0,
    });

    return NextResponse.json({ success: true, data: updatedBoq }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'itemId is required' }, { status: 400 });
    }

    const updatedBoq = await deleteBoqItem(id, itemId);
    return NextResponse.json({ success: true, data: updatedBoq });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
