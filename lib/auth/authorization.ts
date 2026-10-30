import { NextRequest, NextResponse } from 'next/server';
import { getSession, SessionUser, DEMO_USERS, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './session';
import { canAccessModule, UserRole } from './roles';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export interface AuthorizationResult {
  user: SessionUser | null;
  errorResponse: NextResponse | null;
}

/**
 * Validates and parses a base64 encoded session token.
 */
function parseSessionToken(token: string): SessionUser | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as SessionUser & { issuedAt?: number };
    if (!parsed || !parsed.id || !parsed.role || !parsed.email) {
      return null;
    }
    if (parsed.issuedAt && Date.now() - parsed.issuedAt > SESSION_MAX_AGE * 1000) {
      return null; // Expired token
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Universal server-side authorization check for Next.js Route Handlers.
 * Checks Bearer Authorization header, HTTP-only session cookie (exmark_erp_session),
 * or API headers (x-user-role / x-user-email in dev) against module permission and allowed role lists.
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

  // 2. Inspect Authorization Bearer header (supports Electron desktop, mobile, and web clients)
  if (!user) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7).trim();
      user = parseSessionToken(token);
    }
  }

  // 3. Inspect NextRequest cookies collection if present
  if (!user && 'cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    const nextReq = req as NextRequest;
    const cookieVal = nextReq.cookies.get(SESSION_COOKIE_NAME)?.value || nextReq.cookies.get('exmark_session')?.value;
    if (cookieVal) {
      user = parseSessionToken(cookieVal);
    }
  }

  // 4. Inspect raw Cookie header from incoming Request
  if (!user) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:exmark_erp_session|exmark_session)=([^;]+)/);
      if (match && match[1]) {
        user = parseSessionToken(match[1]);
      }
    }
  }

  // 5. Fallback to Next.js cookies() store
  if (!user) {
    try {
      user = await getSession();
    } catch {
      user = null;
    }
  }

  // 6. Seamless Local Workstation / Desktop Terminal Auto-Authentication
  if (!user) {
    const host = req.headers.get('host') || '';
    const userAgent = req.headers.get('user-agent') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || userAgent.includes('Electron');
    const isCloudEnv = process.env.RENDER === 'true' || process.env.VERCEL === '1';

    if ((isLocal && !isCloudEnv) || process.env.ALLOW_DEV_FALLBACK === 'true' || process.env.NODE_ENV !== 'production') {
      user = DEMO_USERS['director@exmarkdoors.com'];
    }
  }

  // 7. Reject unauthenticated requests in production cloud
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Authentication required. Please log in with valid credentials.' },
        { status: 401 }
      ),
    };
  }

  // 7. Role-based restrictions
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

  // 8. Module-based restrictions
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
