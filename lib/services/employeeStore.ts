import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';

export interface StoredEmployee {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  location?: string;
  shift?: string;
  salary?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

const getEmployeesStorePath = () => getDataFilePath('employees-store.json');

export function normalizePhoneDigits10(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '').slice(-10);
}

export function readEmployeesStore(): StoredEmployee[] {
  try {
    const storePath = getEmployeesStorePath();
    if (!fs.existsSync(storePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    return Array.isArray(parsed) ? (parsed as StoredEmployee[]) : [];
  } catch {
    return [];
  }
}

export function writeEmployeesStore(data: StoredEmployee[]): void {
  const storePath = getEmployeesStorePath();
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${storePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, storePath);
}

/**
 * Atomically upserts an employee profile matched to a staff ERP user account
 * without creating duplicates across employeeCode, email, or 10-digit phone.
 */
export function syncEmployeeFromUserAccount(input: {
  name: string;
  email?: string;
  employeeCode?: string;
  role: string;
  department?: string;
  phone?: string;
  plantLocation?: string;
  isActive?: boolean;
}): StoredEmployee {
  const list = readEmployeesStore();
  const cleanEmail = (input.email || '').trim().toLowerCase();
  const cleanCode = (input.employeeCode || '').trim().toUpperCase();
  const phone10 = normalizePhoneDigits10(input.phone);

  const idx = list.findIndex((e) => {
    if (cleanCode && e.employeeCode?.trim().toUpperCase() === cleanCode) return true;
    if (cleanEmail && e.email?.trim().toLowerCase() === cleanEmail) return true;
    if (phone10.length === 10 && normalizePhoneDigits10(e.phone) === phone10) return true;
    return false;
  });

  const now = new Date().toISOString();
  if (idx !== -1) {
    const existing = list[idx];
    list[idx] = {
      ...existing,
      name: input.name.trim() || existing.name,
      employeeCode: cleanCode || existing.employeeCode,
      role: input.role || existing.role,
      department: input.department?.trim() || existing.department,
      phone: input.phone?.trim() || existing.phone,
      email: cleanEmail || existing.email,
      location: input.plantLocation?.trim() || existing.location || 'EXMARK Central Factory',
      status: input.isActive === false ? 'INACTIVE' : 'ACTIVE',
      updatedAt: now,
    };
    writeEmployeesStore(list);
    return list[idx];
  }

  const created: StoredEmployee = {
    id: `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    employeeCode: cleanCode || `EXM-EMP-${String(list.length + 1).padStart(3, '0')}`,
    name: input.name.trim(),
    role: input.role || 'Production Staff',
    department: input.department?.trim() || input.role || 'Production Floor',
    phone: input.phone?.trim() || '',
    email: cleanEmail,
    status: input.isActive === false ? 'INACTIVE' : 'ACTIVE',
    location: input.plantLocation?.trim() || 'EXMARK Central Factory',
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  writeEmployeesStore(list);
  return created;
}
