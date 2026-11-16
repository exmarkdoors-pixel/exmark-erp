import { NextRequest, NextResponse } from 'next/server';
import { getStaffOrderReport, StaffOrderReportFilter } from '@/lib/services/salesTargetService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const salespersonId = searchParams.get('salespersonId') || undefined;
    const frequency = (searchParams.get('frequency')?.toUpperCase() as any) || 'MONTHLY';
    const date = searchParams.get('date') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const month = searchParams.get('month') || undefined;

    const filter: StaffOrderReportFilter = {
      salespersonId,
      frequency,
      date,
      startDate,
      endDate,
      month,
    };

    const report = await getStaffOrderReport(filter);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate staff orders report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
