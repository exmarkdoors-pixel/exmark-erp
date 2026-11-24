import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getDailyPunches,
  getEmployeePunchStatus,
  getIstDateString,
  processPunchEvent,
} from '@/lib/services/fieldTrackingService';
import {
  getPayrollSystemConfig,
  resolveEmployeePolicy,
} from '@/lib/services/payrollPolicyStore';
import { readEmployeesStore } from '@/lib/services/employeeStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getIstDateString();
    const employeeId = searchParams.get('employeeId');

    const sysCfg = getPayrollSystemConfig();

    if (employeeId) {
      const employees = readEmployeesStore();
      const emp = employees.find((e) => e.id === employeeId || e.employeeCode === employeeId);
      const targetId = emp?.id || employeeId;
      const punch = getEmployeePunchStatus(targetId, date);
      const policy = resolveEmployeePolicy(targetId, emp);
      return NextResponse.json({
        success: true,
        date,
        punch,
        policy,
        geofence: sysCfg.geofence,
      });
    }

    const punches = getDailyPunches(date);
    const employees = readEmployeesStore().filter((e) => e.status === 'ACTIVE');

    return NextResponse.json({
      success: true,
      date,
      punches,
      totalActiveEmployees: employees.length,
      geofence: sysCfg.geofence,
      defaultShift: sysCfg.defaultShift,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load punch records';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const employeeId = body.employeeId || auth.user?.id;
    const action = body.action === 'OUT' ? 'OUT' : 'IN';
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee identity missing' }, { status: 400 });
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ success: false, error: 'Valid GPS latitude and longitude required' }, { status: 400 });
    }

    const result = processPunchEvent({
      employeeId,
      action,
      latitude,
      longitude,
      accuracyMeters: typeof body.accuracyMeters === 'number' ? body.accuracyMeters : undefined,
      address: body.address,
      selfieDataUrl: body.selfieDataUrl,
      device: body.device || 'MOBILE_FIELD',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, distanceMeters: result.distanceMeters },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      punch: result.punch,
      distanceMeters: result.distanceMeters,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process punch';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
