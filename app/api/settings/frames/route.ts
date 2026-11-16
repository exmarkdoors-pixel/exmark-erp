import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getCustomFrames, createCustomFrame } from '@/lib/services/frameService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const data = getCustomFrames();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch custom frames' },
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
        { success: false, error: 'Frame name is required.' },
        { status: 400 }
      );
    }

    const frame = createCustomFrame({
      name: body.name,
      material: body.material,
      wallThicknessMm: body.wallThicknessMm,
      sectionWidthMm: body.sectionWidthMm,
      rebateDepthMm: body.rebateDepthMm,
      hDeductionCm: body.hDeductionCm,
      wDeductionCm: body.wDeductionCm,
      pieceRateCost: body.pieceRateCost,
      sellingPrice: body.sellingPrice,
      quotationExtraRate: body.quotationExtraRate,
      woodThicknessCm: body.woodThicknessCm,
      woodWidthCm: body.woodWidthCm,
      woodLengthDeductionCm: body.woodLengthDeductionCm,
      description: body.description,
      isDefault: body.isDefault,
    });

    return NextResponse.json({ success: true, data: frame }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create custom frame' },
      { status: 500 }
    );
  }
}
