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
  isSimpleMode?: boolean;
}

export default function KpiCards({ metrics, onCardClick, isSimpleMode = true }: KpiCardsProps) {
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {metrics.map((metric) => {
        const IconComponent = getIcon(metric.iconName);

        return (
          <div
            key={metric.id}
            onClick={() => onCardClick && onCardClick(metric.id)}
            className="group relative bg-white dark:bg-[#0B132B] rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-red-500/50 transition-all duration-150 cursor-pointer overflow-hidden"
          >
            {/* Top decorative micro bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {metric.title}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5">
                  {metric.value}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] truncate">
                  {isSimpleMode ? (
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                      {metric.change} · {metric.period}
                    </span>
                  ) : (
                    <>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                          metric.isPositive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {metric.isPositive ? (
                          <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5 stroke-[2.5]" />
                        )}
                        {metric.change}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] truncate">
                        {metric.period}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Compact Icon Container */}
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${metric.accentColor} text-white flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
