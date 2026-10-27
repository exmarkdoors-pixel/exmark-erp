'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Plus,
  Info,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Factory,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProductCategories } from '@/lib/context/ProductCategoryContext';

export default function ProductCategoriesSettings() {
  const { categories, isWpcEnabled, toggleCategory, refreshCategories } = useProductCategories();
  const [expandedCode, setExpandedCode] = useState<string | null>('FRP');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New category form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBaseRate, setNewBaseRate] = useState(190);
  const [newHsn, setNewHsn] = useState('3925.20.00');

  const handleToggle = async (code: string, currentEnabled: boolean) => {
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const success = await toggleCategory(code, !currentEnabled);
      if (success) {
        setFeedbackMsg({
          type: 'success',
          text: `Category "${code}" has been successfully ${!currentEnabled ? 'ENABLED' : 'DISABLED'}. Operational workflows, door forms, and targets updated.`,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `Failed to update status for category "${code}".`,
        });
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating category.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/settings/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.toUpperCase().trim(),
          name: newName.trim(),
          description: newDesc.trim(),
          pricing: {
            baseRateSqFt: newBaseRate,
            standardGstPercent: 18,
            hsnCode: newHsn.trim(),
          },
          enabled: true,
          reportingVisibility: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Custom category "${newCode.toUpperCase()}" registered successfully!`,
        });
        setIsAddingNew(false);
        setNewCode('');
        setNewName('');
        setNewDesc('');
        await refreshCategories();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: json.error || 'Failed to create category.',
        });
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Network error.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FRP-First Policy Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900/60 to-slate-900/60 border border-red-500/30 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm text-white">EXMARK FRP-First Architecture Policy</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            FRP Default • WPC Optional
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          EXMARK Doors specializes primarily in <strong>Fiber Reinforced Polymer (FRP)</strong> architectural doors.
          FRP is enabled by default across all dashboards, targets, sample data, and factory lines.
          <strong> WPC Doors &amp; Extruded Frames</strong> are optional and disabled by default.
        </p>
        <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-400">
          <span>• Primary Product: <strong className="text-emerald-400">FRP Doors (Active)</strong></span>
          <span>
            • WPC Status:{' '}
            <strong className={isWpcEnabled ? 'text-blue-400' : 'text-amber-400'}>
              {isWpcEnabled ? 'ENABLED (Optional Line Active)' : 'DISABLED (OFF by default)'}
            </strong>
          </span>
          <span>• Historical Data: <strong className="text-slate-300">Preserved</strong></span>
        </div>
      </div>

      {/* Category Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-500" />
            Registered Product Categories ({categories.length})
          </h4>
          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingNew ? 'Close Form' : '+ Add Future Category'}</span>
          </button>
        </div>

        {/* Add Category Form Modal / Drawer */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateCategory}
            className="bg-white dark:bg-[#070D1E] p-4 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3 animate-in fade-in text-xs"
          >
            <h5 className="font-bold text-xs uppercase tracking-wider text-red-400">
              Configure New Product Category
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Category Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HYBRID, FIRE_RATED"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-700 rounded text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solid Hybrid Exterior Doors"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Base Rate (₹ / sq.ft)</label>
                <input
                  type="number"
                  min="50"
                  max="2000"
                  value={newBaseRate}
                  onChange={(e) => setNewBaseRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={newHsn}
                  onChange={(e) => setNewHsn(e.target.value)}
                  placeholder="e.g. 3925.20.00"
                  className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-slate-400 mb-1">Description &amp; Specifications</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. High-grade composite resin with internal solid core..."
                  className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Register Category'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Categories Cards */}
        {categories.map((cat) => {
          const isExpanded = expandedCode === cat.code;

          return (
            <div
              key={cat.id || cat.code}
              className={`bg-white dark:bg-[#0B132B] rounded-xl border transition-all ${
                cat.enabled
                  ? 'border-slate-300 dark:border-slate-800 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800/60 opacity-80'
              }`}
            >
              {/* Header Bar */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      cat.code === 'FRP'
                        ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                        : cat.enabled
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {cat.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {cat.name}
                      </h4>
                      {cat.isPrimary && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          PRIMARY PRODUCT
                        </span>
                      )}
                      {!cat.enabled && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          DISABLED (OFF)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{cat.description}</p>
                  </div>
                </div>

                {/* Actions & Toggle */}
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  {/* WPC / Category ON/OFF Switch */}
                  {cat.isPrimary ? (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Locked Active
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">
                        {cat.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggle(cat.code, cat.enabled)}
                        disabled={isSubmitting}
                        aria-label={`Toggle ${cat.name}`}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          cat.enabled ? 'bg-red-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            cat.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Expand / Collapse Details Button */}
                  <button
                    onClick={() => setExpandedCode(isExpanded ? null : cat.code)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isExpanded ? 'Collapse parameters' : 'View parameters'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expandable Parameters Drawer */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 text-xs space-y-4 rounded-b-xl">
                  {/* Notice when WPC is disabled */}
                  {!cat.enabled && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Operational Effect:</strong> When disabled, {cat.name} is hidden from new site measurements, order forms, sales targets, and plant production boards. Historical orders remain preserved for reporting.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Category Fields */}
                    <div className="bg-white dark:bg-[#070D1E] p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Category-Specific Fields
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.fields.map((fld) => (
                          <span
                            key={fld}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-300 border border-slate-700/60"
                          >
                            {fld}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 2. Pricing & Taxation */}
                    <div className="bg-white dark:bg-[#070D1E] p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                        Pricing &amp; Taxation
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Base Rate:</span>
                          <span className="font-bold text-white">₹{cat.pricing.baseRateSqFt} / sq.ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">GST Slab:</span>
                          <span className="font-semibold text-slate-300">{cat.pricing.standardGstPercent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">HSN Code:</span>
                          <span className="font-mono text-slate-300">{cat.pricing.hsnCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Production Configuration */}
                    <div className="bg-white dark:bg-[#070D1E] p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Factory className="w-3.5 h-3.5 text-red-400" />
                        Production Settings
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned Line:</span>
                          <span className="font-medium text-slate-300">{cat.production.lineName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Cycle Time:</span>
                          <span className="font-semibold text-slate-300">{cat.production.cycleTimeMinutes} mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Reporting:</span>
                          <span className={`font-semibold ${cat.reportingVisibility ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {cat.reportingVisibility ? 'Visible in Reports' : 'Hidden from Reports'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
