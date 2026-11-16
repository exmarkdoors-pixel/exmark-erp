import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { runAiStrategistAnalysis, calculateWhatIf } from '@/lib/services/aiStrategistService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts');
    if (auth.errorResponse) return auth.errorResponse;

    const analysis = await runAiStrategistAnalysis();
    return NextResponse.json({ success: true, data: analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run AI Strategist analysis';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const result = calculateWhatIf({
      volumePercentChange: Number(body.volumePercentChange) || 0,
      pricePercentChange: Number(body.pricePercentChange) || 0,
      chemicalCostPercentChange: Number(body.chemicalCostPercentChange) || 0,
      laborEfficiencyPercentChange: Number(body.laborEfficiencyPercentChange) || 0,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate What-If simulation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
