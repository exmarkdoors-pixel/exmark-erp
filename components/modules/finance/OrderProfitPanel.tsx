'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  RefreshCw,
  Printer,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Truck,
  Layers,
  Users,
  Calculator,
} from 'lucide-react';
import type {
  OrderDirectExpense,
  OrderExpenseCategory,
  OrderProfitBreakdown,
  OrderProfitReportResponse,
} from '@/lib/services/orderProfitService';

const EXPENSE_CATEGORY_LABELS: Record<OrderExpenseCategory, string> = {
  FREIGHT: 'Freight & Vehicle Hire',
  LOADING_UNLOADING: 'Loading & Unloading',
  COMMISSION: 'Sales / Agent Commission',
  REWORK: 'Rework & Rectification',
  OTHER: 'Other Direct Expense',
};

const EXPENSE_CATEGORY_OPTIONS: Array<{ value: OrderExpenseCategory; label: string }> = [
  { value: 'FREIGHT', label: 'Freight & Vehicle Hire' },
  { value: 'LOADING_UNLOADING', label: 'Loading & Unloading' },
  { value: 'COMMISSION', label: 'Sales / Agent Commission' },
  { value: 'REWORK', label: 'Rework & Rectification' },
  { value: 'OTHER', label: 'Other Direct Expense' },
];

const formatInr = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

function getMarginBadgeStyle(ord: OrderProfitBreakdown): string {
  if (ord.revenueSource === 'UNLINKED') {
    return 'bg-slate-800 text-slate-300 border-slate-700';
  }
  if (ord.netProfit < 0 || ord.profitMarginPct < 10) {
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  }
  if (ord.profitMarginPct < 20) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
}

export interface OrderProfitDetailModalProps {
  order: OrderProfitBreakdown | null;
  isOpen: boolean;
  includeProjectedCosts: boolean;
  onClose: () => void;
  onExpenseMutated?: () => void | Promise<void>;
}

export function OrderProfitDetailModal({
  order,
  isOpen,
  includeProjectedCosts,
  onClose,
  onExpenseMutated,
}: OrderProfitDetailModalProps) {
  const [category, setCategory] = useState<OrderExpenseCategory>('FREIGHT');
  const [description, setDescription] = useState('');
  const [vendorOrParty, setVendorOrParty] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setToast(null);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, order?.orderId]);

  if (!isOpen || !order) return null;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!description.trim()) {
      setFormError('Please enter an expense description (e.g. Delivery Van Freight).');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than ₹0.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const res = await apiFetch('/api/orders/profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          jobCardNumber: order.jobCardNumber,
          category,
          description: description.trim(),
          amount: numAmount,
          date,
          vendorOrParty: vendorOrParty.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || 'Failed to save direct expense.');
        return;
      }

      setDescription('');
      setVendorOrParty('');
      setAmount('');
      setToast(`Added ₹${Math.round(numAmount).toLocaleString('en-IN')} (${EXPENSE_CATEGORY_LABELS[category]})`);
      setTimeout(() => setToast(null), 3500);
      await onExpenseMutated?.();
    } catch {
      setFormError('Network error while saving order expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (exp: OrderDirectExpense) => {
    try {
      const res = await apiFetch(`/api/orders/profit?id=${encodeURIComponent(exp.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToast(`Removed expense "${exp.description}"`);
        setTimeout(() => setToast(null), 3000);
        await onExpenseMutated?.();
      }
    } catch {
      setFormError('Failed to remove expense record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs printable-modal-root">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl p-5 sm:p-6 space-y-5 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0 print:max-h-none print:overflow-visible">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 print:border-slate-300 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-red-600/20 text-red-400 print:text-red-700 print:bg-red-100 border border-red-500/30 font-mono text-xs font-bold">
                {order.jobCardNumber}
              </span>
              {order.quoteNumber && (
                <span className="px-2 py-0.5 rounded bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800 font-mono text-[11px] font-semibold">
                  Quote: {order.quoteNumber}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 print:text-indigo-800 print:bg-indigo-100 text-[10px] font-bold uppercase">
                {order.status.replace(/_/g, ' ')}
              </span>
              {includeProjectedCosts && order.totalProjectedAddition > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 print:text-amber-800 text-[10px] font-bold">
                  Includes Projected Remaining Costs (+{formatInr(order.totalProjectedAddition)})
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white print:text-slate-900 mt-1.5">
              Order Profit &amp; Loss Statement — {order.customerName}
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-600">
              {order.siteName} • {order.district} • {order.totalDoors} Doors ({order.totalSqFt.toFixed(1)} sq.ft) • Order Date: {order.orderDate}
              {order.completedDate ? ` • Completed: ${order.completedDate}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 P&amp;L</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Close P&L Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Print Header Brand Stamp */}
        <div className="hidden print:block text-[10px] text-slate-500 border-b border-slate-200 pb-2">
          EXMARK FRP DOORS • ORDER-WISE PROFITABILITY AUDIT (0% NON-GST) • Generated {new Date().toLocaleDateString('en-IN')}
        </div>

        {toast && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {order.revenueSource === 'UNLINKED' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 print:text-amber-900 print:bg-amber-50 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Revenue Unlinked:</strong> This Production Job Card has no matching Quotation or Sales Invoice in the store yet, so revenue is ₹0. Costs below still reflect BOM, Floor Gang piece rates, and Freight.
            </div>
          </div>
        )}

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Value (0% GST)</span>
            <p className="text-lg font-black text-white print:text-slate-900 font-mono mt-0.5">
              {formatInr(order.totalOrderRevenue)}
            </p>
            <span className="text-[10px] text-slate-400">
              Collected: {formatInr(order.cashCollected)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Materials &amp; BOQ</span>
            <p className="text-lg font-black text-blue-400 print:text-blue-700 font-mono mt-0.5">
              {formatInr(order.totalMaterialCost)}
            </p>
            <span className="text-[10px] text-slate-400">
              Raw + Locks + Paint + Extras
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Piece-Rate Labor</span>
            <p className="text-lg font-black text-amber-400 print:text-amber-700 font-mono mt-0.5">
              {formatInr(order.totalLaborCost)}
            </p>
            <span className="text-[10px] text-slate-400">
              {order.workRecords.length} Gang Work Logs
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 print:bg-slate-50 border border-slate-800 print:border-slate-300">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Freight &amp; Direct Exp</span>
            <p className="text-lg font-black text-purple-400 print:text-purple-700 font-mono mt-0.5">
              {formatInr(order.totalDirectExpenses)}
            </p>
            <span className="text-[10px] text-slate-400">
              {order.directExpenses.length} Entries
            </span>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              order.netProfit >= 0
                ? 'bg-emerald-950/30 print:bg-emerald-50 border-emerald-500/40'
                : 'bg-rose-950/30 print:bg-rose-50 border-rose-500/40'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-300 print:text-slate-600 block">
              Net Order Profit
            </span>
            <p
              className={`text-lg font-black font-mono mt-0.5 ${
                order.netProfit >= 0
                  ? 'text-emerald-400 print:text-emerald-700'
                  : 'text-rose-400 print:text-rose-700'
              }`}
            >
              {order.netProfit < 0 ? `-${formatInr(Math.abs(order.netProfit))}` : formatInr(order.netProfit)}
            </p>
            <span className="text-[10px] font-bold text-slate-300 print:text-slate-700">
              Margin: {order.profitMarginPct}% • {formatInr(order.profitPerDoor)}/door
            </span>
          </div>
        </div>

        {/* Itemized Ledger Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue + Material Breakdown */}
          <div className="space-y-4">
            {/* Revenue Card */}
            <div className="p-4 rounded-xl bg-[#0B132B] print:bg-white border border-slate-800 print:border-slate-300 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 print:text-emerald-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>A. Revenue &amp; Realization (0% Non-GST)</span>
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300 print:text-slate-700">Doors &amp; Frames Selling Value</span>
                  <span className="font-mono font-bold">{formatInr(order.doorsRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300 print:text-slate-700">Site Installation Charges</span>
                  <span className="font-mono font-bold">{formatInr(order.installationRevenue)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Quotation Discount Allowed</span>
                    <span className="font-mono">-{formatInr(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-slate-800 print:border-slate-300 font-black text-white print:text-slate-900">
                  <span>Total Order Revenue (A)</span>
                  <span className="font-mono">{formatInr(order.totalOrderRevenue)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Advance / Receipts Collected</span>
                  <span className="font-mono text-emerald-400 print:text-emerald-700">{formatInr(order.cashCollected)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Balance Receivable</span>
                  <span className="font-mono text-amber-400 print:text-amber-700">{formatInr(order.balanceReceivable)}</span>
                </div>
              </div>
            </div>

            {/* Materials Cost Card */}
            <div className="p-4 rounded-xl bg-[#0B132B] print:bg-white border border-slate-800 print:border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400 print:text-blue-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>B1. Materials, Hardware &amp; Paint BOM</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {order.mfgBoqNumber || 'Live BOQ Formula'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>• Resin, GEL, Catalyst, Accel, CSM 300 &amp; Pigment</span>
                  <span className="font-mono">{formatInr(order.chemicalCost)}</span>
                </div>
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>• Timber / Frame Wood &amp; Reepers</span>
                  <span className="font-mono">{formatInr(order.timberCost)}</span>
                </div>
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>• PU / EPE Foam Core Sheets</span>
                  <span className="font-mono">{formatInr(order.foamCost)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-100 print:text-slate-800 pt-1 border-t border-slate-800/60 print:border-slate-200">
                  <span>Raw Door Material Subtotal ({order.mfgBoqSource === 'SAVED_BOQ' ? 'Saved Mfg BOQ' : 'Live Calc'})</span>
                  <span className="font-mono">{formatInr(order.rawDoorMaterialCost)}</span>
                </div>
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>Lock Box Hardware Kits</span>
                  <span className="font-mono">{formatInr(order.lockHardwareCost)}</span>
                </div>
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>
                    Paint Section BOM{' '}
                    {order.paintBoqNumber
                      ? `(${order.paintBoqNumber})`
                      : includeProjectedCosts
                      ? '(Projected ₹75/sq.ft)'
                      : '(Not issued yet)'}
                  </span>
                  <span className="font-mono">{formatInr(order.paintCost)}</span>
                </div>
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>Extra Store / Evening Consumables ({order.extraBoqItems.length})</span>
                  <span className="font-mono">{formatInr(order.extraBoqCost)}</span>
                </div>
                {order.extraBoqItems.length > 0 && (
                  <div className="p-2 rounded-lg bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-1 text-[11px]">
                    {order.extraBoqItems.map((ext) => (
                      <div key={ext.id} className="flex justify-between text-slate-300 print:text-slate-700">
                        <span>
                          {ext.itemName} ({ext.quantity} {ext.unit} × {formatInr(ext.unitRate)})
                          {ext.issueShift ? ` [${ext.issueShift}]` : ''}
                        </span>
                        <span className="font-mono font-bold">{formatInr(ext.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-slate-800 print:border-slate-300 font-black text-white print:text-slate-900">
                  <span>Total Material Cost (B1)</span>
                  <span className="font-mono text-blue-400 print:text-blue-700">{formatInr(order.totalMaterialCost)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Piece-Rate Labor + Direct Expenses */}
          <div className="space-y-4">
            {/* Piece-Rate Labor Card */}
            <div className="p-4 rounded-xl bg-[#0B132B] print:bg-white border border-slate-800 print:border-slate-300 space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 print:text-amber-700 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>B2. Floor Gang Piece-Rate Expenses</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 flex justify-between">
                  <span className="text-slate-400">Molding Gangs</span>
                  <span className="font-mono font-bold">{formatInr(order.moldingLaborCost)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 flex justify-between">
                  <span className="text-slate-400">Cutting &amp; Sizing</span>
                  <span className="font-mono font-bold">{formatInr(order.cuttingLaborCost)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 flex justify-between">
                  <span className="text-slate-400">Painting &amp; Grains</span>
                  <span className="font-mono font-bold">{formatInr(order.paintingLaborCost)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 flex justify-between">
                  <span className="text-slate-400">Site Fitting</span>
                  <span className="font-mono font-bold">{formatInr(order.siteFittingLaborCost)}</span>
                </div>
              </div>

              {includeProjectedCosts && order.projectedPieceRateCost > 0 && (
                <div className="flex justify-between text-xs text-amber-300 print:text-amber-800 bg-amber-500/10 px-2.5 py-1.5 rounded-lg">
                  <span>Projected Unlogged Stage Piece Rates</span>
                  <span className="font-mono font-bold">+{formatInr(order.projectedPieceRateCost)}</span>
                </div>
              )}

              {order.workRecords.length > 0 ? (
                <div className="max-h-36 overflow-y-auto print:max-h-none print:overflow-visible border border-slate-800 print:border-slate-200 rounded-lg">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-900 print:bg-slate-100 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Gang</th>
                        <th className="p-2">Operation</th>
                        <th className="p-2 text-right">Qty × Rate</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 print:divide-slate-200">
                      {order.workRecords.map((rec) => (
                        <tr key={rec.id}>
                          <td className="p-2 font-semibold">{rec.contractorName}</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{rec.operationLabel}</td>
                          <td className="p-2 text-right font-mono text-slate-400">
                            {rec.quantity} × {formatInr(rec.unitRate)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-amber-400 print:text-amber-700">
                            {formatInr(rec.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No actual gang piece-rate credits logged for this order yet.
                </p>
              )}

              <div className="flex justify-between pt-1.5 border-t border-slate-800 print:border-slate-300 text-xs font-black text-white print:text-slate-900">
                <span>Total Piece-Rate Labor (B2)</span>
                <span className="font-mono text-amber-400 print:text-amber-700">{formatInr(order.totalLaborCost)}</span>
              </div>
            </div>

            {/* Direct Expenses (Freight, Loading, Commission, Rework) */}
            <div className="p-4 rounded-xl bg-[#0B132B] print:bg-white border border-slate-800 print:border-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 print:text-purple-700 flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  <span>B3. Freight &amp; Direct Order Expenses</span>
                </h3>
                <span className="font-mono text-xs font-black text-purple-400 print:text-purple-700">
                  {formatInr(order.totalDirectExpenses)}
                </span>
              </div>

              {order.directExpenses.length > 0 ? (
                <div className="space-y-1.5">
                  {order.directExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 print:text-slate-900 truncate">
                          {exp.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {EXPENSE_CATEGORY_LABELS[exp.category]} • {exp.date}
                          {exp.vendorOrParty ? ` • ${exp.vendorOrParty}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-purple-300 print:text-purple-800">
                          {formatInr(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 cursor-pointer print:hidden"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No direct freight, loading, commission, or rework expenses added yet.
                </p>
              )}

              {/* Quick Add Direct Expense Form */}
              <form
                onSubmit={handleAddExpense}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2.5 print:hidden"
              >
                <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-red-400" />
                  <span>Add Freight / Loading / Direct Order Expense</span>
                </div>
                {formError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded px-2 py-1">
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OrderExpenseCategory)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                  >
                    {EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (e.g. Van freight to site)"
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={vendorOrParty}
                    onChange={(e) => setVendorOrParty(e.target.value)}
                    placeholder="Vehicle / Vendor / Agent (optional)"
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount ₹"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                    >
                      {isSaving ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom P&L Equation Strip */}
        <div className="p-4 rounded-xl bg-slate-900 print:bg-slate-100 border border-slate-700 print:border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-mono text-slate-300 print:text-slate-800">
            Revenue <strong>{formatInr(order.totalOrderRevenue)}</strong> − (Materials{' '}
            <strong>{formatInr(order.totalMaterialCost)}</strong> + Piece-Rate{' '}
            <strong>{formatInr(order.totalLaborCost)}</strong> + Direct Exp{' '}
            <strong>{formatInr(order.totalDirectExpenses)}</strong> ={' '}
            <strong>{formatInr(order.totalCost)}</strong>)
          </div>
          <div
            className={`font-mono text-sm font-black ${
              order.netProfit >= 0
                ? 'text-emerald-400 print:text-emerald-700'
                : 'text-rose-400 print:text-rose-700'
            }`}
          >
            Net Profit: {order.netProfit < 0 ? `-${formatInr(Math.abs(order.netProfit))}` : formatInr(order.netProfit)} ({order.profitMarginPct}%)
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderProfitPanel() {
  const [report, setReport] = useState<OrderProfitReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [includeProjectedCosts, setIncludeProjectedCosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE' | 'LINKED' | 'LOSS'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'PROFIT_DESC' | 'PROFIT_ASC' | 'MARGIN_DESC' | 'REVENUE_DESC'>('DATE_DESC');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadProfitData = useCallback(async (projected: boolean) => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/orders/profit?includeProjected=${projected ? 'true' : 'false'}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setReport(json.data as OrderProfitReportResponse);
      }
    } catch {
      // handled gracefully by empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfitData(includeProjectedCosts);
  }, [includeProjectedCosts, loadProfitData]);

  const filteredOrders = useMemo(() => {
    const all = report?.orders || [];
    const q = searchQuery.trim().toLowerCase();

    const filtered = all.filter((ord) => {
      if (statusFilter === 'COMPLETED' && ord.status !== 'COMPLETED') return false;
      if (statusFilter === 'ACTIVE' && ord.status === 'COMPLETED') return false;
      if (statusFilter === 'LINKED' && ord.revenueSource === 'UNLINKED') return false;
      if (statusFilter === 'LOSS' && ord.netProfit >= 0) return false;

      if (!q) return true;
      return (
        ord.jobCardNumber.toLowerCase().includes(q) ||
        ord.prodOrderNumber.toLowerCase().includes(q) ||
        (ord.quoteNumber || '').toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.siteName.toLowerCase().includes(q) ||
        ord.district.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === 'PROFIT_DESC') return b.netProfit - a.netProfit;
      if (sortBy === 'PROFIT_ASC') return a.netProfit - b.netProfit;
      if (sortBy === 'MARGIN_DESC') return b.profitMarginPct - a.profitMarginPct;
      if (sortBy === 'REVENUE_DESC') return b.totalOrderRevenue - a.totalOrderRevenue;
      return (b.orderDate || '').localeCompare(a.orderDate || '');
    });

    return filtered;
  }, [report?.orders, searchQuery, statusFilter, sortBy]);

  const selectedOrder = useMemo(
    () => (selectedOrderId ? (report?.orders || []).find((o) => o.orderId === selectedOrderId) || null : null),
    [report?.orders, selectedOrderId]
  );

  const handleExportCsv = () => {
    const rows = filteredOrders;
    if (rows.length === 0) return;

    const headers = [
      'Job Card #',
      'Quote #',
      'Customer',
      'Site',
      'District',
      'Order Date',
      'Status',
      'Doors',
      'SqFt',
      'Doors Revenue',
      'Installation Revenue',
      'Total Order Value',
      'Cash Collected',
      'Raw Door BOM',
      'Lock Kits',
      'Paint BOM',
      'Extra Store Items',
      'Total Materials',
      'Molding Piece Rate',
      'Cutting Piece Rate',
      'Painting Piece Rate',
      'Site Fitting Piece Rate',
      'Total Piece Rate Labor',
      'Freight & Direct Exp',
      'Total Cost',
      'Net Profit',
      'Margin %',
      'Profit Per Door',
    ];

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [
      headers.join(','),
      ...rows.map((o) =>
        [
          o.jobCardNumber,
          o.quoteNumber || '',
          o.customerName,
          o.siteName,
          o.district,
          o.orderDate,
          o.status,
          o.totalDoors,
          o.totalSqFt,
          o.doorsRevenue,
          o.installationRevenue,
          o.totalOrderRevenue,
          o.cashCollected,
          o.rawDoorMaterialCost,
          o.lockHardwareCost,
          o.paintCost,
          o.extraBoqCost,
          o.totalMaterialCost,
          o.moldingLaborCost,
          o.cuttingLaborCost,
          o.paintingLaborCost,
          o.siteFittingLaborCost,
          o.totalLaborCost,
          o.totalDirectExpenses,
          o.totalCost,
          o.netProfit,
          `${o.profitMarginPct}%`,
          o.profitPerDoor,
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EXMARK_Order_Profit_PnL_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast(`Exported ${rows.length} order P&L rows to Excel/CSV`);
    setTimeout(() => setToast(null), 3000);
  };

  const summary = report?.summary;

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-red-500" />
            Order-Wise Profit &amp; Loss (P&amp;L) Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            0% Non-GST Revenue (Doors + Installation) − Raw Door BOM − Lock Kits − Paint BOM − Store Extras − Floor Gang Piece-Rates − Freight
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIncludeProjectedCosts((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              includeProjectedCosts
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
            title="Preview unissued Paint BOM (₹75/sq.ft) & unlogged standard stage piece rates for active WIP orders"
          >
            {includeProjectedCosts ? 'Mode: Including Projected Remaining Costs' : 'Mode: Actual Incurred Costs Only'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => loadProfitData(includeProjectedCosts)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Portfolio KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Portfolio Value</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatInr(summary?.totalRevenue || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            {summary?.linkedOrdersCount || 0}/{summary?.totalOrders || 0} linked • {summary?.totalDoors || 0} doors
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Materials &amp; BOQ Cost</span>
          <p className="text-xl font-black text-blue-400 font-mono">
            {formatInr(summary?.totalMaterialCost || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            BOM + Locks + Paint + Extras
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Piece-Rate Labor</span>
          <p className="text-xl font-black text-amber-400 font-mono">
            {formatInr(summary?.totalLaborCost || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            Molding, Cutting, Paint &amp; Fit
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Freight &amp; Direct Exp</span>
          <p className="text-xl font-black text-purple-400 font-mono">
            {formatInr(summary?.totalDirectExpenses || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            Transport, Loading, Comm.
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Order Profit</span>
          <p
            className={`text-xl font-black font-mono ${
              (summary?.totalNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(summary?.totalNetProfit || 0) < 0
              ? `-${formatInr(Math.abs(summary?.totalNetProfit || 0))}`
              : formatInr(summary?.totalNetProfit || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            Avg Margin {summary?.avgMarginPct || 0}% ({summary?.profitableOrdersCount || 0} Profit / {summary?.lossOrdersCount || 0} Loss)
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Job Card #, Quote #, Customer, Site or District..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer"
          >
            <option value="ALL">Filter: All Orders</option>
            <option value="COMPLETED">Completed Orders Only</option>
            <option value="ACTIVE">In Production / WIP</option>
            <option value="LINKED">Linked Revenue Only</option>
            <option value="LOSS">Loss / Negative Margin Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer"
          >
            <option value="DATE_DESC">Sort: Order Date (Newest)</option>
            <option value="PROFIT_DESC">Sort: Net Profit (High–Low)</option>
            <option value="PROFIT_ASC">Sort: Net Profit (Low–High)</option>
            <option value="MARGIN_DESC">Sort: Margin % (High–Low)</option>
            <option value="REVENUE_DESC">Sort: Order Value (High–Low)</option>
          </select>
        </div>
      </div>

      {/* Main Orders P&L Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Job Card / Quote</th>
                <th className="p-3">Customer / Site</th>
                <th className="p-3">Stage</th>
                <th className="p-3 text-center">Doors</th>
                <th className="p-3 text-right">Order Value</th>
                <th className="p-3 text-right">Materials</th>
                <th className="p-3 text-right">Piece-Rate</th>
                <th className="p-3 text-right">Freight / Exp</th>
                <th className="p-3 text-right">Net Profit</th>
                <th className="p-3 text-center">Margin</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400">
                    Computing real-time order-wise BOQ, piece-rate labor &amp; direct expenses...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400">
                    No production orders match the selected profit filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr
                    key={ord.orderId}
                    onClick={() => setSelectedOrderId(ord.orderId)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-red-400">{ord.jobCardNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {ord.quoteNumber || 'No Quote Linked'} • {ord.orderDate}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {ord.siteName} ({ord.district})
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-mono text-white">
                      {ord.totalDoors}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {ord.revenueSource === 'UNLINKED' ? (
                        <span className="text-slate-500 text-[10px]">Unlinked</span>
                      ) : (
                        formatInr(ord.totalOrderRevenue)
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-400">
                      {formatInr(ord.totalMaterialCost)}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-400">
                      {formatInr(ord.totalLaborCost)}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-400">
                      {formatInr(ord.totalDirectExpenses)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-black ${
                        ord.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span className="inline-flex items-center gap-0.5 justify-end">
                        {ord.netProfit >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {ord.netProfit < 0
                          ? `-${formatInr(Math.abs(ord.netProfit))}`
                          : formatInr(ord.netProfit)}
                      </span>
                      <span className="block text-[10px] font-normal text-slate-400">
                        {formatInr(ord.profitPerDoor)}/door
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${getMarginBadgeStyle(
                          ord
                        )}`}
                      >
                        {ord.revenueSource === 'UNLINKED' ? 'N/A' : `${ord.profitMarginPct}%`}
                      </span>
                    </td>
                    <td
                      className="p-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(ord.orderId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-red-400" />
                        <span>P&amp;L / +Exp</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderProfitDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        includeProjectedCosts={includeProjectedCosts}
        onClose={() => setSelectedOrderId(null)}
        onExpenseMutated={() => loadProfitData(includeProjectedCosts)}
      />
    </div>
  );
}
