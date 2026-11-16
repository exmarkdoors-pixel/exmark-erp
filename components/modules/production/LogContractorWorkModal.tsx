'use client';

import React, { useState, useEffect } from 'react';
import { ProductionOrder, ProductionDoorItem } from '@/lib/services/productionService';
import { Contractor, ContractorOperationType, ContractorTrade } from '@/lib/services/contractorService';
import { getOperationLockGroup, OrderPieceRateGroupLock, OrderPieceRateLockSummary } from '@/lib/utils/pieceRateLocks';
import { X, CheckCircle2, UserCheck, Calculator, AlertCircle, Lock, Plus } from 'lucide-react';

interface LogContractorWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  selectedDoor?: ProductionDoorItem | null;
  onSuccess?: () => void;
  onCreateSupplementaryJob?: (order: ProductionOrder) => void;
}

const OPERATION_OPTIONS: Array<{
  op: ContractorOperationType;
  label: string;
  defaultRate: number;
  trade: ContractorTrade;
}> = [
  { op: 'MOLDING_DOOR_WITH_FRAME', label: 'Molding: Door With Frame (₹500)', defaultRate: 500, trade: 'MOLDING' },
  { op: 'MOLDING_ONLY_DOOR', label: 'Molding: Only Door (₹380)', defaultRate: 380, trade: 'MOLDING' },
  { op: 'MOLDING_ONLY_FRAME', label: 'Molding: Only Frame (₹125)', defaultRate: 125, trade: 'MOLDING' },
  { op: 'DOOR_CUTTING', label: 'Party 1: Door Cutting & Finishing (₹100)', defaultRate: 100, trade: 'CUTTING_GRINDING' },
  { op: 'FRAME_CUTTING', label: 'Party 2: Frame Cutting & Finishing (₹100)', defaultRate: 100, trade: 'CUTTING_GRINDING' },
  { op: 'DOOR_GRAINS_WITH_PAINT', label: 'Grains & Painting: Standard (₹300)', defaultRate: 300, trade: 'PAINTING' },
  { op: 'ONLY_CLEAR_COAT', label: 'Grains & Painting: Clear Coat (₹150)', defaultRate: 150, trade: 'PAINTING' },
  { op: 'TWO_SIDE_PAINT', label: 'Grains & Painting: Two-Side Paint (₹500)', defaultRate: 500, trade: 'PAINTING' },
  { op: 'SITE_FITTING', label: 'Site Fitting & Installation (₹400)', defaultRate: 400, trade: 'SITE_FITTING' },
];

export function LogContractorWorkModal({
  isOpen,
  onClose,
  order,
  selectedDoor,
  onSuccess,
  onCreateSupplementaryJob,
}: LogContractorWorkModalProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<ContractorOperationType>('MOLDING_DOOR_WITH_FRAME');
  const [rate, setRate] = useState<number>(500);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lockSummary, setLockSummary] = useState<OrderPieceRateLockSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/contractors')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setContractors(json.data);
            if (json.data.length > 0) {
              setSelectedContractorId(json.data[0].id);
            }
          }
        })
        .catch(() => {});

      if (order) {
        setQuantity(selectedDoor ? 1 : order.quantity || 1);
        fetch(
          `/api/contractors/credit?orderId=${encodeURIComponent(order.id)}&jobCardNumber=${encodeURIComponent(
            order.jobCardNumber || ''
          )}&totalDoors=${order.doors?.length || order.quantity || 1}`
        )
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setLockSummary(json.data as OrderPieceRateLockSummary);
            }
          })
          .catch(() => setLockSummary(null));
      } else {
        setLockSummary(null);
      }
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen, order, selectedDoor]);

  const getGroupLockForOp = (op: ContractorOperationType): { locked: boolean; group: OrderPieceRateGroupLock | null } => {
    if (!lockSummary) return { locked: false, group: null };
    const grp = lockSummary.groups[getOperationLockGroup(op)] || null;
    if (!grp) return { locked: false, group: null };
    if (selectedDoor) {
      const targetId = selectedDoor.doorId.toLowerCase();
      const locked = grp.creditedDoorIds.some(
        (d) => d.toLowerCase() === targetId
      );
      return { locked, group: grp };
    }
    const maxDoors = order ? order.doors?.length || order.quantity || 1 : 1;
    const isFullyPaid = grp.isLocked || grp.totalCreditedQty >= maxDoors;
    return { locked: isFullyPaid, group: grp };
  };

  const currentOpLock = getGroupLockForOp(selectedOperation);

  const handleOperationChange = (op: ContractorOperationType) => {
    setSelectedOperation(op);
    const matched = OPERATION_OPTIONS.find((o) => o.op === op);
    if (matched) {
      setRate(matched.defaultRate);
    }
    const targetScope =
      op === 'DOOR_CUTTING'
        ? 'DOOR_CUTTING_FINISHING'
        : op === 'FRAME_CUTTING'
          ? 'FRAME_CUTTING_FINISHING'
          : op === 'DOOR_GRAINS_WITH_PAINT' || op === 'ONLY_CLEAR_COAT' || op === 'TWO_SIDE_PAINT'
            ? 'GRAINS_PAINTING'
            : undefined;
    const preferred =
      (targetScope && contractors.find((c) => c.teamScope === targetScope)) ||
      (matched && contractors.find((c) => c.trade === matched.trade));
    if (preferred) {
      setSelectedContractorId(preferred.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !selectedContractorId) {
      setError('Please select a valid contractor.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/contractors/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: selectedContractorId,
          orderId: order.id,
          orderNumber: order.prodOrderNumber,
          jobCardNumber: order.jobCardNumber,
          doorId: selectedDoor ? selectedDoor.doorId : `BATCH-${order.jobCardNumber}-${selectedContractorId}`,
          doorNumber: selectedDoor ? selectedDoor.doorNumber : 'All Doors in Order',
          doorModel: selectedDoor ? selectedDoor.model : 'FRP Door System',
          operation: selectedOperation,
          quantity: Number(quantity),
          customRate: Number(rate),
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record piece rate credit');
      }

      setSuccessMsg(`Successfully credited ₹${(Number(rate) * Number(quantity)).toLocaleString('en-IN')} to contractor account!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording piece rate credit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  const totalAmount = (Number(rate) || 0) * (Number(quantity) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Log Contractor Piece-Rate Credit</h2>
              <p className="text-[11px] text-slate-400">
                {order.jobCardNumber} • {order.customerName}
                {selectedDoor ? ` (${selectedDoor.doorNumber} - ${selectedDoor.doorId})` : ` (${order.quantity} Doors)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Contractor selection */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Contractor / Piece Worker</label>
            <select
              value={selectedContractorId}
              onChange={(e) => setSelectedContractorId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
              required
            >
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.tradeLabel} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Operation selection */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Operation / Stage Rate Type</label>
            <select
              value={selectedOperation}
              onChange={(e) => handleOperationChange(e.target.value as ContractorOperationType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {OPERATION_OPTIONS.map((opt) => {
                const { locked } = getGroupLockForOp(opt.op);
                return (
                  <option key={opt.op} value={opt.op}>
                    {locked ? `🔒 [PAID ONCE] ${opt.label}` : opt.label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Multi-Team Door Allowance Banner */}
          {currentOpLock.group && currentOpLock.group.totalCreditedQty > 0 && !currentOpLock.locked && (
            <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-bold text-blue-300">
                <span>Multi-Team Work Supported:</span>
                <span className="font-mono text-emerald-400">
                  {currentOpLock.group.remainingDoorBalance ?? ((order?.doors?.length || order?.quantity || 1) - currentOpLock.group.totalCreditedQty)} of {order?.doors?.length || order?.quantity || 1} Doors Remaining
                </span>
              </div>
              <div className="text-slate-300">
                Already credited: {currentOpLock.group.totalCreditedQty} doors (₹{currentOpLock.group.totalAmountCredited.toLocaleString('en-IN')}) across{' '}
                {currentOpLock.group.contributingContractors?.map((c) => `${c.contractorName} (${c.quantity} doors)`).join(', ') || currentOpLock.group.contractorName}.
                You can credit remaining doors to another team without conflict.
              </div>
            </div>
          )}

          {currentOpLock.locked && currentOpLock.group && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-2 text-[11px]">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>One-Time Piece-Rate Policy Locked:</strong>{' '}
                  {currentOpLock.group.label} was already paid once (
                  {currentOpLock.group.contractorName} • ₹
                  {currentOpLock.group.totalAmountCredited.toLocaleString('en-IN')} on{' '}
                  {currentOpLock.group.lastPaidDate}). Rework on this Job Card pays{' '}
                  <strong>₹0</strong>.
                </div>
              </div>
              {order && onCreateSupplementaryJob && (
                <button
                  type="button"
                  onClick={() => onCreateSupplementaryJob(order)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create New Additional Job Card (Extra Paid Work)</span>
                </button>
              )}
            </div>
          )}

          {/* Quantity & Unit Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Quantity (Units / Doors)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Unit Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={rate}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-amber-400"
                required
              />
            </div>
          </div>

          {/* Total calculation banner */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Total Credit Payable:</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Shift / Quality Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Shift 1, First class finish, approved by supervisor"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || currentOpLock.locked}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              {isSubmitting
                ? 'Recording...'
                : currentOpLock.locked
                ? 'Locked (Paid Once)'
                : 'Credit Piece-Rate ₹'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
