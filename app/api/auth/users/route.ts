import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  deleteFactoryUser,
  getAuthSecurityConfig,
  listFactoryUsers,
  removeSeededDemoUsers,
  updateAuthSecurityConfig,
  updateFactoryUserPassword,
  upsertFactoryUser,
} from '@/lib/auth/userStore';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import { syncEmployeeFromUserAccount } from '@/lib/services/employeeStore';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const users = await listFactoryUsers();
    const securityConfig = getAuthSecurityConfig();
    return NextResponse.json({ success: true, data: users, securityConfig });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list factory users';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (body.action === 'UPDATE_PASSWORD') {
      if ((!body.email && !body.id) || !body.newPassword) {
        return NextResponse.json(
          { success: false, error: 'Account email/id and newPassword are required.' },
          { status: 400 }
        );
      }
      const updated = await updateFactoryUserPassword(
        String(body.id || body.email),
        String(body.newPassword)
      );
      await logAuditEvent({
        userId: auth.user?.id,
        action: 'UPDATE',
        entityType: 'USER_PASSWORD',
        entityId: updated.id,
        details: { targetEmail: updated.email },
      });
      return NextResponse.json({
        success: true,
        message: `Password updated securely for ${updated.email}.`,
        data: updated,
      });
    }

    if (body.action === 'UPSERT_USER') {
      const role = body.role as UserRole;
      if (!role || !ERP_ROLES[role]) {
        return NextResponse.json(
          { success: false, error: 'Valid ERP role is required.' },
          { status: 400 }
        );
      }
      const customAllowedModules =
        body.customAllowedModules === null
          ? null
          : Array.isArray(body.customAllowedModules)
            ? body.customAllowedModules.map((m: unknown) => String(m).trim()).filter(Boolean)
            : undefined;

      const saved = await upsertFactoryUser({
        id: body.id ? String(body.id) : undefined,
        name: String(body.name || ''),
        email: body.email !== undefined ? String(body.email) : undefined,
        role,
        department: body.department !== undefined ? String(body.department) : undefined,
        employeeCode: body.employeeCode !== undefined ? String(body.employeeCode) : undefined,
        plantLocation: body.plantLocation !== undefined ? String(body.plantLocation) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        password: body.password ? String(body.password) : undefined,
        quickPin:
          body.quickPin === null
            ? null
            : typeof body.quickPin === 'string' && body.quickPin.trim() !== ''
              ? body.quickPin.trim()
              : undefined,
        customAllowedModules,
        mustChangePassword:
          body.mustChangePassword !== undefined ? Boolean(body.mustChangePassword) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      });

      const syncToRoster = body.syncToEmployeeRoster !== false;
      const syncedEmployee = syncToRoster
        ? syncEmployeeFromUserAccount({
            name: saved.name,
            email: saved.email,
            employeeCode: saved.employeeCode,
            role: saved.department ? `${saved.role} (${saved.department})` : saved.role,
            department: saved.department || saved.role,
            phone: saved.phone,
            plantLocation: saved.plantLocation,
            isActive: saved.isActive,
          })
        : null;

      await logAuditEvent({
        userId: auth.user?.id,
        action: 'UPDATE',
        entityType: 'USER_ACCOUNT',
        entityId: saved.id,
        details: {
          email: saved.email,
          role: saved.role,
          isActive: saved.isActive,
          hasCustomModules: Array.isArray(saved.customAllowedModules),
          syncedToRoster: Boolean(syncedEmployee),
        },
      });
      return NextResponse.json({
        success: true,
        message: `Staff login saved for ${saved.name} (${saved.employeeCode || saved.email}).`,
        data: saved,
        syncedEmployee,
      });
    }

    if (body.action === 'CLEAN_DEMO_USERS') {
      const result = await removeSeededDemoUsers(auth.user?.id);
      await logAuditEvent({
        userId: auth.user?.id,
        action: 'CLEANUP',
        entityType: 'USER_ACCOUNT',
        details: { removedCount: result.removedCount },
      });
      return NextResponse.json({
        success: true,
        removedCount: result.removedCount,
        message:
          result.removedCount > 0
            ? `Removed ${result.removedCount} unused seeded demo account(s).`
            : 'No unused demo accounts remained to clean.',
        data: result.users,
      });
    }

    if (body.action === 'UPDATE_SECURITY_CONFIG') {
      const securityConfig = updateAuthSecurityConfig({
        requireLoginOnAllDevices: body.requireLoginOnAllDevices,
        showLanStaffPicker: body.showLanStaffPicker,
      });
      await logAuditEvent({
        userId: auth.user?.id,
        action: 'UPDATE',
        entityType: 'AUTH_CONFIG',
        details: { ...securityConfig },
      });
      return NextResponse.json({
        success: true,
        message: 'Factory login security settings saved.',
        securityConfig,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user account';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const targetId = String(body.id || '').trim();
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'User id is required.' }, { status: 400 });
    }
    const role = body.role as UserRole;
    if (role && !ERP_ROLES[role]) {
      return NextResponse.json({ success: false, error: 'Invalid ERP role.' }, { status: 400 });
    }

    // Prevent Super Admin from disabling themselves via quick toggle
    if (auth.user?.id === targetId && body.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own currently active session.' },
        { status: 400 }
      );
    }

    const existingList = await listFactoryUsers();
    const existing = existingList.find((u) => u.id === targetId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Staff account not found.' }, { status: 404 });
    }

    const updated = await upsertFactoryUser({
      id: targetId,
      name: body.name !== undefined ? String(body.name) : existing.name,
      email: body.email !== undefined ? String(body.email) : existing.email,
      role: role || existing.role,
      department: body.department !== undefined ? String(body.department) : existing.department,
      employeeCode: body.employeeCode !== undefined ? String(body.employeeCode) : existing.employeeCode,
      plantLocation: body.plantLocation !== undefined ? String(body.plantLocation) : existing.plantLocation,
      phone: body.phone !== undefined ? String(body.phone) : existing.phone,
      password: body.password ? String(body.password) : undefined,
      quickPin:
        body.quickPin === null
          ? null
          : typeof body.quickPin === 'string' && body.quickPin.trim() !== ''
            ? body.quickPin.trim()
            : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
    });

    await logAuditEvent({
      userId: auth.user?.id,
      action: 'UPDATE',
      entityType: 'USER_ACCOUNT',
      entityId: updated.id,
      details: { email: updated.email, role: updated.role, isActive: updated.isActive },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update staff account';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter.' }, { status: 400 });
    }

    const deleted = await deleteFactoryUser(id, auth.user?.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Staff account not found.' }, { status: 404 });
    }

    await logAuditEvent({
      userId: auth.user?.id,
      action: 'DELETE',
      entityType: 'USER_ACCOUNT',
      entityId: id,
    });

    return NextResponse.json({ success: true, message: 'Staff login removed permanently.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete staff account';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
