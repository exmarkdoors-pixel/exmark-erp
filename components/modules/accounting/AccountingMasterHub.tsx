'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReceiptText,
  ShoppingBag,
  Landmark,
  BookOpenCheck,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { AccountingOverviewPayload } from '@/types/accounting';
import { AccountingSalesSection } from './AccountingSalesSection';
import { AccountingPurchasesExpensesSection } from './AccountingPurchasesExpensesSection';
import { AccountingCashBankSection } from './AccountingCashBankSection';
import { AccountingLedgerSection } from './AccountingLedgerSection';
import { AccountingReportsSection } from './AccountingReportsSection';

type PillarTab = 'SALES' | 'PURCHASES_EXPENSES' | 'CASH_BANK' | 'ACCOUNTING' | 'REPORTS';

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function AccountingMasterHub({ initialPillar = 'SALES' }: { initialPillar?: PillarTab }) {
  const [activePillar, setActivePillar] = useState<PillarTab>(initialPillar);
  const [overview, setOverview] = useState<AccountingOverviewPayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch('/api/accounting/overview');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setOverview(json.data);
      }
    } catch {
      // Non-fatal
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const kpis = overview?.kpis;

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Net Sales &amp; Other Inc</div>
          <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
            {fmt((kpis?.netSales || 0) + (kpis?.totalOtherIncome || 0))}
          </div>
          <div className="text-[10px] text-slate-400">Receivables: {fmt(kpis?.totalReceivables || 0)}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Purchases &amp; Payables</div>
          <div className="text-lg font-black font-mono text-purple-300 mt-0.5">{fmt(kpis?.totalPurchases || 0)}</div>
          <div className="text-[10px] text-slate-400">Payables Due: {fmt(kpis?.totalPayables || 0)}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Expenses</div>
          <div className="text-lg font-black font-mono text-amber-300 mt-0.5">{fmt(kpis?.totalExpenses || 0)}</div>
          <div className="text-[10px] text-slate-400">{overview?.counts.expenseCategories || 0} Categories</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Cash &amp; Bank Balance</div>
          <div className="text-lg font-black font-mono text-sky-400 mt-0.5">{fmt(kpis?.totalCashAndBank || 0)}</div>
          <div className="text-[10px] text-slate-400">
            Cash {fmt(kpis?.totalCashBalance || 0)} • Bank {fmt(kpis?.totalBankBalance || 0)}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800 col-span-2 md:col-span-1">
          <div className="text-[10px] uppercase font-bold text-slate-400">Net Profit (Ledger)</div>
          <div className={`text-lg font-black font-mono mt-0.5 ${(kpis?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(kpis?.netProfit || 0)}
          </div>
          <div className="text-[10px] text-slate-400">Net GST: {fmt(kpis?.netGstPayable || 0)}</div>
        </div>
      </div>

      {/* 5-Pillar Primary Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B132B] p-2 rounded-xl border border-slate-800 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'SALES' as PillarTab, label: '1. Sales', sub: 'Invoice • Pay In • Credit Note • Other Inc', Icon: ReceiptText },
            { id: 'PURCHASES_EXPENSES' as PillarTab, label: '2. Purchases & Expenses', sub: 'Bills • Pay Out • Categories', Icon: ShoppingBag },
            { id: 'CASH_BANK' as PillarTab, label: '3. Cash & Bank', sub: 'Accounts • Contra • Passbook', Icon: Landmark },
            { id: 'ACCOUNTING' as PillarTab, label: '4. Accounting', sub: 'COA • Journal • Statement', Icon: BookOpenCheck },
            { id: 'REPORTS' as PillarTab, label: '5. Accounts Reports', sub: 'P&L • Balance Sheet • Trial Bal', Icon: BarChart3 },
          ].map(({ id, label, sub, Icon }) => {
            const active = activePillar === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActivePillar(id)}
                className={`px-3.5 py-2 rounded-xl text-left transition cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                    : 'bg-[#070D1E] text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-extrabold leading-tight">{label}</div>
                  <div className={`text-[9.5px] leading-tight ${active ? 'text-red-100' : 'text-slate-500'}`}>{sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={loadOverview}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          title="Refresh Accounting Totals"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active Pillar Workspace */}
      {activePillar === 'SALES' && (
        <AccountingSalesSection
          accounts={overview?.accounts || []}
          cashBankAccounts={overview?.cashBankAccounts || []}
          onDataChanged={loadOverview}
        />
      )}
      {activePillar === 'PURCHASES_EXPENSES' && (
        <AccountingPurchasesExpensesSection
          cashBankAccounts={overview?.cashBankAccounts || []}
          onDataChanged={loadOverview}
        />
      )}
      {activePillar === 'CASH_BANK' && <AccountingCashBankSection onDataChanged={loadOverview} />}
      {activePillar === 'ACCOUNTING' && (
        <AccountingLedgerSection accounts={overview?.accounts || []} onDataChanged={loadOverview} />
      )}
      {activePillar === 'REPORTS' && <AccountingReportsSection />}
    </div>
  );
}
