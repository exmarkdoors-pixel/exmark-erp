'use client';

import React, { useState, useEffect } from 'react';
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
  Undo2,
  UserCheck,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import type { ProductionOrder, ProductionDoorItem } from '@/lib/services/productionService';
import type { Contractor } from '@/lib/services/contractorService';

interface ProgressiveMoldingSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onOpenStickersForBatch: (doors: ProductionDoorItem[]) => void;
  onOpenLockSlipForBatch: (order: ProductionOrder, doors: ProductionDoorItem[]) => void;
  onOpenChallanForBatch: (order: ProductionOrder, doors: ProductionDoorItem[]) => void;
  onOrderUpdated?: (order: ProductionOrder) => void;
}

export function ProgressiveMoldingSplitModal({
  isOpen,
  onClose,
  order,
  onOpenStickersForBatch,
  onOpenLockSlipForBatch,
  onOpenChallanForBatch,
  onOrderUpdated,
}: ProgressiveMoldingSplitModalProps) {
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder | null>(order);
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);
  const [gangs, setGangs] = useState<Contractor[]>([]);
  const [selectedGangId, setSelectedGangId] = useState<string>('');
  const [doorMolder, setDoorMolder] = useState<string>('');
  const [frameMolder, setFrameMolder] = useState<string>('');
  const [moldingShift, setMoldingShift] = useState<'SHIFT_1' | 'SHIFT_2' | 'NIGHT_SHIFT' | 'GENERAL'>('SHIFT_1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync with order prop
  useEffect(() => {
    setCurrentOrder(order);
    if (order && Array.isArray(order.doors)) {
      // By default select pending doors (up to 6 for the first shift heat)
      const pendingDoorIds = order.doors
        .filter((d) => !d.moldedByGangId)
        .slice(0, 6)
        .map((d) => d.id || d.doorId);
      setSelectedDoorIds(pendingDoorIds);
    }
  }, [order, isOpen]);

  // Fetch molding gang teams
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/contractors?trade=MOLDING')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setGangs(json.data);
          if (json.data.length > 0 && !selectedGangId) {
            setSelectedGangId(json.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Pre-fill Door Molder & Frame Molder from gang roster
  useEffect(() => {
    const curGang = gangs.find((g) => g.id === selectedGangId);
    if (curGang) {
      const members = curGang.memberNames || [];
      if (members.length > 0) {
        setDoorMolder(members[0]);
        setFrameMolder(members[1] || members[0]);
      } else {
        setDoorMolder(curGang.gangLeader || curGang.name);
        setFrameMolder(curGang.gangLeader || curGang.name);
      }
    }
  }, [selectedGangId, gangs]);

  if (!isOpen || !currentOrder) return null;

  const doors = currentOrder.doors || [];
  const totalDoors = doors.length;

  const selectedDoors = doors.filter((d) =>
    selectedDoorIds.includes(d.id || d.doorId)
  );

  // Quick Preset Selection Handlers
  const selectCount = (count: number) => {
    const pendingDoors = doors.filter((d) => !d.moldedByGangId);
    const targetDoors = pendingDoors.length > 0 ? pendingDoors : doors;
    const ids = targetDoors.slice(0, count).map((d) => d.id || d.doorId);
    setSelectedDoorIds(ids);
  };

  const selectAll = () => {
    setSelectedDoorIds(doors.map((d) => d.id || d.doorId));
  };

  const clearSelection = () => {
    setSelectedDoorIds([]);
  };

  const toggleDoorSelection = (doorId: string) => {
    setSelectedDoorIds((prev) =>
      prev.includes(doorId) ? prev.filter((id) => id !== doorId) : [...prev, doorId]
    );
  };

  // Zero-Waste Chemical Formula (average 7.5kg resin, 0.9kg gel, 150g catalyst, 2.8kg CSM per door)
  const batchResinKg = Number((selectedDoors.length * 7.5).toFixed(1));
  const batchGelKg = Number((selectedDoors.length * 0.9).toFixed(1));
  const batchCatalystGrams = Math.round(selectedDoors.length * 150);
  const batchCsmKg = Number((selectedDoors.length * 2.8).toFixed(1));

  const selectedGang = gangs.find((g) => g.id === selectedGangId);
  const unitRate = 500; // Standard molding rate per door with frame
  const totalContractLabor = selectedDoors.length * unitRate;

  // 1. Assign to Molding Gang & Credit Piece-Rate
  const handleAssignToGang = async () => {
    if (selectedDoors.length === 0) {
      setStatusMessage({ text: 'Please select at least 1 door to assign.', type: 'error' });
      return;
    }
    if (!selectedGang) {
      setStatusMessage({ text: 'Please select a Molding Gang contractor.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const doorAssignments = selectedDoors.map((d) => {
        const isOnlyDoor = d.frameTypeName?.toLowerCase().includes('only door') || d.frameTypeId === 'NONE';
        return {
          doorId: d.id || d.doorId,
          gangId: selectedGang.id,
          gangName: selectedGang.name,
          doorMolderName: (doorMolder || selectedGang.name).trim(),
          frameMolderName: isOnlyDoor ? 'N/A (Only Door)' : (frameMolder || selectedGang.name).trim(),
          moldingShift,
          moldingNotes: `Heat Batch ${new Date().toISOString().split('T')[0]}`,
        };
      });

      const res = await fetch(`/api/production/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_MOLDING_GANG',
          doorAssignments,
          gangId: selectedGang.id,
          gangName: selectedGang.name,
          doorMolderName: (doorMolder || selectedGang.name).trim(),
          frameMolderName: (frameMolder || selectedGang.name).trim(),
          moldingShift,
          operation: 'MOLDING_DOOR_WITH_FRAME',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to assign doors to molding gang.');
      }

      setCurrentOrder(json.data);
      if (onOrderUpdated) onOrderUpdated(json.data);

      setStatusMessage({
        text: `✓ Successfully assigned ${selectedDoors.length} doors to ${selectedGang.name}! (₹${totalContractLabor.toLocaleString('en-IN')} piece-rate credited).`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error updating order.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Recall / Roll Back Doors from Floor
  const handleRecallFromFloor = async () => {
    if (selectedDoors.length === 0) {
      setStatusMessage({ text: 'Select which doors to pull back from the floor.', type: 'error' });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to PULL BACK ${selectedDoors.length} doors from the molding floor? This will reset them to Pending Molding and free up the hydraulic press.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/production/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECALL_FROM_FLOOR',
          doorIds: selectedDoorIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to pull back doors from floor.');
      }

      setCurrentOrder(json.data);
      if (onOrderUpdated) onOrderUpdated(json.data);

      setStatusMessage({
        text: `↩️ Pulled back ${selectedDoors.length} doors from the molding floor! Order reset to Pending Queue.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error recalling doors.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>FLEXIBLE DOOR-BY-DOOR MOLDING &amp; CONTRACTOR ASSIGNMENT</span>
                <span className="px-2 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700 font-mono">
                  {totalDoors} DOORS TOTAL
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">
                  {currentOrder.jobCardNumber}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Party: <strong className="text-white">{currentOrder.customerName}</strong> • Select flexible subsets (e.g. 6 today, 5 tomorrow, 4 next day) &amp; assign contractor contract
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
          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-500/60 text-rose-300'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white cursor-pointer ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Selection Toolbar */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Quick Select Batch:</span>
              <button
                type="button"
                onClick={() => selectCount(4)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Select 4 Doors
              </button>
              <button
                type="button"
                onClick={() => selectCount(5)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Select 5 Doors
              </button>
              <button
                type="button"
                onClick={() => selectCount(6)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Select 6 Doors
              </button>
              <button
                type="button"
                onClick={() => selectCount(8)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Select 8 Doors
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                All ({totalDoors})
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-2 py-1 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold font-mono">
                {selectedDoors.length} of {totalDoors} Doors Selected
              </span>
            </div>
          </div>

          {/* Interactive Door-by-Door Selection Grid */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-200 uppercase tracking-wide">
                Select Individual Doors for Today&apos;s Molding Heat:
              </span>
              <span className="text-slate-400 text-[11px]">
                Click checkbox or row to toggle door inclusion
              </span>
            </div>

            <div className="p-3 max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar">
              {doors.map((door, idx) => {
                const doorId = door.id || door.doorId;
                const isSelected = selectedDoorIds.includes(doorId);
                const isAlreadyMolded = Boolean(door.moldedByGangId);

                return (
                  <div
                    key={doorId}
                    onClick={() => toggleDoorSelection(doorId)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/40 text-white'
                        : isAlreadyMolded
                        ? 'bg-emerald-950/20 border-emerald-900/50 text-slate-300'
                        : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-rose-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-black text-rose-300 text-[11px]">
                        DOOR #{idx + 1}
                      </span>
                      <strong className="text-white text-xs">{door.doorNumber || `Door #${idx + 1}`}</strong>
                      <span className="text-slate-400 text-[11px]">
                        ({((door.finishedHeightMm || 2080) / 10).toFixed(0)} × {((door.finishedWidthMm || 820) / 10).toFixed(0)} cm)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {door.model || 'FRP 30mm'}
                      </span>
                      {(door as any).roomTag && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {(door as any).roomTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Lock: <strong className="text-slate-200">{door.lockType || 'Baby Latch'}</strong>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${door.handing === 'LH' ? 'bg-blue-950 text-blue-300' : 'bg-purple-950 text-purple-300'}`}>
                        {door.handing || 'RH'}
                      </span>

                      {/* Molding Status Badge */}
                      {isAlreadyMolded ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>
                            Molded ({door.moldedByGangName || 'Gang'}
                            {door.doorMolderName ? ` • D:${door.doorMolderName}` : ''}
                            {door.frameMolderName ? ` F:${door.frameMolderName}` : ''})
                          </span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[10px] font-bold">
                          Pending Press
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Chemical Requisition & Contractor Assignment Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Store Chemical Requisition for Selected Doors */}
            <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-200 uppercase">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Store Chemical Requisition ({selectedDoors.length} Doors)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Zero Waste Formula</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dispense resin and catalyst for only today&apos;s selected doors to prevent pot-life gelation waste:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Resin</span>
                  <strong className="text-amber-300 font-mono text-sm">{batchResinKg} Kg</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Gelcoat</span>
                  <strong className="text-amber-300 font-mono text-sm">{batchGelKg} Kg</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">MEKP Catalyst</span>
                  <strong className="text-cyan-300 font-mono text-sm">{batchCatalystGrams} gm</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Fiber CSM</span>
                  <strong className="text-slate-200 font-mono text-sm">{batchCsmKg} Kg</strong>
                </div>
              </div>
            </div>

            {/* Box 2: Contractor Gang Assignment & Piece-Rate */}
            <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-200 uppercase">
                <span className="flex items-center gap-1.5 text-rose-300">
                  <UserCheck className="w-3.5 h-3.5" />
                  Assign Contractor &amp; Piece-Rate
                </span>
                <span className="text-[10px] text-amber-400 font-bold font-mono">
                  ₹{unitRate} / Door Set
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Select Molding Gang Contractor (Team Head):
                </label>
                <select
                  value={selectedGangId}
                  onChange={(e) => setSelectedGangId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white cursor-pointer"
                >
                  {gangs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — ({g.tradeLabel})
                    </option>
                  ))}
                </select>
              </div>

              {/* Individual Artisans (Door & Frame Molders) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase block mb-1">
                    🚪 Door Molder / Artisan:
                  </label>
                  <input
                    type="text"
                    value={doorMolder}
                    onChange={(e) => setDoorMolder(e.target.value)}
                    placeholder={selectedGang?.name || 'e.g. ANIL'}
                    list="gang-members-list"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-sky-300 uppercase block mb-1">
                    🖼️ Frame Molder / Artisan:
                  </label>
                  <input
                    type="text"
                    value={frameMolder}
                    onChange={(e) => setFrameMolder(e.target.value)}
                    placeholder={selectedGang?.name || 'e.g. SALMAN'}
                    list="gang-members-list"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-sky-300"
                  />
                </div>
                <datalist id="gang-members-list">
                  {(selectedGang?.memberNames || []).map((m) => (
                    <option key={m} value={m} />
                  ))}
                  {selectedGang?.name && <option value={selectedGang.name} />}
                </datalist>
              </div>

              {/* Shift Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Molding Shift:
                </label>
                <select
                  value={moldingShift}
                  onChange={(e) => setMoldingShift(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
                >
                  <option value="SHIFT_1">Shift 1 (Morning Heat)</option>
                  <option value="SHIFT_2">Shift 2 (Afternoon Heat)</option>
                  <option value="NIGHT_SHIFT">Night Shift Heat</option>
                  <option value="GENERAL">General Shift</option>
                </select>
              </div>

              <div className="p-2 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Contract Labor Value:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {selectedDoors.length} × ₹{unitRate} = ₹{totalContractLabor.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || selectedDoors.length === 0}
                  onClick={handleAssignToGang}
                  className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <Flame className="w-4 h-4" />
                  <span>🚀 Assign {selectedDoors.length} Doors &amp; Start Molding</span>
                </button>
              </div>
            </div>
          </div>

          {/* Actions & Floor Recall / Rollback Section */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenStickersForBatch(selectedDoors)}
                disabled={selectedDoors.length === 0}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Print 12L stickers only for selected doors"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span>Print {selectedDoors.length} Stickers</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenLockSlipForBatch(currentOrder, selectedDoors)}
                disabled={selectedDoors.length === 0}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Generate separate Lock Setting Slip for post-molding carpentry"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Lock Setting Slip</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenChallanForBatch(currentOrder, selectedDoors)}
                disabled={selectedDoors.length === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5 text-white" />
                <span>Partial Delivery Challan</span>
              </button>
            </div>

            {/* 1-Click Pull Back / Roll Back Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting || selectedDoors.length === 0}
                onClick={handleRecallFromFloor}
                className="px-3.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600 text-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Pull back order doors from floor to free up the press for urgent orders"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>↩️ Pull Back from Floor (Roll Back)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
