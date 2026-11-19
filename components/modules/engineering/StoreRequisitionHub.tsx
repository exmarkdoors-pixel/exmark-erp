'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FlaskConical,
  Printer,
  Sparkles,
  X,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  TreePine,
  Layers,
  Palette,
  Calculator,
  Edit2,
  Lock,
  Moon,
  ShoppingBag,
  Clock,
  BarChart3,
} from 'lucide-react';
import { PurchaseOrderModal } from '@/components/modules/purchases/PurchaseOrderModal';
import type { PurchaseLineItem } from '@/app/api/purchases/route';
import { CustomFrameProfile, DEFAULT_FRAME_PROFILES } from '@/lib/utils/frameDefaults';
import {
  BoqDoorInput,
  BoqMaterialRatesConfig,
  buildCommonBasicKitItems,
  calculateDoorBatchBoq,
  DEFAULT_BOQ_MATERIAL_RATES,
  DEFAULT_LOCK_BOX_PROFILES,
  FrameLengthMode,
  LockBoxProfile,
  mergeBoqMaterialRates,
} from '@/lib/utils/boqFormulaEngine';
import type { BoqExtraItem, ExtraBoqItemCategory } from '@/lib/services/boqExtraItemsService';
import type { LockReadinessRecord, LockReadinessStatus } from '@/lib/services/boqLockReadinessService';
import type {
  BoqIssueShift,
  BoqIssueVoucherItem,
  BoqIssueVoucherRecord,
  ConsolidatedBoqBatchSummary,
} from '@/lib/services/boqIssueService';
import { apiFetch } from '@/lib/api/apiClient';
import {
  ConsolidatedBatchIssueResult,
  ConsolidatedPartySlipEntry,
  DailyStoreIssueResult,
  DailyStoreIssueSlipModal,
} from './DailyStoreIssueSlipModal';
import { BoqIssuedReportPanel } from './BoqIssuedReportPanel';

interface StoreRequisitionHubProps {
  initialOrderId?: string;
  embeddedModalMode?: boolean;
}

const EXTRA_ITEM_PRESETS: Array<{
  itemName: string;
  category: ExtraBoqItemCategory;
  unit: string;
  unitRate: number;
  specNote: string;
}> = [
  { itemName: '2K Auto Putty', category: 'Chemical', unit: 'Kg', unitRate: 280, specNote: 'Surface touch-up filler' },
  { itemName: 'Masking Tape (2 inch)', category: 'Consumable', unit: 'Rolls', unitRate: 55, specNote: 'Coating edge protection' },
  { itemName: 'Wood Adhesive / Fevicol', category: 'Timber / Wood', unit: 'Kg', unitRate: 240, specNote: 'Frame & stile joint glue' },
  { itemName: 'PU Thinner', category: 'Chemical', unit: 'Liters', unitRate: 165, specNote: 'Spray gun & surface wipe' },
  { itemName: 'Sandpaper (120 / 220 Grit)', category: 'Consumable', unit: 'Sheets', unitRate: 18, specNote: 'Hand finish sanding' },
  { itemName: 'Extra Polyester Resin', category: 'Chemical', unit: 'Kg', unitRate: 210, specNote: 'Additional layup patch' },
  { itemName: 'SS Tower Bolt / Lock Kit', category: 'Hardware', unit: 'Nos', unitRate: 145, specNote: 'Extra hardware issue' },
  { itemName: 'Bubble Wrap / Corrugated Roll', category: 'Packing', unit: 'Rolls', unitRate: 420, specNote: 'Dispatch corner guard' },
];

interface ProductionRequisitionOrder {
  id: string;
  prodOrderId?: string;
  orderNumber: string;
  customerName: string;
  siteName: string;
  jobCardNumber: string;
  orderStatus?: string;
  orderDate?: string;
  boqIssuedAt?: string | null;
  doorsCount: number;
  doorsDesc: string;
  sqFtPerDoor: number;
  doors: BoqDoorInput[];
}

interface ApiProductionDoor {
  id?: string;
  doorId?: string;
  doorNumber?: string;
  rawHeightCm?: number;
  rawWidthTopCm?: number;
  finishedHeightMm?: number;
  finishedWidthMm?: number;
  frameTypeId?: string;
  frameTypeName?: string;
  finishColor?: string;
  lockId?: string;
  lockType?: string;
  handing?: 'LH' | 'RH';
  stage?: string;
  materialIssued?: boolean;
  materialIssuedAt?: string;
  materialIssueBatchId?: string;
  materialIssuedToGang?: string;
  materialIssuedValue?: number;
}

interface ApiProductionOrder {
  id: string;
  salesOrderId?: string;
  prodOrderNumber: string;
  customerName?: string;
  siteName?: string;
  jobCardNumber: string;
  status?: string;
  orderDate?: string;
  createdAt?: string;
  boqIssuedAt?: string | null;
  doorCategory?: string;
  doors?: ApiProductionDoor[];
}

interface CustomSizeBoqRow {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  quantity: number;
  frameTypeId: string;
  finishColor: string;
  lockType: string;
  handing: 'LH' | 'RH';
}

export default function StoreRequisitionHub({
  initialOrderId,
  embeddedModalMode = false,
}: StoreRequisitionHubProps = {}) {
  const [orders, setOrders] = useState<ProductionRequisitionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || '');
  const [orderHistoryFilter, setOrderHistoryFilter] = useState<'ALL' | 'PENDING' | 'ISSUED'>('ALL');
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);
  const [isDailyIssueSlipOpen, setIsDailyIssueSlipOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState<boolean>(false);
  const [isBatchBoqMode, setIsBatchBoqMode] = useState<boolean>(false);
  const [isCustomCalcMode, setIsCustomCalcMode] = useState<boolean>(false);
  const [isConsumablesMode, setIsConsumablesMode] = useState<boolean>(false);
  const [isReportMode, setIsReportMode] = useState<boolean>(false);
  const [reportInitialOrderId, setReportInitialOrderId] = useState<string>('');
  const [consumableShiftFilter, setConsumableShiftFilter] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING'>('ALL');
  const [isPoModalOpen, setIsPoModalOpen] = useState<boolean>(false);
  const [markingBoqIssued, setMarkingBoqIssued] = useState<boolean>(false);
  const [extraItems, setExtraItems] = useState<BoqExtraItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [editingExtraItemId, setEditingExtraItemId] = useState<string | null>(null);
  const [extraItemName, setExtraItemName] = useState<string>('');
  const [extraItemCategory, setExtraItemCategory] = useState<ExtraBoqItemCategory>('Consumable');
  const [extraItemSpecNote, setExtraItemSpecNote] = useState<string>('');
  const [extraItemQty, setExtraItemQty] = useState<string>('1');
  const [extraItemUnit, setExtraItemUnit] = useState<string>('Kg');
  const [extraItemRate, setExtraItemRate] = useState<string>('0');
  const [extraItemShift, setExtraItemShift] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('EVENING');
  const [extraItemDate, setExtraItemDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [extraItemGangName, setExtraItemGangName] = useState<string>('');
  const [isSavingExtraItem, setIsSavingExtraItem] = useState<boolean>(false);
  const [lockReadinessMap, setLockReadinessMap] = useState<Record<string, LockReadinessRecord>>({});
  const [editingLockBox, setEditingLockBox] = useState<LockBoxProfile | null>(null);
  const [isNewLockBoxModal, setIsNewLockBoxModal] = useState<boolean>(false);
  const [isSavingLockBox, setIsSavingLockBox] = useState<boolean>(false);
  const [newKitItemName, setNewKitItemName] = useState<string>('');
  const [newKitItemQty, setNewKitItemQty] = useState<string>('1');
  const [newKitItemUnit, setNewKitItemUnit] = useState<string>('Pcs');
  const [customRows, setCustomRows] = useState<CustomSizeBoqRow[]>([
    {
      id: 'CUST-1',
      label: 'Normal Door + Regular Frame',
      widthCm: 80,
      heightCm: 210,
      quantity: 1,
      frameTypeId: 'FRM-REGULAR',
      finishColor: 'Natural Teak EXGC-510',
      lockType: 'Baby Latch Black',
      handing: 'RH',
    },
  ]);
  const [selectedBatchOrderIds, setSelectedBatchOrderIds] = useState<string[]>([]);

  const [framesCatalog, setFramesCatalog] = useState<CustomFrameProfile[]>(DEFAULT_FRAME_PROFILES);
  const [ratesConfig, setRatesConfig] = useState<BoqMaterialRatesConfig>(
    DEFAULT_BOQ_MATERIAL_RATES
  );
  const [draftRates, setDraftRates] = useState<BoqMaterialRatesConfig>(DEFAULT_BOQ_MATERIAL_RATES);
  const [newPigmentColour, setNewPigmentColour] = useState<string>('');
  const [newPigmentRate, setNewPigmentRate] = useState<string>('520');
  const [isSavingRates, setIsSavingRates] = useState<boolean>(false);
  const [ratesSaveNotice, setRatesSaveNotice] = useState<string | null>(null);

  // Custom Usage Mode for Consolidated BOQ
  const [isCustomUsageEditMode, setIsCustomUsageEditMode] = useState<boolean>(false);
  const [customUsageBufferPercent, setCustomUsageBufferPercent] = useState<number>(0);
  const [customUsageOverrides, setCustomUsageOverrides] = useState<
    Record<string, { customQty?: number; customRate?: number; note?: string; excluded?: boolean }>
  >({});
  const [customUsageNotes, setCustomUsageNotes] = useState<string>('');
  const [isSavingCustomUsage, setIsSavingCustomUsage] = useState<boolean>(false);
  const [customUsageSaveSuccess, setCustomUsageSaveSuccess] = useState<boolean>(false);

  // Direct BOQ Issue & Issued Value Ledger state
  const [issueGangName, setIssueGangName] = useState<string>('Molding Team A');
  const [issueShift, setIssueShift] = useState<BoqIssueShift>('MORNING');
  const [isIssuingBoq, setIsIssuingBoq] = useState<boolean>(false);
  const [boqIssueNotice, setBoqIssueNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [orderIssueVouchers, setOrderIssueVouchers] = useState<BoqIssueVoucherRecord[]>([]);
  const [orderTotalIssuedValue, setOrderTotalIssuedValue] = useState<number>(0);
  const [reversingVoucherId, setReversingVoucherId] = useState<string | null>(null);
  const [previewIssueVoucher, setPreviewIssueVoucher] = useState<BoqIssueVoucherRecord | null>(null);

  // Consolidated Multi-Party BOQ — Per-Party Partial Door & Balance Carry-Forward state
  const [batchDoorIdsByOrder, setBatchDoorIdsByOrder] = useState<Record<string, string[]>>({});
  const [expandedBatchOrderIds, setExpandedBatchOrderIds] = useState<Record<string, boolean>>({});
  const [batchPartyFilter, setBatchPartyFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [consolidatedBatches, setConsolidatedBatches] = useState<ConsolidatedBoqBatchSummary[]>([]);
  const [reversingBatchNumber, setReversingBatchNumber] = useState<string | null>(null);
  const [previewConsolidatedBatch, setPreviewConsolidatedBatch] =
    useState<ConsolidatedBoqBatchSummary | null>(null);

  const getDoorKey = (d: BoqDoorInput, fallbackIdx = 0): string =>
    d.id || d.doorId || d.doorNumber || `door-${fallbackIdx}`;

  const getOrderIssueStats = (ord: ProductionRequisitionOrder) => {
    const total = ord.doors.length;
    const issued = ord.doors.filter((d) => Boolean(d.materialIssued)).length;
    const pending = Math.max(0, total - issued);
    const isPartial = issued > 0 && pending > 0;
    const isFullyIssued =
      (total > 0 && pending === 0) || (Boolean(ord.boqIssuedAt) && issued === 0);
    return { total, issued, pending, isPartial, isFullyIssued };
  };

  useEffect(() => {
    let active = true;

    apiFetch('/api/production')
      .then((res) => res.json())
      .then((json) => {
        if (!active || !json.success || !Array.isArray(json.data) || json.data.length === 0) return;
        const liveOrders: ProductionRequisitionOrder[] = (json.data as ApiProductionOrder[]).map(
          (p) => {
            const rawDoors = Array.isArray(p.doors) && p.doors.length > 0 ? p.doors : [{}];
            const mappedDoors: BoqDoorInput[] = rawDoors.map((d, dIdx) => {
              const widthCm =
                d.rawWidthTopCm && d.rawWidthTopCm > 0
                  ? d.rawWidthTopCm
                  : d.finishedWidthMm && d.finishedWidthMm > 0
                  ? d.finishedWidthMm / 10
                  : 80;
              const heightCm =
                d.rawHeightCm && d.rawHeightCm > 0
                  ? d.rawHeightCm
                  : d.finishedHeightMm && d.finishedHeightMm > 0
                  ? d.finishedHeightMm / 10
                  : 210;
              return {
                id: d.id,
                doorId: d.doorId || `EXM-DR-${dIdx + 1}`,
                doorNumber: d.doorNumber || `D-${dIdx + 1}`,
                widthCm,
                heightCm,
                frameTypeId: d.frameTypeId || 'FRM-REGULAR',
                frameTypeName: d.frameTypeName || 'Regular Frame',
                finishColor: d.finishColor || 'Natural Teak EXGC-510',
                lockId: d.lockId,
                lockType: d.lockType || 'Baby Latch Black',
                handing: d.handing || 'RH',
                quantity: 1,
                stage: d.stage || p.status || 'QUEUED',
                materialIssued: Boolean(d.materialIssued),
                materialIssuedAt: d.materialIssuedAt,
                materialIssueBatchId: d.materialIssueBatchId,
                materialIssuedToGang: d.materialIssuedToGang,
                materialIssuedValue: d.materialIssuedValue,
              };
            });

            const totalOrderSqFt = mappedDoors.reduce(
              (s, d) => s + ((d.widthCm || 80) * (d.heightCm || 210)) / 929.0304,
              0
            );
            const avgSqFt = mappedDoors.length > 0 ? totalOrderSqFt / mappedDoors.length : 18.08;

            return {
              id: p.salesOrderId || p.id,
              prodOrderId: p.id,
              orderNumber: p.salesOrderId || p.prodOrderNumber,
              customerName: p.customerName || 'Kerala Customer',
              siteName: p.siteName || `${p.customerName || 'Client'} Site`,
              jobCardNumber: p.jobCardNumber,
              orderStatus: p.status || 'QUEUED',
              orderDate: p.orderDate || p.createdAt?.slice(0, 10) || '',
              boqIssuedAt: p.boqIssuedAt || null,
              doorsCount: mappedDoors.length,
              doorsDesc: `${mappedDoors.length} Sets (${p.doorCategory?.replace(/_/g, ' ') || 'Hand-Craft FRP Doors'})`,
              sqFtPerDoor: Number(avgSqFt.toFixed(2)),
              doors: mappedDoors,
            };
          }
        );

        setOrders(liveOrders);

        const inMoldingPipeline = (o: ProductionRequisitionOrder) => {
          const s = (o.orderStatus || 'QUEUED').toUpperCase();
          return s === 'QUEUED' || s === 'MOLDING';
        };

        const firstPending =
          liveOrders.find((o) => inMoldingPipeline(o) && !getOrderIssueStats(o).isFullyIssued) ||
          liveOrders.find((o) => inMoldingPipeline(o)) ||
          liveOrders[0];
        let initialSelected = firstPending?.id || '';
        if (initialOrderId) {
          const match = liveOrders.find(
            (o) =>
              o.prodOrderId === initialOrderId ||
              o.id === initialOrderId ||
              o.orderNumber === initialOrderId
          );
          if (match) initialSelected = match.id;
        }
        setSelectedOrderId(initialSelected);
        setSelectedBatchOrderIds(
          liveOrders
            .filter((o) => inMoldingPipeline(o) && !getOrderIssueStats(o).isFullyIssued)
            .slice(0, 5)
            .map((o) => o.id)
        );
      })
      .catch((err) => console.error('Failed to sync live requisition orders:', err));

    apiFetch('/api/settings/frames')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setFramesCatalog(json.data);
        }
      })
      .catch((err) => console.error('Failed to load custom frames for BOQ:', err));

    apiFetch('/api/boq/material-rates')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data) {
          const merged = mergeBoqMaterialRates(json.data);
          if (json.data.pigmentRatesByColour) {
            merged.pigmentRatesByColour = json.data.pigmentRatesByColour;
          }
          setRatesConfig(merged);
          setDraftRates(merged);
        }
      })
      .catch((err) => console.error('Failed to load BOQ material rates:', err));

    apiFetch('/api/boq/extra-items')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setExtraItems(json.data);
        }
      })
      .catch((err) => console.error('Failed to load extra BOQ items:', err));

    apiFetch('/api/boq/lock-readiness')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data && typeof json.data === 'object') {
          setLockReadinessMap(json.data);
        }
      })
      .catch((err) => console.error('Failed to load lock readiness states:', err));

    apiFetch('/api/boq/issue?mode=consolidated')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setConsolidatedBatches(json.data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [initialOrderId]);

  const isOrderInMoldingPipeline = (o: ProductionRequisitionOrder) => {
    const s = (o.orderStatus || 'QUEUED').toUpperCase();
    return s === 'QUEUED' || s === 'MOLDING';
  };

  const pendingBoqOrders = useMemo(
    () => orders.filter((o) => isOrderInMoldingPipeline(o) && !getOrderIssueStats(o).isFullyIssued),
    [orders]
  );
  const issuedBoqOrders = useMemo(
    () => orders.filter((o) => getOrderIssueStats(o).isFullyIssued),
    [orders]
  );
  const pastMoldingOrders = useMemo(
    () => orders.filter((o) => !isOrderInMoldingPipeline(o) && !getOrderIssueStats(o).isFullyIssued),
    [orders]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  // Auto-select ONLY remaining Pending doors when opening a partially issued order
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedDoorIds([]);
      return;
    }
    const pendingDoors = selectedOrder.doors.filter((d) => !d.materialIssued);
    const issuedCount = selectedOrder.doors.length - pendingDoors.length;
    if (issuedCount > 0 && pendingDoors.length > 0) {
      setSelectedDoorIds(pendingDoors.map((d, i) => getDoorKey(d, i)));
    } else {
      setSelectedDoorIds([]);
    }
  }, [selectedOrder?.id]);

  // Fetch saved BOQ Issue Vouchers & Total Issued Value (₹) for selected order
  useEffect(() => {
    let active = true;
    const pid = selectedOrder?.prodOrderId;
    if (!pid) {
      setOrderIssueVouchers([]);
      setOrderTotalIssuedValue(0);
      return;
    }
    apiFetch(`/api/boq/issue?prodOrderId=${encodeURIComponent(pid)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.success && Array.isArray(json.data)) {
          setOrderIssueVouchers(json.data);
          setOrderTotalIssuedValue(Number(json.totalIssuedValue) || 0);
        } else {
          setOrderIssueVouchers([]);
          setOrderTotalIssuedValue(0);
        }
      })
      .catch(() => {
        if (active) {
          setOrderIssueVouchers([]);
          setOrderTotalIssuedValue(0);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedOrder?.prodOrderId]);
  const batchOrders = orders.filter((o) => selectedBatchOrderIds.includes(o.id));
  const activeOrders = isBatchBoqMode
    ? batchOrders
    : selectedOrder
    ? [selectedOrder]
    : [];

  const primaryExtraOrderKey = isConsumablesMode
    ? 'FLOOR-CONSUMABLES'
    : isCustomCalcMode
    ? 'CUSTOM_SIMULATOR'
    : selectedOrder?.prodOrderId || selectedOrder?.id || 'FLOOR-CONSUMABLES';

  const floorConsumables = useMemo(() => {
    return extraItems.filter((item) => {
      const isFC = item.orderKey === 'FLOOR-CONSUMABLES' || Boolean(item.isFloorConsumable);
      if (!isFC) return false;
      if (consumableShiftFilter === 'ALL') return true;
      return (item.issueShift || 'MORNING') === consumableShiftFilter;
    });
  }, [extraItems, consumableShiftFilter]);

  const unOrderedConsumablePoItems = useMemo<PurchaseLineItem[]>(() => {
    return extraItems
      .filter((it) => (it.orderKey === 'FLOOR-CONSUMABLES' || Boolean(it.isFloorConsumable)) && !it.poNumber)
      .map((it) => ({
        extraItemId: it.id,
        itemName: it.itemName,
        category: it.category,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitRate,
        total: it.amount,
      }));
  }, [extraItems]);

  const handleMarkBoqIssued = async () => {
    if (!selectedOrder?.prodOrderId) return;
    setMarkingBoqIssued(true);
    setBoqIssueNotice(null);
    try {
      const res = await apiFetch(`/api/production/${encodeURIComponent(selectedOrder.prodOrderId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_BOQ_ISSUED' }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const nowIso = json.data.boqIssuedAt || new Date().toISOString();
        setOrders((prev) =>
          prev.map((o) =>
            o.prodOrderId === selectedOrder.prodOrderId
              ? {
                  ...o,
                  boqIssuedAt: nowIso,
                  doors: o.doors.map((d) => ({
                    ...d,
                    materialIssued: true,
                    materialIssuedAt: d.materialIssuedAt || nowIso,
                  })),
                }
              : o
          )
        );
        setSelectedDoorIds([]);
        setBoqIssueNotice({
          type: 'success',
          text: `Entire BOQ for ${selectedOrder.jobCardNumber} marked Issued & cleared from Pending!`,
        });
      } else {
        setBoqIssueNotice({
          type: 'error',
          text: json.error || 'Could not mark BOQ issued.',
        });
      }
    } catch (err) {
      console.error('Failed to mark BOQ issued:', err);
      setBoqIssueNotice({ type: 'error', text: 'Network error marking BOQ issued.' });
    } finally {
      setMarkingBoqIssued(false);
    }
  };

  const activeExtraItems = useMemo(() => {
    if (isConsumablesMode) return floorConsumables;
    const keySet = new Set<string>();
    if (isCustomCalcMode) {
      keySet.add('custom_simulator');
    } else {
      activeOrders.forEach((o) => {
        if (o.id) keySet.add(o.id.toLowerCase());
        if (o.prodOrderId) keySet.add(o.prodOrderId.toLowerCase());
        if (o.orderNumber) keySet.add(o.orderNumber.toLowerCase());
      });
    }
    return extraItems.filter((item) => keySet.has(item.orderKey.toLowerCase()));
  }, [extraItems, isConsumablesMode, floorConsumables, isCustomCalcMode, activeOrders]);

  const extraItemsCost = useMemo(
    () => activeExtraItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [activeExtraItems]
  );

  const openAddExtraItemModal = (existing?: BoqExtraItem, forceFloorConsumable = false) => {
    if (existing) {
      setEditingExtraItemId(existing.id);
      setExtraItemName(existing.itemName);
      setExtraItemCategory(existing.category);
      setExtraItemSpecNote(existing.specNote);
      setExtraItemQty(String(existing.quantity));
      setExtraItemUnit(existing.unit);
      setExtraItemRate(String(existing.unitRate));
      setExtraItemShift(existing.issueShift || (forceFloorConsumable ? 'EVENING' : 'MORNING'));
      setExtraItemDate(existing.issueDate || new Date().toISOString().slice(0, 10));
      setExtraItemGangName(existing.gangName || '');
    } else {
      setEditingExtraItemId(null);
      setExtraItemName('');
      setExtraItemCategory('Consumable');
      setExtraItemSpecNote('');
      setExtraItemQty('1');
      setExtraItemUnit('Kg');
      setExtraItemRate('0');
      setExtraItemShift(isConsumablesMode || forceFloorConsumable ? 'EVENING' : 'MORNING');
      setExtraItemDate(new Date().toISOString().slice(0, 10));
      setExtraItemGangName('');
    }
    setIsAddItemModalOpen(true);
  };

  const handleSaveExtraItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraItemName.trim()) return;
    setIsSavingExtraItem(true);
    try {
      const payload = {
        id: editingExtraItemId || undefined,
        orderKey: primaryExtraOrderKey,
        itemName: extraItemName.trim(),
        category: extraItemCategory,
        specNote: extraItemSpecNote.trim(),
        quantity: Math.max(0, Number(extraItemQty) || 0),
        unit: extraItemUnit.trim() || 'Nos',
        unitRate: Math.max(0, Number(extraItemRate) || 0),
        issueShift: extraItemShift,
        issueDate: extraItemDate,
        gangName: extraItemGangName.trim() || undefined,
        isFloorConsumable: primaryExtraOrderKey === 'FLOOR-CONSUMABLES',
      };

      const res = await apiFetch('/api/boq/extra-items', {
        method: editingExtraItemId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (editingExtraItemId) {
          setExtraItems((prev) =>
            prev.map((item) => (item.id === editingExtraItemId ? json.data : item))
          );
        } else {
          setExtraItems((prev) => [...prev, json.data]);
        }
        setIsAddItemModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save extra issue item:', err);
    } finally {
      setIsSavingExtraItem(false);
    }
  };

  const handleDeleteExtraItem = async (id: string) => {
    try {
      const res = await apiFetch(`/api/boq/extra-items?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setExtraItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete extra issue item:', err);
    }
  };

  const readinessOrderKey = isCustomCalcMode
    ? 'CUSTOM_SIMULATOR'
    : isBatchBoqMode
    ? `BATCH_${selectedBatchOrderIds.join('_').slice(0, 40)}`
    : primaryExtraOrderKey;

  const getLockReadinessStatus = (lockBoxId: string): LockReadinessStatus => {
    const key = `${readinessOrderKey.toLowerCase()}::${lockBoxId.toLowerCase()}`;
    return lockReadinessMap[key]?.status || 'PENDING_PURCHASE';
  };

  const handleLockReadinessChange = async (lockBoxId: string, status: LockReadinessStatus) => {
    try {
      const res = await apiFetch('/api/boq/lock-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderKey: readinessOrderKey, lockBoxId, status }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLockReadinessMap((prev) => ({
          ...prev,
          [json.data.key]: json.data,
        }));
      }
    } catch (err) {
      console.error('Failed to save lock readiness:', err);
    }
  };

  const persistLockBoxProfiles = async (nextProfiles: LockBoxProfile[]) => {
    setIsSavingLockBox(true);
    try {
      const res = await apiFetch('/api/boq/material-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockBoxProfiles: nextProfiles }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const merged = mergeBoqMaterialRates(json.data);
        setRatesConfig(merged);
        setDraftRates(merged);
      }
    } catch (err) {
      console.error('Failed to save lock box profiles:', err);
    } finally {
      setIsSavingLockBox(false);
    }
  };

  const openLockBoxEditor = (profile?: LockBoxProfile) => {
    setNewKitItemName('');
    setNewKitItemQty('1');
    setNewKitItemUnit('Pcs');
    if (profile) {
      setIsNewLockBoxModal(false);
      setEditingLockBox({
        ...profile,
        matchKeywords: [...(profile.matchKeywords || [])],
        items: (profile.items || []).map((it) => ({ ...it })),
      });
    } else {
      setIsNewLockBoxModal(true);
      setEditingLockBox({
        id: `box-${Date.now()}`,
        name: '',
        matchKeywords: [],
        boxCost: 600,
        isNoHardware: false,
        items: buildCommonBasicKitItems('New Lock Unit'),
      });
    }
  };

  const handleSaveLockBoxModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLockBox || !editingLockBox.name.trim()) return;

    const cleanProfile: LockBoxProfile = {
      ...editingLockBox,
      name: editingLockBox.name.trim(),
      matchKeywords:
        editingLockBox.matchKeywords.length > 0
          ? editingLockBox.matchKeywords
          : [editingLockBox.name.trim().toLowerCase()],
      boxCost: Math.max(0, Number(editingLockBox.boxCost) || 0),
    };

    const existingList = ratesConfig.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES;
    const exists = existingList.some((p) => p.id === cleanProfile.id);
    const nextProfiles = exists
      ? existingList.map((p) => (p.id === cleanProfile.id ? cleanProfile : p))
      : [...existingList, cleanProfile];

    await persistLockBoxProfiles(nextProfiles);
    setEditingLockBox(null);
  };

  const handleDeleteLockBoxProfile = async (profileId: string) => {
    const existingList = ratesConfig.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES;
    if (existingList.length <= 1) return;
    const nextProfiles = existingList.filter((p) => p.id !== profileId);
    await persistLockBoxProfiles(nextProfiles);
    if (editingLockBox?.id === profileId) {
      setEditingLockBox(null);
    }
  };

  const getPendingDoorsForOrder = (ord: ProductionRequisitionOrder): BoqDoorInput[] =>
    ord.doors.filter((d) => !d.materialIssued);

  const getSelectedDoorsForBatchOrder = (ord: ProductionRequisitionOrder): BoqDoorInput[] => {
    const pending = getPendingDoorsForOrder(ord);
    if (pending.length === 0) return [];
    const explicitKeys = batchDoorIdsByOrder[ord.id];
    if (Array.isArray(explicitKeys)) {
      const keySet = new Set(explicitKeys);
      // STRICT ZERO-DUPLICATE GUARD: Never include already-issued doors in batch calculation/issue!
      return pending.filter((d, idx) => keySet.has(getDoorKey(d, idx)));
    }
    return pending;
  };

  const setBatchOrderDoorCount = (ord: ProductionRequisitionOrder, count: number) => {
    const pendingPool = getPendingDoorsForOrder(ord);
    if (pendingPool.length === 0) return;
    const clamped = Math.max(0, Math.min(pendingPool.length, count));
    const chosenKeys = pendingPool.slice(0, clamped).map((d, idx) => getDoorKey(d, idx));

    setBatchDoorIdsByOrder((prev) => ({ ...prev, [ord.id]: chosenKeys }));
    if (clamped > 0 && !selectedBatchOrderIds.includes(ord.id)) {
      setSelectedBatchOrderIds((prev) => [...prev, ord.id]);
    } else if (clamped === 0) {
      setSelectedBatchOrderIds((prev) => prev.filter((id) => id !== ord.id));
    }
  };

  const toggleBatchOrderSpecificDoor = (ord: ProductionRequisitionOrder, doorKey: string) => {
    const targetDoor = ord.doors.find((d, idx) => getDoorKey(d, idx) === doorKey);
    // HARD LOCK: Prevent checking already-issued doors!
    if (targetDoor?.materialIssued) return;

    const currentSelected = getSelectedDoorsForBatchOrder(ord).map((d, idx) => getDoorKey(d, idx));
    const exists = currentSelected.includes(doorKey);
    const nextKeys = exists
      ? currentSelected.filter((k) => k !== doorKey)
      : [...currentSelected, doorKey];

    setBatchDoorIdsByOrder((prev) => ({ ...prev, [ord.id]: nextKeys }));
    if (nextKeys.length > 0 && !selectedBatchOrderIds.includes(ord.id)) {
      setSelectedBatchOrderIds((prev) => [...prev, ord.id]);
    } else if (nextKeys.length === 0) {
      setSelectedBatchOrderIds((prev) => prev.filter((id) => id !== ord.id));
    }
  };

  const handleSelectAllInProductionOrders = () => {
    const activePending = orders.filter(
      (o) => !getOrderIssueStats(o).isFullyIssued && (o.orderStatus || '').toUpperCase() !== 'COMPLETED'
    );
    const targetList = activePending.length > 0 ? activePending : pendingBoqOrders;
    const nextMap: Record<string, string[]> = {};
    targetList.forEach((o) => {
      const pending = getPendingDoorsForOrder(o);
      nextMap[o.id] = (pending.length > 0 ? pending : o.doors).map((d, i) => getDoorKey(d, i));
    });
    setIsCustomCalcMode(false);
    setIsConsumablesMode(false);
    setIsReportMode(false);
    setIsBatchBoqMode(true);
    setBatchPartyFilter('PENDING');
    setBatchDoorIdsByOrder(nextMap);
    setSelectedBatchOrderIds(targetList.map((o) => o.id));
  };

  const activeDoors = useMemo<BoqDoorInput[]>(() => {
    if (isCustomCalcMode) {
      return customRows.map((row, idx) => {
        const frameObj = framesCatalog.find((f) => f.id === row.frameTypeId);
        return {
          doorNumber: row.label || `Custom-${idx + 1}`,
          widthCm: Math.max(10, Number(row.widthCm) || 80),
          heightCm: Math.max(10, Number(row.heightCm) || 210),
          frameTypeId: row.frameTypeId,
          frameTypeName: frameObj?.name || 'Regular Frame',
          finishColor: row.finishColor || 'Natural Teak EXGC-510',
          lockType: row.lockType || 'Baby Latch Black',
          handing: row.handing || 'RH',
          quantity: Math.max(1, Number(row.quantity) || 1),
        };
      });
    }
    if (isBatchBoqMode) {
      return batchOrders.flatMap((ord) => getSelectedDoorsForBatchOrder(ord));
    }
    if (selectedOrder && selectedDoorIds.length > 0) {
      const filtered = selectedOrder.doors.filter(
        (d) =>
          selectedDoorIds.includes(d.id || '') ||
          selectedDoorIds.includes(d.doorId || '') ||
          selectedDoorIds.includes(d.doorNumber || '')
      );
      if (filtered.length > 0) return filtered;
    }
    return activeOrders.flatMap((o) => o.doors);
  }, [
    isCustomCalcMode,
    customRows,
    framesCatalog,
    activeOrders,
    isBatchBoqMode,
    batchOrders,
    batchDoorIdsByOrder,
    selectedOrder,
    selectedDoorIds,
  ]);

  const activeBatchKey = useMemo(() => {
    if (isCustomCalcMode) return 'CUSTOM_SIMULATOR';
    if (isBatchBoqMode) return 'CONSOLIDATED_BATCH';
    return selectedOrderId || 'SINGLE_ORDER';
  }, [isCustomCalcMode, isBatchBoqMode, selectedOrderId]);

  const selectedDoorsSignature = useMemo(() => {
    return activeDoors
      .map(
        (d, idx) =>
          `${d.id || d.doorId || d.doorNumber || idx}:${d.widthCm || 80}x${d.heightCm || 210}x${d.quantity || 1}`
      )
      .join('|');
  }, [activeDoors]);

  const clearManualCustomQtyOverrides = () => {
    setCustomUsageOverrides((prev) => {
      let changed = false;
      const next: typeof prev = {};
      for (const [key, val] of Object.entries(prev)) {
        if (!val) continue;
        if (val.customQty !== undefined) {
          changed = true;
        }
        if (val.excluded || val.customRate !== undefined || val.note) {
          next[key] = {
            ...(val.excluded ? { excluded: true } : {}),
            ...(val.customRate !== undefined ? { customRate: val.customRate } : {}),
            ...(val.note ? { note: val.note } : {}),
          };
        }
      }
      return changed ? next : prev;
    });
  };

  // Whenever selected parties or door counts change, strip stale manual customQty overrides
  // so Required Qty ALWAYS recalculates live from the Calculation Basis formula (e.g. 8 kg / 18.08 sq.ft).
  useEffect(() => {
    clearManualCustomQtyOverrides();
  }, [selectedDoorsSignature]);

  useEffect(() => {
    if (activeBatchKey === 'CONSOLIDATED_BATCH' || activeBatchKey === 'CUSTOM_SIMULATOR') {
      setCustomUsageBufferPercent(0);
      setCustomUsageOverrides({});
      setCustomUsageNotes('');
      return;
    }
    apiFetch(`/api/boq/custom-usage?batchKey=${encodeURIComponent(activeBatchKey)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCustomUsageBufferPercent(json.data.bufferPercent || 0);
          setCustomUsageOverrides(json.data.overrides || {});
          setCustomUsageNotes(json.data.supervisorNotes || '');
        } else {
          setCustomUsageBufferPercent(0);
          setCustomUsageOverrides({});
          setCustomUsageNotes('');
        }
      })
      .catch(() => {});
  }, [activeBatchKey]);

  const handleSaveCustomUsage = async () => {
    setIsSavingCustomUsage(true);
    setCustomUsageSaveSuccess(false);
    try {
      const res = await apiFetch('/api/boq/custom-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchKey: activeBatchKey,
          bufferPercent: customUsageBufferPercent,
          overrides: customUsageOverrides,
          supervisorNotes: customUsageNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCustomUsageSaveSuccess(true);
        setTimeout(() => setCustomUsageSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save custom BOQ usage:', e);
    } finally {
      setIsSavingCustomUsage(false);
    }
  };

  const handleResetCustomUsage = async () => {
    setCustomUsageBufferPercent(0);
    setCustomUsageOverrides({});
    setCustomUsageNotes('');
    try {
      await apiFetch(`/api/boq/custom-usage?batchKey=${encodeURIComponent(activeBatchKey)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to reset custom BOQ usage:', e);
    }
  };

  const isItemIncluded = (key: string): boolean => !customUsageOverrides[key]?.excluded;

  const toggleItemIncluded = (key: string) => {
    setCustomUsageOverrides((prev) => {
      const existing = prev[key] || {};
      const nextExcluded = !existing.excluded;
      if (!nextExcluded && existing.customQty === undefined && existing.customRate === undefined && !existing.note) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...existing, excluded: nextExcluded } };
    });
  };

  const updateItemCustomQty = (key: string, qty: number | undefined) => {
    setCustomUsageOverrides((prev) => {
      const existing = prev[key] || {};
      if (qty === undefined || Number.isNaN(qty)) {
        const next = { ...prev };
        if (!existing.excluded && existing.customRate === undefined && !existing.note) {
          delete next[key];
        } else {
          next[key] = { ...existing, customQty: undefined };
        }
        return next;
      }
      return { ...prev, [key]: { ...existing, customQty: qty, excluded: false } };
    });
  };

  const updateItemCustomRate = (key: string, rate: number | undefined) => {
    setCustomUsageOverrides((prev) => {
      const existing = prev[key] || {};
      if (rate === undefined || Number.isNaN(rate)) {
        const next = { ...prev };
        if (existing.customQty === undefined && !existing.excluded && !existing.note) {
          delete next[key];
        } else {
          next[key] = { ...existing, customRate: undefined };
        }
        return next;
      }
      return { ...prev, [key]: { ...existing, customRate: rate } };
    });
  };

  const hasCustomUsageOverrides = useMemo(() => {
    return customUsageBufferPercent > 0 || Object.keys(customUsageOverrides).length > 0;
  }, [customUsageBufferPercent, customUsageOverrides]);

  const boq = useMemo(() => {
    return calculateDoorBatchBoq(activeDoors, framesCatalog, ratesConfig);
  }, [activeDoors, framesCatalog, ratesConfig]);

  const applyItemGroupPreset = (preset: 'ALL' | 'CHEMICALS' | 'WOOD_FOAM' | 'HARDWARE') => {
    const chemicalKeys = [
      'resin',
      'gel',
      'catalystGrams',
      'acceleratorGrams',
      'csm300',
      ...(boq.pigmentByColour || []).map((p) => `pigment_${p.matchedRateKey || p.colourLabel}`),
    ];
    const woodFoamKeys = ['timber', 'foam'];
    const extraKeys = activeExtraItems.map((ext) => `extra_${ext.id}`);
    const lockKeys = (boq.lockBoxBreakdown || [])
      .filter((lb) => !lb.isNoHardware)
      .map((lb) => `lock_${lb.profileId}`);
    const allKeys = [...chemicalKeys, ...woodFoamKeys, ...extraKeys, ...lockKeys];

    setCustomUsageOverrides((prev) => {
      const next = { ...prev };
      for (const key of allKeys) {
        const include =
          preset === 'ALL'
            ? true
            : preset === 'CHEMICALS'
            ? chemicalKeys.includes(key)
            : preset === 'WOOD_FOAM'
            ? woodFoamKeys.includes(key)
            : lockKeys.includes(key);
        const existing = next[key] || {};
        if (include) {
          if (existing.customQty === undefined && existing.customRate === undefined && !existing.note) {
            delete next[key];
          } else {
            next[key] = { ...existing, excluded: false };
          }
        } else {
          next[key] = { ...existing, excluded: true };
        }
      }
      return next;
    });
  };

  const effectiveBoq = useMemo(() => {
    const mult = 1 + (customUsageBufferPercent / 100);

    const getField = (key: string, formulaQty: number, standardRate: number) => {
      const ovr = customUsageOverrides[key];
      const included = !ovr?.excluded;
      const withBuf = customUsageBufferPercent > 0 ? Number((formulaQty * mult).toFixed(2)) : formulaQty;
      const qty = ovr?.customQty !== undefined ? ovr.customQty : withBuf;
      const rate = ovr?.customRate !== undefined ? ovr.customRate : standardRate;
      const isOverridden =
        ovr?.customQty !== undefined ||
        ovr?.customRate !== undefined ||
        Boolean(ovr?.excluded) ||
        customUsageBufferPercent > 0;
      return {
        qty,
        rate,
        included,
        cost: included ? Math.round(qty * rate) : 0,
        rawCost: Math.round(qty * rate),
        isOverridden,
        formulaQty,
        standardRate,
      };
    };

    const resin = getField('resin', boq.resinKg, ratesConfig.resinRatePerKg);
    const gel = getField('gel', boq.gelKg, ratesConfig.gelRatePerKg);
    const catalystGrams = getField('catalystGrams', boq.catalystGrams, ratesConfig.catalystRatePerKg / 1000);
    const acceleratorGrams = getField('acceleratorGrams', boq.acceleratorGrams, ratesConfig.acceleratorRatePerKg / 1000);
    const csm300 = getField('csm300', boq.csm300Kg, ratesConfig.csm300RatePerKg);
    const timber = getField('timber', boq.totalWoodCuFt, ratesConfig.woodRatePerCuFt);
    const foam = getField('foam', boq.foamSheetsExact, ratesConfig.foamSheet.costPerSheet);

    let totalPigmentCost = 0;
    if (boq.pigmentByColour && boq.pigmentByColour.length > 0) {
      boq.pigmentByColour.forEach((pig) => {
        const pigKey = `pigment_${pig.matchedRateKey || pig.colourLabel}`;
        const customPig = customUsageOverrides[pigKey];
        if (customPig?.excluded) return;
        const baseGrams =
          customUsageBufferPercent > 0
            ? Math.round(pig.pigmentGrams * mult)
            : Math.round(pig.pigmentGrams);
        const qty = customPig?.customQty !== undefined ? customPig.customQty : baseGrams;
        const rate = customPig?.customRate !== undefined ? customPig.customRate : pig.ratePerKg;
        totalPigmentCost += (qty / 1000) * rate;
      });
    } else {
      totalPigmentCost = boq.pigmentCost;
    }

    const includedExtraCost = activeExtraItems.reduce((sum, ext) => {
      if (customUsageOverrides[`extra_${ext.id}`]?.excluded) return sum;
      return sum + (Number(ext.amount) || 0);
    }, 0);

    const includedLockBoxCost = (boq.lockBoxBreakdown || []).reduce((sum, lb) => {
      if (lb.isNoHardware) return sum;
      if (customUsageOverrides[`lock_${lb.profileId}`]?.excluded) return sum;
      return sum + Math.round(lb.totalBoxCost || 0);
    }, 0);

    const groupACost =
      resin.cost +
      gel.cost +
      catalystGrams.cost +
      acceleratorGrams.cost +
      csm300.cost +
      Math.round(totalPigmentCost);
    const groupBCost = timber.cost + foam.cost;
    const grandTotalCost = groupACost + groupBCost + includedLockBoxCost + Math.round(includedExtraCost);

    return {
      resin,
      gel,
      catalystGrams,
      acceleratorGrams,
      csm300,
      timber,
      foam,
      groupACost,
      groupBCost,
      includedExtraCost: Math.round(includedExtraCost),
      includedLockBoxCost,
      grandTotalCost,
    };
  }, [boq, ratesConfig, customUsageBufferPercent, customUsageOverrides, activeExtraItems]);

  // Build exact checked/marked material rows for Direct Issue & Store Issue Slip
  const markedIssueItems = useMemo<BoqIssueVoucherItem[]>(() => {
    const items: BoqIssueVoucherItem[] = [];
    const mult = 1 + customUsageBufferPercent / 100;

    if (effectiveBoq.resin.included && effectiveBoq.resin.qty > 0) {
      items.push({
        key: 'resin',
        name: 'FRP Polyester Resin',
        unit: 'Kg',
        formulaQty: Number(boq.resinKg.toFixed(2)),
        issuedQty: Number(effectiveBoq.resin.qty.toFixed(2)),
        rate: effectiveBoq.resin.rate,
        value: effectiveBoq.resin.cost,
        category: 'Chemical',
      });
    }
    if (effectiveBoq.gel.included && effectiveBoq.gel.qty > 0) {
      items.push({
        key: 'gel',
        name: 'Gelcoat (GEL Surface Layer)',
        unit: 'Kg',
        formulaQty: Number(boq.gelKg.toFixed(2)),
        issuedQty: Number(effectiveBoq.gel.qty.toFixed(2)),
        rate: effectiveBoq.gel.rate,
        value: effectiveBoq.gel.cost,
        category: 'Chemical',
      });
    }
    if (effectiveBoq.catalystGrams.included && effectiveBoq.catalystGrams.qty > 0) {
      items.push({
        key: 'catalystGrams',
        name: 'Catalyst (MEKP Hardener)',
        unit: 'gm',
        formulaQty: Math.round(boq.catalystGrams),
        issuedQty: Math.round(effectiveBoq.catalystGrams.qty),
        rate: effectiveBoq.catalystGrams.rate,
        value: effectiveBoq.catalystGrams.cost,
        category: 'Catalyst',
      });
    }
    if (effectiveBoq.acceleratorGrams.included && effectiveBoq.acceleratorGrams.qty > 0) {
      items.push({
        key: 'acceleratorGrams',
        name: 'Accelerator (Cobalt Solution)',
        unit: 'gm',
        formulaQty: Math.round(boq.acceleratorGrams),
        issuedQty: Math.round(effectiveBoq.acceleratorGrams.qty),
        rate: effectiveBoq.acceleratorGrams.rate,
        value: effectiveBoq.acceleratorGrams.cost,
        category: 'Accelerator',
      });
    }
    if (effectiveBoq.csm300.included && effectiveBoq.csm300.qty > 0) {
      items.push({
        key: 'csm300',
        name: 'Chopped Strand Mat (300 GSM)',
        unit: 'Kg',
        formulaQty: Number(boq.csm300Kg.toFixed(2)),
        issuedQty: Number(effectiveBoq.csm300.qty.toFixed(2)),
        rate: effectiveBoq.csm300.rate,
        value: effectiveBoq.csm300.cost,
        category: '300 GSM',
      });
    }

    (boq.pigmentByColour || []).forEach((pig) => {
      const pigKey = `pigment_${pig.matchedRateKey || pig.colourLabel}`;
      const customPig = customUsageOverrides[pigKey];
      if (customPig?.excluded) return;
      const baseGrams =
        customUsageBufferPercent > 0
          ? Math.round(pig.pigmentGrams * mult)
          : Math.round(pig.pigmentGrams);
      const qty = customPig?.customQty !== undefined ? customPig.customQty : baseGrams;
      const rate = customPig?.customRate !== undefined ? customPig.customRate : pig.ratePerKg;
      if (qty > 0) {
        items.push({
          key: pigKey,
          name: `Pigment Paste — ${pig.colourLabel}`,
          unit: 'gm',
          formulaQty: Math.round(pig.pigmentGrams),
          issuedQty: Math.round(qty),
          rate: rate / 1000,
          value: Math.round((qty / 1000) * rate),
          category: 'Pigment',
        });
      }
    });

    if (effectiveBoq.timber.included && effectiveBoq.timber.qty > 0) {
      items.push({
        key: 'timber',
        name: 'Timber Reepers (Frame + Shutter Wood)',
        unit: 'Cu.Ft',
        formulaQty: Number(boq.totalWoodCuFt.toFixed(4)),
        issuedQty: Number(effectiveBoq.timber.qty.toFixed(4)),
        rate: effectiveBoq.timber.rate,
        value: effectiveBoq.timber.cost,
        category: 'Timber Wood',
      });
    }

    if (effectiveBoq.foam.included && effectiveBoq.foam.qty > 0) {
      items.push({
        key: 'foam',
        name: `Rigid Foam Sheet (${ratesConfig.foamSheet.widthCm}×${ratesConfig.foamSheet.heightCm} cm)`,
        unit: 'Sheets',
        formulaQty: Number(boq.foamSheetsExact.toFixed(2)),
        issuedQty: Number(effectiveBoq.foam.qty.toFixed(2)),
        rate: effectiveBoq.foam.rate,
        value: effectiveBoq.foam.cost,
        category: 'Rigid Foam',
      });
    }

    activeExtraItems.forEach((ext) => {
      const extKey = `extra_${ext.id}`;
      if (customUsageOverrides[extKey]?.excluded) return;
      items.push({
        key: extKey,
        name: ext.itemName,
        unit: ext.unit,
        formulaQty: ext.quantity,
        issuedQty: ext.quantity,
        rate: ext.unitRate,
        value: Math.round(ext.amount || 0),
        category: ext.category || 'Extra Item',
      });
    });

    (boq.lockBoxBreakdown || []).forEach((lb) => {
      if (lb.isNoHardware) return;
      const lockKey = `lock_${lb.profileId}`;
      if (customUsageOverrides[lockKey]?.excluded) return;
      if (lb.doorsCount > 0) {
        items.push({
          key: lockKey,
          name: `${lb.boxName} (Lock Kit Box)`,
          unit: 'Boxes',
          formulaQty: lb.doorsCount,
          issuedQty: lb.doorsCount,
          rate: lb.boxCost,
          value: Math.round(lb.totalBoxCost || 0),
          category: 'Hardware / Lock',
        });
      }
    });

    return items;
  }, [effectiveBoq, boq, ratesConfig, customUsageBufferPercent, customUsageOverrides, activeExtraItems]);

  const markedIssueTotalValue = useMemo(
    () => Math.round(markedIssueItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0)),
    [markedIssueItems]
  );

  const applyOrderUpdateAfterIssue = (result: DailyStoreIssueResult) => {
    const updatedOrder = result.updatedOrder;
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.prodOrderId !== updatedOrder.id) return ord;
        const doorById = new Map<string, typeof updatedOrder.doors[number]>();
        (updatedOrder.doors || []).forEach((d) => {
          if (d.id) doorById.set(d.id, d);
          if (d.doorId) doorById.set(d.doorId, d);
          if (d.doorNumber) doorById.set(d.doorNumber, d);
        });
        const mergedDoors = ord.doors.map((d) => {
          const match =
            (d.id && doorById.get(d.id)) ||
            (d.doorId && doorById.get(d.doorId)) ||
            (d.doorNumber && doorById.get(d.doorNumber));
          if (!match) return d;
          return {
            ...d,
            materialIssued: Boolean(match.materialIssued),
            materialIssuedAt: match.materialIssuedAt,
            materialIssueBatchId: match.materialIssueBatchId,
            materialIssuedToGang: match.materialIssuedToGang,
            materialIssuedValue: match.materialIssuedValue,
          };
        });
        return {
          ...ord,
          boqIssuedAt: updatedOrder.boqIssuedAt ?? null,
          doors: mergedDoors,
        };
      })
    );

    if (result.voucher) {
      setOrderIssueVouchers((prev) => [
        result.voucher,
        ...prev.filter((v) => v.id !== result.voucher.id),
      ]);
    }
    setOrderTotalIssuedValue(Number(result.totalOrderIssuedValue) || 0);

    // Auto-select ONLY remaining pending doors (or clear selection once all doors are issued!)
    const nextPendingKeys = (updatedOrder.doors || [])
      .filter((d) => !d.materialIssued)
      .map((d, i) => d.id || d.doorId || d.doorNumber || `door-${i}`);
    setSelectedDoorIds(nextPendingKeys.length > 0 ? nextPendingKeys : []);
  };

  const handleDirectIssueSelectedDoors = async () => {
    if (!selectedOrder?.prodOrderId) return;

    // HARD STAGE GUARD: Only orders transitioning from Queue to Molding can issue raw BOQ
    if (!isOrderInMoldingPipeline(selectedOrder)) {
      setBoqIssueNotice({
        type: 'error',
        text: `BLOCKED: Order ${selectedOrder.jobCardNumber} has already passed molding (Current Stage: ${selectedOrder.orderStatus}). Raw material BOQ can only be issued for orders transitioning from Queue to Molding.`,
      });
      return;
    }

    // STRICT ZERO-DUPLICATE GUARD: Filter out any already-issued doors before submission
    const unissuedTargetDoors = activeDoors.filter((d) => !d.materialIssued);
    if (unissuedTargetDoors.length === 0) {
      setBoqIssueNotice({
        type: 'error',
        text: `BLOCKED: All selected doors in ${selectedOrder.jobCardNumber} already have BOQ issued! Duplicate issue is not allowed.`,
      });
      return;
    }
    const targetDoors = unissuedTargetDoors;
    const doorIds = targetDoors
      .map((d) => d.id || d.doorId || d.doorNumber)
      .filter(Boolean) as string[];
    const doorNumbers = targetDoors.map((d, idx) => d.doorNumber || `D-${idx + 1}`);

    if (doorIds.length === 0) {
      setBoqIssueNotice({ type: 'error', text: 'Select at least 1 door before issuing BOQ.' });
      return;
    }
    if (markedIssueItems.length === 0) {
      setBoqIssueNotice({
        type: 'error',
        text: 'Mark/check at least 1 material item in Custom Usage before issuing.',
      });
      return;
    }

    setIsIssuingBoq(true);
    setBoqIssueNotice(null);
    try {
      // 1. Persist custom usage edits first if any exist
      if (hasCustomUsageOverrides || isCustomUsageEditMode) {
        await apiFetch('/api/boq/custom-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchKey: activeBatchKey,
            bufferPercent: customUsageBufferPercent,
            overrides: customUsageOverrides,
            supervisorNotes: customUsageNotes,
          }),
        });
      }

      // 2. Record BOQ issue voucher & mark selected doors as issued
      const res = await apiFetch('/api/boq/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prodOrderId: selectedOrder.prodOrderId,
          orderNumber: selectedOrder.orderNumber,
          jobCardNumber: selectedOrder.jobCardNumber,
          customerName: selectedOrder.customerName,
          doorIds,
          doorNumbers,
          items: markedIssueItems,
          shift: issueShift,
          gangName: issueGangName.trim() || 'Production Floor Team',
          bufferPercent: customUsageBufferPercent,
          notes: customUsageNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Failed to issue BOQ (HTTP ${res.status})`);
      }

      applyOrderUpdateAfterIssue(json.data as DailyStoreIssueResult);
      clearManualCustomQtyOverrides();
      setBoqIssueNotice({
        type: 'success',
        text:
          json.message ||
          `Issued ${json.data.voucher.voucherNumber} (₹${json.data.voucher.totalIssuedValue.toLocaleString('en-IN')})`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to issue BOQ materials';
      console.error('Failed to direct issue BOQ:', err);
      setBoqIssueNotice({ type: 'error', text: msg });
    } finally {
      setIsIssuingBoq(false);
    }
  };

  const handleReverseIssueVoucher = async (voucher: BoqIssueVoucherRecord) => {
    setReversingVoucherId(voucher.id);
    setBoqIssueNotice(null);
    try {
      const res = await apiFetch(`/api/boq/issue?id=${encodeURIComponent(voucher.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not reverse BOQ voucher');
      }
      setOrderIssueVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
      setOrderTotalIssuedValue(Number(json.data?.totalOrderIssuedValue) || 0);
      if (json.data?.updatedOrder) {
        const uo = json.data.updatedOrder;
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.prodOrderId !== uo.id) return ord;
            const doorById = new Map<string, any>();
            (uo.doors || []).forEach((d: any) => {
              if (d.id) doorById.set(d.id, d);
              if (d.doorId) doorById.set(d.doorId, d);
              if (d.doorNumber) doorById.set(d.doorNumber, d);
            });
            return {
              ...ord,
              boqIssuedAt: uo.boqIssuedAt ?? null,
              doors: ord.doors.map((d) => {
                const match =
                  (d.id && doorById.get(d.id)) ||
                  (d.doorId && doorById.get(d.doorId)) ||
                  (d.doorNumber && doorById.get(d.doorNumber));
                if (!match) return d;
                return {
                  ...d,
                  materialIssued: Boolean(match.materialIssued),
                  materialIssuedAt: match.materialIssuedAt,
                  materialIssueBatchId: match.materialIssueBatchId,
                  materialIssuedToGang: match.materialIssuedToGang,
                  materialIssuedValue: match.materialIssuedValue,
                };
              }),
            };
          })
        );
        const nextPendingKeys = (uo.doors || [])
          .filter((d: any) => !d.materialIssued)
          .map((d: any, i: number) => d.id || d.doorId || d.doorNumber || `door-${i}`);
        setSelectedDoorIds(nextPendingKeys);
      }
      setBoqIssueNotice({
        type: 'success',
        text: json.message || `Reversed ${voucher.voucherNumber} and restored doors to Pending.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reverse voucher';
      setBoqIssueNotice({ type: 'error', text: msg });
    } finally {
      setReversingVoucherId(null);
    }
  };

  const totalDoors = boq.totalDoors;
  const totalSqft = Number(boq.totalSqFt.toFixed(2));
  const totalLockBoxCost = Math.round(boq.totalLockBoxCost);
  const doorRawAndExtraTotal = Math.round(boq.grandTotalCost + extraItemsCost);
  const grandTotalCost = hasCustomUsageOverrides ? effectiveBoq.grandTotalCost : doorRawAndExtraTotal + totalLockBoxCost;
  const effectiveCostPerDoor = totalDoors > 0 ? grandTotalCost / totalDoors : 0;
  const effectiveCostPerSqFt = boq.totalSqFt > 0 ? (grandTotalCost - totalLockBoxCost) / boq.totalSqFt : 0;

  const consolidatedBatchEntries = useMemo<ConsolidatedPartySlipEntry[]>(() => {
    if (!isBatchBoqMode) return [];
    return batchOrders
      .map((ord) => {
        const chosen = getSelectedDoorsForBatchOrder(ord);
        const doorIds = chosen.map((d, idx) => getDoorKey(d, idx)).filter(Boolean);
        const doorNumbers = chosen.map((d, idx) => d.doorNumber || `D-${idx + 1}`);
        const selectedSqFt = chosen.reduce(
          (s, d) => s + ((d.widthCm || 80) * (d.heightCm || 210)) / 929.0304,
          0
        );
        const chosenSet = new Set(doorIds);
        const balanceDoorsAfter = ord.doors.filter(
          (d, idx) => !d.materialIssued && !chosenSet.has(getDoorKey(d, idx))
        ).length;

        return {
          prodOrderId: ord.prodOrderId || ord.id,
          orderNumber: ord.orderNumber,
          jobCardNumber: ord.jobCardNumber,
          customerName: ord.customerName,
          totalOrderDoors: ord.doors.length,
          doorIds,
          doorNumbers,
          selectedSqFt: Number(selectedSqFt.toFixed(2)),
          balanceDoorsAfter,
        };
      })
      .filter((e) => e.doorIds.length > 0);
  }, [isBatchBoqMode, batchOrders, batchDoorIdsByOrder]);

  const applyBatchUpdateAfterIssue = (result: ConsolidatedBatchIssueResult, message?: string) => {
    const updatedById = new Map(
      (result.updatedOrders || []).map((uo) => [uo.id, uo])
    );

    const nextOrders: ProductionRequisitionOrder[] = orders.map((ord) => {
      const uo = ord.prodOrderId ? updatedById.get(ord.prodOrderId) : undefined;
      if (!uo) return ord;
      const doorById = new Map<string, typeof uo.doors[number]>();
      (uo.doors || []).forEach((d) => {
        if (d.id) doorById.set(d.id, d);
        if (d.doorId) doorById.set(d.doorId, d);
        if (d.doorNumber) doorById.set(d.doorNumber, d);
      });
      return {
        ...ord,
        boqIssuedAt: uo.boqIssuedAt ?? null,
        doors: ord.doors.map((d) => {
          const match =
            (d.id && doorById.get(d.id)) ||
            (d.doorId && doorById.get(d.doorId)) ||
            (d.doorNumber && doorById.get(d.doorNumber));
          if (!match) return d;
          return {
            ...d,
            materialIssued: Boolean(match.materialIssued),
            materialIssuedAt: match.materialIssuedAt,
            materialIssueBatchId: match.materialIssueBatchId,
            materialIssuedToGang: match.materialIssuedToGang,
            materialIssuedValue: match.materialIssuedValue,
          };
        }),
      };
    });

    setOrders(nextOrders);
    if (Array.isArray(result.consolidatedBatches)) {
      setConsolidatedBatches(result.consolidatedBatches);
    }

    // Remove fully-cleared parties from active batch selection, and auto-select ONLY remaining balance doors for partial parties!
    const nextBatchDoorMap: Record<string, string[]> = { ...batchDoorIdsByOrder };
    const nextSelectedIds: string[] = [];

    for (const id of selectedBatchOrderIds) {
      const ord = nextOrders.find((o) => o.id === id);
      if (!ord) continue;
      const pending = ord.doors.filter((d) => !d.materialIssued);
      if (pending.length === 0) {
        delete nextBatchDoorMap[ord.id];
      } else {
        nextSelectedIds.push(ord.id);
        nextBatchDoorMap[ord.id] = pending.map((d, i) => getDoorKey(d, i));
      }
    }

    setBatchDoorIdsByOrder(nextBatchDoorMap);
    setSelectedBatchOrderIds(nextSelectedIds);

    if (message) {
      setBoqIssueNotice({ type: 'success', text: message });
    }
  };

  const handleDirectIssueConsolidatedBatch = async () => {
    if (consolidatedBatchEntries.length === 0) {
      setBoqIssueNotice({
        type: 'error',
        text: 'Select at least 1 party with pending doors in Consolidated BOQ before issuing.',
      });
      return;
    }

    // HARD STAGE GUARD: Exclude parties that have already passed molding
    const ineligibleParties = consolidatedBatchEntries.filter((e) => {
      const match = orders.find((o) => o.id === e.prodOrderId || o.prodOrderId === e.prodOrderId);
      return match && !isOrderInMoldingPipeline(match);
    });
    if (ineligibleParties.length > 0) {
      setBoqIssueNotice({
        type: 'error',
        text: `BLOCKED: Party ${ineligibleParties.map((p) => p.jobCardNumber).join(', ')} has already passed molding. Only orders in Queue or Molding can be included in the batch.`,
      });
      return;
    }
    if (markedIssueItems.length === 0) {
      setBoqIssueNotice({
        type: 'error',
        text: 'Mark/check at least 1 material item in Custom Usage before issuing.',
      });
      return;
    }

    setIsIssuingBoq(true);
    setBoqIssueNotice(null);
    try {
      const res = await apiFetch('/api/boq/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CONSOLIDATED_BATCH',
          entries: consolidatedBatchEntries.map((e) => ({
            prodOrderId: e.prodOrderId,
            orderNumber: e.orderNumber,
            jobCardNumber: e.jobCardNumber,
            customerName: e.customerName,
            doorIds: e.doorIds,
            doorNumbers: e.doorNumbers,
            selectedSqFt: e.selectedSqFt,
          })),
          items: markedIssueItems,
          shift: issueShift,
          gangName: issueGangName.trim() || 'Production Floor Team',
          bufferPercent: customUsageBufferPercent,
          notes: customUsageNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Failed to issue Consolidated Batch (HTTP ${res.status})`);
      }

      applyBatchUpdateAfterIssue(json.data as ConsolidatedBatchIssueResult, json.message);
      clearManualCustomQtyOverrides();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to issue Consolidated BOQ batch';
      console.error('Failed to direct issue consolidated BOQ:', err);
      setBoqIssueNotice({ type: 'error', text: msg });
    } finally {
      setIsIssuingBoq(false);
    }
  };

  const handleReverseConsolidatedBatch = async (batchNumber: string) => {
    setReversingBatchNumber(batchNumber);
    setBoqIssueNotice(null);
    try {
      const res = await apiFetch(`/api/boq/issue?batchNumber=${encodeURIComponent(batchNumber)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not reverse Consolidated Batch');
      }
      if (Array.isArray(json.data?.consolidatedBatches)) {
        setConsolidatedBatches(json.data.consolidatedBatches);
      } else {
        setConsolidatedBatches((prev) => prev.filter((b) => b.batchNumber !== batchNumber));
      }
      if (Array.isArray(json.data?.updatedOrders)) {
        const updatedById = new Map<string, any>(
          json.data.updatedOrders.map((uo: any) => [uo.id, uo])
        );
        setOrders((prev) =>
          prev.map((ord) => {
            const uo = ord.prodOrderId ? updatedById.get(ord.prodOrderId) : undefined;
            if (!uo) return ord;
            const doorById = new Map<string, any>();
            (uo.doors || []).forEach((d: any) => {
              if (d.id) doorById.set(d.id, d);
              if (d.doorId) doorById.set(d.doorId, d);
              if (d.doorNumber) doorById.set(d.doorNumber, d);
            });
            return {
              ...ord,
              boqIssuedAt: uo.boqIssuedAt ?? null,
              doors: ord.doors.map((d) => {
                const match =
                  (d.id && doorById.get(d.id)) ||
                  (d.doorId && doorById.get(d.doorId)) ||
                  (d.doorNumber && doorById.get(d.doorNumber));
                if (!match) return d;
                return {
                  ...d,
                  materialIssued: Boolean(match.materialIssued),
                  materialIssuedAt: match.materialIssuedAt,
                  materialIssueBatchId: match.materialIssueBatchId,
                  materialIssuedToGang: match.materialIssuedToGang,
                  materialIssuedValue: match.materialIssuedValue,
                };
              }),
            };
          })
        );
      }
      setBoqIssueNotice({
        type: 'success',
        text: json.message || `Reversed Consolidated Batch ${batchNumber} back to Pending.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reverse consolidated batch';
      setBoqIssueNotice({ type: 'error', text: msg });
    } finally {
      setReversingBatchNumber(null);
    }
  };

  const toggleBatchOrder = (id: string) => {
    const ord = orders.find((o) => o.id === id);
    // HARD LOCK: Prevent selecting fully-issued parties into a new Consolidated BOQ batch!
    if (ord && getOrderIssueStats(ord).pending === 0 && !selectedBatchOrderIds.includes(id)) {
      return;
    }
    setSelectedBatchOrderIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (ord) {
        const pending = getPendingDoorsForOrder(ord);
        const defaultKeys = pending.map((d, i) => getDoorKey(d, i));
        setBatchDoorIdsByOrder((m) => ({
          ...m,
          [ord.id]: m[ord.id]?.length ? m[ord.id] : defaultKeys,
        }));
      }
      return [...prev, id];
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const openRatesModal = () => {
    setDraftRates(mergeBoqMaterialRates(ratesConfig));
    setRatesSaveNotice(null);
    setIsRatesModalOpen(true);
  };

  const handleSaveRates = async (resetToDefaults = false) => {
    setIsSavingRates(true);
    setRatesSaveNotice(null);
    try {
      const res = await apiFetch('/api/boq/material-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetToDefaults ? { resetToDefaults: true } : draftRates),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const merged = mergeBoqMaterialRates(json.data);
        if (json.data.pigmentRatesByColour) {
          merged.pigmentRatesByColour = json.data.pigmentRatesByColour;
        }
        setRatesConfig(merged);
        setDraftRates(merged);
        setRatesSaveNotice(
          resetToDefaults ? 'Factory BOQ defaults restored' : 'BOQ material & pigment rates saved'
        );
      }
    } catch (err) {
      console.error('Error saving BOQ material rates:', err);
    } finally {
      setIsSavingRates(false);
    }
  };

  const handleAddPigmentColour = () => {
    const cleanName = newPigmentColour.trim();
    const numRate = Number(newPigmentRate);
    if (!cleanName || !Number.isFinite(numRate) || numRate < 0) return;
    setDraftRates((prev) => ({
      ...prev,
      pigmentRatesByColour: {
        ...prev.pigmentRatesByColour,
        [cleanName]: numRate,
      },
    }));
    setNewPigmentColour('');
    setNewPigmentRate('520');
  };

  const handleDeletePigmentColour = (key: string) => {
    if (key === 'Default') return;
    setDraftRates((prev) => {
      const next = { ...prev.pigmentRatesByColour };
      delete next[key];
      return { ...prev, pigmentRatesByColour: next };
    });
  };

  const frameModeLabel =
    ratesConfig.frameLengthMode === 'FRAME_3SIDE_MINUS_DED'
      ? '(2×H + W) − Deduction'
      : ratesConfig.frameLengthMode === 'FRAME_2H_MINUS_DED'
      ? '(2×H) − Deduction'
      : 'H − Deduction';

  return (
    <div className="space-y-3">
      {/* Compact Single-Row Auto-BOQ Command Bar */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <h2 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-1.5 truncate">
            <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              {isCustomCalcMode
                ? 'Quick Size BOQ Calculator'
                : isBatchBoqMode
                ? 'Consolidated Multi-Party BOQ'
                : isReportMode
                ? 'BOQ Issued Report'
                : 'Auto-BOQ & Store Requisition'}
            </span>
          </h2>
          <span
            className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0"
            title={`Resin ${ratesConfig.resinKg}kg · Gel ${ratesConfig.gelKg}kg · Catalyst ${ratesConfig.catalystGrams}g · Accelerator ${ratesConfig.acceleratorGrams}g · CSM ${ratesConfig.csm300Kg}kg · Pigment ${ratesConfig.pigmentGrams}g per ${ratesConfig.baseDoorWidthCm}×${ratesConfig.baseDoorHeightCm} cm (${boq.baseDoorSqFt.toFixed(2)} Sq.Ft)`}
          >
            {ratesConfig.resinKg}kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={openRatesModal}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 transition inline-flex items-center gap-1 cursor-pointer"
            title="BOQ Rates, Pigments & Lock Kits"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rates</span>
          </button>

          <button
            type="button"
            onClick={handleSelectAllInProductionOrders}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/50 transition inline-flex items-center gap-1 cursor-pointer"
            title="Combine all non-completed production orders to check total locks & kit screws needed before delivery rush"
          >
            <Lock className="w-3.5 h-3.5 text-rose-300" />
            <span>Lock Rush</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isConsumablesMode;
              setIsConsumablesMode(next);
              if (next) {
                setIsCustomCalcMode(false);
                setIsBatchBoqMode(false);
                setIsReportMode(false);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
              isConsumablesMode
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white ring-1 ring-indigo-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-600/60'
            }`}
            title="Log standalone evening / daily floor consumables not tied to a single door order & convert to PO"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Consumables ({extraItems.filter((i) => i.orderKey === 'FLOOR-CONSUMABLES' || i.isFloorConsumable).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isCustomCalcMode;
              setIsCustomCalcMode(next);
              if (next) {
                setIsBatchBoqMode(false);
                setIsConsumablesMode(false);
                setIsReportMode(false);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
              isCustomCalcMode
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white ring-1 ring-cyan-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-600/60'
            }`}
            title="Quick Door Size Auto-BOQ Calculator (80×210 cm Basis)"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Size Calc</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isBatchBoqMode;
              setIsBatchBoqMode(next);
              if (next) {
                setIsCustomCalcMode(false);
                setIsConsumablesMode(false);
                setIsReportMode(false);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
              isBatchBoqMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Consolidated BOQ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isReportMode;
              setIsReportMode(next);
              if (next) {
                setReportInitialOrderId('');
                setIsBatchBoqMode(false);
                setIsCustomCalcMode(false);
                setIsConsumablesMode(false);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
              isReportMode
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white ring-1 ring-cyan-300/60'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/50'
            }`}
            title="View Door-Wise, Order-Wise & Batch-Wise BOQ Issued Report with CSV Export and Print"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>BOQ Report</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomUsageEditMode((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
              isCustomUsageEditMode
                ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                : hasCustomUsageOverrides
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
            }`}
            title="Edit raw material quantities, adjust buffer %, and override rates for shop-floor custom usage"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>
              {isCustomUsageEditMode
                ? 'Close Edit'
                : hasCustomUsageOverrides
                ? `Custom (+${customUsageBufferPercent}%)`
                : 'Custom Usage'}
            </span>
          </button>

          {!isBatchBoqMode && !isCustomCalcMode && !isConsumablesMode && !isReportMode && (
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={orderHistoryFilter}
                onChange={(e) => setOrderHistoryFilter(e.target.value as 'ALL' | 'PENDING' | 'ISSUED')}
                className="bg-[#070D1E] border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1.5 font-semibold cursor-pointer"
                title="Filter between Pending BOQ Issue vs Already Issued BOQ History"
              >
                <option value="ALL">All Active Orders ({pendingBoqOrders.length + issuedBoqOrders.length})</option>
                <option value="PENDING">🔥 Queue ➔ Molding Pending ({pendingBoqOrders.length})</option>
                <option value="ISSUED">✓ Already Issued History ({issuedBoqOrders.length})</option>
              </select>

              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full md:w-auto bg-[#070D1E] border border-emerald-600/80 text-emerald-200 text-xs rounded-xl p-2 font-bold focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {orders.length === 0 ? (
                  <option value="">No Job Cards Yet</option>
                ) : (
                  <>
                    {(orderHistoryFilter === 'ALL' || orderHistoryFilter === 'PENDING') &&
                      pendingBoqOrders.length > 0 && (
                        <optgroup label="🔥 Ready for Molding (ക്യൂവ് ➔ മോൾഡിംഗ് - PENDING BOQ)">
                          {pendingBoqOrders.map((o) => {
                            const stats = getOrderIssueStats(o);
                            const stageTag = o.orderStatus === 'QUEUED' ? 'QUEUE ➔ MOLD' : 'MOLDING';
                            const tag = stats.isPartial
                              ? `[${stageTag} • PARTIAL ${stats.issued}/${stats.total}]`
                              : `[${stageTag} • PENDING]`;
                            return (
                              <option key={o.id} value={o.id}>
                                {tag} {o.jobCardNumber} — {o.customerName} ({o.doorsCount} Doors)
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    {(orderHistoryFilter === 'ALL' || orderHistoryFilter === 'ISSUED') &&
                      issuedBoqOrders.length > 0 && (
                        <optgroup label="✓ Already Issued BOQ History (നൽകി കഴിഞ്ഞവ)">
                          {issuedBoqOrders.map((o) => (
                            <option key={o.id} value={o.id}>
                              [ISSUED {o.boqIssuedAt ? o.boqIssuedAt.slice(0, 10) : ''}] {o.jobCardNumber} — {o.customerName} ({o.doorsCount} Doors)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    {orderHistoryFilter === 'ALL' && pastMoldingOrders.length > 0 && (
                      <optgroup label="📜 Past Molding / Floor Progress (മോൾഡിംഗ് കഴിഞ്ഞവ - VIEW ONLY)">
                        {pastMoldingOrders.map((o) => (
                          <option key={o.id} value={o.id}>
                            [PAST MOLDING: {o.orderStatus}] {o.jobCardNumber} — {o.customerName} ({o.doorsCount} Doors)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>

              {selectedOrder && (() => {
                const selStats = getOrderIssueStats(selectedOrder);
                return (
                  <>
                    {!selStats.isFullyIssued && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIssueVoucher(null);
                          setPreviewConsolidatedBatch(null);
                          setIsDailyIssueSlipOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow cursor-pointer transition"
                        title="Print Daily Store Material Issue Voucher for today's selected pending doors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Daily Issue Slip ({activeDoors.filter((d) => !d.materialIssued).length} Doors)</span>
                      </button>
                    )}

                    {selStats.isFullyIssued ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            All {selStats.total} Doors Issued (Locked)
                            {selectedOrder.boqIssuedAt ? ` • ${selectedOrder.boqIssuedAt.slice(0, 10)}` : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReportInitialOrderId(selectedOrder.prodOrderId || selectedOrder.id);
                            setIsReportMode(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-500/50 text-[11px] font-bold cursor-pointer"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Door Report</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={markingBoqIssued}
                        onClick={handleMarkBoqIssued}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow cursor-pointer disabled:opacity-50"
                        title="Mark every remaining door in this order as issued and clear from Pending"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {markingBoqIssued
                            ? 'Marking...'
                            : selStats.isPartial
                            ? `✓ Mark Remaining ${selStats.pending} Issued`
                            : '✓ Mark Entire BOQ Issued'}
                        </span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* LIVE BOQ ISSUE NOTIFICATION BANNER */}
      {boqIssueNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            boqIssueNotice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{boqIssueNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBoqIssueNotice(null)}
            className="p-1 rounded hover:bg-slate-800/60 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DOOR-WISE / ORDER-WISE / BATCH-WISE BOQ ISSUED REPORT */}
      {isReportMode && (
        <BoqIssuedReportPanel
          initialOrderId={reportInitialOrderId}
          onClose={() => setIsReportMode(false)}
        />
      )}

      {/* DAILY PARTIAL DOOR SLICER (FOR TEAM-WISE 2 / 3 / 4 / 6 DOOR BATCHES & PENDING CLEARING) */}
      {!isReportMode && !isBatchBoqMode && !isCustomCalcMode && !isConsumablesMode && selectedOrder && selectedOrder.doors.length > 0 && (() => {
        const selStats = getOrderIssueStats(selectedOrder);
        const pendingSelectedCount = activeDoors.filter((d) => !d.materialIssued).length;
        const pickNextPendingDoors = (count: number) => {
          const pendingPool = selectedOrder.doors.filter((d) => !d.materialIssued);
          if (pendingPool.length === 0) return;
          setSelectedDoorIds(pendingPool.slice(0, count).map((d, i) => getDoorKey(d, i)));
        };

        return (
          <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Team-Wise Partial Door Slicer (പാർഷ്യൽ ഡോർ BOQ ബാച്ച്)
                </h4>
                <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-600/40">
                  Selected: {pendingSelectedCount} Pending of {selectedOrder.doors.length} Doors
                </span>
                {selectedOrder.orderStatus === 'QUEUED' ? (
                  <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/50">
                    ⚡ Queue ➜ Molding
                  </span>
                ) : selectedOrder.orderStatus === 'MOLDING' ? (
                  <span className="text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50">
                    🔨 In Molding
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    📜 Past Molding ({selectedOrder.orderStatus})
                  </span>
                )}
                <span className="text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/40">
                  🔒 Issued: {selStats.issued}/{selStats.total}
                </span>
                {selStats.pending > 0 ? (
                  <span className="text-[10px] text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-600/40">
                    ⏳ Pending: {selStats.pending} Left
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-300 font-black px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60">
                    🔒 All Doors Issued — Duplicate Blocked
                  </span>
                )}
                {orderTotalIssuedValue > 0 && (
                  <span className="text-[10px] text-cyan-300 font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-600/40">
                    Total Issued Value: ₹{orderTotalIssuedValue.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {selStats.pending >= 2 && (
                  <button
                    type="button"
                    onClick={() => pickNextPendingDoors(2)}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-amber-300 border border-amber-500/40 cursor-pointer transition"
                    title="Select the next 2 pending doors for a small team"
                  >
                    2 Doors
                  </button>
                )}
                {selStats.pending >= 3 && (
                  <button
                    type="button"
                    onClick={() => pickNextPendingDoors(3)}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-amber-300 border border-amber-500/40 cursor-pointer transition"
                    title="Select the next 3 pending doors for a team"
                  >
                    3 Doors
                  </button>
                )}
                {selStats.pending >= 4 && (
                  <button
                    type="button"
                    onClick={() => pickNextPendingDoors(4)}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-amber-300 border border-amber-500/40 cursor-pointer transition"
                  >
                    4 Doors
                  </button>
                )}
                {selStats.pending >= 6 && (
                  <button
                    type="button"
                    onClick={() => pickNextPendingDoors(6)}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-amber-300 border border-amber-500/40 cursor-pointer transition"
                  >
                    6 Doors
                  </button>
                )}
                {selStats.pending > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const pending = selectedOrder.doors
                        .filter((d) => !d.materialIssued)
                        .map((d, i) => getDoorKey(d, i));
                      setSelectedDoorIds(pending);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-rose-950/70 hover:bg-rose-800 text-rose-200 border border-rose-500/40 cursor-pointer"
                  >
                    ⏳ All Pending ({selStats.pending})
                  </button>
                )}
                {selStats.pending > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDirectIssueSelectedDoors}
                      disabled={isIssuingBoq || pendingSelectedCount === 0 || markedIssueItems.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-black shadow cursor-pointer transition disabled:opacity-50"
                      title="Directly issue marked BOQ items for the selected unissued doors and clear them from Pending"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {isIssuingBoq
                          ? 'Issuing...'
                          : `✓ Issue ${pendingSelectedCount} Door${pendingSelectedCount === 1 ? '' : 's'} (₹${markedIssueTotalValue.toLocaleString('en-IN')})`}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={pendingSelectedCount === 0}
                      onClick={() => {
                        setPreviewIssueVoucher(null);
                        setPreviewConsolidatedBatch(null);
                        setIsDailyIssueSlipOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-black shadow cursor-pointer transition disabled:opacity-50"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReportInitialOrderId(selectedOrder.prodOrderId || selectedOrder.id);
                      setIsReportMode(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[11px] font-black shadow cursor-pointer transition"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>📊 View Door-Wise Issued Report</span>
                  </button>
                )}
              </div>
            </div>

            {/* Door Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {selectedOrder.doors.map((door, dIdx) => {
                const dKey = getDoorKey(door, dIdx);
                const isIssuedLocked = Boolean(door.materialIssued);
                const isSelected = !isIssuedLocked && (selectedDoorIds.length === 0 || selectedDoorIds.includes(dKey));
                return (
                  <label
                    key={dKey}
                    title={
                      isIssuedLocked
                        ? `LOCKED: Already issued${door.materialIssueBatchId ? ` (${door.materialIssueBatchId})` : ''}. Duplicate issue is blocked.`
                        : 'Select this pending door for BOQ issue'
                    }
                    className={`flex items-start gap-2 p-2 rounded-lg border text-xs transition ${
                      isIssuedLocked
                        ? 'bg-emerald-950/25 border-emerald-800/60 text-slate-300 opacity-80 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-950/40 border-amber-500/60 text-white cursor-pointer'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-60 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isIssuedLocked}
                      onChange={() => {
                        if (isIssuedLocked) return;
                        const pendingKeys = selectedOrder.doors
                          .filter((d) => !d.materialIssued)
                          .map((d, i) => getDoorKey(d, i));
                        if (selectedDoorIds.length === 0) {
                          setSelectedDoorIds(pendingKeys.filter((k) => k !== dKey));
                        } else if (selectedDoorIds.includes(dKey)) {
                          setSelectedDoorIds(selectedDoorIds.filter((k) => k !== dKey));
                        } else {
                          setSelectedDoorIds([...selectedDoorIds, dKey]);
                        }
                      }}
                      className="mt-0.5 rounded text-amber-500 bg-slate-950 border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    />
                    <div className="min-w-0">
                      <strong className="block text-[11px] truncate text-slate-200">
                        {door.doorNumber || `Door #${dIdx + 1}`}
                      </strong>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {door.widthCm}&times;{door.heightCm} cm
                      </span>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] font-bold text-slate-300">
                          {door.stage || 'QUEUED'}
                        </span>
                        {isIssuedLocked ? (
                          <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/50 text-[8.5px] font-black">
                            🔒 Issued
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700/50 text-[8.5px] font-bold">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                      {isIssuedLocked && (door.materialIssuedToGang || door.materialIssuedValue) && (
                        <div className="text-[9px] text-emerald-300/90 mt-0.5 truncate">
                          {door.materialIssuedToGang ? `${door.materialIssuedToGang}` : ''}
                          {door.materialIssuedValue ? ` • ₹${door.materialIssuedValue.toLocaleString('en-IN')}` : ''}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* ORDER BOQ ISSUED VALUE & BATCH HISTORY STRIP */}
            {orderIssueVouchers.length > 0 && (
              <div className="pt-2.5 border-t border-slate-800/90 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wide">
                    Issued Material Vouchers &amp; Value Ledger ({orderIssueVouchers.length} Batch{orderIssueVouchers.length === 1 ? '' : 'es'})
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-400">
                    Total Issued Value: ₹{orderTotalIssuedValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-800 rounded-lg overflow-hidden">
                    <thead className="bg-[#070D1E] text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="px-2.5 py-1.5">Voucher #</th>
                        <th className="px-2.5 py-1.5">Date / Shift</th>
                        <th className="px-2.5 py-1.5">Team / Gang</th>
                        <th className="px-2.5 py-1.5">Doors Issued</th>
                        <th className="px-2.5 py-1.5 text-center">Items</th>
                        <th className="px-2.5 py-1.5 text-right">Issued Value (₹)</th>
                        <th className="px-2.5 py-1.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
                      {orderIssueVouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-800/30">
                          <td className="px-2.5 py-1.5 font-mono font-bold text-amber-300">
                            {v.voucherNumber}
                          </td>
                          <td className="px-2.5 py-1.5 text-slate-300">
                            {v.issueDate} <span className="text-[9.5px] text-cyan-300">({v.shift})</span>
                          </td>
                          <td className="px-2.5 py-1.5 font-semibold text-white">{v.gangName}</td>
                          <td className="px-2.5 py-1.5 text-emerald-300 font-mono">
                            {v.doorsCount} ({v.doorNumbers.slice(0, 4).join(', ')}
                            {v.doorNumbers.length > 4 ? ` +${v.doorNumbers.length - 4}` : ''})
                          </td>
                          <td className="px-2.5 py-1.5 text-center text-slate-300">
                            {v.items.length}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-black text-emerald-400">
                            ₹{Math.round(v.totalIssuedValue).toLocaleString('en-IN')}
                          </td>
                          <td className="px-2.5 py-1.5 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewIssueVoucher(v);
                                setIsDailyIssueSlipOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                            >
                              Print Slip
                            </button>
                            <button
                              type="button"
                              disabled={reversingVoucherId === v.id}
                              onClick={() => handleReverseIssueVoucher(v)}
                              className="px-2 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              title="Undo this BOQ issue and restore its doors back to Pending"
                            >
                              {reversingVoucherId === v.id ? 'Undoing...' : 'Undo'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* FLOOR & EVENING CONSUMABLES REGISTER (STANDALONE EXTRA MATERIALS) */}
      {isConsumablesMode && (
        <div className="bg-[#0B132B] border border-indigo-700/60 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                Daily &amp; Evening Floor Consumables Issue Register
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Record consumables &amp; urgent floor purchases (evening shift, masking tape, putty, sandpaper, extra hardware) outside single door BOQs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={consumableShiftFilter}
                onChange={(e) => setConsumableShiftFilter(e.target.value as typeof consumableShiftFilter)}
                className="px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-slate-200 font-semibold cursor-pointer"
              >
                <option value="ALL">All Shifts</option>
                <option value="EVENING">Evening Shift</option>
                <option value="AFTERNOON">Afternoon Shift</option>
                <option value="MORNING">Morning Shift</option>
              </select>

              <button
                type="button"
                onClick={() => openAddExtraItemModal(undefined, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Consumable</span>
              </button>

              {unOrderedConsumablePoItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold cursor-pointer shadow"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Convert to PO ({unOrderedConsumablePoItems.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Consumables Slip</span>
              </button>
            </div>
          </div>

          {floorConsumables.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
              No floor / evening consumables logged for this filter yet. Click <strong>+ Log Consumable</strong> to add items.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070D1E] text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Date &amp; Shift</th>
                    <th className="p-2.5">Consumable / Material</th>
                    <th className="p-2.5">Gang / Staff</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5">PO Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {floorConsumables.map((fc) => (
                    <tr key={fc.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5">
                        <div className="font-mono text-slate-200">{fc.issueDate || fc.createdAt.slice(0, 10)}</div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300">
                          <Clock className="w-3 h-3" /> {fc.issueShift || 'EVENING'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-white">{fc.itemName}</div>
                        {fc.specNote && <div className="text-[10px] text-slate-400">{fc.specNote}</div>}
                      </td>
                      <td className="p-2.5 text-amber-300 font-semibold">{fc.gangName || 'Floor General'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-300">
                        {fc.quantity} {fc.unit}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-white">
                        ₹{Math.round(fc.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5">
                        {fc.poNumber ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                            {fc.poNumber}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                            Pending PO
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openAddExtraItemModal(fc, true)}
                          className="p-1 text-amber-300 hover:bg-amber-950 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExtraItem(fc.id)}
                          className="p-1 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QUICK CUSTOM DOOR SIZE CALCULATOR PANEL */}
      {isCustomCalcMode && (
        <div className="bg-[#0B132B] border border-cyan-700/60 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              Enter Door Dimensions (cm), Qty, Frame, Colour &amp; Lock Box for Instant Auto-BOQ:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCustomRows([
                    {
                      id: `CUST-${Date.now()}`,
                      label: 'Normal Door + Regular Frame',
                      widthCm: 80,
                      heightCm: 210,
                      quantity: 1,
                      frameTypeId: 'FRM-REGULAR',
                      finishColor: 'Natural Teak EXGC-510',
                      lockType: 'Baby Latch Black',
                      handing: 'RH',
                    },
                  ])
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-200 font-semibold cursor-pointer"
              >
                Preset: 1 Normal Door (80×210)
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomRows([
                    {
                      id: `CUST-${Date.now()}`,
                      label: '12-Door Foam Batch',
                      widthCm: 80,
                      heightCm: 210,
                      quantity: 12,
                      frameTypeId: 'FRM-REGULAR',
                      finishColor: 'Rose Wood Glossy',
                      lockType: 'PlusPoint Black',
                      handing: 'RH',
                    },
                  ])
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-200 font-semibold cursor-pointer"
              >
                Preset: 12 Doors Batch (1 Foam Sheet)
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomRows((prev) => [
                    ...prev,
                    {
                      id: `CUST-${Date.now()}`,
                      label: `Custom Row ${prev.length + 1}`,
                      widthCm: 80,
                      heightCm: 210,
                      quantity: 1,
                      frameTypeId: 'FRM-REGULAR',
                      finishColor: 'Natural Teak EXGC-510',
                      lockType: 'Baby Latch Black',
                      handing: 'RH',
                    },
                  ])
                }
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Door Row
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {customRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-[#070D1E] border border-slate-800 p-2.5 rounded-xl items-end"
              >
                <div>
                  <label className="text-[10px] text-slate-400">Width (cm)</label>
                  <input
                    type="number"
                    min={30}
                    value={row.widthCm}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, widthCm: Number(e.target.value) || 0 } : r
                        )
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Height (cm)</label>
                  <input
                    type="number"
                    min={50}
                    value={row.heightCm}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, heightCm: Number(e.target.value) || 0 } : r
                        )
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Qty (Doors)</label>
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? { ...r, quantity: Math.max(1, Number(e.target.value) || 1) }
                            : r
                        )
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Frame Type</label>
                  <select
                    value={row.frameTypeId}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, frameTypeId: e.target.value } : r))
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-200 font-semibold"
                  >
                    {framesCatalog.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Pigment Colour</label>
                  <select
                    value={row.finishColor}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, finishColor: e.target.value } : r))
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-purple-200 font-semibold"
                  >
                    {Object.keys(ratesConfig.pigmentRatesByColour).map((colourKey) => (
                      <option key={colourKey} value={colourKey}>
                        {colourKey} (₹{ratesConfig.pigmentRatesByColour[colourKey]}/kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Lock Box Kit</label>
                  <select
                    value={row.lockType}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, lockType: e.target.value } : r))
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-rose-200 font-semibold"
                  >
                    {(ratesConfig.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES).map((lb) => (
                      <option key={lb.id} value={lb.name}>
                        {lb.name} (₹{lb.boxCost})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Handing</label>
                  <select
                    value={row.handing}
                    onChange={(e) =>
                      setCustomRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? { ...r, handing: (e.target.value as 'LH' | 'RH') || 'RH' }
                            : r
                        )
                      )
                    }
                    className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
                  >
                    <option value="RH">RH (Right)</option>
                    <option value="LH">LH (Left)</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(((row.widthCm * row.heightCm) / 929.0304) * row.quantity).toFixed(2)} sq.ft
                  </span>
                  {customRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomRows((prev) => prev.filter((r) => r.id !== row.id))
                      }
                      className="p-1.5 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MULTI-ORDER CONSOLIDATED SELECTION PANEL (PER-PARTY PARTIAL DOORS + NEXT-DAY BALANCE) */}
      {!isReportMode && isBatchBoqMode && !isCustomCalcMode && (() => {
        const visibleBatchParties =
          batchPartyFilter === 'PENDING' ? pendingBoqOrders : orders;
        const totalBalanceLeftAfterBatch = consolidatedBatchEntries.reduce(
          (sum, e) => sum + e.balanceDoorsAfter,
          0
        );

        return (
          <div className="bg-[#0B132B] border border-emerald-700/60 rounded-xl p-4 space-y-3.5">
            {/* Top Header + Filter + Quick Consolidated Issue Bar */}
            <div className="flex flex-wrap justify-between items-center gap-2.5 pb-2.5 border-b border-slate-800 text-xs">
              <div>
                <h4 className="font-black text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Consolidated Multi-Party BOQ — Daily Partial Doors &amp; Balance Control</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select 4–5 parties in production today, pick exact doors per party (e.g. 3 of 5 doors), and leave balance doors pending for tomorrow&apos;s batch.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBatchPartyFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    batchPartyFilter === 'PENDING'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  ⏳ Pending / Balance Only ({pendingBoqOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchPartyFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    batchPartyFilter === 'ALL'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  All Parties ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllInProductionOrders}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-bold text-[11px] cursor-pointer"
                >
                  ✓ Select All Pending
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBatchOrderIds([]);
                    setBatchDoorIdsByOrder({});
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[11px] cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Consolidated Summary + Direct Batch Issue Bar */}
            <div className="p-2.5 rounded-xl bg-[#070D1E] border border-emerald-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-black">
                  {consolidatedBatchEntries.length} Part{consolidatedBatchEntries.length === 1 ? 'y' : 'ies'} • {activeDoors.length} Doors Selected
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/40 text-cyan-300 font-mono font-bold">
                  {totalSqft} Sq.Ft • {boq.totalLockBoxes} Locks
                </span>
                {totalBalanceLeftAfterBatch > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold">
                    ⏳ {totalBalanceLeftAfterBatch} Balance Door{totalBalanceLeftAfterBatch === 1 ? '' : 's'} Carried to Tomorrow
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={issueGangName}
                  onChange={(e) => setIssueGangName(e.target.value)}
                  placeholder="Floor Team / Gang"
                  className="w-36 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-semibold"
                />
                <select
                  value={issueShift}
                  onChange={(e) => setIssueShift(e.target.value as BoqIssueShift)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-200 font-bold cursor-pointer"
                >
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="EVENING">Evening</option>
                </select>
                <button
                  type="button"
                  onClick={handleDirectIssueConsolidatedBatch}
                  disabled={
                    isIssuingBoq ||
                    consolidatedBatchEntries.length === 0 ||
                    markedIssueItems.length === 0
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isIssuingBoq
                      ? 'Issuing Batch...'
                      : `✓ Issue Consolidated Batch (${activeDoors.length} Doors • ₹${markedIssueTotalValue.toLocaleString('en-IN')})`}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={consolidatedBatchEntries.length === 0}
                  onClick={() => {
                    setPreviewIssueVoucher(null);
                    setPreviewConsolidatedBatch(null);
                    setIsDailyIssueSlipOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Batch Slip</span>
                </button>
              </div>
            </div>

            {/* Per-Party Partial Door Cards */}
            {visibleBatchParties.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 text-xs text-emerald-300 font-bold">
                🎉 All production parties have been fully issued! Switch to &ldquo;All Parties&rdquo; to inspect issued history.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 text-xs">
                {visibleBatchParties.map((ord) => {
                  const isChecked = selectedBatchOrderIds.includes(ord.id);
                  const stats = getOrderIssueStats(ord);
                  const pendingDoors = getPendingDoorsForOrder(ord);
                  const maxSelectable = pendingDoors.length > 0 ? pendingDoors.length : ord.doors.length;
                  const chosenDoors = isChecked ? getSelectedDoorsForBatchOrder(ord) : [];
                  const chosenKeys = new Set(chosenDoors.map((d, i) => getDoorKey(d, i)));
                  const selectedCountForOrd = chosenDoors.length;
                  const balanceAfterToday = Math.max(0, stats.pending - selectedCountForOrd);
                  const isExpanded = Boolean(expandedBatchOrderIds[ord.id]);

                  return (
                    <div
                      key={ord.id}
                      className={`rounded-xl border p-3 space-y-2 transition ${
                        isChecked
                          ? 'bg-emerald-950/35 border-emerald-500/70 text-white shadow-md'
                          : stats.isFullyIssued
                          ? 'bg-slate-900/40 border-slate-800/80 text-slate-400 opacity-70'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {/* Party Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <label
                          className={`flex items-start gap-2 min-w-0 ${
                            stats.isFullyIssued ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title={
                            stats.isFullyIssued
                              ? 'LOCKED: All doors in this order already have BOQ issued. Duplicate issue is blocked.'
                              : 'Select this party for Consolidated BOQ'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isChecked && !stats.isFullyIssued}
                            disabled={stats.isFullyIssued}
                            onChange={() => toggleBatchOrder(ord.id)}
                            className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-black text-white text-xs truncate">
                              {ord.customerName.split('(')[0].trim()}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {ord.jobCardNumber} • {ord.doorsCount} Total Doors
                            </div>
                          </div>
                        </label>

                        {/* Status Badge */}
                        {stats.isFullyIssued ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60 text-[9.5px] font-black shrink-0">
                            🔒 All Issued
                          </span>
                        ) : stats.isPartial ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 text-[9.5px] font-black shrink-0">
                            {stats.pending} Balance Left ({stats.issued}/{stats.total} Done)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/50 text-[9.5px] font-bold shrink-0">
                            ⏳ {stats.pending} Pending
                          </span>
                        )}
                      </div>

                      {/* Inline Partial Door Stepper & Balance Indicator */}
                      {!stats.isFullyIssued && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800/80">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Today:</span>
                            <button
                              type="button"
                              onClick={() => setBatchOrderDoorCount(ord, selectedCountForOrd - 1)}
                              disabled={selectedCountForOrd <= 0}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center cursor-pointer disabled:opacity-40"
                              title="Decrease today's doors for this party"
                            >
                              −
                            </button>
                            <span className="px-2 py-0.5 rounded bg-[#070D1E] border border-emerald-500/40 font-mono font-black text-emerald-300 text-xs min-w-[44px] text-center">
                              {selectedCountForOrd} / {maxSelectable}
                            </span>
                            <button
                              type="button"
                              onClick={() => setBatchOrderDoorCount(ord, selectedCountForOrd + 1)}
                              disabled={selectedCountForOrd >= maxSelectable}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center cursor-pointer disabled:opacity-40"
                              title="Increase today's doors for this party"
                            >
                              +
                            </button>
                            {selectedCountForOrd < maxSelectable && (
                              <button
                                type="button"
                                onClick={() => setBatchOrderDoorCount(ord, maxSelectable)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-700 text-emerald-300 hover:text-white text-[9.5px] font-bold cursor-pointer"
                              >
                                All {maxSelectable}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isChecked && balanceAfterToday > 0 && (
                              <span className="text-[9.5px] font-bold text-amber-300">
                                Bal: {balanceAfterToday}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBatchOrderIds((prev) => ({
                                  ...prev,
                                  [ord.id]: !prev[ord.id],
                                }))
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[9.5px] font-bold cursor-pointer"
                            >
                              {isExpanded ? 'Hide Doors ▲' : 'Pick Doors ▼'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expandable Individual Door Checkboxes for Exact Door Picking */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5">
                          {ord.doors.map((door, dIdx) => {
                            const dKey = getDoorKey(door, dIdx);
                            const isDoorLocked = Boolean(door.materialIssued);
                            const doorSelected = !isDoorLocked && isChecked && chosenKeys.has(dKey);
                            return (
                              <label
                                key={dKey}
                                title={
                                  isDoorLocked
                                    ? `LOCKED: Already issued${door.materialIssueBatchId ? ` (${door.materialIssueBatchId})` : ''}`
                                    : 'Pick this balance door for today'
                                }
                                className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] ${
                                  isDoorLocked
                                    ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-400 opacity-75 cursor-not-allowed'
                                    : doorSelected
                                    ? 'bg-amber-950/50 border-amber-500/60 text-white font-bold cursor-pointer'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-400 cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={doorSelected}
                                  disabled={isDoorLocked}
                                  onChange={() => {
                                    if (!isDoorLocked) toggleBatchOrderSpecificDoor(ord, dKey);
                                  }}
                                  className="rounded text-amber-500 bg-slate-950 border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                />
                                <span className="truncate flex-1">
                                  {door.doorNumber || `D-${dIdx + 1}`}{' '}
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    ({door.widthCm}×{door.heightCm})
                                  </span>
                                </span>
                                {isDoorLocked ? (
                                  <span className="text-[8.5px] font-black text-emerald-400">🔒</span>
                                ) : (
                                  <span className="text-[8.5px] font-bold text-rose-300">⏳</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CONSOLIDATED MULTI-PARTY BATCH ISSUE HISTORY */}
            {consolidatedBatches.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wide">
                    Issued Consolidated Multi-Party Batches ({consolidatedBatches.length})
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-400">
                    Total Consolidated Issued: ₹
                    {Math.round(
                      consolidatedBatches.reduce((s, b) => s + (b.totalValue || 0), 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-800 rounded-lg overflow-hidden">
                    <thead className="bg-[#070D1E] text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="px-2.5 py-1.5">Batch #</th>
                        <th className="px-2.5 py-1.5">Date / Shift</th>
                        <th className="px-2.5 py-1.5">Team / Gang</th>
                        <th className="px-2.5 py-1.5">Parties &amp; Doors Issued</th>
                        <th className="px-2.5 py-1.5 text-right">Batch Value (₹)</th>
                        <th className="px-2.5 py-1.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
                      {consolidatedBatches.slice(0, 10).map((b) => (
                        <tr key={b.batchNumber} className="hover:bg-slate-800/30">
                          <td className="px-2.5 py-1.5 font-mono font-bold text-amber-300">
                            {b.batchNumber}
                          </td>
                          <td className="px-2.5 py-1.5 text-slate-300">
                            {b.issueDate} <span className="text-[9.5px] text-cyan-300">({b.shift})</span>
                          </td>
                          <td className="px-2.5 py-1.5 font-semibold text-white">{b.gangName}</td>
                          <td className="px-2.5 py-1.5 text-emerald-300">
                            <strong>{b.totalDoors} Doors</strong> across {b.partiesCount} parties:{' '}
                            <span className="text-slate-300">
                              {b.partyBreakdowns
                                .map((pb) => `${pb.customerName.split('(')[0].trim()} (${pb.doorsCount})`)
                                .join(' • ')}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-black text-emerald-400">
                            ₹{Math.round(b.totalValue).toLocaleString('en-IN')}
                          </td>
                          <td className="px-2.5 py-1.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewIssueVoucher(null);
                                setPreviewConsolidatedBatch(b);
                                setIsDailyIssueSlipOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                            >
                              Print Slip
                            </button>
                            <button
                              type="button"
                              disabled={reversingBatchNumber === b.batchNumber}
                              onClick={() => handleReverseConsolidatedBatch(b.batchNumber)}
                              className="px-2 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              title="Undo this entire consolidated batch and restore all doors back to Pending"
                            >
                              {reversingBatchNumber === b.batchNumber ? 'Undoing...' : 'Undo Batch'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {!isConsumablesMode && !isReportMode && (
        <>
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Total Area &amp; Scale Ratio</div>
          <div className="text-2xl font-black text-white">{totalSqft.toFixed(2)} Sq.Ft</div>
          <div className="text-[11px] text-cyan-400 mt-1">
            {totalDoors} Doors • {boq.averageScaleFactor.toFixed(2)}× Base ({boq.baseDoorSqFt.toFixed(2)} Sq.Ft)
          </div>
        </div>

        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Resin, Gel &amp; CSM 300 GSM</div>
          <div className="text-2xl font-black text-emerald-400">
            {boq.resinKg.toFixed(2)} Kg Resin
          </div>
          <div className="text-[11px] text-emerald-300 mt-1">
            Gel: {boq.gelKg.toFixed(2)} Kg • CSM 300: {boq.csm300Kg.toFixed(2)} Kg
          </div>
        </div>

        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1 flex items-center gap-1.5">
            <TreePine className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Wood (Frame + Shutter)</span>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {boq.totalWoodCuFt.toFixed(4)} Cu.Ft
          </div>
          <div className="text-[11px] text-amber-300 mt-1">
            Frame: {boq.frameWoodRunningFt.toFixed(2)} Rft • ₹
            {Math.round(boq.totalWoodCost).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span>Combined Dispatch Total</span>
            <span className="text-[10px] text-rose-300 font-bold">
              {boq.totalLockBoxes} Lock Boxes
            </span>
          </div>
          <div className="text-2xl font-black text-rose-400">
            ₹{grandTotalCost.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            Door RM: ₹{doorRawAndExtraTotal.toLocaleString('en-IN')} + Locks: ₹
            {totalLockBoxCost.toLocaleString('en-IN')} • ₹
            {Math.round(effectiveCostPerDoor).toLocaleString('en-IN')}/door
          </div>
        </div>
      </div>

      {/* Material Breakdown Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">
              {isCustomCalcMode
                ? `Quick Custom Door Estimate (${totalDoors} Doors • ${totalSqft} Sq.Ft)`
                : isBatchBoqMode
                ? `Consolidated Auto-BOQ Material List for ${batchOrders.length} Combined Orders`
                : selectedOrder
                ? `Auto-BOQ Material List: ${selectedOrder.orderNumber} (${selectedOrder.customerName})`
                : 'Auto-BOQ Material List (No Active Job Card Selected)'}
            </h3>
            <span className="text-xs text-slate-400">
              {isCustomCalcMode
                ? `${customRows.length} Custom Spec Row(s) • Baseline 80×210 cm`
                : isBatchBoqMode
                ? `Combined Parties: ${batchOrders
                    .map((b) => b.customerName.split('(')[0].trim())
                    .join(' | ')} • Total Batch: ${totalDoors} Doors (${totalSqft} Sq.Ft)`
                : selectedOrder
                ? `Job Card: ${selectedOrder.jobCardNumber} • ${selectedOrder.doorsDesc}`
                : 'Confirm a quotation or use Floor Consumables / Quick Size Calculator above.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {embeddedModalMode && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700">
                Synced Order View
              </span>
            )}
            <button
              type="button"
              onClick={() => openAddExtraItemModal()}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Issue Item (പുതിയ ഐറ്റം)</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Store Issue Slip (സ്റ്റോർ ഇഷ്യൂ വൗച്ചർ) 🖨️</span>
            </button>
          </div>
        </div>

        {/* Custom Usage Override Banner & Direct Partial Issue Panel */}
        {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
          <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-b border-amber-500/40 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-xs">
                    Custom Shop-Floor Usage, Item Marking &amp; Direct Issue (കസ്റ്റം യൂസേജ് &amp; ഇഷ്യൂ)
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Check/uncheck individual items below, edit quantities (അളവ്), and issue directly for the selected {activeDoors.length} door(s).
                  </p>
                </div>
              </div>

              {/* Buffer preset pills & custom input */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Usage Buffer:</span>
                {[
                  { label: '0% Std', val: 0 },
                  { label: '+5%', val: 5 },
                  { label: '+10%', val: 10 },
                  { label: '+15%', val: 15 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setCustomUsageBufferPercent(preset.val)}
                    className={`px-2 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                      customUsageBufferPercent === preset.val
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <div className="flex items-center gap-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2 py-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={customUsageBufferPercent}
                    onChange={(e) => setCustomUsageBufferPercent(Math.max(0, Number(e.target.value) || 0))}
                    className="w-10 bg-transparent text-amber-300 font-mono font-bold text-xs text-right outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">%</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCustomUsage}
                  disabled={isSavingCustomUsage}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-700 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingCustomUsage ? 'Saving...' : customUsageSaveSuccess ? 'Saved! ✓' : 'Save Only'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCustomUsage}
                  className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-800 text-rose-200 rounded-lg font-bold text-[10.5px] border border-rose-500/40 flex items-center gap-1 cursor-pointer"
                  title="Reset all quantities, checkboxes, and rates back to standard Calculation Basis formula"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Formula</span>
                </button>
              </div>
            </div>

            {/* Quick Item Marking Presets + Live Marked Value + Direct Issue Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                <span className="text-slate-400 font-bold">Mark Items:</span>
                <button
                  type="button"
                  onClick={() => applyItemGroupPreset('ALL')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer"
                >
                  ✓ All Items
                </button>
                <button
                  type="button"
                  onClick={() => applyItemGroupPreset('CHEMICALS')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-bold cursor-pointer"
                >
                  Chemicals Only
                </button>
                <button
                  type="button"
                  onClick={() => applyItemGroupPreset('WOOD_FOAM')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold cursor-pointer"
                >
                  Wood &amp; Foam Only
                </button>
                <button
                  type="button"
                  onClick={() => applyItemGroupPreset('HARDWARE')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40 font-bold cursor-pointer"
                >
                  Hardware / Locks Only
                </button>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono font-black text-xs">
                  Marked Value ({markedIssueItems.length} items): ₹{markedIssueTotalValue.toLocaleString('en-IN')}
                </span>
              </div>

              {!isCustomCalcMode && (isBatchBoqMode || selectedOrder) && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <input
                    type="text"
                    value={issueGangName}
                    onChange={(e) => setIssueGangName(e.target.value)}
                    placeholder="Team / Gang Name"
                    className="w-36 bg-[#070D1E] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-semibold"
                    title="Team / Gang receiving these materials"
                  />
                  <select
                    value={issueShift}
                    onChange={(e) => setIssueShift(e.target.value as BoqIssueShift)}
                    className="bg-[#070D1E] border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-200 font-bold cursor-pointer"
                  >
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                    <option value="EVENING">Evening</option>
                  </select>
                  <button
                    type="button"
                    onClick={
                      isBatchBoqMode
                        ? handleDirectIssueConsolidatedBatch
                        : handleDirectIssueSelectedDoors
                    }
                    disabled={
                      isIssuingBoq ||
                      activeDoors.length === 0 ||
                      markedIssueItems.length === 0 ||
                      (isBatchBoqMode && consolidatedBatchEntries.length === 0)
                    }
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {isIssuingBoq
                        ? 'Issuing...'
                        : isBatchBoqMode
                        ? `✓ Save & Issue Batch (${consolidatedBatchEntries.length} Parties • ${activeDoors.length} Doors • ₹${markedIssueTotalValue.toLocaleString('en-IN')})`
                        : `✓ Save & Issue ${activeDoors.length} Door${activeDoors.length === 1 ? '' : 's'} (₹${markedIssueTotalValue.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Optional Supervisor Custom Notes */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Supervisor Reason / Shift Note:</span>
              <input
                type="text"
                value={customUsageNotes}
                onChange={(e) => setCustomUsageNotes(e.target.value)}
                placeholder="e.g. Partial issue for 3 doors to Molding Team A — adjusted resin & gelcoat..."
                className="flex-1 bg-[#070D1E] border border-slate-700/80 rounded px-2 py-0.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#070D1E] text-slate-400 uppercase text-[10px]">
                <th className="p-3">#</th>
                <th className="p-3">Raw Material &amp; Formula Spec</th>
                <th className="p-3">Calculation Basis / Grade</th>
                <th className="p-3 text-right">Required Qty</th>
                <th className="p-3 text-right">Unit Rate (₹)</th>
                <th className="p-3 text-right">Est. Cost (₹)</th>
                <th className="p-3 text-center">Group</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* GROUP A HEADER */}
              <tr className="bg-emerald-950/30 border-b border-emerald-900/60">
                <td colSpan={7} className="px-3 py-2 font-black text-[11px] text-emerald-300 uppercase tracking-wider">
                  Group A — Sq.Ft Scaled Chemicals, CSM 300 GSM &amp; Colour-Wise Pigments (Baseline {ratesConfig.baseDoorWidthCm}×{ratesConfig.baseDoorHeightCm} cm = {boq.baseDoorSqFt.toFixed(2)} Sq.Ft)
                </td>
              </tr>

              {/* A1. RESIN */}
              <tr className={`hover:bg-slate-800/30 ${!effectiveBoq.resin.included ? 'opacity-45 line-through' : ''}`}>
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <input
                        type="checkbox"
                        checked={effectiveBoq.resin.included}
                        onChange={() => toggleItemIncluded('resin')}
                        className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-600 cursor-pointer"
                        title="Include/exclude Resin in this store issue batch"
                      />
                    )}
                    <span>A1</span>
                  </div>
                </td>
                <td className="p-3">
                  <strong className="text-white">FRP Polyester Resin</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    Hand-Layup Structural FRP Grade Resin
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {ratesConfig.resinKg} kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft ({(ratesConfig.resinKg / boq.baseDoorSqFt).toFixed(4)} kg/sq.ft)
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={effectiveBoq.resin.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemCustomQty('resin', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-amber-500/80 rounded text-right font-mono font-bold text-amber-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">Kg</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-black text-emerald-400">
                        {effectiveBoq.resin.qty.toFixed(2)} Kg
                      </span>
                      {effectiveBoq.resin.isOverridden && (
                        <span className="text-[9px] text-amber-400 font-mono">
                          (formula: {boq.resinKg.toFixed(2)} Kg)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={effectiveBoq.resin.rate}
                        onChange={(e) => updateItemCustomRate('resin', parseFloat(e.target.value))}
                        className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-300">₹{effectiveBoq.resin.rate} / Kg</span>
                  )}
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{effectiveBoq.resin.cost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    Chemical
                  </span>
                </td>
              </tr>

              {/* A2. GELCOAT */}
              <tr className={`hover:bg-slate-800/30 ${!effectiveBoq.gel.included ? 'opacity-45 line-through' : ''}`}>
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <input
                        type="checkbox"
                        checked={effectiveBoq.gel.included}
                        onChange={() => toggleItemIncluded('gel')}
                        className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-600 cursor-pointer"
                        title="Include/exclude Gelcoat in this store issue batch"
                      />
                    )}
                    <span>A2</span>
                  </div>
                </td>
                <td className="p-3">
                  <strong className="text-white">Gelcoat (GEL Surface Layer)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    UV-Stabilized Surface Coat
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {ratesConfig.gelKg} kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft ({(ratesConfig.gelKg / boq.baseDoorSqFt).toFixed(4)} kg/sq.ft)
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={effectiveBoq.gel.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemCustomQty('gel', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-amber-500/80 rounded text-right font-mono font-bold text-amber-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">Kg</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-black text-emerald-400">
                        {effectiveBoq.gel.qty.toFixed(2)} Kg
                      </span>
                      {effectiveBoq.gel.isOverridden && (
                        <span className="text-[9px] text-amber-400 font-mono">
                          (formula: {boq.gelKg.toFixed(2)} Kg)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={effectiveBoq.gel.rate}
                        onChange={(e) => updateItemCustomRate('gel', parseFloat(e.target.value))}
                        className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-300">₹{effectiveBoq.gel.rate} / Kg</span>
                  )}
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{effectiveBoq.gel.cost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    Chemical
                  </span>
                </td>
              </tr>

              {/* A3. CATALYST */}
              <tr className={`hover:bg-slate-800/30 ${!effectiveBoq.catalystGrams.included ? 'opacity-45 line-through' : ''}`}>
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <input
                        type="checkbox"
                        checked={effectiveBoq.catalystGrams.included}
                        onChange={() => toggleItemIncluded('catalystGrams')}
                        className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-950 border-slate-600 cursor-pointer"
                        title="Include/exclude Catalyst in this store issue batch"
                      />
                    )}
                    <span>A3</span>
                  </div>
                </td>
                <td className="p-3">
                  <strong className="text-white">Catalyst (MEKP Hardener)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    Curing Initiator for Hand-Craft Layup
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {ratesConfig.catalystGrams} gm / {boq.baseDoorSqFt.toFixed(2)} sq.ft ({(ratesConfig.catalystGrams / boq.baseDoorSqFt).toFixed(2)} gm/sq.ft)
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={Math.round(effectiveBoq.catalystGrams.qty)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemCustomQty('catalystGrams', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-cyan-500/80 rounded text-right font-mono font-bold text-cyan-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">gm</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-black text-cyan-400">
                        {Math.round(effectiveBoq.catalystGrams.qty).toLocaleString()} gm
                      </span>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({(effectiveBoq.catalystGrams.qty / 1000).toFixed(3)} Kg)
                      </div>
                      {effectiveBoq.catalystGrams.isOverridden && (
                        <span className="text-[9px] text-amber-400 font-mono">
                          (formula: {Math.round(boq.catalystGrams)} gm)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right text-slate-300">
                  ₹{ratesConfig.catalystRatePerKg} / Kg
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{effectiveBoq.catalystGrams.cost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                    Catalyst
                  </span>
                </td>
              </tr>

              {/* A4. ACCELERATOR */}
              <tr className={`hover:bg-slate-800/30 ${!effectiveBoq.acceleratorGrams.included ? 'opacity-45 line-through' : ''}`}>
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <input
                        type="checkbox"
                        checked={effectiveBoq.acceleratorGrams.included}
                        onChange={() => toggleItemIncluded('acceleratorGrams')}
                        className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-950 border-slate-600 cursor-pointer"
                        title="Include/exclude Accelerator in this store issue batch"
                      />
                    )}
                    <span>A4</span>
                  </div>
                </td>
                <td className="p-3">
                  <strong className="text-white">Accelerator (Cobalt Solution)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    Room-Temp Curing Promoter
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {ratesConfig.acceleratorGrams} gm / {boq.baseDoorSqFt.toFixed(2)} sq.ft ({(ratesConfig.acceleratorGrams / boq.baseDoorSqFt).toFixed(2)} gm/sq.ft)
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={Math.round(effectiveBoq.acceleratorGrams.qty)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemCustomQty('acceleratorGrams', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-cyan-500/80 rounded text-right font-mono font-bold text-cyan-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">gm</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-black text-cyan-400">
                        {Math.round(effectiveBoq.acceleratorGrams.qty).toLocaleString()} gm
                      </span>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({(effectiveBoq.acceleratorGrams.qty / 1000).toFixed(3)} Kg)
                      </div>
                      {effectiveBoq.acceleratorGrams.isOverridden && (
                        <span className="text-[9px] text-amber-400 font-mono">
                          (formula: {Math.round(boq.acceleratorGrams)} gm)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right text-slate-300">
                  ₹{ratesConfig.acceleratorRatePerKg} / Kg
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{effectiveBoq.acceleratorGrams.cost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                    Accelerator
                  </span>
                </td>
              </tr>

              {/* A5. CSM 300 GSM */}
              <tr className={`hover:bg-slate-800/30 ${!effectiveBoq.csm300.included ? 'opacity-45 line-through' : ''}`}>
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <input
                        type="checkbox"
                        checked={effectiveBoq.csm300.included}
                        onChange={() => toggleItemIncluded('csm300')}
                        className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-950 border-slate-600 cursor-pointer"
                        title="Include/exclude CSM 300 GSM in this store issue batch"
                      />
                    )}
                    <span>A5</span>
                  </div>
                </td>
                <td className="p-3">
                  <strong className="text-white">Chopped Strand Mat (300 GSM)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    E-Glass Reinforcement Mat Roll
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {ratesConfig.csm300Kg} kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft ({(ratesConfig.csm300Kg / boq.baseDoorSqFt).toFixed(4)} kg/sq.ft)
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={effectiveBoq.csm300.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemCustomQty('csm300', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-amber-500/80 rounded text-right font-mono font-bold text-amber-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">Kg</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-black text-amber-400">
                        {effectiveBoq.csm300.qty.toFixed(2)} Kg
                      </span>
                      {effectiveBoq.csm300.isOverridden && (
                        <span className="text-[9px] text-amber-400 font-mono">
                          (formula: {boq.csm300Kg.toFixed(2)} Kg)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right text-slate-300">
                  ₹{ratesConfig.csm300RatePerKg} / Kg
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{effectiveBoq.csm300.cost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    300 GSM
                  </span>
                </td>
              </tr>

              {/* A6. COLOUR-WISE PIGMENTS */}
              {boq.pigmentByColour.map((pig, pIdx) => {
                const pigKey = `pigment_${pig.matchedRateKey || pig.colourLabel}`;
                const customPig = customUsageOverrides[pigKey];
                const pigIncluded = !customPig?.excluded;
                const displayQty = customPig?.customQty !== undefined ? customPig.customQty : Math.round(pig.pigmentGrams);
                const displayRate = customPig?.customRate !== undefined ? customPig.customRate : pig.ratePerKg;
                const displayCost = pigIncluded ? Math.round((displayQty / 1000) * displayRate) : 0;

                return (
                  <tr
                    key={`pig-${pig.matchedRateKey}-${pIdx}`}
                    className={`hover:bg-slate-800/30 ${!pigIncluded ? 'opacity-45 line-through' : ''}`}
                  >
                    <td className="p-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                          <input
                            type="checkbox"
                            checked={pigIncluded}
                            onChange={() => toggleItemIncluded(pigKey)}
                            className="w-3.5 h-3.5 rounded text-purple-500 bg-slate-950 border-slate-600 cursor-pointer"
                            title="Include/exclude Pigment in this store issue batch"
                          />
                        )}
                        <span>A6.{pIdx + 1}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <strong className="text-white flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-purple-400" />
                        Pigment Paste — {pig.colourLabel}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {pig.doorsCount} Doors ({pig.sqFt.toFixed(2)} Sq.Ft) • Rate Key: {pig.matchedRateKey}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {ratesConfig.pigmentGrams} gm / {boq.baseDoorSqFt.toFixed(2)} sq.ft (Shade Priced)
                    </td>
                    <td className="p-3 text-right font-black text-purple-400">
                      {isCustomUsageEditMode ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="10"
                            min="0"
                            value={displayQty}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              updateItemCustomQty(
                                pigKey,
                                e.target.value === '' ? 0 : parseFloat(e.target.value)
                              )
                            }
                            className="w-20 px-2 py-1 bg-slate-900 border border-purple-500/80 rounded text-right font-mono font-bold text-purple-300 text-xs"
                          />
                          <span className="text-[10px] text-slate-400">gm</span>
                        </div>
                      ) : (
                        <div>
                          {displayQty.toLocaleString()} gm
                          <div className="text-[10px] text-slate-400 font-normal">
                            ({(displayQty / 1000).toFixed(3)} Kg)
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      {isCustomUsageEditMode ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            step="10"
                            min="0"
                            value={displayRate}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              updateItemCustomRate(
                                pigKey,
                                e.target.value === '' ? 0 : parseFloat(e.target.value)
                              )
                            }
                            className="w-20 px-2 py-1 bg-slate-900 border border-purple-500/80 rounded text-right font-mono font-bold text-purple-300 text-xs"
                          />
                        </div>
                      ) : (
                        <span>₹{displayRate} / Kg</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      ₹{displayCost.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                        Pigment
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* GROUP B HEADER */}
              <tr className="bg-amber-950/25 border-b border-amber-900/60">
                <td colSpan={7} className="px-3 py-2 font-black text-[11px] text-amber-300 uppercase tracking-wider">
                  Group B — Wood Calculation in Cubic Feet (1 Cu.Ft = 28,316.85 cm³ • Frame Mode: {frameModeLabel})
                </td>
              </tr>

              {/* B1. FRAME WOOD BREAKDOWN PER FRAME PROFILE */}
              {boq.frameWoodBreakdown.map((fw, fIdx) => (
                <tr key={`fw-${fw.frameId}-${fIdx}`} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-white">B1.{fIdx + 1}</td>
                  <td className="p-3">
                    <strong className="text-white">
                      Frame Wood Reeper — {fw.frameName}
                    </strong>
                    <br />
                    <span className="text-[10px] text-slate-400">
                      {fw.woodThicknessCm > 0 && fw.woodWidthCm > 0
                        ? `${fw.doorsCount} Frames • Section ${fw.woodThicknessCm}×${fw.woodWidthCm} cm • -${fw.woodLengthDeductionCm} cm ded.`
                        : `${fw.doorsCount} Sets • No Frame Wood Required`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">
                    {fw.totalLengthCm > 0
                      ? `${fw.totalLengthCm.toFixed(0)} cm (${fw.runningFt.toFixed(2)} Rft)`
                      : '0 cm (Door Only)'}
                  </td>
                  <td className="p-3 text-right font-black text-amber-400">
                    {fw.cuFt.toFixed(4)} Cu.Ft
                    <div className="text-[10px] text-slate-400 font-normal">
                      ({fw.runningFt.toFixed(2)} Rft)
                    </div>
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    ₹{ratesConfig.woodRatePerCuFt} / Cu.Ft
                  </td>
                  <td className="p-3 text-right font-bold text-white">
                    ₹{Math.round(fw.cost).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                      Frame Wood
                    </span>
                  </td>
                </tr>
              ))}

              {/* B2. SHUTTER LOCK REEPERS */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">B2</td>
                <td className="p-3">
                  <strong className="text-white">Shutter Wood Reeper — Lock Side</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    {ratesConfig.lockReeper.thicknessCm} cm × {ratesConfig.lockReeper.widthCm} cm ×{' '}
                    {ratesConfig.lockReeper.lengthCm} cm ({ratesConfig.lockReeper.pcsPerDoor} pcs/door)
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {totalDoors * ratesConfig.lockReeper.pcsPerDoor} pcs total ({Math.round(boq.lockReeperVolumeCm3).toLocaleString()} cm³)
                </td>
                <td className="p-3 text-right font-black text-amber-300">
                  {boq.lockReeperCuFt.toFixed(4)} Cu.Ft
                </td>
                <td className="p-3 text-right text-slate-300">
                  ₹{ratesConfig.woodRatePerCuFt} / Cu.Ft
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{Math.round(boq.lockReeperCost).toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    Shutter Wood
                  </span>
                </td>
              </tr>

              {/* B3. SHUTTER HINGE REEPERS */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">B3</td>
                <td className="p-3">
                  <strong className="text-white">Shutter Wood Reeper — Hinge Side</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">
                    {ratesConfig.hingeReeper.thicknessCm} cm × {ratesConfig.hingeReeper.widthCm} cm ×{' '}
                    {ratesConfig.hingeReeper.lengthCm} cm ({ratesConfig.hingeReeper.pcsPerDoor} pcs/door)
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {totalDoors * ratesConfig.hingeReeper.pcsPerDoor} pcs total ({Math.round(boq.hingeReeperVolumeCm3).toLocaleString()} cm³)
                </td>
                <td className="p-3 text-right font-black text-amber-300">
                  {boq.hingeReeperCuFt.toFixed(4)} Cu.Ft
                </td>
                <td className="p-3 text-right text-slate-300">
                  ₹{ratesConfig.woodRatePerCuFt} / Cu.Ft
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{Math.round(boq.hingeReeperCost).toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    Shutter Wood
                  </span>
                </td>
              </tr>

              {/* GROUP B SUBTOTAL (WITH CUSTOM TIMBER CHECKBOX & QTY EDIT) */}
              <tr className={`bg-amber-950/15 border-y border-amber-800/40 ${!effectiveBoq.timber.included ? 'opacity-45 line-through' : ''}`}>
                <td colSpan={3} className="p-3 text-right font-bold text-amber-200 text-[11px]">
                  <div className="flex items-center justify-end gap-2">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-amber-300">
                        <input
                          type="checkbox"
                          checked={effectiveBoq.timber.included}
                          onChange={() => toggleItemIncluded('timber')}
                          className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-950 border-slate-600 cursor-pointer"
                        />
                        <span>Include Timber</span>
                      </label>
                    )}
                    <span>
                      Total Wood Volume (Frame {boq.frameWoodCuFt.toFixed(4)} + Shutter {boq.shutterWoodCuFt.toFixed(4)} Cu.Ft):
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right font-black text-amber-400">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={Number(effectiveBoq.timber.qty.toFixed(4))}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateItemCustomQty('timber', e.target.value === '' ? 0 : parseFloat(e.target.value))
                        }
                        className="w-20 px-2 py-1 bg-slate-900 border border-amber-500/80 rounded text-right font-mono font-bold text-amber-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">Cu.Ft</span>
                    </div>
                  ) : (
                    <span>{effectiveBoq.timber.qty.toFixed(4)} Cu.Ft</span>
                  )}
                </td>
                <td className="p-3 text-right text-slate-400">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={effectiveBoq.timber.rate}
                        onChange={(e) => updateItemCustomRate('timber', parseFloat(e.target.value))}
                        className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs"
                      />
                    </div>
                  ) : (
                    <span>₹{effectiveBoq.timber.rate}</span>
                  )}
                </td>
                <td className="p-3 text-right font-black text-amber-300">
                  ₹{effectiveBoq.timber.cost.toLocaleString('en-IN')}
                </td>
                <td />
              </tr>

              {/* GROUP C HEADER */}
              <tr className="bg-sky-950/25 border-b border-sky-900/60">
                <td colSpan={7} className="px-3 py-2 font-black text-[11px] text-sky-300 uppercase tracking-wider">
                  Group C — Rigid Foam Sheet Core (1 Sheet per {ratesConfig.foamSheet.doorsPerSheet} Doors • {ratesConfig.foamSheet.widthCm}×{ratesConfig.foamSheet.heightCm} cm)
                </td>
              </tr>

              {/* C1. RIGID FOAM SHEET */}
              <tr className={`hover:bg-slate-800/30 ${!effectiveBoq.foam.included ? 'opacity-45 line-through' : ''}`}>
                <td className="p-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                      <input
                        type="checkbox"
                        checked={effectiveBoq.foam.included}
                        onChange={() => toggleItemIncluded('foam')}
                        className="w-3.5 h-3.5 rounded text-sky-500 bg-slate-950 border-slate-600 cursor-pointer"
                        title="Include/exclude Rigid Foam in this store issue batch"
                      />
                    )}
                    <span>C1</span>
                  </div>
                </td>
                <td className="p-3">
                  <strong className="text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    Rigid Foam Sheet ({ratesConfig.foamSheet.widthCm} × {ratesConfig.foamSheet.heightCm} cm)
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    1 Full Sheet cuts {ratesConfig.foamSheet.doorsPerSheet} doors ({totalDoors} / {ratesConfig.foamSheet.doorsPerSheet})
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  Exact Ratio + Purchase Issue ({boq.foamSheetsPurchaseCeil} Full Sheets)
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={effectiveBoq.foam.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemCustomQty('foam', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-sky-500/80 rounded text-right font-mono font-bold text-sky-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">Sheets</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-black text-sky-400">
                        {effectiveBoq.foam.qty.toFixed(2)} Sheets
                      </span>
                      <div className="text-[10px] text-slate-400 font-normal">
                        (Issue {Math.ceil(effectiveBoq.foam.qty)} Sheet{Math.ceil(effectiveBoq.foam.qty) === 1 ? '' : 's'})
                      </div>
                      {effectiveBoq.foam.isOverridden && (
                        <span className="text-[9px] text-amber-400 font-mono">
                          (formula: {boq.foamSheetsExact.toFixed(2)} Sheets)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">
                  {isCustomUsageEditMode ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={effectiveBoq.foam.rate}
                        onChange={(e) => updateItemCustomRate('foam', parseFloat(e.target.value))}
                        className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-300">₹{effectiveBoq.foam.rate} / Sheet</span>
                  )}
                </td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{effectiveBoq.foam.cost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold">
                    Rigid Foam
                  </span>
                </td>
              </tr>

              {/* GROUP D HEADER — ADDITIONAL / EXTRA ISSUED ITEMS */}
              <tr className="bg-purple-950/25 border-b border-purple-900/60">
                <td colSpan={7} className="px-3 py-2 font-black text-[11px] text-purple-300 uppercase tracking-wider">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Group D — Additional / Extra Issued Store Items ({activeExtraItems.length} item{activeExtraItems.length === 1 ? '' : 's'})
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddExtraItemModal()}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold normal-case flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add New Issue Item</span>
                    </button>
                  </div>
                </td>
              </tr>

              {activeExtraItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-[11px] text-slate-400">
                    No extra issue items added for this selection yet. Click{' '}
                    <button
                      type="button"
                      onClick={() => openAddExtraItemModal()}
                      className="text-purple-300 underline font-bold cursor-pointer"
                    >
                      + Add Issue Item
                    </button>{' '}
                    when extra putty, tape, thinner, resin, or hardware needs to be issued.
                  </td>
                </tr>
              ) : (
                activeExtraItems.map((ext, eIdx) => {
                  const extKey = `extra_${ext.id}`;
                  const extIncluded = isItemIncluded(extKey);
                  return (
                  <tr key={ext.id} className={`hover:bg-slate-800/30 ${!extIncluded ? 'opacity-45 line-through' : ''}`}>
                    <td className="p-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
                          <input
                            type="checkbox"
                            checked={extIncluded}
                            onChange={() => toggleItemIncluded(extKey)}
                            className="w-3.5 h-3.5 rounded text-purple-500 bg-slate-950 border-slate-600 cursor-pointer"
                            title="Include/exclude Extra Item in this store issue batch"
                          />
                        )}
                        <span>D{eIdx + 1}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <strong className="text-white">{ext.itemName}</strong>
                      {ext.specNote && (
                        <>
                          <br />
                          <span className="text-[10px] text-slate-400">{ext.specNote}</span>
                        </>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">{ext.category}</td>
                    <td className="p-3 text-right font-black text-purple-300">
                      {ext.quantity} {ext.unit}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      ₹{ext.unitRate.toLocaleString('en-IN')} / {ext.unit}
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      ₹{(extIncluded ? Math.round(ext.amount) : 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAddExtraItemModal(ext)}
                          className="p-1 text-amber-300 hover:bg-amber-950 rounded cursor-pointer"
                          title="Edit issue item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExtraItem(ext.id)}
                          className="p-1 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                          title="Remove issue item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}

              {/* GROUP E HEADER — LOCK BOX KITS & PRODUCTION RUSH READINESS */}
              <tr className="bg-rose-950/30 border-b border-rose-900/60">
                <td colSpan={7} className="px-3 py-2 font-black text-[11px] text-rose-300 uppercase tracking-wider">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Group E — Lock Boxes &amp; Common Basic Hardware Kits (Early Production Issue • {boq.totalLockBoxes} Hardware Boxes Needed)
                    </span>
                    <button
                      type="button"
                      onClick={() => openLockBoxEditor()}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold normal-case flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Lock Box Type</span>
                    </button>
                  </div>
                </td>
              </tr>

              {boq.lockBoxBreakdown.map((lb, lIdx) => {
                const liveProfile = (ratesConfig.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES).find(
                  (p) => p.id === lb.profileId
                );
                const readiness = getLockReadinessStatus(lb.profileId);
                const lockKey = `lock_${lb.profileId}`;
                const lockIncluded = lb.isNoHardware ? true : isItemIncluded(lockKey);
                return (
                  <tr
                    key={`lockbox-${lb.profileId}-${lIdx}`}
                    className={`hover:bg-slate-800/30 ${!lockIncluded ? 'opacity-45 line-through' : ''}`}
                  >
                    <td className="p-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        {(isCustomUsageEditMode || hasCustomUsageOverrides) && !lb.isNoHardware && (
                          <input
                            type="checkbox"
                            checked={lockIncluded}
                            onChange={() => toggleItemIncluded(lockKey)}
                            className="w-3.5 h-3.5 rounded text-rose-500 bg-slate-950 border-slate-600 cursor-pointer"
                            title="Include/exclude Lock Kit Box in this store issue batch"
                          />
                        )}
                        <span>E{lIdx + 1}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <strong className="text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        {lb.boxName}
                      </strong>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {lb.isNoHardware ? (
                          <span>Cutout Provision Only — 0 Hardware Box Required</span>
                        ) : (
                          <span>
                            Kit/Box ({lb.itemsPerBox.length} items):{' '}
                            {lb.aggregatedComponents
                              .map((c) => `${c.name}: ${c.totalQty}`)
                              .join(' • ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-cyan-300">
                          RH: {lb.rhCount} | LH: {lb.lhCount}
                        </span>
                        {!lb.isNoHardware && (
                          <select
                            value={readiness}
                            onChange={(e) =>
                              handleLockReadinessChange(
                                lb.profileId,
                                e.target.value as LockReadinessStatus
                              )
                            }
                            className={`text-[10px] font-bold rounded px-1.5 py-0.5 border cursor-pointer ${
                              readiness === 'ISSUED_TO_FLOOR'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : readiness === 'IN_STOCK_RESERVED'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                                : readiness === 'ORDERED'
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : 'bg-rose-950 text-rose-300 border-rose-700'
                            }`}
                          >
                            <option value="PENDING_PURCHASE">Pending Purchase</option>
                            <option value="ORDERED">Ordered</option>
                            <option value="IN_STOCK_RESERVED">In Stock / Ready</option>
                            <option value="ISSUED_TO_FLOOR">Issued to Floor</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-black text-rose-300">
                      {lb.isNoHardware ? '0 Boxes' : `${lb.doorsCount} Box${lb.doorsCount === 1 ? '' : 'es'}`}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      ₹{lb.boxCost.toLocaleString('en-IN')} / Box
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      ₹{Math.round(lb.totalBoxCost).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        {liveProfile && !lb.isNoHardware ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openLockBoxEditor(liveProfile)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                              title="Edit Lock Box cost or Edit / Add / Delete kit screws & hardware items"
                            >
                              Edit / +Item
                            </button>
                            {(ratesConfig.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLockBoxProfile(liveProfile.id)}
                                className="p-1 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                                title="Delete Lock Box profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* CONSOLIDATED HARDWARE PIECES SUMMARY ROW */}
              {boq.consolidatedLockKitHardware.length > 0 && (
                <tr className="bg-rose-950/15 border-y border-rose-800/40">
                  <td colSpan={7} className="px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase text-rose-300 mb-1">
                      Store Hardware Issue Summary Across All Lock Boxes (Pre-Dispatch Check):
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {boq.consolidatedLockKitHardware.map((comp) => (
                        <span
                          key={`${comp.name}-${comp.unit}`}
                          className="px-2 py-0.5 rounded bg-[#070D1E] border border-slate-700 text-slate-200 font-semibold"
                        >
                          {comp.name}: <strong className="text-rose-300">{comp.totalQty} {comp.unit}</strong>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}

              {/* SUBTOTALS + COMBINED GRAND TOTAL ROW */}
              <tr className="bg-slate-900/70 border-t border-slate-700 text-xs">
                <td colSpan={5} className="px-4 py-2 text-right font-bold text-slate-300">
                  Door Raw Materials Subtotal (Chemicals + Timber + Rigid Foam + {activeExtraItems.length} Extra Items):
                </td>
                <td className="px-4 py-2 text-right font-black text-cyan-300">
                  ₹{doorRawAndExtraTotal.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-2 text-center text-[10px] text-slate-400">
                  ₹{effectiveCostPerSqFt.toFixed(1)}/Sq.Ft
                </td>
              </tr>
              <tr className="bg-[#070D1E] border-t-2 border-emerald-600/60">
                <td colSpan={3} className="p-4 text-right font-black text-white uppercase tracking-wide">
                  Combined Dispatch Material Estimate ({totalDoors} Doors • {totalSqft} Sq.Ft + {boq.totalLockBoxes} Lock Boxes):
                </td>
                <td className="p-4 text-right text-xs text-rose-300 font-bold">
                  Locks: ₹{totalLockBoxCost.toLocaleString('en-IN')}
                </td>
                <td className="p-4 text-right text-xs text-emerald-300 font-bold">
                  ₹{Math.round(effectiveCostPerDoor).toLocaleString('en-IN')} / Door
                </td>
                <td className="p-4 text-right text-base font-black text-emerald-400">
                  ₹{grandTotalCost.toLocaleString('en-IN')}
                </td>
                <td className="p-4 text-center text-[10px] text-slate-400">Unified Auto-BOQ</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-[#070D1E] border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-400">
          <span>
            💡 Other frames (Medium, Heavy, School, Custom) use editable BOQ Wood dimensions (default 2×7 cm, -35 cm ded.). Update them anytime in{' '}
            <strong className="text-amber-300">Admin Settings → Frame &amp; BOQ Wood Settings</strong>.
          </span>
          <span className="text-slate-500">
            1 Cu.Ft = 28,316.85 cm³ • 1 Rft = 30.48 cm • 1 Sq.Ft = 929.03 cm²
          </span>
        </div>
      </div>
        </>
      )}

      {/* ================= RATES & PIGMENT COLOURS MODAL ================= */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B132B] border border-slate-700 text-slate-100 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  BOQ Material Unit Rates, Pigment Shade Prices &amp; Wood Formula
                </h3>
                <p className="text-[11px] text-slate-400">
                  Configure factory material prices, colour-wise pigment rates (₹/Kg), and frame length formula mode.
                </p>
              </div>
              <button
                onClick={() => setIsRatesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {ratesSaveNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{ratesSaveNotice}</span>
                </div>
              )}

              {/* Unit Prices */}
              <div>
                <h4 className="font-bold text-emerald-300 uppercase text-[11px] mb-2">
                  1. Raw Material &amp; Timber Unit Prices (₹)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400">Resin (₹/Kg)</label>
                    <input
                      type="number"
                      value={draftRates.resinRatePerKg}
                      onChange={(e) =>
                        setDraftRates({ ...draftRates, resinRatePerKg: Number(e.target.value) || 0 })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Gelcoat / GEL (₹/Kg)</label>
                    <input
                      type="number"
                      value={draftRates.gelRatePerKg}
                      onChange={(e) =>
                        setDraftRates({ ...draftRates, gelRatePerKg: Number(e.target.value) || 0 })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Catalyst (₹/Kg)</label>
                    <input
                      type="number"
                      value={draftRates.catalystRatePerKg}
                      onChange={(e) =>
                        setDraftRates({
                          ...draftRates,
                          catalystRatePerKg: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Accelerator (₹/Kg)</label>
                    <input
                      type="number"
                      value={draftRates.acceleratorRatePerKg}
                      onChange={(e) =>
                        setDraftRates({
                          ...draftRates,
                          acceleratorRatePerKg: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">CSM 300 GSM (₹/Kg)</label>
                    <input
                      type="number"
                      value={draftRates.csm300RatePerKg}
                      onChange={(e) =>
                        setDraftRates({
                          ...draftRates,
                          csm300RatePerKg: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Wood Timber (₹/Cu.Ft)</label>
                    <input
                      type="number"
                      value={draftRates.woodRatePerCuFt}
                      onChange={(e) =>
                        setDraftRates({
                          ...draftRates,
                          woodRatePerCuFt: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Rigid Foam (₹/Sheet)</label>
                    <input
                      type="number"
                      value={draftRates.foamSheet.costPerSheet}
                      onChange={(e) =>
                        setDraftRates({
                          ...draftRates,
                          foamSheet: {
                            ...draftRates.foamSheet,
                            costPerSheet: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-sky-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Doors / Foam Sheet</label>
                    <input
                      type="number"
                      value={draftRates.foamSheet.doorsPerSheet}
                      onChange={(e) =>
                        setDraftRates({
                          ...draftRates,
                          foamSheet: {
                            ...draftRates.foamSheet,
                            doorsPerSheet: Math.max(1, Number(e.target.value) || 12),
                          },
                        })
                      }
                      className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Frame Wood Length Mode */}
              <div>
                <h4 className="font-bold text-amber-300 uppercase text-[11px] mb-2">
                  2. Frame Wood Running Length Formula Mode
                </h4>
                <select
                  value={draftRates.frameLengthMode}
                  onChange={(e) =>
                    setDraftRates({
                      ...draftRates,
                      frameLengthMode: e.target.value as FrameLengthMode,
                    })
                  }
                  className="w-full bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                >
                  <option value="FRAME_3SIDE_MINUS_DED">
                    3-Side Frame Total Length: (2 × Height + Width) − Deduction cm (Default)
                  </option>
                  <option value="FRAME_2H_MINUS_DED">
                    2-Side Vertical Height: (2 × Height) − Deduction cm
                  </option>
                  <option value="SINGLE_H_MINUS_DED">
                    Single Side Height: Height − Deduction cm
                  </option>
                </select>
              </div>

              {/* Pigment Shade Rates */}
              <div>
                <h4 className="font-bold text-purple-300 uppercase text-[11px] mb-2">
                  3. Colour-Wise Pigment Rates (₹/Kg)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Object.entries(draftRates.pigmentRatesByColour).map(([colourKey, rateVal]) => (
                    <div
                      key={colourKey}
                      className="flex items-center gap-2 bg-[#070D1E] border border-slate-800 rounded-lg p-2"
                    >
                      <span className="flex-1 text-xs font-semibold text-slate-200 truncate">
                        {colourKey}
                      </span>
                      <input
                        type="number"
                        value={rateVal}
                        onChange={(e) =>
                          setDraftRates({
                            ...draftRates,
                            pigmentRatesByColour: {
                              ...draftRates.pigmentRatesByColour,
                              [colourKey]: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-purple-300 font-bold"
                      />
                      {colourKey !== 'Default' && (
                        <button
                          type="button"
                          onClick={() => handleDeletePigmentColour(colourKey)}
                          className="p-1 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                          title="Delete colour rate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 bg-[#070D1E] border border-slate-800 rounded-xl p-2.5">
                  <input
                    type="text"
                    placeholder="New shade keyword (e.g. Emerald Green)"
                    value={newPigmentColour}
                    onChange={(e) => setNewPigmentColour(e.target.value)}
                    className="flex-1 min-w-[180px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="number"
                    placeholder="Rate ₹/Kg"
                    value={newPigmentRate}
                    onChange={(e) => setNewPigmentRate(e.target.value)}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-right"
                  />
                  <button
                    type="button"
                    onClick={handleAddPigmentColour}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shade Rate</span>
                  </button>
                </div>
              </div>

              {/* Lock Box Profiles Quick Cost & Kit Manager */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-rose-300 uppercase text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    4. Lock Box Kits &amp; Box Rates (₹ / Box)
                  </h4>
                  <button
                    type="button"
                    onClick={() => openLockBoxEditor()}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ New Lock Box</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(draftRates.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES).map((lb, idx) => (
                    <div
                      key={lb.id}
                      className="flex items-center gap-2 bg-[#070D1E] border border-slate-800 rounded-lg p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{lb.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {lb.isNoHardware ? 'Cutout Only (0 Items)' : `${lb.items.length} Hardware Items in Box`}
                        </div>
                      </div>
                      <input
                        type="number"
                        value={lb.boxCost}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setDraftRates((prev) => ({
                            ...prev,
                            lockBoxProfiles: (prev.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES).map(
                              (item, i) => (i === idx ? { ...item, boxCost: val } : item)
                            ),
                          }));
                        }}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-rose-300 font-bold"
                      />
                      {!lb.isNoHardware && (
                        <button
                          type="button"
                          onClick={() => openLockBoxEditor(lb)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-950 text-amber-300 text-[10px] font-bold cursor-pointer"
                        >
                          Edit Kit
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#070D1E] flex justify-between items-center gap-3">
              <button
                type="button"
                disabled={isSavingRates}
                onClick={() => handleSaveRates(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRatesModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isSavingRates}
                  onClick={() => handleSaveRates(false)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  {isSavingRates ? 'Saving...' : 'Save BOQ Rates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT PREVIEW MODAL ================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/85 backdrop-blur-md printable-modal-root">
          <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  STORE MATERIAL REQUISITION &amp; ISSUE SLIP —{' '}
                  {isConsumablesMode
                    ? 'FLOOR & EVENING CONSUMABLES'
                    : isCustomCalcMode
                    ? 'CUSTOM SIZE ESTIMATE'
                    : selectedOrder?.orderNumber || 'BATCH BOQ'}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Official Store Release Document
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 overflow-y-auto font-sans text-xs space-y-5 print:p-0">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-rose-700 tracking-wider">
                    EXMARK DOORS — FACTORY STORE DIVISION
                  </div>
                  <div className="text-xs text-slate-700 font-bold">
                    STORE MATERIAL REQUISITION &amp; ISSUE SLIP (മെറ്റീരിയൽ ഇഷ്യൂ വൗച്ചർ)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Plant Unit, Vengara, Malappuram • Release to Hand-Craft FRP Layup &amp; Assembly Floor
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-emerald-900 text-white rounded font-bold text-[10px]">
                    STORE ISSUE SLIP
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    Slip #:{' '}
                    {isConsumablesMode
                      ? `FC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`
                      : isCustomCalcMode
                      ? 'MR-CUSTOM-BOQ'
                      : isBatchBoqMode
                      ? `MR-BATCH-${batchOrders.length}P`
                      : `MR-2026-${(selectedOrder?.orderNumber || '001').slice(-3)}`}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Date: {new Date().toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs">
                <div>
                  <span className="text-[10px] text-emerald-900 font-bold uppercase">
                    {isConsumablesMode
                      ? 'Issued For Floor / Shift Consumables:'
                      : isCustomCalcMode
                      ? 'Issued For Quick Custom Sizing Batch:'
                      : isBatchBoqMode
                      ? 'Issued For Consolidated Production Run:'
                      : 'Issued For Production Order:'}
                  </span>
                  <div className="text-sm font-black text-slate-950">
                    {isConsumablesMode
                      ? `Floor Consumables Register (${consumableShiftFilter} Shift • ${activeExtraItems.length} items)`
                      : isCustomCalcMode
                      ? `${totalDoors} Custom Door Sets (${customRows.map((r) => `${r.widthCm}×${r.heightCm}cm ×${r.quantity}`).join(', ')})`
                      : isBatchBoqMode
                      ? `${batchOrders.length} Combined Parties (${batchOrders
                          .map((b) => b.customerName.split('(')[0].trim())
                          .join(', ')})`
                      : `${selectedOrder?.orderNumber || 'N/A'} — ${selectedOrder?.customerName || 'Client'}`}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    {isConsumablesMode
                      ? 'Standalone Floor Shift Consumables & Maintenance Purchase Log'
                      : isCustomCalcMode
                      ? 'Custom Estimation / Trial Store Requisition'
                      : isBatchBoqMode
                      ? 'Central Hand-Craft FRP Floor Batch'
                      : `Site: ${selectedOrder?.siteName || '-'}`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-900 font-bold uppercase">
                    Job Card &amp; Target:
                  </span>
                  <div className="text-xs font-bold text-slate-900">
                    {isConsumablesMode
                      ? 'FLOOR-CONSUMABLES'
                      : isCustomCalcMode
                      ? 'CUSTOM-SIMULATOR'
                      : isBatchBoqMode
                      ? `BATCH-HC-${selectedBatchOrderIds.length}P`
                      : selectedOrder?.jobCardNumber || 'N/A'}{' '}
                    ({isConsumablesMode ? `${activeExtraItems.length} Entries` : `${totalDoors} Doors • ${totalSqft} Sq.Ft`})
                  </div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    Floor Line: Hand-Craft Mold Layup, Frame Joinery &amp; Finishing
                  </div>
                </div>
              </div>

              {isBatchBoqMode && consolidatedBatchEntries.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300 text-[11px] space-y-1">
                  <div className="font-black text-slate-800 uppercase text-[10px]">
                    Party-Wise Partial Doors in This Consolidated Print ({totalDoors} Doors • {totalSqft} Sq.Ft):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {consolidatedBatchEntries.map((ce) => (
                      <span
                        key={ce.prodOrderId}
                        className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-900 font-semibold"
                      >
                        <strong>{ce.customerName.split('(')[0].trim()}</strong> ({ce.jobCardNumber}):{' '}
                        <span className="font-mono font-black text-emerald-800">
                          {ce.doorIds.length}/{ce.totalOrderDoors}
                        </span>{' '}
                        [{ce.doorNumbers.join(', ')}]
                        {ce.balanceDoorsAfter > 0 ? ` • Bal: ${ce.balanceDoorsAfter}` : ' • Full'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hasCustomUsageOverrides && (
                <div className="p-2.5 bg-amber-50 rounded-lg border-2 border-amber-500 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-bold">
                  <span>⚡ CUSTOM SHOP-FLOOR USAGE ACTIVE (+{customUsageBufferPercent}% Buffer / Marked Items Requisition)</span>
                  {customUsageNotes && <span className="font-normal italic text-[10px] text-amber-900">Note: {customUsageNotes}</span>}
                </div>
              )}

              <table className="w-full text-left border-collapse border border-slate-300 text-xs mt-3">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">Raw Material Item</th>
                    <th className="p-2 border-r border-slate-300">Formula Spec / Section</th>
                    <th className="p-2 border-r border-slate-300 text-right">Required Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right">Est. Cost (₹)</th>
                    <th className="p-2 text-center">Storekeeper Check</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveBoq.resin.included && (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-bold">1</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>FRP Polyester Resin</strong>
                      </td>
                      <td className="p-2 border-r border-slate-300">
                        {ratesConfig.resinKg} kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        {effectiveBoq.resin.qty.toFixed(2)} Kg
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ₹{effectiveBoq.resin.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                    </tr>
                  )}

                  {effectiveBoq.gel.included && (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-bold">2</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>Gelcoat (GEL)</strong>
                      </td>
                      <td className="p-2 border-r border-slate-300">
                        {ratesConfig.gelKg} kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        {effectiveBoq.gel.qty.toFixed(2)} Kg
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ₹{effectiveBoq.gel.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                    </tr>
                  )}

                  {(effectiveBoq.catalystGrams.included || effectiveBoq.acceleratorGrams.included) && (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-bold">3</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>Catalyst (MEKP) &amp; Accelerator</strong>
                      </td>
                      <td className="p-2 border-r border-slate-300">
                        {ratesConfig.catalystGrams}g MEKP + {ratesConfig.acceleratorGrams}g Cobalt / door base
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        {effectiveBoq.catalystGrams.included ? `${Math.round(effectiveBoq.catalystGrams.qty)}g` : '—'} +{' '}
                        {effectiveBoq.acceleratorGrams.included ? `${Math.round(effectiveBoq.acceleratorGrams.qty)}g` : '—'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ₹{(effectiveBoq.catalystGrams.cost + effectiveBoq.acceleratorGrams.cost).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                    </tr>
                  )}

                  {effectiveBoq.csm300.included && (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-bold">4</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>Chopped Strand Mat (300 GSM)</strong>
                      </td>
                      <td className="p-2 border-r border-slate-300">
                        {ratesConfig.csm300Kg} kg / {boq.baseDoorSqFt.toFixed(2)} sq.ft
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        {effectiveBoq.csm300.qty.toFixed(2)} Kg
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ₹{effectiveBoq.csm300.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                    </tr>
                  )}

                  {(() => {
                    const mult = 1 + customUsageBufferPercent / 100;
                    const activePigs = (boq.pigmentByColour || [])
                      .map((p) => {
                        const pk = `pigment_${p.matchedRateKey || p.colourLabel}`;
                        const ov = customUsageOverrides[pk];
                        if (ov?.excluded) return null;
                        const baseG = customUsageBufferPercent > 0 ? Math.round(p.pigmentGrams * mult) : Math.round(p.pigmentGrams);
                        const qtyG = ov?.customQty !== undefined ? Math.round(ov.customQty) : baseG;
                        const rate = ov?.customRate !== undefined ? ov.customRate : p.ratePerKg;
                        return {
                          label: p.colourLabel,
                          qtyG,
                          cost: Math.round((qtyG / 1000) * rate),
                        };
                      })
                      .filter(Boolean) as Array<{ label: string; qtyG: number; cost: number }>;
                    if (activePigs.length === 0) return null;
                    const totG = activePigs.reduce((s, p) => s + p.qtyG, 0);
                    const totCost = activePigs.reduce((s, p) => s + p.cost, 0);
                    return (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-300 font-bold">5</td>
                        <td className="p-2 border-r border-slate-300">
                          <strong>Pigment Paste (Colour-Wise)</strong>
                          <div className="text-[10px] text-slate-600">
                            {activePigs.map((p) => `${p.label}: ${p.qtyG}g`).join(' | ')}
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          {ratesConfig.pigmentGrams} gm / base door
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-black">
                          {totG} gm
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right">
                          ₹{totCost.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                      </tr>
                    );
                  })()}

                  {effectiveBoq.timber.included && (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-bold">6</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>Frame &amp; Shutter Wood Reepers (Cu.Ft)</strong>
                        <div className="text-[10px] text-slate-600">
                          Frame: {boq.frameWoodRunningFt.toFixed(2)} Rft ({boq.frameWoodCuFt.toFixed(4)} cu.ft) •
                          Lock 2×12×15cm×2: {boq.lockReeperCuFt.toFixed(4)} cu.ft •
                          Hinge 2×4×16cm×3: {boq.hingeReeperCuFt.toFixed(4)} cu.ft
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-300">{frameModeLabel}</td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        {effectiveBoq.timber.qty.toFixed(4)} Cu.Ft
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ₹{effectiveBoq.timber.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                    </tr>
                  )}

                  {effectiveBoq.foam.included && (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-bold">7</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>
                          Rigid Foam Sheet ({ratesConfig.foamSheet.widthCm}×{ratesConfig.foamSheet.heightCm} cm)
                        </strong>
                      </td>
                      <td className="p-2 border-r border-slate-300">
                        1 Sheet / {ratesConfig.foamSheet.doorsPerSheet} Doors (Buy {Math.ceil(effectiveBoq.foam.qty)} Full)
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        {effectiveBoq.foam.qty.toFixed(2)} Sheets
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ₹{effectiveBoq.foam.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                    </tr>
                  )}

                  {activeExtraItems
                    .filter((ext) => isItemIncluded(`extra_${ext.id}`))
                    .map((ext, idx) => (
                      <tr key={`print-ext-${ext.id}`} className="border-b border-slate-200 bg-purple-50/40">
                        <td className="p-2 border-r border-slate-300 font-bold">{8 + idx}</td>
                        <td className="p-2 border-r border-slate-300">
                          <strong>{ext.itemName}</strong>
                          {ext.specNote && (
                            <div className="text-[10px] text-slate-600">{ext.specNote}</div>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          Extra Item ({ext.category})
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-black">
                          {ext.quantity} {ext.unit}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right">
                          ₹{Math.round(ext.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                      </tr>
                    ))}

                  {boq.lockBoxBreakdown
                    .filter((lb) => lb.isNoHardware || isItemIncluded(`lock_${lb.profileId}`))
                    .map((lb, idx) => (
                      <tr key={`print-lb-${lb.profileId}-${idx}`} className="border-b border-slate-200 bg-rose-50/40">
                        <td className="p-2 border-r border-slate-300 font-bold">L{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300">
                          <strong>Lock Box — {lb.boxName}</strong>
                          <div className="text-[10px] text-slate-600">
                            {lb.isNoHardware
                              ? 'Cutout Only (0 Lock Box Hardware)'
                              : `RH: ${lb.rhCount} | LH: ${lb.lhCount} • ${lb.aggregatedComponents
                                  .map((c) => `${c.name}: ${c.totalQty}`)
                                  .join(', ')}`}
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          {lb.isNoHardware ? 'Cutout Only' : getLockReadinessStatus(lb.profileId).replace(/_/g, ' ')}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-black">
                          {lb.isNoHardware ? '0 Box' : `${lb.doorsCount} Box`}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right">
                          ₹{Math.round(lb.totalBoxCost).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                      </tr>
                    ))}

                  {boq.consolidatedLockKitHardware.length > 0 && (
                    <tr className="border-b border-slate-300 bg-slate-50">
                      <td colSpan={6} className="p-2 text-[10px] text-slate-700">
                        <strong>Total Hardware Packing Kit Pieces:</strong>{' '}
                        {boq.consolidatedLockKitHardware
                          .map((c) => `${c.name}: ${c.totalQty} ${c.unit}`)
                          .join(' | ')}
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-100 font-black">
                    <td colSpan={4} className="p-2 border-r border-slate-300 text-right">
                      COMBINED RAW MATERIAL &amp; LOCK BOX VALUE ({totalDoors} DOORS • {markedIssueItems.length} MARKED ITEMS):
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right text-emerald-800">
                      ₹{markedIssueTotalValue.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center">APPROVED</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end border-t border-slate-300 text-[11px] text-slate-600">
                <div>
                  <div>
                    Requisition Raised by: <strong>Production Supervisor</strong>
                  </div>
                  <div className="mt-4">Signature: __________________________</div>
                </div>
                <div className="text-right">
                  <div>
                    Materials Issued by: <strong>Store In-Charge (Vengara)</strong>
                  </div>
                  <div className="mt-4">Storekeeper Signature &amp; Stamp: __________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT EXTRA STORE ISSUE ITEM MODAL ================= */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B132B] border border-purple-500/40 text-slate-100 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  {editingExtraItemId
                    ? 'Edit Extra Store Issue Item'
                    : 'Add New Store Issue Item (പുതിയ ഐറ്റം ചേർക്കുക)'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Attached to Order Key: <strong className="text-purple-300">{primaryExtraOrderKey}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExtraItem} className="p-5 space-y-4 text-xs">
              {!editingExtraItemId && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                    Quick Common Consumables &amp; Hardware Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {EXTRA_ITEM_PRESETS.map((preset) => (
                      <button
                        key={preset.itemName}
                        type="button"
                        onClick={() => {
                          setExtraItemName(preset.itemName);
                          setExtraItemCategory(preset.category);
                          setExtraItemUnit(preset.unit);
                          setExtraItemRate(String(preset.unitRate));
                          setExtraItemSpecNote(preset.specNote);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/60 border border-slate-700 hover:border-purple-500/60 text-[11px] text-slate-200 font-semibold cursor-pointer"
                      >
                        + {preset.itemName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2K Auto Putty / Masking Tape"
                    value={extraItemName}
                    onChange={(e) => setExtraItemName(e.target.value)}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Category
                  </label>
                  <select
                    value={extraItemCategory}
                    onChange={(e) =>
                      setExtraItemCategory(e.target.value as ExtraBoqItemCategory)
                    }
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                  >
                    <option value="Consumable">Consumable</option>
                    <option value="Chemical">Chemical</option>
                    <option value="Timber / Wood">Timber / Wood</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Packing">Packing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={extraItemQty}
                    onChange={(e) => setExtraItemQty(e.target.value)}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Unit</label>
                  <select
                    value={extraItemUnit}
                    onChange={(e) => setExtraItemUnit(e.target.value)}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                  >
                    <option value="Kg">Kg</option>
                    <option value="gm">gm</option>
                    <option value="Liters">Liters</option>
                    <option value="Nos">Nos</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Cu.Ft">Cu.Ft</option>
                    <option value="Boxes">Boxes</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Unit Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraItemRate}
                    onChange={(e) => setExtraItemRate(e.target.value)}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Shift Timing</label>
                  <select
                    value={extraItemShift}
                    onChange={(e) => setExtraItemShift(e.target.value as 'MORNING' | 'AFTERNOON' | 'EVENING')}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                  >
                    <option value="MORNING">Morning Shift</option>
                    <option value="AFTERNOON">Afternoon Shift</option>
                    <option value="EVENING">Evening Shift</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Date</label>
                  <input
                    type="date"
                    value={extraItemDate}
                    onChange={(e) => setExtraItemDate(e.target.value)}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Floor Gang / Staff</label>
                  <input
                    type="text"
                    placeholder="e.g. Painting Gang"
                    value={extraItemGangName}
                    onChange={(e) => setExtraItemGangName(e.target.value)}
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold">
                  Issue Reason / Spec Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra issued for door rework or frame joint"
                  value={extraItemSpecNote}
                  onChange={(e) => setExtraItemSpecNote(e.target.value)}
                  className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-[#070D1E] border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Calculated Line Total:</span>
                <span className="text-sm font-black text-emerald-400">
                  ₹
                  {Math.round(
                    (Number(extraItemQty) || 0) * (Number(extraItemRate) || 0)
                  ).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExtraItem}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow cursor-pointer disabled:opacity-50"
                >
                  {isSavingExtraItem
                    ? 'Saving...'
                    : editingExtraItemId
                    ? 'Update Item'
                    : 'Add to BOQ & Store Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= LOCK BOX KIT & ITEMS EDITOR MODAL ================= */}
      {editingLockBox && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0B132B] border border-rose-500/40 text-slate-100 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  {isNewLockBoxModal
                    ? 'Add New Lock Box Kit Profile'
                    : `Edit Lock Box Kit: ${editingLockBox.name}`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Edit box cost (₹200 / ₹600) and Add, Edit, or Delete individual screws, hinges, bolts &amp; lock items inside this kit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLockBox(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLockBoxModal} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Lock Box Kit Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PlusPoint Black"
                    value={editingLockBox.name}
                    onChange={(e) =>
                      setEditingLockBox({ ...editingLockBox, name: e.target.value })
                    }
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Box Cost (₹ / Door) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingLockBox.boxCost}
                    onChange={(e) =>
                      setEditingLockBox({
                        ...editingLockBox,
                        boxCost: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-rose-300 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold">
                  Match Keywords (comma separated — links Quotation / Floor Door lock names)
                </label>
                <input
                  type="text"
                  value={editingLockBox.matchKeywords.join(', ')}
                  onChange={(e) =>
                    setEditingLockBox({
                      ...editingLockBox,
                      matchKeywords: e.target.value
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                />
              </div>

              {/* Kit Items Table with Edit / Add / Delete Columns */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070D1E]">
                <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-[11px] uppercase">
                    Hardware Items Included Inside 1 Box ({editingLockBox.items.length} Items)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingLockBox({
                        ...editingLockBox,
                        items: buildCommonBasicKitItems(editingLockBox.name || 'Lock'),
                      })
                    }
                    className="text-[10px] text-cyan-300 hover:underline font-bold cursor-pointer"
                  >
                    Reset to Standard Basic Kit
                  </button>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="p-2">Hardware Item Name</th>
                      <th className="p-2 text-right">Qty / Box</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {editingLockBox.items.map((kitItem, kIdx) => (
                      <tr key={kitItem.id || `k-${kIdx}`}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={kitItem.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingLockBox({
                                ...editingLockBox,
                                items: editingLockBox.items.map((it, i) =>
                                  i === kIdx ? { ...it, name: val } : it
                                ),
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={kitItem.qtyPerBox}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setEditingLockBox({
                                ...editingLockBox,
                                items: editingLockBox.items.map((it, i) =>
                                  i === kIdx ? { ...it, qtyPerBox: val } : it
                                ),
                              });
                            }}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-emerald-300 font-bold"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="text"
                            value={kitItem.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingLockBox({
                                ...editingLockBox,
                                items: editingLockBox.items.map((it, i) =>
                                  i === kIdx ? { ...it, unit: val } : it
                                ),
                              });
                            }}
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center text-slate-200"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingLockBox({
                                ...editingLockBox,
                                items: editingLockBox.items.filter((_, i) => i !== kIdx),
                              })
                            }
                            className="p-1 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                            title="Delete item from kit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add New Hardware Item Row inside Kit */}
                <div className="p-2 border-t border-slate-800 bg-slate-900/50 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add kit item (e.g. L-Bracket / Striker Plate)"
                    value={newKitItemName}
                    onChange={(e) => setNewKitItemName(e.target.value)}
                    className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="0"
                    step="0.5"
                    value={newKitItemQty}
                    onChange={(e) => setNewKitItemQty(e.target.value)}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-emerald-300 font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={newKitItemUnit}
                    onChange={(e) => setNewKitItemUnit(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newKitItemName.trim();
                      const qty = Math.max(0, Number(newKitItemQty) || 0);
                      if (!clean) return;
                      setEditingLockBox({
                        ...editingLockBox,
                        items: [
                          ...editingLockBox.items,
                          {
                            id: `kit-${Date.now()}`,
                            name: clean,
                            qtyPerBox: qty,
                            unit: newKitItemUnit.trim() || 'Pcs',
                          },
                        ],
                      });
                      setNewKitItemName('');
                      setNewKitItemQty('1');
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800">
                <div>
                  {!isNewLockBoxModal &&
                    (ratesConfig.lockBoxProfiles || DEFAULT_LOCK_BOX_PROFILES).length > 1 && (
                      <button
                        type="button"
                        disabled={isSavingLockBox}
                        onClick={() => handleDeleteLockBoxProfile(editingLockBox.id)}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-700 font-bold cursor-pointer"
                      >
                        Delete Lock Box
                      </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLockBox(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLockBox}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow cursor-pointer disabled:opacity-50"
                  >
                    {isSavingLockBox ? 'Saving...' : 'Save Lock Box Kit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <PurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        initialItems={unOrderedConsumablePoItems}
        initialSourceType="FLOOR_CONSUMABLES"
        initialNotes={`Evening / Floor Consumables Batch (${new Date().toISOString().slice(0, 10)})`}
        onCreated={() => {
          apiFetch('/api/boq/extra-items')
            .then((r) => r.json())
            .then((json) => {
              if (json.success && Array.isArray(json.data)) setExtraItems(json.data);
            })
            .catch(() => {});
        }}
      />

      <DailyStoreIssueSlipModal
        isOpen={isDailyIssueSlipOpen}
        onClose={() => {
          setIsDailyIssueSlipOpen(false);
          setPreviewIssueVoucher(null);
          setPreviewConsolidatedBatch(null);
        }}
        order={
          !isBatchBoqMode && selectedOrder
            ? {
                id: selectedOrder.id,
                prodOrderId: selectedOrder.prodOrderId,
                orderNumber: selectedOrder.orderNumber,
                jobCardNumber: selectedOrder.jobCardNumber,
                customerName: selectedOrder.customerName,
                siteName: selectedOrder.siteName,
                doorsCount: selectedOrder.doorsCount,
              }
            : null
        }
        selectedDoors={activeDoors}
        boq={boq}
        ratesConfig={ratesConfig}
        customItems={markedIssueItems}
        bufferPercent={customUsageBufferPercent}
        initialGangName={issueGangName}
        initialShift={issueShift}
        notes={customUsageNotes}
        previewVoucher={previewIssueVoucher}
        consolidatedEntries={isBatchBoqMode ? consolidatedBatchEntries : undefined}
        previewConsolidatedBatch={previewConsolidatedBatch}
        onIssued={(result) => {
          applyOrderUpdateAfterIssue(result);
          setBoqIssueNotice({
            type: 'success',
            text: result.allDoorsIssued
              ? `Issued ${result.voucher.voucherNumber} (₹${result.voucher.totalIssuedValue.toLocaleString('en-IN')}) — All doors issued & cleared from Pending!`
              : `Issued ${result.voucher.voucherNumber} for ${result.voucher.doorsCount} door(s) (₹${result.voucher.totalIssuedValue.toLocaleString('en-IN')}) — ${result.remainingPendingDoors} door(s) still Pending.`,
          });
        }}
        onConsolidatedIssued={(result, msg) => {
          applyBatchUpdateAfterIssue(result, msg);
        }}
      />
    </div>
  );
}
