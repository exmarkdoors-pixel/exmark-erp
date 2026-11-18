'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import { X, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { ContractorRateCard } from '@/lib/services/contractorService';

interface ContractorRateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: ContractorRateCard) => void;
}

export function ContractorRateCardModal({ isOpen, onClose, onSaved }: ContractorRateCardModalProps) {
  const [rates, setRates] = useState<ContractorRateCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    apiFetch('/api/contractors/rates')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setRates(json.data);
        }
      })
      .catch((err) => setError('Failed to load piece-rate card'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rates) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await apiFetch('/api/contractors/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update rates');
      }
      onSaved(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating rates');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Contractor Piece-Rate Master Card
              </h2>
              <p className="text-xs text-slate-500">Configure factory rates per operation / item</p>
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

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading rate card...</div>
        ) : rates ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Molding Section */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">
                1. Manufacturing & Molding Section
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Door with Frame (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.moldingDoorWithFrame}
                    onChange={(e) => setRates({ ...rates, moldingDoorWithFrame: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Only Door (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.moldingOnlyDoor}
                    onChange={(e) => setRates({ ...rates, moldingOnlyDoor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Only Frame (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.moldingOnlyFrame}
                    onChange={(e) => setRates({ ...rates, moldingOnlyFrame: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. Cutting Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block">
                2. Cutting &amp; Finishing Section (2 Parties)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Party 1: Door Cutting &amp; Finishing (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.doorCutting}
                    onChange={(e) => setRates({ ...rates, doorCutting: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Party 2: Frame Cutting &amp; Finishing (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.frameCutting}
                    onChange={(e) => setRates({ ...rates, frameCutting: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 3. Grains & Painting Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">
                3. Grains &amp; Painting Section (1 Combined Party)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Grains &amp; Paint (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.doorGrainsWithPaint}
                    onChange={(e) => setRates({ ...rates, doorGrainsWithPaint: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Only Clear Coat (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.onlyClearCoat}
                    onChange={(e) => setRates({ ...rates, onlyClearCoat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Two-Side Paint (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rates.twoSidePaint}
                    onChange={(e) => setRates({ ...rates, twoSidePaint: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 4. Site Fitting Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">
                4. Site Fitting & Installation Section
              </span>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  Site Fitting & Door Hanging (₹/door)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rates.siteFitting}
                  onChange={(e) => setRates({ ...rates, siteFitting: parseFloat(e.target.value) || 0 })}
                  className="w-full max-w-[200px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Master Rates</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
