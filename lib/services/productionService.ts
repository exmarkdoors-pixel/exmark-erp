import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { getDataFilePath } from '../utils/dataPaths';
import { assertWriteAllowed, isPostgresAvailable } from './dbSyncEngine';
import {
  ProductionStage,
  ProductionStageAssignment,
  ACTIVE_BOARD_STAGES,
  STAGE_DISPLAY_LABELS,
  getNextProductionStage,
  getPrevProductionStage,
} from '../utils/productionStages';

export {
  ACTIVE_BOARD_STAGES,
  STAGE_DISPLAY_LABELS,
  getNextProductionStage,
  getPrevProductionStage,
};
export type { ProductionStage, ProductionStageAssignment };

// ── Types ────────────────────────────────────────────────────────────────────

export type ProductionPriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type QcStatus = 'PENDING' | 'PASSED' | 'REJECTED';

export type QcDecision = 'PASSED' | 'REWORK_REQUIRED' | 'REJECTED';

export type DefectType =
  | 'NONE'
  | 'DIMENSIONAL_VARIATION'
  | 'SURFACE_BLEMISH'
  | 'PU_COATING_PEEL'
  | 'LOCK_POCKET_MISALIGNMENT'
  | 'EDGE_DELAMINATION'
  | 'CORE_VOID'
  | 'WARPAGE';

export interface QcChecklist {
  dimensionalAccuracy: boolean; // ±1.5mm tolerance
  squarenessTolerance: boolean; // <2mm diagonal tolerance
  surfaceCoatingAdhesion: boolean; // PU finish & adhesion
  lockPocketAccuracy: boolean; // Lock pocket & mortise depth
  hingeRebateEdgeSealing: boolean; // Hinge rebate & edge seal
  waterImmersionDensity: boolean; // Core density & seal
}

export interface QcInspectionRecord {
  inspectedAt: string;
  inspectorName: string;
  checklist: QcChecklist;
  decision: QcDecision;
  defectType?: DefectType;
  defectSeverity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
  reworkNotes?: string;
  actionTaken?: string;
}

export interface DoorStageHistoryRecord {
  stage: ProductionStage;
  enteredAt: string;
  gangId?: string;
  gangName?: string;
  doorMolderName?: string;
  frameMolderName?: string;
  operation?: string;
  notes?: string;
}

export interface ProductionDoorItem {
  id: string;
  doorId: string; // e.g. EXM-DR-2026-1001
  doorNumber: string; // e.g. D1, Toilet 1
  model: string;
  stage?: ProductionStage;
  stageHistory?: DoorStageHistoryRecord[];
  stageUpdatedAt?: string;
  materialIssued?: boolean;
  materialIssuedAt?: string;
  materialIssueBatchId?: string;
  materialIssuedToGang?: string;
  materialIssuedValue?: number;
  rawHeightMm: number;
  rawWidthMm: number;
  rawWidthBottomMm?: number;
  rawHeightCm?: number;
  rawWidthTopCm?: number;
  rawWidthBtmCm?: number;
  widthLinked?: boolean;
  frameTypeId?: string;
  frameTypeName?: string;
  doorThicknessMm?: number;
  doorThicknessLabel?: string;
  swing?: 'INWARD' | 'OUTWARD';
  remark?: string;
  finishedHeightMm: number;
  finishedWidthMm: number;
  handing: 'LH' | 'RH';
  lockId?: string;
  lockType: string;
  lockPrice?: number;
  finishColor: string;
  qcStatus: QcStatus;
  qrPayload: string;
  qcInspection?: QcInspectionRecord | null;
  stickerRemovedAt?: string | null;
  stickerRemovedBy?: string | null;
  stickerRemovalNotes?: string | null;
  moldedByGangId?: string;
  moldedByGangName?: string;
  doorMolderName?: string; // ഡോർ അടിച്ചയാൾ (Door Slab Caster / Operator)
  frameMolderName?: string; // ഫ്രെയിം അടിച്ചയാൾ (Frame Caster / Operator)
  moldingShift?: 'SHIFT_1' | 'SHIFT_2' | 'NIGHT_SHIFT' | 'GENERAL';
  moldedAt?: string;
  moldingNotes?: string;
}

export interface ProductionOrder {
  id: string;
  prodOrderNumber: string; // PRD-2026-001
  jobCardNumber: string; // JC-2026-001
  salesOrderId?: string | null;
  measurementRef?: string | null;
  parentJobCardNumber?: string | null;
  isSupplementaryJobWork?: boolean;
  customerName: string;
  siteName: string;
  district: string;
  doorCategory: 'FRP_DOORS' | 'WPC_DOORS';
  quantity: number;
  lineAssigned: string;
  batchNumber: string;
  priority: ProductionPriority;
  status: ProductionStage;
  includeInstallation?: boolean;
  installationNotes?: string;
  orderDate?: string;
  boqIssuedAt?: string | null;
  stageHistory?: ProductionStageAssignment[];
  tolerancesApplied: {
    heightDeductionMm: number;
    widthDeductionMm: number;
  };
  doors: ProductionDoorItem[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface ProductionOrderCreateInput {
  salesOrderId?: string | null;
  measurementRef?: string | null;
  parentJobCardNumber?: string | null;
  isSupplementaryJobWork?: boolean;
  customerName: string;
  siteName: string;
  district: string;
  doorCategory?: 'FRP_DOORS' | 'WPC_DOORS';
  lineAssigned?: string;
  priority?: ProductionPriority;
  includeInstallation?: boolean;
  installationNotes?: string;
  orderDate?: string;
  tolerances?: {
    heightDeductionMm?: number;
    widthDeductionMm?: number;
  };
  doors: Array<{
    doorNumber: string;
    model: string;
    rawHeightMm: number;
    rawWidthMm: number;
    rawWidthBottomMm?: number;
    rawHeightCm?: number;
    rawWidthTopCm?: number;
    rawWidthBtmCm?: number;
    frameTypeId?: string;
    frameTypeName?: string;
    doorThicknessMm?: number;
    doorThicknessLabel?: string;
    swing?: 'INWARD' | 'OUTWARD';
    remark?: string;
    handing?: 'LH' | 'RH';
    lockType?: string;
    finishColor?: string;
  }>;
}

export interface ProductionFilter {
  status?: ProductionStage;
  lineAssigned?: string;
  priority?: ProductionPriority;
}

// ── Store Helpers ─────────────────────────────────────────────────────────────

const getStorePath = () => getDataFilePath('production-store.json');

function readStore(): ProductionOrder[] {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let migrated = false;
    const normalized = (parsed as ProductionOrder[]).map((o) => {
      if (o.status === 'FINISHING_GRAINS' || o.status === 'PU_COATING') {
        migrated = true;
        return { ...o, status: 'PAINT_SECTION' as ProductionStage };
      }
      if (o.status === 'CNC_ROUTING' || o.status === 'QA_INSPECTION') {
        migrated = true;
        return { ...o, status: 'CUTTING_FINISHING' as ProductionStage };
      }
      return o;
    });
    if (migrated) {
      writeStore(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

function writeStore(orders: ProductionOrder[]): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('[productionService] Failed to write store:', err);
  }
}

function generateProdNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `PRD-2026-${num}`;
}

function generateJobCardNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `JC-2026-${num}`;
}

function generateDoorId(serial: number): string {
  return `EXM-DR-2026-${String(serial).padStart(4, '0')}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Service Functions ──────────────────────────────────────────────────────────

export async function listProductionOrders(filter?: ProductionFilter): Promise<ProductionOrder[]> {
  const all = readStore();
  return all.filter((o) => {
    if (filter?.status && o.status !== filter.status) return false;
    if (filter?.lineAssigned && o.lineAssigned !== filter.lineAssigned) return false;
    if (filter?.priority && o.priority !== filter.priority) return false;
    return true;
  });
}

export async function getProductionOrder(id: string): Promise<ProductionOrder | null> {
  const all = readStore();
  return all.find((o) => o.id === id || o.jobCardNumber === id || o.prodOrderNumber === id) ?? null;
}

export async function findDoorBySerial(doorId: string): Promise<{ order: ProductionOrder; door: ProductionDoorItem } | null> {
  const all = readStore();
  const search = doorId.trim().toUpperCase();
  for (const order of all) {
    const door = order.doors.find((d) => d.doorId.toUpperCase() === search || d.id === doorId);
    if (door) {
      return { order, door };
    }
  }
  return null;
}

export async function createProductionOrder(input: ProductionOrderCreateInput): Promise<ProductionOrder> {
  await assertWriteAllowed('create production order');

  const all = readStore();
  const prodOrderNumber = generateProdNumber(all.length);
  const jobCardNumber = generateJobCardNumber(all.length);
  const batchNumber = `BTH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${all.length + 1}`;

  // Default tolerances for FRP Doors: 10mm Height deduction, 10mm Width deduction
  const heightDeduction = input.tolerances?.heightDeductionMm ?? 10;
  const widthDeduction = input.tolerances?.widthDeductionMm ?? 10;

  let totalExistingDoors = all.reduce((sum, o) => sum + o.doors.length, 0);

  const doors: ProductionDoorItem[] = input.doors.map((d) => {
    totalExistingDoors++;
    const doorId = generateDoorId(totalExistingDoors);
    const finishedHeightMm = Math.max(0, d.rawHeightMm - heightDeduction);
    const finishedWidthMm = Math.max(0, d.rawWidthMm - widthDeduction);

    const qrPayload = JSON.stringify({
      doorId,
      jobCard: jobCardNumber,
      client: input.customerName,
      location: d.doorNumber,
      finishedSize: `${finishedHeightMm}x${finishedWidthMm}mm`,
      handing: d.handing || 'RH',
    });

    return {
      id: generateId('dr'),
      doorId,
      doorNumber: d.doorNumber,
      model: d.model,
      rawHeightMm: d.rawHeightMm,
      rawWidthMm: d.rawWidthMm,
      rawWidthBottomMm: d.rawWidthBottomMm ?? d.rawWidthMm,
      rawHeightCm: d.rawHeightCm ?? Number((d.rawHeightMm / 10).toFixed(2)),
      rawWidthTopCm: d.rawWidthTopCm ?? Number((d.rawWidthMm / 10).toFixed(2)),
      rawWidthBtmCm: d.rawWidthBtmCm ?? Number(((d.rawWidthBottomMm ?? d.rawWidthMm) / 10).toFixed(2)),
      frameTypeId: d.frameTypeId || 'FRM-REGULAR',
      frameTypeName: d.frameTypeName || 'Regular Frame (72×50mm)',
      doorThicknessMm: d.doorThicknessMm,
      doorThicknessLabel: d.doorThicknessLabel,
      swing: d.swing || 'INWARD',
      remark: d.remark || '',
      finishedHeightMm,
      finishedWidthMm,
      handing: d.handing || 'RH',
      lockType: d.lockType || 'Mortise Lock 60mm',
      finishColor: d.finishColor || 'Burma Teak',
      qcStatus: 'PENDING' as QcStatus,
      qrPayload,
      qcInspection: null,
      stickerRemovedAt: null,
      stickerRemovedBy: null,
      stickerRemovalNotes: null,
    };
  });

  const newOrder: ProductionOrder = {
    id: generateId('prd'),
    prodOrderNumber,
    jobCardNumber,
    salesOrderId: input.salesOrderId || null,
    measurementRef: input.measurementRef || null,
    parentJobCardNumber: input.parentJobCardNumber || null,
    isSupplementaryJobWork: Boolean(input.isSupplementaryJobWork),
    customerName: input.customerName,
    siteName: input.siteName,
    district: input.district,
    doorCategory: input.doorCategory || 'FRP_DOORS',
    quantity: doors.length,
    lineAssigned: input.lineAssigned || 'Hand Station 1: Hand-Layup & Manual Mold Benches',
    batchNumber,
    priority: input.priority || 'NORMAL',
    status: 'QUEUED',
    includeInstallation: Boolean(input.includeInstallation),
    installationNotes: input.installationNotes || undefined,
    orderDate: input.orderDate || new Date().toISOString().split('T')[0],
    boqIssuedAt: null,
    stageHistory: [],
    tolerancesApplied: {
      heightDeductionMm: heightDeduction,
      widthDeductionMm: widthDeduction,
    },
    doors,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Sync to PostgreSQL if connected and salesOrder is present
  const isOnline = await isPostgresAvailable();
  if (isOnline && input.salesOrderId) {
    try {
      const orderExists = await prisma.salesOrder.findUnique({
        where: { id: input.salesOrderId },
        select: { id: true },
      });
      if (orderExists) {
        await prisma.productionOrder.create({
          data: {
            id: newOrder.id,
            prodOrderNumber: newOrder.prodOrderNumber,
            salesOrderId: input.salesOrderId,
            doorCategory: newOrder.doorCategory,
            specifications: JSON.stringify({
              tolerances: newOrder.tolerancesApplied,
              doorsCount: newOrder.doors.length,
              jobCardNumber: newOrder.jobCardNumber,
            }),
            quantity: newOrder.quantity,
            lineAssigned: newOrder.lineAssigned,
            batchNumber: newOrder.batchNumber,
            priority: newOrder.priority,
            status: newOrder.status,
          },
        });
      }
    } catch (err) {
      console.warn('[productionService] PostgreSQL write skipped, preserved locally:', err);
    }
  }

  all.unshift(newOrder);
  writeStore(all);
  return newOrder;
}

export async function updateProductionStage(
  id: string,
  stage: ProductionStage,
  stageMeta?: {
    gangId?: string;
    gangName?: string;
    operation?: string;
    amount?: number;
    isRework?: boolean;
    reworkReason?: string;
    pieceRateSkippedReason?: string;
    doorAssignments?: Array<{
      doorId: string;
      gangId: string;
      gangName: string;
      moldingNotes?: string;
    }>;
  }
): Promise<ProductionOrder> {
  await assertWriteAllowed('update production stage');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error(`Production order ${id} not found`);

  const order = all[idx];
  let startedAt = order.startedAt;
  let completedAt = order.completedAt;

  if (stage !== 'QUEUED' && !startedAt) {
    startedAt = new Date().toISOString();
  }
  if (stage === 'COMPLETED') {
    completedAt = new Date().toISOString();
    // Auto-mark doors passed upon completion
    order.doors.forEach((d) => {
      if (d.qcStatus === 'PENDING') d.qcStatus = 'PASSED';
    });
  } else {
    completedAt = null;
  }

  // Stamp individual doors with molding gang if provided or if single gang is supplied
  const nowIso = new Date().toISOString();
  let updatedDoors = [...order.doors];
  if (Array.isArray(stageMeta?.doorAssignments) && stageMeta.doorAssignments.length > 0) {
    const assignMap = new Map(stageMeta.doorAssignments.map((a) => [a.doorId, a]));
    updatedDoors = updatedDoors.map((d) => {
      const match = assignMap.get(d.id) || assignMap.get(d.doorId);
      if (match) {
        return {
          ...d,
          moldedByGangId: match.gangId,
          moldedByGangName: match.gangName,
          moldedAt: nowIso,
          moldingNotes: match.moldingNotes ?? d.moldingNotes,
        };
      }
      return d;
    });
  } else if (stage === 'MOLDING' && stageMeta?.gangId && stageMeta?.gangName) {
    // Single gang molding entire batch or remaining unstamped doors
    updatedDoors = updatedDoors.map((d) => ({
      ...d,
      moldedByGangId: d.moldedByGangId || stageMeta.gangId,
      moldedByGangName: d.moldedByGangName || stageMeta.gangName,
      moldedAt: d.moldedAt || nowIso,
    }));
  }

  const nextHistory: ProductionStageAssignment[] = Array.isArray(order.stageHistory)
    ? [...order.stageHistory]
    : [];
  nextHistory.push({
    stage,
    gangId: stageMeta?.gangId,
    gangName: stageMeta?.gangName,
    operation: stageMeta?.operation,
    amount: stageMeta?.amount,
    isRework: stageMeta?.isRework,
    reworkReason: stageMeta?.reworkReason,
    pieceRateSkippedReason: stageMeta?.pieceRateSkippedReason,
    completedAt: new Date().toISOString(),
  });

  const updated: ProductionOrder = {
    ...order,
    doors: updatedDoors,
    status: stage,
    startedAt,
    completedAt,
    stageHistory: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  // Sync to PostgreSQL if online
  const isOnline = await isPostgresAvailable();
  if (isOnline) {
    try {
      await prisma.productionOrder.updateMany({
        where: { id },
        data: {
          status: stage,
          startedAt: startedAt ? new Date(startedAt) : undefined,
          completedAt: completedAt ? new Date(completedAt) : undefined,
        },
      });
    } catch (err) {
      console.warn('[productionService] PostgreSQL stage sync failed:', err);
    }
  }

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function updateProductionOrderDoors(
  id: string,
  doors: ProductionDoorItem[]
): Promise<ProductionOrder> {
  await assertWriteAllowed('update production door specs');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === id || o.jobCardNumber === id || o.prodOrderNumber === id);
  if (idx === -1) throw new Error(`Production order ${id} not found`);

  const updated: ProductionOrder = {
    ...all[idx],
    doors,
    quantity: doors.length,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function updateDoorQc(orderId: string, doorId: string, qcStatus: QcStatus): Promise<ProductionOrder> {
  await assertWriteAllowed('update door QC');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const door = all[idx].doors.find((d) => d.id === doorId || d.doorId === doorId);
  if (!door) throw new Error(`Door ${doorId} not found in production order ${orderId}`);

  door.qcStatus = qcStatus;
  all[idx].updatedAt = new Date().toISOString();
  writeStore(all);
  return all[idx];
}

export async function updateDoorQcWithChecklist(
  orderId: string,
  doorId: string,
  inspection: QcInspectionRecord
): Promise<ProductionOrder> {
  await assertWriteAllowed('log door QC inspection');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const door = all[idx].doors.find((d) => d.id === doorId || d.doorId === doorId);
  if (!door) throw new Error(`Door ${doorId} not found in production order ${orderId}`);

  door.qcInspection = inspection;
  door.qcStatus = inspection.decision === 'PASSED' ? 'PASSED' : 'REJECTED';
  all[idx].updatedAt = new Date().toISOString();
  writeStore(all);
  return all[idx];
}

export async function confirmStickerRemoval(
  doorId: string,
  confirmedBy: string,
  notes?: string
): Promise<{ success: boolean; door: ProductionDoorItem; order: ProductionOrder }> {
  await assertWriteAllowed('confirm sticker removal');

  const all = readStore();
  const search = doorId.trim().toUpperCase();

  for (let idx = 0; idx < all.length; idx++) {
    const order = all[idx];
    const door = order.doors.find((d) => d.doorId.toUpperCase() === search || d.id === doorId);
    if (door) {
      door.stickerRemovedAt = new Date().toISOString();
      door.stickerRemovedBy = confirmedBy.trim();
      door.stickerRemovalNotes = notes?.trim() || 'Sticker removed and FRP door surface verified by site personnel.';
      order.updatedAt = new Date().toISOString();
      writeStore(all);
      return { success: true, door, order };
    }
  }

  throw new Error(`Door with ID "${doorId}" was not found.`);
}

export class DuplicateBoqIssueError extends Error {
  statusCode = 409;
  duplicates: Array<{ doorId: string; doorNumber: string; existingBatchId?: string }>;

  constructor(
    message: string,
    duplicates: Array<{ doorId: string; doorNumber: string; existingBatchId?: string }> = []
  ) {
    super(message);
    this.name = 'DuplicateBoqIssueError';
    this.duplicates = duplicates;
  }
}

export class IneligibleBoqStageError extends Error {
  statusCode = 400;
  orderStage: string;

  constructor(message: string, orderStage: string = '') {
    super(message);
    this.name = 'IneligibleBoqStageError';
    this.orderStage = orderStage;
  }
}

export const BOQ_ELIGIBLE_STAGES: ProductionStage[] = ['QUEUED', 'MOLDING'];

export function isOrderEligibleForBoqIssue(order: ProductionOrder): {
  eligible: boolean;
  reason?: string;
} {
  const normalized = (order.status || 'QUEUED') as ProductionStage;
  if (!BOQ_ELIGIBLE_STAGES.includes(normalized)) {
    const stageLabel = STAGE_DISPLAY_LABELS[normalized] || normalized;
    return {
      eligible: false,
      reason: `Order ${order.jobCardNumber || order.prodOrderNumber} is currently in stage "${stageLabel}". Raw material BOQ can only be issued for orders transitioning from Queue to Molding.`,
    };
  }
  return { eligible: true };
}

export function isDoorEligibleForBoqIssue(
  door: ProductionDoorItem,
  orderStatus: ProductionStage = 'QUEUED'
): { eligible: boolean; reason?: string } {
  const stage = (door.stage || orderStatus || 'QUEUED') as ProductionStage;
  if (!BOQ_ELIGIBLE_STAGES.includes(stage)) {
    const stageLabel = STAGE_DISPLAY_LABELS[stage] || stage;
    return {
      eligible: false,
      reason: `Door ${door.doorNumber} is in stage "${stageLabel}". Raw material BOQ is only permitted for doors in Queue or Molding.`,
    };
  }
  return { eligible: true };
}

export async function markProductionBoqIssued(id: string): Promise<ProductionOrder> {
  await assertWriteAllowed('mark BOQ issued');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === id || o.jobCardNumber === id || o.prodOrderNumber === id || o.salesOrderId === id);
  if (idx === -1) throw new Error(`Production order ${id} not found`);

  const existing = all[idx];

  // HARD STAGE GUARD: Only orders transitioning from Queue to Molding (or currently in Molding) can have BOQ issued!
  const stageCheck = isOrderEligibleForBoqIssue(existing);
  if (!stageCheck.eligible) {
    throw new IneligibleBoqStageError(`BLOCKED: ${stageCheck.reason}`, existing.status);
  }

  const existingDoors = existing.doors || [];
  if (existing.boqIssuedAt && existingDoors.length > 0 && existingDoors.every((d) => Boolean(d.materialIssued))) {
    throw new DuplicateBoqIssueError(
      `BLOCKED: Duplicate BOQ issue prevented! All ${existingDoors.length} door(s) in ${existing.jobCardNumber} were already issued on ${existing.boqIssuedAt.slice(0, 10)}.`,
      existingDoors.map((d) => ({
        doorId: d.id || d.doorId,
        doorNumber: d.doorNumber,
        existingBatchId: d.materialIssueBatchId,
      }))
    );
  }

  const nowIso = new Date().toISOString();
  const batchId = `BOQ-FULL-${Date.now()}`;
  const updatedDoors = existingDoors.map((door) =>
    door.materialIssued
      ? door
      : {
          ...door,
          materialIssued: true,
          materialIssuedAt: door.materialIssuedAt || nowIso,
          materialIssueBatchId: door.materialIssueBatchId || batchId,
        }
  );

  const updated: ProductionOrder = {
    ...existing,
    doors: updatedDoors,
    boqIssuedAt: nowIso,
    updatedAt: nowIso,
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function toggleProductionInstallation(
  id: string,
  includeInstallation: boolean
): Promise<ProductionOrder> {
  await assertWriteAllowed('toggle installation requirement');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error(`Production order ${id} not found`);

  const updated: ProductionOrder = {
    ...all[idx],
    includeInstallation,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function deleteProductionOrder(id: string): Promise<boolean> {
  await assertWriteAllowed('delete production order');

  const all = readStore();
  const filtered = all.filter((o) => o.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}

export async function stampDoorsMoldingGang(
  orderId: string,
  doorAssignments: Array<{
    doorId: string;
    gangId: string;
    gangName: string;
    doorMolderName?: string;
    frameMolderName?: string;
    moldingShift?: 'SHIFT_1' | 'SHIFT_2' | 'NIGHT_SHIFT' | 'GENERAL';
    moldingNotes?: string;
  }>
): Promise<ProductionOrder> {
  await assertWriteAllowed('stamp doors molding gang');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === orderId || o.jobCardNumber === orderId || o.prodOrderNumber === orderId);
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const order = all[idx];
  const nowIso = new Date().toISOString();
  const assignMap = new Map(doorAssignments.map((a) => [a.doorId, a]));

  const updatedDoors = order.doors.map((door) => {
    const match = assignMap.get(door.id) || assignMap.get(door.doorId);
    if (match) {
      return {
        ...door,
        moldedByGangId: match.gangId,
        moldedByGangName: match.gangName,
        doorMolderName: match.doorMolderName ?? door.doorMolderName,
        frameMolderName: match.frameMolderName ?? door.frameMolderName,
        moldingShift: match.moldingShift ?? door.moldingShift,
        moldedAt: nowIso,
        moldingNotes: match.moldingNotes ?? door.moldingNotes,
      };
    }
    return door;
  });

  const updated: ProductionOrder = {
    ...order,
    doors: updatedDoors,
    updatedAt: nowIso,
  };

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function recallDoorsFromFloor(
  orderId: string,
  doorIds?: string[]
): Promise<ProductionOrder> {
  await assertWriteAllowed('recall doors from floor');

  const all = readStore();
  const idx = all.findIndex((o) => o.id === orderId || o.jobCardNumber === orderId || o.prodOrderNumber === orderId);
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const order = all[idx];
  const nowIso = new Date().toISOString();
  const doorIdSet = doorIds && doorIds.length > 0 ? new Set(doorIds) : null;

  const updatedDoors = order.doors.map((door) => {
    if (!doorIdSet || doorIdSet.has(door.id) || doorIdSet.has(door.doorId)) {
      return {
        ...door,
        moldedByGangId: undefined,
        moldedByGangName: undefined,
        doorMolderName: undefined,
        frameMolderName: undefined,
        moldingShift: undefined,
        moldedAt: undefined,
        moldingNotes: `Recalled from floor on ${nowIso.slice(0, 10)}`,
      };
    }
    return door;
  });

  const anyMolded = updatedDoors.some((d) => d.moldedByGangId);
  const updated: ProductionOrder = {
    ...order,
    status: anyMolded ? 'MOLDING' : 'QUEUED',
    doors: updatedDoors,
    updatedAt: nowIso,
  };

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export interface UpdateDoorStagesInput {
  doorIds: string[];
  targetStage: ProductionStage;
  gangId?: string;
  gangName?: string;
  doorMolderName?: string;
  frameMolderName?: string;
  moldingShift?: 'SHIFT_1' | 'SHIFT_2' | 'NIGHT_SHIFT' | 'GENERAL';
  operation?: string;
  notes?: string;
}

export async function updateDoorStages(
  orderId: string,
  input: UpdateDoorStagesInput
): Promise<ProductionOrder> {
  await assertWriteAllowed('update door stages');
  const all = readStore();
  const idx = all.findIndex((o) => o.id === orderId || o.jobCardNumber === orderId || o.prodOrderNumber === orderId);
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const order = all[idx];
  const nowIso = new Date().toISOString();
  const doorIdSet = new Set(input.doorIds);

  const updatedDoors = order.doors.map((door) => {
    if (doorIdSet.has(door.id) || doorIdSet.has(door.doorId)) {
      const history = Array.isArray(door.stageHistory) ? [...door.stageHistory] : [];
      history.push({
        stage: input.targetStage,
        enteredAt: nowIso,
        gangId: input.gangId,
        gangName: input.gangName,
        doorMolderName: input.doorMolderName ?? door.doorMolderName,
        frameMolderName: input.frameMolderName ?? door.frameMolderName,
        operation: input.operation,
        notes: input.notes,
      });

      return {
        ...door,
        stage: input.targetStage,
        stageHistory: history,
        stageUpdatedAt: nowIso,
        ...(input.targetStage === 'MOLDING'
          ? {
              moldedByGangId: input.gangId ?? door.moldedByGangId,
              moldedByGangName: input.gangName ?? door.moldedByGangName,
              doorMolderName: input.doorMolderName ?? door.doorMolderName,
              frameMolderName: input.frameMolderName ?? door.frameMolderName,
              moldingShift: input.moldingShift ?? door.moldingShift,
              moldedAt: door.moldedAt || nowIso,
              moldingNotes: input.notes ?? door.moldingNotes,
            }
          : {}),
      };
    }
    return door;
  });

  // Calculate order-level status based on door distribution
  const doorStages = updatedDoors.map((d) => d.stage || order.status);
  const allCompleted = doorStages.every((s) => s === 'COMPLETED');
  const allDelivered = doorStages.every((s) => s === 'DELIVERY' || s === 'COMPLETED');

  let orderStatus = order.status;
  if (allCompleted) {
    orderStatus = 'COMPLETED';
  } else if (allDelivered) {
    orderStatus = 'DELIVERY';
  } else if (input.targetStage === 'MOLDING' && order.status === 'QUEUED') {
    orderStatus = 'MOLDING';
  } else if (doorStages.some((s) => s === 'CUTTING_FINISHING') && (order.status === 'QUEUED' || order.status === 'MOLDING')) {
    orderStatus = 'CUTTING_FINISHING';
  } else if (doorStages.some((s) => s === 'PAINT_SECTION') && (order.status === 'QUEUED' || order.status === 'MOLDING' || order.status === 'CUTTING_FINISHING')) {
    orderStatus = 'PAINT_SECTION';
  }

  const updatedOrder: ProductionOrder = {
    ...order,
    status: orderStatus,
    doors: updatedDoors,
    startedAt: order.startedAt || (orderStatus !== 'QUEUED' ? nowIso : null),
    updatedAt: nowIso,
  };

  all[idx] = updatedOrder;
  writeStore(all);
  return updatedOrder;
}

export async function updateDoorArtisans(
  orderId: string,
  doorId: string,
  artisans: {
    doorMolderName?: string;
    frameMolderName?: string;
    moldingShift?: 'SHIFT_1' | 'SHIFT_2' | 'NIGHT_SHIFT' | 'GENERAL';
    gangId?: string;
    gangName?: string;
    moldingNotes?: string;
  }
): Promise<ProductionOrder> {
  await assertWriteAllowed('update door artisans');
  const all = readStore();
  const idx = all.findIndex((o) => o.id === orderId || o.jobCardNumber === orderId || o.prodOrderNumber === orderId);
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const order = all[idx];
  const nowIso = new Date().toISOString();
  const updatedDoors = order.doors.map((d) => {
    if (d.id === doorId || d.doorId === doorId) {
      return {
        ...d,
        ...(artisans.doorMolderName !== undefined ? { doorMolderName: artisans.doorMolderName } : {}),
        ...(artisans.frameMolderName !== undefined ? { frameMolderName: artisans.frameMolderName } : {}),
        ...(artisans.moldingShift !== undefined ? { moldingShift: artisans.moldingShift } : {}),
        ...(artisans.gangId !== undefined ? { moldedByGangId: artisans.gangId } : {}),
        ...(artisans.gangName !== undefined ? { moldedByGangName: artisans.gangName } : {}),
        ...(artisans.moldingNotes !== undefined ? { moldingNotes: artisans.moldingNotes } : {}),
        stageUpdatedAt: nowIso,
      };
    }
    return d;
  });

  const updated: ProductionOrder = {
    ...order,
    doors: updatedDoors,
    updatedAt: nowIso,
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export interface RecordDoorMaterialIssueInput {
  doorIds: string[];
  batchId?: string;
  gangName?: string;
  totalIssuedValue?: number;
  notes?: string;
}

export async function recordDoorMaterialIssue(
  orderId: string,
  input: RecordDoorMaterialIssueInput
): Promise<ProductionOrder> {
  await assertWriteAllowed('record door material issue');
  const all = readStore();
  const idx = all.findIndex(
    (o) =>
      o.id === orderId ||
      o.jobCardNumber === orderId ||
      o.prodOrderNumber === orderId ||
      o.salesOrderId === orderId
  );
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const order = all[idx];

  // HARD STAGE GUARD: Only orders transitioning from Queue to Molding (or currently in Molding) can have BOQ issued!
  const stageCheck = isOrderEligibleForBoqIssue(order);
  if (!stageCheck.eligible) {
    throw new IneligibleBoqStageError(`BLOCKED: ${stageCheck.reason}`, order.status);
  }

  const nowIso = new Date().toISOString();
  const batchId = input.batchId || `ISSUE-${Date.now()}`;
  const doorIdSet = new Set((input.doorIds || []).filter(Boolean));
  const gangName = input.gangName?.trim() || undefined;

  const matchedDoors = order.doors.filter(
    (door) =>
      doorIdSet.has(door.id) ||
      doorIdSet.has(door.doorId) ||
      doorIdSet.has(door.doorNumber)
  );

  // HARD DOOR STAGE GUARD: Disallow doors already passed molding
  const ineligibleDoors = matchedDoors.filter(
    (d) => d.stage && !BOQ_ELIGIBLE_STAGES.includes(d.stage as ProductionStage)
  );
  if (ineligibleDoors.length > 0) {
    const list = ineligibleDoors
      .map((d) => `${d.doorNumber} (${STAGE_DISPLAY_LABELS[d.stage as ProductionStage] || d.stage})`)
      .join(', ');
    throw new IneligibleBoqStageError(
      `BLOCKED: Door(s) ${list} in ${order.jobCardNumber} have already passed molding. Raw BOQ can only be issued for doors in Queue or Molding.`,
      order.status
    );
  }

  // HARD ZERO-DUPLICATE GUARD: Never allow issuing BOQ twice for any door already marked issued!
  const alreadyIssuedDoors = matchedDoors.filter((door) => Boolean(door.materialIssued));
  if (alreadyIssuedDoors.length > 0) {
    const dupDesc = alreadyIssuedDoors
      .map((d) => `${d.doorNumber}${d.materialIssueBatchId ? ` (${d.materialIssueBatchId})` : ''}`)
      .join(', ');
    throw new DuplicateBoqIssueError(
      `BLOCKED: Duplicate BOQ issue prevented! Door(s) ${dupDesc} in ${order.jobCardNumber} (${order.customerName}) already have BOQ issued. Undo the original voucher first if re-issue is genuinely required.`,
      alreadyIssuedDoors.map((d) => ({
        doorId: d.id || d.doorId,
        doorNumber: d.doorNumber,
        existingBatchId: d.materialIssueBatchId,
      }))
    );
  }

  const matchedCount = matchedDoors.length;
  const perDoorValue =
    matchedCount > 0 && Number.isFinite(Number(input.totalIssuedValue)) && Number(input.totalIssuedValue) > 0
      ? Math.round(Number(input.totalIssuedValue) / matchedCount)
      : undefined;

  const updatedDoors = order.doors.map((door) => {
    if (
      doorIdSet.has(door.id) ||
      doorIdSet.has(door.doorId) ||
      doorIdSet.has(door.doorNumber)
    ) {
      return {
        ...door,
        materialIssued: true,
        materialIssuedAt: nowIso,
        materialIssueBatchId: batchId,
        ...(gangName ? { materialIssuedToGang: gangName } : {}),
        ...(perDoorValue !== undefined ? { materialIssuedValue: perDoorValue } : {}),
      };
    }
    return door;
  });

  const allDoorsIssued =
    updatedDoors.length > 0 && updatedDoors.every((d) => Boolean(d.materialIssued));

  const updatedOrder: ProductionOrder = {
    ...order,
    boqIssuedAt: allDoorsIssued ? nowIso : null,
    doors: updatedDoors,
    updatedAt: nowIso,
  };

  all[idx] = updatedOrder;
  writeStore(all);
  return updatedOrder;
}

export async function unmarkDoorMaterialIssue(
  orderId: string,
  doorIds: string[],
  batchId?: string
): Promise<ProductionOrder> {
  await assertWriteAllowed('reverse door material issue');
  const all = readStore();
  const idx = all.findIndex(
    (o) =>
      o.id === orderId ||
      o.jobCardNumber === orderId ||
      o.prodOrderNumber === orderId ||
      o.salesOrderId === orderId
  );
  if (idx === -1) throw new Error(`Production order ${orderId} not found`);

  const order = all[idx];
  const nowIso = new Date().toISOString();
  const doorIdSet = new Set((doorIds || []).filter(Boolean));

  const updatedDoors = order.doors.map((door) => {
    const matchesBatch = Boolean(batchId && door.materialIssueBatchId === batchId);
    const matchesId =
      doorIdSet.has(door.id) ||
      doorIdSet.has(door.doorId) ||
      doorIdSet.has(door.doorNumber);
    if (matchesBatch || matchesId) {
      return {
        ...door,
        materialIssued: false,
        materialIssuedAt: undefined,
        materialIssueBatchId: undefined,
        materialIssuedToGang: undefined,
        materialIssuedValue: undefined,
      };
    }
    return door;
  });

  const allDoorsIssued =
    updatedDoors.length > 0 && updatedDoors.every((d) => Boolean(d.materialIssued));

  const updatedOrder: ProductionOrder = {
    ...order,
    boqIssuedAt: allDoorsIssued ? order.boqIssuedAt || nowIso : null,
    doors: updatedDoors,
    updatedAt: nowIso,
  };

  all[idx] = updatedOrder;
  writeStore(all);
  return updatedOrder;
}
