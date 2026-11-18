'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Scale,
  CheckCircle2,
  BookOpen,
  Landmark,
  Clock,
  PieChart,
  ReceiptIndianRupee,
  Printer,
  Download,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { AccountingReportType } from '@/types/accounting';

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const REPORT_CARDS: Array<{ id: AccountingReportType; label: string; desc: string; Icon: React.ElementType }> = [
  { id: 'PNL', label: 'Profit & Loss (P&L)', desc: 'Revenue, Purchases, Category Expenses & Net Profit', Icon: BarChart3 },
  { id: 'BALANCE_SHEET', label: 'Balance Sheet', desc: 'Assets vs. Liabilities, Equity & Net Profit', Icon: Scale },
  { id: 'TRIAL_BALANCE', label: 'Trial Balance', desc: 'All COA ledgers with Dr / Cr verification', Icon: CheckCircle2 },
  { id: 'DAY_BOOK', label: 'Day Book', desc: 'Chronological register of every accounting voucher', Icon: BookOpen },
  { id: 'CASH_BANK_SUMMARY', label: 'Cash & Bank Summary', desc: 'Inflows, outflows & live closing per cash/bank', Icon: Landmark },
  { id: 'AGING', label: 'Receivables & Payables Aging', desc: 'Customer & Supplier due buckets (0-30-60-90+d)', Icon: Clock },
  { id: 'EXPENSE_BY_CATEGORY', label: 'Category Expense Report', desc: 'Expense breakdown & % share by category', Icon: PieChart },
  { id: 'GST_SUMMARY', label: 'GST Summary (GSTR)', desc: 'Output Sales GST vs. Input Tax Credit (ITC)', Icon: ReceiptIndianRupee },
];

export function AccountingReportsSection({ gstEnabled = false }: { gstEnabled?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const visibleReports = gstEnabled ? REPORT_CARDS : REPORT_CARDS.filter((r) => r.id !== 'GST_SUMMARY');
  const [reportType, setReportType] = useState<AccountingReportType>('PNL');
  const [fromDate, setFromDate] = useState(yearStart);
  const [toDate, setToDate] = useState(today);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type: reportType, fromDate, toDate });
      const res = await apiFetch(`/api/accounting/reports?${qs.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setReportData(json.data);
      }
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, fromDate, toDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = () => {
    if (!reportData) return;
    let rows: string[][] = [];
    if (reportType === 'TRIAL_BALANCE') {
      rows = [
        ['Code', 'Account', 'Group', 'Period Debit', 'Period Credit', 'Closing Debit', 'Closing Credit'],
        ...(reportData.rows || []).map((r: any) => [r.code, r.name, r.group, String(r.periodDebit), String(r.periodCredit), String(r.closingDebit), String(r.closingCredit)]),
      ];
    } else if (reportType === 'DAY_BOOK') {
      rows = [
        ['Date', 'Voucher #', 'Type', 'Party', 'Narration', 'Debit', 'Credit'],
        ...(reportData.entries || []).map((e: any) => [e.date, e.voucherNumber, e.sourceType, e.partyName, e.narration, String(e.debit), String(e.credit)]),
      ];
    } else if (reportType === 'EXPENSE_BY_CATEGORY') {
      rows = [
        ['Category', 'Vouchers', 'Subtotal', 'GST', 'Total', 'Share %'],
        ...(reportData.categories || []).map((c: any) => [c.categoryName, String(c.count), String(c.subtotal), String(c.taxAmount), String(c.totalAmount), String(c.sharePct)]),
      ];
    } else {
      rows = [['Report', reportData.title], ['Period', `${fromDate} to ${toDate}`], ['Summary', JSON.stringify(reportData.summary || {})]];
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXMARK_Accounting_${reportType}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Report Picker Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 print:hidden">
        {visibleReports.map(({ id, label, desc, Icon }) => {
          const active = reportType === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setReportType(id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-red-600/20 border-red-500/70 text-white shadow'
                  : 'bg-[#0B132B] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-red-400' : 'text-slate-400'}`} />
                <span className="truncate">{label}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{desc}</div>
            </button>
          );
        })}
      </div>

      {/* Date Range & Export Bar */}
      <div className="bg-[#070D1E] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-bold">Period:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white" />
          <span className="text-slate-500">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white" />
          <button type="button" onClick={loadReport} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExportCsv} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Body */}
      <div className="bg-[#0B132B] print:bg-white print:text-black border border-slate-800 rounded-xl overflow-hidden text-xs">
        {loading || !reportData ? (
          <div className="p-10 text-center text-slate-400">Generating {reportType.replace(/_/g, ' ')} report...</div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-white print:text-black">{reportData.title}</h3>
                <p className="text-[11px] text-slate-400">EXMARK DOORS • {reportData.asOfDate ? `As of ${reportData.asOfDate}` : `${reportData.fromDate} to ${reportData.toDate}`}</p>
              </div>
              {reportData.summary?.isBalanced !== undefined && (
                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${reportData.summary.isBalanced ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
                  {reportData.summary.isBalanced ? '✓ BALANCED (0.00 DIFF)' : `DIFF: ${fmt(reportData.summary.difference)}`}
                </span>
              )}
            </div>

            {/* 1. P&L */}
            {reportType === 'PNL' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800"><div className="text-[10px] text-slate-400 uppercase">Net Revenue</div><div className="text-base font-black font-mono text-emerald-400">{fmt(reportData.summary.totalRevenue)}</div></div>
                  <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800"><div className="text-[10px] text-slate-400 uppercase">Direct Cost / Purchases</div><div className="text-base font-black font-mono text-amber-300">{fmt(reportData.summary.totalDirectCost)}</div></div>
                  <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800"><div className="text-[10px] text-slate-400 uppercase">Operating Expenses</div><div className="text-base font-black font-mono text-rose-400">{fmt(reportData.summary.totalOperatingExpenses)}</div></div>
                  <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800"><div className="text-[10px] text-slate-400 uppercase">Net Profit ({reportData.summary.netMarginPct}%)</div><div className={`text-base font-black font-mono ${reportData.summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(reportData.summary.netProfit)}</div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-950/40 text-emerald-300 font-bold uppercase text-[11px]">Income &amp; Revenue</div>
                    <table className="w-full">
                      <tbody>
                        {(reportData.incomeAccounts || []).map((a: any) => (
                          <tr key={a.id} className="border-t border-slate-800/70">
                            <td className="p-2 text-slate-300">{a.code} — {a.name}</td>
                            <td className="p-2 text-right font-mono font-bold text-white">{fmt(a.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-rose-950/40 text-rose-300 font-bold uppercase text-[11px]">Purchases &amp; Operating Expenses</div>
                    <table className="w-full">
                      <tbody>
                        {[...(reportData.directExpenses || []), ...(reportData.operatingExpenses || [])].map((e: any) => (
                          <tr key={e.id} className="border-t border-slate-800/70">
                            <td className="p-2 text-slate-300">{e.code} — {e.name}</td>
                            <td className="p-2 text-right font-mono font-bold text-white">{fmt(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BALANCE SHEET */}
            {reportType === 'BALANCE_SHEET' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-950/40 text-emerald-300 font-bold uppercase text-[11px] flex justify-between">
                    <span>Assets</span>
                    <span className="font-mono">{fmt(reportData.summary.totalAssets)}</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {(reportData.assets || []).map((a: any) => (
                        <tr key={a.id} className="border-t border-slate-800/70">
                          <td className="p-2 text-slate-300">{a.code} — {a.name}</td>
                          <td className="p-2 text-right font-mono font-bold text-white">{fmt(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-indigo-950/40 text-indigo-300 font-bold uppercase text-[11px] flex justify-between">
                    <span>Liabilities &amp; Equity</span>
                    <span className="font-mono">{fmt(reportData.summary.totalLiabilitiesAndEquity)}</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {(reportData.liabilities || []).map((l: any) => (
                        <tr key={l.id} className="border-t border-slate-800/70">
                          <td className="p-2 text-slate-300">{l.code} — {l.name}</td>
                          <td className="p-2 text-right font-mono text-rose-300 font-bold">{fmt(l.amount)}</td>
                        </tr>
                      ))}
                      {(reportData.equity || []).map((e: any) => (
                        <tr key={e.id} className="border-t border-slate-800/70">
                          <td className="p-2 text-slate-300">{e.code} — {e.name}</td>
                          <td className="p-2 text-right font-mono text-purple-300 font-bold">{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-700 bg-slate-900/60 font-bold">
                        <td className="p-2 text-emerald-300">Current Period Net Profit / (Loss)</td>
                        <td className="p-2 text-right font-mono text-emerald-300">{fmt(reportData.currentPeriodNetProfit)}</td>
                      </tr>
                      {Math.abs(reportData.openingBalanceAdjustment || 0) >= 0.01 && (
                        <tr className="border-t border-slate-800/70">
                          <td className="p-2 text-amber-300">Opening Balance Equity Offset</td>
                          <td className="p-2 text-right font-mono text-amber-300">{fmt(reportData.openingBalanceAdjustment)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. TRIAL BALANCE */}
            {reportType === 'TRIAL_BALANCE' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Ledger Account</th>
                      <th className="p-2.5">Group</th>
                      <th className="p-2.5 text-right">Period Dr</th>
                      <th className="p-2.5 text-right">Period Cr</th>
                      <th className="p-2.5 text-right">Closing Dr</th>
                      <th className="p-2.5 text-right">Closing Cr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(reportData.rows || []).map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-900/50">
                        <td className="p-2 font-mono text-indigo-300">{r.code}</td>
                        <td className="p-2 font-semibold text-white">{r.name}</td>
                        <td className="p-2 text-slate-400 text-[10px]">{r.group}</td>
                        <td className="p-2 text-right font-mono text-slate-300">{r.periodDebit > 0 ? fmt(r.periodDebit) : '-'}</td>
                        <td className="p-2 text-right font-mono text-slate-300">{r.periodCredit > 0 ? fmt(r.periodCredit) : '-'}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-300">{r.closingDebit > 0 ? fmt(r.closingDebit) : '-'}</td>
                        <td className="p-2 text-right font-mono font-bold text-rose-300">{r.closingCredit > 0 ? fmt(r.closingCredit) : '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#070D1E] font-black border-t-2 border-slate-700">
                      <td colSpan={3} className="p-2.5 text-white">TOTALS</td>
                      <td className="p-2.5 text-right font-mono text-white">{fmt(reportData.summary.totalPeriodDebit)}</td>
                      <td className="p-2.5 text-right font-mono text-white">{fmt(reportData.summary.totalPeriodCredit)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">{fmt(reportData.summary.totalClosingDebit)}</td>
                      <td className="p-2.5 text-right font-mono text-rose-400">{fmt(reportData.summary.totalClosingCredit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. DAY BOOK */}
            {reportType === 'DAY_BOOK' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Voucher</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Party</th>
                      <th className="p-2.5">Narration</th>
                      <th className="p-2.5 text-right">Amount (Dr = Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(reportData.entries || []).length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-slate-500">No vouchers posted in this period.</td></tr>
                    ) : (
                      (reportData.entries || []).map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-900/50">
                          <td className="p-2.5 text-slate-300 whitespace-nowrap">{e.date}</td>
                          <td className="p-2.5 font-mono text-sky-300 whitespace-nowrap">{e.voucherNumber}</td>
                          <td className="p-2.5 text-[10px] text-slate-400">{e.sourceType.replace(/_/g, ' ')}</td>
                          <td className="p-2.5 text-white font-semibold">{e.partyName}</td>
                          <td className="p-2.5 text-slate-300">{e.narration}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-300">{fmt(e.debit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. CASH & BANK SUMMARY */}
            {reportType === 'CASH_BANK_SUMMARY' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <th className="p-2.5">Account</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5 text-right">Opening</th>
                    <th className="p-2.5 text-right">Total Inflow</th>
                    <th className="p-2.5 text-right">Total Outflow</th>
                    <th className="p-2.5 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(reportData.accounts || []).map((a: any) => (
                    <tr key={a.id}>
                      <td className="p-2.5 font-bold text-white">{a.name}</td>
                      <td className="p-2.5 text-slate-400">{a.accountType}</td>
                      <td className="p-2.5 text-right font-mono">{fmt(a.openingBalance)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">{fmt(a.totalInflow)}</td>
                      <td className="p-2.5 text-right font-mono text-rose-400">{fmt(a.totalOutflow)}</td>
                      <td className="p-2.5 text-right font-mono font-black text-white">{fmt(a.closingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. AGING */}
            {reportType === 'AGING' && (
              <div className="space-y-4">
                <div>
                  <div className="font-bold text-emerald-300 mb-2">Customer Receivables Aging (Total: {fmt(reportData.summary.totalReceivables)})</div>
                  <table className="w-full text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-[#070D1E] text-slate-400 text-[10px] uppercase">
                        <th className="p-2">Customer</th><th className="p-2 text-right">Current</th><th className="p-2 text-right">1-30d</th><th className="p-2 text-right">31-60d</th><th className="p-2 text-right">61-90d</th><th className="p-2 text-right">90+d</th><th className="p-2 text-right">Total Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.receivables || []).length === 0 ? (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-500">Zero overdue customer receivables.</td></tr>
                      ) : (
                        (reportData.receivables || []).map((r: any) => (
                          <tr key={r.party}><td className="p-2 font-bold text-white">{r.party}</td><td className="p-2 text-right font-mono">{fmt(r.current)}</td><td className="p-2 text-right font-mono">{fmt(r.d1_30)}</td><td className="p-2 text-right font-mono">{fmt(r.d31_60)}</td><td className="p-2 text-right font-mono">{fmt(r.d61_90)}</td><td className="p-2 text-right font-mono text-rose-400">{fmt(r.d90_plus)}</td><td className="p-2 text-right font-mono font-black text-emerald-300">{fmt(r.total)}</td></tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="font-bold text-rose-300 mb-2">Supplier Payables Aging (Total: {fmt(reportData.summary.totalPayables)})</div>
                  <table className="w-full text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-[#070D1E] text-slate-400 text-[10px] uppercase">
                        <th className="p-2">Supplier</th><th className="p-2 text-right">Current</th><th className="p-2 text-right">1-30d</th><th className="p-2 text-right">31-60d</th><th className="p-2 text-right">61-90d</th><th className="p-2 text-right">90+d</th><th className="p-2 text-right">Total Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.payables || []).length === 0 ? (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-500">Zero unpaid supplier bills.</td></tr>
                      ) : (
                        (reportData.payables || []).map((p: any) => (
                          <tr key={p.party}><td className="p-2 font-bold text-white">{p.party}</td><td className="p-2 text-right font-mono">{fmt(p.current)}</td><td className="p-2 text-right font-mono">{fmt(p.d1_30)}</td><td className="p-2 text-right font-mono">{fmt(p.d31_60)}</td><td className="p-2 text-right font-mono">{fmt(p.d61_90)}</td><td className="p-2 text-right font-mono text-rose-400">{fmt(p.d90_plus)}</td><td className="p-2 text-right font-mono font-black text-rose-300">{fmt(p.total)}</td></tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. EXPENSE BY CATEGORY */}
            {reportType === 'EXPENSE_BY_CATEGORY' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <th className="p-2.5">Expense Category</th>
                    <th className="p-2.5 text-center">Vouchers</th>
                    <th className="p-2.5 text-right">Taxable</th>
                    <th className="p-2.5 text-right">GST</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(reportData.categories || []).length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-500">No expenses recorded in this period.</td></tr>
                  ) : (
                    (reportData.categories || []).map((c: any) => (
                      <tr key={c.categoryId}>
                        <td className="p-2.5 font-bold text-amber-300">{c.categoryName}</td>
                        <td className="p-2.5 text-center">{c.count}</td>
                        <td className="p-2.5 text-right font-mono">{fmt(c.subtotal)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">{fmt(c.taxAmount)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">{fmt(c.totalAmount)}</td>
                        <td className="p-2.5 text-right font-mono text-amber-400">{c.sharePct}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 8. GST SUMMARY */}
            {reportType === 'GST_SUMMARY' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#070D1E] border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase">Output GST (Sales - Credit Notes)</div>
                  <div className="flex justify-between"><span>Taxable Sales:</span><span className="font-mono">{fmt(reportData.summary.taxableSales)}</span></div>
                  <div className="flex justify-between"><span>CGST:</span><span className="font-mono">{fmt(reportData.summary.outputCgst)}</span></div>
                  <div className="flex justify-between"><span>SGST:</span><span className="font-mono">{fmt(reportData.summary.outputSgst)}</span></div>
                  <div className="flex justify-between"><span>IGST:</span><span className="font-mono">{fmt(reportData.summary.outputIgst)}</span></div>
                  <div className="flex justify-between font-black text-white pt-1 border-t border-slate-800"><span>Total Output GST:</span><span className="font-mono">{fmt(reportData.summary.totalOutputGst)}</span></div>
                </div>
                <div className="p-4 rounded-xl bg-[#070D1E] border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-sky-300 uppercase">Input Tax Credit (Purchases &amp; Expenses)</div>
                  <div className="flex justify-between"><span>Taxable Value:</span><span className="font-mono">{fmt(reportData.summary.taxablePurchasesAndExpenses)}</span></div>
                  <div className="flex justify-between"><span>CGST ITC:</span><span className="font-mono">{fmt(reportData.summary.inputCgst)}</span></div>
                  <div className="flex justify-between"><span>SGST ITC:</span><span className="font-mono">{fmt(reportData.summary.inputSgst)}</span></div>
                  <div className="flex justify-between"><span>IGST ITC:</span><span className="font-mono">{fmt(reportData.summary.inputIgst)}</span></div>
                  <div className="flex justify-between font-black text-white pt-1 border-t border-slate-800"><span>Total Input ITC:</span><span className="font-mono">{fmt(reportData.summary.totalInputGst)}</span></div>
                </div>
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 flex flex-col justify-center items-center text-center space-y-1">
                  <div className="text-[11px] font-bold text-amber-300 uppercase">Net GST Liability / (Credit)</div>
                  <div className="text-2xl font-black font-mono text-white">{fmt(reportData.summary.netGstPayable)}</div>
                  <div className="text-[10px] text-amber-200/80">
                    {reportData.summary.netGstPayable >= 0 ? 'Payable to GST Portal (GSTR-3B)' : 'Excess Input Tax Credit Carry-Forward'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
