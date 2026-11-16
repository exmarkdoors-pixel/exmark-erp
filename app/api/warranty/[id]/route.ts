import { NextRequest, NextResponse } from 'next/server';
import { getLocationWarrantyById } from '@/lib/services/locationWarrantyService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warranty = await getLocationWarrantyById(id);

    if (!warranty) {
      return NextResponse.json(
        { success: false, error: `Warranty certificate "${id}" was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: warranty });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve warranty certificate';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
