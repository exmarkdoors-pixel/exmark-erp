import { NextRequest, NextResponse } from 'next/server';
import {
  getFrpRateCardSettings,
  saveFrpRateCardSettings,
  DEFAULT_FRP_RATE_CARD,
} from '@/lib/services/frpPricingEngine';

export async function GET() {
  try {
    const settings = getFrpRateCardSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve pricing rules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.resetToDefaults) {
      const reset = saveFrpRateCardSettings(DEFAULT_FRP_RATE_CARD);
      return NextResponse.json({ success: true, settings: reset, message: 'Pricing rules reset to default' });
    }

    const updated = saveFrpRateCardSettings({
      maxWidthCm: body.maxWidthCm !== undefined ? Number(body.maxWidthCm) : undefined,
      maxHeightCm: body.maxHeightCm !== undefined ? Number(body.maxHeightCm) : undefined,
      extraSqftRate: body.extraSqftRate !== undefined ? Number(body.extraSqftRate) : undefined,
      categoryPieceRates: body.categoryPieceRates || undefined,
      belowSizeCalculationMode: body.belowSizeCalculationMode || undefined,
      locks: Array.isArray(body.locks) ? body.locks : undefined,
      colours: Array.isArray(body.colours) ? body.colours : undefined,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save pricing rules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
