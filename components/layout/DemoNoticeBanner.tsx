'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles } from 'lucide-react';

export default function DemoNoticeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <aside aria-label="Demo notice banner" className="bg-slate-900 border-b border-slate-800 text-slate-200 text-xs py-2 px-4 shadow-sm relative transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-600/90 text-white uppercase tracking-wider shadow-sm animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            Demo Mode Active
          </span>
          <span className="text-slate-300 font-medium">
            All door manufacturing orders, client contacts, production metrics, and financial figures are <strong className="text-white font-semibold">strictly fictional demo data</strong> for demonstration purposes.
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-slate-400 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Kerala FRP & WPC Door Manufacturing Profile
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[11px] text-slate-400">
            GSTIN: 32AABCE9821K1ZN (Demo)
          </span>
          <button
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss banner"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            title="Dismiss demo banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
