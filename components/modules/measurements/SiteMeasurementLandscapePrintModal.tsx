'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Layers,
  DoorOpen,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { SiteMeasurementRecord, DoorItemInput } from '@/types/measurements';

interface SiteMeasurementLandscapePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SiteMeasurementRecord | null;
}

export function SiteMeasurementLandscapePrintModal({
  isOpen,
  onClose,
  record,
}: SiteMeasurementLandscapePrintModalProps) {
  const [showPricing, setShowPricing] = useState<boolean>(false);
  const [preferredUnit, setPreferredUnit] = useState<'AUTO' | 'INCH' | 'CM'>('AUTO');

  if (!isOpen || !record) return null;

  const doors = record.doors || [];
  const totalOpenings = doors.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalSqFt = doors.reduce((sum, d) => sum + (Number(d.calculatedSqFt) || 18.0), 0);
  const avgSqFt = totalOpenings > 0 ? (totalSqFt / totalOpenings).toFixed(2) : '18.00';
  const totalEstimatedAmount = doors.reduce(
    (sum, d) => sum + ((Number(d.unitPrice) || 7500) * (d.quantity || 1)),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  const formatDimension = (val: number, fraction?: string, unit: string = 'CM') => {
    if (!val && !fraction) return '-';
    let s = String(val);
    if (fraction && fraction !== '0/8') s += ` ${fraction}`;
    return `${s} ${unit}`;
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
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                A4 Landscape Site Measurement Sheet
              </h2>
              <p className="text-[11px] text-slate-300">
                Ref: <span className="font-bold text-white">{record.refNumber}</span> | Customer:{' '}
                <span className="font-bold text-white">{record.customerName || record.siteName}</span> |{' '}
                <span className="font-bold text-amber-300">{doors.length} Doors</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

              {/* Sheet Title & Ref Meta */}
              <div className="text-right space-y-0.5">
                <div className="inline-block px-3 py-1 bg-black text-white font-black text-xs uppercase tracking-wider rounded">
                  SITE MEASUREMENT SHEET &amp; DOOR SCHEDULE
                </div>
                <div className="text-xs font-mono font-bold text-black pt-1">
                  REF NO: <span className="font-black text-black">{record.refNumber}</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  Date: <span className="font-bold text-black">{record.date || record.createdAt?.slice(0, 10)}</span> |
                  Status: <span className="font-black text-black uppercase">{record.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Party & Site Information Grid (Clean Boxed Header) */}
          <div className="grid grid-cols-2 gap-3 text-xs border border-black rounded-md p-3 bg-slate-50">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-24">Client / Party:</span>
                <span className="font-black text-black text-sm">{record.customerName || 'Direct Client'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-24">Site Location:</span>
                <span className="font-bold text-black">{record.siteName}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-24">District:</span>
                <span className="font-bold text-black">{record.district || 'Kerala'}</span>
              </div>
              {record.siteAddress && (
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 w-24">Address:</span>
                  <span className="text-slate-800 font-medium">{record.siteAddress}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 pl-4 border-l border-slate-300">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Measured By:</span>
                <span className="font-black text-black">{record.engineerName || 'Field Executive'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Queue Stage:</span>
                <span className="font-bold text-black">Early Stage / In Queue</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Total Openings:</span>
                <span className="font-black text-black">{totalOpenings} Sets</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 w-28">Total Sq.Ft:</span>
                <span className="font-black text-black">
                  {totalSqFt.toFixed(2)} Sq.Ft (Avg {avgSqFt} / door)
                </span>
              </div>
            </div>
          </div>

          {/* Door Openings Schedule Table (A4 Landscape Grid) */}
          <div className="border border-black rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-black bg-slate-100 text-[9px] uppercase font-black text-black tracking-wider">
                  <th className="py-2 px-2 text-center border-r border-slate-300 w-10">#</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Location / Room</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Category &amp; Model</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Masonry Opening (W × H)</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-center">Finished Size (W × H)</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-right">Sq.Ft</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Frame Section</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center">Handing</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Lock &amp; Hardware</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Finish Color</th>
                  {showPricing && <th className="py-2 px-2.5 border-r border-slate-300 text-right">Rate</th>}
                  {showPricing && <th className="py-2 px-2.5 border-r border-slate-300 text-right">Amount</th>}
                  <th className="py-2 px-2.5">Site Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-[11px]">
                {doors.map((d: DoorItemInput, idx: number) => {
                  const unit = d.measurementUnit || 'CM';
                  const wTop = formatDimension(d.widthTop, d.fractionWidthTop, unit);
                  const wBtm = formatDimension(d.widthBottom, d.fractionWidthBottom, unit);
                  const hLeft = formatDimension(d.heightLeft, d.fractionHeightLeft, unit);
                  const hRight = formatDimension(d.heightRight, d.fractionHeightRight, unit);

                  const masonryW =
                    d.widthTop === d.widthBottom ? wTop : `T: ${wTop} / B: ${wBtm}`;
                  const masonryH =
                    d.heightLeft === d.heightRight ? hLeft : `L: ${hLeft} / R: ${hRight}`;

                  const sqFt = Number(d.calculatedSqFt) || 18.0;
                  const unitPrice = Number(d.unitPrice) || 7500;
                  const totalLineAmount = unitPrice * (d.quantity || 1);

                  return (
                    <tr key={d.id || `door-row-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-2 text-center font-black border-r border-slate-300 bg-slate-50 font-mono">
                        {d.doorNumber || `D${idx + 1}`}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-black border-r border-slate-300">
                        {d.remarks?.split('-')[0]?.trim() || d.categoryName || `Opening ${idx + 1}`}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 font-bold text-slate-900">
                        {d.model || 'Standard Composite Flush'}
                        <span className="block text-[9px] text-slate-500 font-normal">
                          {d.categoryName || 'FRP Series'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono text-slate-700 border-r border-slate-300 whitespace-nowrap">
                        <span className="block">{masonryW}</span>
                        <span className="block text-[9px] text-slate-500">× {masonryH}</span>
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-black border-r border-slate-300 whitespace-nowrap">
                        {wTop} × {hLeft}
                        <span className="block text-[9px] text-slate-500 font-normal">Thk: 30 mm</span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-black text-black border-r border-slate-300">
                        {sqFt.toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 font-medium text-slate-800">
                        {d.frameType || 'WPC Solid Frame'}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-black border-r border-slate-300 whitespace-nowrap">
                        {d.hingeSide || 'RH'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 text-slate-800 font-medium">
                        {d.lockType || 'Baby Latch Black'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 font-bold text-black">
                        {d.colour || 'Natural Teak EXGC-510'}
                      </td>
                      {showPricing && (
                        <td className="py-2 px-2.5 text-right font-mono font-semibold border-r border-slate-300 text-slate-700">
                          ₹{unitPrice.toLocaleString('en-IN')}
                        </td>
                      )}
                      {showPricing && (
                        <td className="py-2 px-2.5 text-right font-mono font-black border-r border-slate-300 text-black">
                          ₹{totalLineAmount.toLocaleString('en-IN')}
                        </td>
                      )}
                      <td className="py-2 px-2.5 text-slate-600 text-[10px] italic">
                        {d.remarks || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black bg-slate-100 font-black text-xs">
                  <td colSpan={5} className="py-2 px-3 text-right uppercase border-r border-slate-300">
                    Grand Totals ({totalOpenings} Openings):
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-black border-r border-slate-300">
                    {totalSqFt.toFixed(2)}
                  </td>
                  <td colSpan={showPricing ? 4 : 4} className="py-2 px-3 border-r border-slate-300 text-[11px] text-slate-700">
                    Average Size: {avgSqFt} Sq.Ft / Door
                  </td>
                  {showPricing && (
                    <td className="py-2 px-2.5 text-right font-mono text-black border-r border-slate-300 font-black">
                      ₹{totalEstimatedAmount.toLocaleString('en-IN')}
                    </td>
                  )}
                  <td className="py-2 px-2.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Special Site Notes */}
          {record.notes && (
            <div className="p-2.5 border border-slate-300 rounded bg-slate-50 text-xs">
              <span className="font-bold uppercase text-[10px] text-slate-500 block mb-0.5">
                Site Observations &amp; Installation Instructions:
              </span>
              <p className="font-medium text-slate-800">{record.notes}</p>
            </div>
          )}

          {/* 3-Part Sign-Off Verification Footer (A4 Landscape Bottom Grid) */}
          <div className="pt-2">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Box 1: Field Engineer */}
              <div className="border border-black rounded p-3 h-28 flex flex-col justify-between bg-white">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 block">
                    1. Measured &amp; Verified By:
                  </span>
                  <span className="font-bold text-black text-xs">
                    {record.engineerName || 'Field Measurement Executive'}
                  </span>
                </div>
                <div className="border-t border-slate-400 pt-1 flex justify-between text-[10px] text-slate-600">
                  <span>Signature: ________________</span>
                  <span>Date: {record.date || record.createdAt?.slice(0, 10)}</span>
                </div>
              </div>

              {/* Box 2: Client Verification */}
              <div className="border border-black rounded p-3 h-28 flex flex-col justify-between bg-white">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 block">
                    2. Client / Site In-Charge Verification:
                  </span>
                  <p className="text-[9px] text-slate-600 leading-tight mt-0.5">
                    I confirm that the door opening sizes, handing directions, and lock specifications detailed above have been verified on site.
                  </p>
                </div>
                <div className="border-t border-slate-400 pt-1 flex justify-between text-[10px] text-slate-600">
                  <span>Client Sign: _______________</span>
                  <span>Date: ____________</span>
                </div>
              </div>

              {/* Box 3: Production Plant Queue Approval */}
              <div className="border border-black rounded p-3 h-28 flex flex-col justify-between bg-white">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 block">
                    3. Plant Production Queue Approval:
                  </span>
                  <span className="font-bold text-black text-xs">
                    Production In-Charge / Plant Supervisor
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Approved for Molding Queue &amp; BOQ Allocation</p>
                </div>
                <div className="border-t border-slate-400 pt-1 flex justify-between text-[10px] text-slate-600">
                  <span>Factory Sign: ______________</span>
                  <span>Queue Stamp: _________</span>
                </div>
              </div>
            </div>

            <div className="text-center pt-2 text-[9px] text-slate-400">
              Generated by EXMARK ERP • Enterprise Factory Operating System • {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
