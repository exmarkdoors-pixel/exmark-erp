import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getFrpRateCardSettings,
  saveFrpRateCardSettings,
  DEFAULT_FRP_RATE_CARD,
} from '@/lib/services/frpPricingEngine';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const settings = getFrpRateCardSettings();
    return NextResponse.json({ success: true, settings, data: settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve pricing rules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (body.resetToDefaults) {
      const reset = saveFrpRateCardSettings(DEFAULT_FRP_RATE_CARD);
      return NextResponse.json({ success: true, settings: reset, message: 'Pricing rules reset to default' });
    }

    const updated = saveFrpRateCardSettings({
      maxWidthCm: body.maxWidthCm !== undefined ? Number(body.maxWidthCm) : undefined,
      maxHeightCm: body.maxHeightCm !== undefined ? Number(body.maxHeightCm) : undefined,
      extraSqftRate: body.extraSqftRate !== undefined ? Number(body.extraSqftRate) : undefined,
      highExtraMaxWidthCm: body.highExtraMaxWidthCm !== undefined ? Number(body.highExtraMaxWidthCm) : undefined,
      highExtraMaxHeightCm: body.highExtraMaxHeightCm !== undefined ? Number(body.highExtraMaxHeightCm) : undefined,
      highExtraSqftRate: body.highExtraSqftRate !== undefined ? Number(body.highExtraSqftRate) : undefined,
      categoryPieceRates: body.categoryPieceRates || undefined,
      belowSizeCalculationMode: body.belowSizeCalculationMode || undefined,
      locks: Array.isArray(body.locks) ? body.locks : undefined,
      colours: Array.isArray(body.colours) ? body.colours : undefined,
      doorThicknesses: Array.isArray(body.doorThicknesses) ? body.doorThicknesses : undefined,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save pricing rules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
