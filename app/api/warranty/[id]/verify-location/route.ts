import { NextRequest, NextResponse } from 'next/server';
import { verifyWarrantyLocation } from '@/lib/services/locationWarrantyService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const lat = Number(body.latitude);
    const lng = Number(body.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: 'Valid device latitude and longitude are required.' },
        { status: 400 }
      );
    }

    const result = await verifyWarrantyLocation(id, lat, lng);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Location verification failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
