'use client';

import React, { useRef } from 'react';
import { X, Printer, Lock, CheckCircle2, ShieldCheck, Ruler, ArrowRight, Wrench } from 'lucide-react';

export interface LockSettingDoorItem {
  tag: string;
  roomTag?: string;
  finishedSize: string;
  thickness: string;
  lockType: string;
  handing: string;
  backsetMm?: number;
  handleHeightMm?: number;
  accessories?: string[];
  remark?: string;
}

export interface LockSettingOrderData {
  orderNumber: string;
  jobCardNumber: string;
  customerName: string;
  siteLocation?: string;
  orderDate?: string;
  targetDate?: string;
  doors: LockSettingDoorItem[];
}

interface LockSettingBoqModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: LockSettingOrderData | null;
}

export function LockSettingBoqModal({ isOpen, onClose, orderData }: LockSettingBoqModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !orderData) return null;

  const handlePrint = () => {
    window.print();
  };

  // Group doors by lock type to summarize store requisitions
  const lockSummary: Record<string, number> = {};
  orderData.doors.forEach((d) => {
    const lock = d.lockType || 'Baby Latch (Standard)';
    lockSummary[lock] = (lockSummary[lock] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
        {/* Modal Top Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>POST-MOLDING LOCK &amp; HARDWARE SETTING BOQ SLIP</span>
                <span className="px-2 py-0.2 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">
                  CARPENTRY ROUTING STATION
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Official hardware issuance and mortise routing work order after compression molding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Setting Slip (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE A4 CONTENT */}
        <div className="p-6 md:p-8 overflow-y-auto flex justify-center bg-slate-900/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printRef}
            className="w-full max-w-[850px] bg-white text-slate-950 rounded-xl shadow-xl p-6 md:p-8 border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-black text-rose-600 tracking-wider">EXMARK</span>
                  <span className="text-xs font-bold text-slate-600 tracking-wider uppercase">FRP DOORS FACTORY</span>
                </div>
                <h1 className="text-base font-black uppercase text-slate-900 mt-1">
                  POST-MOLDING LOCK SETTING &amp; CARPENTRY FITTING SLIP
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  Station: Shutter Trimming, CNC Routing &amp; Hardware Setting Station (Post-Cure Stage)
                </p>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">
                  {orderData.jobCardNumber || 'JC-2026-FRP'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Order Ref: <strong>{orderData.orderNumber}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  Date: {orderData.orderDate || new Date().toISOString().slice(0, 10)}
                </div>
              </div>
            </div>

            {/* Customer & Order Summary Bar */}
            <div className="my-3.5 p-3 rounded-lg bg-slate-50 border border-slate-300 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Client / Party</span>
                <strong className="font-bold uppercase text-slate-900">{orderData.customerName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Site Delivery</span>
                <span className="text-slate-800">{orderData.siteLocation || 'Kerala Site'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Doors</span>
                <strong className="font-black text-indigo-700">{orderData.doors.length} Shutters</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Standard Backset</span>
                <strong className="text-slate-900">60mm Mortise / 50mm Latch</strong>
              </div>
            </div>

            {/* Hardware Issuance Summary from Store */}
            <div className="mb-4 p-3 bg-amber-50/70 border border-amber-300 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase mb-2">
                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                <span>Store Hardware Requisition Checklist (Issued to Carpentry Floor)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {Object.entries(lockSummary).map(([lockName, count]) => (
                  <div key={lockName} className="p-2 bg-white rounded border border-amber-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">{lockName}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-black text-xs">
                      {count} Sets
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Door-by-Door Lock Routing Specifications Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-2 border border-slate-700 text-center w-10">#</th>
                    <th className="p-2 border border-slate-700">Door Tag / Room</th>
                    <th className="p-2 border border-slate-700">Finished Size (H × W × Thk)</th>
                    <th className="p-2 border border-slate-700">Hand / Swing</th>
                    <th className="p-2 border border-slate-700">Lock Brand &amp; Type</th>
                    <th className="p-2 border border-slate-700 text-center">Handle Height</th>
                    <th className="p-2 border border-slate-700 text-center">Backset</th>
                    <th className="p-2 border border-slate-700 text-center">Carpenter Sign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {orderData.doors.map((door, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-2 border border-slate-300 font-bold text-center text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-slate-300">
                        <strong className="text-slate-900 block">{door.tag}</strong>
                        {door.roomTag && <span className="text-[10px] text-slate-500">{door.roomTag}</span>}
                      </td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-slate-800">
                        {door.finishedSize} ({door.thickness})
                      </td>
                      <td className="p-2 border border-slate-300 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${door.handing.startsWith('L') ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}`}>
                          {door.handing}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-300 font-bold text-slate-900">
                        {door.lockType}
                        {door.remark && <div className="text-[9.5px] text-amber-700 font-normal">{door.remark}</div>}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {door.handleHeightMm || 1000} mm
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {door.backsetMm || (door.lockType.toLowerCase().includes('baby') ? '50mm' : '60mm')}
                      </td>
                      <td className="p-2 border border-slate-300 text-center text-slate-400">
                        <div className="w-16 h-5 border-b border-dashed border-slate-400 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Technical Fitting Instructions & Standards */}
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/80 mb-4 text-[11px] text-slate-700 space-y-1">
              <div className="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Carpentry Mortise &amp; Routing Guidelines (IS 14856 : 2000 Standard)</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[10.5px]">
                <li><strong>Lock Centerline:</strong> 1000 mm (39.5 inches) from bottom finished edge unless site drawing specifies otherwise.</li>
                <li><strong>Internal Core Reinforcement:</strong> Verify that timber lock block (2×12×15 cm) is fully engaged before mortise drilling.</li>
                <li><strong>Baby Latch Fitting:</strong> Affix dual brass latch with 3.5×25mm stainless steel screws. Do not overtighten into FRP face sheet.</li>
                <li><strong>Key Throw Test:</strong> Cycle double-throw bolt 3 times with supplied keys. Latch action must be free without binding.</li>
              </ul>
            </div>

            {/* Floor Sign-off Section */}
            <div className="border-t-2 border-slate-800 pt-3 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Molding Batch Out By</span>
                <div className="h-7 border-b border-dashed border-slate-400 mt-1" />
                <span className="text-[9.5px] text-slate-500">Press Operator</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Carpentry Lock Setter</span>
                <div className="h-7 border-b border-dashed border-slate-400 mt-1" />
                <span className="text-[9.5px] text-slate-500">Technician Signature &amp; Date</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Final Hardware QC Pass</span>
                <div className="h-7 border-b border-dashed border-slate-400 mt-1 flex items-end justify-center text-emerald-700 font-bold text-[11px]">
                  [ ✓ PASS ]
                </div>
                <span className="text-[9.5px] text-slate-500">QC Inspector</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
