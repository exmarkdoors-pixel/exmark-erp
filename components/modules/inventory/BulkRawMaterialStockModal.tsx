'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Search,
  ArrowRight,
  FileText,
  Check,
  DollarSign,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import {
  RawMaterialCategory,
  RawMaterialStockItem,
  BulkRawMaterialMode,
  BulkRawMaterialRowInput,
  BulkRawMaterialUpdatePayload,
} from '@/lib/services/stockMaintenanceService';

export interface BulkRawMaterialStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawMaterials: RawMaterialStockItem[];
  onSuccess: (message: string) => void;
}

interface EditableStockRow {
  id: string;
  itemCode: string;
  name: string;
  category: RawMaterialCategory;
  unit: string;
  currentStock: number;
  physicalStock: string;
  addQuantity: string;
  unitCost: string;
  minSafetyBuffer: string;
  targetStock: string;
  warehouseLocation: string;
}

export function BulkRawMaterialStockModal({
  isOpen,
  onClose,
  rawMaterials,
  onSuccess,
}: BulkRawMaterialStockModalProps) {
  const [activeMode, setActiveMode] = useState<BulkRawMaterialMode>('PHYSICAL_AUDIT');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reason, setReason] = useState<string>('Floor Audit Physical Count');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [syncBoqRates, setSyncBoqRates] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvParsedCount, setCsvParsedCount] = useState<number>(0);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Local working copy of items
  const [rows, setRows] = useState<EditableStockRow[]>([]);

  // Initialize or reset rows when rawMaterials or modal opens
  useEffect(() => {
    if (isOpen) {
      const initial: EditableStockRow[] = rawMaterials.map((rm) => ({
        id: rm.id,
        itemCode: rm.itemCode,
        name: rm.name,
        category: rm.category,
        unit: rm.unit,
        currentStock: rm.currentStock,
        physicalStock: String(rm.currentStock),
        addQuantity: '',
        unitCost: String(rm.unitCost),
        minSafetyBuffer: String(rm.minSafetyBuffer),
        targetStock: String(rm.targetStock),
        warehouseLocation: rm.warehouseLocation || '',
      }));
      setRows(initial);
      setReason(
        activeMode === 'PHYSICAL_AUDIT'
          ? 'Floor Audit Physical Count'
          : activeMode === 'CONSIGNMENT_ADD'
          ? 'Inward Delivery Consignment'
          : 'Bulk Master Rate & Buffer Adjustment'
      );
      setSubmitError(null);
      setCsvError(null);
      setCsvFileName(null);
      setCsvParsedCount(0);
    }
  }, [isOpen, rawMaterials, activeMode]);

  // Handle cell edits
  const handleCellChange = (id: string, field: keyof EditableStockRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Helper actions
  const handlePreFillSystemStock = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        physicalStock: String(r.currentStock),
      }))
    );
  };

  const handleClearPhysical = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        physicalStock: '',
      }))
    );
  };

  const handleClearInward = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        addQuantity: '',
      }))
    );
  };

  // Filtered rows for presentation
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = r.itemCode.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesRack = r.warehouseLocation.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesRack) return false;
      }
      return true;
    });
  }, [rows, categoryFilter, searchQuery]);

  // Live Calculations across all rows
  const stats = useMemo(() => {
    let currentTotalStock = 0;
    let projectedTotalStock = 0;
    let currentTotalValuation = 0;
    let projectedTotalValuation = 0;
    let modifiedCount = 0;

    for (const r of rows) {
      const origStock = Number(r.currentStock) || 0;
      const origCost = Number(r.unitCost) || 0;
      currentTotalStock += origStock;
      currentTotalValuation += origStock * origCost;

      let nextStock = origStock;
      let isRowModified = false;

      if (activeMode === 'PHYSICAL_AUDIT') {
        const pStock = Number(r.physicalStock);
        if (!isNaN(pStock) && r.physicalStock.trim() !== '') {
          nextStock = Math.max(0, pStock);
          if (nextStock !== origStock) isRowModified = true;
        }
      } else if (activeMode === 'CONSIGNMENT_ADD') {
        const addQ = Number(r.addQuantity);
        if (!isNaN(addQ) && addQ > 0) {
          nextStock = Math.max(0, origStock + addQ);
          isRowModified = true;
        }
      } else {
        // GRID_EDIT or CSV_IMPORT
        const pStock = Number(r.physicalStock);
        const curS = Number(r.currentStock);
        if (!isNaN(pStock) && r.physicalStock.trim() !== '') {
          nextStock = Math.max(0, pStock);
        } else if (!isNaN(curS)) {
          nextStock = Math.max(0, curS);
        }
        if (nextStock !== origStock) isRowModified = true;
      }

      const nextCost = Number(r.unitCost) || origCost;
      const origItem = rawMaterials.find((x) => x.id === r.id);
      if (origItem) {
        if (nextCost !== origItem.unitCost) isRowModified = true;
        if (Number(r.minSafetyBuffer) !== origItem.minSafetyBuffer) isRowModified = true;
        if (Number(r.targetStock) !== origItem.targetStock) isRowModified = true;
        if (r.warehouseLocation.trim() !== (origItem.warehouseLocation || '').trim()) isRowModified = true;
      }

      if (isRowModified) modifiedCount++;

      projectedTotalStock += nextStock;
      projectedTotalValuation += nextStock * nextCost;
    }

    const netStockVariance = projectedTotalStock - currentTotalStock;
    const netValuationDiff = projectedTotalValuation - currentTotalValuation;

    return {
      totalSkus: rows.length,
      modifiedCount,
      currentTotalStock: Number(currentTotalStock.toFixed(2)),
      projectedTotalStock: Number(projectedTotalStock.toFixed(2)),
      netStockVariance: Number(netStockVariance.toFixed(2)),
      currentTotalValuation: Math.round(currentTotalValuation),
      projectedTotalValuation: Math.round(projectedTotalValuation),
      netValuationDiff: Math.round(netValuationDiff),
    };
  }, [rows, activeMode, rawMaterials]);

  // CSV Export
  const handleDownloadCsv = () => {
    window.location.href = '/api/stock-maintenance?export=csv';
  };

  // CSV Import Parse
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          throw new Error('CSV file is empty or missing data rows.');
        }

        // Header check
        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
        const codeIdx = headers.findIndex((h) => h.includes('code'));
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        const physicalIdx = headers.findIndex((h) => h.includes('physical'));
        const costIdx = headers.findIndex((h) => h.includes('rate') || h.includes('cost'));
        const bufferIdx = headers.findIndex((h) => h.includes('buffer') || h.includes('safety'));
        const targetIdx = headers.findIndex((h) => h.includes('target'));
        const rackIdx = headers.findIndex((h) => h.includes('rack') || h.includes('location'));

        if (codeIdx === -1 && nameIdx === -1) {
          throw new Error('CSV must contain either "Item Code" or "Raw Material Name" column.');
        }

        let matched = 0;
        setRows((prev) => {
          return prev.map((r) => {
            const rowLine = lines.slice(1).find((line) => {
              const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
              if (codeIdx !== -1 && cols[codeIdx] && cols[codeIdx].toUpperCase() === r.itemCode.toUpperCase()) {
                return true;
              }
              if (nameIdx !== -1 && cols[nameIdx] && cols[nameIdx].toLowerCase() === r.name.toLowerCase()) {
                return true;
              }
              return false;
            });

            if (!rowLine) return r;

            matched++;
            const cols = rowLine.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
            const nextPhysical =
              physicalIdx !== -1 && cols[physicalIdx] !== undefined && !isNaN(Number(cols[physicalIdx]))
                ? cols[physicalIdx]
                : r.physicalStock;
            const nextCost =
              costIdx !== -1 && cols[costIdx] !== undefined && !isNaN(Number(cols[costIdx]))
                ? cols[costIdx]
                : r.unitCost;
            const nextBuffer =
              bufferIdx !== -1 && cols[bufferIdx] !== undefined && !isNaN(Number(cols[bufferIdx]))
                ? cols[bufferIdx]
                : r.minSafetyBuffer;
            const nextTarget =
              targetIdx !== -1 && cols[targetIdx] !== undefined && !isNaN(Number(cols[targetIdx]))
                ? cols[targetIdx]
                : r.targetStock;
            const nextRack =
              rackIdx !== -1 && cols[rackIdx] !== undefined && cols[rackIdx].trim() !== ''
                ? cols[rackIdx]
                : r.warehouseLocation;

            return {
              ...r,
              physicalStock: nextPhysical,
              unitCost: nextCost,
              minSafetyBuffer: nextBuffer,
              targetStock: nextTarget,
              warehouseLocation: nextRack,
            };
          });
        });

        setCsvParsedCount(matched);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to parse CSV file.';
        setCsvError(msg);
      }
    };
    reader.readAsText(file);
  };

  // Submit bulk update
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const itemsPayload: BulkRawMaterialRowInput[] = rows.map((r) => {
        const itemPayload: BulkRawMaterialRowInput = {
          id: r.id,
          itemCode: r.itemCode,
          name: r.name,
          category: r.category,
          unit: r.unit,
        };

        if (activeMode === 'PHYSICAL_AUDIT') {
          if (r.physicalStock.trim() !== '' && !isNaN(Number(r.physicalStock))) {
            itemPayload.physicalStock = Number(r.physicalStock);
          }
        } else if (activeMode === 'CONSIGNMENT_ADD') {
          if (r.addQuantity.trim() !== '' && !isNaN(Number(r.addQuantity))) {
            itemPayload.addQuantity = Number(r.addQuantity);
          }
        } else {
          // GRID_EDIT or CSV_IMPORT
          if (r.physicalStock.trim() !== '' && !isNaN(Number(r.physicalStock))) {
            itemPayload.physicalStock = Number(r.physicalStock);
          }
        }

        if (r.unitCost.trim() !== '' && !isNaN(Number(r.unitCost))) {
          itemPayload.unitCost = Number(r.unitCost);
        }
        if (r.minSafetyBuffer.trim() !== '' && !isNaN(Number(r.minSafetyBuffer))) {
          itemPayload.minSafetyBuffer = Number(r.minSafetyBuffer);
        }
        if (r.targetStock.trim() !== '' && !isNaN(Number(r.targetStock))) {
          itemPayload.targetStock = Number(r.targetStock);
        }
        if (r.warehouseLocation.trim() !== '') {
          itemPayload.warehouseLocation = r.warehouseLocation.trim();
        }

        return itemPayload;
      });

      const payload: BulkRawMaterialUpdatePayload = {
        mode: activeMode,
        reason: reason.trim() || 'Bulk Raw Material Update',
        referenceNumber: referenceNumber.trim() || undefined,
        syncBoqRates,
        items: itemsPayload,
      };

      const res = await fetch('/api/stock-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_UPDATE_RM',
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply bulk stock updates.');
      }

      onSuccess(
        data.message ||
          `Updated ${data.data?.updatedCount || itemsPayload.length} raw material items successfully!`
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving bulk updates.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-7xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ── MODAL HEADER ────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#070D1E] via-[#0B132B] to-[#121B3A] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Bulk Raw Material Stock & Reconciliation Hub
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  Store Audit
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit physical floor counts, record inward consignments, update rates, or import from Excel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SUMMARY STATS BAR ────────────────────────────────────────── */}
        <div className="px-4 py-3 bg-[#070D1E] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0 text-xs">
          {/* Card 1: SKUs */}
          <div className="p-2.5 rounded-lg bg-[#0B132B] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Inventory SKUs</div>
            <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
              {stats.totalSkus} Items{' '}
              <span className="text-[10px] font-bold text-indigo-400">
                ({stats.modifiedCount} modified)
              </span>
            </div>
          </div>

          {/* Card 2: Current Valuation */}
          <div className="p-2.5 rounded-lg bg-[#0B132B] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Current Store Valuation</div>
            <div className="text-sm sm:text-base font-black text-slate-200 font-mono mt-0.5">
              ₹{stats.currentTotalValuation.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Card 3: Projected Valuation */}
          <div className="p-2.5 rounded-lg bg-[#0B132B] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Projected Valuation</div>
            <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
              ₹{stats.projectedTotalValuation.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Card 4: Net Variance */}
          <div className="p-2.5 rounded-lg bg-[#0B132B] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Net Stock Variance</div>
            <div
              className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
                stats.netStockVariance > 0
                  ? 'text-emerald-400'
                  : stats.netStockVariance < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {stats.netStockVariance > 0 ? `+${stats.netStockVariance}` : stats.netStockVariance} KG / Units
            </div>
          </div>

          {/* Card 5: Financial Gain/Loss */}
          <div className="p-2.5 rounded-lg bg-[#0B132B] border border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Financial Impact (₹)</div>
            <div
              className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
                stats.netValuationDiff > 0
                  ? 'text-emerald-400'
                  : stats.netValuationDiff < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {stats.netValuationDiff >= 0
                ? `+₹${stats.netValuationDiff.toLocaleString('en-IN')}`
                : `-₹${Math.abs(stats.netValuationDiff).toLocaleString('en-IN')}`}
            </div>
          </div>
        </div>

        {/* ── MODE TABS & CONTROLS ─────────────────────────────────────── */}
        <div className="p-3 bg-[#0B132B] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#070D1E] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveMode('PHYSICAL_AUDIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'PHYSICAL_AUDIT'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>1. Physical Count (Audit)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('CONSIGNMENT_ADD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'CONSIGNMENT_ADD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>2. Consignment Inward (+ Add)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('GRID_EDIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'GRID_EDIT'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>3. Quick Grid Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('CSV_IMPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'CSV_IMPORT'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>4. CSV Export / Import</span>
            </button>
          </div>

          {/* Quick Action Helpers */}
          <div className="flex items-center gap-2">
            {activeMode === 'PHYSICAL_AUDIT' && (
              <>
                <button
                  type="button"
                  onClick={handlePreFillSystemStock}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  title="Copy current system counts into physical counts for quick discrepancy checking"
                >
                  Fill with System Counts
                </button>
                <button
                  type="button"
                  onClick={handleClearPhysical}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition cursor-pointer"
                >
                  Clear All
                </button>
              </>
            )}

            {activeMode === 'CONSIGNMENT_ADD' && (
              <button
                type="button"
                onClick={handleClearInward}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                Reset Inward Qties
              </button>
            )}

            {activeMode === 'CSV_IMPORT' && (
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Download CSV Template</span>
              </button>
            )}
          </div>
        </div>

        {/* ── CSV UPLOAD BANNER (When CSV Mode is active) ──────────────── */}
        {activeMode === 'CSV_IMPORT' && (
          <div className="p-3 bg-cyan-950/30 border-b border-cyan-800/40 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white">Upload Completed Physical Stock Sheet (CSV)</span>
                <p className="text-[11px] text-cyan-300/80">
                  Matches raw material rows by Item Code. Edits will populate into the review table below before saving.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{csvFileName ? `Replace: ${csvFileName}` : '📤 Choose CSV File'}</span>
              </button>
              {csvParsedCount > 0 && (
                <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono font-bold">
                  ✓ {csvParsedCount} rows populated
                </span>
              )}
            </div>
          </div>
        )}

        {csvError && (
          <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{csvError}</span>
          </div>
        )}

        {/* ── FILTER TABS & SEARCH BAR ─────────────────────────────────── */}
        <div className="px-4 py-2 bg-[#070D1E] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {[
              'ALL',
              'Chemicals',
              'Fiberglass',
              'Pigments',
              'Core & Structural',
              'Hardware',
              'Consumables',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, name, rack..."
              className="w-full pl-8 pr-3 py-1 bg-[#0B132B] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* ── EDITABLE SPREADSHEET TABLE ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-[#070D1E]/40 p-2 sm:p-4">
          <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#070D1E] text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Raw Material Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">System Stock</th>

                    {/* Mode Specific Columns */}
                    {activeMode === 'PHYSICAL_AUDIT' && (
                      <>
                        <th className="py-2.5 px-3 text-center min-w-[120px] text-indigo-300">
                          Physical Count
                        </th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-center">Variance (±)</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right text-amber-300">Valuation Impact</th>
                      </>
                    )}

                    {activeMode === 'CONSIGNMENT_ADD' && (
                      <>
                        <th className="py-2.5 px-3 text-center min-w-[120px] text-emerald-300">
                          Inward Qty (+)
                        </th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right text-emerald-300 font-black">
                          Projected Stock
                        </th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Delivery Value</th>
                      </>
                    )}

                    {(activeMode === 'GRID_EDIT' || activeMode === 'CSV_IMPORT') && (
                      <>
                        <th className="py-2.5 px-3 text-center min-w-[100px] text-amber-300">
                          Count
                        </th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Rate (₹)</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Safety Min</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Target</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Warehouse Rack</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                        No raw material items match your active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const curStock = Number(r.currentStock) || 0;
                      const uCost = Number(r.unitCost) || 0;

                      // Physical audit stats
                      const physStock = Number(r.physicalStock);
                      const isPhysSet = !isNaN(physStock) && r.physicalStock.trim() !== '';
                      const variance = isPhysSet ? Number((physStock - curStock).toFixed(2)) : 0;
                      const valImpact = Math.round(variance * uCost);

                      // Consignment inward stats
                      const addQty = Number(r.addQuantity);
                      const isAddSet = !isNaN(addQty) && addQty > 0;
                      const projectedStock = isAddSet ? Number((curStock + addQty).toFixed(2)) : curStock;
                      const deliveryVal = Math.round((addQty || 0) * uCost);

                      const isRowModified =
                        activeMode === 'PHYSICAL_AUDIT'
                          ? isPhysSet && variance !== 0
                          : activeMode === 'CONSIGNMENT_ADD'
                          ? isAddSet
                          : r.physicalStock.trim() !== String(curStock) ||
                            r.unitCost.trim() !== String(uCost);

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-800/40 transition text-slate-200 ${
                            isRowModified ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          {/* Code */}
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                            {r.itemCode}
                          </td>

                          {/* Name */}
                          <td className="py-2.5 px-3 font-semibold text-white">
                            <div className="flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {isRowModified && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {r.category}
                          </td>

                          {/* Current System Stock */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                            {curStock} <span className="text-[10px] text-slate-500">{r.unit}</span>
                          </td>

                          {/* ── MODE 1: PHYSICAL AUDIT CELLS ── */}
                          {activeMode === 'PHYSICAL_AUDIT' && (
                            <>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={r.physicalStock}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'physicalStock', e.target.value)
                                  }
                                  placeholder={String(curStock)}
                                  className="w-24 text-center py-1 px-2 rounded-lg bg-[#070D1E] border border-slate-700 font-mono font-black text-white text-xs focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                {r.unit}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isPhysSet && variance !== 0 ? (
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs inline-flex items-center gap-1 ${
                                      variance > 0
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                        : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                                    }`}
                                  >
                                    {variance > 0 ? `+${variance}` : variance} {r.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-mono text-xs">0 {r.unit}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                ₹{uCost}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">
                                {isPhysSet && valImpact !== 0 ? (
                                  <span
                                    className={
                                      valImpact > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }
                                  >
                                    {valImpact > 0 ? `+₹${valImpact.toLocaleString('en-IN')}` : `-₹${Math.abs(valImpact).toLocaleString('en-IN')}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">₹0</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* ── MODE 2: CONSIGNMENT INWARD CELLS ── */}
                          {activeMode === 'CONSIGNMENT_ADD' && (
                            <>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={r.addQuantity}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'addQuantity', e.target.value)
                                  }
                                  placeholder="+ 0"
                                  className="w-24 text-center py-1 px-2 rounded-lg bg-[#070D1E] border border-emerald-700/60 font-mono font-black text-emerald-300 text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                {r.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-300">
                                {projectedStock} <span className="text-[10px] text-slate-500">{r.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                ₹{uCost}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                {isAddSet ? `+₹${deliveryVal.toLocaleString('en-IN')}` : '₹0'}
                              </td>
                            </>
                          )}

                          {/* ── MODE 3 & 4: FULL GRID EDIT CELLS ── */}
                          {(activeMode === 'GRID_EDIT' || activeMode === 'CSV_IMPORT') && (
                            <>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={r.physicalStock}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'physicalStock', e.target.value)
                                  }
                                  className="w-20 text-center py-1 px-2 rounded-lg bg-[#070D1E] border border-slate-700 font-mono font-bold text-white text-xs focus:outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                {r.unit}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={r.unitCost}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'unitCost', e.target.value)
                                  }
                                  className="w-20 text-center py-1 px-2 rounded-lg bg-[#070D1E] border border-slate-700 font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={r.minSafetyBuffer}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'minSafetyBuffer', e.target.value)
                                  }
                                  className="w-18 text-center py-1 px-2 rounded-lg bg-[#070D1E] border border-slate-700 font-mono font-bold text-slate-300 text-xs focus:outline-none focus:border-slate-500"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={r.targetStock}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'targetStock', e.target.value)
                                  }
                                  className="w-18 text-center py-1 px-2 rounded-lg bg-[#070D1E] border border-slate-700 font-mono font-bold text-slate-300 text-xs focus:outline-none focus:border-slate-500"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={r.warehouseLocation}
                                  onChange={(e) =>
                                    handleCellChange(r.id, 'warehouseLocation', e.target.value)
                                  }
                                  className="w-full py-1 px-2 rounded-lg bg-[#070D1E] border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-slate-500"
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── MODAL FOOTER ────────────────────────────────────────────── */}
        <div className="p-4 bg-[#070D1E] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Reference & BOQ Checkbox */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Reason:</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Audit / Inward reference"
                className="px-2.5 py-1 rounded-lg bg-[#0B132B] border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Ref / Challan #:</span>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. CH-2026-904"
                className="px-2.5 py-1 rounded-lg bg-[#0B132B] border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 w-32"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-cyan-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncBoqRates}
                onChange={(e) => setSyncBoqRates(e.target.checked)}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-bold">Auto-sync modified prices to BOQ Formulas</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {submitError && (
              <span className="text-xs text-rose-400 mr-2 max-w-xs truncate">
                {submitError}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Applying Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>⚡ Apply Bulk Updates ({stats.modifiedCount} Items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}