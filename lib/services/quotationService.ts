import fs from 'fs';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

export type DoorCategory = 'FRP_DOORS' | 'WPC_DOORS';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface QuotationItem {
  id: string;
  quotationId: string;
  doorCategory: DoorCategory;
  doorModel: string;
  heightMm: number;
  widthMm: number;
  thicknessMm: number;
  coreType?: string;
  finishColor?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  leadId?: string | null;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: QuotationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export type QuotationCreateInput = {
  customerId: string;
  leadId?: string | null;
  date: string;
  validUntil: string;
  items: Omit<QuotationItem, 'id' | 'quotationId'>[];
  discount?: number;
  notes?: string;
};

export type QuotationUpdateInput = Partial<Omit<QuotationCreateInput, 'items'> & { status: QuotationStatus }>;

export type QuotationItemCreateInput = Omit<QuotationItem, 'id' | 'quotationId'>;

export interface QuotationFilter {
  status?: QuotationStatus;
  customerId?: string;
}

// ── Store helpers ─────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), 'data', 'quotations-store.json');

function readStore(): Quotation[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Quotation[]) : [];
  } catch {
    return [];
  }
}

function writeStore(quotations: Quotation[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(quotations, null, 2), 'utf8');
  } catch (err) {
    console.error('[quotationService] Failed to write store:', err);
  }
}

function generateQuoteNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `QTN-2026-${num}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function calcTotals(items: Omit<QuotationItem, 'id' | 'quotationId'>[], discount: number, gstRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discounted = subtotal - discount;
  const gstAmount = Math.round((discounted * gstRate) / 100);
  const totalAmount = discounted + gstAmount;
  return { subtotal, gstAmount, totalAmount };
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listQuotations(filter?: QuotationFilter): Promise<Quotation[]> {
  const all = readStore();
  return all.filter((q) => {
    if (filter?.status && q.status !== filter.status) return false;
    if (filter?.customerId && q.customerId !== filter.customerId) return false;
    return true;
  });
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const all = readStore();
  return all.find((q) => q.id === id) ?? null;
}

export async function createQuotation(data: QuotationCreateInput): Promise<Quotation> {
  const all = readStore();
  const discount = data.discount ?? 0;
  const gstRate = 18;
  const { subtotal, gstAmount, totalAmount } = calcTotals(data.items, discount, gstRate);

  const quotationId = generateId('qtn-api');
  const builtItems: QuotationItem[] = data.items.map((item, idx) => ({
    ...item,
    id: `qitem-${Date.now()}-${idx}`,
    quotationId,
  }));

  const newQuotation: Quotation = {
    id: quotationId,
    quoteNumber: generateQuoteNumber(all.length),
    customerId: data.customerId,
    leadId: data.leadId ?? null,
    date: data.date,
    validUntil: data.validUntil,
    items: builtItems,
    subtotal,
    discount,
    gstRate,
    gstAmount,
    totalAmount,
    status: 'DRAFT',
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all.push(newQuotation);
  writeStore(all);
  return newQuotation;
}

export async function updateQuotation(id: string, data: QuotationUpdateInput): Promise<Quotation> {
  const all = readStore();
  const idx = all.findIndex((q) => q.id === id);
  if (idx === -1) throw new Error(`Quotation ${id} not found`);
  const updated: Quotation = {
    ...all[idx],
    ...data,
    id: all[idx].id,
    quoteNumber: all[idx].quoteNumber,
    items: all[idx].items,
    createdAt: all[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function addItem(quotationId: string, itemData: QuotationItemCreateInput): Promise<Quotation> {
  const all = readStore();
  const idx = all.findIndex((q) => q.id === quotationId);
  if (idx === -1) throw new Error(`Quotation ${quotationId} not found`);

  const newItem: QuotationItem = {
    ...itemData,
    id: generateId('qitem'),
    quotationId,
  };

  const updatedItems = [...all[idx].items, newItem];
  const { subtotal, gstAmount, totalAmount } = calcTotals(updatedItems, all[idx].discount, all[idx].gstRate);
  all[idx] = {
    ...all[idx],
    items: updatedItems,
    subtotal,
    gstAmount,
    totalAmount,
    updatedAt: new Date().toISOString(),
  };
  writeStore(all);
  return all[idx];
}

export async function removeItem(quotationId: string, itemId: string): Promise<Quotation> {
  const all = readStore();
  const idx = all.findIndex((q) => q.id === quotationId);
  if (idx === -1) throw new Error(`Quotation ${quotationId} not found`);

  const updatedItems = all[idx].items.filter((i) => i.id !== itemId);
  const { subtotal, gstAmount, totalAmount } = calcTotals(updatedItems, all[idx].discount, all[idx].gstRate);
  all[idx] = {
    ...all[idx],
    items: updatedItems,
    subtotal,
    gstAmount,
    totalAmount,
    updatedAt: new Date().toISOString(),
  };
  writeStore(all);
  return all[idx];
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const all = readStore();
  const filtered = all.filter((q) => q.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}

export async function convertToOrder(quotationId: string): Promise<Quotation> {
  return updateQuotation(quotationId, { status: 'CONVERTED' });
}
