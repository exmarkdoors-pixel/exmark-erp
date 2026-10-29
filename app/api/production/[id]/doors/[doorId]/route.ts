import { NextRequest, NextResponse } from 'next/server';
import {
  updateDoorQc,
  updateDoorQcWithChecklist,
  QcStatus,
  QcInspectionRecord,
} from '@/lib/services/productionService';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; doorId: string }> }
) {
  try {
    const { id, doorId } = await params;
    const body = await req.json();

    if (body.inspection) {
      const inspection = body.inspection as QcInspectionRecord;
      const updated = await updateDoorQcWithChecklist(id, doorId, inspection);
      return NextResponse.json({ success: true, data: updated });
    }

    if (!body.qcStatus) {
      return NextResponse.json({ success: false, error: 'qcStatus or inspection record is required' }, { status: 400 });
    }

    const updated = await updateDoorQc(id, doorId, body.qcStatus as QcStatus);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update door QC';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
