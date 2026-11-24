'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Layers,
  DoorOpen,
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Paintbrush,
  DollarSign,
  Tag,
  X,
  RefreshCw,
  Printer,
  Undo2,
  User,
  Ruler,
} from 'lucide-react';
import type {
  ReadyStockDoor,
  StockItemType,
  StockDoorStatus,
  StockCondition,
  CreateReadyStockDoorInput,
} from '@/lib/services/readyStockDoorService';
import {
  computeDoorTolerances,
  AppliedDoorTolerances,
  FloorCondition,
} from '@/lib/services/toleranceCalculation';
import { StockDoorStickerModal } from './StockDoorStickerModal';
import { ReturnDoorToStockModal } from './ReturnDoorToStockModal';

export function ReadyStockDoorsTab() {
  const [items, setItems] = useState<ReadyStockDoor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sticker Modal state
  const [isStickerModalOpen, setIsStickerModalOpen] = useState<boolean>(false);
  const [stickerDoors, setStickerDoors] = useState<ReadyStockDoor[]>([]);
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ReadyStockDoor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form draft state
  const [draftType, setDraftType] = useState<StockItemType>('DOOR_AND_FRAME');
  const [doorModel, setDoorModel] = useState<string>('32mm Molded Teak FRP Door');
  const [doorCategory, setDoorCategory] = useState<'FRP_DOORS' | 'WPC_DOORS'>('FRP_DOORS');
  const [doorHeightMm, setDoorHeightMm] = useState<string>('2085');
  const [doorWidthMm, setDoorWidthMm] = useState<string>('815');
  const [doorThicknessMm, setDoorThicknessMm] = useState<string>('32');
  const [doorColor, setDoorColor] = useState<string>('Frost White');
  const [isDoorRepaintable, setIsDoorRepaintable] = useState<boolean>(true);
  const [handing, setHanding] = useState<'LH' | 'RH' | 'UNIVERSAL'>('UNIVERSAL');

  const [frameType, setFrameType] = useState<string>('WPC Solid Extruded 100×65mm');
  const [frameHeightMm, setFrameHeightMm] = useState<string>('2100');
  const [frameWidthMm, setFrameWidthMm] = useState<string>('900');
  const [frameWallThk, setFrameWallThk] = useState<string>('100mm');
  const [frameColor, setFrameColor] = useState<string>('Frost White');

  const [quantity, setQuantity] = useState<string>('1');
  const [rackLocation, setRackLocation] = useState<string>('Godown Bay 2 / Rack A');
  const [condition, setCondition] = useState<StockCondition>('OLD_STOCK');
  const [sellingPrice, setSellingPrice] = useState<string>('7500');
  const [notes, setNotes] = useState<string>('');

  // Frame Opening Measurement Live Auto-Calculation state
  const [autoCalculateFromFrame, setAutoCalculateFromFrame] = useState<boolean>(false);
  const [calcFrameHeightMm, setCalcFrameHeightMm] = useState<string>('2100');
  const [calcFrameWidthMm, setCalcFrameWidthMm] = useState<string>('900');
  const [calcFrameProfile, setCalcFrameProfile] = useState<string>('Regular Factory Frame 70×45mm');
  const [calcFloorCondition, setCalcFloorCondition] = useState<FloorCondition>('FINISHED_TILE');
  const [calcResult, setCalcResult] = useState<AppliedDoorTolerances | null>(null);
  const [customFrames, setCustomFrames] = useState<any[]>([]);

  // Return Delivered Door modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);

  // Sell Stock Door modal state
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [sellingDoor, setSellingDoor] = useState<ReadyStockDoor | null>(null);
  const [sellCustomerName, setSellCustomerName] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('7500');
  const [sellSalespersonId, setSellSalespersonId] = useState<string>('');
  const [sellNotes, setSellNotes] = useState<string>('');
  const [isSelling, setIsSelling] = useState<boolean>(false);
  const [salesStaff, setSalesStaff] = useState<Array<{ id: string; code: string; name: string }>>([]);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stock-doors');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch {
      notify('Failed to load stock doors.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load active sales staff for quota leaderboard attribution
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch('/api/sales/targets?leaderboard=false');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.targets) {
            const list = json.data.targets.map((t: { employeeId: string; employeeCode: string; employeeName: string }) => ({
              id: t.employeeId,
              code: t.employeeCode,
              name: t.employeeName,
            }));
            setSalesStaff(list);
            if (list.length > 0) setSellSalespersonId(list[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load sales staff:', err);
      }

      try {
        const frameRes = await fetch('/api/settings/frames');
        if (frameRes.ok) {
          const frameJson = await frameRes.json();
          if (frameJson.success && Array.isArray(frameJson.data)) {
            setCustomFrames(frameJson.data);
            if (frameJson.data.length > 0 && !calcFrameProfile) {
              setCalcFrameProfile(frameJson.data[0].name);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load custom frames:', err);
      }
    }
    loadStaff();
  }, []);

  // Live tolerance & deduction auto-calculation from frame opening measurements
  useEffect(() => {
    if (!autoCalculateFromFrame) return;
    const h = Number(calcFrameHeightMm);
    const w = Number(calcFrameWidthMm);
    if (!h || !w || h <= 0 || w <= 0) {
      setCalcResult(null);
      return;
    }

    try {
      const matched = customFrames.find((f) => f.name === calcFrameProfile || f.id === calcFrameProfile);
      const computed = computeDoorTolerances({
        rawHeightMm: h,
        rawWidthTopMm: w,
        frameTypeName: calcFrameProfile,
        frameProfile: matched,
        rebateDepthMm: matched?.rebateDepthMm,
        frameHDeductionMm: matched?.hDeductionCm ? Math.round(matched.hDeductionCm * 10) : undefined,
        frameWDeductionMm: matched?.wDeductionCm ? Math.round(matched.wDeductionCm * 10) : undefined,
        floorCondition: calcFloorCondition,
      });

      setCalcResult(computed);
      setDoorHeightMm(String(computed.shutterHeightMm));
      setDoorWidthMm(String(computed.effectiveShutterWidthMm));

      if (draftType === 'DOOR_AND_FRAME') {
        setFrameHeightMm(calcFrameHeightMm);
        setFrameWidthMm(calcFrameWidthMm);
        setFrameType(calcFrameProfile);
      }
    } catch (err) {
      console.error('Error auto-calculating door tolerance:', err);
    }
  }, [autoCalculateFromFrame, calcFrameHeightMm, calcFrameWidthMm, calcFrameProfile, calcFloorCondition, draftType]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setDraftType('DOOR_AND_FRAME');
    setDoorModel('32mm Molded Teak FRP Door');
    setDoorCategory('FRP_DOORS');
    setDoorHeightMm('2085');
    setDoorWidthMm('815');
    setDoorThicknessMm('32');
    setDoorColor('Frost White');
    setIsDoorRepaintable(true);
    setHanding('UNIVERSAL');
    setFrameType('WPC Solid Extruded 100×65mm');
    setFrameHeightMm('2100');
    setFrameWidthMm('900');
    setFrameWallThk('100mm');
    setFrameColor('Frost White');
    setQuantity('1');
    setRackLocation('Godown Bay 2 / Rack A');
    setCondition('OLD_STOCK');
    setSellingPrice('7500');
    setNotes('');

    // Reset frame calculation state
    setAutoCalculateFromFrame(false);
    setCalcFrameHeightMm('2100');
    setCalcFrameWidthMm('900');
    setCalcFrameProfile('Regular Factory Frame 70×45mm');
    setCalcFloorCondition('FINISHED_TILE');
    setCalcResult(null);

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ReadyStockDoor) => {
    setEditingItem(item);
    setDraftType(item.itemType);
    setDoorModel(item.doorModelName || '32mm Molded Teak FRP Door');
    setDoorCategory(item.doorCategory || 'FRP_DOORS');
    setDoorHeightMm(item.doorHeightMm ? String(item.doorHeightMm) : '');
    setDoorWidthMm(item.doorWidthMm ? String(item.doorWidthMm) : '');
    setDoorThicknessMm(item.doorThicknessMm ? String(item.doorThicknessMm) : '32');
    setDoorColor(item.doorFinishColor || 'Natural Teak');
    setIsDoorRepaintable(item.isDoorRepaintable !== false);
    setHanding(item.handing || 'UNIVERSAL');
    setFrameType(item.frameTypeName || 'WPC Solid Extruded 100×65mm');
    setFrameHeightMm(item.frameHeightMm ? String(item.frameHeightMm) : '');
    setFrameWidthMm(item.frameWidthMm ? String(item.frameWidthMm) : '');
    setFrameWallThk(item.frameWallThickness || '100mm');
    setFrameColor(item.frameFinishColor || 'Natural Teak');
    setQuantity(String(item.quantity || 1));
    setRackLocation(item.rackLocation || 'Godown Bay 1');
    setCondition(item.condition || 'OLD_STOCK');
    setSellingPrice(String(item.sellingPrice || 6500));
    setNotes(item.notes || '');

    // Initialize frame calculation state from item if present
    setAutoCalculateFromFrame(Boolean(item.frameOpeningHeightMm && item.frameOpeningWidthMm));
    setCalcFrameHeightMm(
      item.frameOpeningHeightMm
        ? String(item.frameOpeningHeightMm)
        : item.frameHeightMm
        ? String(item.frameHeightMm)
        : '2100'
    );
    setCalcFrameWidthMm(
      item.frameOpeningWidthMm
        ? String(item.frameOpeningWidthMm)
        : item.frameWidthMm
        ? String(item.frameWidthMm)
        : '900'
    );
    setCalcFrameProfile(item.frameProfile || item.frameTypeName || 'Regular Factory Frame 70×45mm');
    setCalcFloorCondition((item.floorCondition as FloorCondition) || 'FINISHED_TILE');
    setCalcResult(null);

    setIsModalOpen(true);
  };

  const handleOpenSellModal = (item: ReadyStockDoor) => {
    setSellingDoor(item);
    setSellCustomerName(item.reservedForCustomer || '');
    setSellPrice(String(item.sellingPrice || 6500));
    setSellNotes('');
    if (salesStaff.length > 0 && !sellSalespersonId) {
      setSellSalespersonId(salesStaff[0].id);
    }
    setIsSellModalOpen(true);
  };

  const handleConfirmSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingDoor) return;
    if (!sellCustomerName.trim()) {
      notify('Customer name is required.');
      return;
    }

    setIsSelling(true);
    const chosenRep = salesStaff.find((s) => s.id === sellSalespersonId);

    try {
      const res = await fetch('/api/stock-doors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELL',
          id: sellingDoor.id,
          salePrice: Number(sellPrice) || sellingDoor.sellingPrice,
          customerName: sellCustomerName.trim(),
          salespersonId: chosenRep?.id,
          salespersonCode: chosenRep?.code,
          salespersonName: chosenRep?.name,
          notes: sellNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setItems((prev) => prev.map((d) => (d.id === sellingDoor.id ? json.data : d)));
        const repName = chosenRep ? chosenRep.name : 'Direct Sales';
        notify(
          `🎉 Door ${json.data.stockCode} sold! Leaderboard updated for ${repName} (+${json.data.quantity || 1} Door, +₹${Number(sellPrice).toLocaleString('en-IN')})`
        );
        setIsSellModalOpen(false);
      } else {
        notify(json.error || 'Failed to sell door');
      }
    } catch {
      notify('Network error processing door sale.');
    } finally {
      setIsSelling(false);
    }
  };

  const handleSaveStockDoor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CreateReadyStockDoorInput = {
        itemType: draftType,
        doorModelName: draftType !== 'FRAME_ONLY' ? doorModel : undefined,
        doorCategory: draftType !== 'FRAME_ONLY' ? doorCategory : undefined,
        doorHeightMm: draftType !== 'FRAME_ONLY' && doorHeightMm ? Number(doorHeightMm) : undefined,
        doorWidthMm: draftType !== 'FRAME_ONLY' && doorWidthMm ? Number(doorWidthMm) : undefined,
        doorThicknessMm: draftType !== 'FRAME_ONLY' && doorThicknessMm ? Number(doorThicknessMm) : 32,
        doorFinishColor: draftType !== 'FRAME_ONLY' ? doorColor : undefined,
        isDoorRepaintable: draftType !== 'FRAME_ONLY' ? isDoorRepaintable : undefined,
        handing: draftType !== 'FRAME_ONLY' ? handing : undefined,

        frameTypeName: draftType !== 'DOOR_ONLY' ? frameType : undefined,
        frameHeightMm: draftType !== 'DOOR_ONLY' && frameHeightMm ? Number(frameHeightMm) : undefined,
        frameWidthMm: draftType !== 'DOOR_ONLY' && frameWidthMm ? Number(frameWidthMm) : undefined,
        frameWallThickness: draftType !== 'DOOR_ONLY' ? frameWallThk : undefined,
        frameFinishColor: draftType !== 'DOOR_ONLY' ? frameColor : undefined,

        quantity: Math.max(1, Number(quantity) || 1),
        rackLocation,
        condition,
        sellingPrice: Number(sellingPrice) || 6500,
        notes,

        frameOpeningHeightMm: autoCalculateFromFrame && calcFrameHeightMm ? Number(calcFrameHeightMm) : undefined,
        frameOpeningWidthMm: autoCalculateFromFrame && calcFrameWidthMm ? Number(calcFrameWidthMm) : undefined,
        frameProfile: autoCalculateFromFrame ? calcFrameProfile : undefined,
        floorCondition: autoCalculateFromFrame ? calcFloorCondition : undefined,
      };

      if (editingItem) {
        const res = await fetch('/api/stock-doors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setItems((prev) => prev.map((d) => (d.id === editingItem.id ? json.data : d)));
          notify(`Updated stock item ${json.data.stockCode}`);
          setIsModalOpen(false);
        } else {
          notify(json.error || 'Failed to update stock door');
        }
      } else {
        const res = await fetch('/api/stock-doors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setItems((prev) => [json.data, ...prev]);
          notify(`Added stock item ${json.data.stockCode}`);
          setIsModalOpen(false);
        } else {
          notify(json.error || 'Failed to create stock door');
        }
      }
    } catch {
      notify('Network error saving stock door.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this door/frame from stock?')) return;
    try {
      const res = await fetch(`/api/stock-doors?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((d) => d.id !== id));
        notify('Removed from stock.');
      } else {
        notify('Failed to delete item.');
      }
    } catch {
      notify('Network error deleting item.');
    }
  };

  const handleOpenStickerForSingle = (door: ReadyStockDoor) => {
    setStickerDoors([door]);
    setIsStickerModalOpen(true);
  };

  const handleOpenStickerForSelected = () => {
    const selected = items.filter((d) => selectedDoorIds.includes(d.id));
    if (selected.length === 0) return;
    setStickerDoors(selected);
    setIsStickerModalOpen(true);
  };

  const toggleSelectDoor = (id: string) => {
    setSelectedDoorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDoorIds.length === filtered.length && filtered.length > 0) {
      setSelectedDoorIds([]);
    } else {
      setSelectedDoorIds(filtered.map((d) => d.id));
    }
  };

  // Filter items
  const filtered = items.filter((d) => {
    if (typeFilter !== 'ALL' && d.itemType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (conditionFilter !== 'ALL' && d.condition !== conditionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchCode = d.stockCode.toLowerCase().includes(q);
      const matchModel = d.doorModelName && d.doorModelName.toLowerCase().includes(q);
      const matchFrame = d.frameTypeName && d.frameTypeName.toLowerCase().includes(q);
      const matchColor = d.doorFinishColor && d.doorFinishColor.toLowerCase().includes(q);
      const matchRack = d.rackLocation && d.rackLocation.toLowerCase().includes(q);
      const matchNotes = d.notes && d.notes.toLowerCase().includes(q);
      const matchReturn =
        (d.returnedFromJobCard && d.returnedFromJobCard.toLowerCase().includes(q)) ||
        (d.returnedCustomerName && d.returnedCustomerName.toLowerCase().includes(q)) ||
        (d.soldToCustomer && d.soldToCustomer.toLowerCase().includes(q));
      return matchCode || matchModel || matchFrame || matchColor || matchRack || matchNotes || matchReturn;
    }
    return true;
  });

  // Metrics
  const totalItems = items.length;
  const fullSetsCount = items.filter((d) => d.itemType === 'DOOR_AND_FRAME').length;
  const doorOnlyCount = items.filter((d) => d.itemType === 'DOOR_ONLY').length;
  const frameOnlyCount = items.filter((d) => d.itemType === 'FRAME_ONLY').length;
  const availableCount = items.filter((d) => d.status === 'AVAILABLE').reduce((s, d) => s + (d.quantity || 1), 0);
  const totalValuation = items.reduce((s, d) => s + ((d.sellingPrice || 0) * (d.quantity || 1)), 0);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Stock Items</span>
          <div className="text-xl font-black font-mono text-white">{totalItems} Units</div>
          <span className="text-[10px] text-slate-500">₹{totalValuation.toLocaleString('en-IN')} Value</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B] border border-emerald-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Door + Frame Sets</span>
          <div className="text-xl font-black font-mono text-emerald-300">{fullSetsCount} Sets</div>
          <span className="text-[10px] text-slate-400">Complete Ready Sets</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B] border border-blue-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-400 block">Door Slab Only</span>
          <div className="text-xl font-black font-mono text-blue-300">{doorOnlyCount} Slabs</div>
          <span className="text-[10px] text-slate-400">Frames casted separately</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B] border border-purple-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-purple-400 block">Frame Only</span>
          <div className="text-xl font-black font-mono text-purple-300">{frameOnlyCount} Frames</div>
          <span className="text-[10px] text-slate-400">WPC &amp; FRP Profiles</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B] border border-amber-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">Available Units</span>
          <div className="text-xl font-black font-mono text-amber-300">{availableCount} Ready</div>
          <span className="text-[10px] text-slate-400">Ready for Instant Allocation</span>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="p-3 rounded-xl bg-[#0B132B] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by code (STK-001), model, size, color, rack location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs text-white"
          >
            <option value="ALL">All Types</option>
            <option value="DOOR_AND_FRAME">🚪 + 🖼️ Door &amp; Frame Sets</option>
            <option value="DOOR_ONLY">🚪 Door Only</option>
            <option value="FRAME_ONLY">🖼️ Frame Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs text-white"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="SOLD">Sold</option>
          </select>

          {/* Condition Filter */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs text-white"
          >
            <option value="ALL">All Conditions</option>
            <option value="RETURNED_DELIVERY">↩️ Returned Delivery</option>
            <option value="OLD_STOCK">📦 Old Godown Stock</option>
            <option value="CANCELLED_JOB">🚫 Cancelled Job Door</option>
            <option value="SURPLUS_PRODUCTION">🏭 Surplus Production</option>
            <option value="SHOWROOM_DISPLAY">🏢 Showroom Display</option>
            <option value="FACTORY_OUTLET">🏷️ Factory Outlet</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedDoorIds.length > 0 && (
            <button
              type="button"
              onClick={handleOpenStickerForSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow transition animate-pulse"
              title="Print 12L stickers for selected stock doors"
            >
              <Printer className="w-4 h-4" />
              <span>Print {selectedDoorIds.length} Stickers (12L)</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsReturnModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-md transition"
            title="Return a delivered door to ready stock"
          >
            <Undo2 className="w-4 h-4" />
            <span>↩️ Return Door</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Stock Door / Frame</span>
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-2.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedDoorIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="p-2.5">Stock Code</th>
                <th className="p-2.5">Item Type</th>
                <th className="p-2.5">Model / Specifications</th>
                <th className="p-2.5 text-center">Dimensions (H × W)</th>
                <th className="p-2.5">Current Color / Repaintable</th>
                <th className="p-2.5">Godown Rack</th>
                <th className="p-2.5 text-right">Qty</th>
                <th className="p-2.5 text-right">Price (₹)</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No stock doors or frames matching the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isFullSet = item.itemType === 'DOOR_AND_FRAME';
                  const isDoor = item.itemType === 'DOOR_ONLY';
                  const isFrame = item.itemType === 'FRAME_ONLY';
                  const isChecked = selectedDoorIds.includes(item.id);

                  return (
                    <tr key={item.id} className={`hover:bg-slate-900/40 transition ${isChecked ? 'bg-slate-900/60' : ''}`}>
                      {/* Checkbox */}
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectDoor(item.id)}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Code */}
                      <td className="p-2.5 font-mono font-bold text-amber-300">
                        {item.stockCode}
                        {item.condition === 'RETURNED_DELIVERY' ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ↩️ RETURN
                          </span>
                        ) : (
                          <span className="block text-[9px] text-slate-500">{item.condition.replace('_', ' ')}</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="p-2.5 whitespace-nowrap">
                        {isFullSet && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            🚪+🖼️ Door &amp; Frame
                          </span>
                        )}
                        {isDoor && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
                            🚪 Door Only
                          </span>
                        )}
                        {isFrame && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                            🖼️ Frame Only
                          </span>
                        )}
                      </td>

                      {/* Model & Specs */}
                      <td className="p-2.5 text-white">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{item.doorModelName || item.frameTypeName}</span>
                          {item.returnedFromJobCard && (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60">
                              {item.returnedFromJobCard}
                            </span>
                          )}
                        </div>
                        {isFullSet && (
                          <div className="text-[10px] text-slate-400">
                            Frame: {item.frameTypeName} ({item.frameWallThickness || '100mm'})
                          </div>
                        )}
                        {item.returnedCustomerName && (
                          <div className="text-[9.5px] text-amber-400/90 font-medium">
                            Return from: {item.returnedCustomerName}
                            {item.returnReason ? ` • Reason: ${item.returnReason}` : ''}
                          </div>
                        )}
                        {item.status === 'SOLD' && item.soldToCustomer && (
                          <div className="text-[9.5px] text-emerald-400 font-medium">
                            Sold to: {item.soldToCustomer} {item.salespersonName ? `via ${item.salespersonName}` : ''}
                          </div>
                        )}
                        {item.notes && <div className="text-[9.5px] text-slate-500 italic">{item.notes}</div>}
                      </td>

                      {/* Dimensions */}
                      <td className="p-2.5 text-center font-mono whitespace-nowrap">
                        {isFrame ? (
                          <>
                            <span className="font-bold text-white">
                              {item.frameHeightMm} × {item.frameWidthMm} mm
                            </span>
                            <span className="block text-[9px] text-slate-400">
                              {((item.frameHeightMm || 2100) / 10).toFixed(1)} × {((item.frameWidthMm || 900) / 10).toFixed(1)} cm
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-white">
                              {item.doorHeightMm} × {item.doorWidthMm} mm
                            </span>
                            <span className="block text-[9px] text-slate-400">
                              {((item.doorHeightMm || 2085) / 10).toFixed(1)} × {((item.doorWidthMm || 815) / 10).toFixed(1)} cm • {item.doorThicknessMm || 32}mm
                            </span>
                          </>
                        )}
                      </td>

                      {/* Color */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="font-bold text-white block">
                          {item.doorFinishColor || item.frameFinishColor || 'Natural Teak'}
                        </span>
                        {item.isDoorRepaintable !== false && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-300">
                            <Paintbrush className="w-2.5 h-2.5" />
                            <span>Repaintable in booth</span>
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="p-2.5 whitespace-nowrap font-mono text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span>{item.rackLocation}</span>
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="p-2.5 text-right font-mono font-black text-white text-sm">
                        {item.quantity}
                      </td>

                      {/* Price */}
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-300">
                        ₹{item.sellingPrice.toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {item.status === 'AVAILABLE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Available
                          </span>
                        )}
                        {item.status === 'RESERVED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40" title={`Reserved for ${item.reservedForCustomer || item.reservedForRef}`}>
                            Reserved
                          </span>
                        )}
                        {item.status === 'SOLD' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Sold
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-right whitespace-nowrap space-x-1.5">
                        {item.status !== 'SOLD' && (
                          <button
                            type="button"
                            onClick={() => handleOpenSellModal(item)}
                            className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer inline-flex items-center gap-1 text-[10.5px] font-bold shadow-sm transition"
                            title="Sell Stock Door & Update Sales Leaderboard"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Sell</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenStickerForSingle(item)}
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer inline-flex items-center gap-1 text-[10.5px] font-bold shadow-sm transition"
                          title="Print 12L / Thermal Sticker for this stock door"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Sticker</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-700 p-6 space-y-4 font-sans text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {editingItem ? `Edit Stock Item ${editingItem.stockCode}` : 'Add Old / Ready Stock Door or Frame'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockDoor} className="space-y-4 text-xs">
              {/* Type Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                  Select Stock Item Inclusion Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftType('DOOR_AND_FRAME')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                      draftType === 'DOOR_AND_FRAME'
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                        : 'bg-[#070D1E] border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    🚪 + 🖼️ Door &amp; Frame Set
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftType('DOOR_ONLY')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                      draftType === 'DOOR_ONLY'
                        ? 'bg-blue-600 border-blue-400 text-white shadow'
                        : 'bg-[#070D1E] border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    🚪 Door Slab Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftType('FRAME_ONLY')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                      draftType === 'FRAME_ONLY'
                        ? 'bg-purple-600 border-purple-400 text-white shadow'
                        : 'bg-[#070D1E] border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    🖼️ Frame Only
                  </button>
                </div>
              </div>

              {/* Frame Opening Auto-Calculate Door Section */}
              {draftType !== 'FRAME_ONLY' && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-300 uppercase text-[10.5px] flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-amber-400" />
                      <span>📐 Auto-Calculate from Frame Opening</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCalculateFromFrame}
                        onChange={(e) => setAutoCalculateFromFrame(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span>Auto-Calculate</span>
                    </label>
                  </div>

                  {autoCalculateFromFrame && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-slate-300 mb-1">Frame Height (mm)</label>
                          <input
                            type="number"
                            value={calcFrameHeightMm}
                            onChange={(e) => setCalcFrameHeightMm(e.target.value)}
                            placeholder="e.g. 2100"
                            className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-amber-500/50 rounded-lg font-mono text-white text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-300 mb-1">Frame Width (mm)</label>
                          <input
                            type="number"
                            value={calcFrameWidthMm}
                            onChange={(e) => setCalcFrameWidthMm(e.target.value)}
                            placeholder="e.g. 900"
                            className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-amber-500/50 rounded-lg font-mono text-white text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-300 mb-1">Frame Profile &amp; Rebate</label>
                          <select
                            value={calcFrameProfile}
                            onChange={(e) => setCalcFrameProfile(e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-white text-xs"
                          >
                            {customFrames.length > 0 ? (
                              customFrames.map((f) => (
                                <option key={f.id} value={f.name}>
                                  {f.name} (Tol: -{f.hDeductionCm || 4.5}cm H / -{f.wDeductionCm || 7.6}cm W)
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="Regular Factory Frame 70×45mm">Regular Frame 70×45mm (Rebate 40mm)</option>
                                <option value="WPC Solid Extruded 100×65mm">WPC Solid 100×65mm (Rebate 40mm)</option>
                                <option value="Mini Frame 40×25mm">Mini Frame 40×25mm (Rebate 35mm)</option>
                                <option value="Heavy Frame 4x2 Hardwood">Heavy 4×2 Hardwood (Rebate 40mm)</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-300 mb-1">Floor Clearance</label>
                          <select
                            value={calcFloorCondition}
                            onChange={(e) => setCalcFloorCondition(e.target.value as FloorCondition)}
                            className="w-full px-2 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-white text-xs"
                          >
                            <option value="FINISHED_TILE">Finished Tile (12mm)</option>
                            <option value="UNFINISHED_CONCRETE">Unfinished Concrete (25mm)</option>
                            <option value="CARPET">Carpet / Threshold (15mm)</option>
                          </select>
                        </div>
                      </div>

                      {/* Live Calculation Result Ribbon */}
                      {calcResult && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-300">✅ Calculated Door Size:</span>
                            <span className="font-mono font-black text-white text-sm">
                              {calcResult.shutterHeightMm} × {calcResult.effectiveShutterWidthMm} mm
                            </span>
                            <span className="text-[11px] font-mono text-emerald-300">
                              ({calcResult.shutterSizeCmText} • {calcResult.shutterTapeInchText})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Deductions: H -{calcResult.totalHeightDeductionMm}mm | W -{calcResult.totalWidthDeductionMm}mm
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Door Slab Section */}
              {draftType !== 'FRAME_ONLY' && (
                <div className="p-3.5 rounded-xl bg-[#070D1E] border border-blue-500/30 space-y-3">
                  <div className="font-bold text-blue-300 uppercase text-[10.5px] flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" />
                    <span>Door Slab Specifications</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Door Model Name</label>
                      <input
                        type="text"
                        value={doorModel}
                        onChange={(e) => setDoorModel(e.target.value)}
                        placeholder="e.g. 32mm Molded Teak FRP Door"
                        required
                        className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Category</label>
                      <select
                        value={doorCategory}
                        onChange={(e) => setDoorCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-white"
                      >
                        <option value="FRP_DOORS">FRP Composite Doors</option>
                        <option value="WPC_DOORS">WPC Solid Doors</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Height (mm) / cm</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={doorHeightMm}
                          onChange={(e) => setDoorHeightMm(e.target.value)}
                          placeholder="2085"
                          required
                          className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg font-mono text-white"
                        />
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {doorHeightMm ? `(${Number(doorHeightMm) / 10} cm)` : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Width (mm) / cm</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={doorWidthMm}
                          onChange={(e) => setDoorWidthMm(e.target.value)}
                          placeholder="815"
                          required
                          className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg font-mono text-white"
                        />
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {doorWidthMm ? `(${Number(doorWidthMm) / 10} cm)` : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Thickness (mm)</label>
                      <input
                        type="number"
                        value={doorThicknessMm}
                        onChange={(e) => setDoorThicknessMm(e.target.value)}
                        placeholder="32"
                        className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Finish Color</label>
                      <input
                        type="text"
                        value={doorColor}
                        onChange={(e) => setDoorColor(e.target.value)}
                        placeholder="e.g. Frost White, Burma Teak"
                        className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={isDoorRepaintable}
                        onChange={(e) => setIsDoorRepaintable(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span>Can be repainted in factory spray booth if customer asks another color</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Handing:</span>
                      <select
                        value={handing}
                        onChange={(e) => setHanding(e.target.value as any)}
                        className="px-2 py-1 bg-[#0B132B] border border-slate-700 rounded text-[11px] text-white"
                      >
                        <option value="UNIVERSAL">Universal</option>
                        <option value="LH">Left Hand (LH)</option>
                        <option value="RH">Right Hand (RH)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Frame Section */}
              {draftType !== 'DOOR_ONLY' && (
                <div className="p-3.5 rounded-xl bg-[#070D1E] border border-purple-500/30 space-y-3">
                  <div className="font-bold text-purple-300 uppercase text-[10.5px] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Door Frame Specifications</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1">Frame Profile &amp; Section Type</label>
                      <input
                        type="text"
                        value={frameType}
                        onChange={(e) => setFrameType(e.target.value)}
                        placeholder="e.g. WPC Solid Extruded 100×65mm, FRP C-Channel"
                        required
                        className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Frame Height (mm) / cm</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={frameHeightMm}
                          onChange={(e) => setFrameHeightMm(e.target.value)}
                          placeholder="2100"
                          required
                          className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg font-mono text-white"
                        />
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {frameHeightMm ? `(${Number(frameHeightMm) / 10} cm)` : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Frame Width (mm) / cm</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={frameWidthMm}
                          onChange={(e) => setFrameWidthMm(e.target.value)}
                          placeholder="900"
                          required
                          className="w-full px-2.5 py-1.5 bg-[#0B132B] border border-slate-700 rounded-lg font-mono text-white"
                        />
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {frameWidthMm ? `(${Number(frameWidthMm) / 10} cm)` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Quantity in Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Godown Rack Location</label>
                  <input
                    type="text"
                    value={rackLocation}
                    onChange={(e) => setRackLocation(e.target.value)}
                    placeholder="e.g. Godown Bay 2 / Rack A"
                    required
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Origin / Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  >
                    <option value="OLD_STOCK">Old Godown Stock</option>
                    <option value="RETURNED_DELIVERY">Returned Delivery</option>
                    <option value="CANCELLED_JOB">Cancelled Order Door</option>
                    <option value="SURPLUS_PRODUCTION">Surplus Production Batch</option>
                    <option value="SHOWROOM_DISPLAY">Showroom Display Sample</option>
                    <option value="FACTORY_OUTLET">Factory Outlet / B-Grade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="6500"
                    required
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Notes / Sizing Allowance</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Ready for instant delivery, can be planed down up to 10mm"
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Stock Register'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Door 12L & Thermal Sticker Modal */}
      <StockDoorStickerModal
        isOpen={isStickerModalOpen}
        onClose={() => setIsStickerModalOpen(false)}
        doors={stickerDoors}
      />

      {/* Return Delivered Door to Stock Modal */}
      <ReturnDoorToStockModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSuccess={(newDoor) => {
          setItems((prev) => [newDoor, ...prev]);
          notify(`Added returned door ${newDoor.stockCode}!`);
          setIsReturnModalOpen(false);
          handleOpenStickerForSingle(newDoor);
        }}
      />

      {/* Sell Stock Door Modal */}
      {isSellModalOpen && sellingDoor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-700 p-6 space-y-4 font-sans text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Sell Stock Door {sellingDoor.stockCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSellModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSell} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 space-y-1.5">
                <div className="font-bold text-white text-sm">
                  {sellingDoor.doorModelName || sellingDoor.frameTypeName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {sellingDoor.doorHeightMm} × {sellingDoor.doorWidthMm} mm • {sellingDoor.doorFinishColor || 'Natural'} • Qty: {sellingDoor.quantity}
                </div>
                <div className="text-[10px] text-amber-400">
                  Rack: {sellingDoor.rackLocation} | Listed Price: ₹{sellingDoor.sellingPrice}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={sellCustomerName}
                  onChange={(e) => setSellCustomerName(e.target.value)}
                  placeholder="e.g. Skyline Builders / Mr. Shameer"
                  className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Final Sale Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-emerald-300 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Sales Representative
                  </label>
                  <select
                    value={sellSalespersonId}
                    onChange={(e) => setSellSalespersonId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Direct / Showroom Sales --</option>
                    {salesStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-200">
                ⚡ <strong>Leaderboard Sync:</strong> Sold door count (+{sellingDoor.quantity || 1} Door) and amount (+₹{Number(sellPrice || 0).toLocaleString('en-IN')}) will be credited in real-time to the selected sales rep and rank updated on the sales leaderboard.
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Sale Notes / Invoice Ref</label>
                <input
                  type="text"
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  placeholder="e.g. Paid in full via GPay; direct counter pickup"
                  className="w-full px-3 py-2 bg-[#070D1E] border border-slate-700 rounded-lg text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  disabled={isSelling}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSelling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSelling ? 'Processing...' : 'Confirm Sale & Update Leaderboard'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
