import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getDefaultRbacMap,
  getRbacPermissions,
  saveRbacPermissions,
} from '@/lib/auth/rbacStore';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
  if (auth.errorResponse) return auth.errorResponse;

  const policy = getRbacPermissions();
  return NextResponse.json({
    success: true,
    data: policy.roles,
    defaults: getDefaultRbacMap(),
    updatedAt: policy.updatedAt,
    updatedBy: policy.updatedBy,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const rolesInput = body.roles as Record<string, string[]> | undefined;
    if (!rolesInput || typeof rolesInput !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing roles permission matrix payload.' },
        { status: 400 }
      );
    }

    const saved = saveRbacPermissions(rolesInput, auth.user?.email);
    await logAuditEvent({
      userId: auth.user?.id,
      action: 'UPDATE',
      entityType: 'RBAC_POLICY',
      details: { updatedBy: auth.user?.email },
    });

    return NextResponse.json({
      success: true,
      message: 'Role access matrix persisted to factory database.',
      data: saved.roles,
      updatedAt: saved.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save RBAC permissions';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
