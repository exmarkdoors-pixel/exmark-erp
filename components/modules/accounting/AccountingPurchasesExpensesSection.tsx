'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  ArrowUpCircle,
  Wallet,
  Plus,
  Trash2,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  AccountingPaymentMode,
  CashBankAccountWithBalance,
  ExpenseCategory,
  ExpenseRecord,
  PaymentOutRecord,
  PurchaseBillRecord,
} from '@/types/accounting';

interface AccountingPurchasesExpensesSectionProps {
  cashBankAccounts: CashBankAccountWithBalance[];
  onDataChanged: () => void;
  gstEnabled?: boolean;
}

const fmt = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AccountingPurchasesExpensesSection({
  cashBankAccounts,
  onDataChanged,
  gstEnabled = false,
}: AccountingPurchasesExpensesSectionProps) {
  const [subTab, setSubTab] = useState<'PURCHASE_BILL' | 'PAYMENT_OUT' | 'EXPENSES'>('PURCHASE_BILL');
  const [bills, setBills] = useState<PurchaseBillRecord[]>([]);
  const [paymentsOut, setPaymentsOut] = useState<PaymentOutRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Purchase Bill form
  const [billSupplier, setBillSupplier] = useState('');
  const [billVendorNo, setBillVendorNo] = useState('');
  const [billGstin, setBillGstin] = useState('');
  const [billDate, setBillDate] = useState(today);
  const [billDueDate, setBillDueDate] = useState(today);
  const [billGstRate, setBillGstRate] = useState(gstEnabled ? 18 : 0);
  const [billGstMode, setBillGstMode] = useState<'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT'>(gstEnabled ? 'INTRA_STATE' : 'EXEMPT');
  const [billItems, setBillItems] = useState<Array<{ description: string; qty: number; rate: number }>>([
    { description: 'FRP Resin / Fiber Mat / WPC Profiles', qty: 1, rate: 10000 },
  ]);

  // Payment Out form
  const [poutBillId, setPoutBillId] = useState('');
  const [poutSupplier, setPoutSupplier] = useState('');
  const [poutDate, setPoutDate] = useState(today);
  const [poutCashBankId, setPoutCashBankId] = useState(cashBankAccounts[0]?.id || 'cb-bank-main');
  const [poutMode, setPoutMode] = useState<AccountingPaymentMode>('NEFT');
  const [poutAmount, setPoutAmount] = useState('');
  const [poutRef, setPoutRef] = useState('');
  const [poutNotes, setPoutNotes] = useState('');

  // Expense form
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expDate, setExpDate] = useState(today);
  const [expCashBankId, setExpCashBankId] = useState(cashBankAccounts[0]?.id || 'cb-cash-main');
  const [expMode, setExpMode] = useState<AccountingPaymentMode>('CASH');
  const [expPayee, setExpPayee] = useState('');
  const [expSubtotal, setExpSubtotal] = useState('');
  const [expGstRate, setExpGstRate] = useState(0);
  const [expRef, setExpRef] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Create Expense Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/accounting/purchases');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setBills(json.data.purchaseBills || []);
        setPaymentsOut(json.data.paymentsOut || []);
        setExpenses(json.data.expenses || []);
        const cats: ExpenseCategory[] = json.data.expenseCategories || [];
        setCategories(cats);
        setExpCategoryId((prev) => (prev && cats.some((c) => c.id === prev) ? prev : cats[0]?.id || ''));
      }
    } catch {
      notify('err', 'Failed to load Purchases & Expenses ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (cashBankAccounts.length > 0 && !cashBankAccounts.some((c) => c.id === poutCashBankId)) {
      setPoutCashBankId(cashBankAccounts[0].id);
      setExpCashBankId(cashBankAccounts[0].id);
    }
  }, [cashBankAccounts, poutCashBankId]);

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'PURCHASE_BILL',
          supplierName: billSupplier,
          vendorBillNo: billVendorNo,
          supplierGstin: billGstin,
          date: billDate,
          dueDate: billDueDate,
          items: billItems,
          gstRate: billGstRate,
          gstMode: billGstMode,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save purchase bill');
      notify('ok', json.message || 'Purchase Bill saved.');
      setShowForm(false);
      setBillSupplier('');
      setBillVendorNo('');
      await loadData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to save purchase bill');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePaymentOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'PAYMENT_OUT',
          supplierName: poutSupplier,
          billId: poutBillId || undefined,
          date: poutDate,
          cashBankAccountId: poutCashBankId,
          paymentMode: poutMode,
          amount: Number(poutAmount),
          referenceNumber: poutRef,
          notes: poutNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not record payment out');
      notify('ok', json.message || 'Payment Out recorded.');
      setShowForm(false);
      setPoutAmount('');
      setPoutRef('');
      setPoutNotes('');
      await loadData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to save payout');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'EXPENSE',
          categoryId: expCategoryId,
          date: expDate,
          cashBankAccountId: expCashBankId,
          paymentMode: expMode,
          payeeName: expPayee,
          subtotal: Number(expSubtotal),
          gstRate: expGstRate,
          referenceNumber: expRef,
          notes: expNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not record expense');
      notify('ok', json.message || 'Expense recorded.');
      setShowForm(false);
      setExpPayee('');
      setExpSubtotal('');
      setExpRef('');
      setExpNotes('');
      await loadData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setBusy(true);
    try {
      const res = await apiFetch('/api/accounting/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'EXPENSE_CATEGORY',
          name: newCatName.trim(),
          description: newCatDesc.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not create category');
      notify('ok', json.message || 'Expense category created.');
      setNewCatName('');
      setNewCatDesc('');
      await loadData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (cat: ExpenseCategory) => {
    if (!confirm(`Delete expense category "${cat.name}"? Any existing expenses in this category will be safely moved to Office & Misc Expenses.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/purchases?kind=EXPENSE_CATEGORY&id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not delete category');
      notify('ok', json.message || 'Category deleted.');
      if (selectedCatFilter === cat.id) setSelectedCatFilter('ALL');
      await loadData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteVoucher = async (kind: string, id: string) => {
    if (!confirm('Delete this voucher and reverse its journal entry?')) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/accounting/purchases?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      notify('ok', json.message || 'Deleted cleanly.');
      await loadData();
      onDataChanged();
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const filteredExpenses =
    selectedCatFilter === 'ALL' ? expenses : expenses.filter((e) => e.categoryId === selectedCatFilter);

  const billSub = billItems.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const billTax = !gstEnabled || billGstMode === 'EXEMPT' ? 0 : (billSub * (Number(billGstRate) || 0)) / 100;

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${banner.type === 'ok' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'}`}>
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070D1E] p-2.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'PURCHASE_BILL', label: `Purchase Bill (${bills.length})`, Icon: FileSpreadsheet },
            { id: 'PAYMENT_OUT', label: `Payment Out (${paymentsOut.length})`, Icon: ArrowUpCircle },
            { id: 'EXPENSES', label: `Expenses (${expenses.length})`, Icon: Wallet },
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
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'EXPENSES' && (
            <button
              type="button"
              onClick={() => setShowCatManager((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Manage Categories ({categories.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {subTab === 'PURCHASE_BILL' ? 'New Purchase Bill' : subTab === 'PAYMENT_OUT' ? 'Record Payment Out' : 'Add Expense'}
            </span>
          </button>
        </div>
      </div>

      {/* Category Manager Panel (Create & Delete Expense Categories) */}
      {subTab === 'EXPENSES' && showCatManager && (
        <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Expense Categories Manager (Create &amp; Delete Categories)
            </h4>
            <button type="button" onClick={() => setShowCatManager(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">New Category Name *</label>
              <input
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Hydraulic Press Oil, Factory Tea, Security..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Description (Optional)</label>
              <input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Notes..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer">
              + Create Category
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
            {categories.map((cat) => {
              const catCount = expenses.filter((e) => e.categoryId === cat.id).length;
              const catTotal = expenses.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.totalAmount, 0);
              return (
                <div key={cat.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#070D1E] border border-slate-800">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{cat.name}</div>
                    <div className="text-[10px] text-slate-400">{catCount} voucher(s) • {fmt(catTotal)}</div>
                  </div>
                  {cat.isSystem ? (
                    <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0">Default</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      disabled={busy}
                      className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer shrink-0"
                      title={`Delete "${cat.name}" category`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forms */}
      {showForm && subTab === 'PURCHASE_BILL' && (
        <form onSubmit={handleSaveBill} className="bg-[#0B132B] border border-purple-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">
              {gstEnabled ? 'Record Purchase Bill (Auto-Posts Payable & Input GST ITC)' : 'Record Purchase Bill (Direct Non-GST • Auto-Posts Payable Ledger)'}
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Supplier Name *</label>
              <input required value={billSupplier} onChange={(e) => setBillSupplier(e.target.value)} placeholder="Resin / Hardware Supplier" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Vendor Bill #</label>
              <input value={billVendorNo} onChange={(e) => setBillVendorNo(e.target.value)} placeholder="SUP-INV-2026-44" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Bill Date</label>
              <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Due Date</label>
              <input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300">Purchase Items</span>
              <button type="button" onClick={() => setBillItems((p) => [...p, { description: '', qty: 1, rate: 0 }])} className="px-2.5 py-1 rounded bg-slate-800 text-purple-300 font-bold cursor-pointer">+ Add Line</button>
            </div>
            {billItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input required value={it.description} onChange={(e) => setBillItems((p) => p.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))} placeholder="Raw material / chemical / hardware" className="col-span-6 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white" />
                <input type="number" min={1} value={it.qty} onChange={(e) => setBillItems((p) => p.map((r, i) => (i === idx ? { ...r, qty: Number(e.target.value) || 0 } : r)))} className="col-span-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-right" />
                <input type="number" min={0} step="0.01" value={it.rate} onChange={(e) => setBillItems((p) => p.map((r, i) => (i === idx ? { ...r, rate: Number(e.target.value) || 0 } : r)))} className="col-span-3 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-right" />
                <button type="button" disabled={billItems.length <= 1} onClick={() => setBillItems((p) => p.filter((_, i) => i !== idx))} className="col-span-1 p-1.5 text-rose-400 disabled:opacity-30 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800 items-end">
            {gstEnabled ? (
              <>
                <div>
                  <label className="text-slate-400 block mb-1">GST Mode</label>
                  <select value={billGstMode} onChange={(e) => setBillGstMode(e.target.value as typeof billGstMode)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option value="INTRA_STATE">Intra-State (CGST+SGST)</option>
                    <option value="INTER_STATE">Inter-State (IGST)</option>
                    <option value="EXEMPT">No GST (0%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GST Rate %</label>
                  <input type="number" value={billGstRate} onChange={(e) => setBillGstRate(Number(e.target.value))} disabled={billGstMode === 'EXEMPT'} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                <strong className="text-purple-300">Non-GST Purchase Mode:</strong> Recorded at pure net vendor amount (0% GST).
              </div>
            )}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-right">
              {gstEnabled && <div className="text-[10px] text-slate-400">Sub: {fmt(billSub)} • ITC: {fmt(billTax)}</div>}
              <div className="text-sm font-black text-purple-300">Net Total: {fmt(billSub + billTax)}</div>
            </div>
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer">
              {busy ? 'Saving...' : 'Save Purchase Bill'}
            </button>
          </div>
        </form>
      )}

      {showForm && subTab === 'PAYMENT_OUT' && (
        <form onSubmit={handleSavePaymentOut} className="bg-[#0B132B] border border-purple-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">Record Payment Out (Supplier Payout)</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Against Purchase Bill (Optional)</label>
              <select
                value={poutBillId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPoutBillId(id);
                  const b = bills.find((x) => x.id === id);
                  if (b) {
                    setPoutSupplier(b.supplierName);
                    setPoutAmount(String(b.balanceAmount));
                  }
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                <option value="">-- On-Account / Direct Supplier Payment --</option>
                {bills.filter((b) => b.balanceAmount > 0).map((b) => (
                  <option key={b.id} value={b.id}>{b.billNumber} — {b.supplierName} (Due {fmt(b.balanceAmount)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Supplier Name *</label>
              <input required value={poutSupplier} onChange={(e) => setPoutSupplier(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Payment Date</label>
              <input type="date" value={poutDate} onChange={(e) => setPoutDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Pay From Cash / Bank *</label>
              <select value={poutCashBankId} onChange={(e) => setPoutCashBankId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {cashBankAccounts.map((cb) => <option key={cb.id} value={cb.id}>{cb.name} ({fmt(cb.closingBalance)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Payment Mode</label>
              <select value={poutMode} onChange={(e) => setPoutMode(e.target.value as AccountingPaymentMode)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {(['NEFT', 'UPI', 'CASH', 'RTGS', 'CHEQUE'] as AccountingPaymentMode[]).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Amount Paid (₹) *</label>
              <input type="number" step="0.01" min={1} required value={poutAmount} onChange={(e) => setPoutAmount(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">UTR / Ref #</label>
              <input value={poutRef} onChange={(e) => setPoutRef(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <input value={poutNotes} onChange={(e) => setPoutNotes(e.target.value)} placeholder="Notes..." className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer">
                {busy ? 'Saving...' : 'Save Payment Out'}
              </button>
            </div>
          </div>
        </form>
      )}

      {showForm && subTab === 'EXPENSES' && (
        <form onSubmit={handleSaveExpense} className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">Record Category-Wise Expense</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Expense Category *</label>
              <select required value={expCategoryId} onChange={(e) => setExpCategoryId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold">
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Paid To / Vendor / Description *</label>
              <input required value={expPayee} onChange={(e) => setExpPayee(e.target.value)} placeholder="e.g. KSEB Bill / Petrol Pump / Tea Shop" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Date</label>
              <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Paid From Cash / Bank *</label>
              <select value={expCashBankId} onChange={(e) => setExpCashBankId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                {cashBankAccounts.map((cb) => <option key={cb.id} value={cb.id}>{cb.name}</option>)}
              </select>
            </div>
            <div className={gstEnabled ? 'grid grid-cols-2 gap-2' : ''}>
              <div>
                <label className="text-slate-400 block mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" min={1} required value={expSubtotal} onChange={(e) => setExpSubtotal(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold" />
              </div>
              {gstEnabled && (
                <div>
                  <label className="text-slate-400 block mb-1">GST %</label>
                  <input type="number" min={0} value={expGstRate} onChange={(e) => setExpGstRate(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
              )}
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Mode &amp; Ref</label>
              <div className="flex gap-1.5">
                <select value={expMode} onChange={(e) => setExpMode(e.target.value as AccountingPaymentMode)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
                  {(['CASH', 'UPI', 'NEFT', 'CARD', 'CHEQUE'] as AccountingPaymentMode[]).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={expRef} onChange={(e) => setExpRef(e.target.value)} placeholder="Bill / Ref #" className="flex-1 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              </div>
            </div>
            <div className="md:col-span-3 flex items-end gap-2">
              <input value={expNotes} onChange={(e) => setExpNotes(e.target.value)} placeholder="Optional notes..." className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white" />
              <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer">
                {busy ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Category Filter Pills when viewing Expenses */}
      {subTab === 'EXPENSES' && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedCatFilter('ALL')}
            className={`px-2.5 py-1 rounded-full font-bold cursor-pointer ${
              selectedCatFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
            }`}
          >
            All Categories ({expenses.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCatFilter(c.id)}
              className={`px-2.5 py-1 rounded-full font-bold cursor-pointer ${
                selectedCatFilter === c.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
              }`}
            >
              {c.name} ({expenses.filter((e) => e.categoryId === c.id).length})
            </button>
          ))}
        </div>
      )}

      {/* Tables */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading Purchases &amp; Expenses...</div>
        ) : subTab === 'PURCHASE_BILL' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">Bill #</th>
                <th className="p-3">Date / Due</th>
                <th className="p-3">Supplier</th>
                {gstEnabled && <th className="p-3 text-right">Taxable</th>}
                {gstEnabled && <th className="p-3 text-right">GST ITC</th>}
                <th className="p-3 text-right">Net Total</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {bills.length === 0 ? (
                <tr><td colSpan={gstEnabled ? 9 : 7} className="p-8 text-center text-slate-500">No purchase bills recorded yet.</td></tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-purple-400">{b.billNumber}{b.vendorBillNo && <div className="text-[10px] text-slate-500">{b.vendorBillNo}</div>}</td>
                    <td className="p-3 text-slate-300">{b.date}<div className="text-[10px] text-slate-500">Due: {b.dueDate}</div></td>
                    <td className="p-3 font-semibold text-white">{b.supplierName}</td>
                    {gstEnabled && <td className="p-3 text-right font-mono">{fmt(b.subtotal)}</td>}
                    {gstEnabled && <td className="p-3 text-right font-mono text-slate-400">{fmt(b.taxAmount)}</td>}
                    <td className="p-3 text-right font-mono font-bold text-white">{fmt(b.totalAmount)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-300">{fmt(b.balanceAmount)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : b.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => handleDeleteVoucher('PURCHASE_BILL', b.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : subTab === 'PAYMENT_OUT' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070D1E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <th className="p-3">Voucher #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Bill Ref</th>
                <th className="p-3">Paid From</th>
                <th className="p-3">Mode / Ref</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paymentsOut.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No supplier payouts recorded yet.</td></tr>
              ) : (
                paymentsOut.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-purple-400">{p.voucherNumber}</td>
                    <td className="p-3 text-slate-300">{p.date}</td>
                    <td className="p-3 font-semibold text-white">{p.supplierName}</td>
                    <td className="p-3 font-mono text-slate-400">{p.billNumber || 'On-Account'}</td>
                    <td className="p-3 text-sky-300">{p.cashBankAccountName}</td>
                    <td className="p-3 text-slate-300">{p.paymentMode}{p.referenceNumber ? ` • ${p.referenceNumber}` : ''}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-300">{fmt(p.amount)}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => handleDeleteVoucher('PAYMENT_OUT', p.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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
                <th className="p-3">Category</th>
                <th className="p-3">Paid To / Details</th>
                <th className="p-3">Paid From</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No expenses recorded in this category yet.</td></tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-amber-400">{e.voucherNumber}</td>
                    <td className="p-3 text-slate-300">{e.date}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[10px]">{e.categoryName}</span></td>
                    <td className="p-3 font-semibold text-white">{e.payeeName}{e.notes && <div className="text-[10px] text-slate-400">{e.notes}</div>}</td>
                    <td className="p-3 text-sky-300">{e.cashBankAccountName} ({e.paymentMode})</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-300">{fmt(e.totalAmount)}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => handleDeleteVoucher('EXPENSE', e.id)} className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
