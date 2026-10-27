import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USERS, createSessionCookie } from '@/lib/auth/session';
import { UserRole } from '@/lib/auth/roles';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import { verifyPassword } from '@/lib/auth/password';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 1. Check in database first if configured
    let userRecord = null;
    try {
      if (process.env.DATABASE_URL) {
        userRecord = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { role: true, employee: true },
        });
      }
    } catch {
      // Fallback to demo users
    }

    if (userRecord) {
      const isValid = await verifyPassword(password, userRecord.passwordHash);
      if (!isValid) {
        await logAuditEvent({
          action: 'LOGIN_FAILED',
          entityType: 'AUTH',
          details: { email, reason: 'Invalid password' },
          ipAddress: clientIp,
          userAgent,
        });
        return NextResponse.json(
          { error: 'Invalid credentials. Please verify your email and password.' },
          { status: 401 }
        );
      }

      const sessionUser = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role.name as UserRole,
        employeeCode: userRecord.employee?.employeeCode,
        department: userRecord.employee?.department,
        plantLocation: 'Palakkad Manufacturing Plant',
      };

      await createSessionCookie(sessionUser);
      await logAuditEvent({
        userId: userRecord.id,
        action: 'LOGIN',
        entityType: 'AUTH',
        details: { role: userRecord.role.name },
        ipAddress: clientIp,
        userAgent,
      });

      return NextResponse.json({ success: true, user: sessionUser });
    }

    // 2. Demo fallback credentials check
    const demoUser = DEMO_USERS[email.toLowerCase()];
    if (demoUser) {
      // For demo, accept "Exmark@2026" or demo password
      const isDemoPassValid =
        password === 'Exmark@2026' ||
        password === 'password' ||
        (await verifyPassword(password, demoUser.passwordHash));

      if (isDemoPassValid) {
        const sessionUser = {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
          employeeCode: demoUser.employeeCode,
          department: demoUser.department,
          plantLocation: demoUser.plantLocation,
        };

        await createSessionCookie(sessionUser);
        await logAuditEvent({
          userId: demoUser.id,
          action: 'LOGIN',
          entityType: 'AUTH',
          details: { role: demoUser.role, mode: 'demo' },
          ipAddress: clientIp,
          userAgent,
        });

        return NextResponse.json({ success: true, user: sessionUser });
      }
    }

    await logAuditEvent({
      action: 'LOGIN_FAILED',
      entityType: 'AUTH',
      details: { email, reason: 'User not found' },
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.json(
      { error: 'Account not found. For testing, use one of the predefined ERP role profiles.' },
      { status: 401 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal authentication error.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
