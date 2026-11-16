import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    if (session) {
      await logAuditEvent({
        userId: session.id,
        action: 'LOGOUT',
        entityType: 'AUTH',
        details: { email: session.email, role: session.role },
        ipAddress: clientIp,
        userAgent,
      });
    }

    await destroySession();
    const res = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    res.cookies.delete(SESSION_COOKIE_NAME);
    res.cookies.delete('exmark_session');
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
