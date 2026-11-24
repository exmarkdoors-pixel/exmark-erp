'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  QrCode,
  Download,
  CheckCircle2,
  Boxes,
  MapPin,
  Tag,
  Sparkles,
  Sliders,
  Layers,
  Copy,
} from 'lucide-react';
import type { ReadyStockDoor } from '@/lib/services/readyStockDoorService';
import { cmToTapeInchFormatted } from '@/lib/services/toleranceCalculation';
import * as QRCode from 'qrcode';

interface StockDoorStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  doors: ReadyStockDoor[];
}

type StickerPrintFormat = 'A4_12L' | 'THERMAL';

interface ExpandedStickerUnit {
  uid: string;
  door: ReadyStockDoor;
  unitIndex: number;
  totalUnits: number;
}

export function StockDoorStickerModal({
  isOpen,
  onClose,
  doors,
}: StockDoorStickerModalProps) {
  const [printFormat, setPrintFormat] = useState<StickerPrintFormat>('A4_12L');
  const [multiplyByQuantity, setMultiplyByQuantity] = useState<boolean>(true);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calibration settings for A4 12L (99x44mm die-cut grid)
  const [topMarginMm, setTopMarginMm] = useState<number>(11);
  const [leftMarginMm, setLeftMarginMm] = useState<number>(6);
  const [horizontalGapMm, setHorizontalGapMm] = useState<number>(0);
  const [verticalGapMm, setVerticalGapMm] = useState<number>(0);
  const [cellHeightMm, setCellHeightMm] = useState<number>(44);
  const [useYellowPaper, setUseYellowPaper] = useState<boolean>(false);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Expand doors based on quantity toggle
  const printableUnits = useMemo<ExpandedStickerUnit[]>(() => {
    const list: ExpandedStickerUnit[] = [];
    doors.forEach((door) => {
      const count = multiplyByQuantity ? Math.max(1, door.quantity || 1) : 1;
      for (let i = 1; i <= count; i++) {
        list.push({
          uid: `${door.id}-unit-${i}`,
          door,
          unitIndex: i,
          totalUnits: count,
        });
      }
    });
    return list;
  }, [doors, multiplyByQuantity]);

  // Generate QR Codes for each distinct door
  useEffect(() => {
    if (!isOpen || doors.length === 0) return;
    let cancelled = false;

    (async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const nextQr: Record<string, string> = {};

      for (const d of doors) {
        const payload = origin
          ? `${origin}/track/${encodeURIComponent(d.stockCode || d.id)}`
          : `/track/${encodeURIComponent(d.stockCode || d.id)}`;
        try {
          nextQr[d.id] = await QRCode.toDataURL(payload, {
            width: 160,
            margin: 0,
            errorCorrectionLevel: 'M',
          });
        } catch {
          // ignore error
        }
      }

      if (!cancelled) {
        setQrDataUrls(nextQr);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, doors]);

  if (!isOpen || doors.length === 0) return null;

  // Pagination for A4 (12 stickers per sheet)
  const pages: ExpandedStickerUnit[][] = [];
  for (let i = 0; i < printableUnits.length; i += 12) {
    pages.push(printableUnits.slice(i, i + 12));
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadVectorPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generate12LPackingPassPdf, generateThermal4x2Pdf } = await import(
        '@/lib/utils/pdfStickerEngine'
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const items = printableUnits.map((u, idx) => {
        const d = u.door;
        const isFrame = d.itemType === 'FRAME_ONLY';
        const hMm = isFrame ? d.frameHeightMm || 2100 : d.doorHeightMm || 2085;
        const wMm = isFrame ? d.frameWidthMm || 900 : d.doorWidthMm || 815;
        const hCm = Number((hMm / 10).toFixed(1));
        const wCm = Number((wMm / 10).toFixed(1));
        const tapeH = cmToTapeInchFormatted(hCm);
        const tapeW = cmToTapeInchFormatted(wCm);
        const model = d.doorModelName || d.frameTypeName || 'Exmark Factory Shutter';
        const color = d.doorFinishColor || d.frameFinishColor || 'Natural Teak';
        const qrUrl = origin
          ? `${origin}/track/${encodeURIComponent(d.stockCode || d.id)}`
          : `/track/${encodeURIComponent(d.stockCode || d.id)}`;

        return {
          id: u.uid,
          orderNumber: d.stockCode,
          jobCardNumber: `STOCK: ${d.stockCode}`,
          customerName: `EXMARK READY STOCK [${d.condition.replace(/_/g, ' ')}]`,
          siteName: d.rackLocation,
          doorNumber: idx + 1,
          totalDoorsInOrder: printableUnits.length,
          shutterSize: `${hCm} × ${wCm} cm (${hMm}×${wMm}mm)`,
          tape: `${tapeH} × ${tapeW}`,
          profile: model,
          finish: `${color}${d.isDoorRepaintable ? ' (Repaintable)' : ''}`,
          hand: d.handing || 'UNIVERSAL',
          lock: d.lockType || (d.lockCutoutStatus === 'UNCUT' ? 'UNCUT (HOLE ON SITE)' : 'PRE-CUT MORTISE'),
          remark: `Rack: ${d.rackLocation} | Price: Rs.${d.sellingPrice.toLocaleString('en-IN')}`,
          barcode: `*${d.stockCode}*`,
          qrUrl,
          rawHeightCm: hCm,
          rawWidthTopCm: wCm,
          rawWidthBtmCm: wCm,
          finH: hCm,
          finTopW: wCm,
          finBtmW: wCm,
          finHText: `${hCm}`,
          finTopWText: `${wCm}`,
          finBtmWText: `${wCm}`,
          doorTag: d.stockCode,
          rebateLabel: d.frameTypeName || 'Warehouse Stock Pass',
          doorThicknessLabel: `${d.doorThicknessMm || 32}mm`,
          hDedMm: 0,
          wDedMm: 0,
        };
      });

      if (printFormat === 'THERMAL') {
        const pdf = await generateThermal4x2Pdf(items, { companyName: 'EXMARK STOCK' });
        pdf.save(`EXMARK_Stock_Thermal_${Date.now()}.pdf`);
        notify(`Downloaded 4"x2" Thermal PDF (${items.length} stickers)`);
      } else {
        const pdf = await generate12LPackingPassPdf(items, {
          companyName: 'EXMARK READY STOCK',
          topMarginMm,
          leftMarginMm,
          rowGapMm: verticalGapMm,
          colGapMm: horizontalGapMm,
        });
        pdf.save(`EXMARK_Stock_12L_${Date.now()}.pdf`);
        notify(`Downloaded 12L Sticker Sheet PDF (${pages.length} pages)`);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to generate vector PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#080E1E] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-[#0B1528] to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wide">
                  Print Stickers for Ready &amp; Old Stock Doors
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                  {doors.length} {doors.length === 1 ? 'Door' : 'Doors'} Selected
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                12L A4 Die-Cut Sheets (99×44mm) &amp; 4×2&quot; Thermal Roll Labels with Physical Dimensions &amp; QR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Config */}
        <div className="p-3.5 bg-[#0B132B] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Format selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Format:</span>
            <div className="inline-flex rounded-lg bg-[#070D1E] p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setPrintFormat('A4_12L')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  printFormat === 'A4_12L'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 12L Sheet (99×44mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('THERMAL')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  printFormat === 'THERMAL'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏷️ Thermal 4&quot;×2&quot;
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={multiplyByQuantity}
                onChange={(e) => setMultiplyByQuantity(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span>Print 1 sticker per unit quantity ({printableUnits.length} total)</span>
            </label>

            {printFormat === 'A4_12L' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={useYellowPaper}
                  onChange={(e) => setUseYellowPaper(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span>Yellow Label Paper Style</span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadVectorPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Vector PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black cursor-pointer shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Stickers ({printableUnits.length})</span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-900/60 flex flex-col items-center">
          {printFormat === 'A4_12L' ? (
            <div className="space-y-6">
              {pages.map((pageUnits, pageIdx) => (
                <div
                  key={`page-${pageIdx}`}
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    paddingTop: `${topMarginMm}mm`,
                    paddingLeft: `${leftMarginMm}mm`,
                    paddingRight: `${leftMarginMm}mm`,
                    boxSizing: 'border-box',
                  }}
                  className="bg-white text-slate-950 shadow-2xl rounded-sm mx-auto overflow-hidden border border-slate-300 print:shadow-none print:border-none print:m-0 print:p-0"
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 99mm)',
                      gridAutoRows: `${cellHeightMm}mm`,
                      rowGap: `${verticalGapMm}mm`,
                      columnGap: `${horizontalGapMm}mm`,
                    }}
                  >
                    {pageUnits.map((u, cellIdx) => {
                      const d = u.door;
                      const isFrame = d.itemType === 'FRAME_ONLY';
                      const hMm = isFrame ? d.frameHeightMm || 2100 : d.doorHeightMm || 2085;
                      const wMm = isFrame ? d.frameWidthMm || 900 : d.doorWidthMm || 815;
                      const hCm = Number((hMm / 10).toFixed(1));
                      const wCm = Number((wMm / 10).toFixed(1));
                      const tapeH = cmToTapeInchFormatted(hCm);
                      const tapeW = cmToTapeInchFormatted(wCm);
                      const model = d.doorModelName || d.frameTypeName || 'FRP Shutter';
                      const color = d.doorFinishColor || d.frameFinishColor || 'Natural Teak';
                      const qrSrc = qrDataUrls[d.id];
                      const serialNum = pageIdx * 12 + cellIdx + 1;

                      return (
                        <div
                          key={u.uid}
                          style={{
                            width: '99mm',
                            height: `${cellHeightMm}mm`,
                            maxHeight: `${cellHeightMm}mm`,
                            boxSizing: 'border-box',
                            breakInside: 'avoid',
                            pageBreakInside: 'avoid',
                          }}
                          className={`border-[1.2px] border-slate-900 font-sans rounded-[5px] flex flex-col justify-between overflow-hidden ${
                            useYellowPaper ? 'bg-[#fef9c3]' : 'bg-white'
                          }`}
                        >
                          {/* Row 1: Solid Dark Header */}
                          <div className="bg-slate-950 text-white px-2 py-[2.5px] flex items-center justify-between text-[7.5px] font-black tracking-wide uppercase">
                            <span className="flex items-center gap-1">
                              <span>EXMARK READY / OLD STOCK PASS</span>
                            </span>
                            <span className="shrink-0 text-amber-300">
                              {d.stockCode} [{d.condition.replace(/_/g, ' ')}]
                            </span>
                          </div>

                          {/* Row 2: Model & Specifications */}
                          <div className="px-2 pt-[2px] pb-[1px] leading-tight">
                            <div className="flex items-center justify-between text-[8px] font-black text-slate-950 uppercase truncate">
                              <span className="truncate">
                                <span className="font-bold text-slate-600">MODEL: </span>
                                {model}
                              </span>
                              <span className="px-1 py-[0.5px] rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[6.5px] font-black shrink-0">
                                ₹{d.sellingPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[6.8px] text-slate-700 mt-[1px]">
                              <span className="truncate">
                                <strong className="text-slate-900">COLOR:</strong> {color}
                                {d.isDoorRepaintable && ' • Repaintable in Booth'}
                              </span>
                              <span className="shrink-0 text-slate-600 font-bold">
                                {d.handing && d.handing !== 'UNIVERSAL' ? `Hand: ${d.handing}` : 'Universal Hand'}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: 3-Column Spec & QR Grid */}
                          <div
                            className="mx-1.5 border border-slate-500 rounded-[3px] grid overflow-hidden flex-1"
                            style={{ gridTemplateColumns: '38% 39% 23%' }}
                          >
                            {/* Col 1: MEASUREMENTS */}
                            <div className="border-r border-slate-500 flex flex-col min-w-0">
                              <div className="bg-slate-200 border-b border-slate-400 px-1 py-[1.5px] text-center text-[6px] font-black text-slate-800 uppercase tracking-tight">
                                PHYSICAL DIMENSIONS
                              </div>
                              <div className="px-1.5 py-[2px] flex-1 flex flex-col justify-between text-[6.5px] text-slate-900 leading-[1.15]">
                                <div>
                                  <span className="text-slate-600">Height: </span>
                                  <strong className="font-black text-[7.5px] text-slate-950">
                                    {hMm} mm
                                  </strong>
                                  <span className="text-[6px] text-slate-500 block">
                                    ({hCm} cm • {tapeH})
                                  </span>
                                </div>
                                <div className="mt-[1px]">
                                  <span className="text-slate-600">Width: </span>
                                  <strong className="font-black text-[7.5px] text-slate-950">
                                    {wMm} mm
                                  </strong>
                                  <span className="text-[6px] text-slate-500 block">
                                    ({wCm} cm • {tapeW})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Col 2: SPEC & GODOWN LOCATION */}
                            <div className="border-r border-slate-500 flex flex-col bg-amber-50/60 min-w-0">
                              <div className="bg-amber-100 border-b border-amber-300 px-1 py-[1.5px] text-center text-[6px] font-black text-amber-900 uppercase tracking-tight">
                                WAREHOUSE STORAGE
                              </div>
                              <div className="px-1.5 py-[2px] flex-1 flex flex-col justify-between leading-[1.15]">
                                <div className="text-[6.8px] text-slate-900 font-bold truncate">
                                  <span className="text-slate-500">Rack: </span>
                                  <span className="text-red-700 font-black">{d.rackLocation}</span>
                                </div>
                                <div className="text-[6.3px] text-slate-700">
                                  <span className="text-slate-500">Thk: </span>
                                  <strong className="text-slate-950">{d.doorThicknessMm || 32}mm</strong>
                                  {d.lockCutoutStatus === 'UNCUT' ? ' • Hole Uncut' : ' • Pre-Cut'}
                                </div>
                                <div className="text-[6.8px] font-black text-emerald-700 uppercase">
                                  ✓ QC READY FOR ALLOCATION
                                </div>
                              </div>
                            </div>

                            {/* Col 3: QR CODE */}
                            <div className="flex flex-col bg-white min-w-0">
                              <div className="bg-slate-100 border-b border-slate-300 px-0.5 py-[1.5px] text-center text-[5.8px] font-black text-slate-800 uppercase">
                                SCAN STOCK
                              </div>
                              <div className="flex-1 flex flex-col items-center justify-center p-[2px]">
                                {qrSrc ? (
                                  <img
                                    src={qrSrc}
                                    alt="Stock QR"
                                    className="w-[13.5mm] h-[13.5mm] object-contain"
                                  />
                                ) : (
                                  <div className="w-[13.5mm] h-[13.5mm] border border-dashed border-slate-300 flex items-center justify-center text-[5.5px] text-slate-400">
                                    QR
                                  </div>
                                )}
                                <span className="text-[5.2px] font-black text-slate-900 tracking-tight leading-none mt-[1px]">
                                  FIND &amp; ALLOCATE
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Row 4: Footer Bar */}
                          <div className="px-2 py-[2px] bg-slate-100 border-t border-slate-300 flex items-center justify-between text-[6px] text-slate-600 font-mono">
                            <span>UNIT #{u.unitIndex} OF {u.totalUnits}</span>
                            <span className="font-bold text-slate-800">EXMARK ARCHITECTURAL DOORS</span>
                            <span>{new Date().toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Continuous Thermal 4"x2" Preview */
            <div className="space-y-4">
              {printableUnits.map((u, idx) => {
                const d = u.door;
                const isFrame = d.itemType === 'FRAME_ONLY';
                const hMm = isFrame ? d.frameHeightMm || 2100 : d.doorHeightMm || 2085;
                const wMm = isFrame ? d.frameWidthMm || 900 : d.doorWidthMm || 815;
                const hCm = Number((hMm / 10).toFixed(1));
                const wCm = Number((wMm / 10).toFixed(1));
                const tapeH = cmToTapeInchFormatted(hCm);
                const tapeW = cmToTapeInchFormatted(wCm);
                const model = d.doorModelName || d.frameTypeName || 'FRP Shutter';
                const color = d.doorFinishColor || d.frameFinishColor || 'Natural Teak';
                const qrSrc = qrDataUrls[d.id];

                return (
                  <div
                    key={u.uid}
                    style={{
                      width: '101.6mm',
                      height: '50.8mm',
                      maxHeight: '50.8mm',
                      boxSizing: 'border-box',
                    }}
                    className="bg-white text-slate-950 border-2 border-slate-900 rounded-md p-2 flex flex-col justify-between overflow-hidden shadow-lg"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-900">
                          EXMARK WAREHOUSE STOCK PASS
                        </div>
                        <div className="text-[12px] font-mono font-black text-slate-950">
                          {d.stockCode} <span className="text-[9px] font-sans font-bold text-slate-600">[{d.condition.replace(/_/g, ' ')}]</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] font-mono font-black text-emerald-700">
                          ₹{d.sellingPrice.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[7.5px] font-black text-slate-500 uppercase">
                          Unit {u.unitIndex}/{u.totalUnits}
                        </div>
                      </div>
                    </div>

                    {/* Middle grid */}
                    <div className="grid grid-cols-3 gap-2 items-center py-1 flex-1">
                      <div className="col-span-2 space-y-0.5 text-[8px] leading-tight">
                        <div className="font-black text-slate-950 uppercase truncate">
                          {model} ({d.doorThicknessMm || 32}mm)
                        </div>
                        <div className="text-slate-700">
                          <strong>SIZE: </strong>
                          <span className="font-mono font-black text-[9px] text-slate-950">
                            {hMm} × {wMm} mm
                          </span>
                          <span className="text-[7px] text-slate-500 block">
                            ({hCm} × {wCm} cm • {tapeH} × {tapeW})
                          </span>
                        </div>
                        <div className="text-slate-700 truncate">
                          <strong>COLOR: </strong> {color} {d.isDoorRepaintable ? '• Repaintable' : ''}
                        </div>
                        <div className="text-slate-900 font-bold truncate">
                          <strong>RACK: </strong> <span className="text-red-700 font-black">{d.rackLocation}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        {qrSrc && (
                          <img
                            src={qrSrc}
                            alt="QR"
                            className="w-[18mm] h-[18mm] object-contain"
                          />
                        )}
                        <span className="text-[6px] font-black uppercase text-slate-900 mt-0.5">
                          SCAN TO ALLOCATE
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-400 pt-0.5 flex items-center justify-between text-[6.5px] font-mono text-slate-600">
                      <span>QC: PASSED &amp; READY</span>
                      <span>EXMARK ARCHITECTURAL DOORS</span>
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
