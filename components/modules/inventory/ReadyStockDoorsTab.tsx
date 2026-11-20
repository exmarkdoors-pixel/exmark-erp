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
} from 'lucide-react';
import type {
  ReadyStockDoor,
  StockItemType,
  StockDoorStatus,
  StockCondition,
  CreateReadyStockDoorInput,
} from '@/lib/services/readyStockDoorService';

export function ReadyStockDoorsTab() {
  const [items, setItems] = useState<ReadyStockDoor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    setIsModalOpen(true);
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

  // Filter items
  const filtered = items.filter((d) => {
    if (typeFilter !== 'ALL' && d.itemType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchCode = d.stockCode.toLowerCase().includes(q);
      const matchModel = d.doorModelName && d.doorModelName.toLowerCase().includes(q);
      const matchFrame = d.frameTypeName && d.frameTypeName.toLowerCase().includes(q);
      const matchColor = d.doorFinishColor && d.doorFinishColor.toLowerCase().includes(q);
      const matchRack = d.rackLocation && d.rackLocation.toLowerCase().includes(q);
      const matchNotes = d.notes && d.notes.toLowerCase().includes(q);
      return matchCode || matchModel || matchFrame || matchColor || matchRack || matchNotes;
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
            <option value="ALL">All Types (എല്ലാം)</option>
            <option value="DOOR_AND_FRAME">🚪 + 🖼️ Door &amp; Frame Sets</option>
            <option value="DOOR_ONLY">🚪 Door Only (ഡോർ മാത്രം)</option>
            <option value="FRAME_ONLY">🖼️ Frame Only (ഫ്രെയിം മാത്രം)</option>
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
        </div>

        <div className="flex items-center gap-2">
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
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Stock Door / Frame (പഴയ / റെഡി സ്റ്റോക്ക് ചേർക്കുക)</span>
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
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
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No stock doors or frames matching the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isFullSet = item.itemType === 'DOOR_AND_FRAME';
                  const isDoor = item.itemType === 'DOOR_ONLY';
                  const isFrame = item.itemType === 'FRAME_ONLY';

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition">
                      {/* Code */}
                      <td className="p-2.5 font-mono font-bold text-amber-300">
                        {item.stockCode}
                        <span className="block text-[9px] text-slate-500">{item.condition.replace('_', ' ')}</span>
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
                        <div className="font-bold">{item.doorModelName || item.frameTypeName}</div>
                        {isFullSet && (
                          <div className="text-[10px] text-slate-400">
                            Frame: {item.frameTypeName} ({item.frameWallThickness || '100mm'})
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
                      <td className="p-2.5 text-right whitespace-nowrap space-x-1">
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
    </div>
  );
}
