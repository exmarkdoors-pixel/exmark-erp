'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ReceiptIndianRupee,
  Phone,
  MapPin,
  Clock,
  Printer,
  X,
  Plus,
  MessageSquare,
  Building2,
  UserCheck,
  TrendingUp,
  FileText,
  AlertCircle,
  RefreshCw,
  Landmark,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Customer } from '@/lib/services/customerService';
import { apiFetch } from '@/lib/api/apiClient';
import { buildWhatsAppUrl } from '@/lib/services/whatsappService';

interface CustomerCreditLedgerViewProps {
  customers: Customer[];
  onRefresh: () => void;
  onEditCustomer: (customer: Customer) => void;
}

interface SalesStaffOption {
  id: string;
  name: string;
  employeeCode: string;
  department?: string;
  role?: string;
}

interface CashBankAccountOption {
  id: string;
  name: string;
  accountType: string;
  bankName?: string;
}

interface AccountStatementRow {
  date: string;
  voucherNumber: string;
  sourceType: string;
  particulars: string;
  reference?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: 'DEBIT' | 'CREDIT';
}

interface StatementData {
  partyName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  openingBalanceType: 'DEBIT' | 'CREDIT';
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: 'DEBIT' | 'CREDIT';
  lines: AccountStatementRow[];
}

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function CustomerCreditLedgerView({
  customers,
  onRefresh,
  onEditCustomer,
}: CustomerCreditLedgerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'EXCEEDED' | 'CLEAR'>('ALL');
  const [salesStaffList, setSalesStaffList] = useState<SalesStaffOption[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccountOption[]>([]);

  // Quick Payment In modal state
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentSalespersonId, setPaymentSalespersonId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Statement modal state
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  // Load Sales staff and Cash/Bank accounts on mount
  useEffect(() => {
    apiFetch('/api/employees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSalesStaffList(
            json.data.map((e: any) => ({
              id: e.id,
              name: e.name,
              employeeCode: e.employeeCode || e.code || 'EMP',
              department: e.department,
              role: e.role,
            }))
          );
        }
      })
      .catch(() => {});

    apiFetch('/api/accounting/cash-bank')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.accounts)) {
          setCashBankAccounts(
            json.data.accounts.map((a: any) => ({
              id: a.id,
              name: a.name,
              accountType: a.accountType,
              bankName: a.bankName,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Filter customers based on search, salesman, and credit balance health
  const filtered = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (c.name?.toLowerCase().includes(q)) ||
      (c.firmName?.toLowerCase().includes(q)) ||
      (c.town?.toLowerCase().includes(q)) ||
      (c.district?.toLowerCase().includes(q)) ||
      (c.phone?.includes(q)) ||
      (c.salespersonName?.toLowerCase().includes(q));

    const matchesSalesperson =
      salespersonFilter === 'ALL' ||
      (salespersonFilter === 'DIRECT' && !c.salespersonId) ||
      c.salespersonId === salespersonFilter;

    const outstanding = Number(c.outstandingBalance || 0);
    const limit = Number(c.creditLimit || 0);
    const isExceeded = limit > 0 && outstanding > limit;

    let matchesStatus = true;
    if (statusFilter === 'PENDING') matchesStatus = outstanding > 0;
    else if (statusFilter === 'EXCEEDED') matchesStatus = isExceeded;
    else if (statusFilter === 'CLEAR') matchesStatus = outstanding <= 0;

    return matchesSearch && matchesSalesperson && matchesStatus;
  });

  // KPI Calculations across current filtered dataset
  const totalOutstanding = filtered.reduce((s, c) => s + Math.max(0, Number(c.outstandingBalance || 0)), 0);
  const totalCreditLimit = filtered.reduce((s, c) => s + Number(c.creditLimit || 0), 0);
  const exceededCount = filtered.filter((c) => {
    const limit = Number(c.creditLimit || 0);
    return limit > 0 && Number(c.outstandingBalance || 0) > limit;
  }).length;
  const pendingCount = filtered.filter((c) => Number(c.outstandingBalance || 0) > 0).length;

  // Open Quick Payment In Modal
  const handleOpenPaymentIn = (cust: Customer) => {
    setPaymentCustomer(cust);
    const due = Math.max(0, Number(cust.outstandingBalance || 0));
    setPaymentAmount(due > 0 ? due.toString() : '');
    setPaymentMode('UPI');
    setPaymentSalespersonId(cust.salespersonId || '');
    setPaymentAccountId(cashBankAccounts[0]?.id || '');
    setPaymentRefNumber('');
    setPaymentNotes(`Settlement against outstanding balance for ${cust.name}`);
    setPaymentBanner(null);
  };

  // Submit Quick Payment In
  const handleConfirmPaymentIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentBanner({ type: 'err', text: 'Please enter a valid positive payment amount.' });
      return;
    }

    const selectedStaff = salesStaffList.find((s) => s.id === paymentSalespersonId);
    const selectedBank = cashBankAccounts.find((b) => b.id === paymentAccountId) || cashBankAccounts[0];

    setIsSubmittingPayment(true);
    setPaymentBanner(null);
    try {
      const res = await apiFetch('/api/accounting/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'PAYMENT_IN',
          customerId: paymentCustomer.id,
          customerName: paymentCustomer.name,
          cashBankAccountId: selectedBank?.id || 'cash-counter',
          paymentMode,
          amount: amt,
          referenceNumber: paymentRefNumber.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          salespersonId: selectedStaff?.id || undefined,
          salespersonName: selectedStaff?.name || undefined,
          salespersonCode: selectedStaff?.employeeCode || undefined,
          collectionType: paymentMode === 'CASH' ? 'CASH_IN_HAND' : 'DIRECT_BANK',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record payment receipt');
      }

      setPaymentBanner({ type: 'ok', text: `Receipt recorded successfully! ${json.message || ''}` });
      setTimeout(() => {
        setPaymentCustomer(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setPaymentBanner({ type: 'err', text: err.message || 'Error recording payment receipt' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Customer Statement Modal
  const handleOpenStatement = async (cust: Customer) => {
    setStatementCustomer(cust);
    setIsLoadingStatement(true);
    setStatementData(null);
    try {
      const qs = new URLSearchParams({
        mode: 'PARTY',
        partyType: 'CUSTOMER',
        partyName: cust.name,
      });
      const res = await apiFetch(`/api/accounting/statement?${qs.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setStatementData(json.data);
      }
    } catch {
      // Failed to load statement
    } finally {
      setIsLoadingStatement(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Outstanding</span>
            <ReceiptIndianRupee className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {fmt(totalOutstanding)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Across {pendingCount} customer accounts
          </span>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Credit Limit Exceeded</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {exceededCount} Clients
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Immediate recovery action needed
          </span>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Credit Extended</span>
            <CreditCard className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {fmt(totalCreditLimit)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Approved client credit lines
          </span>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Credit Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {filtered.length - exceededCount} / {filtered.length}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Accounts within credit tolerance
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, firm, town, district, or assigned salesman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Salesman Filter */}
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="ALL">All Sales Executives</option>
              <option value="DIRECT">Direct / House (Unassigned)</option>
              {salesStaffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.employeeCode || 'Sales'})
                </option>
              ))}
            </select>
          </div>

          {/* Credit Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-sky-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="ALL">All Credit Health</option>
              <option value="PENDING">Pending Dues (&gt; ₹0)</option>
              <option value="EXCEEDED">Limit Exceeded</option>
              <option value="CLEAR">Zero Balance / Cleared</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Refresh customer balances"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Credit Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#070D1E] text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3">Customer / Firm</th>
                <th className="p-3">Assigned Salesman</th>
                <th className="p-3">Location &amp; Phone</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Outstanding Due</th>
                <th className="p-3 text-center">Credit Usage</th>
                <th className="p-3 text-center">Terms</th>
                <th className="p-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No matching customer credit accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const outstanding = Number(c.outstandingBalance || 0);
                  const limit = Number(c.creditLimit || 0);
                  const isExceeded = limit > 0 && outstanding > limit;
                  const usagePercent = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      {/* Customer / Firm */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {c.name}
                        </div>
                        {c.firmName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.firmName}
                          </div>
                        )}
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-block mt-0.5">
                          {c.type}
                        </span>
                      </td>

                      {/* Assigned Salesman */}
                      <td className="p-3">
                        {c.salespersonName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {c.salespersonName.charAt(0)}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                                {c.salespersonName}
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">
                                {c.salespersonCode || 'SALES'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Direct / House
                          </span>
                        )}
                      </td>

                      {/* Location & Phone */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{c.town}, {c.district}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      </td>

                      {/* Credit Limit */}
                      <td className="p-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {fmt(limit)}
                      </td>

                      {/* Outstanding Due Balance */}
                      <td className="p-3 text-right">
                        <div
                          className={`font-mono font-black text-xs ${
                            outstanding <= 0
                              ? 'text-emerald-500'
                              : isExceeded
                              ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                              : 'text-amber-500'
                          }`}
                        >
                          {fmt(outstanding)}
                        </div>
                        {isExceeded && (
                          <span className="text-[9px] font-bold text-rose-500 block uppercase">
                            Limit Exceeded
                          </span>
                        )}
                      </td>

                      {/* Credit Usage Progress Bar */}
                      <td className="p-3">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-400">
                            <span>{usagePercent}%</span>
                            <span>{limit > 0 ? fmt(limit) : 'Open'}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExceeded
                                  ? 'bg-rose-500'
                                  : usagePercent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Terms */}
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {c.creditPeriodDays ? `${c.creditPeriodDays}d` : '30d'}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1-Click Payment In Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentIn(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer"
                            title={`Record Payment In collection for ${c.name}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Payment In</span>
                          </button>

                          {/* Customer Ledger Statement */}
                          <button
                            type="button"
                            onClick={() => handleOpenStatement(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                            title="View Running Customer Ledger Statement"
                          >
                            <FileText className="w-3 h-3 text-sky-500" />
                            <span>Statement</span>
                          </button>

                          {/* WhatsApp Reminder */}
                          <a
                            href={buildWhatsAppUrl(
                              c.phone,
                              `Dear ${c.name}, Greetings from EXMARK DOORS Kerala.\nYour current outstanding balance is ${fmt(outstanding)}.\nKindly clear the pending payment at your earliest convenience to maintain uninterrupted dispatch.\nBank details: HDFC Bank, EXMARK DOORS PVT LTD.\nThank you!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition"
                            title="Send WhatsApp payment reminder"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>

                          {/* Edit Customer / Assign Salesman */}
                          <button
                            type="button"
                            onClick={() => onEditCustomer(c)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Edit customer credit limit or salesman"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PAYMENT IN MODAL */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ReceiptIndianRupee className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Record Payment In
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Collection from <strong className="text-slate-900 dark:text-white">{paymentCustomer.name}</strong> ({paymentCustomer.town})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentBanner && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  paymentBanner.type === 'ok'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}
              >
                {paymentBanner.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{paymentBanner.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPaymentIn} className="space-y-3.5 text-xs">
              {/* Outstanding Due Highlight */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Current Outstanding Due
                  </span>
                  <span className="text-base font-black font-mono text-rose-500">
                    {fmt(Number(paymentCustomer.outstandingBalance || 0))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(paymentCustomer.outstandingBalance || 0))}
                  className="px-2.5 py-1 bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Pay Full Balance
                </button>
              </div>

              {/* Amount & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Receipt Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="UPI">UPI / GPay / QR</option>
                    <option value="NEFT">Bank NEFT / RTGS</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>
              </div>

              {/* Salesman Attribution & Cash/Bank Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>Collected By (Salesman)</span>
                  </label>
                  <select
                    value={paymentSalespersonId}
                    onChange={(e) => setPaymentSalespersonId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Direct / House (None)</option>
                    {salesStaffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employeeCode || 'Sales'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                    <Landmark className="w-3.5 h-3.5 text-sky-500" />
                    <span>Deposited Account</span>
                  </label>
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                  >
                    {cashBankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.accountType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference / UTR Number & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Reference / UTR #
                  </label>
                  <input
                    type="text"
                    value={paymentRefNumber}
                    onChange={(e) => setPaymentRefNumber(e.target.value)}
                    placeholder="e.g. UTR-49382049"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Voucher Narration
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmittingPayment ? 'Saving Receipt...' : 'Confirm Payment In'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER STATEMENT / PASSBOOK MODAL */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Customer Ledger Statement
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Party: <strong className="text-slate-900 dark:text-white">{statementCustomer.name}</strong> ({statementCustomer.town}, {statementCustomer.district})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatementCustomer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isLoadingStatement ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Loading customer statement ledger...
              </div>
            ) : !statementData || statementData.lines.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No ledger transactions found for {statementCustomer.name}.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                {/* Statement Summary Strip */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Invoiced (Dr)</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {fmt(statementData.totalDebit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Received (Cr)</span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      {fmt(statementData.totalCredit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Closing Due Balance</span>
                    <span className="text-xs font-mono font-black text-rose-500">
                      {fmt(statementData.closingBalance)}
                    </span>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#070D1E] text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Voucher #</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Particulars</th>
                        <th className="p-2.5 text-right">Debit (₹)</th>
                        <th className="p-2.5 text-right">Credit (₹)</th>
                        <th className="p-2.5 text-right">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                      {statementData.lines.map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="p-2.5 text-slate-500 font-sans">{l.date}</td>
                          <td className="p-2.5 font-bold text-sky-400">{l.voucherNumber}</td>
                          <td className="p-2.5 text-[10px] font-sans text-slate-400">{l.sourceType}</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200 font-sans max-w-xs truncate">{l.particulars}</td>
                          <td className="p-2.5 text-right text-slate-900 dark:text-white font-bold">{l.debit > 0 ? fmt(l.debit) : '-'}</td>
                          <td className="p-2.5 text-right text-emerald-400 font-bold">{l.credit > 0 ? fmt(l.credit) : '-'}</td>
                          <td className="p-2.5 text-right font-black text-rose-400">{fmt(l.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
