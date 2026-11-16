'use client';

import React from 'react';
import { FlaskConical } from 'lucide-react';
import StoreRequisitionHub from './StoreRequisitionHub';

export default function BomAndRecipeHub() {
  return (
    <div className="space-y-6 text-slate-200">
      {/* Unified Single BOQ Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0E1B3E] to-[#070D1E] border border-emerald-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Auto-BOQ Material Engine &amp; Store Issue
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Single Unified BOQ (80×210 cm Basis)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                ഓട്ടോ BOQ &amp; സ്റ്റോർ ഇഷ്യൂ • Sq.Ft Chemicals (Resin, GEL, MEKP, Cobalt, 300 GSM CSM, Colour Pigments), Cu.Ft Frame/Shutter Wood, 50×100 cm Rigid Foam &amp; Extra Store Issue Items
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Single Unified Store & Auto-BOQ Workbench */}
      <StoreRequisitionHub />
    </div>
  );
}
