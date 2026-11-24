'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  Sparkles,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sliders,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Printer,
  Layers,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  Target,
  BarChart3,
  Percent,
  Calendar,
  X,
  Play,
  TrendingDown,
} from 'lucide-react';
import { ExpenseCostCuttingPanel } from './ExpenseCostCuttingPanel';
import type {
  AiStrategistAnalysisResult,
  ForecastScenarioType,
  WhatIfParameters,
  WhatIfResult,
} from '@/types/aiStrategist';

export function AiFinancialStrategistPanel() {
  const [analysis, setAnalysis] = useState<AiStrategistAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedScenario, setSelectedScenario] = useState<ForecastScenarioType>('BASE_CASE');

  // Interactive What-If State
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParameters>({
    volumePercentChange: 0,
    pricePercentChange: 0,
    chemicalCostPercentChange: 0,
    laborEfficiencyPercentChange: 0,
  });
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Boardroom Meeting Deck Presentation State
  const [isBoardroomOpen, setIsBoardroomOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [subTab, setSubTab] = useState<'FORECASTING' | 'COST_CUTTING'>('FORECASTING');

  useEffect(() => {
    let active = true;
    apiFetch('/api/finance/ai-strategist')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data) {
          setAnalysis(json.data);
          setWhatIfResult(json.data.defaultWhatIf);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const runSimulation = async (updatedParams: WhatIfParameters) => {
    setWhatIfParams(updatedParams);
    try {
      setIsSimulating(true);
      const res = await apiFetch('/api/finance/ai-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedParams),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setWhatIfResult(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
        Synthesizing factory ledger, chemical BOQ consumption, and forecasting operational scenarios...
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center text-xs text-red-400">
        Unable to load AI Financial Strategist analysis.
      </div>
    );
  }

  const activeScenario =
    analysis.scenarios.find((s) => s.scenario === selectedScenario) || analysis.scenarios[0];

  const totalPillarsGain = analysis.profitMaximizationPillars.reduce((sum, p) => sum + p.monthlyGainRupees, 0);

  return (
    <div className="space-y-6">
      {/* ================= TOP ACTION BAR & GOVERNANCE ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-900 to-[#11192e] rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-900/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">AI Financial Strategist &amp; Forecasting</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Live Factory Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Executive financial projections, profit maximization, and boardroom presentation deck</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentSlide(0);
              setIsBoardroomOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-red-950/40 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Boardroom Deck</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Print Financial Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-tab Switcher: Macro Projections vs Overhead Cost-Cutting */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-800">
        <button
          type="button"
          onClick={() => setSubTab('FORECASTING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'FORECASTING'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Macro Projections &amp; What-If</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('COST_CUTTING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'COST_CUTTING'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>✂️ Cost-Cutting &amp; Expense Monitor</span>
        </button>
      </div>

      {subTab === 'COST_CUTTING' ? (
        <ExpenseCostCuttingPanel />
      ) : (
        <>
          {/* Governance & Safety Barrier Banner */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-500">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <p className="text-[11px] text-amber-300/90 leading-relaxed">
          <strong>Executive Governance Safeguard:</strong> Advisory only. AI does not autonomously release bank payments or modify the general ledger. All proposals require Director authorization.
        </p>
      </div>

      {/* Health Score & Key Macro Ratios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Financial Health</span>
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {analysis.financialHealthScore}/100
            </p>
          </div>
          <span className="text-[10px] text-slate-400">Stable liquidity buffer</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Days Sales Outstanding</span>
          <p className="text-2xl font-black text-white font-mono">
            {analysis.dsoDays} Days
          </p>
          <span className="text-[10px] text-slate-400">Kerala dealer collection cycle</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Runway</span>
          <p className="text-2xl font-black text-blue-400 font-mono">
            {analysis.cashRunwayMonths} Mo
          </p>
          <span className="text-[10px] text-slate-400">Fixed overhead coverage</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Premium Molded Share</span>
          <p className="text-2xl font-black text-purple-400 font-mono">
            {analysis.highMarginFRPSharePercentage}%
          </p>
          <span className="text-[10px] text-slate-400">High contribution FRP models</span>
        </div>
      </div>

      {/* ================= 6-MONTH GRAPHICAL FORECAST CHART ================= */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-red-400" />
              6-Month Rolling Financial Forecast
            </h3>
            <p className="text-[11px] text-slate-400">Projected revenue, factory costs, and EBITDA margins</p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['CONSERVATIVE', 'BASE_CASE', 'EXPANSION_GROWTH'] as ForecastScenarioType[]).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setSelectedScenario(sc)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedScenario === sc
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sc === 'CONSERVATIVE' ? 'Conservative (-15%)' : sc === 'BASE_CASE' ? 'Base Target' : 'Expansion (+25%)'}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Multi-Series SVG Chart */}
        <div className="space-y-2">
          <div className="h-48 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
            {activeScenario.monthlyProjections.map((m) => {
              const maxVal = 4000000;
              const revHeight = Math.max(10, (m.projectedRevenue / maxVal) * 100);
              const costHeight = Math.max(5, ((m.cogsChemicals + m.directLaborGang) / maxVal) * 100);
              const ebitdaHeight = Math.max(5, (m.ebitda / maxVal) * 100);

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-slate-950 border border-slate-700 text-white p-1.5 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 shadow-xl">
                    <span className="font-bold">{m.month}:</span> Rev ₹{(m.projectedRevenue / 100000).toFixed(1)}L | EBITDA ₹{(m.ebitda / 100000).toFixed(1)}L ({m.doorsVolume} Doors)
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Revenue Bar */}
                    <div
                      className="w-1/3 bg-gradient-to-t from-red-800 to-red-500 rounded-t transition-all duration-300"
                      style={{ height: `${revHeight}%` }}
                      title={`Revenue: ₹${m.projectedRevenue.toLocaleString('en-IN')}`}
                    />
                    {/* Costs Bar */}
                    <div
                      className="w-1/3 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t transition-all duration-300"
                      style={{ height: `${costHeight}%` }}
                      title={`Chemicals & Labor: ₹${(m.cogsChemicals + m.directLaborGang).toLocaleString('en-IN')}`}
                    />
                    {/* EBITDA Bar */}
                    <div
                      className="w-1/3 bg-gradient-to-t from-emerald-800 to-emerald-500 rounded-t transition-all duration-300"
                      style={{ height: `${ebitdaHeight}%` }}
                      title={`EBITDA: ₹${m.ebitda.toLocaleString('en-IN')}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{m.month}</span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-1 px-2 text-slate-400">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-500" />
                Projected Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-500" />
                Chemicals &amp; Labor Costs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                EBITDA Operating Profit
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-300">
              Scenario Net Margin: <strong className="text-emerald-400">{activeScenario.projectedNetMarginPercentage}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5-PILLAR PROFIT MAXIMIZATION ENGINE ================= */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              5-Pillar Profit Maximization Suggestions
            </h3>
            <p className="text-[11px] text-slate-400">Calculated directly from factory chemical usage, gang piece-rates, and product mix</p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black">
            Total Potential Gain: +₹{(totalPillarsGain / 100000).toFixed(2)} Lakhs / Month
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {analysis.profitMaximizationPillars.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {p.category.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                  +₹{(p.monthlyGainRupees / 1000).toFixed(0)}k/mo
                </span>
              </div>

              <h4 className="font-bold text-xs text-white leading-tight">{p.headline}</h4>

              <div className="text-[11px] space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-slate-400">
                  Current: <span className="text-slate-300">{p.baselineMetric}</span>
                </div>
                <div className="text-emerald-400 font-semibold">
                  Target: <span>{p.maximizedTarget}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">{p.implementationAction}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                <span>Annualized: +₹{(p.annualizedGainRupees / 100000).toFixed(1)}L</span>
                <span>ROI: {p.roiTimelineWeeks} Wks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= INTERACTIVE WHAT-IF SIMULATOR ================= */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Interactive Boardroom What-If Simulator
            </h3>
            <p className="text-[11px] text-slate-400">Adjust parameters live in meetings to forecast profit &amp; cash runway impact</p>
          </div>

          {whatIfResult && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px]">EBITDA Impact:</span>
              <span
                className={`font-mono font-black px-2.5 py-1 rounded-lg ${
                  whatIfResult.ebitdaDeltaRupees >= 0
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {whatIfResult.ebitdaDeltaRupees >= 0 ? '+' : ''}₹{(whatIfResult.ebitdaDeltaRupees / 100000).toFixed(2)} Lakhs
              </span>
            </div>
          )}
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Slider 1: Volume */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-bold">Door Volume</span>
              <span className="font-mono font-bold text-purple-400">
                {whatIfParams.volumePercentChange > 0 ? '+' : ''}{whatIfParams.volumePercentChange}%
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              step="5"
              value={whatIfParams.volumePercentChange}
              onChange={(e) => runSimulation({ ...whatIfParams, volumePercentChange: parseInt(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>-30% (Monsoon)</span>
              <span>Baseline</span>
              <span>+50% (Peak)</span>
            </div>
          </div>

          {/* Slider 2: Selling Price */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-bold">Selling Price</span>
              <span className="font-mono font-bold text-emerald-400">
                {whatIfParams.pricePercentChange > 0 ? '+' : ''}{whatIfParams.pricePercentChange}%
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="20"
              step="2"
              value={whatIfParams.pricePercentChange}
              onChange={(e) => runSimulation({ ...whatIfParams, pricePercentChange: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>-10% (Discount)</span>
              <span>Standard</span>
              <span>+20% (Premium)</span>
            </div>
          </div>

          {/* Slider 3: Chemical Costs */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-bold">Chemical Resin Cost</span>
              <span className={`font-mono font-bold ${whatIfParams.chemicalCostPercentChange > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {whatIfParams.chemicalCostPercentChange > 0 ? '+' : ''}{whatIfParams.chemicalCostPercentChange}%
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="20"
              step="2"
              value={whatIfParams.chemicalCostPercentChange}
              onChange={(e) => runSimulation({ ...whatIfParams, chemicalCostPercentChange: parseInt(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>-10% (Lean BOQ)</span>
              <span>Market</span>
              <span>+20% (Inflation)</span>
            </div>
          </div>

          {/* Slider 4: Gang Efficiency */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-bold">Gang Labor Efficiency</span>
              <span className="font-mono font-bold text-blue-400">
                {whatIfParams.laborEfficiencyPercentChange > 0 ? '+' : ''}{whatIfParams.laborEfficiencyPercentChange}%
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="20"
              step="2"
              value={whatIfParams.laborEfficiencyPercentChange}
              onChange={(e) => runSimulation({ ...whatIfParams, laborEfficiencyPercentChange: parseInt(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>-10% (Rework)</span>
              <span>Normal</span>
              <span>+20% (Optimized)</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Results Strip */}
        {whatIfResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Simulated Monthly Revenue</span>
              <strong className="text-base text-white font-mono">
                ₹{(whatIfResult.adjustedRevenue / 100000).toFixed(2)} L
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Simulated Net Profit</span>
              <strong className="text-base text-emerald-400 font-mono">
                ₹{(whatIfResult.adjustedNetProfit / 100000).toFixed(2)} L
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Gross Margin</span>
              <strong className="text-base text-purple-400 font-mono">
                {whatIfResult.adjustedGrossMarginPercent}%
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Monthly Breakeven</span>
              <strong className="text-base text-blue-400 font-mono">
                {whatIfResult.breakevenDoorsMonthly} Doors
              </strong>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* ================= FULL-SCREEN BOARDROOM PRESENTATION MODAL ================= */}
      {isBoardroomOpen && (
        <div className="fixed inset-0 z-[100] bg-[#070c18] text-white flex flex-col animate-fadeIn select-none">
          {/* Boardroom Presentation Header */}
          <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-red-900/50">
                EX
              </div>
              <div>
                <span className="font-extrabold text-sm text-white tracking-wide">
                  EXMARK DOORS PRIVATE LIMITED — EXECUTIVE BOARDROOM DECK
                </span>
                <p className="text-[10px] text-slate-400">Quarterly Operational &amp; Financial Forecast Presentation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Slide Counter */}
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                Slide {currentSlide + 1} of 5
              </span>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300"
                title="Print Presentation"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsBoardroomOpen(false)}
                className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Boardroom Slide Body */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center max-w-5xl mx-auto w-full overflow-y-auto">
            {/* SLIDE 0: Macro Financial Health */}
            {currentSlide === 0 && (
              <div className="space-y-6 text-center animate-fadeIn">
                <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold uppercase tracking-widest inline-block">
                  Executive Briefing • Slide 1
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Company Financial Health &amp; Solvency Overview
                </h1>
                <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                  Authoritative snapshot of liquidity runway, trade receivables turn, and high-margin product contribution across Kerala plants.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4">
                  <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                    <span className="text-xs uppercase font-bold text-slate-400">Health Score</span>
                    <p className="text-4xl font-black text-emerald-400 font-mono">{analysis.financialHealthScore}</p>
                    <span className="text-[11px] text-emerald-400/80 font-semibold block">A+ Solvency Rating</span>
                  </div>

                  <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                    <span className="text-xs uppercase font-bold text-slate-400">Cash Runway</span>
                    <p className="text-4xl font-black text-blue-400 font-mono">{analysis.cashRunwayMonths} Mo</p>
                    <span className="text-[11px] text-slate-400 block">Fixed Cost Buffer</span>
                  </div>

                  <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                    <span className="text-xs uppercase font-bold text-slate-400">Dealer DSO</span>
                    <p className="text-4xl font-black text-white font-mono">{analysis.dsoDays} Days</p>
                    <span className="text-[11px] text-slate-400 block">Collection Cycle</span>
                  </div>

                  <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                    <span className="text-xs uppercase font-bold text-slate-400">Premium Doors</span>
                    <p className="text-4xl font-black text-purple-400 font-mono">{analysis.highMarginFRPSharePercentage}%</p>
                    <span className="text-[11px] text-slate-400 block">Molded Teak &amp; PU</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 1: 6-Month Rolling Forecast */}
            {currentSlide === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center space-y-1">
                  <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold uppercase tracking-widest inline-block">
                    Operational Forecasting • Slide 2
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    6-Month Rolling Production &amp; EBITDA Forecast
                  </h2>
                  <p className="text-xs text-slate-400">Monthly projections under scenario: {activeScenario.title}</p>
                </div>

                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
                  <div className="h-56 w-full flex items-end gap-4 pt-6 pb-2 px-4 border-b border-slate-800">
                    {activeScenario.monthlyProjections.map((m) => {
                      const maxVal = 4000000;
                      const revHeight = Math.max(10, (m.projectedRevenue / maxVal) * 100);
                      const costHeight = Math.max(5, ((m.cogsChemicals + m.directLaborGang) / maxVal) * 100);
                      const ebitdaHeight = Math.max(5, (m.ebitda / maxVal) * 100);

                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div className="w-full flex items-end justify-center gap-1.5 h-full">
                            <div className="w-1/3 bg-red-500 rounded-t" style={{ height: `${revHeight}%` }} />
                            <div className="w-1/3 bg-slate-600 rounded-t" style={{ height: `${costHeight}%` }} />
                            <div className="w-1/3 bg-emerald-500 rounded-t" style={{ height: `${ebitdaHeight}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-300 font-bold">{m.month}</span>
                          <span className="text-[10px] font-mono text-slate-400">₹{(m.projectedRevenue / 100000).toFixed(1)}L</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center text-xs pt-2">
                    <div className="p-3 bg-slate-950 rounded-xl">
                      <span className="text-slate-400 block text-[10px]">Total 6-Month Projected Revenue</span>
                      <strong className="text-base text-white font-mono">
                        ₹{(activeScenario.monthlyProjections.reduce((s, m) => s + m.projectedRevenue, 0) / 100000).toFixed(1)} Lakhs
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl">
                      <span className="text-slate-400 block text-[10px]">Total 6-Month EBITDA</span>
                      <strong className="text-base text-emerald-400 font-mono">
                        ₹{(activeScenario.monthlyProjections.reduce((s, m) => s + m.ebitda, 0) / 100000).toFixed(1)} Lakhs
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl">
                      <span className="text-slate-400 block text-[10px]">Total Doors Manufactured</span>
                      <strong className="text-base text-purple-400 font-mono">
                        {activeScenario.monthlyProjections.reduce((s, m) => s + m.doorsVolume, 0)} Units
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: 5-Pillar Profit Maximization */}
            {currentSlide === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center space-y-1">
                  <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold uppercase tracking-widest inline-block">
                    Strategic Optimization • Slide 3
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    5-Pillar Profit Maximization Action Plan
                  </h2>
                  <p className="text-xs text-slate-400">
                    Concrete measures unlocking an extra <strong className="text-emerald-400">+₹{(totalPillarsGain / 100000).toFixed(2)} Lakhs/month</strong> (+₹68.4L annualized)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.profitMaximizationPillars.slice(0, 4).map((p, idx) => (
                    <div key={p.id} className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-red-400">Pillar #{idx + 1}: {p.title}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          +₹{(p.monthlyGainRupees / 1000).toFixed(0)}k/mo
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{p.headline}</h4>
                      <p className="text-[11px] text-slate-400">{p.implementationAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 3: Cost Structure & BOQ */}
            {currentSlide === 3 && (
              <div className="space-y-6 animate-fadeIn text-center">
                <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold uppercase tracking-widest inline-block">
                  Plant Operations • Slide 4
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Shop-Floor BOQ Chemical &amp; Labor Cost Discipline
                </h2>
                <p className="text-xs text-slate-400 max-w-xl mx-auto">
                  Standardizing raw resin formulation, catalytic ratios, and single/dual molding gang payouts to eliminate rework leakage.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4 text-left text-xs">
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-400" />
                      Chemical Resin Control
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Calibrated scales ensure exact 12.5 kg resin per standard door, trimming 600 grams of excess curing waste per unit.
                    </p>
                    <span className="text-emerald-400 font-bold block text-[11px]">Monthly Saving: ₹1.35 Lakhs</span>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Gang Labor Stage Lock
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      ERP door-picker assigns doors to Gang A or Gang B, preventing double payment claims on rework or shift overlaps.
                    </p>
                    <span className="text-emerald-400 font-bold block text-[11px]">Monthly Saving: ₹0.78 Lakhs</span>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-purple-400" />
                      40% Advance Gatekeeper
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Zero press molding releases without verified advance payment protects working capital and compresses DSO to 16 days.
                    </p>
                    <span className="text-emerald-400 font-bold block text-[11px]">Capital Unlocked: ₹8.20 Lakhs</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 4: Interactive What-If Simulator */}
            {currentSlide === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center space-y-1">
                  <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold uppercase tracking-widest inline-block">
                    Executive Decision Modeling • Slide 5
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Live Boardroom What-If Financial Simulator
                  </h2>
                  <p className="text-xs text-slate-400">Interactive sensitivity analysis for board decisions</p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Simulated Monthly Revenue</span>
                      <p className="text-2xl font-black text-white font-mono">
                        ₹{whatIfResult ? (whatIfResult.adjustedRevenue / 100000).toFixed(2) : '28.5'}L
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Simulated Net Profit</span>
                      <p className="text-2xl font-black text-emerald-400 font-mono">
                        ₹{whatIfResult ? (whatIfResult.adjustedNetProfit / 100000).toFixed(2) : '5.1'}L
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Simulated EBITDA Delta</span>
                      <p className="text-2xl font-black text-purple-400 font-mono">
                        {whatIfResult && whatIfResult.ebitdaDeltaRupees >= 0 ? '+' : ''}
                        ₹{whatIfResult ? (whatIfResult.ebitdaDeltaRupees / 100000).toFixed(2) : '0.0'}L
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Breakeven Units</span>
                      <p className="text-2xl font-black text-blue-400 font-mono">
                        {whatIfResult ? whatIfResult.breakevenDoorsMonthly : '185'} Doors
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span>Production Volume Target</span>
                        <span className="text-purple-400">{whatIfParams.volumePercentChange}%</span>
                      </div>
                      <input
                        type="range"
                        min="-30"
                        max="50"
                        step="5"
                        value={whatIfParams.volumePercentChange}
                        onChange={(e) => runSimulation({ ...whatIfParams, volumePercentChange: parseInt(e.target.value) })}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span>Average Selling Price</span>
                        <span className="text-emerald-400">{whatIfParams.pricePercentChange}%</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="20"
                        step="2"
                        value={whatIfParams.pricePercentChange}
                        onChange={(e) => runSimulation({ ...whatIfParams, pricePercentChange: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Boardroom Presentation Footer Controls */}
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between backdrop-blur">
            <button
              type="button"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Slide</span>
            </button>

            {/* Slide Indicator Dots */}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                    currentSlide === idx ? 'bg-red-500 w-6' : 'bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={currentSlide === 4}
              onClick={() => setCurrentSlide(Math.min(4, currentSlide + 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-red-950/40"
            >
              <span>Next Slide</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
