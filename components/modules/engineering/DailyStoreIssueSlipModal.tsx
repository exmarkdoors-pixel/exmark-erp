'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, PackageCheck, AlertCircle, Calendar, User, Clock, ShieldCheck } from 'lucide-react';
import { BatchBoqCalculation, BoqDoorInput, BoqMaterialRatesConfig } from '@/lib/utils/boqFormulaEngine';

interface DailyStoreIssueSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    prodOrderId?: string;
    jobCardNumber: string;
    customerName: string;
    siteName?: string;
    doorsCount: number;
  } | null;
  selectedDoors: BoqDoorInput[];
  boq: BatchBoqCalculation;
  ratesConfig: BoqMaterialRatesConfig;
  onIssued?: (issuedDoorIds: string[]) => void;
}

export function DailyStoreIssueSlipModal({
  isOpen,
  onClose,
  order,
  selectedDoors,
  boq,
  ratesConfig,
  onIssued,
}: DailyStoreIssueSlipModalProps) {
  const [shift, setShift] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [gangName, setGangName] = useState<string>('ASHIK (Floor Gang)');
  const [storekeeperName, setStorekeeperName] = useState<string>('Storekeeper In-Charge');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [issueNotice, setIssueNotice] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const totalDoorsInOrder = order.doorsCount || selectedDoors.length;
  const selectedCount = selectedDoors.length;
  const pct = totalDoorsInOrder > 0 ? Math.round((selectedCount / totalDoorsInOrder) * 100) : 100;
  const voucherNumber = `VCH-${order.jobCardNumber.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleConfirmAndPrint = async () => {
    setIsSubmitting(true);
    try {
      const doorIds = selectedDoors.map((d) => d.id || d.doorId).filter(Boolean) as string[];
      if (doorIds.length > 0 && order.prodOrderId) {
        await fetch(`/api/production/${encodeURIComponent(order.prodOrderId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ISSUE_DOOR_MATERIALS',
            doorIds,
            gangName,
            shift,
          }),
        });
        if (onIssued) {
          onIssued(doorIds);
        }
      }
      setIssueNotice(`Issued materials for ${selectedCount} doors in Job Card ${order.jobCardNumber}. Printing voucher...`);
      setTimeout(() => {
        window.print();
        setIsSubmitting(false);
      }, 500);
    } catch (err) {
      console.error('Failed to record material issue:', err);
      window.print();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs printable-modal-root">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-6 space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white print:text-black print:max-w-none print:max-h-none print:overflow-visible">
        {/* Toast */}
        {issueNotice && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{issueNotice}</span>
          </div>
        )}

        {/* Modal Header (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center shadow-md shadow-amber-950/50">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Daily Store Material Issue Slip</span>
                <span className="px-2 py-0.5 rounded bg-amber-600/20 border border-amber-500/40 font-mono text-xs text-amber-300">
                  {order.jobCardNumber}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Slicing <strong className="text-white">{selectedCount} Doors</strong> for Today&apos;s Heat &bull; Customer: <span className="text-slate-200">{order.customerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmAndPrint}
              disabled={isSubmitting || selectedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/50 cursor-pointer transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Issue...' : 'Confirm Issue & Print Slip'}</span>
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
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs print:hidden">
          <div>
            <label className="block text-[10.5px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manufacturing Shift</span>
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
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
              <span>Floor Contractor / Gang</span>
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

        {/* ===================================================================== */}
        {/* PRINTABLE SLIP CANVAS (A4 Format)                                     */}
        {/* ===================================================================== */}
        <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl border border-slate-300 print:border-none print:p-0 shadow-lg font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">EXMARK FRP DOORS &amp; FRAMES</h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                Industrial Manufacturing Unit &bull; Daily Store Raw Material Issue Slip
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-slate-950 text-white font-mono text-xs font-black">
                {voucherNumber}
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Date: {todayStr} | {shift} SHIFT</p>
            </div>
          </div>

          {/* Job Card & Party Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b border-slate-300 text-xs">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Job Card Number</span>
              <strong className="font-mono text-sm text-slate-950">{order.jobCardNumber}</strong>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Customer / Project</span>
              <strong className="text-xs text-slate-900 truncate block">{order.customerName}</strong>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Issued Gang / Contractor</span>
              <strong className="text-xs text-amber-900 block">{gangName}</strong>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Batch Progress</span>
              <strong className="text-xs text-emerald-800 block">
                {selectedCount} of {totalDoorsInOrder} Doors ({pct}%)
              </strong>
            </div>
          </div>

          {/* Doors Included Strip */}
          <div className="py-2.5 border-b border-slate-300 text-xs">
            <span className="text-[9.5px] uppercase font-bold text-slate-500 block mb-1">
              Doors Covered in this Material Batch ({selectedCount} Units):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedDoors.map((d, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10.5px] font-bold text-slate-800"
                >
                  {d.doorNumber || `D-${i + 1}`} ({d.widthCm}&times;{d.heightCm}cm)
                </span>
              ))}
            </div>
          </div>

          {/* Material Requisition Table */}
          <div className="py-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide mb-1.5">
              Exact Chemical Recipe &amp; Raw Material Requirements ({selectedCount} Doors)
            </h3>
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-black border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                  <th className="p-2 border-r border-slate-300">Material Description</th>
                  <th className="p-2 border-r border-slate-300 w-28 text-center">Standard Ratio / Norm</th>
                  <th className="p-2 border-r border-slate-300 w-28 text-right">Batch Required</th>
                  <th className="p-2 w-28 text-center">Store Issue Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {/* 1. Resin */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">1</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">General Purpose FRP Polyester Resin</strong>
                    <span className="block text-[9.5px] text-slate-500">Virgin grade laminating resin for door skin + frame</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">6.50 kg / Door</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {boq.resinKg.toFixed(2)} Kg
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Kg ]</td>
                </tr>

                {/* 2. Gelcoat */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">2</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">ISO/NPG White / Clear Tooling Gelcoat</strong>
                    <span className="block text-[9.5px] text-slate-500">Surface UV protective coat (0.45mm thickness)</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">0.90 kg / Door</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {boq.gelKg.toFixed(2)} Kg
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Kg ]</td>
                </tr>

                {/* 3. CSM 300 / 450 Mat */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">3</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">Chopped Strand Mat (CSM 300/450)</strong>
                    <span className="block text-[9.5px] text-slate-500">E-Glass reinforcement matrix (450 GSM dual-layer)</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">2.20 kg / Door</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {boq.csm300Kg.toFixed(2)} Kg
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Kg ]</td>
                </tr>

                {/* 4. MEKP Catalyst */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">4</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">MEKP Catalyst (Hardener)</strong>
                    <span className="block text-[9.5px] text-slate-500">1.5% - 2.0% ratio by total resin mass</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">1.8% of Resin</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {Math.round(boq.catalystGrams)} g
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; g ]</td>
                </tr>

                {/* 5. Cobalt Accelerator */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">5</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">Cobalt Octoate 6% (Accelerator)</strong>
                    <span className="block text-[9.5px] text-slate-500">0.5% - 0.8% ratio by total resin mass</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">0.6% of Resin</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {Math.round(boq.acceleratorGrams)} g
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; g ]</td>
                </tr>

                {/* 6. Timber Reepers */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">6</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">Core Reinforcement Timber Reepers</strong>
                    <span className="block text-[9.5px] text-slate-500">Seasoned hardwood internal lock block &amp; perimeter frame</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">0.40 cu.ft / Door</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {boq.totalWoodCuFt.toFixed(2)} Cu.Ft
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Pcs ]</td>
                </tr>

                {/* 7. Chowkhat Frames */}
                <tr>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px]">7</td>
                  <td className="p-2 border-r border-slate-200">
                    <strong className="text-slate-900">Chowkhat Section / Frames</strong>
                    <span className="block text-[9.5px] text-slate-500">Matched door frame profiles for selected doors</span>
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">1 Set / Door</td>
                  <td className="p-2 text-right border-r border-slate-200 font-mono font-black text-slate-950">
                    {selectedCount} Sets
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-400">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Sets ]</td>
                </tr>
              </tbody>
            </table>
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
