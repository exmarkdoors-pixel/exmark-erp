import fs from 'fs';
import path from 'path';
import { getBoqMaterialRates } from './boqRateService';
import { getCustomFrames } from './frameService';
import { calculateDoorBatchBoq } from '@/lib/utils/boqFormulaEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export type BoqProductCategory = 'FRP' | 'WPC';
export type BoqStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'CONVERTED_TO_QUOTATION' | 'ARCHIVED';
export type BoqStage = 'GENERAL' | 'MANUFACTURING' | 'PAINTING';

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
  boqStage?: BoqStage;
  orderId?: string | null;
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

import { getDataFilePath } from '@/lib/utils/dataPaths';

const getStorePath = () => getDataFilePath('boq-store.json');

function readStore(): BoqMaster[] {
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
    return Array.isArray(parsed) ? (parsed as BoqMaster[]) : [];
  } catch {
    return [];
  }
}

function writeStore(boqs: BoqMaster[]): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(boqs, null, 2), 'utf8');
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

export const getBoqById = getBoq;

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
  const amount = itemData.amount ?? Math.round(itemData.quantity * (itemData.unitRate || 0));
  const newItem: BoqItem = {
    ...itemData,
    amount,
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
    const taxRate = 0;
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

export interface ProductionOrderBoqInput {
  id: string;
  prodOrderNumber?: string;
  jobCardNumber?: string;
  customerName: string;
  siteName: string;
  district: string;
  doors: Array<{
    id?: string;
    doorId?: string;
    doorNumber: string;
    model: string;
    rawHeightMm?: number;
    rawWidthMm?: number;
    rawHeightCm?: number;
    rawWidthTopCm?: number;
    finishedHeightMm?: number;
    finishedWidthMm?: number;
    frameTypeId?: string;
    frameTypeName?: string;
    finishColor?: string;
    lockId?: string;
    lockType?: string;
    handing?: 'LH' | 'RH';
  }>;
}

/**
 * Auto-creates a Manufacturing BOQ (Resin, GEL, Catalyst, Accelerator, CSM 300 GSM, Colour Pigment,
 * Frame/Shutter Timber in Cu.Ft & Rigid Foam Sheets) using live Sq.Ft rates when an order enters Manufacturing.
 */
export async function generateManufacturingBoq(
  order: ProductionOrderBoqInput,
  forceRecalculate = false
): Promise<BoqMaster> {
  const all = readStore();
  
  // Check if an existing manufacturing BOQ already exists for this order
  const existingIdx = all.findIndex((b) => b.orderId === order.id && b.boqStage === 'MANUFACTURING');
  const existing = existingIdx >= 0 ? all[existingIdx] : undefined;
  if (existing && !forceRecalculate) return existing;

  const boqId = existing ? existing.id : generateId('boq-mfg');
  const boqNumber = existing ? existing.boqNumber : `BOQ-MFG-${Date.now().toString().slice(-4)}`;

  const [rates, framesList] = await Promise.all([
    getBoqMaterialRates(),
    Promise.resolve(getCustomFrames()),
  ]);

  const rawDoors = order.doors || [];
  const batchCalc = calculateDoorBatchBoq(
    rawDoors.map((d) => ({
      doorNumber: d.doorNumber,
      widthCm:
        d.rawWidthTopCm && d.rawWidthTopCm > 0
          ? d.rawWidthTopCm
          : d.rawWidthMm && d.rawWidthMm > 0
          ? d.rawWidthMm / 10
          : d.finishedWidthMm && d.finishedWidthMm > 0
          ? d.finishedWidthMm / 10
          : rates.baseDoorWidthCm,
      heightCm:
        d.rawHeightCm && d.rawHeightCm > 0
          ? d.rawHeightCm
          : d.rawHeightMm && d.rawHeightMm > 0
          ? d.rawHeightMm / 10
          : d.finishedHeightMm && d.finishedHeightMm > 0
          ? d.finishedHeightMm / 10
          : rates.baseDoorHeightCm,
      frameTypeId: d.frameTypeId,
      frameTypeName: d.frameTypeName,
      finishColor: d.finishColor,
      lockId: d.lockId,
      lockType: d.lockType,
      handing: d.handing,
      quantity: 1,
    })),
    framesList,
    rates
  );

  const items: BoqItem[] = rawDoors.map((door, idx) => {
    const line = batchCalc.perDoorLines[idx];
    const h = door.rawHeightMm || door.finishedHeightMm || Math.round((line?.heightCm || 210) * 10);
    const w = door.rawWidthMm || door.finishedWidthMm || Math.round((line?.widthCm || 80) * 10);
    const area = Number((line?.areaSqFt ?? calcAreaSqFt(h, w, 1)).toFixed(2));
    const unitRate = Math.round(line?.totalDoorCost || area * 165);

    const chemSummary = line
      ? `Resin ${line.resinKg.toFixed(2)}kg, GEL ${line.gelKg.toFixed(2)}kg, Catalyst ${Math.round(line.catalystGrams)}g, Accel ${Math.round(line.acceleratorGrams)}g, CSM 300 ${line.csm300Kg.toFixed(2)}kg, Pigment (${line.finishColor}) ${Math.round(line.pigmentGrams)}g @ ₹${line.pigmentRatePerKg}/kg`
      : '';
    const woodSummary = line
      ? `Timber ${line.totalWoodCuFt.toFixed(4)} cu.ft (Frame ${line.frameWoodRunningFt.toFixed(2)} Rft / ${line.frameWoodCuFt.toFixed(4)} + Shutter ${(line.lockReeperCuFt + line.hingeReeperCuFt).toFixed(4)} cu.ft), Foam ${(line.foamSheetsExact * 100).toFixed(1)}% sheet`
      : '';

    return {
      id: generateId('item-mfg'),
      boqId,
      itemCode: `MFG-ITEM-${idx + 1}`,
      productCategory: 'FRP',
      model: door.model || 'Hand-Craft FRP Shutter',
      description: `Auto-BOQ (${area.toFixed(2)} sq.ft): ${chemSummary}; ${woodSummary} for ${door.doorNumber}`,
      frameDetails: `${line?.frameName || door.frameTypeName || 'Regular Frame'} (${line?.frameWoodCuFt.toFixed(4) || '0'} cu.ft)`,
      heightMm: h,
      widthMm: w,
      quantity: 1,
      areaSqFt: area,
      unitRate,
      amount: unitRate,
      taxRate: 0,
      transportRate: 0,
      installationRate: 0,
    };
  });

  const { totalDoors, totalAmount } = recalcBoqTotals(items);

  const mfgBoq: BoqMaster = {
    id: boqId,
    boqNumber,
    boqStage: 'MANUFACTURING',
    orderId: order.id,
    customerName: order.customerName,
    projectName: `${order.siteName} (Job Card: ${order.jobCardNumber || 'JC-2026'})`,
    district: order.district,
    revisionNumber: existing ? (existing.revisionNumber || 1) + 1 : 1,
    status: existing ? existing.status : 'APPROVED',
    totalDoors,
    totalAmount,
    notes: `Auto-BOQ (${batchCalc.totalDoors} doors, ${batchCalc.totalSqFt.toFixed(2)} sq.ft): Resin ${batchCalc.resinKg.toFixed(2)}kg, GEL ${batchCalc.gelKg.toFixed(2)}kg, Catalyst ${Math.round(batchCalc.catalystGrams)}g, Accel ${Math.round(batchCalc.acceleratorGrams)}g, CSM 300 ${batchCalc.csm300Kg.toFixed(2)}kg, Pigment ${Math.round(batchCalc.pigmentGrams)}g, Wood ${batchCalc.totalWoodCuFt.toFixed(4)} cu.ft, Foam ${batchCalc.foamSheetsExact.toFixed(2)} sheets, Locks ${batchCalc.totalLockBoxes} boxes (₹${batchCalc.totalLockBoxCost}).`,
    items,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = mfgBoq;
  } else {
    all.unshift(mfgBoq);
  }
  writeStore(all);
  return mfgBoq;
}

/**
 * Auto-creates a Paint BOQ (Primer, 2K PU Paint, Thinner, Hardener) when an order enters Paint Section.
 */
export async function generatePaintBoq(order: ProductionOrderBoqInput): Promise<BoqMaster> {
  const all = readStore();
  
  // Check if an existing paint BOQ already exists for this order
  const existing = all.find((b) => b.orderId === order.id && b.boqStage === 'PAINTING');
  if (existing) return existing;

  const boqId = generateId('boq-paint');
  const boqNumber = `BOQ-PNT-${Date.now().toString().slice(-4)}`;

  const items: BoqItem[] = (order.doors || []).map((door, idx) => {
    const h = door.finishedHeightMm || 2100;
    const w = door.finishedWidthMm || 800;
    const area = calcAreaSqFt(h, w, 1);
    const color = door.finishColor || 'Burma Teak Woodgrain';
    
    // Standard paint BOM: Epoxy Primer, 2K PU Topcoat, Hardener & Clear Lacquer
    const unitRate = Math.round(area * 75); // Paint consumption cost per sqft

    return {
      id: generateId('item-pnt'),
      boqId,
      itemCode: `PNT-ITEM-${idx + 1}`,
      productCategory: 'FRP',
      model: door.model || 'FRP Molded Shutter',
      description: `Paint BOM: Epoxy Surfacer (0.8L), 2K PU Base (${color}, 1.2L), PU Hardener & UV Lacquer for ${door.doorNumber}`,
      frameDetails: `Finish: ${color}`,
      heightMm: h,
      widthMm: w,
      quantity: 1,
      areaSqFt: area,
      unitRate,
      amount: unitRate,
      taxRate: 0,
      transportRate: 0,
      installationRate: 0,
    };
  });

  const { totalDoors, totalAmount } = recalcBoqTotals(items);

  const paintBoq: BoqMaster = {
    id: boqId,
    boqNumber,
    boqStage: 'PAINTING',
    orderId: order.id,
    customerName: order.customerName,
    projectName: `${order.siteName} (Job Card: ${order.jobCardNumber || 'JC-2026'})`,
    district: order.district,
    revisionNumber: 1,
    status: 'APPROVED',
    totalDoors,
    totalAmount,
    notes: `Auto-generated Paint Section BOM for Job Card ${order.jobCardNumber || order.id}. 2K Polyurethane coatings, Kerala woodgrain textures, UV clear coats scheduled.`,
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all.unshift(paintBoq);
  writeStore(all);
  return paintBoq;
}

/**
 * Bulk updates BOQ items matching optional door model filter across the entire BOQ.
 */
export async function bulkUpdateBoqItems(
  boqId: string,
  updates: Partial<Pick<BoqItem, 'unitRate' | 'description' | 'model' | 'taxRate'>>,
  doorModelFilter?: string
): Promise<BoqMaster> {
  const all = readStore();
  const idx = all.findIndex((b) => b.id === boqId);
  if (idx === -1) throw new Error(`BOQ ${boqId} not found`);

  all[idx].items = all[idx].items.map((item) => {
    if (doorModelFilter && item.model !== doorModelFilter) {
      return item;
    }
    const merged = { ...item, ...updates };
    if (updates.unitRate !== undefined) {
      merged.amount = merged.quantity * updates.unitRate;
    }
    return merged;
  });

  const { totalDoors, totalAmount } = recalcBoqTotals(all[idx].items);
  all[idx].totalDoors = totalDoors;
  all[idx].totalAmount = totalAmount;
  all[idx].updatedAt = new Date().toISOString();

  writeStore(all);
  return all[idx];
}
