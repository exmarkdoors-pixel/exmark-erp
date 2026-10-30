'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Share2,
  Percent,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import { SiteMeasurementRecord } from '@/types/measurements';
import { CatalogMaster } from '@/types/catalog';

interface AutoQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurement: SiteMeasurementRecord;
  catalog?: CatalogMaster | null;
  onQuotationGenerated?: (quoteNumber: string) => void;
}

export function AutoQuotationModal({
  isOpen,
  onClose,
  measurement,
  catalog,
  onQuotationGenerated,
}: AutoQuotationModalProps) {
  const [strategy, setStrategy] = useState<'PER_PIECE' | 'PER_SQFT'>('PER_PIECE');
  const [sqftRateOverride, setSqftRateOverride] = useState<number>(420);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    quoteNumber: string;
    totalAmount: number;
    subtotal: number;
    gstAmount: number;
  } | null>(null);

  if (!isOpen) return null;

  const doors = measurement.doors || [];
  const totalOpenings = doors.reduce((acc, d) => acc + (d.quantity || 1), 0);

  // ── 1. PER PIECE TOTAL ──
  const pieceSubtotal = doors.reduce((acc, d) => {
    const qty = d.quantity || 1;
    const price = d.unitPrice || 7500;
    return acc + price * qty;
  }, 0);

  // ── 2. PER SQ.FT TOTAL ──
  const totalSqFt = doors.reduce((acc, d) => {
    const qty = d.quantity || 1;
    let sqft = d.calculatedSqFt;
    if (!sqft || sqft <= 0) {
      let hl = d.heightLeft || 203.2;
      let wt = d.widthTop || 81.3;
      if (d.measurementUnit === 'INCH') {
        hl = hl * 25.4;
        wt = wt * 25.4;
      } else if (d.measurementUnit === 'CM') {
        hl = hl * 10;
        wt = wt * 10;
      }
      sqft = Number(((hl * wt) / 92903.04).toFixed(2));
    }
    return acc + sqft * qty;
  }, 0);

  const sqftSubtotal = doors.reduce((acc, d) => {
    const qty = d.quantity || 1;
    let sqft = d.calculatedSqFt || 17.78;
    const lock = d.lockPrice || (d.lockType?.includes('+₹') ? parseFloat(d.lockType.split('+₹')[1]) : 200) || 0;
    const adj = d.priceAdjustment || 0;
    const doorRate = Math.round(sqft * sqftRateOverride + lock + adj);
    return acc + doorRate * qty;
  }, 0);

  // Active metrics
  const activeSubtotal = strategy === 'PER_PIECE' ? pieceSubtotal : sqftSubtotal;
  const discountAmount = Math.round((activeSubtotal * discountPercent) / 100);
  const discountedSubtotal = Math.max(0, activeSubtotal - discountAmount);
  const gstAmount = Math.round(discountedSubtotal * 0.18);
  const grandTotal = discountedSubtotal + gstAmount;

  const handleGenerate = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/measurements/${measurement.id || 'new'}/convert-to-quotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurement,
          pricingStrategy: strategy,
          customRatePerSqFt: sqftRateOverride,
          discount: discountAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate quotation.');
      }

      setGeneratedResult({
        quoteNumber: data.data.quotation.quoteNumber,
        totalAmount: data.data.quotation.totalAmount,
        subtotal: data.data.quotation.subtotal,
        gstAmount: data.data.quotation.gstAmount,
      });

      if (onQuotationGenerated) {
        onQuotationGenerated(data.data.quotation.quoteNumber);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#070D1E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* HEADER */}
        <div className="p-4 bg-[#0B132B] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Auto Quotation Generator</h2>
              <p className="text-xs text-slate-400">
                Site Book: <span className="font-mono text-amber-400 font-bold">{measurement.refNumber}</span> &bull; {measurement.siteName} ({measurement.district})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR */}
        {errorMsg && (
          <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SUCCESS NOTIFICATION */}
        {generatedResult ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Quotation Generated Successfully!</h3>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {generatedResult.quoteNumber}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Applied Strategy: <strong className="text-amber-400">{strategy === 'PER_PIECE' ? 'Per Piece Rate' : 'Square Feet Rate'}</strong> &bull; Total Openings: {totalOpenings} Doors
              </p>
            </div>

            <div className="bg-[#0B132B] p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Excl. Tax):</span>
                <span className="font-mono text-white">₹{generatedResult.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18% HSN 3925):</span>
                <span className="font-mono text-cyan-400">+₹{generatedResult.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-800 text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-400">₹{generatedResult.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => alert(`Transmitting ${generatedResult.quoteNumber} PDF via official WhatsApp...`)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Send WhatsApp PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {/* PRICING ENGINE SELECTOR */}
            <div>
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                1. Select Quotation Pricing Engine:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStrategy('PER_PIECE')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    strategy === 'PER_PIECE'
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                      : 'bg-[#0B132B] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black flex items-center justify-between">
                    <span className={strategy === 'PER_PIECE' ? 'text-amber-400' : 'text-slate-300'}>
                      Per Piece Rate
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Standard
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Uses fixed base rate per door unit + lock surcharge & price adjustments.
                  </div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-2">
                    ₹{pieceSubtotal.toLocaleString('en-IN')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy('PER_SQFT')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    strategy === 'PER_SQFT'
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-md'
                      : 'bg-[#0B132B] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black flex items-center justify-between">
                    <span className={strategy === 'PER_SQFT' ? 'text-cyan-400' : 'text-slate-300'}>
                      Square Feet Rate
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      Masonry Area
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Multiplies door area (Sq.Ft) by rate/sq.ft + lock hardware preps.
                  </div>
                  <div className="text-sm font-black text-cyan-400 font-mono mt-2">
                    ₹{sqftSubtotal.toLocaleString('en-IN')}
                  </div>
                </button>
              </div>
            </div>

            {/* SQ.FT RATE CONTROLS (Only visible in PER_SQFT mode) */}
            {strategy === 'PER_SQFT' && (
              <div className="bg-[#0B132B] p-3 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Custom Rate Per Sq.Ft (₹/sqft):</span>
                  <div className="flex items-center gap-2">
                    {[380, 420, 460, 500].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setSqftRateOverride(rate)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          sqftRateOverride === rate
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ₹{rate}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sqftRateOverride}
                    onChange={(e) => setSqftRateOverride(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-[#070D1E] text-cyan-400 font-mono font-bold text-sm rounded-lg border border-slate-700"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    Total: {totalSqFt.toFixed(2)} Sq.Ft
                  </span>
                </div>
              </div>
            )}

            {/* DISCOUNT & TAX SUMMARY */}
            <div className="bg-[#0B132B] p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Commercial Discount:</span>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        discountPercent === pct
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Openings Amount ({totalOpenings} Doors &bull; {totalSqFt.toFixed(2)} Sq.Ft):</span>
                  <span className="font-mono text-white">₹{activeSubtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GST 18% (CGST 9% + SGST 9%):</span>
                  </span>
                  <span className="font-mono text-cyan-400">+₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-800 text-white">
                  <span>Estimated Net Quotation:</span>
                  <span className="font-mono text-emerald-400 text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        {!generatedResult && (
          <div className="p-3 bg-[#0B132B] border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isSubmitting || doors.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-950/50 transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
            >
              <span>Generate Official Quotation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoQuotationModal;
