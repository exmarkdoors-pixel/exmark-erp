import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { updateOwnCredentials } from '@/lib/auth/userStore';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse || !auth.user) return auth.errorResponse!;

    const body = await req.json();
    const currentSecret = String(body.currentSecret || body.currentPassword || '');
    const newPassword = body.newPassword !== undefined ? String(body.newPassword) : undefined;
    const newPin =
      body.newPin === null
        ? null
        : body.newPin !== undefined
          ? String(body.newPin)
          : undefined;

    if (!currentSecret) {
      return NextResponse.json(
        { success: false, error: 'Current password or PIN is required.' },
        { status: 400 }
      );
    }
    if (!newPassword && newPin === undefined) {
      return NextResponse.json(
        { success: false, error: 'Provide a new password or a 4–6 digit Quick PIN.' },
        { status: 400 }
      );
    }

    const updated = await updateOwnCredentials(auth.user.id, {
      currentSecret,
      newPassword,
      newPin,
    });

    await logAuditEvent({
      userId: auth.user.id,
      action: 'SELF_CREDENTIAL_UPDATE',
      entityType: 'AUTH',
      entityId: auth.user.id,
      details: {
        updatedPassword: Boolean(newPassword),
        updatedQuickPin: newPin !== undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your credentials were updated cleanly.',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not update credentials';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
