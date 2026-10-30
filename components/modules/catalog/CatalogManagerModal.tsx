'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Palette,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react';
import { CatalogMaster, DoorModelCatalogItem, ColourCatalogItem, LockCatalogItem } from '@/types/catalog';
import { parseCsvRows, getSampleCsvTemplate } from '@/lib/utils/bulkUploadParser';

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogMaster;
  onCatalogUpdated: (updated: CatalogMaster) => void;
}

export function CatalogManagerModal({
  isOpen,
  onClose,
  catalog,
  onCatalogUpdated,
}: CatalogManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'MODELS' | 'COLOURS' | 'LOCKS' | 'BULK'>('MODELS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form Edit State for Models
  const [editingModel, setEditingModel] = useState<Partial<DoorModelCatalogItem> | null>(null);
  // Form Edit State for Colours
  const [editingColour, setEditingColour] = useState<Partial<ColourCatalogItem> | null>(null);
  // Form Edit State for Locks
  const [editingLock, setEditingLock] = useState<Partial<LockCatalogItem> | null>(null);

  // Bulk Upload State
  const [bulkCategory, setBulkCategory] = useState<'MODELS' | 'COLOURS' | 'LOCKS'>('MODELS');
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<Array<Record<string, string>>>([]);

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── SAVE MODEL ──
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel?.name) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MODEL', item: editingModel }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save model');

      const updatedModels = [...catalog.models];
      const idx = updatedModels.findIndex((m) => m.id === data.data.id || m.code === data.data.code);
      if (idx >= 0) updatedModels[idx] = data.data;
      else updatedModels.push(data.data);

      onCatalogUpdated({ ...catalog, models: updatedModels });
      setEditingModel(null);
      showToast(`Model ${data.data.name} saved successfully.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error saving model', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── DELETE MODEL ──
  const handleDeleteModel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this door model?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/catalog?type=MODEL&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete model');

      const updatedModels = catalog.models.filter((m) => m.id !== id && m.code !== id);
      onCatalogUpdated({ ...catalog, models: updatedModels });
      showToast('Model deleted successfully.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error deleting model', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── SAVE COLOUR ──
  const handleSaveColour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColour?.name) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'COLOUR', item: editingColour }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save colour');

      const updatedColours = [...catalog.colours];
      const idx = updatedColours.findIndex((c) => c.id === data.data.id || c.code === data.data.code);
      if (idx >= 0) updatedColours[idx] = data.data;
      else updatedColours.push(data.data);

      onCatalogUpdated({ ...catalog, colours: updatedColours });
      setEditingColour(null);
      showToast(`Colour ${data.data.name} saved successfully.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error saving colour', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── DELETE COLOUR ──
  const handleDeleteColour = async (id: string) => {
    if (!confirm('Are you sure you want to delete this colour finish?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/catalog?type=COLOUR&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete colour');

      const updatedColours = catalog.colours.filter((c) => c.id !== id && c.code !== id);
      onCatalogUpdated({ ...catalog, colours: updatedColours });
      showToast('Colour deleted successfully.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error deleting colour', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── SAVE LOCK ──
  const handleSaveLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLock?.name) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'LOCK', item: editingLock }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save lock');

      const updatedLocks = [...catalog.locks];
      const idx = updatedLocks.findIndex((l) => l.id === data.data.id || l.name === data.data.name);
      if (idx >= 0) updatedLocks[idx] = data.data;
      else updatedLocks.push(data.data);

      onCatalogUpdated({ ...catalog, locks: updatedLocks });
      setEditingLock(null);
      showToast(`Lock ${data.data.name} saved successfully.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error saving lock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── DELETE LOCK ──
  const handleDeleteLock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lock option?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/catalog?type=LOCK&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete lock');

      const updatedLocks = catalog.locks.filter((l) => l.id !== id);
      onCatalogUpdated({ ...catalog, locks: updatedLocks });
      showToast('Lock deleted successfully.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error deleting lock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── PARSE BULK CSV ──
  const handleParseCsv = (text: string) => {
    setBulkText(text);
    const parsed = parseCsvRows(text);
    setBulkPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = getSampleCsvTemplate(bulkCategory);
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${bulkCategory.toLowerCase()}-template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── EXECUTE BULK IMPORT ──
  const handleExecuteBulkUpload = async () => {
    if (bulkPreview.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/catalog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryType: bulkCategory, items: bulkPreview }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Bulk upload failed');

      // Refresh catalog from server
      const catRes = await fetch('/api/catalog');
      const catData = await catRes.json();
      if (catData.success) {
        onCatalogUpdated(catData.data);
      }

      showToast(`Bulk upload completed: ${data.data.inserted} added, ${data.data.updated} updated.`);
      setBulkText('');
      setBulkPreview([]);
      setActiveTab(bulkCategory);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk upload error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#070D1E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* HEADER */}
        <div className="p-4 bg-[#0B132B] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Catalog Master & Bulk Update</h2>
              <p className="text-xs text-slate-400">
                Manage Door Models, Colours, Lock Hardware & Bulk CSV Updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div
            className={`px-4 py-2 border-b text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* TABS */}
        <div className="flex items-center gap-2 px-4 pt-3 bg-[#0B132B] border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('MODELS')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MODELS'
                ? 'text-amber-400 border-amber-500 bg-slate-900/60'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Door Models ({catalog.models.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('COLOURS')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COLOURS'
                ? 'text-amber-400 border-amber-500 bg-slate-900/60'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Colours & Finishes ({catalog.colours.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LOCKS')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOCKS'
                ? 'text-amber-400 border-amber-500 bg-slate-900/60'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Locks & Hardware ({catalog.locks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BULK')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ml-auto ${
              activeTab === 'BULK'
                ? 'text-emerald-400 border-emerald-500 bg-emerald-950/20'
                : 'text-emerald-400/70 border-transparent hover:text-emerald-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Upload & Update</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* ── 1. MODELS TAB ── */}
          {activeTab === 'MODELS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Door Models & Base Price List</h3>
                  <p className="text-xs text-slate-400">
                    Set piece prices and square foot rates for FRP door models
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingModel({
                      code: `EXM-M-${Date.now().toString().slice(-4)}`,
                      name: '',
                      category: 'Bath FRP Door',
                      basePrice: 7000,
                      ratePerSqFt: 395,
                      defaultThickness: '32mm',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Door Model</span>
                </button>
              </div>

              {/* Edit / Create Form */}
              {editingModel && (
                <form
                  onSubmit={handleSaveModel}
                  className="bg-[#0B132B] p-4 rounded-xl border border-amber-500/40 space-y-3"
                >
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {editingModel.id ? 'Edit Door Model' : 'New Door Model Entry'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Model Code *</label>
                      <input
                        type="text"
                        required
                        value={editingModel.code || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, code: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="e.g. EXM-A-102"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Model Display Name *</label>
                      <input
                        type="text"
                        required
                        value={editingModel.name || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="e.g. EXM-A-102 (₹7800)"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Category</label>
                      <input
                        type="text"
                        value={editingModel.category || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, category: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="e.g. Bath FRP Door / Bed Room Door"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Per Piece Rate (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingModel.basePrice || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, basePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-emerald-400 font-bold rounded border border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Rate Per Sq.Ft (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingModel.ratePerSqFt || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, ratePerSqFt: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-cyan-400 font-bold rounded border border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Thickness</label>
                      <input
                        type="text"
                        value={editingModel.defaultThickness || '32mm'}
                        onChange={(e) => setEditingModel({ ...editingModel, defaultThickness: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="32mm / 35mm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingModel(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      Save Model
                    </button>
                  </div>
                </form>
              )}

              {/* Models Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0B132B]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070D1E] text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Code / ID</th>
                      <th className="p-3">Model Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Piece Rate</th>
                      <th className="p-3">Sq.Ft Rate</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {catalog.models.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-amber-400">{m.code}</td>
                        <td className="p-3 font-bold text-white">{m.name}</td>
                        <td className="p-3 text-slate-300">{m.category}</td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">₹{m.basePrice.toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono text-cyan-400 font-bold">₹{m.ratePerSqFt}/sqft</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingModel(m)}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModel(m.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 2. COLOURS TAB ── */}
          {activeTab === 'COLOURS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Colours, Finishes & Textures</h3>
                  <p className="text-xs text-slate-400">
                    Manage factory surface finishes and dual-tone colour selections
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingColour({
                      code: `EXGC-${Math.floor(100 + Math.random() * 899)}`,
                      name: '',
                      finishType: 'Woodgrain PU',
                      hexColor: '#B57434',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Colour</span>
                </button>
              </div>

              {/* Edit / Create Colour Form */}
              {editingColour && (
                <form
                  onSubmit={handleSaveColour}
                  className="bg-[#0B132B] p-4 rounded-xl border border-amber-500/40 space-y-3"
                >
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {editingColour.id ? 'Edit Colour Finish' : 'New Colour Entry'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Colour Code *</label>
                      <input
                        type="text"
                        required
                        value={editingColour.code || ''}
                        onChange={(e) => setEditingColour({ ...editingColour, code: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="e.g. EXGC-510"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Full Colour Name *</label>
                      <input
                        type="text"
                        required
                        value={editingColour.name || ''}
                        onChange={(e) => setEditingColour({ ...editingColour, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="e.g. Natural Teak (EXGC-510)"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Finish Type</label>
                      <select
                        value={editingColour.finishType || 'Woodgrain PU'}
                        onChange={(e) => setEditingColour({ ...editingColour, finishType: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                      >
                        <option value="Woodgrain PU">Woodgrain PU</option>
                        <option value="High Gloss UV">High Gloss UV Waterproof</option>
                        <option value="Matte UV">Matte UV</option>
                        <option value="Classical Kerala">Classical Kerala Vintage</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingColour(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      Save Colour
                    </button>
                  </div>
                </form>
              )}

              {/* Colours Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0B132B]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070D1E] text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Colour Code</th>
                      <th className="p-3">Finish Name</th>
                      <th className="p-3">Finish Type</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {catalog.colours.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-amber-400">{c.code}</td>
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block"
                            style={{ backgroundColor: c.hexColor || '#B57434' }}
                          />
                          <span>{c.name}</span>
                        </td>
                        <td className="p-3 text-slate-300">{c.finishType}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingColour(c)}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteColour(c.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 3. LOCKS TAB ── */}
          {activeTab === 'LOCKS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Locks, Latches & Hardware Surcharges</h3>
                  <p className="text-xs text-slate-400">
                    Define factory lock options and additional surcharge amounts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingLock({
                      name: '',
                      lockType: 'Baby Latch',
                      price: 200,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lock Option</span>
                </button>
              </div>

              {/* Edit / Create Lock Form */}
              {editingLock && (
                <form
                  onSubmit={handleSaveLock}
                  className="bg-[#0B132B] p-4 rounded-xl border border-amber-500/40 space-y-3"
                >
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {editingLock.id ? 'Edit Lock Hardware' : 'New Lock Entry'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Lock Name *</label>
                      <input
                        type="text"
                        required
                        value={editingLock.name || ''}
                        onChange={(e) => setEditingLock({ ...editingLock, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="e.g. Baby Latch (+₹200)"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Lock Type</label>
                      <input
                        type="text"
                        value={editingLock.lockType || 'Baby Latch'}
                        onChange={(e) => setEditingLock({ ...editingLock, lockType: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                        placeholder="Baby Latch / Mortise / Cylindrical"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Surcharge Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingLock.price || ''}
                        onChange={(e) => setEditingLock({ ...editingLock, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] text-emerald-400 font-bold rounded border border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingLock(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      Save Lock
                    </button>
                  </div>
                </form>
              )}

              {/* Locks Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0B132B]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070D1E] text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Lock Name</th>
                      <th className="p-3">Lock Mechanism Type</th>
                      <th className="p-3">Factory Surcharge</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {catalog.locks.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{l.name}</td>
                        <td className="p-3 text-slate-300">{l.lockType}</td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">+₹{l.price.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingLock(l)}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLock(l.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 4. BULK UPLOAD TAB ── */}
          {activeTab === 'BULK' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white">Bulk Upload & Update Engine</h3>
                  <p className="text-xs text-slate-400">
                    Upload CSV spreadsheets to bulk add or update door models, colours, and locks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download {bulkCategory} Template</span>
                  </button>
                </div>
              </div>

              {/* Target Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Target Catalog:</span>
                {(['MODELS', 'COLOURS', 'LOCKS'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setBulkCategory(cat);
                      setBulkPreview([]);
                      setBulkText('');
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                      bulkCategory === cat
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Upload Drop Zone / Input */}
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-4 bg-[#0B132B] text-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-xs text-slate-300 font-semibold">
                  Choose a CSV file or paste spreadsheet contents below
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
              </div>

              {/* CSV Textarea */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Or Paste CSV Data Directly:
                </label>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  placeholder="code,name,category,basePrice,ratePerSqFt..."
                  className="w-full px-3 py-2 bg-[#070D1E] text-white font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Live Preview Table */}
              {bulkPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">
                      Parsed {bulkPreview.length} items ready to upsert:
                    </span>
                    <button
                      type="button"
                      onClick={handleExecuteBulkUpload}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Confirm & Upload {bulkPreview.length} Records</span>
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-x-auto bg-[#0B132B] max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#070D1E] text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          {Object.keys(bulkPreview[0] || {}).map((col) => (
                            <th key={col} className="p-2 border-b border-slate-800">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {bulkPreview.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {Object.values(row).map((val, cIdx) => (
                              <td key={cIdx} className="p-2 text-slate-300 font-mono text-[11px]">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkPreview.length > 5 && (
                    <div className="text-[11px] text-slate-400 text-right">
                      +{bulkPreview.length - 5} more records will be processed
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-[#0B132B] border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close Catalog Master
          </button>
        </div>
      </div>
    </div>
  );
}

export default CatalogManagerModal;
