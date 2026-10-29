import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { assertWriteAllowed, isPostgresAvailable } from './dbSyncEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProductionStage =
  | 'QUEUED'
  | 'MOLDING'
  | 'CNC_ROUTING'
  | 'PU_COATING'
  | 'QA_INSPECTION'
  | 'COMPLETED';

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

export interface ProductionDoorItem {
  id: string;
  doorId: string; // e.g. EXM-DR-2026-1001
  doorNumber: string; // e.g. D1, Toilet 1
  model: string;
  rawHeightMm: number;
  rawWidthMm: number;
  finishedHeightMm: number;
  finishedWidthMm: number;
  handing: 'LH' | 'RH';
  lockType: string;
  finishColor: string;
  qcStatus: QcStatus;
  qrPayload: string;
  qcInspection?: QcInspectionRecord | null;
  stickerRemovedAt?: string | null;
  stickerRemovedBy?: string | null;
  stickerRemovalNotes?: string | null;
}

export interface ProductionOrder {
  id: string;
  prodOrderNumber: string; // PRD-2026-001
  jobCardNumber: string; // JC-2026-001
  salesOrderId?: string | null;
  measurementRef?: string | null;
  customerName: string;
  siteName: string;
  district: string;
  doorCategory: 'FRP_DOORS' | 'WPC_DOORS';
  quantity: number;
  lineAssigned: string;
  batchNumber: string;
  priority: ProductionPriority;
  status: ProductionStage;
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
  customerName: string;
  siteName: string;
  district: string;
  doorCategory?: 'FRP_DOORS' | 'WPC_DOORS';
  lineAssigned?: string;
  priority?: ProductionPriority;
  tolerances?: {
    heightDeductionMm?: number;
    widthDeductionMm?: number;
  };
  doors: Array<{
    doorNumber: string;
    model: string;
    rawHeightMm: number;
    rawWidthMm: number;
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

const STORE_PATH = path.join(process.cwd(), 'data', 'production-store.json');

function readStore(): ProductionOrder[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductionOrder[]) : [];
  } catch {
    return [];
  }
}

function writeStore(orders: ProductionOrder[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(orders, null, 2), 'utf8');
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
    customerName: input.customerName,
    siteName: input.siteName,
    district: input.district,
    doorCategory: input.doorCategory || 'FRP_DOORS',
    quantity: doors.length,
    lineAssigned: input.lineAssigned || 'Line 1: FRP Hydraulic Press (300 Ton)',
    batchNumber,
    priority: input.priority || 'NORMAL',
    status: 'QUEUED',
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

export async function updateProductionStage(id: string, stage: ProductionStage): Promise<ProductionOrder> {
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
    // Auto-mark remaining doors as PASSED in QC upon completion if not rejected
    order.doors.forEach((d) => {
      if (d.qcStatus === 'PENDING') d.qcStatus = 'PASSED';
    });
  }

  const updated: ProductionOrder = {
    ...order,
    status: stage,
    startedAt,
    completedAt,
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

export async function deleteProductionOrder(id: string): Promise<boolean> {
  await assertWriteAllowed('delete production order');

  const all = readStore();
  const filtered = all.filter((o) => o.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}
