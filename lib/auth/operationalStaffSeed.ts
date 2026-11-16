/**
 * EXMARK ERP — Operational Mobile Staff Directory & Seeder (Server-side)
 * Provides dedicated staff accounts for the 5 field & plant roles:
 * DRIVER, FIELD_STAFF, INSTALLER, FLOOR, and MANAGER.
 */

import fs from 'fs';
import path from 'path';
import { hashPassword } from './password';
import { getDataFilePath } from '../utils/dataPaths';
import {
  MobileStaffRole,
  OperationalStaffSpec,
  OPERATIONAL_STAFF_SPECS,
  mapUserToMobileRole,
} from './operationalStaffTypes';

export type { MobileStaffRole, OperationalStaffSpec };
export { OPERATIONAL_STAFF_SPECS, mapUserToMobileRole };

/**
 * Ensures all 5 operational staff users exist in users-store.json with working Quick PINs.
 */
export async function ensureOperationalStaffUsers(): Promise<void> {
  const usersStorePath = getDataFilePath('users-store.json');
  let users: any[] = [];
  if (fs.existsSync(usersStorePath)) {
    try {
      users = JSON.parse(fs.readFileSync(usersStorePath, 'utf8'));
    } catch {
      users = [];
    }
  }

  const now = new Date().toISOString();
  let updated = false;

  for (const spec of OPERATIONAL_STAFF_SPECS) {
    const existingIndex = users.findIndex(
      (u) =>
        u.id === spec.id ||
        (spec.employeeCode && u.employeeCode === spec.employeeCode) ||
        (spec.email && u.email?.toLowerCase() === spec.email.toLowerCase())
    );

    const pinHash = await hashPassword(spec.defaultPin);
    const passHash = await hashPassword('Exmark@2026');

    if (existingIndex >= 0) {
      // Ensure pinHash is populated if missing
      if (!users[existingIndex].pinHash) {
        users[existingIndex].pinHash = pinHash;
        users[existingIndex].hasQuickPin = true;
        updated = true;
      }
      if (!users[existingIndex].employeeCode) {
        users[existingIndex].employeeCode = spec.employeeCode;
        updated = true;
      }
    } else {
      // Add new operational profile
      users.push({
        id: spec.id,
        name: spec.name,
        email: spec.email.toLowerCase(),
        role: spec.roleName,
        employeeCode: spec.employeeCode,
        department: spec.department,
        phone: spec.phone,
        plantLocation: 'Central Manufacturing Plant',
        passwordHash: passHash,
        pinHash: pinHash,
        hasQuickPin: true,
        customPasswordSet: true,
        mustChangePassword: false,
        isDemoPlaceholder: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      updated = true;
    }
  }

  if (updated) {
    const dir = path.dirname(usersStorePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${usersStorePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
    fs.renameSync(tmp, usersStorePath);
    console.log('[Operational Staff] Successfully synchronized 5 staff profiles into users-store.json');
  }
}
