import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { assertWriteAllowed, isPostgresAvailable } from './dbSyncEngine';
import {
  Invoice,
  Payment,
  FinancialTarget,
  FinanceStore,
  InvoiceStatus,
  PaymentMode,
} from '@/types/finance';

export * from '@/types/finance';

// ── Store Helpers ─────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), 'data', 'finance-store.json');

function readStore(): FinanceStore {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      const initial: FinanceStore = { invoices: [], payments: [], targets: [] };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const valid = parsed as FinanceStore;
    return {
      invoices: Array.isArray(valid.invoices) ? valid.invoices : [],
      payments: Array.isArray(valid.payments) ? valid.payments : [],
      targets: Array.isArray(valid.targets) ? valid.targets : [],
    };
  } catch {
    return { invoices: [], payments: [], targets: [] };
  }
}

function writeStore(store: FinanceStore): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[financeService] Failed to write store:', err);
  }
}

function generateInvoiceNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `INV-2026-${num}`;
}

function generateReceiptNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `RCT-2026-${num}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Service Functions: Invoices ───────────────────────────────────────────────

export async function listInvoices(filter?: { status?: InvoiceStatus; customerId?: string }): Promise<Invoice[]> {
  const store = readStore();
  return store.invoices.filter((inv) => {
    if (filter?.status && inv.status !== filter.status) return false;
    if (filter?.customerId && inv.customerId !== filter.customerId) return false;
    return true;
  });
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const store = readStore();
  return store.invoices.find((i) => i.id === id || i.invoiceNumber === id) ?? null;
}

export async function createInvoice(input: {
  salesOrderId?: string | null;
  customerId: string;
  customerName: string;
  subtotal: number;
  dueDate?: string;
  eWayBillNumber?: string | null;
}): Promise<Invoice> {
  await assertWriteAllowed('create invoice');

  const store = readStore();
  const cgst = Math.round((input.subtotal * 9) / 100);
  const sgst = Math.round((input.subtotal * 9) / 100);
  const totalAmount = input.subtotal + cgst + sgst;

  const newInvoice: Invoice = {
    id: generateId('inv'),
    invoiceNumber: generateInvoiceNumber(store.invoices.length),
    salesOrderId: input.salesOrderId || null,
    customerId: input.customerId,
    customerName: input.customerName,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: input.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    subtotal: input.subtotal,
    cgst,
    sgst,
    igst: 0,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    eWayBillNumber: input.eWayBillNumber || null,
    status: 'ISSUED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Sync with PostgreSQL if online and salesOrderId and customerId exist
  const isOnline = await isPostgresAvailable();
  if (isOnline && input.salesOrderId && input.customerId) {
    try {
      const [orderExists, custExists] = await Promise.all([
        prisma.salesOrder.findUnique({ where: { id: input.salesOrderId }, select: { id: true } }),
        prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }),
      ]);
      if (orderExists && custExists) {
        await prisma.invoice.create({
          data: {
            id: newInvoice.id,
            invoiceNumber: newInvoice.invoiceNumber,
            salesOrderId: input.salesOrderId,
            customerId: input.customerId,
            invoiceDate: new Date(newInvoice.invoiceDate),
            dueDate: new Date(newInvoice.dueDate),
            subtotal: newInvoice.subtotal,
            cgst: newInvoice.cgst,
            sgst: newInvoice.sgst,
            igst: newInvoice.igst,
            totalAmount: newInvoice.totalAmount,
            eWayBillNumber: newInvoice.eWayBillNumber,
            status: newInvoice.status,
          },
        });
      }
    } catch (err) {
      console.warn('[financeService] PostgreSQL invoice sync skipped, preserved locally:', err);
    }
  }

  store.invoices.unshift(newInvoice);
  writeStore(store);
  return newInvoice;
}

// ── Service Functions: Payments ───────────────────────────────────────────────

export async function listPayments(): Promise<Payment[]> {
  const store = readStore();
  return store.payments;
}

export async function recordPayment(input: {
  invoiceId?: string | null;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string;
}): Promise<Payment> {
  await assertWriteAllowed('record payment');

  const store = readStore();
  const newPayment: Payment = {
    id: generateId('pay'),
    receiptNumber: generateReceiptNumber(store.payments.length),
    invoiceId: input.invoiceId || null,
    customerId: input.customerId,
    customerName: input.customerName,
    paymentDate: new Date().toISOString().split('T')[0],
    amount: input.amount,
    paymentMode: input.paymentMode,
    referenceNumber: input.referenceNumber || null,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };

  // If tied to an invoice, update paidAmount & status
  if (input.invoiceId) {
    const inv = store.invoices.find((i) => i.id === input.invoiceId);
    if (inv) {
      inv.paidAmount += input.amount;
      inv.balanceAmount = Math.max(0, inv.totalAmount - inv.paidAmount);
      if (inv.balanceAmount === 0) {
        inv.status = 'PAID';
      }
      inv.updatedAt = new Date().toISOString();
    }
  }

  // Sync to PostgreSQL if online and customer exists
  const isOnline = await isPostgresAvailable();
  if (isOnline && input.customerId) {
    try {
      const custExists = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true },
      });
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      if (custExists && firstUser) {
        await prisma.payment.create({
          data: {
            id: newPayment.id,
            receiptNumber: newPayment.receiptNumber,
            invoiceId: input.invoiceId || undefined,
            customerId: input.customerId,
            recordedById: firstUser.id,
            amount: newPayment.amount,
            paymentDate: new Date(newPayment.paymentDate),
            paymentMode: newPayment.paymentMode,
            referenceNumber: newPayment.referenceNumber,
            notes: newPayment.notes,
          },
        });
      }
    } catch (err) {
      console.warn('[financeService] PostgreSQL payment sync skipped, preserved locally:', err);
    }
  }

  store.payments.unshift(newPayment);
  writeStore(store);
  return newPayment;
}

// ── Service Functions: Targets & Break-even ───────────────────────────────────

export async function listFinancialTargets(): Promise<FinancialTarget[]> {
  const store = readStore();
  return store.targets;
}

export async function createFinancialTarget(input: {
  targetPeriod: string;
  periodType?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  salesRevenueTarget: number;
  collectionsTarget: number;
  frpDoorQuantityTarget: number;
  grossProfitTarget?: number;
  expenseBudget?: number;
}): Promise<FinancialTarget> {
  await assertWriteAllowed('create financial target');

  const store = readStore();
  const newTarget: FinancialTarget = {
    id: generateId('tgt'),
    targetPeriod: input.targetPeriod,
    periodType: input.periodType || 'MONTHLY',
    salesRevenueTarget: input.salesRevenueTarget,
    collectionsTarget: input.collectionsTarget,
    frpDoorQuantityTarget: input.frpDoorQuantityTarget,
    grossProfitTarget: input.grossProfitTarget ?? Math.round(input.salesRevenueTarget * 0.35),
    expenseBudget: input.expenseBudget ?? Math.round(input.salesRevenueTarget * 0.18),
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.targets.unshift(newTarget);
  writeStore(store);
  return newTarget;
}
