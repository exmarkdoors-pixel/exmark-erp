import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  calculateMonthlySalaries,
  generateBankNeftWorkbook,
  updateSalarySlipAdjustment,
} from '@/lib/services/payrollService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const format = searchParams.get('format');

    const overview = await calculateMonthlySalaries(month);

    if (format === 'neft') {
      const buffer = generateBankNeftWorkbook(month, overview.slips);
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="EXMARK_Salary_NEFT_${month}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: overview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to calculate monthly salary register';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const month = body.month || new Date().toISOString().slice(0, 7);
    const employeeId = body.employeeId;

    if (!employeeId || !body.adjustments) {
      return NextResponse.json(
        { success: false, error: 'employeeId and adjustments payload required' },
        { status: 400 }
      );
    }

    const updated = await updateSalarySlipAdjustment(month, employeeId, body.adjustments);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Salary slip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, slip: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update salary slip adjustment';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
