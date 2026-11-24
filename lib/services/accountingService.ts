import fs from 'fs';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import type {
  AccountGroup,
  AccountingLedgerStore,
  AccountingOverviewPayload,
  AccountingPaymentMode,
  AccountingReportType,
  AccountStatementLine,
  AccountStatementResponse,
  AccountSubType,
  BalanceSide,
  CashBankAccount,
  CashBankAccountWithBalance,
  ChartOfAccount,
  ChartOfAccountWithBalance,
  ContraTransferRecord,
  ExpenseCategory,
  ExpenseRecord,
  FinancialYearCloseRecord,
  InvoiceLineItem,
  JournalEntryRecord,
  JournalLine,
  OpeningBalanceEntryInput,
  OpeningBalancesSnapshot,
  OtherIncomeRecord,
  PartyToPartyPaymentMode,
  PartyToPartyPaymentRecord,
  PartyType,
  PaymentInRecord,
  PaymentOutRecord,
  PurchaseBillRecord,
  SalesInvoiceRecord,
  SalesReturnCreditNoteRecord,
  VoucherSourceType,
} from '@/types/accounting';

const STORE_FILENAME = 'accounting-ledger-store.json';

// Canonical system account IDs (protected from accidental deletion)
export const SYSTEM_ACCOUNT_IDS = {
  CASH_IN_HAND: 'coa-1001-cash',
  MAIN_BANK: 'coa-1010-bank',
  ACCOUNTS_RECEIVABLE: 'coa-1100-ar',
  GST_INPUT_CREDIT: 'coa-1200-gst-in',
  RAW_MATERIAL_INVENTORY: 'coa-1300-inv',
  PLANT_MACHINERY: 'coa-1500-machinery',
  ACCOUNTS_PAYABLE: 'coa-2001-ap',
  GST_OUTPUT_PAYABLE: 'coa-2100-gst-out',
  CUSTOMER_ADVANCES: 'coa-2200-cust-adv',
  OWNER_CAPITAL: 'coa-3001-capital',
  DOOR_SALES: 'coa-4001-sales',
  SALES_RETURNS: 'coa-4050-sales-returns',
  OTHER_INCOME: 'coa-4100-other-income',
  SCRAP_INCOME: 'coa-4110-scrap-income',
  RAW_MATERIAL_PURCHASES: 'coa-5001-purchases',
  FACTORY_LABOR: 'coa-5100-labor',
  ELECTRICITY_POWER: 'coa-5200-electricity',
  TRANSPORT_FREIGHT: 'coa-5210-freight',
  PLANT_MAINTENANCE: 'coa-5220-maintenance',
  RENT_OVERHEAD: 'coa-5230-rent',
  PACKAGING_EXPENSE: 'coa-5240-packaging',
  FUEL_DIESEL: 'coa-5250-fuel',
  MARKETING_COMMISSION: 'coa-5260-marketing',
  OFFICE_MISC_EXPENSE: 'coa-5290-misc',
} as const;

export const DEFAULT_CASH_BANK_IDS = {
  CASH: 'cb-cash-main',
  BANK: 'cb-bank-main',
} as const;

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function nextVoucherNumber(prefix: string, existingNumbers: string[]): string {
  const year = new Date().getFullYear();
  let maxSeq = 0;
  for (const num of existingNumbers) {
    const m = String(num).match(/(\d+)$/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

export function isDebitNormalGroup(group: AccountGroup): boolean {
  return group === 'ASSET' || group === 'EXPENSE';
}

function computeGst(
  subtotal: number,
  gstRate: number,
  gstMode: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT'
): { cgst: number; sgst: number; igst: number; taxAmount: number; totalAmount: number } {
  const cleanSub = Math.max(0, round2(subtotal));
  const rate = gstMode === 'EXEMPT' ? 0 : Math.max(0, Number(gstRate) || 0);
  const taxAmount = round2((cleanSub * rate) / 100);
  if (gstMode === 'INTER_STATE') {
    return { cgst: 0, sgst: 0, igst: taxAmount, taxAmount, totalAmount: round2(cleanSub + taxAmount) };
  }
  const half = round2(taxAmount / 2);
  const otherHalf = round2(taxAmount - half);
  return { cgst: half, sgst: otherHalf, igst: 0, taxAmount, totalAmount: round2(cleanSub + taxAmount) };
}

function createInitialStore(): AccountingLedgerStore {
  const now = new Date().toISOString();

  const accounts: ChartOfAccount[] = [
    // ASSETS
    { id: SYSTEM_ACCOUNT_IDS.CASH_IN_HAND, code: '1001', name: 'Cash in Hand', group: 'ASSET', subType: 'CASH', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'Primary factory & office cash drawer', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.MAIN_BANK, code: '1010', name: 'Primary Bank Account', group: 'ASSET', subType: 'BANK', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'Main factory current bank account (NEFT/UPI/Cheque)', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE, code: '1100', name: 'Accounts Receivable (Debtors)', group: 'ASSET', subType: 'RECEIVABLE', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'Customer & dealer receivables control account', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.GST_INPUT_CREDIT, code: '1200', name: 'GST Input Tax Credit (ITC)', group: 'ASSET', subType: 'TAX_INPUT', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'CGST/SGST/IGST paid on purchases & expenses', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.RAW_MATERIAL_INVENTORY, code: '1300', name: 'Raw Material & Finished Stock', group: 'ASSET', subType: 'INVENTORY', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Resin, fiber mat, WPC boards & hardware stock', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.PLANT_MACHINERY, code: '1500', name: 'Plant, Press & CNC Machinery', group: 'ASSET', subType: 'FIXED_ASSET', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Hydraulic presses, CNC routers & factory equipment', createdAt: now, updatedAt: now },

    // LIABILITIES
    { id: SYSTEM_ACCOUNT_IDS.ACCOUNTS_PAYABLE, code: '2001', name: 'Accounts Payable (Creditors)', group: 'LIABILITY', subType: 'PAYABLE', openingBalance: 0, openingType: 'CREDIT', isSystem: true, isActive: true, description: 'Supplier & vendor bills payable control account', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.GST_OUTPUT_PAYABLE, code: '2100', name: 'GST Output Payable', group: 'LIABILITY', subType: 'TAX_PAYABLE', openingBalance: 0, openingType: 'CREDIT', isSystem: true, isActive: true, description: 'CGST/SGST/IGST collected on sales invoices', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.CUSTOMER_ADVANCES, code: '2200', name: 'Customer Advances', group: 'LIABILITY', subType: 'CUSTOMER_ADVANCE', openingBalance: 0, openingType: 'CREDIT', isSystem: false, isActive: true, description: 'Advance deposits received prior to dispatch', createdAt: now, updatedAt: now },

    // EQUITY
    { id: SYSTEM_ACCOUNT_IDS.OWNER_CAPITAL, code: '3001', name: 'Owner Capital Account', group: 'EQUITY', subType: 'CAPITAL', openingBalance: 0, openingType: 'CREDIT', isSystem: true, isActive: true, description: 'Proprietor / partners capital investment', createdAt: now, updatedAt: now },

    // INCOME
    { id: SYSTEM_ACCOUNT_IDS.DOOR_SALES, code: '4001', name: 'FRP & WPC Door Sales', group: 'INCOME', subType: 'SALES', openingBalance: 0, openingType: 'CREDIT', isSystem: true, isActive: true, description: 'Primary door & frame sales revenue', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.SALES_RETURNS, code: '4050', name: 'Sales Returns & Credit Notes', group: 'INCOME', subType: 'SALES_RETURN', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'Contra-revenue account for customer credit notes', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.OTHER_INCOME, code: '4100', name: 'Other Income (Misc & Transport)', group: 'INCOME', subType: 'OTHER_INCOME', openingBalance: 0, openingType: 'CREDIT', isSystem: true, isActive: true, description: 'Transport recovery, interest, rent & misc income', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.SCRAP_INCOME, code: '4110', name: 'FRP / WPC Scrap Sales', group: 'INCOME', subType: 'OTHER_INCOME', openingBalance: 0, openingType: 'CREDIT', isSystem: false, isActive: true, description: 'Factory trim & scrap material sales', createdAt: now, updatedAt: now },

    // EXPENSES
    { id: SYSTEM_ACCOUNT_IDS.RAW_MATERIAL_PURCHASES, code: '5001', name: 'Raw Material Purchases', group: 'EXPENSE', subType: 'PURCHASE', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'Resin, fiberglass, WPC frames, locks & paint purchases', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.FACTORY_LABOR, code: '5100', name: 'Factory Labor & Gang Wages', group: 'EXPENSE', subType: 'DIRECT_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Production gang payouts & staff salaries', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.ELECTRICITY_POWER, code: '5200', name: 'Electricity & Generator Power', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'KSEB electricity bills & DG fuel', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.TRANSPORT_FREIGHT, code: '5210', name: 'Transport & Delivery Freight', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Delivery vehicle freight & logistics', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.PLANT_MAINTENANCE, code: '5220', name: 'Plant & Machine Maintenance', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'CNC tools, mold repair & machinery upkeep', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.RENT_OVERHEAD, code: '5230', name: 'Factory Rent & Overheads', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Workshop lease, water & facility overheads', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.PACKAGING_EXPENSE, code: '5240', name: 'Packaging & Bubble Wrap', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Corrugated sheets, tape, stickers & strapping', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.FUEL_DIESEL, code: '5250', name: 'Vehicle Fuel & Diesel', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Fleet diesel & petrol vouchers', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.MARKETING_COMMISSION, code: '5260', name: 'Sales Commission & Marketing', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: false, isActive: true, description: 'Salesperson incentives, showroom racks & ads', createdAt: now, updatedAt: now },
    { id: SYSTEM_ACCOUNT_IDS.OFFICE_MISC_EXPENSE, code: '5290', name: 'Office & Miscellaneous Expenses', group: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 0, openingType: 'DEBIT', isSystem: true, isActive: true, description: 'General office supplies, tea & misc expenses', createdAt: now, updatedAt: now },
  ];

  const expenseCategories: ExpenseCategory[] = [
    { id: 'expcat-labor', name: 'Factory Labor & Wages', linkedAccountId: SYSTEM_ACCOUNT_IDS.FACTORY_LABOR, description: 'Gang wages, helpers & overtime', createdAt: now },
    { id: 'expcat-electricity', name: 'Electricity & Power', linkedAccountId: SYSTEM_ACCOUNT_IDS.ELECTRICITY_POWER, description: 'KSEB power & generator running cost', createdAt: now },
    { id: 'expcat-transport', name: 'Transport & Freight', linkedAccountId: SYSTEM_ACCOUNT_IDS.TRANSPORT_FREIGHT, description: 'Delivery & loading transport charges', createdAt: now },
    { id: 'expcat-maintenance', name: 'Machine Maintenance', linkedAccountId: SYSTEM_ACCOUNT_IDS.PLANT_MAINTENANCE, description: 'Press, CNC & mold repair', createdAt: now },
    { id: 'expcat-rent', name: 'Rent & Facility', linkedAccountId: SYSTEM_ACCOUNT_IDS.RENT_OVERHEAD, description: 'Factory & showroom rent', createdAt: now },
    { id: 'expcat-packaging', name: 'Packaging Materials', linkedAccountId: SYSTEM_ACCOUNT_IDS.PACKAGING_EXPENSE, description: 'Bubble wrap, tape & labels', createdAt: now },
    { id: 'expcat-fuel', name: 'Fuel & Diesel', linkedAccountId: SYSTEM_ACCOUNT_IDS.FUEL_DIESEL, description: 'Delivery fleet diesel & petrol', createdAt: now },
    { id: 'expcat-marketing', name: 'Marketing & Commission', linkedAccountId: SYSTEM_ACCOUNT_IDS.MARKETING_COMMISSION, description: 'Ads, brochures & sales incentives', createdAt: now },
    { id: 'expcat-misc', name: 'Office & Misc Expenses', linkedAccountId: SYSTEM_ACCOUNT_IDS.OFFICE_MISC_EXPENSE, description: 'Tea, stationery & general expenses', isSystem: true, createdAt: now },
  ];

  const cashBankAccounts: CashBankAccount[] = [
    {
      id: DEFAULT_CASH_BANK_IDS.CASH,
      coaAccountId: SYSTEM_ACCOUNT_IDS.CASH_IN_HAND,
      name: 'Cash in Hand',
      accountType: 'CASH',
      openingBalance: 0,
      isDefault: true,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_CASH_BANK_IDS.BANK,
      coaAccountId: SYSTEM_ACCOUNT_IDS.MAIN_BANK,
      name: 'Primary Bank Account',
      accountType: 'BANK',
      bankName: 'Factory Current Account',
      openingBalance: 0,
      isDefault: false,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    version: 1,
    accounts,
    expenseCategories,
    cashBankAccounts,
    salesInvoices: [],
    paymentsIn: [],
    creditNotes: [],
    otherIncomes: [],
    purchaseBills: [],
    paymentsOut: [],
    expenses: [],
    contraTransfers: [],
    partyToPartyPayments: [],
    journals: [],
    settings: { gstEnabled: false },
    updatedAt: now,
  };
}

export function createInitialAccountingStore(gstEnabled = false): AccountingLedgerStore {
  const store = createInitialStore();
  store.settings = {
    gstEnabled: Boolean(gstEnabled),
    lockDate: undefined,
    closedYears: [],
  };
  return store;
}

export function readAccountingStore(): AccountingLedgerStore {
  const storePath = getDataFilePath(STORE_FILENAME);
  if (!fs.existsSync(storePath)) {
    const initial = createInitialStore();
    writeJsonSafe(storePath, initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8')) as Partial<AccountingLedgerStore>;
    const seed = createInitialStore();
    return {
      version: parsed.version || 1,
      settings: {
        gstEnabled: Boolean(parsed.settings?.gstEnabled ?? false),
        autoBillOnDelivery: parsed.settings?.autoBillOnDelivery !== false,
        lockDate: parsed.settings?.lockDate || undefined,
        closedYears: Array.isArray(parsed.settings?.closedYears) ? parsed.settings.closedYears : [],
      },
      accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : seed.accounts,
      expenseCategories:
        Array.isArray(parsed.expenseCategories) && parsed.expenseCategories.length > 0
          ? parsed.expenseCategories
          : seed.expenseCategories,
      cashBankAccounts:
        Array.isArray(parsed.cashBankAccounts) && parsed.cashBankAccounts.length > 0
          ? parsed.cashBankAccounts
          : seed.cashBankAccounts,
      salesInvoices: Array.isArray(parsed.salesInvoices) ? parsed.salesInvoices : [],
      paymentsIn: Array.isArray(parsed.paymentsIn) ? parsed.paymentsIn : [],
      creditNotes: Array.isArray(parsed.creditNotes) ? parsed.creditNotes : [],
      otherIncomes: Array.isArray(parsed.otherIncomes) ? parsed.otherIncomes : [],
      purchaseBills: Array.isArray(parsed.purchaseBills) ? parsed.purchaseBills : [],
      paymentsOut: Array.isArray(parsed.paymentsOut) ? parsed.paymentsOut : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      contraTransfers: Array.isArray(parsed.contraTransfers) ? parsed.contraTransfers : [],
      partyToPartyPayments: Array.isArray(parsed.partyToPartyPayments) ? parsed.partyToPartyPayments : [],
      journals: Array.isArray(parsed.journals) ? parsed.journals : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    const initial = createInitialStore();
    writeJsonSafe(storePath, initial);
    return initial;
  }
}

export function saveAccountingStore(store: AccountingLedgerStore): void {
  store.updatedAt = new Date().toISOString();
  writeJsonSafe(getDataFilePath(STORE_FILENAME), store);
}

/**
 * Blocks creating, modifying, or deleting vouchers/journals on or before a closed Financial Year lock date.
 */
export function assertDateNotLocked(store: AccountingLedgerStore, date: string, sourceType?: VoucherSourceType): void {
  if (sourceType === 'YEAR_CLOSE') return;
  const lockDate = store.settings?.lockDate;
  if (lockDate && date && date <= lockDate) {
    throw new Error(
      `Financial period is locked up to ${lockDate} (Year-End Closed). Choose a date after ${lockDate} or unlock the period in Accounting → FY Close & Lock.`
    );
  }
}

// ── Internal Journal Helpers ──────────────────────────────────────────────────

function findAccount(store: AccountingLedgerStore, accountId: string): ChartOfAccount {
  const found = store.accounts.find((a) => a.id === accountId);
  if (!found) throw new Error(`Chart of Accounts ledger not found: ${accountId}`);
  return found;
}

function buildJournalLines(
  store: AccountingLedgerStore,
  rawLines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }>
): { lines: JournalLine[]; totalDebit: number; totalCredit: number } {
  const lines: JournalLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const r of rawLines) {
    const dr = round2(Math.max(0, Number(r.debit) || 0));
    const cr = round2(Math.max(0, Number(r.credit) || 0));
    if (dr === 0 && cr === 0) continue;
    const acc = findAccount(store, r.accountId);
    lines.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      debit: dr,
      credit: cr,
      lineNote: r.lineNote?.trim() || undefined,
    });
    totalDebit = round2(totalDebit + dr);
    totalCredit = round2(totalCredit + cr);
  }

  if (lines.length < 2) {
    throw new Error('A journal entry must have at least 2 non-zero Debit/Credit lines.');
  }
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error(
      `Journal entry is out of balance: Total Debit (₹${totalDebit.toFixed(2)}) ≠ Total Credit (₹${totalCredit.toFixed(2)}).`
    );
  }
  return { lines, totalDebit, totalCredit };
}

function upsertSourceJournal(
  store: AccountingLedgerStore,
  input: {
    sourceType: VoucherSourceType;
    sourceId: string;
    date: string;
    reference?: string;
    partyName?: string;
    partyType?: PartyType;
    narration: string;
    lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }>;
    createdBy?: string;
  }
): JournalEntryRecord {
  assertDateNotLocked(store, input.date, input.sourceType);
  const { lines, totalDebit, totalCredit } = buildJournalLines(store, input.lines);
  const now = new Date().toISOString();
  const existingIdx = store.journals.findIndex(
    (j) => j.sourceType === input.sourceType && j.sourceId === input.sourceId
  );

  if (existingIdx >= 0) {
    const existing = store.journals[existingIdx];
    const updated: JournalEntryRecord = {
      ...existing,
      date: input.date,
      reference: input.reference,
      partyName: input.partyName,
      partyType: input.partyType,
      narration: input.narration,
      lines,
      totalDebit,
      totalCredit,
      updatedAt: now,
    };
    store.journals[existingIdx] = updated;
    return updated;
  }

  const created: JournalEntryRecord = {
    id: genId('jrn'),
    journalNumber: nextVoucherNumber('JRN', store.journals.map((j) => j.journalNumber)),
    date: input.date,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    partyName: input.partyName,
    partyType: input.partyType,
    reference: input.reference,
    narration: input.narration,
    lines,
    totalDebit,
    totalCredit,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  store.journals.unshift(created);
  return created;
}

function removeSourceJournal(store: AccountingLedgerStore, sourceType: VoucherSourceType, sourceId: string): void {
  const target = store.journals.find((j) => j.sourceType === sourceType && j.sourceId === sourceId);
  if (target) {
    assertDateNotLocked(store, target.date, target.sourceType);
  }
  store.journals = store.journals.filter((j) => !(j.sourceType === sourceType && j.sourceId === sourceId));
}

function recalculateInvoiceBalances(store: AccountingLedgerStore, invoiceId?: string): void {
  const targets = invoiceId
    ? store.salesInvoices.filter((inv) => inv.id === invoiceId)
    : store.salesInvoices;
  for (const inv of targets) {
    const paid = round2(
      store.paymentsIn
        .filter((p) => p.invoiceId === inv.id)
        .reduce((s, p) => s + p.amount, 0)
    );
    const credited = round2(
      store.creditNotes
        .filter((cn) => cn.invoiceId === inv.id)
        .reduce((s, cn) => s + cn.totalAmount, 0)
    );
    inv.paidAmount = paid;
    inv.creditNoteAmount = credited;
    inv.balanceAmount = round2(Math.max(0, inv.totalAmount - paid - credited));
    inv.status = inv.balanceAmount <= 0.01 ? 'PAID' : paid + credited > 0 ? 'PARTIAL' : 'UNPAID';
    inv.updatedAt = new Date().toISOString();
  }
}

function recalculatePurchaseBillBalances(store: AccountingLedgerStore, billId?: string): void {
  const targets = billId
    ? store.purchaseBills.filter((b) => b.id === billId)
    : store.purchaseBills;
  for (const bill of targets) {
    const paid = round2(
      store.paymentsOut
        .filter((p) => p.billId === bill.id)
        .reduce((s, p) => s + p.amount, 0)
    );
    bill.paidAmount = paid;
    bill.balanceAmount = round2(Math.max(0, bill.totalAmount - paid));
    bill.status = bill.balanceAmount <= 0.01 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
    bill.updatedAt = new Date().toISOString();
  }
}

// ── Balance Calculation Helpers ───────────────────────────────────────────────

export function computeAccountsWithBalances(
  store: AccountingLedgerStore,
  options?: { fromDate?: string; toDate?: string }
): ChartOfAccountWithBalance[] {
  const from = options?.fromDate || '';
  const to = options?.toDate || '';

  const stats = new Map<string, { dr: number; cr: number; count: number }>();
  for (const j of store.journals) {
    if (from && j.date < from) continue;
    if (to && j.date > to) continue;
    for (const line of j.lines) {
      const curr = stats.get(line.accountId) || { dr: 0, cr: 0, count: 0 };
      curr.dr = round2(curr.dr + line.debit);
      curr.cr = round2(curr.cr + line.credit);
      curr.count += 1;
      stats.set(line.accountId, curr);
    }
  }

  return store.accounts.map((acc) => {
    const st = stats.get(acc.id) || { dr: 0, cr: 0, count: 0 };
    const openSigned = acc.openingType === 'DEBIT' ? acc.openingBalance : -acc.openingBalance;
    const closingSigned = round2(openSigned + st.dr - st.cr);
    const closingType: BalanceSide =
      closingSigned > 0 ? 'DEBIT' : closingSigned < 0 ? 'CREDIT' : isDebitNormalGroup(acc.group) ? 'DEBIT' : 'CREDIT';

    const childCount = store.accounts.filter((a) => a.parentId === acc.id).length;
    let isDeletable = true;
    let deleteBlockReason: string | undefined = undefined;

    if (acc.isSystem) {
      isDeletable = false;
      deleteBlockReason = 'Core system control account';
    } else if (childCount > 0) {
      isDeletable = false;
      deleteBlockReason = `Has ${childCount} child sub-account(s)`;
    } else if (st.count > 0) {
      isDeletable = false;
      deleteBlockReason = `${st.count} posted voucher transaction(s)`;
    } else if (acc.openingBalance > 0) {
      isDeletable = false;
      deleteBlockReason = `Has opening balance of ₹${acc.openingBalance.toLocaleString('en-IN')}`;
    }

    return {
      ...acc,
      totalDebit: st.dr,
      totalCredit: st.cr,
      closingBalance: round2(Math.abs(closingSigned)),
      closingType,
      transactionCount: st.count,
      isDeletable,
      deleteBlockReason,
      childCount,
    };
  });
}

export function computeCashBankWithBalances(store: AccountingLedgerStore): CashBankAccountWithBalance[] {
  const accs = computeAccountsWithBalances(store);
  const accMap = new Map(accs.map((a) => [a.id, a]));
  return store.cashBankAccounts.map((cb) => {
    const coa = accMap.get(cb.coaAccountId);
    const totalInflow = coa?.totalDebit || 0;
    const totalOutflow = coa?.totalCredit || 0;
    const signed = round2(cb.openingBalance + totalInflow - totalOutflow);
    return {
      ...cb,
      totalInflow,
      totalOutflow,
      closingBalance: signed,
      transactionCount: coa?.transactionCount || 0,
    };
  });
}

// ── 1. CHART OF ACCOUNTS (CREATE / EDIT / DELETE) ─────────────────────────────

export interface AccountDeletabilityCheck {
  canDelete: boolean;
  reason?: string;
  isSystem: boolean;
  transactionCount: number;
  openingBalance: number;
  childCount: number;
}

export function checkAccountDeletability(
  id: string,
  store: AccountingLedgerStore = readAccountingStore()
): AccountDeletabilityCheck {
  const target = store.accounts.find((a) => a.id === id);
  if (!target) {
    return {
      canDelete: false,
      reason: 'Account not found in Chart of Accounts.',
      isSystem: false,
      transactionCount: 0,
      openingBalance: 0,
      childCount: 0,
    };
  }

  const isSystem = Boolean(target.isSystem);
  const childCount = store.accounts.filter((a) => a.parentId === id).length;

  let journalCount = 0;
  for (const j of store.journals) {
    for (const l of j.lines) {
      if (l.accountId === id) journalCount++;
    }
  }

  const openingBalance = Number(target.openingBalance) || 0;

  if (isSystem) {
    return {
      canDelete: false,
      reason: `"${target.name}" (${target.code}) is a core system control account and cannot be deleted.`,
      isSystem: true,
      transactionCount: journalCount,
      openingBalance,
      childCount,
    };
  }

  if (childCount > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete "${target.name}" because it has ${childCount} child sub-account(s). Reassign or delete sub-accounts first.`,
      isSystem: false,
      transactionCount: journalCount,
      openingBalance,
      childCount,
    };
  }

  if (journalCount > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete "${target.name}": ${journalCount} posted journal voucher(s) exist in the ledger. Under double-entry accounting standards, accounts with transaction history cannot be deleted to preserve financial audit integrity. Please deactivate this account instead.`,
      isSystem: false,
      transactionCount: journalCount,
      openingBalance,
      childCount,
    };
  }

  if (openingBalance > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete "${target.name}" because it has an opening balance of ₹${openingBalance.toLocaleString('en-IN')}. Set opening balance to zero first or deactivate the account.`,
      isSystem: false,
      transactionCount: 0,
      openingBalance,
      childCount,
    };
  }

  return {
    canDelete: true,
    isSystem: false,
    transactionCount: 0,
    openingBalance: 0,
    childCount: 0,
  };
}

export function listChartOfAccounts(): ChartOfAccountWithBalance[] {
  const store = readAccountingStore();
  return computeAccountsWithBalances(store).sort((a, b) => a.code.localeCompare(b.code));
}

export function createChartAccount(input: {
  code: string;
  name: string;
  group: AccountGroup;
  subType?: AccountSubType;
  parentId?: string;
  openingBalance?: number;
  openingType?: BalanceSide;
  description?: string;
}): ChartOfAccountWithBalance {
  const store = readAccountingStore();
  const code = String(input.code || '').trim().toUpperCase();
  const name = String(input.name || '').trim();
  const parentId = input.parentId ? String(input.parentId).trim() : undefined;

  if (!code) throw new Error('Account code is required (e.g. 5310).');
  if (!name) throw new Error('Account name is required.');
  if (store.accounts.some((a) => a.code.toLowerCase() === code.toLowerCase())) {
    throw new Error(`Account code "${code}" already exists.`);
  }
  if (store.accounts.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Account name "${name}" already exists.`);
  }

  let group = input.group;
  if (parentId) {
    const parent = store.accounts.find((a) => a.id === parentId);
    if (!parent) throw new Error('Selected parent account does not exist.');
    group = parent.group;
  }

  const defaultSubType: Record<AccountGroup, AccountSubType> = {
    ASSET: 'OTHER_ASSET',
    LIABILITY: 'OTHER_LIABILITY',
    EQUITY: 'CAPITAL',
    INCOME: 'OTHER_INCOME',
    EXPENSE: 'OPERATING_EXPENSE',
  };

  const now = new Date().toISOString();
  const created: ChartOfAccount = {
    id: genId('coa'),
    code,
    name,
    group,
    subType: input.subType || defaultSubType[group],
    parentId,
    openingBalance: Math.max(0, round2(Number(input.openingBalance) || 0)),
    openingType: input.openingType || (isDebitNormalGroup(group) ? 'DEBIT' : 'CREDIT'),
    isSystem: false,
    isActive: true,
    description: input.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  store.accounts.push(created);

  // If user creates a CASH or BANK account in COA, mirror it in Cash & Bank automatically
  if (created.subType === 'CASH' || created.subType === 'BANK') {
    store.cashBankAccounts.push({
      id: genId('cb'),
      coaAccountId: created.id,
      name: created.name,
      accountType: created.subType === 'CASH' ? 'CASH' : 'BANK',
      openingBalance: created.openingBalance,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  saveAccountingStore(store);
  return computeAccountsWithBalances(store).find((a) => a.id === created.id)!;
}

export function updateChartAccount(
  id: string,
  input: {
    code?: string;
    name?: string;
    group?: AccountGroup;
    subType?: AccountSubType;
    parentId?: string | null;
    openingBalance?: number;
    openingType?: BalanceSide;
    description?: string;
    isActive?: boolean;
  }
): ChartOfAccountWithBalance {
  const store = readAccountingStore();
  const idx = store.accounts.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Account not found.');

  const existing = store.accounts[idx];
  const nextCode = input.code !== undefined ? String(input.code).trim().toUpperCase() : existing.code;
  const nextName = input.name !== undefined ? String(input.name).trim() : existing.name;
  if (!nextCode || !nextName) throw new Error('Account code and name cannot be empty.');

  if (store.accounts.some((a) => a.id !== id && a.code.toLowerCase() === nextCode.toLowerCase())) {
    throw new Error(`Account code "${nextCode}" is already used by another account.`);
  }
  if (store.accounts.some((a) => a.id !== id && a.name.toLowerCase() === nextName.toLowerCase())) {
    throw new Error(`Account name "${nextName}" is already used by another account.`);
  }

  let nextParentId = existing.parentId;
  if (input.parentId !== undefined) {
    if (input.parentId === null || input.parentId === '') {
      nextParentId = undefined;
    } else {
      if (input.parentId === id) {
        throw new Error('An account cannot be its own parent.');
      }
      // Check for cyclic loops
      let currParent = store.accounts.find((a) => a.id === input.parentId);
      while (currParent) {
        if (currParent.id === id) {
          throw new Error('Circular parent-child account reference detected.');
        }
        currParent = currParent.parentId ? store.accounts.find((a) => a.id === currParent?.parentId) : undefined;
      }
      nextParentId = input.parentId;
    }
  }

  const nextGroup = existing.isSystem ? existing.group : input.group || existing.group;
  const nextOpening =
    input.openingBalance !== undefined ? Math.max(0, round2(Number(input.openingBalance) || 0)) : existing.openingBalance;

  store.accounts[idx] = {
    ...existing,
    code: nextCode,
    name: nextName,
    group: nextGroup,
    subType: existing.isSystem ? existing.subType : input.subType || existing.subType,
    parentId: nextParentId,
    openingBalance: nextOpening,
    openingType: input.openingType || existing.openingType,
    description: input.description !== undefined ? input.description.trim() : existing.description,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing.isActive,
    updatedAt: new Date().toISOString(),
  };

  // Keep linked Cash/Bank account and existing journal labels synced with new name/opening
  for (const cb of store.cashBankAccounts) {
    if (cb.coaAccountId === id) {
      cb.name = nextName;
      cb.openingBalance = nextOpening;
      cb.updatedAt = new Date().toISOString();
    }
  }
  for (const j of store.journals) {
    for (const line of j.lines) {
      if (line.accountId === id) {
        line.accountCode = nextCode;
        line.accountName = nextName;
      }
    }
  }

  saveAccountingStore(store);
  return computeAccountsWithBalances(store).find((a) => a.id === id)!;
}

export function deleteChartAccount(id: string): { deletedId: string; name: string } {
  const store = readAccountingStore();
  const target = store.accounts.find((a) => a.id === id);
  if (!target) throw new Error('Account not found.');

  const check = checkAccountDeletability(id, store);
  if (!check.canDelete) {
    throw new Error(check.reason || `Cannot delete "${target.name}": account has recorded transactions.`);
  }

  // Detach any expense category pointing to this account -> fallback to Office & Misc
  for (const cat of store.expenseCategories) {
    if (cat.linkedAccountId === id) {
      cat.linkedAccountId = SYSTEM_ACCOUNT_IDS.OFFICE_MISC_EXPENSE;
    }
  }
  store.cashBankAccounts = store.cashBankAccounts.filter((cb) => cb.coaAccountId !== id);
  store.accounts = store.accounts.filter((a) => a.id !== id);

  saveAccountingStore(store);
  return { deletedId: id, name: target.name };
}

// ── 2. EXPENSE CATEGORIES (CREATE & DELETE) ───────────────────────────────────

export function listExpenseCategories(): ExpenseCategory[] {
  return readAccountingStore().expenseCategories;
}

export function createExpenseCategory(input: { name: string; description?: string }): ExpenseCategory {
  const store = readAccountingStore();
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Expense category name is required.');
  if (store.expenseCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Expense category "${name}" already exists.`);
  }

  const now = new Date().toISOString();
  // Create or link a matching EXPENSE account in Chart of Accounts
  let linkedAccount = store.accounts.find(
    (a) => a.group === 'EXPENSE' && a.name.toLowerCase() === name.toLowerCase()
  );
  if (!linkedAccount) {
    const existingCodes = new Set(store.accounts.map((a) => a.code));
    let seq = 5300;
    while (existingCodes.has(String(seq))) seq += 1;
    linkedAccount = {
      id: genId('coa-exp'),
      code: String(seq),
      name,
      group: 'EXPENSE',
      subType: 'OPERATING_EXPENSE',
      openingBalance: 0,
      openingType: 'DEBIT',
      isSystem: false,
      isActive: true,
      description: input.description?.trim() || `Expense category ledger for ${name}`,
      createdAt: now,
      updatedAt: now,
    };
    store.accounts.push(linkedAccount);
  }

  const created: ExpenseCategory = {
    id: genId('expcat'),
    name,
    linkedAccountId: linkedAccount.id,
    description: input.description?.trim() || '',
    isSystem: false,
    createdAt: now,
  };
  store.expenseCategories.push(created);
  saveAccountingStore(store);
  return created;
}

export function deleteExpenseCategory(id: string): { deletedId: string; name: string; reassignedCount: number } {
  const store = readAccountingStore();
  const target = store.expenseCategories.find((c) => c.id === id);
  if (!target) throw new Error('Expense category not found.');
  if (target.isSystem) {
    throw new Error(`"${target.name}" is the default fallback category and cannot be deleted.`);
  }

  const fallback =
    store.expenseCategories.find((c) => c.isSystem) ||
    store.expenseCategories.find((c) => c.id !== id);
  if (!fallback) throw new Error('At least one expense category must remain.');

  let reassignedCount = 0;
  for (const exp of store.expenses) {
    if (exp.categoryId === id) {
      exp.categoryId = fallback.id;
      exp.categoryName = fallback.name;
      exp.linkedAccountId = fallback.linkedAccountId;
      reassignedCount += 1;
    }
  }

  store.expenseCategories = store.expenseCategories.filter((c) => c.id !== id);
  saveAccountingStore(store);
  return { deletedId: id, name: target.name, reassignedCount };
}

// ── 3. CASH & BANK ACCOUNTS + CONTRA TRANSFERS ────────────────────────────────

export function createCashBankAccount(input: {
  name: string;
  accountType: 'CASH' | 'BANK' | 'UPI_WALLET';
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  openingBalance?: number;
}): CashBankAccountWithBalance {
  const store = readAccountingStore();
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Cash/Bank account name is required.');
  if (store.cashBankAccounts.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Cash/Bank account "${name}" already exists.`);
  }

  const now = new Date().toISOString();
  const existingCodes = new Set(store.accounts.map((a) => a.code));
  let seq = input.accountType === 'CASH' ? 1002 : 1011;
  while (existingCodes.has(String(seq))) seq += 1;
  const openBal = Math.max(0, round2(Number(input.openingBalance) || 0));

  const coaAcc: ChartOfAccount = {
    id: genId('coa-cb'),
    code: String(seq),
    name,
    group: 'ASSET',
    subType: input.accountType === 'CASH' ? 'CASH' : 'BANK',
    openingBalance: openBal,
    openingType: 'DEBIT',
    isSystem: false,
    isActive: true,
    description: input.bankName ? `${input.bankName} ${input.accountNumber || ''}`.trim() : name,
    createdAt: now,
    updatedAt: now,
  };
  store.accounts.push(coaAcc);

  const created: CashBankAccount = {
    id: genId('cb'),
    coaAccountId: coaAcc.id,
    name,
    accountType: input.accountType,
    bankName: input.bankName?.trim() || undefined,
    accountNumber: input.accountNumber?.trim() || undefined,
    ifsc: input.ifsc?.trim().toUpperCase() || undefined,
    upiId: input.upiId?.trim() || undefined,
    openingBalance: openBal,
    isDefault: false,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
  store.cashBankAccounts.push(created);
  saveAccountingStore(store);
  return computeCashBankWithBalances(store).find((c) => c.id === created.id)!;
}

export function updateCashBankAccount(
  id: string,
  input: Partial<Pick<CashBankAccount, 'name' | 'bankName' | 'accountNumber' | 'ifsc' | 'upiId' | 'openingBalance'>>
): CashBankAccountWithBalance {
  const store = readAccountingStore();
  const idx = store.cashBankAccounts.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Cash/Bank account not found.');

  const existing = store.cashBankAccounts[idx];
  const nextName = input.name !== undefined ? String(input.name).trim() : existing.name;
  const nextOpen =
    input.openingBalance !== undefined ? Math.max(0, round2(Number(input.openingBalance) || 0)) : existing.openingBalance;

  store.cashBankAccounts[idx] = {
    ...existing,
    name: nextName || existing.name,
    bankName: input.bankName !== undefined ? input.bankName.trim() : existing.bankName,
    accountNumber: input.accountNumber !== undefined ? input.accountNumber.trim() : existing.accountNumber,
    ifsc: input.ifsc !== undefined ? input.ifsc.trim().toUpperCase() : existing.ifsc,
    upiId: input.upiId !== undefined ? input.upiId.trim() : existing.upiId,
    openingBalance: nextOpen,
    updatedAt: new Date().toISOString(),
  };

  const coa = store.accounts.find((a) => a.id === existing.coaAccountId);
  if (coa) {
    coa.name = nextName || coa.name;
    coa.openingBalance = nextOpen;
    coa.updatedAt = new Date().toISOString();
  }

  saveAccountingStore(store);
  return computeCashBankWithBalances(store).find((c) => c.id === id)!;
}

export function deleteCashBankAccount(id: string): { deletedId: string; name: string } {
  const store = readAccountingStore();
  const target = store.cashBankAccounts.find((c) => c.id === id);
  if (!target) throw new Error('Cash/Bank account not found.');
  if (target.isSystem) throw new Error(`"${target.name}" is a default Cash/Bank ledger and cannot be deleted.`);

  const hasTx = store.journals.some((j) => j.lines.some((l) => l.accountId === target.coaAccountId));
  if (hasTx) {
    throw new Error(`Cannot delete "${target.name}" because it has recorded Cash/Bank transactions.`);
  }

  store.cashBankAccounts = store.cashBankAccounts.filter((c) => c.id !== id);
  store.accounts = store.accounts.filter((a) => a.id !== target.coaAccountId);
  saveAccountingStore(store);
  return { deletedId: id, name: target.name };
}

export function createContraTransfer(input: {
  date?: string;
  transferType: 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'BANK_TRANSFER';
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
}): ContraTransferRecord {
  const store = readAccountingStore();
  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error('Transfer amount must be greater than zero.');
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Source and destination Cash/Bank accounts must be different.');
  }

  const fromCb = store.cashBankAccounts.find((c) => c.id === input.fromAccountId);
  const toCb = store.cashBankAccounts.find((c) => c.id === input.toAccountId);
  if (!fromCb || !toCb) throw new Error('Invalid source or destination Cash/Bank account.');

  const date = input.date || todayIso();
  const id = genId('ctr');
  const voucherNumber = nextVoucherNumber('CTR', store.contraTransfers.map((c) => c.voucherNumber));

  const journal = upsertSourceJournal(store, {
    sourceType: 'CONTRA',
    sourceId: id,
    date,
    reference: input.referenceNumber || voucherNumber,
    narration: input.notes?.trim() || `${input.transferType.replace(/_/g, ' ')}: ${fromCb.name} → ${toCb.name}`,
    lines: [
      { accountId: toCb.coaAccountId, debit: amount, credit: 0, lineNote: `Received from ${fromCb.name}` },
      { accountId: fromCb.coaAccountId, debit: 0, credit: amount, lineNote: `Transferred to ${toCb.name}` },
    ],
    createdBy: input.createdBy,
  });

  const record: ContraTransferRecord = {
    id,
    voucherNumber,
    date,
    transferType: input.transferType,
    fromAccountId: fromCb.id,
    fromAccountName: fromCb.name,
    toAccountId: toCb.id,
    toAccountName: toCb.name,
    amount,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: new Date().toISOString(),
  };
  store.contraTransfers.unshift(record);
  saveAccountingStore(store);
  return record;
}

export function deleteContraTransfer(id: string): void {
  const store = readAccountingStore();
  const exists = store.contraTransfers.some((c) => c.id === id);
  if (!exists) throw new Error('Contra transfer not found.');
  store.contraTransfers = store.contraTransfers.filter((c) => c.id !== id);
  removeSourceJournal(store, 'CONTRA', id);
  saveAccountingStore(store);
}

// ── 3.5 PARTY TO PARTY PAYMENTS & SETTLEMENTS ─────────────────────────────────

export function listPartyToPartyPayments(filter?: {
  fromDate?: string;
  toDate?: string;
  search?: string;
}): PartyToPartyPaymentRecord[] {
  const store = readAccountingStore();
  let list = store.partyToPartyPayments || [];
  if (filter?.fromDate) {
    list = list.filter((p) => p.date >= filter.fromDate!);
  }
  if (filter?.toDate) {
    list = list.filter((p) => p.date <= filter.toDate!);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.voucherNumber.toLowerCase().includes(q) ||
        p.fromPartyName.toLowerCase().includes(q) ||
        p.toPartyName.toLowerCase().includes(q) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
        (p.narration && p.narration.toLowerCase().includes(q))
    );
  }
  return [...list].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
  );
}

export function createPartyToPartyPayment(input: {
  date?: string;
  fromPartyId?: string;
  fromPartyName: string;
  fromPartyType?: PartyType;
  fromAccountId?: string;
  toPartyId?: string;
  toPartyName: string;
  toPartyType?: PartyType;
  toAccountId?: string;
  amount: number;
  paymentMode?: PartyToPartyPaymentMode;
  referenceNumber?: string;
  narration?: string;
  createdBy?: string;
}): PartyToPartyPaymentRecord {
  const store = readAccountingStore();
  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const fromPartyName = String(input.fromPartyName || '').trim();
  const toPartyName = String(input.toPartyName || '').trim();
  if (!fromPartyName) throw new Error('From Party (paying party) name is required.');
  if (!toPartyName) throw new Error('To Party (receiving party) name is required.');
  if (fromPartyName.toLowerCase() === toPartyName.toLowerCase()) {
    throw new Error('From Party and To Party cannot be the same entity.');
  }

  const fromPartyType: PartyType = input.fromPartyType || 'CUSTOMER';
  const toPartyType: PartyType = input.toPartyType || 'SUPPLIER';
  const paymentMode: PartyToPartyPaymentMode = input.paymentMode || 'BOOK_ADJUSTMENT';

  // Resolve COA Account for From Party (Credit side: liability increases or asset/receivable decreases)
  let fromAcc = input.fromAccountId ? store.accounts.find((a) => a.id === input.fromAccountId) : undefined;
  if (!fromAcc) {
    if (fromPartyType === 'CUSTOMER') {
      fromAcc = store.accounts.find((a) => a.id === SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE) || store.accounts[0];
    } else {
      fromAcc = store.accounts.find((a) => a.id === SYSTEM_ACCOUNT_IDS.ACCOUNTS_PAYABLE) || store.accounts[0];
    }
  }

  // Resolve COA Account for To Party (Debit side: asset increases or liability/payable decreases)
  let toAcc = input.toAccountId ? store.accounts.find((a) => a.id === input.toAccountId) : undefined;
  if (!toAcc) {
    if (toPartyType === 'SUPPLIER' || toPartyType === 'CONTRACTOR') {
      toAcc = store.accounts.find((a) => a.id === SYSTEM_ACCOUNT_IDS.ACCOUNTS_PAYABLE) || store.accounts[0];
    } else {
      toAcc = store.accounts.find((a) => a.id === SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE) || store.accounts[0];
    }
  }

  const date = input.date || todayIso();
  const id = genId('p2p');
  const existingVouchers = (store.partyToPartyPayments || []).map((p) => p.voucherNumber);
  const voucherNumber = nextVoucherNumber('P2P', existingVouchers);

  const narration =
    input.narration?.trim() ||
    `Party-to-Party Payment ${voucherNumber}: ${fromPartyName} (${fromPartyType}) settled ₹${amount.toLocaleString('en-IN')} directly to ${toPartyName} (${toPartyType}) via ${paymentMode.replace(/_/g, ' ')}`;

  const journal = upsertSourceJournal(store, {
    sourceType: 'PARTY_TO_PARTY',
    sourceId: id,
    date,
    reference: input.referenceNumber || voucherNumber,
    partyName: `${fromPartyName} → ${toPartyName}`,
    partyType: fromPartyType,
    narration,
    lines: [
      {
        accountId: toAcc.id,
        debit: amount,
        credit: 0,
        lineNote: `Settlement received from ${fromPartyName} (${paymentMode.replace(/_/g, ' ')})`,
      },
      {
        accountId: fromAcc.id,
        debit: 0,
        credit: amount,
        lineNote: `Settlement paid to ${toPartyName} (${paymentMode.replace(/_/g, ' ')})`,
      },
    ],
    createdBy: input.createdBy,
  });

  const record: PartyToPartyPaymentRecord = {
    id,
    voucherNumber,
    date,
    fromPartyId: input.fromPartyId?.trim() || undefined,
    fromPartyName,
    fromPartyType,
    fromAccountId: fromAcc.id,
    fromAccountName: fromAcc.name,
    toPartyId: input.toPartyId?.trim() || undefined,
    toPartyName,
    toPartyType,
    toAccountId: toAcc.id,
    toAccountName: toAcc.name,
    amount,
    paymentMode,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    narration,
    journalEntryId: journal.id,
    createdBy: input.createdBy?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (!store.partyToPartyPayments) {
    store.partyToPartyPayments = [];
  }
  store.partyToPartyPayments.unshift(record);
  saveAccountingStore(store);
  return record;
}

export function deletePartyToPartyPayment(id: string): void {
  const store = readAccountingStore();
  const exists = (store.partyToPartyPayments || []).some((p) => p.id === id);
  if (!exists) throw new Error('Party to Party payment record not found.');
  store.partyToPartyPayments = (store.partyToPartyPayments || []).filter((p) => p.id !== id);
  removeSourceJournal(store, 'PARTY_TO_PARTY', id);
  saveAccountingStore(store);
}

// ── 4. SALES MODULE (INVOICE, PAYMENT IN, CREDIT NOTE, OTHER INCOME) ──────────

export function createSalesInvoice(input: {
  date?: string;
  dueDate?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  orderRef?: string;
  items: Array<{ description: string; hsnCode?: string; qty: number; unit?: string; rate: number }>;
  gstRate?: number;
  gstMode?: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
  eWayBillNo?: string;
  notes?: string;
  createdBy?: string;
}): SalesInvoiceRecord {
  const store = readAccountingStore();
  const customerName = String(input.customerName || '').trim();
  if (!customerName) throw new Error('Customer name is required.');

  const items: InvoiceLineItem[] = (input.items || [])
    .filter((i) => i.description && Number(i.qty) > 0 && Number(i.rate) >= 0)
    .map((i, idx) => ({
      id: `item-${idx + 1}`,
      description: i.description.trim(),
      hsnCode: i.hsnCode?.trim() || '39252000',
      qty: Number(i.qty) || 1,
      unit: i.unit || 'Nos',
      rate: round2(Number(i.rate) || 0),
      amount: round2((Number(i.qty) || 1) * (Number(i.rate) || 0)),
    }));
  if (items.length === 0) throw new Error('Add at least one invoice line item.');

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  if (subtotal <= 0) throw new Error('Invoice subtotal must be greater than zero.');

  const gstEnabled = Boolean(store.settings?.gstEnabled);
  const gstMode = gstEnabled ? input.gstMode || 'INTRA_STATE' : 'EXEMPT';
  const gstRate = !gstEnabled || gstMode === 'EXEMPT' ? 0 : Number(input.gstRate ?? 18);
  const tax = computeGst(subtotal, gstRate, gstMode);
  const date = input.date || todayIso();
  const dueDate = input.dueDate || date;
  const id = genId('sinv');
  const invoiceNumber = nextVoucherNumber(
    gstEnabled ? 'SINV' : 'SALE',
    store.salesInvoices.map((i) => i.invoiceNumber)
  );
  const now = new Date().toISOString();

  const journalLines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }> = [
    { accountId: SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE, debit: tax.totalAmount, credit: 0, lineNote: `Receivable: ${customerName}` },
    { accountId: SYSTEM_ACCOUNT_IDS.DOOR_SALES, debit: 0, credit: subtotal, lineNote: `${gstEnabled ? 'Sales Invoice' : 'Sales Entry'} ${invoiceNumber}` },
  ];
  if (tax.taxAmount > 0) {
    journalLines.push({
      accountId: SYSTEM_ACCOUNT_IDS.GST_OUTPUT_PAYABLE,
      debit: 0,
      credit: tax.taxAmount,
      lineNote: `Output GST (${gstRate}%)`,
    });
  }

  const journal = upsertSourceJournal(store, {
    sourceType: 'SALES_INVOICE',
    sourceId: id,
    date,
    reference: invoiceNumber,
    partyName: customerName,
    partyType: 'CUSTOMER',
    narration: `${gstEnabled ? 'Sales Invoice' : 'Sales Entry'} ${invoiceNumber} to ${customerName}${input.orderRef ? ` (${input.orderRef})` : ''}`,
    lines: journalLines,
    createdBy: input.createdBy,
  });

  const record: SalesInvoiceRecord = {
    id,
    invoiceNumber,
    date,
    dueDate,
    customerId: input.customerId,
    customerName,
    customerPhone: input.customerPhone?.trim() || undefined,
    customerGstin: input.customerGstin?.trim().toUpperCase() || undefined,
    orderRef: input.orderRef?.trim() || undefined,
    items,
    subtotal,
    gstRate,
    gstMode,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    taxAmount: tax.taxAmount,
    totalAmount: tax.totalAmount,
    paidAmount: 0,
    creditNoteAmount: 0,
    balanceAmount: tax.totalAmount,
    status: 'UNPAID',
    eWayBillNo: input.eWayBillNo?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: now,
    updatedAt: now,
  };

  store.salesInvoices.unshift(record);
  saveAccountingStore(store);
  return record;
}

export function deleteSalesInvoice(id: string): void {
  const store = readAccountingStore();
  if (!store.salesInvoices.some((i) => i.id === id)) throw new Error('Sales invoice not found.');
  if (store.paymentsIn.some((p) => p.invoiceId === id)) {
    throw new Error('Cannot delete invoice with linked Payment In receipts. Delete receipts first.');
  }
  store.salesInvoices = store.salesInvoices.filter((i) => i.id !== id);
  removeSourceJournal(store, 'SALES_INVOICE', id);
  saveAccountingStore(store);
}

export function createPaymentIn(input: {
  date?: string;
  customerId?: string;
  customerName: string;
  invoiceId?: string;
  cashBankAccountId: string;
  paymentMode: AccountingPaymentMode;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  collectionType?: 'DIRECT_BANK' | 'CASH_IN_HAND' | 'UPI_QR';
  createdBy?: string;
}): PaymentInRecord {
  const store = readAccountingStore();
  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error('Receipt amount must be greater than zero.');
  const customerName = String(input.customerName || '').trim();
  if (!customerName) throw new Error('Customer name is required.');

  const cb = store.cashBankAccounts.find((c) => c.id === input.cashBankAccountId) || store.cashBankAccounts[0];
  if (!cb) throw new Error('Select a Cash or Bank account.');

  const linkedInv = input.invoiceId ? store.salesInvoices.find((i) => i.id === input.invoiceId) : undefined;
  const date = input.date || todayIso();
  const id = genId('pin');
  const receiptNumber = nextVoucherNumber('RCPT', store.paymentsIn.map((p) => p.receiptNumber));

  const journal = upsertSourceJournal(store, {
    sourceType: 'PAYMENT_IN',
    sourceId: id,
    date,
    reference: input.referenceNumber || receiptNumber,
    partyName: customerName,
    partyType: 'CUSTOMER',
    narration: `Payment In ${receiptNumber} from ${customerName}${linkedInv ? ` against ${linkedInv.invoiceNumber}` : ''}${input.salespersonName ? ` (Collected by: ${input.salespersonName})` : ''}`,
    lines: [
      { accountId: cb.coaAccountId, debit: amount, credit: 0, lineNote: `${input.paymentMode} receipt into ${cb.name}` },
      { accountId: SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, lineNote: `Received from ${customerName}` },
    ],
    createdBy: input.createdBy,
  });

  const record: PaymentInRecord = {
    id,
    receiptNumber,
    date,
    customerId: input.customerId || linkedInv?.customerId,
    customerName,
    invoiceId: linkedInv?.id,
    invoiceNumber: linkedInv?.invoiceNumber,
    cashBankAccountId: cb.id,
    cashBankAccountName: cb.name,
    paymentMode: input.paymentMode || 'UPI',
    amount,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    salespersonId: input.salespersonId?.trim() || undefined,
    salespersonName: input.salespersonName?.trim() || undefined,
    salespersonCode: input.salespersonCode?.trim() || undefined,
    collectionType: input.collectionType || (input.paymentMode === 'CASH' ? 'CASH_IN_HAND' : 'DIRECT_BANK'),
    journalEntryId: journal.id,
    createdAt: new Date().toISOString(),
  };

  store.paymentsIn.unshift(record);
  if (linkedInv) recalculateInvoiceBalances(store, linkedInv.id);
  saveAccountingStore(store);
  return record;
}

export function deletePaymentIn(id: string): void {
  const store = readAccountingStore();
  const target = store.paymentsIn.find((p) => p.id === id);
  if (!target) throw new Error('Payment In receipt not found.');
  store.paymentsIn = store.paymentsIn.filter((p) => p.id !== id);
  removeSourceJournal(store, 'PAYMENT_IN', id);
  if (target.invoiceId) recalculateInvoiceBalances(store, target.invoiceId);
  saveAccountingStore(store);
}

export function createCreditNote(input: {
  date?: string;
  customerId?: string;
  customerName: string;
  invoiceId?: string;
  reason: string;
  subtotal: number;
  gstRate?: number;
  gstMode?: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
  notes?: string;
  createdBy?: string;
}): SalesReturnCreditNoteRecord {
  const store = readAccountingStore();
  const customerName = String(input.customerName || '').trim();
  const subtotal = round2(Number(input.subtotal) || 0);
  if (!customerName) throw new Error('Customer name is required.');
  if (subtotal <= 0) throw new Error('Credit note taxable amount must be greater than zero.');

  const gstEnabled = Boolean(store.settings?.gstEnabled);
  const linkedInv = input.invoiceId ? store.salesInvoices.find((i) => i.id === input.invoiceId) : undefined;
  const gstMode = gstEnabled ? input.gstMode || linkedInv?.gstMode || 'INTRA_STATE' : 'EXEMPT';
  const gstRate = !gstEnabled || gstMode === 'EXEMPT' ? 0 : Number(input.gstRate ?? linkedInv?.gstRate ?? 18);
  const tax = computeGst(subtotal, gstRate, gstMode);

  const date = input.date || todayIso();
  const id = genId('cn');
  const creditNoteNumber = nextVoucherNumber('CN', store.creditNotes.map((c) => c.creditNoteNumber));

  const lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }> = [
    { accountId: SYSTEM_ACCOUNT_IDS.SALES_RETURNS, debit: subtotal, credit: 0, lineNote: `Sales Return: ${input.reason}` },
    { accountId: SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE, debit: 0, credit: tax.totalAmount, lineNote: `Credit to ${customerName}` },
  ];
  if (tax.taxAmount > 0) {
    lines.push({
      accountId: SYSTEM_ACCOUNT_IDS.GST_OUTPUT_PAYABLE,
      debit: tax.taxAmount,
      credit: 0,
      lineNote: `GST Reversal (${gstRate}%)`,
    });
  }

  const journal = upsertSourceJournal(store, {
    sourceType: 'CREDIT_NOTE',
    sourceId: id,
    date,
    reference: creditNoteNumber,
    partyName: customerName,
    partyType: 'CUSTOMER',
    narration: `Sales Return / Credit Note ${creditNoteNumber} — ${customerName} (${input.reason})`,
    lines,
    createdBy: input.createdBy,
  });

  const record: SalesReturnCreditNoteRecord = {
    id,
    creditNoteNumber,
    date,
    customerId: input.customerId || linkedInv?.customerId,
    customerName,
    invoiceId: linkedInv?.id,
    invoiceNumber: linkedInv?.invoiceNumber,
    reason: input.reason?.trim() || 'Sales Return',
    subtotal,
    gstRate,
    gstMode,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    taxAmount: tax.taxAmount,
    totalAmount: tax.totalAmount,
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: new Date().toISOString(),
  };

  store.creditNotes.unshift(record);
  if (linkedInv) recalculateInvoiceBalances(store, linkedInv.id);
  saveAccountingStore(store);
  return record;
}

export function deleteCreditNote(id: string): void {
  const store = readAccountingStore();
  const target = store.creditNotes.find((c) => c.id === id);
  if (!target) throw new Error('Credit note not found.');
  store.creditNotes = store.creditNotes.filter((c) => c.id !== id);
  removeSourceJournal(store, 'CREDIT_NOTE', id);
  if (target.invoiceId) recalculateInvoiceBalances(store, target.invoiceId);
  saveAccountingStore(store);
}

export function createOtherIncome(input: {
  date?: string;
  incomeAccountId?: string;
  cashBankAccountId: string;
  paymentMode: AccountingPaymentMode;
  receivedFrom: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
}): OtherIncomeRecord {
  const store = readAccountingStore();
  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error('Income amount must be greater than zero.');
  const receivedFrom = String(input.receivedFrom || '').trim() || 'Direct Receipt';

  const incomeAcc =
    store.accounts.find((a) => a.id === input.incomeAccountId && a.group === 'INCOME') ||
    findAccount(store, SYSTEM_ACCOUNT_IDS.OTHER_INCOME);
  const cb = store.cashBankAccounts.find((c) => c.id === input.cashBankAccountId) || store.cashBankAccounts[0];
  if (!cb) throw new Error('Select a Cash/Bank account.');

  const date = input.date || todayIso();
  const id = genId('oinc');
  const voucherNumber = nextVoucherNumber('INC', store.otherIncomes.map((i) => i.voucherNumber));

  const journal = upsertSourceJournal(store, {
    sourceType: 'OTHER_INCOME',
    sourceId: id,
    date,
    reference: input.referenceNumber || voucherNumber,
    partyName: receivedFrom,
    partyType: 'OTHER',
    narration: `Other Income ${voucherNumber} (${incomeAcc.name}) from ${receivedFrom}`,
    lines: [
      { accountId: cb.coaAccountId, debit: amount, credit: 0, lineNote: `Deposited to ${cb.name}` },
      { accountId: incomeAcc.id, debit: 0, credit: amount, lineNote: input.notes?.trim() || receivedFrom },
    ],
    createdBy: input.createdBy,
  });

  const record: OtherIncomeRecord = {
    id,
    voucherNumber,
    date,
    incomeAccountId: incomeAcc.id,
    incomeAccountName: incomeAcc.name,
    cashBankAccountId: cb.id,
    cashBankAccountName: cb.name,
    paymentMode: input.paymentMode || 'CASH',
    receivedFrom,
    amount,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: new Date().toISOString(),
  };

  store.otherIncomes.unshift(record);
  saveAccountingStore(store);
  return record;
}

export function deleteOtherIncome(id: string): void {
  const store = readAccountingStore();
  if (!store.otherIncomes.some((i) => i.id === id)) throw new Error('Other income entry not found.');
  store.otherIncomes = store.otherIncomes.filter((i) => i.id !== id);
  removeSourceJournal(store, 'OTHER_INCOME', id);
  saveAccountingStore(store);
}

// ── 5. PURCHASES & EXPENSES MODULE (BILL, PAYMENT OUT, EXPENSE) ───────────────

export function createPurchaseBill(input: {
  date?: string;
  dueDate?: string;
  vendorBillNo?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierGstin?: string;
  items: Array<{ description: string; hsnCode?: string; qty: number; unit?: string; rate: number }>;
  gstRate?: number;
  gstMode?: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
  notes?: string;
  createdBy?: string;
}): PurchaseBillRecord {
  const store = readAccountingStore();
  const supplierName = String(input.supplierName || '').trim();
  if (!supplierName) throw new Error('Supplier name is required.');

  const items: InvoiceLineItem[] = (input.items || [])
    .filter((i) => i.description && Number(i.qty) > 0 && Number(i.rate) >= 0)
    .map((i, idx) => ({
      id: `pitem-${idx + 1}`,
      description: i.description.trim(),
      hsnCode: i.hsnCode?.trim() || '',
      qty: Number(i.qty) || 1,
      unit: i.unit || 'Units',
      rate: round2(Number(i.rate) || 0),
      amount: round2((Number(i.qty) || 1) * (Number(i.rate) || 0)),
    }));
  if (items.length === 0) throw new Error('Add at least one purchase line item.');

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  if (subtotal <= 0) throw new Error('Purchase bill subtotal must be greater than zero.');

  const gstEnabled = Boolean(store.settings?.gstEnabled);
  const gstMode = gstEnabled ? input.gstMode || 'INTRA_STATE' : 'EXEMPT';
  const gstRate = !gstEnabled || gstMode === 'EXEMPT' ? 0 : Number(input.gstRate ?? 18);
  const tax = computeGst(subtotal, gstRate, gstMode);
  const date = input.date || todayIso();
  const dueDate = input.dueDate || date;
  const id = genId('pbill');
  const billNumber = nextVoucherNumber('PBILL', store.purchaseBills.map((b) => b.billNumber));
  const now = new Date().toISOString();

  const lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }> = [
    { accountId: SYSTEM_ACCOUNT_IDS.RAW_MATERIAL_PURCHASES, debit: subtotal, credit: 0, lineNote: `Purchase Bill ${billNumber}` },
    { accountId: SYSTEM_ACCOUNT_IDS.ACCOUNTS_PAYABLE, debit: 0, credit: tax.totalAmount, lineNote: `Payable: ${supplierName}` },
  ];
  if (tax.taxAmount > 0) {
    lines.push({
      accountId: SYSTEM_ACCOUNT_IDS.GST_INPUT_CREDIT,
      debit: tax.taxAmount,
      credit: 0,
      lineNote: `Input GST Credit (${gstRate}%)`,
    });
  }

  const journal = upsertSourceJournal(store, {
    sourceType: 'PURCHASE_BILL',
    sourceId: id,
    date,
    reference: input.vendorBillNo || billNumber,
    partyName: supplierName,
    partyType: 'SUPPLIER',
    narration: `Purchase Bill ${billNumber} from ${supplierName}${input.vendorBillNo ? ` (Ref: ${input.vendorBillNo})` : ''}`,
    lines,
    createdBy: input.createdBy,
  });

  const record: PurchaseBillRecord = {
    id,
    billNumber,
    vendorBillNo: input.vendorBillNo?.trim() || undefined,
    date,
    dueDate,
    supplierName,
    supplierPhone: input.supplierPhone?.trim() || undefined,
    supplierGstin: input.supplierGstin?.trim().toUpperCase() || undefined,
    items,
    subtotal,
    gstRate,
    gstMode,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    taxAmount: tax.taxAmount,
    totalAmount: tax.totalAmount,
    paidAmount: 0,
    balanceAmount: tax.totalAmount,
    status: 'UNPAID',
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: now,
    updatedAt: now,
  };

  store.purchaseBills.unshift(record);
  saveAccountingStore(store);
  return record;
}

export function deletePurchaseBill(id: string): void {
  const store = readAccountingStore();
  if (!store.purchaseBills.some((b) => b.id === id)) throw new Error('Purchase bill not found.');
  if (store.paymentsOut.some((p) => p.billId === id)) {
    throw new Error('Cannot delete purchase bill with linked Payment Out vouchers. Delete payouts first.');
  }
  store.purchaseBills = store.purchaseBills.filter((b) => b.id !== id);
  removeSourceJournal(store, 'PURCHASE_BILL', id);
  saveAccountingStore(store);
}

export function createPaymentOut(input: {
  date?: string;
  supplierName: string;
  billId?: string;
  cashBankAccountId: string;
  paymentMode: AccountingPaymentMode;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
}): PaymentOutRecord {
  const store = readAccountingStore();
  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
  const supplierName = String(input.supplierName || '').trim();
  if (!supplierName) throw new Error('Supplier name is required.');

  const cb = store.cashBankAccounts.find((c) => c.id === input.cashBankAccountId) || store.cashBankAccounts[0];
  if (!cb) throw new Error('Select a Cash or Bank account.');

  const linkedBill = input.billId ? store.purchaseBills.find((b) => b.id === input.billId) : undefined;
  const date = input.date || todayIso();
  const id = genId('pout');
  const voucherNumber = nextVoucherNumber('PAY', store.paymentsOut.map((p) => p.voucherNumber));

  const journal = upsertSourceJournal(store, {
    sourceType: 'PAYMENT_OUT',
    sourceId: id,
    date,
    reference: input.referenceNumber || voucherNumber,
    partyName: supplierName,
    partyType: 'SUPPLIER',
    narration: `Payment Out ${voucherNumber} to ${supplierName}${linkedBill ? ` against ${linkedBill.billNumber}` : ''}`,
    lines: [
      { accountId: SYSTEM_ACCOUNT_IDS.ACCOUNTS_PAYABLE, debit: amount, credit: 0, lineNote: `Paid to ${supplierName}` },
      { accountId: cb.coaAccountId, debit: 0, credit: amount, lineNote: `${input.paymentMode} from ${cb.name}` },
    ],
    createdBy: input.createdBy,
  });

  const record: PaymentOutRecord = {
    id,
    voucherNumber,
    date,
    supplierName,
    billId: linkedBill?.id,
    billNumber: linkedBill?.billNumber,
    cashBankAccountId: cb.id,
    cashBankAccountName: cb.name,
    paymentMode: input.paymentMode || 'NEFT',
    amount,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: new Date().toISOString(),
  };

  store.paymentsOut.unshift(record);
  if (linkedBill) recalculatePurchaseBillBalances(store, linkedBill.id);
  saveAccountingStore(store);
  return record;
}

export function deletePaymentOut(id: string): void {
  const store = readAccountingStore();
  const target = store.paymentsOut.find((p) => p.id === id);
  if (!target) throw new Error('Payment Out voucher not found.');
  store.paymentsOut = store.paymentsOut.filter((p) => p.id !== id);
  removeSourceJournal(store, 'PAYMENT_OUT', id);
  if (target.billId) recalculatePurchaseBillBalances(store, target.billId);
  saveAccountingStore(store);
}

export function createExpense(input: {
  date?: string;
  categoryId: string;
  cashBankAccountId: string;
  paymentMode: AccountingPaymentMode;
  payeeName: string;
  subtotal: number;
  gstRate?: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
}): ExpenseRecord {
  const store = readAccountingStore();
  const subtotal = round2(Number(input.subtotal) || 0);
  if (subtotal <= 0) throw new Error('Expense amount must be greater than zero.');

  const cat = store.expenseCategories.find((c) => c.id === input.categoryId);
  if (!cat) throw new Error('Selected expense category does not exist.');

  const cb = store.cashBankAccounts.find((c) => c.id === input.cashBankAccountId) || store.cashBankAccounts[0];
  if (!cb) throw new Error('Select a Cash or Bank account.');

  const gstEnabled = Boolean(store.settings?.gstEnabled);
  const gstRate = gstEnabled ? Math.max(0, Number(input.gstRate) || 0) : 0;
  const taxAmount = round2((subtotal * gstRate) / 100);
  const totalAmount = round2(subtotal + taxAmount);

  const date = input.date || todayIso();
  const id = genId('exp');
  const voucherNumber = nextVoucherNumber('EXP', store.expenses.map((e) => e.voucherNumber));
  const payeeName = String(input.payeeName || '').trim() || cat.name;

  const expenseAccountId = store.accounts.some((a) => a.id === cat.linkedAccountId)
    ? cat.linkedAccountId
    : SYSTEM_ACCOUNT_IDS.OFFICE_MISC_EXPENSE;

  const lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }> = [
    { accountId: expenseAccountId, debit: subtotal, credit: 0, lineNote: `${cat.name}: ${payeeName}` },
    { accountId: cb.coaAccountId, debit: 0, credit: totalAmount, lineNote: `${input.paymentMode} from ${cb.name}` },
  ];
  if (taxAmount > 0) {
    lines.push({
      accountId: SYSTEM_ACCOUNT_IDS.GST_INPUT_CREDIT,
      debit: taxAmount,
      credit: 0,
      lineNote: `Expense Input GST (${gstRate}%)`,
    });
  }

  const journal = upsertSourceJournal(store, {
    sourceType: 'EXPENSE',
    sourceId: id,
    date,
    reference: input.referenceNumber || voucherNumber,
    partyName: payeeName,
    partyType: 'OTHER',
    narration: `Expense ${voucherNumber} [${cat.name}] — ${payeeName}`,
    lines,
    createdBy: input.createdBy,
  });

  const record: ExpenseRecord = {
    id,
    voucherNumber,
    date,
    categoryId: cat.id,
    categoryName: cat.name,
    linkedAccountId: expenseAccountId,
    cashBankAccountId: cb.id,
    cashBankAccountName: cb.name,
    paymentMode: input.paymentMode || 'CASH',
    payeeName,
    subtotal,
    gstRate,
    taxAmount,
    totalAmount,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    journalEntryId: journal.id,
    createdAt: new Date().toISOString(),
  };

  store.expenses.unshift(record);
  saveAccountingStore(store);
  return record;
}

export function deleteExpense(id: string): void {
  const store = readAccountingStore();
  if (!store.expenses.some((e) => e.id === id)) throw new Error('Expense voucher not found.');
  store.expenses = store.expenses.filter((e) => e.id !== id);
  removeSourceJournal(store, 'EXPENSE', id);
  saveAccountingStore(store);
}

// ── 6. MANUAL JOURNAL ENTRIES ─────────────────────────────────────────────────

export function createManualJournal(input: {
  date?: string;
  reference?: string;
  narration: string;
  lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }>;
  createdBy?: string;
}): JournalEntryRecord {
  const store = readAccountingStore();
  const narration = String(input.narration || '').trim();
  if (!narration) throw new Error('Journal narration is required.');
  const date = input.date || todayIso();
  assertDateNotLocked(store, date, 'MANUAL');

  const { lines, totalDebit, totalCredit } = buildJournalLines(store, input.lines);
  const now = new Date().toISOString();
  const created: JournalEntryRecord = {
    id: genId('jrn'),
    journalNumber: nextVoucherNumber('JRN', store.journals.map((j) => j.journalNumber)),
    date: input.date || todayIso(),
    sourceType: 'MANUAL',
    reference: input.reference?.trim() || undefined,
    narration,
    lines,
    totalDebit,
    totalCredit,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  store.journals.unshift(created);
  saveAccountingStore(store);
  return created;
}

export function updateManualJournal(
  id: string,
  input: {
    date?: string;
    reference?: string;
    narration: string;
    lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }>;
  }
): JournalEntryRecord {
  const store = readAccountingStore();
  const idx = store.journals.findIndex((j) => j.id === id);
  if (idx < 0) throw new Error('Journal entry not found.');
  const existing = store.journals[idx];
  if (existing.sourceType !== 'MANUAL') {
    throw new Error('Auto-posted system journals cannot be edited here. Edit or delete the source voucher instead.');
  }
  assertDateNotLocked(store, existing.date, 'MANUAL');
  assertDateNotLocked(store, input.date || existing.date, 'MANUAL');

  const { lines, totalDebit, totalCredit } = buildJournalLines(store, input.lines);
  const updated: JournalEntryRecord = {
    ...existing,
    date: input.date || existing.date,
    reference: input.reference?.trim() || undefined,
    narration: String(input.narration || '').trim() || existing.narration,
    lines,
    totalDebit,
    totalCredit,
    updatedAt: new Date().toISOString(),
  };
  store.journals[idx] = updated;
  saveAccountingStore(store);
  return updated;
}

export function deleteManualJournal(id: string): void {
  const store = readAccountingStore();
  const target = store.journals.find((j) => j.id === id);
  if (!target) throw new Error('Journal entry not found.');
  if (target.sourceType !== 'MANUAL') {
    throw new Error('Auto-posted system journals cannot be deleted directly. Delete the originating Sales/Purchase/Expense voucher instead.');
  }
  assertDateNotLocked(store, target.date, 'MANUAL');
  store.journals = store.journals.filter((j) => j.id !== id);
  saveAccountingStore(store);
}

// ── 7. ACCOUNT STATEMENT (BY COA ACCOUNT OR BY PARTY) ─────────────────────────

export function getAccountStatement(params: {
  mode?: 'ACCOUNT' | 'PARTY';
  accountId?: string;
  partyName?: string;
  partyType?: 'CUSTOMER' | 'SUPPLIER';
  fromDate?: string;
  toDate?: string;
}): AccountStatementResponse {
  const store = readAccountingStore();
  const fromDate = params.fromDate || `${new Date().getFullYear()}-01-01`;
  const toDate = params.toDate || todayIso();

  const sortedJournals = [...store.journals].sort((a, b) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)
  );

  if (params.mode === 'PARTY' && params.partyName) {
    const partyLower = params.partyName.trim().toLowerCase();
    const controlAccId =
      params.partyType === 'SUPPLIER'
        ? SYSTEM_ACCOUNT_IDS.ACCOUNTS_PAYABLE
        : SYSTEM_ACCOUNT_IDS.ACCOUNTS_RECEIVABLE;

    let openSigned = 0;
    const rawLines: Array<{
      date: string;
      voucherNumber: string;
      sourceType: VoucherSourceType;
      particulars: string;
      reference?: string;
      debit: number;
      credit: number;
    }> = [];

    for (const j of sortedJournals) {
      const jParty = (j.partyName || '').trim().toLowerCase();
      const isMatch =
        jParty === partyLower ||
        (j.sourceType === 'PARTY_TO_PARTY' &&
          (jParty.includes(partyLower) ||
            j.narration.toLowerCase().includes(partyLower) ||
            j.lines.some((l) => (l.lineNote || '').toLowerCase().includes(partyLower))));
      if (!isMatch) continue;
      for (const l of j.lines) {
        if (l.accountId !== controlAccId) continue;
        if (j.date < fromDate) {
          openSigned = round2(openSigned + l.debit - l.credit);
        } else if (j.date <= toDate) {
          rawLines.push({
            date: j.date,
            voucherNumber: j.reference || j.journalNumber,
            sourceType: j.sourceType,
            particulars: j.narration,
            reference: j.journalNumber,
            debit: l.debit,
            credit: l.credit,
          });
        }
      }
    }

    let running = openSigned;
    let totalDebit = 0;
    let totalCredit = 0;
    const lines: AccountStatementLine[] = rawLines.map((rl) => {
      running = round2(running + rl.debit - rl.credit);
      totalDebit = round2(totalDebit + rl.debit);
      totalCredit = round2(totalCredit + rl.credit);
      return {
        ...rl,
        runningBalance: round2(Math.abs(running)),
        runningBalanceType: running >= 0 ? 'DEBIT' : 'CREDIT',
      };
    });

    return {
      mode: 'PARTY',
      title: params.partyName.trim(),
      subtitle: params.partyType === 'SUPPLIER' ? 'Supplier Payable Statement' : 'Customer Receivable Statement',
      fromDate,
      toDate,
      openingBalance: round2(Math.abs(openSigned)),
      openingType: openSigned >= 0 ? 'DEBIT' : 'CREDIT',
      totalDebit,
      totalCredit,
      closingBalance: round2(Math.abs(running)),
      closingType: running >= 0 ? 'DEBIT' : 'CREDIT',
      lines,
    };
  }

  // Default: COA Account Statement
  const account =
    store.accounts.find((a) => a.id === params.accountId) ||
    store.accounts.find((a) => a.id === SYSTEM_ACCOUNT_IDS.CASH_IN_HAND) ||
    store.accounts[0];

  let openSigned = account.openingType === 'DEBIT' ? account.openingBalance : -account.openingBalance;
  const periodEntries: Array<{
    date: string;
    voucherNumber: string;
    sourceType: VoucherSourceType;
    particulars: string;
    reference?: string;
    debit: number;
    credit: number;
  }> = [];

  for (const j of sortedJournals) {
    for (const l of j.lines) {
      if (l.accountId !== account.id) continue;
      if (j.date < fromDate) {
        openSigned = round2(openSigned + l.debit - l.credit);
      } else if (j.date <= toDate) {
        const counterNames = j.lines
          .filter((x) => x.accountId !== account.id)
          .map((x) => x.accountName)
          .slice(0, 2)
          .join(', ');
        periodEntries.push({
          date: j.date,
          voucherNumber: j.reference || j.journalNumber,
          sourceType: j.sourceType,
          particulars: l.lineNote ? `${j.narration} — ${l.lineNote}` : counterNames ? `${j.narration} (${counterNames})` : j.narration,
          reference: j.journalNumber,
          debit: l.debit,
          credit: l.credit,
        });
      }
    }
  }

  let running = openSigned;
  let totalDebit = 0;
  let totalCredit = 0;
  const lines: AccountStatementLine[] = periodEntries.map((pe) => {
    running = round2(running + pe.debit - pe.credit);
    totalDebit = round2(totalDebit + pe.debit);
    totalCredit = round2(totalCredit + pe.credit);
    return {
      ...pe,
      runningBalance: round2(Math.abs(running)),
      runningBalanceType: running >= 0 ? 'DEBIT' : 'CREDIT',
    };
  });

  return {
    mode: 'ACCOUNT',
    title: `${account.code} — ${account.name}`,
    subtitle: `${account.group} Ledger Statement (${account.subType.replace(/_/g, ' ')})`,
    fromDate,
    toDate,
    openingBalance: round2(Math.abs(openSigned)),
    openingType: openSigned >= 0 ? 'DEBIT' : 'CREDIT',
    totalDebit,
    totalCredit,
    closingBalance: round2(Math.abs(running)),
    closingType: running >= 0 ? 'DEBIT' : 'CREDIT',
    lines,
  };
}

// ── 8. ALL 8 ACCOUNTS REPORTS ─────────────────────────────────────────────────

export function generateAccountingReport(
  type: AccountingReportType,
  options?: { fromDate?: string; toDate?: string }
) {
  const store = readAccountingStore();
  const fromDate = options?.fromDate || `${new Date().getFullYear()}-01-01`;
  const toDate = options?.toDate || todayIso();

  const periodAccounts = computeAccountsWithBalances(store, { fromDate, toDate });
  const cumulativeAccounts = computeAccountsWithBalances(store, { toDate });

  const inRange = (d: string) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate);

  if (type === 'PNL') {
    const incomeAccounts = periodAccounts
      .filter((a) => a.group === 'INCOME')
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        subType: a.subType,
        amount: round2(a.totalCredit - a.totalDebit), // positive for revenue, negative for Sales Returns
      }));

    const expenseAccounts = periodAccounts
      .filter((a) => a.group === 'EXPENSE')
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        subType: a.subType,
        amount: round2(a.totalDebit - a.totalCredit),
      }));

    const directExpenses = expenseAccounts.filter((e) => e.subType === 'PURCHASE' || e.subType === 'DIRECT_EXPENSE');
    const operatingExpenses = expenseAccounts.filter((e) => e.subType !== 'PURCHASE' && e.subType !== 'DIRECT_EXPENSE');

    const totalRevenue = round2(incomeAccounts.reduce((s, a) => s + a.amount, 0));
    const totalDirectCost = round2(directExpenses.reduce((s, a) => s + a.amount, 0));
    const grossProfit = round2(totalRevenue - totalDirectCost);
    const totalOperatingExpenses = round2(operatingExpenses.reduce((s, a) => s + a.amount, 0));
    const netProfit = round2(grossProfit - totalOperatingExpenses);

    return {
      reportType: 'PNL',
      title: 'Profit & Loss (P&L) Statement',
      fromDate,
      toDate,
      incomeAccounts,
      directExpenses,
      operatingExpenses,
      summary: {
        totalRevenue,
        totalDirectCost,
        grossProfit,
        totalOperatingExpenses,
        netProfit,
        netMarginPct: totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0,
      },
    };
  }

  if (type === 'BALANCE_SHEET') {
    // Signed net = openingSigned + dr - cr
    const signedOf = (a: ChartOfAccountWithBalance) => {
      const openSigned = a.openingType === 'DEBIT' ? a.openingBalance : -a.openingBalance;
      return round2(openSigned + a.totalDebit - a.totalCredit);
    };

    const assets = cumulativeAccounts
      .filter((a) => a.group === 'ASSET')
      .map((a) => ({ id: a.id, code: a.code, name: a.name, subType: a.subType, amount: signedOf(a) }));
    const liabilities = cumulativeAccounts
      .filter((a) => a.group === 'LIABILITY')
      .map((a) => ({ id: a.id, code: a.code, name: a.name, subType: a.subType, amount: round2(-signedOf(a)) }));
    const equity = cumulativeAccounts
      .filter((a) => a.group === 'EQUITY')
      .map((a) => ({ id: a.id, code: a.code, name: a.name, subType: a.subType, amount: round2(-signedOf(a)) }));

    // Cumulative Net Profit (Income credit net - Expense debit net)
    const netProfit = round2(
      cumulativeAccounts
        .filter((a) => a.group === 'INCOME')
        .reduce((s, a) => s + round2(-signedOf(a)), 0) -
        cumulativeAccounts
          .filter((a) => a.group === 'EXPENSE')
          .reduce((s, a) => s + signedOf(a), 0)
    );

    // Opening Balance Equity offset (nonzero only if user set one-sided opening balances)
    const openingDiff = round2(
      cumulativeAccounts.reduce(
        (s, a) => s + (a.openingType === 'DEBIT' ? a.openingBalance : -a.openingBalance),
        0
      )
    );

    const totalAssets = round2(assets.reduce((s, a) => s + a.amount, 0));
    const totalLiabilities = round2(liabilities.reduce((s, l) => s + l.amount, 0));
    const totalEquityBase = round2(equity.reduce((s, e) => s + e.amount, 0));
    const totalEquityWithProfit = round2(totalEquityBase + netProfit + openingDiff);
    const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquityWithProfit);

    return {
      reportType: 'BALANCE_SHEET',
      title: 'Balance Sheet',
      asOfDate: toDate,
      assets,
      liabilities,
      equity,
      currentPeriodNetProfit: netProfit,
      openingBalanceAdjustment: openingDiff,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity: totalEquityWithProfit,
        totalLiabilitiesAndEquity,
        difference: round2(totalAssets - totalLiabilitiesAndEquity),
        isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      },
    };
  }

  if (type === 'TRIAL_BALANCE') {
    const rows = cumulativeAccounts.map((a) => {
      const closingDr = a.closingType === 'DEBIT' ? a.closingBalance : 0;
      const closingCr = a.closingType === 'CREDIT' ? a.closingBalance : 0;
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        group: a.group,
        openingDebit: a.openingType === 'DEBIT' ? a.openingBalance : 0,
        openingCredit: a.openingType === 'CREDIT' ? a.openingBalance : 0,
        periodDebit: a.totalDebit,
        periodCredit: a.totalCredit,
        closingDebit: closingDr,
        closingCredit: closingCr,
      };
    });

    const totalPeriodDebit = round2(rows.reduce((s, r) => s + r.periodDebit, 0));
    const totalPeriodCredit = round2(rows.reduce((s, r) => s + r.periodCredit, 0));
    const totalClosingDebit = round2(rows.reduce((s, r) => s + r.closingDebit, 0));
    const totalClosingCredit = round2(rows.reduce((s, r) => s + r.closingCredit, 0));

    return {
      reportType: 'TRIAL_BALANCE',
      title: 'Trial Balance',
      asOfDate: toDate,
      rows,
      summary: {
        totalPeriodDebit,
        totalPeriodCredit,
        totalClosingDebit,
        totalClosingCredit,
        difference: round2(totalClosingDebit - totalClosingCredit),
        isBalanced: Math.abs(totalClosingDebit - totalClosingCredit) < 0.01,
      },
    };
  }

  if (type === 'DAY_BOOK') {
    const entries = store.journals
      .filter((j) => inRange(j.date))
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
      .map((j) => ({
        id: j.id,
        date: j.date,
        voucherNumber: j.reference || j.journalNumber,
        journalNumber: j.journalNumber,
        sourceType: j.sourceType,
        partyName: j.partyName || '-',
        narration: j.narration,
        debit: j.totalDebit,
        credit: j.totalCredit,
        lineCount: j.lines.length,
      }));
    return {
      reportType: 'DAY_BOOK',
      title: 'Accounting Day Book (All Vouchers)',
      fromDate,
      toDate,
      entries,
      summary: {
        voucherCount: entries.length,
        totalTurnover: round2(entries.reduce((s, e) => s + e.debit, 0)),
      },
    };
  }

  if (type === 'CASH_BANK_SUMMARY') {
    const accounts = computeCashBankWithBalances(store);
    return {
      reportType: 'CASH_BANK_SUMMARY',
      title: 'Cash & Bank Flow Summary',
      fromDate,
      toDate,
      accounts,
      summary: {
        totalOpening: round2(accounts.reduce((s, a) => s + a.openingBalance, 0)),
        totalInflow: round2(accounts.reduce((s, a) => s + a.totalInflow, 0)),
        totalOutflow: round2(accounts.reduce((s, a) => s + a.totalOutflow, 0)),
        totalClosing: round2(accounts.reduce((s, a) => s + a.closingBalance, 0)),
      },
    };
  }

  if (type === 'AGING') {
    const refMs = new Date(toDate).getTime();
    const bucketOf = (dueDate: string) => {
      const days = Math.floor((refMs - new Date(dueDate).getTime()) / 86400000);
      if (days <= 0) return 'current';
      if (days <= 30) return 'd1_30';
      if (days <= 60) return 'd31_60';
      if (days <= 90) return 'd61_90';
      return 'd90_plus';
    };

    const arMap = new Map<string, { party: string; current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number }>();
    for (const inv of store.salesInvoices) {
      if (inv.balanceAmount <= 0.01) continue;
      const row = arMap.get(inv.customerName) || { party: inv.customerName, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
      const b = bucketOf(inv.dueDate);
      row[b] = round2(row[b] + inv.balanceAmount);
      row.total = round2(row.total + inv.balanceAmount);
      arMap.set(inv.customerName, row);
    }

    const apMap = new Map<string, { party: string; current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number }>();
    for (const bill of store.purchaseBills) {
      if (bill.balanceAmount <= 0.01) continue;
      const row = apMap.get(bill.supplierName) || { party: bill.supplierName, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
      const b = bucketOf(bill.dueDate);
      row[b] = round2(row[b] + bill.balanceAmount);
      row.total = round2(row.total + bill.balanceAmount);
      apMap.set(bill.supplierName, row);
    }

    const receivables = Array.from(arMap.values()).sort((a, b) => b.total - a.total);
    const payables = Array.from(apMap.values()).sort((a, b) => b.total - a.total);
    return {
      reportType: 'AGING',
      title: 'Receivables & Payables Aging',
      asOfDate: toDate,
      receivables,
      payables,
      summary: {
        totalReceivables: round2(receivables.reduce((s, r) => s + r.total, 0)),
        totalPayables: round2(payables.reduce((s, p) => s + p.total, 0)),
      },
    };
  }

  if (type === 'EXPENSE_BY_CATEGORY') {
    const filtered = store.expenses.filter((e) => inRange(e.date));
    const map = new Map<string, { categoryId: string; categoryName: string; count: number; subtotal: number; taxAmount: number; totalAmount: number }>();
    for (const e of filtered) {
      const curr = map.get(e.categoryId) || {
        categoryId: e.categoryId,
        categoryName: e.categoryName,
        count: 0,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
      curr.count += 1;
      curr.subtotal = round2(curr.subtotal + e.subtotal);
      curr.taxAmount = round2(curr.taxAmount + e.taxAmount);
      curr.totalAmount = round2(curr.totalAmount + e.totalAmount);
      map.set(e.categoryId, curr);
    }
    const grandTotal = round2(filtered.reduce((s, e) => s + e.totalAmount, 0));
    const categories = Array.from(map.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((c) => ({
        ...c,
        sharePct: grandTotal > 0 ? round2((c.totalAmount / grandTotal) * 100) : 0,
      }));

    return {
      reportType: 'EXPENSE_BY_CATEGORY',
      title: 'Category-Wise Expense Summary',
      fromDate,
      toDate,
      categories,
      summary: {
        expenseCount: filtered.length,
        totalAmount: grandTotal,
      },
    };
  }

  if (type === 'PARTY_TO_PARTY') {
    const list = (store.partyToPartyPayments || []).filter((p) => inRange(p.date));
    const sorted = [...list].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    );
    const totalAmount = round2(sorted.reduce((s, p) => s + p.amount, 0));

    const modeCounts: Record<string, { count: number; total: number }> = {};
    for (const p of sorted) {
      const mode = p.paymentMode || 'BOOK_ADJUSTMENT';
      if (!modeCounts[mode]) modeCounts[mode] = { count: 0, total: 0 };
      modeCounts[mode].count += 1;
      modeCounts[mode].total = round2(modeCounts[mode].total + p.amount);
    }

    return {
      reportType: 'PARTY_TO_PARTY',
      title: 'Party to Party Payment & Settlement Register',
      fromDate,
      toDate,
      payments: sorted,
      summary: {
        totalSettlements: sorted.length,
        totalAmount,
        modeBreakdown: modeCounts,
      },
    };
  }

  if (type === 'SALESMAN_COLLECTION') {
    const list = store.paymentsIn.filter((p) => inRange(p.date));
    const smMap = new Map<string, {
      salespersonId?: string;
      salespersonName: string;
      salespersonCode?: string;
      receiptCount: number;
      totalCollected: number;
      cashAmount: number;
      bankAmount: number;
      upiAmount: number;
      otherAmount: number;
      receipts: PaymentInRecord[];
    }>();

    for (const p of list) {
      const smName = (p.salespersonName || '').trim() || 'Direct / House';
      const curr = smMap.get(smName) || {
        salespersonId: p.salespersonId,
        salespersonName: smName,
        salespersonCode: p.salespersonCode,
        receiptCount: 0,
        totalCollected: 0,
        cashAmount: 0,
        bankAmount: 0,
        upiAmount: 0,
        otherAmount: 0,
        receipts: [],
      };
      curr.receiptCount += 1;
      curr.totalCollected = round2(curr.totalCollected + p.amount);
      if (p.paymentMode === 'CASH') curr.cashAmount = round2(curr.cashAmount + p.amount);
      else if (p.paymentMode === 'UPI') curr.upiAmount = round2(curr.upiAmount + p.amount);
      else if (p.paymentMode === 'NEFT' || p.paymentMode === 'RTGS' || p.paymentMode === 'CHEQUE' || p.paymentMode === 'CARD') curr.bankAmount = round2(curr.bankAmount + p.amount);
      else curr.otherAmount = round2(curr.otherAmount + p.amount);
      curr.receipts.push(p);
      smMap.set(smName, curr);
    }

    const salesmen = Array.from(smMap.values()).sort((a, b) => b.totalCollected - a.totalCollected);
    const totalCollected = round2(list.reduce((s, p) => s + p.amount, 0));
    const cashTotal = round2(list.filter((p) => p.paymentMode === 'CASH').reduce((s, p) => s + p.amount, 0));
    const bankTotal = round2(list.filter((p) => ['NEFT', 'RTGS', 'CHEQUE', 'CARD'].includes(p.paymentMode)).reduce((s, p) => s + p.amount, 0));
    const upiTotal = round2(list.filter((p) => p.paymentMode === 'UPI').reduce((s, p) => s + p.amount, 0));

    return {
      reportType: 'SALESMAN_COLLECTION',
      title: 'Salesman-Wise Payment In & Collection Recovery',
      fromDate,
      toDate,
      salesmen,
      summary: {
        totalCollections: totalCollected,
        totalReceipts: list.length,
        cashTotal,
        bankTotal,
        upiTotal,
        activeSalesmenCount: salesmen.length,
      },
    };
  }

  if (type === 'CUSTOMER_CREDIT_SUMMARY') {
    const custMap = new Map<string, {
      customerId?: string;
      customerName: string;
      salespersonName?: string;
      salespersonCode?: string;
      creditLimit: number;
      totalInvoiced: number;
      totalPaid: number;
      creditNoteAmount: number;
      outstandingBalance: number;
      unpaidInvoicesCount: number;
    }>();

    for (const inv of store.salesInvoices) {
      const cName = inv.customerName.trim();
      const curr = custMap.get(cName) || {
        customerId: inv.customerId,
        customerName: cName,
        creditLimit: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        creditNoteAmount: 0,
        outstandingBalance: 0,
        unpaidInvoicesCount: 0,
      };
      curr.totalInvoiced = round2(curr.totalInvoiced + inv.totalAmount);
      curr.totalPaid = round2(curr.totalPaid + inv.paidAmount);
      curr.creditNoteAmount = round2(curr.creditNoteAmount + inv.creditNoteAmount);
      curr.outstandingBalance = round2(curr.outstandingBalance + inv.balanceAmount);
      if (inv.balanceAmount > 0.01) curr.unpaidInvoicesCount += 1;
      custMap.set(cName, curr);
    }

    for (const p of store.paymentsIn) {
      if (!p.invoiceId) {
        const cName = p.customerName.trim();
        const curr = custMap.get(cName) || {
          customerId: p.customerId,
          customerName: cName,
          creditLimit: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          creditNoteAmount: 0,
          outstandingBalance: 0,
          unpaidInvoicesCount: 0,
        };
        curr.totalPaid = round2(curr.totalPaid + p.amount);
        curr.outstandingBalance = round2(curr.outstandingBalance - p.amount);
        if (p.salespersonName && !curr.salespersonName) {
          curr.salespersonName = p.salespersonName;
          curr.salespersonCode = p.salespersonCode;
        }
        custMap.set(cName, curr);
      }
    }

    const customers = Array.from(custMap.values()).sort((a, b) => b.outstandingBalance - a.outstandingBalance);
    const totalOutstanding = round2(customers.reduce((s, c) => s + Math.max(0, c.outstandingBalance), 0));
    const totalInvoiced = round2(customers.reduce((s, c) => s + c.totalInvoiced, 0));
    const totalPaid = round2(customers.reduce((s, c) => s + c.totalPaid, 0));

    return {
      reportType: 'CUSTOMER_CREDIT_SUMMARY',
      title: 'Customer-Wise Credit Balance & Outstanding Summary',
      asOfDate: toDate,
      customers,
      summary: {
        totalCustomers: customers.length,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        customersWithBalanceCount: customers.filter((c) => c.outstandingBalance > 0.01).length,
      },
    };
  }

  // GST_SUMMARY
  const salesIn = store.salesInvoices.filter((i) => inRange(i.date));
  const cnIn = store.creditNotes.filter((c) => inRange(c.date));
  const billsIn = store.purchaseBills.filter((b) => inRange(b.date));
  const expIn = store.expenses.filter((e) => inRange(e.date));

  const outputCgst = round2(salesIn.reduce((s, i) => s + i.cgst, 0) - cnIn.reduce((s, c) => s + c.cgst, 0));
  const outputSgst = round2(salesIn.reduce((s, i) => s + i.sgst, 0) - cnIn.reduce((s, c) => s + c.sgst, 0));
  const outputIgst = round2(salesIn.reduce((s, i) => s + i.igst, 0) - cnIn.reduce((s, c) => s + c.igst, 0));
  const totalOutputGst = round2(outputCgst + outputSgst + outputIgst);

  const inputCgst = round2(billsIn.reduce((s, b) => s + b.cgst, 0) + expIn.reduce((s, e) => s + round2(e.taxAmount / 2), 0));
  const inputSgst = round2(billsIn.reduce((s, b) => s + b.sgst, 0) + expIn.reduce((s, e) => s + round2(e.taxAmount - round2(e.taxAmount / 2)), 0));
  const inputIgst = round2(billsIn.reduce((s, b) => s + b.igst, 0));
  const totalInputGst = round2(inputCgst + inputSgst + inputIgst);

  return {
    reportType: 'GST_SUMMARY',
    title: 'GST Tax Summary (GSTR-1 Output vs. Input ITC)',
    fromDate,
    toDate,
    summary: {
      taxableSales: round2(salesIn.reduce((s, i) => s + i.subtotal, 0) - cnIn.reduce((s, c) => s + c.subtotal, 0)),
      outputCgst,
      outputSgst,
      outputIgst,
      totalOutputGst,
      taxablePurchasesAndExpenses: round2(
        billsIn.reduce((s, b) => s + b.subtotal, 0) + expIn.reduce((s, e) => s + e.subtotal, 0)
      ),
      inputCgst,
      inputSgst,
      inputIgst,
      totalInputGst,
      netGstPayable: round2(totalOutputGst - totalInputGst),
    },
  };
}

// ── 9. OVERVIEW SNAPSHOT ──────────────────────────────────────────────────────

export function updateAccountingSettings(input: {
  gstEnabled?: boolean;
  autoBillOnDelivery?: boolean;
  lockDate?: string | null;
  closedYears?: FinancialYearCloseRecord[];
}): { gstEnabled: boolean; autoBillOnDelivery: boolean; lockDate?: string; closedYears?: FinancialYearCloseRecord[] } {
  const store = readAccountingStore();
  store.settings = {
    gstEnabled: input.gstEnabled !== undefined ? Boolean(input.gstEnabled) : Boolean(store.settings?.gstEnabled ?? false),
    autoBillOnDelivery:
      input.autoBillOnDelivery !== undefined
        ? Boolean(input.autoBillOnDelivery)
        : store.settings?.autoBillOnDelivery !== false,
    lockDate:
      input.lockDate === null
        ? undefined
        : input.lockDate !== undefined
        ? input.lockDate || undefined
        : store.settings?.lockDate,
    closedYears: input.closedYears !== undefined ? input.closedYears : store.settings?.closedYears || [],
  };
  saveAccountingStore(store);
  return {
    gstEnabled: store.settings.gstEnabled,
    autoBillOnDelivery: store.settings.autoBillOnDelivery !== false,
    lockDate: store.settings.lockDate,
    closedYears: store.settings.closedYears,
  };
}

// ── 10. OPENING BALANCES SETUP (BULK & NEW COMPANY) ───────────────────────────

export function applyOpeningBalancesToStore(
  store: AccountingLedgerStore,
  entries: OpeningBalanceEntryInput[],
  autoBalanceToCapital = false
): OpeningBalancesSnapshot {
  const now = new Date().toISOString();
  const entryMap = new Map(entries.map((e) => [e.accountId, e]));

  for (const acc of store.accounts) {
    const incoming = entryMap.get(acc.id);
    if (incoming) {
      acc.openingBalance = round2(Math.max(0, Number(incoming.openingBalance) || 0));
      acc.openingType = incoming.openingType === 'CREDIT' ? 'CREDIT' : 'DEBIT';
      acc.updatedAt = now;
    }
  }

  // Optional 1-click Auto-Balance difference into Owner Capital Account (3001)
  if (autoBalanceToCapital) {
    const capitalAcc = store.accounts.find((a) => a.id === SYSTEM_ACCOUNT_IDS.OWNER_CAPITAL);
    if (capitalAcc) {
      let otherDr = 0;
      let otherCr = 0;
      for (const acc of store.accounts) {
        if (acc.id === capitalAcc.id) continue;
        if (acc.openingType === 'DEBIT') otherDr = round2(otherDr + acc.openingBalance);
        else otherCr = round2(otherCr + acc.openingBalance);
      }
      const net = round2(otherDr - otherCr);
      if (net >= 0) {
        capitalAcc.openingBalance = net;
        capitalAcc.openingType = 'CREDIT';
      } else {
        capitalAcc.openingBalance = Math.abs(net);
        capitalAcc.openingType = 'DEBIT';
      }
      capitalAcc.updatedAt = now;
    }
  }

  // Sync matching Cash & Bank opening balances
  for (const cb of store.cashBankAccounts) {
    const linked = store.accounts.find((a) => a.id === cb.coaAccountId);
    if (linked) {
      cb.openingBalance = linked.openingType === 'DEBIT' ? linked.openingBalance : -linked.openingBalance;
      cb.updatedAt = now;
    }
  }

  return buildOpeningBalancesSnapshot(store);
}

export function buildOpeningBalancesSnapshot(store: AccountingLedgerStore): OpeningBalancesSnapshot {
  const cbByCoa = new Map(store.cashBankAccounts.map((cb) => [cb.coaAccountId, cb.name]));
  const bsAccounts = store.accounts
    .filter((a) => a.group === 'ASSET' || a.group === 'LIABILITY' || a.group === 'EQUITY')
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      group: a.group,
      subType: a.subType,
      openingBalance: a.openingBalance,
      openingType: a.openingType,
      linkedCashBankName: cbByCoa.get(a.id),
    }));

  const totalOpeningDebit = round2(
    store.accounts.reduce((s, a) => s + (a.openingType === 'DEBIT' ? a.openingBalance : 0), 0)
  );
  const totalOpeningCredit = round2(
    store.accounts.reduce((s, a) => s + (a.openingType === 'CREDIT' ? a.openingBalance : 0), 0)
  );
  const difference = round2(totalOpeningDebit - totalOpeningCredit);

  return {
    accounts: bsAccounts,
    totalOpeningDebit,
    totalOpeningCredit,
    difference,
    isBalanced: Math.abs(difference) < 0.01,
  };
}

export function getOpeningBalancesSnapshot(): OpeningBalancesSnapshot {
  return buildOpeningBalancesSnapshot(readAccountingStore());
}

export function bulkUpdateOpeningBalances(
  entries: OpeningBalanceEntryInput[],
  autoBalanceToCapital = false
): OpeningBalancesSnapshot {
  const store = readAccountingStore();
  const snapshot = applyOpeningBalancesToStore(store, entries, autoBalanceToCapital);
  saveAccountingStore(store);
  return snapshot;
}

export function postYearCloseJournalEntry(
  store: AccountingLedgerStore,
  input: {
    date: string;
    fyLabel: string;
    lines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }>;
    createdBy?: string;
  }
): JournalEntryRecord | null {
  const nonZero = input.lines.filter((l) => round2(l.debit) > 0 || round2(l.credit) > 0);
  if (nonZero.length < 2) return null;
  const journal = upsertSourceJournal(store, {
    sourceType: 'YEAR_CLOSE',
    sourceId: `fyclose-${input.fyLabel}-${input.date}`,
    date: input.date,
    reference: `FYCLOSE-${input.fyLabel}`,
    narration: `Financial Year Close (${input.fyLabel}): Transfer Income & Expenses to Owner Capital Account`,
    lines: nonZero,
    createdBy: input.createdBy,
  });
  return journal;
}

export function getAccountingOverview(): AccountingOverviewPayload {
  const store = readAccountingStore();
  const accounts = computeAccountsWithBalances(store);
  const cashBankAccounts = computeCashBankWithBalances(store);
  const gstEnabled = Boolean(store.settings?.gstEnabled ?? false);

  const totalSales = round2(store.salesInvoices.reduce((s, i) => s + i.totalAmount, 0));
  const totalSalesReturns = round2(store.creditNotes.reduce((s, c) => s + c.totalAmount, 0));
  const netSales = round2(totalSales - totalSalesReturns);
  const totalOtherIncome = round2(store.otherIncomes.reduce((s, i) => s + i.amount, 0));
  const totalReceivables = round2(store.salesInvoices.reduce((s, i) => s + i.balanceAmount, 0));

  const totalPurchases = round2(store.purchaseBills.reduce((s, b) => s + b.totalAmount, 0));
  const totalPayables = round2(store.purchaseBills.reduce((s, b) => s + b.balanceAmount, 0));
  const totalExpenses = round2(store.expenses.reduce((s, e) => s + e.totalAmount, 0));

  const totalCashBalance = round2(
    cashBankAccounts.filter((c) => c.accountType === 'CASH').reduce((s, c) => s + c.closingBalance, 0)
  );
  const totalBankBalance = round2(
    cashBankAccounts.filter((c) => c.accountType !== 'CASH').reduce((s, c) => s + c.closingBalance, 0)
  );

  const pnl = generateAccountingReport('PNL', { fromDate: '2000-01-01', toDate: '2099-12-31' }) as {
    summary: { netProfit: number };
  };
  const gst = generateAccountingReport('GST_SUMMARY', { fromDate: '2000-01-01', toDate: '2099-12-31' }) as {
    summary: { totalOutputGst: number; totalInputGst: number; netGstPayable: number };
  };

  return {
    gstEnabled,
    kpis: {
      totalSales,
      totalSalesReturns,
      netSales,
      totalOtherIncome,
      totalReceivables,
      totalPurchases,
      totalPayables,
      totalExpenses,
      totalCashBalance,
      totalBankBalance,
      totalCashAndBank: round2(totalCashBalance + totalBankBalance),
      netProfit: pnl.summary.netProfit,
      gstOutput: gst.summary.totalOutputGst,
      gstInput: gst.summary.totalInputGst,
      netGstPayable: gst.summary.netGstPayable,
    },
    counts: {
      salesInvoices: store.salesInvoices.length,
      paymentsIn: store.paymentsIn.length,
      creditNotes: store.creditNotes.length,
      otherIncomes: store.otherIncomes.length,
      purchaseBills: store.purchaseBills.length,
      paymentsOut: store.paymentsOut.length,
      expenses: store.expenses.length,
      expenseCategories: store.expenseCategories.length,
      cashBankAccounts: store.cashBankAccounts.length,
      contraTransfers: store.contraTransfers.length,
      partyToPartyPayments: (store.partyToPartyPayments || []).length,
      coaAccounts: store.accounts.length,
      journals: store.journals.length,
    },
    accounts: accounts.sort((a, b) => a.code.localeCompare(b.code)),
    expenseCategories: store.expenseCategories,
    cashBankAccounts,
  };
}
