import fs from 'fs';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

export type BoqProductCategory = 'FRP' | 'WPC';
export type BoqStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'CONVERTED_TO_QUOTATION' | 'ARCHIVED';

export interface BoqItem {
  id: string;
  boqId: string;
  itemCode: string;
  productCategory: BoqProductCategory;
  model: string;
  description?: string;
  frameDetails?: string;
  heightMm: number;
  widthMm: number;
  quantity: number;
  areaSqFt: number;
  unitRate: number;
  amount: number;
  taxRate: number;
  transportRate: number;
  installationRate: number;
}

export interface BoqMaster {
  id: string;
  boqNumber: string;
  customerId?: string | null;
  customerName: string;
  projectName: string;
  siteAddress?: string;
  district: string;
  revisionNumber: number;
  status: BoqStatus;
  totalDoors: number;
  totalAmount: number;
  notes?: string;
  originalImport?: string | null;
  items: BoqItem[];
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export type BoqCreateInput = Omit<BoqMaster, 'id' | 'boqNumber' | 'items' | 'totalDoors' | 'totalAmount' | 'createdAt' | 'updatedAt' | '_demo' | 'revisionNumber'> & {
  revisionNumber?: number;
};
export type BoqUpdateInput = Partial<Omit<BoqCreateInput, 'items'>>;
export type BoqItemCreateInput = Omit<BoqItem, 'id' | 'boqId' | 'areaSqFt'>;

export interface BoqFilter {
  status?: BoqStatus;
  district?: string;
  customerId?: string;
}

// ── Store helpers ─────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), 'data', 'boq-store.json');

function readStore(): BoqMaster[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BoqMaster[]) : [];
  } catch {
    return [];
  }
}

function writeStore(boqs: BoqMaster[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(boqs, null, 2), 'utf8');
  } catch (err) {
    console.error('[boqService] Failed to write store:', err);
  }
}

function generateBoqNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `BOQ-2026-${num}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Calculate areaSqFt = (heightMm / 304.8) * (widthMm / 304.8) * quantity
 */
function calcAreaSqFt(heightMm: number, widthMm: number, quantity: number): number {
  return parseFloat(((heightMm / 304.8) * (widthMm / 304.8) * quantity).toFixed(2));
}

function recalcBoqTotals(items: BoqItem[]): { totalDoors: number; totalAmount: number } {
  const totalDoors = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
  return { totalDoors, totalAmount };
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listBoqs(filter?: BoqFilter): Promise<BoqMaster[]> {
  const all = readStore();
  return all.filter((b) => {
    if (filter?.status && b.status !== filter.status) return false;
    if (filter?.district && b.district.toLowerCase() !== filter.district.toLowerCase()) return false;
    if (filter?.customerId && b.customerId !== filter.customerId) return false;
    return true;
  });
}

export async function getBoq(id: string): Promise<BoqMaster | null> {
  const all = readStore();
  return all.find((b) => b.id === id) ?? null;
}

export async function createBoq(data: BoqCreateInput): Promise<BoqMaster> {
  const all = readStore();
  const newBoq: BoqMaster = {
    ...data,
    revisionNumber: data.revisionNumber ?? 1,
    id: generateId('boq-api'),
    boqNumber: generateBoqNumber(all.length),
    items: [],
    totalDoors: 0,
    totalAmount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(newBoq);
  writeStore(all);
  return newBoq;
}

export async function updateBoq(id: string, data: BoqUpdateInput): Promise<BoqMaster> {
  const all = readStore();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error(`BOQ ${id} not found`);
  const updated: BoqMaster = {
    ...all[idx],
    ...data,
    id: all[idx].id,
    boqNumber: all[idx].boqNumber,
    items: all[idx].items,
    createdAt: all[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function deleteBoq(id: string): Promise<boolean> {
  const all = readStore();
  const filtered = all.filter((b) => b.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}

export async function addBoqItem(boqId: string, itemData: BoqItemCreateInput): Promise<BoqMaster> {
  const all = readStore();
  const idx = all.findIndex((b) => b.id === boqId);
  if (idx === -1) throw new Error(`BOQ ${boqId} not found`);

  const areaSqFt = calcAreaSqFt(itemData.heightMm, itemData.widthMm, itemData.quantity);
  const newItem: BoqItem = {
    ...itemData,
    id: generateId('boqitem'),
    boqId,
    areaSqFt,
  };

  const updatedItems = [...all[idx].items, newItem];
  const { totalDoors, totalAmount } = recalcBoqTotals(updatedItems);

  all[idx] = {
    ...all[idx],
    items: updatedItems,
    totalDoors,
    totalAmount,
    updatedAt: new Date().toISOString(),
  };
  writeStore(all);
  return all[idx];
}

export async function importBoqFromCsv(boqId: string, rawCsvPayload: string): Promise<BoqMaster> {
  const all = readStore();
  const idx = all.findIndex((b) => b.id === boqId);
  if (idx === -1) throw new Error(`BOQ ${boqId} not found`);

  // Store original import for auditing
  all[idx].originalImport = rawCsvPayload;

  // Parse CSV: assume header row = itemCode,productCategory,model,heightMm,widthMm,quantity,unitRate,taxRate
  const lines = rawCsvPayload.split('\n').filter((l) => l.trim().length > 0);
  const dataLines = lines.slice(1); // skip header

  const newItems: BoqItem[] = dataLines.map((line, i) => {
    const parts = line.split(',').map((p) => p.trim());
    const heightMm = parseInt(parts[3] ?? '2100', 10);
    const widthMm = parseInt(parts[4] ?? '900', 10);
    const quantity = parseInt(parts[5] ?? '1', 10);
    const unitRate = parseFloat(parts[6] ?? '0');
    const taxRate = parseFloat(parts[7] ?? '18');
    const areaSqFt = calcAreaSqFt(heightMm, widthMm, quantity);
    return {
      id: generateId(`boqitem-csv-${i}`),
      boqId,
      itemCode: parts[0] ?? `CSV-${i + 1}`,
      productCategory: (parts[1] ?? 'FRP').toUpperCase() === 'WPC' ? 'WPC' : ('FRP' as BoqProductCategory),
      model: parts[2] ?? 'Unknown',
      heightMm,
      widthMm,
      quantity,
      areaSqFt,
      unitRate,
      amount: unitRate * quantity,
      taxRate,
      transportRate: 0,
      installationRate: 0,
    };
  });

  const updatedItems = [...all[idx].items, ...newItems];
  const { totalDoors, totalAmount } = recalcBoqTotals(updatedItems);

  all[idx] = {
    ...all[idx],
    items: updatedItems,
    totalDoors,
    totalAmount,
    updatedAt: new Date().toISOString(),
  };
  writeStore(all);
  return all[idx];
}

export async function updateBoqItem(boqId: string, itemId: string, data: Partial<BoqItemCreateInput>): Promise<BoqMaster> {
  const all = readStore();
  const boqIdx = all.findIndex((b) => b.id === boqId);
  if (boqIdx === -1) throw new Error(`BOQ ${boqId} not found`);

  const itemIdx = all[boqIdx].items.findIndex((i) => i.id === itemId);
  if (itemIdx === -1) throw new Error(`BOQ item ${itemId} not found`);

  const existing = all[boqIdx].items[itemIdx];
  const merged = { ...existing, ...data };
  merged.areaSqFt = calcAreaSqFt(merged.heightMm, merged.widthMm, merged.quantity);

  all[boqIdx].items[itemIdx] = merged;
  const { totalDoors, totalAmount } = recalcBoqTotals(all[boqIdx].items);
  all[boqIdx] = { ...all[boqIdx], totalDoors, totalAmount, updatedAt: new Date().toISOString() };
  writeStore(all);
  return all[boqIdx];
}

export async function deleteBoqItem(boqId: string, itemId: string): Promise<BoqMaster> {
  const all = readStore();
  const idx = all.findIndex((b) => b.id === boqId);
  if (idx === -1) throw new Error(`BOQ ${boqId} not found`);

  all[idx].items = all[idx].items.filter((i) => i.id !== itemId);
  const { totalDoors, totalAmount } = recalcBoqTotals(all[idx].items);
  all[idx] = { ...all[idx], totalDoors, totalAmount, updatedAt: new Date().toISOString() };
  writeStore(all);
  return all[idx];
}

export async function convertToQuotation(boqId: string): Promise<BoqMaster> {
  const all = readStore();
  const idx = all.findIndex((b) => b.id === boqId);
  if (idx === -1) throw new Error(`BOQ ${boqId} not found`);
  all[idx] = { ...all[idx], status: 'CONVERTED_TO_QUOTATION', updatedAt: new Date().toISOString() };
  writeStore(all);
  return all[idx];
}
