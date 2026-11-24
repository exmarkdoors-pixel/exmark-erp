import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  applyLeaveRequest,
  getLeaveRequests,
  reviewLeaveRequest,
} from '@/lib/services/fieldTrackingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;

    const leaves = getLeaveRequests(employeeId);
    return NextResponse.json({ success: true, data: leaves });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load leaves';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.fromDate || !body.toDate || !body.reason) {
      return NextResponse.json(
        { success: false, error: 'From date, To date, and reason are required' },
        { status: 400 }
      );
    }

    const leave = applyLeaveRequest({
      employeeId: body.employeeId || auth.user?.id || 'EMP',
      employeeCode: body.employeeCode || auth.user?.employeeCode,
      employeeName: body.employeeName || auth.user?.name,
      department: body.department,
      fromDate: body.fromDate,
      toDate: body.toDate,
      leaveType: body.leaveType || 'CASUAL',
      reason: body.reason,
    });

    return NextResponse.json({ success: true, leave });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit leave request';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.id || !['APPROVED', 'REJECTED'].includes(body.status)) {
      return NextResponse.json({ success: false, error: 'Valid leave id and status required' }, { status: 400 });
    }

    const updated = reviewLeaveRequest(
      body.id,
      body.status,
      auth.user?.name || 'Super Admin'
    );
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, leave: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to review leave request';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
