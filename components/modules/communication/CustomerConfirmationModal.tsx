'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, FileText, Check, AlertCircle } from 'lucide-react';
import { CustomerConfirmationDecision } from '@/types/communication';
import { SiteMeasurementRecord } from '@/types/measurements';

interface CustomerConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurement: SiteMeasurementRecord | null;
  onConfirmed?: () => void;
}

export function CustomerConfirmationModal({
  isOpen,
  onClose,
  measurement,
  onConfirmed,
}: CustomerConfirmationModalProps) {
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !measurement) return null;

  const handleDecision = async (decision: CustomerConfirmationDecision) => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/measurements/${measurement.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record confirmation');
      }

      setStatusMessage({
        type: 'success',
        text: `Customer decision [${decision}] successfully recorded and measurement status updated.`,
      });

      if (onConfirmed) onConfirmed();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error recording decision',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Site Measurement Confirmation Portal
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Book: <span className="font-mono font-bold text-red-500">{measurement.refNumber}</span> • {measurement.siteName} ({measurement.district})
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

        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/15 border border-red-500/30 text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Customer / Client: {measurement.customerName || 'Direct Builder'}
          </p>
          <p className="text-slate-500">
            Total Recorded Openings: <span className="font-bold text-slate-900 dark:text-white">{measurement.doors?.length || 0} Doors</span>
          </p>
          <p className="text-[11px] text-slate-400 italic">
            Please review the raw site openings and handing before factory compression molding.
          </p>
        </div>

        {/* Door List Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="p-2.5">Opening / Door #</th>
                <th className="p-2.5">Model</th>
                <th className="p-2.5 text-center">Height (L/R)</th>
                <th className="p-2.5 text-center">Width (T/B)</th>
                <th className="p-2.5 text-center">Handing</th>
                <th className="p-2.5">Lock Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {measurement.doors?.map((door, idx) => (
                <tr key={door.id || idx}>
                  <td className="p-2.5 font-bold text-slate-900 dark:text-white">{door.doorNumber}</td>
                  <td className="p-2.5">{door.model}</td>
                  <td className="p-2.5 text-center font-mono text-slate-500">
                    {door.heightLeft} / {door.heightRight} mm
                  </td>
                  <td className="p-2.5 text-center font-mono text-slate-500">
                    {door.widthTop} / {door.widthBottom} mm
                  </td>
                  <td className="p-2.5 text-center font-bold">{door.hingeSide}</td>
                  <td className="p-2.5 text-slate-400">{door.lockType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Remarks Input */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Customer / Architect Confirmation Notes or Revision Remarks
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Dimensions verified with civil site engineer. All bathroom door handings confirmed."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* Action Decision Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-white self-start sm:self-auto"
          >
            Close
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDecision('CORRECTION_REQUESTED')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Request Correction
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDecision('REJECT')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/30 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject Measurement
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDecision('ACCEPT')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Accept & Confirm Dimensions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
