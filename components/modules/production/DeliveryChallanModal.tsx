'use client';

import React, { useRef } from 'react';
import { ProductionOrder } from '@/lib/services/productionService';
import { X, Printer, Truck, CheckCircle2, ShieldCheck, MapPin, Building, Calendar } from 'lucide-react';

interface DeliveryChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

export function DeliveryChallanModal({ isOpen, onClose, order }: DeliveryChallanModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const challanNo = `DC-2026-${order.jobCardNumber.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto printable-modal-root">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Factory Delivery Challan &amp; Dispatch Slip
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                  Direct Non-GST Dispatch
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official delivery document for site transport &amp; gate-pass clearance (Direct Non-GST Sales Mode — no GST tax billing).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Challan (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Challan Document */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40 print:p-0 print:bg-white">
          <div
            ref={printAreaRef}
            className="bg-white text-slate-900 p-8 rounded-xl shadow-md border border-slate-200 text-xs print:p-0 print:border-none print:shadow-none"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-red-600 uppercase">
                    EXMARK DOORS PRIVATE LIMITED
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Central Manufacturing Unit • Industrial Area, Malappuram, Kerala — 676505
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Phone: +91 94470 00000 | Email: factory@exmarkdoors.com | Web: www.exmarkdoors.com
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 font-mono font-bold text-sm tracking-wider uppercase rounded">
                    DELIVERY CHALLAN
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-mono">
                    Challan No: <strong className="text-slate-900">{challanNo}</strong>
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    Date: <strong className="text-slate-900">{currentDate}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Consignee & Production Metadata */}
            <div className="grid grid-cols-2 gap-6 pb-4 mb-6 border-b border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Delivery Destination / Consignee:
                </span>
                <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
                <p className="text-slate-700 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Site: {order.siteName}
                </p>
                <p className="text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  District: {order.district}, Kerala
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Manufacturing &amp; Dispatch Ref:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Job Card:</span>{' '}
                    <strong className="font-mono">{order.jobCardNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sales Order:</span>{' '}
                    <strong className="font-mono">{order.salesOrderId || 'SO-DIRECT'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Plant Line:</span>{' '}
                    <strong>{order.lineAssigned}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Quantity:</span>{' '}
                    <strong className="text-red-600 font-bold">{order.quantity} Doors</strong>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-amber-800 font-medium">
                  Notice: Goods dispatched for site installation. Commercial Sales Bill will be issued separately if applicable.
                </div>
              </div>
            </div>

            {/* Door Schedule Table */}
            <div className="mb-6">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                Dispatched Door Item Schedule &amp; Specifications
              </h3>
              <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 uppercase text-[9px] text-slate-600 font-bold">
                  <tr>
                    <th className="border border-slate-300 px-2 py-1.5">#</th>
                    <th className="border border-slate-300 px-2 py-1.5">Door Serial ID</th>
                    <th className="border border-slate-300 px-2 py-1.5">Location</th>
                    <th className="border border-slate-300 px-2 py-1.5">Model</th>
                    <th className="border border-slate-300 px-2 py-1.5">Finished Size (H x W)</th>
                    <th className="border border-slate-300 px-2 py-1.5">Handing</th>
                    <th className="border border-slate-300 px-2 py-1.5">Lock Type</th>
                    <th className="border border-slate-300 px-2 py-1.5">Color / Finish</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">QC Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.doors.map((door, idx) => (
                    <tr key={door.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-300 px-2 py-1.5 font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-mono font-bold text-slate-900">
                        {door.doorId}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">{door.doorNumber}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{door.model}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-mono font-bold text-slate-800">
                        {door.finishedHeightMm} × {door.finishedWidthMm} mm
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-bold">{door.handing}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{door.lockType}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{door.finishColor}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-emerald-700">
                        ✓ {door.qcStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quality & Security Dispatch Verification */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-700 mb-8">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>100% Water &amp; Weatherproof</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Edges Sealed &amp; Bubble Wrapped</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>12L Barcodes Attached</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>IS 14856 Standard Compliant</span>
              </div>
            </div>

            {/* Signatures & Gate Pass Clearance */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-300 text-center">
              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                <p className="font-bold text-slate-900">Factory In-Charge / Dispatch</p>
                <p className="text-[10px] text-slate-500">EXMARK Doors Unit</p>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                <p className="font-bold text-slate-900">Transporter / Driver Sign</p>
                <p className="text-[10px] text-slate-500">Vehicle No: _________________</p>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                <p className="font-bold text-slate-900">Site Receiver / Client</p>
                <p className="text-[10px] text-slate-500">Signature &amp; Date Received</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
