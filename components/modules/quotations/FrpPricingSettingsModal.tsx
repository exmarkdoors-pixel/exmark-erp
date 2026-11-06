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
  Lock,
  Palette,
  Plus,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import {
  FrpRateCardSettings,
  DEFAULT_FRP_RATE_CARD,
  DEFAULT_LOCK_OPTIONS,
  DEFAULT_COLOUR_OPTIONS,
  LockOption,
  ColourOption,
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
  const [activeTab, setActiveTab] = useState<'rates' | 'locks' | 'colours'>('rates');

  // Rates & Sq.Ft Adjustment State
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

  // Locks CRUD State
  const [locks, setLocks] = useState<LockOption[]>(
    currentSettings.locks && currentSettings.locks.length > 0
      ? currentSettings.locks
      : DEFAULT_LOCK_OPTIONS
  );
  const [editingLockId, setEditingLockId] = useState<string | null>(null);
  const [lockName, setLockName] = useState('');
  const [lockPrice, setLockPrice] = useState('0');
  const [lockType, setLockType] = useState('Mortise');
  const [lockDesc, setLockDesc] = useState('');

  // Colours CRUD State
  const [colours, setColours] = useState<ColourOption[]>(
    currentSettings.colours && currentSettings.colours.length > 0
      ? currentSettings.colours
      : DEFAULT_COLOUR_OPTIONS
  );
  const [editingColourId, setEditingColourId] = useState<string | null>(null);
  const [colourName, setColourName] = useState('');
  const [colourCode, setColourCode] = useState('#8B5A2B');
  const [colourExtraRate, setColourExtraRate] = useState('0');
  const [colourCategory, setColourCategory] = useState<'WOOD_GRAIN' | 'SOLID_COLOR' | 'METALLIC' | 'CUSTOM'>('WOOD_GRAIN');

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
    setLocks(currentSettings.locks && currentSettings.locks.length > 0 ? currentSettings.locks : DEFAULT_LOCK_OPTIONS);
    setColours(currentSettings.colours && currentSettings.colours.length > 0 ? currentSettings.colours : DEFAULT_COLOUR_OPTIONS);
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const standardSqft = ((maxWidthCm * maxHeightCm) / 929.0304).toFixed(2);

  // --- Lock Handlers ---
  const handleStartAddLock = () => {
    setEditingLockId('NEW');
    setLockName('');
    setLockPrice('450');
    setLockType('Mortise');
    setLockDesc('');
  };

  const handleStartEditLock = (lock: LockOption) => {
    setEditingLockId(lock.id);
    setLockName(lock.name);
    setLockPrice(lock.price.toString());
    setLockType(lock.type || 'Mortise');
    setLockDesc(lock.description || '');
  };

  const handleSaveLock = () => {
    if (!lockName.trim()) {
      setStatusMsg('Please provide a lock name.');
      return;
    }
    const price = parseFloat(lockPrice) || 0;

    if (editingLockId === 'NEW') {
      const newLock: LockOption = {
        id: `lock-${Date.now().toString(36)}`,
        name: lockName.trim(),
        price,
        type: lockType.trim() || 'General',
        description: lockDesc.trim() || undefined,
      };
      setLocks([...locks, newLock]);
      setStatusMsg(`Lock "${newLock.name}" added successfully.`);
    } else {
      setLocks(
        locks.map((l) =>
          l.id === editingLockId
            ? { ...l, name: lockName.trim(), price, type: lockType.trim(), description: lockDesc.trim() || undefined }
            : l
        )
      );
      setStatusMsg(`Lock "${lockName.trim()}" updated successfully.`);
    }

    setEditingLockId(null);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDeleteLock = (id: string) => {
    const lock = locks.find((l) => l.id === id);
    if (!lock) return;
    if (confirm(`Are you sure you want to delete lock "${lock.name}"?`)) {
      setLocks(locks.filter((l) => l.id !== id));
      if (editingLockId === id) setEditingLockId(null);
      setStatusMsg(`Lock "${lock.name}" deleted.`);
      setTimeout(() => setStatusMsg(null), 2000);
    }
  };

  // --- Colour Handlers ---
  const handleStartAddColour = () => {
    setEditingColourId('NEW');
    setColourName('');
    setColourCode('#3B82F6');
    setColourExtraRate('0');
    setColourCategory('WOOD_GRAIN');
  };

  const handleStartEditColour = (colour: ColourOption) => {
    setEditingColourId(colour.id);
    setColourName(colour.name);
    setColourCode(colour.code || '#8B5A2B');
    setColourExtraRate((colour.extraRate || 0).toString());
    setColourCategory(colour.category || 'WOOD_GRAIN');
  };

  const handleSaveColour = () => {
    if (!colourName.trim()) {
      setStatusMsg('Please provide a colour / finish name.');
      return;
    }
    const extraRate = parseFloat(colourExtraRate) || 0;

    if (editingColourId === 'NEW') {
      const newColour: ColourOption = {
        id: `col-${Date.now().toString(36)}`,
        name: colourName.trim(),
        code: colourCode,
        extraRate,
        category: colourCategory,
      };
      setColours([...colours, newColour]);
      setStatusMsg(`Colour "${newColour.name}" added successfully.`);
    } else {
      setColours(
        colours.map((c) =>
          c.id === editingColourId
            ? { ...c, name: colourName.trim(), code: colourCode, extraRate, category: colourCategory }
            : c
        )
      );
      setStatusMsg(`Colour "${colourName.trim()}" updated successfully.`);
    }

    setEditingColourId(null);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDeleteColour = (id: string) => {
    const col = colours.find((c) => c.id === id);
    if (!col) return;
    if (confirm(`Are you sure you want to delete colour "${col.name}"?`)) {
      setColours(colours.filter((c) => c.id !== id));
      if (editingColourId === id) setEditingColourId(null);
      setStatusMsg(`Colour "${col.name}" deleted.`);
      setTimeout(() => setStatusMsg(null), 2000);
    }
  };

  // --- Global Save ---
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
        locks,
        colours,
      };

      const res = await fetch('/api/quotations/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        onSettingsSaved(data.settings);
        setStatusMsg('✅ Pricing rate card, locks & colours saved & applied!');
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
    if (!confirm('Reset all rate card settings, locks, and colours to factory defaults?')) return;
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
        setLocks(DEFAULT_LOCK_OPTIONS);
        setColours(DEFAULT_COLOUR_OPTIONS);
        setEditingLockId(null);
        setEditingColourId(null);
        onSettingsSaved(data.settings);
        setStatusMsg('Factory defaults restored (80×210 cm, ₹250/sqft, default locks & colours).');
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
      <div className="relative w-full max-w-2xl bg-[#070D1E] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/60 via-[#0B132B] to-[#070D1E] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Calculator className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>FRP Rate Card &amp; Specification Settings</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure standard 80×210 cm thresholds, sq.ft rates, lock hardware &amp; door colours
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#091024] px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'rates'
                ? 'bg-[#070D1E] text-rose-400 border-t-2 border-rose-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Rates &amp; Sq.Ft Adjustments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('locks')}
            className={`px-4 py-2 font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'locks'
                ? 'bg-[#070D1E] text-cyan-400 border-t-2 border-cyan-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Lock Options ({locks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colours')}
            className={`px-4 py-2 font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'colours'
                ? 'bg-[#070D1E] text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Colours &amp; Finishes ({colours.length})</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 text-xs overflow-y-auto max-h-[70vh]">
          {/* TAB 1: RATES & SQ.FT ADJUSTMENT */}
          {activeTab === 'rates' && (
            <div className="space-y-4">
              {/* Standard Threshold */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>1. Standard Size Threshold (Maximum Width &amp; Height)</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Threshold Area: {standardSqft} sq.ft
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Doors up to this measurement calculate at the standard category piece rate.
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

              {/* Category Piece Rates & Extra Sqft Rate */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>2. Category Piece Rates &amp; Square Feet Extra Rate</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Standard pricing for doors up to {maxWidthCm}×{maxHeightCm} cm:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-black text-rose-400 block">Category A Rate</span>
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
                    <span className="text-[10px] font-black text-amber-400 block">Category B Rate</span>
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
                    <span className="text-[10px] font-black text-blue-400 block">Category C Rate</span>
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
                    <span className="text-[10px] font-black text-purple-400 block">Category D Rate</span>
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
                    <span className="text-[10px] font-black text-emerald-400 block">Category E Rate</span>
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

                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
                    <span className="text-[10px] font-black text-cyan-300 block">Extra Sq.Ft Price</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-cyan-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={extraSqftRate}
                        onChange={(e) => setExtraSqftRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0B132B] text-cyan-300 font-black text-sm px-2 py-1 rounded border border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra & Below Size Strategy */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>3. Extra &amp; Below Size Calculation Rules</span>
                </span>

                <div className="space-y-2 pt-1 text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] leading-relaxed">
                    <strong className="text-white">Extra Size Formula:</strong> When door size exceeds {maxWidthCm}×{maxHeightCm} cm:
                    <br />
                    <code className="text-emerald-400 font-bold">
                      Price = Base Rate + (Actual Sq.Ft - {standardSqft} Sq.Ft) × ₹{extraSqftRate}/sq.ft
                    </code>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      Below Standard Size ({standardSqft} sq.ft) Strategy:
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
                        <div className="font-bold text-xs text-cyan-300">Divided Rate (Pro-rata Default)</div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Actual Sq.Ft × (Base Rate ÷ {standardSqft} sq.ft)
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
                          Retain full piece rate (no reduction below standard size)
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOCK HARDWARE CRUD */}
          {activeTab === 'locks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Lock Hardware Catalog &amp; Add-on Rates</h4>
                  <p className="text-[11px] text-slate-400">
                    Manage door lock mechanisms and pricing applied automatically during quotation drafting.
                  </p>
                </div>
                {editingLockId === null && (
                  <button
                    type="button"
                    onClick={handleStartAddLock}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Lock</span>
                  </button>
                )}
              </div>

              {/* Lock Add/Edit Form */}
              {editingLockId !== null && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 text-xs">
                      {editingLockId === 'NEW' ? 'Create New Lock Option' : 'Edit Lock Option'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingLockId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 font-semibold mb-1">Lock Name</label>
                      <input
                        type="text"
                        value={lockName}
                        onChange={(e) => setLockName(e.target.value)}
                        placeholder="e.g. Mortise Lock 60mm Brass"
                        className="w-full px-3 py-1.5 bg-[#0B132B] text-white rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Price Add-on (₹)</label>
                      <input
                        type="number"
                        value={lockPrice}
                        onChange={(e) => setLockPrice(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-1.5 bg-[#0B132B] text-cyan-300 font-bold rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Lock Type / Mechanism</label>
                      <input
                        type="text"
                        value={lockType}
                        onChange={(e) => setLockType(e.target.value)}
                        placeholder="Mortise / Cylindrical / Latch / Magnetic / Security"
                        className="w-full px-3 py-1.5 bg-[#0B132B] text-white rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Description / Spec</label>
                      <input
                        type="text"
                        value={lockDesc}
                        onChange={(e) => setLockDesc(e.target.value)}
                        placeholder="e.g. Double throw brass latch with 3 keys"
                        className="w-full px-3 py-1.5 bg-[#0B132B] text-white rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingLockId(null)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLock}
                      className="px-4 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingLockId === 'NEW' ? 'Add Lock' : 'Update Lock'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Locks Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                      <th className="p-2.5">Lock Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Price Add-on</th>
                      <th className="p-2.5 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {locks.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-2.5 font-bold text-white flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{l.name}</span>
                        </td>
                        <td className="p-2.5 text-slate-400">{l.type || 'Standard'}</td>
                        <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate">{l.description || '—'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-cyan-300">
                          {l.price === 0 ? 'Free / Included' : `+₹${l.price.toLocaleString('en-IN')}`}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditLock(l)}
                              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
                              title="Edit Lock"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLock(l.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                              title="Delete Lock"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: COLOUR & FINISH CRUD */}
          {activeTab === 'colours' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Door Colour &amp; Finish Options</h4>
                  <p className="text-[11px] text-slate-400">
                    Manage door surface finishes, wood grains, and luxury finish surcharges.
                  </p>
                </div>
                {editingColourId === null && (
                  <button
                    type="button"
                    onClick={handleStartAddColour}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Colour</span>
                  </button>
                )}
              </div>

              {/* Colour Add/Edit Form */}
              {editingColourId !== null && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-xs">
                      {editingColourId === 'NEW' ? 'Create New Colour / Finish' : 'Edit Colour / Finish'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingColourId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 font-semibold mb-1">Colour / Finish Name</label>
                      <input
                        type="text"
                        value={colourName}
                        onChange={(e) => setColourName(e.target.value)}
                        placeholder="e.g. Teak Wood Grain Matte"
                        className="w-full px-3 py-1.5 bg-[#0B132B] text-white rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Category</label>
                      <select
                        value={colourCategory}
                        onChange={(e) => setColourCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-[#0B132B] text-white rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="WOOD_GRAIN">Wood Grain</option>
                        <option value="SOLID_COLOR">Solid Colour</option>
                        <option value="METALLIC">Metallic</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Extra Surcharge (₹)</label>
                      <input
                        type="number"
                        value={colourExtraRate}
                        onChange={(e) => setColourExtraRate(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-1.5 bg-[#0B132B] text-emerald-300 font-bold rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-slate-400 font-semibold">Color Preview / Swatch Hex:</label>
                    <input
                      type="color"
                      value={colourCode}
                      onChange={(e) => setColourCode(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colourCode}
                      onChange={(e) => setColourCode(e.target.value)}
                      className="w-24 px-2 py-1 bg-[#0B132B] text-white font-mono text-xs rounded border border-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingColourId(null)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveColour}
                      className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingColourId === 'NEW' ? 'Add Colour' : 'Update Colour'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Colours Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                      <th className="p-2.5">Colour / Finish Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Swatch Code</th>
                      <th className="p-2.5 text-right">Extra Surcharge</th>
                      <th className="p-2.5 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {colours.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-2.5 font-bold text-white flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-inner"
                            style={{ backgroundColor: c.code || '#555' }}
                          />
                          <span>{c.name}</span>
                        </td>
                        <td className="p-2.5 text-slate-400">
                          {c.category?.replace('_', ' ') || 'Wood Grain'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">{c.code || '—'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                          {c.extraRate && c.extraRate > 0 ? `+₹${c.extraRate.toLocaleString('en-IN')}` : 'Included (₹0)'}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditColour(c)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer"
                              title="Edit Colour"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteColour(c.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                              title="Delete Colour"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
