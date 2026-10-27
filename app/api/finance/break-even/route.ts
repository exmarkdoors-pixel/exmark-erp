import { NextRequest, NextResponse } from 'next/server';
import { calculateBreakEven } from '@/lib/services/financeService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fixedOverhead = searchParams.get('fixedOverhead')
      ? parseFloat(searchParams.get('fixedOverhead')!)
      : undefined;
    const avgPrice = searchParams.get('avgPrice')
      ? parseFloat(searchParams.get('avgPrice')!)
      : undefined;
    const varCost = searchParams.get('varCost')
      ? parseFloat(searchParams.get('varCost')!)
      : undefined;
    const targetRevenue = searchParams.get('targetRevenue')
      ? parseFloat(searchParams.get('targetRevenue')!)
      : undefined;

    const analysis = calculateBreakEven({
      fixedOverheadCosts: fixedOverhead,
      averageFRPPricePerDoor: avgPrice,
      variableCostPerDoor: varCost,
      targetSalesRevenue: targetRevenue,
    });

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate break-even';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
