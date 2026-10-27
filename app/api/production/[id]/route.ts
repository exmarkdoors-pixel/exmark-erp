import { NextRequest, NextResponse } from 'next/server';
import {
  getProductionOrder,
  updateProductionStage,
  deleteProductionOrder,
  ProductionStage,
} from '@/lib/services/productionService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getProductionOrder(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.stage) {
      return NextResponse.json({ success: false, error: 'Production stage is required' }, { status: 400 });
    }

    const updated = await updateProductionStage(id, body.stage as ProductionStage);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update production stage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteProductionOrder(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Production order deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
