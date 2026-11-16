'use client';

import React, { useState } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  Printer,
  Lock,
  Truck,
  Layers,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { ProductionOrder, ProductionDoorItem } from '@/lib/services/productionService';

interface ProgressiveMoldingSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onOpenStickersForBatch: (doors: ProductionDoorItem[]) => void;
  onOpenLockSlipForBatch: (order: ProductionOrder, doors: ProductionDoorItem[]) => void;
  onOpenChallanForBatch: (order: ProductionOrder, doors: ProductionDoorItem[]) => void;
}

interface ShiftBatch {
  id: string;
  name: string;
  targetDoorsCount: number;
  selectedDoorIndices: number[];
  status: 'PENDING' | 'IN_MOLDING' | 'MOLDED_TRANSFERRED' | 'COMPLETED';
}

export function ProgressiveMoldingSplitModal({
  isOpen,
  onClose,
  order,
  onOpenStickersForBatch,
  onOpenLockSlipForBatch,
  onOpenChallanForBatch,
}: ProgressiveMoldingSplitModalProps) {
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);

  if (!isOpen || !order) return null;

  const doors = order.doors || [];
  const totalDoors = doors.length;

  // Default suggested 3-shift progression (e.g. 20 doors -> Day 1: 6, Day 2: 8, Day 3: 6)
  const defaultBatch1Count = Math.min(6, totalDoors);
  const remainingAfterB1 = Math.max(0, totalDoors - defaultBatch1Count);
  const defaultBatch2Count = Math.min(8, remainingAfterB1);
  const defaultBatch3Count = Math.max(0, remainingAfterB1 - defaultBatch2Count);

  // Setup batches
  const batches: ShiftBatch[] = [
    {
      id: 'batch-1',
      name: 'Shift Heat 1 (Day 1)',
      targetDoorsCount: defaultBatch1Count,
      selectedDoorIndices: Array.from({ length: defaultBatch1Count }, (_, i) => i),
      status: 'MOLDED_TRANSFERRED',
    },
    ...(defaultBatch2Count > 0
      ? [
          {
            id: 'batch-2',
            name: 'Shift Heat 2 (Day 2)',
            targetDoorsCount: defaultBatch2Count,
            selectedDoorIndices: Array.from(
              { length: defaultBatch2Count },
              (_, i) => defaultBatch1Count + i
            ),
            status: 'IN_MOLDING' as const,
          },
        ]
      : []),
    ...(defaultBatch3Count > 0
      ? [
          {
            id: 'batch-3',
            name: 'Shift Heat 3 (Day 3)',
            targetDoorsCount: defaultBatch3Count,
            selectedDoorIndices: Array.from(
              { length: defaultBatch3Count },
              (_, i) => defaultBatch1Count + defaultBatch2Count + i
            ),
            status: 'PENDING' as const,
          },
        ]
      : []),
  ];

  const currentBatch = batches[activeBatchIndex] || batches[0];
  const currentBatchDoors = currentBatch.selectedDoorIndices
    .map((idx) => doors[idx])
    .filter(Boolean);

  // Chemical calculation for current batch (average 7.5kg resin, 0.9kg gel, 150g catalyst per door)
  const batchResinKg = Number((currentBatchDoors.length * 7.5).toFixed(1));
  const batchGelKg = Number((currentBatchDoors.length * 0.9).toFixed(1));
  const batchCatalystGrams = Math.round(currentBatchDoors.length * 150);
  const batchCsmKg = Number((currentBatchDoors.length * 2.8).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[94vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>PROGRESSIVE SPLIT-BATCH MOLDING PLAN</span>
                <span className="px-2 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700 font-mono">
                  {totalDoors} DOORS TOTAL
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Pipelined molding cycle: mold partial batches daily, dispense fresh chemicals &amp; start lock routing immediately
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Order Info & Pot-life Safety Alert */}
          <div className="bg-amber-950/30 border border-amber-600/50 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-300">
                Critical Chemical Pot-Life Safety Rule (20–30 Minute Gelation Window)
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                For a <strong>{totalDoors}-door order</strong>, mixing all chemicals at once causes catastrophic resin solidification and waste.
                Dispense resin and catalyst in shift batches for only today&apos;s scheduled press heats.
                Molded doors from Day 1 can move directly to carpentry lock routing on Day 2 morning while Heat 2 cures!
              </p>
            </div>
          </div>

          {/* Shift Batch Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {batches.map((b, idx) => {
              const isSelected = activeBatchIndex === idx;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBatchIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-white">{b.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {b.targetDoorsCount} Doors
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    {b.status === 'MOLDED_TRANSFERRED' && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Molded • In Lock Prep
                      </span>
                    )}
                    {b.status === 'IN_MOLDING' && (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Today&apos;s Press Heat
                      </span>
                    )}
                    {b.status === 'PENDING' && (
                      <span className="text-slate-400 font-medium">Scheduled Next Shift</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Batch Control Card */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <span>{currentBatch.name} Workspace</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-mono">
                    {currentBatchDoors.length} Doors Active
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Target Door Range: Doors #{currentBatch.selectedDoorIndices[0] + 1} to #
                  {currentBatch.selectedDoorIndices[currentBatch.selectedDoorIndices.length - 1] + 1}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenStickersForBatch(currentBatchDoors)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Print stickers only for this batch (prevents loose stickers lying on dusty floor)"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-400" />
                  <span>Print {currentBatchDoors.length} Stickers</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenLockSlipForBatch(order, currentBatchDoors)}
                  className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Send molded doors to Carpentry station for lock cutout & mortising"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Setting Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenChallanForBatch(order, currentBatchDoors)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Generate partial delivery challan for this completed batch"
                >
                  <Truck className="w-3.5 h-3.5 text-white" />
                  <span>Partial Challan ({currentBatchDoors.length} Doors)</span>
                </button>
              </div>
            </div>

            {/* Daily Chemical Dispense Requisition for Today's Batch */}
            <div className="bg-[#101935] border border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-200 uppercase mb-2">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Store Chemical Requisition (Dispense Today Only for {currentBatchDoors.length} Doors)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Zero Waste Formula</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Resin</span>
                  <strong className="text-amber-300 font-mono text-sm">{batchResinKg} Kg</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Gelcoat</span>
                  <strong className="text-amber-300 font-mono text-sm">{batchGelKg} Kg</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Catalyst (MEKP)</span>
                  <strong className="text-cyan-300 font-mono text-sm">{batchCatalystGrams} gm</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Fiber CSM</span>
                  <strong className="text-slate-200 font-mono text-sm">{batchCsmKg} Kg</strong>
                </div>
              </div>
            </div>

            {/* Doors Included in this Batch */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Door Specifications in This Batch:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {currentBatchDoors.map((door, idx) => {
                  const globalIdx = currentBatch.selectedDoorIndices[idx];
                  return (
                    <div
                      key={door.id || idx}
                      className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-[10px] text-rose-400">
                          #{globalIdx + 1}
                        </span>
                        <strong className="text-white">{door.doorNumber || `Door #${globalIdx + 1}`}</strong>
                        <span className="text-slate-400 text-[11px]">
                          ({((door.finishedHeightMm || 2080) / 10).toFixed(0)} × {((door.finishedWidthMm || 820) / 10).toFixed(0)} cm)
                        </span>
                        {(door as any).roomTag && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {(door as any).roomTag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-300 font-medium">
                          {door.lockType || 'Baby Latch'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${door.handing === 'LH' ? 'bg-blue-950 text-blue-300' : 'bg-purple-950 text-purple-300'}`}>
                          {door.handing || 'RH'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
