import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';

export interface SalesCommissionSlabs {
  slab1_upto40?: number;    // 1 to 40 doors (₹/door)
  slab2_41to60?: number;    // 41 to 60 doors (₹/door)
  slab3_61to100?: number;   // 61 to 100 doors (₹/door)
  slab4_above100?: number;  // Above 100 doors (₹/door)
}

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
  defaultPieceRate?: number; // Base piece rate in ₹/door (default 0)
  commissionSlabs?: SalesCommissionSlabs;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export function resolveEmployeePieceRate(
  employee: StoredEmployee | null | undefined,
  doorCount: number
): { rate: number; slabLabel: string } {
  if (!employee) return { rate: 0, slabLabel: 'Direct / None' };

  const base = Number(employee.defaultPieceRate || 0);
  const slabs = employee.commissionSlabs;
  const count = Math.max(1, Number(doorCount) || 1);

  if (!slabs) return { rate: base, slabLabel: 'Flat Base Rate' };

  if (count > 100 && slabs.slab4_above100 !== undefined && slabs.slab4_above100 !== null) {
    return { rate: Number(slabs.slab4_above100), slabLabel: 'Slab 4 (>100 Doors)' };
  }
  if (count >= 61 && slabs.slab3_61to100 !== undefined && slabs.slab3_61to100 !== null) {
    return { rate: Number(slabs.slab3_61to100), slabLabel: 'Slab 3 (61–100 Doors)' };
  }
  if (count >= 41 && slabs.slab2_41to60 !== undefined && slabs.slab2_41to60 !== null) {
    return { rate: Number(slabs.slab2_41to60), slabLabel: 'Slab 2 (41–60 Doors)' };
  }
  if (slabs.slab1_upto40 !== undefined && slabs.slab1_upto40 !== null) {
    return { rate: Number(slabs.slab1_upto40), slabLabel: 'Slab 1 (1–40 Doors)' };
  }

  return { rate: base, slabLabel: 'Base Piece Rate' };
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
    defaultPieceRate: 0,
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  writeEmployeesStore(list);
  return created;
}
