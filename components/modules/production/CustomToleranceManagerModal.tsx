'use client';

import React, { useState, useEffect } from 'react';
import { CustomTolerancePreset } from '@/lib/services/toleranceService';
import { X, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Sliders, Check } from 'lucide-react';

interface CustomToleranceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: CustomTolerancePreset) => void;
}

export function CustomToleranceManagerModal({
  isOpen,
  onClose,
  onSelectPreset,
}: CustomToleranceManagerModalProps) {
  const [presets, setPresets] = useState<CustomTolerancePreset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [heightDeductionMm, setHeightDeductionMm] = useState<number>(10);
  const [widthDeductionMm, setWidthDeductionMm] = useState<number>(10);
  const [applicableFor, setApplicableFor] = useState<CustomTolerancePreset['applicableFor']>('ALL');
  const [description, setDescription] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/tolerances');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPresets(json.data);
      }
    } catch {
      setError('Failed to load tolerance presets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setHeightDeductionMm(10);
    setWidthDeductionMm(10);
    setApplicableFor('ALL');
    setDescription('');
    setIsDefault(false);
    setError(null);
  };

  const handleEditClick = (preset: CustomTolerancePreset) => {
    setEditingId(preset.id);
    setName(preset.name);
    setHeightDeductionMm(preset.heightDeductionMm);
    setWidthDeductionMm(preset.widthDeductionMm);
    setApplicableFor(preset.applicableFor);
    setDescription(preset.description || '');
    setIsDefault(Boolean(preset.isDefault));
  };

  const handleDeleteClick = async (id: string, presetName: string) => {
    if (!confirm(`Are you sure you want to delete tolerance preset "${presetName}"?`)) return;
    try {
      const res = await fetch(`/api/settings/tolerances/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Deleted preset: ${presetName}`);
        loadPresets();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(json.error || 'Failed to delete preset');
      }
    } catch {
      setError('Network error while deleting preset');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Preset name cannot be empty');
      return;
    }

    try {
      setError(null);
      const payload = {
        name: name.trim(),
        heightDeductionMm: Number(heightDeductionMm),
        widthDeductionMm: Number(widthDeductionMm),
        applicableFor,
        description: description.trim(),
        isDefault,
      };

      if (editingId) {
        const res = await fetch(`/api/settings/tolerances/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setSuccess(`Updated tolerance preset: ${name}`);
          resetForm();
          loadPresets();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(json.error || 'Failed to update preset');
        }
      } else {
        const res = await fetch('/api/settings/tolerances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setSuccess(`Added new tolerance preset: ${name}`);
          resetForm();
          loadPresets();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(json.error || 'Failed to add preset');
        }
      }
    } catch {
      setError('Network error saving tolerance preset');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Cutting Tolerances &amp; Deduction Presets Manager
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono">
                  {presets.length} Rules
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure finished cutting deduction formulas: Finished Size = Raw Size - Tolerance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                {editingId ? <Edit2 className="w-3.5 h-3.5 text-rose-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
                {editingId ? 'Edit Tolerance Preset' : 'Add New Tolerance Preset'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cancel Edit (Switch to New)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-300 font-semibold">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Standard Flooring Clearance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Applies To</label>
                <select
                  value={applicableFor}
                  onChange={(e) => setApplicableFor(e.target.value as CustomTolerancePreset['applicableFor'])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="ALL">All Door Orders</option>
                  <option value="DOOR_WITH_FRAME">Door With Frame Only</option>
                  <option value="ONLY_DOOR">Only Door (Shutter Only)</option>
                  <option value="DOUBLE_DOOR">Double Leaf Door</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-semibold">Height Deduction:</label>
                  <span className="font-mono font-bold text-red-400 text-sm">-{heightDeductionMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={heightDeductionMm}
                  onChange={(e) => setHeightDeductionMm(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-[10px] text-slate-500 block">Flooring tile clearance &amp; top frame gap</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-semibold">Width Deduction:</label>
                  <span className="font-mono font-bold text-red-400 text-sm">-{widthDeductionMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={widthDeductionMm}
                  onChange={(e) => setWidthDeductionMm(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-[10px] text-slate-500 block">Hinge rebate gap &amp; lock strike clearance</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Description / Workshop Rule Explanation</label>
              <input
                type="text"
                placeholder="e.g. 10mm bottom floor clearance + 2mm top frame gap for bathroom doors"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0"
                />
                <span>Set as Default Tolerance Preset</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-950/40 cursor-pointer"
              >
                {editingId ? 'Save Preset Changes' : '+ Add Tolerance Preset'}
              </button>
            </div>
          </form>

          {/* List of Presets */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Configured Tolerance Rules ({presets.length})
            </h3>

            {isLoading ? (
              <div className="p-6 text-center text-slate-500">Loading tolerance presets...</div>
            ) : presets.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No tolerance presets found. Use the form above to add your first preset.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                {presets.map((preset) => (
                  <div key={preset.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {preset.id}
                        </span>
                        <span className="font-bold text-white text-xs">{preset.name}</span>
                        {preset.isDefault && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            DEFAULT
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-800 text-slate-400">
                          {preset.applicableFor.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-mono">
                        <span className="text-red-400 font-bold">Height Deduction: -{preset.heightDeductionMm} mm</span>
                        <span className="text-red-400 font-bold">Width Deduction: -{preset.widthDeductionMm} mm</span>
                      </div>
                      {preset.description && (
                        <p className="text-[10px] text-slate-500">{preset.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectPreset && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPreset(preset);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Apply this tolerance to sticker"
                        >
                          <Check className="w-3 h-3" />
                          <span>Apply</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditClick(preset)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition cursor-pointer flex items-center gap-1 border border-slate-700"
                        title="Edit Preset"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(preset.id, preset.name)}
                        className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[11px] transition cursor-pointer border border-red-500/20"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
