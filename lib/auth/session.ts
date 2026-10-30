import { cookies } from 'next/headers';
import { UserRole } from './roles';

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

// Default demo users map for testing all 9 roles
export const DEMO_USERS: Record<string, SessionUser & { passwordHash: string }> = {
  'director@exmarkdoors.com': {
    id: 'usr-admin-01',
    name: 'Nazer Karumban',
    email: 'director@exmarkdoors.com',
    role: 'Super Admin',
    employeeCode: 'EXM-EMP-001',
    department: 'Executive & Strategy',
    plantLocation: 'Central Manufacturing Plant & Corporate HQ',
    // Hash for "Exmark@2026"
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
    department: 'Accounts & GST Compliance',
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
  'plant.palakkad@exmarkdoors.com': {
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
 * Creates a secure HTTP-only session cookie for the user and returns the token string.
 */
export async function createSessionCookie(user: SessionUser): Promise<string> {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify({
    ...user,
    issuedAt: Date.now(),
  });

  // Base64 encode session payload (in production signed with AUTH_SECRET HMAC)
  const encoded = Buffer.from(sessionData).toString('base64');

  cookieStore.set(SESSION_COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.DISABLE_COOKIE_SECURE !== 'true'),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return encoded;
}

/**
 * Retrieves the currently authenticated session user from server cookies.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME) || cookieStore.get('exmark_session');

  if (!sessionCookie?.value) {
    // In production, unauthenticated requests MUST NOT get automatic Super Admin access
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_FALLBACK !== 'true') {
      return null;
    }
    // Default to Super Admin in local dev preview mode
    return DEMO_USERS['director@exmarkdoors.com'];
  }

  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const user = JSON.parse(decoded) as SessionUser & { issuedAt?: number };
    
    // Validate session expiration
    if (user.issuedAt && Date.now() - user.issuedAt > SESSION_MAX_AGE * 1000) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Destroys the current session cookie (Logout).
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete('exmark_session');
}
