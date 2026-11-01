'use client';

import React from 'react';
import { NavigationTab } from '@/types/erp';
import {
  FileSpreadsheet,
  Ruler,
  ShoppingBag,
  FlaskConical,
  Factory,
  ReceiptIndianRupee,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface UnifiedBondingPipelineBarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
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
    id: 'measurements',
    stepNumber: 2,
    labelEn: 'Measurement Book',
    labelMl: 'അളവ് പുസ്തകം',
    icon: Ruler,
    colorClass: 'text-amber-400',
    activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border-amber-500',
    badge: 'Tape Sync',
  },
  {
    id: 'sales-orders',
    stepNumber: 3,
    labelEn: 'Sales Order',
    labelMl: 'സെയിൽസ് ഓർഡർ',
    icon: ShoppingBag,
    colorClass: 'text-rose-400',
    activeBg: 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 border-rose-500',
    badge: '40% Adv Lock',
  },
  {
    id: 'bom',
    stepNumber: 4,
    labelEn: 'BOM & Store',
    labelMl: 'മെറ്റീരിയൽ ഇഷ്യൂ',
    icon: FlaskConical,
    colorClass: 'text-emerald-400',
    activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border-emerald-500',
    badge: 'Store Slip',
  },
  {
    id: 'production',
    stepNumber: 5,
    labelEn: 'Plant Press',
    labelMl: 'ഹൈഡ്രോളിക് പ്രസ്സ്',
    icon: Factory,
    colorClass: 'text-purple-400',
    activeBg: 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 border-purple-500',
    badge: 'QC / Sizing',
  },
  {
    id: 'sales',
    stepNumber: 6,
    labelEn: 'Tax Invoice & Bill',
    labelMl: 'ജി.എസ്.ടി ബിൽ',
    icon: ReceiptIndianRupee,
    colorClass: 'text-cyan-400',
    activeBg: 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 border-cyan-500',
    badge: 'GST 18%',
  },
];

export default function UnifiedBondingPipelineBar({
  currentTab,
  onNavigate,
}: UnifiedBondingPipelineBarProps) {
  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentTab);

  return (
    <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-3 shadow-xl print:hidden transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left branding title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-700 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-950/50">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-xs tracking-wider uppercase">
                EXMARK Factory Bonding Pipeline
              </span>
              <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.2 rounded-full font-bold">
                End-to-End
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Quotation $\rightarrow$ Measurement $\rightarrow$ Sales Order $\rightarrow$ BOM Store Slip $\rightarrow$ Plant Press $\rightarrow$ GST Tax Invoice
            </p>
          </div>
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

                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                      isActive
                        ? 'bg-black/25 text-white'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                    }`}
                  >
                    {step.badge}
                  </span>
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
        </div>
      </div>
    </div>
  );
}
