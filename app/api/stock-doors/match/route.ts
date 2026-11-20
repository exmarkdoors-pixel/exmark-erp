import { NextRequest, NextResponse } from 'next/server';
import { matchStockDoors, StockMatchQuery } from '@/lib/services/readyStockDoorService';

export async function POST(req: NextRequest) {
  try {
    const body: StockMatchQuery = await req.json();

    const result = await matchStockDoors({
      targetDoorHeightMm: body.targetDoorHeightMm ? Number(body.targetDoorHeightMm) : undefined,
      targetDoorWidthMm: body.targetDoorWidthMm ? Number(body.targetDoorWidthMm) : undefined,
      targetFrameHeightMm: body.targetFrameHeightMm ? Number(body.targetFrameHeightMm) : undefined,
      targetFrameWidthMm: body.targetFrameWidthMm ? Number(body.targetFrameWidthMm) : undefined,
      targetModel: body.targetModel,
      targetColor: body.targetColor,
      toleranceMm: body.toleranceMm !== undefined ? Number(body.toleranceMm) : 10,
      requestType: body.requestType || 'ANY',
    });

    return NextResponse.json({
      success: true,
      totalMatches: result.totalMatches,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stock matching query failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
