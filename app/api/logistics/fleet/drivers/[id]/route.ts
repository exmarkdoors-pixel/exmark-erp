import { NextRequest, NextResponse } from 'next/server';
import {
  getDriverById,
  updateDriver,
  deleteDriver,
} from '@/lib/services/fleetService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const driver = await getDriverById(id);
    if (!driver) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: driver });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch driver';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await updateDriver(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update driver';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const success = await deleteDriver(id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete driver';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
