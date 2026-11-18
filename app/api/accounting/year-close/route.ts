import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  executeFinancialYearClose,
  previewFinancialYearClose,
  unlockAccountingPeriod,
} from '@/lib/services/financialYearCloseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const fromDate = req.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = req.nextUrl.searchParams.get('toDate') || undefined;
    const data = previewFinancialYearClose({ fromDate, toDate });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to preview financial year close' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts', ['Super Admin', 'Management']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const action = String(body?.action || 'CLOSE').toUpperCase();

    if (action === 'UNLOCK') {
      if (auth.user?.role !== 'Super Admin') {
        return NextResponse.json(
          { success: false, error: 'Only Super Admin can unlock a closed financial period.' },
          { status: 403 }
        );
      }
      const res = unlockAccountingPeriod();
      return NextResponse.json({
        success: true,
        data: res,
        message: 'Financial year period lock removed. Audit adjustments are now permitted.',
      });
    }

    const mode =
      body?.mode === 'IN_PLACE' ? 'IN_PLACE' : 'CARRY_FORWARD_NEW_COMPANY';

    const result = executeFinancialYearClose({
      fromDate: String(body?.fromDate || ''),
      toDate: String(body?.toDate || ''),
      mode,
      nextCompanyName: body?.nextCompanyName,
      nextLegalName: body?.nextLegalName,
      copyMasters: body?.copyMasters !== false,
      carryForwardOpenVouchers: body?.carryForwardOpenVouchers !== false,
      switchImmediately: body?.switchImmediately !== false,
      closedBy: auth.user?.name || 'Super Admin',
    });

    return NextResponse.json({
      success: true,
      data: result,
      message:
        mode === 'CARRY_FORWARD_NEW_COMPANY'
          ? `Closed ${result.closeRecord.fyLabel} and created "${result.nextCompanyName}" with carried-forward opening balances.`
          : `Closed & locked ${result.closeRecord.fyLabel} cleanly inside the current company.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Financial year close failed' },
      { status: 400 }
    );
  }
}
