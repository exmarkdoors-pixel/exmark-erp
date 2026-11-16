'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Factory,
  Plus,
  Printer,
  Layers,
  Users,
  Search,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Truck,
  QrCode,
  Wrench,
  Archive,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  TrendingUp,
  Lock,
  Share2,
} from 'lucide-react';
import type {
  ProductionOrder,
  ProductionDoorItem,
  ProductionStage,
} from '@/lib/services/productionService';
import {
  ACTIVE_BOARD_STAGES,
  STAGE_DISPLAY_LABELS,
  getNextProductionStage,
  getPrevProductionStage,
} from '@/lib/utils/productionStages';
import type {
  Contractor,
  ContractorOperationType,
  ContractorRateCard,
} from '@/lib/services/contractorService';
import { JobCardModal } from './JobCardModal';
import { StickerPrintModal } from './StickerPrintModal';
import { StageBoqModal } from './StageBoqModal';
import { DeliveryChallanModal } from './DeliveryChallanModal';
import { ShareOrderStatusModal } from './ShareOrderStatusModal';
import { LogContractorWorkModal } from './LogContractorWorkModal';
import { ProductionFloorGangsModal } from './ProductionFloorGangsModal';
import { OrderProfitDetailModal } from '../finance/OrderProfitPanel';
import type { OrderProfitBreakdown } from '@/lib/services/orderProfitService';
import {
  getOperationLockGroup,
  getStageLockGroup,
  OrderPieceRateGroupLock,
  OrderPieceRateLockSummary,
} from '@/lib/utils/pieceRateLocks';

const STAGE_BADGE_STYLES: Record<string, { border: string; headerBg: string; pill: string }> = {
  QUEUED: { border: 'border-slate-700', headerBg: 'bg-slate-800/80', pill: 'bg-slate-700 text-slate-200' },
  MOLDING: { border: 'border-amber-500/40', headerBg: 'bg-amber-950/50', pill: 'bg-amber-500/20 text-amber-300' },
  CUTTING_FINISHING: { border: 'border-cyan-500/40', headerBg: 'bg-cyan-950/50', pill: 'bg-cyan-500/20 text-cyan-300' },
  PAINT_SECTION: { border: 'border-purple-500/40', headerBg: 'bg-purple-950/50', pill: 'bg-purple-500/20 text-purple-300' },
  PACKING: { border: 'border-teal-500/40', headerBg: 'bg-teal-950/50', pill: 'bg-teal-500/20 text-teal-300' },
  DELIVERY: { border: 'border-blue-500/40', headerBg: 'bg-blue-950/50', pill: 'bg-blue-500/20 text-blue-300' },
  INSTALLATION: { border: 'border-indigo-500/40', headerBg: 'bg-indigo-950/50', pill: 'bg-indigo-500/20 text-indigo-300' },
};

const STAGE_DEFAULT_OPERATION: Partial<Record<ProductionStage, ContractorOperationType>> = {
  MOLDING: 'MOLDING_DOOR_WITH_FRAME',
  CUTTING_FINISHING: 'DOOR_CUTTING',
  PAINT_SECTION: 'DOOR_GRAINS_WITH_PAINT',
  INSTALLATION: 'SITE_FITTING',
};

function normalizeActiveStage(stage: ProductionStage): ProductionStage {
  if (stage === 'CNC_ROUTING' || stage === 'QA_INSPECTION') return 'CUTTING_FINISHING';
  if (stage === 'FINISHING_GRAINS' || stage === 'PU_COATING') return 'PAINT_SECTION';
  return stage;
}

interface CuttingPartyDraft {
  enabled: boolean;
  gangId: string;
  customRate: string;
  lockedInfo?: OrderPieceRateGroupLock | null;
}

interface MoldingPartyDraft {
  enabled: boolean;
  gangId: string;
  quantity: number;
  doorIds?: string[];
  customRate: string;
  lockedInfo?: OrderPieceRateGroupLock | null;
}

function getScopeTagSuffix(gang: Contractor): string {
  if (gang.teamScope === 'MOLDING_TEAM_1') return 'Molding Team 1';
  if (gang.teamScope === 'MOLDING_TEAM_2') return 'Molding Team 2';
  if (gang.teamScope === 'MOLDING_ALL') return 'Molding Full Gang';
  if (gang.teamScope === 'DOOR_CUTTING_FINISHING') return 'Door Team';
  if (gang.teamScope === 'FRAME_CUTTING_FINISHING') return 'Frame Team';
  if (gang.teamScope === 'GRAINS_PAINTING') return 'Grains & Paint';
  return gang.tradeLabel;
}

function getDefaultRateForOp(rateCard: ContractorRateCard | null, op: ContractorOperationType | ''): number {
  if (!rateCard || !op) return 0;
  const map: Record<ContractorOperationType, number> = {
    MOLDING_DOOR_WITH_FRAME: rateCard.moldingDoorWithFrame,
    MOLDING_ONLY_DOOR: rateCard.moldingOnlyDoor,
    MOLDING_ONLY_FRAME: rateCard.moldingOnlyFrame,
    DOOR_CUTTING: rateCard.doorCutting,
    FRAME_CUTTING: rateCard.frameCutting,
    DOOR_GRAINS_WITH_PAINT: rateCard.doorGrainsWithPaint,
    ONLY_CLEAR_COAT: rateCard.onlyClearCoat,
    TWO_SIDE_PAINT: rateCard.twoSidePaint,
    SITE_FITTING: rateCard.siteFitting,
  };
  return map[op] ?? 0;
}

export function ProductionBoardHub() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [gangs, setGangs] = useState<Contractor[]>([]);
  const [rateCard, setRateCard] = useState<ContractorRateCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BOARD' | 'COMPLETED'>('BOARD');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDoorCards, setExpandedDoorCards] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Completed archive filters & sort
  const [completedFilter, setCompletedFilter] = useState<'ALL' | 'DELIVERED_ONLY' | 'INSTALLED'>('ALL');
  const [completedSort, setCompletedSort] = useState<'COMPLETED_DESC' | 'ORDER_DATE_DESC' | 'ORDER_ASC' | 'CUSTOMER_ASC' | 'QTY_DESC'>('COMPLETED_DESC');

  // Modals
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [supplementaryParentOrder, setSupplementaryParentOrder] = useState<ProductionOrder | null>(null);
  const [isGangsModalOpen, setIsGangsModalOpen] = useState(false);
  const [selectedStickerOrder, setSelectedStickerOrder] = useState<ProductionOrder | null>(null);
  const [selectedStageBoq, setSelectedStageBoq] = useState<{ orderId: string; stageType: 'MANUFACTURING' | 'PAINTING' } | null>(null);
  const [selectedDeliveryChallanOrder, setSelectedDeliveryChallanOrder] = useState<ProductionOrder | null>(null);
  const [selectedShareOrder, setSelectedShareOrder] = useState<ProductionOrder | null>(null);
  const [selectedContractorWork, setSelectedContractorWork] = useState<{ order: ProductionOrder; door?: ProductionDoorItem } | null>(null);
  const [profitInspectOrder, setProfitInspectOrder] = useState<OrderProfitBreakdown | null>(null);
  const [isLoadingProfitModal, setIsLoadingProfitModal] = useState(false);

  const openOrderProfitModal = useCallback(async (orderId: string) => {
    setIsLoadingProfitModal(true);
    try {
      const res = await fetch(`/api/orders/profit?orderId=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      const first = json?.data?.orders?.[0] as OrderProfitBreakdown | undefined;
      if (first) {
        setProfitInspectOrder(first);
      } else {
        setToastMessage('Unable to calculate profit breakdown for this order.');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch {
      setToastMessage('Network error loading order profit breakdown.');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsLoadingProfitModal(false);
    }
  }, []);

  // Stage Advance Gang Prompt
  const [pendingAdvance, setPendingAdvance] = useState<{
    order: ProductionOrder;
    targetStage: ProductionStage;
    keepCurrentStage?: boolean;
    gangId: string;
    operation: ContractorOperationType | '';
    customRate: string;
    skipCredit: boolean;
    lockSummary?: OrderPieceRateLockSummary | null;
    alreadyPaidLock?: OrderPieceRateGroupLock | null;
    moldingMode: 'SINGLE' | 'DUAL';
    moldingTeam1: MoldingPartyDraft;
    moldingTeam2: MoldingPartyDraft;
    doorCuttingParty: CuttingPartyDraft;
    frameCuttingParty: CuttingPartyDraft;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pRes, gRes, rRes] = await Promise.all([
        fetch('/api/production'),
        fetch('/api/contractors'),
        fetch('/api/contractors/rates'),
      ]);
      const pJson = await pRes.json();
      const gJson = await gRes.json();
      const rJson = await rRes.json();
      if (pJson.success && Array.isArray(pJson.data)) setOrders(pJson.data);
      if (gJson.success && Array.isArray(gJson.data)) setGangs(gJson.data.filter((g: Contractor) => g.status === 'ACTIVE'));
      if (rJson.success && rJson.data) setRateCard(rJson.data);
    } catch {
      // ignore transient offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openAdvanceStagePrompt = async (
    order: ProductionOrder,
    explicitTargetStage?: ProductionStage,
    keepCurrentStage = false
  ) => {
    const targetStage = explicitTargetStage || getNextProductionStage(order);
    if (!targetStage || (!keepCurrentStage && order.status === 'COMPLETED')) return;

    const defaultOp = STAGE_DEFAULT_OPERATION[targetStage] || '';
    const cuttingPool = gangs.filter(
      (g) =>
        g.primaryStage === 'CUTTING_FINISHING' ||
        g.teamScope === 'DOOR_CUTTING_FINISHING' ||
        g.teamScope === 'FRAME_CUTTING_FINISHING' ||
        g.trade === 'CUTTING_GRINDING'
    );
    const doorGang =
      cuttingPool.find((g) => g.teamScope === 'DOOR_CUTTING_FINISHING') ||
      cuttingPool[0] ||
      gangs[0];
    const frameGang =
      cuttingPool.find((g) => g.teamScope === 'FRAME_CUTTING_FINISHING') ||
      cuttingPool.find((g) => g.id !== doorGang?.id) ||
      cuttingPool[0] ||
      gangs[0];

    const matchingGang =
      (targetStage === 'PAINT_SECTION'
        ? gangs.find(
            (g) =>
              g.teamScope === 'GRAINS_PAINTING' ||
              g.primaryStage === 'PAINT_SECTION' ||
              g.primaryStage === 'FINISHING_GRAINS' ||
              g.trade === 'PAINTING'
          )
        : gangs.find((g) => g.primaryStage === targetStage)) ||
      gangs.find(
        (g) =>
          (targetStage === 'MOLDING' && g.trade === 'MOLDING') ||
          ((targetStage === 'CUTTING_FINISHING' || targetStage === 'PACKING') && g.trade === 'CUTTING_GRINDING') ||
          ((targetStage === 'FINISHING_GRAINS' || targetStage === 'PAINT_SECTION') && g.trade === 'PAINTING') ||
          (targetStage === 'INSTALLATION' && g.trade === 'SITE_FITTING')
      ) ||
      gangs[0];

    const defaultRate = defaultOp ? getDefaultRateForOp(rateCard, defaultOp) : 0;
    const doorDefaultRate = getDefaultRateForOp(rateCard, 'DOOR_CUTTING');
    const frameDefaultRate = getDefaultRateForOp(rateCard, 'FRAME_CUTTING');

    let lockSummary: OrderPieceRateLockSummary | null = null;
    try {
      const res = await fetch(
        `/api/contractors/credit?orderId=${encodeURIComponent(order.id)}&jobCardNumber=${encodeURIComponent(
          order.jobCardNumber || ''
        )}&totalDoors=${order.doors?.length || order.quantity || 1}`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        lockSummary = json.data as OrderPieceRateLockSummary;
      }
    } catch {
      lockSummary = null;
    }

    const stageGrp = defaultOp ? getOperationLockGroup(defaultOp) : getStageLockGroup(targetStage);
    const alreadyPaidLock = stageGrp && lockSummary ? lockSummary.groups[stageGrp] || null : null;
    const isAlreadyLocked = Boolean(alreadyPaidLock?.isLocked);

    const doorLock = lockSummary?.groups?.DOOR_CUTTING || null;
    const frameLock = lockSummary?.groups?.FRAME_CUTTING || null;
    const moldingLock = lockSummary?.groups?.MOLDING || null;

    const totalOrderDoors = order.doors?.length || order.quantity || 1;
    const moldingPool = gangs.filter(
      (g) =>
        g.primaryStage === 'MOLDING' ||
        g.teamScope === 'MOLDING_TEAM_1' ||
        g.teamScope === 'MOLDING_TEAM_2' ||
        g.teamScope === 'MOLDING_ALL' ||
        g.trade === 'MOLDING'
    );
    const mTeam1 =
      moldingPool.find((g) => g.teamScope === 'MOLDING_TEAM_1') ||
      moldingPool[0] ||
      gangs[0];
    const mTeam2 =
      moldingPool.find((g) => g.teamScope === 'MOLDING_TEAM_2') ||
      moldingPool.find((g) => g.id !== mTeam1?.id) ||
      moldingPool[1] ||
      moldingPool[0] ||
      gangs[0];

    const mHalf1 = Math.ceil(totalOrderDoors / 2);
    const mHalf2 = Math.max(0, totalOrderDoors - mHalf1);
    const moldingDefaultRate = getDefaultRateForOp(rateCard, 'MOLDING_DOOR_WITH_FRAME');
    const orderDoorsList = order.doors || [];
    const team1InitDoorIds = orderDoorsList.slice(0, mHalf1).map((d) => d.doorId || d.id);
    const team2InitDoorIds = orderDoorsList.slice(mHalf1).map((d) => d.doorId || d.id);

    setPendingAdvance({
      order,
      targetStage,
      keepCurrentStage,
      gangId: matchingGang?.id || '',
      operation: defaultOp,
      customRate: defaultRate > 0 ? String(defaultRate) : '',
      skipCredit: !defaultOp || isAlreadyLocked,
      lockSummary,
      alreadyPaidLock,
      moldingMode: 'SINGLE',
      moldingTeam1: {
        enabled: Boolean(mTeam1) && !moldingLock?.isLocked,
        gangId: mTeam1?.id || '',
        quantity: team1InitDoorIds.length || mHalf1,
        doorIds: team1InitDoorIds,
        customRate: moldingDefaultRate > 0 ? String(moldingDefaultRate) : '500',
        lockedInfo: moldingLock,
      },
      moldingTeam2: {
        enabled: Boolean(mTeam2) && !moldingLock?.isLocked,
        gangId: mTeam2?.id || '',
        quantity: team2InitDoorIds.length || mHalf2,
        doorIds: team2InitDoorIds,
        customRate: moldingDefaultRate > 0 ? String(moldingDefaultRate) : '500',
        lockedInfo: moldingLock,
      },
      doorCuttingParty: {
        enabled: Boolean(doorGang) && !doorLock?.isLocked,
        gangId: doorGang?.id || '',
        customRate: doorDefaultRate > 0 ? String(doorDefaultRate) : '',
        lockedInfo: doorLock,
      },
      frameCuttingParty: {
        enabled: Boolean(frameGang) && !frameLock?.isLocked,
        gangId: frameGang?.id || '',
        customRate: frameDefaultRate > 0 ? String(frameDefaultRate) : '',
        lockedInfo: frameLock,
      },
    });
  };

  const confirmStageMove = async (
    orderId: string,
    targetStage: ProductionStage,
    opts?: {
      gangId?: string;
      operation?: string;
      customRate?: number;
      skipAutoCredit?: boolean;
      isRework?: boolean;
      reworkReason?: string;
      keepCurrentStage?: boolean;
      assignments?: Array<{ gangId: string; operation: ContractorOperationType; quantity?: number; customRate?: number }>;
    }
  ) => {
    try {
      const res = await fetch(`/api/production/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: targetStage,
          keepCurrentStage: opts?.keepCurrentStage,
          gangId: opts?.gangId || undefined,
          operation: opts?.operation || undefined,
          customRate: opts?.customRate,
          assignments: opts?.assignments,
          skipAutoCredit: opts?.skipAutoCredit,
          isRework: opts?.isRework,
          reworkReason: opts?.reworkReason,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? json.data : o)));
        notify(
          json.pieceRateMessage
            ? `${opts?.keepCurrentStage ? 'Credited in' : 'Moved to'} ${STAGE_DISPLAY_LABELS[targetStage]} — ${json.pieceRateMessage}`
            : `Moved to: ${STAGE_DISPLAY_LABELS[targetStage]}`
        );
      }
    } catch {
      notify('Could not reach server to move stage.');
    }
  };

  const handleReverseStage = async (order: ProductionOrder) => {
    const prevStage = getPrevProductionStage(order);
    if (!prevStage) return;
    await confirmStageMove(order.id, prevStage, {
      skipAutoCredit: true,
      isRework: true,
      reworkReason: 'Sent back for Rework (₹0 extra gang pay)',
    });
  };

  const handleToggleInstallation = async (order: ProductionOrder) => {
    try {
      const res = await fetch(`/api/production/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_INSTALLATION',
          includeInstallation: !order.includeInstallation,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? json.data : o)));
        notify(
          json.data.includeInstallation
            ? `${order.jobCardNumber}: Site Installation ENABLED (Delivery -> Installation)`
            : `${order.jobCardNumber}: Delivery-Only (Completes directly after Delivery)`
        );
      }
    } catch {
      notify('Failed to update installation flag.');
    }
  };

  const handleDeleteOrder = async (order: ProductionOrder) => {
    if (!confirm(`Delete job card ${order.jobCardNumber} (${order.customerName})?`)) return;
    try {
      const res = await fetch(`/api/production/${order.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        notify(`Deleted ${order.jobCardNumber}.`);
      }
    } catch {
      notify('Delete failed.');
    }
  };

  const qLower = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((o) => {
    if (!qLower) return true;
    return (
      o.jobCardNumber?.toLowerCase().includes(qLower) ||
      o.prodOrderNumber?.toLowerCase().includes(qLower) ||
      o.customerName?.toLowerCase().includes(qLower) ||
      o.siteName?.toLowerCase().includes(qLower) ||
      String(o.salesOrderId || '').toLowerCase().includes(qLower)
    );
  });

  const activeOrders = filteredOrders.filter((o) => o.status !== 'COMPLETED');
  const completedOrdersRaw = filteredOrders.filter((o) => o.status === 'COMPLETED');

  const completedOrders = completedOrdersRaw
    .filter((o) => {
      if (completedFilter === 'DELIVERED_ONLY') return !o.includeInstallation;
      if (completedFilter === 'INSTALLED') return Boolean(o.includeInstallation);
      return true;
    })
    .sort((a, b) => {
      if (completedSort === 'ORDER_DATE_DESC') {
        return String(b.orderDate || b.createdAt).localeCompare(String(a.orderDate || a.createdAt));
      }
      if (completedSort === 'ORDER_ASC') {
        return String(a.jobCardNumber).localeCompare(String(b.jobCardNumber));
      }
      if (completedSort === 'CUSTOMER_ASC') {
        return String(a.customerName).localeCompare(String(b.customerName));
      }
      if (completedSort === 'QTY_DESC') {
        return (b.quantity || 0) - (a.quantity || 0);
      }
      return String(b.completedAt || b.updatedAt).localeCompare(String(a.completedAt || a.updatedAt));
    });

  const activeDoorsCount = activeOrders.reduce((s, o) => s + (o.quantity || o.doors?.length || 0), 0);

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-red-500" />
            Production Floor Kanban &amp; Stage Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track orders visually column-by-column • In-House Floor Gang piece rates • Conditional Site Installation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search party, job card..."
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white w-48"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsGangsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow"
          >
            <Users className="w-4 h-4" />
            <span>Floor Gangs &amp; Piece Rates ({gangs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsJobCardModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Job Card</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Summary Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('BOARD')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'BOARD'
                ? 'bg-red-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            <span>Active Floor Board ({activeOrders.length} Orders • {activeDoorsCount} Doors)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Completed Orders Archive ({completedOrdersRaw.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            Active Gangs: <strong className="text-amber-400">{gangs.length}</strong>
          </span>
          <span>
            With Installation:{' '}
            <strong className="text-indigo-400">
              {activeOrders.filter((o) => o.includeInstallation).length}
            </strong>
          </span>
          <span>
            Delivery Only:{' '}
            <strong className="text-emerald-400">
              {activeOrders.filter((o) => !o.includeInstallation).length}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="p-10 text-center text-xs text-slate-400">Loading Production Floor Kanban...</div>
      ) : activeTab === 'BOARD' ? (
        /* ================= HORIZONTAL MULTI-COLUMN KANBAN ================= */
        <div className="flex gap-3.5 overflow-x-auto pb-4 items-start custom-scrollbar">
          {ACTIVE_BOARD_STAGES.map((stageKey) => {
            const colOrders = activeOrders.filter((o) => normalizeActiveStage(o.status) === stageKey);
            const colDoors = colOrders.reduce((s, o) => s + (o.quantity || o.doors?.length || 0), 0);
            const style = STAGE_BADGE_STYLES[stageKey] || STAGE_BADGE_STYLES.QUEUED;

            return (
              <div
                key={stageKey}
                className={`w-[320px] shrink-0 rounded-2xl bg-slate-100/70 dark:bg-[#070D1E] border ${style.border} flex flex-col max-h-[75vh]`}
              >
                {/* Sticky Column Header */}
                <div className={`p-3 rounded-t-2xl border-b ${style.border} ${style.headerBg} flex items-center justify-between`}>
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                      {STAGE_DISPLAY_LABELS[stageKey]}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {stageKey === 'INSTALLATION'
                        ? 'Installation orders only'
                        : stageKey === 'DELIVERY'
                        ? 'Completes or -> Installation'
                        : 'Stage queue'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${style.pill}`}>
                      {colOrders.length} Ord • {colDoors} Drs
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {colOrders.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-slate-400 border border-dashed border-slate-700/60 rounded-xl">
                      No orders in {STAGE_DISPLAY_LABELS[stageKey]}
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const nextStage = getNextProductionStage(order);
                      const prevStage = getPrevProductionStage(order);
                      const lastHistory =
                        Array.isArray(order.stageHistory) && order.stageHistory.length > 0
                          ? order.stageHistory[order.stageHistory.length - 1]
                          : null;
                      const isExpanded = Boolean(expandedDoorCards[order.id]);

                      return (
                        <div
                          key={order.id}
                          className="p-3 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
                        >
                          {/* Card Top Line */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                  {order.jobCardNumber}
                                </span>
                                {order.parentJobCardNumber && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                    Add-on: {order.parentJobCardNumber}
                                  </span>
                                )}
                                {lastHistory?.isRework && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Rework ₹0
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {order.quantity} Doors
                                </span>
                              </div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white mt-1 truncate">
                                {order.customerName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {order.siteName}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleInstallation(order)}
                              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border shrink-0 cursor-pointer transition ${
                                order.includeInstallation
                                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                              title="Click to toggle whether this order includes Site Installation after Delivery"
                            >
                              {order.includeInstallation ? '+ Install' : 'Delivery Only'}
                            </button>
                          </div>

                          {/* Gang / Date Info */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Order: {order.orderDate || order.createdAt?.slice(0, 10)}</span>
                            {lastHistory?.gangName && (
                              <span className="text-amber-400 font-semibold truncate max-w-[155px]">
                                👷 {lastHistory.gangName}
                              </span>
                            )}
                          </div>

                          {/* Quick Tool Strip */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/70">
                            <button
                              type="button"
                              onClick={() => setSelectedStickerOrder(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-red-400" />
                              <span>Stickers</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedStageBoq({
                                  orderId: order.id,
                                  stageType:
                                    order.status === 'PAINT_SECTION' ||
                                    order.status === 'PU_COATING' ||
                                    order.status === 'FINISHING_GRAINS'
                                      ? 'PAINTING'
                                      : 'MANUFACTURING',
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold cursor-pointer"
                            >
                              <Layers className="w-3 h-3" />
                              <span>BOQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedContractorWork({ order })}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold cursor-pointer"
                            >
                              <span>₹ Gang</span>
                            </button>
                            {normalizeActiveStage(order.status) === 'MOLDING' && (
                              <button
                                type="button"
                                onClick={() => openAdvanceStagePrompt(order, 'MOLDING', true)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold cursor-pointer"
                                title="Assign / credit Dual Molding Teams (Gang 1 & Gang 2) on this order"
                              >
                                <span>2 Teams</span>
                              </button>
                            )}
                            {normalizeActiveStage(order.status) === 'CUTTING_FINISHING' && (
                              <button
                                type="button"
                                onClick={() => openAdvanceStagePrompt(order, 'CUTTING_FINISHING', true)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded text-[10px] font-bold cursor-pointer"
                                title="Assign / credit Door Cutting & Frame Cutting parties independently"
                              >
                                <span>2 Teams</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedDeliveryChallanOrder(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold cursor-pointer"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Challan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedShareOrder(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold cursor-pointer"
                              title="Share Customer Tracking Link & WhatsApp"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Status</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDoorCards((prev) => ({ ...prev, [order.id]: !isExpanded }))
                              }
                              className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              <span>Doors</span>
                            </button>
                          </div>

                          {/* Expandable Door List (No QC Clutter) */}
                          {isExpanded && order.doors && (
                            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1 max-h-40 overflow-y-auto text-[10px]">
                              {order.doors.map((door) => (
                                <div key={door.id} className="flex items-center justify-between gap-1 py-0.5 border-b border-slate-800/50 last:border-none">
                                  <div className="truncate flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-200">{door.doorNumber}</span>{' '}
                                    <span className="text-slate-400">
                                      ({(door.finishedHeightMm / 10).toFixed(1)}×{(door.finishedWidthMm / 10).toFixed(1)}cm)
                                    </span>
                                    {door.moldedByGangName && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[8.5px] shrink-0" title={`Molded by ${door.moldedByGangName}`}>
                                        🔨 {door.moldedByGangName}
                                      </span>
                                    )}
                                  </div>
                                  <a
                                    href={`/track/${door.doorId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-400 hover:text-red-300 flex items-center gap-0.5 shrink-0"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>QR</span>
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Move Stage Controls */}
                          <div className="flex items-center justify-between gap-1.5 pt-1">
                            {prevStage ? (
                              <button
                                type="button"
                                onClick={() => handleReverseStage(order)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                                title={`Move back to ${STAGE_DISPLAY_LABELS[prevStage]}`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Back</span>
                              </button>
                            ) : (
                              <span />
                            )}

                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => openAdvanceStagePrompt(order)}
                                className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white cursor-pointer shadow ${
                                  nextStage === 'COMPLETED'
                                    ? 'bg-emerald-600 hover:bg-emerald-500'
                                    : 'bg-red-600 hover:bg-red-500'
                                }`}
                              >
                                <span>
                                  {nextStage === 'COMPLETED'
                                    ? '✓ Complete Order'
                                    : `Advance -> ${STAGE_DISPLAY_LABELS[nextStage].split(' ')[0]}`}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= COMPLETED ORDERS ARCHIVE ================= */
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-400" />
                Completed Production Orders Archive
              </h3>
              <p className="text-[11px] text-slate-400">
                Finished orders separated cleanly from active production floor lanes — sorted &amp; categorized by Delivery vs Site Installation
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={completedFilter}
                onChange={(e) => setCompletedFilter(e.target.value as typeof completedFilter)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer"
              >
                <option value="ALL">All Completed ({completedOrdersRaw.length})</option>
                <option value="DELIVERED_ONLY">Delivered Only (No Site Install)</option>
                <option value="INSTALLED">Delivered + Site Installed</option>
              </select>

              <select
                value={completedSort}
                onChange={(e) => setCompletedSort(e.target.value as typeof completedSort)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer"
              >
                <option value="COMPLETED_DESC">Sort: Completion Date (Newest)</option>
                <option value="ORDER_DATE_DESC">Sort: Order Date (Newest)</option>
                <option value="ORDER_ASC">Sort: Job Card / Order #</option>
                <option value="CUSTOMER_ASC">Sort: Party / Customer A–Z</option>
                <option value="QTY_DESC">Sort: Doors Quantity (High–Low)</option>
              </select>
            </div>
          </div>

          {completedOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
              No completed orders match this filter yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Job Card #</th>
                    <th className="p-3">Customer / Site</th>
                    <th className="p-3">Order Date</th>
                    <th className="p-3">Completed Date</th>
                    <th className="p-3 text-center">Doors</th>
                    <th className="p-3">Fulfillment Type</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {completedOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-mono font-bold text-emerald-400">{ord.jobCardNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-400">{ord.siteName}</div>
                      </td>
                      <td className="p-3 text-slate-300">{ord.orderDate || ord.createdAt?.slice(0, 10)}</td>
                      <td className="p-3 text-slate-300">{(ord.completedAt || ord.updatedAt).slice(0, 10)}</td>
                      <td className="p-3 text-center font-bold text-white">{ord.quantity}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.includeInstallation
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {ord.includeInstallation ? 'Delivered + Site Installed' : 'Delivered Only'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isLoadingProfitModal}
                          onClick={() => openOrderProfitModal(ord.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-50 text-indigo-300 border border-indigo-500/30 rounded text-[11px] font-bold cursor-pointer"
                          title="Inspect Order Profit & Loss P&L Sheet"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>₹ Profit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDeliveryChallanOrder(ord)}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded text-[11px] font-bold cursor-pointer"
                        >
                          Challan
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStickerOrder(ord)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold cursor-pointer"
                        >
                          Stickers
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedShareOrder(ord)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded text-[11px] font-bold cursor-pointer"
                          title="Share Customer Tracking Link & WhatsApp"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Status</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirmStageMove(
                              ord.id,
                              ord.includeInstallation ? 'INSTALLATION' : 'DELIVERY',
                              { skipAutoCredit: true }
                            )
                          }
                          className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded text-[11px] font-bold cursor-pointer"
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(ord)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer inline-flex items-center"
                          title="Delete Order"
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

      {/* Quick Stage Advance + Floor Gang Piece-Rate Modal */}
      {pendingAdvance && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0B132B] text-white rounded-2xl border border-slate-700 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black">
                  {pendingAdvance.keepCurrentStage ? 'Assign Cutting & Finishing Parties:' : 'Advance'}{' '}
                  {pendingAdvance.order.jobCardNumber} {!pendingAdvance.keepCurrentStage && '\u2192'}{' '}
                  {!pendingAdvance.keepCurrentStage && (
                    <span className="text-emerald-400">
                      {STAGE_DISPLAY_LABELS[pendingAdvance.targetStage]}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {pendingAdvance.order.customerName} ({pendingAdvance.order.quantity} doors)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAdvance(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingAdvance.targetStage === 'CUTTING_FINISHING' ? (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-200">
                  <strong>Cutting &amp; Finishing (1 Section &bull; 2 Separate Teams):</strong> Credit Door Cutting &amp; Frame Cutting independently (you can credit one now and the other anytime while in this stage).
                </div>

                {[
                  {
                    key: 'doorCuttingParty' as const,
                    title: 'Party 1: Door Cutting & Finishing',
                    badgeCls: 'text-cyan-300',
                    opLabel: 'DOOR_CUTTING',
                    party: pendingAdvance.doorCuttingParty,
                  },
                  {
                    key: 'frameCuttingParty' as const,
                    title: 'Party 2: Frame Cutting & Finishing',
                    badgeCls: 'text-sky-300',
                    opLabel: 'FRAME_CUTTING',
                    party: pendingAdvance.frameCuttingParty,
                  },
                ].map(({ key, title, badgeCls, party }) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    {party.lockedInfo?.isLocked ? (
                      <div className="flex items-start gap-2 text-[11px] text-amber-200">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className={`font-bold ${badgeCls}`}>{title} — Already Paid (1× Locked)</div>
                          <div>
                            Credited to <strong>{party.lockedInfo.contractorName}</strong> (₹
                            {party.lockedInfo.totalAmountCredited.toLocaleString('en-IN')} on{' '}
                            {party.lockedInfo.lastPaidDate}). Rework = ₹0.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label className="flex items-center justify-between gap-2 cursor-pointer">
                          <span className={`font-bold ${badgeCls}`}>{title}</span>
                          <input
                            type="checkbox"
                            checked={party.enabled}
                            onChange={(e) =>
                              setPendingAdvance({
                                ...pendingAdvance,
                                [key]: { ...party, enabled: e.target.checked },
                              })
                            }
                            className="rounded accent-cyan-500"
                          />
                        </label>
                        {party.enabled && (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="col-span-2">
                              <label className="block text-[10px] text-slate-400 mb-1">Assign Team</label>
                              <select
                                value={party.gangId}
                                onChange={(e) =>
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    [key]: { ...party, gangId: e.target.value },
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-[11px]"
                              >
                                <option value="">-- Skip Team --</option>
                                {gangs.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({getScopeTagSuffix(g)})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">₹ / Door</label>
                              <input
                                type="number"
                                min={0}
                                value={party.customRate}
                                onChange={(e) =>
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    [key]: { ...party, customRate: e.target.value },
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-amber-300 text-[11px]"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : pendingAdvance.targetStage !== 'COMPLETED' && pendingAdvance.targetStage !== 'DELIVERY' ? (
              <div className="space-y-3 text-xs">
                {pendingAdvance.targetStage === 'MOLDING' && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-200">
                      <strong>Door Molding &amp; Layup:</strong> Assign a single gang for the entire order or split across <strong>Two Molding Teams (Gang 1 &amp; Gang 2)</strong> on the same work order.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingAdvance({ ...pendingAdvance, moldingMode: 'SINGLE' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                          pendingAdvance.moldingMode === 'SINGLE'
                            ? 'bg-blue-600 border-blue-400 text-white shadow'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Single Gang ({pendingAdvance.order.doors?.length || pendingAdvance.order.quantity || 1} Doors)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingAdvance({ ...pendingAdvance, moldingMode: 'DUAL' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                          pendingAdvance.moldingMode === 'DUAL'
                            ? 'bg-blue-600 border-blue-400 text-white shadow'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Split Across 2 Teams (Gang 1 + 2)
                      </button>
                    </div>

                    {pendingAdvance.moldingMode === 'DUAL' && (
                      <div className="space-y-2.5 pt-1">
                        {/* Team 1 */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-blue-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-300">Molding Team 1 (Gang A)</span>
                            <span className="text-[10px] text-slate-400">Qty: {pendingAdvance.moldingTeam1.quantity} Doors</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Floor Gang</label>
                              <select
                                value={pendingAdvance.moldingTeam1.gangId}
                                onChange={(e) =>
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, gangId: e.target.value },
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-[11px]"
                              >
                                {gangs.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({getScopeTagSuffix(g)})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Doors Molded</label>
                              <input
                                type="number"
                                min={1}
                                max={pendingAdvance.order.doors?.length || pendingAdvance.order.quantity || 1}
                                value={pendingAdvance.moldingTeam1.quantity}
                                onChange={(e) => {
                                  const total = pendingAdvance.order.doors?.length || pendingAdvance.order.quantity || 1;
                                  const q1 = Math.max(0, Number(e.target.value) || 0);
                                  const q2 = Math.max(0, total - q1);
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, quantity: q1 },
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, quantity: q2 },
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-white text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Rate ₹ / Door</label>
                              <input
                                type="number"
                                min={0}
                                value={pendingAdvance.moldingTeam1.customRate}
                                onChange={(e) =>
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, customRate: e.target.value },
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-amber-300 text-[11px]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Team 2 */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-300">Molding Team 2 (Gang B)</span>
                            <span className="text-[10px] text-slate-400">Qty: {pendingAdvance.moldingTeam2.quantity} Doors</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Floor Gang</label>
                              <select
                                value={pendingAdvance.moldingTeam2.gangId}
                                onChange={(e) =>
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, gangId: e.target.value },
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white text-[11px]"
                              >
                                {gangs.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({getScopeTagSuffix(g)})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Doors Molded</label>
                              <input
                                type="number"
                                min={0}
                                max={pendingAdvance.order.doors?.length || pendingAdvance.order.quantity || 1}
                                value={pendingAdvance.moldingTeam2.quantity}
                                onChange={(e) => {
                                  const total = pendingAdvance.order.doors?.length || pendingAdvance.order.quantity || 1;
                                  const q2 = Math.max(0, Number(e.target.value) || 0);
                                  const q1 = Math.max(0, total - q2);
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, quantity: q1 },
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, quantity: q2 },
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-white text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Rate ₹ / Door</label>
                              <input
                                type="number"
                                min={0}
                                value={pendingAdvance.moldingTeam2.customRate}
                                onChange={(e) =>
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, customRate: e.target.value },
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-amber-300 text-[11px]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Balance Verification Strip */}
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Total Doors Allocated:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            Team 1 ({pendingAdvance.moldingTeam1.doorIds?.length ?? pendingAdvance.moldingTeam1.quantity}) + Team 2 ({pendingAdvance.moldingTeam2.doorIds?.length ?? pendingAdvance.moldingTeam2.quantity}) = {(pendingAdvance.moldingTeam1.doorIds?.length ?? pendingAdvance.moldingTeam1.quantity) + (pendingAdvance.moldingTeam2.doorIds?.length ?? pendingAdvance.moldingTeam2.quantity)} / {pendingAdvance.order.doors?.length || pendingAdvance.order.quantity || 1} Doors
                          </span>
                        </div>

                        {/* Interactive Door-by-Door Picker for Future Warranty / Damage Accountability */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800">
                            <div>
                              <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                                🎯 Custom Door-Wise Pick for Accountability (ഭാവിയിൽ വാതിൽ ഡാമേജ് വന്നാൽ ആര് മോൾഡ് ചെയ്തു എന്ന് കണ്ടെത്താൻ)
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Click Gang A or B for each door to stamp permanent accountability on its QR &amp; serial.
                              </span>
                            </div>

                            {/* Presets */}
                            <div className="flex items-center gap-1 shrink-0 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const allDoors = pendingAdvance.order.doors || [];
                                  const half = Math.ceil(allDoors.length / 2);
                                  const t1 = allDoors.slice(0, half).map((d) => d.doorId || d.id);
                                  const t2 = allDoors.slice(half).map((d) => d.doorId || d.id);
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, doorIds: t1, quantity: t1.length },
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, doorIds: t2, quantity: t2.length },
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
                              >
                                50/50 Split
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const allDoors = pendingAdvance.order.doors || [];
                                  const t1 = allDoors.filter((_, idx) => idx % 2 === 0).map((d) => d.doorId || d.id);
                                  const t2 = allDoors.filter((_, idx) => idx % 2 === 1).map((d) => d.doorId || d.id);
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, doorIds: t1, quantity: t1.length },
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, doorIds: t2, quantity: t2.length },
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
                              >
                                Odd/Even
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const allDoors = pendingAdvance.order.doors || [];
                                  const t1 = allDoors.map((d) => d.doorId || d.id);
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, doorIds: t1, quantity: t1.length },
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, doorIds: [], quantity: 0 },
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700 font-semibold cursor-pointer"
                              >
                                All to A
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const allDoors = pendingAdvance.order.doors || [];
                                  const t2 = allDoors.map((d) => d.doorId || d.id);
                                  setPendingAdvance({
                                    ...pendingAdvance,
                                    moldingTeam1: { ...pendingAdvance.moldingTeam1, doorIds: [], quantity: 0 },
                                    moldingTeam2: { ...pendingAdvance.moldingTeam2, doorIds: t2, quantity: t2.length },
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700 font-semibold cursor-pointer"
                              >
                                All to B
                              </button>
                            </div>
                          </div>

                          {/* Door Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                            {(pendingAdvance.order.doors || []).map((door, idx) => {
                              const dId = door.doorId || door.id;
                              const isA = pendingAdvance.moldingTeam1.doorIds?.includes(dId);
                              const isB = pendingAdvance.moldingTeam2.doorIds?.includes(dId);
                              const team1Name = gangs.find((g) => g.id === pendingAdvance.moldingTeam1.gangId)?.name || 'Gang A';
                              const team2Name = gangs.find((g) => g.id === pendingAdvance.moldingTeam2.gangId)?.name || 'Gang B';

                              return (
                                <div
                                  key={door.id || idx}
                                  className={`p-2 rounded-lg border flex flex-col justify-between gap-1 text-[10px] ${
                                    isA
                                      ? 'bg-blue-950/40 border-blue-600/70'
                                      : isB
                                      ? 'bg-indigo-950/40 border-indigo-600/70'
                                      : 'bg-slate-900 border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-white">
                                      #{door.doorNumber || idx + 1}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[9px] truncate max-w-[120px]">
                                      {door.model || 'FRP Door'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                                    <span>
                                      {(door.finishedHeightMm / 10).toFixed(0)}×{(door.finishedWidthMm / 10).toFixed(0)}cm
                                    </span>
                                    <span className="truncate max-w-[90px]">{door.finishColor}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur1 = new Set(pendingAdvance.moldingTeam1.doorIds || []);
                                        const cur2 = new Set(pendingAdvance.moldingTeam2.doorIds || []);
                                        cur1.add(dId);
                                        cur2.delete(dId);
                                        const arr1 = Array.from(cur1);
                                        const arr2 = Array.from(cur2);
                                        setPendingAdvance({
                                          ...pendingAdvance,
                                          moldingTeam1: { ...pendingAdvance.moldingTeam1, doorIds: arr1, quantity: arr1.length },
                                          moldingTeam2: { ...pendingAdvance.moldingTeam2, doorIds: arr2, quantity: arr2.length },
                                        });
                                      }}
                                      className={`px-1.5 py-1 rounded text-center font-bold truncate transition-all cursor-pointer ${
                                        isA
                                          ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-300'
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                      }`}
                                      title={`Assign to ${team1Name}`}
                                    >
                                      {isA ? '✓ A: ' : 'A: '}
                                      {team1Name.split(' ')[0]}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur1 = new Set(pendingAdvance.moldingTeam1.doorIds || []);
                                        const cur2 = new Set(pendingAdvance.moldingTeam2.doorIds || []);
                                        cur2.add(dId);
                                        cur1.delete(dId);
                                        const arr1 = Array.from(cur1);
                                        const arr2 = Array.from(cur2);
                                        setPendingAdvance({
                                          ...pendingAdvance,
                                          moldingTeam1: { ...pendingAdvance.moldingTeam1, doorIds: arr1, quantity: arr1.length },
                                          moldingTeam2: { ...pendingAdvance.moldingTeam2, doorIds: arr2, quantity: arr2.length },
                                        });
                                      }}
                                      className={`px-1.5 py-1 rounded text-center font-bold truncate transition-all cursor-pointer ${
                                        isB
                                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-300'
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                      }`}
                                      title={`Assign to ${team2Name}`}
                                    >
                                      {isB ? '✓ B: ' : 'B: '}
                                      {team2Name.split(' ')[0]}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {pendingAdvance.targetStage === 'PAINT_SECTION' && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-200">
                    <strong>Grains &amp; Painting (1 Combined Party):</strong> Finishing Grains &amp; Painting share one unified piece-rate lock for this order.
                  </div>
                )}
                {pendingAdvance.alreadyPaidLock?.isLocked ? (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-2 text-[11px]">
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>One-Time Piece-Rate Policy Locked (Rework = ₹0):</strong>{' '}
                        {pendingAdvance.alreadyPaidLock.label} was already credited once (
                        {pendingAdvance.alreadyPaidLock.contractorName} • ₹
                        {pendingAdvance.alreadyPaidLock.totalAmountCredited.toLocaleString('en-IN')} on{' '}
                        {pendingAdvance.alreadyPaidLock.lastPaidDate}). Moving forward adds{' '}
                        <strong>₹0</strong> to gang ledger.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const ord = pendingAdvance.order;
                        setPendingAdvance(null);
                        setSupplementaryParentOrder(ord);
                        setIsJobCardModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create New Additional Job Card (Extra Paid Work)</span>
                    </button>
                  </div>
                ) : (
                  !(pendingAdvance.targetStage === 'MOLDING' && pendingAdvance.moldingMode === 'DUAL') && (
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={!pendingAdvance.skipCredit}
                        onChange={(e) =>
                          setPendingAdvance({ ...pendingAdvance, skipCredit: !e.target.checked })
                        }
                        className="rounded accent-amber-500"
                      />
                      <span className="font-bold">Credit Floor Gang Piece Rate (1× One-Time)</span>
                    </label>
                  )
                )}

                {!pendingAdvance.skipCredit && !pendingAdvance.alreadyPaidLock?.isLocked && !(pendingAdvance.targetStage === 'MOLDING' && pendingAdvance.moldingMode === 'DUAL') && (
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Assign Floor Gang</label>
                      <select
                        value={pendingAdvance.gangId}
                        onChange={(e) =>
                          setPendingAdvance({ ...pendingAdvance, gangId: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                      >
                        {gangs.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({getScopeTagSuffix(g)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Work Operation</label>
                        <select
                          value={pendingAdvance.operation}
                          onChange={(e) => {
                            const nextOp = e.target.value as ContractorOperationType;
                            const r = getDefaultRateForOp(rateCard, nextOp);
                            const nextGrp = getOperationLockGroup(nextOp);
                            const nextLock = pendingAdvance.lockSummary?.groups?.[nextGrp] || null;
                            setPendingAdvance({
                              ...pendingAdvance,
                              operation: nextOp,
                              customRate: r > 0 ? String(r) : pendingAdvance.customRate,
                              alreadyPaidLock: nextLock,
                              skipCredit: nextLock?.isLocked ? true : pendingAdvance.skipCredit,
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                        >
                          <option value="MOLDING_DOOR_WITH_FRAME">Molding Door+Frame</option>
                          <option value="MOLDING_ONLY_DOOR">Molding Only Door</option>
                          <option value="MOLDING_ONLY_FRAME">Molding Only Frame</option>
                          <option value="DOOR_CUTTING">Door Cutting &amp; Finishing</option>
                          <option value="FRAME_CUTTING">Frame Cutting &amp; Finishing</option>
                          <option value="DOOR_GRAINS_WITH_PAINT">Grains &amp; Painting (Standard)</option>
                          <option value="ONLY_CLEAR_COAT">Grains &amp; Painting (Clear Coat)</option>
                          <option value="TWO_SIDE_PAINT">Grains &amp; Painting (Two-Side)</option>
                          <option value="SITE_FITTING">Site Fitting</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Rate ₹ / Door</label>
                        <input
                          type="number"
                          min={0}
                          value={pendingAdvance.customRate}
                          onChange={(e) =>
                            setPendingAdvance({ ...pendingAdvance, customRate: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg font-mono font-bold text-amber-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                <Wrench className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  {pendingAdvance.targetStage === 'COMPLETED'
                    ? 'Order does not include Site Installation — moving directly to Completed Orders Archive!'
                    : 'Moving to Delivery stage.'}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingAdvance(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const p = pendingAdvance;
                  setPendingAdvance(null);
                  if (p.targetStage === 'MOLDING' && p.moldingMode === 'DUAL') {
                    const assignments: Array<{
                      gangId: string;
                      operation: ContractorOperationType;
                      quantity?: number;
                      doorIds?: string[];
                      customRate?: number;
                    }> = [];
                    if (p.moldingTeam1.enabled && p.moldingTeam1.gangId && (p.moldingTeam1.doorIds?.length || p.moldingTeam1.quantity > 0)) {
                      assignments.push({
                        gangId: p.moldingTeam1.gangId,
                        operation: 'MOLDING_DOOR_WITH_FRAME',
                        quantity: p.moldingTeam1.doorIds?.length || p.moldingTeam1.quantity,
                        doorIds: p.moldingTeam1.doorIds,
                        customRate:
                          p.moldingTeam1.customRate !== ''
                            ? Number(p.moldingTeam1.customRate)
                            : undefined,
                      });
                    }
                    if (p.moldingTeam2.enabled && p.moldingTeam2.gangId && (p.moldingTeam2.doorIds?.length || p.moldingTeam2.quantity > 0)) {
                      assignments.push({
                        gangId: p.moldingTeam2.gangId,
                        operation: 'MOLDING_DOOR_WITH_FRAME',
                        quantity: p.moldingTeam2.doorIds?.length || p.moldingTeam2.quantity,
                        doorIds: p.moldingTeam2.doorIds,
                        customRate:
                          p.moldingTeam2.customRate !== ''
                            ? Number(p.moldingTeam2.customRate)
                            : undefined,
                      });
                    }
                    await confirmStageMove(p.order.id, p.targetStage, {
                      keepCurrentStage: p.keepCurrentStage,
                      assignments,
                      skipAutoCredit: assignments.length === 0,
                    });
                    return;
                  }
                  if (p.targetStage === 'CUTTING_FINISHING') {
                    const assignments: Array<{
                      gangId: string;
                      operation: ContractorOperationType;
                      customRate?: number;
                    }> = [];
                    if (
                      p.doorCuttingParty.enabled &&
                      p.doorCuttingParty.gangId &&
                      !p.doorCuttingParty.lockedInfo?.isLocked
                    ) {
                      assignments.push({
                        gangId: p.doorCuttingParty.gangId,
                        operation: 'DOOR_CUTTING',
                        customRate:
                          p.doorCuttingParty.customRate !== ''
                            ? Number(p.doorCuttingParty.customRate)
                            : undefined,
                      });
                    }
                    if (
                      p.frameCuttingParty.enabled &&
                      p.frameCuttingParty.gangId &&
                      !p.frameCuttingParty.lockedInfo?.isLocked
                    ) {
                      assignments.push({
                        gangId: p.frameCuttingParty.gangId,
                        operation: 'FRAME_CUTTING',
                        customRate:
                          p.frameCuttingParty.customRate !== ''
                            ? Number(p.frameCuttingParty.customRate)
                            : undefined,
                      });
                    }
                    await confirmStageMove(p.order.id, p.targetStage, {
                      keepCurrentStage: p.keepCurrentStage,
                      assignments,
                      skipAutoCredit: assignments.length === 0,
                    });
                    return;
                  }
                  await confirmStageMove(p.order.id, p.targetStage, {
                    keepCurrentStage: p.keepCurrentStage,
                    gangId: p.skipCredit || p.alreadyPaidLock?.isLocked ? undefined : p.gangId,
                    operation:
                      p.skipCredit || p.alreadyPaidLock?.isLocked
                        ? undefined
                        : p.operation || undefined,
                    customRate:
                      !p.skipCredit && !p.alreadyPaidLock?.isLocked && p.customRate !== ''
                        ? Number(p.customRate)
                        : undefined,
                    skipAutoCredit: p.skipCredit || Boolean(p.alreadyPaidLock?.isLocked),
                    isRework: Boolean(p.alreadyPaidLock?.isLocked),
                  });
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {pendingAdvance.keepCurrentStage ? 'Save Team Credits' : 'Confirm Stage Move \u2192'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Integrated Modals */}
      <JobCardModal
        isOpen={isJobCardModalOpen}
        prefillParentOrder={supplementaryParentOrder}
        onClose={() => {
          setIsJobCardModalOpen(false);
          setSupplementaryParentOrder(null);
        }}
        onSaved={(saved) => {
          setOrders((prev) => [saved, ...prev]);
          setSupplementaryParentOrder(null);
          notify(`Job Card "${saved.jobCardNumber}" released to Production Floor.`);
        }}
      />

      <StickerPrintModal
        isOpen={Boolean(selectedStickerOrder)}
        onClose={() => setSelectedStickerOrder(null)}
        order={selectedStickerOrder}
        onOrderUpdated={(updated) => {
          setSelectedStickerOrder(updated);
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        }}
      />

      <StageBoqModal
        isOpen={Boolean(selectedStageBoq)}
        onClose={() => setSelectedStageBoq(null)}
        orderId={selectedStageBoq?.orderId || ''}
        stageType={selectedStageBoq?.stageType || 'MANUFACTURING'}
      />

      <DeliveryChallanModal
        isOpen={Boolean(selectedDeliveryChallanOrder)}
        onClose={() => setSelectedDeliveryChallanOrder(null)}
        order={selectedDeliveryChallanOrder}
      />

      <LogContractorWorkModal
        isOpen={Boolean(selectedContractorWork)}
        onClose={() => setSelectedContractorWork(null)}
        order={selectedContractorWork?.order || null}
        selectedDoor={selectedContractorWork?.door}
        onSuccess={() => notify('Floor Gang piece-rate credited to ledger.')}
        onCreateSupplementaryJob={(ord) => {
          setSelectedContractorWork(null);
          setSupplementaryParentOrder(ord);
          setIsJobCardModalOpen(true);
        }}
      />

      <ProductionFloorGangsModal
        isOpen={isGangsModalOpen}
        onClose={() => setIsGangsModalOpen(false)}
        onUpdated={loadData}
      />

      <OrderProfitDetailModal
        order={profitInspectOrder}
        isOpen={Boolean(profitInspectOrder)}
        includeProjectedCosts={false}
        onClose={() => setProfitInspectOrder(null)}
        onExpenseMutated={async () => {
          if (profitInspectOrder) {
            await openOrderProfitModal(profitInspectOrder.orderId);
          }
        }}
      />
      <ShareOrderStatusModal
        isOpen={Boolean(selectedShareOrder)}
        onClose={() => setSelectedShareOrder(null)}
        order={selectedShareOrder}
      />
    </div>
  );
}
