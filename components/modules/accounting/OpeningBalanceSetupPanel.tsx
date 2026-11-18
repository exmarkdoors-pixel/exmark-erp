'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { AccountGroup, BalanceSide, OpeningBalancesSnapshot } from '@/types/accounting';

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EditableOpeningRow {
  id: string;
  code: string;
  name: string;
  group: AccountGroup;
  linkedCashBankName?: string;
  openingBalance: string;
  openingType: BalanceSide;
}

export function OpeningBalanceSetupPanel({ onSaved }: { onSaved?: () => void }) {
  const [rows, setRows] = useState<EditableOpeningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/accounting/opening-balances');
      const json = await res.json();
      if (res.ok && json?.success && json.data) {
        const snap: OpeningBalancesSnapshot = json.data;
        setRows(
          snap.accounts.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            group: a.group,
            linkedCashBankName: a.linkedCashBankName,
            openingBalance: String(a.openingBalance || 0),
            openingType: a.openingType,
          }))
        );
      }
    } catch {
      setBanner({ type: 'err', text: 'Failed to load opening balances.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const totalDr = rows.reduce(
    (s, r) => s + (r.openingType === 'DEBIT' ? Math.max(0, Number(r.openingBalance) || 0) : 0),
    0
  );
  const totalCr = rows.reduce(
    (s, r) => s + (r.openingType === 'CREDIT' ? Math.max(0, Number(r.openingBalance) || 0) : 0),
    0
  );
  const diff = Math.round((totalDr - totalCr) * 100) / 100;
  const isBalanced = Math.abs(diff) < 0.01;

  const handleAutoBalanceCapital = () => {
    setRows((prev) => {
      let otherDr = 0;
      let otherCr = 0;
      for (const r of prev) {
        if (r.id === 'coa-3001-capital') continue;
        const val = Math.max(0, Number(r.openingBalance) || 0);
        if (r.openingType === 'DEBIT') otherDr += val;
        else otherCr += val;
      }
      const net = Math.round((otherDr - otherCr) * 100) / 100;
      return prev.map((r) =>
        r.id === 'coa-3001-capital'
          ? {
              ...r,
              openingBalance: String(Math.abs(net)),
              openingType: net >= 0 ? 'CREDIT' : 'DEBIT',
            }
          : r
      );
    });
  };

  const handleSave = async (autoBalanceToCapital = false) => {
    setSaving(true);
    setBanner(null);
    try {
      const res = await apiFetch('/api/accounting/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoBalanceToCapital,
          entries: rows.map((r) => ({
            accountId: r.id,
            openingBalance: Math.max(0, Number(r.openingBalance) || 0),
            openingType: r.openingType,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save opening balances');
      setBanner({ type: 'ok', text: json.message || 'Opening balances saved cleanly.' });
      await loadSnapshot();
      if (onSaved) onSaved();
    } catch (err: unknown) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const groups: Array<{ id: AccountGroup; title: string; badge: string }> = [
    { id: 'ASSET', title: 'Assets (Cash, Bank, Receivables, Stock & Machinery)', badge: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'LIABILITY', title: 'Liabilities (Supplier Payables, Advances & Loans)', badge: 'text-rose-300 bg-rose-500/15 border-rose-500/30' },
    { id: 'EQUITY', title: 'Equity / Owner Capital', badge: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  ];

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

      {/* Live Opening Dr = Cr Summary Strip */}
      <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Opening Debit (Dr)</div>
            <div className="text-base font-black font-mono text-emerald-400">{fmt(totalDr)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Opening Credit (Cr)</div>
            <div className="text-base font-black font-mono text-sky-400">{fmt(totalCr)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Opening Balance Check</div>
            <div className={`text-sm font-black font-mono ${isBalanced ? 'text-emerald-400' : 'text-amber-300'}`}>
              {isBalanced ? '✓ BALANCED (₹0.00)' : `Difference: ${fmt(Math.abs(diff))} (${diff > 0 ? 'Excess Dr' : 'Excess Cr'})`}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadSnapshot}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={handleAutoBalanceCapital}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Balance to Owner Capital
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Opening Balances'}</span>
          </button>
        </div>
      </div>

      {/* Grouped Editable Opening Balance Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs bg-[#0B132B] rounded-xl border border-slate-800">
          Loading Balance Sheet accounts for opening balance setup...
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((grp) => {
            const grpRows = rows.filter((r) => r.group === grp.id);
            if (grpRows.length === 0) return null;
            return (
              <div key={grp.id} className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#070D1E] border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    {grp.title}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${grp.badge}`}>
                    {grpRows.length} Accounts
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-800 bg-slate-950/40">
                      <th className="p-2.5 w-24">Code</th>
                      <th className="p-2.5">Account Name</th>
                      <th className="p-2.5 w-44 text-right">Opening Amount (₹)</th>
                      <th className="p-2.5 w-32 text-center">Dr / Cr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {grpRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-mono font-bold text-indigo-300">{row.code}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-white">{row.name}</div>
                          {row.linkedCashBankName && (
                            <div className="text-[10px] text-sky-400">Synced with Cash/Bank: {row.linkedCashBankName}</div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.openingBalance}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, openingBalance: e.target.value } : x))
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-right font-mono font-bold focus:border-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={row.openingType}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === row.id ? { ...x, openingType: e.target.value as BalanceSide } : x
                                )
                              )
                            }
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                          >
                            <option value="DEBIT">DEBIT (Dr)</option>
                            <option value="CREDIT">CREDIT (Cr)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
