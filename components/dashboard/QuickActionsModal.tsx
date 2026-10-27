'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  PlusCircle,
} from 'lucide-react';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickActionsModal({
  isOpen,
  onClose,
}: QuickActionsModalProps) {
  const [activeTab, setActiveTab] = useState<'quote' | 'measurement' | 'order'>('quote');
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [clientName, setClientName] = useState('Malabar Builders');
  const [district, setDistrict] = useState('Kozhikode');
  const [doorType, setDoorType] = useState('FRP Molded Teak (32mm)');
  const [units, setUnits] = useState('25');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-[#070D1E] border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-600/10 text-red-500">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                EXMARK Operations Quick Action
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Create new quote, log measurement or start factory batch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close action modal"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quote')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'quote'
                ? 'border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-[#0B132B]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Quotation
          </button>
          <button
            onClick={() => setActiveTab('measurement')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'measurement'
                ? 'border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-[#0B132B]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Site Measurement
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'order'
                ? 'border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-[#0B132B]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Factory Batch
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Simulated Successfully!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Demo record generated. All changes are contained within the client demo session.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Client / Dealer Name (Kerala)
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Skyline Living, Kozhikode Door Mart..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Kerala District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Kozhikode">Kozhikode (Calicut)</option>
                    <option value="Ernakulam">Ernakulam (Kochi)</option>
                    <option value="Thrissur">Thrissur</option>
                    <option value="Kannur">Kannur</option>
                    <option value="Malappuram">Malappuram</option>
                    <option value="Palakkad">Palakkad</option>
                    <option value="Kottayam">Kottayam</option>
                    <option value="Trivandrum">Thiruvananthapuram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Door Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Door Product Type & Specifications
                </label>
                <select
                  value={doorType}
                  onChange={(e) => setDoorType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                >
                  <option value="FRP Molded Teak (32mm)">FRP Molded Teak (32mm - Waterproof & Termite Proof)</option>
                  <option value="WPC Solid Bathroom Door (30mm)">WPC Solid Bathroom Door (30mm - 100% Moisture Free)</option>
                  <option value="FRP CNC Carved Luxury (35mm)">FRP CNC Carved Luxury Main Door (35mm with Inlay)</option>
                  <option value="WPC Frame Sections (100x65mm)">WPC Solid High-Density Frame Extrusion (100x65mm)</option>
                  <option value="Commercial Fire Retardant FRP (38mm)">Commercial Fire-Retardant FRP Door (38mm)</option>
                </select>
              </div>

              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200/50 dark:border-red-900/30 text-[11px] text-red-700 dark:text-red-300">
                <span className="font-semibold block mb-0.5">Estimated Kerala Pricing (Demo):</span>
                <span>Subtotal: ₹{((parseInt(units) || 1) * 8500).toLocaleString('en-IN')} + 18% GST (HSN 3925)</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold hover:from-red-500 hover:to-rose-500 transition-all shadow-md shadow-red-900/30"
                >
                  Save Demo Record
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
