'use client';

import React, { useState } from 'react';
import {
  BarChart3,
} from 'lucide-react';
import { SalesChartDataPoint } from '@/types/erp';

interface SalesChartProps {
  data: SalesChartDataPoint[];
}

export default function SalesChart({ data }: SalesChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'6m' | 'fy26' | 'q3'>('6m');
  const [activeBar, setActiveBar] = useState<number | null>(null);

  // Maximum scale value for proportional rendering (e.g., 55 Lakhs)
  const maxScale = 55;

  const totalPeriodRevenue = data.reduce((acc, curr) => acc + curr.totalSalesLakhs, 0);
  const avgMonthly = data.length > 0 ? totalPeriodRevenue / data.length : 0;

  return (
    <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-600/10 text-red-500">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Monthly Sales &amp; Category Mix
          </h2>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
          <button
            onClick={() => setSelectedPeriod('6m')}
            className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
              selectedPeriod === '6m'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            6M
          </button>
          <button
            onClick={() => setSelectedPeriod('fy26')}
            className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
              selectedPeriod === 'fy26'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            FY 26-27
          </button>
          <button
            onClick={() => setSelectedPeriod('q3')}
            className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
              selectedPeriod === 'q3'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Q3
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">6-Mo Revenue</span>
          <span className="font-bold text-slate-900 dark:text-white text-xs">
            ₹{totalPeriodRevenue.toFixed(2)} L
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Monthly Avg</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
            ₹{avgMonthly.toFixed(2)} L/mo
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Top Line</span>
          <span className="font-bold text-red-600 dark:text-red-400 text-xs">
            {data.length > 0 ? 'FRP Series' : 'No Sales Yet'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Coverage</span>
          <span className="font-bold text-slate-900 dark:text-white text-xs">
            {data.length > 0 ? `${data.length} Months` : 'Baseline'}
          </span>
        </div>
      </div>

      {/* Chart Visualization Container */}
      <div className="relative pt-2 pb-1">
        {data.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 p-4">
            <BarChart3 className="w-6 h-6 text-slate-400 mb-1.5 opacity-60" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No monthly sales history recorded yet
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Create quotations and confirm orders to populate live analytics.
            </p>
          </div>
        ) : (
        <>
        {/* Y-axis guidelines */}
        <div className="absolute inset-x-0 top-6 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 pb-0.5">₹50L</div>
          <div className="border-b border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 pb-0.5">₹35L</div>
          <div className="border-b border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 pb-0.5">₹20L</div>
          <div className="border-b border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 pb-0.5">₹0L</div>
        </div>

        {/* Stacked Proportional Bars */}
        <div className="grid grid-cols-6 gap-2 sm:gap-6 items-end h-56 pt-2 z-10 relative">
          {data.map((item, index) => {
            const isHovered = activeBar === index;
            const frpHeight = (item.frpDoors / maxScale) * 100;
            const wpcHeight = (item.wpcDoors / maxScale) * 100;
            const framesHeight = (item.framesAndHybrid / maxScale) * 100;

            return (
              <div
                key={item.month}
                className="flex flex-col items-center group relative h-full justify-end cursor-pointer"
                onMouseEnter={() => setActiveBar(index)}
                onMouseLeave={() => setActiveBar(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-24 z-30 px-3 py-2 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 text-xs whitespace-nowrap animate-in fade-in zoom-in-95">
                    <p className="font-bold text-red-400 text-xs mb-1">{item.month}</p>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-300">FRP Doors:</span>
                        <span className="font-semibold text-white">₹{item.frpDoors}L</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-300">WPC Doors:</span>
                        <span className="font-semibold text-white">₹{item.wpcDoors}L</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-300">Frames & Hybrid:</span>
                        <span className="font-semibold text-white">₹{item.framesAndHybrid}L</span>
                      </div>
                      <div className="pt-1 mt-1 border-t border-slate-800 flex justify-between gap-4 font-bold text-emerald-400">
                        <span>Total:</span>
                        <span>₹{item.totalSalesLakhs} Lakhs</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bar Stack */}
                <div
                  className={`w-full max-w-[42px] flex flex-col justify-end rounded-t-md overflow-hidden transition-all duration-200 ${
                    isHovered ? 'ring-2 ring-red-500 scale-105' : 'hover:opacity-90'
                  }`}
                  style={{ height: `${(item.totalSalesLakhs / maxScale) * 100}%` }}
                >
                  {/* Top segment: Frames & Hybrid */}
                  <div
                    className="w-full bg-amber-500 transition-all"
                    style={{ height: `${(framesHeight / (frpHeight + wpcHeight + framesHeight)) * 100}%` }}
                    title={`Frames & Hybrid: ₹${item.framesAndHybrid}L`}
                  />
                  {/* Middle segment: WPC Doors */}
                  <div
                    className="w-full bg-blue-600 transition-all"
                    style={{ height: `${(wpcHeight / (frpHeight + wpcHeight + framesHeight)) * 100}%` }}
                    title={`WPC Doors: ₹${item.wpcDoors}L`}
                  />
                  {/* Bottom segment: FRP Doors (Brand Red) */}
                  <div
                    className="w-full bg-red-600 transition-all"
                    style={{ height: `${(frpHeight / (frpHeight + wpcHeight + framesHeight)) * 100}%` }}
                    title={`FRP Doors: ₹${item.frpDoors}L`}
                  />
                </div>

                {/* X-Axis Month Label */}
                <span className="mt-2 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate w-full text-center">
                  {item.month.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  ₹{item.totalSalesLakhs}L
                </span>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-red-600" />
            <span className="font-medium text-slate-800 dark:text-slate-200">FRP Molded Doors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-blue-600" />
            <span className="font-medium text-slate-800 dark:text-slate-200">WPC Waterproof Doors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Door Frames & Hybrid</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 italic">
          {data.length > 0 ? 'Live EXMARK ERP ledger figures' : 'Live ledger mode active'}
        </span>
      </div>
    </div>
  );
}
