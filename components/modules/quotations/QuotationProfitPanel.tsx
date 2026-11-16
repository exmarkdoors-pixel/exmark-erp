'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, TrendingUp, AlertTriangle, Calculator } from 'lucide-react';
import { QuotationProfitEstimate } from '@/lib/utils/quotationProfit';

interface QuotationProfitPanelProps {
  estimate: QuotationProfitEstimate;
  minMarginTarget?: number;
}

export function QuotationProfitPanel({
  estimate,
  minMarginTarget = 25,
}: QuotationProfitPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  const isLowMargin =
    estimate.netRevenue > 0 && estimate.estimatedMarginPct < minMarginTarget;
  const isLoss = estimate.estimatedNetProfit < 0;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-[#0f172a] to-[#0b1324] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Advance Quotation Profit Estimator (Internal Only)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-200">
                Admin / Accounts
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Live BOQ Chemicals + Timber + Lock Box + Paint + Piece-Rate Labor (Door Cutting + Frame Cutting + Painting)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
            isVisible
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950'
          }`}
          title="Hide profit figures when client is watching your screen"
        >
          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isVisible ? 'Hide Profit (Customer Mode)' : 'Reveal Est. Profit'}</span>
        </button>
      </div>

      {!isVisible ? (
        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Profit &amp; Margin hidden for Customer Screen-Share Safety.</span>
          <span className="font-mono text-amber-300 font-bold">
            {estimate.totalDoors} Doors • Click &ldquo;Reveal Est. Profit&rdquo; to inspect
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Net Quoted Revenue</span>
              <strong className="font-mono text-sm text-white">
                ₹{estimate.netRevenue.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Est. BOQ + Paint + Lock</span>
              <strong className="font-mono text-sm text-cyan-300">
                ₹{estimate.totalMaterialCost.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Chem ₹{estimate.chemicalAndFoamCost.toLocaleString('en-IN')} • Wood ₹{estimate.timberCost.toLocaleString('en-IN')} • Lock ₹{estimate.lockBoxCost.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Est. Floor Piece-Rate</span>
              <strong className="font-mono text-sm text-indigo-300">
                ₹{estimate.totalLaborCost.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Mold ₹{estimate.moldingLaborCost} • DoorCut ₹{estimate.doorCuttingLaborCost} • FrameCut ₹{estimate.frameCuttingLaborCost} • Paint ₹{estimate.paintingLaborCost}
              </span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isLoss
                  ? 'bg-rose-950/50 border-rose-500/40'
                  : 'bg-emerald-950/40 border-emerald-500/40'
              }`}
            >
              <span className="text-[10px] text-slate-300 block">Estimated Net Profit</span>
              <strong
                className={`font-mono text-base font-black ${
                  isLoss ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {estimate.estimatedNetProfit >= 0 ? '+' : ''}₹
                {estimate.estimatedNetProfit.toLocaleString('en-IN')}
              </strong>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isLowMargin
                  ? 'bg-amber-950/50 border-amber-500/40'
                  : 'bg-emerald-950/40 border-emerald-500/40'
              }`}
            >
              <span className="text-[10px] text-slate-300 block">Gross Margin %</span>
              <strong
                className={`font-mono text-base font-black inline-flex items-center gap-1 ${
                  isLoss ? 'text-rose-400' : isLowMargin ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {isLowMargin ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span>{estimate.estimatedMarginPct}%</span>
              </strong>
              <span className="text-[10px] text-slate-400 block">
                Internal Area: {estimate.totalSqFt} sq.ft
              </span>
            </div>
          </div>

          {estimate.rowEstimates.length > 0 && (
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <th className="p-2">Row / Model</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Quoted Revenue</th>
                    <th className="p-2 text-right">Est. Material + Paint</th>
                    <th className="p-2 text-right">Est. Labor</th>
                    <th className="p-2 text-right">Row Profit</th>
                    <th className="p-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {estimate.rowEstimates.map((r) => (
                    <tr key={r.rowId} className="hover:bg-slate-900/40">
                      <td className="p-2 font-semibold text-slate-200">{r.label}</td>
                      <td className="p-2 text-center font-mono text-slate-300">{r.qty}</td>
                      <td className="p-2 text-right font-mono text-white">₹{r.revenue.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono text-cyan-300">₹{r.materialCost.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono text-indigo-300">₹{r.laborCost.toLocaleString('en-IN')}</td>
                      <td
                        className={`p-2 text-right font-mono font-bold ${
                          r.profit < 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        ₹{r.profit.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-right font-mono text-slate-300">{r.marginPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
