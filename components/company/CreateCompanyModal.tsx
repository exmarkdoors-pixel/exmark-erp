'use client';

import React, { useState } from 'react';
import { Building2, X, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { CompanyBusinessType, CompanySummary } from '@/types/companyRegistry';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (company: CompanySummary, switched: boolean) => void;
}

const BUSINESS_TYPES: CompanyBusinessType[] = [
  'Door Manufacturing',
  'Trading & Wholesale',
  'Hardware & Plywood',
  'Interior & Contracting',
  'General Business',
];

const KERALA_DISTRICTS = [
  'Malappuram',
  'Ernakulam',
  'Kozhikode',
  'Thrissur',
  'Palakkad',
  'Kannur',
  'Kottayam',
  'Thiruvananthapuram',
  'Kollam',
  'Alappuzha',
  'Kasaragod',
  'Wayanad',
  'Pathanamthitta',
  'Idukki',
];

function currentFyStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

export function CreateCompanyModal({ isOpen, onClose, onCreated }: CreateCompanyModalProps) {
  const [legalName, setLegalName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [businessType, setBusinessType] = useState<CompanyBusinessType>('Door Manufacturing');
  const [financialYearStart, setFinancialYearStart] = useState(currentFyStart());
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Malappuram');
  const [stateName, setStateName] = useState('Kerala');
  const [address, setAddress] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [showOpeningSetup, setShowOpeningSetup] = useState(true);
  const [obCash, setObCash] = useState('0');
  const [obBank, setObBank] = useState('0');
  const [obStock, setObStock] = useState('0');
  const [obMachinery, setObMachinery] = useState('0');
  const [obReceivables, setObReceivables] = useState('0');
  const [obPayables, setObPayables] = useState('0');
  const [obAdvances, setObAdvances] = useState('0');
  const [obCapital, setObCapital] = useState('0');
  const [autoBalanceToCapital, setAutoBalanceToCapital] = useState(true);
  const [switchImmediately, setSwitchImmediately] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const obDebitTotal =
    (Number(obCash) || 0) +
    (Number(obBank) || 0) +
    (Number(obStock) || 0) +
    (Number(obMachinery) || 0) +
    (Number(obReceivables) || 0);
  const obNonCapCredit = (Number(obPayables) || 0) + (Number(obAdvances) || 0);
  const computedCapital = Math.max(0, Math.round((obDebitTotal - obNonCapCredit) * 100) / 100);
  const effectiveCapital = autoBalanceToCapital ? computedCapital : Number(obCapital) || 0;
  const obCreditTotal = obNonCapCredit + effectiveCapital;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim()) {
      setError('Company Legal Name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          legalName: legalName.trim(),
          brandName: brandName.trim() || legalName.trim(),
          businessType,
          financialYearStart,
          phone: phone.trim(),
          email: email.trim(),
          district,
          state: stateName.trim() || 'Kerala',
          address: address.trim(),
          gstEnabled,
          gstin: gstEnabled ? gstin.trim().toUpperCase() : '',
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          upiId: upiId.trim(),
          openingBalances: [
            { accountId: 'coa-1001-cash', openingBalance: Math.max(0, Number(obCash) || 0), openingType: 'DEBIT' },
            { accountId: 'coa-1010-bank', openingBalance: Math.max(0, Number(obBank) || 0), openingType: 'DEBIT' },
            { accountId: 'coa-1300-inv', openingBalance: Math.max(0, Number(obStock) || 0), openingType: 'DEBIT' },
            { accountId: 'coa-1500-machinery', openingBalance: Math.max(0, Number(obMachinery) || 0), openingType: 'DEBIT' },
            { accountId: 'coa-1100-ar', openingBalance: Math.max(0, Number(obReceivables) || 0), openingType: 'DEBIT' },
            { accountId: 'coa-2001-ap', openingBalance: Math.max(0, Number(obPayables) || 0), openingType: 'CREDIT' },
            { accountId: 'coa-2200-cust-adv', openingBalance: Math.max(0, Number(obAdvances) || 0), openingType: 'CREDIT' },
            { accountId: 'coa-3001-capital', openingBalance: Math.max(0, effectiveCapital), openingType: 'CREDIT' },
          ],
          autoBalanceToCapital,
          switchImmediately,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not create company.');
      }

      const createdCompany: CompanySummary = json.data.company;
      if (onCreated) {
        onCreated(createdCompany, switchImmediately);
      }
      onClose();
      if (switchImmediately && typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0B132B] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#070D1E] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Create New Company
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Isolated Books &amp; Vault
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Starts with a completely clean workspace (Customers, Orders, Production &amp; Accounting Books)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Company Legal Name *</label>
              <input
                required
                value={legalName}
                onChange={(e) => {
                  setLegalName(e.target.value);
                  if (!brandName) setBrandName(e.target.value);
                }}
                placeholder="e.g. MALABAR WOOD & DOORS LLP"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Brand / Display Name *</label>
              <input
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Malabar Doors"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as CompanyBusinessType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Financial Year Start</label>
              <input
                type="date"
                value={financialYearStart}
                onChange={(e) => setFinancialYearStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98470 00000"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Company Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@company.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">District</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">State</label>
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Office / Factory Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Industrial Area, Town"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>

          {/* GST Mode Toggle (Default OFF — Non-GST Direct Sales) */}
          <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white">Sales &amp; Tax Mode</div>
                <div className="text-[11px] text-slate-400">
                  {gstEnabled
                    ? 'GST Tax Billing ON (CGST / SGST / IGST enabled for this company)'
                    : 'Direct Non-GST Sales Mode (Default — pure net sales without GST billing)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGstEnabled((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  gstEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {gstEnabled ? 'GST Enabled' : 'Non-GST (Direct Sales)'}
              </button>
            </div>
            {gstEnabled && (
              <div>
                <label className="text-slate-400 block mb-1">Company GSTIN (Optional)</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="32AABCE9821K1Z5"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* Optional Primary Bank Details */}
          <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2">
            <div className="font-bold text-slate-300">Primary Bank Account (Optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank Name (e.g. Federal Bank / SBI)"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account Number"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
              <input
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="IFSC Code"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="UPI ID (e.g. company@sbi)"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Day-1 Opening Balance Setup (Assets, Liabilities & Capital) */}
          <div className="p-3 rounded-xl bg-[#070D1E] border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-emerald-300">Day-1 Opening Balances Setup (Optional)</div>
                <div className="text-[10px] text-slate-400">
                  Set starting Cash, Bank, Stock, Receivables, Payables &amp; Capital for a balanced Day-1 Balance Sheet
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpeningSetup((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer"
              >
                {showOpeningSetup ? 'Hide' : 'Configure'}
              </button>
            </div>

            {showOpeningSetup && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-emerald-400 block mb-0.5">Cash in Hand (Dr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obCash} onChange={(e) => setObCash(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-400 block mb-0.5">Primary Bank (Dr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obBank} onChange={(e) => setObBank(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-400 block mb-0.5">Opening Stock (Dr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obStock} onChange={(e) => setObStock(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-400 block mb-0.5">Machinery / Assets (Dr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obMachinery} onChange={(e) => setObMachinery(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-400 block mb-0.5">Opening Receivables (Dr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obReceivables} onChange={(e) => setObReceivables(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-rose-400 block mb-0.5">Opening Payables (Cr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obPayables} onChange={(e) => setObPayables(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-rose-400 block mb-0.5">Customer Advances (Cr ₹)</label>
                    <input type="number" min={0} step="0.01" value={obAdvances} onChange={(e) => setObAdvances(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-[10px] text-purple-300 block mb-0.5">Owner Capital (Cr ₹)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={autoBalanceToCapital}
                      value={autoBalanceToCapital ? String(computedCapital) : obCapital}
                      onChange={(e) => setObCapital(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-purple-500/40 text-purple-200 font-mono text-right disabled:opacity-75"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-950/70 px-3 py-2 rounded-lg border border-slate-800">
                  <label className="flex items-center gap-1.5 text-amber-300 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBalanceToCapital}
                      onChange={(e) => {
                        setAutoBalanceToCapital(e.target.checked);
                        if (!e.target.checked) setObCapital(String(computedCapital));
                      }}
                      className="accent-amber-500"
                    />
                    <span>Auto-Balance to Owner Capital</span>
                  </label>
                  <div className="font-mono text-slate-300">
                    Dr: <strong className="text-emerald-400">₹{obDebitTotal.toLocaleString('en-IN')}</strong> • Cr:{' '}
                    <strong className="text-sky-400">₹{obCreditTotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={switchImmediately}
              onChange={(e) => setSwitchImmediately(e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
            <span>Switch to this new company workspace immediately after creation</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{busy ? 'Creating Company...' : 'Create New Company'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
