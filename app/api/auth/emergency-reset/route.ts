import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { validateQuickPin, ensureUsersStore } from '@/lib/auth/userStore';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import fs from 'fs';
import path from 'path';

function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function isLocalhostRequest(req: NextRequest): boolean {
  const host = req.headers.get('host') || '';
  const xForwardedFor = req.headers.get('x-forwarded-for') || '';
  const isLocalHostName = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('::1');
  const isLocalIp = !xForwardedFor || xForwardedFor.includes('127.0.0.1') || xForwardedFor.includes('::1');
  return isLocalHostName && isLocalIp;
}

export async function POST(req: NextRequest) {
  try {
    // Only allow emergency reset from local host terminal
    if (!isLocalhostRequest(req) && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Emergency reset is only permitted directly from the factory host machine (localhost).' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const newPassword = String(body.newPassword || '').trim();
    const newPin = body.newPin !== undefined && body.newPin !== null ? String(body.newPin).trim() : '';

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (newPin) {
      try {
        validateQuickPin(newPin);
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    const users = await ensureUsersStore();
    const adminIndex = users.findIndex(
      (u) => u.id === 'usr-admin-01' || u.role === 'Super Admin' || u.email === 'director@exmarkdoors.com'
    );

    if (adminIndex === -1) {
      return NextResponse.json({ success: false, error: 'Super Admin account not found.' }, { status: 404 });
    }

    const passwordHash = await hashPassword(newPassword);
    const pinHash = newPin ? await hashPassword(newPin) : users[adminIndex].pinHash;

    users[adminIndex] = {
      ...users[adminIndex],
      passwordHash,
      pinHash,
      customPasswordSet: true,
      mustChangePassword: false,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    writeJsonAtomic(getDataFilePath('users-store.json'), users);

    return NextResponse.json({
      success: true,
      message: 'Super Admin credentials reset successfully.',
      data: {
        name: users[adminIndex].name,
        email: users[adminIndex].email,
        employeeCode: users[adminIndex].employeeCode,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset Super Admin password.' },
      { status: 500 }
    );
  }
}
