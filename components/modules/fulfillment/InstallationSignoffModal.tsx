'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Star, UserCheck, MessageSquare } from 'lucide-react';
import { InstallationRecord } from '@/types/fulfillment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  installation: InstallationRecord | null;
  onSuccess: (updated: InstallationRecord) => void;
}

export function InstallationSignoffModal({ isOpen, onClose, installation, onSuccess }: Props) {
  const [clientSignoffName, setClientSignoffName] = useState(installation?.customerName || '');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !installation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSignoffName.trim()) {
      setError('Please provide the client sign-off name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/fulfillment/installation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: installation.id,
          clientSignoffName,
          feedbackRating,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit installation signoff');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0B132B] rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Site Installation Sign-Off</h3>
              <p className="text-xs text-slate-500">Quality signoff &amp; customer satisfaction verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          {/* Job summary card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Job ID:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{installation.installationNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Client / Site:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{installation.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Door Units:</span>
              <span className="font-semibold text-red-500">{installation.doorCount} Doors</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Supervisor:</span>
              <span className="text-slate-700 dark:text-slate-300">{installation.supervisorName}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              Client / Site Representative Sign-Off Name *
            </label>
            <input
              type="text"
              value={clientSignoffName}
              onChange={(e) => setClientSignoffName(e.target.value)}
              placeholder="e.g. Jijo Abraham (Authorized Signatory)"
              required
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Customer Quality &amp; Alignment Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                {feedbackRating === 5
                  ? '5/5 - Flawless Fit & Finish'
                  : feedbackRating === 4
                  ? '4/5 - Very Good'
                  : feedbackRating === 3
                  ? '3/5 - Satisfactory'
                  : 'Needs Snaglist Attention'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Site Handover Remarks &amp; Feedback
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. All doors aligned properly, hardware latch testing verified by site engineer."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting Sign-off...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve &amp; Complete Handover
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
