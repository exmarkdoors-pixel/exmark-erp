'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  Shield,
  Layers,
  FileText,
  DollarSign,
  Printer,
  Award,
  MessageSquare,
  Lock,
  Building2,
} from 'lucide-react';
import { ERPConfiguration, ConfigurationRevision } from '@/lib/services/customizationService';
import CompanyFactoryProfileSettings from './CompanyFactoryProfileSettings';

export default function AdminCustomizationSettings() {
  const [activeTab, setActiveTab] = useState<
    | 'profile'
    | 'categories'
    | 'fields'
    | 'dropdowns'
    | 'numbering'
    | 'workflows'
    | 'tolerances'
    | 'pricing'
    | 'gst_targets'
    | 'pdf_warranty'
    | 'notifications'
    | 'roles'
    | 'revisions'
  >('profile');

  const [config, setConfig] = useState<ERPConfiguration | null>(null);
  const [revisions, setRevisions] = useState<ConfigurationRevision[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishChangelog, setPublishChangelog] = useState<string>('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  const refreshSettings = async () => {
    setIsLoading(true);
    try {
      const [resConfig, resRev] = await Promise.all([
        fetch('/api/settings/customizations?view=active').then((r) => r.json()),
        fetch('/api/settings/customizations?view=revisions').then((r) => r.json()),
      ]);

      if (resConfig.success && resConfig.data) {
        setConfig(resConfig.data);
      }
      if (resRev.success && Array.isArray(resRev.data)) {
        setRevisions(resRev.data);
      }
    } catch {
      setToastMessage({ type: 'error', text: 'Failed to refresh customization settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/settings/customizations?view=active').then((r) => r.json()),
      fetch('/api/settings/customizations?view=revisions').then((r) => r.json()),
    ])
      .then(([resConfig, resRev]) => {
        if (active) {
          if (resConfig.success && resConfig.data) {
            setConfig(resConfig.data);
          }
          if (resRev.success && Array.isArray(resRev.data)) {
            setRevisions(resRev.data);
          }
        }
      })
      .catch(() => {
        if (active) {
          setToastMessage({ type: 'error', text: 'Failed to load customization settings.' });
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveDraft = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_DRAFT', draft: config }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save draft');
      showToast('success', 'Customization draft saved successfully.');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error saving draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!config) return;
    setIsPublishing(true);
    try {
      const res = await fetch('/api/settings/customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PUBLISH',
          draft: config,
          changelog: publishChangelog || `Version ${config.version + 1} plant configuration updates.`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to publish');
      setConfig(json.data);
      setIsPublishModalOpen(false);
      setPublishChangelog('');
      showToast('success', `Configuration v${json.data.version} published and active across plant workstations.`);
      refreshSettings();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error publishing settings');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (target: string | number) => {
    if (!confirm(`Are you sure you want to rollback to configuration revision ${target}?`)) return;
    try {
      const res = await fetch('/api/settings/customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ROLLBACK', targetIdentifier: target }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to rollback');
      setConfig(json.data);
      showToast('success', `Successfully rolled back to configuration v${json.data.version}.`);
      refreshSettings();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Rollback failed');
    }
  };

  if (isLoading || !config) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading EXMARK ERP Master Customization Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#070D1E] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/40">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Master Customization &amp; Rule Engine
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                v{config.version} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Last updated {new Date(config.lastUpdated).toLocaleDateString()} by {config.updatedBy}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              previewMode
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            {previewMode ? 'Exit Preview' : 'Preview Rules'}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Version</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs for all domains */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-[11px]">
        {[
          { id: 'profile', label: '0. Company & Factory Profile', icon: Building2 },
          { id: 'categories', label: '1. Categories', icon: Layers },
          { id: 'fields', label: '2. Dynamic Fields', icon: FileText },
          { id: 'dropdowns', label: '3. Dropdowns', icon: Sliders },
          { id: 'numbering', label: '4. Numbering', icon: FileText },
          { id: 'workflows', label: '5. Workflows', icon: CheckCircle2 },
          { id: 'tolerances', label: '6. Tolerances', icon: Sliders },
          { id: 'pricing', label: '7. Price Lists', icon: DollarSign },
          { id: 'gst_targets', label: '8. GST & Targets', icon: Award },
          { id: 'pdf_warranty', label: '9. PDF & Warranty', icon: Printer },
          { id: 'notifications', label: '10. WhatsApp & Alerts', icon: MessageSquare },
          { id: 'roles', label: '11. Roles & Security', icon: Shield },
          { id: 'revisions', label: '12. Revision History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 0: Company & Factory Profile */}
      {activeTab === 'profile' && (
        <CompanyFactoryProfileSettings onSettingsUpdated={refreshSettings} />
      )}

      {/* Tab 1: Product Categories */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-500" />
            1. Product Categories Configuration (FRP Enabled • WPC Optional)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            FRP Doors is the core manufacturing focus for EXMARK Doors manufacturing plants and is permanently enabled. WPC doors can be toggled on/off as an optional secondary line.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-400">FRP Doors (Primary Category)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  PERMANENTLY ENABLED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Fiberglass Reinforced Polymer monolithic waterproof shutters. Immutable primary product line.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">WPC Doors (Secondary Line)</span>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        wpc: { ...config.categories.wpc, enabled: !config.categories.wpc.enabled },
                      },
                    })
                  }
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    config.categories.wpc.enabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {config.categories.wpc.enabled ? 'ENABLED' : 'DISABLED (OFF)'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                When disabled, WPC doors are completely hidden from new measurement bookings, quotations, and plant boards.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dynamic Fields */}
      {activeTab === 'fields' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-500" />
            2. Dynamic Custom Form Fields
          </h4>
          <p className="text-xs text-slate-400">
            Define custom input fields attached to measurements, customer accounts, and sales orders.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Target Module</th>
                  <th className="p-2.5">Field Key</th>
                  <th className="p-2.5">Display Label</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Required</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {config.dynamicFields.map((field) => (
                  <tr key={field.id}>
                    <td className="p-2.5 font-bold uppercase text-slate-300">{field.module}</td>
                    <td className="p-2.5 font-mono text-slate-400">{field.fieldKey}</td>
                    <td className="p-2.5 font-medium text-white">{field.fieldLabel}</td>
                    <td className="p-2.5 text-slate-400 uppercase">{field.fieldType}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${field.isRequired ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                        {field.isRequired ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="text-emerald-400 font-bold">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Dropdowns */}
      {activeTab === 'dropdowns' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-500" />
            3. Standard Dropdown Masters
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300">Door Models ({config.dropdownOptions.doorModels.length})</span>
              <ul className="space-y-1 text-slate-400 text-[11px]">
                {config.dropdownOptions.doorModels.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-red-400" /> {m}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300">PU Woodgrain Colours ({config.dropdownOptions.colours.length})</span>
              <ul className="space-y-1 text-slate-400 text-[11px]">
                {config.dropdownOptions.colours.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-amber-400" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Document Numbering */}
      {activeTab === 'numbering' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-500" />
            4. Document Numbering Prefixes &amp; Sequences
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {Object.entries(config.documentNumbering).map(([doc, val]) => (
              <div key={doc} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{doc}</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {val.prefix}-2026-0001
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Workflows & Approvals */}
      {activeTab === 'workflows' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-red-500" />
            5. Workflow Rules &amp; Financial Approval Thresholds
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 block">Manufacturing Gate Rules</span>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={config.workflowRules.requireMeasurementBeforeCutting}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      workflowRules: { ...config.workflowRules, requireMeasurementBeforeCutting: e.target.checked },
                    })
                  }
                  className="rounded text-red-600"
                />
                Require Verified Site Measurement Before Cutting
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={config.workflowRules.requireAdvanceBeforeProduction}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      workflowRules: { ...config.workflowRules, requireAdvanceBeforeProduction: e.target.checked },
                    })
                  }
                  className="rounded text-red-600"
                />
                Require Minimum {config.workflowRules.minimumAdvancePercentage}% Advance Before Production Release
              </label>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 block">Financial Approval Limits</span>
              <div className="space-y-2 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Max Sales Executive Discount:</span>
                  <span className="font-bold text-white">{config.approvalThresholds.maxSalesDiscountPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>High Value Order Signoff:</span>
                  <span className="font-bold text-white">₹{config.approvalThresholds.highValueOrderThreshold.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Frame & Cutting Tolerances */}
      {activeTab === 'tolerances' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-500" />
            6. Frame &amp; Finished Cutting Tolerances (Deterministic Formulas)
          </h4>
          <p className="text-xs text-slate-400">
            Finished dimensions are calculated deterministically as <em>Finished = Raw Masonry Opening - Tolerance Deduction</em>. Negative dimensions are strictly prohibited.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">FRP Height Deduction</span>
              <span className="font-mono text-white font-bold text-sm">
                -{config.frameAndCuttingSettings.frpHeightDeductionMm} mm
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">FRP Width Deduction</span>
              <span className="font-mono text-white font-bold text-sm">
                -{config.frameAndCuttingSettings.frpWidthDeductionMm} mm
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">Granite Offset Allowance</span>
              <span className="font-mono text-white font-bold text-sm">
                {config.frameAndCuttingSettings.graniteSubframeOffsetMm} mm
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Pricing Lists */}
      {activeTab === 'pricing' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-red-500" />
            7. Official Standard Price Lists
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">Base FRP Rate / sq.ft</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                ₹{config.priceLists.baseFrpRatePerSqFt}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">CNC Luxury Carving Surcharge</span>
              <span className="font-mono text-white font-bold text-sm">
                +₹{config.priceLists.cncCarvingSurchargePerSqFt} / sq.ft
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">Digital Smart Lock Routing</span>
              <span className="font-mono text-white font-bold text-sm">
                +₹{config.priceLists.digitalLockRoutingPrepCharge} / door
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: GST & Targets */}
      {activeTab === 'gst_targets' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-red-500" />
            8. Kerala GST Configuration &amp; Monthly Plant Targets
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">GST Compliance (HSN 3925.20.00)</span>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Kerala GSTIN:</span>
                  <span className="font-mono font-bold text-white">{config.gstConfig.gstin}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST / SGST Rate:</span>
                  <span className="font-bold text-white">{config.gstConfig.cgstRate}% + {config.gstConfig.sgstRate}% (18% Total)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">Monthly Operational Targets</span>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Monthly Sales Revenue Target:</span>
                  <span className="font-bold text-emerald-400">₹{config.financialTargets.monthlyRevenueTarget.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly FRP Door Volume:</span>
                  <span className="font-bold text-white">{config.financialTargets.monthlyFrpDoorsTarget} doors</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 9: PDF & Warranty */}
      {activeTab === 'pdf_warranty' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-red-500" />
            9. Document Layouts &amp; 15-Year FRP Material Warranty Policy
          </h4>
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm">FRP Door Material Warranty: {config.warrantyPolicies.frpWarrantyYears} Years</span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">OFFICIAL POLICY</span>
            </div>
            <div className="text-[11px] space-y-1.5 text-slate-300">
              <p>
                <strong>Covered Components:</strong> {config.warrantyPolicies.coveredComponents}
              </p>
              <p className="text-amber-300">
                <strong>Explicit Exclusions:</strong> {config.warrantyPolicies.excludedComponents}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 10: WhatsApp & Alerts */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-red-500" />
            10. Meta WhatsApp Cloud API &amp; Customer Communication Rules
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">Automated Dispatch Triggers</span>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Auto-send 72-hour measurement confirmation link
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Auto-send driver &amp; vehicle dispatch tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Auto-send 15-Year FRP Material Warranty Certificate
                </li>
              </ul>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">Localization</span>
              <p className="text-[11px] text-slate-400">
                Official templates rendered in Malayalam (മലയാളം) and English for Kerala dealers, builders, and home owners.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 11: Roles & Security */}
      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            11. Server-Side Role-Based Access Control (RBAC) Matrix
          </h4>
          <p className="text-xs text-slate-400">
            Permissions are verified authoritatively on the Next.js backend server. Frontend button hiding is purely cosmetic.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Allowed Modules</th>
                  <th className="p-2.5">Approve Production</th>
                  <th className="p-2.5">Authorize Finance</th>
                  <th className="p-2.5">Manage Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {config.employeeRoles.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold text-white">{r.roleName}</td>
                    <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate">
                      {r.allowedModules.join(', ')}
                    </td>
                    <td className="p-2.5">
                      {r.canApproveProduction ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </td>
                    <td className="p-2.5">
                      {r.canAuthorizeFinance ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </td>
                    <td className="p-2.5">
                      {r.canManageUsers ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 12: Revision History & Rollback */}
      {activeTab === 'revisions' && (
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-red-500" />
            12. Revision History, Snapshots &amp; 1-Click Rollback
          </h4>
          <p className="text-xs text-slate-400">
            Every published configuration creates an immutable cryptographic snapshot. Roll back to any prior version safely without disrupting active database records.
          </p>

          <div className="space-y-3">
            {revisions.map((rev) => (
              <div
                key={rev.id || `rev-${rev.version}-${rev.publishedAt}`}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">Version {rev.version}</span>
                    {rev.id && (
                      <span className="font-mono text-[10px] text-slate-500">({rev.id})</span>
                    )}
                    {rev.version === config.version && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mb-1">{rev.changelog}</p>
                  <p className="text-slate-500 text-[10px]">
                    Published {new Date(rev.publishedAt).toLocaleString()} by {rev.publishedBy}
                  </p>
                </div>

                {rev.version !== config.version && (
                  <button
                    onClick={() => handleRollback(rev.id || rev.version)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback to v{rev.version}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0B132B] text-slate-100 rounded-2xl border border-slate-700 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" />
              Publish Configuration Version {config.version + 1}
            </h3>
            <p className="text-xs text-slate-400">
              Publishing will make these rules immediately active for all workstations and create an immutable revision snapshot.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Changelog / Release Notes
              </label>
              <textarea
                value={publishChangelog}
                onChange={(e) => setPublishChangelog(e.target.value)}
                placeholder="e.g. Updated FRP standard cutting tolerance and minimum advance percentage to 40%."
                rows={3}
                className="w-full px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40 cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
