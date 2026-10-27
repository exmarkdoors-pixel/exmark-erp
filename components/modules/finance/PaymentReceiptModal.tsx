'use client';

import React, { useState } from 'react';
import { X, ReceiptIndianRupee, CheckCircle2, AlertCircle } from 'lucide-react';
import { Payment, PaymentMode, Invoice } from '@/types/finance';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (payment: Payment) => void;
  invoices: Invoice[];
}

export function PaymentReceiptModal({ isOpen, onClose, onSaved, invoices }: PaymentReceiptModalProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('NEFT');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(inv.balanceAmount.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId || null,
          customerId: selectedInv?.customerId || 'direct-client',
          customerName: selectedInv?.customerName || 'Direct Client',
          amount: amt,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record payment');
      }

      onSaved(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ReceiptIndianRupee className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Record Customer Payment / Receipt
            </h2>
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
          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Invoice to Settle (Optional)
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- General Advance / Unlinked Payment --</option>
              {invoices
                .filter((inv) => inv.status !== 'PAID')
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customerName} (Due: ₹{inv.balanceAmount.toLocaleString('en-IN')})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Amount Received (₹) *
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold"
              >
                <option value="NEFT">Bank NEFT</option>
                <option value="RTGS">Bank RTGS</option>
                <option value="UPI">UPI / QR Transfer</option>
                <option value="CHEQUE">Account Payee Cheque</option>
                <option value="CASH">Cash at Factory Counter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Bank UTR / Cheque / Transaction Ref #
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR88392019 / CHQ-102938"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Receipt Notes / Narration
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Part payment against 24 molded teak doors for Calicut Villa site"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            />
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
              {isSubmitting ? 'Recording...' : 'Generate Official Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
