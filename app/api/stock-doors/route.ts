import { NextRequest, NextResponse } from 'next/server';
import {
  listReadyStockDoors,
  createReadyStockDoor,
  updateReadyStockDoor,
  deleteReadyStockDoor,
  allocateStockDoor,
  releaseStockDoor,
  getReadyStockDoor,
  sellStockDoor,
  returnDeliveredDoorToStock,
} from '@/lib/services/readyStockDoorService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const item = await getReadyStockDoor(id);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: item });
    }

    const status = searchParams.get('status') || 'ALL';
    const itemType = searchParams.get('itemType') || 'ALL';
    const condition = searchParams.get('condition') || 'ALL';
    const search = searchParams.get('search') || '';

    const data = await listReadyStockDoors({ status, itemType, condition, search });
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list ready stock doors';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '').toUpperCase();

    if (action === 'ALLOCATE') {
      const { id, referenceNo, customerName } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Missing stock door ID' }, { status: 400 });
      const allocated = await allocateStockDoor(id, referenceNo || 'DIRECT', customerName || 'Direct Customer');
      return NextResponse.json({ success: true, data: allocated });
    }

    if (action === 'RELEASE') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Missing stock door ID' }, { status: 400 });
      const released = await releaseStockDoor(id);
      return NextResponse.json({ success: true, data: released });
    }

    if (action === 'SELL') {
      const { id, salePrice, customerName, salespersonId, salespersonCode, salespersonName, notes } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Missing stock door ID' }, { status: 400 });
      if (!customerName?.trim()) return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 });
      const sold = await sellStockDoor({
        id,
        salePrice: Number(salePrice),
        customerName: customerName.trim(),
        salespersonId,
        salespersonCode,
        salespersonName,
        notes,
      });
      return NextResponse.json({ success: true, data: sold });
    }

    if (action === 'RETURN_DELIVERY') {
      const restocked = await returnDeliveredDoorToStock(body);
      return NextResponse.json({ success: true, data: restocked });
    }

    // Default: create new stock door
    const created = await createReadyStockDoor(body);
    return NextResponse.json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process ready stock door request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing stock door ID' }, { status: 400 });
    const updated = await updateReadyStockDoor(id, patch);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update ready stock door';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing stock door ID' }, { status: 400 });
    const success = await deleteReadyStockDoor(id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete ready stock door';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
