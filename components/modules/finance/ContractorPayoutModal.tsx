'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import { X, Receipt, CheckCircle2, AlertCircle, ArrowUpRight, DollarSign } from 'lucide-react';
import { Contractor, PaymentDisbursementMode, ContractorPayoutVoucher } from '@/lib/services/contractorService';

interface ContractorPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor | null;
  onSaved: (voucher: ContractorPayoutVoucher) => void;
}

export function ContractorPayoutModal({ isOpen, onClose, contractor, onSaved }: ContractorPayoutModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentDisbursementMode>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !contractor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid payout amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/contractors/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: contractor.id,
          amount: amt,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          recordedBy: 'Plant Accounts Desk',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record payout');
      }

      onSaved(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording contractor payout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Record Contractor Labor Disbursement
              </h2>
              <p className="text-xs text-slate-500">Official Labor Payout Voucher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contractor Profile Summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white">{contractor.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {contractor.trade}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Phone:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{contractor.phone}</span>
          </div>
          {contractor.upiId && (
            <div className="flex justify-between text-slate-500">
              <span>UPI ID:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{contractor.upiId}</span>
            </div>
          )}
          {contractor.bankAccount && (
            <div className="flex justify-between text-slate-500">
              <span>Bank A/c:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{contractor.bankAccount} ({contractor.ifscCode})</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
            <span className="text-slate-600 dark:text-slate-400">Current Balance Due:</span>
            <span className="text-red-500 font-mono text-sm">₹{contractor.balancePayable.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={contractor.balancePayable.toString()}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            {contractor.balancePayable > 0 && (
              <button
                type="button"
                onClick={() => setAmount(contractor.balancePayable.toString())}
                className="mt-1 text-[11px] text-emerald-600 hover:underline cursor-pointer"
              >
                Pay full balance: ₹{contractor.balancePayable.toLocaleString('en-IN')}
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Disbursement Mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['UPI', 'BANK_NEFT', 'CASH', 'CHEQUE'] as PaymentDisbursementMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMode === mode
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Ref / UTR / Cheque Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI 431092881024 or NEFT-SBIN260192"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Disbursement Notes / Period
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekly settlement for 14 FRP doors molded (Job Card JC-2026-081)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Payout Voucher</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
