'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  ArrowRightLeft,
  Calendar,
  IndianRupee,
  FileText,
  Hash,
  CheckCircle2,
  AlertCircle,
  Printer,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  PartyType,
  PartyToPartyPaymentMode,
  PartyToPartyPaymentRecord,
} from '@/types/accounting';

interface PartyToPartyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: PartyToPartyPaymentRecord) => void;
  existingParties?: Array<{ name: string; type: PartyType }>;
}

const PARTY_TYPES: Array<{ id: PartyType; label: string }> = [
  { id: 'CUSTOMER', label: 'Customer / Dealer' },
  { id: 'SUPPLIER', label: 'Raw Material Supplier' },
  { id: 'CONTRACTOR', label: 'Contractor / Labor' },
  { id: 'OTHER', label: 'Other Third Party' },
];

const PAYMENT_MODES: Array<{ id: PartyToPartyPaymentMode; label: string }> = [
  { id: 'BOOK_ADJUSTMENT', label: 'Book Entry / Contra Adjustment' },
  { id: 'DIRECT_BANK', label: 'Direct Bank Transfer (NEFT/RTGS)' },
  { id: 'DIRECT_UPI', label: 'Direct UPI Payment' },
  { id: 'CASH', label: 'Direct Cash Handover' },
  { id: 'CHEQUE', label: 'Direct Cheque Payment' },
];

export function PartyToPartyPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  existingParties = [],
}: PartyToPartyPaymentModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromPartyName, setFromPartyName] = useState('');
  const [fromPartyType, setFromPartyType] = useState<PartyType>('CUSTOMER');
  const [toPartyName, setToPartyName] = useState('');
  const [toPartyType, setToPartyType] = useState<PartyType>('SUPPLIER');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PartyToPartyPaymentMode>('BOOK_ADJUSTMENT');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');

  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRecord, setCreatedRecord] = useState<PartyToPartyPaymentRecord | null>(null);

  // Load registered customer names for fast auto-complete
  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/customers')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          setCustomerSuggestions(json.data.map((c: { name: string }) => c.name).filter(Boolean));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fromTrim = fromPartyName.trim();
    const toTrim = toPartyName.trim();

    if (!fromTrim) {
      setError('Paying party (From Party) name is required.');
      return;
    }
    if (!toTrim) {
      setError('Receiving party (To Party) name is required.');
      return;
    }
    if (fromTrim.toLowerCase() === toTrim.toLowerCase()) {
      setError('From Party and To Party cannot be the same entity.');
      return;
    }
    if (numAmount <= 0) {
      setError('Settlement amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/accounting/party-to-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          fromPartyName: fromTrim,
          fromPartyType,
          toPartyName: toTrim,
          toPartyType,
          amount: numAmount,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          narration: narration.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record party-to-party payment');
      }

      setCreatedRecord(json.data);
      onSuccess(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const handleResetForNext = () => {
    setCreatedRecord(null);
    setAmount('');
    setReferenceNumber('');
    setNarration('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0B132B] border border-sky-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#070D1E] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Party to Party Direct Settlement Voucher
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                  Contra Journal
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct balance transfer between Customer, Supplier, or Contractor without routing through company cash/bank
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

        {/* Success View */}
        {createdRecord ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-emerald-200 text-sm">
                  Settlement Voucher {createdRecord.voucherNumber} Created Successfully
                </h4>
                <p className="text-xs text-emerald-300/80 mt-1">
                  Balanced journal entry has been posted to the general ledger. Debit applied to{' '}
                  <span className="font-semibold text-white">{createdRecord.toPartyName}</span> and Credit applied to{' '}
                  <span className="font-semibold text-white">{createdRecord.fromPartyName}</span>.
                </p>
              </div>
            </div>

            {/* Voucher Details Card */}
            <div className="bg-[#070D1E] p-4 rounded-xl border border-slate-800 text-xs space-y-2.5 font-mono">
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Voucher Number:</span>
                <span className="text-sky-300 font-bold">{createdRecord.voucherNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Date:</span>
                <span className="text-slate-200">{createdRecord.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">From Party (Paying / Credit):</span>
                <span className="text-rose-300 font-bold">
                  {createdRecord.fromPartyName} ({createdRecord.fromPartyType})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">To Party (Receiving / Debit):</span>
                <span className="text-emerald-300 font-bold">
                  {createdRecord.toPartyName} ({createdRecord.toPartyType})
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-800 font-bold">
                <span className="text-slate-300 font-sans">Settlement Amount:</span>
                <span className="text-amber-300">
                  ₹{createdRecord.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-sans">
                <span>Mode:</span>
                <span>{createdRecord.paymentMode.replace(/_/g, ' ')}</span>
              </div>
              {createdRecord.referenceNumber && (
                <div className="flex justify-between text-[11px] text-slate-400 font-sans">
                  <span>Reference / Cheque #:</span>
                  <span className="font-mono">{createdRecord.referenceNumber}</span>
                </div>
              )}
              {createdRecord.narration && (
                <div className="text-[11px] text-slate-400 font-sans pt-1">
                  <span>Note: </span>
                  <span className="text-slate-300">{createdRecord.narration}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintVoucher}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  + Record Another Payment
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Datalists for party name completion */}
            <datalist id="p2p-customers-list">
              {customerSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
              {existingParties.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Voucher Date *</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Settlement Amount (₹) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Parties: From & To */}
            <div className="p-3.5 rounded-xl bg-[#070D1E] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                  <span>Parties Involved in Settlement</span>
                </div>
                <span className="text-[10px] text-slate-400">Funds move directly from Party A to Party B</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Party */}
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 text-[11px]">From Party (Paying Entity)</span>
                    <span className="text-[10px] font-mono text-rose-400/90 font-bold">CREDIT</span>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 text-[10px]">Party Type</label>
                    <select
                      value={fromPartyType}
                      onChange={(e) => setFromPartyType(e.target.value as PartyType)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      {PARTY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 text-[10px]">Party Name *</label>
                    <input
                      required
                      list="p2p-customers-list"
                      placeholder="e.g. Malabar Builders / Dealer Name"
                      value={fromPartyName}
                      onChange={(e) => setFromPartyName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold text-xs focus:border-rose-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* To Party */}
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-[11px]">To Party (Receiving Entity)</span>
                    <span className="text-[10px] font-mono text-emerald-400/90 font-bold">DEBIT</span>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 text-[10px]">Party Type</label>
                    <select
                      value={toPartyType}
                      onChange={(e) => setToPartyType(e.target.value as PartyType)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      {PARTY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 text-[10px]">Party Name *</label>
                    <input
                      required
                      list="p2p-customers-list"
                      placeholder="e.g. Resin Supplier / Contractor Name"
                      value={toPartyName}
                      onChange={(e) => setToPartyName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Mode & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Payment / Settlement Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PartyToPartyPaymentMode)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-sky-500 focus:outline-hidden"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reference / UTR / Cheque # (Optional)</span>
                </label>
                <input
                  placeholder="e.g. UTR12345678 or Cheque #987654"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Narration / Settlement Remarks</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Customer paid raw material supplier directly against pending factory purchase bill"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-sky-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Live Double-Entry Preview Strip */}
            {numAmount > 0 && (fromPartyName || toPartyName) && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                  <span>Double-Entry Contra Preview</span>
                  <span className="text-emerald-400">Net Difference: ₹0.00 (Balanced)</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-emerald-300">
                    Dr. {toPartyName || 'Receiving Party'} ({toPartyType})
                  </span>
                  <span className="text-emerald-300 font-bold">
                    ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-rose-300">
                    Cr. {fromPartyName || 'Paying Party'} ({fromPartyType})
                  </span>
                  <span className="text-rose-300 font-bold">
                    ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || numAmount <= 0}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-600/30"
              >
                <Sparkles className="w-4 h-4" />
                <span>{submitting ? 'Posting Settlement...' : 'Post Party to Party Payment'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
