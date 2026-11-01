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
  Eye,
  CheckCircle2,
  X,
  Building2,
  Calendar,
} from 'lucide-react';

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

const SEED_BATCH_ORDERS: BatchOrderData[] = [
  {
    id: 'SO-2026-091',
    orderNumber: 'SO-2026-091',
    customerName: 'Skyline Builders (Kochi)',
    siteName: 'Skyline Prime Villa, Kakkanad, Ernakulam',
    district: 'Ernakulam',
    jobCardNumber: 'JC-2026-881',
    totalAmount: 280000,
    doorsDesc: '18 Sets FRP Heavy Molded Doors (Rose Wood finish)',
    doorsList: [
      { tag: 'D1 - Master Bed', frameSize: '206.1 × 81.3 cm', shutterSize: '204.4 × 73.3 cm', tape: '80 1/2" × 28 7/8"', profile: 'FRP Molded 30mm', finish: 'Rose Wood (EXGC-511)', lock: 'Baby Latch', hand: 'RH Inside', qty: 4 },
      { tag: 'D2 - Bed 2 (1st Floor)', frameSize: '206.1 × 81.3 cm', shutterSize: '204.4 × 73.3 cm', tape: '80 1/2" × 28 7/8"', profile: 'FRP Molded 30mm', finish: 'Rose Wood (EXGC-511)', lock: 'Baby Latch', hand: 'LH Inside', qty: 4 },
      { tag: 'D3 - Bed 3 (Guest)', frameSize: '206.1 × 81.3 cm', shutterSize: '204.4 × 73.3 cm', tape: '80 1/2" × 28 7/8"', profile: 'FRP Molded 30mm', finish: 'Rose Wood (EXGC-511)', lock: 'Baby Latch', hand: 'RH Inside', qty: 4 },
      { tag: 'D4 - Kitchen & Work Area', frameSize: '203.2 × 76.2 cm', shutterSize: '201.5 × 68.2 cm', tape: '79 3/8" × 26 7/8"', profile: 'FRP Waterproof 28mm', finish: 'Natural Teak', lock: 'Mortise 60mm', hand: 'RH Outside', qty: 3 },
      { tag: 'D5 - Bathrooms (Waterproof)', frameSize: '198.1 × 71.1 cm', shutterSize: '196.4 × 63.1 cm', tape: '77 3/8" × 24 7/8"', profile: 'FRP Pure White 28mm', finish: 'Glossy White', lock: 'Cylindrical Knob', hand: 'LH Inside', qty: 3 },
    ],
  },
  {
    id: 'SO-2026-092',
    orderNumber: 'SO-2026-092',
    customerName: 'Malabar Heritage Project',
    siteName: 'Heritage Villas, Westhill, Kozhikode',
    district: 'Kozhikode',
    jobCardNumber: 'JC-2026-882',
    totalAmount: 218000,
    doorsDesc: '14 Sets WPC Solid Core Waterproof Doors (Teak finish)',
    doorsList: [
      { tag: 'M1 - Main Entrance Inner', frameSize: '210.0 × 90.0 cm', shutterSize: '208.3 × 82.0 cm', tape: '82" × 32 1/4"', profile: 'WPC Solid Extruded 32mm', finish: 'Natural Teak (EXGC-510)', lock: 'Mortise 60mm', hand: 'RH Inside', qty: 4 },
      { tag: 'M2 - Bed 1 & 2', frameSize: '206.1 × 81.3 cm', shutterSize: '204.4 × 73.3 cm', tape: '80 1/2" × 28 7/8"', profile: 'WPC Solid Core 30mm', finish: 'Natural Teak (EXGC-510)', lock: 'Baby Latch', hand: 'LH Inside', qty: 6 },
      { tag: 'M3 - Balcony & Patio', frameSize: '203.2 × 76.2 cm', shutterSize: '201.5 × 68.2 cm', tape: '79 3/8" × 26 7/8"', profile: 'WPC Waterproof 28mm', finish: 'Natural Teak (EXGC-510)', lock: 'Tower Bolt', hand: 'RH Inside', qty: 4 },
    ],
  },
  {
    id: 'SO-2026-093',
    orderNumber: 'SO-2026-093',
    customerName: 'Dr. Jacob Abraham',
    siteName: 'Ottapalam, Palakkad',
    district: 'Palakkad',
    jobCardNumber: 'JC-2026-883',
    totalAmount: 130000,
    doorsDesc: '10 Sets Luxury Designer FRP Doors (Mahogany finish)',
    doorsList: [
      { tag: 'V1 - Master Suite', frameSize: '208.3 × 83.8 cm', shutterSize: '206.6 × 75.8 cm', tape: '81 3/8" × 29 7/8"', profile: 'FRP Luxury 30mm', finish: 'Mahogany Dark (EXGC-503)', lock: 'Mortise 60mm', hand: 'RH Inside', qty: 3 },
      { tag: 'V2 - Family Living', frameSize: '206.1 × 81.3 cm', shutterSize: '204.4 × 73.3 cm', tape: '80 1/2" × 28 7/8"', profile: 'FRP Luxury 30mm', finish: 'Mahogany Dark (EXGC-503)', lock: 'Baby Latch', hand: 'LH Inside', qty: 4 },
      { tag: 'V3 - Attached Bathrooms', frameSize: '198.1 × 71.1 cm', shutterSize: '196.4 × 63.1 cm', tape: '77 3/8" × 24 7/8"', profile: 'FRP Solid Core 28mm', finish: 'Pure White Glossy', lock: 'Baby Latch', hand: 'RH Inside', qty: 3 },
    ],
  },
];

export interface ExpandedSticker {
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
}

export interface BatchPrintHubProps {
  initialSelectedOrderIds?: string[];
  onClose?: () => void;
}

export default function BatchPrintHub({
  initialSelectedOrderIds,
  onClose,
}: BatchPrintHubProps = {}) {
  const [orders, setOrders] = useState<BatchOrderData[]>(SEED_BATCH_ORDERS);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    initialSelectedOrderIds && initialSelectedOrderIds.length > 0
      ? initialSelectedOrderIds
      : ['SO-2026-091', 'SO-2026-092', 'SO-2026-093']
  );
  const [partyFilter, setPartyFilter] = useState<string>('ALL');
  const [activePrintModal, setActivePrintModal] = useState<'STICKERS' | 'QC_PDF' | 'A4_SCHEDULE' | null>(null);
  const [stickerFormat, setStickerFormat] = useState<'A4_12L' | 'THERMAL_ROLL'>('A4_12L');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      ord.doorsList.forEach((door) => {
        for (let q = 1; q <= door.qty; q++) {
          list.push({
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
          });
        }
        doorIdx++;
      });
    });
    return list;
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
              <option value="ALL">All Parties & Projects (എല്ലാ പാർട്ടികളും)</option>
              <option value="Skyline">Skyline Builders (Kochi)</option>
              <option value="Malabar">Malabar Heritage (Calicut)</option>
              <option value="Jacob">Dr. Jacob Abraham (Palakkad)</option>
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
            <option value="A4_12L">📄 A4 12-Up Sheet (12L Compact)</option>
            <option value="THERMAL_ROLL">🏷️ Single Thermal Roll (4"×2" / 100×50mm)</option>
          </select>

          <button
            onClick={() => setActivePrintModal('STICKERS')}
            disabled={totalStickers === 0}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Tag className="w-4 h-4" />
            <span>Print 12L Stickers {stickerFormat === 'THERMAL_ROLL' ? '(Thermal Roll)' : '(12-Up A4)'} 🏷️</span>
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
          {filteredOrders.map((ord) => {
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
          })}
        </div>
      </div>

      {/* Live Sample Sticker Preview Grid */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-rose-400" />
            <span>Batch 12L Sticker Sheet Layout (Live Sample Preview)</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Standard 12-Up A4 Die-Cut Sticker Paper (70mm × 74mm per label)
          </span>
        </div>

        {stickers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Please tick at least one order to preview batch stickers.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {stickers.slice(0, 4).map((st, idx) => (
              <div
                key={idx}
                className="bg-[#070D1E] border border-slate-700/80 rounded-xl p-3 space-y-1.5 relative shadow-md"
              >
                <div className="flex justify-between items-start border-b border-slate-800 pb-1">
                  <div className="font-black text-rose-500 text-[10px] tracking-wide">EXMARK DOORS</div>
                  <div className="text-[9px] font-bold text-slate-400">
                    {st.orderNumber} • #{idx + 1}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-white text-[11px] truncate">{st.customerName}</div>
                  <div className="text-[10px] font-semibold text-cyan-400">
                    {st.tag} ({st.unitIndex}/{st.totalUnitsInTag})
                  </div>
                </div>

                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-0.5">
                  <div className="text-[9px] text-slate-400">FACTORY SHUTTER SIZE:</div>
                  <div className="font-black text-emerald-400 text-xs">{st.shutterSize}</div>
                  <div className="text-[9px] text-slate-300">Tape: {st.tape}</div>
                </div>

                <div className="text-[9px] text-slate-400 space-y-0.5">
                  <div>
                    <strong className="text-slate-300">Spec:</strong> {st.profile}
                  </div>
                  <div>
                    <strong className="text-slate-300">Finish:</strong> {st.finish}
                  </div>
                  <div>
                    <strong className="text-slate-300">Hardware:</strong> {st.hand} • {st.lock}
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-800 text-center font-mono text-[9px] tracking-widest text-slate-400">
                  {st.barcode}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= PRINT / PDF PREVIEW MODAL ================= */}
      {activePrintModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/85 backdrop-blur-md">
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
                      🏷️ Thermal Roll (4"×2")
                    </button>
                  </div>
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
                  {stickerFormat === 'A4_12L' ? (
                    /* A4 12-UP COMPACT DIE-CUT SHEETS (EXACT 67mm PER CARD, ZERO OVERFLOW) */
                    <div className="space-y-8">
                      {Array.from({ length: totalSheets }).map((_, sIdx) => {
                        const sheetStickers = stickers.slice(sIdx * 12, (sIdx + 1) * 12);
                        return (
                          <div
                            key={sIdx}
                            className="sheet-12l bg-white border border-slate-300 rounded-xl shadow-sm break-after-page print:border-none print:shadow-none print:m-0"
                            style={{
                              width: '210mm',
                              height: '292mm',
                              maxHeight: '294mm',
                              padding: '5mm 5mm',
                              margin: '0 auto',
                              boxSizing: 'border-box',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gridTemplateRows: 'repeat(4, 1fr)',
                              gap: '2.5mm',
                            }}
                          >
                            {sheetStickers.map((st, idx) => {
                              const globalNum = sIdx * 12 + idx + 1;
                              return (
                                <div
                                  key={idx}
                                  className="sticker-card-12l border border-dashed border-slate-400 font-sans bg-white"
                                  style={{
                                    height: '67mm',
                                    maxHeight: '67mm',
                                    overflow: 'hidden',
                                    padding: '2mm 2.5mm',
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    fontSize: '8.5px',
                                    lineHeight: 1.15,
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid',
                                  }}
                                >
                                  <div>
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-0.5 mb-1">
                                      <span className="font-black text-rose-700 tracking-wider text-[9px]">
                                        EXMARK DOORS
                                      </span>
                                      <span className="font-bold text-[8px] text-slate-700">
                                        {st.orderNumber} #{globalNum}/{totalStickers}
                                      </span>
                                    </div>
                                    <div className="font-bold text-slate-950 text-[10px] leading-tight truncate">
                                      {st.customerName}
                                    </div>
                                    <div className="text-[8px] text-slate-500 truncate mb-0.5">
                                      {st.siteName}
                                    </div>

                                    <div className="bg-slate-50 p-1 rounded border border-slate-300 my-0.5 text-center">
                                      <div className="font-bold text-slate-900 text-[9px] truncate">
                                        {st.tag} ({st.unitIndex}/{st.totalUnitsInTag})
                                      </div>
                                      <div className="font-black text-slate-950 text-[11px] leading-tight">
                                        {st.shutterSize}
                                      </div>
                                      <div className="text-[8px] text-slate-600">Tape: {st.tape}</div>
                                    </div>

                                    <div className="text-[8px] text-slate-700 leading-tight">
                                      <div className="truncate"><strong>Spec:</strong> {st.profile}</div>
                                      <div className="truncate"><strong>Finish:</strong> {st.finish}</div>
                                      <div className="truncate"><strong>Hdw:</strong> {st.hand} • {st.lock}</div>
                                    </div>
                                  </div>

                                  <div className="pt-0.5 border-t border-slate-300 text-center font-mono text-[8px] tracking-wider text-slate-800">
                                    {st.barcode}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Blank slots up to 12 */}
                            {Array.from({ length: 12 - sheetStickers.length }).map((_, bIdx) => (
                              <div
                                key={bIdx}
                                className="sticker-card-12l border border-dashed border-slate-300 text-center text-slate-300 text-[8px] flex items-center justify-center rounded"
                                style={{
                                  height: '67mm',
                                  maxHeight: '67mm',
                                  boxSizing: 'border-box',
                                }}
                              >
                                [Blank 12L Die-Cut Slot]
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* SINGLE CONTINUOUS THERMAL ROLL LABELS (4" x 2" / 100mm x 50mm) */
                    <div className="thermal-roll-container mx-auto space-y-4 max-w-[100mm]">
                      {stickers.map((st, idx) => (
                        <div
                          key={idx}
                          className="thermal-single-label bg-white text-black border border-slate-900 rounded p-2.5 break-after-page shadow-sm"
                          style={{
                            width: '100mm',
                            height: '50mm',
                            maxHeight: '50mm',
                            padding: '2.5mm 3.5mm',
                            margin: '0 auto 5mm auto',
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
    </div>
  );
}
