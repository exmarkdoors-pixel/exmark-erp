import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { recordDoorSaleAchievement } from './salesTargetService';

export type StockItemType = 'DOOR_AND_FRAME' | 'DOOR_ONLY' | 'FRAME_ONLY';
export type StockDoorStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type StockCondition =
  | 'OLD_STOCK'
  | 'CANCELLED_JOB'
  | 'SURPLUS_PRODUCTION'
  | 'SHOWROOM_DISPLAY'
  | 'FACTORY_OUTLET'
  | 'RETURNED_DELIVERY';

export interface ReadyStockDoor {
  id: string; // e.g. "stk-dr-17951710001-1234"
  stockCode: string; // e.g. "STK-001"
  itemType: StockItemType; // 'DOOR_AND_FRAME' | 'DOOR_ONLY' | 'FRAME_ONLY'

  // Door Slab Specs (applicable if DOOR_AND_FRAME or DOOR_ONLY)
  doorModelName?: string;
  doorCategory?: 'FRP_DOORS' | 'WPC_DOORS';
  doorHeightMm?: number;
  doorWidthMm?: number;
  doorThicknessMm?: number;
  doorFinishColor?: string;
  isDoorRepaintable?: boolean;
  handing?: 'LH' | 'RH' | 'UNIVERSAL';
  lockCutoutStatus?: 'UNCUT' | 'PRE_CUT';
  lockType?: string;

  // Frame Specs (applicable if DOOR_AND_FRAME or FRAME_ONLY)
  frameTypeName?: string; // e.g. WPC Solid Extruded 100×65mm, FRP C-Channel
  frameHeightMm?: number; // Outer masonry height
  frameWidthMm?: number; // Outer masonry width
  frameWallThickness?: string; // 100mm, 125mm
  frameFinishColor?: string;
  isFrameRepaintable?: boolean;

  // Shared Stock Metadata
  quantity: number;
  rackLocation: string; // e.g. "Godown Bay 2 / Rack A"
  condition: StockCondition;
  sellingPrice: number;
  originalCostValuation?: number;
  status: StockDoorStatus;
  reservedForRef?: string | null;
  reservedForCustomer?: string | null;
  notes?: string;

  // Delivery Return provenance metadata
  returnedFromJobCard?: string;
  returnedCustomerName?: string;
  returnReason?: string;
  returnedAt?: string;

  // Sales and Leaderboard tracking
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  salePrice?: number;
  soldToCustomer?: string;
  soldAt?: string;

  // Frame calculation provenance
  frameOpeningHeightMm?: number;
  frameOpeningWidthMm?: number;
  frameProfile?: string;
  floorCondition?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateReadyStockDoorInput {
  itemType: StockItemType;
  stockCode?: string;
  doorModelName?: string;
  doorCategory?: 'FRP_DOORS' | 'WPC_DOORS';
  doorHeightMm?: number;
  doorWidthMm?: number;
  doorThicknessMm?: number;
  doorFinishColor?: string;
  isDoorRepaintable?: boolean;
  handing?: 'LH' | 'RH' | 'UNIVERSAL';
  lockCutoutStatus?: 'UNCUT' | 'PRE_CUT';
  lockType?: string;

  frameTypeName?: string;
  frameHeightMm?: number;
  frameWidthMm?: number;
  frameWallThickness?: string;
  frameFinishColor?: string;
  isFrameRepaintable?: boolean;

  quantity?: number;
  rackLocation?: string;
  condition?: StockCondition;
  sellingPrice?: number;
  originalCostValuation?: number;
  notes?: string;

  // Provenance & Sales attributes
  returnedFromJobCard?: string;
  returnedCustomerName?: string;
  returnReason?: string;
  returnedAt?: string;
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  salePrice?: number;
  soldToCustomer?: string;
  soldAt?: string;
  frameOpeningHeightMm?: number;
  frameOpeningWidthMm?: number;
  frameProfile?: string;
  floorCondition?: string;
}

export interface StockMatchQuery {
  targetDoorHeightMm?: number;
  targetDoorWidthMm?: number;
  targetFrameHeightMm?: number;
  targetFrameWidthMm?: number;
  targetModel?: string;
  targetColor?: string;
  toleranceMm?: number; // default 10mm
  requestType?: 'ANY' | 'DOOR_AND_FRAME' | 'DOOR_ONLY' | 'FRAME_ONLY';
}

export interface StockMatchResult {
  door: ReadyStockDoor;
  matchType: 'FULL_SET' | 'DOOR_ONLY' | 'FRAME_ONLY';
  doorHeightDeltaMm?: number; // stock - target
  doorWidthDeltaMm?: number; // stock - target
  frameHeightDeltaMm?: number;
  frameWidthDeltaMm?: number;
  fitQuality: 'PERFECT_MATCH' | 'CLOSE_FIT' | 'TRIMMABLE';
  colorStatus: 'EXACT_COLOR' | 'REPAINTABLE';
  colorNote: string;
  fittingRecommendation: string;
}

const getStorePath = () => getDataFilePath('ready-stock-doors-store.json');

function ensureFileExists(): void {
  const filePath = getStorePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_SAMPLE_STOCK, null, 2), 'utf-8');
  }
}

function readStore(): ReadyStockDoor[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading ready-stock-doors-store.json:', err);
    return [];
  }
}

function writeStore(items: ReadyStockDoor[]): void {
  ensureFileExists();
  fs.writeFileSync(getStorePath(), JSON.stringify(items, null, 2), 'utf-8');
}

function generateStockCode(existingItems: ReadyStockDoor[]): string {
  const count = existingItems.length + 1;
  return `STK-${String(count).padStart(3, '0')}`;
}

export async function listReadyStockDoors(filter?: {
  status?: string;
  itemType?: string;
  search?: string;
  condition?: string;
}): Promise<ReadyStockDoor[]> {
  let all = readStore();

  if (filter?.status && filter.status !== 'ALL') {
    all = all.filter((d) => d.status === filter.status);
  }

  if (filter?.itemType && filter.itemType !== 'ALL') {
    all = all.filter((d) => d.itemType === filter.itemType);
  }

  if (filter?.condition && filter.condition !== 'ALL') {
    all = all.filter((d) => d.condition === filter.condition);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    all = all.filter(
      (d) =>
        d.stockCode.toLowerCase().includes(q) ||
        (d.doorModelName && d.doorModelName.toLowerCase().includes(q)) ||
        (d.frameTypeName && d.frameTypeName.toLowerCase().includes(q)) ||
        (d.doorFinishColor && d.doorFinishColor.toLowerCase().includes(q)) ||
        (d.rackLocation && d.rackLocation.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q))
    );
  }

  return all;
}

export async function getReadyStockDoor(id: string): Promise<ReadyStockDoor | null> {
  const all = readStore();
  const search = id.trim().toUpperCase();
  return all.find((d) => d.id === id || (d.stockCode && d.stockCode.toUpperCase() === search)) || null;
}

export async function createReadyStockDoor(
  input: CreateReadyStockDoorInput
): Promise<ReadyStockDoor> {
  const all = readStore();
  const id = `stk-dr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const stockCode = input.stockCode || generateStockCode(all);

  const newItem: ReadyStockDoor = {
    id,
    stockCode,
    itemType: input.itemType,
    doorModelName: input.doorModelName,
    doorCategory: input.doorCategory || 'FRP_DOORS',
    doorHeightMm: input.doorHeightMm ? Number(input.doorHeightMm) : undefined,
    doorWidthMm: input.doorWidthMm ? Number(input.doorWidthMm) : undefined,
    doorThicknessMm: input.doorThicknessMm ? Number(input.doorThicknessMm) : 32,
    doorFinishColor: input.doorFinishColor || 'Natural Teak',
    isDoorRepaintable: input.isDoorRepaintable !== false,
    handing: input.handing || 'UNIVERSAL',
    lockCutoutStatus: input.lockCutoutStatus || 'UNCUT',
    lockType: input.lockType,

    frameTypeName: input.frameTypeName,
    frameHeightMm: input.frameHeightMm ? Number(input.frameHeightMm) : undefined,
    frameWidthMm: input.frameWidthMm ? Number(input.frameWidthMm) : undefined,
    frameWallThickness: input.frameWallThickness || '100mm',
    frameFinishColor: input.frameFinishColor || input.doorFinishColor || 'Natural Teak',
    isFrameRepaintable: input.isFrameRepaintable !== false,

    quantity: Math.max(1, Number(input.quantity) || 1),
    rackLocation: input.rackLocation || 'Godown Bay 1',
    condition: input.condition || 'OLD_STOCK',
    sellingPrice: Number(input.sellingPrice) || 6500,
    originalCostValuation: Number(input.originalCostValuation) || 3300,
    status: 'AVAILABLE',
    notes: input.notes,

    returnedFromJobCard: input.returnedFromJobCard,
    returnedCustomerName: input.returnedCustomerName,
    returnReason: input.returnReason,
    returnedAt: input.returnedAt,

    salespersonId: input.salespersonId,
    salespersonName: input.salespersonName,
    salespersonCode: input.salespersonCode,
    salePrice: input.salePrice,
    soldToCustomer: input.soldToCustomer,
    soldAt: input.soldAt,

    frameOpeningHeightMm: input.frameOpeningHeightMm ? Number(input.frameOpeningHeightMm) : undefined,
    frameOpeningWidthMm: input.frameOpeningWidthMm ? Number(input.frameOpeningWidthMm) : undefined,
    frameProfile: input.frameProfile,
    floorCondition: input.floorCondition,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all.unshift(newItem);
  writeStore(all);
  return newItem;
}

export async function updateReadyStockDoor(
  id: string,
  patch: Partial<ReadyStockDoor>
): Promise<ReadyStockDoor> {
  const all = readStore();
  const idx = all.findIndex((d) => d.id === id || d.stockCode === id);
  if (idx === -1) throw new Error(`Stock door with ID ${id} not found.`);

  const updated: ReadyStockDoor = {
    ...all[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function deleteReadyStockDoor(id: string): Promise<boolean> {
  const all = readStore();
  const filtered = all.filter((d) => d.id !== id && d.stockCode !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}

/**
 * High-Speed Smart Approximate Dimension Matcher
 * Compares target door and/or frame dimensions against all AVAILABLE stock doors.
 */
export async function matchStockDoors(query: StockMatchQuery): Promise<{
  totalMatches: number;
  fullSetMatches: StockMatchResult[];
  doorOnlyMatches: StockMatchResult[];
  frameOnlyMatches: StockMatchResult[];
}> {
  const all = readStore();
  const available = all.filter((d) => d.status === 'AVAILABLE' && d.quantity > 0);
  const tolerance = query.toleranceMm !== undefined ? Number(query.toleranceMm) : 10;

  const targetDoorH = query.targetDoorHeightMm ? Number(query.targetDoorHeightMm) : undefined;
  const targetDoorW = query.targetDoorWidthMm ? Number(query.targetDoorWidthMm) : undefined;
  const targetFrameH = query.targetFrameHeightMm ? Number(query.targetFrameHeightMm) : undefined;
  const targetFrameW = query.targetFrameWidthMm ? Number(query.targetFrameWidthMm) : undefined;
  const targetColor = query.targetColor?.toLowerCase().trim();

  const fullSetMatches: StockMatchResult[] = [];
  const doorOnlyMatches: StockMatchResult[] = [];
  const frameOnlyMatches: StockMatchResult[] = [];

  for (const item of available) {
    // 1. Evaluate Door Slab match
    let doorMatches = false;
    let doorHDelta = 0;
    let doorWDelta = 0;
    let doorFitQuality: 'PERFECT_MATCH' | 'CLOSE_FIT' | 'TRIMMABLE' = 'PERFECT_MATCH';

    if (
      (item.itemType === 'DOOR_AND_FRAME' || item.itemType === 'DOOR_ONLY') &&
      item.doorHeightMm &&
      item.doorWidthMm &&
      targetDoorH &&
      targetDoorW
    ) {
      doorHDelta = item.doorHeightMm - targetDoorH;
      doorWDelta = item.doorWidthMm - targetDoorW;
      const absH = Math.abs(doorHDelta);
      const absW = Math.abs(doorWDelta);

      if (absH <= tolerance && absW <= tolerance) {
        doorMatches = true;
        if (absH <= 2 && absW <= 2) {
          doorFitQuality = 'PERFECT_MATCH';
        } else if (absH <= 5 && absW <= 5) {
          doorFitQuality = 'CLOSE_FIT';
        } else {
          doorFitQuality = 'TRIMMABLE';
        }
      }
    }

    // 2. Evaluate Frame match
    let frameMatches = false;
    let frameHDelta = 0;
    let frameWDelta = 0;
    let frameFitQuality: 'PERFECT_MATCH' | 'CLOSE_FIT' | 'TRIMMABLE' = 'PERFECT_MATCH';

    if (
      (item.itemType === 'DOOR_AND_FRAME' || item.itemType === 'FRAME_ONLY') &&
      item.frameHeightMm &&
      item.frameWidthMm &&
      targetFrameH &&
      targetFrameW
    ) {
      frameHDelta = item.frameHeightMm - targetFrameH;
      frameWDelta = item.frameWidthMm - targetFrameW;
      const absH = Math.abs(frameHDelta);
      const absW = Math.abs(frameWDelta);

      if (absH <= tolerance && absW <= tolerance) {
        frameMatches = true;
        if (absH <= 2 && absW <= 2) {
          frameFitQuality = 'PERFECT_MATCH';
        } else if (absH <= 5 && absW <= 5) {
          frameFitQuality = 'CLOSE_FIT';
        } else {
          frameFitQuality = 'TRIMMABLE';
        }
      }
    }

    // 3. Evaluate Color Compatibility
    const currentColor = item.doorFinishColor || item.frameFinishColor || 'Standard';
    const isExactColor = targetColor ? currentColor.toLowerCase().includes(targetColor) : true;
    const colorStatus: 'EXACT_COLOR' | 'REPAINTABLE' = isExactColor ? 'EXACT_COLOR' : 'REPAINTABLE';
    const colorNote = isExactColor
      ? `✓ Exact Color (${currentColor})`
      : `🎨 Currently ${currentColor} — Can be easily repainted to ${query.targetColor || 'desired color'} in Spray Booth!`;

    // 4. Construct Recommendations
    const buildRecommendation = (type: 'FULL_SET' | 'DOOR_ONLY' | 'FRAME_ONLY', hDelta: number, wDelta: number) => {
      const parts: string[] = [];
      if (Math.abs(hDelta) <= 2 && Math.abs(wDelta) <= 2) {
        parts.push('Perfect match (≤2mm difference, exact fit without alterations).');
      } else if (wDelta > 0 && wDelta <= 10) {
        parts.push(`Stock is ${wDelta}mm wider — can easily be planed down on cutting bench.`);
      } else if (wDelta < 0 && Math.abs(wDelta) <= 4) {
        parts.push(`Stock is ${Math.abs(wDelta)}mm smaller — frame rebate clearance easily covers this.`);
      } else {
        parts.push(`Close approximate fit (ΔH:${hDelta > 0 ? '+' : ''}${hDelta}mm, ΔW:${wDelta > 0 ? '+' : ''}${wDelta}mm).`);
      }
      return parts.join(' ');
    };

    // Sort into Match Categories
    if (item.itemType === 'DOOR_AND_FRAME') {
      if (doorMatches && (frameMatches || !targetFrameH)) {
        fullSetMatches.push({
          door: item,
          matchType: 'FULL_SET',
          doorHeightDeltaMm: doorHDelta,
          doorWidthDeltaMm: doorWDelta,
          frameHeightDeltaMm: frameMatches ? frameHDelta : undefined,
          frameWidthDeltaMm: frameMatches ? frameWDelta : undefined,
          fitQuality: doorFitQuality,
          colorStatus,
          colorNote,
          fittingRecommendation: buildRecommendation('FULL_SET', doorHDelta, doorWDelta),
        });
      } else if (doorMatches) {
        doorOnlyMatches.push({
          door: item,
          matchType: 'DOOR_ONLY',
          doorHeightDeltaMm: doorHDelta,
          doorWidthDeltaMm: doorWDelta,
          fitQuality: doorFitQuality,
          colorStatus,
          colorNote,
          fittingRecommendation: `${buildRecommendation('DOOR_ONLY', doorHDelta, doorWDelta)} (Take door from set, mold fresh frame).`,
        });
      } else if (frameMatches) {
        frameOnlyMatches.push({
          door: item,
          matchType: 'FRAME_ONLY',
          frameHeightDeltaMm: frameHDelta,
          frameWidthDeltaMm: frameWDelta,
          fitQuality: frameFitQuality,
          colorStatus,
          colorNote,
          fittingRecommendation: `${buildRecommendation('FRAME_ONLY', frameHDelta, frameWDelta)} (Take frame from set, mold fresh door).`,
        });
      }
    } else if (item.itemType === 'DOOR_ONLY' && doorMatches) {
      doorOnlyMatches.push({
        door: item,
        matchType: 'DOOR_ONLY',
        doorHeightDeltaMm: doorHDelta,
        doorWidthDeltaMm: doorWDelta,
        fitQuality: doorFitQuality,
        colorStatus,
        colorNote,
        fittingRecommendation: buildRecommendation('DOOR_ONLY', doorHDelta, doorWDelta),
      });
    } else if (item.itemType === 'FRAME_ONLY' && frameMatches) {
      frameOnlyMatches.push({
        door: item,
        matchType: 'FRAME_ONLY',
        frameHeightDeltaMm: frameHDelta,
        frameWidthDeltaMm: frameWDelta,
        fitQuality: frameFitQuality,
        colorStatus,
        colorNote,
        fittingRecommendation: buildRecommendation('FRAME_ONLY', frameHDelta, frameWDelta),
      });
    }
  }

  // Sort each bucket by closest fit
  const sortQuality = (a: StockMatchResult, b: StockMatchResult) => {
    const deltaA = Math.abs(a.doorWidthDeltaMm || a.frameWidthDeltaMm || 0) + Math.abs(a.doorHeightDeltaMm || a.frameHeightDeltaMm || 0);
    const deltaB = Math.abs(b.doorWidthDeltaMm || b.frameWidthDeltaMm || 0) + Math.abs(b.doorHeightDeltaMm || b.frameHeightDeltaMm || 0);
    return deltaA - deltaB;
  };

  fullSetMatches.sort(sortQuality);
  doorOnlyMatches.sort(sortQuality);
  frameOnlyMatches.sort(sortQuality);

  const totalMatches = fullSetMatches.length + doorOnlyMatches.length + frameOnlyMatches.length;
  return { totalMatches, fullSetMatches, doorOnlyMatches, frameOnlyMatches };
}

export async function allocateStockDoor(
  id: string,
  referenceNo: string,
  customerName: string
): Promise<ReadyStockDoor> {
  const all = readStore();
  const idx = all.findIndex((d) => d.id === id || d.stockCode === id);
  if (idx === -1) throw new Error(`Stock door ${id} not found.`);

  const item = all[idx];
  if (item.status === 'SOLD') throw new Error(`Stock door ${item.stockCode} is already sold.`);

  item.status = 'RESERVED';
  item.reservedForRef = referenceNo;
  item.reservedForCustomer = customerName;
  item.updatedAt = new Date().toISOString();

  all[idx] = item;
  writeStore(all);
  return item;
}

export async function releaseStockDoor(id: string): Promise<ReadyStockDoor> {
  const all = readStore();
  const idx = all.findIndex((d) => d.id === id || d.stockCode === id);
  if (idx === -1) throw new Error(`Stock door ${id} not found.`);

  all[idx].status = 'AVAILABLE';
  all[idx].reservedForRef = null;
  all[idx].reservedForCustomer = null;
  all[idx].updatedAt = new Date().toISOString();

  writeStore(all);
  return all[idx];
}

export interface ReturnDeliveredDoorInput {
  jobCardNumber?: string;
  customerName: string;
  itemType?: StockItemType;
  doorModelName?: string;
  doorCategory?: 'FRP_DOORS' | 'WPC_DOORS';
  doorHeightMm?: number;
  doorWidthMm?: number;
  doorThicknessMm?: number;
  doorFinishColor?: string;
  handing?: 'LH' | 'RH' | 'UNIVERSAL';
  lockCutoutStatus?: 'UNCUT' | 'PRE_CUT';
  lockType?: string;

  frameTypeName?: string;
  frameHeightMm?: number;
  frameWidthMm?: number;
  frameWallThickness?: string;
  frameFinishColor?: string;

  quantity?: number;
  returnReason: string;
  rackLocation: string;
  resalePrice: number;
  originalCostValuation?: number;
  notes?: string;

  salespersonId?: string;
  salespersonCode?: string;
  salespersonName?: string;
  adjustSalespersonTarget?: boolean;
}

/**
 * Restocks a door returned from site after delivery.
 * Records return provenance, marks condition as RETURNED_DELIVERY, and optionally adjusts salesperson quota.
 */
export async function returnDeliveredDoorToStock(
  input: ReturnDeliveredDoorInput
): Promise<ReadyStockDoor> {
  const returnNotes = [
    input.notes ? input.notes.trim() : '',
    `[RETURNED FROM DELIVERY] JobCard: ${input.jobCardNumber || 'N/A'} | Customer: ${input.customerName} | Reason: ${input.returnReason}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const door = await createReadyStockDoor({
    itemType: input.itemType || 'DOOR_ONLY',
    doorModelName: input.doorModelName || 'Returned Custom FRP/WPC Door',
    doorCategory: input.doorCategory || 'FRP_DOORS',
    doorHeightMm: input.doorHeightMm,
    doorWidthMm: input.doorWidthMm,
    doorThicknessMm: input.doorThicknessMm || 32,
    doorFinishColor: input.doorFinishColor || 'Natural Wood / Factory Finish',
    handing: input.handing || 'UNIVERSAL',
    lockCutoutStatus: input.lockCutoutStatus || 'PRE_CUT',
    lockType: input.lockType,

    frameTypeName: input.frameTypeName,
    frameHeightMm: input.frameHeightMm,
    frameWidthMm: input.frameWidthMm,
    frameWallThickness: input.frameWallThickness,
    frameFinishColor: input.frameFinishColor,

    quantity: Math.max(1, Number(input.quantity) || 1),
    rackLocation: input.rackLocation || 'Return Bay R-1',
    condition: 'RETURNED_DELIVERY',
    sellingPrice: Number(input.resalePrice) || 4500,
    originalCostValuation: Number(input.originalCostValuation) || 2500,
    notes: returnNotes,

    returnedFromJobCard: input.jobCardNumber,
    returnedCustomerName: input.customerName,
    returnReason: input.returnReason,
    returnedAt: new Date().toISOString(),
    salespersonId: input.salespersonId,
    salespersonName: input.salespersonName,
    salespersonCode: input.salespersonCode,
  });

  // If user selected to adjust salesperson target/quota on return:
  if (input.adjustSalespersonTarget && input.salespersonId) {
    try {
      await recordDoorSaleAchievement({
        salespersonId: input.salespersonId,
        salespersonCode: input.salespersonCode,
        salespersonName: input.salespersonName,
        doorCount: -(door.quantity || 1),
        saleValue: -Number(door.sellingPrice || 0),
        orderRef: input.jobCardNumber || door.stockCode,
        customerName: input.customerName,
        isReturn: true,
      });
    } catch (err) {
      console.error('Failed to deduct sales target for return:', err);
    }
  }

  return door;
}

export interface SellStockDoorInput {
  id: string;
  salePrice: number;
  customerName: string;
  salespersonId?: string;
  salespersonCode?: string;
  salespersonName?: string;
  notes?: string;
}

/**
 * Sells / dispatches a ready stock door to a customer.
 * Marks door as SOLD and immediately credits the salesperson's achieved revenue and door count on the Sales Leaderboard.
 */
export async function sellStockDoor(input: SellStockDoorInput): Promise<ReadyStockDoor> {
  const all = readStore();
  const idx = all.findIndex((d) => d.id === input.id || d.stockCode === input.id);
  if (idx === -1) throw new Error(`Stock door ${input.id} not found.`);

  const item = all[idx];
  if (item.status === 'SOLD') throw new Error(`Stock door ${item.stockCode} is already sold.`);

  const now = new Date().toISOString();
  item.status = 'SOLD';
  item.salePrice = Number(input.salePrice) || item.sellingPrice;
  item.soldToCustomer = input.customerName;
  item.soldAt = now;
  item.reservedForCustomer = input.customerName;
  item.salespersonId = input.salespersonId;
  item.salespersonCode = input.salespersonCode;
  item.salespersonName = input.salespersonName;
  if (input.notes) {
    item.notes = item.notes ? `${item.notes} | [SOLD]: ${input.notes}` : `[SOLD]: ${input.notes}`;
  }
  item.updatedAt = now;

  all[idx] = item;
  writeStore(all);

  // Auto update sales leaderboard and rep targets
  if (input.salespersonId) {
    try {
      await recordDoorSaleAchievement({
        salespersonId: input.salespersonId,
        salespersonCode: input.salespersonCode,
        salespersonName: input.salespersonName,
        doorCount: item.quantity || 1,
        saleValue: item.salePrice,
        orderRef: item.stockCode,
        customerName: input.customerName,
        isReturn: false,
      });
    } catch (err) {
      console.error('Failed to update sales target for stock door sale:', err);
    }
  }

  return item;
}

const DEFAULT_SAMPLE_STOCK: ReadyStockDoor[] = [
  {
    id: 'stk-dr-sample-1',
    stockCode: 'STK-001',
    itemType: 'DOOR_AND_FRAME',
    doorModelName: '32mm Molded Teak FRP Door',
    doorCategory: 'FRP_DOORS',
    doorHeightMm: 2085,
    doorWidthMm: 815,
    doorThicknessMm: 32,
    doorFinishColor: 'Frost White',
    isDoorRepaintable: true,
    handing: 'UNIVERSAL',
    lockCutoutStatus: 'UNCUT',
    frameTypeName: 'WPC Solid Extruded 100×65mm',
    frameHeightMm: 2100,
    frameWidthMm: 900,
    frameWallThickness: '100mm',
    frameFinishColor: 'Frost White',
    isFrameRepaintable: true,
    quantity: 1,
    rackLocation: 'Godown Bay 2 / Rack A',
    condition: 'OLD_STOCK',
    sellingPrice: 7800,
    originalCostValuation: 3300,
    status: 'AVAILABLE',
    notes: 'Complete set from previous showroom display. Perfect condition. Repaintable to any color in spray booth.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stk-dr-sample-2',
    stockCode: 'STK-002',
    itemType: 'DOOR_ONLY',
    doorModelName: '30mm Solid Waterproof Bathroom Flush',
    doorCategory: 'FRP_DOORS',
    doorHeightMm: 2050,
    doorWidthMm: 750,
    doorThicknessMm: 30,
    doorFinishColor: 'Burma Teak',
    isDoorRepaintable: true,
    handing: 'LH',
    lockCutoutStatus: 'UNCUT',
    quantity: 2,
    rackLocation: 'Godown Bay 1 / Rack C',
    condition: 'CANCELLED_JOB',
    sellingPrice: 5800,
    originalCostValuation: 2800,
    status: 'AVAILABLE',
    notes: 'Cancelled job door slabs. Waterproof PU core. Ready to fit.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stk-dr-sample-3',
    stockCode: 'STK-003',
    itemType: 'FRAME_ONLY',
    frameTypeName: 'WPC Heavy Extruded 125×65mm Frame',
    frameHeightMm: 2100,
    frameWidthMm: 900,
    frameWallThickness: '125mm',
    frameFinishColor: 'Rosewood',
    isFrameRepaintable: true,
    quantity: 1,
    rackLocation: 'Timber Bay 3 / Stand B',
    condition: 'SURPLUS_PRODUCTION',
    sellingPrice: 2800,
    originalCostValuation: 1400,
    status: 'AVAILABLE',
    notes: 'Extra extruded frame from project batch. Can be rebated or planed.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
