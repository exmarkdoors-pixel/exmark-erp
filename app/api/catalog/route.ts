import { NextRequest, NextResponse } from 'next/server';
import {
  getCatalogMaster,
  saveDoorModel,
  deleteDoorModel,
  saveColour,
  deleteColour,
  saveLock,
  deleteLock,
} from '@/lib/services/catalogService';

export async function GET() {
  try {
    const catalog = await getCatalogMaster();
    return NextResponse.json({ success: true, data: catalog });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch catalog';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type as 'MODEL' | 'COLOUR' | 'LOCK';
    const item = body.item;

    if (!type || !item) {
      return NextResponse.json(
        { success: false, error: 'Catalog item type ("MODEL", "COLOUR", "LOCK") and item payload are required.' },
        { status: 400 }
      );
    }

    if (!item.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Item name is required.' },
        { status: 400 }
      );
    }

    let savedItem;
    if (type === 'MODEL') {
      savedItem = await saveDoorModel(item);
    } else if (type === 'COLOUR') {
      savedItem = await saveColour(item);
    } else if (type === 'LOCK') {
      savedItem = await saveLock(item);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid catalog type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: savedItem,
      message: `${type} item saved successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save catalog item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'MODEL' | 'COLOUR' | 'LOCK' | null;
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'Both type ("MODEL", "COLOUR", "LOCK") and id query params are required for deletion.' },
        { status: 400 }
      );
    }

    let success = false;
    if (type === 'MODEL') {
      success = await deleteDoorModel(id);
    } else if (type === 'COLOUR') {
      success = await deleteColour(id);
    } else if (type === 'LOCK') {
      success = await deleteLock(id);
    }

    if (!success) {
      return NextResponse.json({ success: false, error: `${type} item with id ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${type} item deleted successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete catalog item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
