import fs from 'fs';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import type { ProductionOrder } from './productionService';
import {
  BoqDoorInput,
  BoqMaterialRatesConfig,
  calculateDoorBatchBoq,
} from '@/lib/utils/boqFormulaEngine';
import type { CustomFrameProfile } from '@/lib/utils/frameDefaults';

export type BoqIssueShift = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type BoqIssueSource = 'DESKTOP' | 'ANDROID_APP';
export type BoqMaterialGroupFilter = 'ALL' | 'CHEMICALS' | 'WOOD_FOAM' | 'HARDWARE';

export interface BoqIssueVoucherItem {
  key: string;
  name: string;
  unit: string;
  formulaQty: number;
  issuedQty: number;
  rate: number;
  value: number;
  category: string;
}

export interface BoqDoorInputMeta {
  doorId: string;
  doorNumber: string;
  widthCm?: number;
  heightCm?: number;
  sqFt?: number;
}

export interface BoqDoorAllocationItem {
  key: string;
  name: string;
  unit: string;
  qty: number;
  value: number;
  category: string;
}

export interface BoqDoorAllocation {
  doorId: string;
  doorNumber: string;
  widthCm: number;
  heightCm: number;
  sqFt: number;
  allocatedValue: number;
  items: BoqDoorAllocationItem[];
}

export interface BoqIssueVoucherRecord {
  id: string;
  voucherNumber: string;
  consolidatedBatchNumber?: string;
  isConsolidatedBatch?: boolean;
  issuedAt: string;
  issueDate: string;
  shift: BoqIssueShift;
  gangName: string;
  issuedBy: string;
  prodOrderId: string;
  orderNumber: string;
  jobCardNumber: string;
  customerName: string;
  doorIds: string[];
  doorNumbers: string[];
  doorsCount: number;
  items: BoqIssueVoucherItem[];
  doorAllocations?: BoqDoorAllocation[];
  totalIssuedValue: number;
  bufferPercent: number;
  notes?: string;
  source?: BoqIssueSource;
  formulaLocked?: boolean;
  materialGroup?: BoqMaterialGroupFilter;
  issuedByUserId?: string;
  receiverName?: string;
  receiverSignatureDataUrl?: string;
  deviceInfo?: string;
}

export interface CreateBoqIssueVoucherInput {
  prodOrderId: string;
  orderNumber?: string;
  jobCardNumber?: string;
  customerName?: string;
  doorIds: string[];
  doorNumbers?: string[];
  doorsMeta?: BoqDoorInputMeta[];
  items: BoqIssueVoucherItem[];
  shift?: BoqIssueShift;
  gangName?: string;
  issuedBy?: string;
  issuedByUserId?: string;
  issueDate?: string;
  bufferPercent?: number;
  notes?: string;
  consolidatedBatchNumber?: string;
  isConsolidatedBatch?: boolean;
  source?: BoqIssueSource;
  formulaLocked?: boolean;
  materialGroup?: BoqMaterialGroupFilter;
  receiverName?: string;
  receiverSignatureDataUrl?: string;
  deviceInfo?: string;
}

export interface ConsolidatedBatchPartyEntryInput {
  prodOrderId: string;
  orderNumber?: string;
  jobCardNumber?: string;
  customerName?: string;
  doorIds: string[];
  doorNumbers?: string[];
  doorsMeta?: BoqDoorInputMeta[];
  selectedSqFt?: number;
}

export interface CreateConsolidatedBoqBatchInput {
  entries: ConsolidatedBatchPartyEntryInput[];
  items: BoqIssueVoucherItem[];
  shift?: BoqIssueShift;
  gangName?: string;
  issuedBy?: string;
  issuedByUserId?: string;
  issueDate?: string;
  bufferPercent?: number;
  notes?: string;
  source?: BoqIssueSource;
  formulaLocked?: boolean;
  materialGroup?: BoqMaterialGroupFilter;
  receiverName?: string;
  receiverSignatureDataUrl?: string;
  deviceInfo?: string;
}

export interface ConsolidatedBoqBatchSummary {
  batchNumber: string;
  issuedAt: string;
  issueDate: string;
  shift: BoqIssueShift;
  gangName: string;
  issuedBy: string;
  partiesCount: number;
  totalDoors: number;
  totalValue: number;
  bufferPercent: number;
  notes?: string;
  items: BoqIssueVoucherItem[];
  partyBreakdowns: Array<{
    voucherId: string;
    voucherNumber: string;
    prodOrderId: string;
    orderNumber: string;
    jobCardNumber: string;
    customerName: string;
    doorsCount: number;
    doorIds: string[];
    doorNumbers: string[];
    value: number;
  }>;
}

export interface BoqMaterialTotals {
  resinKg: number;
  gelKg: number;
  catalystGrams: number;
  acceleratorGrams: number;
  csm300Kg: number;
  pigmentGrams: number;
  woodCuFt: number;
  foamSheets: number;
  otherValue: number;
}

export interface BoqDoorReportRow extends BoqMaterialTotals {
  key: string;
  prodOrderId: string;
  orderNumber: string;
  jobCardNumber: string;
  customerName: string;
  doorId: string;
  doorNumber: string;
  widthCm: number;
  heightCm: number;
  sqFt: number;
  voucherId: string;
  voucherNumber: string;
  batchNumber: string | null;
  issueType: 'CONSOLIDATED_BATCH' | 'SINGLE_ORDER';
  issueDate: string;
  issuedAt: string;
  shift: BoqIssueShift;
  gangName: string;
  totalValue: number;
}

export interface BoqOrderReportRow extends BoqMaterialTotals {
  prodOrderId: string;
  orderNumber: string;
  jobCardNumber: string;
  customerName: string;
  totalDoors: number;
  issuedDoors: number;
  balanceDoors: number;
  status: 'FULLY_ISSUED' | 'PARTIAL' | 'PENDING';
  vouchersCount: number;
  batchNumbers: string[];
  lastIssuedDate: string;
  totalValue: number;
  avgCostPerDoor: number;
}

export interface BoqBatchReportRow extends BoqMaterialTotals {
  batchKey: string;
  referenceNumber: string;
  issueType: 'CONSOLIDATED_BATCH' | 'SINGLE_ORDER';
  issueDate: string;
  issuedAt: string;
  shift: BoqIssueShift;
  gangName: string;
  issuedBy: string;
  partiesCount: number;
  partySummary: string;
  doorsCount: number;
  totalValue: number;
  avgCostPerDoor: number;
  voucherIds: string[];
}

export interface BoqIssuedReportResult {
  summary: BoqMaterialTotals & {
    totalDoorsIssued: number;
    totalOrdersWithIssues: number;
    totalBatchesCount: number;
    totalIssuedValue: number;
    avgCostPerDoor: number;
  };
  doorWise: BoqDoorReportRow[];
  orderWise: BoqOrderReportRow[];
  batchWise: BoqBatchReportRow[];
}

export interface BoqIssuedReportFilters {
  fromDate?: string;
  toDate?: string;
  shift?: string;
  prodOrderId?: string;
  search?: string;
}

const BOQ_ISSUE_LOG_FILE = 'boq-issue-log.json';

function readStore(): BoqIssueVoucherRecord[] {
  const filePath = getDataFilePath(BOQ_ISSUE_LOG_FILE);
  if (!fs.existsSync(filePath)) {
    writeJsonSafe(filePath, []);
    return [];
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeStore(records: BoqIssueVoucherRecord[]): void {
  const filePath = getDataFilePath(BOQ_ISSUE_LOG_FILE);
  writeJsonSafe(filePath, records);
}

function normalizeShift(shift?: string): BoqIssueShift {
  const up = (shift || '').toUpperCase();
  if (up === 'AFTERNOON' || up === 'EVENING') return up;
  return 'MORNING';
}

function sanitizeItems(items: BoqIssueVoucherItem[]): BoqIssueVoucherItem[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const issuedQty = Math.max(0, Number(item.issuedQty) || 0);
      const formulaQty = Math.max(0, Number(item.formulaQty) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      const computedValue =
        Number.isFinite(Number(item.value)) && Number(item.value) >= 0
          ? Math.round(Number(item.value))
          : Math.round(issuedQty * rate);
      return {
        key: String(item.key || item.name || 'item'),
        name: String(item.name || item.key || 'Material'),
        unit: String(item.unit || 'Unit'),
        formulaQty,
        issuedQty,
        rate,
        value: computedValue,
        category: String(item.category || 'Material'),
      };
    })
    .filter((item) => item.issuedQty > 0 || item.value > 0);
}

function getNextVoucherSeq(all: BoqIssueVoucherRecord[], year: number): number {
  const prefix = `BOQ-ISS-${year}-`;
  let maxSeq = 0;
  for (const row of all) {
    if (row.voucherNumber && row.voucherNumber.startsWith(prefix)) {
      const parsed = parseInt(row.voucherNumber.slice(prefix.length), 10);
      if (Number.isFinite(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }
  return maxSeq + 1;
}

export function allocateItemsToDoors(
  doorsMeta: BoqDoorInputMeta[],
  items: BoqIssueVoucherItem[]
): BoqDoorAllocation[] {
  if (!doorsMeta || doorsMeta.length === 0) return [];
  const normalized = doorsMeta.map((d, idx) => {
    const widthCm = Number(d.widthCm) > 0 ? Number(d.widthCm) : 80;
    const heightCm = Number(d.heightCm) > 0 ? Number(d.heightCm) : 210;
    const sqFt =
      Number(d.sqFt) > 0 ? Number(d.sqFt) : Number(((widthCm * heightCm) / 929.0304).toFixed(2));
    return {
      doorId: d.doorId || d.doorNumber || `door-${idx + 1}`,
      doorNumber: d.doorNumber || d.doorId || `D-${idx + 1}`,
      widthCm,
      heightCm,
      sqFt,
    };
  });

  const totalSqFt = normalized.reduce((s, d) => s + d.sqFt, 0) || normalized.length;
  const perDoorItems: BoqDoorAllocationItem[][] = normalized.map(() => []);

  for (const item of items) {
    let usedVal = 0;
    let usedQty = 0;

    normalized.forEach((door, idx) => {
      const isLast = idx === normalized.length - 1;
      const share = door.sqFt / totalSqFt;
      const val = isLast ? Math.max(0, item.value - usedVal) : Math.round(item.value * share);
      const qty = isLast
        ? Math.max(0, Number((item.issuedQty - usedQty).toFixed(4)))
        : Number((item.issuedQty * share).toFixed(4));
      usedVal += val;
      usedQty = Number((usedQty + qty).toFixed(4));

      perDoorItems[idx].push({
        key: item.key,
        name: item.name,
        unit: item.unit,
        qty,
        value: val,
        category: item.category,
      });
    });
  }

  return normalized.map((door, idx) => {
    const allocatedItems = perDoorItems[idx];
    const allocatedValue = Math.round(
      allocatedItems.reduce((sum, it) => sum + (Number(it.value) || 0), 0)
    );
    return {
      ...door,
      allocatedValue,
      items: allocatedItems,
    };
  });
}

export function findAlreadyIssuedDoorsInVouchers(
  prodOrderId: string,
  doorIds: string[]
): Array<{
  doorId: string;
  doorNumber: string;
  voucherNumber: string;
  consolidatedBatchNumber?: string;
  issuedAt: string;
}> {
  if (!prodOrderId || !doorIds || doorIds.length === 0) return [];
  const requestedSet = new Set(doorIds.filter(Boolean));
  const vouchers = listBoqIssueVouchers(prodOrderId);
  const conflicts: Array<{
    doorId: string;
    doorNumber: string;
    voucherNumber: string;
    consolidatedBatchNumber?: string;
    issuedAt: string;
  }> = [];

  for (const v of vouchers) {
    v.doorIds.forEach((did, idx) => {
      const dNum = v.doorNumbers[idx] || did;
      if (requestedSet.has(did) || requestedSet.has(dNum)) {
        conflicts.push({
          doorId: did,
          doorNumber: dNum,
          voucherNumber: v.voucherNumber,
          consolidatedBatchNumber: v.consolidatedBatchNumber,
          issuedAt: v.issuedAt,
        });
      }
    });
  }
  return conflicts;
}

export function generateConsolidatedBatchNumber(existing?: BoqIssueVoucherRecord[]): string {
  const all = existing || readStore();
  const year = new Date().getFullYear();
  const prefix = `BOQ-BATCH-${year}-`;
  let maxSeq = 0;
  for (const row of all) {
    if (row.consolidatedBatchNumber && row.consolidatedBatchNumber.startsWith(prefix)) {
      const parsed = parseInt(row.consolidatedBatchNumber.slice(prefix.length), 10);
      if (Number.isFinite(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function listBoqIssueVouchers(prodOrderId?: string): BoqIssueVoucherRecord[] {
  const all = readStore();
  const filtered = prodOrderId
    ? all.filter(
        (v) =>
          v.prodOrderId === prodOrderId ||
          v.orderNumber === prodOrderId ||
          v.jobCardNumber === prodOrderId
      )
    : all;
  return filtered.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
}

export function listConsolidatedBatchSummaries(): ConsolidatedBoqBatchSummary[] {
  const all = readStore();
  const map = new Map<string, BoqIssueVoucherRecord[]>();

  for (const v of all) {
    if (!v.consolidatedBatchNumber) continue;
    const list = map.get(v.consolidatedBatchNumber) || [];
    list.push(v);
    map.set(v.consolidatedBatchNumber, list);
  }

  const summaries: ConsolidatedBoqBatchSummary[] = [];
  for (const [batchNumber, vouchers] of map.entries()) {
    const first = vouchers[0];
    const itemMap = new Map<string, BoqIssueVoucherItem>();
    for (const v of vouchers) {
      for (const it of v.items || []) {
        const prev = itemMap.get(it.key);
        if (prev) {
          prev.formulaQty = Number((prev.formulaQty + it.formulaQty).toFixed(3));
          prev.issuedQty = Number((prev.issuedQty + it.issuedQty).toFixed(3));
          prev.value = Math.round(prev.value + it.value);
        } else {
          itemMap.set(it.key, { ...it });
        }
      }
    }

    summaries.push({
      batchNumber,
      issuedAt: first.issuedAt,
      issueDate: first.issueDate,
      shift: first.shift,
      gangName: first.gangName,
      issuedBy: first.issuedBy,
      partiesCount: vouchers.length,
      totalDoors: vouchers.reduce((s, v) => s + (v.doorsCount || 0), 0),
      totalValue: Math.round(vouchers.reduce((s, v) => s + (Number(v.totalIssuedValue) || 0), 0)),
      bufferPercent: first.bufferPercent || 0,
      notes: first.notes,
      items: Array.from(itemMap.values()),
      partyBreakdowns: vouchers.map((v) => ({
        voucherId: v.id,
        voucherNumber: v.voucherNumber,
        prodOrderId: v.prodOrderId,
        orderNumber: v.orderNumber,
        jobCardNumber: v.jobCardNumber,
        customerName: v.customerName,
        doorsCount: v.doorsCount,
        doorIds: v.doorIds,
        doorNumbers: v.doorNumbers,
        value: Math.round(v.totalIssuedValue || 0),
      })),
    });
  }

  return summaries.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
}

export function getBoqIssueVoucherById(id: string): BoqIssueVoucherRecord | null {
  const all = readStore();
  return all.find((v) => v.id === id || v.voucherNumber === id) || null;
}

export function getOrderIssuedValueSummary(prodOrderId: string): {
  vouchersCount: number;
  totalIssuedValue: number;
  totalDoorsIssuedInVouchers: number;
} {
  const list = listBoqIssueVouchers(prodOrderId);
  return {
    vouchersCount: list.length,
    totalIssuedValue: Math.round(
      list.reduce((sum, v) => sum + (Number(v.totalIssuedValue) || 0), 0)
    ),
    totalDoorsIssuedInVouchers: list.reduce((sum, v) => sum + (Number(v.doorsCount) || 0), 0),
  };
}

export function createBoqIssueVoucher(input: CreateBoqIssueVoucherInput): BoqIssueVoucherRecord {
  const all = readStore();
  const now = new Date();
  const year = now.getFullYear();
  const nextSeq = getNextVoucherSeq(all, year);
  const voucherNumber = `BOQ-ISS-${year}-${String(nextSeq).padStart(4, '0')}`;

  const cleanItems = sanitizeItems(input.items);
  const totalIssuedValue = Math.round(
    cleanItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  );

  const doorIds = Array.from(
    new Set((Array.isArray(input.doorIds) ? input.doorIds : []).filter(Boolean))
  );
  const doorNumbers = Array.isArray(input.doorNumbers) ? input.doorNumbers.filter(Boolean) : [];
  const doorsMeta: BoqDoorInputMeta[] =
    Array.isArray(input.doorsMeta) && input.doorsMeta.length > 0
      ? input.doorsMeta
      : doorIds.map((did, idx) => ({
          doorId: did,
          doorNumber: doorNumbers[idx] || did,
          widthCm: 80,
          heightCm: 210,
        }));
  const doorAllocations = allocateItemsToDoors(doorsMeta, cleanItems);

  const record: BoqIssueVoucherRecord = {
    id: `BOQISS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    voucherNumber,
    consolidatedBatchNumber: input.consolidatedBatchNumber,
    isConsolidatedBatch: Boolean(input.isConsolidatedBatch || input.consolidatedBatchNumber),
    issuedAt: now.toISOString(),
    issueDate: input.issueDate || now.toISOString().slice(0, 10),
    shift: normalizeShift(input.shift),
    gangName: (input.gangName || '').trim() || 'Production Floor Team',
    issuedBy: (input.issuedBy || '').trim() || 'Storekeeper',
    prodOrderId: input.prodOrderId,
    orderNumber: input.orderNumber || input.prodOrderId,
    jobCardNumber: input.jobCardNumber || input.prodOrderId,
    customerName: input.customerName || 'Party Order',
    doorIds,
    doorNumbers: doorNumbers.length > 0 ? doorNumbers : doorIds,
    doorsCount: doorIds.length,
    items: cleanItems,
    doorAllocations,
    totalIssuedValue,
    bufferPercent: Math.max(0, Number(input.bufferPercent) || 0),
    notes: input.notes?.trim() || undefined,
    source: input.source || 'DESKTOP',
    formulaLocked: Boolean(input.formulaLocked),
    materialGroup: input.materialGroup || 'ALL',
    issuedByUserId: input.issuedByUserId,
    receiverName: input.receiverName?.trim() || undefined,
    receiverSignatureDataUrl: input.receiverSignatureDataUrl || undefined,
    deviceInfo: input.deviceInfo?.trim() || undefined,
  };

  all.push(record);
  writeStore(all);
  return record;
}

export function createConsolidatedBoqBatchVouchers(
  input: CreateConsolidatedBoqBatchInput
): {
  consolidatedBatchNumber: string;
  vouchers: BoqIssueVoucherRecord[];
  totalBatchValue: number;
} {
  const validEntries = (input.entries || []).filter(
    (e) => e.prodOrderId && Array.isArray(e.doorIds) && e.doorIds.length > 0
  );
  if (validEntries.length === 0) {
    throw new Error('At least one party with selected doors is required for consolidated BOQ issue.');
  }

  const all = readStore();
  const now = new Date();
  const year = now.getFullYear();
  let nextSeq = getNextVoucherSeq(all, year);
  const consolidatedBatchNumber = generateConsolidatedBatchNumber(all);

  const cleanItems = sanitizeItems(input.items);
  const totalBatchValue = Math.round(
    cleanItems.reduce((sum, it) => sum + (Number(it.value) || 0), 0)
  );

  const weights = validEntries.map((e) =>
    Number(e.selectedSqFt) > 0 ? Number(e.selectedSqFt) : e.doorIds.length
  );
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;

  const perEntryItems: BoqIssueVoucherItem[][] = validEntries.map(() => []);
  for (const item of cleanItems) {
    let allocatedValue = 0;
    let allocatedIssuedQty = 0;
    let allocatedFormulaQty = 0;

    validEntries.forEach((_, idx) => {
      const isLast = idx === validEntries.length - 1;
      const share = weights[idx] / totalWeight;
      const entryValue = isLast
        ? Math.max(0, item.value - allocatedValue)
        : Math.round(item.value * share);
      const entryIssuedQty = isLast
        ? Math.max(0, Number((item.issuedQty - allocatedIssuedQty).toFixed(3)))
        : Number((item.issuedQty * share).toFixed(3));
      const entryFormulaQty = isLast
        ? Math.max(0, Number((item.formulaQty - allocatedFormulaQty).toFixed(3)))
        : Number((item.formulaQty * share).toFixed(3));

      allocatedValue += entryValue;
      allocatedIssuedQty = Number((allocatedIssuedQty + entryIssuedQty).toFixed(3));
      allocatedFormulaQty = Number((allocatedFormulaQty + entryFormulaQty).toFixed(3));

      perEntryItems[idx].push({
        ...item,
        formulaQty: entryFormulaQty,
        issuedQty: entryIssuedQty,
        value: entryValue,
      });
    });
  }

  const createdVouchers: BoqIssueVoucherRecord[] = validEntries.map((entry, idx) => {
    const voucherNumber = `BOQ-ISS-${year}-${String(nextSeq++).padStart(4, '0')}`;
    const entryItems = perEntryItems[idx];
    const entryValue = Math.round(
      entryItems.reduce((sum, it) => sum + (Number(it.value) || 0), 0)
    );
    const doorIds = Array.from(new Set(entry.doorIds.filter(Boolean)));
    const doorNumbers =
      Array.isArray(entry.doorNumbers) && entry.doorNumbers.length > 0
        ? entry.doorNumbers.filter(Boolean)
        : doorIds;
    const doorsMeta: BoqDoorInputMeta[] =
      Array.isArray(entry.doorsMeta) && entry.doorsMeta.length > 0
        ? entry.doorsMeta
        : doorIds.map((did, dIdx) => ({
            doorId: did,
            doorNumber: doorNumbers[dIdx] || did,
            widthCm: 80,
            heightCm: 210,
          }));
    const doorAllocations = allocateItemsToDoors(doorsMeta, entryItems);

    const record: BoqIssueVoucherRecord = {
      id: `BOQISS-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      voucherNumber,
      consolidatedBatchNumber,
      isConsolidatedBatch: true,
      issuedAt: now.toISOString(),
      issueDate: input.issueDate || now.toISOString().slice(0, 10),
      shift: normalizeShift(input.shift),
      gangName: (input.gangName || '').trim() || 'Production Floor Team',
      issuedBy: (input.issuedBy || '').trim() || 'Storekeeper',
      prodOrderId: entry.prodOrderId,
      orderNumber: entry.orderNumber || entry.prodOrderId,
      jobCardNumber: entry.jobCardNumber || entry.prodOrderId,
      customerName: entry.customerName || 'Party Order',
      doorIds,
      doorNumbers,
      doorsCount: doorIds.length,
      items: entryItems,
      doorAllocations,
      totalIssuedValue: entryValue,
      bufferPercent: Math.max(0, Number(input.bufferPercent) || 0),
      notes: input.notes?.trim() || undefined,
      source: input.source || 'DESKTOP',
      formulaLocked: Boolean(input.formulaLocked),
      materialGroup: input.materialGroup || 'ALL',
      issuedByUserId: input.issuedByUserId,
      receiverName: input.receiverName?.trim() || undefined,
      receiverSignatureDataUrl: input.receiverSignatureDataUrl || undefined,
      deviceInfo: input.deviceInfo?.trim() || undefined,
    };
    all.push(record);
    return record;
  });

  writeStore(all);

  return {
    consolidatedBatchNumber,
    vouchers: createdVouchers,
    totalBatchValue,
  };
}

export function deleteBoqIssueVoucher(id: string): BoqIssueVoucherRecord | null {
  const all = readStore();
  const idx = all.findIndex((v) => v.id === id || v.voucherNumber === id);
  if (idx === -1) return null;
  const [removed] = all.splice(idx, 1);
  writeStore(all);
  return removed;
}

export function deleteConsolidatedBatchVouchers(batchNumber: string): BoqIssueVoucherRecord[] {
  const all = readStore();
  const removed = all.filter((v) => v.consolidatedBatchNumber === batchNumber);
  if (removed.length === 0) return [];
  const remaining = all.filter((v) => v.consolidatedBatchNumber !== batchNumber);
  writeStore(remaining);
  return removed;
}

// ── DOOR-WISE / ORDER-WISE / BATCH-WISE REPORT ENGINE ─────────────────────────

function emptyMaterials(): BoqMaterialTotals {
  return {
    resinKg: 0,
    gelKg: 0,
    catalystGrams: 0,
    acceleratorGrams: 0,
    csm300Kg: 0,
    pigmentGrams: 0,
    woodCuFt: 0,
    foamSheets: 0,
    otherValue: 0,
  };
}

function addItemToMaterialTotals(
  target: BoqMaterialTotals,
  item: { key: string; qty: number; value: number }
): void {
  const k = (item.key || '').toLowerCase();
  if (k === 'resin') {
    target.resinKg = Number((target.resinKg + item.qty).toFixed(3));
  } else if (k === 'gel') {
    target.gelKg = Number((target.gelKg + item.qty).toFixed(3));
  } else if (k === 'catalystgrams') {
    target.catalystGrams = Number((target.catalystGrams + item.qty).toFixed(1));
  } else if (k === 'acceleratorgrams') {
    target.acceleratorGrams = Number((target.acceleratorGrams + item.qty).toFixed(1));
  } else if (k === 'csm300') {
    target.csm300Kg = Number((target.csm300Kg + item.qty).toFixed(3));
  } else if (k.startsWith('pigment_')) {
    target.pigmentGrams = Number((target.pigmentGrams + item.qty).toFixed(1));
  } else if (k === 'timber') {
    target.woodCuFt = Number((target.woodCuFt + item.qty).toFixed(4));
  } else if (k === 'foam') {
    target.foamSheets = Number((target.foamSheets + item.qty).toFixed(3));
  } else {
    target.otherValue = Math.round(target.otherValue + item.value);
  }
}

function mergeMaterialTotals(target: BoqMaterialTotals, src: BoqMaterialTotals): void {
  target.resinKg = Number((target.resinKg + src.resinKg).toFixed(3));
  target.gelKg = Number((target.gelKg + src.gelKg).toFixed(3));
  target.catalystGrams = Number((target.catalystGrams + src.catalystGrams).toFixed(1));
  target.acceleratorGrams = Number((target.acceleratorGrams + src.acceleratorGrams).toFixed(1));
  target.csm300Kg = Number((target.csm300Kg + src.csm300Kg).toFixed(3));
  target.pigmentGrams = Number((target.pigmentGrams + src.pigmentGrams).toFixed(1));
  target.woodCuFt = Number((target.woodCuFt + src.woodCuFt).toFixed(4));
  target.foamSheets = Number((target.foamSheets + src.foamSheets).toFixed(3));
  target.otherValue = Math.round(target.otherValue + src.otherValue);
}

export function buildBoqIssuedReport(
  orders: ProductionOrder[],
  filters: BoqIssuedReportFilters = {}
): BoqIssuedReportResult {
  const allVouchers = listBoqIssueVouchers();
  const orderById = new Map<string, ProductionOrder>();
  for (const o of orders) {
    orderById.set(o.id, o);
    if (o.jobCardNumber) orderById.set(o.jobCardNumber, o);
    if (o.prodOrderNumber) orderById.set(o.prodOrderNumber, o);
    if (o.salesOrderId) orderById.set(o.salesOrderId, o);
  }

  const fromDate = (filters.fromDate || '').trim();
  const toDate = (filters.toDate || '').trim();
  const shiftFilter = (filters.shift || 'ALL').toUpperCase();
  const orderFilter = (filters.prodOrderId || '').trim();
  const search = (filters.search || '').trim().toLowerCase();

  const filteredVouchers = allVouchers.filter((v) => {
    if (fromDate && v.issueDate < fromDate) return false;
    if (toDate && v.issueDate > toDate) return false;
    if (shiftFilter && shiftFilter !== 'ALL' && v.shift !== shiftFilter) return false;
    if (
      orderFilter &&
      v.prodOrderId !== orderFilter &&
      v.orderNumber !== orderFilter &&
      v.jobCardNumber !== orderFilter
    ) {
      return false;
    }
    if (search) {
      const hay = [
        v.voucherNumber,
        v.consolidatedBatchNumber || '',
        v.jobCardNumber,
        v.orderNumber,
        v.customerName,
        v.gangName,
        ...v.doorNumbers,
        ...v.doorIds,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // 1. DOOR-WISE ROWS
  const doorWise: BoqDoorReportRow[] = [];
  for (const v of filteredVouchers) {
    const prodOrder = orderById.get(v.prodOrderId) || orderById.get(v.jobCardNumber);
    let allocations = v.doorAllocations;
    if (!allocations || allocations.length === 0) {
      const doorsMeta: BoqDoorInputMeta[] = v.doorIds.map((did, idx) => {
        const dNum = v.doorNumbers[idx] || did;
        const matched = prodOrder?.doors?.find(
          (d) => d.id === did || d.doorId === did || d.doorNumber === dNum
        );
        const widthCm =
          matched?.rawWidthTopCm && matched.rawWidthTopCm > 0
            ? matched.rawWidthTopCm
            : matched?.finishedWidthMm && matched.finishedWidthMm > 0
            ? matched.finishedWidthMm / 10
            : 80;
        const heightCm =
          matched?.rawHeightCm && matched.rawHeightCm > 0
            ? matched.rawHeightCm
            : matched?.finishedHeightMm && matched.finishedHeightMm > 0
            ? matched.finishedHeightMm / 10
            : 210;
        return {
          doorId: did,
          doorNumber: matched?.doorNumber || dNum,
          widthCm,
          heightCm,
        };
      });
      allocations = allocateItemsToDoors(doorsMeta, v.items || []);
    }

    for (const alloc of allocations) {
      const mats = emptyMaterials();
      for (const it of alloc.items || []) {
        addItemToMaterialTotals(mats, { key: it.key, qty: it.qty, value: it.value });
      }
      doorWise.push({
        key: `${v.id}::${alloc.doorId}`,
        prodOrderId: v.prodOrderId,
        orderNumber: v.orderNumber,
        jobCardNumber: v.jobCardNumber,
        customerName: v.customerName,
        doorId: alloc.doorId,
        doorNumber: alloc.doorNumber,
        widthCm: alloc.widthCm,
        heightCm: alloc.heightCm,
        sqFt: alloc.sqFt,
        voucherId: v.id,
        voucherNumber: v.voucherNumber,
        batchNumber: v.consolidatedBatchNumber || null,
        issueType: v.consolidatedBatchNumber ? 'CONSOLIDATED_BATCH' : 'SINGLE_ORDER',
        issueDate: v.issueDate,
        issuedAt: v.issuedAt,
        shift: v.shift,
        gangName: v.gangName,
        totalValue: alloc.allocatedValue,
        ...mats,
      });
    }
  }

  // 2. ORDER-WISE ROWS
  const orderMap = new Map<
    string,
    {
      row: BoqOrderReportRow;
      issuedDoorKeys: Set<string>;
      batchSet: Set<string>;
    }
  >();

  for (const dRow of doorWise) {
    let entry = orderMap.get(dRow.prodOrderId);
    if (!entry) {
      const prodOrder = orderById.get(dRow.prodOrderId) || orderById.get(dRow.jobCardNumber);
      const totalDoors = prodOrder?.doors?.length || 0;
      entry = {
        row: {
          prodOrderId: dRow.prodOrderId,
          orderNumber: dRow.orderNumber,
          jobCardNumber: dRow.jobCardNumber,
          customerName: dRow.customerName,
          totalDoors,
          issuedDoors: 0,
          balanceDoors: totalDoors,
          status: 'PARTIAL',
          vouchersCount: 0,
          batchNumbers: [],
          lastIssuedDate: dRow.issueDate,
          totalValue: 0,
          avgCostPerDoor: 0,
          ...emptyMaterials(),
        },
        issuedDoorKeys: new Set<string>(),
        batchSet: new Set<string>(),
      };
      orderMap.set(dRow.prodOrderId, entry);
    }

    entry.issuedDoorKeys.add(dRow.doorId);
    entry.batchSet.add(dRow.batchNumber || dRow.voucherNumber);
    if (dRow.issueDate > entry.row.lastIssuedDate) {
      entry.row.lastIssuedDate = dRow.issueDate;
    }
    entry.row.totalValue = Math.round(entry.row.totalValue + dRow.totalValue);
    mergeMaterialTotals(entry.row, dRow);
  }

  const orderWise: BoqOrderReportRow[] = Array.from(orderMap.values())
    .map(({ row, issuedDoorKeys, batchSet }) => {
      const issuedDoors = issuedDoorKeys.size;
      const totalDoors = Math.max(row.totalDoors, issuedDoors);
      const balanceDoors = Math.max(0, totalDoors - issuedDoors);
      const status: BoqOrderReportRow['status'] =
        balanceDoors === 0 ? 'FULLY_ISSUED' : issuedDoors > 0 ? 'PARTIAL' : 'PENDING';
      return {
        ...row,
        totalDoors,
        issuedDoors,
        balanceDoors,
        status,
        vouchersCount: batchSet.size,
        batchNumbers: Array.from(batchSet),
        avgCostPerDoor: issuedDoors > 0 ? Math.round(row.totalValue / issuedDoors) : 0,
      };
    })
    .sort((a, b) => (b.lastIssuedDate || '').localeCompare(a.lastIssuedDate || ''));

  // 3. BATCH-WISE ROWS (Consolidated Batches grouped by batchNumber, Single Orders by voucherNumber)
  const batchMap = new Map<
    string,
    {
      row: BoqBatchReportRow;
      partyCounts: Map<string, number>;
      voucherSet: Set<string>;
    }
  >();

  for (const v of filteredVouchers) {
    const batchKey = v.consolidatedBatchNumber || v.voucherNumber;
    let entry = batchMap.get(batchKey);
    if (!entry) {
      entry = {
        row: {
          batchKey,
          referenceNumber: batchKey,
          issueType: v.consolidatedBatchNumber ? 'CONSOLIDATED_BATCH' : 'SINGLE_ORDER',
          issueDate: v.issueDate,
          issuedAt: v.issuedAt,
          shift: v.shift,
          gangName: v.gangName,
          issuedBy: v.issuedBy,
          partiesCount: 0,
          partySummary: '',
          doorsCount: 0,
          totalValue: 0,
          avgCostPerDoor: 0,
          voucherIds: [],
          ...emptyMaterials(),
        },
        partyCounts: new Map<string, number>(),
        voucherSet: new Set<string>(),
      };
      batchMap.set(batchKey, entry);
    }

    entry.voucherSet.add(v.id);
    const shortParty = (v.customerName || 'Party').split('(')[0].trim();
    entry.partyCounts.set(shortParty, (entry.partyCounts.get(shortParty) || 0) + (v.doorsCount || 0));
    entry.row.doorsCount += v.doorsCount || 0;
    entry.row.totalValue = Math.round(entry.row.totalValue + (Number(v.totalIssuedValue) || 0));
    for (const it of v.items || []) {
      addItemToMaterialTotals(entry.row, { key: it.key, qty: it.issuedQty, value: it.value });
    }
  }

  const batchWise: BoqBatchReportRow[] = Array.from(batchMap.values())
    .map(({ row, partyCounts, voucherSet }) => ({
      ...row,
      partiesCount: partyCounts.size,
      partySummary: Array.from(partyCounts.entries())
        .map(([name, cnt]) => `${name} (${cnt})`)
        .join(' • '),
      avgCostPerDoor: row.doorsCount > 0 ? Math.round(row.totalValue / row.doorsCount) : 0,
      voucherIds: Array.from(voucherSet),
    }))
    .sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));

  // 4. OVERALL SUMMARY
  const summaryMats = emptyMaterials();
  for (const d of doorWise) {
    mergeMaterialTotals(summaryMats, d);
  }
  const totalIssuedValue = Math.round(doorWise.reduce((s, d) => s + d.totalValue, 0));
  const totalDoorsIssued = doorWise.length;

  return {
    summary: {
      ...summaryMats,
      totalDoorsIssued,
      totalOrdersWithIssues: orderWise.length,
      totalBatchesCount: batchWise.length,
      totalIssuedValue,
      avgCostPerDoor: totalDoorsIssued > 0 ? Math.round(totalIssuedValue / totalDoorsIssued) : 0,
    },
    doorWise,
    orderWise,
    batchWise,
  };
}

/**
 * Authoritative Server-Side Formula BOQ Calculator for tamper-proof Android Storekeeper mode.
 * Computes exact material quantities & ₹ valuation directly from live factory rates & door dimensions,
 * completely ignoring any client-submitted prices, quantities, or buffers.
 */
export function computeServerFormulaBoqItems(
  doors: BoqDoorInput[],
  framesCatalog: CustomFrameProfile[],
  ratesConfig: BoqMaterialRatesConfig,
  materialGroup: BoqMaterialGroupFilter = 'ALL'
): BoqIssueVoucherItem[] {
  if (!doors || doors.length === 0) return [];
  const boq = calculateDoorBatchBoq(doors, framesCatalog, ratesConfig);
  const items: BoqIssueVoucherItem[] = [];

  const includeChemicals = materialGroup === 'ALL' || materialGroup === 'CHEMICALS';
  const includeWoodFoam = materialGroup === 'ALL' || materialGroup === 'WOOD_FOAM';
  const includeHardware = materialGroup === 'ALL' || materialGroup === 'HARDWARE';

  if (includeChemicals) {
    if (boq.resinKg > 0) {
      items.push({
        key: 'resin',
        name: 'FRP Polyester Resin',
        unit: 'Kg',
        formulaQty: Number(boq.resinKg.toFixed(2)),
        issuedQty: Number(boq.resinKg.toFixed(2)),
        rate: ratesConfig.resinRatePerKg,
        value: Math.round(boq.resinKg * ratesConfig.resinRatePerKg),
        category: 'Chemical',
      });
    }
    if (boq.gelKg > 0) {
      items.push({
        key: 'gel',
        name: 'Gelcoat (GEL Surface Layer)',
        unit: 'Kg',
        formulaQty: Number(boq.gelKg.toFixed(2)),
        issuedQty: Number(boq.gelKg.toFixed(2)),
        rate: ratesConfig.gelRatePerKg,
        value: Math.round(boq.gelKg * ratesConfig.gelRatePerKg),
        category: 'Chemical',
      });
    }
    if (boq.catalystGrams > 0) {
      items.push({
        key: 'catalystGrams',
        name: 'Catalyst (MEKP Hardener)',
        unit: 'gm',
        formulaQty: Math.round(boq.catalystGrams),
        issuedQty: Math.round(boq.catalystGrams),
        rate: ratesConfig.catalystRatePerKg / 1000,
        value: Math.round((boq.catalystGrams / 1000) * ratesConfig.catalystRatePerKg),
        category: 'Catalyst',
      });
    }
    if (boq.acceleratorGrams > 0) {
      items.push({
        key: 'acceleratorGrams',
        name: 'Accelerator (Cobalt Solution)',
        unit: 'gm',
        formulaQty: Math.round(boq.acceleratorGrams),
        issuedQty: Math.round(boq.acceleratorGrams),
        rate: ratesConfig.acceleratorRatePerKg / 1000,
        value: Math.round((boq.acceleratorGrams / 1000) * ratesConfig.acceleratorRatePerKg),
        category: 'Accelerator',
      });
    }
    if (boq.csm300Kg > 0) {
      items.push({
        key: 'csm300',
        name: 'Chopped Strand Mat (300 GSM)',
        unit: 'Kg',
        formulaQty: Number(boq.csm300Kg.toFixed(2)),
        issuedQty: Number(boq.csm300Kg.toFixed(2)),
        rate: ratesConfig.csm300RatePerKg,
        value: Math.round(boq.csm300Kg * ratesConfig.csm300RatePerKg),
        category: '300 GSM',
      });
    }
    for (const pig of boq.pigmentByColour || []) {
      const qtyG = Math.round(pig.pigmentGrams);
      if (qtyG > 0) {
        items.push({
          key: `pigment_${pig.matchedRateKey || pig.colourLabel}`,
          name: `Pigment Paste — ${pig.colourLabel}`,
          unit: 'gm',
          formulaQty: qtyG,
          issuedQty: qtyG,
          rate: pig.ratePerKg / 1000,
          value: Math.round((qtyG / 1000) * pig.ratePerKg),
          category: 'Pigment',
        });
      }
    }
  }

  if (includeWoodFoam) {
    if (boq.totalWoodCuFt > 0) {
      items.push({
        key: 'timber',
        name: 'Timber Reepers (Frame + Shutter Wood)',
        unit: 'Cu.Ft',
        formulaQty: Number(boq.totalWoodCuFt.toFixed(4)),
        issuedQty: Number(boq.totalWoodCuFt.toFixed(4)),
        rate: ratesConfig.woodRatePerCuFt,
        value: Math.round(boq.totalWoodCuFt * ratesConfig.woodRatePerCuFt),
        category: 'Timber Wood',
      });
    }
    if (boq.foamSheetsExact > 0) {
      items.push({
        key: 'foam',
        name: `Rigid Foam Sheet (${ratesConfig.foamSheet.widthCm}×${ratesConfig.foamSheet.heightCm} cm)`,
        unit: 'Sheets',
        formulaQty: Number(boq.foamSheetsExact.toFixed(2)),
        issuedQty: Number(boq.foamSheetsExact.toFixed(2)),
        rate: ratesConfig.foamSheet.costPerSheet,
        value: Math.round(boq.foamSheetsExact * ratesConfig.foamSheet.costPerSheet),
        category: 'Rigid Foam',
      });
    }
  }

  if (includeHardware) {
    for (const lb of boq.lockBoxBreakdown || []) {
      if (lb.isNoHardware || lb.doorsCount <= 0) continue;
      items.push({
        key: `lock_${lb.profileId}`,
        name: `${lb.boxName} (Lock Kit Box)`,
        unit: 'Boxes',
        formulaQty: lb.doorsCount,
        issuedQty: lb.doorsCount,
        rate: lb.boxCost,
        value: Math.round(lb.totalBoxCost || 0),
        category: 'Hardware / Lock',
      });
    }
  }

  return items;
}
