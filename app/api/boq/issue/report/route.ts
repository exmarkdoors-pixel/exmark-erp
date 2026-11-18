import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { buildBoqIssuedReport } from '@/lib/services/boqIssueService';
import { listProductionOrders } from '@/lib/services/productionService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;
    const shift = searchParams.get('shift') || 'ALL';
    const prodOrderId = searchParams.get('prodOrderId') || undefined;
    const search = searchParams.get('search') || undefined;

    const orders = await listProductionOrders();
    const report = buildBoqIssuedReport(orders, {
      fromDate,
      toDate,
      shift,
      prodOrderId,
      search,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to build BOQ issued report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
