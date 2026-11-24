'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Banknote,
  ArrowLeftRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
  Users,
  Search,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  AccountStatementResponse,
  CashBankAccountWithBalance,
  ContraTransferRecord,
  PartyToPartyPaymentRecord,
} from '@/types/accounting';
import { PartyToPartyPaymentModal } from './PartyToPartyPaymentModal';

interface AccountingCashBankSectionProps {
  onDataChanged: () => void;
}

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AccountingCashBankSection({ onDataChanged }: AccountingCashBankSectionProps) {
  const [accounts, setAccounts] = useState<CashBankAccountWithBalance[]>([]);
  const [contras, setContras] = useState<ContraTransferRecord[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [passbook, setPassbook] = useState<AccountStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState<'CASH_BANK' | 'PARTY_TO_PARTY'>('CASH_BANK');

  // Party to Party Payment state
  const [p2pList, setP2pList] = useState<PartyToPartyPaymentRecord[]>([]);
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [p2pSearch, setP2pSearch] = useState('');

  // Account modal state
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<CashBankAccountWithBalance | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'CASH' | 'BANK' | 'UPI_WALLET'>('BANK');
  const [accBankName, setAccBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accIfsc, setAccIfsc] = useState('');
  const [accUpi, setAccUpi] = useState('');
  const [accOpening, setAccOpening] = useState('0');

  // Contra modal state
  const [showContraModal, setShowContraModal] = useState(false);
  const [contraType, setContraType] = useState<'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'BANK_TRANSFER'>('CASH_DEPOSIT');
  const [contraDate, setContraDate] = useState(new Date().toISOString().slice(0, 10));
  const [contraFrom, setContraFrom] = useState('');
  const [contraTo, setContraTo] = useState('');
  const [contraAmount, setContraAmount] = useState('');
  const [contraRef, setContraRef] = useState('');
  const [contraNotes, setContraNotes] = useState('');

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const loadCashBank = useCallback(async (passbookId?: string) => {
    setLoading(true);
    try {
      const qs = passbookId ? `?passbookAccountId=${encodeURIComponent(passbookId)}` : '';
      const res = await apiFetch(`/api/accounting/cash-bank${qs}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const list: CashBankAccountWithBalance[] = json.data.accounts || [];
        setAccounts(list);
        setContras(json.data.contraTransfers || []);
        if (json.data.passbook) setPassbook(json.data.passbook);
        if (!passbookId && list.length > 0) {
          setSelectedAccountId(list[0].id);
          // Load passbook for default first account
          const pbRes = await apiFetch(`/api/accounting/cash-bank?passbookAccountId=${encodeURIComponent(list[0].id)}`);
          const pbJson = await pbRes.json();
          if (pbRes.ok && pbJson.success && pbJson.data?.passbook) {
            setPassbook(pbJson.data.passbook);
          }
        }
        if (list.length >= 2) {
          setContraFrom((prev) => prev || list[0].id);
          setContraTo((prev) => prev || list[1].id);
        }
      }

      // Also load Party to Party Payments
      try {
        const p2pRes = await apiFetch('/api/accounting/party-to-party');
        const p2pJson = await p2pRes.json();
        if (p2pRes.ok && p2pJson.success) {
          setP2pList(p2pJson.data || []);
        }
      } catch {
        // Non-fatal
      }
    } catch {
      notify('err', 'Failed to load Cash & Bank accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCashBank();
  }, [loadCashBank]);

  const handleSelectPassbook = (id: string) => {
    setSelectedAccountId(id);
    loadCashBank(id);
  };

  const openCreateAccount = () => {
    setEditingAcc(null);
    setAccName('');
    setAccType('BANK');
    setAccBankName('');
    setAccNumber('');
    setAccIfsc('');
    setAccUpi('');
    setAccOpening('0');
    setShowAccModal(true);
  };

  const openEditAccount = (acc: CashBankAccountWithBalance) => {
    setEditingAcc(acc);
    setAccName(acc.name);
    setAccType(acc.accountType);
    setAccBankName(acc.bankName || '');
    setAccNumber(acc.accountNumber || '');
    setAccIfsc(acc.ifsc || '');
    setAccUpi(acc.upiId || '');
    setAccOpening(String(acc.openingBalance));
    setShowAccModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/cash-bank', {
        method: editingAcc ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingAcc ? { id: editingAcc.id } : { kind: 'ACCOUNT' }),
          name: accName,
          accountType: accType,
          bankName: accBankName,
          accountNumber: accNumber,
          ifsc: accIfsc,
          upiId: accUpi,
          openingBalance: Number(accOpening) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save account');
      notify('ok', json.message || 'Account saved.');
      setShowAccModal(false);
      await loadCashBank(selectedAccountId);
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async (acc: CashBankAccountWithBalance) => {
    if (!confirm(`Delete Cash/Bank account "${acc.name}"?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/cash-bank?kind=ACCOUNT&id=${encodeURIComponent(acc.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Account deleted.');
      await loadCashBank();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveContra = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/cash-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'CONTRA',
          transferType: contraType,
          date: contraDate,
          fromAccountId: contraFrom,
          toAccountId: contraTo,
          amount: Number(contraAmount),
          referenceNumber: contraRef,
          notes: contraNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Transfer failed');
      notify('ok', json.message || 'Contra transfer posted.');
      setShowContraModal(false);
      setContraAmount('');
      setContraRef('');
      setContraNotes('');
      await loadCashBank(selectedAccountId);
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteContra = async (id: string) => {
    if (!confirm('Delete this Contra Transfer and reverse its journal entry?')) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/cash-bank?kind=CONTRA&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Contra deleted.');
      await loadCashBank(selectedAccountId);
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteP2P = async (id: string, voucherNum: string) => {
    if (!confirm(`Delete Party to Party payment voucher ${voucherNum} and reverse its ledger journal entry?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/party-to-party?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Payment deleted.');
      await loadCashBank(selectedAccountId);
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const filteredP2p = p2pList.filter((p) => {
    if (!p2pSearch.trim()) return true;
    const q = p2pSearch.toLowerCase().trim();
    return (
      p.voucherNumber.toLowerCase().includes(q) ||
      p.fromPartyName.toLowerCase().includes(q) ||
      p.toPartyName.toLowerCase().includes(q) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
      (p.narration && p.narration.toLowerCase().includes(q))
    );
  });

  const totalP2pAmount = p2pList.reduce((s, p) => s + p.amount, 0);
  const bankUpiAmount = p2pList
    .filter((p) => p.paymentMode === 'DIRECT_BANK' || p.paymentMode === 'DIRECT_UPI')
    .reduce((s, p) => s + p.amount, 0);
  const contraBookAmount = p2pList
    .filter((p) => p.paymentMode === 'BOOK_ADJUSTMENT' || p.paymentMode === 'CASH' || p.paymentMode === 'CHEQUE')
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${banner.type === 'ok' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'}`}>
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Sub-Pillar Tabs: Cash/Bank vs Party to Party */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 bg-[#070D1E] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('CASH_BANK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'CASH_BANK'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Cash &amp; Bank Accounts ({accounts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('PARTY_TO_PARTY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'PARTY_TO_PARTY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Party to Party Settlements ({p2pList.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowP2PModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/30"
        >
          <Users className="w-3.5 h-3.5" />
          <span>+ Party to Party Payment</span>
        </button>
      </div>

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070D1E] p-3 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {activeSubTab === 'CASH_BANK' ? (
              <>
                <Landmark className="w-4 h-4 text-sky-400" />
                <span>Cash-in-Hand &amp; Bank Accounts ({accounts.length})</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Party to Party Settlements ({p2pList.length})</span>
              </>
            )}
          </h3>
          <p className="text-[11px] text-slate-400">
            {activeSubTab === 'CASH_BANK'
              ? 'Real-time cash drawers, current accounts, UPI wallets, Contra deposits & passbook ledger'
              : 'Direct contra settlements between Customers, Suppliers & Contractors without routing company funds'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'CASH_BANK' && (
            <>
              <button
                type="button"
                onClick={() => setShowContraModal((v) => !v)}
                disabled={accounts.length < 2}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Contra / Fund Transfer</span>
              </button>
              <button
                type="button"
                onClick={openCreateAccount}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cash / Bank Account</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 1. CASH & BANK PASSBOOK SUB-TAB ── */}
      {activeSubTab === 'CASH_BANK' && (
        <div className="space-y-4">
          {/* Add / Edit Cash & Bank Form */}
      {showAccModal && (
        <form onSubmit={handleSaveAccount} className="bg-[#0B132B] border border-sky-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">{editingAcc ? `Edit "${editingAcc.name}"` : 'Add New Cash / Bank Account'}</h4>
            <button type="button" onClick={() => setShowAccModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Account Display Name *</label>
              <input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="e.g. HDFC Current A/c / Petty Cash" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Account Type</label>
              <select disabled={Boolean(editingAcc)} value={accType} onChange={(e) => setAccType(e.target.value as typeof accType)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                <option value="BANK">Bank Account</option>
                <option value="CASH">Cash-in-Hand / Petty Cash</option>
                <option value="UPI_WALLET">UPI / Merchant Wallet</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Opening Balance (₹)</label>
              <input type="number" step="0.01" min={0} value={accOpening} onChange={(e) => setAccOpening(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Bank Name</label>
              <input value={accBankName} onChange={(e) => setAccBankName(e.target.value)} placeholder="HDFC / SBI / Federal Bank" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Account Number</label>
              <input value={accNumber} onChange={(e) => setAccNumber(e.target.value)} placeholder="502000..." className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">IFSC</label>
                <input value={accIfsc} onChange={(e) => setAccIfsc(e.target.value)} placeholder="HDFC000..." className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono uppercase" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">UPI ID</label>
                <input value={accUpi} onChange={(e) => setAccUpi(e.target.value)} placeholder="exmark@ok..." className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer">
              {busy ? 'Saving...' : editingAcc ? 'Update Account' : 'Create Cash/Bank Account'}
            </button>
          </div>
        </form>
      )}

      {/* Contra Transfer Form */}
      {showContraModal && (
        <form onSubmit={handleSaveContra} className="bg-[#0B132B] border border-emerald-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">Record Contra Entry (Cash Deposit / Withdrawal / Bank Transfer)</h4>
            <button type="button" onClick={() => setShowContraModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Transfer Type</label>
              <select value={contraType} onChange={(e) => setContraType(e.target.value as typeof contraType)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                <option value="CASH_DEPOSIT">Cash Deposit into Bank</option>
                <option value="CASH_WITHDRAWAL">Cash Withdrawal from Bank</option>
                <option value="BANK_TRANSFER">Bank-to-Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">From Account (Credit) *</label>
              <select value={contraFrom} onChange={(e) => setContraFrom(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmt(a.closingBalance)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">To Account (Debit) *</label>
              <select value={contraTo} onChange={(e) => setContraTo(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmt(a.closingBalance)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Date</label>
              <input type="date" value={contraDate} onChange={(e) => setContraDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Amount (₹) *</label>
              <input type="number" step="0.01" min={1} required value={contraAmount} onChange={(e) => setContraAmount(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Slip / Ref # &amp; Notes</label>
              <div className="flex gap-1.5">
                <input value={contraRef} onChange={(e) => setContraRef(e.target.value)} placeholder="Ref #" className="w-28 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                <input value={contraNotes} onChange={(e) => setContraNotes(e.target.value)} placeholder="Notes..." className="flex-1 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
              {busy ? 'Posting...' : 'Post Contra Transfer'}
            </button>
          </div>
        </form>
      )}

      {/* Cash & Bank Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const active = selectedAccountId === acc.id;
          return (
            <div
              key={acc.id}
              onClick={() => handleSelectPassbook(acc.id)}
              className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                active
                  ? 'bg-sky-950/35 border-sky-500/70 shadow-lg'
                  : 'bg-[#0B132B] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {acc.accountType === 'CASH' ? (
                    <Banknote className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Landmark className="w-5 h-5 text-sky-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">{acc.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {acc.bankName || acc.accountType}{acc.accountNumber ? ` • ${acc.accountNumber}` : ''}{acc.upiId ? ` • ${acc.upiId}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => openEditAccount(acc)} className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" title="Edit">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {!acc.isSystem && (
                    <button type="button" onClick={() => handleDeleteAccount(acc)} className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800/80 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Live Closing Balance</div>
                  <div className={`text-lg font-black font-mono ${acc.closingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmt(acc.closingBalance)}
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 space-y-0.5">
                  <div>In: <span className="text-emerald-300 font-mono">{fmt(acc.totalInflow)}</span></div>
                  <div>Out: <span className="text-rose-300 font-mono">{fmt(acc.totalOutflow)}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Passbook + Recent Contra Transfers */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-[#070D1E] border-b border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Passbook Ledger: {passbook?.title || 'Select an account'}</span>
            </div>
            {passbook && (
              <span className="text-[11px] font-mono text-emerald-300">
                Opening: {fmt(passbook.openingBalance)} • Closing: {fmt(passbook.closingBalance)} ({passbook.closingType === 'DEBIT' ? 'Dr' : 'Cr'})
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Voucher</th>
                  <th className="p-2.5">Particulars</th>
                  <th className="p-2.5 text-right">Deposit (Dr)</th>
                  <th className="p-2.5 text-right">Withdraw (Cr)</th>
                  <th className="p-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {loading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400">Loading passbook...</td></tr>
                ) : !passbook || passbook.lines.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-500">No deposits or withdrawals posted to this account yet.</td></tr>
                ) : (
                  passbook.lines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-2.5 text-slate-300 whitespace-nowrap">{l.date}</td>
                      <td className="p-2.5 font-mono text-sky-300 whitespace-nowrap">{l.voucherNumber}</td>
                      <td className="p-2.5 text-slate-200">{l.particulars}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">{l.debit > 0 ? fmt(l.debit) : '-'}</td>
                      <td className="p-2.5 text-right font-mono text-rose-400">{l.credit > 0 ? fmt(l.credit) : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                        {fmt(l.runningBalance)} <span className="text-[10px] text-slate-400">{l.runningBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-[#070D1E] border-b border-slate-800 text-xs font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span>Contra Transfers ({contras.length})</span>
          </div>
          <div className="divide-y divide-slate-800/70 max-h-[380px] overflow-y-auto text-xs">
            {contras.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No contra deposits or transfers yet.</div>
            ) : (
              contras.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-900/50">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-emerald-400">{c.voucherNumber} • {c.date}</div>
                    <div className="text-white font-semibold truncate">{c.fromAccountName} → {c.toAccountName}</div>
                    <div className="text-[10px] text-slate-400">{c.transferType.replace(/_/g, ' ')}{c.referenceNumber ? ` • ${c.referenceNumber}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-white">{fmt(c.amount)}</span>
                    <button type="button" onClick={() => handleDeleteContra(c.id)} className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* ── 2. PARTY TO PARTY SETTLEMENTS SUB-TAB ── */}
  {activeSubTab === 'PARTY_TO_PARTY' && (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Settlement Volume</div>
          <div className="text-base font-black font-mono text-emerald-400 mt-0.5">{fmt(totalP2pAmount)}</div>
          <div className="text-[10px] text-slate-400">{p2pList.length} Total Settlements</div>
        </div>
        <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Direct Bank &amp; UPI</div>
          <div className="text-base font-black font-mono text-sky-400 mt-0.5">{fmt(bankUpiAmount)}</div>
          <div className="text-[10px] text-slate-400">Direct Customer → Supplier</div>
        </div>
        <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400">Book &amp; Cash Adjustments</div>
          <div className="text-base font-black font-mono text-amber-300 mt-0.5">{fmt(contraBookAmount)}</div>
          <div className="text-[10px] text-slate-400">Contra &amp; Direct Adjustments</div>
        </div>
        <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Contra Integrity</div>
            <div className="text-sm font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Double-Entry Safe</span>
            </div>
            <div className="text-[10px] text-slate-400">Zero Bank Leakage</div>
          </div>
          <button
            type="button"
            onClick={() => setShowP2PModal(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            + Record
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B132B] p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            value={p2pSearch}
            onChange={(e) => setP2pSearch(e.target.value)}
            placeholder="Search by Voucher #, Paying Party, Receiving Party, or Notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing {filteredP2p.length} of {p2pList.length} settlements
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">Voucher #</th>
                <th className="p-3">Date</th>
                <th className="p-3">From Party (Paying / Cr)</th>
                <th className="p-3">To Party (Receiving / Dr)</th>
                <th className="p-3 text-right">Settlement (₹)</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Reference #</th>
                <th className="p-3">Narration / Notes</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredP2p.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <div>No Party to Party payments recorded yet.</div>
                    <button
                      type="button"
                      onClick={() => setShowP2PModal(true)}
                      className="mt-2 text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                    >
                      + Record First Party to Party Payment
                    </button>
                  </td>
                </tr>
              ) : (
                filteredP2p.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-sky-400 whitespace-nowrap">{p.voucherNumber}</td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">{p.date}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-rose-300">{p.fromPartyName}</span>
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {p.fromPartyType}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-300">{p.toPartyName}</span>
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {p.toPartyType}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-amber-300 whitespace-nowrap">
                      {fmt(p.amount)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-semibold text-slate-300">
                        {p.paymentMode.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{p.referenceNumber || '-'}</td>
                    <td className="p-3 text-slate-300 max-w-xs truncate" title={p.narration}>
                      {p.narration || '-'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteP2P(p.id, p.voucherNumber)}
                        className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer transition"
                        title="Delete Payment & Reverse Journal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* Party to Party Modal */}
      <PartyToPartyPaymentModal
        isOpen={showP2PModal}
        onClose={() => setShowP2PModal(false)}
        onSuccess={() => {
          loadCashBank(selectedAccountId);
          onDataChanged();
        }}
      />
    </div>
  );
}
