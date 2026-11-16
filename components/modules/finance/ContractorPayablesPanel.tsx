'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Receipt,
  Calendar,
  Send,
  Plus,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Phone,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Edit,
} from 'lucide-react';
import { Contractor, ContractorRateCard, ContractorPayoutVoucher, ContractorTrade } from '@/lib/services/contractorService';
import { ContractorPayoutModal } from './ContractorPayoutModal';
import { ContractorWeeklyStatementModal } from './ContractorWeeklyStatementModal';
import { ContractorRateCardModal } from './ContractorRateCardModal';
import { ContractorFormModal } from './ContractorFormModal';

export function ContractorPayablesPanel() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [filterTrade, setFilterTrade] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedContractorForPayout, setSelectedContractorForPayout] = useState<Contractor | null>(null);
  const [selectedContractorForStatement, setSelectedContractorForStatement] = useState<Contractor | null>(null);
  const [selectedContractorForEdit, setSelectedContractorForEdit] = useState<Contractor | null>(null);
  const [isRateCardModalOpen, setIsRateCardModalOpen] = useState<boolean>(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchContractors = () => {
    setIsLoading(true);
    fetch('/api/contractors')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setContractors(json.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const handleContractorSaved = (contractor: Contractor) => {
    fetchContractors();
    setToastMessage(`Contractor profile "${contractor.name}" saved with opening balance ₹${(contractor.openingBalance || 0).toLocaleString('en-IN')}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePayoutSaved = (voucher: ContractorPayoutVoucher) => {
    fetchContractors();
    setToastMessage(`Disbursement voucher "${voucher.voucherNumber}" for ₹${voucher.amount.toLocaleString('en-IN')} recorded!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRateCardSaved = (rates: ContractorRateCard) => {
    setToastMessage('Master piece-rate card updated successfully across all plant operations.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = filterTrade === 'ALL'
    ? contractors
    : contractors.filter((c) => c.trade === filterTrade);

  const totalGrossEarned = contractors.reduce((sum, c) => sum + c.totalEarned, 0);
  const totalDisbursed = contractors.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalBalanceDue = contractors.reduce((sum, c) => sum + c.balancePayable, 0);
  const totalDoorsFinished = contractors.reduce((sum, c) => sum + c.totalDoorsCompleted, 0);

  const getTradeColor = (trade: ContractorTrade) => {
    switch (trade) {
      case 'MOLDING':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'CUTTING_GRINDING':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'PAINTING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'SITE_FITTING':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-red-500" />
            Contractor Accounts & Labor Piece-Rate Ledgers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Molding (₹500/380/125), Cutting (₹100), Painting (₹300/150/500), Site Fitting (₹400) piece-rate disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedContractorForEdit(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Onboard Contractor / Gang
          </button>
          <button
            onClick={() => setIsRateCardModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-red-500" /> Rate Card Studio
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Doors Completed</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {totalDoorsFinished} Doors
          </p>
          <span className="text-[10px] text-slate-400">Across 4 plant operations</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Piece-Rate Earned</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
            ₹{totalGrossEarned.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">{contractors.length} Contract Gangs</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Disbursements & Advances</span>
          <p className="text-xl font-black text-emerald-500 font-mono">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-600">UPI, Bank & Cash Settled</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Balance Payable</span>
          <p className="text-xl font-black text-red-500 font-mono">
            ₹{totalBalanceDue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-red-400">Current Labor Payables</span>
        </div>
      </div>

      {/* Trade Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'ALL', label: 'All Operations' },
          { id: 'MOLDING', label: 'Molding (₹500/₹380/₹125)' },
          { id: 'CUTTING_GRINDING', label: 'Cutting (₹100)' },
          { id: 'PAINTING', label: 'Painting (₹300/₹150/₹500)' },
          { id: 'SITE_FITTING', label: 'Site Fitting (₹400)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTrade(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTrade === tab.id
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contractors Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Contractor Gang / Name</th>
                <th className="p-3.5">Trade / Operation</th>
                <th className="p-3.5">Disbursement Info (UPI / Bank)</th>
                <th className="p-3.5 text-center">Doors Finished</th>
                <th className="p-3.5 text-right">Opening Bal.</th>
                <th className="p-3.5 text-right">Total Earned</th>
                <th className="p-3.5 text-right">Paid to Date</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading contractor accounts...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">No contractors found matching selected filter.</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{c.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">{c.phone}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTradeColor(c.trade)}`}>
                        {c.trade.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[180px]">{c.tradeLabel}</span>
                    </td>
                    <td className="p-3.5 text-xs font-mono">
                      {c.upiId ? (
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">{c.upiId}</div>
                      ) : null}
                      {c.bankAccount ? (
                        <div className="text-slate-500 text-[10px]">{c.bankAccount} ({c.ifscCode})</div>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Cash on hand</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                      {c.totalDoorsCompleted}
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs">
                      {c.openingBalance ? (
                        <div>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            ₹{c.openingBalance.toLocaleString('en-IN')}
                          </span>
                          <span className={`block text-[9px] font-semibold ${c.openingBalanceType === 'RECEIVABLE' ? 'text-blue-500' : 'text-amber-500'}`}>
                            {c.openingBalanceType === 'RECEIVABLE' ? 'Adv. Taken' : 'Payable'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">₹0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{c.totalEarned.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{c.totalPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-red-500">
                      ₹{c.balancePayable.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedContractorForEdit(c);
                            setIsFormModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Edit Profile & Migration Balances"
                        >
                          <Edit className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setSelectedContractorForPayout(c)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Record disbursement / advance"
                        >
                          Pay
                        </button>
                        <button
                          onClick={() => setSelectedContractorForStatement(c)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Weekly Work Report & PDF Statement"
                        >
                          Statement
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ContractorPayoutModal
        isOpen={Boolean(selectedContractorForPayout)}
        onClose={() => setSelectedContractorForPayout(null)}
        contractor={selectedContractorForPayout}
        onSaved={handlePayoutSaved}
      />

      <ContractorWeeklyStatementModal
        isOpen={Boolean(selectedContractorForStatement)}
        onClose={() => setSelectedContractorForStatement(null)}
        contractor={selectedContractorForStatement}
      />

      <ContractorRateCardModal
        isOpen={isRateCardModalOpen}
        onClose={() => setIsRateCardModalOpen(false)}
        onSaved={handleRateCardSaved}
      />

      <ContractorFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedContractorForEdit(null);
        }}
        contractorToEdit={selectedContractorForEdit}
        onSaved={handleContractorSaved}
      />
    </div>
  );
}
