import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listLocationWarranties,
  createLocationWarranty,
} from '@/lib/services/locationWarrantyService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const district = searchParams.get('district') || undefined;
    const status = searchParams.get('status') || undefined;

    const warranties = await listLocationWarranties(district, status);
    return NextResponse.json({ success: true, count: warranties.length, data: warranties });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list warranties';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Sales',
      'Installation',
      'QC Inspector',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.customerName || !body.siteAddress) {
      return NextResponse.json(
        { success: false, error: 'Customer name and site address are required.' },
        { status: 400 }
      );
    }

    const warranty = await createLocationWarranty(body);
    return NextResponse.json({ success: true, data: warranty }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to issue warranty';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
