'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  Wrench,
  Sparkles,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  DailyClosingEntry,
  DailyClosingOverviewResponse,
} from '@/types/dailyClosing';

interface DailyEveningClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (entry: DailyClosingEntry, overview: DailyClosingOverviewResponse) => void;
  initialDate?: string;
}

export default function DailyEveningClosingModal({
  isOpen,
  onClose,
  onSaved,
  initialDate,
}: DailyEveningClosingModalProps) {
  const [entryDate, setEntryDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvancedBreakdowns, setShowAdvancedBreakdowns] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [totalSales, setTotalSales] = useState<number>(0);
  const [doorsSold, setDoorsSold] = useState<number>(0);
  const [cashSales, setCashSales] = useState<number>(0);
  const [bankUpiSales, setBankUpiSales] = useState<number>(0);
  const [creditSales, setCreditSales] = useState<number>(0);

  const [totalPurchases, setTotalPurchases] = useState<number>(0);
  const [timberPurchases, setTimberPurchases] = useState<number>(0);
  const [boardsPurchases, setBoardsPurchases] = useState<number>(0);
  const [gluePurchases, setGluePurchases] = useState<number>(0);
  const [hardwarePurchases, setHardwarePurchases] = useState<number>(0);

  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [laborWages, setLaborWages] = useState<number>(0);
  const [transportFuel, setTransportFuel] = useState<number>(0);
  const [powerGen, setPowerGen] = useState<number>(0);
  const [maintenance, setMaintenance] = useState<number>(0);

  const [doorsProduced, setDoorsProduced] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState<string>('');

  const [overviewData, setOverviewData] = useState<DailyClosingOverviewResponse | null>(null);
  const [whatsappResult, setWhatsappResult] = useState<string | null>(null);

  // Load existing entry or system suggestions when modal opens or date changes
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);
    setBanner(null);
    setWhatsappResult(null);

    apiFetch(`/api/system/daily-closing?date=${entryDate}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          const overview: DailyClosingOverviewResponse = json.data;
          setOverviewData(overview);

          if (overview.todayEntry) {
            const e = overview.todayEntry;
            setTotalSales(e.totalSalesRevenue);
            setDoorsSold(e.doorsSold);
            setCashSales(e.salesSplit?.cash || 0);
            setBankUpiSales(e.salesSplit?.bankUpi || 0);
            setCreditSales(e.salesSplit?.creditReceivable || 0);

            setTotalPurchases(e.totalPurchases);
            setTimberPurchases(e.purchaseSplit?.timberAndFrames || 0);
            setBoardsPurchases(e.purchaseSplit?.boardsAndSkins || 0);
            setGluePurchases(e.purchaseSplit?.glueAndResins || 0);
            setHardwarePurchases(e.purchaseSplit?.hardwareAndAccessories || 0);

            setTotalExpenses(e.totalExpenses);
            setLaborWages(e.expenseSplit?.dailyLaborAndWages || 0);
            setTransportFuel(e.expenseSplit?.vehicleAndFuelBata || 0);
            setPowerGen(e.expenseSplit?.powerAndGenerator || 0);
            setMaintenance(e.expenseSplit?.maintenanceAndTools || 0);

            setDoorsProduced(e.doorsProduced);
            setShiftNotes(e.shiftNotes || '');
          } else {
            // Apply suggestions if fresh entry
            const sugg = overview.suggestedTodayData;
            if (sugg) {
              setTotalSales(sugg.invoicedRevenue || 0);
              setBankUpiSales(sugg.invoicedRevenue || 0);
              setDoorsProduced(sugg.doorsCompletedToday || 0);
              setDoorsSold(sugg.doorsCompletedToday || 0);
              setTotalPurchases(sugg.purchaseOrdersLogged || 0);
              setTotalExpenses(0);
              setShiftNotes('');
            }
          }
        }
      })
      .catch(() => {
        if (isMounted) setBanner({ type: 'error', text: 'Failed to load daily closing data.' });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, entryDate]);

  if (!isOpen) return null;

  // Live Calculations
  const grossProfit = Math.round(totalSales - totalPurchases);
  const grossMarginPct = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '0.0';
  const netProfit = Math.round(grossProfit - totalExpenses);
  const netMarginPct = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';
  const actualCostPerDoor = doorsProduced > 0 ? Math.round(totalPurchases / doorsProduced) : 0;
  const standardBoq = overviewData?.mtdBreakEven ? 2200 : 2200;
  const boqDiff = actualCostPerDoor > 0 ? actualCostPerDoor - standardBoq : 0;

  const handleAutoFill = () => {
    if (!overviewData?.suggestedTodayData) return;
    const sugg = overviewData.suggestedTodayData;
    setTotalSales(sugg.invoicedRevenue || totalSales);
    setBankUpiSales(sugg.invoicedRevenue || totalSales);
    setDoorsProduced(sugg.doorsCompletedToday || doorsProduced);
    setDoorsSold(sugg.doorsCompletedToday || doorsSold);
    if (sugg.purchaseOrdersLogged > 0) {
      setTotalPurchases(sugg.purchaseOrdersLogged);
    }
    setBanner({
      type: 'success',
      text: `Auto-filled: ₹${sugg.invoicedRevenue.toLocaleString('en-IN')} sales and ${sugg.doorsCompletedToday} completed doors from today's orders.`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setBanner(null);

    const payload = {
      entryDate,
      totalSalesRevenue: Number(totalSales) || 0,
      doorsSold: Number(doorsSold) || 0,
      salesSplit: {
        cash: Number(cashSales) || 0,
        bankUpi: Number(bankUpiSales) || 0,
        creditReceivable: Number(creditSales) || 0,
      },
      totalPurchases: Number(totalPurchases) || 0,
      purchaseSplit: {
        timberAndFrames: Number(timberPurchases) || 0,
        boardsAndSkins: Number(boardsPurchases) || 0,
        glueAndResins: Number(gluePurchases) || 0,
        hardwareAndAccessories: Number(hardwarePurchases) || 0,
        otherConsumables: 0,
      },
      totalExpenses: Number(totalExpenses) || 0,
      expenseSplit: {
        dailyLaborAndWages: Number(laborWages) || 0,
        vehicleAndFuelBata: Number(transportFuel) || 0,
        powerAndGenerator: Number(powerGen) || 0,
        maintenanceAndTools: Number(maintenance) || 0,
        officeAndRefreshment: 0,
        miscellaneous: 0,
      },
      doorsProduced: Number(doorsProduced) || 0,
      shiftNotes,
    };

    try {
      const res = await apiFetch('/api/system/daily-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setWhatsappResult(json.whatsappText || null);
        setBanner({
          type: 'success',
          text: `Evening closing saved cleanly! Synced to Central PostgreSQL.`,
        });
        if (onSaved) {
          onSaved(json.entry, json.overview);
        }
      } else {
        setBanner({ type: 'error', text: json?.error || 'Failed to save daily entry.' });
      }
    } catch {
      setBanner({ type: 'error', text: 'Network error while saving daily closing.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyWhatsApp = () => {
    if (!whatsappResult) return;
    navigator.clipboard.writeText(whatsappResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Daily Evening Business Closing (EOD)
              </h2>
              <p className="text-xs text-slate-400">
                Record today&apos;s totals for instant P&amp;L, BOQ variance, and 30-day forecasting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Alert */}
        {banner && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
              banner.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-b border-rose-500/30'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Control Bar: Date & Auto-fill */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300">Closing Date:</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <button
              type="button"
              onClick={handleAutoFill}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-fill from Today&apos;s System Activity
            </button>
          </div>

          {/* 3 Core Operational Input Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: SALES & REVENUE */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> 1. Total Sales Today
                </span>
                <span className="text-[10px] text-emerald-500/80 font-mono">Billed / Advances</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Total Sales (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={totalSales || ''}
                  onChange={(e) => setTotalSales(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-emerald-800/50 rounded-lg text-base font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400">Doors Sold</label>
                  <input
                    type="number"
                    min="0"
                    value={doorsSold || ''}
                    onChange={(e) => setDoorsSold(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Cash Received</label>
                  <input
                    type="number"
                    min="0"
                    value={cashSales || ''}
                    onChange={(e) => setCashSales(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Bank / UPI Transfer</label>
                <input
                  type="number"
                  min="0"
                  value={bankUpiSales || ''}
                  onChange={(e) => setBankUpiSales(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>
            </div>

            {/* CARD 2: PURCHASES & MATERIALS */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4" /> 2. Material Purchases
                </span>
                <span className="text-[10px] text-blue-500/80 font-mono">Raw Materials</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Total Purchases (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={totalPurchases || ''}
                  onChange={(e) => setTotalPurchases(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-blue-800/50 rounded-lg text-base font-bold text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400">Timber &amp; Wood</label>
                  <input
                    type="number"
                    min="0"
                    value={timberPurchases || ''}
                    onChange={(e) => setTimberPurchases(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Glue &amp; Resins</label>
                  <input
                    type="number"
                    min="0"
                    value={gluePurchases || ''}
                    onChange={(e) => setGluePurchases(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Boards, Skins &amp; Hardware</label>
                <input
                  type="number"
                  min="0"
                  value={boardsPurchases || ''}
                  onChange={(e) => setBoardsPurchases(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>
            </div>

            {/* CARD 3: OPERATING EXPENSES & OUTPUT */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" /> 3. Expenses &amp; Output
                </span>
                <span className="text-[10px] text-purple-500/80 font-mono">Wages / Fuel / Power</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Daily Operating Expenses (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={totalExpenses || ''}
                  onChange={(e) => setTotalExpenses(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-purple-800/50 rounded-lg text-base font-bold text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400">Daily Labor / Wages</label>
                  <input
                    type="number"
                    min="0"
                    value={laborWages || ''}
                    onChange={(e) => setLaborWages(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Fuel / Transport Bata</label>
                  <input
                    type="number"
                    min="0"
                    value={transportFuel || ''}
                    onChange={(e) => setTransportFuel(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-amber-300 font-semibold">Doors Produced Today</label>
                <input
                  type="number"
                  min="0"
                  value={doorsProduced || ''}
                  onChange={(e) => setDoorsProduced(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-amber-500/50 rounded text-xs font-bold text-amber-300"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Intelligence Bar */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Live Calculated Margins &amp; BOQ Variance
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Standard BOQ Target: ₹{standardBoq.toLocaleString('en-IN')}/door
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Gross Profit</p>
                <p className="text-sm font-bold text-emerald-400">
                  ₹{grossProfit.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-emerald-500/90 font-medium">{grossMarginPct}% Margin</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Net Operating Profit</p>
                <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                  ₹{netProfit.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-indigo-400/90 font-medium">{netMarginPct}% Net</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Material Cost / Door</p>
                <p className="text-sm font-bold text-blue-400">
                  {doorsProduced > 0 ? `₹${actualCostPerDoor.toLocaleString('en-IN')}` : '—'}
                </p>
                <p
                  className={`text-[10px] font-medium ${
                    boqDiff <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {doorsProduced > 0
                    ? boqDiff <= 0
                      ? `₹${Math.abs(boqDiff)} under BOQ`
                      : `+₹${boqDiff} over BOQ`
                    : 'Awaiting Output'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Today&apos;s Health Score</p>
                <p className="text-sm font-bold text-amber-400">
                  {netProfit > 0 && Number(grossMarginPct) >= 25 ? 'HEALTHY (🟢)' : 'WATCH (🟡)'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Automatic Index</p>
              </div>
            </div>
          </div>

          {/* Shift Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-300">
              Shift Notes / Remarks (Optional):
            </label>
            <textarea
              rows={2}
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="e.g. Line 2 press cycle delayed due to power cut; delivered 18 doors to Calicut dealer."
              className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>

          {/* Generated WhatsApp Report Preview if saved */}
          {whatsappResult && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" /> Ready for WhatsApp Share (Executive Summary)
                </span>
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              <pre className="p-3 bg-slate-950 rounded-lg text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {whatsappResult}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              {submitting ? 'Saving to Cloud...' : 'Save Evening Closing (EOD)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
