import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { disburseSalaries } from '@/lib/services/payrollService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'finance');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const month = body.month || new Date().toISOString().slice(0, 7);
    const slipIds = Array.isArray(body.slipIds) ? body.slipIds : [];
    const cashBankAccountId = body.cashBankAccountId || 'cb-bank-main';

    if (slipIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No salary slips selected for disbursal.' }, { status: 400 });
    }

    const result = await disburseSalaries(month, slipIds, cashBankAccountId, auth.user?.name || 'Super Admin');

    return NextResponse.json({
      success: true,
      message: `Successfully disbursed ${result.disbursedCount} salaries (Total: ₹${result.totalAmount.toLocaleString('en-IN')}) and posted Double-Entry Journal voucher.`,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to disburse salaries';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
