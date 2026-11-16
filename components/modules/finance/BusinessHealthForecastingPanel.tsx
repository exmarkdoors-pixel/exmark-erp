'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  DollarSign,
  Package,
  Wrench,
  Sparkles,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  DailyClosingEntry,
  DailyClosingOverviewResponse,
  HealthStatus,
} from '@/types/dailyClosing';
import DailyEveningClosingModal from './DailyEveningClosingModal';

const formatInr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BusinessHealthForecastingPanel() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DailyClosingOverviewResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEntryDate, setSelectedEntryDate] = useState<string | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/system/daily-closing');
      const json = await res.json();
      if (res.ok && json.success) {
        setOverview(json.data);
      }
    } catch (err) {
      console.error('Failed to load business forecasting overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleCopyRowWhatsApp = async (entry: DailyClosingEntry) => {
    try {
      const res = await apiFetch('/api/system/daily-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_WHATSAPP', entryDate: entry.entryDate }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.text) {
        navigator.clipboard.writeText(json.text);
        setCopiedId(entry.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      // ignore
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    if (status === 'HEALTHY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          HEALTHY
        </span>
      );
    }
    if (status === 'WATCH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          WATCH
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        CRITICAL
      </span>
    );
  };

  const scorecard = overview?.healthScorecard;
  const mtd = overview?.mtdBreakEven;
  const forecast = overview?.forecasting;
  const entries = overview?.historicalEntries || [];

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Business Health, BOQ &amp; 30-60-90 Day Financial Forecasting
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time executive intelligence generated from your daily evening closing entries and standard BOQ models.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setSelectedEntryDate(new Date().toISOString().slice(0, 10));
              setModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            🌆 Record Evening Closing (Today)
          </button>
        </div>
      </div>

      {/* 360° Business Health Scorecard Hero Card */}
      {scorecard && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-16 h-16 rounded-2xl font-black text-2xl border ${
                  scorecard.overallStatus === 'HEALTHY'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : scorecard.overallStatus === 'WATCH'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {scorecard.overallScore}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">Factory Business Health Index</h3>
                  {getStatusBadge(scorecard.overallStatus)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{scorecard.summary}</p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-mono text-slate-500">Benchmark Model</span>
              <p className="text-xs font-semibold text-slate-300">EXMARK Doors CVP &amp; BOQ v1.2</p>
            </div>
          </div>

          {/* 6 Metric Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(scorecard.metrics).map(([key, m]) => (
              <div key={key} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase truncate">
                    {m.label}
                  </span>
                  {getStatusBadge(m.status)}
                </div>
                <p className="text-base font-bold text-slate-100">
                  {m.value > 0 && m.unit === '₹/door' ? `+₹${m.value}` : m.value}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">{m.unit}</span>
                </p>
                <p className="text-[10px] text-slate-500 truncate" title={m.commentary}>
                  {m.commentary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Section: MTD Break-Even Progress + 30/60/90 Day Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Month-to-Date (MTD) Break-Even Tracker */}
        {mtd && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Month-to-Date Break-Even Tracker ({mtd.monthKey})
                </h3>
              </div>
              <span className="text-xs font-mono text-indigo-400 font-semibold">
                {mtd.breakEvenProgressPct}% Covered
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Doors Output: <strong className="text-slate-100">{mtd.breakEvenDoorsAchieved}</strong> /{' '}
                  {mtd.breakEvenDoorsNeeded} target
                </span>
                <span>Fixed Overhead: {formatInr(mtd.monthlyFixedOverhead)}</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    mtd.breakEvenProgressPct >= 100
                      ? 'bg-emerald-500'
                      : mtd.breakEvenProgressPct >= 70
                      ? 'bg-indigo-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, mtd.breakEvenProgressPct)}%` }}
                />
              </div>
            </div>

            {/* Sub-Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">MTD Sales</p>
                <p className="text-sm font-bold text-emerald-400">{formatInr(mtd.mtdSalesRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">MTD Net Profit</p>
                <p
                  className={`text-sm font-bold ${
                    mtd.mtdNetOperatingProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'
                  }`}
                >
                  {formatInr(mtd.mtdNetOperatingProfit)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Contribution / Door</p>
                <p className="text-sm font-bold text-amber-400">
                  {formatInr(mtd.contributionMarginPerDoor)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 pt-1">
              {mtd.breakEvenProgressPct >= 100 ? (
                <span className="text-emerald-400 font-semibold">
                  🎉 Factory has covered 100% of its fixed overhead for this month! All remaining doors produce pure operating profit.
                </span>
              ) : (
                <span>
                  Factory needs{' '}
                  <strong className="text-amber-400">
                    {Math.max(0, mtd.breakEvenDoorsNeeded - mtd.breakEvenDoorsAchieved)} more doors
                  </strong>{' '}
                  to absorb all fixed factory overheads this month.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Card B: 30 / 60 / 90 Day Predictive Business Forecasting */}
        {forecast && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  30 / 60 / 90-Day Predictive Forecasting
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Confidence: <strong className="text-emerald-400">{forecast.confidenceScore}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Projected Month-End Sales
                </span>
                <p className="text-lg font-bold text-emerald-400">
                  {formatInr(forecast.projectedMonthEndSales)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Est. Doors: {forecast.projectedMonthEndDoors} units
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Projected Month Net Profit
                </span>
                <p className="text-lg font-bold text-indigo-400">
                  {formatInr(forecast.projectedMonthEndNetProfit)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Gross: {formatInr(forecast.projectedMonthEndGrossProfit)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  60-Day Forward Revenue
                </span>
                <p className="text-base font-bold text-slate-200">
                  {formatInr(forecast.forecast60DayRevenue)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rolling 2-month projection</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Cash Runway &amp; Burn
                </span>
                <p className="text-base font-bold text-amber-400">
                  {forecast.cashRunwayDays} Days
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Burn: {formatInr(forecast.dailyCashBurnRate)}/day
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Average Daily Run-Rate:</span>
              <strong className="text-emerald-400 font-mono">
                {formatInr(forecast.runRateDailySales)} / day
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Historical Daily Closing Entries Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Historical Daily Evening Closings</h3>
            <p className="text-xs text-slate-400">
              Audit log of daily financial closures synced across all devices.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{entries.length} Entries Logged</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-400">No daily evening closings recorded yet.</p>
            <button
              onClick={() => {
                setSelectedEntryDate(new Date().toISOString().slice(0, 10));
                setModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
            >
              Record Today&apos;s First Closing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Sales (₹)</th>
                  <th className="py-3 px-3">Purchases (₹)</th>
                  <th className="py-3 px-3">Expenses (₹)</th>
                  <th className="py-3 px-3">Doors</th>
                  <th className="py-3 px-3">Gross Margin</th>
                  <th className="py-3 px-3">Net Profit</th>
                  <th className="py-3 px-3">BOQ Cost/Door</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                      {e.entryDate}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {formatInr(e.totalSalesRevenue)}
                    </td>
                    <td className="py-3 px-3 text-blue-300">{formatInr(e.totalPurchases)}</td>
                    <td className="py-3 px-3 text-purple-300">{formatInr(e.totalExpenses)}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{e.doorsProduced}</td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-400 font-semibold">{e.dailyGrossMarginPct}%</span>
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      <span className={e.dailyNetProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}>
                        {formatInr(e.dailyNetProfit)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {e.actualMaterialCostPerDoor > 0 ? (
                        <span
                          className={
                            e.boqVariancePerDoor <= 0 ? 'text-emerald-400' : 'text-amber-400'
                          }
                        >
                          ₹{e.actualMaterialCostPerDoor}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyRowWhatsApp(e)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                          title="Copy WhatsApp Report"
                        >
                          {copiedId === e.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEntryDate(e.entryDate);
                            setModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evening Closing Modal */}
      <DailyEveningClosingModal
        isOpen={modalOpen}
        initialDate={selectedEntryDate}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          fetchOverview();
        }}
      />
    </div>
  );
}
