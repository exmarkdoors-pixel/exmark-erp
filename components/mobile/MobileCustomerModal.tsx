'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Building2,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  Save,
  Compass,
} from 'lucide-react';
import { Customer, CustomerType } from '@/lib/services/customerService';
import { apiFetch } from '@/lib/api/apiClient';

const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

interface MobileCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
  initialTown?: string;
  initialPhone?: string;
  initialName?: string;
}

export function MobileCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  initialTown = '',
  initialPhone = '',
  initialName = '',
}: MobileCustomerModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [firmName, setFirmName] = useState('');
  const [type, setType] = useState<CustomerType>('RETAIL');
  const [district, setDistrict] = useState('Malappuram');
  const [town, setTown] = useState(initialTown);
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone number is required.');
      return;
    }
    if (!town.trim()) {
      setErrorMsg('Town / Site locality is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          firmName: firmName.trim() || undefined,
          type,
          district: district.trim(),
          town: town.trim(),
          address: address.trim() || undefined,
          gstin: gstin.trim() || null,
          phone: phone.trim(),
          creditLimit: 100000,
          status: 'ACTIVE',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save customer');
      }

      onCustomerCreated(json.data);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0F172A] border-t sm:border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#131D38]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Register New Customer</h3>
              <p className="text-[10px] text-cyan-300">New Customer Profile (Mobile Field Sync)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-700/80 text-red-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Customer / Party Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. KAMARU YUSUF"
              className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white font-bold placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98471 23456"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white font-mono placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Customer Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomerType)}
                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                <option value="RETAIL">Retail / End User (Home Owner)</option>
                <option value="ARCHITECT">Architect</option>
                <option value="BUILDER">Builder / Developer</option>
                <option value="DEALER">Dealer / Distributor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Town / City *
              </label>
              <input
                type="text"
                required
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="E.g. Vengara, Kottakkal"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Firm / Project / Site Name
            </label>
            <input
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="E.g. Yusuf Villa / Skyline Tower"
              className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Site Address (Optional)
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Site location details..."
              className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none resize-none text-[11px]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="32AAAAA0000A1Z5"
              className="w-full bg-[#1E293B] border border-slate-700 rounded-lg p-2 text-white font-mono uppercase placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/30 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Link'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
