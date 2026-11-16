import { cookies } from 'next/headers';
import { UserRole } from './roles';
import { signSessionPayload, verifySignedSessionToken } from './sessionSecret';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeCode?: string;
  department?: string;
  plantLocation: string;
}

export const SESSION_COOKIE_NAME = 'exmark_erp_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Default seeded factory role baseline (passwords live in EXMARK_DATA_DIR/users-store.json)
export const DEMO_USERS: Record<string, SessionUser & { passwordHash: string }> = {
  'director@exmarkdoors.com': {
    id: 'usr-admin-01',
    name: 'Nazer Karumban',
    email: 'director@exmarkdoors.com',
    role: 'Super Admin',
    employeeCode: 'EXM-EMP-001',
    department: 'Executive & Strategy',
    plantLocation: 'Central Manufacturing Plant & Corporate HQ',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'management@exmarkdoors.com': {
    id: 'usr-mgmt-02',
    name: 'Amina Rahman',
    email: 'management@exmarkdoors.com',
    role: 'Management',
    employeeCode: 'EXM-EMP-002',
    department: 'Operations Oversight',
    plantLocation: 'Ernakulam Corporate Hub',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'sales.calicut@exmarkdoors.com': {
    id: 'usr-sales-03',
    name: 'Shabeer Ali',
    email: 'sales.calicut@exmarkdoors.com',
    role: 'Sales',
    employeeCode: 'EXM-EMP-003',
    department: 'Kerala Dealer Sales',
    plantLocation: 'Kozhikode Regional Hub',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'accounts.kochi@exmarkdoors.com': {
    id: 'usr-acc-04',
    name: 'Varghese Mathew',
    email: 'accounts.kochi@exmarkdoors.com',
    role: 'Accounts',
    employeeCode: 'EXM-EMP-004',
    department: 'Accounts & Cashbook Billing',
    plantLocation: 'Kochi Marine Drive Office',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'plant@exmarkdoors.com': {
    id: 'usr-prod-05',
    name: 'Rajesh P.',
    email: 'plant@exmarkdoors.com',
    role: 'Production',
    employeeCode: 'EXM-EMP-005',
    department: 'Line 1 FRP Hydraulic Molding',
    plantLocation: 'Manufacturing Plant Floor',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'inventory@exmarkdoors.com': {
    id: 'usr-inv-06',
    name: 'Deepa V.',
    email: 'inventory@exmarkdoors.com',
    role: 'Inventory',
    employeeCode: 'EXM-EMP-006',
    department: 'Raw Materials & Hardware Store',
    plantLocation: 'Central Warehouse & Resin Bay',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'purchase@exmarkdoors.com': {
    id: 'usr-purch-07',
    name: 'Suresh Kumar',
    email: 'purchase@exmarkdoors.com',
    role: 'Purchase',
    employeeCode: 'EXM-EMP-007',
    department: 'Procurement & Polymer Supply',
    plantLocation: 'Central Procurement Bay',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'hr@exmarkdoors.com': {
    id: 'usr-hr-08',
    name: 'Priya Nair',
    email: 'hr@exmarkdoors.com',
    role: 'HR',
    employeeCode: 'EXM-EMP-008',
    department: 'Human Resources & Technician Rosters',
    plantLocation: 'Ernakulam Corporate Hub',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
  'site.installation@exmarkdoors.com': {
    id: 'usr-inst-09',
    name: 'Anoop Krishnan',
    email: 'site.installation@exmarkdoors.com',
    role: 'Installation',
    employeeCode: 'EXM-EMP-009',
    department: 'Site Measurements & Door Fitting',
    plantLocation: 'Central Kerala Field Team',
    passwordHash: '$2b$12$K1rG1J5W2y1V5uV7d5P/Q.Zg/y5hT1W4N2p9H6u9G4r7s8e1w2q3a',
  },
};

/**
 * Generates an HMAC-SHA256 signed token for a verified session user.
 */
export function createSignedSessionToken(user: SessionUser): string {
  return signSessionPayload({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeCode: user.employeeCode,
    department: user.department,
    plantLocation: user.plantLocation,
    issuedAt: Date.now(),
  });
}

/**
 * Verifies an HMAC-SHA256 signed session token string and ensures required user fields exist.
 */
export function parseSignedSessionToken(rawToken: string): SessionUser | null {
  const parsed = verifySignedSessionToken<SessionUser & { issuedAt?: number }>(
    rawToken,
    SESSION_MAX_AGE
  );
  if (!parsed || !parsed.id || !parsed.role || !parsed.email) {
    return null;
  }
  return parsed;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * Creates an HTTP-only HMAC-signed session cookie for the user and returns the signed token.
 */
export async function createSessionCookie(user: SessionUser): Promise<string> {
  const signedToken = createSignedSessionToken(user);

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signedToken, getSessionCookieOptions());
  } catch {
    // Allow direct server-action/route tests outside HTTP request storage to still receive token
  }

  return signedToken;
}

/**
 * Retrieves the currently authenticated session user from server cookies.
 * Never auto-authenticates as Super Admin on missing/invalid cookies unless explicitly
 * running with ALLOW_DEV_FALLBACK=true in non-production environments.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME) || cookieStore.get('exmark_session');

    if (sessionCookie?.value) {
      return parseSignedSessionToken(sessionCookie.value);
    }
  } catch {
    // Outside request scope
  }

  if (process.env.ALLOW_DEV_FALLBACK === 'true' && process.env.NODE_ENV !== 'production') {
    return DEMO_USERS['director@exmarkdoors.com'];
  }
  return null;
}

/**
 * Destroys the current session cookie (Logout / Switch Staff).
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('exmark_session');
  } catch {
    // Outside request scope
  }
}
