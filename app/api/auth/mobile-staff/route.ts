import { NextRequest, NextResponse } from 'next/server';
import {
  OPERATIONAL_STAFF_SPECS,
  mapUserToMobileRole,
  ensureOperationalStaffUsers,
} from '@/lib/auth/operationalStaffSeed';
import { listDrivers } from '@/lib/services/fleetService';
import {
  findFactoryUserByIdentifier,
  verifyFactoryUserCredentials,
} from '@/lib/auth/userStore';
import {
  createSessionCookie,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import { getActiveFactory } from '@/lib/services/companyProfileService';

/**
 * GET /api/auth/mobile-staff
 * Supplies the list of operational staff for the mobile quick-picker.
 * Dynamically includes all active drivers from Fleet Management.
 */
export async function GET() {
  try {
    await ensureOperationalStaffUsers();

    // Query active registered drivers from Fleet Management
    let driverCards: Array<{
      id: string;
      employeeCode: string;
      name: string;
      role: string;
      department: string;
      mobileRole: 'DRIVER' | 'FIELD_STAFF' | 'INSTALLER' | 'FLOOR' | 'MANAGER';
      badgeColor: string;
      description: string;
      hasQuickPin: boolean;
    }> = [];

    try {
      const fleetDrivers = await listDrivers();
      const activeFleetDrivers = fleetDrivers.filter((d) => d.status === 'ACTIVE');
      if (activeFleetDrivers.length > 0) {
        driverCards = activeFleetDrivers.map((d) => ({
          id: d.id,
          employeeCode: d.employeeCode,
          name: d.name,
          role: 'Driver',
          department: d.assignedVehicleNumber
            ? `Vehicle ${d.assignedVehicleNumber}`
            : 'Delivery Logistics & Fleet',
          mobileRole: 'DRIVER' as const,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          description: d.assignedVehicleNumber
            ? `Assigned: ${d.assignedVehicleNumber} • Delivery Logistics & Customer Sign-off`
            : 'Vehicle Delivery Logistics, Route Map Navigation & Customer Sign-off',
          hasQuickPin: true,
        }));
      }
    } catch {
      // Fallback to default if fleetService encounters an issue
    }

    // If no active fleet drivers found, fallback to the seed driver
    if (driverCards.length === 0) {
      const seedDriver = OPERATIONAL_STAFF_SPECS.find((s) => s.mobileRole === 'DRIVER');
      if (seedDriver) {
        driverCards = [
          {
            id: seedDriver.id,
            employeeCode: seedDriver.employeeCode,
            name: seedDriver.name,
            role: seedDriver.roleName,
            department: seedDriver.department,
            mobileRole: seedDriver.mobileRole,
            badgeColor: seedDriver.badgeColor,
            description: seedDriver.description,
            hasQuickPin: true,
          },
        ];
      }
    }

    // Non-driver operational roles (Field Staff, Installer, Floor Operator, Factory Manager)
    const otherOperationalCards = OPERATIONAL_STAFF_SPECS
      .filter((spec) => spec.mobileRole !== 'DRIVER')
      .map((spec) => ({
        id: spec.id,
        employeeCode: spec.employeeCode,
        name: spec.name,
        role: spec.roleName,
        department: spec.department,
        mobileRole: spec.mobileRole,
        badgeColor: spec.badgeColor,
        description: spec.description,
        hasQuickPin: true,
      }));

    return NextResponse.json({
      success: true,
      staff: [...driverCards, ...otherOperationalCards],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load mobile staff';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/auth/mobile-staff
 * Fast mobile staff PIN login.
 * Body: { identifier: string (code or email), pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureOperationalStaffUsers();

    const body = await req.json();
    const identifier = String(body.identifier || body.employeeCode || body.email || '').trim();
    const pin = String(body.pin || '').trim();

    if (!identifier || !pin) {
      return NextResponse.json(
        { error: 'Staff Code / Identifier and Quick PIN are required.' },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 to 6 numeric digits.' },
        { status: 400 }
      );
    }

    const verifiedUser = await verifyFactoryUserCredentials(identifier, pin, 'PIN');
    if (!verifiedUser) {
      return NextResponse.json(
        { error: 'Invalid Staff PIN. Please try again or ask your supervisor.' },
        { status: 401 }
      );
    }

    let activePlantName = verifiedUser.plantLocation;
    try {
      activePlantName = getActiveFactory().name;
    } catch {
      // keep
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
    const mobileRole = mapUserToMobileRole(verifiedUser.role, verifiedUser.department);

    const res = NextResponse.json({
      success: true,
      user: sessionUser,
      mobileRole,
      token,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mobile login failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
