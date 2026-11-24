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

  useEffect(() => {
    if (initialPillar) {
      setActivePillar(initialPillar);
    }
  }, [initialPillar]);
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
    <div className="space-y-2.5">
      {/* Compact KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Net Sales &amp; Other Inc</div>
          <div className="text-base font-black font-mono text-emerald-400 leading-tight mt-0.5">
            {fmt((kpis?.netSales || 0) + (kpis?.totalOtherIncome || 0))}
          </div>
          <div className="text-[10px] text-slate-400 truncate">Rec: {fmt(kpis?.totalReceivables || 0)}</div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Purchases &amp; Payables</div>
          <div className="text-base font-black font-mono text-purple-300 leading-tight mt-0.5">{fmt(kpis?.totalPurchases || 0)}</div>
          <div className="text-[10px] text-slate-400 truncate">Due: {fmt(kpis?.totalPayables || 0)}</div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Total Expenses</div>
          <div className="text-base font-black font-mono text-amber-300 leading-tight mt-0.5">{fmt(kpis?.totalExpenses || 0)}</div>
          <div className="text-[10px] text-slate-400 truncate">{overview?.counts.expenseCategories || 0} Categories</div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Cash &amp; Bank</div>
          <div className="text-base font-black font-mono text-sky-400 leading-tight mt-0.5">{fmt(kpis?.totalCashAndBank || 0)}</div>
          <div className="text-[10px] text-slate-400 truncate">
            C {fmt(kpis?.totalCashBalance || 0)} · B {fmt(kpis?.totalBankBalance || 0)}
          </div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 col-span-2 md:col-span-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Net Profit (Ledger)</div>
          <div className={`text-base font-black font-mono leading-tight mt-0.5 ${(kpis?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(kpis?.netProfit || 0)}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {overview?.gstEnabled
              ? `GST: ${fmt(kpis?.netGstPayable || 0)}`
              : `Non-GST · ${overview?.counts.journals || 0} Entries`}
          </div>
        </div>
      </div>

      {/* Slim Single-Row 5-Pillar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#0B132B] px-2 py-1.5 rounded-xl border border-slate-800 print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'SALES' as PillarTab, label: '1. Sales', sub: overview?.gstEnabled ? 'Invoice · Pay In · Credit Note · Other Inc' : 'Sales Entry · Pay In · Returns · Other Inc', Icon: ReceiptText },
            { id: 'PURCHASES_EXPENSES' as PillarTab, label: '2. Purchases & Expenses', sub: 'Bills · Pay Out · Categories', Icon: ShoppingBag },
            { id: 'CASH_BANK' as PillarTab, label: '3. Cash & Bank', sub: 'Accounts · Contra · Party-to-Party · Passbook', Icon: Landmark },
            { id: 'ACCOUNTING' as PillarTab, label: '4. Accounting', sub: 'COA · Journal · Statement', Icon: BookOpenCheck },
            { id: 'REPORTS' as PillarTab, label: '5. Reports', sub: 'P&L · Balance Sheet · Trial Bal', Icon: BarChart3 },
          ].map(({ id, label, sub, Icon }) => {
            const active = activePillar === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActivePillar(id)}
                title={sub}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-[#070D1E] text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={loadOverview}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          title="Refresh Accounting Totals"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active Pillar Workspace */}
      {activePillar === 'SALES' && (
        <AccountingSalesSection
          accounts={overview?.accounts || []}
          cashBankAccounts={overview?.cashBankAccounts || []}
          onDataChanged={loadOverview}
          gstEnabled={Boolean(overview?.gstEnabled)}
        />
      )}
      {activePillar === 'PURCHASES_EXPENSES' && (
        <AccountingPurchasesExpensesSection
          cashBankAccounts={overview?.cashBankAccounts || []}
          onDataChanged={loadOverview}
          gstEnabled={Boolean(overview?.gstEnabled)}
        />
      )}
      {activePillar === 'CASH_BANK' && <AccountingCashBankSection onDataChanged={loadOverview} />}
      {activePillar === 'ACCOUNTING' && (
        <AccountingLedgerSection accounts={overview?.accounts || []} onDataChanged={loadOverview} />
      )}
      {activePillar === 'REPORTS' && <AccountingReportsSection gstEnabled={Boolean(overview?.gstEnabled)} />}
    </div>
  );
}
