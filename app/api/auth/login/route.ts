import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionCookie,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import {
  findFactoryUserByIdentifier,
  verifyFactoryUserCredentials,
} from '@/lib/auth/userStore';
import { UserRole } from '@/lib/auth/roles';
import { resolveEffectiveModules } from '@/lib/auth/rbacStore';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import { verifyPassword } from '@/lib/auth/password';
import prisma from '@/lib/prisma';
import { isPostgresAvailable } from '@/lib/services/dbSyncEngine';
import { getActiveFactory } from '@/lib/services/companyProfileService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = String(body.identifier || body.email || '').trim();
    const rawSecret = String(body.pin !== undefined && body.pin !== '' ? body.pin : body.password || '');
    const authMethod: 'AUTO' | 'PASSWORD' | 'PIN' =
      body.method === 'PIN' || (body.pin !== undefined && body.pin !== '' && !body.password)
        ? 'PIN'
        : body.method === 'PASSWORD'
          ? 'PASSWORD'
          : 'AUTO';

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    if (!rawIdentifier || !rawSecret) {
      return NextResponse.json(
        { error: 'Staff email/code and password or PIN are required.' },
        { status: 400 }
      );
    }

    // 1. Optional PostgreSQL user lookup (if Postgres is active and email provided)
    let userRecord = null;
    if (rawIdentifier.includes('@')) {
      try {
        if (await isPostgresAvailable()) {
          userRecord = await prisma.user.findUnique({
            where: { email: rawIdentifier.toLowerCase() },
            include: { role: true, employee: true },
          });
        }
      } catch {
        // Fallback to local EXMARK factory user store
      }
    }

    if (userRecord) {
      const isValid = await verifyPassword(rawSecret, userRecord.passwordHash);
      if (!isValid) {
        await logAuditEvent({
          action: 'LOGIN_FAILED',
          entityType: 'AUTH',
          details: { identifier: rawIdentifier, reason: 'Invalid password (db)' },
          ipAddress: clientIp,
          userAgent,
        });
        return NextResponse.json(
          { error: 'Invalid credentials. Please check your password or Quick PIN.' },
          { status: 401 }
        );
      }

      const roleName = userRecord.role.name as UserRole;
      const sessionUser = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: roleName,
        employeeCode: userRecord.employee?.employeeCode,
        department: userRecord.employee?.department,
        plantLocation: getActiveFactory().name,
      };

      const token = await createSessionCookie(sessionUser);
      await logAuditEvent({
        userId: userRecord.id,
        action: 'LOGIN',
        entityType: 'AUTH',
        details: { role: roleName, method: 'PASSWORD' },
        ipAddress: clientIp,
        userAgent,
      });

      const res = NextResponse.json({
        success: true,
        user: sessionUser,
        permissions: resolveEffectiveModules(roleName, null),
        mustChangePassword: false,
        token,
      });
      res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
      return res;
    }

    // 2. Persistent factory user store check (Email, Staff Code EXM-EMP-xxx, ID, or Phone)
    const storeUser = await findFactoryUserByIdentifier(rawIdentifier);
    if (!storeUser) {
      await logAuditEvent({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        details: { identifier: rawIdentifier, reason: 'Account not found' },
        ipAddress: clientIp,
        userAgent,
      });
      return NextResponse.json(
        { error: 'Staff account not found. Verify your Email or Staff Code (e.g. EXM-EMP-001).' },
        { status: 401 }
      );
    }

    if (storeUser.isActive === false) {
      return NextResponse.json(
        { error: 'This staff account is deactivated. Contact your Super Admin.' },
        { status: 403 }
      );
    }

    if (authMethod === 'PIN' && !storeUser.pinHash) {
      return NextResponse.json(
        { error: 'Quick PIN has not been set for this account yet. Please sign in with Password.' },
        { status: 401 }
      );
    }

    const verifiedUser = await verifyFactoryUserCredentials(rawIdentifier, rawSecret, authMethod);
    if (!verifiedUser) {
      await logAuditEvent({
        userId: storeUser.id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        details: { identifier: rawIdentifier, method: authMethod, reason: 'Invalid secret' },
        ipAddress: clientIp,
        userAgent,
      });
      return NextResponse.json(
        {
          error:
            authMethod === 'PIN'
              ? 'Invalid Quick PIN. Please verify your 4–6 digit PIN or switch to Password.'
              : 'Invalid credentials. Please verify your Email/Staff Code and Password.',
        },
        { status: 401 }
      );
    }

    let activePlantName = storeUser.plantLocation;
    try {
      activePlantName = getActiveFactory().name;
    } catch {
      // keep user's plant location
    }

    const sessionUser = {
      id: verifiedUser.id,
      name: verifiedUser.name,
      email: verifiedUser.email,
      role: verifiedUser.role,
      employeeCode: verifiedUser.employeeCode,
      department: verifiedUser.department,
      plantLocation: activePlantName,
    };

    const token = await createSessionCookie(sessionUser);
    const mustChangePassword =
      Boolean(verifiedUser.mustChangePassword) ||
      (!verifiedUser.customPasswordSet && verifiedUser.role === 'Super Admin');

    await logAuditEvent({
      userId: verifiedUser.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      details: { role: verifiedUser.role, method: authMethod, identifier: rawIdentifier },
      ipAddress: clientIp,
      userAgent,
    });

    const res = NextResponse.json({
      success: true,
      user: sessionUser,
      permissions: resolveEffectiveModules(verifiedUser.role, verifiedUser.customAllowedModules),
      mustChangePassword,
      hasQuickPin: Boolean(verifiedUser.pinHash),
      token,
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal authentication error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
