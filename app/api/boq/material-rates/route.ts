import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getBoqMaterialRates,
  saveBoqMaterialRates,
  getStockToBoqComparison,
  syncBoqRatesFromStockLedger,
  getLiveStockItemsForBoqExtra,
} from '@/lib/services/boqRateService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rates = await getBoqMaterialRates();
    const withDiff = req.nextUrl.searchParams.get('diff') === 'true';
    const withLiveStock = req.nextUrl.searchParams.get('liveStock') === 'true';

    const diffs = withDiff ? await getStockToBoqComparison() : undefined;
    const liveStockItems = withLiveStock ? getLiveStockItemsForBoqExtra() : undefined;

    return NextResponse.json({
      success: true,
      data: rates,
      diffs,
      liveStockItems,
    });
  } catch (error) {
    console.error('Error fetching BOQ material rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load BOQ material rates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Purchase',
      'Accounts',
      'Inventory',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    // 1. Get Live Diff between Stock Ledger and BOQ
    if (body.action === 'GET_STOCK_DIFF') {
      const diffs = await getStockToBoqComparison();
      const liveStockItems = getLiveStockItemsForBoqExtra();
      return NextResponse.json({
        success: true,
        diffs,
        liveStockItems,
      });
    }

    // 2. Synchronize Stock Ledger Prices & Names to BOQ Formulas
    if (body.action === 'SYNC_FROM_STOCK') {
      const selectedKeys: string[] | undefined = Array.isArray(body.selectedKeys)
        ? body.selectedKeys
        : undefined;
      const result = await syncBoqRatesFromStockLedger(selectedKeys);
      return NextResponse.json({
        success: true,
        data: result.updatedRates,
        diffs: result.diffs,
        updatedCount: result.updatedCount,
        message: `Successfully synchronized ${result.updatedCount} material rate(s) from Stock Ledger into BOQ formulas!`,
      });
    }

    const updated = await saveBoqMaterialRates(body || {});
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error saving BOQ material rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save BOQ material rates' },
      { status: 500 }
    );
  }
}
