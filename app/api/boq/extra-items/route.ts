import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  addBoqExtraItem,
  deleteBoqExtraItem,
  listBoqExtraItems,
  updateBoqExtraItem,
} from '@/lib/services/boqExtraItemsService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const orderKey = searchParams.get('orderKey');
    const items = await listBoqExtraItems(orderKey ? orderKey.split(',') : undefined);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error loading BOQ extra items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load extra BOQ issue items' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Inventory',
      'Purchase',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body?.itemName || typeof body.itemName !== 'string' || !body.itemName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Item name is required' },
        { status: 400 }
      );
    }

    const created = await addBoqExtraItem({
      orderKey: String(body.orderKey || 'GENERAL'),
      itemName: body.itemName,
      category: body.category,
      specNote: body.specNote,
      quantity: Number(body.quantity ?? 1),
      unit: body.unit,
      unitRate: Number(body.unitRate ?? 0),
      issueShift: body.issueShift,
      issueDate: body.issueDate,
      gangName: body.gangName,
      isFloorConsumable: body.isFloorConsumable,
      poNumber: body.poNumber,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating BOQ extra item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add extra issue item' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Inventory',
      'Purchase',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body?.id || typeof body.id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Item id is required' },
        { status: 400 }
      );
    }

    const updated = await updateBoqExtraItem(body.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating BOQ extra item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update extra issue item' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Item id is required' }, { status: 400 });
    }
    const deleted = await deleteBoqExtraItem(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting BOQ extra item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete extra issue item' },
      { status: 500 }
    );
  }
}
