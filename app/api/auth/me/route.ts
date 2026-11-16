import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { resolveEffectiveModules } from '@/lib/auth/rbacStore';
import { findFactoryUserById, getAuthSecurityConfig } from '@/lib/auth/userStore';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);

    if (auth.errorResponse || !auth.user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const session = auth.user;
    const stored = await findFactoryUserById(session.id);
    const secCfg = getAuthSecurityConfig();

    return NextResponse.json({
      authenticated: true,
      user: session,
      permissions: resolveEffectiveModules(session.role, stored?.customAllowedModules),
      mustChangePassword: stored
        ? Boolean(stored.mustChangePassword) || (!stored.customPasswordSet && stored.role === 'Super Admin')
        : false,
      hasQuickPin: Boolean(stored?.pinHash),
      requireLoginOnAllDevices: secCfg.requireLoginOnAllDevices,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Session verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
