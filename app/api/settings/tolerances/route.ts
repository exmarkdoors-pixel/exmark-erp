import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getTolerancePresets, createTolerancePreset } from '@/lib/services/toleranceService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const data = getTolerancePresets();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tolerance presets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tolerance preset name is required.' },
        { status: 400 }
      );
    }

    const preset = createTolerancePreset({
      name: body.name,
      heightDeductionMm: body.heightDeductionMm,
      widthDeductionMm: body.widthDeductionMm,
      applicableFor: body.applicableFor,
      description: body.description,
      isDefault: body.isDefault,
    });

    return NextResponse.json({ success: true, data: preset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create tolerance preset' },
      { status: 500 }
    );
  }
}
