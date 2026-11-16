import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { calculateBreakEven } from '@/lib/services/financeService';
import {
  applySampleKeralaPlantOverheads,
  computeComprehensiveBreakEven,
  deleteFixedOverheadItem,
  FixedOverheadCategory,
  saveFixedOverheadItem,
} from '@/lib/services/breakEvenService';

const VALID_OVERHEAD_CATS = new Set<FixedOverheadCategory>([
  'FACTORY_RENT',
  'SALARIES_FIXED',
  'ELECTRICITY_UTILITIES',
  'LOAN_EMI_DEPRECIATION',
  'OFFICE_ADMIN',
  'OTHER_FIXED',
]);

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    const fixedOverhead = searchParams.get('fixedOverhead');
    const avgPrice = searchParams.get('avgPrice');
    const varCost = searchParams.get('varCost');
    const targetRevenue = searchParams.get('targetRevenue');
    const targetProfit = searchParams.get('targetProfit');
    const workingDays = searchParams.get('workingDays');

    // Backward-compatible quick simulator calculation when explicit simulator inputs are requested
    if (mode === 'simulator' || (fixedOverhead && avgPrice && varCost)) {
      const analysis = calculateBreakEven({
        fixedOverheadCosts: fixedOverhead ? parseFloat(fixedOverhead) : undefined,
        averageFRPPricePerDoor: avgPrice ? parseFloat(avgPrice) : undefined,
        variableCostPerDoor: varCost ? parseFloat(varCost) : undefined,
        targetSalesRevenue: targetRevenue ? parseFloat(targetRevenue) : undefined,
        targetProfit: targetProfit ? parseFloat(targetProfit) : undefined,
        workingDaysPerMonth: workingDays ? parseFloat(workingDays) : undefined,
      });
      return NextResponse.json({ success: true, data: analysis });
    }

    const month = searchParams.get('month') || undefined;
    const costDataSource =
      searchParams.get('costDataSource') === 'IMPORTED_MONTH_DAYBOOK'
        ? 'IMPORTED_MONTH_DAYBOOK'
        : 'HYBRID_ERP';
    const includeProjectedCosts = searchParams.get('includeProjected') !== 'false';
    const includeFloorConsumables = searchParams.get('includeFloorConsumables') !== 'false';

    const report = await computeComprehensiveBreakEven({
      month,
      costDataSource,
      includeProjectedCosts,
      includeFloorConsumables,
      workingDaysPerMonth: workingDays ? parseFloat(workingDays) : undefined,
      targetProfit: targetProfit ? parseFloat(targetProfit) : undefined,
      targetSalesRevenue: targetRevenue ? parseFloat(targetRevenue) : undefined,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate break-even';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (body?.action === 'LOAD_SAMPLE_PRESET') {
      const store = applySampleKeralaPlantOverheads();
      return NextResponse.json({ success: true, data: store });
    }

    const category = VALID_OVERHEAD_CATS.has(body?.category)
      ? (body.category as FixedOverheadCategory)
      : 'OTHER_FIXED';

    const saved = saveFixedOverheadItem({
      id: body?.id ? String(body.id) : undefined,
      category,
      name: String(body?.name || ''),
      monthlyAmount: Number(body?.monthlyAmount ?? 0),
      active: body?.active !== false,
      notes: body?.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save fixed overhead';
    const status = message.includes('required') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json({ success: false, error: 'Overhead id is required' }, { status: 400 });
    }

    const category = VALID_OVERHEAD_CATS.has(body?.category)
      ? (body.category as FixedOverheadCategory)
      : 'OTHER_FIXED';

    const updated = saveFixedOverheadItem({
      id: String(body.id),
      category,
      name: String(body?.name || 'Overhead'),
      monthlyAmount: Number(body?.monthlyAmount ?? 0),
      active: body?.active !== undefined ? Boolean(body.active) : true,
      notes: body?.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update fixed overhead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ success: false, error: 'Overhead id is required' }, { status: 400 });
    }

    const deleted = deleteFixedOverheadItem(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Overhead item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete fixed overhead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
