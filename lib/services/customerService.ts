import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { assertWriteAllowed, isPostgresAvailable } from './dbSyncEngine';

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

function filterCustomers(all: Customer[], filter?: CustomerFilter): Customer[] {
  return all.filter((c) => {
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matches =
        (c.name?.toLowerCase().includes(q)) ||
        (c.district?.toLowerCase().includes(q)) ||
        (c.town?.toLowerCase().includes(q)) ||
        (c.firmName?.toLowerCase().includes(q)) ||
        (c.customerCode?.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filter?.type && c.type !== filter.type) return false;
    if (filter?.district && c.district?.toLowerCase() !== filter.district.toLowerCase()) return false;
    if (filter?.status && c.status !== filter.status) return false;
    return true;
  });
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listCustomers(filter?: CustomerFilter): Promise<Customer[]> {
  const isOnline = await isPostgresAvailable();
  if (isOnline) {
    try {
      const dbCusts = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
      if (dbCusts && dbCusts.length > 0) {
        const mapped: Customer[] = dbCusts.map((c) => ({
          id: c.id,
          customerCode: c.customerCode,
          name: c.name,
          firmName: c.firmName || undefined,
          type: c.type as CustomerType,
          district: c.district,
          town: c.town,
          address: c.address || undefined,
          gstin: c.gstin || undefined,
          phone: c.phone,
          email: c.email || undefined,
          creditLimit: Number(c.creditLimit),
          outstandingBalance: Number(c.outstandingBalance),
          status: c.status as CustomerStatus,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }));
        const local = readStore();
        const merged = [...mapped, ...local.filter((l) => !mapped.some((m) => m.id === l.id))];
        writeStore(merged);
        return filterCustomers(merged, filter);
      }
    } catch (err) {
      console.warn('[customerService] PostgreSQL read failed, reading from file store:', err);
    }
  }
  return filterCustomers(readStore(), filter);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const all = await listCustomers();
  return all.find((c) => c.id === id) ?? null;
}

export async function createCustomer(data: CustomerCreateInput): Promise<Customer> {
  await assertWriteAllowed('Customer Creation');
  const all = readStore();
  const id = generateId();
  const customerCode = generateCode(all.length);
  const now = new Date().toISOString();

  const newCustomer: Customer = {
    ...data,
    id,
    customerCode,
    createdAt: now,
    updatedAt: now,
  };

  const isOnline = await isPostgresAvailable();
  if (isOnline) {
    try {
      await prisma.customer.create({
        data: {
          id: newCustomer.id,
          customerCode: newCustomer.customerCode,
          name: newCustomer.name,
          firmName: newCustomer.firmName || null,
          type: newCustomer.type,
          district: newCustomer.district,
          town: newCustomer.town,
          address: newCustomer.address || null,
          gstin: newCustomer.gstin || null,
          phone: newCustomer.phone,
          email: newCustomer.email || null,
          creditLimit: newCustomer.creditLimit,
          outstandingBalance: newCustomer.outstandingBalance,
          status: newCustomer.status,
        },
      });
    } catch (err) {
      console.warn('[customerService] PostgreSQL write failed, persisted to local store:', err);
    }
  }

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
