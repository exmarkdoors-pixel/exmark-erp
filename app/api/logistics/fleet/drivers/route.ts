import { NextRequest, NextResponse } from 'next/server';
import { listDrivers, createDriver } from '@/lib/services/fleetService';

export async function GET() {
  try {
    const drivers = await listDrivers();
    return NextResponse.json({ success: true, data: drivers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch drivers';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newDriver = await createDriver(body);
    return NextResponse.json({ success: true, data: newDriver }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create driver';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
