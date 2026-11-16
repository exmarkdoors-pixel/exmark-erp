import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getBoqCustomUsage,
  saveBoqCustomUsage,
  clearBoqCustomUsage,
} from '@/lib/services/boqCustomUsageService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const batchKey = searchParams.get('batchKey') || 'CONSOLIDATED_BATCH';

    const record = await getBoqCustomUsage(batchKey);
    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch custom BOQ usage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const batchKey = body.batchKey || 'CONSOLIDATED_BATCH';

    const saved = await saveBoqCustomUsage(batchKey, {
      bufferPercent: body.bufferPercent,
      overrides: body.overrides,
      supervisorNotes: body.supervisorNotes,
      updatedBy: body.updatedBy,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save custom BOQ usage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const batchKey = searchParams.get('batchKey') || 'CONSOLIDATED_BATCH';

    const cleared = await clearBoqCustomUsage(batchKey);
    return NextResponse.json({ success: true, cleared });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear custom BOQ usage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
