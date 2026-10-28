'use client';

import React from 'react';
import {
  Factory,
  Thermometer,
  User,
} from 'lucide-react';
import { ProductionLine } from '@/types/erp';
import { useProductCategories } from '@/lib/context/ProductCategoryContext';

interface ProductionStatusProps {
  lines: ProductionLine[];
  onViewAllProduction?: () => void;
}

export default function ProductionStatus({
  lines,
  onViewAllProduction,
}: ProductionStatusProps) {
  const { isWpcEnabled } = useProductCategories();
  const [factoryDisplayName, setFactoryDisplayName] = React.useState<string>('Central Manufacturing Unit');

  React.useEffect(() => {
    fetch('/api/settings/company-profile?view=active')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.activeFactory?.name) {
          const fac = data.activeFactory;
          setFactoryDisplayName(fac.address?.district ? `${fac.name} (${fac.address.district})` : fac.name);
        }
      })
      .catch(() => {});
  }, []);

  // Requirement: When WPC is OFF, hide WPC production workflows, focus on FRP
  const activeLines = isWpcEnabled
    ? lines
    : lines.filter((l) => !l.id.includes('wpc') && !l.lineName.toLowerCase().includes('wpc'));
  const getStatusBadge = (status: ProductionLine['status']) => {
    switch (status) {
      case 'Operational':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>
        );
      case 'High Load':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            High Load
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Title & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-600/10 text-red-500">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Factory Floor & Production Lines
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {factoryDisplayName}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live capacity utilization across FRP press, WPC extrusion & CNC routing
            </p>
          </div>
        </div>

        {onViewAllProduction && (
          <button
            onClick={onViewAllProduction}
            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Full Factory Monitor &rarr;
          </button>
        )}
      </div>

      {/* Production Lines List */}
      <div className="space-y-3.5">
        {activeLines.map((line) => {
          return (
            <div
              key={line.id}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {line.lineName}
                  </span>
                  {getStatusBadge(line.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {line.currentUnits} / {line.capacityPerDay} Units/day
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {line.utilizationRate}% Load
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-2.5 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    line.utilizationRate >= 90
                      ? 'bg-gradient-to-r from-amber-500 to-red-500'
                      : 'bg-gradient-to-r from-red-600 to-rose-600'
                  }`}
                  style={{ width: `${line.utilizationRate}%` }}
                />
              </div>

              {/* Line Metadata Subtext */}
              <div className="flex flex-wrap items-center justify-between gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {line.doorType}
                  </span>
                  {line.temperatureOrCureTime && (
                    <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <Thermometer className="w-3 h-3 text-amber-500" />
                      {line.temperatureOrCureTime}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {line.shiftSupervisor}
                  </span>
                  <span className="text-slate-400">
                    Batch: <code className="font-mono text-slate-300">{line.batchCode}</code>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
