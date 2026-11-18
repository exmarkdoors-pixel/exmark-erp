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
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  AccountStatementResponse,
  CashBankAccountWithBalance,
  ContraTransferRecord,
} from '@/types/accounting';

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

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${banner.type === 'ok' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'}`}>
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070D1E] p-3 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-sky-400" />
            Cash-in-Hand &amp; Bank Accounts ({accounts.length})
          </h3>
          <p className="text-[11px] text-slate-400">Real-time cash drawers, current accounts, UPI wallets, Contra deposits &amp; passbook ledger</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

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
  );
}
