'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, ReceiptIndianRupee, Landmark, Smartphone, Banknote } from 'lucide-react';

export interface RecordAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    advanceAmount: number;
    advanceVerified: boolean;
  } | null;
  onSuccess: (updatedOrder: { orderId: string; advanceAmount: number; paymentMode: string; utrNumber: string }) => void;
}

export function RecordAdvanceModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: RecordAdvanceModalProps) {
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [accountsNote, setAccountsNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      const min40 = Math.round(order.totalAmount * 0.40);
      setDepositAmount(order.advanceAmount > 0 ? order.advanceAmount : min40);
      setPaymentMode('UPI');
      setUtrNumber('');
      setAccountsNote('Verified with HDFC Bank Account / Cash Counter');
      setErrorMsg(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const min40Threshold = Math.round(order.totalAmount * 0.40);
  const calculatedPercent = order.totalAmount > 0
    ? Math.round((depositAmount / order.totalAmount) * 100)
    : 0;
  const isAdvanceSufficient = calculatedPercent >= 40;

  const handleConfirm = async () => {
    if (depositAmount <= 0) {
      setErrorMsg('Please enter a valid deposit amount.');
      return;
    }

    if (!isAdvanceSufficient) {
      setErrorMsg(`Minimum 40% advance deposit is mandatory (₹${min40Threshold.toLocaleString('en-IN')}) to unlock plant floor release.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Post to update the order advance
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'VERIFY_ADVANCE',
          advanceAmount: depositAmount,
          paymentMode,
          utrNumber: utrNumber || 'BANK-VERIFIED',
          notes: accountsNote,
        }),
      });

      // 2. Also record an automated Payment IN voucher
      try {
        await fetch('/api/accounts/vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voucherType: 'PAYMENT_IN',
            partyName: order.customerName,
            amount: depositAmount,
            mode: paymentMode,
            referenceNumber: utrNumber || order.orderNumber,
            linkedOrderId: order.orderNumber,
            description: `Advance Deposit (${calculatedPercent}%) for Order ${order.orderNumber}. ${accountsNote}`,
          }),
        });
      } catch {
        // Optional sync
      }

      onSuccess({
        orderId: order.id,
        advanceAmount: depositAmount,
        paymentMode,
        utrNumber: utrNumber || 'BANK-VERIFIED',
      });
      onClose();
    } catch {
      setErrorMsg('Network error while recording advance deposit. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="font-bold text-white text-sm">
                Record Advance Deposit / പേയ്‌മെന്റ് വെരിഫിക്കേഷൻ
              </h3>
              <p className="text-[10px] text-slate-400">
                Minimum 40% mandatory deposit gatekeeper for plant floor release
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Snapshot Card */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Order Reference:</span>
              <span className="font-mono font-bold text-white">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Customer / Builder:</span>
              <span className="font-medium text-slate-200">{order.customerName}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Order Value:</span>
              <span className="font-bold text-emerald-400">
                ₹{order.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-amber-400 font-semibold border-t border-slate-800 pt-1.5 mt-1">
              <span>Mandatory 40% Minimum:</span>
              <span className="font-mono font-bold">
                ₹{min40Threshold.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Deposit Amount Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Deposit Amount Received (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                value={depositAmount || ''}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#131b2e] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-white font-bold text-base focus:border-rose-500 focus:outline-none"
                placeholder={`Minimum ${min40Threshold}`}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px]">
              <span className="text-slate-400">Calculated Percentage of Order:</span>
              <span
                className={`font-black text-xs ${
                  isAdvanceSufficient ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {calculatedPercent}% of Total {isAdvanceSufficient ? '✓ (Eligible)' : '✕ (Under 40%)'}
              </span>
            </div>
          </div>

          {/* Payment Mode & UTR / Ref Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer"
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="NEFT/RTGS">NEFT / RTGS (Bank Transfer)</option>
                <option value="Cheque">Cheque Deposit</option>
                <option value="Cash">Cash Receipt</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Reference / UTR No.</label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="UTR / Ref ID / Chq No."
                className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Accounts Verification Note */}
          <div>
            <label className="block text-slate-300 mb-1 font-medium">Accounts Verification Note</label>
            <input
              type="text"
              value={accountsNote}
              onChange={(e) => setAccountsNote(e.target.value)}
              placeholder="E.g. Verified with HDFC Bank Statement / Cash Counter"
              className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Status Alert Banner */}
          <div
            className={`p-3 rounded-xl border text-[11px] flex items-center gap-2.5 ${
              isAdvanceSufficient
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
            }`}
          >
            {isAdvanceSufficient ? (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Valid advance deposit verified ({calculatedPercent}%). &ldquo;Release to Press&rdquo; is now unlocked for shop floor production.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  Deposit is below 40% (₹{min40Threshold.toLocaleString('en-IN')}). Kerala door manufacturing rules require minimum 40% advance before molding.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !isAdvanceSufficient}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting ? 'Verifying...' : 'Verify & Save Advance (അഡ്വാൻസ് ഉറപ്പാക്കുക)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
