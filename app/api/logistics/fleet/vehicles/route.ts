import { NextRequest, NextResponse } from 'next/server';
import { listVehicles, createVehicle } from '@/lib/services/fleetService';

export async function GET() {
  try {
    const vehicles = await listVehicles();
    return NextResponse.json({ success: true, data: vehicles });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch vehicles';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newVehicle = await createVehicle(body);
    return NextResponse.json({ success: true, data: newVehicle }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create vehicle';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
