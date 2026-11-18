import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listGatePasses,
  createGatePass,
  updateGatePass,
  deleteGatePass,
} from '@/lib/services/plantOpsFuturePhaseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'gate-pass');
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ success: true, data: listGatePasses() });
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'gate-pass');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const created = createGatePass(body);
    return NextResponse.json({ success: true, data: created, message: `Gate pass ${created.id} issued.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create gate pass' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRequest(req, 'gate-pass');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    if (!body?.id) throw new Error('Gate pass ID is required.');
    const updated = updateGatePass(String(body.id), body);
    return NextResponse.json({ success: true, data: updated, message: `Gate pass ${updated.id} updated.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update gate pass' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'gate-pass');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('Gate pass ID is required.');
    deleteGatePass(id);
    return NextResponse.json({ success: true, message: `Gate pass ${id} deleted.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete gate pass' },
      { status: 400 }
    );
  }
}
