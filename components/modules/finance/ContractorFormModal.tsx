'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, UserCheck, AlertCircle, Calendar } from 'lucide-react';
import { Contractor, ContractorTrade, FloorGangScope } from '@/lib/services/contractorService';

interface ContractorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractorToEdit?: Contractor | null;
  onSaved: (contractor: Contractor) => void;
}

export function ContractorFormModal({
  isOpen,
  onClose,
  contractorToEdit,
  onSaved,
}: ContractorFormModalProps) {
  const isEditing = Boolean(contractorToEdit);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState<ContractorTrade>('MOLDING');
  const [teamScope, setTeamScope] = useState<FloorGangScope>('MOLDING_ALL');
  const [isInHouseGang, setIsInHouseGang] = useState(true);
  const [gangLeader, setGangLeader] = useState('');
  const [memberNames, setMemberNames] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');

  // Opening Balance & Migration Setup
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (contractorToEdit) {
      setName(contractorToEdit.name || '');
      setPhone(contractorToEdit.phone || '');
      setTrade(contractorToEdit.trade || 'MOLDING');
      setTeamScope(contractorToEdit.teamScope || 'MOLDING_ALL');
      setIsInHouseGang(contractorToEdit.isInHouseGang !== false);
      setGangLeader(contractorToEdit.gangLeader || '');
      setMemberNames(contractorToEdit.memberNames?.join(', ') || '');
      setUpiId(contractorToEdit.upiId || '');
      setBankAccount(contractorToEdit.bankAccount || '');
      setIfscCode(contractorToEdit.ifscCode || '');
      setBankName(contractorToEdit.bankName || '');
      setOpeningBalance(contractorToEdit.openingBalance || 0);
      setOpeningBalanceType(contractorToEdit.openingBalanceType || 'PAYABLE');
      setOpeningBalanceDate(contractorToEdit.openingBalanceDate || new Date().toISOString().split('T')[0]);
      setOpeningBalanceNotes(contractorToEdit.openingBalanceNotes || '');
    } else {
      setName('');
      setPhone('');
      setTrade('MOLDING');
      setTeamScope('MOLDING_ALL');
      setIsInHouseGang(true);
      setGangLeader('');
      setMemberNames('');
      setUpiId('');
      setBankAccount('');
      setIfscCode('');
      setBankName('');
      setOpeningBalance(0);
      setOpeningBalanceType('PAYABLE');
      setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
      setOpeningBalanceNotes('Migrated initial opening balance from previous books');
    }
    setErrorMessage(null);
  }, [contractorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Contractor or Gang Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Contact phone number is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      trade,
      teamScope,
      isInHouseGang,
      gangLeader: gangLeader.trim() || undefined,
      memberNames: memberNames
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
      upiId: upiId.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      ifscCode: ifscCode.trim() || undefined,
      bankName: bankName.trim() || undefined,
      openingBalance: Number(openingBalance) || 0,
      openingBalanceType,
      openingBalanceDate,
      openingBalanceNotes: openingBalanceNotes.trim() || undefined,
    };

    try {
      const url = isEditing && contractorToEdit
        ? `/api/contractors/${contractorToEdit.id}`
        : '/api/contractors';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save contractor profile.');
      }

      onSaved(json.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Edit Contractor — ${contractorToEdit?.name}` : 'Onboard New Contractor / Floor Gang'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup team profile, rate assignments, and migration opening balance (പഴയ ബാലൻസ്).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-500 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Profile */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] border-b pb-1 dark:border-slate-800">
              1. Contractor & Gang Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contractor / Gang Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mujeeb Rahman Gang (Molding Team 1)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98470 12345"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:border-red-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Primary Operation / Trade *
                </label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value as ContractorTrade)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="MOLDING">Molding (₹500 / ₹380 / ₹125)</option>
                  <option value="CUTTING_GRINDING">Door &amp; Frame Cutting (₹100)</option>
                  <option value="PAINTING">Painting &amp; Woodgrain (₹300 / ₹150 / ₹500)</option>
                  <option value="SITE_FITTING">Site Fitting (₹400)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Floor Gang Scope
                </label>
                <select
                  value={teamScope}
                  onChange={(e) => setTeamScope(e.target.value as FloorGangScope)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="MOLDING_ALL">Molding (All Gangs)</option>
                  <option value="MOLDING_TEAM_1">Molding Team 1 (Press 1 &amp; 2)</option>
                  <option value="MOLDING_TEAM_2">Molding Team 2 (Press 3 &amp; 4)</option>
                  <option value="DOOR_CUTTING_FINISHING">Door Cutting &amp; Finishing</option>
                  <option value="FRAME_CUTTING_FINISHING">Frame Cutting &amp; Finishing</option>
                  <option value="GRAINS_PAINTING">Woodgrain &amp; Paint Line</option>
                  <option value="PACKING_TEAM">Packing &amp; Dispatch</option>
                  <option value="SITE_FITTING">Site Installation Team</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Gang Leader
                </label>
                <input
                  type="text"
                  value={gangLeader}
                  onChange={(e) => setGangLeader(e.target.value)}
                  placeholder="e.g. Mujeeb Rahman"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Team Members (Comma separated)
                </label>
                <input
                  type="text"
                  value={memberNames}
                  onChange={(e) => setMemberNames(e.target.value)}
                  placeholder="Suresh, Anoop, Jayan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Historical Opening Balance Setup (പഴയ ബാലൻസുകൾ) */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>💰</span> Migration Opening Balance (പഴയ ബാലൻസ് സെറ്റപ്പ്)
              </h4>
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold">
                Historical Books Migration
              </span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-200/80">
              Enter any pending amounts carried forward from previous bookkeeping or manual ledgers before using EXMARK ERP.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-amber-950 dark:text-amber-200 block mb-1">
                  Opening Balance Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded-lg font-mono font-black text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-amber-950 dark:text-amber-200 block mb-1">
                  Balance Nature / Type
                </label>
                <select
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as 'PAYABLE' | 'RECEIVABLE')}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded-lg font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="PAYABLE">PAYABLE (കമ്പനി നൽകാനുള്ളത് - We owe)</option>
                  <option value="RECEIVABLE">RECEIVABLE (മുൻകൂർ വാങ്ങിയത് - Advance taken)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-amber-950 dark:text-amber-200 block mb-1">
                  Migration As-Of Date
                </label>
                <input
                  type="date"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-amber-950 dark:text-amber-200 block mb-1">
                Opening Balance Note / Reference
              </label>
              <input
                type="text"
                value={openingBalanceNotes}
                onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                placeholder="e.g. October 2026 closing ledger balance per register book"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          {/* Section 3: Banking & Payment Modes */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] border-b pb-1 dark:border-slate-800">
              3. Disbursement &amp; Payment Accounts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  UPI ID (GPay / PhonePe)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="contractor@okhdfcbank"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 50100456789012"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Bank &amp; Branch Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="HDFC Bank, Perumbavoor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Profile & Balances' : 'Onboard Contractor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
