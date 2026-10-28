import { NextRequest, NextResponse } from 'next/server';
import { getSession, SessionUser, DEMO_USERS } from './session';
import { canAccessModule, UserRole } from './roles';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export interface AuthorizationResult {
  user: SessionUser | null;
  errorResponse: NextResponse | null;
}

/**
 * Universal server-side authorization check for Next.js Route Handlers.
 * Checks HTTP-only session cookie or API headers (x-user-role / x-user-email)
 * against module permission and allowed role lists.
 */
export async function authorizeRequest(
  req: NextRequest | Request,
  requiredModule?: string,
  allowedRoles?: UserRole[]
): Promise<AuthorizationResult> {
  const headerRole = req.headers.get('x-user-role');
  const headerEmail = req.headers.get('x-user-email');

  let user: SessionUser | null = null;

  // 1. Inspect role override headers only in development/testing environments
  const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_HEADERS === 'true';
  if (isDevOrTest) {
    if (headerEmail && DEMO_USERS[headerEmail.toLowerCase()]) {
      user = DEMO_USERS[headerEmail.toLowerCase()];
    } else if (headerRole) {
      const matched = Object.values(DEMO_USERS).find(
        (u) => u.role.toLowerCase() === headerRole.toLowerCase()
      );
      if (matched) user = matched;
    }
  }

  // 2. Inspect session cookie from incoming Request header
  if (!user) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/exmark_session=([^;]+)/);
      if (match && match[1]) {
        try {
          const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
          user = JSON.parse(decoded) as SessionUser;
        } catch {
          user = null;
        }
      }
    }
  }

  // Fallback to Next.js cookies() store if in request lifecycle
  if (!user) {
    try {
      user = await getSession();
    } catch {
      user = null;
    }
  }

  // 3. Reject unauthenticated requests
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Authentication required. Please log in with valid credentials.' },
        { status: 401 }
      ),
    };
  }

  // 4. Role-based restrictions
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      await logAuditEvent({
        userId: user.id,
        action: 'ACCESS_DENIED',
        entityType: 'AUTH',
        details: { userRole: user.role, requiredRoles: allowedRoles, module: requiredModule },
      });

      return {
        user,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: `Access denied. Role "${user.role}" does not have required permissions for this action. Allowed roles: ${allowedRoles.join(', ')}.`,
          },
          { status: 403 }
        ),
      };
    }
  }

  // 5. Module-based restrictions
  if (requiredModule && !canAccessModule(user.role, requiredModule)) {
    await logAuditEvent({
      userId: user.id,
      action: 'ACCESS_DENIED',
      entityType: 'AUTH',
      details: { userRole: user.role, requiredModule },
    });

    return {
      user,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Access denied. Role "${user.role}" does not have access to module "${requiredModule}".`,
        },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
