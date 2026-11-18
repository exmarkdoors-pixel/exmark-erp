import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listJobWorkChallans,
  createJobWorkChallan,
  updateJobWorkChallan,
  deleteJobWorkChallan,
} from '@/lib/services/plantOpsFuturePhaseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'job-work');
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ success: true, data: listJobWorkChallans() });
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'job-work');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const created = createJobWorkChallan(body);
    return NextResponse.json({ success: true, data: created, message: `Job work challan ${created.id} created.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create job work challan' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRequest(req, 'job-work');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    if (!body?.id) throw new Error('Challan ID is required.');
    const updated = updateJobWorkChallan(String(body.id), body);
    return NextResponse.json({ success: true, data: updated, message: `Challan ${updated.id} updated.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update job work challan' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'job-work');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('Challan ID is required.');
    deleteJobWorkChallan(id);
    return NextResponse.json({ success: true, message: `Challan ${id} deleted.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete challan' },
      { status: 400 }
    );
  }
}
