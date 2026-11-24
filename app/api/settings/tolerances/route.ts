import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getFactoryToleranceDefaults,
  saveFactoryToleranceDefaults,
  computeDoorTolerances,
} from '@/lib/services/toleranceSyncEngine';
import {
  getTolerancePresets,
  createTolerancePreset,
} from '@/lib/services/toleranceService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || url.searchParams.get('type');
    const settings = getFactoryToleranceDefaults();
    const presets = getTolerancePresets();

    if (scope === 'settings' || scope === 'defaults') {
      return NextResponse.json({ success: true, settings, data: settings, presets });
    }

    // Default returns presets in data for CustomToleranceManagerModal (Array.isArray(json.data) === true)
    // while preserving settings object in json.settings for AdminCustomizationSettings
    return NextResponse.json({ success: true, settings, presets, data: presets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve tolerance settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management', 'Plant Supervisor']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    // 1. If client requested a tolerance computation
    if (body.action === 'COMPUTE' && body.input) {
      const computed = computeDoorTolerances(body.input);
      return NextResponse.json({ success: true, data: computed });
    }

    // 2. If payload is a CustomTolerancePreset creation
    if (body.name && (body.heightDeductionMm !== undefined || body.widthDeductionMm !== undefined)) {
      const newPreset = createTolerancePreset({
        name: body.name,
        heightDeductionMm: Number(body.heightDeductionMm) || 10,
        widthDeductionMm: Number(body.widthDeductionMm) || 10,
        applicableFor: body.applicableFor,
        description: body.description,
        isDefault: Boolean(body.isDefault),
      });
      return NextResponse.json({ success: true, data: newPreset });
    }

    // 3. Otherwise treat as FactoryToleranceDefaults update
    const updated = saveFactoryToleranceDefaults({
      defaultSideRebateMm: body.defaultSideRebateMm !== undefined ? Number(body.defaultSideRebateMm) : undefined,
      defaultOperatingClearanceMm: body.defaultOperatingClearanceMm !== undefined ? Number(body.defaultOperatingClearanceMm) : undefined,
      defaultBottomTileClearanceMm: body.defaultBottomTileClearanceMm !== undefined ? Number(body.defaultBottomTileClearanceMm) : undefined,
      defaultBottomUnfinishedClearanceMm: body.defaultBottomUnfinishedClearanceMm !== undefined ? Number(body.defaultBottomUnfinishedClearanceMm) : undefined,
      defaultTopGapMm: body.defaultTopGapMm !== undefined ? Number(body.defaultTopGapMm) : undefined,
      stockMatchingToleranceMm: body.stockMatchingToleranceMm !== undefined ? Number(body.stockMatchingToleranceMm) : undefined,
    });

    return NextResponse.json({ success: true, settings: updated, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update tolerance settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
