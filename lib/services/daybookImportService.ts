import fs from 'fs';
import path from 'path';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import { getContractors } from './contractorService';
import {
  AccountingBucket,
  buildEntryFingerprint,
  ColumnMapping,
  CustomKeywordRule,
  DetectedReportFormat,
  parseAccountingUpload,
  ParsedDayBookRow,
} from '@/lib/utils/daybookParser';

export interface MonthlyPayrollLine {
  id: string;
  employeeName: string;
  role: string;
  monthlySalary: number;
  active: boolean;
}

export interface MonthlyExpenseLine {
  id: string;
  label: string;
  bucket:
    | 'FIXED_SALARY'
    | 'FIXED_OVERHEAD'
    | 'VARIABLE_FREIGHT'
    | 'VARIABLE_MATERIAL'
    | 'VARIABLE_PIECE_RATE';
  amount: number;
  active: boolean;
}

export interface MonthlyAccountingSheet {
  monthKey: string;
  salaries: MonthlyPayrollLine[];
  expenses: MonthlyExpenseLine[];
  manualDoorsSold?: number;
  manualSalesRevenue?: number;
  notes?: string;
  updatedAt: string;
}

export interface ImportedDayBookEntry extends ParsedDayBookRow {
  id: string;
  batchId: string;
  includedInBreakEven: boolean;
}

export interface ImportedDayBookBatch {
  id: string;
  fileName: string;
  detectedFormat: DetectedReportFormat;
  sourceType: 'XLSX' | 'CSV' | 'TSV_PASTE' | 'TALLY_XML';
  monthKeys: string[];
  importedAt: string;
  totalParsedRows: number;
  insertedRows: number;
  skippedDuplicates: number;
  rowsSkippedBanner: number;
  rowsSkippedTotals: number;
  bucketTotals: Record<AccountingBucket, number>;
}

export interface DayBookImportsStore {
  batches: ImportedDayBookBatch[];
  entries: ImportedDayBookEntry[];
  monthlySummaries: MonthlyAccountingSheet[];
  customRules: CustomKeywordRule[];
}

export interface PreviewDayBookRow extends ParsedDayBookRow {
  isDuplicate: boolean;
  includedInBreakEven: boolean;
}

export interface DayBookImportPreviewResponse {
  detectedFormat: DetectedReportFormat;
  sourceType: 'XLSX' | 'CSV' | 'TSV_PASTE' | 'TALLY_XML';
  headers: string[];
  columnMapping: ColumnMapping;
  rowsSkippedBanner: number;
  rowsSkippedTotals: number;
  totalRows: number;
  duplicateCount: number;
  bucketTotals: Record<AccountingBucket, number>;
  rows: PreviewDayBookRow[];
}

export interface MonthlyAccountingSummary {
  monthKey: string;
  sheet: MonthlyAccountingSheet | null;
  batches: ImportedDayBookBatch[];
  entries: ImportedDayBookEntry[];

  sheetSalaryTotal: number;
  sheetFixedOverheadTotal: number;
  sheetVariableMaterialTotal: number;
  sheetVariablePieceRateTotal: number;
  sheetVariableFreightTotal: number;

  dayBookFixedSalaryTotal: number;
  dayBookFixedOverheadTotal: number;
  dayBookVariableMaterialTotal: number;
  dayBookVariablePieceRateTotal: number;
  dayBookVariableFreightTotal: number;
  dayBookSalesInflowTotal: number;
  dayBookIgnoredTotal: number;

  combinedFixedSalaryTotal: number;
  combinedFixedOverheadTotal: number;
  combinedTotalFixedMonthly: number;
  combinedVariableMaterialTotal: number;
  combinedVariablePieceRateTotal: number;
  combinedVariableFreightTotal: number;

  manualDoorsSold: number;
  manualSalesRevenue: number;
}

const DEFAULT_STORE: DayBookImportsStore = {
  batches: [],
  entries: [],
  monthlySummaries: [],
  customRules: [],
};

const getStorePath = () => getDataFilePath('daybook-imports-store.json');

function emptyBucketTotals(): Record<AccountingBucket, number> {
  return {
    FIXED_SALARY: 0,
    FIXED_OVERHEAD: 0,
    VARIABLE_FREIGHT: 0,
    VARIABLE_MATERIAL: 0,
    VARIABLE_PIECE_RATE: 0,
    INFLOW_SALES_RECEIPT: 0,
    IGNORE_NON_EXPENSE: 0,
  };
}

function readStore(): DayBookImportsStore {
  try {
    const storePath = getStorePath();
    if (!fs.existsSync(storePath)) {
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
      fs.writeFileSync(storePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
      return { batches: [], entries: [], monthlySummaries: [], customRules: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8')) as Partial<DayBookImportsStore>;
    return {
      batches: Array.isArray(parsed.batches) ? parsed.batches : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      monthlySummaries: Array.isArray(parsed.monthlySummaries) ? parsed.monthlySummaries : [],
      customRules: Array.isArray(parsed.customRules) ? parsed.customRules : [],
    };
  } catch {
    return { batches: [], entries: [], monthlySummaries: [], customRules: [] };
  }
}

function writeStore(store: DayBookImportsStore): void {
  writeJsonSafe(getStorePath(), store);
}

function summarizeBuckets(rows: Array<{ bucket: AccountingBucket; effectiveAmount: number; includedInBreakEven?: boolean }>) {
  const totals = emptyBucketTotals();
  for (const row of rows) {
    if (row.includedInBreakEven === false) continue;
    totals[row.bucket] = (totals[row.bucket] || 0) + (Number(row.effectiveAmount) || 0);
  }
  return totals;
}

export function previewDayBookUpload(input: {
  fileBase64?: string;
  rawText?: string;
  fileName?: string;
  defaultMonth: string;
  columnOverride?: Partial<ColumnMapping>;
}): DayBookImportPreviewResponse {
  const store = readStore();
  const existingFingerprints = new Set(store.entries.map((e) => e.fingerprint));
  const contractorNames = getContractors().map((c) => c.name);

  const fileBuffer = input.fileBase64 ? Buffer.from(input.fileBase64, 'base64') : undefined;
  const parsed = parseAccountingUpload({
    fileBuffer,
    rawText: input.rawText,
    fileName: input.fileName,
    defaultMonth: input.defaultMonth,
    contractorNames,
    customRules: store.customRules,
    columnOverride: input.columnOverride,
  });

  let duplicateCount = 0;
  const previewRows: PreviewDayBookRow[] = parsed.rows.map((r) => {
    const isDuplicate = existingFingerprints.has(r.fingerprint);
    if (isDuplicate) duplicateCount++;
    return {
      ...r,
      isDuplicate,
      includedInBreakEven: !isDuplicate && r.bucket !== 'IGNORE_NON_EXPENSE',
    };
  });

  return {
    detectedFormat: parsed.detectedFormat,
    sourceType: parsed.sourceType,
    headers: parsed.headers,
    columnMapping: parsed.columnMapping,
    rowsSkippedBanner: parsed.rowsSkippedBanner,
    rowsSkippedTotals: parsed.rowsSkippedTotals,
    totalRows: previewRows.length,
    duplicateCount,
    bucketTotals: summarizeBuckets(previewRows),
    rows: previewRows,
  };
}

export function commitDayBookImport(input: {
  fileName: string;
  detectedFormat: DetectedReportFormat;
  sourceType: 'XLSX' | 'CSV' | 'TSV_PASTE' | 'TALLY_XML';
  rowsSkippedBanner?: number;
  rowsSkippedTotals?: number;
  skipDuplicates?: boolean;
  rows: Array<ParsedDayBookRow & { includedInBreakEven?: boolean; saveKeywordRule?: string }>;
}): { batch: ImportedDayBookBatch; insertedCount: number; skippedDuplicates: number } {
  const store = readStore();
  const skipDupes = input.skipDuplicates !== false;
  const existingFingerprints = new Set(store.entries.map((e) => e.fingerprint));
  const batchId = `DBB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const insertedEntries: ImportedDayBookEntry[] = [];
  let skippedDuplicates = 0;
  const monthSet = new Set<string>();

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const amount = Math.round(Math.max(0, Number(r.effectiveAmount) || 0));
    if (amount <= 0) continue;

    const fingerprint =
      r.fingerprint ||
      buildEntryFingerprint({
        monthKey: r.monthKey,
        date: r.date,
        voucherNo: r.voucherNo || '',
        particulars: r.particulars,
        category: r.category,
        effectiveAmount: amount,
      });

    if (skipDupes && existingFingerprints.has(fingerprint)) {
      skippedDuplicates++;
      continue;
    }

    existingFingerprints.add(fingerprint);
    monthSet.add(r.monthKey);

    if (r.saveKeywordRule && r.saveKeywordRule.trim()) {
      const kw = r.saveKeywordRule.trim().toLowerCase();
      const existsRule = store.customRules.find((cr) => cr.keyword.toLowerCase() === kw);
      if (existsRule) {
        existsRule.bucket = r.bucket;
      } else {
        store.customRules.unshift({
          id: `RULE-${Date.now()}-${i}`,
          keyword: r.saveKeywordRule.trim(),
          bucket: r.bucket,
          createdAt: new Date().toISOString(),
        });
      }
    }

    insertedEntries.push({
      ...r,
      id: `DBE-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      batchId,
      effectiveAmount: amount,
      fingerprint,
      includedInBreakEven: r.includedInBreakEven !== false,
    });
  }

  const batch: ImportedDayBookBatch = {
    id: batchId,
    fileName: (input.fileName || 'Vyapar Export').trim(),
    detectedFormat: input.detectedFormat,
    sourceType: input.sourceType,
    monthKeys: Array.from(monthSet).sort(),
    importedAt: new Date().toISOString(),
    totalParsedRows: input.rows.length,
    insertedRows: insertedEntries.length,
    skippedDuplicates,
    rowsSkippedBanner: input.rowsSkippedBanner || 0,
    rowsSkippedTotals: input.rowsSkippedTotals || 0,
    bucketTotals: summarizeBuckets(insertedEntries),
  };

  store.batches.unshift(batch);
  store.entries = [...insertedEntries, ...store.entries];
  writeStore(store);

  return { batch, insertedCount: insertedEntries.length, skippedDuplicates };
}

export function updateDayBookEntry(input: {
  entryId: string;
  bucket?: AccountingBucket;
  includedInBreakEven?: boolean;
  saveRuleKeyword?: string;
}): ImportedDayBookEntry {
  const store = readStore();
  const idx = store.entries.findIndex((e) => e.id === input.entryId);
  if (idx === -1) {
    throw new Error(`Imported Day Book entry "${input.entryId}" not found.`);
  }

  const entry = store.entries[idx];
  if (input.bucket) entry.bucket = input.bucket;
  if (input.includedInBreakEven !== undefined) {
    entry.includedInBreakEven = input.includedInBreakEven;
  }

  if (input.saveRuleKeyword && input.saveRuleKeyword.trim() && input.bucket) {
    const kw = input.saveRuleKeyword.trim().toLowerCase();
    const existingRule = store.customRules.find((r) => r.keyword.toLowerCase() === kw);
    if (existingRule) {
      existingRule.bucket = input.bucket;
    } else {
      store.customRules.unshift({
        id: `RULE-${Date.now()}`,
        keyword: input.saveRuleKeyword.trim(),
        bucket: input.bucket,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Recompute batch bucket totals
  const batchIdx = store.batches.findIndex((b) => b.id === entry.batchId);
  if (batchIdx >= 0) {
    const batchEntries = store.entries.filter((e) => e.batchId === entry.batchId);
    store.batches[batchIdx].bucketTotals = summarizeBuckets(batchEntries);
  }

  writeStore(store);
  return entry;
}

export function deleteDayBookBatch(batchId: string): boolean {
  const store = readStore();
  const prevLen = store.batches.length;
  store.batches = store.batches.filter((b) => b.id !== batchId);
  store.entries = store.entries.filter((e) => e.batchId !== batchId);
  if (store.batches.length === prevLen) return false;
  writeStore(store);
  return true;
}

export function deleteDayBookEntry(entryId: string): boolean {
  const store = readStore();
  const target = store.entries.find((e) => e.id === entryId);
  if (!target) return false;
  store.entries = store.entries.filter((e) => e.id !== entryId);
  const batch = store.batches.find((b) => b.id === target.batchId);
  if (batch) {
    const remaining = store.entries.filter((e) => e.batchId === target.batchId);
    batch.insertedRows = remaining.length;
    batch.bucketTotals = summarizeBuckets(remaining);
  }
  writeStore(store);
  return true;
}

export function saveMonthlyAccountingSheet(input: {
  monthKey: string;
  salaries: MonthlyPayrollLine[];
  expenses: MonthlyExpenseLine[];
  manualDoorsSold?: number;
  manualSalesRevenue?: number;
  notes?: string;
}): MonthlyAccountingSheet {
  const store = readStore();
  const monthKey = /^\d{4}-\d{2}$/.test(input.monthKey)
    ? input.monthKey
    : new Date().toISOString().slice(0, 7);

  const normalized: MonthlyAccountingSheet = {
    monthKey,
    salaries: (input.salaries || [])
      .filter((s) => s.employeeName?.trim())
      .map((s, idx) => ({
        id: s.id || `SAL-${Date.now()}-${idx}`,
        employeeName: s.employeeName.trim(),
        role: (s.role || 'Staff').trim(),
        monthlySalary: Math.round(Math.max(0, Number(s.monthlySalary) || 0)),
        active: s.active !== false,
      })),
    expenses: (input.expenses || [])
      .filter((e) => e.label?.trim())
      .map((e, idx) => ({
        id: e.id || `MEXP-${Date.now()}-${idx}`,
        label: e.label.trim(),
        bucket: e.bucket || 'FIXED_OVERHEAD',
        amount: Math.round(Math.max(0, Number(e.amount) || 0)),
        active: e.active !== false,
      })),
    manualDoorsSold:
      input.manualDoorsSold !== undefined && Number(input.manualDoorsSold) > 0
        ? Math.round(Number(input.manualDoorsSold))
        : 0,
    manualSalesRevenue:
      input.manualSalesRevenue !== undefined && Number(input.manualSalesRevenue) > 0
        ? Math.round(Number(input.manualSalesRevenue))
        : 0,
    notes: input.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  const idx = store.monthlySummaries.findIndex((m) => m.monthKey === monthKey);
  if (idx >= 0) {
    store.monthlySummaries[idx] = normalized;
  } else {
    store.monthlySummaries.unshift(normalized);
  }

  writeStore(store);
  return normalized;
}

export function clonePreviousMonthlySheet(fromMonth: string, toMonth: string): MonthlyAccountingSheet {
  const store = readStore();
  const prev = store.monthlySummaries.find((m) => m.monthKey === fromMonth);
  if (!prev) {
    throw new Error(`No saved monthly expense & salary sheet found for ${fromMonth} to clone.`);
  }
  return saveMonthlyAccountingSheet({
    monthKey: toMonth,
    salaries: prev.salaries.map((s, i) => ({ ...s, id: `SAL-${Date.now()}-${i}` })),
    expenses: prev.expenses.map((e, i) => ({ ...e, id: `MEXP-${Date.now()}-${i}` })),
    notes: `Cloned recurring payroll & expenses from ${fromMonth}`,
  });
}

export function getMonthlyAccountingSummary(monthKey: string): MonthlyAccountingSummary {
  const store = readStore();
  const targetMonth = /^\d{4}-\d{2}$/.test(monthKey)
    ? monthKey
    : new Date().toISOString().slice(0, 7);

  const sheet = store.monthlySummaries.find((m) => m.monthKey === targetMonth) || null;
  const entries = store.entries.filter((e) => e.monthKey === targetMonth);
  const batches = store.batches.filter(
    (b) => b.monthKeys.includes(targetMonth) || entries.some((e) => e.batchId === b.id)
  );

  const sheetSalaryTotal = sheet
    ? Math.round(
        sheet.salaries.filter((s) => s.active).reduce((sum, s) => sum + s.monthlySalary, 0) +
          sheet.expenses
            .filter((e) => e.active && e.bucket === 'FIXED_SALARY')
            .reduce((sum, e) => sum + e.amount, 0)
      )
    : 0;

  const sumSheetBucket = (bucket: MonthlyExpenseLine['bucket']) =>
    sheet
      ? Math.round(
          sheet.expenses
            .filter((e) => e.active && e.bucket === bucket)
            .reduce((sum, e) => sum + e.amount, 0)
        )
      : 0;

  const sumEntryBucket = (bucket: AccountingBucket) =>
    Math.round(
      entries
        .filter((e) => e.includedInBreakEven && e.bucket === bucket)
        .reduce((sum, e) => sum + e.effectiveAmount, 0)
    );

  const sheetFixedOverheadTotal = sumSheetBucket('FIXED_OVERHEAD');
  const sheetVariableMaterialTotal = sumSheetBucket('VARIABLE_MATERIAL');
  const sheetVariablePieceRateTotal = sumSheetBucket('VARIABLE_PIECE_RATE');
  const sheetVariableFreightTotal = sumSheetBucket('VARIABLE_FREIGHT');

  const dayBookFixedSalaryTotal = sumEntryBucket('FIXED_SALARY');
  const dayBookFixedOverheadTotal = sumEntryBucket('FIXED_OVERHEAD');
  const dayBookVariableMaterialTotal = sumEntryBucket('VARIABLE_MATERIAL');
  const dayBookVariablePieceRateTotal = sumEntryBucket('VARIABLE_PIECE_RATE');
  const dayBookVariableFreightTotal = sumEntryBucket('VARIABLE_FREIGHT');
  const dayBookSalesInflowTotal = sumEntryBucket('INFLOW_SALES_RECEIPT');
  const dayBookIgnoredTotal = Math.round(
    entries
      .filter((e) => !e.includedInBreakEven || e.bucket === 'IGNORE_NON_EXPENSE')
      .reduce((sum, e) => sum + e.effectiveAmount, 0)
  );

  const combinedFixedSalaryTotal = sheetSalaryTotal + dayBookFixedSalaryTotal;
  const combinedFixedOverheadTotal = sheetFixedOverheadTotal + dayBookFixedOverheadTotal;

  return {
    monthKey: targetMonth,
    sheet,
    batches,
    entries,
    sheetSalaryTotal,
    sheetFixedOverheadTotal,
    sheetVariableMaterialTotal,
    sheetVariablePieceRateTotal,
    sheetVariableFreightTotal,
    dayBookFixedSalaryTotal,
    dayBookFixedOverheadTotal,
    dayBookVariableMaterialTotal,
    dayBookVariablePieceRateTotal,
    dayBookVariableFreightTotal,
    dayBookSalesInflowTotal,
    dayBookIgnoredTotal,
    combinedFixedSalaryTotal,
    combinedFixedOverheadTotal,
    combinedTotalFixedMonthly: combinedFixedSalaryTotal + combinedFixedOverheadTotal,
    combinedVariableMaterialTotal: sheetVariableMaterialTotal + dayBookVariableMaterialTotal,
    combinedVariablePieceRateTotal: sheetVariablePieceRateTotal + dayBookVariablePieceRateTotal,
    combinedVariableFreightTotal: sheetVariableFreightTotal + dayBookVariableFreightTotal,
    manualDoorsSold: sheet?.manualDoorsSold || 0,
    manualSalesRevenue: sheet?.manualSalesRevenue || 0,
  };
}

export function resetDayBookTransactionalData(): void {
  const store = readStore();
  writeStore({
    batches: [],
    entries: [],
    monthlySummaries: [],
    customRules: store.customRules,
  });
}
