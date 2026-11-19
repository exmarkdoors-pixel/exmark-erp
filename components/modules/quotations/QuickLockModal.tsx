'use client';

import React, { useState } from 'react';
import { Lock, X, Plus, Check } from 'lucide-react';
import { LockOption, FrpRateCardSettings } from '@/lib/services/frpPricingEngine';
import { apiFetch } from '@/lib/api/apiClient';

interface QuickLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  frpSettings: FrpRateCardSettings;
  onLockAdded: (newLock: LockOption, updatedSettings: FrpRateCardSettings) => void;
}

export function QuickLockModal({
  isOpen,
  onClose,
  frpSettings,
  onLockAdded,
}: QuickLockModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(1000);
  const [costPrice, setCostPrice] = useState<number>(600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter lock name / model');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const newLock: LockOption = {
      id: `lock-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      price: Math.max(0, price || 0),
      costPrice: Math.max(0, costPrice !== undefined ? costPrice : price || 0),
    };

    const currentLocks = frpSettings.locks || [];
    const updatedSettings: FrpRateCardSettings = {
      ...frpSettings,
      locks: [...currentLocks, newLock],
    };

    try {
      const res = await apiFetch('/api/settings/frp-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      if (!res.ok) {
        throw new Error('Failed to persist lock to server rate card');
      }

      onLockAdded(newLock, updatedSettings);
      setName('');
      setPrice(1000);
      onClose();
    } catch (err: any) {
      // Even if network fails, apply in-memory for user flow
      onLockAdded(newLock, updatedSettings);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0c1222] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Lock className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white">
              Add New Lock Hardware
            </h3>
            <p className="text-xs text-slate-400">
              Save lock model to rate card and immediately apply to quotation.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
              Lock Name / Brand Description
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Godrej Mortise 6-Lever Brass / Europa Cylindrical"
              className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Selling Surcharge (₹)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Added to customer quotation.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                BOQ Cost Price (₹)
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#131b2e] border border-amber-500/50 rounded-xl px-3.5 py-2 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Store issue cost in BOQ.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              {isSubmitting ? 'Saving...' : 'Add Lock to Rate Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
