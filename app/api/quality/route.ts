import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listQcInspections,
  createQcInspection,
  updateQcInspection,
  deleteQcInspection,
} from '@/lib/services/plantOpsFuturePhaseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'quality');
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ success: true, data: listQcInspections() });
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'quality');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const created = createQcInspection({
      ...body,
      inspectorName: body?.inspectorName || auth.user?.name || 'QA Inspector',
    });
    return NextResponse.json({ success: true, data: created, message: `QC inspection ${created.id} logged.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to log QC inspection' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRequest(req, 'quality');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    if (!body?.id) throw new Error('Inspection ID is required.');
    const updated = updateQcInspection(String(body.id), body);
    return NextResponse.json({ success: true, data: updated, message: `QC inspection ${updated.id} updated.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update QC inspection' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'quality');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('Inspection ID is required.');
    deleteQcInspection(id);
    return NextResponse.json({ success: true, message: `QC inspection ${id} deleted.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete QC inspection' },
      { status: 400 }
    );
  }
}
