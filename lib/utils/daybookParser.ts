import { readXlsxBufferRows } from './xlsxSheetReader';

export type AccountingBucket =
  | 'FIXED_SALARY'
  | 'FIXED_OVERHEAD'
  | 'VARIABLE_FREIGHT'
  | 'VARIABLE_MATERIAL'
  | 'VARIABLE_PIECE_RATE'
  | 'INFLOW_SALES_RECEIPT'
  | 'IGNORE_NON_EXPENSE';

export type DetectedReportFormat =
  | 'VYAPAR_EXPENSE_CATEGORY'
  | 'VYAPAR_EXPENSE_DETAILS'
  | 'DAY_BOOK';

export interface ColumnMapping {
  dateCol: number;
  particularsCol: number;
  categoryCol: number;
  voucherTypeCol: number;
  voucherNoCol: number;
  amountCol: number;
  debitCol: number;
  creditCol: number;
  narrationCol: number;
  paymentModeCol: number;
}

export interface CustomKeywordRule {
  id: string;
  keyword: string;
  bucket: AccountingBucket;
  createdAt: string;
}

export interface ParsedDayBookRow {
  rowIndex: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  voucherType: string;
  voucherNo: string;
  particulars: string;
  category: string;
  narration: string;
  paymentMode: string;
  outflowAmount: number;
  inflowAmount: number;
  effectiveAmount: number;
  bucket: AccountingBucket;
  classificationReason: string;
  fingerprint: string;
}

export interface ParsedDayBookPreview {
  detectedFormat: DetectedReportFormat;
  sourceType: 'XLSX' | 'CSV' | 'TSV_PASTE' | 'TALLY_XML';
  headers: string[];
  columnMapping: ColumnMapping;
  rowsSkippedBanner: number;
  rowsSkippedTotals: number;
  rows: ParsedDayBookRow[];
}

export const ACCOUNTING_BUCKET_LABELS: Record<AccountingBucket, string> = {
  FIXED_SALARY: 'Fixed Staff Salary',
  FIXED_OVERHEAD: 'Fixed Factory Overhead',
  VARIABLE_FREIGHT: 'Variable Freight / Transport / Comm.',
  VARIABLE_MATERIAL: 'Variable Raw Material / Purchase',
  VARIABLE_PIECE_RATE: 'Variable Gang Piece-Rate Labor',
  INFLOW_SALES_RECEIPT: 'Sales / Customer Receipt (Inflow)',
  IGNORE_NON_EXPENSE: 'Contra / Transfer / Excluded',
};

const HEADER_KEYWORDS = [
  'date',
  'category',
  'expense',
  'particular',
  'party',
  'ledger',
  'type',
  'voucher',
  'amount',
  'total',
  'debit',
  'credit',
  'money in',
  'money out',
  'cash in',
  'cash out',
  'ref',
  'payment',
  'description',
  'narration',
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

export function parseDelimitedText(raw: string): { rows: string[][]; delimiter: ',' | '\t' | ';' } {
  const cleanText = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const sampleLines = cleanText.split('\n').slice(0, 10).filter((l) => l.trim().length > 0);
  const sampleJoined = sampleLines.join('\n');

  const tabCount = (sampleJoined.match(/\t/g) || []).length;
  const commaCount = (sampleJoined.match(/,/g) || []).length;
  const semiCount = (sampleJoined.match(/;/g) || []).length;

  const delimiter: ',' | '\t' | ';' =
    tabCount >= Math.max(commaCount, semiCount) && tabCount > 0
      ? '\t'
      : semiCount > commaCount
      ? ';'
      : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (ch === '\n') {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return { rows, delimiter };
}

export function parseFlexibleIndianDate(raw: string, fallbackMonth: string): {
  date: string;
  monthKey: string;
} {
  const s = (raw || '').trim();
  const safeMonth = /^\d{4}-\d{2}$/.test(fallbackMonth)
    ? fallbackMonth
    : new Date().toISOString().slice(0, 7);

  if (!s) {
    return { date: `${safeMonth}-01`, monthKey: safeMonth };
  }

  // Excel serial integer passed as text
  if (/^\d{5}$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 90000) {
      const iso = new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
      return { date: iso, monthKey: iso.slice(0, 7) };
    }
  }

  // YYYYMMDD (Tally XML)
  if (/^\d{8}$/.test(s)) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    return { date: iso, monthKey: iso.slice(0, 7) };
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    return { date: iso, monthKey: iso.slice(0, 7) };
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (standard Vyapar/Indian format)
  const dmyMatch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s.*)?$/.exec(s);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    const iso = `${y}-${m}-${d}`;
    return { date: iso, monthKey: `${y}-${m}` };
  }

  // DD-MMM-YYYY or DD MMM YY (Tally/Excel)
  const dMonY = /^(\d{1,2})[\s-]([a-zA-Z]{3,4})[\s-](\d{2,4})$/.exec(s);
  if (dMonY) {
    const mon = MONTH_MAP[dMonY[2].toLowerCase()];
    if (mon) {
      const d = dMonY[1].padStart(2, '0');
      const y = dMonY[3].length === 2 ? `20${dMonY[3]}` : dMonY[3];
      const iso = `${y}-${mon}-${d}`;
      return { date: iso, monthKey: `${y}-${mon}` };
    }
  }

  return { date: `${safeMonth}-01`, monthKey: safeMonth };
}

export function parseIndianAmount(raw?: string): number {
  if (!raw) return 0;
  let cleaned = String(raw).trim();
  if (!cleaned || cleaned === '-' || cleaned === '--') return 0;

  // Strip currency signs, spaces, trailing Dr/Cr labels, commas
  const isNegativeParen = /^\(.*\)$/.test(cleaned);
  cleaned = cleaned
    .replace(/[₹$,\s]/g, '')
    .replace(/^(?:rs\.?|inr)/i, '')
    .replace(/(?:dr|cr)\.?$/i, '')
    .replace(/[()]/g, '');

  const val = parseFloat(cleaned);
  if (!Number.isFinite(val)) return 0;
  return Math.round(Math.abs(isNegativeParen ? -val : val) * 100) / 100;
}

function isSummaryOrTotalRow(row: string[]): boolean {
  const nonEmpty = row.map((c) => c.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return true;

  const firstCell = nonEmpty[0].toLowerCase().replace(/[:\-]+$/g, '').trim();
  const secondCell = (nonEmpty[1] || '').toLowerCase().replace(/[:\-]+$/g, '').trim();
  const summaryRe =
    /^(total|grand\s+total|sub\s*-?\s*total|net\s+total|total\s+expenses?|total\s+amount|opening\s+balance|closing\s+balance|balance\s+c\/f|balance\s+b\/f)$/;
  return summaryRe.test(firstCell) || (nonEmpty.length >= 2 && summaryRe.test(secondCell));
}

export function extractReportTable(rows: string[][]): {
  headers: string[];
  dataRows: string[][];
  rowsSkippedBanner: number;
  rowsSkippedTotals: number;
} {
  if (rows.length === 0) {
    return { headers: [], dataRows: [], rowsSkippedBanner: 0, rowsSkippedTotals: 0 };
  }

  let bestHeaderIdx = 0;
  let bestScore = -1;
  const maxScan = Math.min(rows.length, 20);

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r];
    if (row.filter((c) => c.trim() !== '').length < 2) continue;

    let score = 0;
    for (const cell of row) {
      const lower = cell.trim().toLowerCase();
      if (!lower || /^\d/.test(lower)) continue;
      if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) {
        score += 2;
      }
      if (lower.length <= 28) score += 0.25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestHeaderIdx = r;
    }
  }

  const headers = rows[bestHeaderIdx].map((h) => h.trim());
  const rawBody = rows.slice(bestHeaderIdx + 1);
  let rowsSkippedTotals = 0;
  const dataRows: string[][] = [];

  for (const row of rawBody) {
    if (isSummaryOrTotalRow(row)) {
      rowsSkippedTotals++;
      continue;
    }
    dataRows.push(row);
  }

  return {
    headers,
    dataRows,
    rowsSkippedBanner: bestHeaderIdx,
    rowsSkippedTotals,
  };
}

export function detectColumnMapping(
  headers: string[],
  override?: Partial<ColumnMapping>
): ColumnMapping {
  const findCol = (patterns: RegExp[]): number => {
    for (const pat of patterns) {
      const idx = headers.findIndex((h) => pat.test(h.trim().toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const base: ColumnMapping = {
    dateCol: findCol([/^date$/i, /txn\s*date/i, /voucher\s*date/i, /bill\s*date/i, /\bdate\b/i]),
    particularsCol: findCol([
      /party\s*name/i,
      /particulars/i,
      /ledger/i,
      /expense\s*item/i,
      /account/i,
      /paid\s*to/i,
      /name/i,
    ]),
    categoryCol: findCol([
      /category\s*name/i,
      /expense\s*category/i,
      /^\s*category\s*$/i,
      /expense\s*type/i,
      /group/i,
    ]),
    voucherTypeCol: findCol([
      /voucher\s*type/i,
      /vch\s*type/i,
      /txn\s*type/i,
      /^\s*type\s*$/i,
    ]),
    voucherNoCol: findCol([
      /ref\s*no/i,
      /expense\s*no/i,
      /vch\s*no/i,
      /voucher\s*no/i,
      /invoice\s*no/i,
      /bill\s*no/i,
    ]),
    amountCol: findCol([
      /^\s*total\s*amount\s*$/i,
      /^\s*amount\s*$/i,
      /^\s*total\s*$/i,
      /net\s*amount/i,
    ]),
    debitCol: findCol([
      /money\s*out/i,
      /cash\s*out/i,
      /^\s*outflow\s*$/i,
      /debit/i,
      /withdrawal/i,
      /paid/i,
    ]),
    creditCol: findCol([
      /money\s*in/i,
      /cash\s*in/i,
      /^\s*inflow\s*$/i,
      /credit/i,
      /deposit/i,
      /received/i,
    ]),
    narrationCol: findCol([/narration/i, /description/i, /note/i, /remark/i]),
    paymentModeCol: findCol([/payment\s*type/i, /pay\s*mode/i, /mode/i]),
  };

  // Fallback for 2-column Vyapar Expense Category Report: [Category Name, Amount]
  if (base.categoryCol === -1 && base.particularsCol === -1 && headers.length >= 2) {
    base.categoryCol = 0;
  }
  if (base.amountCol === -1 && base.debitCol === -1 && base.creditCol === -1 && headers.length >= 2) {
    base.amountCol = headers.length - 1;
  }

  return {
    ...base,
    ...(override || {}),
  };
}

export function detectReportFormat(
  headers: string[],
  mapping: ColumnMapping
): DetectedReportFormat {
  const joined = headers.join(' ').toLowerCase();
  if (
    mapping.voucherTypeCol !== -1 ||
    (mapping.debitCol !== -1 && mapping.creditCol !== -1) ||
    joined.includes('money in') ||
    joined.includes('money out')
  ) {
    return 'DAY_BOOK';
  }
  if (mapping.dateCol === -1 && (mapping.categoryCol !== -1 || mapping.particularsCol !== -1)) {
    return 'VYAPAR_EXPENSE_CATEGORY';
  }
  return 'VYAPAR_EXPENSE_DETAILS';
}

export function classifyAccountingEntry(input: {
  particulars: string;
  category: string;
  voucherType: string;
  narration: string;
  inflowAmount: number;
  outflowAmount: number;
  reportFormat: DetectedReportFormat;
  contractorNames: string[];
  customRules: CustomKeywordRule[];
}): { bucket: AccountingBucket; reason: string } {
  const combined = `${input.category} ${input.particulars} ${input.narration}`.trim().toLowerCase();
  const vType = input.voucherType.trim().toLowerCase();

  // 1. User-saved custom rules take top priority
  for (const rule of input.customRules) {
    const kw = rule.keyword.trim().toLowerCase();
    if (kw && combined.includes(kw)) {
      return { bucket: rule.bucket, reason: `Saved rule: "${rule.keyword}"` };
    }
  }

  // 2. Non-expense voucher types (Contra, Bank transfers, estimates, opening balances)
  if (
    /\b(contra|bank\s*transfer|cash\s*transfer|estimate|quotation|sale\s*order|purchase\s*order|delivery\s*challan|proforma|opening|closing)\b/.test(
      vType
    ) ||
    /\b(contra|cash\s*deposit|cash\s*withdrawal|atm\s*withdrawal|bank\s*to\s*bank|self\s*transfer|owner\s*drawing|drawings)\b/.test(
      combined
    )
  ) {
    return {
      bucket: 'IGNORE_NON_EXPENSE',
      reason: vType ? `Voucher type "${input.voucherType}" excluded` : 'Internal transfer / drawings excluded',
    };
  }

  // 3. Sales & Receipts (Inflow)
  if (
    /\b(sale|sales|receipt|payment-?in|money\s*in|tax\s*invoice)\b/.test(vType) ||
    (input.inflowAmount > 0 && input.outflowAmount === 0 && input.reportFormat === 'DAY_BOOK')
  ) {
    return {
      bucket: 'INFLOW_SALES_RECEIPT',
      reason: vType ? `Inflow "${input.voucherType}"` : 'Customer receipt / inflow',
    };
  }

  // 4. Explicit Contractor Gang match from ERP floor gangs
  for (const gName of input.contractorNames) {
    const clean = gName.trim().toLowerCase();
    if (clean.length >= 3 && combined.includes(clean)) {
      return {
        bucket: 'VARIABLE_PIECE_RATE',
        reason: `Matched Floor Gang "${gName}"`,
      };
    }
  }

  // 5. Keyword matching (Fixed Salary -> Freight -> Piece Rate -> Materials -> Fixed Overhead)
  if (
    /\b(salary|salaries|payroll|staff\s*wage|supervisor|manager\s*pay|office\s*staff|driver\s*salary|watchman|security\s*staff|esi|pf|epf|bonus)\b/.test(
      combined
    )
  ) {
    return { bucket: 'FIXED_SALARY', reason: 'Matched Staff Salary keyword' };
  }

  if (
    /\b(freight|transport|lorry|eicher|pickup|tempo|diesel|fuel|petrol|loading|unloading|hamali|coolie|parcel|courier|cartage|commission|brokerage)\b/.test(
      combined
    )
  ) {
    return { bucket: 'VARIABLE_FREIGHT', reason: 'Matched Freight / Transport / Commission keyword' };
  }

  if (
    /\b(piece\s*rate|molding|moulding|door\s*cutting|frame\s*cutting|painting\s*gang|painting\s*labour|site\s*fitting|contractor|job\s*work|subcontract|labour\s*charges)\b/.test(
      combined
    )
  ) {
    return { bucket: 'VARIABLE_PIECE_RATE', reason: 'Matched Piece-Rate / Contractor Labor keyword' };
  }

  // Vyapar Payment-Out that didn't match Contractor, Salary, Freight, Piece-Rate, or Fixed Overhead
  // is treated as a supplier/party bill settlement so Purchase bills are never double-counted.
  if (
    /\b(rent|lease|kseb|electricity|power|eb\s*bill|water|internet|broadband|wifi|phone|mobile|emi|loan|interest|depreciation|audit|accounting|stationery|printing|tea|coffee|cleaning|maintenance|repair|insurance|license|misc|office|indirect\s*expense)\b/.test(
      combined
    )
  ) {
    return { bucket: 'FIXED_OVERHEAD', reason: 'Matched Fixed Factory Overhead keyword' };
  }

  if (/payment-?out/.test(vType)) {
    return {
      bucket: 'IGNORE_NON_EXPENSE',
      reason: 'Vyapar Payment-Out (excluded to avoid Purchase double-count; reclassify if direct cash expense)',
    };
  }

  if (
    /\b(purchase|purchases|purchase\s*bill)\b/.test(vType) ||
    /\b(resin|gelcoat|gel\s*coat|catalyst|mekp|cobalt|accelerator|csm|fiberglass|glass\s*mat|pigment|timber|wood|reeper|foam|lock|latch|hinge|screw|thinner|putty|sandpaper|primer|lacquer|raw\s*material|hardware)\b/.test(
      combined
    )
  ) {
    return {
      bucket: 'VARIABLE_MATERIAL',
      reason: /\bpurchase\b/.test(vType) ? 'Vyapar/Tally Purchase voucher' : 'Matched Raw Material / Hardware keyword',
    };
  }

  // Vyapar Expense Category or Expense Transaction reports strictly hold Expenses
  if (
    input.reportFormat === 'VYAPAR_EXPENSE_CATEGORY' ||
    input.reportFormat === 'VYAPAR_EXPENSE_DETAILS' ||
    /\bexpense\b/.test(vType)
  ) {
    return {
      bucket: 'FIXED_OVERHEAD',
      reason: 'Default Expense Report head -> Fixed Factory Overhead',
    };
  }

  return {
    bucket: 'FIXED_OVERHEAD',
    reason: 'General debit payment -> Review Fixed vs Variable',
  };
}

export function buildEntryFingerprint(entry: {
  monthKey: string;
  date: string;
  voucherNo: string;
  particulars: string;
  category: string;
  effectiveAmount: number;
}): string {
  const normPart = (entry.particulars || entry.category).trim().toLowerCase().replace(/\s+/g, ' ');
  const normVch = entry.voucherNo.trim().toLowerCase();
  return `${entry.monthKey}|${entry.date}|${normVch}|${normPart}|${Math.round(entry.effectiveAmount)}`;
}

function decodeXmlTags(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
  return m
    ? m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
    : '';
}

function parseTallyXmlVouchers(rawXml: string, fallbackMonth: string): string[][] {
  const rows: string[][] = [['Date', 'Voucher Type', 'Voucher No', 'Particulars', 'Narration', 'Money Out', 'Money In']];
  const vchRegex = /<VOUCHER(?:\s[^>]*)?>([\s\S]*?)<\/VOUCHER>/gi;
  let match: RegExpExecArray | null;

  while ((match = vchRegex.exec(rawXml)) !== null) {
    const block = match[1];
    const dateRaw = decodeXmlTags(block, 'DATE');
    const vType = decodeXmlTags(block, 'VOUCHERTYPENAME') || 'Journal';
    const vNo = decodeXmlTags(block, 'VOUCHERNUMBER');
    const party = decodeXmlTags(block, 'PARTYLEDGERNAME');
    const narration = decodeXmlTags(block, 'NARRATION');

    const ledgerRegex = /<(?:ALL)?LEDGERENTRIES\.LIST[^>]*>([\s\S]*?)<\/(?:ALL)?LEDGERENTRIES\.LIST>/gi;
    let lMatch: RegExpExecArray | null;
    let debitTotal = 0;
    let creditTotal = 0;
    let bestLedgerName = party;

    while ((lMatch = ledgerRegex.exec(block)) !== null) {
      const lb = lMatch[1];
      const ledgerName = decodeXmlTags(lb, 'LEDGERNAME');
      const amtNum = parseFloat(decodeXmlTags(lb, 'AMOUNT')) || 0;
      const isDeemedPos = decodeXmlTags(lb, 'ISDEEMEDPOSITIVE').toLowerCase() === 'yes';

      if (amtNum !== 0) {
        // In Tally XML, negative or ISDEEMEDPOSITIVE="Yes" typically represents Debit
        if (isDeemedPos || amtNum < 0) {
          debitTotal += Math.abs(amtNum);
          if (ledgerName && !/cash|bank/i.test(ledgerName)) bestLedgerName = ledgerName;
        } else {
          creditTotal += Math.abs(amtNum);
          if (!bestLedgerName && ledgerName) bestLedgerName = ledgerName;
        }
      }
    }

    if (debitTotal === 0 && creditTotal === 0) continue;
    const isSalesLike = /\b(sales|receipt)\b/i.test(vType);
    rows.push([
      dateRaw || fallbackMonth,
      vType,
      vNo,
      bestLedgerName || party || vType,
      narration,
      isSalesLike ? '0' : String(Math.round(debitTotal || creditTotal)),
      isSalesLike ? String(Math.round(creditTotal || debitTotal)) : '0',
    ]);
  }

  return rows;
}

export function parseAccountingUpload(options: {
  fileBuffer?: Buffer;
  rawText?: string;
  fileName?: string;
  defaultMonth: string;
  contractorNames?: string[];
  customRules?: CustomKeywordRule[];
  columnOverride?: Partial<ColumnMapping>;
}): ParsedDayBookPreview {
  const fallbackMonth = /^\d{4}-\d{2}$/.test(options.defaultMonth)
    ? options.defaultMonth
    : new Date().toISOString().slice(0, 7);

  let rawRows: string[][] = [];
  let sourceType: ParsedDayBookPreview['sourceType'] = 'CSV';

  if (options.fileBuffer && options.fileBuffer.length > 0 && /\.(xlsx|xlsm)$/i.test(options.fileName || '')) {
    sourceType = 'XLSX';
    const sheet = readXlsxBufferRows(options.fileBuffer);
    rawRows = sheet.rows;
  } else {
    const text =
      options.rawText ?? (options.fileBuffer ? options.fileBuffer.toString('utf8') : '');
    if (!text.trim()) {
      throw new Error('Uploaded file or pasted Day Book data is empty.');
    }

    if (/<VOUCHER[\s>]/i.test(text)) {
      sourceType = 'TALLY_XML';
      rawRows = parseTallyXmlVouchers(text, fallbackMonth);
    } else {
      const parsed = parseDelimitedText(text);
      sourceType = parsed.delimiter === '\t' ? 'TSV_PASTE' : 'CSV';
      rawRows = parsed.rows;
    }
  }

  const { headers, dataRows, rowsSkippedBanner, rowsSkippedTotals } = extractReportTable(rawRows);
  if (headers.length < 2) {
    throw new Error('Could not detect columns in uploaded report. Ensure there are at least 2 columns (Category/Particulars and Amount).');
  }

  const columnMapping = detectColumnMapping(headers, options.columnOverride);
  const detectedFormat = detectReportFormat(headers, columnMapping);
  const contractorNames = options.contractorNames || [];
  const customRules = options.customRules || [];

  const parsedRows: ParsedDayBookRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const getCell = (idx: number) => (idx >= 0 && idx < r.length ? (r[idx] || '').trim() : '');

    const rawDate = getCell(columnMapping.dateCol);
    const { date, monthKey } = parseFlexibleIndianDate(rawDate, fallbackMonth);
    const category = getCell(columnMapping.categoryCol);
    const particulars = getCell(columnMapping.particularsCol) || category;
    const voucherType = getCell(columnMapping.voucherTypeCol);
    const voucherNo = getCell(columnMapping.voucherNoCol);
    const narration = getCell(columnMapping.narrationCol);
    const paymentMode = getCell(columnMapping.paymentModeCol);

    const debitAmt = parseIndianAmount(getCell(columnMapping.debitCol));
    const creditAmt = parseIndianAmount(getCell(columnMapping.creditCol));
    const singleAmt = parseIndianAmount(getCell(columnMapping.amountCol));

    let outflowAmount = debitAmt;
    let inflowAmount = creditAmt;

    if (outflowAmount === 0 && inflowAmount === 0 && singleAmt > 0) {
      const vtLower = voucherType.toLowerCase();
      if (/\b(sale|sales|receipt|payment-?in|money\s*in)\b/.test(vtLower)) {
        inflowAmount = singleAmt;
      } else {
        outflowAmount = singleAmt;
      }
    }

    const effectiveAmount = outflowAmount > 0 ? outflowAmount : inflowAmount;
    if (effectiveAmount <= 0 || (!particulars && !category)) {
      continue;
    }

    const { bucket, reason } = classifyAccountingEntry({
      particulars,
      category,
      voucherType,
      narration,
      inflowAmount,
      outflowAmount,
      reportFormat: detectedFormat,
      contractorNames,
      customRules,
    });

    const fingerprint = buildEntryFingerprint({
      monthKey,
      date,
      voucherNo,
      particulars,
      category,
      effectiveAmount,
    });

    parsedRows.push({
      rowIndex: i + 1,
      date,
      monthKey,
      voucherType,
      voucherNo,
      particulars: particulars || category || 'Expense',
      category: category || particulars || 'General',
      narration,
      paymentMode,
      outflowAmount: Math.round(outflowAmount),
      inflowAmount: Math.round(inflowAmount),
      effectiveAmount: Math.round(effectiveAmount),
      bucket,
      classificationReason: reason,
      fingerprint,
    });
  }

  return {
    detectedFormat,
    sourceType,
    headers,
    columnMapping,
    rowsSkippedBanner,
    rowsSkippedTotals,
    rows: parsedRows,
  };
}
