import { NextRequest, NextResponse } from 'next/server';
import { ERP_ROLES } from '@/lib/auth/roles';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);

    if (auth.errorResponse || !auth.user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const session = auth.user;
    const roleConfig = ERP_ROLES[session.role];

    return NextResponse.json({
      authenticated: true,
      user: session,
      permissions: roleConfig?.allowedModules || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Session verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
