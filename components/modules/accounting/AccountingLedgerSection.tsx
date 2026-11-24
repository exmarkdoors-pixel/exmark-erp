'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Layers,
  Search,
  CornerDownRight,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Check,
  Info,
  Building2,
  Table as TableIcon,
  GitBranch,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import { OpeningBalanceSetupPanel } from './OpeningBalanceSetupPanel';
import { FinancialYearClosePanel } from './FinancialYearClosePanel';
import type {
  AccountGroup,
  AccountStatementResponse,
  AccountSubType,
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

const GROUPS: Array<{ id: AccountGroup; label: string; codeRange: string; color: string; desc: string }> = [
  { id: 'ASSET', label: 'Assets', codeRange: '1000 - 1999', color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30', desc: 'Cash, bank accounts, receivables, inventory & plant assets' },
  { id: 'LIABILITY', label: 'Liabilities', codeRange: '2000 - 2999', color: 'text-rose-300 bg-rose-500/15 border-rose-500/30', desc: 'Payables, GST taxes, customer advances & loans' },
  { id: 'EQUITY', label: 'Equity / Capital', codeRange: '3000 - 3999', color: 'text-purple-300 bg-purple-500/15 border-purple-500/30', desc: 'Proprietor capital, partner investments & retained earnings' },
  { id: 'INCOME', label: 'Income / Revenue', codeRange: '4000 - 4999', color: 'text-sky-300 bg-sky-500/15 border-sky-500/30', desc: 'Door sales, sales returns, transport & scrap income' },
  { id: 'EXPENSE', label: 'Expenses', codeRange: '5000 - 5999', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30', desc: 'Raw material purchases, labor, electricity & operating overheads' },
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

  // COA View Mode & Tree State
  const [coaViewMode, setCoaViewMode] = useState<'TREE' | 'TABLE'>('TREE');
  const [coaSearch, setCoaSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    ASSET: true,
    LIABILITY: true,
    EQUITY: true,
    INCOME: true,
    EXPENSE: true,
  });
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // COA Create/Edit form state
  const [showCoaForm, setShowCoaForm] = useState(false);
  const [editingCoa, setEditingCoa] = useState<ChartOfAccountWithBalance | null>(null);
  const [coaCode, setCoaCode] = useState('');
  const [coaName, setCoaName] = useState('');
  const [coaGroup, setCoaGroup] = useState<AccountGroup>('EXPENSE');
  const [coaSubType, setCoaSubType] = useState<AccountSubType>('OPERATING_EXPENSE');
  const [coaParentId, setCoaParentId] = useState<string>('');
  const [coaOpening, setCoaOpening] = useState('0');
  const [coaOpeningType, setCoaOpeningType] = useState<BalanceSide>('DEBIT');
  const [coaDesc, setCoaDesc] = useState('');
  const [coaIsActive, setCoaIsActive] = useState<boolean>(true);

  // Protected Delete Modal State
  const [blockedDeleteAccount, setBlockedDeleteAccount] = useState<ChartOfAccountWithBalance | null>(null);

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
  const openCreateCoa = (presetParentId?: string, presetGroup?: AccountGroup) => {
    setEditingCoa(null);
    let group: AccountGroup = presetGroup || 'EXPENSE';
    let subType: AccountSubType = 'OPERATING_EXPENSE';
    let suggestedCode = '';

    if (presetParentId) {
      const parent = coaList.find((a) => a.id === presetParentId);
      if (parent) {
        group = parent.group;
        subType = parent.subType || 'OPERATING_EXPENSE';
        const siblings = coaList.filter((a) => a.parentId === presetParentId);
        suggestedCode = `${parent.code}-${siblings.length + 1}`;
      }
    } else if (presetGroup) {
      group = presetGroup;
      if (group === 'ASSET') subType = 'OTHER_ASSET';
      else if (group === 'LIABILITY') subType = 'OTHER_LIABILITY';
      else if (group === 'EQUITY') subType = 'CAPITAL';
      else if (group === 'INCOME') subType = 'OTHER_INCOME';
      else subType = 'OPERATING_EXPENSE';
    }

    setCoaCode(suggestedCode);
    setCoaName('');
    setCoaGroup(group);
    setCoaSubType(subType);
    setCoaParentId(presetParentId || '');
    setCoaOpening('0');
    setCoaOpeningType(group === 'ASSET' || group === 'EXPENSE' ? 'DEBIT' : 'CREDIT');
    setCoaDesc('');
    setCoaIsActive(true);
    setShowCoaForm(true);
  };

  const openEditCoa = (acc: ChartOfAccountWithBalance) => {
    setEditingCoa(acc);
    setCoaCode(acc.code);
    setCoaName(acc.name);
    setCoaGroup(acc.group);
    setCoaSubType(acc.subType || 'OPERATING_EXPENSE');
    setCoaParentId(acc.parentId || '');
    setCoaOpening(String(acc.openingBalance));
    setCoaOpeningType(acc.openingType);
    setCoaDesc(acc.description || '');
    setCoaIsActive(acc.isActive !== false);
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
          subType: coaSubType,
          parentId: coaParentId || null,
          openingBalance: Number(coaOpening) || 0,
          openingType: coaOpeningType,
          description: coaDesc,
          isActive: coaIsActive,
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
    // If account has transactions, child sub-accounts, opening balance, or is system -> Block!
    if (
      acc.isSystem ||
      acc.transactionCount > 0 ||
      (acc.childCount || 0) > 0 ||
      acc.openingBalance > 0 ||
      acc.isDeletable === false
    ) {
      setBlockedDeleteAccount(acc);
      return;
    }

    if (
      !confirm(
        `Delete account "${acc.code} — ${acc.name}" from Chart of Accounts? This account has 0 recorded transactions and can be safely deleted.`
      )
    ) {
      return;
    }
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

  const handleDeactivateAccount = async (acc: ChartOfAccountWithBalance) => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/coa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: acc.id,
          isActive: false,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to deactivate account');
      notify('ok', `Account "${acc.name}" deactivated. It will no longer appear in new voucher dropdowns.`);
      setBlockedDeleteAccount(null);
      await loadCoaAndJournals();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Deactivation failed');
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

  const SUBTYPES_BY_GROUP: Record<AccountGroup, Array<{ id: AccountSubType; label: string }>> = {
    ASSET: [
      { id: 'CASH', label: 'Cash in Hand (Auto-mirrors in Cash & Bank)' },
      { id: 'BANK', label: 'Bank Account (Auto-mirrors in Cash & Bank)' },
      { id: 'RECEIVABLE', label: 'Accounts Receivable (Debtors)' },
      { id: 'INVENTORY', label: 'Stock & Inventory Asset' },
      { id: 'FIXED_ASSET', label: 'Fixed Assets (Machinery & Premises)' },
      { id: 'TAX_INPUT', label: 'GST Input Tax Credit (ITC)' },
      { id: 'OTHER_ASSET', label: 'Other Current / Non-Current Asset' },
    ],
    LIABILITY: [
      { id: 'PAYABLE', label: 'Accounts Payable (Creditors)' },
      { id: 'TAX_PAYABLE', label: 'GST Output / Duties Payable' },
      { id: 'CUSTOMER_ADVANCE', label: 'Customer Advances' },
      { id: 'LOAN', label: 'Bank / Vehicle Loans' },
      { id: 'OTHER_LIABILITY', label: 'Other Liability' },
    ],
    EQUITY: [
      { id: 'CAPITAL', label: 'Owner / Partner Capital' },
      { id: 'RETAINED_EARNINGS', label: 'Retained Earnings & Reserves' },
    ],
    INCOME: [
      { id: 'SALES', label: 'Door & Frame Sales Revenue' },
      { id: 'SALES_RETURN', label: 'Sales Returns & Credit Notes' },
      { id: 'OTHER_INCOME', label: 'Other Operating / Scrap Income' },
    ],
    EXPENSE: [
      { id: 'PURCHASE', label: 'Raw Material Purchases' },
      { id: 'DIRECT_EXPENSE', label: 'Direct Factory Labor & Wages' },
      { id: 'OPERATING_EXPENSE', label: 'Operating Overhead (Power, Rent, Freight)' },
    ],
  };

  // Group Financial Summaries
  const groupMetrics = useMemo(() => {
    return GROUPS.map((g) => {
      const accs = coaList.filter((a) => a.group === g.id);
      let netSigned = 0;
      let totalDr = 0;
      let totalCr = 0;
      for (const a of accs) {
        totalDr += a.totalDebit || 0;
        totalCr += a.totalCredit || 0;
        const signed = a.closingType === 'DEBIT' ? a.closingBalance : -a.closingBalance;
        netSigned += signed;
      }
      const netType: BalanceSide =
        netSigned > 0 ? 'DEBIT' : netSigned < 0 ? 'CREDIT' : g.id === 'ASSET' || g.id === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
      return {
        ...g,
        count: accs.length,
        netBalance: Math.abs(netSigned),
        netType,
        totalDr,
        totalCr,
      };
    });
  }, [coaList]);

  // Search & Filtered Accounts
  const searchedCoa = useMemo(() => {
    if (!coaSearch.trim()) return coaList;
    const q = coaSearch.toLowerCase().trim();
    return coaList.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.subType || '').toLowerCase().includes(q)
    );
  }, [coaList, coaSearch]);

  const searchedIds = useMemo(() => new Set(searchedCoa.map((a) => a.id)), [searchedCoa]);

  // Auto-expand matching parent branches during search
  useEffect(() => {
    if (coaSearch.trim()) {
      const newParents: Record<string, boolean> = {};
      const newGroups: Record<string, boolean> = { ...expandedGroups };
      for (const a of searchedCoa) {
        newGroups[a.group] = true;
        if (a.parentId) {
          newParents[a.parentId] = true;
        }
      }
      setExpandedParents((prev) => ({ ...prev, ...newParents }));
      setExpandedGroups(newGroups);
    }
  }, [coaSearch, searchedCoa]);

  const filteredCoa = useMemo(() => {
    let list = searchedCoa;
    if (coaGroupFilter !== 'ALL') {
      list = list.filter((a) => a.group === coaGroupFilter);
    }
    return list;
  }, [searchedCoa, coaGroupFilter]);

  const filteredJournals = journalFilter === 'ALL' ? journals : journals.filter((j) => j.sourceType === journalFilter);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleParentExpand = (accountId: string) => {
    setExpandedParents((prev) => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const expandAllTree = () => {
    const allG: Record<string, boolean> = {};
    const allP: Record<string, boolean> = {};
    GROUPS.forEach((g) => (allG[g.id] = true));
    coaList.forEach((a) => {
      if ((a.childCount || 0) > 0) allP[a.id] = true;
    });
    setExpandedGroups(allG);
    setExpandedParents(allP);
  };

  const collapseAllTree = () => {
    const allG: Record<string, boolean> = {};
    GROUPS.forEach((g) => (allG[g.id] = false));
    setExpandedGroups(allG);
    setExpandedParents({});
  };

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
            <button type="button" onClick={() => openCreateCoa()} className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
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

      {/* ================= 1. CHART OF ACCOUNTS (TREE CHART & TABLE) ================= */}
      {subTab === 'COA' && (
        <div className="space-y-4">
          {/* Financial Pillar Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {groupMetrics.map((gm) => {
              const isSelected = coaGroupFilter === gm.id;
              return (
                <div
                  key={gm.id}
                  onClick={() => setCoaGroupFilter(isSelected ? 'ALL' : gm.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                      : 'bg-[#0B132B] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-300 uppercase tracking-wider">{gm.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{gm.codeRange}</span>
                  </div>
                  <div className="text-base font-black text-white font-mono flex items-baseline gap-1">
                    <span>{fmt(gm.netBalance)}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{gm.netType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span>{gm.count} accounts</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${gm.color}`}>
                      {gm.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View Mode & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#070D1E] p-2.5 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search account code, name, description..."
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCoaViewMode('TREE')}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    coaViewMode === 'TREE'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Hierarchical Tree Chart View"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Chart View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCoaViewMode('TABLE')}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    coaViewMode === 'TABLE'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Detailed Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
              </div>

              {coaViewMode === 'TREE' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={expandAllTree}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                  >
                    + Expand All
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllTree}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                  >
                    - Collapse All
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openCreateCoa()}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Account</span>
              </button>
            </div>
          </div>

          {/* Group Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setCoaGroupFilter('ALL')}
              className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition ${
                coaGroupFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              All Groups ({coaList.length})
            </button>
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setCoaGroupFilter(g.id)}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition ${
                  coaGroupFilter === g.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {g.label} ({coaList.filter((a) => a.group === g.id).length})
              </button>
            ))}
          </div>

          {/* ================= A. TREE CHART VIEW ================= */}
          {coaViewMode === 'TREE' && (
            <div className="space-y-4">
              {GROUPS.map((g) => {
                if (coaGroupFilter !== 'ALL' && coaGroupFilter !== g.id) return null;
                const isGroupExpanded = expandedGroups[g.id] ?? true;
                const groupAccs = coaList.filter((a) => a.group === g.id);
                const matchingGroupAccs = groupAccs.filter((a) => !coaSearch.trim() || searchedIds.has(a.id));
                const gm = groupMetrics.find((m) => m.id === g.id);

                // Top level in group: either no parentId or parentId not in this group
                const topLevelAccs = matchingGroupAccs.filter(
                  (a) => !a.parentId || !groupAccs.some((p) => p.id === a.parentId)
                );

                return (
                  <div
                    key={g.id}
                    className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition"
                  >
                    {/* Group Header */}
                    <div className="p-3 bg-gradient-to-r from-[#070D1E] via-[#0B132B] to-[#070D1E] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div
                        onClick={() => toggleGroupExpand(g.id)}
                        className="flex items-center gap-2.5 cursor-pointer select-none"
                      >
                        <span className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                          {isGroupExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">{g.label}</h3>
                            <span className="text-[10px] text-slate-400 font-mono">({g.codeRange})</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${g.color}`}>
                              {g.id}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{g.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Net Group Balance</span>
                          <span className="text-sm font-black font-mono text-white">
                            {fmt(gm?.netBalance || 0)}{' '}
                            <span className="text-[10px] text-slate-400 font-bold">
                              {gm?.netType === 'DEBIT' ? 'Dr' : 'Cr'}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCreateCoa(undefined, g.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title={`Create new account under ${g.label}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add in Group</span>
                        </button>
                      </div>
                    </div>

                    {/* Group Accounts Hierarchy */}
                    {isGroupExpanded && (
                      <div className="p-3.5 space-y-2">
                        {topLevelAccs.length === 0 ? (
                          <div className="py-6 text-center text-slate-500 text-xs italic">
                            No accounts found in {g.label}. Click &quot;Add in Group&quot; to create one.
                          </div>
                        ) : (
                          topLevelAccs.map((parentAcc) => {
                            const children = groupAccs.filter((c) => c.parentId === parentAcc.id);
                            const hasChildren = children.length > 0;
                            const isParentExpanded = expandedParents[parentAcc.id] ?? true;

                            return (
                              <div key={parentAcc.id} className="space-y-2">
                                {/* Parent / Top-Level Node Card */}
                                <div
                                  className={`p-3 rounded-xl border transition-all ${
                                    parentAcc.isActive === false
                                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                                      : 'bg-[#070D1E] border-slate-800 hover:border-slate-700 shadow-xs'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      {hasChildren ? (
                                        <button
                                          type="button"
                                          onClick={() => toggleParentExpand(parentAcc.id)}
                                          className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer mt-0.5"
                                          title={isParentExpanded ? 'Collapse sub-accounts' : 'Expand sub-accounts'}
                                        >
                                          {isParentExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      ) : (
                                        <span className="p-1 rounded bg-slate-800/40 text-slate-600 mt-0.5">
                                          <Folder className="w-3.5 h-3.5" />
                                        </span>
                                      )}

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-slate-800 text-indigo-300 border border-slate-700">
                                            {parentAcc.code}
                                          </span>
                                          <h4 className="font-bold text-white text-xs truncate">{parentAcc.name}</h4>
                                          {parentAcc.isSystem && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold flex items-center gap-1">
                                              <Lock className="w-2.5 h-2.5" /> System
                                            </span>
                                          )}
                                          {parentAcc.isActive === false && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-bold">
                                              Inactive
                                            </span>
                                          )}
                                          <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-slate-800/80 text-slate-400 font-medium">
                                            {parentAcc.subType?.replace(/_/g, ' ') || 'GENERAL'}
                                          </span>
                                        </div>

                                        {parentAcc.description && (
                                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                            {parentAcc.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Balances & Action Toolbar */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                      <div className="text-right">
                                        <div className="text-xs font-mono font-black text-white">
                                          {fmt(parentAcc.closingBalance)}{' '}
                                          <span className="text-[10px] text-slate-400 font-bold">
                                            {parentAcc.closingType === 'DEBIT' ? 'Dr' : 'Cr'}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-mono flex items-center gap-1.5 justify-end mt-0.5">
                                          {parentAcc.transactionCount > 0 ? (
                                            <span
                                              className="px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-[9px] font-bold flex items-center gap-1 cursor-help"
                                              title={`${parentAcc.transactionCount} journal transactions posted`}
                                            >
                                              <ShieldCheck className="w-2.5 h-2.5" />
                                              {parentAcc.transactionCount} Vouchers
                                            </span>
                                          ) : (
                                            <span className="text-slate-500 text-[9px]">0 Vouchers</span>
                                          )}
                                          {hasChildren && (
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[9px] font-bold">
                                              {children.length} Sub-acc
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openCreateCoa(parentAcc.id, parentAcc.group)}
                                          className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500/60 text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                          title={`Add child sub-account under ${parentAcc.name}`}
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Sub</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStmtMode('ACCOUNT');
                                            setStmtAccountId(parentAcc.id);
                                            setSubTab('STATEMENT');
                                          }}
                                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-bold cursor-pointer"
                                          title="View Ledger Statement"
                                        >
                                          Statement
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditCoa(parentAcc)}
                                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                                          title="Edit Account"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCoa(parentAcc)}
                                          className={`p-1.5 rounded cursor-pointer transition ${
                                            parentAcc.isSystem ||
                                            parentAcc.transactionCount > 0 ||
                                            (parentAcc.childCount || 0) > 0 ||
                                            parentAcc.openingBalance > 0
                                              ? 'bg-slate-800/80 text-slate-500 hover:text-amber-300'
                                              : 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-400'
                                          }`}
                                          title={
                                            parentAcc.isSystem ||
                                            parentAcc.transactionCount > 0 ||
                                            (parentAcc.childCount || 0) > 0
                                              ? 'Deletion Prohibited (Click for details)'
                                              : 'Delete Account'
                                          }
                                        >
                                          {parentAcc.isSystem ||
                                          parentAcc.transactionCount > 0 ||
                                          (parentAcc.childCount || 0) > 0 ? (
                                            <Lock className="w-3.5 h-3.5" />
                                          ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Child Accounts Branch */}
                                {hasChildren && isParentExpanded && (
                                  <div className="border-l-2 border-indigo-600/40 ml-5 pl-3 space-y-2 mt-1.5">
                                    {children.map((childAcc) => (
                                      <div
                                        key={childAcc.id}
                                        className={`p-2.5 rounded-xl border transition-all ${
                                          childAcc.isActive === false
                                            ? 'bg-slate-900/30 border-slate-800/40 opacity-60'
                                            : 'bg-[#070D1E]/80 border-slate-800/80 hover:border-slate-700 shadow-xs'
                                        }`}
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-800 text-indigo-300 border border-slate-700">
                                              {childAcc.code}
                                            </span>
                                            <h5 className="font-bold text-white text-xs truncate">{childAcc.name}</h5>
                                            {childAcc.isSystem && (
                                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                                                System
                                              </span>
                                            )}
                                            {childAcc.isActive === false && (
                                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 font-bold">
                                                Inactive
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                            <div className="text-right">
                                              <span className="text-xs font-mono font-bold text-slate-200">
                                                {fmt(childAcc.closingBalance)}{' '}
                                                <span className="text-[10px] text-slate-400">
                                                  {childAcc.closingType === 'DEBIT' ? 'Dr' : 'Cr'}
                                                </span>
                                              </span>
                                              {childAcc.transactionCount > 0 ? (
                                                <span
                                                  className="ml-2 px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-[9px] font-bold"
                                                  title={`${childAcc.transactionCount} vouchers posted`}
                                                >
                                                  {childAcc.transactionCount} Vouchers
                                                </span>
                                              ) : (
                                                <span className="ml-2 text-slate-500 text-[9px]">0 Vouchers</span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setStmtMode('ACCOUNT');
                                                  setStmtAccountId(childAcc.id);
                                                  setSubTab('STATEMENT');
                                                }}
                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-bold cursor-pointer"
                                                title="View Ledger Statement"
                                              >
                                                Statement
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => openEditCoa(childAcc)}
                                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                                                title="Edit Sub-Account"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteCoa(childAcc)}
                                                className={`p-1 rounded cursor-pointer transition ${
                                                  childAcc.isSystem ||
                                                  childAcc.transactionCount > 0 ||
                                                  childAcc.openingBalance > 0
                                                    ? 'bg-slate-800/80 text-slate-500 hover:text-amber-300'
                                                    : 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-400'
                                                }`}
                                                title={
                                                  childAcc.isSystem || childAcc.transactionCount > 0
                                                    ? 'Deletion Prohibited (Click for details)'
                                                    : 'Delete Sub-Account'
                                                }
                                              >
                                                {childAcc.isSystem || childAcc.transactionCount > 0 ? (
                                                  <Lock className="w-3 h-3" />
                                                ) : (
                                                  <Trash2 className="w-3 h-3" />
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= B. TABLE VIEW ================= */}
          {coaViewMode === 'TABLE' && (
            <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-x-auto shadow-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800 font-bold">
                    <th className="p-3">Code</th>
                    <th className="p-3">Account Name &amp; Parent</th>
                    <th className="p-3">Group</th>
                    <th className="p-3">Sub-Type</th>
                    <th className="p-3 text-right">Opening</th>
                    <th className="p-3 text-right">Total Debit</th>
                    <th className="p-3 text-right">Total Credit</th>
                    <th className="p-3 text-right">Closing Balance</th>
                    <th className="p-3 text-center">Vouchers</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-medium">
                  {filteredCoa.map((acc) => {
                    const grpMeta = GROUPS.find((g) => g.id === acc.group);
                    const parentAccount = acc.parentId ? coaList.find((p) => p.id === acc.parentId) : null;
                    return (
                      <tr
                        key={acc.id}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          acc.isActive === false ? 'opacity-60 bg-slate-950/20' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-indigo-300">{acc.code}</td>
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            {acc.isSystem && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                                System
                              </span>
                            )}
                            {acc.isActive === false && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-bold">
                                Inactive
                              </span>
                            )}
                          </div>
                          {parentAccount && (
                            <div className="text-[10px] text-indigo-400 flex items-center gap-1 mt-0.5 font-mono">
                              <CornerDownRight className="w-3 h-3" /> Under: {parentAccount.code} — {parentAccount.name}
                            </div>
                          )}
                          {acc.description && <div className="text-[10px] text-slate-400 mt-0.5">{acc.description}</div>}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${grpMeta?.color || ''}`}>
                            {grpMeta?.label || acc.group}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-slate-400">
                          {acc.subType?.replace(/_/g, ' ') || 'General'}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">
                          {fmt(acc.openingBalance)} <span className="text-[9px]">{acc.openingType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-300">{fmt(acc.totalDebit)}</td>
                        <td className="p-3 text-right font-mono text-rose-300">{fmt(acc.totalCredit)}</td>
                        <td className="p-3 text-right font-mono font-black text-white">
                          {fmt(acc.closingBalance)}{' '}
                          <span className="text-[10px] text-slate-400 font-bold">
                            {acc.closingType === 'DEBIT' ? 'Dr' : 'Cr'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {acc.transactionCount > 0 ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 font-mono"
                              title={`${acc.transactionCount} journal transactions`}
                            >
                              {acc.transactionCount} Vouchers
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">0</span>
                          )}
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
                          <button
                            type="button"
                            onClick={() => handleDeleteCoa(acc)}
                            className={`p-1.5 rounded cursor-pointer transition ${
                              acc.isSystem || acc.transactionCount > 0 || (acc.childCount || 0) > 0 || acc.openingBalance > 0
                                ? 'bg-slate-800/80 text-slate-500 hover:text-amber-300'
                                : 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-400'
                            }`}
                            title={
                              acc.isSystem || acc.transactionCount > 0 || (acc.childCount || 0) > 0
                                ? 'Deletion Prohibited (Click for details)'
                                : 'Delete Account'
                            }
                          >
                            {acc.isSystem || acc.transactionCount > 0 || (acc.childCount || 0) > 0 ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= C. CREATE / EDIT ACCOUNT MODAL ================= */}
          {showCoaForm && (
            <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
              <div className="bg-[#0B132B] border border-indigo-500/40 text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <ListTree className="w-4 h-4 text-indigo-400" />
                      {editingCoa
                        ? `Edit Account: ${editingCoa.code} — ${editingCoa.name}`
                        : coaParentId
                        ? `Add Sub-Account under ${coaList.find((p) => p.id === coaParentId)?.name || 'Parent'}`
                        : 'Create New Chart of Accounts Ledger'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Configure ledger classification, hierarchy parent, opening balance, and active status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoaForm(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveCoa} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-bold">Account Code *</label>
                        {!editingCoa && (
                          <button
                            type="button"
                            onClick={() => {
                              // Suggest next code in group
                              const prefixMap: Record<AccountGroup, string> = {
                                ASSET: '1',
                                LIABILITY: '2',
                                EQUITY: '3',
                                INCOME: '4',
                                EXPENSE: '5',
                              };
                              const grpPrefix = prefixMap[coaGroup] || '5';
                              const existingCodes = coaList
                                .map((a) => parseInt(a.code, 10))
                                .filter((n) => !Number.isNaN(n) && String(n).startsWith(grpPrefix));
                              const maxVal = existingCodes.length > 0 ? Math.max(...existingCodes) : parseInt(`${grpPrefix}000`, 10);
                              setCoaCode(String(maxVal + 10));
                            }}
                            className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                          >
                            ⚡ Auto-Sequence Code
                          </button>
                        )}
                      </div>
                      <input
                        required
                        value={coaCode}
                        onChange={(e) => setCoaCode(e.target.value)}
                        placeholder="e.g. 1020 or 5210"
                        className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-mono uppercase font-bold focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Account Name *</label>
                      <input
                        required
                        value={coaName}
                        onChange={(e) => setCoaName(e.target.value)}
                        placeholder="e.g. HDFC Current Account / Factory Power"
                        className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-bold focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Financial Pillar Group *</label>
                      <select
                        disabled={Boolean(editingCoa?.isSystem)}
                        value={coaGroup}
                        onChange={(e) => {
                          const g = e.target.value as AccountGroup;
                          setCoaGroup(g);
                          setCoaOpeningType(g === 'ASSET' || g === 'EXPENSE' ? 'DEBIT' : 'CREDIT');
                          const availableSubtypes = SUBTYPES_BY_GROUP[g] || [];
                          if (availableSubtypes.length > 0) {
                            setCoaSubType(availableSubtypes[0].id);
                          }
                          setCoaParentId('');
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-bold cursor-pointer"
                      >
                        {GROUPS.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label} ({g.codeRange})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Account Sub-Type *</label>
                      <select
                        value={coaSubType}
                        onChange={(e) => setCoaSubType(e.target.value as AccountSubType)}
                        className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-bold cursor-pointer"
                      >
                        {(SUBTYPES_BY_GROUP[coaGroup] || []).map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Parent Account Selector */}
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">
                      Parent Account Hierarchy (Optional - for Sub-Accounts)
                    </label>
                    <select
                      value={coaParentId}
                      onChange={(e) => setCoaParentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-indigo-300 font-semibold cursor-pointer"
                    >
                      <option value="">-- None (Top-Level Account in {GROUPS.find((g) => g.id === coaGroup)?.label}) --</option>
                      {coaList
                        .filter((a) => a.group === coaGroup && (!editingCoa || a.id !== editingCoa.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      💡 Selecting a parent nests this account as a child in the Tree Chart View.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Opening Balance (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={coaOpening}
                        onChange={(e) => setCoaOpening(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Opening Balance Side (Dr / Cr)</label>
                      <select
                        value={coaOpeningType}
                        onChange={(e) => setCoaOpeningType(e.target.value as BalanceSide)}
                        className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-bold cursor-pointer"
                      >
                        <option value="DEBIT">Debit (Dr - Normal for Assets &amp; Expenses)</option>
                        <option value="CREDIT">Credit (Cr - Normal for Liabilities, Equity &amp; Income)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Description / Purpose</label>
                    <input
                      value={coaDesc}
                      onChange={(e) => setCoaDesc(e.target.value)}
                      placeholder="Optional notes regarding this ledger account"
                      className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-bold select-none">
                      <input
                        type="checkbox"
                        checked={coaIsActive}
                        onChange={(e) => setCoaIsActive(e.target.checked)}
                        className="rounded cursor-pointer"
                      />
                      <span>Active Account (Visible in Voucher Entry Dropdowns)</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCoaForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {busy ? 'Saving...' : editingCoa ? 'Save Changes' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= D. PROTECTED DELETION BLOCK DIALOG ================= */}
          {blockedDeleteAccount && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
              <div className="bg-[#0B132B] border border-rose-500/60 text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 bg-gradient-to-r from-rose-950 via-[#0B132B] to-[#070D1E] border-b border-rose-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-rose-400 font-black text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>Account Deletion Prohibited</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockedDeleteAccount(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Target Account:</div>
                    <div className="text-sm font-black text-white font-mono flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                        {blockedDeleteAccount.code}
                      </span>
                      <span>{blockedDeleteAccount.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                      <span>Group: <strong className="text-white">{blockedDeleteAccount.group}</strong></span>
                      <span>Closing: <strong className="text-white font-mono">{fmt(blockedDeleteAccount.closingBalance)} {blockedDeleteAccount.closingType}</strong></span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 space-y-2">
                    <h5 className="font-bold text-rose-300 flex items-center gap-1.5">
                      <Ban className="w-4 h-4 shrink-0" />
                      Double-Entry Accounting Protection Rule
                    </h5>
                    <p className="text-[11px] leading-relaxed">
                      Under statutory accounting standards, an account with recorded transactions or active dependencies cannot be deleted. Deleting it would orphan journal lines, corrupt historic Trial Balances, and invalidate financial reports.
                    </p>
                    <div className="space-y-1 pt-1 text-[11px] text-rose-300 font-mono">
                      {blockedDeleteAccount.isSystem && (
                        <div className="flex items-center gap-1.5">
                          <span>•</span>
                          <span>Core System Control Account (permanent system dependency).</span>
                        </div>
                      )}
                      {blockedDeleteAccount.transactionCount > 0 && (
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>•</span>
                          <span>{blockedDeleteAccount.transactionCount} posted journal voucher(s) are recorded in the general ledger.</span>
                        </div>
                      )}
                      {(blockedDeleteAccount.childCount || 0) > 0 && (
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>•</span>
                          <span>{blockedDeleteAccount.childCount} child sub-account(s) are attached to this parent account.</span>
                        </div>
                      )}
                      {blockedDeleteAccount.openingBalance > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>•</span>
                          <span>Opening balance of ₹{blockedDeleteAccount.openingBalance.toLocaleString('en-IN')} is present.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-emerald-300 block mb-0.5">Recommended Alternative: Deactivate Account</strong>
                    Deactivating this account preserves all historical ledger statements while hiding it from future Sales Invoices, Purchase Bills, and Journal dropdowns.
                  </div>
                </div>

                <div className="p-4 bg-[#070D1E] border-t border-slate-800 flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockedDeleteAccount(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel / Keep Active
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDeactivateAccount(blockedDeleteAccount)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Deactivate Account Instead</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
