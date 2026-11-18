'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookText,
  ListTree,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Scale,
  CalendarCheck2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import { OpeningBalanceSetupPanel } from './OpeningBalanceSetupPanel';
import { FinancialYearClosePanel } from './FinancialYearClosePanel';
import type {
  AccountGroup,
  AccountStatementResponse,
  BalanceSide,
  ChartOfAccountWithBalance,
  JournalEntryRecord,
} from '@/types/accounting';

interface AccountingLedgerSectionProps {
  accounts: ChartOfAccountWithBalance[];
  onDataChanged: () => void;
}

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GROUPS: Array<{ id: AccountGroup; label: string; color: string }> = [
  { id: 'ASSET', label: 'Assets', color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'LIABILITY', label: 'Liabilities', color: 'text-rose-300 bg-rose-500/15 border-rose-500/30' },
  { id: 'EQUITY', label: 'Equity / Capital', color: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  { id: 'INCOME', label: 'Income / Revenue', color: 'text-sky-300 bg-sky-500/15 border-sky-500/30' },
  { id: 'EXPENSE', label: 'Expenses', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
];

export function AccountingLedgerSection({ accounts: parentAccounts, onDataChanged }: AccountingLedgerSectionProps) {
  const [subTab, setSubTab] = useState<'JOURNAL' | 'COA' | 'STATEMENT' | 'OPENING_BALANCES' | 'FY_CLOSE'>('COA');
  const [coaList, setCoaList] = useState<ChartOfAccountWithBalance[]>(parentAccounts);
  const [journals, setJournals] = useState<JournalEntryRecord[]>([]);
  const [journalFilter, setJournalFilter] = useState<string>('ALL');
  const [coaGroupFilter, setCoaGroupFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // COA Create/Edit form state
  const [showCoaForm, setShowCoaForm] = useState(false);
  const [editingCoa, setEditingCoa] = useState<ChartOfAccountWithBalance | null>(null);
  const [coaCode, setCoaCode] = useState('');
  const [coaName, setCoaName] = useState('');
  const [coaGroup, setCoaGroup] = useState<AccountGroup>('EXPENSE');
  const [coaOpening, setCoaOpening] = useState('0');
  const [coaOpeningType, setCoaOpeningType] = useState<BalanceSide>('DEBIT');
  const [coaDesc, setCoaDesc] = useState('');

  // Journal Create/Edit form state
  const today = new Date().toISOString().slice(0, 10);
  const [showJrnForm, setShowJrnForm] = useState(false);
  const [editingJrn, setEditingJrn] = useState<JournalEntryRecord | null>(null);
  const [jrnDate, setJrnDate] = useState(today);
  const [jrnRef, setJrnRef] = useState('');
  const [jrnNarration, setJrnNarration] = useState('');
  const [jrnLines, setJrnLines] = useState<Array<{ accountId: string; debit: string; credit: string; lineNote: string }>>([
    { accountId: parentAccounts[0]?.id || '', debit: '', credit: '', lineNote: '' },
    { accountId: parentAccounts[1]?.id || parentAccounts[0]?.id || '', debit: '', credit: '', lineNote: '' },
  ]);

  // Account Statement state
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [stmtMode, setStmtMode] = useState<'ACCOUNT' | 'PARTY'>('ACCOUNT');
  const [stmtAccountId, setStmtAccountId] = useState<string>(parentAccounts[0]?.id || 'coa-1001-cash');
  const [stmtPartyType, setStmtPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [stmtPartyName, setStmtPartyName] = useState<string>('');
  const [stmtFrom, setStmtFrom] = useState<string>(yearStart);
  const [stmtTo, setStmtTo] = useState<string>(today);
  const [statement, setStatement] = useState<AccountStatementResponse | null>(null);
  const [parties, setParties] = useState<{ customers: string[]; suppliers: string[] }>({ customers: [], suppliers: [] });

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  useEffect(() => {
    setCoaList(parentAccounts);
    if (parentAccounts.length > 0 && !parentAccounts.some((a) => a.id === stmtAccountId)) {
      setStmtAccountId(parentAccounts[0].id);
    }
  }, [parentAccounts, stmtAccountId]);

  const loadCoaAndJournals = useCallback(async () => {
    setLoading(true);
    try {
      const [coaRes, jrnRes] = await Promise.all([
        apiFetch('/api/accounting/coa').then((r) => r.json()),
        apiFetch('/api/accounting/journals').then((r) => r.json()),
      ]);
      if (coaRes?.success && Array.isArray(coaRes.data)) setCoaList(coaRes.data);
      if (jrnRes?.success && Array.isArray(jrnRes.data)) setJournals(jrnRes.data);
    } catch {
      notify('err', 'Failed to load Chart of Accounts & Journals.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatement = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        mode: stmtMode,
        fromDate: stmtFrom,
        toDate: stmtTo,
      });
      if (stmtMode === 'ACCOUNT') qs.set('accountId', stmtAccountId);
      else {
        qs.set('partyType', stmtPartyType);
        qs.set('partyName', stmtPartyName);
      }
      const res = await apiFetch(`/api/accounting/statement?${qs.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setStatement(json.data);
        if (json.parties) {
          setParties(json.parties);
          if (stmtMode === 'PARTY' && !stmtPartyName) {
            const firstParty = stmtPartyType === 'SUPPLIER' ? json.parties.suppliers?.[0] : json.parties.customers?.[0];
            if (firstParty) setStmtPartyName(firstParty);
          }
        }
      }
    } catch {
      notify('err', 'Failed to load Account Statement.');
    } finally {
      setLoading(false);
    }
  }, [stmtMode, stmtAccountId, stmtPartyType, stmtPartyName, stmtFrom, stmtTo]);

  useEffect(() => {
    loadCoaAndJournals();
  }, [loadCoaAndJournals]);

  useEffect(() => {
    if (subTab === 'STATEMENT') {
      loadStatement();
    }
  }, [subTab, loadStatement]);

  // ── COA Handlers ──
  const openCreateCoa = () => {
    setEditingCoa(null);
    setCoaCode('');
    setCoaName('');
    setCoaGroup('EXPENSE');
    setCoaOpening('0');
    setCoaOpeningType('DEBIT');
    setCoaDesc('');
    setShowCoaForm(true);
  };

  const openEditCoa = (acc: ChartOfAccountWithBalance) => {
    setEditingCoa(acc);
    setCoaCode(acc.code);
    setCoaName(acc.name);
    setCoaGroup(acc.group);
    setCoaOpening(String(acc.openingBalance));
    setCoaOpeningType(acc.openingType);
    setCoaDesc(acc.description || '');
    setShowCoaForm(true);
  };

  const handleSaveCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/coa', {
        method: editingCoa ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingCoa ? { id: editingCoa.id } : {}),
          code: coaCode,
          name: coaName,
          group: coaGroup,
          openingBalance: Number(coaOpening) || 0,
          openingType: coaOpeningType,
          description: coaDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save account');
      notify('ok', json.message || 'Account saved.');
      setShowCoaForm(false);
      await loadCoaAndJournals();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCoa = async (acc: ChartOfAccountWithBalance) => {
    if (!confirm(`Delete account "${acc.code} — ${acc.name}" from Chart of Accounts?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/coa?id=${encodeURIComponent(acc.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Account deleted.');
      await loadCoaAndJournals();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Journal Handlers ──
  const openCreateJournal = () => {
    setEditingJrn(null);
    setJrnDate(today);
    setJrnRef('');
    setJrnNarration('');
    setJrnLines([
      { accountId: coaList[0]?.id || '', debit: '', credit: '', lineNote: '' },
      { accountId: coaList[1]?.id || coaList[0]?.id || '', debit: '', credit: '', lineNote: '' },
    ]);
    setShowJrnForm(true);
  };

  const openEditJournal = (j: JournalEntryRecord) => {
    setEditingJrn(j);
    setJrnDate(j.date);
    setJrnRef(j.reference || '');
    setJrnNarration(j.narration);
    setJrnLines(
      j.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit > 0 ? String(l.debit) : '',
        credit: l.credit > 0 ? String(l.credit) : '',
        lineNote: l.lineNote || '',
      }))
    );
    setShowJrnForm(true);
  };

  const jrnTotalDr = jrnLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const jrnTotalCr = jrnLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const jrnDiff = Math.round((jrnTotalDr - jrnTotalCr) * 100) / 100;
  const jrnBalanced = jrnTotalDr > 0 && Math.abs(jrnDiff) < 0.01;

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jrnBalanced) {
      notify('err', `Journal must balance before posting (Difference: ${fmt(Math.abs(jrnDiff))}).`);
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/journals', {
        method: editingJrn ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingJrn ? { id: editingJrn.id } : {}),
          date: jrnDate,
          reference: jrnRef,
          narration: jrnNarration,
          lines: jrnLines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            lineNote: l.lineNote,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save journal');
      notify('ok', json.message || 'Journal entry posted.');
      setShowJrnForm(false);
      await loadCoaAndJournals();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteJournal = async (j: JournalEntryRecord) => {
    if (!confirm(`Delete manual journal "${j.journalNumber}"?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/journals?id=${encodeURIComponent(j.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Journal deleted.');
      await loadCoaAndJournals();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleExportStatementCsv = () => {
    if (!statement) return;
    const rows = [
      ['Date', 'Voucher #', 'Type', 'Particulars', 'Debit', 'Credit', 'Running Balance', 'Dr/Cr'],
      ['', 'OPENING', '', 'Opening Balance', '', '', String(statement.openingBalance), statement.openingType],
      ...statement.lines.map((l) => [
        l.date,
        l.voucherNumber,
        l.sourceType,
        l.particulars,
        String(l.debit),
        String(l.credit),
        String(l.runningBalance),
        l.runningBalanceType,
      ]),
      ['', 'CLOSING', '', 'Closing Balance', String(statement.totalDebit), String(statement.totalCredit), String(statement.closingBalance), statement.closingType],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXMARK_Account_Statement_${statement.title.replace(/[^a-zA-Z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCoa = coaGroupFilter === 'ALL' ? coaList : coaList.filter((a) => a.group === coaGroupFilter);
  const filteredJournals = journalFilter === 'ALL' ? journals : journals.filter((j) => j.sourceType === journalFilter);

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${banner.type === 'ok' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'}`}>
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070D1E] p-2.5 rounded-xl border border-slate-800 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'COA', label: `Chart of Accounts (${coaList.length})`, Icon: ListTree },
            { id: 'JOURNAL', label: `Journal Entry (${journals.length})`, Icon: BookText },
            { id: 'STATEMENT', label: 'Account Statement', Icon: FileText },
            { id: 'OPENING_BALANCES', label: 'Opening Balances', Icon: Scale },
            { id: 'FY_CLOSE', label: 'FY Close & Lock', Icon: CalendarCheck2 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id as typeof subTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                subTab === id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'COA' && (
            <button type="button" onClick={openCreateCoa} className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          )}
          {subTab === 'JOURNAL' && (
            <button type="button" onClick={openCreateJournal} className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>New Journal Entry</span>
            </button>
          )}
          {subTab === 'STATEMENT' && statement && (
            <>
              <button type="button" onClick={handleExportStatementCsv} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================= 1. CHART OF ACCOUNTS (CREATE / EDIT / DELETE) ================= */}
      {subTab === 'COA' && (
        <div className="space-y-3">
          {showCoaForm && (
            <form onSubmit={handleSaveCoa} className="bg-[#0B132B] border border-indigo-500/40 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-bold text-white text-sm">
                  {editingCoa ? `Edit Account: ${editingCoa.code} — ${editingCoa.name}` : 'Create New Chart of Accounts Ledger'}
                </h4>
                <button type="button" onClick={() => setShowCoaForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Account Code *</label>
                  <input required value={coaCode} onChange={(e) => setCoaCode(e.target.value)} placeholder="e.g. 5350" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono uppercase" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Account Name *</label>
                  <input required value={coaName} onChange={(e) => setCoaName(e.target.value)} placeholder="e.g. Vehicle Loan / Showroom Electricity" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Account Group *</label>
                  <select
                    disabled={Boolean(editingCoa?.isSystem)}
                    value={coaGroup}
                    onChange={(e) => {
                      const g = e.target.value as AccountGroup;
                      setCoaGroup(g);
                      setCoaOpeningType(g === 'ASSET' || g === 'EXPENSE' ? 'DEBIT' : 'CREDIT');
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Opening Balance (₹)</label>
                  <input type="number" step="0.01" min={0} value={coaOpening} onChange={(e) => setCoaOpening(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Opening Side (Dr/Cr)</label>
                  <select value={coaOpeningType} onChange={(e) => setCoaOpeningType(e.target.value as BalanceSide)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value="DEBIT">Debit (Dr)</option>
                    <option value="CREDIT">Credit (Cr)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Description</label>
                  <input value={coaDesc} onChange={(e) => setCoaDesc(e.target.value)} placeholder="Optional ledger description" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCoaForm(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">
                  {busy ? 'Saving...' : editingCoa ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* Group Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setCoaGroupFilter('ALL')}
              className={`px-2.5 py-1 rounded-full font-bold cursor-pointer ${coaGroupFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
            >
              All Groups ({coaList.length})
            </button>
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setCoaGroupFilter(g.id)}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer ${coaGroupFilter === g.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
              >
                {g.label} ({coaList.filter((a) => a.group === g.id).length})
              </button>
            ))}
          </div>

          <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Group</th>
                  <th className="p-3 text-right">Opening</th>
                  <th className="p-3 text-right">Total Debit</th>
                  <th className="p-3 text-right">Total Credit</th>
                  <th className="p-3 text-right">Closing Balance</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredCoa.map((acc) => {
                  const grpMeta = GROUPS.find((g) => g.id === acc.group);
                  return (
                    <tr key={acc.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono font-bold text-indigo-300">{acc.code}</td>
                      <td className="p-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{acc.name}</span>
                          {acc.isSystem && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                              System
                            </span>
                          )}
                        </div>
                        {acc.description && <div className="text-[10px] text-slate-400">{acc.description}</div>}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${grpMeta?.color || ''}`}>
                          {grpMeta?.label || acc.group}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {fmt(acc.openingBalance)} <span className="text-[9px]">{acc.openingType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-300">{fmt(acc.totalDebit)}</td>
                      <td className="p-3 text-right font-mono text-rose-300">{fmt(acc.totalCredit)}</td>
                      <td className="p-3 text-right font-mono font-black text-white">
                        {fmt(acc.closingBalance)} <span className="text-[10px] text-slate-400">{acc.closingType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setStmtMode('ACCOUNT');
                            setStmtAccountId(acc.id);
                            setSubTab('STATEMENT');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-bold cursor-pointer"
                          title="View Account Statement"
                        >
                          Statement
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditCoa(acc)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Edit Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {acc.isSystem ? (
                          <span className="inline-flex p-1.5 text-slate-600" title="Core system control account cannot be deleted">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteCoa(acc)}
                            className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 2. JOURNAL ENTRY ================= */}
      {subTab === 'JOURNAL' && (
        <div className="space-y-3">
          {showJrnForm && (
            <form onSubmit={handleSaveJournal} className="bg-[#0B132B] border border-indigo-500/40 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-bold text-white text-sm">
                  {editingJrn ? `Edit Manual Journal ${editingJrn.journalNumber}` : 'Post Manual Double-Entry Journal (Total Dr = Total Cr)'}
                </h4>
                <button type="button" onClick={() => setShowJrnForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Journal Date</label>
                  <input type="date" value={jrnDate} onChange={(e) => setJrnDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Reference #</label>
                  <input value={jrnRef} onChange={(e) => setJrnRef(e.target.value)} placeholder="JV-REF-01" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Narration / Description *</label>
                  <input required value={jrnNarration} onChange={(e) => setJrnNarration(e.target.value)} placeholder="e.g. Owner Capital Introduced / Depreciation" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300">Debit &amp; Credit Lines</span>
                  <button
                    type="button"
                    onClick={() => setJrnLines((p) => [...p, { accountId: coaList[0]?.id || '', debit: '', credit: '', lineNote: '' }])}
                    className="px-2.5 py-1 rounded bg-slate-800 text-indigo-300 font-bold cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>
                {jrnLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={line.accountId}
                      onChange={(e) => setJrnLines((p) => p.map((r, i) => (i === idx ? { ...r, accountId: e.target.value } : r)))}
                      className="col-span-4 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                    >
                      {coaList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name} ({a.group})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Debit ₹"
                      value={line.debit}
                      onChange={(e) =>
                        setJrnLines((p) => p.map((r, i) => (i === idx ? { ...r, debit: e.target.value, credit: e.target.value ? '' : r.credit } : r)))
                      }
                      className="col-span-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-emerald-300 text-right font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Credit ₹"
                      value={line.credit}
                      onChange={(e) =>
                        setJrnLines((p) => p.map((r, i) => (i === idx ? { ...r, credit: e.target.value, debit: e.target.value ? '' : r.debit } : r)))
                      }
                      className="col-span-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-rose-300 text-right font-mono"
                    />
                    <input
                      placeholder="Line note (optional)"
                      value={line.lineNote}
                      onChange={(e) => setJrnLines((p) => p.map((r, i) => (i === idx ? { ...r, lineNote: e.target.value } : r)))}
                      className="col-span-3 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                    <button
                      type="button"
                      disabled={jrnLines.length <= 2}
                      onClick={() => setJrnLines((p) => p.filter((_, i) => i !== idx))}
                      className="col-span-1 p-1.5 text-rose-400 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-emerald-300 font-bold">Total Dr: {fmt(jrnTotalDr)}</span>
                  <span className="text-rose-300 font-bold">Total Cr: {fmt(jrnTotalCr)}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${jrnBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {jrnBalanced ? '✓ BALANCED' : `Out of Balance: ${fmt(Math.abs(jrnDiff))}`}
                  </span>
                </div>
                <button type="submit" disabled={busy || !jrnBalanced} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer disabled:opacity-40">
                  {busy ? 'Posting...' : editingJrn ? 'Update Journal' : 'Post Journal Entry'}
                </button>
              </div>
            </form>
          )}

          {/* Source Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {['ALL', 'MANUAL', 'SALES_INVOICE', 'PAYMENT_IN', 'CREDIT_NOTE', 'OTHER_INCOME', 'PURCHASE_BILL', 'PAYMENT_OUT', 'EXPENSE', 'CONTRA'].map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setJournalFilter(src)}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer ${journalFilter === src ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
              >
                {src.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading Journal Entries...</div>
            ) : filteredJournals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-[#0B132B] rounded-xl border border-slate-800">
                No journal entries found for this filter.
              </div>
            ) : (
              filteredJournals.map((j) => (
                <div key={j.id} className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="px-4 py-2.5 bg-[#070D1E] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-indigo-300">{j.journalNumber}</span>
                      <span className="text-slate-400">• {j.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${j.sourceType === 'MANUAL' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-300'}`}>
                        {j.sourceType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-white font-semibold">{j.narration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-300">{fmt(j.totalDebit)}</span>
                      {j.sourceType === 'MANUAL' && (
                        <>
                          <button type="button" onClick={() => openEditJournal(j)} className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteJournal(j)} className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      {j.lines.map((l, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 last:border-b-0">
                          <td className="px-4 py-1.5 font-mono text-slate-400 w-24">{l.accountCode}</td>
                          <td className="px-4 py-1.5 text-slate-200 font-medium">{l.accountName}{l.lineNote && <span className="text-slate-500 ml-2 text-[10px]">({l.lineNote})</span>}</td>
                          <td className="px-4 py-1.5 text-right font-mono text-emerald-300 w-32">{l.debit > 0 ? fmt(l.debit) : ''}</td>
                          <td className="px-4 py-1.5 text-right font-mono text-rose-300 w-32">{l.credit > 0 ? fmt(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= 3. ACCOUNT STATEMENT ================= */}
      {subTab === 'STATEMENT' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end print:hidden">
            <div>
              <label className="text-slate-400 block mb-1">Statement Mode</label>
              <select value={stmtMode} onChange={(e) => setStmtMode(e.target.value as 'ACCOUNT' | 'PARTY')} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold">
                <option value="ACCOUNT">By Ledger Account (COA)</option>
                <option value="PARTY">By Customer / Supplier Party</option>
              </select>
            </div>
            {stmtMode === 'ACCOUNT' ? (
              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">Select Chart of Accounts Ledger</label>
                <select value={stmtAccountId} onChange={(e) => setStmtAccountId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                  {coaList.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.group})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="md:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Party Type</label>
                  <select value={stmtPartyType} onChange={(e) => { setStmtPartyType(e.target.value as 'CUSTOMER' | 'SUPPLIER'); setStmtPartyName(''); }} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value="CUSTOMER">Customer</option>
                    <option value="SUPPLIER">Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Select Party</label>
                  <select value={stmtPartyName} onChange={(e) => setStmtPartyName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value="">-- Choose Party --</option>
                    {(stmtPartyType === 'SUPPLIER' ? parties.suppliers : parties.customers).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="text-slate-400 block mb-1">From Date</label>
              <input type="date" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="text-slate-400 block mb-1">To Date</label>
                <input type="date" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              </div>
              <button type="button" onClick={loadStatement} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer" title="Refresh Statement">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Printable Statement Sheet */}
          {statement && (
            <div className="bg-[#0B132B] print:bg-white print:text-black border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden text-xs">
              <div className="p-4 bg-[#070D1E] print:bg-slate-100 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="text-base font-black text-white print:text-black">{statement.title}</div>
                  <div className="text-[11px] text-slate-400 print:text-slate-700">{statement.subtitle} • Period: {statement.fromDate} to {statement.toDate}</div>
                </div>
                <div className="flex items-center gap-4 text-right font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400">Opening Balance</div>
                    <div className="font-bold text-slate-200 print:text-black">{fmt(statement.openingBalance)} {statement.openingType === 'DEBIT' ? 'Dr' : 'Cr'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Closing Balance</div>
                    <div className="text-sm font-black text-emerald-400 print:text-black">{fmt(statement.closingBalance)} {statement.closingType === 'DEBIT' ? 'Dr' : 'Cr'}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 print:bg-slate-200 text-slate-400 print:text-black uppercase text-[10px] border-b border-slate-800">
                      <th className="p-3">Date</th>
                      <th className="p-3">Voucher #</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Particulars</th>
                      <th className="p-3 text-right">Debit (₹)</th>
                      <th className="p-3 text-right">Credit (₹)</th>
                      <th className="p-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    <tr className="bg-slate-900/40 font-semibold">
                      <td className="p-2.5 text-slate-400">{statement.fromDate}</td>
                      <td className="p-2.5 font-mono text-slate-400">OPENING</td>
                      <td className="p-2.5 text-slate-400">B/F</td>
                      <td className="p-2.5 text-slate-200 print:text-black">Opening Balance Brought Forward</td>
                      <td className="p-2.5 text-right font-mono">-</td>
                      <td className="p-2.5 text-right font-mono">-</td>
                      <td className="p-2.5 text-right font-mono font-bold text-white print:text-black">
                        {fmt(statement.openingBalance)} {statement.openingType === 'DEBIT' ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                    {statement.lines.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-slate-500">No ledger movements during this date range.</td></tr>
                    ) : (
                      statement.lines.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="p-2.5 text-slate-300 print:text-black whitespace-nowrap">{l.date}</td>
                          <td className="p-2.5 font-mono text-sky-300 print:text-black whitespace-nowrap">{l.voucherNumber}</td>
                          <td className="p-2.5 text-[10px] text-slate-400">{l.sourceType.replace(/_/g, ' ')}</td>
                          <td className="p-2.5 text-slate-200 print:text-black">{l.particulars}</td>
                          <td className="p-2.5 text-right font-mono text-emerald-300 print:text-black">{l.debit > 0 ? fmt(l.debit) : '-'}</td>
                          <td className="p-2.5 text-right font-mono text-rose-300 print:text-black">{l.credit > 0 ? fmt(l.credit) : '-'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-white print:text-black whitespace-nowrap">
                            {fmt(l.runningBalance)} <span className="text-[10px] text-slate-400">{l.runningBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-[#070D1E] print:bg-slate-100 font-black border-t-2 border-slate-700">
                      <td colSpan={4} className="p-3 text-white print:text-black">PERIOD TOTALS &amp; CLOSING BALANCE</td>
                      <td className="p-3 text-right font-mono text-emerald-400 print:text-black">{fmt(statement.totalDebit)}</td>
                      <td className="p-3 text-right font-mono text-rose-400 print:text-black">{fmt(statement.totalCredit)}</td>
                      <td className="p-3 text-right font-mono text-white print:text-black">
                        {fmt(statement.closingBalance)} {statement.closingType === 'DEBIT' ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'OPENING_BALANCES' && (
        <OpeningBalanceSetupPanel
          onSaved={() => {
            loadCoaAndJournals();
            onDataChanged();
          }}
        />
      )}

      {subTab === 'FY_CLOSE' && (
        <FinancialYearClosePanel
          onClosed={() => {
            loadCoaAndJournals();
            onDataChanged();
          }}
        />
      )}
    </div>
  );
}
