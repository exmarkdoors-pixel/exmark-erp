'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingBag,
  AlertTriangle,
  Moon,
  Printer,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { PurchaseLineItem, PurchaseOrderRecord } from '@/app/api/purchases/route';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (po: PurchaseOrderRecord) => void;
  initialItems?: PurchaseLineItem[];
  initialSourceType?: 'MANUAL' | 'LOW_STOCK' | 'FLOOR_CONSUMABLES';
  initialNotes?: string;
}

export function PurchaseOrderModal({
  isOpen,
  onClose,
  onCreated,
  initialItems,
  initialSourceType = 'MANUAL',
  initialNotes = '',
}: PurchaseOrderModalProps) {
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState(
    () => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [paymentTerms, setPaymentTerms] = useState('Credit / Net 15 Days');
  const [notes, setNotes] = useState(initialNotes);
  const [sourceType, setSourceType] = useState<'MANUAL' | 'LOW_STOCK' | 'FLOOR_CONSUMABLES'>(
    initialSourceType
  );
  const [items, setItems] = useState<PurchaseLineItem[]>([
    {
      itemName: '',
      category: 'Chemical',
      quantity: 1,
      unit: 'Kg',
      unitPrice: 0,
      total: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
        setSourceType(initialSourceType);
      }
      if (initialNotes) setNotes(initialNotes);
      setErrorMsg(null);
      setStatusMsg(null);
    }
  }, [isOpen, initialItems, initialSourceType, initialNotes]);

  if (!isOpen) return null;

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const updateRow = (idx: number, patch: Partial<PurchaseLineItem>) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        next.total = Number(((Number(next.quantity) || 0) * (Number(next.unitPrice) || 0)).toFixed(2));
        return next;
      })
    );
  };

  const handleImportLowStock = async () => {
    try {
      const res = await fetch('/api/inventory');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return;
      const lowItems = (
        json.data as Array<{
          id: string;
          name: string;
          category?: string;
          currentStock: number;
          reorderLevel: number;
          unit?: string;
          unitCost?: number;
          status?: string;
        }>
      ).filter(
        (it) =>
          it.currentStock <= it.reorderLevel ||
          String(it.status || '').toLowerCase().includes('low') ||
          String(it.status || '').toLowerCase().includes('critical')
      );
      if (lowItems.length === 0) {
        setStatusMsg('All inventory items are currently above reorder threshold.');
        return;
      }
      const mapped: PurchaseLineItem[] = lowItems.map((it) => {
        const qty = Math.max(5, Math.ceil((it.reorderLevel || 20) * 2 - (it.currentStock || 0)));
        const price = Number(it.unitCost) || 0;
        return {
          inventoryId: it.id,
          itemName: it.name,
          category: it.category || 'Raw Material',
          quantity: qty,
          unit: it.unit || 'Units',
          unitPrice: price,
          total: Number((qty * price).toFixed(2)),
        };
      });
      setItems(mapped);
      setSourceType('LOW_STOCK');
      setStatusMsg(`Imported ${mapped.length} low-stock item(s) from Inventory.`);
    } catch {
      setErrorMsg('Failed to read inventory low-stock items.');
    }
  };

  const handleImportFloorConsumables = async () => {
    try {
      const res = await fetch('/api/boq/extra-items?orderKey=FLOOR-CONSUMABLES');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return;
      const pending = (
        json.data as Array<{
          id: string;
          itemName: string;
          category?: string;
          quantity: number;
          unit?: string;
          unitRate?: number;
          poNumber?: string | null;
        }>
      ).filter((it) => !it.poNumber);

      if (pending.length === 0) {
        setStatusMsg('No un-ordered Floor / Evening Consumables found.');
        return;
      }
      const mapped: PurchaseLineItem[] = pending.map((it) => {
        const qty = Math.max(1, Number(it.quantity) || 1);
        const rate = Number(it.unitRate) || 0;
        return {
          extraItemId: it.id,
          itemName: it.itemName,
          category: it.category || 'Consumable',
          quantity: qty,
          unit: it.unit || 'Nos',
          unitPrice: rate,
          total: Number((qty * rate).toFixed(2)),
        };
      });
      setItems(mapped);
      setSourceType('FLOOR_CONSUMABLES');
      setStatusMsg(`Imported ${mapped.length} pending Floor / Evening Consumable item(s).`);
    } catch {
      setErrorMsg('Failed to read pending floor consumables.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setErrorMsg('Vendor / Supplier Name is required.');
      return;
    }
    const validItems = items.filter((it) => it.itemName.trim().length > 0 && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setErrorMsg('Add at least one item row with quantity > 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: supplierName.trim(),
          supplierPhone: supplierPhone.trim(),
          orderDate,
          expectedDate,
          paymentTerms,
          sourceType,
          notes: notes.trim(),
          items: validItems,
          linkedExtraItemIds: validItems.map((i) => i.extraItemId).filter(Boolean),
          subtotal,
          status: 'APPROVED',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to create Purchase Order.');
        return;
      }
      onCreated(json.data);
      onClose();
    } catch {
      setErrorMsg('Failed to connect to Purchases API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0B132B] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Create Factory Purchase Order (PO)</h2>
              <p className="text-[11px] text-slate-400">
                Raw materials, resin/glass consumables, hardware &amp; evening floor purchases (Non-GST Net Total)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick-Import Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span className="font-bold text-slate-400 mr-1">Quick Pull Items:</span>
          <button
            type="button"
            onClick={handleImportLowStock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Import Low-Stock Inventory</span>
          </button>
          <button
            type="button"
            onClick={handleImportFloorConsumables}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Import Floor / Evening Consumables</span>
          </button>
        </div>

        {statusMsg && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-2.5 bg-red-500/15 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Supplier / Vendor Name *</label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Cochin Chemicals / Metro Hardware"
                className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Supplier Phone</label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
              >
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="UPI / Instant">UPI / Instant</option>
                <option value="Credit / Net 15 Days">Credit / Net 15 Days</option>
                <option value="Credit / Net 30 Days">Credit / Net 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Order Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Purchase Notes / Shift</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Evening shift consumables / resin batch"
                className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Order Line Items ({items.length})</span>
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { itemName: '', category: 'Consumable', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 },
                  ])
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Material / Consumable Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 w-20 text-center">Qty</th>
                    <th className="p-2.5 w-24">Unit</th>
                    <th className="p-2.5 w-28 text-right">Rate (₹)</th>
                    <th className="p-2.5 w-28 text-right">Amount (₹)</th>
                    <th className="p-2.5 w-10 text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.itemName}
                          onChange={(e) => updateRow(idx, { itemName: e.target.value })}
                          placeholder="e.g. MEKP Catalyst / Sandpaper #120"
                          className="w-full px-2 py-1 bg-[#070D1E] border border-slate-700 rounded text-white"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.category || 'Consumable'}
                          onChange={(e) => updateRow(idx, { category: e.target.value })}
                          className="w-full px-2 py-1 bg-[#070D1E] border border-slate-700 rounded text-white"
                        >
                          <option value="Chemical">Chemical</option>
                          <option value="Consumable">Consumable</option>
                          <option value="Timber / Wood">Timber / Wood</option>
                          <option value="Hardware">Hardware</option>
                          <option value="Packing">Packing</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0.1}
                          step="any"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-center bg-[#070D1E] border border-slate-700 rounded font-mono text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => updateRow(idx, { unit: e.target.value })}
                          className="w-full px-2 py-1 bg-[#070D1E] border border-slate-700 rounded text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.unitPrice}
                          onChange={(e) => updateRow(idx, { unitPrice: Number(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-right bg-[#070D1E] border border-slate-700 rounded font-mono text-white"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-400">
                        ₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-400 hover:bg-rose-500/15 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Net PO Total (No GST Added):{' '}
              <span className="text-lg font-black font-mono text-white ml-1">
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer shadow disabled:opacity-50"
              >
                {isSubmitting ? 'Creating PO...' : '✓ Save Purchase Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PurchaseOrderPrintModal({
  po,
  onClose,
}: {
  po: PurchaseOrderRecord | null;
  onClose: () => void;
}) {
  if (!po) return null;
  const rows = Array.isArray(po.items) ? po.items : [];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 printable-modal-root">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 space-y-5 print:shadow-none print:rounded-none print:p-0">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200 print:hidden">
          <span className="font-bold text-sm text-slate-900">Purchase Order Print Preview ({po.poNumber})</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print PO</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">EXMARK DOORS FACTORY UNIT</h1>
              <p className="text-xs text-slate-600">Purchase Order / Material Requisition</p>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-black text-base">{po.poNumber}</div>
              <div>Date: {po.orderDate}</div>
              <div>Expected: {po.expectedDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Supplier / Vendor</span>
              <strong className="text-sm">{po.supplierName}</strong>
              {po.supplierPhone && <div className="text-slate-600">Phone: {po.supplierPhone}</div>}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment &amp; Status</span>
              <strong>{po.paymentTerms}</strong>
              <div className="text-slate-600">Status: {po.status}</div>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="p-2 border border-slate-300">#</th>
                <th className="p-2 border border-slate-300">Material Description</th>
                <th className="p-2 border border-slate-300">Category</th>
                <th className="p-2 border border-slate-300 text-right">Qty</th>
                <th className="p-2 border border-slate-300 text-right">Rate (₹)</th>
                <th className="p-2 border border-slate-300 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-slate-300">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-semibold">{it.itemName}</td>
                    <td className="p-2 border border-slate-300">{it.category || '-'}</td>
                    <td className="p-2 border border-slate-300 text-right">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono">
                      ₹{Number(it.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                      ₹{Number(it.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-2 border border-slate-300">1</td>
                  <td className="p-2 border border-slate-300 font-semibold" colSpan={4}>
                    {po.itemsSummary}
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                    ₹{Number(po.totalAmount || 0).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-end pt-2 text-xs">
            <div className="text-slate-600 max-w-md">
              {po.notes && (
                <div>
                  <strong>Notes:</strong> {po.notes}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Grand Total (Non-GST)</div>
              <div className="text-xl font-black font-mono">
                ₹{Number(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
