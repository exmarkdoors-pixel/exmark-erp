'use client';

import React, { useState } from 'react';
import { X, TrendingUp, Calculator, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { FinancialTarget, BreakEvenAnalysis, calculateBreakEven } from '@/types/finance';

interface FinancialStrategistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTargetCreated: (target: FinancialTarget) => void;
}

export function FinancialStrategistModal({ isOpen, onClose, onTargetCreated }: FinancialStrategistModalProps) {
  const [activeTab, setActiveTab] = useState<'BREAK_EVEN' | 'TARGET_PLANNER'>('BREAK_EVEN');

  // Break-even simulation inputs
  const [fixedOverhead, setFixedOverhead] = useState<number>(450000);
  const [avgPrice, setAvgPrice] = useState<number>(8500);
  const [varCost, setVarCost] = useState<number>(4800);
  const [targetRevenue, setTargetRevenue] = useState<number>(2500000);

  // Target planner inputs
  const [targetPeriod, setTargetPeriod] = useState<string>('2026-11');
  const [salesRevenueTarget, setSalesRevenueTarget] = useState<string>('3000000');
  const [collectionsTarget, setCollectionsTarget] = useState<string>('2700000');
  const [frpDoorQuantityTarget, setFrpDoorQuantityTarget] = useState<string>('380');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const analysis: BreakEvenAnalysis = calculateBreakEven({
    fixedOverheadCosts: fixedOverhead,
    averageFRPPricePerDoor: avgPrice,
    variableCostPerDoor: varCost,
    targetSalesRevenue: targetRevenue,
  });

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rev = parseFloat(salesRevenueTarget);
    const col = parseFloat(collectionsTarget);
    const qty = parseInt(frpDoorQuantityTarget, 10);

    if (!rev || !col || !qty) {
      setError('Please fill in all target fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPeriod,
          salesRevenueTarget: rev,
          collectionsTarget: col,
          frpDoorQuantityTarget: qty,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create target');
      }

      onTargetCreated(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating financial target');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Financial Strategist & Break-Even Engineering
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                FRP door manufacturing cost structure, contribution margin ratio & target planning
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('BREAK_EVEN')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'BREAK_EVEN'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                Break-Even Simulator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TARGET_PLANNER')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'TARGET_PLANNER'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                Monthly Target Planner
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'BREAK_EVEN' ? (
          <div className="space-y-5">
            {/* Simulation Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Monthly Fixed Overheads (₹)
                </label>
                <input
                  type="number"
                  value={fixedOverhead}
                  onChange={(e) => setFixedOverhead(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">Rent, staff, power, dep.</span>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Avg Selling Price / Door (₹)
                </label>
                <input
                  type="number"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">Ex-factory avg Kerala rate</span>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Variable Cost / Door (₹)
                </label>
                <input
                  type="number"
                  value={varCost}
                  onChange={(e) => setVarCost(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">Resin, glass mat, PU, core</span>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Target Sales Revenue (₹)
                </label>
                <input
                  type="number"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">Target monthly budget</span>
              </div>
            </div>

            {/* Live KPI Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contribution Margin</span>
                <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  ₹{analysis.contributionMarginPerDoor.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-emerald-500 font-semibold font-mono">
                  {(analysis.contributionMarginRatio * 100).toFixed(1)}% CM Ratio
                </span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Break-Even Units</span>
                <p className="text-xl font-black text-red-600 dark:text-red-400 font-mono">
                  {analysis.breakEvenUnits} Doors
                </p>
                <span className="text-[10px] text-slate-400">Monthly min threshold</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Break-Even Revenue</span>
                <p className="text-xl font-black text-red-600 dark:text-red-400 font-mono">
                  ₹{analysis.breakEvenRevenue.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-400">Zero-profit boundary</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Margin of Safety</span>
                <p className="text-xl font-black text-emerald-500 font-mono">
                  {analysis.marginOfSafetyPercentage}%
                </p>
                <span className="text-[10px] text-emerald-600">Above break-even buffer</span>
              </div>
            </div>

            {/* Mathematical Formulas Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-red-500" /> Accounting Formulas & Applied Calculation Steps
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">1. Contribution Margin</span>
                  {analysis.formulaDetails.cmPerDoor}
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">2. Break-Even Units</span>
                  {analysis.formulaDetails.breakEvenUnits}
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">3. Break-Even Sales</span>
                  {analysis.formulaDetails.breakEvenRevenue}
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">4. Margin of Safety</span>
                  {analysis.formulaDetails.marginOfSafety} ({analysis.marginOfSafetyPercentage}%)
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Target Planner Form */
          <form onSubmit={handleCreateTarget} className="space-y-4">
            <div className="p-3 bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Monthly Financial Target Formulation
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set approved sales, collection, and factory production targets for executive governance
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Period (YYYY-MM) *
                </label>
                <input
                  type="text"
                  required
                  value={targetPeriod}
                  onChange={(e) => setTargetPeriod(e.target.value)}
                  placeholder="2026-11"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  FRP Door Quantity Target (Units) *
                </label>
                <input
                  type="number"
                  required
                  value={frpDoorQuantityTarget}
                  onChange={(e) => setFrpDoorQuantityTarget(e.target.value)}
                  placeholder="380"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Sales Revenue Target (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={salesRevenueTarget}
                  onChange={(e) => setSalesRevenueTarget(e.target.value)}
                  placeholder="3000000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Collections Target (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={collectionsTarget}
                  onChange={(e) => setCollectionsTarget(e.target.value)}
                  placeholder="2700000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSubmitting ? 'Approving Target...' : 'Approve & Lock Target'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
