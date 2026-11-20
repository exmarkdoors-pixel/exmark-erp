'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Package,
  Layers,
  DoorOpen,
  Paintbrush,
  CheckCircle2,
  MapPin,
  ChevronRight,
  X,
  AlertCircle,
  Scissors,
} from 'lucide-react';
import type {
  ReadyStockDoor,
  StockMatchResult,
} from '@/lib/services/readyStockDoorService';

interface StockDoorMatchReminderProps {
  targetDoorHeightMm?: number;
  targetDoorWidthMm?: number;
  targetFrameHeightMm?: number;
  targetFrameWidthMm?: number;
  targetColor?: string;
  targetModel?: string;
  toleranceMm?: number;
  onSelectStockItem?: (
    item: ReadyStockDoor,
    allocationMode: 'FULL_SET' | 'DOOR_ONLY' | 'FRAME_ONLY'
  ) => void;
  className?: string;
}

export function StockDoorMatchReminder({
  targetDoorHeightMm,
  targetDoorWidthMm,
  targetFrameHeightMm,
  targetFrameWidthMm,
  targetColor,
  targetModel,
  toleranceMm = 12,
  onSelectStockItem,
  className = '',
}: StockDoorMatchReminderProps) {
  const [matchData, setMatchData] = useState<{
    totalMatches: number;
    fullSetMatches: StockMatchResult[];
    doorOnlyMatches: StockMatchResult[];
    frameOnlyMatches: StockMatchResult[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Debounced match query
  const queryMatches = useCallback(async () => {
    // Only query if valid dimensions exist
    const hasDoorDims = (targetDoorHeightMm || 0) > 1000 && (targetDoorWidthMm || 0) > 400;
    const hasFrameDims = (targetFrameHeightMm || 0) > 1000 && (targetFrameWidthMm || 0) > 400;

    if (!hasDoorDims && !hasFrameDims) {
      setMatchData(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/stock-doors/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDoorHeightMm,
          targetDoorWidthMm,
          targetFrameHeightMm,
          targetFrameWidthMm,
          targetColor,
          targetModel,
          toleranceMm,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMatchData(json.data);
      } else {
        setMatchData(null);
      }
    } catch {
      setMatchData(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    targetDoorHeightMm,
    targetDoorWidthMm,
    targetFrameHeightMm,
    targetFrameWidthMm,
    targetColor,
    targetModel,
    toleranceMm,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      queryMatches();
    }, 350);
    return () => clearTimeout(timer);
  }, [queryMatches]);

  if (!matchData || matchData.totalMatches === 0) {
    return null;
  }

  const { totalMatches, fullSetMatches, doorOnlyMatches, frameOnlyMatches } = matchData;
  const bestMatch = fullSetMatches[0] || doorOnlyMatches[0] || frameOnlyMatches[0];

  return (
    <div className={`relative ${className}`}>
      {/* Reminder Trigger Banner / Pill */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className="w-full text-left p-2 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/60 border border-emerald-500/50 hover:border-emerald-400 text-white shadow-lg transition-all flex items-center justify-between gap-2.5 cursor-pointer group animate-pulse"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                ⚡ {totalMatches} Matching Stock Available
              </span>
              {fullSetMatches.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200">
                  Door + Frame
                </span>
              )}
              {doorOnlyMatches.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 border border-blue-500/40 text-blue-200">
                  Door Only
                </span>
              )}
              {frameOnlyMatches.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 border border-purple-500/40 text-purple-200">
                  Frame Only
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              {bestMatch.door.stockCode}: {bestMatch.door.doorModelName || bestMatch.door.frameTypeName} • {bestMatch.fittingRecommendation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs group-hover:bg-emerald-400 transition">
          <span>View Stock</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </button>

      {/* Slide-over Inspection Drawer / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border-2 border-emerald-500/40 p-5 space-y-4 font-sans text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Available Stock Doors &amp; Frames</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                      {totalMatches} Matches Found
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Target: Door {targetDoorHeightMm || '-'}×{targetDoorWidthMm || '-'} mm
                    {targetFrameHeightMm ? ` • Frame ${targetFrameHeightMm}×${targetFrameWidthMm} mm` : ''}
                    {targetColor ? ` • Color: ${targetColor}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note on Repainting and Planing */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Scissors className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Factory Sizing &amp; Repainting Notice:</strong> Minor dimension differences (1–2mm or up to 10mm width) can easily be planed down on the cutting bench or accommodated in frame rebates. If the current stock color differs, our spray booth can recoat it to the customer&apos;s choice without delaying delivery!
              </div>
            </div>

            {/* Matches List */}
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              {/* Category 1: Full Sets */}
              {fullSetMatches.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Door + Frame Sets ({fullSetMatches.length})</span>
                  </div>
                  {fullSetMatches.map((m) => renderMatchCard(m, 'FULL_SET'))}
                </div>
              )}

              {/* Category 2: Door Only */}
              {doorOnlyMatches.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" />
                    <span>Matching Door Slabs Only ({doorOnlyMatches.length})</span>
                  </div>
                  {doorOnlyMatches.map((m) => renderMatchCard(m, 'DOOR_ONLY'))}
                </div>
              )}

              {/* Category 3: Frame Only */}
              {frameOnlyMatches.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Matching Door Frames Only ({frameOnlyMatches.length})</span>
                  </div>
                  {frameOnlyMatches.map((m) => renderMatchCard(m, 'FRAME_ONLY'))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Allocating ready stock saves ~₹2,800 raw material and 3-4 days molding lead time.</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderMatchCard(
    match: StockMatchResult,
    allocationMode: 'FULL_SET' | 'DOOR_ONLY' | 'FRAME_ONLY'
  ) {
    const item = match.door;
    const isFullSet = allocationMode === 'FULL_SET';
    const isDoor = allocationMode === 'DOOR_ONLY';
    const isFrame = allocationMode === 'FRAME_ONLY';

    return (
      <div
        key={`${item.id}-${allocationMode}`}
        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070D1E] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 shadow-xs space-y-2.5 transition"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                {item.stockCode}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {item.condition.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" />
                {item.rackLocation}
              </span>
            </div>

            <div className="font-bold text-sm text-slate-900 dark:text-white truncate pt-0.5">
              {item.doorModelName || item.frameTypeName}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
              ₹{item.sellingPrice.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Qty: {item.quantity} available
            </div>
          </div>
        </div>

        {/* Specifications & Delta Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Stock Dimensions:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {isFrame
                ? `${item.frameHeightMm} × ${item.frameWidthMm} mm`
                : `${item.doorHeightMm} × ${item.doorWidthMm} mm (Thk: ${item.doorThicknessMm || 32}mm)`}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Fit Analysis:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">
              {match.fittingRecommendation}
            </span>
          </div>

          {/* Color & Repainting */}
          <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5">
            <Paintbrush className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10.5px] text-slate-700 dark:text-slate-300">
              {match.colorNote}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {onSelectStockItem && (
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                onSelectStockItem(item, allocationMode);
                setIsDrawerOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isFullSet
                  ? 'Use Complete Set from Stock'
                  : isDoor
                  ? 'Use Door Slab from Stock (Mold Frame Only)'
                  : 'Use Frame from Stock (Mold Door Only)'}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }
}
