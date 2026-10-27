'use client';

import React, { useState } from 'react';
import { X, Printer, QrCode, CheckCircle2 } from 'lucide-react';
import { ProductionOrder } from '@/lib/services/productionService';

interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

export function StickerPrintModal({ isOpen, onClose, order }: StickerPrintModalProps) {
  const [printMode, setPrintMode] = useState<'A4_SHEET' | 'THERMAL'>('A4_SHEET');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 print:p-0 print:border-none print:shadow-none print:bg-white print:max-w-none print:max-h-none print:overflow-visible">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Door Barcode / QR Identification Labels
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Job Card: <span className="font-mono font-bold text-red-500">{order.jobCardNumber}</span> • Customer: {order.customerName} ({order.siteName})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintMode('A4_SHEET')}
                className={`px-3 py-1 rounded-md transition-all ${
                  printMode === 'A4_SHEET'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                A4 Sheet (2x6 = 12/Page)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('THERMAL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  printMode === 'THERMAL'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                Thermal Label (4x2 Inch)
              </button>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Stickers
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Stickers Area */}
        <div className="space-y-4">
          {printMode === 'A4_SHEET' ? (
            /* A4 Sheet Grid: 2 Columns x 6 Rows = 12 Stickers per page */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2 print:p-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 print:border-none print:bg-white print:text-black">
              {order.doors.map((door) => {
                const heightInches = (door.finishedHeightMm / 25.4).toFixed(1);
                const widthInches = (door.finishedWidthMm / 25.4).toFixed(1);
                return (
                  <div
                    key={door.id}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-800 dark:border-slate-700 space-y-2 shadow-xs print:border-black print:bg-white print:text-black print:break-inside-avoid"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 print:border-black pb-1.5">
                      <div>
                        <span className="text-xs font-black tracking-wider text-red-600 print:text-black">
                          EXMARK DOORS
                        </span>
                        <span className="text-[9px] block text-slate-500 print:text-gray-600">
                          Kerala Premium FRP Doors
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 print:bg-gray-200 rounded">
                          {door.doorId}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-mono">
                          {order.jobCardNumber}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 print:text-gray-500 block">Location:</span>
                        <span className="font-bold text-slate-900 dark:text-white print:text-black">
                          {door.doorNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 print:text-gray-500 block">Client & Site:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black truncate block">
                          {order.customerName} ({order.district})
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400 print:text-gray-500">Model:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">
                          {door.model}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 print:text-gray-500">Finish:</span>
                        <span className="font-medium">{door.finishColor}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 px-1.5 bg-red-50 dark:bg-red-950/30 print:bg-gray-100 rounded border border-red-200 dark:border-red-900/40 print:border-gray-400">
                        <span className="font-bold text-red-700 dark:text-red-400 print:text-black">
                          CUT SIZE:
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-white print:text-black">
                          {door.finishedHeightMm} x {door.finishedWidthMm} mm ({heightInches}&quot; x {widthInches}&quot;)
                        </span>
                      </div>
                    </div>

                    {/* Footer: Handing, Lock, QC */}
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-800 print:border-black text-[9px]">
                      <div>
                        <span className="font-bold">Handing:</span> {door.handing} •{' '}
                        <span className="font-bold">Lock:</span> {door.lockType}
                      </div>
                      <div className="flex items-center gap-1 font-bold text-emerald-600 print:text-black">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>QC PASSED</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Thermal Label Mode: 4x2 Inch Industrial format */
            <div className="space-y-4 max-w-md mx-auto">
              {order.doors.map((door) => {
                const heightInches = (door.finishedHeightMm / 25.4).toFixed(1);
                const widthInches = (door.finishedWidthMm / 25.4).toFixed(1);
                return (
                  <div
                    key={door.id}
                    className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-black space-y-2 print:break-inside-avoid print:bg-white print:text-black"
                  >
                    <div className="flex justify-between items-center border-b border-black pb-1">
                      <span className="font-black text-sm tracking-wider">EXMARK DOORS</span>
                      <span className="font-mono text-xs font-bold">{door.doorId}</span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="block text-[10px] text-gray-500">Site Location:</span>
                        <span className="font-bold">{door.doorNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-gray-500">Job Card:</span>
                        <span className="font-mono font-bold">{order.jobCardNumber}</span>
                      </div>
                    </div>

                    <div className="p-2 bg-gray-100 dark:bg-slate-800 print:bg-gray-100 rounded text-center">
                      <span className="text-[10px] text-gray-500 block">FINISHED CUTTING SIZE</span>
                      <span className="text-sm font-black font-mono">
                        {door.finishedHeightMm} x {door.finishedWidthMm} mm
                      </span>
                      <span className="text-[10px] block text-gray-600 font-mono">
                        ({heightInches}&quot; x {widthInches}&quot;)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>
                        <span className="text-gray-500">Model:</span> {door.model}
                      </div>
                      <div>
                        <span className="text-gray-500">Finish:</span> {door.finishColor}
                      </div>
                      <div>
                        <span className="text-gray-500">Handing:</span> {door.handing}
                      </div>
                      <div>
                        <span className="text-gray-500">Lock:</span> {door.lockType}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-black text-[9px] font-mono">
                      <span>Client: {order.customerName}</span>
                      <span className="font-bold border border-black px-1.5 py-0.5">QC VERIFIED</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
