import { NextRequest, NextResponse } from 'next/server';
import {
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from '@/lib/services/fleetService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const vehicle = await getVehicleById(id);
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: vehicle });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch vehicle';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await updateVehicle(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update vehicle';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const success = await deleteVehicle(id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete vehicle';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
