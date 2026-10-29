import fs from 'fs';
import path from 'path';
import { assertWriteAllowed } from './dbSyncEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export type CustomerType = 'DEALER' | 'BUILDER' | 'ARCHITECT' | 'RETAIL';
export type CustomerStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'VIP' | 'SUSPENDED';

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  firmName?: string;
  type: CustomerType;
  district: string;
  town: string;
  address?: string;
  gstin?: string | null;
  phone: string;
  email?: string | null;
  creditLimit: number;
  outstandingBalance: number;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export type CustomerCreateInput = Omit<Customer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | '_demo'>;
export type CustomerUpdateInput = Partial<CustomerCreateInput>;

export interface CustomerFilter {
  search?: string;
  type?: CustomerType;
  district?: string;
  status?: CustomerStatus;
}

// ── Store helpers ─────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), 'data', 'customers-store.json');

function readStore(): Customer[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Customer[]) : [];
  } catch {
    return [];
  }
}

function writeStore(customers: Customer[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(customers, null, 2), 'utf8');
  } catch (err) {
    console.error('[customerService] Failed to write store:', err);
  }
}

function generateCode(count: number): string {
  const num = 1001 + count;
  return `EXM-CUST-${num}`;
}

function generateId(): string {
  return `cust-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listCustomers(filter?: CustomerFilter): Promise<Customer[]> {
  const all = readStore();
  return all.filter((c) => {
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matches =
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.town.toLowerCase().includes(q) ||
        (c.firmName && c.firmName.toLowerCase().includes(q)) ||
        c.customerCode.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filter?.type && c.type !== filter.type) return false;
    if (filter?.district && c.district.toLowerCase() !== filter.district.toLowerCase()) return false;
    if (filter?.status && c.status !== filter.status) return false;
    return true;
  });
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const all = readStore();
  return all.find((c) => c.id === id) ?? null;
}

export async function createCustomer(data: CustomerCreateInput): Promise<Customer> {
  await assertWriteAllowed('Customer Creation');
  const all = readStore();
  const newCustomer: Customer = {
    ...data,
    id: generateId(),
    customerCode: generateCode(all.length),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(newCustomer);
  writeStore(all);
  return newCustomer;
}

export async function updateCustomer(id: string, data: CustomerUpdateInput): Promise<Customer> {
  await assertWriteAllowed('Customer Update');
  const all = readStore();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Customer ${id} not found`);
  const updated: Customer = {
    ...all[idx],
    ...data,
    id: all[idx].id,
    customerCode: all[idx].customerCode,
    createdAt: all[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function archiveCustomer(id: string): Promise<Customer> {
  return updateCustomer(id, { status: 'SUSPENDED' });
}
