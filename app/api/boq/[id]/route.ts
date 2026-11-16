import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getBoq,
  updateBoq,
  deleteBoq,
} from '@/lib/services/boqService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const boq = await getBoq(id);
    if (!boq) {
      return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: boq });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BOQ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const updated = await updateBoq(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update BOQ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, undefined, ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const success = await deleteBoq(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'BOQ deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete BOQ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
