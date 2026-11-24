import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getPayrollSystemConfig,
  resolveEmployeePolicy,
  savePayrollSystemConfig,
} from '@/lib/services/payrollPolicyStore';
import { readEmployeesStore } from '@/lib/services/employeeStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const config = getPayrollSystemConfig();
    const employees = readEmployeesStore().filter((e) => e.status === 'ACTIVE');

    const resolvedPolicies = employees.map((emp) => resolveEmployeePolicy(emp.id, emp));

    return NextResponse.json({
      success: true,
      geofence: config.geofence,
      defaultShift: config.defaultShift,
      employeePolicies: resolvedPolicies,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch payroll policies';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const current = getPayrollSystemConfig();

    const updated = savePayrollSystemConfig({
      geofence: body.geofence ? { ...current.geofence, ...body.geofence } : current.geofence,
      defaultShift: body.defaultShift ? { ...current.defaultShift, ...body.defaultShift } : current.defaultShift,
      employeePolicies: body.employeePolicy
        ? {
            ...current.employeePolicies,
            [body.employeePolicy.employeeId]: body.employeePolicy,
          }
        : body.employeePolicies || current.employeePolicies,
    });

    return NextResponse.json({
      success: true,
      config: updated,
      message: 'Payroll shift & geofence policies saved successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save payroll policies';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
