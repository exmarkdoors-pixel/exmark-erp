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
  const avgMonthly = totalPeriodRevenue / data.length;

  return (
    <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-600/10 text-red-500">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Sales & Category Mix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revenue in ₹ Lakhs (FRP Doors vs WPC Doors & Frames)
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setSelectedPeriod('6m')}
            className={`px-3 py-1 rounded-md transition-colors ${
              selectedPeriod === '6m'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 6 Months
          </button>
          <button
            onClick={() => setSelectedPeriod('fy26')}
            className={`px-3 py-1 rounded-md transition-colors ${
              selectedPeriod === 'fy26'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            FY 2026-27
          </button>
          <button
            onClick={() => setSelectedPeriod('q3')}
            className={`px-3 py-1 rounded-md transition-colors ${
              selectedPeriod === 'q3'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Current Q3
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total 6-Mo Revenue</span>
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            ₹{totalPeriodRevenue.toFixed(2)} Lakhs
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Monthly Average</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            ₹{avgMonthly.toFixed(2)} L/mo
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Top Product Line</span>
          <span className="font-bold text-red-600 dark:text-red-400 text-sm">
            FRP Teak Series (50.5%)
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Leading Territory</span>
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            Malabar & Ernakulam
          </span>
        </div>
      </div>

      {/* Chart Visualization Container */}
      <div className="relative pt-6 pb-2">
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
          *Kerala Monsoon Peak July: ₹48.4L volume
        </span>
      </div>
    </div>
  );
}
