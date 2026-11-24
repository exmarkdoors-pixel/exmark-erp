import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getMonthlyAttendance, saveMonthlyAttendance } from '@/lib/services/payrollService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const data = await getMonthlyAttendance(month);
    return NextResponse.json({ success: true, month, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch attendance';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const month = body.month || new Date().toISOString().slice(0, 7);
    const records = body.records;

    if (!Array.isArray(records)) {
      return NextResponse.json({ success: false, error: 'Records array required' }, { status: 400 });
    }

    await saveMonthlyAttendance(month, records);
    return NextResponse.json({ success: true, message: `Attendance for ${month} saved successfully.` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save attendance';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
