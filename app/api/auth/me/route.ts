import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { ERP_ROLES } from '@/lib/auth/roles';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

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
