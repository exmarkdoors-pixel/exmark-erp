import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { updateCustomFrame, deleteCustomFrame, getCustomFrameById } from '@/lib/services/frameService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const frame = getCustomFrameById(id);
    if (!frame) {
      return NextResponse.json({ success: false, error: 'Frame not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: frame });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch frame' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();
    const updated = updateCustomFrame(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Frame not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update frame' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const ok = deleteCustomFrame(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Frame not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Frame deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete frame' },
      { status: 500 }
    );
  }
}
