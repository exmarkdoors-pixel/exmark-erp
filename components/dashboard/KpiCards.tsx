'use client';

import React from 'react';
import {
  IndianRupee,
  FileSpreadsheet,
  Factory,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { KpiMetric } from '@/types/erp';

interface KpiCardsProps {
  metrics: KpiMetric[];
  onCardClick?: (metricId: string) => void;
}

export default function KpiCards({ metrics, onCardClick }: KpiCardsProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'IndianRupee':
        return IndianRupee;
      case 'FileText':
      case 'FileSpreadsheet':
        return FileSpreadsheet;
      case 'Hammer':
      case 'Factory':
        return Factory;
      case 'CreditCard':
        return CreditCard;
      default:
        return TrendingUp;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {metrics.map((metric) => {
        const IconComponent = getIcon(metric.iconName);

        return (
          <div
            key={metric.id}
            onClick={() => onCardClick && onCardClick(metric.id)}
            className="group relative bg-white dark:bg-[#0B132B] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-red-500/50 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            {/* Top decorative micro bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {metric.title}
                  </span>
                  {metric.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {metric.badge}
                    </span>
                  )}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metric.value}
                </div>
              </div>

              {/* Icon Container with subtle gradient */}
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${metric.accentColor} text-white flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            {/* Growth / Change Pill & Subtext */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${
                    metric.isPositive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}
                >
                  {metric.isPositive ? (
                    <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                  )}
                  {metric.change}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                  {metric.period}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
                {metric.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
