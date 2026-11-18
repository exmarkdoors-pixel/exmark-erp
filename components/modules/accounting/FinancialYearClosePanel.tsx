'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck2,
  Lock,
  Unlock,
  ArrowRightCircle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { FinancialYearClosePreview } from '@/types/accounting';

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinancialYearClosePanel({ onClosed }: { onClosed?: () => void }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preview, setPreview] = useState<FinancialYearClosePreview | null>(null);
  const [mode, setMode] = useState<'CARRY_FORWARD_NEW_COMPANY' | 'IN_PLACE'>('CARRY_FORWARD_NEW_COMPANY');
  const [nextCompanyName, setNextCompanyName] = useState('');
  const [copyMasters, setCopyMasters] = useState(true);
  const [carryForwardOpenVouchers, setCarryForwardOpenVouchers] = useState(true);
  const [switchImmediately, setSwitchImmediately] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadPreview = useCallback(async (f?: string, t?: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (f) qs.set('fromDate', f);
      if (t) qs.set('toDate', t);
      const url = `/api/accounting/year-close${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (res.ok && json?.success && json.data) {
        const data: FinancialYearClosePreview = json.data;
        setPreview(data);
        setFromDate((prev) => prev || data.fromDate);
        setToDate((prev) => prev || data.toDate);
        setNextCompanyName(data.suggestedNextCompanyName);
      }
    } catch {
      setBanner({ type: 'err', text: 'Failed to load financial year close preview.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleCloseFinancialYear = async () => {
    if (!preview) return;
    const msg =
      mode === 'CARRY_FORWARD_NEW_COMPANY'
        ? `Confirm Financial Year Close for ${preview.fyLabel} (${fromDate} to ${toDate})?\n\nThis will:\n1. Save a pre-close backup snapshot\n2. Post the Net Profit transfer closing journal\n3. Lock vouchers on or before ${toDate}\n4. Create "${nextCompanyName}" with exact carried-forward Opening Balances!`
        : `Confirm In-Place Financial Year Close for ${preview.fyLabel} (${fromDate} to ${toDate})?\n\nThis will save a snapshot, transfer Net Profit to Owner Capital, and lock vouchers on or before ${toDate}.`;
    if (!confirm(msg)) return;

    setBusy(true);
    setBanner(null);
    try {
      const res = await apiFetch('/api/accounting/year-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          fromDate,
          toDate,
          mode,
          nextCompanyName: nextCompanyName.trim() || preview.suggestedNextCompanyName,
          copyMasters,
          carryForwardOpenVouchers,
          switchImmediately,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Financial year close failed.');
      setBanner({ type: 'ok', text: json.message || 'Financial year closed cleanly.' });
      if (onClosed) onClosed();
      if (json.data?.switched && typeof window !== 'undefined') {
        setTimeout(() => window.location.reload(), 900);
      } else {
        await loadPreview(fromDate, toDate);
      }
    } catch (err: unknown) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Year close failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockPeriod = async () => {
    if (!confirm('Unlock the closed financial year period lock? Only unlock if an audit adjustment is required.')) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await apiFetch('/api/accounting/year-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNLOCK' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Unlock failed.');
      setBanner({ type: 'ok', text: json.message || 'Period unlocked.' });
      await loadPreview(fromDate, toDate);
    } catch (err: unknown) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Unlock failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            banner.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Lock Banner */}
      {preview?.lockDate && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200 font-semibold">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Books are currently <strong>LOCKED up to {preview.lockDate}</strong>. Vouchers dated on or before {preview.lockDate} cannot be edited or deleted.
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleUnlockPeriod}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" /> Unlock Period (Super Admin)
          </button>
        </div>
      )}

      {/* Period Filter & Recalculate */}
      <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 flex flex-wrap items-end justify-between gap-3 text-xs">
        <div>
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
            Current Company Financial Year Close ({preview?.companyName || 'Active Company'})
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Calculates Net Profit transfer to Owner Capital, saves a pre-close audit snapshot, locks the year &amp; carries closing balances into the next Financial Year.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">FY Start Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">FY Closing Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => loadPreview(fromDate, toDate)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Preview Close
          </button>
        </div>
      </div>

      {loading || !preview ? (
        <div className="p-8 text-center text-slate-400 text-xs bg-[#0B132B] rounded-xl border border-slate-800">
          Computing Financial Year closing summary...
        </div>
      ) : (
        <>
          {/* Closing Audit Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Net Profit → Capital</div>
              <div className={`text-lg font-black font-mono mt-0.5 ${preview.pnlSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmt(preview.pnlSummary.netProfit)}
              </div>
              <div className="text-[10px] text-slate-400">Rev {fmt(preview.pnlSummary.totalRevenue)}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Closing Total Assets</div>
              <div className="text-lg font-black font-mono text-sky-400 mt-0.5">{fmt(preview.totals.totalAssets)}</div>
              <div className="text-[10px] text-slate-400">Carried forward as Opening Dr</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Closing Liabilities &amp; Capital</div>
              <div className="text-lg font-black font-mono text-purple-300 mt-0.5">
                {fmt(preview.totals.totalLiabilities + preview.totals.closingCapitalWithProfit)}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                {preview.totals.isBalanced ? '✓ Carry-Forward Dr = Cr Balanced' : 'Auto-Balanced'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Open Unpaid Dues</div>
              <div className="text-xs font-bold text-amber-300 mt-1">
                AR: {preview.openVouchers.unpaidSalesCount} ({fmt(preview.openVouchers.unpaidSalesTotal)})
              </div>
              <div className="text-xs font-bold text-rose-300">
                AP: {preview.openVouchers.unpaidPurchasesCount} ({fmt(preview.openVouchers.unpaidPurchasesTotal)})
              </div>
            </div>
          </div>

          {/* Carry-Forward Preview Table */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-x-auto">
            <div className="px-4 py-2.5 bg-[#070D1E] border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white">Next Financial Year Opening Balances Preview (Starting {preview.nextFyStart})</span>
              <span className="text-[10px] text-slate-400">Income &amp; Expense accounts automatically reset to ₹0.00</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">Account</th>
                  <th className="p-2.5">Group</th>
                  <th className="p-2.5 text-right">Next FY Opening Dr</th>
                  <th className="p-2.5 text-right">Next FY Opening Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {preview.carryForwardAccounts
                  .filter((a) => a.openingBalance > 0 || a.accountId === 'coa-3001-capital')
                  .map((a) => (
                    <tr key={a.accountId} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-mono text-indigo-300">{a.code}</td>
                      <td className="p-2.5 font-semibold text-white">{a.name}</td>
                      <td className="p-2.5 text-[10px] text-slate-400">{a.group}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-300">
                        {a.openingType === 'DEBIT' && a.openingBalance > 0 ? fmt(a.openingBalance) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-sky-300">
                        {a.openingType === 'CREDIT' && a.openingBalance > 0 ? fmt(a.openingBalance) : '-'}
                      </td>
                    </tr>
                  ))}
                <tr className="bg-[#070D1E] font-black border-t border-slate-700">
                  <td colSpan={3} className="p-2.5 text-white">TOTAL CARRIED-FORWARD OPENING BALANCES</td>
                  <td className="p-2.5 text-right font-mono text-emerald-400">{fmt(preview.totals.totalCarryForwardDebit)}</td>
                  <td className="p-2.5 text-right font-mono text-sky-400">{fmt(preview.totals.totalCarryForwardCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Close Execution Configuration */}
          <div className="p-4 rounded-xl bg-[#0B132B] border border-emerald-500/35 space-y-3 text-xs">
            <div className="font-black text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Choose Financial Year Close Mode
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('CARRY_FORWARD_NEW_COMPANY')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'CARRY_FORWARD_NEW_COMPANY'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-[#070D1E] border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-black text-xs">Mode 1: Close &amp; Carry Forward to Next FY Company (Recommended)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Locks {preview.fyLabel} as a permanent archive and creates a fresh isolated company for the new Financial Year with all closing balances carried forward.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('IN_PLACE')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'IN_PLACE'
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-[#070D1E] border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-black text-xs">Mode 2: In-Place Year Close &amp; Period Lock</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Posts Net Profit closing journal, locks vouchers up to {toDate}, and advances this company&apos;s Financial Year without creating a second company.
                </div>
              </button>
            </div>

            {mode === 'CARRY_FORWARD_NEW_COMPANY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Next Financial Year Company Name *</label>
                  <input
                    value={nextCompanyName}
                    onChange={(e) => setNextCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input type="checkbox" checked={copyMasters} onChange={(e) => setCopyMasters(e.target.checked)} className="accent-emerald-500" />
                    <span>Copy Customers, Inventory &amp; Factory Masters</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input type="checkbox" checked={carryForwardOpenVouchers} onChange={(e) => setCarryForwardOpenVouchers(e.target.checked)} className="accent-emerald-500" />
                    <span>Carry forward unpaid Sales &amp; Purchase dues for settlement</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input type="checkbox" checked={switchImmediately} onChange={(e) => setSwitchImmediately(e.target.checked)} className="accent-emerald-500" />
                    <span>Switch workspace into the new Financial Year immediately</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleCloseFinancialYear}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightCircle className="w-4 h-4" />}
                <span>
                  {busy
                    ? 'Closing Financial Year...'
                    : mode === 'CARRY_FORWARD_NEW_COMPANY'
                    ? `Close ${preview.fyLabel} & Create Next FY Company`
                    : `Close & Lock ${preview.fyLabel}`}
                </span>
              </button>
            </div>
          </div>

          {/* Historical Closed Financial Years */}
          {preview.closedYears.length > 0 && (
            <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-x-auto">
              <div className="px-4 py-2.5 bg-[#070D1E] border-b border-slate-800 text-xs font-bold text-white">
                Closed Financial Years Audit History ({preview.closedYears.length})
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                    <th className="p-2.5">FY</th>
                    <th className="p-2.5">Period</th>
                    <th className="p-2.5">Mode</th>
                    <th className="p-2.5 text-right">Net Profit</th>
                    <th className="p-2.5 text-right">Closing Capital</th>
                    <th className="p-2.5">Carried Forward To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {preview.closedYears.map((cy) => (
                    <tr key={cy.id}>
                      <td className="p-2.5 font-mono font-bold text-amber-300">{cy.fyLabel}</td>
                      <td className="p-2.5 text-slate-300">{cy.fromDate} → {cy.toDate}</td>
                      <td className="p-2.5 text-[10px] text-slate-400">{cy.mode.replace(/_/g, ' ')}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">{fmt(cy.netProfit)}</td>
                      <td className="p-2.5 text-right font-mono text-purple-300">{fmt(cy.closingCapital)}</td>
                      <td className="p-2.5 text-sky-300">{cy.nextCompanyName || 'In-Place Lock'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
