import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { generateAccountingReport } from '@/lib/services/accountingService';
import type { AccountingReportType } from '@/types/accounting';

export const dynamic = 'force-dynamic';

const VALID_REPORTS: AccountingReportType[] = [
  'PNL',
  'BALANCE_SHEET',
  'TRIAL_BALANCE',
  'DAY_BOOK',
  'CASH_BANK_SUMMARY',
  'AGING',
  'EXPENSE_BY_CATEGORY',
  'GST_SUMMARY',
  'PARTY_TO_PARTY',
];

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const rawType = (searchParams.get('type') || 'PNL').toUpperCase() as AccountingReportType;
    const type: AccountingReportType = VALID_REPORTS.includes(rawType) ? rawType : 'PNL';
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const report = generateAccountingReport(type, { fromDate, toDate });
    return NextResponse.json({ success: true, data: report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate accounting report';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
