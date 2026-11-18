import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  SessionUser,
  DEMO_USERS,
  SESSION_COOKIE_NAME,
  parseSignedSessionToken,
} from './session';
import { UserRole } from './roles';
import { canUserAccessModule } from './rbacStore';
import {
  findFactoryUserByEmail,
  findFactoryUserById,
  getAuthSecurityConfig,
} from './userStore';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export interface AuthorizationResult {
  user: SessionUser | null;
  errorResponse: NextResponse | null;
}

/**
 * Universal server-side authorization check for Next.js Route Handlers.
 * Enforces signed session tokens / cookies across ALL factory devices (localhost, LAN, Electron),
 * checks active account status & live role from EXMARK_DATA_DIR/users-store.json,
 * and evaluates dynamic permissions from EXMARK_DATA_DIR/rbac-roles.json.
 */
export async function authorizeRequest(
  req: NextRequest | Request,
  requiredModule?: string,
  allowedRoles?: UserRole[]
): Promise<AuthorizationResult> {
  const headerRole = req.headers.get('x-user-role');
  const headerEmail = req.headers.get('x-user-email');

  let user: SessionUser | null = null;

  // 1. Inspect role override headers ONLY when explicitly enabled in non-production tests
  const allowDevHeaders =
    process.env.ALLOW_DEV_HEADERS === 'true' && process.env.NODE_ENV !== 'production';
  if (allowDevHeaders) {
    if (headerEmail && DEMO_USERS[headerEmail.toLowerCase()]) {
      user = DEMO_USERS[headerEmail.toLowerCase()];
    } else if (headerRole) {
      const matched = Object.values(DEMO_USERS).find(
        (u) => u.role.toLowerCase() === headerRole.toLowerCase()
      );
      if (matched) user = matched;
    }
  }

  // 2. Inspect Authorization Bearer header (Electron desktop, mobile, API clients)
  if (!user) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7).trim();
      user = parseSignedSessionToken(token);
    }
  }

  // 3. Inspect NextRequest cookies collection if present
  if (!user && 'cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    const nextReq = req as NextRequest;
    const cookieVal =
      nextReq.cookies.get(SESSION_COOKIE_NAME)?.value || nextReq.cookies.get('exmark_session')?.value;
    if (cookieVal) {
      user = parseSignedSessionToken(cookieVal);
    }
  }

  // 4. Inspect raw Cookie header from incoming Request
  if (!user) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:exmark_erp_session|exmark_session)=([^;]+)/);
      if (match && match[1]) {
        user = parseSignedSessionToken(match[1]);
      }
    }
  }

  // 5. Fallback to Next.js cookies() store (when request invoked internally from Server Components)
  if (!user) {
    try {
      user = await getSession();
    } catch {
      user = null;
    }
  }

  // 6. Optional workstation fallback ONLY if admin disabled requireLoginOnAllDevices OR ALLOW_DEV_FALLBACK=true
  if (!user) {
    const authCfg = getAuthSecurityConfig();
    if (!authCfg.requireLoginOnAllDevices || process.env.ALLOW_DEV_FALLBACK === 'true') {
      const host = req.headers.get('host') || '';
      const userAgent = req.headers.get('user-agent') || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || userAgent.includes('Electron');
      const isCloudEnv = process.env.RENDER === 'true' || process.env.VERCEL === '1';
      if ((isLocal && !isCloudEnv) || process.env.ALLOW_DEV_FALLBACK === 'true') {
        user = DEMO_USERS['director@exmarkdoors.com'];
      }
    }
  }

  // 7. Enforce mandatory authentication on all devices
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Authentication required. Please log in with valid staff credentials.' },
        { status: 401 }
      ),
    };
  }

  // 8. Reconcile against live factory staff store (blocks deactivated/deleted users & reflects role edits immediately)
  const storedUser = (await findFactoryUserById(user.id)) || (await findFactoryUserByEmail(user.email));
  if (!storedUser) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Staff account is no longer active or was removed. Please log in again.' },
        { status: 401 }
      ),
    };
  }
  if (storedUser.isActive === false) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Your staff account has been deactivated. Contact Super Admin.' },
        { status: 401 }
      ),
    };
  }
  user = {
    id: storedUser.id,
    name: storedUser.name,
    email: storedUser.email,
    role: storedUser.role,
    employeeCode: storedUser.employeeCode,
    department: storedUser.department,
    plantLocation: storedUser.plantLocation,
  };

  // Super Admin has unrestricted enterprise access across all APIs, Financial, Accounts, Evening Close & Mobile Field Ops
  if (user.role === 'Super Admin') {
    return { user, errorResponse: null };
  }

  // 9. Explicit Role allowlist check
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

  // 10. Dynamic module permission check (role matrix + optional per-user module override)
  if (
    requiredModule &&
    !canUserAccessModule(user.role, requiredModule, storedUser.customAllowedModules)
  ) {
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
