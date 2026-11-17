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
import { DailyStoreIssueSlipModal } from './DailyStoreIssueSlipModal';

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
    Record<string, { customQty?: number; customRate?: number; note?: string }>
  >({});
  const [customUsageNotes, setCustomUsageNotes] = useState<string>('');
  const [isSavingCustomUsage, setIsSavingCustomUsage] = useState<boolean>(false);
  const [customUsageSaveSuccess, setCustomUsageSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    fetch('/api/production')
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

        const firstPending = liveOrders.find((o) => !o.boqIssuedAt) || liveOrders[0];
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
        setSelectedBatchOrderIds(liveOrders.filter((o) => !o.boqIssuedAt).slice(0, 5).map((o) => o.id));
      })
      .catch((err) => console.error('Failed to sync live requisition orders:', err));

    fetch('/api/settings/frames')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setFramesCatalog(json.data);
        }
      })
      .catch((err) => console.error('Failed to load custom frames for BOQ:', err));

    fetch('/api/boq/material-rates')
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

    fetch('/api/boq/extra-items')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setExtraItems(json.data);
        }
      })
      .catch((err) => console.error('Failed to load extra BOQ items:', err));

    fetch('/api/boq/lock-readiness')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data && typeof json.data === 'object') {
          setLockReadinessMap(json.data);
        }
      })
      .catch((err) => console.error('Failed to load lock readiness states:', err));

    return () => {
      active = false;
    };
  }, [initialOrderId]);

  const pendingBoqOrders = useMemo(
    () => orders.filter((o) => !o.boqIssuedAt),
    [orders]
  );
  const issuedBoqOrders = useMemo(
    () => orders.filter((o) => Boolean(o.boqIssuedAt)),
    [orders]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];
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
    try {
      const res = await fetch(`/api/production/${selectedOrder.prodOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_BOQ_ISSUED' }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOrders((prev) =>
          prev.map((o) =>
            o.prodOrderId === selectedOrder.prodOrderId
              ? { ...o, boqIssuedAt: json.data.boqIssuedAt || new Date().toISOString() }
              : o
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark BOQ issued:', err);
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

      const res = await fetch('/api/boq/extra-items', {
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
      const res = await fetch(`/api/boq/extra-items?id=${encodeURIComponent(id)}`, {
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
      const res = await fetch('/api/boq/lock-readiness', {
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
      const res = await fetch('/api/boq/material-rates', {
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

  const handleSelectAllInProductionOrders = () => {
    const activeFloorIds = orders
      .filter((o) => (o.orderStatus || '').toUpperCase() !== 'COMPLETED')
      .map((o) => o.id);
    setIsCustomCalcMode(false);
    setIsBatchBoqMode(true);
    setSelectedBatchOrderIds(activeFloorIds.length > 0 ? activeFloorIds : orders.map((o) => o.id));
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
    if (!isBatchBoqMode && selectedOrder && selectedDoorIds.length > 0) {
      const filtered = selectedOrder.doors.filter(
        (d) =>
          selectedDoorIds.includes(d.id || '') ||
          selectedDoorIds.includes(d.doorId || '') ||
          selectedDoorIds.includes(d.doorNumber || '')
      );
      if (filtered.length > 0) return filtered;
    }
    return activeOrders.flatMap((o) => o.doors);
  }, [isCustomCalcMode, customRows, framesCatalog, activeOrders, isBatchBoqMode, selectedOrder, selectedDoorIds]);

  const activeBatchKey = useMemo(() => {
    if (isCustomCalcMode) return 'CUSTOM_SIMULATOR';
    if (isBatchBoqMode) return 'CONSOLIDATED_BATCH';
    return selectedOrderId || 'SINGLE_ORDER';
  }, [isCustomCalcMode, isBatchBoqMode, selectedOrderId]);

  useEffect(() => {
    fetch(`/api/boq/custom-usage?batchKey=${encodeURIComponent(activeBatchKey)}`)
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
      const res = await fetch('/api/boq/custom-usage', {
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
      await fetch(`/api/boq/custom-usage?batchKey=${encodeURIComponent(activeBatchKey)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to reset custom BOQ usage:', e);
    }
  };

  const updateItemCustomQty = (key: string, qty: number | undefined) => {
    setCustomUsageOverrides((prev) => {
      const existing = prev[key] || {};
      if (qty === undefined || Number.isNaN(qty)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...existing, customQty: qty } };
    });
  };

  const updateItemCustomRate = (key: string, rate: number | undefined) => {
    setCustomUsageOverrides((prev) => {
      const existing = prev[key] || {};
      if (rate === undefined || Number.isNaN(rate)) {
        const next = { ...prev };
        if (existing.customQty === undefined) {
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

  const effectiveBoq = useMemo(() => {
    const mult = 1 + (customUsageBufferPercent / 100);

    const getField = (key: string, formulaQty: number, standardRate: number) => {
      const ovr = customUsageOverrides[key];
      const withBuf = customUsageBufferPercent > 0 ? Number((formulaQty * mult).toFixed(2)) : formulaQty;
      const qty = ovr?.customQty !== undefined ? ovr.customQty : withBuf;
      const rate = ovr?.customRate !== undefined ? ovr.customRate : standardRate;
      const isOverridden = ovr?.customQty !== undefined || ovr?.customRate !== undefined || customUsageBufferPercent > 0;
      return {
        qty,
        rate,
        cost: Math.round(qty * rate),
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
        const qty = customPig?.customQty !== undefined ? customPig.customQty : Math.round(pig.pigmentGrams);
        const rate = customPig?.customRate !== undefined ? customPig.customRate : pig.ratePerKg;
        totalPigmentCost += (qty / 1000) * rate;
      });
    } else {
      totalPigmentCost = boq.pigmentCost;
    }

    const groupACost = resin.cost + gel.cost + catalystGrams.cost + acceleratorGrams.cost + csm300.cost + Math.round(totalPigmentCost);
    const groupBCost = timber.cost + foam.cost;
    const grandTotalCost = groupACost + groupBCost + Math.round(boq.totalLockBoxCost) + extraItemsCost;

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
      grandTotalCost,
    };
  }, [boq, ratesConfig, customUsageBufferPercent, customUsageOverrides, extraItemsCost]);

  const totalDoors = boq.totalDoors;
  const totalSqft = Number(boq.totalSqFt.toFixed(2));
  const totalLockBoxCost = Math.round(boq.totalLockBoxCost);
  const doorRawAndExtraTotal = Math.round(boq.grandTotalCost + extraItemsCost);
  const grandTotalCost = hasCustomUsageOverrides ? effectiveBoq.grandTotalCost : doorRawAndExtraTotal + totalLockBoxCost;
  const effectiveCostPerDoor = totalDoors > 0 ? grandTotalCost / totalDoors : 0;
  const effectiveCostPerSqFt = boq.totalSqFt > 0 ? (grandTotalCost - totalLockBoxCost) / boq.totalSqFt : 0;

  const toggleBatchOrder = (id: string) => {
    setSelectedBatchOrderIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== id);
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
      const res = await fetch('/api/boq/material-rates', {
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
    <div className="space-y-6">
      {/* Selection Header */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
              {isCustomCalcMode
                ? 'Quick Door Size Auto-BOQ Calculator (80×210 cm Basis)'
                : isBatchBoqMode
                ? 'Consolidated Batch BOQ & Automatic Sq.Ft Material Engine'
                : 'Auto BOQ Material Calculator & Store Requisition'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isCustomCalcMode
              ? 'കസ്റ്റം അളവുകൾ (cm) നൽകി ആവശ്യമായ Resin, GEL, Catalyst, Accelerator, CSM 300 GSM, Colour Pigment, Timber (Cu.Ft), Rigid Foam (50×100 cm) എന്നിവ ഉടൻ കണക്കാക്കുക.'
              : isBatchBoqMode
              ? 'ഒന്നിലധികം പാർട്ടികളിൽ നിന്നുള്ള വാതിലുകൾ ഒരുമിച്ച് ഹാൻഡ്-ക്രാഫ്റ്റ് പ്രൊഡക്ഷൻ നടത്തുമ്പോൾ ആവശ്യമായ ആകെ മെറ്റീരിയൽ ലിസ്റ്റ് (Total Batch BOQ).'
              : `Sq.Ft-scaled Resin (${ratesConfig.resinKg}kg), Gel (${ratesConfig.gelKg}kg), Catalyst (${ratesConfig.catalystGrams}g), Accelerator (${ratesConfig.acceleratorGrams}g), CSM 300 GSM (${ratesConfig.csm300Kg}kg), Colour Pigments (${ratesConfig.pigmentGrams}g), Cu.Ft Frame/Shutter Wood & Rigid Foam (${ratesConfig.foamSheet.widthCm}×${ratesConfig.foamSheet.heightCm} cm) based on ${ratesConfig.baseDoorWidthCm}×${ratesConfig.baseDoorHeightCm} cm baseline (${boq.baseDoorSqFt.toFixed(2)} Sq.Ft).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={openRatesModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>BOQ Rates, Pigments &amp; Lock Kits</span>
          </button>

          <button
            type="button"
            onClick={handleSelectAllInProductionOrders}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/50 shadow transition flex items-center gap-1.5 cursor-pointer"
            title="Combine all non-completed production orders to check total locks & kit screws needed before delivery rush"
          >
            <Lock className="w-3.5 h-3.5 text-rose-300" />
            <span>Lock Rush (All In-Production)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isConsumablesMode;
              setIsConsumablesMode(next);
              if (next) {
                setIsCustomCalcMode(false);
                setIsBatchBoqMode(false);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer ${
              isConsumablesMode
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-600/60'
            }`}
            title="Log standalone evening / daily floor consumables not tied to a single door order & convert to PO"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Floor / Evening Consumables ({extraItems.filter((i) => i.orderKey === 'FLOOR-CONSUMABLES' || i.isFloorConsumable).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isCustomCalcMode;
              setIsCustomCalcMode(next);
              if (next) {
                setIsBatchBoqMode(false);
                setIsConsumablesMode(false);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer ${
              isCustomCalcMode
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white ring-2 ring-cyan-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-600/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Quick Size Calculator (80×210 cm)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isBatchBoqMode;
              setIsBatchBoqMode(next);
              if (next) {
                setIsCustomCalcMode(false);
                setIsConsumablesMode(false);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer ${
              isBatchBoqMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>⚡ Consolidated Multi-Party BOQ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomUsageEditMode((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer ${
              isCustomUsageEditMode
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                : hasCustomUsageOverrides
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
            }`}
            title="Edit raw material quantities, adjust buffer %, and override rates for shop-floor custom usage"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>
              {isCustomUsageEditMode
                ? 'Close Custom Usage Edit'
                : hasCustomUsageOverrides
                ? `⚡ Custom Usage Active (+${customUsageBufferPercent}%)`
                : 'Edit Custom Usage (കസ്റ്റം യൂസേജ്)'}
            </span>
          </button>

          {!isBatchBoqMode && !isCustomCalcMode && !isConsumablesMode && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={orderHistoryFilter}
                onChange={(e) => setOrderHistoryFilter(e.target.value as 'ALL' | 'PENDING' | 'ISSUED')}
                className="bg-[#070D1E] border border-slate-700 text-slate-300 text-xs rounded-xl p-2 font-semibold cursor-pointer"
                title="Filter between Pending BOQ Issue vs Already Issued BOQ History"
              >
                <option value="ALL">All Orders ({orders.length})</option>
                <option value="PENDING">Pending BOQ Issue ({pendingBoqOrders.length})</option>
                <option value="ISSUED">Already Issued ({issuedBoqOrders.length})</option>
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
                        <optgroup label="Pending BOQ Issue (പുതിയവ)">
                          {pendingBoqOrders.map((o) => (
                            <option key={o.id} value={o.id}>
                              [PENDING] {o.jobCardNumber} — {o.customerName} ({o.doorsCount} Doors)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    {(orderHistoryFilter === 'ALL' || orderHistoryFilter === 'ISSUED') &&
                      issuedBoqOrders.length > 0 && (
                        <optgroup label="Already Issued BOQ History (നൽകി കഴിഞ്ഞവ)">
                          {issuedBoqOrders.map((o) => (
                            <option key={o.id} value={o.id}>
                              [ISSUED {o.boqIssuedAt ? o.boqIssuedAt.slice(0, 10) : ''}] {o.jobCardNumber} — {o.customerName} ({o.doorsCount} Doors)
                            </option>
                          ))}
                        </optgroup>
                      )}
                  </>
                )}
              </select>

              {selectedOrder && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsDailyIssueSlipOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow cursor-pointer transition"
                    title="Print Daily Store Material Issue Voucher for today's selected batch of doors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Daily Issue Slip ({activeDoors.length} Doors)</span>
                  </button>

                  {selectedOrder.boqIssuedAt ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>BOQ Issued ({selectedOrder.boqIssuedAt.slice(0, 10)})</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={markingBoqIssued}
                      onClick={handleMarkBoqIssued}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow cursor-pointer disabled:opacity-50"
                      title="Move this order into Already Issued BOQ History once materials are handed out"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{markingBoqIssued ? 'Marking...' : '✓ Mark Entire BOQ Issued'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DAILY PARTIAL DOOR SLICER (FOR PROGRESSIVE STAGES & DAILY MATERIAL LIMITS) */}
      {!isBatchBoqMode && !isCustomCalcMode && !isConsumablesMode && selectedOrder && selectedOrder.doors.length > 0 && (
        <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Daily Door Slicer &amp; Heat Material Planning (ഇന്നത്തെ ബാച്ച് പ്ലാനിംഗ്)
              </h4>
              <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-600/40">
                Selected: {activeDoors.length} of {selectedOrder.doors.length} Doors ({Math.round((activeDoors.length / selectedOrder.doors.length) * 100)}%)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDoorIds([])}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                  selectedDoorIds.length === 0
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                All Doors ({selectedOrder.doors.length})
              </button>
              {selectedOrder.doors.length >= 4 && (
                <button
                  type="button"
                  onClick={() => {
                    const four = selectedOrder.doors.slice(0, 4).map((d) => d.id || d.doorId || d.doorNumber || '');
                    setSelectedDoorIds(four);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 cursor-pointer"
                >
                  🔥 Today&apos;s 4 Doors
                </button>
              )}
              {selectedOrder.doors.length >= 6 && (
                <button
                  type="button"
                  onClick={() => {
                    const six = selectedOrder.doors.slice(0, 6).map((d) => d.id || d.doorId || d.doorNumber || '');
                    setSelectedDoorIds(six);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 cursor-pointer"
                >
                  🔥 Today&apos;s 6 Doors
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const pending = selectedOrder.doors
                    .filter((d) => !d.materialIssued)
                    .map((d) => d.id || d.doorId || d.doorNumber || '');
                  setSelectedDoorIds(pending);
                }}
                className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 cursor-pointer"
              >
                ⏳ Pending Material Issue Only
              </button>
              <button
                type="button"
                onClick={() => setIsDailyIssueSlipOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-black shadow cursor-pointer transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Daily Store Issue Slip ({activeDoors.length})</span>
              </button>
            </div>
          </div>

          {/* Door Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {selectedOrder.doors.map((door, dIdx) => {
              const dKey = door.id || door.doorId || door.doorNumber || `door-${dIdx}`;
              const isSelected = selectedDoorIds.length === 0 || selectedDoorIds.includes(dKey);
              return (
                <label
                  key={dKey}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (selectedDoorIds.length === 0) {
                        const allKeys = selectedOrder.doors.map((d) => d.id || d.doorId || d.doorNumber || '');
                        setSelectedDoorIds(allKeys.filter((k) => k !== dKey));
                      } else if (selectedDoorIds.includes(dKey)) {
                        setSelectedDoorIds(selectedDoorIds.filter((k) => k !== dKey));
                      } else {
                        setSelectedDoorIds([...selectedDoorIds, dKey]);
                      }
                    }}
                    className="mt-0.5 rounded text-amber-500 bg-slate-950 border-slate-700 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <strong className="block text-[11px] truncate text-slate-200">
                      {door.doorNumber || `Door #${dIdx + 1}`}
                    </strong>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {door.widthCm}&times;{door.heightCm} cm
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] font-bold text-slate-300">
                        {door.stage || 'QUEUED'}
                      </span>
                      {door.materialIssued ? (
                        <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/50 text-[8.5px] font-black">
                          ✓ Issued
                        </span>
                      ) : (
                        <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700/50 text-[8.5px] font-bold">
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

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

      {/* MULTI-ORDER SELECTION PANEL */}
      {isBatchBoqMode && !isCustomCalcMode && (
        <div className="bg-[#0B132B] border border-emerald-800/60 rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center text-xs flex-wrap gap-2">
            <span className="font-bold text-emerald-400">
              Select Orders to Combine into Hand-Craft Production Batch (Chemicals, Timber &amp; Lock Rush):
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllInProductionOrders}
                className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-bold text-[11px] cursor-pointer"
              >
                🔒 Select All Active Floor Orders
              </button>
              <span className="text-slate-400 font-semibold">
                {batchOrders.length} Parties Combined • {totalDoors} Doors ({totalSqft} Sq.Ft • {boq.totalLockBoxes} Lock Boxes)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {orders.map((ord) => {
              const isChecked = selectedBatchOrderIds.includes(ord.id);
              return (
                <label
                  key={ord.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    isChecked
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleBatchOrder(ord.id)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    <strong>{ord.orderNumber}</strong>: {ord.customerName.split('(')[0]} (
                    {ord.doorsCount} Doors)
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!isConsumablesMode && (
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

        {/* Custom Usage Override Banner & Buffer Panel */}
        {(isCustomUsageEditMode || hasCustomUsageOverrides) && (
          <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-b border-amber-500/40 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-xs">
                    Custom Shop-Floor Usage &amp; Wastage Buffer Mode (കസ്റ്റം യൂസേജ് കൺട്രോൾ)
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Adjust usage buffer % or edit direct raw material quantities &amp; rates inline below for this consolidated run.
                  </p>
                </div>
              </div>

              {/* Buffer preset pills & custom input */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Usage Buffer:</span>
                {[
                  { label: '0% Std', val: 0 },
                  { label: '+5% Buffer', val: 5 },
                  { label: '+10% Extra', val: 10 },
                  { label: '+15% Heavy', val: 15 },
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
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] shadow flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingCustomUsage ? 'Saving...' : customUsageSaveSuccess ? 'Saved! ✓' : 'Save Custom BOQ'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCustomUsage}
                  className="px-2 py-1 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg font-bold text-[10px] border border-slate-700 cursor-pointer"
                  title="Reset all quantities and rates to standard formula baseline"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Optional Supervisor Custom Notes */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Supervisor Reason / Shift Note:</span>
              <input
                type="text"
                value={customUsageNotes}
                onChange={(e) => setCustomUsageNotes(e.target.value)}
                placeholder="e.g. Higher humidity day — 5% additional resin and catalyst approved for thick laminates..."
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
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">A1</td>
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
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">A2</td>
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
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">A3</td>
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
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">A4</td>
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
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">A5</td>
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
                const displayQty = customPig?.customQty !== undefined ? customPig.customQty : Math.round(pig.pigmentGrams);
                const displayRate = customPig?.customRate !== undefined ? customPig.customRate : pig.ratePerKg;
                const displayCost = Math.round((displayQty / 1000) * displayRate);

                return (
                  <tr key={`pig-${pig.matchedRateKey}-${pIdx}`} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-white">A6.{pIdx + 1}</td>
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

              {/* GROUP B SUBTOTAL */}
              <tr className="bg-amber-950/15 border-y border-amber-800/40">
                <td colSpan={3} className="p-3 text-right font-bold text-amber-200 text-[11px]">
                  Total Wood Volume (Frame {boq.frameWoodCuFt.toFixed(4)} + Shutter {boq.shutterWoodCuFt.toFixed(4)} Cu.Ft):
                </td>
                <td className="p-3 text-right font-black text-amber-400">
                  {boq.totalWoodCuFt.toFixed(4)} Cu.Ft
                </td>
                <td className="p-3 text-right text-slate-400">₹{ratesConfig.woodRatePerCuFt}</td>
                <td className="p-3 text-right font-black text-amber-300">
                  ₹{Math.round(boq.totalWoodCost).toLocaleString('en-IN')}
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
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">C1</td>
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
                activeExtraItems.map((ext, eIdx) => (
                  <tr key={ext.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-white">D{eIdx + 1}</td>
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
                      ₹{Math.round(ext.amount).toLocaleString('en-IN')}
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
                ))
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
                return (
                  <tr key={`lockbox-${lb.profileId}-${lIdx}`} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-white">E{lIdx + 1}</td>
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

              {hasCustomUsageOverrides && (
                <div className="p-2.5 bg-amber-50 rounded-lg border-2 border-amber-500 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-bold">
                  <span>⚡ CUSTOM SHOP-FLOOR USAGE OVERRIDE APPROVED (+{customUsageBufferPercent}% Buffer / Shop-Floor Custom Requisition)</span>
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

                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">3</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>Catalyst (MEKP) &amp; Accelerator</strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {ratesConfig.catalystGrams}g MEKP + {ratesConfig.acceleratorGrams}g Cobalt / door base
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {Math.round(effectiveBoq.catalystGrams.qty)}g + {Math.round(effectiveBoq.acceleratorGrams.qty)}g
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">
                      ₹{(effectiveBoq.catalystGrams.cost + effectiveBoq.acceleratorGrams.cost).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>

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

                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">5</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>Pigment Paste (Colour-Wise)</strong>
                      <div className="text-[10px] text-slate-600">
                        {boq.pigmentByColour
                          .map((p) => `${p.colourLabel}: ${Math.round(p.pigmentGrams)}g`)
                          .join(' | ')}
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {ratesConfig.pigmentGrams} gm / base door
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {Math.round(boq.pigmentGrams)} gm
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">
                      ₹{Math.round(boq.pigmentCost).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>

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
                      {boq.totalWoodCuFt.toFixed(4)} Cu.Ft
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">
                      ₹{Math.round(boq.totalWoodCost).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">7</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>
                        Rigid Foam Sheet ({ratesConfig.foamSheet.widthCm}×{ratesConfig.foamSheet.heightCm} cm)
                      </strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      1 Sheet / {ratesConfig.foamSheet.doorsPerSheet} Doors (Buy {boq.foamSheetsPurchaseCeil} Full)
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {effectiveBoq.foam.qty.toFixed(2)} Sheets
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">
                      ₹{effectiveBoq.foam.cost.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>

                  {activeExtraItems.map((ext, idx) => (
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

                  {boq.lockBoxBreakdown.map((lb, idx) => (
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
                      COMBINED RAW MATERIAL &amp; LOCK BOX VALUE ({totalDoors} DOORS • {boq.totalLockBoxes} BOXES
                      {activeExtraItems.length > 0 ? ` + ${activeExtraItems.length} EXTRA` : ''}):
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right text-emerald-800">
                      ₹{grandTotalCost.toLocaleString('en-IN')}
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
          fetch('/api/boq/extra-items')
            .then((r) => r.json())
            .then((json) => {
              if (json.success && Array.isArray(json.data)) setExtraItems(json.data);
            })
            .catch(() => {});
        }}
      />

      <DailyStoreIssueSlipModal
        isOpen={isDailyIssueSlipOpen}
        onClose={() => setIsDailyIssueSlipOpen(false)}
        order={
          selectedOrder
            ? {
                id: selectedOrder.id,
                prodOrderId: selectedOrder.prodOrderId,
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
        onIssued={(issuedIds) => {
          setOrders((prev) =>
            prev.map((ord) => {
              if (ord.prodOrderId === selectedOrder?.prodOrderId) {
                const updatedDoors = ord.doors.map((d) =>
                  issuedIds.includes(d.id || '') || issuedIds.includes(d.doorId || '')
                    ? { ...d, materialIssued: true, materialIssuedAt: new Date().toISOString() }
                    : d
                );
                return { ...ord, doors: updatedDoors };
              }
              return ord;
            })
          );
        }}
      />
    </div>
  );
}
