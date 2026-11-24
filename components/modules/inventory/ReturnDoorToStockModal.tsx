'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Undo2,
  CheckCircle2,
  Tag,
  MapPin,
  User,
  FileText,
  DollarSign,
  AlertTriangle,
  Loader2,
  Ruler,
} from 'lucide-react';
import type { ReadyStockDoor, StockItemType } from '@/lib/services/readyStockDoorService';
import { cmToTapeInchFormatted } from '@/lib/services/toleranceCalculation';

interface ReturnDoorToStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (door: ReadyStockDoor) => void;
}

interface SalesStaffOption {
  id: string;
  code: string;
  name: string;
}

const COMMON_RETURN_REASONS = [
  'Site frame opening tolerance mismatch / Shutter oversized',
  'Site floor level raised after tile laying (Door height mismatch)',
  'Client cancelled / design revision at site',
  'Wrong lock cutout / lock position mismatch',
  'Wrong handing (LH ordered instead of RH)',
  'Transit scratch / surface blemish (Repaintable in factory)',
  'Client requested model/color change after delivery',
  'Excess shutter manufactured by mistake',
];

export function ReturnDoorToStockModal({
  isOpen,
  onClose,
  onSuccess,
}: ReturnDoorToStockModalProps) {
  // Form fields
  const [jobCardNumber, setJobCardNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [itemType, setItemType] = useState<StockItemType>('DOOR_ONLY');
  const [doorModelName, setDoorModelName] = useState('32mm Molded Teak FRP Door');
  const [doorCategory, setDoorCategory] = useState<'FRP_DOORS' | 'WPC_DOORS'>('FRP_DOORS');
  const [doorHeightMm, setDoorHeightMm] = useState<number>(2032);
  const [doorWidthMm, setDoorWidthMm] = useState<number>(813);
  const [doorThicknessMm, setDoorThicknessMm] = useState<number>(32);
  const [doorFinishColor, setDoorFinishColor] = useState('Natural Teak');
  const [handing, setHanding] = useState<'LH' | 'RH' | 'UNIVERSAL'>('UNIVERSAL');
  const [lockCutoutStatus, setLockCutoutStatus] = useState<'UNCUT' | 'PRE_CUT'>('PRE_CUT');
  const [lockType, setLockType] = useState('Standard Mortise (50mm Backset)');

  const [frameTypeName, setFrameTypeName] = useState('WPC Solid Extruded 100×65mm');
  const [frameHeightMm, setFrameHeightMm] = useState<number>(2050);
  const [frameWidthMm, setFrameWidthMm] = useState<number>(900);

  const [returnReason, setReturnReason] = useState(COMMON_RETURN_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [rackLocation, setRackLocation] = useState('Godown Bay 2 / Return Bay R-1');
  const [resalePrice, setResalePrice] = useState<number>(4500);
  const [originalCostValuation, setOriginalCostValuation] = useState<number>(2500);
  const [notes, setNotes] = useState('');

  // Salesperson and leaderboard adjustment
  const [salesStaff, setSalesStaff] = useState<SalesStaffOption[]>([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('');
  const [adjustSalespersonTarget, setAdjustSalespersonTarget] = useState<boolean>(true);

  // Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdDoor, setCreatedDoor] = useState<ReadyStockDoor | null>(null);

  // Fetch sales staff for dropdown
  useEffect(() => {
    if (!isOpen) return;
    setCreatedDoor(null);
    setErrorMsg(null);

    async function loadSalesStaff() {
      try {
        const res = await fetch('/api/sales/targets?leaderboard=false');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.targets) {
            const list: SalesStaffOption[] = json.data.targets.map(
              (t: { employeeId: string; employeeCode: string; employeeName: string }) => ({
                id: t.employeeId,
                code: t.employeeCode,
                name: t.employeeName,
              })
            );
            setSalesStaff(list);
            if (list.length > 0 && !selectedSalespersonId) {
              setSelectedSalespersonId(list[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load sales targets for staff picker:', err);
      }
    }
    loadSalesStaff();
  }, [isOpen]);

  if (!isOpen) return null;

  const heightInches = cmToTapeInchFormatted(doorHeightMm / 10);
  const widthInches = cmToTapeInchFormatted(doorWidthMm / 10);

  const finalReturnReason = customReason.trim() ? `${returnReason}: ${customReason.trim()}` : returnReason;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (!doorHeightMm || !doorWidthMm) {
      setErrorMsg('Valid door height and width are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const chosenRep = salesStaff.find((s) => s.id === selectedSalespersonId);

    const payload = {
      action: 'RETURN_DELIVERY',
      jobCardNumber: jobCardNumber.trim() || undefined,
      customerName: customerName.trim(),
      itemType,
      doorModelName: doorModelName.trim(),
      doorCategory,
      doorHeightMm: Number(doorHeightMm),
      doorWidthMm: Number(doorWidthMm),
      doorThicknessMm: Number(doorThicknessMm),
      doorFinishColor: doorFinishColor.trim(),
      handing,
      lockCutoutStatus,
      lockType: lockCutoutStatus === 'PRE_CUT' ? lockType : undefined,

      frameTypeName: itemType !== 'DOOR_ONLY' ? frameTypeName : undefined,
      frameHeightMm: itemType !== 'DOOR_ONLY' ? Number(frameHeightMm) : undefined,
      frameWidthMm: itemType !== 'DOOR_ONLY' ? Number(frameWidthMm) : undefined,

      returnReason: finalReturnReason,
      rackLocation: rackLocation.trim() || 'Return Bay R-1',
      resalePrice: Number(resalePrice) || 4500,
      originalCostValuation: Number(originalCostValuation) || 2500,
      notes: notes.trim() || undefined,

      salespersonId: chosenRep?.id,
      salespersonCode: chosenRep?.code,
      salespersonName: chosenRep?.name,
      adjustSalespersonTarget: Boolean(adjustSalespersonTarget && chosenRep),
    };

    try {
      const res = await fetch('/api/stock-doors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to restock returned door');
      }

      setCreatedDoor(json.data);
      onSuccess(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restock door';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Return Door to Stock
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-700">
                  RETURNED_DELIVERY
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log returned doors into inventory and generate identification stock stickers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-800 dark:text-slate-200">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-2.5 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {createdDoor ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  Door successfully returned and added to stock!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Stock Code: <strong className="font-mono text-sm">{createdDoor.stockCode}</strong> | Rack:{' '}
                  {createdDoor.rackLocation} | Resale Price: ₹{createdDoor.sellingPrice}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form id="return-door-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Provenance: Job Card & Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Card / Order No
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={jobCardNumber}
                      onChange={(e) => setJobCardNumber(e.target.value)}
                      placeholder="e.g. JC-2026-104 or Q-1025"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Dr. Haris Calicut / ABC Builders"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Shutter Physical Dimensions & Specs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-amber-500" />
                  Door Specifications & Dimensions
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Item Type
                    </label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as StockItemType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="DOOR_ONLY">Door Slab Only</option>
                      <option value="DOOR_AND_FRAME">Door + Frame Complete Set</option>
                      <option value="FRAME_ONLY">Frame Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Model / Pattern
                    </label>
                    <input
                      type="text"
                      value={doorModelName}
                      onChange={(e) => setDoorModelName(e.target.value)}
                      placeholder="e.g. 32mm Molded Teak"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={doorCategory}
                      onChange={(e) => setDoorCategory(e.target.value as 'FRP_DOORS' | 'WPC_DOORS')}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="FRP_DOORS">FRP Doors</option>
                      <option value="WPC_DOORS">WPC Doors</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/50">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      required
                      value={doorHeightMm}
                      onChange={(e) => setDoorHeightMm(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                      {heightInches}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      required
                      value={doorWidthMm}
                      onChange={(e) => setDoorWidthMm(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                      {widthInches}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={doorThicknessMm}
                      onChange={(e) => setDoorThicknessMm(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Color / Finish
                    </label>
                    <input
                      type="text"
                      value={doorFinishColor}
                      onChange={(e) => setDoorFinishColor(e.target.value)}
                      placeholder="e.g. Natural Teak"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Handing
                    </label>
                    <select
                      value={handing}
                      onChange={(e) => setHanding(e.target.value as 'LH' | 'RH' | 'UNIVERSAL')}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="UNIVERSAL">Universal (Non-Handed)</option>
                      <option value="LH">Left Hand (LH)</option>
                      <option value="RH">Right Hand (RH)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Lock Cutout Status
                    </label>
                    <select
                      value={lockCutoutStatus}
                      onChange={(e) => setLockCutoutStatus(e.target.value as 'UNCUT' | 'PRE_CUT')}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="PRE_CUT">Pre-cut Lock Hole</option>
                      <option value="UNCUT">Uncut Blank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Lock Type / Backset
                    </label>
                    <input
                      type="text"
                      disabled={lockCutoutStatus === 'UNCUT'}
                      value={lockType}
                      onChange={(e) => setLockType(e.target.value)}
                      placeholder="e.g. Mortise 50mm"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Return Provenance, Reason & Valuation */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-500" />
                  Return Reason & Warehouse Valuation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Return Reason *
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {COMMON_RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Specific Notes / Site Details
                    </label>
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="e.g. Needs 10mm bottom trim; Customer changed to Teak"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Godown Rack Location
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={rackLocation}
                        onChange={(e) => setRackLocation(e.target.value)}
                        placeholder="e.g. Return Bay R-1"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Resale Price (₹) *
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        required
                        value={resalePrice}
                        onChange={(e) => setResalePrice(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Valuation Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={originalCostValuation}
                      onChange={(e) => setOriginalCostValuation(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sales Rep & Leaderboard Quota Sync */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-500" />
                    Sales Leaderboard Quota Sync
                  </h4>
                  <label className="flex items-center gap-2 text-xs font-medium text-blue-800 dark:text-blue-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adjustSalespersonTarget}
                      onChange={(e) => setAdjustSalespersonTarget(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Adjust Salesperson Monthly Target (-1 Door, -₹{resalePrice})</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Original Salesperson
                    </label>
                    <select
                      value={selectedSalespersonId}
                      onChange={(e) => setSelectedSalespersonId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Direct Factory / No Specific Staff --</option>
                      {salesStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Internal Restock Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Minor edge polish needed before dispatch"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!createdDoor && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="return-door-form"
              disabled={isLoading}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-md shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Restock Door...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Add Returned Door to Stock
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}