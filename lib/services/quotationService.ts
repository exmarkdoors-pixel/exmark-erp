import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { calculateCommissionForQuote, recordOrderCommission } from './salesTargetService';

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
  customerName?: string;
  location?: string;
  itemsSummary?: string;
  leadId?: string | null;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  itemRows?: unknown[];
  subtotal: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  advancePercent?: number;
  advanceAmount?: number;
  includeInstallation?: boolean;
  installationMode?: 'PER_DOOR' | 'FIXED_LUMP_SUM';
  installationRate?: number;
  installationQty?: number;
  installationNotes?: string;
  installationAmount?: number;
  includeTransportation?: boolean;
  transportationMode?: 'FIXED_LUMP_SUM' | 'PER_KM' | 'PER_DOOR';
  transportationRate?: number;
  transportationDistanceKm?: number;
  transportationVehicleType?: string;
  transportationNotes?: string;
  transportationAmount?: number;
  isConfirmed?: boolean;
  jobCardNumber?: string | null;
  status: QuotationStatus;
  source?: 'DESKTOP' | 'MOBILE_FIELD_APP';
  quotationCategory?: 'SITE_MEASUREMENT' | 'SHOWROOM_DIRECT' | 'CONTRACTOR_BULK';
  siteMeasurementId?: string;
  siteMeasurementRef?: string;
  measuringStaffName?: string;
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  commissionType?: 'PERCENTAGE' | 'PER_PIECE';
  commissionRate?: number;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionStatus?: 'PROJECTED' | 'ACCRUED' | 'PAID' | 'VOID';
  territoryDistrict?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export type QuotationCreateInput = {
  customerId: string;
  customerName?: string;
  location?: string;
  itemsSummary?: string;
  leadId?: string | null;
  date: string;
  validUntil: string;
  items: Omit<QuotationItem, 'id' | 'quotationId'>[];
  itemRows?: unknown[];
  discount?: number;
  overrideSubtotal?: number;
  overrideTotalAmount?: number;
  advancePercent?: number;
  advanceAmount?: number;
  includeInstallation?: boolean;
  installationMode?: 'PER_DOOR' | 'FIXED_LUMP_SUM';
  installationRate?: number;
  installationQty?: number;
  installationNotes?: string;
  installationAmount?: number;
  includeTransportation?: boolean;
  transportationMode?: 'FIXED_LUMP_SUM' | 'PER_KM' | 'PER_DOOR';
  transportationRate?: number;
  transportationDistanceKm?: number;
  transportationVehicleType?: string;
  transportationNotes?: string;
  transportationAmount?: number;
  source?: 'DESKTOP' | 'MOBILE_FIELD_APP';
  quotationCategory?: 'SITE_MEASUREMENT' | 'SHOWROOM_DIRECT' | 'CONTRACTOR_BULK';
  siteMeasurementId?: string;
  siteMeasurementRef?: string;
  measuringStaffName?: string;
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  commissionType?: 'PERCENTAGE' | 'PER_PIECE';
  commissionRate?: number;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionStatus?: 'PROJECTED' | 'ACCRUED' | 'PAID' | 'VOID';
  territoryDistrict?: string;
  isConfirmed?: boolean;
  jobCardNumber?: string | null;
  notes?: string;
};

export type QuotationUpdateInput = Partial<
  Omit<QuotationCreateInput, 'items'> & {
    items?: Omit<QuotationItem, 'id' | 'quotationId'>[];
    status: QuotationStatus;
    isConfirmed?: boolean;
    jobCardNumber?: string | null;
  }
>;

export type QuotationItemCreateInput = Omit<QuotationItem, 'id' | 'quotationId'>;

export interface QuotationFilter {
  status?: QuotationStatus;
  customerId?: string;
}

// ── Store helpers ─────────────────────────────────────────────────────────────

const getStorePath = () => getDataFilePath('quotations-store.json');

function readStore(): Quotation[] {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Quotation[]) : [];
  } catch {
    return [];
  }
}

function writeStore(quotations: Quotation[]): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(quotations, null, 2), 'utf8');
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

function calcTotals(items: Omit<QuotationItem, 'id' | 'quotationId'>[] = [], discount: number, gstRate: number) {
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((sum, item) => {
    const itemTotal = item.totalPrice ?? ((item.unitPrice || 0) * (item.quantity || 1));
    return sum + itemTotal;
  }, 0);
  const discounted = Math.max(0, subtotal - discount);
  const gstAmount = Math.round((discounted * gstRate) / 100);
  const totalAmount = discounted + gstAmount;
  return { subtotal, gstAmount, totalAmount };
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listQuotations(filter?: QuotationFilter): Promise<Quotation[]> {
  const all = readStore();
  return all
    .filter((q) => {
      if (filter?.status && q.status !== filter.status) return false;
      if (filter?.customerId && q.customerId !== filter.customerId) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || a.date).getTime() || 0;
      const timeB = new Date(b.updatedAt || b.createdAt || b.date).getTime() || 0;
      return timeB - timeA;
    });
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const all = readStore();
  return all.find((q) => q.id === id) ?? null;
}

export async function createQuotation(data: QuotationCreateInput): Promise<Quotation> {
  const all = readStore();
  const discount = data.discount ?? 0;
  const gstRate = 0;
  const { subtotal, gstAmount, totalAmount } = calcTotals(data.items, discount, gstRate);

  const quotationId = generateId('qtn-api');
  const safeItems = Array.isArray(data.items) ? data.items : [];
  const builtItems: QuotationItem[] = safeItems.map((item, idx) => ({
    ...item,
    doorCategory: item.doorCategory || 'FRP_DOORS',
    heightMm: item.heightMm || 2100,
    widthMm: item.widthMm || 900,
    thicknessMm: item.thicknessMm || 32,
    unitPrice: item.unitPrice || 7800,
    gstRate: 0,
    totalPrice: item.totalPrice ?? Math.round((item.unitPrice || 7800) * (item.quantity || 1)),
    id: `qitem-${Date.now()}-${idx}`,
    quotationId,
  }));

  const resolvedSubtotal =
    data.overrideSubtotal !== undefined ? Number(data.overrideSubtotal) : subtotal;
  const resolvedTotal =
    data.overrideTotalAmount !== undefined ? Number(data.overrideTotalAmount) : totalAmount;

  const commissionType: 'PERCENTAGE' | 'PER_PIECE' = data.commissionType || 'PER_PIECE';
  let commissionRate = data.commissionRate !== undefined
    ? Number(data.commissionRate)
    : (data.commissionPercent !== undefined ? Number(data.commissionPercent) : 0);
  let commissionPercent = resolvedTotal > 0 && data.commissionAmount !== undefined
    ? Number(((data.commissionAmount / resolvedTotal) * 100).toFixed(1))
    : (commissionType === 'PERCENTAGE' ? commissionRate : 0);
  let commissionAmount = data.commissionAmount;
  const commissionStatus = data.commissionStatus || (data.isConfirmed ? 'ACCRUED' : 'PROJECTED');

  const totalDoorQuantity = builtItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
  if (data.salespersonId && commissionAmount === undefined) {
    try {
      const calc = await calculateCommissionForQuote({
        orderAmount: resolvedTotal,
        advancePercent: data.advancePercent || 0,
        doorCount: totalDoorQuantity,
        salespersonId: data.salespersonId,
        commissionType,
        commissionRate,
      });
      commissionPercent = calc.commissionPercent;
      commissionAmount = calc.commissionAmount;
      commissionRate = calc.commissionRate;
    } catch {
      commissionAmount = Math.round(totalDoorQuantity * commissionRate);
      commissionPercent = resolvedTotal > 0 ? Number(((commissionAmount / resolvedTotal) * 100).toFixed(1)) : 0;
    }
  }

  const newQuotation: Quotation = {
    id: quotationId,
    quoteNumber: generateQuoteNumber(all.length),
    customerId: data.customerId,
    customerName: data.customerName,
    location: data.location,
    itemsSummary: data.itemsSummary,
    leadId: data.leadId ?? null,
    date: data.date,
    validUntil: data.validUntil,
    items: builtItems,
    itemRows: data.itemRows,
    subtotal: resolvedSubtotal,
    discount,
    gstRate,
    gstAmount,
    totalAmount: resolvedTotal,
    advancePercent: data.advancePercent,
    advanceAmount: data.advanceAmount,
    includeInstallation: data.includeInstallation,
    installationMode: data.installationMode,
    installationRate: data.installationRate,
    installationQty: data.installationQty,
    installationNotes: data.installationNotes,
    installationAmount: data.installationAmount,
    includeTransportation: data.includeTransportation,
    transportationMode: data.transportationMode,
    transportationRate: data.transportationRate,
    transportationDistanceKm: data.transportationDistanceKm,
    transportationVehicleType: data.transportationVehicleType,
    transportationNotes: data.transportationNotes,
    transportationAmount: data.transportationAmount,
    isConfirmed: Boolean(data.isConfirmed),
    jobCardNumber: data.jobCardNumber || null,
    status: data.isConfirmed ? 'APPROVED' : 'DRAFT',
    source: data.source || 'DESKTOP',
    quotationCategory: data.quotationCategory || (data.siteMeasurementRef ? 'SITE_MEASUREMENT' : 'SHOWROOM_DIRECT'),
    siteMeasurementId: data.siteMeasurementId,
    siteMeasurementRef: data.siteMeasurementRef,
    measuringStaffName: data.measuringStaffName,
    salespersonId: data.salespersonId,
    salespersonName: data.salespersonName,
    salespersonCode: data.salespersonCode,
    commissionType,
    commissionRate,
    commissionPercent,
    commissionAmount,
    commissionStatus,
    territoryDistrict: data.territoryDistrict,
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (newQuotation.isConfirmed && newQuotation.salespersonId) {
    try {
      await recordOrderCommission({
        quotationId: newQuotation.id,
        quoteNumber: newQuotation.quoteNumber,
        jobCardNumber: newQuotation.jobCardNumber || undefined,
        customerId: newQuotation.customerId,
        customerName: newQuotation.customerName || 'Customer',
        orderAmount: newQuotation.totalAmount,
        advancePaid: newQuotation.advanceAmount || 0,
        doorCount: totalDoorQuantity,
        commissionType: newQuotation.commissionType,
        commissionRate: newQuotation.commissionRate,
        salespersonId: newQuotation.salespersonId,
        salespersonCode: newQuotation.salespersonCode,
        salespersonName: newQuotation.salespersonName,
      });
    } catch (err) {
      console.warn('Could not record order commission on create:', err);
    }
  }

  all.push(newQuotation);
  writeStore(all);
  return newQuotation;
}

export async function updateQuotation(id: string, data: QuotationUpdateInput): Promise<Quotation> {
  const all = readStore();
  const idx = all.findIndex((q) => q.id === id || q.quoteNumber === id);
  if (idx === -1) throw new Error(`Quotation ${id} not found`);

  const existing = all[idx];
  const rebuiltItems: QuotationItem[] = Array.isArray(data.items)
    ? data.items.map((item, itemIdx) => ({
        ...item,
        doorCategory: item.doorCategory || 'FRP_DOORS',
        heightMm: item.heightMm || 2100,
        widthMm: item.widthMm || 900,
        thicknessMm: item.thicknessMm || 32,
        unitPrice: item.unitPrice || 7800,
        gstRate: 0,
        totalPrice: item.totalPrice ?? Math.round((item.unitPrice || 7800) * (item.quantity || 1)),
        id: `qitem-${Date.now()}-${itemIdx}`,
        quotationId: existing.id,
      }))
    : existing.items;

  const discount = data.discount !== undefined ? data.discount : existing.discount;
  const calc = calcTotals(rebuiltItems, discount, 0);

  const updated: Quotation = {
    ...existing,
    ...data,
    id: existing.id,
    quoteNumber: existing.quoteNumber,
    items: rebuiltItems,
    subtotal: data.overrideSubtotal !== undefined ? Number(data.overrideSubtotal) : (data.items ? calc.subtotal : existing.subtotal),
    gstRate: 0,
    gstAmount: 0,
    totalAmount: data.overrideTotalAmount !== undefined ? Number(data.overrideTotalAmount) : (data.items ? calc.totalAmount : existing.totalAmount),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // If order is confirmed and salesperson assigned, accrue commission to ledger
  if (updated.isConfirmed && (!existing.isConfirmed || existing.commissionStatus === 'PROJECTED' || !existing.commissionStatus)) {
    const minRequiredAdvance = Math.round((updated.totalAmount || existing.totalAmount || 0) * 0.30);
    const advAmount = updated.advanceAmount !== undefined ? Number(updated.advanceAmount) : (existing.advanceAmount || 0);
    if (advAmount < minRequiredAdvance) {
      throw new Error(`Order confirmation requires minimum 30% advance deposit (₹${minRequiredAdvance.toLocaleString('en-IN')}).`);
    }

    const spId = updated.salespersonId || existing.salespersonId;
    if (spId) {
      try {
        const totalDoors = rebuiltItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

        const rec = await recordOrderCommission({
          quotationId: existing.id,
          quoteNumber: existing.quoteNumber,
          jobCardNumber: updated.jobCardNumber || existing.jobCardNumber || undefined,
          customerId: updated.customerId || existing.customerId,
          customerName: updated.customerName || existing.customerName || 'Customer',
          orderAmount: updated.totalAmount,
          advancePaid: advAmount,
          doorCount: totalDoors,
          commissionType: updated.commissionType || existing.commissionType,
          commissionRate: updated.commissionRate || existing.commissionRate,
          salespersonId: spId,
          salespersonCode: updated.salespersonCode || existing.salespersonCode,
          salespersonName: updated.salespersonName || existing.salespersonName,
        });
        updated.commissionPercent = rec.effectiveCommissionPercent;
        updated.commissionAmount = rec.totalCommissionAmount;
        updated.commissionStatus = 'ACCRUED';
      } catch (err) {
        console.warn('Could not record commission on order confirmation:', err);
      }
    }
  }

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
  const filtered = all.filter((q) => q.id !== id && q.quoteNumber !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}

export async function convertToOrder(quotationId: string): Promise<Quotation> {
  return updateQuotation(quotationId, { status: 'CONVERTED' });
}
