'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import {
  AiStrategistAnalysisResult,
  ForecastScenarioType,
} from '@/types/aiStrategist';

export function AiFinancialStrategistPanel() {
  const [analysis, setAnalysis] = useState<AiStrategistAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedScenario, setSelectedScenario] = useState<ForecastScenarioType>('BASE_CASE');

  useEffect(() => {
    let active = true;
    fetch('/api/finance/ai-strategist')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data) {
          setAnalysis(json.data);
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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Synthesizing ERP accounting books and forecasting operational scenarios...
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

  return (
    <div className="space-y-5">
      {/* Governance & Safety Barrier Banner */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-500">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
        <div>
          <span className="font-bold block uppercase tracking-wider text-[10px]">
            Executive AI Governance Safeguard Active
          </span>
          <p className="text-[11px] text-amber-400/90 mt-0.5 leading-relaxed">
            The AI Financial Strategist operates exclusively in an analytical advisory capacity. It is strictly prohibited from autonomously modifying the general ledger, adjusting credit terms, or releasing banking payments. All recommendations require verified Director authorization.
          </p>
        </div>
      </div>

      {/* Health Score & Key Ratios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Financial Health</span>
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <p className="text-2xl font-black text-emerald-500 font-mono">
              {analysis.financialHealthScore}/100
            </p>
          </div>
          <span className="text-[10px] text-slate-400">Stable liquidity buffer</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Days Sales Outstanding</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {analysis.dsoDays} Days
          </p>
          <span className="text-[10px] text-slate-400">Kerala dealer collection cycle</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Runway</span>
          <p className="text-2xl font-black text-blue-500 font-mono">
            {analysis.cashRunwayMonths} Months
          </p>
          <span className="text-[10px] text-slate-400">Fixed overhead coverage</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Premium FRP Share</span>
          <p className="text-2xl font-black text-red-500 font-mono">
            {analysis.highMarginFRPSharePercentage}%
          </p>
          <span className="text-[10px] text-red-400">Molded Teak &amp; CNC Carved</span>
        </div>
      </div>

      {/* Strategic AI Recommendations */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-red-500" />
          Prioritized Strategic Directives
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {analysis.recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex justify-between items-start">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      rec.urgency === 'HIGH'
                        ? 'bg-red-500/15 text-red-500'
                        : 'bg-blue-500/15 text-blue-500'
                    }`}
                  >
                    {rec.urgency} PRIORITY
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{rec.category}</span>
                </div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                  {rec.headline}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {rec.detailedAnalysis}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Impact: {rec.financialImpactEstimate}
                </p>
                <p className="text-slate-400 italic text-[9px]">
                  {rec.governanceNotice}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Forecasting Simulator */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-red-500" />
              Dynamic Quarterly Forecasting Scenarios
            </h4>
            <p className="text-[11px] text-slate-400">
              Stress-tested projections based on Kerala monsoon seasonality, material tariffs &amp; dealer expansion
            </p>
          </div>
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedScenario('CONSERVATIVE')}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedScenario === 'CONSERVATIVE'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Conservative
            </button>
            <button
              type="button"
              onClick={() => setSelectedScenario('BASE_CASE')}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedScenario === 'BASE_CASE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Base Plan
            </button>
            <button
              type="button"
              onClick={() => setSelectedScenario('EXPANSION_GROWTH')}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedScenario === 'EXPANSION_GROWTH'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Dealer Expansion
            </button>
          </div>
        </div>

        {/* Selected Scenario Output Card */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                {activeScenario.title}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeScenario.description}
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {activeScenario.projectedNetMarginPercentage}% Projected Net
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Projected Revenue</span>
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                ₹{activeScenario.projectedRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Profit</span>
              <span className="font-mono font-black text-sm text-emerald-500">
                ₹{activeScenario.projectedGrossProfit.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Factory Output</span>
              <span className="font-mono font-black text-sm text-red-500">
                {activeScenario.projectedDoorsVolume} Doors
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white text-[11px] block">
                Model Assumptions:
              </span>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                {activeScenario.assumptions.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white text-[11px] block">
                Key Sensitivity Risks:
              </span>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                {activeScenario.riskFactors.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
