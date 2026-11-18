'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReceiptText,
  ArrowDownCircle,
  RotateCcw,
  Coins,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  AccountingPaymentMode,
  CashBankAccountWithBalance,
  ChartOfAccountWithBalance,
  OtherIncomeRecord,
  PaymentInRecord,
  SalesInvoiceRecord,
  SalesReturnCreditNoteRecord,
} from '@/types/accounting';

interface AccountingSalesSectionProps {
  accounts: ChartOfAccountWithBalance[];
  cashBankAccounts: CashBankAccountWithBalance[];
  onDataChanged: () => void;
  gstEnabled?: boolean;
}

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AccountingSalesSection({
  accounts,
  cashBankAccounts,
  onDataChanged,
  gstEnabled = false,
}: AccountingSalesSectionProps) {
  const [subTab, setSubTab] = useState<'INVOICES' | 'PAYMENT_IN' | 'CREDIT_NOTE' | 'OTHER_INCOME'>('INVOICES');
  const [invoices, setInvoices] = useState<SalesInvoiceRecord[]>([]);
  const [paymentsIn, setPaymentsIn] = useState<PaymentInRecord[]>([]);
  const [creditNotes, setCreditNotes] = useState<SalesReturnCreditNoteRecord[]>([]);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncomeRecord[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string; gstNumber?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<{ title: string; number: string; date: string; party: string; rows: Array<[string, string]>; total: number; notes?: string } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Invoice form
  const [invCustomer, setInvCustomer] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [invGstin, setInvGstin] = useState('');
  const [invDate, setInvDate] = useState(today);
  const [invDueDate, setInvDueDate] = useState(today);
  const [invOrderRef, setInvOrderRef] = useState('');
  const [invGstRate, setInvGstRate] = useState(gstEnabled ? 18 : 0);
  const [invGstMode, setInvGstMode] = useState<'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT'>(gstEnabled ? 'INTRA_STATE' : 'EXEMPT');
  const [invNotes, setInvNotes] = useState('');
  const [invItems, setInvItems] = useState<Array<{ description: string; hsnCode: string; qty: number; rate: number }>>([
    { description: 'FRP Molded Door with Chowkhat Frame', hsnCode: '', qty: 1, rate: 8500 },
  ]);

  // Payment In form
  const [pinCustomer, setPinCustomer] = useState('');
  const [pinInvoiceId, setPinInvoiceId] = useState('');
  const [pinDate, setPinDate] = useState(today);
  const [pinAmount, setPinAmount] = useState('');
  const [pinCashBankId, setPinCashBankId] = useState(cashBankAccounts[0]?.id || 'cb-cash-main');
  const [pinMode, setPinMode] = useState<AccountingPaymentMode>('UPI');
  const [pinRef, setPinRef] = useState('');
  const [pinNotes, setPinNotes] = useState('');

  // Credit Note form
  const [cnCustomer, setCnCustomer] = useState('');
  const [cnInvoiceId, setCnInvoiceId] = useState('');
  const [cnDate, setCnDate] = useState(today);
  const [cnReason, setCnReason] = useState('Door Size / Transit Return');
  const [cnSubtotal, setCnSubtotal] = useState('');
  const [cnGstRate, setCnGstRate] = useState(gstEnabled ? 18 : 0);
  const [cnGstMode, setCnGstMode] = useState<'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT'>(gstEnabled ? 'INTRA_STATE' : 'EXEMPT');
  const [cnNotes, setCnNotes] = useState('');

  // Other Income form
  const incomeAccounts = accounts.filter((a) => a.group === 'INCOME' && a.subType !== 'SALES_RETURN');
  const [oiAccountId, setOiAccountId] = useState(incomeAccounts.find((a) => a.subType === 'OTHER_INCOME')?.id || incomeAccounts[0]?.id || '');
  const [oiCashBankId, setOiCashBankId] = useState(cashBankAccounts[0]?.id || 'cb-cash-main');
  const [oiDate, setOiDate] = useState(today);
  const [oiFrom, setOiFrom] = useState('');
  const [oiAmount, setOiAmount] = useState('');
  const [oiMode, setOiMode] = useState<AccountingPaymentMode>('CASH');
  const [oiRef, setOiRef] = useState('');
  const [oiNotes, setOiNotes] = useState('');

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const loadSalesData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, custRes] = await Promise.all([
        apiFetch('/api/accounting/sales').then((r) => r.json()),
        apiFetch('/api/customers').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (salesRes?.success && salesRes.data) {
        setInvoices(salesRes.data.salesInvoices || []);
        setPaymentsIn(salesRes.data.paymentsIn || []);
        setCreditNotes(salesRes.data.creditNotes || []);
        setOtherIncomes(salesRes.data.otherIncomes || []);
      }
      if (custRes?.success && Array.isArray(custRes.data)) {
        setCustomers(custRes.data);
      }
    } catch {
      notify('err', 'Failed to load Sales accounting records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  useEffect(() => {
    if (cashBankAccounts.length > 0 && !cashBankAccounts.some((c) => c.id === pinCashBankId)) {
      setPinCashBankId(cashBankAccounts[0].id);
      setOiCashBankId(cashBankAccounts[0].id);
    }
  }, [cashBankAccounts, pinCashBankId]);

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'SALES_INVOICE',
          customerName: invCustomer,
          customerPhone: invPhone,
          customerGstin: invGstin,
          date: invDate,
          dueDate: invDueDate,
          orderRef: invOrderRef,
          items: invItems,
          gstRate: invGstRate,
          gstMode: invGstMode,
          notes: invNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not create invoice');
      notify('ok', json.message || 'Sales Invoice created.');
      setShowForm(false);
      setInvCustomer('');
      setInvPhone('');
      setInvOrderRef('');
      setInvNotes('');
      await loadSalesData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePaymentIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'PAYMENT_IN',
          customerName: pinCustomer,
          invoiceId: pinInvoiceId || undefined,
          date: pinDate,
          cashBankAccountId: pinCashBankId,
          paymentMode: pinMode,
          amount: Number(pinAmount),
          referenceNumber: pinRef,
          notes: pinNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not record payment');
      notify('ok', json.message || 'Payment In recorded.');
      setShowForm(false);
      setPinAmount('');
      setPinRef('');
      setPinNotes('');
      await loadSalesData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'CREDIT_NOTE',
          customerName: cnCustomer,
          invoiceId: cnInvoiceId || undefined,
          date: cnDate,
          reason: cnReason,
          subtotal: Number(cnSubtotal),
          gstRate: cnGstRate,
          gstMode: cnGstMode,
          notes: cnNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not issue credit note');
      notify('ok', json.message || 'Sales Return / Credit Note issued.');
      setShowForm(false);
      setCnSubtotal('');
      setCnNotes('');
      await loadSalesData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to issue credit note');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveOtherIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'OTHER_INCOME',
          incomeAccountId: oiAccountId || undefined,
          cashBankAccountId: oiCashBankId,
          date: oiDate,
          receivedFrom: oiFrom,
          amount: Number(oiAmount),
          paymentMode: oiMode,
          referenceNumber: oiRef,
          notes: oiNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not record other income');
      notify('ok', json.message || 'Other Income recorded.');
      setShowForm(false);
      setOiFrom('');
      setOiAmount('');
      setOiRef('');
      setOiNotes('');
      await loadSalesData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to save other income');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (kind: string, id: string) => {
    if (!confirm('Delete this accounting voucher and reverse its double-entry journal?')) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/sales?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Deleted cleanly.');
      await loadSalesData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const invSubtotalPreview = invItems.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const invTaxPreview = !gstEnabled || invGstMode === 'EXEMPT' ? 0 : (invSubtotalPreview * (Number(invGstRate) || 0)) / 100;

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            banner.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070D1E] p-2.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'INVOICES', label: `${gstEnabled ? 'Sales Invoice' : 'Sales Entry'} (${invoices.length})`, Icon: ReceiptText },
            { id: 'PAYMENT_IN', label: `Payment In (${paymentsIn.length})`, Icon: ArrowDownCircle },
            { id: 'CREDIT_NOTE', label: `Sales Return / Credit Note (${creditNotes.length})`, Icon: RotateCcw },
            { id: 'OTHER_INCOME', label: `Other Income (${otherIncomes.length})`, Icon: Coins },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSubTab(id as typeof subTab);
                setShowForm(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                subTab === id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>
            {subTab === 'INVOICES'
              ? gstEnabled ? 'New Sales Invoice' : 'New Sales Entry'
              : subTab === 'PAYMENT_IN'
              ? 'Record Payment In'
              : subTab === 'CREDIT_NOTE'
              ? 'Issue Credit Note'
              : 'Add Other Income'}
          </span>
        </button>
      </div>

      {/* Forms */}
      {showForm && subTab === 'INVOICES' && (
        <form onSubmit={handleSaveInvoice} className="bg-[#0B132B] border border-emerald-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">
              {gstEnabled ? 'Create Sales Invoice (Auto-Posts Receivable & GST Journal)' : 'Record Direct Sales Entry (Non-GST • Auto-Posts Ledger Journal)'}
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Customer Name *</label>
              <input
                list="acc-sales-customers"
                required
                value={invCustomer}
                onChange={(e) => {
                  const val = e.target.value;
                  setInvCustomer(val);
                  const found = customers.find((c) => c.name === val);
                  if (found) {
                    setInvPhone(found.phone || '');
                    setInvGstin(found.gstNumber || '');
                  }
                }}
                placeholder="Select or enter customer..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <datalist id="acc-sales-customers">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Invoice Date</label>
              <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Due Date</label>
              <input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Order / Quote Ref</label>
              <input value={invOrderRef} onChange={(e) => setInvOrderRef(e.target.value)} placeholder="SO-2026-001" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300">{gstEnabled ? 'Invoice Line Items' : 'Sales Line Items'}</span>
              <button
                type="button"
                onClick={() => setInvItems((prev) => [...prev, { description: '', hsnCode: '', qty: 1, rate: 0 }])}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold cursor-pointer"
              >
                + Add Line
              </button>
            </div>
            {invItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  required
                  value={item.description}
                  onChange={(e) => setInvItems((prev) => prev.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))}
                  placeholder="Door model / item description"
                  className={`${gstEnabled ? 'col-span-5' : 'col-span-7'} px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white`}
                />
                {gstEnabled && (
                  <input
                    value={item.hsnCode}
                    onChange={(e) => setInvItems((prev) => prev.map((r, i) => (i === idx ? { ...r, hsnCode: e.target.value } : r)))}
                    placeholder="HSN"
                    className="col-span-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                )}
                <input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(e) => setInvItems((prev) => prev.map((r, i) => (i === idx ? { ...r, qty: Number(e.target.value) || 0 } : r)))}
                  className="col-span-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-right"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => setInvItems((prev) => prev.map((r, i) => (i === idx ? { ...r, rate: Number(e.target.value) || 0 } : r)))}
                  className="col-span-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-right"
                />
                <button
                  type="button"
                  disabled={invItems.length <= 1}
                  onClick={() => setInvItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="col-span-1 p-1.5 text-rose-400 hover:bg-rose-500/15 rounded disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800 items-end">
            {gstEnabled ? (
              <>
                <div>
                  <label className="text-slate-400 block mb-1">GST Mode</label>
                  <select value={invGstMode} onChange={(e) => setInvGstMode(e.target.value as typeof invGstMode)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value="INTRA_STATE">Intra-State (CGST + SGST)</option>
                    <option value="INTER_STATE">Inter-State (IGST)</option>
                    <option value="EXEMPT">No GST / Exempt (0%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GST Rate %</label>
                  <select value={invGstRate} onChange={(e) => setInvGstRate(Number(e.target.value))} disabled={invGstMode === 'EXEMPT'} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (FRP/WPC Doors)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="md:col-span-2 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                <strong className="text-emerald-400">Direct Non-GST Sales Mode:</strong> Pure net amount recorded directly to Sales &amp; Receivables (no GST tax billing).
              </div>
            )}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-right">
              {gstEnabled && <div className="text-[10px] text-slate-400">Subtotal: {fmt(invSubtotalPreview)} • Tax: {fmt(invTaxPreview)}</div>}
              <div className="text-sm font-black text-emerald-400">Net Total: {fmt(invSubtotalPreview + invTaxPreview)}</div>
            </div>
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50">
              {busy ? 'Saving...' : gstEnabled ? 'Save & Post Sales Invoice' : 'Save Sales Entry'}
            </button>
          </div>
        </form>
      )}

      {showForm && subTab === 'PAYMENT_IN' && (
        <form onSubmit={handleSavePaymentIn} className="bg-[#0B132B] border border-emerald-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">Record Payment In (Customer Receipt)</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Against Invoice (Optional)</label>
              <select
                value={pinInvoiceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPinInvoiceId(id);
                  const inv = invoices.find((i) => i.id === id);
                  if (inv) {
                    setPinCustomer(inv.customerName);
                    setPinAmount(String(inv.balanceAmount));
                  }
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                <option value="">-- On-Account / Direct Receipt --</option>
                {invoices.filter((i) => i.balanceAmount > 0).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customerName} (Due {fmt(inv.balanceAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Customer Name *</label>
              <input required list="acc-sales-customers" value={pinCustomer} onChange={(e) => setPinCustomer(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Receipt Date</label>
              <input type="date" value={pinDate} onChange={(e) => setPinDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Deposit To Cash / Bank *</label>
              <select value={pinCashBankId} onChange={(e) => setPinCashBankId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {cashBankAccounts.map((cb) => (
                  <option key={cb.id} value={cb.id}>{cb.name} ({cb.accountType})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Payment Mode</label>
              <select value={pinMode} onChange={(e) => setPinMode(e.target.value as AccountingPaymentMode)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {(['UPI', 'CASH', 'NEFT', 'RTGS', 'CHEQUE', 'CARD'] as AccountingPaymentMode[]).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Amount Received (₹) *</label>
              <input type="number" step="0.01" min={1} required value={pinAmount} onChange={(e) => setPinAmount(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">UTR / Cheque / Reference #</label>
              <input value={pinRef} onChange={(e) => setPinRef(e.target.value)} placeholder="UPI Ref / Cheque #" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <div className="flex-1">
                <label className="text-slate-400 block mb-1">Notes</label>
                <input value={pinNotes} onChange={(e) => setPinNotes(e.target.value)} placeholder="Optional notes" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              </div>
              <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
                {busy ? 'Saving...' : 'Save Payment In'}
              </button>
            </div>
          </div>
        </form>
      )}

      {showForm && subTab === 'CREDIT_NOTE' && (
        <form onSubmit={handleSaveCreditNote} className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">Issue Sales Return / Credit Note</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Original Invoice (Optional)</label>
              <select
                value={cnInvoiceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCnInvoiceId(id);
                  const inv = invoices.find((i) => i.id === id);
                  if (inv) {
                    setCnCustomer(inv.customerName);
                    setCnGstRate(inv.gstRate);
                    setCnGstMode(inv.gstMode);
                  }
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                <option value="">-- Standalone Credit Note --</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.customerName} ({fmt(inv.totalAmount)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Customer Name *</label>
              <input required list="acc-sales-customers" value={cnCustomer} onChange={(e) => setCnCustomer(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Credit Note Date</label>
              <input type="date" value={cnDate} onChange={(e) => setCnDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Return Reason *</label>
              <input required value={cnReason} onChange={(e) => setCnReason(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{gstEnabled ? 'Taxable Credit Amount (₹) *' : 'Return / Credit Amount (₹) *'}</label>
              <input type="number" step="0.01" min={1} required value={cnSubtotal} onChange={(e) => setCnSubtotal(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
            </div>
            {gstEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">GST Mode</label>
                  <select value={cnGstMode} onChange={(e) => setCnGstMode(e.target.value as typeof cnGstMode)} className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value="INTRA_STATE">CGST+SGST</option>
                    <option value="INTER_STATE">IGST</option>
                    <option value="EXEMPT">0%</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GST %</label>
                  <input type="number" value={cnGstRate} onChange={(e) => setCnGstRate(Number(e.target.value))} disabled={cnGstMode === 'EXEMPT'} className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
              </div>
            )}
            <div className="md:col-span-3 flex items-end gap-2">
              <input value={cnNotes} onChange={(e) => setCnNotes(e.target.value)} placeholder="Notes / inspection remarks..." className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer">
                {busy ? 'Issuing...' : 'Issue Credit Note'}
              </button>
            </div>
          </div>
        </form>
      )}

      {showForm && subTab === 'OTHER_INCOME' && (
        <form onSubmit={handleSaveOtherIncome} className="bg-[#0B132B] border border-cyan-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">Record Other Income (Scrap Sales, Transport Recovery, Interest, Misc)</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Income Ledger Account *</label>
              <select value={oiAccountId} onChange={(e) => setOiAccountId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {incomeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Received From / Source *</label>
              <input required value={oiFrom} onChange={(e) => setOiFrom(e.target.value)} placeholder="Scrap buyer / Bank interest / Party" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Date</label>
              <input type="date" value={oiDate} onChange={(e) => setOiDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Deposit To Cash / Bank *</label>
              <select value={oiCashBankId} onChange={(e) => setOiCashBankId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {cashBankAccounts.map((cb) => (
                  <option key={cb.id} value={cb.id}>{cb.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Amount (₹) *</label>
              <input type="number" step="0.01" min={1} required value={oiAmount} onChange={(e) => setOiAmount(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Mode &amp; Ref</label>
              <div className="flex gap-1.5">
                <select value={oiMode} onChange={(e) => setOiMode(e.target.value as AccountingPaymentMode)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                  {(['CASH', 'UPI', 'NEFT', 'CHEQUE'] as AccountingPaymentMode[]).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={oiRef} onChange={(e) => setOiRef(e.target.value)} placeholder="Ref #" className="flex-1 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              </div>
            </div>
            <div className="md:col-span-3 flex items-end gap-2">
              <input value={oiNotes} onChange={(e) => setOiNotes(e.target.value)} placeholder="Description / particulars..." className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer">
                {busy ? 'Saving...' : 'Save Other Income'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Data Tables */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading Sales Accounting Ledger...</div>
        ) : subTab === 'INVOICES' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">{gstEnabled ? 'Invoice #' : 'Sales Ref #'}</th>
                <th className="p-3">Date / Due</th>
                <th className="p-3">Customer</th>
                {gstEnabled && <th className="p-3 text-right">Taxable</th>}
                {gstEnabled && <th className="p-3 text-right">GST</th>}
                <th className="p-3 text-right">Net Total</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {invoices.length === 0 ? (
                <tr><td colSpan={gstEnabled ? 9 : 7} className="p-8 text-center text-slate-500">No sales entries yet. Click &quot;+ {gstEnabled ? 'New Sales Invoice' : 'New Sales Entry'}&quot; to record one.</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-emerald-400">{inv.invoiceNumber}</td>
                    <td className="p-3 text-slate-300">{inv.date}<div className="text-[10px] text-slate-500">Due: {inv.dueDate}</div></td>
                    <td className="p-3 font-semibold text-white">{inv.customerName}{inv.orderRef && <div className="text-[10px] text-slate-400">Ref: {inv.orderRef}</div>}</td>
                    {gstEnabled && <td className="p-3 text-right font-mono">{fmt(inv.subtotal)}</td>}
                    {gstEnabled && <td className="p-3 text-right font-mono text-slate-400">{fmt(inv.taxAmount)}</td>}
                    <td className="p-3 text-right font-mono font-bold text-white">{fmt(inv.totalAmount)}</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-300">{fmt(inv.balanceAmount)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : inv.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPrintVoucher({
                            title: gstEnabled ? 'TAX INVOICE' : 'DIRECT SALES SLIP (NON-GST)',
                            number: inv.invoiceNumber,
                            date: inv.date,
                            party: inv.customerName,
                            rows: [
                              ...inv.items.map((it): [string, string] => [`${it.description} (${it.qty} × ${fmt(it.rate)})`, fmt(it.amount)]),
                              ...(gstEnabled
                                ? ([
                                    ['Taxable Subtotal', fmt(inv.subtotal)],
                                    [`GST (${inv.gstRate}%)`, fmt(inv.taxAmount)],
                                  ] as Array<[string, string]>)
                                : []),
                              ['Paid / Credited', fmt(inv.paidAmount + inv.creditNoteAmount)],
                              ['Balance Due', fmt(inv.balanceAmount)],
                            ],
                            total: inv.totalAmount,
                            notes: inv.notes,
                          })
                        }
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title={gstEnabled ? 'Print Invoice' : 'Print Sales Slip'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete('SALES_INVOICE', inv.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : subTab === 'PAYMENT_IN' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">Receipt #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Invoice</th>
                <th className="p-3">Cash / Bank</th>
                <th className="p-3">Mode / Ref</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paymentsIn.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No Payment In receipts recorded yet.</td></tr>
              ) : (
                paymentsIn.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-emerald-400">{p.receiptNumber}</td>
                    <td className="p-3 text-slate-300">{p.date}</td>
                    <td className="p-3 font-semibold text-white">{p.customerName}</td>
                    <td className="p-3 font-mono text-slate-400">{p.invoiceNumber || 'On-Account'}</td>
                    <td className="p-3 text-sky-300">{p.cashBankAccountName}</td>
                    <td className="p-3 text-slate-300">{p.paymentMode}{p.referenceNumber ? ` • ${p.referenceNumber}` : ''}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">{fmt(p.amount)}</td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPrintVoucher({
                            title: 'PAYMENT RECEIPT (PAYMENT IN)',
                            number: p.receiptNumber,
                            date: p.date,
                            party: p.customerName,
                            rows: [
                              ['Against Invoice', p.invoiceNumber || 'On-Account'],
                              ['Deposited Into', p.cashBankAccountName],
                              ['Payment Mode', p.paymentMode],
                              ['Reference #', p.referenceNumber || '-'],
                            ],
                            total: p.amount,
                            notes: p.notes,
                          })
                        }
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete('PAYMENT_IN', p.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : subTab === 'CREDIT_NOTE' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">Credit Note #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">{gstEnabled ? 'Invoice' : 'Sales Ref'}</th>
                <th className="p-3">Reason</th>
                {gstEnabled && <th className="p-3 text-right">Taxable</th>}
                {gstEnabled && <th className="p-3 text-right">GST Rev.</th>}
                <th className="p-3 text-right">Total Credit</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {creditNotes.length === 0 ? (
                <tr><td colSpan={gstEnabled ? 9 : 7} className="p-8 text-center text-slate-500">No Sales Returns / Credit Notes issued yet.</td></tr>
              ) : (
                creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-amber-400">{cn.creditNoteNumber}</td>
                    <td className="p-3 text-slate-300">{cn.date}</td>
                    <td className="p-3 font-semibold text-white">{cn.customerName}</td>
                    <td className="p-3 font-mono text-slate-400">{cn.invoiceNumber || 'Standalone'}</td>
                    <td className="p-3 text-slate-300">{cn.reason}</td>
                    {gstEnabled && <td className="p-3 text-right font-mono">{fmt(cn.subtotal)}</td>}
                    {gstEnabled && <td className="p-3 text-right font-mono text-slate-400">{fmt(cn.taxAmount)}</td>}
                    <td className="p-3 text-right font-mono font-bold text-amber-300">{fmt(cn.totalAmount)}</td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPrintVoucher({
                            title: 'SALES RETURN / CREDIT NOTE',
                            number: cn.creditNoteNumber,
                            date: cn.date,
                            party: cn.customerName,
                            rows: [
                              ['Linked Sales Ref', cn.invoiceNumber || 'Standalone'],
                              ['Reason', cn.reason],
                              ...(gstEnabled
                                ? ([
                                    ['Taxable Return Value', fmt(cn.subtotal)],
                                    [`GST Reversal (${cn.gstRate}%)`, fmt(cn.taxAmount)],
                                  ] as Array<[string, string]>)
                                : ([['Net Credit Value', fmt(cn.totalAmount)]] as Array<[string, string]>)),
                            ],
                            total: cn.totalAmount,
                            notes: cn.notes,
                          })
                        }
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete('CREDIT_NOTE', cn.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">Voucher #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Income Account</th>
                <th className="p-3">Received From</th>
                <th className="p-3">Deposit To</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {otherIncomes.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No Other Income entries recorded yet.</td></tr>
              ) : (
                otherIncomes.map((oi) => (
                  <tr key={oi.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-cyan-400">{oi.voucherNumber}</td>
                    <td className="p-3 text-slate-300">{oi.date}</td>
                    <td className="p-3 font-semibold text-white">{oi.incomeAccountName}</td>
                    <td className="p-3 text-slate-300">{oi.receivedFrom}</td>
                    <td className="p-3 text-sky-300">{oi.cashBankAccountName} ({oi.paymentMode})</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">{fmt(oi.amount)}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => handleDelete('OTHER_INCOME', oi.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Printable Voucher Modal */}
      {printVoucher && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
              <div>
                <div className="text-lg font-black text-red-700">EXMARK DOORS</div>
                <div className="text-xs font-bold text-slate-600">{printVoucher.title}</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-black">{printVoucher.number}</div>
                <div className="text-slate-600">Date: {printVoucher.date}</div>
              </div>
            </div>
            <div className="text-xs"><strong>Party:</strong> {printVoucher.party}</div>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody>
                {printVoucher.rows.map(([k, v], i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="p-2 text-slate-700">{k}</td>
                    <td className="p-2 text-right font-mono font-bold">{v}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-black">
                  <td className="p-2">GRAND TOTAL</td>
                  <td className="p-2 text-right font-mono text-sm">{fmt(printVoucher.total)}</td>
                </tr>
              </tbody>
            </table>
            {printVoucher.notes && <div className="text-xs text-slate-600"><strong>Notes:</strong> {printVoucher.notes}</div>}
            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button type="button" onClick={() => setPrintVoucher(null)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer">Close</button>
              <button type="button" onClick={() => window.print()} className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
