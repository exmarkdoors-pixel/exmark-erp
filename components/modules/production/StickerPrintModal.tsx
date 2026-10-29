'use client';

import React, { useState } from 'react';
import { X, Printer, QrCode, CheckCircle2, Sliders, ExternalLink, HelpCircle } from 'lucide-react';
import { ProductionOrder } from '@/lib/services/productionService';

interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

export function StickerPrintModal({ isOpen, onClose, order }: StickerPrintModalProps) {
  const [printMode, setPrintMode] = useState<'A4_YELLOW_SHEET' | 'THERMAL' | 'TEST_PAGE'>('A4_YELLOW_SHEET');
  const [useYellowPaper, setUseYellowPaper] = useState<boolean>(true);
  const [showMarginControls, setShowMarginControls] = useState<boolean>(false);

  // Calibration Margins in mm (standard Avery / Desmat 12-label A4 sheet)
  const [topMarginMm, setTopMarginMm] = useState<number>(10);
  const [leftMarginMm, setLeftMarginMm] = useState<number>(8);
  const [verticalGapMm, setVerticalGapMm] = useState<number>(4);
  const [horizontalGapMm, setHorizontalGapMm] = useState<number>(4);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const getOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://exmark-erp.com';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 print:p-0 print:border-none print:shadow-none print:bg-white print:max-w-none print:max-h-none print:overflow-visible">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-red-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Shop-Floor Door QR & Barcode Identification Labels
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Job Card: <span className="font-mono font-bold text-red-500">{order.jobCardNumber}</span> • Customer: {order.customerName} ({order.siteName})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMarginControls(!showMarginControls)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Tweak print margins and printer alignment"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjust Margins</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Stickers
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Selector & Format Options */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintMode('A4_YELLOW_SHEET')}
                className={`px-3 py-1 rounded-md transition-all ${
                  printMode === 'A4_YELLOW_SHEET'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                A4 12-Label Yellow Sheet (2x6)
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
              <button
                type="button"
                onClick={() => setPrintMode('TEST_PAGE')}
                className={`px-3 py-1 rounded-md transition-all ${
                  printMode === 'TEST_PAGE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                Print Alignment Test Page
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useYellowPaper}
                onChange={(e) => setUseYellowPaper(e.target.checked)}
                className="rounded text-red-600 cursor-pointer"
              />
              <span className="font-medium">Shop-Floor Yellow Stock Preview</span>
            </label>
          </div>

          {/* Collapsible Margin Tuning Controls */}
          {showMarginControls && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Top Margin ({topMarginMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={topMarginMm}
                  onChange={(e) => setTopMarginMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Left Margin ({leftMarginMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={leftMarginMm}
                  onChange={(e) => setLeftMarginMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Row Spacing ({verticalGapMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={verticalGapMm}
                  onChange={(e) => setVerticalGapMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Column Spacing ({horizontalGapMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={horizontalGapMm}
                  onChange={(e) => setHorizontalGapMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Printable Sticker Canvas */}
        <div
          style={{
            paddingTop: `${topMarginMm}mm`,
            paddingLeft: `${leftMarginMm}mm`,
          }}
          className="space-y-4 print:m-0"
        >
          {printMode === 'TEST_PAGE' ? (
            /* Alignment Test Grid Page */
            <div className="p-8 border-2 border-dashed border-red-500 rounded-xl bg-white text-black space-y-4">
              <div className="text-center space-y-1">
                <h3 className="font-black text-base uppercase">EXMARK A4 12-Label Printer Alignment Grid Test</h3>
                <p className="text-xs text-gray-600">
                  Hold this test page up to the light against your pre-cut yellow label sheet to verify printer margin alignment.
                </p>
                <p className="text-[11px] font-mono font-bold text-red-600">
                  Settings: Top {topMarginMm}mm | Left {leftMarginMm}mm | Row Gap {verticalGapMm}mm | Col Gap {horizontalGapMm}mm
                </p>
              </div>

              <div
                className="grid grid-cols-2 gap-3"
                style={{
                  rowGap: `${verticalGapMm}mm`,
                  columnGap: `${horizontalGapMm}mm`,
                }}
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-28 border-2 border-black border-dashed rounded flex flex-col items-center justify-center p-2 relative"
                  >
                    <span className="font-mono text-xs font-black">STICKER CELL #{idx + 1}</span>
                    <span className="text-[10px] text-gray-500 font-mono">95mm x 45mm Target Area</span>
                    <div className="absolute top-1 left-1 text-[9px] font-mono">+</div>
                    <div className="absolute top-1 right-1 text-[9px] font-mono">+</div>
                    <div className="absolute bottom-1 left-1 text-[9px] font-mono">+</div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-mono">+</div>
                    <div className="absolute inset-0 flex items-center justify-center text-[24px] text-gray-200 pointer-events-none">
                      +
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : printMode === 'A4_YELLOW_SHEET' ? (
            /* A4 12-Label Sheet Layout: 2 Columns x 6 Rows = 12 Stickers per page */
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 print:border-none print:p-0 ${
                useYellowPaper ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-slate-50 dark:bg-slate-900/40'
              }`}
              style={{
                rowGap: `${verticalGapMm}mm`,
                columnGap: `${horizontalGapMm}mm`,
              }}
            >
              {order.doors.map((door) => {
                const heightInches = (door.finishedHeightMm / 25.4).toFixed(1);
                const widthInches = (door.finishedWidthMm / 25.4).toFixed(1);
                const trackUrl = `${getOrigin()}/track/${door.doorId}`;

                return (
                  <div
                    key={door.id}
                    className={`p-3.5 rounded-lg border-2 space-y-2 shadow-xs print:break-inside-avoid ${
                      useYellowPaper
                        ? 'bg-[#fef9c3] border-[#ca8a04] text-slate-900 print:bg-[#fef9c3] print:border-[#ca8a04]'
                        : 'bg-white dark:bg-slate-900 border-slate-800 dark:border-slate-700 text-slate-900 dark:text-white print:bg-white print:border-black print:text-black'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-current/20 pb-1.5">
                      <div>
                        <span className="text-xs font-black tracking-wider text-red-600 print:text-red-700">
                          EXMARK DOORS
                        </span>
                        <span className="text-[9px] block text-slate-600 font-medium">
                          FRP Composite Door • Kerala
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-black/10 rounded">
                          {door.doorId}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-500">
                          {order.jobCardNumber}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Details & QR */}
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Location:</span>
                          <span className="font-bold">{door.doorNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Client:</span>
                          <span className="font-semibold truncate max-w-[130px]">{order.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Model:</span>
                          <span className="font-medium truncate max-w-[130px]">{door.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Color:</span>
                          <span className="font-medium">{door.finishColor}</span>
                        </div>
                      </div>

                      {/* QR Block */}
                      <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded border border-black/20 shrink-0 text-center">
                        <QrCode className="w-11 h-11 text-black" />
                        <span className="text-[7px] font-mono text-black font-bold uppercase block mt-0.5">
                          SCAN TO TRACK
                        </span>
                      </div>
                    </div>

                    {/* Cut Size Banner */}
                    <div className="py-1 px-2 bg-red-600 text-white rounded flex justify-between items-center text-[10px] font-bold">
                      <span className="uppercase text-[9px] tracking-wide">CUTTING SIZE:</span>
                      <span className="font-mono font-black text-xs">
                        {door.finishedHeightMm} x {door.finishedWidthMm} mm ({heightInches}&quot; x {widthInches}&quot;)
                      </span>
                    </div>

                    {/* Footer: Handing, Lock, Temporary Sticker Warning */}
                    <div className="flex justify-between items-center pt-1 border-t border-current/20 text-[9px]">
                      <div>
                        <span className="font-bold">{door.handing}</span> • {door.lockType}
                      </div>
                      <div className="flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>QC PASSED</span>
                      </div>
                    </div>

                    <div className="text-[7.5px] text-center text-slate-600 font-mono border-t border-dotted border-current/20 pt-0.5">
                      TEMPORARY PROTECTIVE STICKER — REMOVE & VERIFY SURFACE POST-INSTALLATION
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
