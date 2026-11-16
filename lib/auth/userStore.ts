import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDataFilePath } from '../utils/dataPaths';
import { hashPassword, verifyPassword } from './password';
import { DEMO_USERS, SessionUser } from './session';
import { UserRole } from './roles';

export interface StoredFactoryUser extends SessionUser {
  phone?: string;
  passwordHash: string;
  pinHash?: string;
  customAllowedModules?: string[] | null;
  customPasswordSet?: boolean;
  mustChangePassword?: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  isDemoPlaceholder?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SafeFactoryUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeCode?: string;
  department?: string;
  plantLocation?: string;
  phone?: string;
  customAllowedModules?: string[] | null;
  customPasswordSet: boolean;
  hasQuickPin: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  isDemoPlaceholder: boolean;
  updatedAt: string;
}

export interface SafeLoginDirectoryCard {
  id: string;
  name: string;
  role: UserRole;
  employeeCode?: string;
  department?: string;
  hasQuickPin: boolean;
}

export interface AuthSecurityConfig {
  requireLoginOnAllDevices: boolean;
  showLanStaffPicker: boolean;
  updatedAt: string;
}

const getUsersStorePath = () => getDataFilePath('users-store.json');
const getAuthConfigPath = () => getDataFilePath('auth-config.json');

const SEEDED_DEMO_IDS = new Set([
  'usr-mgmt-02',
  'usr-sales-03',
  'usr-acc-04',
  'usr-prod-05',
  'usr-inv-06',
  'usr-purch-07',
  'usr-hr-08',
  'usr-inst-09',
]);

function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function toSafeUserView(u: StoredFactoryUser): SafeFactoryUserView {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    employeeCode: u.employeeCode,
    department: u.department,
    plantLocation: u.plantLocation,
    phone: u.phone,
    customAllowedModules: Array.isArray(u.customAllowedModules) ? u.customAllowedModules : null,
    customPasswordSet: Boolean(u.customPasswordSet),
    hasQuickPin: Boolean(u.pinHash),
    mustChangePassword: Boolean(u.mustChangePassword) || (!u.customPasswordSet && u.email === 'director@exmarkdoors.com'),
    isActive: u.isActive !== false,
    lastLoginAt: u.lastLoginAt,
    isDemoPlaceholder: Boolean(u.isDemoPlaceholder) || (SEEDED_DEMO_IDS.has(u.id) && !u.customPasswordSet),
    updatedAt: u.updatedAt,
  };
}

/**
 * Deduplicates any legacy duplicate users (e.g., duplicate usr-prod-05 entries)
 * while preferring customized / recently updated entries.
 */
function deduplicateUsers(users: StoredFactoryUser[]): { list: StoredFactoryUser[]; changed: boolean } {
  const byEmail = new Map<string, StoredFactoryUser>();
  const seenIds = new Set<string>();
  let changed = false;

  for (const raw of users) {
    if (!raw || !raw.email || !raw.id) {
      changed = true;
      continue;
    }
    const cleanEmail = raw.email.trim().toLowerCase();
    const existingByEmail = byEmail.get(cleanEmail);
    if (existingByEmail) {
      changed = true;
      const keepIncoming = Boolean(raw.customPasswordSet) && !existingByEmail.customPasswordSet;
      if (keepIncoming) {
        byEmail.set(cleanEmail, { ...raw, email: cleanEmail });
      }
      continue;
    }
    let resolvedId = raw.id;
    if (seenIds.has(resolvedId)) {
      changed = true;
      resolvedId = `${raw.id}-${seenIds.size + 1}`;
    }
    seenIds.add(resolvedId);
    byEmail.set(cleanEmail, { ...raw, id: resolvedId, email: cleanEmail });
  }

  return { list: Array.from(byEmail.values()), changed };
}

export function getAuthSecurityConfig(): AuthSecurityConfig {
  const cfgPath = getAuthConfigPath();
  if (fs.existsSync(cfgPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Partial<AuthSecurityConfig>;
      return {
        requireLoginOnAllDevices: parsed.requireLoginOnAllDevices !== false,
        showLanStaffPicker: parsed.showLanStaffPicker !== false,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } catch {
      // Fall through to safe secure defaults
    }
  }
  return {
    requireLoginOnAllDevices: true,
    showLanStaffPicker: true,
    updatedAt: new Date().toISOString(),
  };
}

export function updateAuthSecurityConfig(patch: Partial<AuthSecurityConfig>): AuthSecurityConfig {
  const current = getAuthSecurityConfig();
  const next: AuthSecurityConfig = {
    requireLoginOnAllDevices:
      patch.requireLoginOnAllDevices !== undefined ? Boolean(patch.requireLoginOnAllDevices) : current.requireLoginOnAllDevices,
    showLanStaffPicker:
      patch.showLanStaffPicker !== undefined ? Boolean(patch.showLanStaffPicker) : current.showLanStaffPicker,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(getAuthConfigPath(), next);
  return next;
}

/**
 * Loads persistent users from EXMARK_DATA_DIR/users-store.json.
 * Initializes from baseline role accounts only when the store does not yet exist;
 * automatically deduplicates any legacy duplicates without overwriting custom passwords.
 */
export async function ensureUsersStore(): Promise<StoredFactoryUser[]> {
  const storePath = getUsersStorePath();
  if (fs.existsSync(storePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        const { list, changed } = deduplicateUsers(parsed as StoredFactoryUser[]);
        if (changed) {
          writeJsonAtomic(storePath, list);
        }
        return list;
      }
    } catch {
      // Re-initialize cleanly below only if corrupt
    }
  }

  const now = new Date().toISOString();
  const defaultPasswordHash = await hashPassword('Exmark@2026');
  const uniqueMap = new Map<string, SessionUser>();
  for (const u of Object.values(DEMO_USERS)) {
    const cleanEmail = u.email.toLowerCase();
    if (!uniqueMap.has(cleanEmail)) {
      uniqueMap.set(cleanEmail, { ...u, email: cleanEmail });
    }
  }

  const seeded: StoredFactoryUser[] = Array.from(uniqueMap.values()).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email.toLowerCase(),
    role: u.role,
    employeeCode: u.employeeCode,
    department: u.department,
    plantLocation: u.plantLocation,
    passwordHash: defaultPasswordHash,
    customPasswordSet: false,
    mustChangePassword: u.role === 'Super Admin',
    isDemoPlaceholder: SEEDED_DEMO_IDS.has(u.id),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  writeJsonAtomic(storePath, seeded);
  return seeded;
}

export async function listFactoryUsers(): Promise<SafeFactoryUserView[]> {
  const users = await ensureUsersStore();
  return users.map(toSafeUserView);
}

/**
 * Returns minimal non-sensitive staff cards for LAN quick-tap picker on /login.
 * Intentionally omits email, phone, and any hash fields.
 */
export async function listSafeLoginDirectory(): Promise<{
  showLanStaffPicker: boolean;
  staff: SafeLoginDirectoryCard[];
}> {
  const cfg = getAuthSecurityConfig();
  if (!cfg.showLanStaffPicker) {
    return { showLanStaffPicker: false, staff: [] };
  }
  const users = await ensureUsersStore();
  return {
    showLanStaffPicker: true,
    staff: users
      .filter((u) => u.isActive !== false)
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        employeeCode: u.employeeCode,
        department: u.department,
        hasQuickPin: Boolean(u.pinHash),
      })),
  };
}

export async function findFactoryUserByEmail(email: string): Promise<StoredFactoryUser | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const users = await ensureUsersStore();
  return users.find((u) => u.email.toLowerCase() === clean) || null;
}

export async function findFactoryUserById(id: string): Promise<StoredFactoryUser | null> {
  const clean = id.trim();
  if (!clean) return null;
  const users = await ensureUsersStore();
  return users.find((u) => u.id === clean) || null;
}

function normalizePhoneDigits(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '').slice(-10);
}

/**
 * Finds an account by Email, Staff Code (e.g. EXM-EMP-005), User ID, or 10-digit Phone.
 */
export async function findFactoryUserByIdentifier(identifier: string): Promise<StoredFactoryUser | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  const users = await ensureUsersStore();
  const phoneDigits = clean.replace(/\D/g, '').slice(-10);

  return (
    users.find((u) => u.email.toLowerCase() === clean) ||
    users.find((u) => u.employeeCode?.trim().toLowerCase() === clean) ||
    users.find((u) => u.id.toLowerCase() === clean) ||
    (phoneDigits.length === 10
      ? users.find((u) => normalizePhoneDigits(u.phone) === phoneDigits)
      : undefined) ||
    null
  );
}

export async function verifyFactoryUserCredentials(
  identifier: string,
  plainSecret: string,
  method: 'AUTO' | 'PASSWORD' | 'PIN' = 'AUTO'
): Promise<StoredFactoryUser | null> {
  const user = await findFactoryUserByIdentifier(identifier);
  if (!user || user.isActive === false || !plainSecret) return null;

  let authenticated = false;
  if (method === 'PIN') {
    if (/^\d{4,6}$/.test(plainSecret) && user.pinHash) {
      authenticated = await verifyPassword(plainSecret, user.pinHash);
    }
  } else if (method === 'PASSWORD') {
    authenticated = await verifyPassword(plainSecret, user.passwordHash);
  } else {
    authenticated = await verifyPassword(plainSecret, user.passwordHash);
    if (!authenticated && /^\d{4,6}$/.test(plainSecret) && user.pinHash) {
      authenticated = await verifyPassword(plainSecret, user.pinHash);
    }
  }

  if (!authenticated) return null;

  // Record last login timestamp cleanly
  const users = await ensureUsersStore();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], lastLoginAt: new Date().toISOString() };
    writeJsonAtomic(getUsersStorePath(), users);
    return users[idx];
  }
  return user;
}

export function validateQuickPin(pin: string): void {
  if (!/^\d{4,6}$/.test(pin.trim())) {
    throw new Error('Quick PIN must be exactly 4 to 6 numeric digits.');
  }
}

export async function updateFactoryUserPassword(
  emailOrId: string,
  newPassword: string
): Promise<SafeFactoryUserView> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  const clean = emailOrId.trim().toLowerCase();
  const users = await ensureUsersStore();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === clean || u.id.toLowerCase() === clean
  );
  if (idx === -1) {
    throw new Error(`User account ${emailOrId} was not found.`);
  }

  const newHash = await hashPassword(newPassword);
  users[idx] = {
    ...users[idx],
    passwordHash: newHash,
    customPasswordSet: true,
    mustChangePassword: false,
    isDemoPlaceholder: false,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(getUsersStorePath(), users);
  return toSafeUserView(users[idx]);
}

export async function updateOwnCredentials(
  userId: string,
  input: { currentSecret: string; newPassword?: string; newPin?: string | null }
): Promise<SafeFactoryUserView> {
  const users = await ensureUsersStore();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw new Error('Staff account not found.');
  }
  const current = users[idx];
  const validPass = await verifyPassword(input.currentSecret, current.passwordHash);
  const validPin = current.pinHash ? await verifyPassword(input.currentSecret, current.pinHash) : false;
  if (!validPass && !validPin) {
    throw new Error('Current password or PIN does not match.');
  }

  let nextPasswordHash = current.passwordHash;
  let customPasswordSet = Boolean(current.customPasswordSet);
  let mustChangePassword = Boolean(current.mustChangePassword);

  if (input.newPassword !== undefined && input.newPassword !== '') {
    if (input.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    nextPasswordHash = await hashPassword(input.newPassword);
    customPasswordSet = true;
    mustChangePassword = false;
  }

  let nextPinHash = current.pinHash;
  if (input.newPin === null) {
    nextPinHash = undefined;
  } else if (typeof input.newPin === 'string' && input.newPin.trim() !== '') {
    validateQuickPin(input.newPin);
    nextPinHash = await hashPassword(input.newPin.trim());
  }

  users[idx] = {
    ...current,
    passwordHash: nextPasswordHash,
    pinHash: nextPinHash,
    customPasswordSet,
    mustChangePassword,
    isDemoPlaceholder: false,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(getUsersStorePath(), users);
  return toSafeUserView(users[idx]);
}

function generateNextEmployeeCode(users: StoredFactoryUser[]): string {
  let maxNum = 10;
  for (const u of users) {
    const match = u.employeeCode?.match(/EXM-EMP-(\d+)/i);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return `EXM-EMP-${String(maxNum + 1).padStart(3, '0')}`;
}

function buildInternalStaffEmail(
  name: string,
  employeeCode: string,
  users: StoredFactoryUser[]
): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 20) || 'staff';
  const codeSlug = employeeCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  let candidate = `${slug}.${codeSlug}@exmark.local`;
  let counter = 1;
  while (users.some((u) => u.email.toLowerCase() === candidate)) {
    candidate = `${slug}.${codeSlug}.${counter}@exmark.local`;
    counter++;
  }
  return candidate;
}

export async function upsertFactoryUser(input: {
  id?: string;
  name: string;
  email?: string;
  role: UserRole;
  department?: string;
  employeeCode?: string;
  plantLocation?: string;
  phone?: string;
  password?: string;
  quickPin?: string | null;
  customAllowedModules?: string[] | null;
  mustChangePassword?: boolean;
  isActive?: boolean;
}): Promise<SafeFactoryUserView> {
  if (!input.name?.trim()) {
    throw new Error('Staff Name is required.');
  }

  const users = await ensureUsersStore();
  const requestedEmail = input.email?.trim().toLowerCase() || '';
  const idx = input.id
    ? users.findIndex((u) => u.id === input.id)
    : requestedEmail
      ? users.findIndex((u) => u.email.toLowerCase() === requestedEmail)
      : -1;
  const now = new Date().toISOString();

  const resolvedEmployeeCode =
    input.employeeCode !== undefined && input.employeeCode.trim() !== ''
      ? input.employeeCode.trim().toUpperCase()
      : idx !== -1
        ? users[idx].employeeCode || generateNextEmployeeCode(users)
        : generateNextEmployeeCode(users);

  const cleanEmail =
    requestedEmail ||
    (idx !== -1 ? users[idx].email : buildInternalStaffEmail(input.name, resolvedEmployeeCode, users));

  const trimmedPassword = input.password?.trim() || '';
  const trimmedPin = typeof input.quickPin === 'string' ? input.quickPin.trim() : '';

  if (idx === -1 && trimmedPassword === '' && trimmedPin === '') {
    throw new Error('Provide either an Initial Password (min 6 chars) or a 4–6 digit Quick PIN.');
  }
  if (trimmedPassword !== '' && trimmedPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (trimmedPin !== '') {
    validateQuickPin(trimmedPin);
  }

  // Enforce unique Staff Code and 10-digit Phone across distinct user accounts
  if (resolvedEmployeeCode) {
    const codeConflict = users.some(
      (u, uIdx) =>
        uIdx !== idx &&
        u.employeeCode?.trim().toLowerCase() === resolvedEmployeeCode.toLowerCase()
    );
    if (codeConflict) {
      throw new Error(`Another staff account already uses Staff Code "${resolvedEmployeeCode}".`);
    }
  }

  const cleanPhone = input.phone !== undefined ? input.phone.trim() : idx !== -1 ? users[idx].phone : undefined;
  const normalizedPhoneDigits = normalizePhoneDigits(cleanPhone);
  if (normalizedPhoneDigits.length === 10) {
    const phoneConflict = users.some(
      (u, uIdx) =>
        uIdx !== idx &&
        normalizePhoneDigits(u.phone) === normalizedPhoneDigits
    );
    if (phoneConflict) {
      throw new Error(`Another staff account already uses phone ending in "${normalizedPhoneDigits}".`);
    }
  }

  const hasExplicitPassword = trimmedPassword !== '';
  const passwordToHash = hasExplicitPassword
    ? trimmedPassword
    : idx === -1
      ? crypto.randomBytes(18).toString('base64url')
      : '';

  const passwordHash = passwordToHash ? await hashPassword(passwordToHash) : undefined;
  const pinHash =
    input.quickPin === null
      ? undefined
      : trimmedPin !== ''
        ? await hashPassword(trimmedPin)
        : undefined;

  const normalizeModules = (mods?: string[] | null): string[] | null | undefined => {
    if (mods === null) return null;
    if (!Array.isArray(mods)) return undefined;
    const set = new Set(mods.map((m) => String(m).trim()).filter(Boolean));
    set.add('dashboard');
    return Array.from(set);
  };
  const nextCustomModules = normalizeModules(input.customAllowedModules);

  if (idx !== -1) {
    const existing = users[idx];
    // Prevent disabling or demoting the last active Super Admin
    const nextRole = input.role || existing.role;
    const nextActive = input.isActive !== undefined ? Boolean(input.isActive) : existing.isActive !== false;
    if (existing.role === 'Super Admin' && (nextRole !== 'Super Admin' || !nextActive)) {
      const otherActiveAdmins = users.filter(
        (u) => u.id !== existing.id && u.role === 'Super Admin' && u.isActive !== false
      );
      if (otherActiveAdmins.length === 0) {
        throw new Error('At least one active Super Admin account must remain enabled.');
      }
    }

    const emailConflict = users.some(
      (u, uIdx) => uIdx !== idx && u.email.toLowerCase() === cleanEmail
    );
    if (emailConflict) {
      throw new Error(`Another staff account already uses email "${cleanEmail}".`);
    }

    const resolvedCustomModules =
      nextCustomModules === undefined ? existing.customAllowedModules ?? null : nextCustomModules;

    users[idx] = {
      ...existing,
      name: input.name.trim(),
      email: cleanEmail,
      role: nextRole,
      department: input.department !== undefined ? input.department.trim() : existing.department,
      employeeCode: resolvedEmployeeCode,
      plantLocation: input.plantLocation !== undefined ? input.plantLocation.trim() : existing.plantLocation,
      phone: cleanPhone,
      passwordHash: passwordHash || existing.passwordHash,
      pinHash: input.quickPin === null ? undefined : pinHash || existing.pinHash,
      customAllowedModules:
        nextRole === 'Super Admin' && Array.isArray(resolvedCustomModules)
          ? Array.from(new Set([...resolvedCustomModules, 'dashboard', 'settings', 'employees']))
          : resolvedCustomModules,
      customPasswordSet: hasExplicitPassword || Boolean(existing.customPasswordSet),
      mustChangePassword:
        input.mustChangePassword !== undefined
          ? Boolean(input.mustChangePassword)
          : hasExplicitPassword
            ? false
            : Boolean(existing.mustChangePassword),
      isDemoPlaceholder: false,
      isActive: nextActive,
      updatedAt: now,
    };
  } else {
    const emailTaken = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }
    users.push({
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: input.name.trim(),
      email: cleanEmail,
      role: input.role,
      employeeCode: resolvedEmployeeCode,
      department: input.department?.trim() || input.role,
      plantLocation: input.plantLocation?.trim() || 'EXMARK Central Factory',
      phone: cleanPhone || undefined,
      passwordHash: passwordHash!,
      pinHash,
      customAllowedModules: nextCustomModules ?? null,
      customPasswordSet: hasExplicitPassword,
      mustChangePassword: Boolean(input.mustChangePassword),
      isDemoPlaceholder: false,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: now,
      updatedAt: now,
    });
  }

  writeJsonAtomic(getUsersStorePath(), users);
  const saved = users[idx !== -1 ? idx : users.length - 1];
  return toSafeUserView(saved);
}

export async function deleteFactoryUser(targetId: string, actorId?: string): Promise<boolean> {
  const users = await ensureUsersStore();
  const idx = users.findIndex((u) => u.id === targetId);
  if (idx === -1) return false;

  const target = users[idx];
  if (actorId && target.id === actorId) {
    throw new Error('You cannot delete your own currently signed-in account.');
  }
  if (target.role === 'Super Admin') {
    const otherActiveAdmins = users.filter(
      (u) => u.id !== target.id && u.role === 'Super Admin' && u.isActive !== false
    );
    if (otherActiveAdmins.length === 0) {
      throw new Error('Cannot delete the last remaining active Super Admin.');
    }
  }

  users.splice(idx, 1);
  writeJsonAtomic(getUsersStorePath(), users);
  return true;
}

/**
 * Safely removes seeded demo accounts that have NOT had custom passwords set,
 * while always preserving active Super Admin and currently signed-in actor.
 */
export async function removeSeededDemoUsers(actorId?: string): Promise<{
  removedCount: number;
  users: SafeFactoryUserView[];
}> {
  const users = await ensureUsersStore();
  const remaining = users.filter((u) => {
    if (actorId && u.id === actorId) return true;
    if (u.role === 'Super Admin') return true;
    if (u.customPasswordSet) return true;
    if (u.isDemoPlaceholder || SEEDED_DEMO_IDS.has(u.id)) return false;
    return true;
  });

  const removedCount = users.length - remaining.length;
  if (removedCount > 0) {
    writeJsonAtomic(getUsersStorePath(), remaining);
  }
  return {
    removedCount,
    users: remaining.map(toSafeUserView),
  };
}
