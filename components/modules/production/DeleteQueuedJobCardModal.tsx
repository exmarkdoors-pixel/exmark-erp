'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  CheckSquare,
  Square,
  FileText,
  RotateCcw,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { ProductionOrder } from '@/lib/services/productionService';

interface DeleteQueuedJobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onSuccess: (deletedOrder: ProductionOrder) => void;
}

export const CANCELLATION_REASONS = [
  {
    code: 'CUSTOMER_CANCELLED',
    labelEn: 'Customer Cancelled Order',
    desc: 'Customer requested order cancellation prior to physical factory molding.',
  },
  {
    code: 'MEASUREMENT_ERROR',
    labelEn: 'Measurement Error / Revised Sizes',
    desc: 'Civil opening sizes changed; fresh job card with revised measurements required.',
  },
  {
    code: 'DESIGN_MODEL_CHANGE',
    labelEn: 'Model / Design / Color Changed',
    desc: 'Party changed door model, frame profile, or PU color specification.',
  },
  {
    code: 'SITE_POSTPONED',
    labelEn: 'Site Delayed / Postponed Indefinitely',
    desc: 'Civil contractor or owner delayed site readiness indefinitely.',
  },
  {
    code: 'DUPLICATE_ENTRY',
    labelEn: 'Duplicate / Mistaken Job Card',
    desc: 'Created twice by accident or erroneous test entry on production board.',
  },
  {
    code: 'PAYMENT_HOLD',
    labelEn: 'Commercial Dispute / Payment Hold',
    desc: 'Customer advance cheque bounced or management placed commercial credit hold.',
  },
  {
    code: 'OTHER',
    labelEn: 'Other Reason (Specify below)',
    desc: 'Custom reason requiring mandatory explanation notes.',
  },
] as const;

export function DeleteQueuedJobCardModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: DeleteQueuedJobCardModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reasonNotes, setReasonNotes] = useState<string>('');
  const [reverseBoq, setReverseBoq] = useState<boolean>(true);
  const [termNoMolding, setTermNoMolding] = useState<boolean>(false);
  const [termAuditAck, setTermAuditAck] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const hasBoqIssued = Boolean(
    order.boqIssuedAt || order.doors?.some((d) => d.materialIssued)
  );

  const isOther = selectedReason === 'OTHER';
  const isNotesValid = !isOther || reasonNotes.trim().length >= 10;
  const canSubmit =
    Boolean(selectedReason) &&
    isNotesValid &&
    termNoMolding &&
    termAuditAck &&
    !isSubmitting;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/production/${order.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasonCode: selectedReason,
          reasonNotes: reasonNotes.trim(),
          reverseBoq: hasBoqIssued ? reverseBoq : false,
          termsAccepted: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete job card');
      }

      onSuccess(order);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling job card';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-rose-500/40 flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-rose-500/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Cancel &amp; Delete Job Card
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {order.jobCardNumber}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Queue stage cancellation with mandatory audit reason &amp; terms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-600/70 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Job Card Context Pill */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Customer: <strong className="text-slate-100 font-bold">{order.customerName}</strong></span>
              <span>Site: <strong className="text-slate-100 font-medium">{order.siteName || 'N/A'}</strong></span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Quantity: <strong className="text-amber-400 font-bold">{order.quantity} Doors</strong> ({order.doorCategory || 'FRP'})</span>
              <span>Stage: <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold text-[10px]">QUEUED</span></span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Select Cancellation Reason <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CANCELLATION_REASONS.map((r) => {
                const isSelected = selectedReason === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => {
                      setSelectedReason(r.code);
                      setErrorMessage(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500 text-rose-200 shadow-sm shadow-rose-950'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{r.labelEn}</span>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>2. Explanation / Remarks</span>
                {isOther && <span className="text-rose-400 text-[10px] font-bold">(Required min 10 chars)</span>}
              </label>
              <span className="text-[10px] text-slate-500">
                {reasonNotes.length} chars
              </span>
            </div>
            <textarea
              rows={2}
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              placeholder="Enter detailed reason, site circumstances, or customer reference..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* BOQ Material Reversal (If issued) */}
          {hasBoqIssued && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                <span>BOQ Raw Materials Were Issued for this Job Card</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Raw chemicals (Polyester resin, gelcoat, fiberglass) were previously allocated for molding.
                Unmixed barrels remain intact in the factory warehouse.
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={reverseBoq}
                  onChange={(e) => setReverseBoq(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span className="font-medium text-amber-300">
                  Unreserve &amp; return allocated chemical materials back to inventory stock
                </span>
              </label>
            </div>
          )}

          {/* Terms & Conditions Acceptance */}
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>3. Mandatory Cancellation Terms &amp; Compliance</span>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={termNoMolding}
                onChange={(e) => setTermNoMolding(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-0 cursor-pointer w-4 h-4 shrink-0"
              />
              <span>
                <strong>Term 1:</strong> I confirm that <span className="text-white underline">NO doors</span> in this job card have been laid up, cured, or molded on the factory press floor.
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={termAuditAck}
                onChange={(e) => setTermAuditAck(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-0 cursor-pointer w-4 h-4 shrink-0"
              />
              <span>
                <strong>Term 2:</strong> I acknowledge that this job card will be permanently archived into <code className="text-[11px] text-rose-300 bg-black/40 px-1 py-0.5 rounded">cancelled-job-cards.json</code> and logged in the System Audit Log for Zero Data Loss accountability.
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Cancel / Keep Card
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 transition cursor-pointer ${
              canSubmit
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm &amp; Delete Job Card</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
