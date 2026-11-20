'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Eye,
  EyeOff,
  DoorOpen,
  Layers,
  Building2,
  Calendar,
  CheckCircle2,
  Phone,
  MapPin,
} from 'lucide-react';
import type { ProductionOrder, ProductionDoorItem } from '@/lib/services/productionService';
import type { SiteMeasurementRecord } from '@/types/measurements';

interface QueueMeasurementSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
}

export function QueueMeasurementSheetModal({
  isOpen,
  onClose,
  order,
}: QueueMeasurementSheetModalProps) {
  const [showPricing, setShowPricing] = useState<boolean>(false);
  const [displayUnit, setDisplayUnit] = useState<'CM' | 'MM' | 'INCH'>('CM');
  const [linkedMeasurement, setLinkedMeasurement] = useState<SiteMeasurementRecord | null>(null);

  useEffect(() => {
    if (!isOpen || !order?.measurementRef) {
      setLinkedMeasurement(null);
      return;
    }

    let active = true;
    fetch('/api/measurements')
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        const list: SiteMeasurementRecord[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.measurements)
          ? json.measurements
          : [];
        const match = list.find((m) => m.id === order.measurementRef || m.refNumber === order.measurementRef);
        if (match) setLinkedMeasurement(match);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen, order?.measurementRef]);

  if (!isOpen || !order) return null;

  const doors: ProductionDoorItem[] = order.doors || [];
  const totalDoors = doors.length || order.quantity || 1;

  // Calculate approximate total sq.ft
  const totalSqFt = doors.reduce((sum, d) => {
    const w = d.finishedWidthMm || d.rawWidthMm || 900;
    const h = d.finishedHeightMm || d.rawHeightMm || 2100;
    const sqft = (w / 304.8) * (h / 304.8);
    return sum + sqft;
  }, 0);

  const avgSqFt = totalDoors > 0 ? (totalSqFt / totalDoors).toFixed(2) : '18.00';

  const handlePrint = () => {
    window.print();
  };

  /**
   * Converts mm to the requested display unit string
   */
  const formatDimension = (mmVal: number | undefined): string => {
    if (!mmVal || mmVal <= 0) return '-';
    if (displayUnit === 'MM') {
      return `${Math.round(mmVal)} mm`;
    }
    if (displayUnit === 'INCH') {
      const inches = mmVal / 25.4;
      const whole = Math.floor(inches);
      const remainder = inches - whole;
      const eighths = Math.round(remainder * 8);
      if (eighths === 0) return `${whole}"`;
      if (eighths === 8) return `${whole + 1}"`;
      if (eighths === 4) return `${whole} ½"`;
      if (eighths === 2 || eighths === 6) return `${whole} ${eighths === 2 ? '¼' : '¾'}"`;
      return `${whole} ${eighths}/8"`;
    }
    // Default: CM
    const cm = mmVal / 10;
    return `${cm.toFixed(1).replace(/\.0$/, '')} cm`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
      {/* Print styles specifically forced to A4 Landscape */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 6mm 8mm;
        }
        @media print {
          html,
          body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden,
          nav,
          header,
          aside {
            display: none !important;
          }
          .landscape-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .page-break-after {
            page-break-after: always;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="landscape-print-container relative w-full max-w-[1240px] max-h-[96vh] overflow-y-auto bg-white text-black rounded-xl shadow-2xl border-2 border-black flex flex-col font-sans">
        {/* Screen Action Bar (Hidden on print) */}
        <div className="print-hidden sticky top-0 z-30 px-5 py-3 bg-black text-white border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>QUEUE STAGE MEASUREMENT FORM (ക്യൂ മെഷർമെന്റ് ഷീറ്റ്)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  IN QUEUE
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Job Card: <span className="font-bold text-amber-300">{order.jobCardNumber}</span> | Customer:{' '}
                <span className="font-bold text-white">{order.customerName}</span> | Site:{' '}
                <span className="font-bold text-white">{order.siteName}</span> |{' '}
                <span className="font-bold text-white">{totalDoors} Doors</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unit Switcher */}
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDisplayUnit('CM')}
                className={`px-2 py-1 rounded font-bold cursor-pointer ${
                  displayUnit === 'CM' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                CM
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit('MM')}
                className={`px-2 py-1 rounded font-bold cursor-pointer ${
                  displayUnit === 'MM' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                MM
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit('INCH')}
                className={`px-2 py-1 rounded font-bold cursor-pointer ${
                  displayUnit === 'INCH' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                INCH
              </button>
            </div>

            {/* Show / Hide Price toggle */}
            <button
              type="button"
              onClick={() => setShowPricing(!showPricing)}
              className="px-2.5 py-1 rounded-md border border-slate-600 bg-slate-900 text-slate-200 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {showPricing ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPricing ? 'Hide Prices' : 'Show Prices'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet (A4 Landscape)</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet (Pure White Background & Solid Black Borders/Typography) */}
        <div className="p-6 space-y-4 bg-white text-black">
          {/* Header */}
          <div className="border-b-2 border-black pb-3">
            <div className="flex items-start justify-between gap-4">
              {/* Company Branding */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-black uppercase">
                    EXMARK DOORS &amp; WINDOWS
                  </h1>
                  <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded tracking-wider">
                    ISO 9001:2015
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Premium FRP &amp; WPC Composite Door Systems • Kerala Manufacturing Plant
                </p>
                <p className="text-[10px] text-slate-600">
                  Factory: Valanchery Road, Malappuram, Kerala | Support: +91 94470 12345 | Web: exmarkdoors.com
                </p>
              </div>

              {/* Sheet Title & Meta */}
              <div className="text-right space-y-0.5">
                <div className="inline-block px-3 py-1 bg-black text-white font-black text-xs uppercase tracking-wider rounded">
                  QUEUE STAGE MEASUREMENT FORM (DOOR &amp; FRAME SCHEDULE)
                </div>
                <div className="text-xs font-mono font-bold text-black pt-1">
                  JOB CARD: <span className="font-black text-black">{order.jobCardNumber}</span>
                  {order.batchNumber && (
                    <span className="text-slate-600 ml-2 font-normal">| Batch: {order.batchNumber}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-700">
                  Order Date: <span className="font-bold text-black">{order.orderDate || order.createdAt?.slice(0, 10)}</span> |
                  Stage: <span className="font-black text-black uppercase">IN QUEUE (മൊൾഡിംഗ് ക്യൂ)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Party & Site Information Grid (Clean Boxed Header) */}
          <div className="grid grid-cols-3 gap-3 text-xs border border-black rounded-md p-3 bg-slate-50">
            {/* Col 1: Client & Site */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-24">Client / Party:</span>
                <span className="font-black text-black text-sm">{order.customerName}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-24">Site Location:</span>
                <span className="font-bold text-black">{order.siteName}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-24">District:</span>
                <span className="font-bold text-black">{order.district || 'Kerala'}</span>
              </div>
              {linkedMeasurement?.siteAddress && (
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 w-24">Site Address:</span>
                  <span className="text-slate-800 font-medium truncate max-w-[200px]">
                    {linkedMeasurement.siteAddress}
                  </span>
                </div>
              )}
            </div>

            {/* Col 2: Plant Specs & Line */}
            <div className="space-y-1 pl-3 border-l border-slate-300">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Category:</span>
                <span className="font-black text-black">
                  {order.doorCategory === 'WPC_DOORS' ? 'WPC Solid Composite' : 'FRP Handcrafted Doors'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Assigned Line:</span>
                <span className="font-bold text-black">{order.lineAssigned || 'Station 1 (Molding)'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Measurement Ref:</span>
                <span className="font-mono font-bold text-black">
                  {order.measurementRef || linkedMeasurement?.refNumber || 'Direct Factory Order'}
                </span>
              </div>
              {linkedMeasurement?.engineerName && (
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 w-28">Surveyor:</span>
                  <span className="font-medium text-black">{linkedMeasurement.engineerName}</span>
                </div>
              )}
            </div>

            {/* Col 3: Tolerances & Openings */}
            <div className="space-y-1 pl-3 border-l border-slate-300">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Total Openings:</span>
                <span className="font-black text-black text-sm">{totalDoors} Sets</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Total Sq.Ft:</span>
                <span className="font-black text-black">
                  {totalSqFt.toFixed(2)} Sq.Ft (Avg {avgSqFt} / door)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Height Tolerance:</span>
                <span className="font-mono font-bold text-red-600">
                  -{order.tolerancesApplied?.heightDeductionMm || 10} mm (Clearance)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Width Tolerance:</span>
                <span className="font-mono font-bold text-red-600">
                  -{order.tolerancesApplied?.widthDeductionMm || 10} mm (Clearance)
                </span>
              </div>
            </div>
          </div>

          {/* Door & Frame Schedule Table (Comprehensive A4 Landscape Grid) */}
          <div className="border border-black rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-black bg-slate-100 text-[9px] uppercase font-black text-black tracking-wider">
                  <th className="py-2 px-2 text-center border-r border-slate-300 w-10">#</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Opening / Room</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Door Model &amp; Category</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">
                    Masonry Wall Opening (W × H)
                  </th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center bg-amber-50/70">
                    Finished Door Slab (W × H × Thk)
                  </th>
                  <th className="py-2 px-2.5 border-r border-slate-300">
                    Door Frame Profile &amp; Section
                  </th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center">Handing / Swing</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Lock &amp; Hardware</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Finish Color</th>
                  {showPricing && <th className="py-2 px-2.5 border-r border-slate-300 text-right">Lock Cost</th>}
                  {showPricing && <th className="py-2 px-2.5 border-r border-slate-300 text-right">Frame Cost</th>}
                  <th className="py-2 px-2.5">Site Remarks &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-[11px]">
                {doors.map((door, idx) => {
                  // Masonry / Raw Dimensions
                  const rawWTop = door.rawWidthMm || (door.rawWidthTopCm ? door.rawWidthTopCm * 10 : 900);
                  const rawWBtm = door.rawWidthBottomMm || (door.rawWidthBtmCm ? door.rawWidthBtmCm * 10 : rawWTop);
                  const rawH = door.rawHeightMm || (door.rawHeightCm ? door.rawHeightCm * 10 : 2100);

                  const masonryWStr =
                    rawWTop === rawWBtm
                      ? formatDimension(rawWTop)
                      : `T: ${formatDimension(rawWTop)} / B: ${formatDimension(rawWBtm)}`;
                  const masonryHStr = formatDimension(rawH);

                  // Finished Dimensions after frame deduction
                  const finW = door.finishedWidthMm || rawWTop - (order.tolerancesApplied?.widthDeductionMm || 10);
                  const finH = door.finishedHeightMm || rawH - (order.tolerancesApplied?.heightDeductionMm || 10);
                  const thk = door.doorThicknessMm || 32;

                  // Frame type & Section
                  const frameName = door.frameTypeName || 'WPC Solid Extruded 100×65mm';

                  // Lock
                  const lockStr = door.lockType || 'Standard Lock';

                  // Handing & Swing
                  const handingStr = door.handing || 'RH';
                  const swingStr = door.swing ? (door.swing === 'INWARD' ? 'Inward' : 'Outward') : 'Inward';

                  return (
                    <tr key={door.id || `q-door-${idx}`} className="hover:bg-slate-50">
                      {/* # */}
                      <td className="py-2 px-2 text-center font-black border-r border-slate-300 bg-slate-50 font-mono">
                        {door.doorNumber || `D${idx + 1}`}
                      </td>

                      {/* Opening / Room */}
                      <td className="py-2 px-2.5 font-bold text-black border-r border-slate-300">
                        {door.remark?.split('-')[0]?.trim() || `Opening ${idx + 1}`}
                      </td>

                      {/* Model & Category */}
                      <td className="py-2 px-2.5 border-r border-slate-300 font-bold text-slate-900">
                        {door.model || 'Standard Composite Flush'}
                        <span className="block text-[9px] text-slate-500 font-normal">
                          {order.doorCategory === 'WPC_DOORS' ? 'WPC Series' : 'FRP Series'}
                        </span>
                      </td>

                      {/* Masonry Opening (Raw Wall) */}
                      <td className="py-2 px-2.5 text-center font-mono text-slate-700 border-r border-slate-300 whitespace-nowrap">
                        <span className="block font-semibold">{masonryWStr}</span>
                        <span className="block text-[9px] text-slate-500">× {masonryHStr}</span>
                      </td>

                      {/* Finished Door Slab (Cutting Size) */}
                      <td className="py-2 px-2.5 text-center font-mono font-black text-black border-r border-slate-300 whitespace-nowrap bg-amber-50/40">
                        <span className="text-black">
                          {formatDimension(finW)} × {formatDimension(finH)}
                        </span>
                        <span className="block text-[9px] text-amber-800 font-bold">
                          Thk: {thk} mm
                        </span>
                      </td>

                      {/* Frame Profile & Section */}
                      <td className="py-2 px-2.5 border-r border-slate-300 text-slate-800 font-medium">
                        <span className="font-bold text-black block">{frameName}</span>
                        <span className="text-[9px] text-slate-500 block">
                          Rebate: Standard 35mm • Wall: 100mm
                        </span>
                      </td>

                      {/* Handing / Swing */}
                      <td className="py-2 px-2 text-center border-r border-slate-300 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 rounded font-black text-[10px] bg-black text-white">
                          {handingStr}
                        </span>
                        <span className="block text-[9px] text-slate-600 font-semibold mt-0.5">
                          {swingStr}
                        </span>
                      </td>

                      {/* Lock & Hardware */}
                      <td className="py-2 px-2.5 border-r border-slate-300 text-slate-800">
                        <span className="font-semibold block">{lockStr}</span>
                      </td>

                      {/* Finish Color */}
                      <td className="py-2 px-2.5 border-r border-slate-300 font-bold text-black">
                        {door.finishColor || 'Natural Teak Matte'}
                      </td>

                      {/* Price Cols if toggled */}
                      {showPricing && (
                        <td className="py-2 px-2.5 border-r border-slate-300 text-right font-mono text-slate-800">
                          ₹{door.lockPrice || 0}
                        </td>
                      )}
                      {showPricing && (
                        <td className="py-2 px-2.5 border-r border-slate-300 text-right font-mono text-slate-800">
                          ₹{door.frameCostPrice || 0}
                        </td>
                      )}

                      {/* Remarks */}
                      <td className="py-2 px-2.5 text-slate-600 text-[10px]">
                        {door.remark || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quality & Production Queue Verification Sign-Off Footer */}
          <div className="pt-2 border-t border-black">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Box 1 */}
              <div className="border border-black rounded p-2.5 text-center space-y-7 bg-slate-50">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-600">
                  1. Field Site Surveyor (അളവെടുത്തയാൾ)
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-700">
                  Signature &amp; Date
                </div>
              </div>

              {/* Box 2 */}
              <div className="border border-black rounded p-2.5 text-center space-y-7 bg-slate-50">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-600">
                  2. Plant Queue In-Charge (മോൾഡിംഗ് &amp; കട്ടിംഗ് ഇൻചാർജ്)
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-700">
                  Verified for Molds &amp; Gang
                </div>
              </div>

              {/* Box 3 */}
              <div className="border border-black rounded p-2.5 text-center space-y-7 bg-slate-50">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-600">
                  3. Client / Site Representative (കസ്റ്റമർ സ്ഥിരീകരണം)
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-700">
                  Approved Dimensions
                </div>
              </div>
            </div>

            {/* Micro disclaimer */}
            <div className="flex items-center justify-between text-[8.5px] text-slate-500 pt-2">
              <span>
                * Measurements reflect raw masonry openings and finished hand-cut door slab dimensions after factory frame clearance deductions.
              </span>
              <span className="font-mono">
                Printed from EXMARK ERP • Queue Stage Engineering Document • Ref: {order.jobCardNumber}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
