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

  const prefix = `BOQ-ISS-${year}-`;
  let maxSeq = 0;
  for (const row of all) {
    if (row.voucherNumber && row.voucherNumber.startsWith(prefix)) {
      const parsed = parseInt(row.voucherNumber.slice(prefix.length), 10);
      if (Number.isFinite(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }
  const voucherNumber = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;

  const cleanItems: BoqIssueVoucherItem[] = (Array.isArray(input.items) ? input.items : [])
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

export function deleteBoqIssueVoucher(id: string): BoqIssueVoucherRecord | null {
  const all = readStore();
  const idx = all.findIndex((v) => v.id === id || v.voucherNumber === id);
  if (idx === -1) return null;
  const [removed] = all.splice(idx, 1);
  writeStore(all);
  return removed;
}
