'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  Search,
  Layers,
  ClipboardList,
  DoorOpen,
  X,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { BoqIssuedReportResult } from '@/lib/services/boqIssueService';

interface BoqIssuedReportPanelProps {
  initialOrderId?: string;
  onClose?: () => void;
}

type ReportTab = 'DOOR_WISE' | 'ORDER_WISE' | 'BATCH_WISE';

function escapeCsv(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function BoqIssuedReportPanel({
  initialOrderId = '',
  onClose,
}: BoqIssuedReportPanelProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('DOOR_WISE');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [shift, setShift] = useState<string>('ALL');
  const [orderFilter, setOrderFilter] = useState<string>(initialOrderId);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BoqIssuedReportResult | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', fromDate);
      if (toDate) qs.set('to', toDate);
      if (shift && shift !== 'ALL') qs.set('shift', shift);
      if (orderFilter) qs.set('prodOrderId', orderFilter);
      if (search.trim()) qs.set('search', search.trim());

      const res = await apiFetch(`/api/boq/issue/report?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Failed to load report (HTTP ${res.status})`);
      }
      setReport(json.data as BoqIssuedReportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOQ issued report');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, shift, orderFilter, search]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = () => {
    if (!report) return;
    let headers: string[] = [];
    let rows: Array<Array<string | number | null | undefined>> = [];
    let filename = 'boq-issued-report.csv';

    if (activeTab === 'DOOR_WISE') {
      filename = `boq-issued-door-wise-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Issue Date',
        'Shift',
        'Job Card',
        'Party',
        'Door #',
        'Size (cm)',
        'Sq.Ft',
        'Voucher #',
        'Batch #',
        'Gang / Team',
        'Resin (Kg)',
        'Gelcoat (Kg)',
        'Catalyst (gm)',
        'Accelerator (gm)',
        'CSM 300 (Kg)',
        'Pigment (gm)',
        'Wood (Cu.Ft)',
        'Foam (Sheets)',
        'Other/Locks (Rs)',
        'Door Issued Value (Rs)',
      ];
      rows = report.doorWise.map((d) => [
        d.issueDate,
        d.shift,
        d.jobCardNumber,
        d.customerName,
        d.doorNumber,
        `${d.widthCm}x${d.heightCm}`,
        d.sqFt.toFixed(2),
        d.voucherNumber,
        d.batchNumber || 'Single Order',
        d.gangName,
        d.resinKg.toFixed(2),
        d.gelKg.toFixed(2),
        Math.round(d.catalystGrams),
        Math.round(d.acceleratorGrams),
        d.csm300Kg.toFixed(2),
        Math.round(d.pigmentGrams),
        d.woodCuFt.toFixed(4),
        d.foamSheets.toFixed(2),
        d.otherValue,
        d.totalValue,
      ]);
    } else if (activeTab === 'ORDER_WISE') {
      filename = `boq-issued-order-wise-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Job Card',
        'Order #',
        'Party',
        'Issued Doors',
        'Total Doors',
        'Balance Doors',
        'Status',
        'Batches/Vouchers',
        'Last Issued Date',
        'Resin (Kg)',
        'Gelcoat (Kg)',
        'CSM 300 (Kg)',
        'Wood (Cu.Ft)',
        'Foam (Sheets)',
        'Total Issued Value (Rs)',
        'Avg Cost/Door (Rs)',
      ];
      rows = report.orderWise.map((o) => [
        o.jobCardNumber,
        o.orderNumber,
        o.customerName,
        o.issuedDoors,
        o.totalDoors,
        o.balanceDoors,
        o.status,
        o.vouchersCount,
        o.lastIssuedDate,
        o.resinKg.toFixed(2),
        o.gelKg.toFixed(2),
        o.csm300Kg.toFixed(2),
        o.woodCuFt.toFixed(4),
        o.foamSheets.toFixed(2),
        o.totalValue,
        o.avgCostPerDoor,
      ]);
    } else {
      filename = `boq-issued-batch-wise-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Batch / Voucher #',
        'Type',
        'Issue Date',
        'Shift',
        'Gang / Team',
        'Parties Count',
        'Party Breakdown',
        'Doors Issued',
        'Resin (Kg)',
        'Gelcoat (Kg)',
        'CSM 300 (Kg)',
        'Wood (Cu.Ft)',
        'Foam (Sheets)',
        'Total Batch Value (Rs)',
        'Avg Cost/Door (Rs)',
      ];
      rows = report.batchWise.map((b) => [
        b.referenceNumber,
        b.issueType === 'CONSOLIDATED_BATCH' ? 'Consolidated Batch' : 'Single Order',
        b.issueDate,
        b.shift,
        b.gangName,
        b.partiesCount,
        b.partySummary,
        b.doorsCount,
        b.resinKg.toFixed(2),
        b.gelKg.toFixed(2),
        b.csm300Kg.toFixed(2),
        b.woodCuFt.toFixed(4),
        b.foamSheets.toFixed(2),
        b.totalValue,
        b.avgCostPerDoor,
      ]);
    }

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const summary = report?.summary;

  return (
    <div className="bg-[#0B132B] border border-cyan-700/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>BOQ Material Issued Report — Door-Wise, Order-Wise &amp; Batch-Wise</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> Zero-Duplicate Protected
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ഓരോ ഡോറിനും, ഓർഡറിനും, ബാച്ചിനും ഇഷ്യൂ ചെയ്ത മെറ്റീരിയൽ അളവുകളും വാല്യൂവും (Door-Wise • Order-Wise • Batch-Wise Audit Ledger).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Close Report"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#070D1E] border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Total Doors Issued</div>
            <div className="text-xl font-black text-white mt-0.5">
              {summary.totalDoorsIssued} Doors
            </div>
            <div className="text-[10.5px] text-cyan-300 mt-0.5">
              {summary.totalOrdersWithIssues} Orders • {summary.totalBatchesCount} Batches
            </div>
          </div>

          <div className="bg-[#070D1E] border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Total Issued Material Value</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
              ₹{summary.totalIssuedValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10.5px] text-emerald-300 mt-0.5 font-mono">
              Avg: ₹{summary.avgCostPerDoor.toLocaleString('en-IN')} / Door
            </div>
          </div>

          <div className="bg-[#070D1E] border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Chemicals &amp; CSM Issued</div>
            <div className="text-lg font-black text-amber-300 mt-0.5 font-mono">
              {summary.resinKg.toFixed(2)} Kg Resin
            </div>
            <div className="text-[10.5px] text-slate-300 mt-0.5">
              Gel: {summary.gelKg.toFixed(2)} Kg • CSM: {summary.csm300Kg.toFixed(2)} Kg
            </div>
          </div>

          <div className="bg-[#070D1E] border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Wood, Foam &amp; Pigments</div>
            <div className="text-lg font-black text-sky-300 mt-0.5 font-mono">
              {summary.woodCuFt.toFixed(3)} Cu.Ft Wood
            </div>
            <div className="text-[10.5px] text-slate-300 mt-0.5">
              Foam: {summary.foamSheets.toFixed(2)} Sh • Pig: {Math.round(summary.pigmentGrams)}g
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#070D1E] border border-slate-800 rounded-xl p-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('DOOR_WISE')}
            className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'DOOR_WISE'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Door-Wise ({report?.doorWise.length ?? 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ORDER_WISE')}
            className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'ORDER_WISE'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Order-Wise ({report?.orderWise.length ?? 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BATCH_WISE')}
            className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'BATCH_WISE'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch-Wise ({report?.batchWise.length ?? 0})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {orderFilter && (
            <button
              type="button"
              onClick={() => setOrderFilter('')}
              className="px-2 py-1 rounded bg-purple-950 text-purple-200 border border-purple-500/50 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Order: {orderFilter}</span>
              <X className="w-3 h-3" />
            </button>
          )}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px]"
            title="From Date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px]"
            title="To Date"
          />
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px] font-semibold cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            <option value="MORNING">Morning</option>
            <option value="AFTERNOON">Afternoon</option>
            <option value="EVENING">Evening</option>
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Party, Job Card, Door #, Batch..."
              className="w-48 bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-white text-[11px]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {/* TABLE VIEWS */}
      {loading && !report ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading BOQ Issued Report...</div>
      ) : activeTab === 'DOOR_WISE' ? (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#070D1E] text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Door # &amp; Size</th>
                <th className="p-2.5">Job Card &amp; Party</th>
                <th className="p-2.5">Batch / Voucher</th>
                <th className="p-2.5">Date / Team</th>
                <th className="p-2.5 text-right">Resin</th>
                <th className="p-2.5 text-right">Gel</th>
                <th className="p-2.5 text-right">Cat / Acc</th>
                <th className="p-2.5 text-right">CSM 300</th>
                <th className="p-2.5 text-right">Pigment</th>
                <th className="p-2.5 text-right">Wood</th>
                <th className="p-2.5 text-right">Foam</th>
                <th className="p-2.5 text-right">Door Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {!report || report.doorWise.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    No issued doors found for the current filters. Issue BOQ materials from Single Order or Consolidated Multi-Party BOQ to populate this report.
                  </td>
                </tr>
              ) : (
                report.doorWise.map((d) => (
                  <tr key={d.key} className="hover:bg-slate-800/30">
                    <td className="p-2.5">
                      <div className="font-black text-white">{d.doorNumber}</div>
                      <div className="text-[9.5px] text-slate-400 font-mono">
                        {d.widthCm}×{d.heightCm} cm ({d.sqFt.toFixed(2)} sq.ft)
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-200 truncate max-w-[170px]">
                        {d.customerName.split('(')[0].trim()}
                      </div>
                      <div className="text-[9.5px] font-mono text-cyan-300">{d.jobCardNumber}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-mono font-bold text-amber-300">
                        {d.batchNumber || d.voucherNumber}
                      </div>
                      <span className="text-[9px] text-slate-400">
                        {d.issueType === 'CONSOLIDATED_BATCH' ? `Batch (${d.voucherNumber})` : 'Single Order'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-mono text-slate-200">{d.issueDate}</div>
                      <div className="text-[9.5px] text-slate-400">
                        {d.shift} • {d.gangName}
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-300">
                      {d.resinKg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-200">
                      {d.gelKg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-cyan-300">
                      {Math.round(d.catalystGrams)}/{Math.round(d.acceleratorGrams)}g
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-300">
                      {d.csm300Kg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-300">
                      {Math.round(d.pigmentGrams)}g
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-200">
                      {d.woodCuFt.toFixed(3)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-sky-300">
                      {d.foamSheets.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-400">
                      ₹{d.totalValue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {report && report.doorWise.length > 0 && summary && (
              <tfoot className="bg-[#070D1E] border-t-2 border-emerald-600/50 font-black text-white">
                <tr>
                  <td colSpan={4} className="p-2.5 text-right uppercase text-[10.5px]">
                    Total ({summary.totalDoorsIssued} Doors Issued):
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-300">
                    {summary.resinKg.toFixed(2)} Kg
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-200">
                    {summary.gelKg.toFixed(2)} Kg
                  </td>
                  <td className="p-2.5 text-right font-mono text-cyan-300">
                    {Math.round(summary.catalystGrams)}/{Math.round(summary.acceleratorGrams)}g
                  </td>
                  <td className="p-2.5 text-right font-mono text-amber-300">
                    {summary.csm300Kg.toFixed(2)} Kg
                  </td>
                  <td className="p-2.5 text-right font-mono text-purple-300">
                    {Math.round(summary.pigmentGrams)}g
                  </td>
                  <td className="p-2.5 text-right font-mono text-amber-200">
                    {summary.woodCuFt.toFixed(3)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-sky-300">
                    {summary.foamSheets.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-400 text-xs">
                    ₹{summary.totalIssuedValue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : activeTab === 'ORDER_WISE' ? (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#070D1E] text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Job Card &amp; Party</th>
                <th className="p-2.5 text-center">Doors Progress</th>
                <th className="p-2.5 text-center">Batches</th>
                <th className="p-2.5 text-right">Resin</th>
                <th className="p-2.5 text-right">Gel</th>
                <th className="p-2.5 text-right">CSM 300</th>
                <th className="p-2.5 text-right">Wood Cu.Ft</th>
                <th className="p-2.5 text-right">Foam</th>
                <th className="p-2.5 text-right">Total Value (₹)</th>
                <th className="p-2.5 text-right">Avg / Door</th>
                <th className="p-2.5 text-right">Drill Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {!report || report.orderWise.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No order-wise BOQ issues recorded for the selected filters.
                  </td>
                </tr>
              ) : (
                report.orderWise.map((o) => (
                  <tr key={o.prodOrderId} className="hover:bg-slate-800/30">
                    <td className="p-2.5">
                      <div className="font-black text-white">{o.customerName.split('(')[0].trim()}</div>
                      <div className="text-[9.5px] font-mono text-cyan-300">
                        {o.jobCardNumber} • Last: {o.lastIssuedDate}
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          o.status === 'FULLY_ISSUED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                        }`}
                      >
                        {o.issuedDoors}/{o.totalDoors} Issued
                        {o.balanceDoors > 0 ? ` • ${o.balanceDoors} Bal` : ' ✓'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-300">{o.vouchersCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-300">
                      {o.resinKg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-200">
                      {o.gelKg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-300">
                      {o.csm300Kg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-200">
                      {o.woodCuFt.toFixed(3)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-sky-300">
                      {o.foamSheets.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-400">
                      ₹{o.totalValue.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-300">
                      ₹{o.avgCostPerDoor.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setOrderFilter(o.prodOrderId);
                          setActiveTab('DOOR_WISE');
                        }}
                        className="px-2 py-1 rounded bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-600/40 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Doors</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#070D1E] text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Batch / Voucher #</th>
                <th className="p-2.5">Date / Shift &amp; Team</th>
                <th className="p-2.5">Parties &amp; Doors</th>
                <th className="p-2.5 text-right">Resin</th>
                <th className="p-2.5 text-right">Gel</th>
                <th className="p-2.5 text-right">CSM 300</th>
                <th className="p-2.5 text-right">Wood</th>
                <th className="p-2.5 text-right">Foam</th>
                <th className="p-2.5 text-right">Batch Value (₹)</th>
                <th className="p-2.5 text-right">Avg / Door</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {!report || report.batchWise.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No batches recorded for the selected filters.
                  </td>
                </tr>
              ) : (
                report.batchWise.map((b) => (
                  <tr key={b.batchKey} className="hover:bg-slate-800/30">
                    <td className="p-2.5">
                      <div className="font-mono font-black text-amber-300">{b.referenceNumber}</div>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          b.issueType === 'CONSOLIDATED_BATCH'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {b.issueType === 'CONSOLIDATED_BATCH' ? 'Consolidated Batch' : 'Single Order'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-mono text-slate-200">
                        {b.issueDate} <span className="text-cyan-300">({b.shift})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{b.gangName}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-white">
                        {b.doorsCount} Doors ({b.partiesCount} Part{b.partiesCount === 1 ? 'y' : 'ies'})
                      </div>
                      <div className="text-[10px] text-slate-400">{b.partySummary}</div>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-300">
                      {b.resinKg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-200">
                      {b.gelKg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-300">
                      {b.csm300Kg.toFixed(2)} Kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-200">
                      {b.woodCuFt.toFixed(3)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-sky-300">
                      {b.foamSheets.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-400">
                      ₹{b.totalValue.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-300">
                      ₹{b.avgCostPerDoor.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
