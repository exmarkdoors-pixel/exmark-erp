'use client';

import React, { useState, useEffect } from 'react';
import { CustomFrameProfile } from '@/lib/utils/frameDefaults';
import { X, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Layers, Check } from 'lucide-react';

interface CustomFrameManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFrame?: (frameName: string) => void;
  onFramesUpdated?: (frames: CustomFrameProfile[]) => void;
}

export function CustomFrameManagerModal({
  isOpen,
  onClose,
  onSelectFrame,
  onFramesUpdated,
}: CustomFrameManagerModalProps) {
  const [frames, setFrames] = useState<CustomFrameProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [material, setMaterial] = useState<CustomFrameProfile['material']>('FRP_WRAP');
  const [wallThicknessMm, setWallThicknessMm] = useState<number>(72);
  const [sectionWidthMm, setSectionWidthMm] = useState<number>(50);
  const [rebateDepthMm, setRebateDepthMm] = useState<number>(35);
  const [hDeductionCm, setHDeductionCm] = useState<number>(4.5);
  const [wDeductionCm, setWDeductionCm] = useState<number>(7.6);
  const [pieceRateCost, setPieceRateCost] = useState<number>(125);
  const [materialCost, setMaterialCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quotationExtraRate, setQuotationExtraRate] = useState<number>(0);
  const [woodThicknessCm, setWoodThicknessCm] = useState<number>(2);
  const [woodWidthCm, setWoodWidthCm] = useState<number>(7);
  const [woodLengthDeductionCm, setWoodLengthDeductionCm] = useState<number>(35);
  const [description, setDescription] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFrames = async (notifyParent = false) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/frames');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFrames(json.data);
        if (notifyParent) {
          onFramesUpdated?.(json.data);
        }
      }
    } catch {
      setError('Failed to load custom frames');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFrames(false);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setMaterial('FRP_WRAP');
    setWallThicknessMm(72);
    setSectionWidthMm(50);
    setRebateDepthMm(35);
    setHDeductionCm(4.5);
    setWDeductionCm(7.6);
    setPieceRateCost(125);
    setMaterialCost(0);
    setSellingPrice(0);
    setQuotationExtraRate(0);
    setWoodThicknessCm(2);
    setWoodWidthCm(7);
    setWoodLengthDeductionCm(35);
    setDescription('');
    setIsDefault(false);
    setError(null);
  };

  const handleEditClick = (frame: CustomFrameProfile) => {
    setEditingId(frame.id);
    setName(frame.name);
    setMaterial(frame.material);
    setWallThicknessMm(frame.wallThicknessMm);
    setSectionWidthMm(frame.sectionWidthMm);
    setRebateDepthMm(frame.rebateDepthMm);
    setHDeductionCm(frame.hDeductionCm ?? 4.5);
    setWDeductionCm(frame.wDeductionCm ?? 7.6);
    setPieceRateCost(frame.pieceRateCost ?? 125);
    setMaterialCost(frame.materialCost ?? 0);
    setSellingPrice(frame.sellingPrice ?? 0);
    setQuotationExtraRate(frame.quotationExtraRate ?? 0);
    const isNone = frame.material === 'NONE' || frame.name.toLowerCase().includes('only door');
    setWoodThicknessCm(frame.woodThicknessCm ?? (isNone ? 0 : 2));
    setWoodWidthCm(frame.woodWidthCm ?? (isNone ? 0 : 7));
    setWoodLengthDeductionCm(frame.woodLengthDeductionCm ?? (isNone ? 0 : 35));
    setDescription(frame.description || '');
    setIsDefault(Boolean(frame.isDefault));
  };

  const handleDeleteClick = async (id: string, frameName: string) => {
    if (!confirm(`Are you sure you want to delete custom frame "${frameName}"?`)) return;
    try {
      const res = await fetch(`/api/settings/frames/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Deleted frame: ${frameName}`);
        if (editingId === id) resetForm();
        loadFrames(true);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(json.error || 'Failed to delete frame');
      }
    } catch {
      setError('Network error while deleting frame');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Frame name cannot be empty');
      return;
    }

    try {
      setError(null);
      const payload = {
        name: name.trim(),
        material,
        wallThicknessMm: Number(wallThicknessMm),
        sectionWidthMm: Number(sectionWidthMm),
        rebateDepthMm: Number(rebateDepthMm),
        hDeductionCm: Number(hDeductionCm),
        wDeductionCm: Number(wDeductionCm),
        pieceRateCost: Number(pieceRateCost),
        materialCost: Number(materialCost),
        sellingPrice: Number(sellingPrice),
        quotationExtraRate: Number(quotationExtraRate),
        woodThicknessCm: Number(woodThicknessCm),
        woodWidthCm: Number(woodWidthCm),
        woodLengthDeductionCm: Number(woodLengthDeductionCm),
        description: description.trim(),
        isDefault,
      };

      if (editingId) {
        const res = await fetch(`/api/settings/frames/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setSuccess(`Updated frame: ${name}`);
          resetForm();
          loadFrames(true);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(json.error || 'Failed to update frame');
        }
      } else {
        const res = await fetch('/api/settings/frames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setSuccess(`Added new custom frame: ${name}`);
          resetForm();
          loadFrames(true);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(json.error || 'Failed to add frame');
        }
      }
    } catch {
      setError('Network error saving frame profile');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Custom Door Frames Manager
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  {frames.length} Profiles
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Add, edit &amp; delete door frame specifications, wall sections, rebates and piece rates
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

          {/* Add / Edit Frame Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                {editingId ? <Edit2 className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
                {editingId ? 'Edit Frame Profile' : 'Add New Custom Frame'}
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
                <label className="text-slate-300 font-semibold">Frame Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. 100x50mm FRP Wrap Frame"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Material Base</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as CustomFrameProfile['material'])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="FRP_WRAP">FRP Wrapped</option>
                  <option value="WPC_SOLID">Solid WPC Extrusion</option>
                  <option value="COMPOSITE">Polymer Composite</option>
                  <option value="HARDWOOD">Kerala Hardwood</option>
                  <option value="NONE">None (Door Only)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Wall Section (mm)</label>
                <input
                  type="number"
                  min="0"
                  value={wallThicknessMm}
                  onChange={(e) => setWallThicknessMm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  placeholder="72"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Face Width (mm)</label>
                <input
                  type="number"
                  min="0"
                  value={sectionWidthMm}
                  onChange={(e) => setSectionWidthMm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  placeholder="50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Rebate Depth (mm)</label>
                <input
                  type="number"
                  min="0"
                  value={rebateDepthMm}
                  onChange={(e) => setRebateDepthMm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  placeholder="35"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Frame Labor (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={pieceRateCost}
                  onChange={(e) => setPieceRateCost(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-400 font-mono font-bold"
                  placeholder="125"
                  title="Worker piece-rate labor per frame"
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-300 font-semibold">BOQ Mat Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-amber-500/50 rounded-lg px-3 py-1.5 text-amber-300 font-mono font-bold"
                  placeholder="0"
                  title="Material raw purchase cost per frame in BOQ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Quote Extra (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={quotationExtraRate}
                  onChange={(e) => setQuotationExtraRate(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold"
                  placeholder="0"
                  title="Optional extra surcharge per door added in Quotation (0 = Included in Door Rate)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/80 border border-amber-500/20">
              <div className="space-y-1">
                <label className="text-amber-300 font-bold">Height Deduction Formula (-cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={hDeductionCm}
                  onChange={(e) => setHDeductionCm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-amber-500/40 rounded-lg px-3 py-1.5 text-amber-200 font-mono font-bold"
                  placeholder="4.5"
                />
                <span className="text-[10px] text-slate-400 block">
                  Subtracted from Raw Height CM for 12L Sticker (e.g. Mini Type = 4.5 cm)
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-amber-300 font-bold">Width Deduction Formula (-cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={wDeductionCm}
                  onChange={(e) => setWDeductionCm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-amber-500/40 rounded-lg px-3 py-1.5 text-amber-200 font-mono font-bold"
                  placeholder="7.6"
                />
                <span className="text-[10px] text-slate-400 block">
                  Subtracted from Raw Top &amp; Btm Width CM (e.g. Mini Type = 7.6 cm)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/80 border border-emerald-500/20">
              <div className="space-y-1">
                <label className="text-emerald-300 font-bold">BOQ Frame Wood Thickness (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={woodThicknessCm}
                  onChange={(e) => setWoodThicknessCm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-emerald-200 font-mono font-bold"
                  placeholder="2"
                />
                <span className="text-[10px] text-slate-400 block">Regular = 2 cm (0 = No wood)</span>
              </div>

              <div className="space-y-1">
                <label className="text-emerald-300 font-bold">BOQ Frame Wood Width (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={woodWidthCm}
                  onChange={(e) => setWoodWidthCm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-emerald-200 font-mono font-bold"
                  placeholder="7"
                />
                <span className="text-[10px] text-slate-400 block">Regular = 7 cm wood reeper</span>
              </div>

              <div className="space-y-1">
                <label className="text-emerald-300 font-bold">Length Deduction (-cm)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={woodLengthDeductionCm}
                  onChange={(e) => setWoodLengthDeductionCm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-emerald-200 font-mono font-bold"
                  placeholder="35"
                />
                <span className="text-[10px] text-slate-400 block">Total Frame Length - 35 cm</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Description / Notes</label>
              <input
                type="text"
                placeholder="e.g. Standard 4-inch brickwork Kerala residence frame with rubber gasket"
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
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>Set as Default Frame Preset</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-950/40 cursor-pointer"
              >
                {editingId ? 'Save Frame Changes' : '+ Add Custom Frame'}
              </button>
            </div>
          </form>

          {/* List of Existing Custom Frames */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Active Frame Profiles Directory ({frames.length})
            </h3>

            {isLoading ? (
              <div className="p-6 text-center text-slate-500">Loading custom frames...</div>
            ) : frames.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No custom frames found. Use the form above to add your first custom frame.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                {frames.map((frame) => (
                  <div key={frame.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {frame.id}
                        </span>
                        <span className="font-bold text-white text-xs">{frame.name}</span>
                        {frame.isDefault && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            DEFAULT
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-800 text-slate-400">
                          {frame.material.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span>Section: {frame.wallThicknessMm}mm &times; {frame.sectionWidthMm}mm</span>
                        <span>Rebate: {frame.rebateDepthMm} mm</span>
                        <span className="text-cyan-400 font-mono font-bold">
                          Formula: H -{frame.hDeductionCm ?? 4.5}cm / W -{frame.wDeductionCm ?? 7.6}cm
                        </span>
                        <span className="text-amber-400 font-medium">Labor: ₹{frame.pieceRateCost ?? 125}</span>
                        <span className="text-amber-300 font-medium">BOQ Mat: ₹{frame.materialCost ?? 0}</span>
                        <span className="text-emerald-400 font-medium">
                          {(frame.quotationExtraRate ?? 0) > 0
                            ? `Quote Extra: +₹${frame.quotationExtraRate}`
                            : 'Quote: Included'}
                        </span>
                        <span className="text-teal-300 font-mono">
                          {(frame.woodThicknessCm ?? 2) > 0 && (frame.woodWidthCm ?? 7) > 0
                            ? `BOQ Wood: ${frame.woodThicknessCm ?? 2}×${frame.woodWidthCm ?? 7}cm (-${frame.woodLengthDeductionCm ?? 35}cm)`
                            : 'BOQ Wood: None'}
                        </span>
                      </div>
                      {frame.description && (
                        <p className="text-[10px] text-slate-500">{frame.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectFrame && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectFrame(frame.name);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Apply this frame to sticker"
                        >
                          <Check className="w-3 h-3" />
                          <span>Select</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditClick(frame)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition cursor-pointer flex items-center gap-1 border border-slate-700"
                        title="Edit Frame"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(frame.id, frame.name)}
                        className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[11px] transition cursor-pointer border border-red-500/20"
                        title="Delete Frame"
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
