import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getTolerancePresetById,
  updateTolerancePreset,
  deleteTolerancePreset,
} from '@/lib/services/toleranceService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const preset = getTolerancePresetById(id);
    if (!preset) {
      return NextResponse.json({ success: false, error: 'Tolerance preset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: preset });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tolerance preset' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management', 'Plant Supervisor']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();

    const updated = updateTolerancePreset(id, {
      name: body.name,
      heightDeductionMm: body.heightDeductionMm !== undefined ? Number(body.heightDeductionMm) : undefined,
      widthDeductionMm: body.widthDeductionMm !== undefined ? Number(body.widthDeductionMm) : undefined,
      applicableFor: body.applicableFor,
      description: body.description,
      isDefault: body.isDefault !== undefined ? Boolean(body.isDefault) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Tolerance preset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update tolerance preset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management', 'Plant Supervisor']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const ok = deleteTolerancePreset(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Tolerance preset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Tolerance preset deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete tolerance preset' },
      { status: 500 }
    );
  }
}
