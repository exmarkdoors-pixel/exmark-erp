import path from 'path';
import { getDataDir, writeJsonSafe } from '@/lib/utils/dataPaths';
import {
  SYSTEM_ACCOUNT_IDS,
  computeAccountsWithBalances,
  computeCashBankWithBalances,
  generateAccountingReport,
  postYearCloseJournalEntry,
  readAccountingStore,
  saveAccountingStore,
  updateAccountingSettings,
} from './accountingService';
import { createCarryForwardCompany, listCompanies, switchActiveCompany, updateCompanyMeta } from './companyRegistryService';
import type {
  AccountingLedgerStore,
  BalanceSide,
  FinancialYearClosePreview,
  FinancialYearCloseRecord,
} from '@/types/accounting';

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function deriveDefaultFyRange(fyStart?: string): { fromDate: string; toDate: string; fyLabel: string; nextFyStart: string } {
  const now = new Date();
  const defaultStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fromDate = fyStart && /^\d{4}-\d{2}-\d{2}$/.test(fyStart) ? fyStart : `${defaultStartYear}-04-01`;
  const startYear = Number(fromDate.slice(0, 4)) || defaultStartYear;
  const startMonth = Number(fromDate.slice(5, 7)) || 4;
  const endYear = startMonth === 1 ? startYear : startYear + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const toDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const nextFyStart = `${startYear + 1}-${fromDate.slice(5, 10)}`;
  const fyLabel = `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
  return { fromDate, toDate, fyLabel, nextFyStart };
}

function buildFyLabel(fromDate: string, toDate: string): { fyLabel: string; nextFyStart: string; nextFyLabel: string } {
  const sy = Number(fromDate.slice(0, 4)) || new Date().getFullYear();
  const ey = Number(toDate.slice(0, 4)) || sy + 1;
  const fyLabel = sy === ey ? `FY ${sy}` : `FY ${sy}-${String(ey).slice(-2)}`;
  const toObj = new Date(`${toDate}T00:00:00Z`);
  toObj.setUTCDate(toObj.getUTCDate() + 1);
  const nextFyStart = toObj.toISOString().slice(0, 10);
  const nextSy = Number(nextFyStart.slice(0, 4));
  const nextFyLabel = `FY ${nextSy}-${String(nextSy + 1).slice(-2)}`;
  return { fyLabel, nextFyStart, nextFyLabel };
}

export function previewFinancialYearClose(options?: {
  fromDate?: string;
  toDate?: string;
}): FinancialYearClosePreview {
  const { activeCompany } = listCompanies();
  const defaults = deriveDefaultFyRange(activeCompany.financialYearStart);
  const fromDate = options?.fromDate || defaults.fromDate;
  const toDate = options?.toDate || defaults.toDate;
  const { fyLabel, nextFyStart, nextFyLabel } = buildFyLabel(fromDate, toDate);

  const store = readAccountingStore();
  const cumulative = computeAccountsWithBalances(store, { toDate });
  const pnl = generateAccountingReport('PNL', { fromDate, toDate }) as {
    summary: {
      totalRevenue: number;
      totalDirectCost: number;
      totalOperatingExpenses: number;
      netProfit: number;
    };
  };

  // Signed net = openingSigned + totalDebit - totalCredit
  const signedOf = (a: (typeof cumulative)[number]) => {
    const openSigned = a.openingType === 'DEBIT' ? a.openingBalance : -a.openingBalance;
    return round2(openSigned + a.totalDebit - a.totalCredit);
  };

  // Cumulative net profit up to toDate (including any unclosed prior P&L accounts)
  const cumulativeNetProfit = round2(
    cumulative.filter((a) => a.group === 'INCOME').reduce((s, a) => s + round2(-signedOf(a)), 0) -
      cumulative.filter((a) => a.group === 'EXPENSE').reduce((s, a) => s + signedOf(a), 0)
  );

  // Any one-sided opening difference from prior setup also rolls cleanly into Capital so new FY starts Dr === Cr
  const openingEquityAdj = round2(
    cumulative.reduce((s, a) => s + (a.openingType === 'DEBIT' ? a.openingBalance : -a.openingBalance), 0)
  );

  const carryForwardAccounts: FinancialYearClosePreview['carryForwardAccounts'] = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let closingCapitalWithProfit = 0;

  for (const acc of cumulative) {
    if (acc.group === 'INCOME' || acc.group === 'EXPENSE') continue;

    let netSigned = signedOf(acc);
    if (acc.id === SYSTEM_ACCOUNT_IDS.OWNER_CAPITAL) {
      // Fold cumulative Net Profit + any opening balance adjustment into Owner Capital (CREDIT is negative in signed convention)
      netSigned = round2(netSigned - cumulativeNetProfit - openingEquityAdj);
    }

    const openingType: BalanceSide =
      netSigned > 0 ? 'DEBIT' : netSigned < 0 ? 'CREDIT' : acc.group === 'ASSET' ? 'DEBIT' : 'CREDIT';
    const openingBalance = round2(Math.abs(netSigned));

    if (acc.group === 'ASSET') totalAssets = round2(totalAssets + netSigned);
    else if (acc.group === 'LIABILITY') totalLiabilities = round2(totalLiabilities + -netSigned);
    else if (acc.group === 'EQUITY') closingCapitalWithProfit = round2(closingCapitalWithProfit + -netSigned);

    carryForwardAccounts.push({
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      group: acc.group,
      openingBalance,
      openingType,
    });
  }

  const totalCarryForwardDebit = round2(
    carryForwardAccounts.reduce((s, a) => s + (a.openingType === 'DEBIT' ? a.openingBalance : 0), 0)
  );
  const totalCarryForwardCredit = round2(
    carryForwardAccounts.reduce((s, a) => s + (a.openingType === 'CREDIT' ? a.openingBalance : 0), 0)
  );

  const cashBanks = computeCashBankWithBalances(store).map((cb) => ({
    id: cb.id,
    name: cb.name,
    accountType: cb.accountType,
    closingBalance: cb.closingBalance,
  }));

  const unpaidSales = store.salesInvoices.filter((i) => i.balanceAmount > 0.01 && i.date <= toDate);
  const unpaidPurchases = store.purchaseBills.filter((b) => b.balanceAmount > 0.01 && b.date <= toDate);

  const baseName = activeCompany.brandName.replace(/\s*\(FY\s+\d{4}(?:-\d{2})?\)\s*$/i, '').trim();
  const suggestedNextCompanyName = `${baseName} (${nextFyLabel})`;

  const closedYears = store.settings?.closedYears || [];
  const alreadyClosed = closedYears.some((c) => c.toDate === toDate);

  return {
    companyId: activeCompany.id,
    companyName: activeCompany.brandName,
    fromDate,
    toDate,
    fyLabel,
    nextFyStart,
    suggestedNextCompanyName,
    lockDate: store.settings?.lockDate,
    alreadyClosed,
    pnlSummary: {
      totalRevenue: pnl.summary.totalRevenue,
      totalDirectCost: pnl.summary.totalDirectCost,
      totalOperatingExpenses: pnl.summary.totalOperatingExpenses,
      netProfit: pnl.summary.netProfit,
    },
    carryForwardAccounts: carryForwardAccounts.sort((a, b) => a.code.localeCompare(b.code)),
    cashBankCarryForward: cashBanks,
    totals: {
      totalAssets,
      totalLiabilities,
      closingCapitalWithProfit,
      totalCarryForwardDebit,
      totalCarryForwardCredit,
      isBalanced: Math.abs(totalCarryForwardDebit - totalCarryForwardCredit) < 0.01,
    },
    openVouchers: {
      unpaidSalesCount: unpaidSales.length,
      unpaidSalesTotal: round2(unpaidSales.reduce((s, i) => s + i.balanceAmount, 0)),
      unpaidPurchasesCount: unpaidPurchases.length,
      unpaidPurchasesTotal: round2(unpaidPurchases.reduce((s, b) => s + b.balanceAmount, 0)),
    },
    closedYears,
  };
}

export function executeFinancialYearClose(input: {
  fromDate: string;
  toDate: string;
  mode: 'CARRY_FORWARD_NEW_COMPANY' | 'IN_PLACE';
  nextCompanyName?: string;
  nextLegalName?: string;
  copyMasters?: boolean;
  carryForwardOpenVouchers?: boolean;
  switchImmediately?: boolean;
  closedBy?: string;
}): {
  closeRecord: FinancialYearCloseRecord;
  nextCompanyId?: string;
  nextCompanyName?: string;
  switched: boolean;
} {
  const preview = previewFinancialYearClose({ fromDate: input.fromDate, toDate: input.toDate });
  const store = readAccountingStore();
  const now = new Date().toISOString();

  // 1. Save immutable pre-close snapshot inside the current company's folder
  const snapshotFilename = `fy-close-snapshot-${preview.fromDate}-to-${preview.toDate}.json`;
  const snapshotPath = path.join(/*turbopackIgnore: true*/ getDataDir(), snapshotFilename);
  writeJsonSafe(snapshotPath, {
    capturedAt: now,
    companyId: preview.companyId,
    companyName: preview.companyName,
    fyLabel: preview.fyLabel,
    preview,
    storeSnapshot: store,
  });

  // 2. Build & post balanced YEAR_CLOSE journal transferring Income & Expense balances to Owner Capital (3001)
  const cumulative = computeAccountsWithBalances(store, { toDate: preview.toDate });
  const signedOf = (a: (typeof cumulative)[number]) => {
    const openSigned = a.openingType === 'DEBIT' ? a.openingBalance : -a.openingBalance;
    return round2(openSigned + a.totalDebit - a.totalCredit);
  };

  const closingLines: Array<{ accountId: string; debit: number; credit: number; lineNote?: string }> = [];
  let netToCapitalCredit = 0; // positive => profit (Credit Capital), negative => loss (Debit Capital)

  for (const acc of cumulative) {
    if (acc.group !== 'INCOME' && acc.group !== 'EXPENSE') continue;
    const netSigned = signedOf(acc); // positive = DR balance, negative = CR balance
    if (Math.abs(netSigned) < 0.01) continue;

    if (netSigned < 0) {
      // Credit balance (e.g. Sales Revenue): DEBIT it to zero out
      const amt = round2(Math.abs(netSigned));
      closingLines.push({ accountId: acc.id, debit: amt, credit: 0, lineNote: `Close ${acc.name}` });
      netToCapitalCredit = round2(netToCapitalCredit + amt);
    } else {
      // Debit balance (e.g. Expense / Sales Returns): CREDIT it to zero out
      const amt = round2(netSigned);
      closingLines.push({ accountId: acc.id, debit: 0, credit: amt, lineNote: `Close ${acc.name}` });
      netToCapitalCredit = round2(netToCapitalCredit - amt);
    }
  }

  if (Math.abs(netToCapitalCredit) >= 0.01) {
    if (netToCapitalCredit > 0) {
      closingLines.push({
        accountId: SYSTEM_ACCOUNT_IDS.OWNER_CAPITAL,
        debit: 0,
        credit: netToCapitalCredit,
        lineNote: `Net Profit transferred for ${preview.fyLabel}`,
      });
    } else {
      closingLines.push({
        accountId: SYSTEM_ACCOUNT_IDS.OWNER_CAPITAL,
        debit: round2(Math.abs(netToCapitalCredit)),
        credit: 0,
        lineNote: `Net Loss transferred for ${preview.fyLabel}`,
      });
    }
  }

  const closingJournal = postYearCloseJournalEntry(store, {
    date: preview.toDate,
    fyLabel: preview.fyLabel,
    lines: closingLines,
    createdBy: input.closedBy || 'Super Admin',
  });

  let nextCompanyId: string | undefined;
  let nextCompanyName: string | undefined;
  let switched = false;

  // 3. Optional Mode A: Auto-Create Next Financial Year Company with exact carried-forward Opening Balances
  if (input.mode === 'CARRY_FORWARD_NEW_COMPANY') {
    const cfMap = new Map(preview.carryForwardAccounts.map((a) => [a.accountId, a]));

    const nextAccounts = store.accounts.map((acc) => {
      const cf = cfMap.get(acc.id);
      if (cf) {
        return {
          ...acc,
          openingBalance: cf.openingBalance,
          openingType: cf.openingType,
          updatedAt: now,
        };
      }
      // Income & Expense accounts reset cleanly to ₹0.00 for the new FY
      return {
        ...acc,
        openingBalance: 0,
        openingType: acc.group === 'INCOME' ? ('CREDIT' as BalanceSide) : ('DEBIT' as BalanceSide),
        updatedAt: now,
      };
    });

    const nextCashBanks = store.cashBankAccounts.map((cb) => {
      const linked = cfMap.get(cb.coaAccountId);
      const openBal = linked
        ? linked.openingType === 'DEBIT'
          ? linked.openingBalance
          : -linked.openingBalance
        : 0;
      return {
        ...cb,
        openingBalance: round2(openBal),
        updatedAt: now,
      };
    });

    // Optional carry-forward of open unpaid invoices/bills (for aging & settlement tracking, with zero double-posted journals since AR/AP opening balance already reflects them!)
    const openSales =
      input.carryForwardOpenVouchers !== false
        ? store.salesInvoices
            .filter((i) => i.balanceAmount > 0.01 && i.date <= preview.toDate)
            .map((i) => ({ ...i, journalEntryId: undefined, notes: `${i.notes ? `${i.notes} • ` : ''}Carried forward from ${preview.fyLabel}` }))
        : [];
    const openBills =
      input.carryForwardOpenVouchers !== false
        ? store.purchaseBills
            .filter((b) => b.balanceAmount > 0.01 && b.date <= preview.toDate)
            .map((b) => ({ ...b, journalEntryId: undefined, notes: `${b.notes ? `${b.notes} • ` : ''}Carried forward from ${preview.fyLabel}` }))
        : [];

    const nextLedgerStore: AccountingLedgerStore = {
      version: 1,
      settings: {
        gstEnabled: Boolean(store.settings?.gstEnabled ?? false),
        lockDate: undefined,
        closedYears: [],
      },
      accounts: nextAccounts,
      expenseCategories: store.expenseCategories.map((c) => ({ ...c })),
      cashBankAccounts: nextCashBanks,
      salesInvoices: openSales,
      paymentsIn: [],
      creditNotes: [],
      otherIncomes: [],
      purchaseBills: openBills,
      paymentsOut: [],
      expenses: [],
      contraTransfers: [],
      journals: [],
      updatedAt: now,
    };

    const brand = String(input.nextCompanyName || preview.suggestedNextCompanyName).trim();
    const legal = String(input.nextLegalName || brand).trim();

    const created = createCarryForwardCompany({
      sourceCompanyId: preview.companyId,
      newLegalName: legal,
      newBrandName: brand,
      nextFyStart: preview.nextFyStart,
      carryForwardAccountingStore: nextLedgerStore,
      copyMasters: input.copyMasters !== false,
      switchImmediately: false, // Save lock record on current company BEFORE switching!
    });

    nextCompanyId = created.company.id;
    nextCompanyName = created.company.brandName;
  }

  // 4. Lock current company up to toDate & record closing audit trail
  const closeRecord: FinancialYearCloseRecord = {
    id: `fyc-${Date.now()}`,
    fyLabel: preview.fyLabel,
    fromDate: preview.fromDate,
    toDate: preview.toDate,
    mode: input.mode,
    netProfit: preview.pnlSummary.netProfit,
    totalAssets: preview.totals.totalAssets,
    totalLiabilities: preview.totals.totalLiabilities,
    closingCapital: preview.totals.closingCapitalWithProfit,
    closingJournalId: closingJournal?.id,
    nextCompanyId,
    nextCompanyName,
    snapshotFile: snapshotFilename,
    closedBy: input.closedBy || 'Super Admin',
    closedAt: now,
  };

  store.settings = {
    gstEnabled: Boolean(store.settings?.gstEnabled ?? false),
    lockDate: preview.toDate,
    closedYears: [closeRecord, ...(store.settings?.closedYears || [])],
  };
  saveAccountingStore(store);

  if (input.mode === 'IN_PLACE') {
    updateCompanyMeta(preview.companyId, { financialYearStart: preview.nextFyStart });
  } else if (nextCompanyId && input.switchImmediately !== false) {
    // Switch AFTER saving current company's lock & closing journal!
    switchActiveCompany(nextCompanyId);
    switched = true;
  }

  return {
    closeRecord,
    nextCompanyId,
    nextCompanyName,
    switched,
  };
}

export function unlockAccountingPeriod(): { lockDate: undefined } {
  updateAccountingSettings({ lockDate: null });
  return { lockDate: undefined };
}
