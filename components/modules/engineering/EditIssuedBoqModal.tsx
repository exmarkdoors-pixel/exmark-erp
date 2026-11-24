'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  Package,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  BoqIssueVoucherRecord,
  BoqIssueVoucherItem,
  BoqIssueShift,
} from '@/lib/services/boqIssueService';
import { apiFetch } from '@/lib/api/apiClient';

interface EditIssuedBoqModalProps {
  voucher: BoqIssueVoucherRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onVoucherUpdated: (updatedVoucher: BoqIssueVoucherRecord) => void;
}

interface EditableItemRow {
  key: string;
  name: string;
  unit: string;
  category: string;
  formulaQty: number;
  originalQty: number;
  newQty: number;
  rate: number;
}

export function EditIssuedBoqModal({
  voucher,
  isOpen,
  onClose,
  onVoucherUpdated,
}: EditIssuedBoqModalProps) {
  if (!isOpen || !voucher) return null;

  const [items, setItems] = useState<EditableItemRow[]>(() => {
    return (voucher.items || []).map((it) => ({
      key: it.key,
      name: it.name,
      unit: it.unit,
      category: it.category,
      formulaQty: Number(it.formulaQty || 0),
      originalQty: Number(it.issuedQty || it.formulaQty || 0),
      newQty: Number(it.issuedQty || it.formulaQty || 0),
      rate: Number(it.rate || 0),
    }));
  });

  const [gangName, setGangName] = useState<string>(voucher.gangName || '');
  const [shift, setShift] = useState<BoqIssueShift>(voucher.shift || 'MORNING');
  const [issueDate, setIssueDate] = useState<string>(
    voucher.issueDate || new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>(voucher.notes || '');

  const getTodayDateString = () => new Date().toISOString().slice(0, 10);
  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const [editReason, setEditReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extra item input state
  const [extraItemName, setExtraItemName] = useState<string>('');
  const [extraItemQty, setExtraItemQty] = useState<number>(1);
  const [extraItemUnit, setExtraItemUnit] = useState<string>('Kg');
  const [extraItemRate, setExtraItemRate] = useState<number>(100);
  const [showAddExtra, setShowAddExtra] = useState<boolean>(false);

  // Compute live deltas & summary
  const totals = useMemo(() => {
    let originalTotal = 0;
    let newTotal = 0;
    let deltaCount = 0;

    items.forEach((item) => {
      const origVal = Math.round(item.originalQty * item.rate);
      const newVal = Math.round(item.newQty * item.rate);
      originalTotal += origVal;
      newTotal += newVal;
      if (Math.abs(item.newQty - item.originalQty) > 0.001) {
        deltaCount++;
      }
    });

    return {
      originalTotal,
      newTotal,
      diff: newTotal - originalTotal,
      deltaCount,
    };
  }, [items]);

  const handleQtyChange = (key: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, newQty: Math.max(0, val) } : it))
    );
  };

  const handleAddExtraItem = () => {
    const name = extraItemName.trim();
    if (!name) return;
    const key = `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setItems((prev) => [
      ...prev,
      {
        key,
        name,
        unit: extraItemUnit,
        category: 'Extra Hardware / Chemical',
        formulaQty: 0,
        originalQty: 0,
        newQty: Math.max(0, extraItemQty),
        rate: Math.max(0, extraItemRate),
      },
    ]);
    setExtraItemName('');
    setExtraItemQty(1);
    setShowAddExtra(false);
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const handleApplyPresetReason = (reasonText: string) => {
    setEditReason(reasonText);
  };

  const handleSave = async () => {
    if (!editReason.trim() || editReason.trim().length < 3) {
      setErrorMessage('Please enter a valid reason for editing this issued BOQ voucher.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payloadItems: BoqIssueVoucherItem[] = items.map((it) => ({
        key: it.key,
        name: it.name,
        unit: it.unit,
        formulaQty: it.formulaQty,
        issuedQty: it.newQty,
        rate: it.rate,
        value: Math.round(it.newQty * it.rate),
        category: it.category,
      }));

      const res = await apiFetch('/api/boq/issue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: voucher.id,
          items: payloadItems,
          issueDate,
          gangName: gangName.trim(),
          shift,
          notes: notes.trim(),
          editReason: editReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.updatedVoucher) {
        throw new Error(json.error || 'Failed to update BOQ issue voucher.');
      }

      onVoucherUpdated(json.data.updatedVoucher);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating voucher.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm print:hidden">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white text-black rounded-xl shadow-2xl border-2 border-black flex flex-col font-sans">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-black text-white border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Edit Issued BOQ Voucher ({voucher.voucherNumber})
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Job Card: <span className="font-bold text-white">{voucher.jobCardNumber}</span> | Party:{' '}
                <span className="font-bold text-white">{voucher.customerName}</span> | Doors:{' '}
                <span className="font-bold text-white">{voucher.doorsCount}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 bg-white text-black">
          {/* Metadata Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-500 font-bold block text-[10px] uppercase">Issue Date</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIssueDate(getTodayDateString())}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      issueDate === getTodayDateString() ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssueDate(getYesterdayDateString())}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      issueDate === getYesterdayDateString() ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={issueDate}
                max={getTodayDateString()}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded bg-white text-black font-bold text-xs focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="text-slate-500 font-bold block text-[10px] uppercase">Molding Gang / Team</label>
              <input
                type="text"
                value={gangName}
                onChange={(e) => setGangName(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded bg-white text-black font-bold text-xs focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="text-slate-500 font-bold block text-[10px] uppercase">Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as BoqIssueShift)}
                className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded bg-white text-black font-bold text-xs focus:border-black outline-none"
              >
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
              </select>
            </div>
          </div>

          {/* Info Notice */}
          <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Automatic Inventory Re-sync:</p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Increasing material quantity will deduct additional inventory, while reducing quantity will automatically credit the difference back to store stock.
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-700" />
                Raw Materials Issued ({items.length} items)
              </span>
              <button
                type="button"
                onClick={() => setShowAddExtra(!showAddExtra)}
                className="px-2 py-0.5 text-xs font-bold bg-white hover:bg-slate-50 text-black border border-slate-300 rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Extra Item</span>
              </button>
            </div>

            {/* Extra Item Input Dropdown */}
            {showAddExtra && (
              <div className="p-3 bg-slate-50 border-b border-slate-300 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600">Material Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Extra Catalyst 100g, Baby Latch"
                    value={extraItemName}
                    onChange={(e) => setExtraItemName(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-black font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600">Qty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={extraItemQty}
                    onChange={(e) => setExtraItemQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-black font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600">Unit</label>
                  <select
                    value={extraItemUnit}
                    onChange={(e) => setExtraItemUnit(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-black font-semibold text-xs"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Grams">Grams</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Cu.Ft">Cu.Ft</option>
                    <option value="Nos">Nos</option>
                    <option value="Ltr">Ltr</option>
                  </select>
                </div>
                <div className="flex items-end gap-1">
                  <button
                    type="button"
                    onClick={handleAddExtraItem}
                    className="w-full py-1 bg-black text-white hover:bg-slate-800 rounded font-bold text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                    <th className="py-2 px-3">Item / Material</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2 text-right">Formula Qty</th>
                    <th className="py-2 px-2 text-right">Originally Issued</th>
                    <th className="py-2 px-3 text-right">New Issued Qty</th>
                    <th className="py-2 px-3 text-center">Stock Delta</th>
                    <th className="py-2 px-2 text-right">Rate (₹)</th>
                    <th className="py-2 px-3 text-right">New Value (₹)</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it) => {
                    const diff = Number((it.newQty - it.originalQty).toFixed(3));
                    const isChanged = Math.abs(diff) >= 0.001;
                    const newVal = Math.round(it.newQty * it.rate);

                    return (
                      <tr key={it.key} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-bold text-black">
                          {it.name}
                          <span className="block text-[10px] text-slate-500 font-normal">{it.category}</span>
                        </td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-700">{it.unit}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {it.formulaQty > 0 ? it.formulaQty.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-700">
                          {it.originalQty.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={it.newQty}
                            onChange={(e) => handleQtyChange(it.key, e.target.value)}
                            className="w-24 px-2 py-1 text-right font-mono font-bold text-xs border-2 border-black rounded bg-white text-black focus:bg-amber-50 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[11px]">
                          {isChanged ? (
                            diff > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-300">
                                +{diff} {it.unit} (Deduct)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                                {diff} {it.unit} (Restore)
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">No Change</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">₹{it.rate}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-black">
                          ₹{newVal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.key)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            title="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reason for Edit Section */}
          <div className="space-y-1.5 p-3 bg-amber-50 border border-amber-300 rounded-lg">
            <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Reason for Modification (Required):
            </label>
            <textarea
              rows={2}
              placeholder="Enter official reason for adjusting material quantities..."
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-amber-400 rounded bg-white text-black font-medium text-xs focus:border-black outline-none"
            />
            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-600 font-bold self-center">Quick Presets:</span>
              {[
                'Cold weather extra resin',
                'Molding defect rectification',
                'Excess material returned',
                'Job card size alteration',
                'Floor supervisor correction',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyPresetReason(preset)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-[10px] font-bold text-slate-800 border border-amber-300 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Supervisor Notes */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Additional Remarks / Notes (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Approved by Plant Manager for Order urgent delivery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-black text-xs focus:border-black outline-none font-medium"
            />
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="sticky bottom-0 z-20 px-5 py-3.5 bg-slate-100 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Previous Total</span>
              <span className="font-bold text-slate-700">₹{totals.originalTotal.toLocaleString('en-IN')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 self-center" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">New Total</span>
              <span className="font-black text-black">₹{totals.newTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="pl-2 border-l border-slate-300">
              <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Net Difference</span>
              <span
                className={`font-black ${
                  totals.diff > 0 ? 'text-blue-700' : totals.diff < 0 ? 'text-emerald-700' : 'text-slate-600'
                }`}
              >
                {totals.diff > 0 ? '+' : ''}₹{totals.diff.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-400 bg-white hover:bg-slate-50 text-black text-xs font-bold cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-black hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition"
            >
              <Save className={`w-4 h-4 text-amber-400 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Saving & Syncing...' : 'Save & Sync Inventory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
