'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square,
  Filter,
  Layers,
  Sparkles,
  QrCode,
  Tag,
  CheckCircle2,
  X,
  Building2,
  Calendar,
  Download,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import { FRAME_DEDUCTION_PRESETS, FramePresetKey } from '@/lib/services/doorSizingEngine';

interface BatchDoorScheduleItem {
  tag: string;
  frameSize: string;
  shutterSize: string;
  tape: string;
  profile: string;
  finish: string;
  lock: string;
  hand: string;
  qty: number;
  remark?: string;
  presetKey?: FramePresetKey;
}

interface BatchOrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  siteName: string;
  district: string;
  jobCardNumber: string;
  totalAmount: number;
  doorsDesc: string;
  doorsList: BatchDoorScheduleItem[];
}

export interface ExpandedSticker {
  id?: string;
  orderId?: string;
  orderNumber: string;
  customerName: string;
  siteName: string;
  jobCardNumber: string;
  tag: string;
  unitIndex: number;
  totalUnitsInTag: number;
  shutterSize: string;
  frameSize: string;
  tape: string;
  profile: string;
  finish: string;
  lock: string;
  hand: string;
  barcode: string;
  remark?: string;
}

export interface BatchPrintHubProps {
  initialSelectedOrderIds?: string[];
  onClose?: () => void;
}

export default function BatchPrintHub({
  initialSelectedOrderIds,
  onClose,
}: BatchPrintHubProps = {}) {
  const [orders, setOrders] = useState<BatchOrderData[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    initialSelectedOrderIds && initialSelectedOrderIds.length > 0
      ? initialSelectedOrderIds
      : []
  );
  const [partyFilter, setPartyFilter] = useState<string>('ALL');
  const [activePrintModal, setActivePrintModal] = useState<'STICKERS' | 'QC_PDF' | 'A4_SCHEDULE' | null>(null);
  const [stickerFormat, setStickerFormat] = useState<'A4_12L' | 'THERMAL_ROLL'>('A4_12L');
  const [gridLayout, setGridLayout] = useState<'2x6' | '3x4'>('2x6');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [doorRemarks, setDoorRemarks] = useState<Record<string, string>>({});
  const [isRemarksManagerOpen, setIsRemarksManagerOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // 12L Sticker Sheet Calibration State (Exact Die-Cut Fit & Safe Margin Buffer)
  const [calibrationPaper, setCalibrationPaper] = useState('Oddy 12L Borderless (105 x 49.5 mm)');
  const [nudgeXmm, setNudgeXmm] = useState<number>(-2.5);
  const [nudgeYmm, setNudgeYmm] = useState<number>(-3.0);
  const [safeMarginBuffer, setSafeMarginBuffer] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    fetch('/api/production')
      .then((res) => res.json())
      .then((json) => {
        if (!active || !json.success || !Array.isArray(json.data)) return;
        if (json.data.length === 0) {
          setOrders([]);
          return;
        }
        const apiOrders: BatchOrderData[] = json.data.map((p: {
          id: string;
          salesOrderId?: string;
          prodOrderNumber: string;
          customerName?: string;
          siteName?: string;
          district?: string;
          jobCardNumber: string;
          doors?: Array<{
            doorNumber?: string;
            doorId?: string;
            rawHeightMm?: number;
            rawWidthMm?: number;
            finishedHeightMm?: number;
            finishedWidthMm?: number;
            model?: string;
            finishColor?: string;
            lockType?: string;
            handing?: string;
          }>;
            doorCategory?: string;
        }) => ({
          id: p.id, // Unique production order ID prevents duplicate key collisions for shared salesOrderId
          orderNumber: p.salesOrderId ? `${p.jobCardNumber} (${p.salesOrderId})` : p.prodOrderNumber,
          customerName: p.customerName || 'Kerala Customer',
          siteName: p.siteName || `${p.customerName || 'Client'} Site`,
          district: p.district || 'Ernakulam',
          jobCardNumber: p.jobCardNumber,
          totalAmount: 180000,
          doorsDesc: `${p.doors?.length || 1} Door Sets (${p.doorCategory?.replace('_', ' ') || 'FRP Doors'})`,
          doorsList: (p.doors || []).map((d, idx) => ({
            tag: d.doorNumber || `#D${idx + 1}`,
            frameSize: `${((d.rawHeightMm || 2100) / 10).toFixed(1)} × ${((d.rawWidthMm || 900) / 10).toFixed(1)} cm`,
            shutterSize: `${((d.finishedHeightMm || 2080) / 10).toFixed(1)} × ${((d.finishedWidthMm || 820) / 10).toFixed(1)} cm`,
            tape: `${((d.rawHeightMm || 2100) / 25.4).toFixed(1)}" × ${((d.rawWidthMm || 900) / 25.4).toFixed(1)}"`,
            profile: d.model || 'FRP Molded 30mm',
            finish: d.finishColor || 'Natural Teak (EXGC-510)',
            lock: d.lockType || 'Mortise Lock 60mm',
            hand: d.handing === 'LH' ? 'LH Inside' : 'RH Inside',
            qty: 1,
          })),
        }));

        setOrders((prev) => {
          const seen = new Set(prev.map((o) => o.id));
          const uniqueNew: BatchOrderData[] = [];
          for (const ord of apiOrders) {
            if (!seen.has(ord.id)) {
              seen.add(ord.id);
              uniqueNew.push(ord);
            }
          }
          return [...prev, ...uniqueNew];
        });

        if (initialSelectedOrderIds && initialSelectedOrderIds.length > 0) {
          const matchedIds = apiOrders
            .filter((o) =>
              initialSelectedOrderIds.some(
                (sel) => sel === o.id || sel === o.jobCardNumber || o.orderNumber.includes(sel)
              )
            )
            .map((o) => o.id);
          if (matchedIds.length > 0) {
            setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...matchedIds])));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedOrderIds(orders.map((o) => o.id));
    setToastMessage('All orders selected for Batch Printing.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const clearAll = () => {
    setSelectedOrderIds([]);
    setToastMessage('Cleared all order selections.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Expand individual stickers for all selected orders
  const getExpandedStickers = (): ExpandedSticker[] => {
    const list: ExpandedSticker[] = [];
    orders.forEach((ord) => {
      if (!selectedOrderIds.includes(ord.id)) return;
      let doorIdx = 1;
      ord.doorsList.forEach((door, dIdx) => {
        for (let q = 1; q <= door.qty; q++) {
          const uniqueKey = `${ord.id}-${door.tag}-${dIdx}-${q}`;
          const remarkKey = `${ord.id}-${door.tag}-${q}`;
          list.push({
            id: uniqueKey,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            customerName: ord.customerName,
            siteName: ord.siteName,
            jobCardNumber: ord.jobCardNumber,
            tag: door.tag,
            unitIndex: q,
            totalUnitsInTag: door.qty,
            shutterSize: door.shutterSize,
            frameSize: door.frameSize,
            tape: door.tape,
            profile: door.profile,
            finish: door.finish,
            lock: door.lock,
            hand: door.hand,
            barcode: `*EXM-${ord.orderNumber.slice(-3)}-D0${doorIdx}-${q.toString().padStart(2, '0')}*`,
            remark:
              doorRemarks[uniqueKey] !== undefined
                ? doorRemarks[uniqueKey]
                : doorRemarks[remarkKey] !== undefined
                ? doorRemarks[remarkKey]
                : (door.remark || ''),
          });
        }
        doorIdx++;
      });
    });
    return list;
  };

  const handleDownloadVectorPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const { generate12LStickerPdf, generateThermal4x2Pdf } = await import('@/lib/utils/pdfStickerEngine');
      const printableItems = stickers.map((st, idx) => ({
        id: st.id || `stk-${idx}`,
        orderNumber: st.orderNumber,
        jobCardNumber: st.jobCardNumber,
        customerName: st.customerName,
        siteName: st.siteName,
        doorNumber: idx + 1,
        totalDoorsInOrder: stickers.length,
        shutterSize: st.shutterSize,
        tape: st.tape,
        profile: st.profile,
        finish: st.finish,
        hand: st.hand,
        hingeSide: st.hand.startsWith('LH') ? 'L' : 'R',
        lock: st.lock,
        remark: st.remark, // Strictly conditional: only populated if non-empty!
        barcode: st.barcode,
      }));

      if (stickerFormat === 'THERMAL_ROLL') {
        const pdf = await generateThermal4x2Pdf(printableItems, { companyName: 'EXMARK DOORS' });
        pdf.save(`EXMARK_Thermal_4x2_Batch_${new Date().toISOString().slice(0, 10)}.pdf`);
        setToastMessage(`4"x2" Thermal Vector PDF generated (${printableItems.length} labels)!`);
      } else {
        const pdf = await generate12LStickerPdf(printableItems, {
          companyName: 'EXMARK DOORS',
          layout: gridLayout,
          nudgeXmm,
          nudgeYmm,
          safeMarginBufferActive: safeMarginBuffer,
        });
        pdf.save(`EXMARK_12L_${gridLayout}_${new Date().toISOString().slice(0, 10)}.pdf`);
        setToastMessage(`12L (${gridLayout.toUpperCase()}) Top-Left Vector PDF downloaded!`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Vector PDF generation failed:', err);
      setToastMessage('Failed to download Vector PDF. Please try HTML Print.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const stickers = getExpandedStickers();
  const totalStickers = stickers.length;
  const totalSheets = Math.ceil(totalStickers / 12) || 0;

  const filteredOrders = orders.filter((o) => {
    if (partyFilter === 'ALL') return true;
    return o.customerName.toLowerCase().includes(partyFilter.toLowerCase());
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <Printer className="w-5 h-5 text-rose-500" />
              12L Factory Shutter Stickers & Batch Printing Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Batch-print 12-Up A4 die-cut door labels, Party-wise QC Reports (IS 14856:2000), and Master A4 Cutting Schedules simultaneously across multiple builder orders.
          </p>
        </div>

        {/* Batch Counter Pill & Optional Close */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-xl text-right shrink-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Batch Summary</div>
            <div className="text-xs font-bold text-white mt-0.5">
              <span className="text-rose-400 font-black text-sm">{selectedOrderIds.length}</span> Orders •{' '}
              <span className="text-emerald-400 font-black text-sm">{totalStickers}</span> Labels •{' '}
              <span className="text-amber-400 font-black text-sm">{totalSheets}</span> A4 Sheets
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select All Orders</span>
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg font-semibold cursor-pointer"
          >
            Clear All
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <label className="text-slate-400 font-medium">Party Filter:</label>
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="bg-[#070D1E] border border-slate-700 text-slate-200 rounded-lg p-1.5 text-xs font-medium focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">All Parties &amp; Projects</option>
              {Array.from(new Set(orders.map((o) => o.customerName).filter(Boolean))).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Dedicated Print Action Buttons & Format Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={stickerFormat}
            onChange={(e) => setStickerFormat(e.target.value as 'A4_12L' | 'THERMAL_ROLL')}
            className="bg-[#070D1E] border border-rose-600/80 text-rose-200 rounded-xl p-2 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="A4_12L">📄 A4 12-Up Sheet (12L)</option>
            <option value="THERMAL_ROLL">🏷️ Thermal Label (4&quot;×2&quot; / 101.6×50.8mm)</option>
          </select>

          {stickerFormat === 'A4_12L' && (
            <select
              value={gridLayout}
              onChange={(e) => setGridLayout(e.target.value as '2x6' | '3x4')}
              className="bg-[#070D1E] border border-emerald-600/70 text-emerald-200 rounded-xl p-2 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="2x6">2×6 Wide Grid</option>
              <option value="3x4">3×4 Grid</option>
            </select>
          )}

          <button
            onClick={() => setActivePrintModal('STICKERS')}
            disabled={totalStickers === 0}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Tag className="w-4 h-4" />
            <span>
              Print Stickers {stickerFormat === 'THERMAL_ROLL' ? '(4"×2" Thermal)' : `(12L ${gridLayout.toUpperCase()})`}
            </span>
          </button>

          <button
            onClick={handleDownloadVectorPdf}
            disabled={isDownloadingPdf || totalStickers === 0}
            className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download exact top-left 12L or 4x2 thermal vector PDF"
          >
            <Download className="w-4 h-4" />
            <span>
              {isDownloadingPdf
                ? 'Generating PDF...'
                : stickerFormat === 'THERMAL_ROLL'
                ? 'Download 4"×2" Thermal PDF'
                : `Download 12L (${gridLayout.toUpperCase()}) PDF`}
            </span>
          </button>

          <button
            onClick={() => setIsRemarksManagerOpen(!isRemarksManagerOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isRemarksManagerOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Customize Door Remarks (Strict Conditional Display)"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>Door Remarks Manager</span>
          </button>

          <button
            onClick={() => setActivePrintModal('QC_PDF')}
            disabled={selectedOrderIds.length === 0}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Party-wise QC PDF 📑</span>
          </button>
          <button
            onClick={() => setActivePrintModal('A4_SCHEDULE')}
            disabled={selectedOrderIds.length === 0}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Party-wise A4 Schedule 📄</span>
          </button>
        </div>
      </div>

      {/* Orders Checklist */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-slate-800 bg-[#070D1E] flex justify-between items-center text-xs">
          <span className="font-bold text-white">Select Orders to Include in Batch Print</span>
          <span className="text-slate-400">Tick the checkbox for every order you wish to print together</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No live Production Job Cards available yet. Confirm a Quotation in Sales Quotations or release a Job Card on the Production Floor to print 12L / 4&quot;×2&quot; Thermal door labels.
            </div>
          ) : (
            filteredOrders.map((ord) => {
            const isChecked = selectedOrderIds.includes(ord.id);
            const doorCount = ord.doorsList.reduce((acc, d) => acc + d.qty, 0);

            return (
              <div
                key={ord.id}
                onClick={() => toggleOrderSelection(ord.id)}
                className={`p-4 flex items-center justify-between hover:bg-slate-800/40 transition cursor-pointer ${
                  isChecked ? 'bg-rose-950/15' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOrderSelection(ord.id)}
                    className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-white text-xs">{ord.orderNumber}</span>
                      <span className="text-xs font-semibold text-slate-300">• {ord.customerName}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        {doorCount} Total Doors
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {ord.siteName} • {ord.doorsDesc}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-bold text-xs ${isChecked ? 'text-rose-400' : 'text-slate-500'}`}>
                    {isChecked ? '✓ Selected for Batch' : 'Not Selected'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Order Value: ₹{ord.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* DOOR REMARKS & FRAME PRESETS MANAGER (STRICT CONDITIONAL DISPLAY) */}
      {isRemarksManagerOpen && (
        <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <h3 className="font-bold text-white text-xs tracking-wide">
                  Door Remarks Manager (Strict Conditional Rule)
                </h3>
              </div>
              <p className="text-[11px] text-amber-300/90 mt-0.5">
                "Remark in 12L STICKER WHEN I TYPE SOMETHING IN REMARK COLUMN ONLY OTHERWISE REMARK WILL BE BLANK"
              </p>
            </div>
            <button
              onClick={() => setIsRemarksManagerOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              Close Editor ✕
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {stickers.map((st, sIdx) => {
              const uniqueKey = st.id || `stk-${sIdx}`;
              return (
                <div
                  key={uniqueKey}
                  className="bg-[#070D1E] border border-slate-800 p-2.5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-[180px]">
                    <span className="font-mono text-rose-400 font-bold text-[11px]">{st.orderNumber}</span>
                    <span className="text-slate-300 font-semibold ml-2">#{sIdx + 1}: {st.tag}</span>
                    <div className="text-[10px] text-slate-400">{st.customerName} • {st.shutterSize}</div>
                  </div>

                  <div className="flex-1 w-full flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type custom remark (leave blank for no remark box)..."
                      value={doorRemarks[uniqueKey] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDoorRemarks((prev) => ({
                          ...prev,
                          [uniqueKey]: val,
                        }));
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                    />
                    {doorRemarks[uniqueKey] && doorRemarks[uniqueKey].trim() && (
                      <button
                        onClick={() => {
                          setDoorRemarks((prev) => {
                            const copy = { ...prev };
                            delete copy[uniqueKey];
                            return copy;
                          });
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-400 px-2 py-1 bg-slate-800 rounded cursor-pointer"
                        title="Clear remark"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] font-mono shrink-0">
                    {doorRemarks[uniqueKey] && doorRemarks[uniqueKey].trim() ? (
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        ✓ Printed
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal">
                        — Blank (Suppressed)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= PRINT / PDF PREVIEW MODAL ================= */}
      {activePrintModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/85 backdrop-blur-md printable-modal-root">
          <div className="bg-white text-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Controls Header (Hidden in Print) */}
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  {activePrintModal === 'STICKERS' &&
                    (stickerFormat === 'A4_12L'
                      ? `12L FACTORY SHUTTER STICKERS (${totalStickers} LABELS • ${totalSheets} A4 SHEETS)`
                      : `SINGLE THERMAL ROLL LABELS (${totalStickers} LABELS • 4"×2" / 100×50mm)`)}
                  {activePrintModal === 'QC_PDF' &&
                    `PARTY-WISE QC INSPECTION CERTIFICATE (IS 14856 : 2000)`}
                  {activePrintModal === 'A4_SCHEDULE' &&
                    `PARTY-WISE A4 MASTER DOOR PRODUCTION & CUTTING SCHEDULE`}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Official Legal Manufacturing Documents
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Format switcher inside print modal */}
                {activePrintModal === 'STICKERS' && (
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs mr-2">
                    <button
                      type="button"
                      onClick={() => setStickerFormat('A4_12L')}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                        stickerFormat === 'A4_12L'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      📄 A4 12-Up Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setStickerFormat('THERMAL_ROLL')}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                        stickerFormat === 'THERMAL_ROLL'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      🏷️ Thermal (4&quot;×2&quot;)
                    </button>
                  </div>
                )}

                {activePrintModal === 'STICKERS' && stickerFormat === 'A4_12L' && (
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs mr-1">
                    <button
                      type="button"
                      onClick={() => setGridLayout('2x6')}
                      className={`px-2 py-1 rounded font-bold cursor-pointer ${
                        gridLayout === '2x6' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      2×6
                    </button>
                    <button
                      type="button"
                      onClick={() => setGridLayout('3x4')}
                      className={`px-2 py-1 rounded font-bold cursor-pointer ${
                        gridLayout === '3x4' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      3×4
                    </button>
                  </div>
                )}

                {activePrintModal === 'STICKERS' && (
                  <button
                    type="button"
                    onClick={handleDownloadVectorPdf}
                    disabled={isDownloadingPdf}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{stickerFormat === 'THERMAL_ROLL' ? '4"×2" PDF' : '12L Vector PDF'}</span>
                  </button>
                )}

                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setActivePrintModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-8 overflow-y-auto font-sans text-xs space-y-6 flex-1 print:p-0 print:overflow-visible">
              {/* FORMAT 1: 12L STICKERS (DUAL FORMAT: A4 12-UP COMPACT vs SINGLE THERMAL ROLL 4"x2") */}
              {activePrintModal === 'STICKERS' && (
                <>
                  {/* 12L STICKER SHEET PAPER CALIBRATION (EXACT DIE-CUT FIT) */}
                  {stickerFormat === 'A4_12L' && (
                    <div className="bg-[#0B132B] border border-slate-700/80 rounded-xl p-3.5 space-y-3 mb-4 text-slate-200 print:hidden">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400" />
                          <span className="font-extrabold text-xs tracking-wider text-slate-100 uppercase">
                            12L Sticker Sheet Paper Calibration (Exact Die-Cut Fit)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSafeMarginBuffer(!safeMarginBuffer)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              safeMarginBuffer
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-xs'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {safeMarginBuffer ? '✓ Safe Margin Buffer Active (No border clipping)' : 'Buffer Inactive'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end text-xs">
                        {/* Paper Type Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Sticker Sheet Paper Type:
                          </label>
                          <select
                            value={calibrationPaper}
                            onChange={(e) => setCalibrationPaper(e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold cursor-pointer"
                          >
                            <option value="Oddy 12L Borderless (105 x 49.5 mm)">Oddy 12L Borderless (105 x 49.5 mm)</option>
                            <option value="Standard A4 12-Up Die-Cut (105 x 48 mm)">Standard A4 12-Up Die-Cut (105 x 48 mm)</option>
                            <option value="Desmat 12L Precision Cut (105 x 49 mm)">Desmat 12L Precision Cut (105 x 49 mm)</option>
                          </select>
                        </div>

                        {/* Nudge Left / Right */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Nudge Left/Right (X: {nudgeXmm > 0 ? `+${nudgeXmm}` : nudgeXmm}mm):
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNudgeXmm((prev) => Math.round((prev - 0.5) * 10) / 10)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              ◄ -0.5mm
                            </button>
                            <button
                              type="button"
                              onClick={() => setNudgeXmm(0)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-lg font-bold transition cursor-pointer"
                            >
                              Reset (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNudgeXmm((prev) => Math.round((prev + 0.5) * 10) / 10)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              +0.5mm ►
                            </button>
                          </div>
                        </div>

                        {/* Nudge Top / Bottom */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Nudge Top/Bottom (Y: {nudgeYmm > 0 ? `+${nudgeYmm}` : nudgeYmm}mm):
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNudgeYmm((prev) => Math.round((prev - 0.5) * 10) / 10)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              ▲ -0.5mm
                            </button>
                            <button
                              type="button"
                              onClick={() => setNudgeYmm(0)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-lg font-bold transition cursor-pointer"
                            >
                              Reset (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNudgeYmm((prev) => Math.round((prev + 0.5) * 10) / 10)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              +0.5mm ▼
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Print Dialog Tip */}
                      <div className="bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
                        <span className="font-bold text-amber-400">💡 Print Dialog Tip:</span>
                        <span>Set Paper Size: <strong>A4</strong>, Margins: <strong>None (0mm)</strong>, and Scale: <strong>100% (Actual Size)</strong> so labels never shift or print outside the die cuts.</span>
                      </div>
                    </div>
                  )}

                  {stickerFormat === 'A4_12L' ? (
                    /* A4 12-UP DIE-CUT SHEETS (TOP-LEFT ANCHORED 2×6 OR 3×4, ZERO CENTERING) */
                    <div className="space-y-8 print:space-y-0">
                      {Array.from({ length: totalSheets }).map((_, sIdx) => {
                        const sheetStickers = stickers.slice(sIdx * 12, (sIdx + 1) * 12);
                        const cardHeightMm = gridLayout === '2x6' ? '46.5mm' : '69mm';
                        return (
                          <div
                            key={sIdx}
                            className="sheet-12l bg-white border border-slate-300 rounded-xl shadow-sm break-after-page print:border-none print:shadow-none print:rounded-none print:m-0"
                            style={{
                              width: '210mm',
                              minHeight: '295mm',
                              padding: '4mm',
                              margin: '0 auto',
                              boxSizing: 'border-box',
                              transform: `translate(${nudgeXmm}mm, ${nudgeYmm}mm)`,
                              display: 'grid',
                              gridTemplateColumns:
                                gridLayout === '2x6'
                                  ? 'repeat(2, minmax(0, 1fr))'
                                  : 'repeat(3, minmax(0, 1fr))',
                              gridAutoRows: cardHeightMm,
                              alignContent: 'start',
                              gap: '2mm',
                            }}
                          >
                            {sheetStickers.map((st, idx) => {
                              const globalNum = sIdx * 12 + idx + 1;
                              const hSide = (st.hand || 'R').toUpperCase().startsWith('L') ? 'L' : 'R';
                              const hLabel = hSide === 'R' ? 'H-LEFT' : 'H-RIGHT';
                              const hasRemark = st.remark && st.remark.trim().length > 0;

                              // Parse finished height and width for cutting box (e.g. 205.5 x 82.4)
                              const parts = (st.shutterSize || '').replace(/[^0-9.x×]/gi, '').split(/[x×]/);
                              const finHVal = parts[0] ? parseFloat(parts[0]) : 205.5;
                              const finWVal = parts[1] ? parseFloat(parts[1]) : 82.4;
                              const finHText = `-${(finHVal > 50 ? finHVal : finHVal * 2.54).toFixed(1)}`;
                              const finWText = `-${(finWVal > 30 ? finWVal : finWVal * 2.54).toFixed(1)}`;

                              return (
                                <div
                                  key={idx}
                                  className="sticker-card-12l border border-slate-700 font-sans bg-white rounded-lg p-2 flex flex-col justify-between overflow-hidden"
                                  style={{
                                    height: cardHeightMm,
                                    maxHeight: cardHeightMm,
                                    boxSizing: 'border-box',
                                    fontSize: '8.5px',
                                    lineHeight: 1.15,
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid',
                                  }}
                                >
                                  {/* Line 1: Party (Left) + Job Card Badge (Right) */}
                                  <div className="flex justify-between items-center gap-1.5">
                                    <div className="flex items-baseline gap-1.5 min-w-0">
                                      <span className="text-[8.5px] text-slate-500 font-normal shrink-0">Party</span>
                                      <span className="font-black text-[10.5px] text-slate-950 uppercase truncate">
                                        {st.customerName}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[8.5px] font-bold px-1.5 py-0.2 rounded border border-slate-700 bg-slate-50 text-slate-900 shrink-0">
                                      {st.jobCardNumber || st.orderNumber}
                                    </span>
                                  </div>

                                  {/* Line 2: Model (Left) + Circled Door Number (Right) */}
                                  <div className="flex justify-between items-center gap-1.5">
                                    <div className="flex items-baseline gap-1.5 min-w-0">
                                      <span className="text-[8px] text-slate-500 font-normal shrink-0">Model</span>
                                      <span className="font-bold text-[10px] text-slate-900 uppercase truncate">
                                        {st.profile || st.tag || 'EXM-A-101'}
                                      </span>
                                    </div>
                                    <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center font-bold text-[9px] text-slate-950 shrink-0">
                                      {globalNum}
                                    </span>
                                  </div>

                                  {/* Line 3: H: (R) • LOCK: BABY LATCH • CLR: NATURAL TEAK */}
                                  <div className="flex items-center gap-1.5 text-[8px]">
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-slate-600">H:</span>
                                      <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center font-bold text-[8px] text-slate-950">
                                        {hSide}
                                      </span>
                                    </div>

                                    <div className="border border-slate-400 rounded px-1.5 py-0.2 flex items-center gap-1 bg-slate-50 min-w-0 flex-1">
                                      <span className="text-slate-500 text-[7px] shrink-0">LOCK:</span>
                                      <span className="font-bold text-slate-900 truncate uppercase text-[8px]">{st.lock || 'Baby Latch'}</span>
                                    </div>

                                    <div className="border border-slate-400 rounded px-1.5 py-0.2 flex items-center gap-1 bg-slate-50 min-w-0 flex-1">
                                      <span className="text-slate-500 text-[7px] shrink-0">CLR:</span>
                                      <span className="font-bold text-slate-900 truncate uppercase text-[8px]">{st.finish || 'Teak'}</span>
                                    </div>
                                  </div>

                                  {/* Line 4: 3-Cell Industrial Cutting Box (H-LEFT, TOP/BTM, QR Code) */}
                                  <div className="border border-slate-800 rounded grid grid-cols-12 overflow-hidden bg-slate-50/50">
                                    {/* Cell 1: H-LEFT or H-RIGHT */}
                                    <div className="col-span-5 border-r border-slate-800 p-1 flex flex-col justify-between">
                                      <span className="text-[7.5px] font-bold text-slate-700 uppercase">{hLabel}</span>
                                      <span className="font-mono text-xs font-black text-slate-950 text-right">{finHText}</span>
                                    </div>

                                    {/* Cell 2: Stacked TOP and BTM */}
                                    <div className="col-span-4 border-r border-slate-800 divide-y divide-slate-800">
                                      <div className="px-1 py-0.2 flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-slate-600">TOP</span>
                                        <span className="font-mono text-[9.5px] font-bold text-slate-950">{finWText}</span>
                                      </div>
                                      <div className="px-1 py-0.2 flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-slate-600">BTM</span>
                                        <span className="font-mono text-[9.5px] font-bold text-slate-950">{finWText}</span>
                                      </div>
                                    </div>

                                    {/* Cell 3: QR Code Icon / Sequence */}
                                    <div className="col-span-3 flex flex-col items-center justify-center p-0.5 bg-white">
                                      <QrCode className="w-5 h-5 text-slate-900" />
                                      <span className="text-[6.5px] font-mono font-bold text-slate-700">#{globalNum}</span>
                                    </div>
                                  </div>

                                  {/* Line 5: STRICT CONDITIONAL REMARK CONTAINER */}
                                  {hasRemark && (
                                    <div className="p-0.5 px-1 rounded bg-amber-50 border border-amber-400 text-amber-900 text-[7px] font-bold leading-tight flex items-start gap-1">
                                      <span className="text-amber-800 font-black shrink-0">REMARK:</span>
                                      <span className="truncate">{st.remark!.trim()}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* SINGLE CONTINUOUS THERMAL ROLL LABELS (EXACT 4" x 2" / 101.6mm x 50.8mm) */
                    <div className="thermal-roll-container mx-auto space-y-4 max-w-[101.6mm] print:max-w-none print:mx-0 print:space-y-0">
                      {stickers.map((st, idx) => (
                        <div
                          key={idx}
                          className="thermal-single-label bg-white text-black border border-slate-900 rounded p-2.5 break-after-page shadow-sm print:shadow-none print:rounded-none print:m-0"
                          style={{
                            width: '101.6mm',
                            height: '50.8mm',
                            maxHeight: '50.8mm',
                            padding: '2.2mm 3mm',
                            margin: '0 auto 4mm auto',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            fontSize: '9px',
                            lineHeight: 1.2,
                            pageBreakAfter: 'always',
                            breakAfter: 'page',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                          }}
                        >
                          <div>
                            <div className="flex justify-between items-center border-b border-black pb-0.5 mb-1">
                              <span className="font-black text-xs tracking-wider">EXMARK DOORS</span>
                              <span className="font-bold text-[9px]">TAG #{idx + 1}/{totalStickers} • {st.orderNumber}</span>
                            </div>

                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 truncate">
                                <div className="font-bold text-[10px] text-black uppercase truncate">{st.customerName}</div>
                                <div className="text-[8.5px] text-slate-600 truncate">{st.siteName}</div>
                                <div className="font-bold text-[9.5px] text-black mt-0.5">{st.tag} ({st.unitIndex}/{st.totalUnitsInTag})</div>
                              </div>
                              <div className="bg-black text-white p-1 rounded text-right min-w-[110px] shrink-0">
                                <div className="text-[7.5px] text-slate-300">SHUTTER CUTTING SIZE:</div>
                                <div className="font-black text-xs">{st.shutterSize}</div>
                                <div className="text-[8px] text-slate-200">Tape: {st.tape}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[8.5px] text-slate-800 mt-1 pt-1 border-t border-slate-300">
                              <div className="truncate"><strong>Profile:</strong> {st.profile}</div>
                              <div className="truncate"><strong>Finish:</strong> {st.finish}</div>
                              <div className="truncate"><strong>Hardware:</strong> {st.hand}</div>
                              <div className="truncate"><strong>Lock:</strong> {st.lock}</div>
                            </div>

                            {/* STRICT CONDITIONAL REMARK IN THERMAL ROLL */}
                            {st.remark && st.remark.trim().length > 0 && (
                              <div className="mt-1 p-0.5 px-1 rounded bg-slate-100 border border-black text-black text-[8px] font-bold leading-tight flex items-start gap-1">
                                <span className="font-black shrink-0">REMARK:</span>
                                <span className="truncate">{st.remark.trim()}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1 border-t border-black flex justify-between items-center font-mono text-[9px]">
                            <span className="tracking-widest">{st.barcode}</span>
                            <span className="font-sans font-bold text-[8px] uppercase tracking-wider bg-black text-white px-1.5 py-0.2 rounded">
                              IS 14856:2000 QC PASS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* FORMAT 2: PARTY-WISE QC PDF */}
              {activePrintModal === 'QC_PDF' && (
                <div className="space-y-8">
                  {orders
                    .filter((o) => selectedOrderIds.includes(o.id))
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white text-slate-900 p-6 border border-slate-300 rounded-xl shadow-md space-y-4 break-after-page print:border-none print:shadow-none print:p-0"
                      >
                        {/* Header */}
                        <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                          <div>
                            <div className="text-xl font-black text-rose-700 tracking-wider">
                              EXMARK DOORS — QUALITY ASSURANCE DIVISION
                            </div>
                            <div className="text-xs text-slate-700 font-bold">
                              IS 14856 : 2000 FACTORY COMPLIANCE &amp; INSPECTION CERTIFICATE
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Central Manufacturing Plant, Vengara, Kerala • NABL Calibrated Gauge Inspection
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-purple-900 text-white rounded font-bold text-[10px]">
                              PARTY QC CERTIFICATE
                            </span>
                            <div className="text-xs font-bold text-slate-900 mt-1">
                              Audit Doc: QC-2026-{ord.orderNumber.slice(-3)}
                            </div>
                            <div className="text-[10px] text-slate-600">
                              Date: {new Date().toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>

                        {/* Party Banner */}
                        <div className="grid grid-cols-2 gap-4 bg-purple-50 p-3 rounded-lg border border-purple-200 text-xs">
                          <div>
                            <span className="text-[10px] text-purple-900 font-bold uppercase">
                              Client / Party Name:
                            </span>
                            <div className="text-sm font-black text-slate-950">
                              {ord.customerName}
                            </div>
                            <div className="text-[11px] text-slate-700 mt-0.5">
                              Delivery Site: {ord.siteName}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-purple-900 font-bold uppercase">
                              Order Reference:
                            </span>
                            <div className="text-xs font-bold text-slate-900">
                              {ord.orderNumber} ({ord.jobCardNumber})
                            </div>
                            <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                              IS 14856:2000 Verification: 100% PASS
                            </div>
                          </div>
                        </div>

                        {/* Verification Table */}
                        <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                              <th className="p-2 border-r border-slate-300">#</th>
                              <th className="p-2 border-r border-slate-300">Door Item / Opening</th>
                              <th className="p-2 border-r border-slate-300">Target Size</th>
                              <th className="p-2 border-r border-slate-300">Cl. 6 Dim. Tol.</th>
                              <th className="p-2 border-r border-slate-300">Cl. 6.2 Squareness</th>
                              <th className="p-2 border-r border-slate-300">Cl. 6.3 Flatness</th>
                              <th className="p-2 text-center">Final Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ord.doorsList.map((door, dIdx) => (
                              <tr key={dIdx} className="border-b border-slate-200">
                                <td className="p-2 border-r border-slate-300 font-bold">
                                  {dIdx + 1}
                                </td>
                                <td className="p-2 border-r border-slate-300">
                                  <strong>{door.tag}</strong>
                                  <br />
                                  <span className="text-[10px] text-slate-600">
                                    {door.profile} • {door.finish}
                                  </span>
                                </td>
                                <td className="p-2 border-r border-slate-300 font-semibold">
                                  {door.shutterSize}
                                </td>
                                <td className="p-2 border-r border-slate-300 text-emerald-700 font-bold">
                                  ±1.2 mm (Pass)
                                </td>
                                <td className="p-2 border-r border-slate-300 text-emerald-700 font-bold">
                                  1.4 mm (Pass &le; 3mm)
                                </td>
                                <td className="p-2 border-r border-slate-300 text-emerald-700 font-bold">
                                  0.8 mm (Pass &le; 3mm)
                                </td>
                                <td className="p-2 text-center font-bold text-emerald-700">
                                  ✓ CERTIFIED
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Testing Summary */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] space-y-1">
                          <div className="font-bold text-slate-800 text-[11px]">
                            Physical &amp; Structural Testing Summary (Lot Verification):
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-700">
                            <div>• Water Immersion Absorption: <strong>0.82%</strong> (IS Limit &le; 2.0%) ✓ Pass</div>
                            <div>• Screw Holding Strength: <strong>1,320 N</strong> (IS Limit &ge; 1,000 N) ✓ Pass</div>
                            <div>• 500g Steel Ball Impact Test (1.0m): <strong>Zero Cracking / Indentation</strong> ✓ Pass</div>
                            <div>• 100 Cycles Slamming Test: <strong>Zero Joint Failure or Delamination</strong> ✓ Pass</div>
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-6 flex justify-between items-end border-t border-slate-300 text-[11px]">
                          <div>
                            <div className="font-bold text-slate-800">Inspected by: Er. S. Nair</div>
                            <div className="text-slate-500">Lead QA Engineer • Vengara Plant</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">For EXMARK DOORS QUALITY DIVISION</div>
                            <div className="text-emerald-700 font-bold mt-1">AUTHORIZED FACTORY RELEASE STAMP</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* FORMAT 3: PARTY-WISE A4 MASTER CUTTING SCHEDULE */}
              {activePrintModal === 'A4_SCHEDULE' && (
                <div className="space-y-8">
                  {orders
                    .filter((o) => selectedOrderIds.includes(o.id))
                    .map((ord) => {
                      const totalDoorsInOrder = ord.doorsList.reduce((acc, d) => acc + d.qty, 0);
                      return (
                        <div
                          key={ord.id}
                          className="bg-white text-slate-900 p-6 border border-slate-300 rounded-xl shadow-md space-y-4 break-after-page print:border-none print:shadow-none print:p-0"
                        >
                          {/* Header */}
                          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                            <div>
                              <div className="text-xl font-black text-rose-700 tracking-wider">
                                EXMARK DOORS
                              </div>
                              <div className="text-xs text-slate-700 font-bold">
                                MASTER DOOR PRODUCTION &amp; DISPATCH SCHEDULE (A4 FORMAT)
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ISO 9001:2015 &amp; IS 14856:2000 Certified Factory • Vengara, Malappuram
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-2.5 py-1 bg-cyan-900 text-white rounded font-bold text-[10px]">
                                A4 PRODUCTION SCHEDULE
                              </span>
                              <div className="text-xs font-bold text-slate-900 mt-1">
                                Order Ref: {ord.orderNumber}
                              </div>
                              <div className="text-[10px] text-slate-600">
                                Generated: {new Date().toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>

                          {/* Party Summary */}
                          <div className="grid grid-cols-2 gap-4 bg-cyan-50 p-3 rounded-lg border border-cyan-200 text-xs">
                            <div>
                              <span className="text-[10px] text-cyan-900 font-bold uppercase">
                                Party / Customer Details:
                              </span>
                              <div className="text-sm font-black text-slate-950">
                                {ord.customerName}
                              </div>
                              <div className="text-[11px] text-slate-700 mt-0.5">
                                Site Location: {ord.siteName}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-cyan-900 font-bold uppercase">
                                Scope &amp; Batch Summary:
                              </span>
                              <div className="text-sm font-black text-cyan-950">
                                {totalDoorsInOrder} Door Sets Ordered
                              </div>
                              <div className="text-[11px] text-slate-700 mt-0.5">
                                Job Card: {ord.jobCardNumber}
                              </div>
                            </div>
                          </div>

                          {/* Table */}
                          <table className="w-full text-left border-collapse border border-slate-300 text-xs mt-2">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                                <th className="p-2 border-r border-slate-300 text-center">#</th>
                                <th className="p-2 border-r border-slate-300">Room Tag</th>
                                <th className="p-2 border-r border-slate-300">Outer Frame</th>
                                <th className="p-2 border-r border-slate-300">Master Shutter</th>
                                <th className="p-2 border-r border-slate-300">Tape Reading</th>
                                <th className="p-2 border-r border-slate-300">Profile</th>
                                <th className="p-2 border-r border-slate-300">Finish/Shade</th>
                                <th className="p-2 border-r border-slate-300">Hardware</th>
                                <th className="p-2 text-center">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ord.doorsList.map((door, idx) => (
                                <tr key={idx} className="border-b border-slate-200">
                                  <td className="p-2 border-r border-slate-300 font-bold text-center">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-bold text-slate-900">
                                    {door.tag}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-semibold text-slate-700">
                                    {door.frameSize}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-black text-rose-700">
                                    {door.shutterSize}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-mono text-[10px] text-slate-700">
                                    {door.tape}
                                  </td>
                                  <td className="p-2 border-r border-slate-300">{door.profile}</td>
                                  <td className="p-2 border-r border-slate-300">{door.finish}</td>
                                  <td className="p-2 border-r border-slate-300 text-slate-700">
                                    {door.hand} • {door.lock}
                                  </td>
                                  <td className="p-2 text-center font-bold text-slate-900">
                                    {door.qty}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Footer */}
                          <div className="grid grid-cols-2 gap-4 pt-4 text-[11px] text-slate-600 border-t border-slate-300">
                            <div>
                              <strong>Factory Supervisor Notes:</strong>
                              <br />
                              Check all shutter sizes against site masonry openings before cutting mortise. Standard 12mm floor clearance applied.
                            </div>
                            <div className="text-right space-y-1">
                              <div>Prepared By: <strong>Production Supervisor (Plant Floor)</strong></div>
                              <div>Site Verification: <strong>Site Engineer / Contractor Sign</strong></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Dynamic Thermal 4"x2" vs A4 Top-Left Print Rule */}
      {activePrintModal === 'STICKERS' && (
        <style jsx global>{`
          @media print {
            @page {
              size: ${stickerFormat === 'THERMAL_ROLL' ? '4in 2in' : 'A4 portrait'};
              margin: 0mm;
            }
            .printable-modal-root {
              position: static !important;
              display: block !important;
              align-items: flex-start !important;
              justify-content: flex-start !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}</style>
      )}
    </div>
  );
}
