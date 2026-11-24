'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  DollarSign,
  Utensils,
  Truck,
  Clock,
  Zap,
  FlaskConical,
  Receipt,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Info,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type {
  ExpenseIntelligenceReport,
  CostCuttingSuggestion,
  ExpenseCategoryDomain,
  CostCuttingSimulationResult,
} from '@/types/expenseIntelligence';

export function ExpenseCostCuttingPanel() {
  const [report, setReport] = useState<ExpenseIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDomain, setSelectedDomain] = useState<ExpenseCategoryDomain | 'ALL'>('ALL');
  
  // Interactive Simulator State
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<CostCuttingSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/finance/expense-intelligence');
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
        // Pre-select top 2 suggestions for instant simulation showcase
        const initialActive = (json.data.anomalyAlerts || [])
          .slice(0, 2)
          .map((s: CostCuttingSuggestion) => s.id);
        setSelectedSuggestionIds(initialActive);
      }
    } catch (err) {
      console.error('Failed to load expense intelligence report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Run simulation whenever selected suggestions change
  useEffect(() => {
    if (!report) return;
    const runSimulation = async () => {
      setIsSimulating(true);
      try {
        const res = await apiFetch('/api/finance/expense-intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeSuggestionIds: selectedSuggestionIds }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSimulationResult(json.data);
        }
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        setIsSimulating(false);
      }
    };

    runSimulation();
  }, [selectedSuggestionIds, report]);

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getDomainIcon = (domain: ExpenseCategoryDomain) => {
    switch (domain) {
      case 'FOOD_CANTEEN':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'FUEL_FLEET':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'LABOR_OVERTIME':
        return <Clock className="w-4 h-4 text-purple-500" />;
      case 'ELECTRICITY_POWER':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'CHEMICAL_WASTAGE':
        return <FlaskConical className="w-4 h-4 text-emerald-500" />;
      case 'OFFICE_MISC':
      default:
        return <Receipt className="w-4 h-4 text-slate-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-sm font-semibold">Auditing Factory Overheads &amp; Generating Cost-Cutting Intelligence...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
        <p className="text-sm">Unable to load expense intelligence data.</p>
        <button
          onClick={fetchReport}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  const allSuggestions = [...report.anomalyAlerts, ...report.generalSuggestions];
  const displayedSuggestions =
    selectedDomain === 'ALL'
      ? allSuggestions
      : allSuggestions.filter((s) => s.domain === selectedDomain);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Executive Summary Banner ─────────────────────────── */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-[#0B132B] p-5 rounded-2xl border border-red-900/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingDown className="w-48 h-48 text-red-500" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Factory Cost-Cutting Engine • Expense Analysis</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Factory Overhead &amp; Expense Optimization Monitor
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time audit of Food &amp; Canteen, KL-09 Diesel, Overtime in-efficiencies, Chemical waste, and Unwanted
              leakages. Automatically benchmarked against standard door manufacturing metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchReport}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Audit</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Highlight Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="bg-black/30 backdrop-blur-xs p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-red-400" /> Monthly Overheads
            </span>
            <p className="text-xl font-black text-white font-mono">
              ₹{report.totalMonthlyOverheads.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-400">
              {report.overheadToRevenueRatio.toFixed(1)}% of Revenue (Target: &lt;14%)
            </span>
          </div>

          <div className="bg-black/30 backdrop-blur-xs p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Overhead Per Door
            </span>
            <p className="text-xl font-black text-amber-400 font-mono">
              ₹{report.averageOverheadPerDoor.toFixed(0)} <span className="text-xs font-normal text-slate-400">/ door</span>
            </p>
            <span className="text-[11px] text-slate-400">
              Benchmark: ₹295 / door (Based on {report.totalManufacturedDoors} doors)
            </span>
          </div>

          <div className="bg-black/30 backdrop-blur-xs p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> Potential Savings
            </span>
            <p className="text-xl font-black text-emerald-400 font-mono">
              ₹{report.totalPotentialMonthlySavings.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-400"> / mo</span>
            </p>
            <span className="text-[11px] text-emerald-500 font-bold">
              ₹{report.totalPotentialAnnualSavings.toLocaleString('en-IN')} / year
            </span>
          </div>

          <div className="bg-black/30 backdrop-blur-xs p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Active Anomaly Alerts
            </span>
            <p className="text-xl font-black text-rose-400 font-mono">
              {report.anomalyAlerts.length} Critical Areas
            </p>
            <span className="text-[11px] text-rose-300">
              +{report.projectedNetMarginGainPercent.toFixed(1)}% Potential Net Margin Gain
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 Domain Breakdown Cards ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Expense Breakdown by Cost Domain</span>
          </h2>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedDomain('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDomain === 'ALL'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              All Domains
            </button>
            {report.domains.map((d) => (
              <button
                key={d.domain}
                onClick={() => setSelectedDomain(d.domain)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedDomain === d.domain
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                {d.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {report.domains.map((d) => {
            const isAnomaly = d.anomalyDetected;
            return (
              <div
                key={d.domain}
                onClick={() => setSelectedDomain(d.domain)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  selectedDomain === d.domain
                    ? 'ring-2 ring-red-500 bg-white dark:bg-[#0B132B] border-red-500/50'
                    : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                {isAnomaly && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider rounded-bl-lg">
                    High Variance ({d.variancePercentage > 0 ? `+${d.variancePercentage}%` : `${d.variancePercentage}%`})
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getDomainIcon(d.domain)}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {d.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{d.labelMl}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Monthly Spend</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      ₹{d.monthlyAmount.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {d.percentageOfOverheads.toFixed(1)}% of total
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Cost Per Door</span>
                    <p
                      className={`text-sm font-black font-mono ${
                        isAnomaly ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      ₹{d.costPerDoor.toFixed(0)}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Target: ₹{d.benchmarkCostPerDoor}
                    </span>
                  </div>
                </div>

                {d.anomalyReason && (
                  <div className="mt-2 text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{d.anomalyReason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cost-Cutting Suggestions & What-If Simulator Split Grid ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Actionable Recommendations (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Actionable Cost-Cutting Audit Findings ({displayedSuggestions.length} Suggestions)</span>
            </h2>
            <span className="text-xs text-slate-400">
              Select policies below to test in the Simulator
            </span>
          </div>

          <div className="space-y-3">
            {displayedSuggestions.map((item) => {
              const isChecked = selectedSuggestionIds.includes(item.id);
              const isCritical = item.urgency === 'CRITICAL';
              const isHigh = item.urgency === 'HIGH';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isChecked
                      ? 'bg-red-950/20 border-red-500/40'
                      : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSuggestion(item.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-600 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded ${
                              isCritical
                                ? 'bg-rose-600 text-white'
                                : isHigh
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {item.urgency}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-xs text-slate-400 italic">
                            ({item.titleMl})
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {item.headline}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Monthly Savings
                      </span>
                      <p className="text-sm font-black text-emerald-400 font-mono">
                        ₹{item.estimatedMonthlySavings.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        ₹{(item.annualizedSavings / 100000).toFixed(2)} Lakh/yr
                      </span>
                    </div>
                  </div>

                  {/* Audit details and Action Item */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-black/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Factory Audit Finding
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {item.detailedAudit}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                        Immediate Action Item &amp; Policy
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {item.actionItem}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Savings Simulator (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#0B132B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Cost-Cutting Simulator</span>
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                {selectedSuggestionIds.length} Active
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Check/uncheck cost-cutting policies to model the immediate impact on factory overheads, net margins, and cash runway.
            </p>

            {simulationResult ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Simulated Monthly Cost Reduction
                  </span>
                  <p className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{simulationResult.monthlySavings.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-emerald-300 font-semibold">
                    ₹{(simulationResult.annualSavings / 100000).toFixed(2)} Lakhs Added to Yearly Profit
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Overhead Ratio</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {simulationResult.originalOverheadRatio.toFixed(1)}% →{' '}
                      <span className="text-emerald-400">
                        {simulationResult.newOverheadRatio.toFixed(1)}%
                      </span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Projected Net Margin</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {simulationResult.originalMarginPercent.toFixed(1)}% →{' '}
                      <span className="text-emerald-400">
                        {simulationResult.projectedMarginPercent.toFixed(1)}%
                      </span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Cash Runway Extension</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      +{simulationResult.extendedCashRunwayDays} Days
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      alert(
                        `Cost cutting plan recorded with ${selectedSuggestionIds.length} policies! Implementation guidelines dispatched to Plant Manager & Accounting.`
                      );
                    }}
                    className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Adopt Selected Cost Policies</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Select policies to view simulated profit expansion.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default ExpenseCostCuttingPanel;
