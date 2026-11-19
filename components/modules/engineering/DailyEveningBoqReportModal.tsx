'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Layers,
  Users,
  Package,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { DailyEveningBoqSummary } from '@/lib/services/boqIssueService';

interface DailyEveningBoqReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

type EveningViewMode = 'DAY_TOTAL' | 'PARTY_WISE' | 'BATCH_WISE';

export function DailyEveningBoqReportModal({
  isOpen,
  onClose,
  initialDate,
}: DailyEveningBoqReportModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [viewMode, setViewMode] = useState<EveningViewMode>('DAY_TOTAL');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailyEveningBoqSummary | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/boq/daily-summary?date=${selectedDate}`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Failed to fetch daily BOQ summary');
      }
      setSummary(json.data as DailyEveningBoqSummary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading report');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleCopyWhatsApp = () => {
    if (!summary) return;
    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    const dt = summary.dayTotals;

    const lines = [
      `🏭 *EXMARK DOORS — DAILY EVENING BOQ RECONCILIATION*`,
      `📅 *Date*: ${summary.date} | *Doors Issued*: ${summary.totalDoorsIssued}`,
      `───────────────────────────────`,
      `🧪 *Today's Total Raw Material Consumption*:`,
      `   • General Resin: *${dt.resinKg} Kg*`,
      `   • Surface Gelcoat: *${dt.gelKg} Kg*`,
      `   • MEKP Catalyst: *${dt.catalystGrams} gm*`,
      `   • Cobalt Accelerator: *${dt.acceleratorGrams} gm*`,
      `   • Glass Fiber CSM 450: *${dt.csm300Kg} Kg*`,
      `   • Woven Roving: *${dt.wovenRovingKg} Kg*`,
      `   • Timber Stiles / Reepers: *${dt.woodReepersCount} Pcs* (${dt.woodCuFt} Cu.Ft)`,
      `   • Lock Kits: *${dt.lockKitsCount} Boxes*`,
      `   • Total Floor Material Value: *${fmt(summary.totalMaterialValue)}*`,
      `───────────────────────────────`,
      `👥 *Party-Wise Consumption (${summary.partyWise.length} Parties)*:`,
      ...summary.partyWise.map(
        (p, idx) =>
          `   ${idx + 1}. *${p.customerName}* (${p.jobCardNumber}): ${p.doorsIssued} Doors • ${p.resinKg}kg Resin, ${p.csmKg}kg CSM (${fmt(p.totalValue)})`
      ),
      `───────────────────────────────`,
      `🔨 *Batch / Gang Split (${summary.batchWise.length} Batches)*:`,
      ...summary.batchWise.map(
        (b) =>
          `   • ${b.voucherNumber} (${b.gangName} • ${b.shift}): ${b.doorsIssued} Doors • ${fmt(b.totalValue)}`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportCsv = () => {
    if (!summary) return;
    let csv = `Date,${summary.date}\nTotal Doors,${summary.totalDoorsIssued}\nTotal Material Value,${summary.totalMaterialValue}\n\n`;

    if (viewMode === 'DAY_TOTAL') {
      csv += `Material Item,Unit,Total Quantity Used Today\n`;
      csv += `General Resin,Kg,${summary.dayTotals.resinKg}\n`;
      csv += `Surface Gelcoat,Kg,${summary.dayTotals.gelKg}\n`;
      csv += `MEKP Catalyst,Grams,${summary.dayTotals.catalystGrams}\n`;
      csv += `Cobalt Accelerator,Grams,${summary.dayTotals.acceleratorGrams}\n`;
      csv += `Glass Fiber CSM 450,Kg,${summary.dayTotals.csm300Kg}\n`;
      csv += `Woven Roving,Kg,${summary.dayTotals.wovenRovingKg}\n`;
      csv += `Timber Reepers,Pcs,${summary.dayTotals.woodReepersCount}\n`;
      csv += `Timber Volume,Cu.Ft,${summary.dayTotals.woodCuFt}\n`;
      csv += `Lock Kit Boxes,Boxes,${summary.dayTotals.lockKitsCount}\n`;
    } else if (viewMode === 'PARTY_WISE') {
      csv += `Party / Customer,Job Card,Order #,Doors Issued,Resin (Kg),Gelcoat (Kg),CSM (Kg),Wood (Cu.Ft),Total Value (Rs)\n`;
      summary.partyWise.forEach((p) => {
        csv += `"${p.customerName}",${p.jobCardNumber},${p.orderNumber},${p.doorsIssued},${p.resinKg},${p.gelKg},${p.csmKg},${p.woodCuFt},${p.totalValue}\n`;
      });
    } else {
      csv += `Voucher #,Batch #,Shift,Gang Name,Doors Issued,Resin (Kg),Gelcoat (Kg),CSM (Kg),Total Value (Rs)\n`;
      summary.batchWise.forEach((b) => {
        csv += `${b.voucherNumber},${b.batchNumber || '-'},${b.shift},"${b.gangName}",${b.doorsIssued},${b.resinKg},${b.gelKg},${b.csmKg},${b.totalValue}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evening-boq-report-${summary.date}-${viewMode.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs printable-modal-root">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 flex flex-col print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>DAILY EVENING BOQ MATERIAL RECONCILIATION</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700 font-mono">
                  {selectedDate}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                End-of-day factory raw material consumption across Day, Customer &amp; Batch shifts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
            />
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs Bar */}
        <div className="px-5 py-2.5 bg-[#091024] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('DAY_TOTAL')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'DAY_TOTAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1. Day Basis (Grand Total)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('PARTY_WISE')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'PARTY_WISE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Each Party Basis</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BATCH_WISE')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'BATCH_WISE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Batch / Team Basis</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied WhatsApp!' : 'Copy WhatsApp Summary'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Slip</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {loading && (
            <div className="p-8 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              <span>Loading today&apos;s BOQ material issues...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {!loading && summary && (
            <>
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Doors Issued Today</span>
                  <strong className="text-xl font-mono text-emerald-400 block mt-0.5">
                    {summary.totalDoorsIssued} DOORS
                  </strong>
                  <span className="text-[10.5px] text-slate-500">{summary.totalVouchersCount} Vouchers Released</span>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Material Cost Value</span>
                  <strong className="text-xl font-mono text-amber-300 block mt-0.5">
                    ₹{summary.totalMaterialValue.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10.5px] text-slate-500">{summary.totalPartiesCount} Parties Covered</span>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Resin Used</span>
                  <strong className="text-xl font-mono text-cyan-300 block mt-0.5">
                    {summary.dayTotals.resinKg} KG
                  </strong>
                  <span className="text-[10.5px] text-slate-500">Gelcoat: {summary.dayTotals.gelKg} Kg</span>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fiber Reinforcement</span>
                  <strong className="text-xl font-mono text-purple-300 block mt-0.5">
                    {summary.dayTotals.csm300Kg} KG
                  </strong>
                  <span className="text-[10.5px] text-slate-500">CSM 450 + Woven Roving</span>
                </div>
              </div>

              {/* View 1: Day Basis (Grand Total Material Breakdown) */}
              {viewMode === 'DAY_TOTAL' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-amber-300 tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Company-Wide Day Total Material Ledger ({summary.date})</span>
                  </h3>
                  <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 text-[10.5px] uppercase font-bold border-b border-slate-800">
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Material Specification</th>
                          <th className="p-2.5 text-center">Unit</th>
                          <th className="p-2.5 text-right">Total Quantity Consumed Today</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        <tr>
                          <td className="p-2.5 text-cyan-300 font-bold">Liquid Chemical</td>
                          <td className="p-2.5 font-semibold">General Purpose Polyester Resin (Layup)</td>
                          <td className="p-2.5 text-center font-mono">Kg</td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-300 text-sm">{summary.dayTotals.resinKg}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-cyan-300 font-bold">Liquid Chemical</td>
                          <td className="p-2.5 font-semibold">Surface Isophthalic Gelcoat</td>
                          <td className="p-2.5 text-center font-mono">Kg</td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-300 text-sm">{summary.dayTotals.gelKg}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-cyan-300 font-bold">Chemical Catalyst</td>
                          <td className="p-2.5 font-semibold">MEKP Catalyst (Hardener)</td>
                          <td className="p-2.5 text-center font-mono">Grams</td>
                          <td className="p-2.5 text-right font-mono font-bold text-cyan-300">{summary.dayTotals.catalystGrams}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-cyan-300 font-bold">Chemical Accelerator</td>
                          <td className="p-2.5 font-semibold">Cobalt Accelerator (6%)</td>
                          <td className="p-2.5 text-center font-mono">Grams</td>
                          <td className="p-2.5 text-right font-mono font-bold text-cyan-300">{summary.dayTotals.acceleratorGrams}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-purple-300 font-bold">Fiber Mat</td>
                          <td className="p-2.5 font-semibold">Chopped Strand Mat (CSM 450)</td>
                          <td className="p-2.5 text-center font-mono">Kg</td>
                          <td className="p-2.5 text-right font-mono font-bold text-purple-300 text-sm">{summary.dayTotals.csm300Kg}</td>
                        </tr>
                        {summary.dayTotals.wovenRovingKg > 0 && (
                          <tr>
                            <td className="p-2.5 text-purple-300 font-bold">Fiber Reinforce</td>
                            <td className="p-2.5 font-semibold">Woven Roving 600 GSM</td>
                            <td className="p-2.5 text-center font-mono">Kg</td>
                            <td className="p-2.5 text-right font-mono font-bold text-purple-300">{summary.dayTotals.wovenRovingKg}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="p-2.5 text-emerald-300 font-bold">Core Timber</td>
                          <td className="p-2.5 font-semibold">Treated Wooden Stiles &amp; Rails (Reepers)</td>
                          <td className="p-2.5 text-center font-mono">Pieces</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-300">{summary.dayTotals.woodReepersCount} ({summary.dayTotals.woodCuFt} Cu.Ft)</td>
                        </tr>
                        {summary.dayTotals.foamSheets > 0 && (
                          <tr>
                            <td className="p-2.5 text-slate-300 font-bold">Core Foam</td>
                            <td className="p-2.5 font-semibold">Rigid High-Density PU Foam Sheets</td>
                            <td className="p-2.5 text-center font-mono">Sheets</td>
                            <td className="p-2.5 text-right font-mono font-bold">{summary.dayTotals.foamSheets}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="p-2.5 text-amber-300 font-bold">Hardware &amp; Packing</td>
                          <td className="p-2.5 font-semibold">Lock Kit Boxes &amp; Fasteners</td>
                          <td className="p-2.5 text-center font-mono">Boxes</td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-300">{summary.dayTotals.lockKitsCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 2: Each Party Basis */}
              {viewMode === 'PARTY_WISE' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-amber-300 tracking-wide flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Customer &amp; Party-Wise Material Consumption ({summary.partyWise.length} Parties)</span>
                  </h3>
                  <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 text-[10.5px] uppercase font-bold border-b border-slate-800">
                          <th className="p-2.5">Party / Customer</th>
                          <th className="p-2.5">Job Card</th>
                          <th className="p-2.5 text-center">Doors</th>
                          <th className="p-2.5 text-right">Resin (Kg)</th>
                          <th className="p-2.5 text-right">Gelcoat (Kg)</th>
                          <th className="p-2.5 text-right">Fiber CSM (Kg)</th>
                          <th className="p-2.5 text-right">Wood (Cu.Ft)</th>
                          <th className="p-2.5 text-right">Total Material Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {summary.partyWise.map((p) => (
                          <tr key={p.jobCardNumber} className="hover:bg-slate-900/40">
                            <td className="p-2.5 font-bold text-white">{p.customerName}</td>
                            <td className="p-2.5 font-mono text-cyan-300">{p.jobCardNumber}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-400">{p.doorsIssued}</td>
                            <td className="p-2.5 text-right font-mono">{p.resinKg}</td>
                            <td className="p-2.5 text-right font-mono">{p.gelKg}</td>
                            <td className="p-2.5 text-right font-mono">{p.csmKg}</td>
                            <td className="p-2.5 text-right font-mono">{p.woodCuFt}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-300">
                              ₹{p.totalValue.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 3: Batch Basis */}
              {viewMode === 'BATCH_WISE' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-amber-300 tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Batch, Shift &amp; Gang-Wise Distribution ({summary.batchWise.length} Batches)</span>
                  </h3>
                  <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 text-[10.5px] uppercase font-bold border-b border-slate-800">
                          <th className="p-2.5">Voucher / Batch #</th>
                          <th className="p-2.5">Shift</th>
                          <th className="p-2.5">Molding Gang / Team</th>
                          <th className="p-2.5 text-center">Doors</th>
                          <th className="p-2.5 text-right">Resin (Kg)</th>
                          <th className="p-2.5 text-right">Gelcoat (Kg)</th>
                          <th className="p-2.5 text-right">CSM (Kg)</th>
                          <th className="p-2.5 text-right">Batch Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {summary.batchWise.map((b) => (
                          <tr key={b.voucherNumber} className="hover:bg-slate-900/40">
                            <td className="p-2.5 font-mono font-bold text-cyan-300">{b.voucherNumber}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 font-mono">
                                {b.shift}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-amber-300 flex items-center gap-1">
                              <span>🔨 {b.gangName}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-400">{b.doorsIssued}</td>
                            <td className="p-2.5 text-right font-mono">{b.resinKg}</td>
                            <td className="p-2.5 text-right font-mono">{b.gelKg}</td>
                            <td className="p-2.5 text-right font-mono">{b.csmKg}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                              ₹{b.totalValue.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Printable Sign-Off Footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-end text-xs text-slate-400 print:text-black">
                <div>
                  <p className="font-bold">EXMARK ERP • Factory Production Store Hub</p>
                  <p className="text-[10px]">Verified against physical tank &amp; rack dispatch</p>
                </div>
                <div className="flex gap-8 text-center text-[10.5px]">
                  <div>
                    <span className="inline-block w-28 border-b border-slate-500 mb-1" />
                    <p>Storekeeper In-Charge</p>
                  </div>
                  <div>
                    <span className="inline-block w-28 border-b border-slate-500 mb-1" />
                    <p>Plant Supervisor</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default DailyEveningBoqReportModal;
