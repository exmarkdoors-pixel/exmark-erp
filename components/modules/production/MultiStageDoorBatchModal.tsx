'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  Printer,
  Layers,
  ArrowRight,
  RotateCcw,
  Scissors,
  Palette,
  Package,
  Truck,
  CheckSquare,
  Square,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  ProductionOrder,
  ProductionDoorItem,
  ProductionStage,
} from '@/lib/services/productionService';
import { STAGE_DISPLAY_LABELS } from '@/lib/utils/productionStages';
import type { Contractor, ContractorOperationType } from '@/lib/services/contractorService';

interface MultiStageDoorBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onOrderUpdated?: (order: ProductionOrder) => void;
  onOpenStickersForBatch?: (doors: ProductionDoorItem[]) => void;
}

const STAGE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string; defaultOp?: ContractorOperationType }
> = {
  QUEUED: {
    label: 'Queued',
    icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    color: 'text-slate-300',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
  },
  MOLDING: {
    label: 'Molding Floor',
    icon: <Flame className="w-3.5 h-3.5 text-amber-400" />,
    color: 'text-amber-300',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
    defaultOp: 'MOLDING_DOOR_WITH_FRAME',
  },
  CUTTING_FINISHING: {
    label: 'Cutting & Sizing',
    icon: <Scissors className="w-3.5 h-3.5 text-cyan-400" />,
    color: 'text-cyan-300',
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/40',
    defaultOp: 'DOOR_CUTTING',
  },
  PAINT_SECTION: {
    label: 'PU Painting & Grains',
    icon: <Palette className="w-3.5 h-3.5 text-purple-400" />,
    color: 'text-purple-300',
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/40',
    defaultOp: 'DOOR_GRAINS_WITH_PAINT',
  },
  PACKING: {
    label: 'Packing',
    icon: <Package className="w-3.5 h-3.5 text-blue-400" />,
    color: 'text-blue-300',
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/40',
  },
  DELIVERY: {
    label: 'Ready / Delivery',
    icon: <Truck className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/40',
  },
  COMPLETED: {
    label: 'Completed',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />,
    color: 'text-teal-300',
    bg: 'bg-teal-950/60',
    border: 'border-teal-500/40',
  },
};

export function MultiStageDoorBatchModal({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
  onOpenStickersForBatch,
}: MultiStageDoorBatchModalProps) {
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder | null>(order);
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);
  const [targetStage, setTargetStage] = useState<ProductionStage>('MOLDING');
  const [gangs, setGangs] = useState<Contractor[]>([]);
  const [selectedGangId, setSelectedGangId] = useState<string>('');
  const [customPieceRate, setCustomPieceRate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setCurrentOrder(order);
    if (order?.doors) {
      // Default selection: select all doors currently at the lowest incomplete stage
      const doors = order.doors;
      const queued = doors.filter((d) => (d.stage || order.status) === 'QUEUED');
      if (queued.length > 0) {
        setSelectedDoorIds(queued.slice(0, 4).map((d) => d.id || d.doorId));
        setTargetStage('MOLDING');
      } else {
        const molding = doors.filter((d) => (d.stage || order.status) === 'MOLDING');
        if (molding.length > 0) {
          setSelectedDoorIds(molding.slice(0, 4).map((d) => d.id || d.doorId));
          setTargetStage('CUTTING_FINISHING');
        } else {
          setSelectedDoorIds(doors.slice(0, 4).map((d) => d.id || d.doorId));
        }
      }
    }
  }, [order, isOpen]);

  // Load contractor gangs
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/contractors')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setGangs(json.data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Update contractor recommendation when targetStage changes
  useEffect(() => {
    if (gangs.length === 0) return;
    let match: Contractor | undefined;
    if (targetStage === 'MOLDING') {
      match = gangs.find((g) => g.trade === 'MOLDING' || g.primaryStage === 'MOLDING');
    } else if (targetStage === 'CUTTING_FINISHING') {
      match = gangs.find((g) => g.trade === 'CUTTING_GRINDING' || g.primaryStage === 'CUTTING_FINISHING');
    } else if (targetStage === 'PAINT_SECTION') {
      match = gangs.find((g) => g.trade === 'PAINTING' || g.primaryStage === 'PAINT_SECTION');
    }
    if (match) {
      setSelectedGangId(match.id);
    }
  }, [targetStage, gangs]);

  if (!isOpen || !currentOrder) return null;

  const doors = currentOrder.doors || [];
  const totalDoors = doors.length;

  // Breakdown counts
  const stageCounts: Record<string, number> = {};
  doors.forEach((d) => {
    const st = d.stage || currentOrder.status || 'QUEUED';
    stageCounts[st] = (stageCounts[st] || 0) + 1;
  });

  const selectedDoors = doors.filter((d) => selectedDoorIds.includes(d.id || d.doorId));

  const toggleSelectDoor = (id: string) => {
    setSelectedDoorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectPreset = (mode: 'ALL' | 'FIRST_4' | 'FIRST_6' | 'QUEUED' | 'MOLDING' | 'CUTTING' | 'CLEAR') => {
    if (mode === 'CLEAR') {
      setSelectedDoorIds([]);
      return;
    }
    if (mode === 'ALL') {
      setSelectedDoorIds(doors.map((d) => d.id || d.doorId));
      return;
    }
    if (mode === 'FIRST_4') {
      setSelectedDoorIds(doors.slice(0, 4).map((d) => d.id || d.doorId));
      return;
    }
    if (mode === 'FIRST_6') {
      setSelectedDoorIds(doors.slice(0, 6).map((d) => d.id || d.doorId));
      return;
    }
    if (mode === 'QUEUED') {
      setSelectedDoorIds(
        doors.filter((d) => (d.stage || currentOrder.status) === 'QUEUED').map((d) => d.id || d.doorId)
      );
      return;
    }
    if (mode === 'MOLDING') {
      setSelectedDoorIds(
        doors.filter((d) => (d.stage || currentOrder.status) === 'MOLDING').map((d) => d.id || d.doorId)
      );
      return;
    }
    if (mode === 'CUTTING') {
      setSelectedDoorIds(
        doors.filter((d) => (d.stage || currentOrder.status) === 'CUTTING_FINISHING').map((d) => d.id || d.doorId)
      );
      return;
    }
  };

  const handleApplyStageChange = async () => {
    if (selectedDoorIds.length === 0) {
      setStatusMsg({ text: 'Please select at least 1 door to transition.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const selectedGang = gangs.find((g) => g.id === selectedGangId);
    const operation = STAGE_CONFIG[targetStage]?.defaultOp;

    try {
      const res = await fetch(`/api/production/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DOOR_STAGES',
          doorIds: selectedDoorIds,
          targetStage,
          gangId: selectedGang?.id || undefined,
          gangName: selectedGang?.name || undefined,
          operation,
          customRate: customPieceRate ? parseFloat(customPieceRate) : undefined,
          notes: `Batch transition of ${selectedDoorIds.length} doors to ${targetStage}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update door stages.');
      }

      setCurrentOrder(json.data);
      if (onOrderUpdated) onOrderUpdated(json.data);

      setStatusMsg({
        text: `✓ Moved ${selectedDoorIds.length} doors to ${STAGE_DISPLAY_LABELS[targetStage]}!${
          json.creditedCount ? ` (${json.creditedCount} piece-rate credited).` : ''
        }`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error updating doors.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[94vh] bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">DOOR-BY-DOOR FACTORY STAGE CONTROLLER</h2>
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono font-bold">
                  {currentOrder.jobCardNumber}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {totalDoors} DOORS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Party: <strong className="text-white">{currentOrder.customerName}</strong> ({currentOrder.siteName}) • Move flexible door subsets (e.g. 4 today, 6 tomorrow) through factory stages
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

        {/* Live Stage Distribution Pills Bar */}
        <div className="px-5 py-2.5 bg-[#091024] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400">Current Distribution:</span>
            {Object.entries(STAGE_CONFIG).map(([stKey, cfg]) => {
              const count = stageCounts[stKey] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={stKey}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}
                >
                  {cfg.icon}
                  <span>{cfg.label}:</span>
                  <strong className="font-mono">{count}</strong>
                </div>
              );
            })}
          </div>

          {selectedDoors.length > 0 && onOpenStickersForBatch && (
            <button
              type="button"
              onClick={() => onOpenStickersForBatch(selectedDoors)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Stickers for Selected ({selectedDoors.length})</span>
            </button>
          )}
        </div>

        {/* Selection Preset Buttons */}
        <div className="px-5 py-2 bg-[#060B18] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">Select:</span>
            <button
              type="button"
              onClick={() => selectPreset('FIRST_4')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold cursor-pointer"
            >
              Today's 4 Doors
            </button>
            <button
              type="button"
              onClick={() => selectPreset('FIRST_6')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold cursor-pointer"
            >
              Today's 6 Doors
            </button>
            <button
              type="button"
              onClick={() => selectPreset('QUEUED')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold cursor-pointer"
            >
              All Queued ({stageCounts['QUEUED'] || 0})
            </button>
            <button
              type="button"
              onClick={() => selectPreset('MOLDING')}
              className="px-2 py-0.5 rounded bg-amber-950/40 hover:bg-amber-950/60 text-amber-300 border border-amber-800/50 font-semibold cursor-pointer"
            >
              All Molding ({stageCounts['MOLDING'] || 0})
            </button>
            <button
              type="button"
              onClick={() => selectPreset('CUTTING')}
              className="px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-semibold cursor-pointer"
            >
              All Cutting ({stageCounts['CUTTING_FINISHING'] || 0})
            </button>
            <button
              type="button"
              onClick={() => selectPreset('ALL')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold cursor-pointer"
            >
              Select All ({totalDoors})
            </button>
            <button
              type="button"
              onClick={() => selectPreset('CLEAR')}
              className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>

          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {selectedDoorIds.length} of {totalDoors} Doors Selected
          </span>
        </div>

        {/* Door Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {statusMsg && (
            <div
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              }`}
            >
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0A1224]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0B152B] border-b border-slate-800 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                  <th className="p-2.5 w-10 text-center">Sel</th>
                  <th className="p-2.5 w-12">#</th>
                  <th className="p-2.5">Door &amp; Model</th>
                  <th className="p-2.5">Frame &amp; Cut Size</th>
                  <th className="p-2.5">Current Stage</th>
                  <th className="p-2.5">Contractor / Gang</th>
                  <th className="p-2.5">Material Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {doors.map((door, idx) => {
                  const doorKey = door.id || door.doorId;
                  const isSelected = selectedDoorIds.includes(doorKey);
                  const curStage = door.stage || currentOrder.status || 'QUEUED';
                  const stageCfg = STAGE_CONFIG[curStage] || STAGE_CONFIG['QUEUED'];
                  const isTapered = Math.abs((door.rawWidthTopCm || 0) - (door.rawWidthBtmCm || door.rawWidthTopCm || 0)) > 0.05;

                  return (
                    <tr
                      key={doorKey}
                      onClick={() => toggleSelectDoor(doorKey)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-cyan-950/30 hover:bg-cyan-950/45' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Controlled by row click
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{door.doorNumber || `D-${idx + 1}`}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">({door.doorId})</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{door.model}</div>
                      </td>
                      <td className="p-2.5 font-mono">
                        <div className="text-[11px] text-slate-200">
                          {door.rawHeightCm} × {isTapered ? `T:${door.rawWidthTopCm} / B:${door.rawWidthBtmCm}` : door.rawWidthTopCm} cm
                        </div>
                        {isTapered && (
                          <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                            ▲ TAPER
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${stageCfg.bg} ${stageCfg.border} ${stageCfg.color}`}
                        >
                          {stageCfg.icon}
                          <span>{stageCfg.label}</span>
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300 text-[11px]">
                        {door.moldedByGangName ? (
                          <div className="flex items-center gap-1 text-amber-300">
                            <Users className="w-3 h-3 text-amber-400" />
                            <span>{door.moldedByGangName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {door.materialIssued ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                            ✓ Chemicals Issued
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            Pending Issue
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="p-4 bg-[#0B132B] border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Target Stage */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Target Production Stage
              </label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value as ProductionStage)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white text-xs focus:border-cyan-400 cursor-pointer"
              >
                <option value="QUEUED">⏳ Return to Queued (Reset)</option>
                <option value="MOLDING">🔥 Move to Molding Floor</option>
                <option value="CUTTING_FINISHING">✂️ Move to Cutting &amp; Sizing</option>
                <option value="PAINT_SECTION">🎨 Move to PU Painting &amp; Grains</option>
                <option value="PACKING">📦 Move to Packing</option>
                <option value="DELIVERY">🚚 Move to Ready for Delivery</option>
                <option value="COMPLETED">✓ Mark Completed</option>
              </select>
            </div>

            {/* Contractor Gang Assignment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Assign Contractor Gang (Optional)
              </label>
              <select
                value={selectedGangId}
                onChange={(e) => setSelectedGangId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-cyan-400 cursor-pointer"
              >
                <option value="">-- No contractor gang assignment --</option>
                {gangs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.tradeLabel || g.trade})
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleApplyStageChange}
                disabled={isSubmitting || selectedDoorIds.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Updating Doors...'
                    : `Apply: Move ${selectedDoorIds.length} Doors to ${STAGE_CONFIG[targetStage]?.label || targetStage}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
