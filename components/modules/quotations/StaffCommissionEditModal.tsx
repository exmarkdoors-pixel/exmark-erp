'use client';

import React, { useState, useEffect } from 'react';
import {
  Percent,
  Coins,
  CheckCircle2,
  X,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface StaffCommissionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: any | null;
  onUpdated?: (updatedQuote: any) => void;
}

export function StaffCommissionEditModal({
  isOpen,
  onClose,
  quotation,
  onUpdated,
}: StaffCommissionEditModalProps) {
  if (!isOpen || !quotation) return null;

  const quoteId = quotation.id || quotation.quoteNumber || '';
  const customerName = quotation.customerName || 'Customer';
  const totalAmount = Number(quotation.totalAmount || quotation.grandTotal || 0);
  const doorsCount = Array.isArray(quotation.itemRows)
    ? quotation.itemRows.reduce((sum: number, r: any) => sum + (Number(r.qty) || 1), 0)
    : (Array.isArray(quotation.items) ? quotation.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0) : 1);

  const initialType: 'PERCENTAGE' | 'PER_PIECE' = quotation.commissionType === 'PER_PIECE' ? 'PER_PIECE' : 'PERCENTAGE';
  const initialRate = Number(
    quotation.commissionRate !== undefined
      ? quotation.commissionRate
      : (quotation.commissionPercent ?? (initialType === 'PER_PIECE' ? 150 : 2.5))
  );

  const [commissionType, setCommissionType] = useState<'PERCENTAGE' | 'PER_PIECE'>(initialType);
  const [commissionRate, setCommissionRate] = useState<number>(initialRate);
  const [overrideNotes, setOverrideNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCommissionType(quotation.commissionType === 'PER_PIECE' ? 'PER_PIECE' : 'PERCENTAGE');
    const rate = Number(
      quotation.commissionRate !== undefined
        ? quotation.commissionRate
        : (quotation.commissionPercent ?? (quotation.commissionType === 'PER_PIECE' ? 150 : 2.5))
    );
    setCommissionRate(rate);
    setOverrideNotes('');
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [quotation]);

  // Live calculation
  const calculatedCommission = commissionType === 'PER_PIECE'
    ? Math.round(doorsCount * commissionRate)
    : Math.round((totalAmount * commissionRate) / 100);

  const effectivePercentage = totalAmount > 0
    ? Number(((calculatedCommission / totalAmount) * 100).toFixed(2))
    : 0;

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sales/commissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.id,
          commissionType,
          commissionRate,
          notes: overrideNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update commission');
      }

      setSuccessMsg('Commission override saved successfully!');
      if (onUpdated && json.data?.updatedQuotation) {
        onUpdated(json.data.updatedQuotation);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating commission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/60 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Edit Staff Sales Commission</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {quoteId}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between Percentage (%) and Per Door (₹/piece) payout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Order Summary Strip */}
          <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Sales Representative</span>
              <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">{quotation.salespersonName || 'Direct / House'}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Doors</span>
              <span className="font-mono font-bold text-cyan-400 text-sm mt-0.5 block">
                {doorsCount} Units
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Order Net Total</span>
              <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Commission Model Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select Commission Calculation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCommissionType('PERCENTAGE');
                  if (commissionRate > 20) setCommissionRate(2.5);
                }}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  commissionType === 'PERCENTAGE'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-950/30'
                    : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Percent className="w-4 h-4 text-rose-400" />
                  <span>Percentage (%)</span>
                </div>
                <span className="text-[11px] text-slate-400 text-center">
                  Share of net quoted order revenue
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCommissionType('PER_PIECE');
                  if (commissionRate < 10) setCommissionRate(150);
                }}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  commissionType === 'PER_PIECE'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-900/30'
                    : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Per Piece (₹/Door)</span>
                </div>
                <span className="text-[11px] text-slate-400 text-center">
                  Fixed piece-rate payout per manufactured door
                </span>
              </button>
            </div>
          </div>

          {/* Rate Input & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                {commissionType === 'PERCENTAGE' ? 'Commission Percentage Rate (%)' : 'Per Door Commission Amount (₹/door)'}
              </label>
              <span className="text-[11px] text-slate-400">
                {commissionType === 'PERCENTAGE' ? 'Standard: 2.5% - 5.0%' : 'Standard: ₹100 - ₹300'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step={commissionType === 'PERCENTAGE' ? '0.1' : '10'}
                  min="0"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 font-mono text-base font-bold text-white focus:outline-none focus:border-amber-500 transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  {commissionType === 'PERCENTAGE' ? '%' : '₹ / Door'}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 shrink-0">
                {commissionType === 'PERCENTAGE' ? (
                  <>
                    {[2.0, 2.5, 3.0, 5.0].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCommissionRate(pct)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                          commissionRate === pct
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[100, 150, 200, 250].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setCommissionRate(rate)}
                        className={`px-2 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                          commissionRate === rate
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ₹{rate}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Live Payout Result Display */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-300 uppercase font-semibold block">Calculated Staff Commission</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  ₹{calculatedCommission.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({effectivePercentage}% effective of order)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {commissionType === 'PER_PIECE'
                  ? `${doorsCount} doors × ₹${commissionRate}/door`
                  : `${commissionRate}% of ₹${totalAmount.toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          {/* Override Notes */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Management Approval Remark / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Special project rate agreed by Management..."
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg shadow-lg shadow-amber-900/30 transition cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Commission Rate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
