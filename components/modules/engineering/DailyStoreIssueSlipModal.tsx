'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  User,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BatchBoqCalculation, BoqDoorInput, BoqMaterialRatesConfig } from '@/lib/utils/boqFormulaEngine';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  BoqIssueShift,
  BoqIssueVoucherItem,
  BoqIssueVoucherRecord,
  ConsolidatedBoqBatchSummary,
} from '@/lib/services/boqIssueService';

export interface UpdatedOrderDoorPayload {
  id?: string;
  doorId?: string;
  doorNumber?: string;
  materialIssued?: boolean;
  materialIssuedAt?: string;
  materialIssueBatchId?: string;
  materialIssuedToGang?: string;
  materialIssuedValue?: number;
}

export interface UpdatedOrderPayload {
  id: string;
  boqIssuedAt?: string | null;
  doors: UpdatedOrderDoorPayload[];
}

export interface DailyStoreIssueResult {
  voucher: BoqIssueVoucherRecord;
  updatedOrder: UpdatedOrderPayload;
  allDoorsIssued: boolean;
  remainingPendingDoors: number;
  totalOrderIssuedValue: number;
}

export interface ConsolidatedBatchIssueResult {
  consolidatedBatchNumber: string;
  vouchers: BoqIssueVoucherRecord[];
  updatedOrders: UpdatedOrderPayload[];
  totalBatchValue: number;
  totalDoorsIssued: number;
  partiesClearedCount: number;
  partiesWithBalanceCount: number;
  totalBalanceDoorsLeft: number;
  consolidatedBatches: ConsolidatedBoqBatchSummary[];
}

export interface ConsolidatedPartySlipEntry {
  prodOrderId: string;
  orderNumber: string;
  jobCardNumber: string;
  customerName: string;
  totalOrderDoors: number;
  doorIds: string[];
  doorNumbers: string[];
  selectedSqFt: number;
  balanceDoorsAfter: number;
}

interface DailyStoreIssueSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    prodOrderId?: string;
    orderNumber?: string;
    jobCardNumber: string;
    customerName: string;
    siteName?: string;
    doorsCount: number;
  } | null;
  selectedDoors: BoqDoorInput[];
  boq: BatchBoqCalculation;
  ratesConfig: BoqMaterialRatesConfig;
  customItems?: BoqIssueVoucherItem[];
  bufferPercent?: number;
  initialGangName?: string;
  initialShift?: BoqIssueShift;
  notes?: string;
  previewVoucher?: BoqIssueVoucherRecord | null;
  // Consolidated multi-party batch support
  consolidatedEntries?: ConsolidatedPartySlipEntry[];
  previewConsolidatedBatch?: ConsolidatedBoqBatchSummary | null;
  onIssued?: (result: DailyStoreIssueResult) => void;
  onConsolidatedIssued?: (result: ConsolidatedBatchIssueResult, message: string) => void;
}

export function DailyStoreIssueSlipModal({
  isOpen,
  onClose,
  order,
  selectedDoors,
  boq,
  ratesConfig,
  customItems,
  bufferPercent = 0,
  initialGangName = 'ASHIK (Floor Gang)',
  initialShift = 'MORNING',
  notes = '',
  previewVoucher = null,
  consolidatedEntries,
  previewConsolidatedBatch = null,
  onIssued,
  onConsolidatedIssued,
}: DailyStoreIssueSlipModalProps) {
  const [shift, setShift] = useState<BoqIssueShift>(initialShift);
  const [gangName, setGangName] = useState<string>(initialGangName || 'ASHIK (Floor Gang)');
  const [storekeeperName, setStorekeeperName] = useState<string>('Storekeeper In-Charge');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [issueNotice, setIssueNotice] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [savedVoucherNumber, setSavedVoucherNumber] = useState<string | null>(null);

  const isConsolidatedMode =
    Boolean(previewConsolidatedBatch) ||
    (Array.isArray(consolidatedEntries) && consolidatedEntries.length > 0);
  const isHistoricalPreview = Boolean(previewVoucher || previewConsolidatedBatch);

  useEffect(() => {
    if (isOpen) {
      setShift(
        previewConsolidatedBatch?.shift || previewVoucher?.shift || initialShift || 'MORNING'
      );
      setGangName(
        previewConsolidatedBatch?.gangName ||
          previewVoucher?.gangName ||
          initialGangName ||
          'ASHIK (Floor Gang)'
      );
      setStorekeeperName(
        previewConsolidatedBatch?.issuedBy || previewVoucher?.issuedBy || 'Storekeeper In-Charge'
      );
      setIssueNotice(null);
      setIssueError(null);
      setSavedVoucherNumber(
        previewConsolidatedBatch?.batchNumber || previewVoucher?.voucherNumber || null
      );
    }
  }, [isOpen, initialGangName, initialShift, previewVoucher, previewConsolidatedBatch]);

  const effectiveItems = useMemo<BoqIssueVoucherItem[]>(() => {
    if (previewConsolidatedBatch && previewConsolidatedBatch.items.length > 0) {
      return previewConsolidatedBatch.items;
    }
    if (previewVoucher && previewVoucher.items.length > 0) {
      return previewVoucher.items;
    }
    if (customItems && customItems.length > 0) {
      return customItems;
    }
    return [
      {
        key: 'resin',
        name: 'General Purpose FRP Polyester Resin',
        unit: 'Kg',
        formulaQty: Number(boq.resinKg.toFixed(2)),
        issuedQty: Number(boq.resinKg.toFixed(2)),
        rate: ratesConfig.resinRatePerKg,
        value: Math.round(boq.resinKg * ratesConfig.resinRatePerKg),
        category: 'Chemical',
      },
      {
        key: 'gel',
        name: 'ISO/NPG Gelcoat Surface Coat',
        unit: 'Kg',
        formulaQty: Number(boq.gelKg.toFixed(2)),
        issuedQty: Number(boq.gelKg.toFixed(2)),
        rate: ratesConfig.gelRatePerKg,
        value: Math.round(boq.gelKg * ratesConfig.gelRatePerKg),
        category: 'Chemical',
      },
      {
        key: 'csm300',
        name: 'Chopped Strand Mat (CSM 300 GSM)',
        unit: 'Kg',
        formulaQty: Number(boq.csm300Kg.toFixed(2)),
        issuedQty: Number(boq.csm300Kg.toFixed(2)),
        rate: ratesConfig.csm300RatePerKg,
        value: Math.round(boq.csm300Kg * ratesConfig.csm300RatePerKg),
        category: '300 GSM',
      },
      {
        key: 'catalystGrams',
        name: 'MEKP Catalyst (Hardener)',
        unit: 'gm',
        formulaQty: Math.round(boq.catalystGrams),
        issuedQty: Math.round(boq.catalystGrams),
        rate: ratesConfig.catalystRatePerKg / 1000,
        value: Math.round((boq.catalystGrams / 1000) * ratesConfig.catalystRatePerKg),
        category: 'Catalyst',
      },
      {
        key: 'acceleratorGrams',
        name: 'Cobalt Octoate Accelerator',
        unit: 'gm',
        formulaQty: Math.round(boq.acceleratorGrams),
        issuedQty: Math.round(boq.acceleratorGrams),
        rate: ratesConfig.acceleratorRatePerKg / 1000,
        value: Math.round((boq.acceleratorGrams / 1000) * ratesConfig.acceleratorRatePerKg),
        category: 'Accelerator',
      },
      {
        key: 'timber',
        name: 'Timber Reepers (Frame + Shutter Wood)',
        unit: 'Cu.Ft',
        formulaQty: Number(boq.totalWoodCuFt.toFixed(4)),
        issuedQty: Number(boq.totalWoodCuFt.toFixed(4)),
        rate: ratesConfig.woodRatePerCuFt,
        value: Math.round(boq.totalWoodCuFt * ratesConfig.woodRatePerCuFt),
        category: 'Timber',
      },
      {
        key: 'foam',
        name: `Rigid Foam Sheet (${ratesConfig.foamSheet.widthCm}×${ratesConfig.foamSheet.heightCm} cm)`,
        unit: 'Sheets',
        formulaQty: Number(boq.foamSheetsExact.toFixed(2)),
        issuedQty: Number(boq.foamSheetsExact.toFixed(2)),
        rate: ratesConfig.foamSheet.costPerSheet,
        value: Math.round(boq.foamSheetsExact * ratesConfig.foamSheet.costPerSheet),
        category: 'Rigid Foam',
      },
    ];
  }, [previewConsolidatedBatch, previewVoucher, customItems, boq, ratesConfig]);

  if (!isOpen || (!order && !previewVoucher && !isConsolidatedMode)) return null;

  const displayJobCard = previewConsolidatedBatch
    ? `${previewConsolidatedBatch.partiesCount} Parties Batch`
    : isConsolidatedMode
    ? `${consolidatedEntries?.length || 0} Parties Batch`
    : previewVoucher?.jobCardNumber || order?.jobCardNumber || '';

  const displayCustomer = previewConsolidatedBatch
    ? previewConsolidatedBatch.partyBreakdowns.map((p) => p.customerName.split('(')[0].trim()).join(' + ')
    : isConsolidatedMode
    ? (consolidatedEntries || []).map((p) => p.customerName.split('(')[0].trim()).join(' + ')
    : previewVoucher?.customerName || order?.customerName || '';

  const selectedCount = previewConsolidatedBatch
    ? previewConsolidatedBatch.totalDoors
    : isConsolidatedMode
    ? (consolidatedEntries || []).reduce((s, e) => s + e.doorIds.length, 0)
    : previewVoucher
    ? previewVoucher.doorsCount
    : selectedDoors.length;

  const totalDoorsInOrder = previewConsolidatedBatch
    ? previewConsolidatedBatch.totalDoors
    : isConsolidatedMode
    ? (consolidatedEntries || []).reduce((s, e) => s + e.totalOrderDoors, 0)
    : order?.doorsCount || previewVoucher?.doorsCount || selectedDoors.length;

  const pct = totalDoorsInOrder > 0 ? Math.round((selectedCount / totalDoorsInOrder) * 100) : 100;
  const voucherNumber =
    savedVoucherNumber ||
    (isConsolidatedMode
      ? `BATCH-${Date.now().toString().slice(-6)}`
      : `VCH-${displayJobCard.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`);
  const todayStr = previewConsolidatedBatch?.issueDate
    ? previewConsolidatedBatch.issueDate
    : previewVoucher?.issueDate
    ? previewVoucher.issueDate
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const totalSlipValue = Math.round(
    effectiveItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  );

  const handleConfirmAndPrint = async () => {
    if (isHistoricalPreview) {
      window.print();
      return;
    }

    setIsSubmitting(true);
    setIssueError(null);
    try {
      if (isConsolidatedMode && consolidatedEntries && consolidatedEntries.length > 0) {
        const res = await apiFetch('/api/boq/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'CONSOLIDATED_BATCH',
            entries: consolidatedEntries.map((e) => ({
              prodOrderId: e.prodOrderId,
              orderNumber: e.orderNumber,
              jobCardNumber: e.jobCardNumber,
              customerName: e.customerName,
              doorIds: e.doorIds,
              doorNumbers: e.doorNumbers,
              selectedSqFt: e.selectedSqFt,
            })),
            items: effectiveItems,
            shift,
            gangName: gangName.trim() || 'Production Floor Team',
            issuedBy: storekeeperName.trim() || 'Storekeeper In-Charge',
            bufferPercent,
            notes: notes.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `HTTP ${res.status} while saving consolidated BOQ batch`);
        }

        const result = json.data as ConsolidatedBatchIssueResult;
        setSavedVoucherNumber(result.consolidatedBatchNumber);
        const msg =
          json.message ||
          `Issued Consolidated Batch ${result.consolidatedBatchNumber} (${result.totalDoorsIssued} doors, ₹${result.totalBatchValue.toLocaleString('en-IN')}).`;
        setIssueNotice(`${msg} Printing voucher...`);
        if (onConsolidatedIssued) {
          onConsolidatedIssued(result, msg);
        }
      } else {
        const doorIds = selectedDoors
          .map((d) => d.id || d.doorId || d.doorNumber)
          .filter(Boolean) as string[];
        const doorNumbers = selectedDoors.map((d, idx) => d.doorNumber || `D-${idx + 1}`);

        if (doorIds.length === 0) {
          setIssueError('Select at least one door before confirming material issue.');
          setIsSubmitting(false);
          return;
        }

        if (order?.prodOrderId) {
          const res = await apiFetch('/api/boq/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prodOrderId: order.prodOrderId,
              orderNumber: order.orderNumber || order.id,
              jobCardNumber: order.jobCardNumber,
              customerName: order.customerName,
              doorIds,
              doorNumbers,
              items: effectiveItems,
              shift,
              gangName: gangName.trim() || 'Production Floor Team',
              issuedBy: storekeeperName.trim() || 'Storekeeper In-Charge',
              bufferPercent,
              notes: notes.trim() || undefined,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || `HTTP ${res.status} while saving BOQ issue voucher`);
          }

          const result = json.data as DailyStoreIssueResult;
          setSavedVoucherNumber(result.voucher.voucherNumber);
          setIssueNotice(
            json.message ||
              `Issued ${result.voucher.voucherNumber} for ${selectedCount} doors (₹${result.voucher.totalIssuedValue.toLocaleString('en-IN')}). Printing voucher...`
          );
          if (onIssued) {
            onIssued(result);
          }
        }
      }

      setTimeout(() => {
        window.print();
        setIsSubmitting(false);
      }, 450);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record material issue';
      console.error('Failed to record material issue:', err);
      setIssueError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs printable-modal-root">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-6 space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white print:text-black print:max-w-none print:max-h-none print:overflow-visible">
        {/* Notices */}
        {issueNotice && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{issueNotice}</span>
          </div>
        )}
        {issueError && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 print:hidden">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{issueError}</span>
          </div>
        )}

        {/* Modal Header (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center shadow-md shadow-amber-950/50">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2 flex-wrap">
                <span>
                  {isConsolidatedMode
                    ? isHistoricalPreview
                      ? 'Saved Consolidated Multi-Party Issue Voucher'
                      : 'Consolidated Multi-Party Store Issue Slip'
                    : isHistoricalPreview
                    ? 'Saved BOQ Material Issue Voucher'
                    : 'Daily Store Material Issue Slip'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-600/20 border border-amber-500/40 font-mono text-xs text-amber-300">
                  {displayJobCard}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/40 font-mono text-xs text-emerald-300">
                  Value: ₹{totalSlipValue.toLocaleString('en-IN')}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {selectedCount} Doors &bull; {effectiveItems.length} Marked Material Items &bull;{' '}
                <span className="text-slate-200">{displayCustomer}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmAndPrint}
              disabled={isSubmitting || selectedCount === 0 || effectiveItems.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/50 cursor-pointer transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isHistoricalPreview
                  ? 'Print Voucher'
                  : isSubmitting
                  ? 'Recording Issue...'
                  : `Confirm Issue (₹${totalSlipValue.toLocaleString('en-IN')}) & Print`}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Bar (Shift & Contractor Inputs - Hidden in Print) */}
        {!isHistoricalPreview && (
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs print:hidden">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Manufacturing Shift</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as BoqIssueShift)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs font-bold cursor-pointer"
              >
                <option value="MORNING">Morning Shift (08:00 AM - 02:00 PM)</option>
                <option value="AFTERNOON">Afternoon Shift (02:00 PM - 08:00 PM)</option>
                <option value="EVENING">Night / Evening Shift (08:00 PM - 02:00 AM)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Floor Team / Gang</span>
              </label>
              <input
                type="text"
                value={gangName}
                onChange={(e) => setGangName(e.target.value)}
                placeholder="e.g. ASHIK (Floor Gang)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Storekeeper In-Charge</span>
              </label>
              <input
                type="text"
                value={storekeeperName}
                onChange={(e) => setStorekeeperName(e.target.value)}
                placeholder="e.g. Storekeeper In-Charge"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs font-bold"
              />
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* PRINTABLE SLIP CANVAS (A4 Format)                                     */}
        {/* ===================================================================== */}
        <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl border border-slate-300 print:border-none print:p-0 shadow-lg font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                EXMARK FRP DOORS &amp; FRAMES
              </h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                Industrial Manufacturing Unit &bull;{' '}
                {isConsolidatedMode
                  ? 'Consolidated Multi-Party Store Material Issue Voucher'
                  : 'Store BOQ Raw Material Issue Voucher'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-slate-950 text-white font-mono text-xs font-black">
                {voucherNumber}
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Date: {todayStr} | {shift} SHIFT
              </p>
            </div>
          </div>

          {/* Job Card & Party Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b border-slate-300 text-xs">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">
                {isConsolidatedMode ? 'Batch Scope' : 'Job Card Number'}
              </span>
              <strong className="font-mono text-sm text-slate-950">{displayJobCard}</strong>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">
                {isConsolidatedMode ? 'Combined Parties' : 'Customer / Project'}
              </span>
              <strong className="text-xs text-slate-900 truncate block">{displayCustomer}</strong>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Issued Gang / Team</span>
              <strong className="text-xs text-amber-900 block">{gangName}</strong>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Doors Issued</span>
              <strong className="text-xs text-emerald-800 block">
                {selectedCount} of {totalDoorsInOrder} Doors ({pct}%)
              </strong>
            </div>
          </div>

          {/* Doors Included Strip (Per-Party Breakdown for Consolidated Batch OR Single Order Chips) */}
          <div className="py-2.5 border-b border-slate-300 text-xs">
            {isConsolidatedMode ? (
              <div className="space-y-1.5">
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block">
                  Party-Wise Partial Doors Covered in this Consolidated Batch ({selectedCount} Doors Total):
                </span>
                <table className="w-full text-left text-[11px] border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[9.5px] uppercase text-slate-700 font-black">
                      <th className="p-1.5 border-r border-slate-300">Job Card</th>
                      <th className="p-1.5 border-r border-slate-300">Party / Customer</th>
                      <th className="p-1.5 border-r border-slate-300">Doors Issued Today</th>
                      <th className="p-1.5 text-right">
                        {previewConsolidatedBatch ? 'Pro-Rated Value (₹)' : 'Balance Next Day'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewConsolidatedBatch
                      ? previewConsolidatedBatch.partyBreakdowns.map((pb) => (
                          <tr key={pb.voucherId}>
                            <td className="p-1.5 border-r border-slate-200 font-mono font-bold">
                              {pb.jobCardNumber}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-bold">
                              {pb.customerName}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-mono">
                              <strong>{pb.doorsCount}</strong> ({pb.doorNumbers.join(', ')})
                            </td>
                            <td className="p-1.5 text-right font-mono font-bold text-emerald-900">
                              ₹{Math.round(pb.value).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      : (consolidatedEntries || []).map((ce) => (
                          <tr key={ce.prodOrderId}>
                            <td className="p-1.5 border-r border-slate-200 font-mono font-bold">
                              {ce.jobCardNumber}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-bold">
                              {ce.customerName}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-mono">
                              <strong>
                                {ce.doorIds.length}/{ce.totalOrderDoors}
                              </strong>{' '}
                              ({ce.doorNumbers.join(', ')})
                            </td>
                            <td className="p-1.5 text-right font-mono font-bold">
                              {ce.balanceDoorsAfter > 0 ? (
                                <span className="text-amber-800">{ce.balanceDoorsAfter} Left</span>
                              ) : (
                                <span className="text-emerald-800">0 (Cleared)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block mb-1">
                  Doors Covered in this Material Issue ({selectedCount} Units):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {previewVoucher
                    ? previewVoucher.doorNumbers.map((dn, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10.5px] font-bold text-slate-800"
                        >
                          {dn}
                        </span>
                      ))
                    : selectedDoors.map((d, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10.5px] font-bold text-slate-800"
                        >
                          {d.doorNumber || `D-${i + 1}`} ({d.widthCm}&times;{d.heightCm}cm)
                        </span>
                      ))}
                </div>
              </>
            )}
          </div>

          {/* Material Requisition Table */}
          <div className="py-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide mb-1.5">
              Issued Materials &amp; Valuation ({effectiveItems.length} Checked Items for {selectedCount} Doors)
            </h3>
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-black border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                  <th className="p-2 border-r border-slate-300">Material Description</th>
                  <th className="p-2 border-r border-slate-300 w-24 text-right">Formula Qty</th>
                  <th className="p-2 border-r border-slate-300 w-28 text-right">Issued Qty</th>
                  <th className="p-2 border-r border-slate-300 w-24 text-right">Value (₹)</th>
                  <th className="p-2 w-24 text-center">Store Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {effectiveItems.map((item, idx) => (
                  <tr key={`${item.key}-${idx}`}>
                    <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <strong className="text-slate-900">{item.name}</strong>
                      <span className="block text-[9.5px] text-slate-500">{item.category}</span>
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono text-slate-500">
                      {item.formulaQty} {item.unit}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                      {item.issuedQty} {item.unit}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 font-mono font-bold text-emerald-900">
                      ₹{Math.round(item.value).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-400">[ &nbsp;✓&nbsp; ]</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black">
                  <td colSpan={4} className="p-2.5 text-right uppercase text-[11px]">
                    Total Issued Material Value ({selectedCount} Doors):
                  </td>
                  <td className="p-2.5 text-right font-mono text-sm">
                    ₹{totalSlipValue.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-center text-[10px]">APPROVED</td>
                </tr>
              </tfoot>
            </table>
            {(previewConsolidatedBatch?.notes || previewVoucher?.notes || notes) && (
              <p className="mt-2 text-[10.5px] text-slate-600">
                <strong>Note:</strong> {previewConsolidatedBatch?.notes || previewVoucher?.notes || notes}
              </p>
            )}
          </div>

          {/* Signatures & Approvals */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-slate-300 text-xs">
            <div className="border-t border-slate-900 pt-2 text-center">
              <strong className="block text-slate-950">{storekeeperName}</strong>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Storekeeper Signature &amp; Material Released
              </span>
            </div>
            <div className="border-t border-slate-900 pt-2 text-center">
              <strong className="block text-slate-950">{gangName}</strong>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Contractor / Gang Receiver Signature
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
