'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  TrendingUp,
  Calculator,
  Upload,
  Plus,
  Trash2,
  Printer,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Layers,
  Target,
  X,
} from 'lucide-react';
import { BreakEvenAnalysis, calculateBreakEven } from '@/types/finance';
import type {
  ComprehensiveBreakEvenReport,
  FixedOverheadCategory,
  FixedOverheadItem,
} from '@/lib/services/breakEvenService';
import { DayBookAndExpensesModal } from './DayBookAndExpensesModal';

const OVERHEAD_CATEGORIES: Array<{ value: FixedOverheadCategory; label: string }> = [
  { value: 'FACTORY_RENT', label: 'Factory Shed & Yard Rent' },
  { value: 'SALARIES_FIXED', label: 'Fixed Staff Salaries' },
  { value: 'ELECTRICITY_UTILITIES', label: '3-Phase Electricity & Water' },
  { value: 'LOAN_EMI_DEPRECIATION', label: 'Machinery EMI / Dep.' },
  { value: 'OFFICE_ADMIN', label: 'Office, WiFi & Admin' },
  { value: 'OTHER_FIXED', label: 'Other Fixed Overhead' },
];

const formatInr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type AnalysisViewMode = 'LIVE_ACTUALS' | 'IMPORTED_MONTH' | 'STANDARD_BOM' | 'CUSTOM_SIMULATOR';

export function BreakEvenPanel() {
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState<AnalysisViewMode>('LIVE_ACTUALS');
  const [includeFloorConsumables, setIncludeFloorConsumables] = useState(true);
  const [includeProjectedCosts, setIncludeProjectedCosts] = useState(true);
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState(26);
  const [targetProfit, setTargetProfit] = useState(0);

  const [report, setReport] = useState<ComprehensiveBreakEvenReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recurring Fixed Overheads inline add form
  const [ohCategory, setOhCategory] = useState<FixedOverheadCategory>('FACTORY_RENT');
  const [ohName, setOhName] = useState('');
  const [ohAmount, setOhAmount] = useState('');
  const [isSavingOh, setIsSavingOh] = useState(false);

  // Simulator controls
  const [simFixed, setSimFixed] = useState(450000);
  const [simPrice, setSimPrice] = useState(8500);
  const [simVarCost, setSimVarCost] = useState(4800);
  const [simTargetRev, setSimTargetRev] = useState(2500000);

  // Modals
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const loadBreakEvenData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sourceParam =
        viewMode === 'IMPORTED_MONTH' ? 'IMPORTED_MONTH_DAYBOOK' : 'HYBRID_ERP';
      const qs = new URLSearchParams({
        month: monthKey,
        costDataSource: sourceParam,
        includeProjected: includeProjectedCosts ? 'true' : 'false',
        includeFloorConsumables: includeFloorConsumables ? 'true' : 'false',
        workingDays: String(workingDaysPerMonth),
        targetProfit: String(targetProfit),
      });
      const res = await apiFetch(`/api/finance/break-even?${qs.toString()}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setReport(json.data as ComprehensiveBreakEvenReport);
      } else {
        setError(json.error || 'Failed to compute break-even metrics');
      }
    } catch {
      setError('Network error loading break-even analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [monthKey, viewMode, includeProjectedCosts, includeFloorConsumables, workingDaysPerMonth, targetProfit]);

  useEffect(() => {
    loadBreakEvenData();
  }, [loadBreakEvenData]);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddOverhead = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(ohAmount);
    if (!ohName.trim() || !Number.isFinite(amt) || amt <= 0) {
      setError('Enter an overhead label and valid positive monthly ₹ amount.');
      return;
    }
    setIsSavingOh(true);
    setError(null);
    try {
      const res = await apiFetch('/api/finance/break-even', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: ohCategory,
          name: ohName.trim(),
          monthlyAmount: amt,
        }),
      });
      if (res.ok) {
        setOhName('');
        setOhAmount('');
        showNotice(`Added fixed overhead "${ohName.trim()}" (${formatInr(amt)}/mo).`);
        await loadBreakEvenData();
      }
    } catch {
      setError('Failed to save overhead.');
    } finally {
      setIsSavingOh(false);
    }
  };

  const handleToggleOverhead = async (item: FixedOverheadItem) => {
    try {
      const res = await apiFetch('/api/finance/break-even', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, active: !item.active }),
      });
      if (res.ok) await loadBreakEvenData();
    } catch {
      setError('Failed to toggle overhead.');
    }
  };

  const handleDeleteOverhead = async (id: string) => {
    try {
      const res = await apiFetch(`/api/finance/break-even?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotice('Removed recurring overhead item.');
        await loadBreakEvenData();
      }
    } catch {
      setError('Failed to delete overhead item.');
    }
  };

  const handleLoadSampleOverheads = async () => {
    try {
      const res = await apiFetch('/api/finance/break-even', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOAD_SAMPLE_PRESET' }),
      });
      if (res.ok) {
        showNotice('Loaded sample Kerala factory overheads (₹4,50,000/mo). Edit amounts to match your actual bills.');
        await loadBreakEvenData();
      }
    } catch {
      setError('Failed to load sample overhead preset.');
    }
  };

  const activeSimAnalysis: BreakEvenAnalysis = useMemo(
    () =>
      calculateBreakEven({
        fixedOverheadCosts: simFixed,
        averageFRPPricePerDoor: simPrice,
        variableCostPerDoor: simVarCost,
        targetSalesRevenue: simTargetRev,
        targetProfit,
        workingDaysPerMonth,
      }),
    [simFixed, simPrice, simVarCost, simTargetRev, targetProfit, workingDaysPerMonth]
  );

  // Select active unit economics & break-even based on selected viewMode
  const displayedBreakEven: BreakEvenAnalysis = useMemo(() => {
    if (viewMode === 'CUSTOM_SIMULATOR') return activeSimAnalysis;
    if (!report) return activeSimAnalysis;
    if (viewMode === 'STANDARD_BOM') return report.standardEngineeringBreakEven;
    if (viewMode === 'IMPORTED_MONTH' && report.importedMonthBreakEven) {
      return report.importedMonthBreakEven;
    }
    return report.liveErpBreakEven;
  }, [viewMode, activeSimAnalysis, report]);

  const displayedUnitEcon = useMemo(() => {
    if (!report) return null;
    if (viewMode === 'STANDARD_BOM') return report.standardEngineeringBaseline;
    if (viewMode === 'IMPORTED_MONTH' && report.importedMonthUnitEconomics) {
      return report.importedMonthUnitEconomics;
    }
    return report.liveErpUnitEconomics;
  }, [viewMode, report]);

  const loadIntoSimulator = (source: 'LIVE' | 'STANDARD') => {
    if (!report) return;
    const targetFixed = report.fixedCostsBreakdown.totalFixedMonthlyCost || 450000;
    const ue = source === 'LIVE' ? report.liveErpUnitEconomics : report.standardEngineeringBaseline;
    setSimFixed(targetFixed);
    setSimPrice(ue.avgSellingPricePerDoor);
    setSimVarCost(ue.totalVariableCostPerDoor);
    setViewMode('CUSTOM_SIMULATOR');
    showNotice(`Loaded ${source === 'LIVE' ? 'Live ERP' : 'Standard Cat C BOM'} unit economics into Simulator.`);
  };

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      'Category / Mix',
      'Specification',
      'Selling Price (INR)',
      'Material & Lock Cost',
      'Paint BOM Cost',
      'Piece-Rate Labor',
      'Total Variable Cost',
      'Contribution Margin / Door',
      'CM Ratio (%)',
      'Break-Even Doors / Mo',
      'Break-Even Revenue (INR)',
    ];
    const rows = report.engineeringMatrix.map((r) => [
      `"${r.label}"`,
      `"${r.variant}"`,
      r.sellingPrice,
      r.materialAndLockCost,
      r.paintBomCost,
      r.pieceRateCost,
      r.variableCost,
      r.cmPerDoor,
      `${r.cmRatioPct}%`,
      r.breakEvenUnits,
      r.breakEvenRevenue,
    ]);
    const csv = [
      `"EXMARK DOORS - BREAK-EVEN ANALYSIS (${monthKey})"`,
      `"Total Monthly Fixed Costs:","${report.fixedCostsBreakdown.totalFixedMonthlyCost}"`,
      `"Active Break-Even Doors:","${displayedBreakEven.breakEvenUnits}"`,
      `"Active Break-Even Sales:","${displayedBreakEven.breakEvenRevenue}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EXMARK_Break_Even_${monthKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice(`Exported Break-Even CVP matrix for ${monthKey}.`);
  };

  // Build inline SVG CVP plot coordinates
  const cvpSvgPoints = useMemo(() => {
    const fixed = displayedBreakEven.fixedOverheadCosts;
    const price = displayedBreakEven.averageFRPPricePerDoor;
    const varCost = displayedBreakEven.variableCostPerDoor;
    const actualDoors = report?.monthProgress.doorsAchieved || 0;
    const bep = displayedBreakEven.breakEvenUnits;
    const maxDoors = Math.max(40, actualDoors * 1.25, bep > 0 ? Math.ceil(bep * 1.75) : 160);
    const maxY = Math.max(fixed * 1.4, maxDoors * price, maxDoors * varCost + fixed, 100000);

    const w = 560;
    const h = 190;
    const padL = 56;
    const padR = 16;
    const padT = 16;
    const padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const toX = (d: number) => padL + (Math.min(maxDoors, Math.max(0, d)) / maxDoors) * plotW;
    const toY = (val: number) => padT + plotH - (Math.min(maxY, Math.max(0, val)) / maxY) * plotH;

    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      maxDoors,
      maxY,
      fixedY: toY(fixed),
      revEnd: { x: toX(maxDoors), y: toY(maxDoors * price) },
      costStart: { x: toX(0), y: toY(fixed) },
      costEnd: { x: toX(maxDoors), y: toY(fixed + maxDoors * varCost) },
      bepPoint:
        displayedBreakEven.isViable && bep > 0 && bep <= maxDoors
          ? { x: toX(bep), y: toY(displayedBreakEven.breakEvenRevenue), bep }
          : null,
      actualX: actualDoors > 0 ? toX(actualDoors) : null,
      origin: { x: toX(0), y: toY(0) },
    };
  }, [displayedBreakEven, report?.monthProgress.doorsAchieved]);

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-red-500" />
            <span>Break-Even &amp; Cost-Volume-Profit (CVP) Engineering</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monthly Fixed Overheads + Staff Salaries vs. Unit Contribution Margin (Raw BOM + Locks + Paint + Floor Piece-Rates + Freight)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
          />

          <button
            type="button"
            onClick={() => setIsImporterOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Vyapar / 1-Mo Expenses</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4 Report</span>
          </button>

          <button
            type="button"
            onClick={loadBreakEvenData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
            title="Refresh Live Calculation"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {error && (
        <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calculation Method Switcher & Target Controls */}
      <div className="p-3 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'LIVE_ACTUALS', label: '1. Live ERP Actuals (Hybrid)' },
            { id: 'IMPORTED_MONTH', label: '2. Vyapar / 1-Month Import Only' },
            { id: 'STANDARD_BOM', label: '3. Standard BOQ + Rate Card (Cat C)' },
            { id: 'CUSTOM_SIMULATOR', label: '4. What-If Simulator' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id as AnalysisViewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === tab.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Working Days:</span>
            <input
              type="number"
              min="1"
              max="31"
              value={workingDaysPerMonth}
              onChange={(e) => setWorkingDaysPerMonth(Math.max(1, Number(e.target.value) || 26))}
              className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white text-center"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Target Profit ₹:</span>
            <input
              type="number"
              min="0"
              step="10000"
              value={targetProfit || ''}
              onChange={(e) => setTargetProfit(Math.max(0, Number(e.target.value) || 0))}
              placeholder="e.g. 200000"
              className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
            />
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFloorConsumables}
              onChange={(e) => setIncludeFloorConsumables(e.target.checked)}
            />
            <span>+ Store Floor Consumables</span>
          </label>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeProjectedCosts}
              onChange={(e) => setIncludeProjectedCosts(e.target.checked)}
            />
            <span>+ Projected WIP Paint/Labor</span>
          </label>
        </div>
      </div>

      {/* Warning Banners */}
      {report && !report.fixedCostsBreakdown.fixedCostsConfigured && viewMode !== 'CUSTOM_SIMULATOR' && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Monthly Fixed Overheads are currently ₹0.</strong> Add your Rent, Fixed Staff Salaries &amp; Electricity below or upload your Vyapar Expense Report so Break-Even Doors reflect real factory overheads.
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsImporterOpen(true)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold cursor-pointer"
            >
              Import Vyapar Expense
            </button>
            <button
              type="button"
              onClick={handleLoadSampleOverheads}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold cursor-pointer"
            >
              Load Sample ₹4.5L Overheads
            </button>
          </div>
        </div>
      )}

      {report?.importedMonthNote && viewMode === 'IMPORTED_MONTH' && (
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs">
          {report.importedMonthNote}
        </div>
      )}

      {/* Simulator Inline Controls */}
      {viewMode === 'CUSTOM_SIMULATOR' && (
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-red-400" />
              <span>Interactive What-If CVP Simulator</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadIntoSimulator('LIVE')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold cursor-pointer"
              >
                Auto-Fill Live ERP
              </button>
              <button
                type="button"
                onClick={() => loadIntoSimulator('STANDARD')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold cursor-pointer"
              >
                Auto-Fill Standard Cat C BOM
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Monthly Fixed Costs ₹</label>
              <input
                type="number"
                value={simFixed}
                onChange={(e) => setSimFixed(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Avg Selling Price / Door ₹</label>
              <input
                type="number"
                value={simPrice}
                onChange={(e) => setSimPrice(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Variable Cost / Door ₹</label>
              <input
                type="number"
                value={simVarCost}
                onChange={(e) => setSimVarCost(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target Monthly Sales ₹</label>
              <input
                type="number"
                value={simTargetRev}
                onChange={(e) => setSimTargetRev(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono font-bold text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Break-Even KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Fixed Costs</span>
          <p className="text-xl font-black text-white font-mono">
            {formatInr(displayedBreakEven.fixedOverheadCosts)}
          </p>
          <span className="text-[10px] text-slate-400">Rent + Fixed Salary + EB + EMI</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Contribution Margin / Door</span>
          <p
            className={`text-xl font-black font-mono ${
              displayedBreakEven.isViable ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatInr(displayedBreakEven.contributionMarginPerDoor)}
          </p>
          <span className="text-[10px] text-emerald-400 font-mono">
            {(displayedBreakEven.contributionMarginRatio * 100).toFixed(1)}% CM Ratio
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Break-Even Threshold</span>
          <p className="text-xl font-black text-red-400 font-mono">
            {displayedBreakEven.isViable ? `${displayedBreakEven.breakEvenUnits} Doors` : 'Not Viable'}
          </p>
          <span className="text-[10px] text-slate-400">
            {displayedBreakEven.dailyBreakEvenUnits} doors / day ({workingDaysPerMonth}d)
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Break-Even Sales Value</span>
          <p className="text-xl font-black text-red-400 font-mono">
            {displayedBreakEven.isViable ? formatInr(displayedBreakEven.breakEvenRevenue) : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-400">Zero-profit revenue boundary</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {targetProfit > 0 ? `For ${formatInr(targetProfit)} Profit` : 'Margin of Safety'}
          </span>
          <p className="text-xl font-black text-indigo-400 font-mono">
            {targetProfit > 0
              ? `${displayedBreakEven.requiredUnitsForTargetProfit} Doors`
              : `${displayedBreakEven.marginOfSafetyPercentage}%`}
          </p>
          <span className="text-[10px] text-slate-400">
            {targetProfit > 0
              ? `${displayedBreakEven.dailyTargetProfitUnits}/day • ${formatInr(displayedBreakEven.requiredRevenueForTargetProfit)}`
              : `Buffer: ${formatInr(displayedBreakEven.marginOfSafetyAmount)}`}
          </span>
        </div>
      </div>

      {/* Month Actuals Progress Bar */}
      {report && viewMode !== 'CUSTOM_SIMULATOR' && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>
                {monthKey} Progress vs Break-Even: {report.monthProgress.doorsAchieved} / {displayedBreakEven.breakEvenUnits} Doors ({report.monthProgress.breakEvenProgressPct}%)
              </span>
            </div>
            <div className="font-mono text-xs">
              {report.monthProgress.surplusDoorsAboveBreakEven > 0 ? (
                <span className="text-emerald-400 font-bold">
                  +{report.monthProgress.surplusDoorsAboveBreakEven} Doors Above BEP • Operating Profit: {formatInr(report.monthProgress.operatingProfitOrLoss)}
                </span>
              ) : (
                <span className="text-amber-300 font-bold">
                  {report.monthProgress.doorsRemainingToBreakEven} More Doors ({formatInr(report.monthProgress.revenueRemainingToBreakEven)}) Needed to Reach Break-Even
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all ${
                report.monthProgress.breakEvenProgressPct >= 100
                  ? 'bg-emerald-500'
                  : report.monthProgress.breakEvenProgressPct >= 60
                  ? 'bg-amber-500'
                  : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(100, report.monthProgress.breakEvenProgressPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Middle Split: Fixed Overheads Ledger + Unit Economics + CVP Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Fixed Overheads Ledger */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-red-400">
              1. Fixed Monthly Overheads &amp; Staff Salaries ({monthKey})
            </h3>
            <span className="font-mono text-xs font-black text-white">
              {formatInr(report?.fixedCostsBreakdown.totalFixedMonthlyCost || 0)}
            </span>
          </div>

          {report && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Recurring Rent/EB/EMI</span>
                <span className="font-mono font-bold text-white">
                  {formatInr(report.fixedCostsBreakdown.recurringOverheadsTotal)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Imported Staff Salaries</span>
                <span className="font-mono font-bold text-indigo-300">
                  {formatInr(report.fixedCostsBreakdown.importedFixedSalariesTotal)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Vyapar / 1-Mo Fixed Bills</span>
                <span className="font-mono font-bold text-red-300">
                  {formatInr(report.fixedCostsBreakdown.importedFixedOverheadsTotal)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Floor Consumables ({monthKey})</span>
                <span className="font-mono font-bold text-amber-300">
                  {includeFloorConsumables
                    ? formatInr(report.fixedCostsBreakdown.floorConsumablesTotal)
                    : 'Excluded'}
                </span>
              </div>
            </div>
          )}

          {/* Vyapar Exclusion Audit Note */}
          {report &&
            (report.dayBookSummary.combinedVariableMaterialTotal > 0 ||
              report.dayBookSummary.combinedVariablePieceRateTotal > 0 ||
              report.dayBookSummary.dayBookIgnoredTotal > 0) && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                <strong>Double-Count Guard Active:</strong> Excluded from Fixed Overheads:{' '}
                <span className="font-mono text-blue-300">
                  Material Purchases {formatInr(report.dayBookSummary.combinedVariableMaterialTotal)}
                </span>{' '}
                •{' '}
                <span className="font-mono text-amber-300">
                  Piece-Rate {formatInr(report.dayBookSummary.combinedVariablePieceRateTotal)}
                </span>{' '}
                •{' '}
                <span className="font-mono text-slate-400">
                  Contra/Vendor Payouts {formatInr(report.dayBookSummary.dayBookIgnoredTotal)}
                </span>
              </div>
            )}

          {/* Recurring Overheads List */}
          {report && report.fixedCostsBreakdown.recurringItems.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {report.fixedCostsBreakdown.recurringItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
                    item.active
                      ? 'bg-slate-900/70 border-slate-800'
                      : 'bg-slate-950/50 border-slate-900 opacity-50'
                  }`}
                >
                  <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={() => handleToggleOverhead(item)}
                    />
                    <span className="truncate font-semibold text-white">{item.name}</span>
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-200">
                      {formatInr(item.monthlyAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteOverhead(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Recurring Overhead */}
          <form onSubmit={handleAddOverhead} className="grid grid-cols-12 gap-2 pt-1">
            <select
              value={ohCategory}
              onChange={(e) => setOhCategory(e.target.value as FixedOverheadCategory)}
              className="col-span-4 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-[11px] text-white"
            >
              {OVERHEAD_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={ohName}
              onChange={(e) => setOhName(e.target.value)}
              placeholder="Expense (e.g. Shed Rent)"
              className="col-span-4 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
            />
            <input
              type="number"
              min="1"
              value={ohAmount}
              onChange={(e) => setOhAmount(e.target.value)}
              placeholder="₹/Mo"
              className="col-span-2 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
            />
            <button
              type="submit"
              disabled={isSavingOh}
              className="col-span-2 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>
        </div>

        {/* Unit Economics Breakdown + Inline SVG CVP Chart */}
        <div className="space-y-4">
          {displayedUnitEcon && viewMode !== 'CUSTOM_SIMULATOR' && (
            <div className="p-4 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>2. Per-Door Unit Economics</span>
                </h3>
                <span className="text-[10px] text-slate-400">{displayedUnitEcon.dataBasisLabel}</span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-white">
                  <span>Avg Selling Price per Door</span>
                  <span className="font-mono">{formatInr(displayedUnitEcon.avgSellingPricePerDoor)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>− Raw Door BOM + Locks + Paint + Extras</span>
                  <span className="font-mono text-blue-300">
                    {formatInr(displayedUnitEcon.totalMaterialPerDoor)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 border-b border-slate-800 pb-1">
                  <span>= Material-Only Gross Margin</span>
                  <span className="font-mono text-slate-200">
                    {formatInr(displayedUnitEcon.materialMarginPerDoor)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>− Floor Gang Piece-Rate Labor / Door</span>
                  <span className="font-mono text-amber-300">
                    {formatInr(displayedUnitEcon.pieceRateLaborPerDoor)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>− Avg Freight &amp; Direct Expenses / Door</span>
                  <span className="font-mono text-purple-300">
                    {formatInr(displayedUnitEcon.freightDirectPerDoor)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-800 font-black text-emerald-400">
                  <span>Contribution Margin per Door (P − V)</span>
                  <span className="font-mono">
                    {formatInr(displayedUnitEcon.contributionMarginPerDoor)} ({displayedUnitEcon.contributionMarginRatioPct}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Inline SVG Cost-Volume-Profit Chart */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span>Cost–Volume–Profit Crossover Chart</span>
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-emerald-400 font-bold">— Revenue</span>
                <span className="text-rose-400 font-bold">— Total Cost</span>
                <span className="text-slate-400 font-bold">-- Fixed Cost</span>
              </div>
            </div>

            <svg viewBox={`0 0 ${cvpSvgPoints.w} ${cvpSvgPoints.h}`} className="w-full h-44 bg-slate-950/60 rounded-lg border border-slate-800">
              {/* Axes */}
              <line
                x1={cvpSvgPoints.padL}
                y1={cvpSvgPoints.padT}
                x2={cvpSvgPoints.padL}
                y2={cvpSvgPoints.h - cvpSvgPoints.padB}
                stroke="#334155"
                strokeWidth="1"
              />
              <line
                x1={cvpSvgPoints.padL}
                y1={cvpSvgPoints.h - cvpSvgPoints.padB}
                x2={cvpSvgPoints.w - cvpSvgPoints.padR}
                y2={cvpSvgPoints.h - cvpSvgPoints.padB}
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Fixed Overhead Baseline */}
              <line
                x1={cvpSvgPoints.padL}
                y1={cvpSvgPoints.fixedY}
                x2={cvpSvgPoints.w - cvpSvgPoints.padR}
                y2={cvpSvgPoints.fixedY}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Total Cost Line */}
              <line
                x1={cvpSvgPoints.costStart.x}
                y1={cvpSvgPoints.costStart.y}
                x2={cvpSvgPoints.costEnd.x}
                y2={cvpSvgPoints.costEnd.y}
                stroke="#fb7185"
                strokeWidth="2.5"
              />

              {/* Total Revenue Line */}
              <line
                x1={cvpSvgPoints.origin.x}
                y1={cvpSvgPoints.origin.y}
                x2={cvpSvgPoints.revEnd.x}
                y2={cvpSvgPoints.revEnd.y}
                stroke="#34d399"
                strokeWidth="2.5"
              />

              {/* Current Month Actual Doors Vertical Marker */}
              {cvpSvgPoints.actualX && (
                <line
                  x1={cvpSvgPoints.actualX}
                  y1={cvpSvgPoints.padT}
                  x2={cvpSvgPoints.actualX}
                  y2={cvpSvgPoints.h - cvpSvgPoints.padB}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Break-Even Point Crossover Dot */}
              {cvpSvgPoints.bepPoint && (
                <g>
                  <circle
                    cx={cvpSvgPoints.bepPoint.x}
                    cy={cvpSvgPoints.bepPoint.y}
                    r="5.5"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={cvpSvgPoints.bepPoint.x + 8}
                    y={Math.max(24, cvpSvgPoints.bepPoint.y - 6)}
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    BEP: {cvpSvgPoints.bepPoint.bep} Doors
                  </text>
                </g>
              )}

              <text x={6} y={cvpSvgPoints.fixedY + 3} fill="#94a3b8" fontSize="9">
                Fixed
              </text>
              <text
                x={cvpSvgPoints.padL}
                y={cvpSvgPoints.h - 8}
                fill="#94a3b8"
                fontSize="9"
              >
                0 Doors
              </text>
              <text
                x={cvpSvgPoints.w - 64}
                y={cvpSvgPoints.h - 8}
                fill="#94a3b8"
                fontSize="9"
              >
                {cvpSvgPoints.maxDoors} Doors
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Live Applied Equations Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="text-xs font-bold text-white">Applied Mathematical Formulas (Live Verified Steps)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            {displayedBreakEven.formulaDetails.cmPerDoor}
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            {displayedBreakEven.formulaDetails.breakEvenUnits}
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            {targetProfit > 0
              ? displayedBreakEven.formulaDetails.targetProfitUnits
              : displayedBreakEven.formulaDetails.breakEvenRevenue}
          </div>
        </div>
      </div>

      {/* Category A-E Engineering Matrix */}
      {report && (
        <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">
                Standard Product Mix &amp; Category Break-Even Matrix (80×210 cm BOQ + Rate Card)
              </h3>
              <p className="text-[11px] text-slate-400">
                Compare how many doors/month each FRP Door Category requires to cover your {formatInr(report.fixedCostsBreakdown.totalFixedMonthlyCost)} monthly fixed costs
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Category / Variant</th>
                  <th className="p-3">Spec</th>
                  <th className="p-3 text-right">Selling Price ₹</th>
                  <th className="p-3 text-right">Mat + Locks + Paint</th>
                  <th className="p-3 text-right">Piece-Rate Labor</th>
                  <th className="p-3 text-right">Total Var Cost</th>
                  <th className="p-3 text-right">CM / Door</th>
                  <th className="p-3 text-center">CM %</th>
                  <th className="p-3 text-right">BEP Doors / Mo</th>
                  <th className="p-3 text-right">BEP Sales ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {report.engineeringMatrix.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{row.label}</td>
                    <td className="p-3 text-slate-400">{row.variant}</td>
                    <td className="p-3 text-right font-mono text-white">{formatInr(row.sellingPrice)}</td>
                    <td className="p-3 text-right font-mono text-blue-300">
                      {formatInr(row.materialAndLockCost + row.paintBomCost)}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-300">{formatInr(row.pieceRateCost)}</td>
                    <td className="p-3 text-right font-mono text-slate-200">{formatInr(row.variableCost)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {formatInr(row.cmPerDoor)}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-300">{row.cmRatioPct}%</td>
                    <td className="p-3 text-right font-mono font-black text-red-400">
                      {row.isViable ? `${row.breakEvenUnits} Doors` : 'N/A'}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200">
                      {row.isViable ? formatInr(row.breakEvenRevenue) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Importer Modal */}
      <DayBookAndExpensesModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        monthKey={monthKey}
        onSaved={loadBreakEvenData}
      />

      {/* A4 Print Preview Modal */}
      {isPrintModalOpen && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs printable-modal-root">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white text-slate-900 rounded-2xl p-6 space-y-4 print:p-0 print:rounded-none print:max-h-none print:overflow-visible">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3 print:hidden">
              <span className="font-bold text-sm">A4 Print Preview — EXMARK Break-Even Audit ({monthKey})</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 bg-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-b-2 border-slate-800 pb-2">
                <h1 className="text-lg font-black uppercase">
                  EXMARK FRP DOORS — BREAK-EVEN &amp; CVP FINANCIAL STATEMENT ({monthKey})
                </h1>
                <p className="text-[11px] text-slate-600">
                  Mode: {viewMode.replace(/_/g, ' ')} • Working Days: {workingDaysPerMonth} • Generated {new Date().toLocaleDateString('en-IN')}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 border border-slate-300 rounded">
                  <div className="text-[10px] text-slate-500">Fixed Monthly Costs</div>
                  <div className="font-bold text-sm">{formatInr(displayedBreakEven.fixedOverheadCosts)}</div>
                </div>
                <div className="p-2 border border-slate-300 rounded">
                  <div className="text-[10px] text-slate-500">Avg CM / Door</div>
                  <div className="font-bold text-sm">
                    {formatInr(displayedBreakEven.contributionMarginPerDoor)} ({(displayedBreakEven.contributionMarginRatio * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="p-2 border border-slate-300 rounded">
                  <div className="text-[10px] text-slate-500">Break-Even Units</div>
                  <div className="font-bold text-sm">
                    {displayedBreakEven.breakEvenUnits} Doors ({displayedBreakEven.dailyBreakEvenUnits}/day)
                  </div>
                </div>
                <div className="p-2 border border-slate-300 rounded">
                  <div className="text-[10px] text-slate-500">Break-Even Revenue</div>
                  <div className="font-bold text-sm">{formatInr(displayedBreakEven.breakEvenRevenue)}</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-300 rounded space-y-1 font-mono text-[11px]">
                <div>{displayedBreakEven.formulaDetails.cmPerDoor}</div>
                <div>{displayedBreakEven.formulaDetails.breakEvenUnits}</div>
                <div>{displayedBreakEven.formulaDetails.breakEvenRevenue}</div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border border-slate-300">Category</th>
                    <th className="p-2 border border-slate-300 text-right">Selling Price</th>
                    <th className="p-2 border border-slate-300 text-right">Var Cost</th>
                    <th className="p-2 border border-slate-300 text-right">CM / Door</th>
                    <th className="p-2 border border-slate-300 text-right">BEP Doors</th>
                    <th className="p-2 border border-slate-300 text-right">BEP Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {report.engineeringMatrix.map((row) => (
                    <tr key={row.id}>
                      <td className="p-2 border border-slate-300 font-semibold">{row.label}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">{formatInr(row.sellingPrice)}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">{formatInr(row.variableCost)}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">{formatInr(row.cmPerDoor)}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                        {row.isViable ? `${row.breakEvenUnits} Doors` : 'N/A'}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        {row.isViable ? formatInr(row.breakEvenRevenue) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
