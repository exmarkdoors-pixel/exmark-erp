'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Settings,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  FrpRateCardSettings,
  DEFAULT_FRP_RATE_CARD,
} from '@/lib/services/frpPricingEngine';

interface FrpPricingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: FrpRateCardSettings;
  onSettingsSaved: (updated: FrpRateCardSettings) => void;
}

export function FrpPricingSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSettingsSaved,
}: FrpPricingSettingsModalProps) {
  const [maxWidthCm, setMaxWidthCm] = useState(currentSettings.maxWidthCm || 80);
  const [maxHeightCm, setMaxHeightCm] = useState(currentSettings.maxHeightCm || 210);
  const [extraSqftRate, setExtraSqftRate] = useState(currentSettings.extraSqftRate || 250);
  const [rateA, setRateA] = useState(currentSettings.categoryPieceRates?.A || 7000);
  const [rateB, setRateB] = useState(currentSettings.categoryPieceRates?.B || 7600);
  const [rateC, setRateC] = useState(currentSettings.categoryPieceRates?.C || 8200);
  const [rateD, setRateD] = useState(currentSettings.categoryPieceRates?.D || 8800);
  const [rateE, setRateE] = useState(currentSettings.categoryPieceRates?.E || 9500);
  const [belowMode, setBelowMode] = useState<'DIVIDED_RATE' | 'BASE_MINIMUM'>(
    currentSettings.belowSizeCalculationMode || 'DIVIDED_RATE'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMaxWidthCm(currentSettings.maxWidthCm || 80);
    setMaxHeightCm(currentSettings.maxHeightCm || 210);
    setExtraSqftRate(currentSettings.extraSqftRate || 250);
    setRateA(currentSettings.categoryPieceRates?.A || 7000);
    setRateB(currentSettings.categoryPieceRates?.B || 7600);
    setRateC(currentSettings.categoryPieceRates?.C || 8200);
    setRateD(currentSettings.categoryPieceRates?.D || 8800);
    setRateE(currentSettings.categoryPieceRates?.E || 9500);
    setBelowMode(currentSettings.belowSizeCalculationMode || 'DIVIDED_RATE');
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const standardSqft = ((maxWidthCm * maxHeightCm) / 929.0304).toFixed(2);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Partial<FrpRateCardSettings> = {
        maxWidthCm: Number(maxWidthCm) || 80,
        maxHeightCm: Number(maxHeightCm) || 210,
        extraSqftRate: Number(extraSqftRate) || 250,
        categoryPieceRates: {
          A: Number(rateA) || 7000,
          B: Number(rateB) || 7600,
          C: Number(rateC) || 8200,
          D: Number(rateD) || 8800,
          E: Number(rateE) || 9500,
        },
        belowSizeCalculationMode: belowMode,
      };

      const res = await fetch('/api/quotations/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        onSettingsSaved(data.settings);
        setStatusMsg('✅ Pricing rate card successfully updated & applied!');
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 1200);
      }
    } catch {
      setStatusMsg('Failed to update pricing rules.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/quotations/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToDefaults: true }),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setMaxWidthCm(80);
        setMaxHeightCm(210);
        setExtraSqftRate(250);
        setRateA(7000);
        setRateB(7600);
        setRateC(8200);
        setRateD(8800);
        setRateE(9500);
        setBelowMode('DIVIDED_RATE');
        onSettingsSaved(data.settings);
        setStatusMsg('Factory defaults restored (7000, 7600, 8200, 8800, 9500 | ₹250/sqft).');
        setTimeout(() => setStatusMsg(null), 2500);
      }
    } catch {
      setStatusMsg('Failed to reset defaults.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#070D1E] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/60 via-[#0B132B] to-[#070D1E] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Calculator className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>FRP Door Pricing Engine &amp; Rate Card Settings</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure standard 80×210 cm base rates, extra size sq.ft rates &amp; divided rates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="mx-5 mt-4 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Section 1: Standard Size Baseline */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>1. Standard Size Threshold (Maximum Width &amp; Height)</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Area: {standardSqft} sq.ft
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Doors within this measurement calculate at the standard category piece rate.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Max Standard Width (cm)</label>
                <input
                  type="number"
                  value={maxWidthCm}
                  onChange={(e) => setMaxWidthCm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Max Standard Height (cm)</label>
                <input
                  type="number"
                  value={maxHeightCm}
                  onChange={(e) => setMaxHeightCm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Category Piece Rates (A, B, C, D, E) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>2. Standard Piece Rates per Category (₹ / Door)</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Standard pricing for doors up to {maxWidthCm}×{maxHeightCm} cm:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black text-rose-400 block">Category A</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={rateA}
                    onChange={(e) => setRateA(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0B132B] text-white font-black text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black text-amber-400 block">Category B</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={rateB}
                    onChange={(e) => setRateB(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0B132B] text-white font-black text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black text-blue-400 block">Category C</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={rateC}
                    onChange={(e) => setRateC(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0B132B] text-white font-black text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black text-purple-400 block">Category D</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={rateD}
                    onChange={(e) => setRateD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0B132B] text-white font-black text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black text-emerald-400 block">Category E</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={rateE}
                    onChange={(e) => setRateE(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0B132B] text-white font-black text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black text-cyan-400 block">Extra Sq.Ft Rate</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={extraSqftRate}
                    onChange={(e) => setExtraSqftRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0B132B] text-cyan-300 font-black text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Extra Size & Below Size Calculation Rules */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>3. Extra &amp; Below Size Calculation Rules</span>
            </span>

            <div className="space-y-2 pt-1 text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] leading-relaxed">
                <strong className="text-white">Extra Size Formula:</strong> When door width &gt; {maxWidthCm} cm or height &gt; {maxHeightCm} cm:
                <br />
                <code className="text-emerald-400 font-bold">
                  Final Price = Base Piece Rate + (Actual Sq.Ft - {standardSqft} Sq.Ft) × ₹{extraSqftRate}/sq.ft
                </code>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Below Standard Size ({standardSqft} sq.ft) Calculation Strategy:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBelowMode('DIVIDED_RATE')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      belowMode === 'DIVIDED_RATE'
                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-300">Pro-rata Divided Rate (Default)</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Price = Actual Sq.Ft × (Base Rate ÷ {standardSqft} sq.ft)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBelowMode('BASE_MINIMUM')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      belowMode === 'BASE_MINIMUM'
                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-300">Base Piece Minimum</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Minimum price = Base piece rate (no deduction below standard size)
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#091024] border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleResetDefaults}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer shadow-lg shadow-rose-950/50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save & Apply Rate Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
