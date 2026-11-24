'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Edit2,
  ShoppingCart,
  Factory,
  Package,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  Sliders,
  X,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Trash2,
  Wrench,
  Hammer,
} from 'lucide-react';
import {
  CompanyStockOverview,
  FinishedGoodsBufferItem,
  RawMaterialCategory,
  RawMaterialStockItem,
  StockMaintenanceConfig,
  WipStageStockItem,
} from '@/lib/services/stockMaintenanceService';
import { ReadyStockDoorsTab } from './ReadyStockDoorsTab';
import { BulkRawMaterialStockModal } from './BulkRawMaterialStockModal';

export interface StockMaintenanceHubProps {
  initialTab?: 'RM' | 'WIP' | 'FG' | 'READY_STOCK' | 'CONFIG';
}

export default function StockMaintenanceHub({ initialTab }: StockMaintenanceHubProps = {}) {
  const [activeTab, setActiveTab] = useState<'RM' | 'WIP' | 'FG' | 'READY_STOCK' | 'CONFIG'>(
    initialTab || 'RM'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Data
  const [overview, setOverview] = useState<CompanyStockOverview | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStockItem[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsBufferItem[]>([]);
  const [config, setConfig] = useState<StockMaintenanceConfig | null>(null);

  // Filters
  const [rmSearch, setRmSearch] = useState<string>('');
  const [rmCategoryFilter, setRmCategoryFilter] = useState<string>('ALL');
  const [rmStatusFilter, setRmStatusFilter] = useState<'ALL' | 'LOW_STOCK'>('ALL');
  const [fgSearch, setFgSearch] = useState<string>('');
  const [expandedWipStage, setExpandedWipStage] = useState<string | null>(null);

  // Modals & Action States
  const [editingRmItem, setEditingRmItem] = useState<RawMaterialStockItem | null>(null);
  const [rmAdjustmentQty, setRmAdjustmentQty] = useState<string>('');
  const [rmAdjustmentReason, setRmAdjustmentReason] = useState<string>('Stock Audit Adjustment');
  const [isSubmittingRm, setIsSubmittingRm] = useState<boolean>(false);

  const [editingFgItem, setEditingFgItem] = useState<FinishedGoodsBufferItem | null>(null);
  const [fgAdjustmentQty, setFgAdjustmentQty] = useState<string>('');
  const [fgAdjustmentReason, setFgAdjustmentReason] = useState<string>('FG Buffer Inward / Audit');
  const [isSubmittingFg, setIsSubmittingFg] = useState<boolean>(false);

  const [replenishingFgId, setReplenishingFgId] = useState<string | null>(null);

  // 1. Add New RM State
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [isAddRmModalOpen, setIsAddRmModalOpen] = useState(false);
  const [isSubmittingNewRm, setIsSubmittingNewRm] = useState(false);
  const [newRmDraft, setNewRmDraft] = useState({
    name: '',
    category: 'Chemicals' as RawMaterialCategory,
    itemCode: '',
    unit: 'KG',
    currentStock: '0',
    minSafetyBuffer: '50',
    targetStock: '150',
    unitCost: '180',
    warehouseLocation: 'Chemical Bay 1',
  });

  // 2. Full Edit RM State
  const [fullEditRmItem, setFullEditRmItem] = useState<RawMaterialStockItem | null>(null);
  const [isSubmittingEditRm, setIsSubmittingEditRm] = useState(false);
  const [editRmDraft, setEditRmDraft] = useState({
    name: '',
    category: 'Chemicals' as RawMaterialCategory,
    unit: 'KG',
    currentStock: '0',
    minSafetyBuffer: '50',
    targetStock: '150',
    unitCost: '180',
    warehouseLocation: 'Chemical Bay 1',
  });

  // 3. Delete RM State
  const [deletingRmItem, setDeletingRmItem] = useState<RawMaterialStockItem | null>(null);
  const [isSubmittingDeleteRm, setIsSubmittingDeleteRm] = useState(false);

  // 4. Manual Minus RM State
  const [manualMinusRmItem, setManualMinusRmItem] = useState<RawMaterialStockItem | null>(null);
  const [manualMinusQty, setManualMinusQty] = useState('');
  const [manualMinusReason, setManualMinusReason] = useState('Floor Issue');
  const [manualMinusDept, setManualMinusDept] = useState('Molding Gang');
  const [isSubmittingMinusRm, setIsSubmittingMinusRm] = useState(false);

  // 5. Issue Rework Material State
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkJobCard, setReworkJobCard] = useState('');
  const [reworkOrderId, setReworkOrderId] = useState('');
  const [reworkCustomerName, setReworkCustomerName] = useState('');
  const [reworkReasonInput, setReworkReasonInput] = useState('Surface Defect Correction');
  const [reworkMaterialName, setReworkMaterialName] = useState('UV-Stabilized PU Gelcoat (White / Clear)');
  const [reworkMaterialQty, setReworkMaterialQty] = useState('2');
  const [reworkMaterialUnit, setReworkMaterialUnit] = useState('KG');
  const [reworkMaterialRate, setReworkMaterialRate] = useState('320');
  const [isSubmittingRework, setIsSubmittingRework] = useState(false);

  // Target Settings Modal / Draft
  const [targetDraft, setTargetDraft] = useState<string>('2500000');
  const [autoDeductDraft, setAutoDeductDraft] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isSyncingAllToBoq, setIsSyncingAllToBoq] = useState<boolean>(false);

  // Sync All Raw Material Prices to BOQ Formulas
  const handleSyncAllToBoq = async () => {
    setIsSyncingAllToBoq(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_ALL_TO_BOQ' }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({
          type: 'success',
          text: json.message || 'Successfully synchronized Stock Ledger prices to BOQ formula rates!',
        });
      } else {
        setNotice({
          type: 'error',
          text: json.error || 'Failed to sync Stock Ledger to BOQ',
        });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error syncing rates to BOQ.' });
    } finally {
      setIsSyncingAllToBoq(false);
    }
  };

  const isBoqMappedItem = (itemCode?: string, name?: string): boolean => {
    const code = (itemCode || '').toUpperCase();
    const n = (name || '').toLowerCase();
    if (
      code.startsWith('RAW-RES') ||
      code.startsWith('RAW-GEL') ||
      code.startsWith('CHM-CAT') ||
      code.startsWith('CHM-ACC') ||
      code.startsWith('RAW-FBR') ||
      code.startsWith('CORE-FOAM') ||
      code.startsWith('CORE-TMB') ||
      code.startsWith('PIG-') ||
      code.startsWith('HRD-LCK')
    ) {
      return true;
    }
    return (
      n.includes('resin') ||
      n.includes('gelcoat') ||
      n.includes('catalyst') ||
      n.includes('mekp') ||
      n.includes('accelerator') ||
      n.includes('cobalt') ||
      n.includes('csm') ||
      n.includes('foam') ||
      n.includes('batten') ||
      n.includes('pigment') ||
      n.includes('mortise') ||
      n.includes('baby latch')
    );
  };

  const loadStockData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stock-maintenance');
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data.overview);
        setRawMaterials(json.data.rawMaterials || []);
        setFinishedGoods(json.data.finishedGoods || []);
        setConfig(json.data.config || null);
        if (json.data.config?.consistentTargetValuation) {
          setTargetDraft(String(json.data.config.consistentTargetValuation));
          setAutoDeductDraft(json.data.config.autoDeductBoqMaterials ?? true);
        }
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to load stock data' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error connecting to stock maintenance service.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  // Filtered Raw Materials
  const filteredRawMaterials = useMemo(() => {
    return rawMaterials.filter((item) => {
      if (rmCategoryFilter !== 'ALL' && item.category !== rmCategoryFilter) return false;
      if (rmStatusFilter === 'LOW_STOCK' && item.status === 'IN_STOCK') return false;
      if (rmSearch.trim()) {
        const query = rmSearch.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.itemCode.toLowerCase().includes(query);
        const matchLoc = item.warehouseLocation.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchLoc) return false;
      }
      return true;
    });
  }, [rawMaterials, rmCategoryFilter, rmStatusFilter, rmSearch]);

  // Filtered Finished Goods
  const filteredFinishedGoods = useMemo(() => {
    return finishedGoods.filter((item) => {
      if (fgSearch.trim()) {
        const query = fgSearch.toLowerCase().trim();
        const matchName = item.modelName.toLowerCase().includes(query);
        const matchSku = item.sku.toLowerCase().includes(query);
        const matchSize = item.sizeLabel.toLowerCase().includes(query);
        const matchColor = item.finishColor.toLowerCase().includes(query);
        if (!matchName && !matchSku && !matchSize && !matchColor) return false;
      }
      return true;
    });
  }, [finishedGoods, fgSearch]);

  // Handle RM Stock Adjustment
  const handleSaveRmAdjustment = async () => {
    if (!editingRmItem) return;
    const qty = Number(rmAdjustmentQty);
    if (!qty || Number.isNaN(qty)) {
      setNotice({ type: 'error', text: 'Enter a valid non-zero adjustment quantity (+ to add, - to deduct).' });
      return;
    }
    setIsSubmittingRm(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUST_RM',
          id: editingRmItem.id,
          adjustment: qty,
          reason: rmAdjustmentReason,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setNotice({ type: 'success', text: json.message || 'Updated Raw Material stock.' });
        setEditingRmItem(null);
        setRmAdjustmentQty('');
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to adjust stock' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error submitting stock adjustment.' });
    } finally {
      setIsSubmittingRm(false);
    }
  };

  // Handle FG Stock Adjustment
  const handleSaveFgAdjustment = async () => {
    if (!editingFgItem) return;
    const qty = Number(fgAdjustmentQty);
    if (!qty || Number.isNaN(qty)) {
      setNotice({ type: 'error', text: 'Enter a valid non-zero adjustment quantity (+ to add, - to deduct).' });
      return;
    }
    setIsSubmittingFg(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUST_FG',
          id: editingFgItem.id,
          adjustment: qty,
          reason: fgAdjustmentReason,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setNotice({ type: 'success', text: json.message || 'Updated Finished Goods buffer.' });
        setEditingFgItem(null);
        setFgAdjustmentQty('');
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to adjust FG stock' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error submitting FG adjustment.' });
    } finally {
      setIsSubmittingFg(false);
    }
  };

  // Handle 1-Click FG Replenishment Order
  const handleReplenishFgBuffer = async (fgItem: FinishedGoodsBufferItem) => {
    setReplenishingFgId(fgItem.id);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPLENISH_FG',
          fgItemId: fgItem.id,
          quantity: fgItem.deficitCount || 5,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setNotice({
          type: 'success',
          text: json.message || `Created internal replenishment Job Card ${json.data.jobCardNumber}!`,
        });
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to create replenishment order.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error creating replenishment order.' });
    } finally {
      setReplenishingFgId(null);
    }
  };

  // Handle Add New Raw Material
  const handleCreateRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRmDraft.name.trim()) {
      setNotice({ type: 'error', text: 'Please enter raw material name.' });
      return;
    }
    setIsSubmittingNewRm(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RM',
          name: newRmDraft.name.trim(),
          category: newRmDraft.category,
          itemCode: newRmDraft.itemCode.trim() || undefined,
          unit: newRmDraft.unit.trim() || 'KG',
          currentStock: Number(newRmDraft.currentStock) || 0,
          minSafetyBuffer: Number(newRmDraft.minSafetyBuffer) || 10,
          targetStock: Number(newRmDraft.targetStock) || 20,
          unitCost: Number(newRmDraft.unitCost) || 0,
          warehouseLocation: newRmDraft.warehouseLocation.trim() || 'Main Store Rack',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message || 'Added new raw material!' });
        setIsAddRmModalOpen(false);
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to add raw material' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error saving new raw material.' });
    } finally {
      setIsSubmittingNewRm(false);
    }
  };

  // Handle Full Edit Raw Material
  const handleUpdateRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullEditRmItem) return;
    if (!editRmDraft.name.trim()) {
      setNotice({ type: 'error', text: 'Raw material name cannot be empty.' });
      return;
    }
    setIsSubmittingEditRm(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_RM',
          id: fullEditRmItem.id,
          name: editRmDraft.name.trim(),
          category: editRmDraft.category,
          unit: editRmDraft.unit.trim() || 'KG',
          currentStock: Number(editRmDraft.currentStock) || 0,
          minSafetyBuffer: Number(editRmDraft.minSafetyBuffer) || 10,
          targetStock: Number(editRmDraft.targetStock) || 20,
          unitCost: Number(editRmDraft.unitCost) || 0,
          warehouseLocation: editRmDraft.warehouseLocation.trim() || 'Main Store Rack',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message || 'Updated raw material.' });
        setFullEditRmItem(null);
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to update raw material' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error updating raw material.' });
    } finally {
      setIsSubmittingEditRm(false);
    }
  };

  // Handle Delete Raw Material
  const handleDeleteRawMaterial = async () => {
    if (!deletingRmItem) return;
    setIsSubmittingDeleteRm(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_RM',
          id: deletingRmItem.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message || `Deleted ${deletingRmItem.name}` });
        setDeletingRmItem(null);
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to delete item' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error deleting item.' });
    } finally {
      setIsSubmittingDeleteRm(false);
    }
  };

  // Handle Manual Stock Out (- Minus)
  const handleManualStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMinusRmItem) return;
    const qty = Number(manualMinusQty);
    if (!qty || qty <= 0) {
      setNotice({ type: 'error', text: 'Enter a valid positive quantity to deduct.' });
      return;
    }
    setIsSubmittingMinusRm(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MANUAL_STOCK_OUT',
          id: manualMinusRmItem.id,
          quantity: qty,
          reason: manualMinusReason,
          department: manualMinusDept,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message || 'Stock deducted successfully.' });
        setManualMinusRmItem(null);
        setManualMinusQty('');
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to deduct stock' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error deducting stock.' });
    } finally {
      setIsSubmittingMinusRm(false);
    }
  };

  // Handle Issue Rework Material
  const handleIssueReworkMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reworkOrderId) {
      setNotice({ type: 'error', text: 'Please enter or select a Job Card / Order ID.' });
      return;
    }
    const qty = Number(reworkMaterialQty);
    if (!qty || qty <= 0) {
      setNotice({ type: 'error', text: 'Enter valid material quantity.' });
      return;
    }
    setIsSubmittingRework(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ISSUE_REWORK_MATERIAL',
          prodOrderId: reworkOrderId,
          jobCardNumber: reworkJobCard,
          customerName: reworkCustomerName,
          reason: reworkReasonInput,
          items: [
            {
              name: reworkMaterialName,
              qty,
              unit: reworkMaterialUnit,
              unitCost: Number(reworkMaterialRate) || 0,
            },
          ],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message || 'Issued rework material and updated ledger.' });
        setIsReworkModalOpen(false);
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to issue rework material' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error issuing rework material.' });
    } finally {
      setIsSubmittingRework(false);
    }
  };

  // Handle Save Target Settings
  const handleSaveConfig = async () => {
    const val = Number(targetDraft);
    if (!val || val < 100000) {
      setNotice({ type: 'error', text: 'Consistent Target Valuation must be at least ₹1,00,000.' });
      return;
    }
    setIsSavingConfig(true);
    setNotice(null);
    try {
      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CONFIG',
          consistentTargetValuation: val,
          autoDeductBoqMaterials: autoDeductDraft,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message || 'Stock settings saved cleanly.' });
        loadStockData();
      } else {
        setNotice({ type: 'error', text: json.error || 'Failed to update stock settings' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error updating stock settings.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const targetBaseline = overview?.consistentTargetValuation || 2500000;
  const totalValuation = overview?.totalInventoryValuation || 0;
  const surplusDeficit = overview?.valuationSurplusDeficit || 0;
  const pctOfTarget = targetBaseline > 0 ? Math.min(150, Math.round((totalValuation / targetBaseline) * 100)) : 100;

  return (
    <div className="space-y-3 p-2 sm:p-3 text-slate-100 w-full max-w-full min-w-0">
      {/* ── TOP EXECUTIVE STOCK BUFFER HEADER ───────────────────────────── */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400">
                <Boxes className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Stock Maintenance &amp; Buffer Planning</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Baseline Stock Buffer
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Continuous Company-Wide Stock Baseline: Raw Materials + WIP Floor Pipeline + Finished Goods Buffer
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadStockData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CONFIG')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Set Target (₹{(targetBaseline / 100000).toFixed(1)}L)</span>
            </button>
          </div>
        </div>

        {/* ── CONSISTENT BASELINE & VALUATION SUMMARY CARDS ──────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
          {/* Card 1: Total Valuation vs Target */}
          <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Company Total Stock Value</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  surplusDeficit >= 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                    : 'bg-rose-950 text-rose-300 border border-rose-600/40'
                }`}
              >
                {surplusDeficit >= 0 ? `+₹${Math.round(surplusDeficit).toLocaleString('en-IN')}` : `-₹${Math.abs(Math.round(surplusDeficit)).toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="my-1.5">
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                ₹{totalValuation.toLocaleString('en-IN')}
              </div>
              <div className="text-[10.5px] text-slate-400 flex items-center justify-between">
                <span>Consistent Baseline Target:</span>
                <span className="font-mono font-bold text-amber-300">₹{targetBaseline.toLocaleString('en-IN')}</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pctOfTarget >= 100 ? 'bg-emerald-500' : pctOfTarget >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, pctOfTarget)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9.5px] text-slate-500">
                <span>Buffer Health: {pctOfTarget}%</span>
                <span>{surplusDeficit >= 0 ? '✓ On Target' : '⚠️ Deficit Alert'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Raw Materials Value */}
          <div
            onClick={() => setActiveTab('RM')}
            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
              activeTab === 'RM' ? 'bg-blue-950/40 border-blue-500/60 shadow' : 'bg-[#070D1E] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-300 font-bold flex items-center gap-1">
                <span>🧪 Raw Materials Store</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {overview?.rawMaterialsSummary.skuCount || 0} SKUs
              </span>
            </div>
            <div className="my-1">
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                ₹{(overview?.rawMaterialsSummary.totalValue || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">
                Resin, Fiberglass, Gelcoat, Timber, Locks
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {overview && overview.rawMaterialsSummary.lowStockCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{overview.rawMaterialsSummary.lowStockCount} Low Stock</span>
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>All SKUs Safe</span>
                </span>
              )}
            </div>
          </div>

          {/* Card 3: WIP Stage Pipeline */}
          <div
            onClick={() => setActiveTab('WIP')}
            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
              activeTab === 'WIP' ? 'bg-cyan-950/40 border-cyan-500/60 shadow' : 'bg-[#070D1E] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <span>🏭 WIP Floor Pipeline</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {overview?.wipSummary.activeOrdersCount || 0} Batches
              </span>
            </div>
            <div className="my-1">
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                ₹{(overview?.wipSummary.totalValue || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">
                {overview?.wipSummary.totalDoorsInPipeline || 0} Doors across Mold, Cut, Paint, Pack
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-semibold">
              <span>View 5 Factory Stages</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 4: Finished Goods Buffer */}
          <div
            onClick={() => setActiveTab('FG')}
            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
              activeTab === 'FG' ? 'bg-emerald-950/40 border-emerald-500/60 shadow' : 'bg-[#070D1E] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <span>🚪 Finished Goods Buffer</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {overview?.finishedGoodsSummary.totalBufferDoors || 0} Total Doors
              </span>
            </div>
            <div className="my-1">
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                ₹{(overview?.finishedGoodsSummary.totalValue || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">
                {overview?.finishedGoodsSummary.availableDoors || 0} Ready for Dispatch ({overview?.finishedGoodsSummary.reservedDoors || 0} Reserved)
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {overview && overview.finishedGoodsSummary.deficitCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{overview.finishedGoodsSummary.deficitCount} Doors Below Target</span>
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Buffer Balanced</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION BANNER ────────────────────────────────────────── */}
      {notice && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow ${
            notice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 rounded hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── REORDER RECOMMENDATIONS (IF ANY DEFICITS EXIST) ─────────────── */}
      {overview && overview.reorderRecommendations.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>
                Inventory Replenishment Alerts ({overview.reorderRecommendations.length} Item{overview.reorderRecommendations.length === 1 ? '' : 's'} Below Target Safety Buffer)
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              Est. Restock Cost: ₹
              {overview.reorderRecommendations
                .reduce((s, r) => s + r.estimatedCost, 0)
                .toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {overview.reorderRecommendations.map((rec, idx) => (
              <div
                key={`${rec.itemId}-${rec.itemCode}-${idx}`}
                className="p-2 rounded-lg bg-[#070D1E] border border-amber-500/30 flex flex-col justify-between gap-1"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">{rec.itemCode}</span>
                    <span className="px-1 py-0.2 rounded font-bold text-[9px] bg-rose-950 text-rose-300 border border-rose-500/40">
                      {rec.urgency}
                    </span>
                  </div>
                  <div className="font-bold text-white truncate text-[11px]">{rec.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                    <span>Stock: <strong className="text-rose-300">{rec.currentStock}</strong> / {rec.targetStock} {rec.unit}</span>
                    <span className="font-mono font-bold text-amber-300">₹{rec.estimatedCost.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[9.5px] text-slate-400">Deficit: +{rec.suggestedReorderQty} {rec.unit}</span>
                  {rec.type === 'FINISHED_GOODS' ? (
                    <button
                      type="button"
                      disabled={replenishingFgId === rec.itemId}
                      onClick={() => {
                        const matchFg = finishedGoods.find((f) => f.id === rec.itemId || f.sku === rec.itemCode);
                        if (matchFg) handleReplenishFgBuffer(matchFg);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9.5px] cursor-pointer disabled:opacity-50"
                    >
                      {replenishingFgId === rec.itemId ? 'Ordering...' : '🔨 Replenish'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const matchRm = rawMaterials.find((r) => r.id === rec.itemId);
                        if (matchRm) {
                          setEditingRmItem(matchRm);
                          setRmAdjustmentQty(String(rec.suggestedReorderQty));
                          setRmAdjustmentReason('PO Inward Restock');
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9.5px] cursor-pointer"
                    >
                      Inward
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('RM')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'RM'
                ? 'bg-blue-600 text-white shadow ring-1 ring-blue-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>1. Raw Materials Store Ledger</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
              {rawMaterials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WIP')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'WIP'
                ? 'bg-cyan-600 text-white shadow ring-1 ring-cyan-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            <span>2. WIP Stage Stock</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
              {overview?.wipSummary.totalDoorsInPipeline || 0} Doors
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FG')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'FG'
                ? 'bg-emerald-600 text-white shadow ring-1 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>3. Finished Goods Buffer</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
              {overview?.finishedGoodsSummary.totalBufferDoors || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('READY_STOCK')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'READY_STOCK'
                ? 'bg-emerald-600 text-white shadow ring-1 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-amber-300" />
            <span>4. Ready &amp; Old Stock Doors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'CONFIG'
                ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>5. Target Settings</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: RAW MATERIALS STORE LEDGER ──────────────────────────── */}
      {activeTab === 'RM' && (
        <div className="space-y-2.5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0B132B] p-2.5 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search raw material name, item code, rack location..."
                  value={rmSearch}
                  onChange={(e) => setRmSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={rmCategoryFilter}
                onChange={(e) => setRmCategoryFilter(e.target.value)}
                className="bg-[#070D1E] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-bold cursor-pointer"
              >
                <option value="ALL">All Categories ({rawMaterials.length})</option>
                <option value="Chemicals">🧪 Chemicals &amp; Resins</option>
                <option value="Fiberglass">🧵 Fiberglass &amp; Reinforcements</option>
                <option value="Pigments">🎨 Pigments &amp; Pastes</option>
                <option value="Core & Structural">🪵 Core &amp; Structural</option>
                <option value="Hardware">🔐 Hardware &amp; Locks</option>
                <option value="Consumables">🧰 Shop Consumables</option>
              </select>

              <select
                value={rmStatusFilter}
                onChange={(e) => setRmStatusFilter(e.target.value as 'ALL' | 'LOW_STOCK')}
                className="bg-[#070D1E] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-bold cursor-pointer"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="LOW_STOCK">⚠️ Low Stock / Critical Only ({overview?.rawMaterialsSummary.lowStockCount || 0})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkStockModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                title="Bulk update physical stock count, inward consignments, rates & CSV import/export"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>⚡ Bulk Stock Update</span>
              </button>
              <button
                type="button"
                disabled={isSyncingAllToBoq}
                onClick={handleSyncAllToBoq}
                className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
                title="Synchronize live purchase rates from Stock Ledger into BOQ Formulas (Resin, Gelcoat, Catalyst, Accelerator, CSM, Foam, Wood, Pigments & Lock Boxes)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllToBoq ? 'animate-spin' : ''}`} />
                <span>{isSyncingAllToBoq ? 'Syncing BOQ...' : '⚡ Sync Prices to BOQ'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewRmDraft({
                    name: '',
                    category: 'Chemicals',
                    itemCode: '',
                    unit: 'KG',
                    currentStock: '0',
                    minSafetyBuffer: '50',
                    targetStock: '150',
                    unitCost: '180',
                    warehouseLocation: 'Chemical Bay 1',
                  });
                  setIsAddRmModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                title="Add new raw material to store inventory"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add New Stock</span>
              </button>
              <span className="text-[11px] text-slate-400 font-mono font-bold shrink-0 hidden md:inline">
                {filteredRawMaterials.length} of {rawMaterials.length} SKUs
              </span>
            </div>
          </div>

          {/* Raw Materials Table */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10.5px] uppercase font-bold tracking-wider">
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Raw Material Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Current Stock</th>
                    <th className="p-2.5 text-right">Safety Buffer</th>
                    <th className="p-2.5 text-right">Target Buffer</th>
                    <th className="p-2.5 text-right">Unit Rate</th>
                    <th className="p-2.5 text-right">Total Valuation</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredRawMaterials.map((rm, idx) => {
                    const isLow = rm.status === 'LOW_STOCK' || rm.status === 'CRITICAL';
                    return (
                      <tr
                        key={`${rm.id}-${rm.itemCode || idx}`}
                        className={`hover:bg-slate-900/40 transition ${
                          isLow ? 'bg-amber-950/15' : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono text-slate-400 text-[11px]">{rm.itemCode}</td>
                        <td className="p-2.5 font-bold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{rm.name}</span>
                            {isBoqMappedItem(rm.itemCode, rm.name) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300">
                                ⚡ BOQ Mapped
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{rm.warehouseLocation}</span>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {rm.category}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-sm text-white">
                          {rm.currentStock.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">{rm.unit}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-400 text-[11px]">
                          {rm.minSafetyBuffer} {rm.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-300 text-[11px]">
                          {rm.targetStock} {rm.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-300">
                          ₹{rm.unitCost.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-300">
                          ₹{Math.round(rm.currentStock * rm.unitCost).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              rm.status === 'IN_STOCK'
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/40'
                                : rm.status === 'LOW_STOCK'
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-600/40'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                            }`}
                          >
                            {rm.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFullEditRmItem(rm);
                                setEditRmDraft({
                                  name: rm.name,
                                  category: rm.category,
                                  unit: rm.unit,
                                  currentStock: String(rm.currentStock),
                                  minSafetyBuffer: String(rm.minSafetyBuffer),
                                  targetStock: String(rm.targetStock),
                                  unitCost: String(rm.unitCost),
                                  warehouseLocation: rm.warehouseLocation,
                                });
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                              title="Edit item name, rates, buffer & location"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRmItem(rm);
                                setRmAdjustmentQty('');
                                setRmAdjustmentReason('PO Inward Restock');
                              }}
                              className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-200 border border-blue-500/40 rounded text-[10px] font-bold cursor-pointer transition"
                              title="Inward / Add stock (+)"
                            >
                              + Inward
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setManualMinusRmItem(rm);
                                setManualMinusQty('');
                                setManualMinusReason('Floor Issue');
                                setManualMinusDept('Molding Gang');
                              }}
                              className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-200 border border-amber-500/40 rounded text-[10px] font-bold cursor-pointer transition"
                              title="Manual stock deduction (-)"
                            >
                              - Minus
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingRmItem(rm)}
                              className="p-1 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded text-[10px] font-bold cursor-pointer transition"
                              title="Delete unwanted demo item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: WIP STAGE-WISE FACTORY FLOOR STOCK ───────────────────── */}
      {activeTab === 'WIP' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200">
            <strong>Work-in-Progress (WIP) Live Stage Valuation:</strong> Tracks accrued inventory value across all 5 active production floor stages. Valuation includes both raw materials consumed and contractor piece-rate labor earned up to that stage.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {overview?.wipSummary.stages.map((stageItem, idx) => {
              const isExpanded = expandedWipStage === stageItem.stage;
              return (
                <div
                  key={stageItem.stage}
                  className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="font-extrabold text-white text-xs truncate">
                        {stageItem.stageLabel}
                      </span>
                      <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9.5px] bg-slate-800 text-cyan-300">
                        Stage {idx + 1}
                      </span>
                    </div>

                    <div className="my-2.5 space-y-1">
                      <div className="text-xl font-mono font-black text-cyan-300">
                        {stageItem.doorCount}{' '}
                        <span className="text-xs text-slate-400 font-sans font-bold">Doors</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-white">
                        ₹{stageItem.totalAccruedValuation.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total Area: {stageItem.totalSqFt} Sq.Ft ({stageItem.orderCount} Orders)
                      </div>
                    </div>

                    <div className="text-[9.5px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-800/80">
                      <div className="flex justify-between">
                        <span>Materials Accrued:</span>
                        <span className="font-mono text-slate-300">₹{stageItem.rawMaterialValue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contractor Labor:</span>
                        <span className="font-mono text-slate-300">₹{stageItem.contractorLaborValue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setExpandedWipStage(isExpanded ? null : stageItem.stage)}
                      className="w-full py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Batches' : `View ${stageItem.orders.length} Batches`}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                        {stageItem.orders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-1.5 rounded bg-slate-950/80 border border-slate-800 text-[9.5px]"
                          >
                            <div className="flex justify-between font-bold text-white">
                              <span className="font-mono text-cyan-300">{ord.jobCardNumber}</span>
                              <span>{ord.doorsCount} Doors</span>
                            </div>
                            <div className="text-slate-400 truncate">{ord.customerName}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rework Station & Quality Rectification */}
          <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-4 shadow space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>🛠️ Rework Station &amp; Quality Rectification</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tracks doors undergoing quality defect rectification, reasons, and cumulative extra rework materials consumed.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Rework Cost</div>
                  <div className="text-sm font-mono font-black text-rose-400">
                    ₹{(overview?.wipSummary.reworkStation?.totalReworkCost || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const firstOrder = overview?.wipSummary.stages[0]?.orders[0];
                    setReworkOrderId(firstOrder?.id || '');
                    setReworkJobCard(firstOrder?.jobCardNumber || '');
                    setReworkCustomerName(firstOrder?.customerName || '');
                    setReworkReasonInput('Surface Defect Correction');
                    setReworkMaterialName('UV-Stabilized PU Gelcoat (White / Clear)');
                    setReworkMaterialQty('2');
                    setReworkMaterialUnit('KG');
                    setReworkMaterialRate('320');
                    setIsReworkModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-black text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>+ Issue Rework Material</span>
                </button>
              </div>
            </div>

            {(!overview?.wipSummary.reworkStation?.items || overview.wipSummary.reworkStation.items.length === 0) ? (
              <div className="p-4 rounded-lg bg-[#070D1E] border border-slate-800 text-center text-xs text-slate-400">
                <span className="text-emerald-400 font-bold">✓ Zero Rework Backlog:</span> No doors currently reported under defect rectification. Floor quality is 100% on track!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {overview.wipSummary.reworkStation.items.map((item, idx) => (
                  <div
                    key={`${item.orderId}-${idx}`}
                    className="p-3 rounded-xl bg-[#070D1E] border border-amber-500/30 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-cyan-300 font-bold">{item.jobCardNumber}</span>
                        {item.doorNumber && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/40 font-bold text-[10px]">
                            Door {item.doorNumber}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-white text-xs truncate mt-0.5">{item.customerName}</div>
                      <div className="text-[11px] text-amber-200 mt-1 flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{item.reworkReason}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Defect: <strong>{item.defectType}</strong> {item.gangName ? `• Gang: ${item.gangName}` : ''}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[9.5px] text-slate-500">
                        Reported: {item.reportedAt ? new Date(item.reportedAt).toLocaleDateString('en-IN') : 'Recent'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReworkOrderId(item.orderId);
                          setReworkJobCard(item.jobCardNumber);
                          setReworkCustomerName(item.customerName);
                          setReworkReasonInput(`Rectification for ${item.reworkReason}`);
                          setIsReworkModalOpen(true);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Issue Material
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: FINISHED GOODS BUFFER REGISTRY ───────────────────────── */}
      {activeTab === 'FG' && (
        <div className="space-y-2.5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0B132B] p-2.5 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search standard door models, sizes (210x80), colors..."
                value={fgSearch}
                onChange={(e) => setFgSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="text-[11px] text-slate-300 flex items-center gap-3">
              <span>
                Total Buffer: <strong>{overview?.finishedGoodsSummary.totalBufferDoors || 0} Doors</strong> (₹
                {(overview?.finishedGoodsSummary.totalValue || 0).toLocaleString('en-IN')})
              </span>
              <span className="text-emerald-400 font-bold">
                ✓ Available: {overview?.finishedGoodsSummary.availableDoors || 0} Doors
              </span>
            </div>
          </div>

          {/* Finished Goods Table */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10.5px] uppercase font-bold tracking-wider">
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Standard FRP Door Model</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Finish Color</th>
                    <th className="p-2.5 text-right">Physical Balance</th>
                    <th className="p-2.5 text-right">Reserved</th>
                    <th className="p-2.5 text-right">Available</th>
                    <th className="p-2.5 text-right">Target Buffer</th>
                    <th className="p-2.5 text-right">Unit Value</th>
                    <th className="p-2.5 text-right">Total Value</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredFinishedGoods.map((fg) => {
                    const isDeficit = fg.deficitCount > 0;
                    return (
                      <tr
                        key={fg.id}
                        className={`hover:bg-slate-900/40 transition ${
                          isDeficit ? 'bg-rose-950/15' : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono text-slate-400 text-[11px]">{fg.sku}</td>
                        <td className="p-2.5 font-bold text-white">
                          <div>{fg.modelName}</div>
                          <span className="text-[10px] text-slate-500 font-mono">{fg.modelCode} ({fg.category})</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-300">{fg.sizeLabel}</td>
                        <td className="p-2.5 text-slate-300">{fg.finishColor}</td>
                        <td className="p-2.5 text-right font-mono font-black text-sm text-white">
                          {fg.currentBalance} Doors
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-300">{fg.reservedCount}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-300 text-sm">
                          {fg.availableBalance}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-300">{fg.minBufferTarget}</td>
                        <td className="p-2.5 text-right font-mono text-slate-300">
                          ₹{fg.unitValuation.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-300">
                          ₹{fg.totalValuation.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              fg.status === 'HEALTHY'
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/40'
                                : fg.status === 'LOW_BUFFER'
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-600/40'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                            }`}
                          >
                            {fg.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-1">
                          {fg.deficitCount > 0 && (
                            <button
                              type="button"
                              disabled={replenishingFgId === fg.id}
                              onClick={() => handleReplenishFgBuffer(fg)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer transition shadow disabled:opacity-50"
                              title="Create internal production Job Card to replenish standard buffer doors"
                            >
                              {replenishingFgId === fg.id ? 'Ordering...' : `🔨 Replenish (+${fg.deficitCount})`}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFgItem(fg);
                              setFgAdjustmentQty('');
                              setFgAdjustmentReason('Physical FG Count');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold cursor-pointer transition"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: READY & OLD STOCK DOORS ─────────────────────────────── */}
      {activeTab === 'READY_STOCK' && <ReadyStockDoorsTab />}

      {/* ── TAB 4: CONFIGURATION & BUFFER SETTINGS ─────────────────────── */}
      {activeTab === 'CONFIG' && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-4 max-w-2xl mx-auto space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Company Consistent Stock Target Policy</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Set the persistent inventory baseline amount that the company must consistently maintain across Raw Materials, WIP, and Finished Goods.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Consistent Target Inventory Valuation (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min={100000}
                  step={50000}
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#070D1E] border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-none focus:border-amber-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Current Draft: <strong>₹{Number(targetDraft || 0).toLocaleString('en-IN')}</strong> (₹{(Number(targetDraft || 0) / 100000).toFixed(2)} Lakhs)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                <input
                  type="checkbox"
                  checked={autoDeductDraft}
                  onChange={(e) => setAutoDeductDraft(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span>Automatically Deduct Raw Materials on Store BOQ Issue</span>
              </label>
              <p className="text-[10.5px] text-slate-400 pl-6">
                When enabled, issuing chemicals, fiberglass, and locks from Store Requisition Hub automatically decrements live raw material stock in the store ledger.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('RM')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Save Consistent Target Baseline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADJUST RAW MATERIAL STOCK ───────────────────────────── */}
      {editingRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B132B] border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-white">Adjust Raw Material Stock</h4>
                <p className="text-[10.5px] text-slate-400 font-mono">
                  {editingRmItem.itemCode} — {editingRmItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRmItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-slate-400 font-sans">Current Live Store Stock:</span>
                <span className="font-bold text-white text-sm">
                  {editingRmItem.currentStock} {editingRmItem.unit}
                </span>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Quantity to Add (+) or Deduct (-) in {editingRmItem.unit}:
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 50 to add, or -20 to deduct"
                  value={rmAdjustmentQty}
                  onChange={(e) => setRmAdjustmentQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">Audit Reason / Note:</label>
                <input
                  type="text"
                  value={rmAdjustmentReason}
                  onChange={(e) => setRmAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingRmItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRm}
                onClick={handleSaveRmAdjustment}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black disabled:opacity-50"
              >
                {isSubmittingRm ? 'Saving...' : 'Confirm Stock Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADJUST FINISHED GOODS STOCK ──────────────────────────── */}
      {editingFgItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B132B] border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-white">Adjust Finished Goods Buffer</h4>
                <p className="text-[10.5px] text-slate-400 font-mono">
                  {editingFgItem.sku} — {editingFgItem.modelName} ({editingFgItem.sizeLabel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFgItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-slate-400 font-sans">Physical Balance:</span>
                <span className="font-bold text-white text-sm">
                  {editingFgItem.currentBalance} Doors
                </span>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Quantity to Add (+) or Deduct (-) in Doors:
                </label>
                <input
                  type="number"
                  step={1}
                  placeholder="e.g. 5 to add, or -2 to deduct"
                  value={fgAdjustmentQty}
                  onChange={(e) => setFgAdjustmentQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">Audit Reason / Note:</label>
                <input
                  type="text"
                  value={fgAdjustmentReason}
                  onChange={(e) => setFgAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingFgItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingFg}
                onClick={handleSaveFgAdjustment}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black disabled:opacity-50"
              >
                {isSubmittingFg ? 'Saving...' : 'Confirm FG Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK RAW MATERIAL STOCK & AUDIT RECONCILIATION MODAL ──────── */}
      <BulkRawMaterialStockModal
        isOpen={isBulkStockModalOpen}
        onClose={() => setIsBulkStockModalOpen(false)}
        rawMaterials={rawMaterials}
        onSuccess={(msg) => {
          setNotice({ type: 'success', text: msg });
          loadStockData();
        }}
      />

      {/* ── MODAL 1: ADD NEW RAW MATERIAL ITEM ───────────────────────────── */}
      {isAddRmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B132B] border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add New Raw Material</span>
                </h4>
                <p className="text-[10.5px] text-slate-400">
                  Register a new factory stock item with pricing, safety buffer and warehouse location.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRmModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRawMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Raw Material Item Name <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Isophthalic Resin 200L, SS 304 Hinges, Pure White Gelcoat..."
                  value={newRmDraft.name}
                  onChange={(e) => setNewRmDraft({ ...newRmDraft, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Category:</label>
                  <select
                    value={newRmDraft.category}
                    onChange={(e) =>
                      setNewRmDraft({ ...newRmDraft, category: e.target.value as RawMaterialCategory })
                    }
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs cursor-pointer"
                  >
                    <option value="Chemicals">🧪 Chemicals &amp; Resins</option>
                    <option value="Fiberglass">🧵 Fiberglass &amp; Reinforcements</option>
                    <option value="Pigments">🎨 Pigments &amp; Pastes</option>
                    <option value="Core & Structural">🪵 Core &amp; Structural</option>
                    <option value="Hardware">🔐 Hardware &amp; Locks</option>
                    <option value="Consumables">🧰 Shop Consumables</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">
                    Custom Item Code (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank (e.g. RAW-CHM-101)"
                    value={newRmDraft.itemCode}
                    onChange={(e) => setNewRmDraft({ ...newRmDraft, itemCode: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Unit:</label>
                  <select
                    value={newRmDraft.unit}
                    onChange={(e) => setNewRmDraft({ ...newRmDraft, unit: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs"
                  >
                    <option value="KG">KG</option>
                    <option value="Ltrs">Ltrs</option>
                    <option value="Sets">Sets</option>
                    <option value="Pairs">Pairs</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Mtrs">Mtrs</option>
                    <option value="Rft">Rft</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Opening Stock:</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={newRmDraft.currentStock}
                    onChange={(e) => setNewRmDraft({ ...newRmDraft, currentStock: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Unit Rate (₹):</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={newRmDraft.unitCost}
                    onChange={(e) => setNewRmDraft({ ...newRmDraft, unitCost: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">
                    Min Safety Buffer ({newRmDraft.unit}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newRmDraft.minSafetyBuffer}
                    onChange={(e) => setNewRmDraft({ ...newRmDraft, minSafetyBuffer: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">
                    Target Buffer ({newRmDraft.unit}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newRmDraft.targetStock}
                    onChange={(e) => setNewRmDraft({ ...newRmDraft, targetStock: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Warehouse Location / Bay:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Bay 1, Fiber Bay 2, Tinting Shed..."
                  value={newRmDraft.warehouseLocation}
                  onChange={(e) => setNewRmDraft({ ...newRmDraft, warehouseLocation: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRmModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewRm}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingNewRm ? 'Adding...' : 'Save Stock Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FULL EDIT RAW MATERIAL ─────────────────────────────── */}
      {fullEditRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B132B] border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit Raw Material</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 font-mono">
                  {fullEditRmItem.itemCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFullEditRmItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRawMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Raw Material Item Name <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={editRmDraft.name}
                  onChange={(e) => setEditRmDraft({ ...editRmDraft, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Category:</label>
                  <select
                    value={editRmDraft.category}
                    onChange={(e) =>
                      setEditRmDraft({ ...editRmDraft, category: e.target.value as RawMaterialCategory })
                    }
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs cursor-pointer"
                  >
                    <option value="Chemicals">🧪 Chemicals &amp; Resins</option>
                    <option value="Fiberglass">🧵 Fiberglass &amp; Reinforcements</option>
                    <option value="Pigments">🎨 Pigments &amp; Pastes</option>
                    <option value="Core & Structural">🪵 Core &amp; Structural</option>
                    <option value="Hardware">🔐 Hardware &amp; Locks</option>
                    <option value="Consumables">🧰 Shop Consumables</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Unit:</label>
                  <select
                    value={editRmDraft.unit}
                    onChange={(e) => setEditRmDraft({ ...editRmDraft, unit: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs"
                  >
                    <option value="KG">KG</option>
                    <option value="Ltrs">Ltrs</option>
                    <option value="Sets">Sets</option>
                    <option value="Pairs">Pairs</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Mtrs">Mtrs</option>
                    <option value="Rft">Rft</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">
                    Current Physical Stock ({editRmDraft.unit}):
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={editRmDraft.currentStock}
                    onChange={(e) => setEditRmDraft({ ...editRmDraft, currentStock: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Unit Rate (₹):</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={editRmDraft.unitCost}
                    onChange={(e) => setEditRmDraft({ ...editRmDraft, unitCost: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">
                    Safety Buffer ({editRmDraft.unit}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editRmDraft.minSafetyBuffer}
                    onChange={(e) => setEditRmDraft({ ...editRmDraft, minSafetyBuffer: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">
                    Target Stock ({editRmDraft.unit}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editRmDraft.targetStock}
                    onChange={(e) => setEditRmDraft({ ...editRmDraft, targetStock: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Warehouse Location / Bay:
                </label>
                <input
                  type="text"
                  value={editRmDraft.warehouseLocation}
                  onChange={(e) => setEditRmDraft({ ...editRmDraft, warehouseLocation: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFullEditRmItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditRm}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black shadow disabled:opacity-50"
                >
                  {isSubmittingEditRm ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DELETE RAW MATERIAL (DEMO ITEM CLEANUP) ────────────── */}
      {deletingRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B132B] border border-rose-500/50 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-black text-rose-400 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Stock Item</span>
              </h4>
              <button
                type="button"
                onClick={() => setDeletingRmItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2 text-xs">
              <p className="text-slate-200">
                Are you sure you want to remove <strong>{deletingRmItem.name}</strong> (
                <span className="font-mono text-rose-300">{deletingRmItem.itemCode}</span>) from the store inventory?
              </p>
              <p className="text-[11px] text-slate-400">
                Current store balance: <strong>{deletingRmItem.currentStock} {deletingRmItem.unit}</strong>. Once deleted, this item will not be restored or re-seeded automatically.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeletingRmItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDeleteRm}
                onClick={handleDeleteRawMaterial}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black shadow disabled:opacity-50"
              >
                {isSubmittingDeleteRm ? 'Deleting...' : 'Yes, Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: MANUAL STOCK-OUT (- MINUS) ─────────────────────────── */}
      {manualMinusRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B132B] border border-amber-500/50 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <Minus className="w-4 h-4 text-amber-400" />
                  <span>Manual Stock-Out / Issue</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 font-mono">
                  {manualMinusRmItem.itemCode} — {manualMinusRmItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualMinusRmItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualStockOut} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-slate-400 font-sans">Current Store Balance:</span>
                <span className="font-bold text-white text-sm">
                  {manualMinusRmItem.currentStock} {manualMinusRmItem.unit}
                </span>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Quantity to Deduct in {manualMinusRmItem.unit} <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  max={manualMinusRmItem.currentStock || undefined}
                  required
                  placeholder={`e.g. 10 ${manualMinusRmItem.unit}`}
                  value={manualMinusQty}
                  onChange={(e) => setManualMinusQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Department / Gang:</label>
                  <select
                    value={manualMinusDept}
                    onChange={(e) => setManualMinusDept(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs"
                  >
                    <option value="Molding Gang">Molding Gang</option>
                    <option value="Cutting Bay">Cutting Bay</option>
                    <option value="Paint Section">Paint Section</option>
                    <option value="Packing Team">Packing Team</option>
                    <option value="Store Audit">Store Audit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Deduction Reason:</label>
                  <select
                    value={manualMinusReason}
                    onChange={(e) => setManualMinusReason(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs"
                  >
                    <option value="Floor Issue">Direct Floor Issue</option>
                    <option value="Scrap / Wastage">Scrap / Wastage</option>
                    <option value="Damaged Material">Damaged Material</option>
                    <option value="QC Rejection">QC Rejection</option>
                    <option value="Trial Layup">Trial Layup / Testing</option>
                    <option value="Physical Audit Correction">Audit Correction</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualMinusRmItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMinusRm}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-black shadow disabled:opacity-50"
                >
                  {isSubmittingMinusRm ? 'Deducting...' : 'Confirm Deduction (-)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: ISSUE REWORK MATERIAL ──────────────────────────────── */}
      {isReworkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B132B] border border-amber-500/60 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <Hammer className="w-4 h-4 text-amber-400" />
                  <span>Issue Rework Material</span>
                </h4>
                <p className="text-[10.5px] text-slate-400">
                  Issues extra chemicals/hardware for defect correction and logs direct rework cost to the order profit ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReworkModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueReworkMaterial} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Job Card Number:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXM-2026-001"
                    value={reworkJobCard}
                    onChange={(e) => {
                      setReworkJobCard(e.target.value);
                      if (!reworkOrderId) setReworkOrderId(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] text-slate-400 mb-1">Customer / Party Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Sreejith Builders"
                    value={reworkCustomerName}
                    onChange={(e) => setReworkCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 mb-1">
                  Defect / Rework Reason <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pinholes on outer face, Hinge rebate edge repair, Extra Gelcoat spray..."
                  value={reworkReasonInput}
                  onChange={(e) => setReworkReasonInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="font-bold text-white text-xs flex justify-between">
                  <span>Material to Issue from Store:</span>
                  <span className="font-mono text-amber-300">
                    Est. Cost: ₹{Math.round((Number(reworkMaterialQty) || 0) * (Number(reworkMaterialRate) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Select Raw Material:</label>
                  <select
                    value={reworkMaterialName}
                    onChange={(e) => {
                      const selected = rawMaterials.find((rm) => rm.name === e.target.value);
                      setReworkMaterialName(e.target.value);
                      if (selected) {
                        setReworkMaterialUnit(selected.unit);
                        setReworkMaterialRate(String(selected.unitCost));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-bold text-xs cursor-pointer"
                  >
                    {rawMaterials.map((rm, idx) => (
                      <option key={`${rm.id}-${rm.itemCode || idx}`} value={rm.name}>
                        {rm.name} ({rm.currentStock} {rm.unit} in store @ ₹{rm.unitCost}/{rm.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Qty to Issue:</label>
                    <input
                      type="number"
                      step="any"
                      min={0.1}
                      required
                      value={reworkMaterialQty}
                      onChange={(e) => setReworkMaterialQty(e.target.value)}
                      className="w-full px-2 py-1 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Unit:</label>
                    <input
                      type="text"
                      readOnly
                      value={reworkMaterialUnit}
                      className="w-full px-2 py-1 bg-[#070D1E] border border-slate-700 rounded-lg text-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Rate (₹):</label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={reworkMaterialRate}
                      onChange={(e) => setReworkMaterialRate(e.target.value)}
                      className="w-full px-2 py-1 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[10.5px] text-amber-200">
                <strong>Accounting Note:</strong> This material will be immediately deducted from the store ledger and posted to Job Card <strong className="font-mono text-white">{reworkJobCard || reworkOrderId}</strong> as direct rework expense (<code className="text-rose-300">reworkCost</code>).
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReworkModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRework}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-black shadow disabled:opacity-50"
                >
                  {isSubmittingRework ? 'Issuing...' : 'Confirm Rework Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
