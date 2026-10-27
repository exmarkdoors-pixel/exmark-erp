'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Customer } from '@/lib/services/customerService';
import { Quotation } from '@/lib/services/quotationService';

interface LineItemDraft {
  doorCategory: 'FRP_DOORS' | 'WPC_DOORS';
  doorModel: string;
  heightMm: number;
  widthMm: number;
  thicknessMm: number;
  quantity: number;
  unitPrice: number;
}

interface QuotationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (quotation: Quotation) => void;
}

const DEFAULT_FRP_MODELS = [
  '32mm Molded Teak FRP Door',
  '30mm Waterproof Solid Bathroom FRP Door',
  '35mm Heavy Duty Rosewood FRP Door',
  '32mm CNC Routed Frost White FRP Door',
  '32mm Antibacterial Hospital FRP Door',
];

export function QuotationBuilder({ isOpen, onClose, onSaved }: QuotationBuilderProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<LineItemDraft[]>([
    {
      doorCategory: 'FRP_DOORS',
      doorModel: '32mm Molded Teak FRP Door',
      heightMm: 2100,
      widthMm: 900,
      thicknessMm: 32,
      quantity: 10,
      unitPrice: 8500,
    },
  ]);

  useEffect(() => {
    let active = true;
    fetch('/api/customers')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCustomers(json.data);
          setSelectedCustomerId(json.data[0].id);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        doorCategory: 'FRP_DOORS',
        doorModel: '30mm Waterproof Solid Bathroom FRP Door',
        heightMm: 2100,
        widthMm: 750,
        thicknessMm: 30,
        quantity: 5,
        unitPrice: 6200,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemDraft, value: string | number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountVal = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const gstAmount = Math.round((taxableAmount * 18) / 100);
  const grandTotal = taxableAmount + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      setError('At least one door line item is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          discount: discountVal,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            doorCategory: i.doorCategory,
            doorModel: i.doorModel,
            heightMm: i.heightMm,
            widthMm: i.widthMm,
            thicknessMm: i.thicknessMm,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            gstRate: 18,
            totalPrice: i.quantity * i.unitPrice,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create quotation');
      }

      onSaved(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                FRP Door Quotation & Costing Builder
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                HSN 3925.20.00 • 18% GST (CGST 9% + SGST 9%) • Ex-factory Kerala
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Select Customer / Dealer / Builder *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.firmName ? `${c.firmName} - ` : ''}{c.district})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Quotation Notes / Terms
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 50% advance with order, balance before factory dispatch"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line items table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Door Opening Specifications & Pricing</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100"
              >
                <Plus className="w-3 h-3" /> Add Door Item
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Door Model</th>
                    <th className="p-2.5 text-center">H (mm)</th>
                    <th className="p-2.5 text-center">W (mm)</th>
                    <th className="p-2.5 text-center">Sq.Ft</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate (₹)</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => {
                    const sqFt = ((item.heightMm / 304.8) * (item.widthMm / 304.8)).toFixed(2);
                    const lineTotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="p-2.5">
                          <select
                            value={item.doorModel}
                            onChange={(e) => handleItemChange(idx, 'doorModel', e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                          >
                            {DEFAULT_FRP_MODELS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={item.heightMm}
                            onChange={(e) => handleItemChange(idx, 'heightMm', parseInt(e.target.value, 10) || 0)}
                            className="w-16 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={item.widthMm}
                            onChange={(e) => handleItemChange(idx, 'widthMm', parseInt(e.target.value, 10) || 0)}
                            className="w-16 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">
                          {sqFt}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-14 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 px-1.5 py-1 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-20"
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

          {/* Pricing summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-full sm:w-1/2 space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Special Commercial Discount (₹)
              </label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-36 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div className="w-full sm:w-1/2 space-y-1.5 text-xs text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Subtotal:</span>
                <span className="font-mono font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{discountVal.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">18% GST (CGST 9% + SGST 9%):</span>
                <span className="font-mono font-medium">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                <span>Grand Total (INR):</span>
                <span className="font-mono text-red-600 dark:text-red-400">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Creating Quote...' : 'Save & Issue Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
