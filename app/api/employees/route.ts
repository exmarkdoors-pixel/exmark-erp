import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { listFactoryUsers, upsertFactoryUser } from '@/lib/auth/userStore';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';
import {
  normalizePhoneDigits10,
  readEmployeesStore,
  StoredEmployee,
  writeEmployeesStore,
} from '@/lib/services/employeeStore';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'employees');
  if (auth.errorResponse) return auth.errorResponse;

  const list = readEmployeesStore();
  const factoryUsers = await listFactoryUsers();

  const safeList = list.map((emp) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, password, pinHash, ...safe } = emp as Record<string, unknown>;
    const empPhone10 = normalizePhoneDigits10(emp.phone);
    const matchedUser = factoryUsers.find(
      (u) =>
        (emp.email && u.email.toLowerCase() === String(emp.email).toLowerCase()) ||
        (emp.employeeCode && u.employeeCode?.toLowerCase() === String(emp.employeeCode).toLowerCase()) ||
        (empPhone10.length === 10 && normalizePhoneDigits10(u.phone) === empPhone10)
    );
    return {
      ...safe,
      loginAccount: matchedUser
        ? {
            userId: matchedUser.id,
            role: matchedUser.role,
            email: matchedUser.email,
            employeeCode: matchedUser.employeeCode,
            hasQuickPin: matchedUser.hasQuickPin,
            customAllowedModules: matchedUser.customAllowedModules || null,
            isActive: matchedUser.isActive,
            lastLoginAt: matchedUser.lastLoginAt,
          }
        : null,
    };
  });

  return NextResponse.json({ success: true, count: safeList.length, data: safeList });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees', ['Super Admin', 'Management', 'HR']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ success: false, error: 'Employee name is required.' }, { status: 400 });
    }

    const list = readEmployeesStore();
    const now = new Date().toISOString();
    const employeeCode =
      String(body.employeeCode || '').trim().toUpperCase() ||
      `EXM-EMP-${String(list.length + 1).padStart(3, '0')}`;

    let createdLogin = null;
    if (body.createLogin) {
      if (auth.user?.role !== 'Super Admin') {
        return NextResponse.json(
          { success: false, error: 'Only Super Admin can create ERP login accounts.' },
          { status: 403 }
        );
      }
      const erpRole = String(body.erpRole || 'Production') as UserRole;
      if (!ERP_ROLES[erpRole]) {
        return NextResponse.json({ success: false, error: 'Invalid ERP Role selected.' }, { status: 400 });
      }
      createdLogin = await upsertFactoryUser({
        name: String(body.name).trim(),
        email: body.email ? String(body.email).trim() : undefined,
        employeeCode,
        role: erpRole,
        department: String(body.department || 'Production Line 1').trim(),
        plantLocation: String(body.location || 'Central Manufacturing Plant').trim(),
        phone: String(body.phone || '').trim() || undefined,
        password: body.password ? String(body.password) : undefined,
        quickPin:
          typeof body.quickPin === 'string' && body.quickPin.trim() !== ''
            ? body.quickPin.trim()
            : undefined,
        customAllowedModules: Array.isArray(body.customAllowedModules)
          ? body.customAllowedModules
          : undefined,
        mustChangePassword: Boolean(body.mustChangePassword),
      });
    }

    const defaultPieceRate =
      body.defaultPieceRate !== undefined ? Math.max(0, Number(body.defaultPieceRate) || 0) : 0;
    const commissionSlabs =
      body.commissionSlabs && typeof body.commissionSlabs === 'object'
        ? {
            slab1_upto40: Math.max(0, Number(body.commissionSlabs.slab1_upto40) || 0),
            slab2_41to60: Math.max(0, Number(body.commissionSlabs.slab2_41to60) || 0),
            slab3_61to100: Math.max(0, Number(body.commissionSlabs.slab3_61to100) || 0),
            slab4_above100: Math.max(0, Number(body.commissionSlabs.slab4_above100) || 0),
          }
        : undefined;

    const newEmp: StoredEmployee = {
      id: `emp-${Date.now()}`,
      employeeCode,
      name: String(body.name).trim(),
      role: String(body.role || 'Production Staff').trim(),
      department: String(body.department || 'Production Line 1').trim(),
      phone: String(body.phone || '').trim() || '+91 94470 00000',
      email: createdLogin?.email || String(body.email || '').trim().toLowerCase(),
      status: body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      location: String(body.location || 'Central Manufacturing Plant').trim(),
      shift: body.shift ? String(body.shift) : undefined,
      salary: body.salary !== undefined ? Number(body.salary) || 0 : undefined,
      defaultPieceRate,
      commissionSlabs,
      createdAt: now,
      updatedAt: now,
    };

    list.push(newEmp);
    writeEmployeesStore(list);
    return NextResponse.json(
      { success: true, data: newEmp, loginAccount: createdLogin },
      { status: 201 }
    );
  } catch (err) {
    console.error('Employees error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees', ['Super Admin', 'Management', 'HR']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee id is required.' }, { status: 400 });
    }

    const list = readEmployeesStore();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    list[idx] = {
      ...list[idx],
      name: body.name !== undefined ? String(body.name).trim() : list[idx].name,
      role: body.role !== undefined ? String(body.role).trim() : list[idx].role,
      department: body.department !== undefined ? String(body.department).trim() : list[idx].department,
      phone: body.phone !== undefined ? String(body.phone).trim() : list[idx].phone,
      email: body.email !== undefined ? String(body.email).trim().toLowerCase() : list[idx].email,
      employeeCode:
        body.employeeCode !== undefined ? String(body.employeeCode).trim() : list[idx].employeeCode,
      status: body.status === 'INACTIVE' ? 'INACTIVE' : body.status === 'ACTIVE' ? 'ACTIVE' : list[idx].status,
      location: body.location !== undefined ? String(body.location).trim() : list[idx].location,
      defaultPieceRate:
        body.defaultPieceRate !== undefined
          ? Math.max(0, Number(body.defaultPieceRate) || 0)
          : list[idx].defaultPieceRate !== undefined
            ? list[idx].defaultPieceRate
            : 0,
      commissionSlabs:
        body.commissionSlabs !== undefined
          ? body.commissionSlabs && typeof body.commissionSlabs === 'object'
            ? {
                slab1_upto40: Math.max(0, Number(body.commissionSlabs.slab1_upto40) || 0),
                slab2_41to60: Math.max(0, Number(body.commissionSlabs.slab2_41to60) || 0),
                slab3_61to100: Math.max(0, Number(body.commissionSlabs.slab3_61to100) || 0),
                slab4_above100: Math.max(0, Number(body.commissionSlabs.slab4_above100) || 0),
              }
            : undefined
          : list[idx].commissionSlabs,
      updatedAt: new Date().toISOString(),
    };

    writeEmployeesStore(list);
    return NextResponse.json({ success: true, data: list[idx] });
  } catch (err) {
    console.error('Employees PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees', ['Super Admin', 'Management', 'HR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter.' }, { status: 400 });
    }

    const list = readEmployeesStore();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    writeEmployeesStore(filtered);
    return NextResponse.json({ success: true, message: 'Employee deleted.' });
  } catch (err) {
    console.error('Employees DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
