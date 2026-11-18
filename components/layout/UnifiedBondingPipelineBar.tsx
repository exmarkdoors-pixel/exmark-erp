'use client';

import React, { useState, useEffect } from 'react';
import { NavigationTab } from '@/types/erp';
import {
  FileSpreadsheet,
  ShoppingBag,
  Factory,
  ShieldCheck,
  Palette,
  Truck,
  Wrench,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface UnifiedBondingPipelineBarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  isSimpleMode?: boolean;
}

interface PipelineStep {
  id: NavigationTab;
  stepNumber: number;
  labelEn: string;
  labelMl: string;
  icon: React.ElementType;
  colorClass: string;
  activeBg: string;
  badge: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'quotations',
    stepNumber: 1,
    labelEn: 'Quotation',
    labelMl: 'കൊട്ടേഷൻ',
    icon: FileSpreadsheet,
    colorClass: 'text-blue-400',
    activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-blue-500',
    badge: 'Estimates',
  },
  {
    id: 'sales-orders',
    stepNumber: 2,
    labelEn: 'Order Lock',
    labelMl: 'അഡ്വാൻസ് & സ്റ്റിക്കർ',
    icon: ShoppingBag,
    colorClass: 'text-rose-400',
    activeBg: 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 border-rose-500',
    badge: 'Advance + 12L',
  },
  {
    id: 'production',
    stepNumber: 3,
    labelEn: 'Door Molding',
    labelMl: 'മോൾഡിംഗ് & പ്രസ്സ്',
    icon: Factory,
    colorClass: 'text-purple-400',
    activeBg: 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 border-purple-500',
    badge: 'Stage BOQ',
  },
  {
    id: 'batch-print',
    stepNumber: 4,
    labelEn: '12L & 4"×2" Stickers',
    labelMl: 'സ്റ്റിക്കർ പ്രിൻ്റ്',
    icon: ShieldCheck,
    colorClass: 'text-teal-400',
    activeBg: 'bg-teal-600 text-white shadow-lg shadow-teal-900/40 border-teal-500',
    badge: 'Tolerances',
  },
  {
    id: 'bom',
    stepNumber: 5,
    labelEn: 'Paint Section',
    labelMl: 'പെയിന്റിംഗ് സെക്ഷൻ',
    icon: Palette,
    colorClass: 'text-amber-400',
    activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border-amber-500',
    badge: 'Paint BOQ',
  },
  {
    id: 'dispatch',
    stepNumber: 6,
    labelEn: 'Packing & Delivery',
    labelMl: 'ഡെലിവറി ചലാൻ',
    icon: Truck,
    colorClass: 'text-emerald-400',
    activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border-emerald-500',
    badge: 'Challan / Pass',
  },
  {
    id: 'installation',
    stepNumber: 7,
    labelEn: 'Site Fitting',
    labelMl: 'സൈറ്റ് ഫിറ്റിംഗ്',
    icon: Wrench,
    colorClass: 'text-cyan-400',
    activeBg: 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 border-cyan-500',
    badge: '₹400/door',
  },
];

export default function UnifiedBondingPipelineBar({
  currentTab,
  onNavigate,
  isSimpleMode = true,
}: UnifiedBondingPipelineBarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isSimpleMode);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('exmark_pipeline_collapsed');
      if (saved === 'true') setIsCollapsed(true);
      else if (saved === 'false') setIsCollapsed(false);
      else setIsCollapsed(isSimpleMode);
    } catch {
      setIsCollapsed(isSimpleMode);
    }
  }, [isSimpleMode]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('exmark_pipeline_collapsed', String(next));
    } catch {
      // Ignore storage errors
    }
  };

  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentTab);

  // Slim Breadcrumb Flow Bar (Compact / Default in Simple Mode)
  if (isCollapsed) {
    return (
      <div className="bg-[#0B132B]/80 border border-slate-800/80 rounded-xl px-3 py-1.5 print:hidden flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1.5 shrink-0 hidden sm:inline">
            Workflow:
          </span>
          {PIPELINE_STEPS.map((step, idx) => {
            const isActive = currentTab === step.id;
            const isPassed = currentStepIndex > idx;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(step.id)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-red-600/20 text-red-300 border border-red-500/40 font-bold'
                      : isPassed
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={`${step.stepNumber}. ${step.labelEn} (${step.labelMl})`}
                >
                  {step.stepNumber}. {step.labelEn}
                </button>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 flex items-center gap-1 shrink-0 transition cursor-pointer"
          title="Expand full pipeline bar"
        >
          <span className="hidden sm:inline">Expand Flow</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-3 shadow-xl print:hidden transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left branding title */}
        <div className="flex items-center justify-between lg:justify-start gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-700 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-950/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-xs tracking-wider uppercase">
                  EXMARK Production Pipeline
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Quotation → Order Lock → Molding → 12L Stickers → Paint → Dispatch → Fitting
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className="lg:hidden px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Slim</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>

        {/* Step Progression Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {PIPELINE_STEPS.map((step, idx) => {
            const isActive = currentTab === step.id;
            const isPassed = currentStepIndex > idx;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(step.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? `${step.activeBg} font-bold scale-[1.02]`
                      : isPassed
                      ? 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                      : 'bg-slate-900/50 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-300 hover:bg-slate-800/60'
                  }`}
                  title={`${step.stepNumber}. ${step.labelEn} (${step.labelMl})`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isPassed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : step.colorClass}`} />
                  </div>

                  <div className="text-left">
                    <div className="leading-tight text-[11px] font-bold flex items-center gap-1">
                      <span>{step.labelEn}</span>
                      <span className="text-[9px] opacity-75 font-normal hidden xl:inline">
                        ({step.labelMl})
                      </span>
                    </div>
                  </div>
                </button>

                {idx < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight
                    className={`w-3 h-3 shrink-0 hidden sm:inline ${
                      isPassed ? 'text-emerald-500' : 'text-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}

          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex ml-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 items-center gap-1 shrink-0 transition cursor-pointer"
            title="Minimize to slim workflow breadcrumb"
          >
            <span>Slim</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
