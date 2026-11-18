import fs from 'fs';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';

export type BoqIssueShift = 'MORNING' | 'AFTERNOON' | 'EVENING';

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
  totalIssuedValue: number;
  bufferPercent: number;
  notes?: string;
}

export interface CreateBoqIssueVoucherInput {
  prodOrderId: string;
  orderNumber?: string;
  jobCardNumber?: string;
  customerName?: string;
  doorIds: string[];
  doorNumbers?: string[];
  items: BoqIssueVoucherItem[];
  shift?: BoqIssueShift;
  gangName?: string;
  issuedBy?: string;
  issueDate?: string;
  bufferPercent?: number;
  notes?: string;
  consolidatedBatchNumber?: string;
  isConsolidatedBatch?: boolean;
}

export interface ConsolidatedBatchPartyEntryInput {
  prodOrderId: string;
  orderNumber?: string;
  jobCardNumber?: string;
  customerName?: string;
  doorIds: string[];
  doorNumbers?: string[];
  selectedSqFt?: number;
}

export interface CreateConsolidatedBoqBatchInput {
  entries: ConsolidatedBatchPartyEntryInput[];
  items: BoqIssueVoucherItem[];
  shift?: BoqIssueShift;
  gangName?: string;
  issuedBy?: string;
  issueDate?: string;
  bufferPercent?: number;
  notes?: string;
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
    // Re-aggregate combined items across linked party vouchers
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
    totalIssuedValue,
    bufferPercent: Math.max(0, Number(input.bufferPercent) || 0),
    notes: input.notes?.trim() || undefined,
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

  // Weight each party by selected Sq.Ft (fallback to doorsCount) so pro-rated party values match exact batch total
  const weights = validEntries.map((e) =>
    Number(e.selectedSqFt) > 0 ? Number(e.selectedSqFt) : e.doorIds.length
  );
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;

  // Allocate exact integer ₹ values per item across entries with last-entry remainder balance
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
      totalIssuedValue: entryValue,
      bufferPercent: Math.max(0, Number(input.bufferPercent) || 0),
      notes: input.notes?.trim() || undefined,
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
