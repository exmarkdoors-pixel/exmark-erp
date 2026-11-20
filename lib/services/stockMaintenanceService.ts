import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { assertWriteAllowed } from './dbSyncEngine';
import {
  ProductionStage,
  STAGE_DISPLAY_LABELS,
} from '../utils/productionStages';
import { ProductionOrder } from './productionService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockMaintenanceConfig {
  consistentTargetValuation: number; // default ₹25,00,000
  currency: string;
  autoDeductBoqMaterials: boolean;
  lowStockAlertEmail?: string;
  lowStockThresholdPercent: number;
  updatedAt: string;
}

export type RawMaterialCategory =
  | 'Chemicals'
  | 'Fiberglass'
  | 'Pigments'
  | 'Core & Structural'
  | 'Hardware'
  | 'Consumables';

export interface RawMaterialStockItem {
  id: string;
  itemCode: string;
  name: string;
  category: RawMaterialCategory;
  currentStock: number;
  unit: string;
  minSafetyBuffer: number;
  targetStock: number;
  reorderLevel: number;
  unitCost: number;
  warehouseLocation: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL';
  updatedAt: string;
}

export interface WipStageStockItem {
  stage: ProductionStage;
  stageLabel: string;
  orderCount: number;
  doorCount: number;
  totalSqFt: number;
  rawMaterialValue: number;
  contractorLaborValue: number;
  totalAccruedValuation: number;
  orders: Array<{
    id: string;
    jobCardNumber: string;
    customerName: string;
    doorsCount: number;
    sqFt: number;
    boqIssued: boolean;
  }>;
}

export interface FinishedGoodsBufferItem {
  id: string;
  sku: string;
  modelCode: string;
  modelName: string;
  category: string;
  sizeLabel: string;
  heightCm: number;
  widthCm: number;
  finishColor: string;
  handing: 'LH' | 'RH' | 'UNIVERSAL';
  minBufferTarget: number;
  currentBalance: number;
  reservedCount: number;
  availableBalance: number;
  unitValuation: number;
  totalValuation: number;
  deficitCount: number;
  status: 'HEALTHY' | 'LOW_BUFFER' | 'OUT_OF_STOCK';
  updatedAt: string;
}

export interface ReorderRecommendation {
  type: 'RAW_MATERIAL' | 'FINISHED_GOODS';
  itemId: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  targetStock: number;
  suggestedReorderQty: number;
  unit: string;
  unitCost: number;
  estimatedCost: number;
  urgency: 'HIGH' | 'MEDIUM';
}

export interface CreateRawMaterialInput {
  itemCode?: string;
  name: string;
  category: RawMaterialCategory;
  currentStock: number;
  unit: string;
  minSafetyBuffer?: number;
  targetStock?: number;
  reorderLevel?: number;
  unitCost: number;
  warehouseLocation?: string;
}

export interface UpdateRawMaterialInput {
  name?: string;
  category?: RawMaterialCategory;
  unit?: string;
  minSafetyBuffer?: number;
  targetStock?: number;
  unitCost?: number;
  warehouseLocation?: string;
  currentStock?: number;
}

export interface ReworkStationItem {
  orderId: string;
  jobCardNumber: string;
  customerName: string;
  doorNumber?: string;
  doorId?: string;
  reworkReason?: string;
  defectType?: string;
  reportedAt?: string;
  gangName?: string;
}

export interface ReworkStationSummary {
  reworkDoorsCount: number;
  reworkOrdersCount: number;
  totalReworkCost: number;
  items: ReworkStationItem[];
}

export interface IssueReworkMaterialInput {
  prodOrderId: string;
  jobCardNumber?: string;
  customerName?: string;
  reason: string;
  issuedBy?: string;
  items: Array<{
    name: string;
    qty: number;
    unit?: string;
    unitCost?: number;
  }>;
}

export interface CompanyStockOverview {
  consistentTargetValuation: number;
  totalInventoryValuation: number;
  valuationSurplusDeficit: number;
  healthStatus: 'HEALTHY_BUFFER' | 'ON_TRACK' | 'DEFICIT_WARNING';
  rawMaterialsSummary: {
    totalValue: number;
    skuCount: number;
    lowStockCount: number;
    criticalCount: number;
  };
  wipSummary: {
    totalValue: number;
    activeOrdersCount: number;
    totalDoorsInPipeline: number;
    stages: WipStageStockItem[];
    reworkStation?: ReworkStationSummary;
  };
  finishedGoodsSummary: {
    totalValue: number;
    totalBufferDoors: number;
    availableDoors: number;
    reservedDoors: number;
    deficitCount: number;
  };
  reorderRecommendations: ReorderRecommendation[];
}

// ── Default Seed Data ────────────────────────────────────────────────────────

export const DEFAULT_STOCK_CONFIG: StockMaintenanceConfig = {
  consistentTargetValuation: 2500000, // ₹25 Lakhs Baseline
  currency: 'INR',
  autoDeductBoqMaterials: true,
  lowStockThresholdPercent: 30,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_RAW_MATERIALS: RawMaterialStockItem[] = [
  // 🧪 Chemicals & Resins
  {
    id: 'inv-001',
    itemCode: 'RAW-RES-01',
    name: 'Isophthalic Polyester Resin (Grade A)',
    category: 'Chemicals',
    currentStock: 1200,
    unit: 'KG',
    minSafetyBuffer: 500,
    targetStock: 1500,
    reorderLevel: 600,
    unitCost: 195,
    warehouseLocation: 'Chemical Bay 1',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-002',
    itemCode: 'RAW-RES-02',
    name: 'General Purpose (GP) Laminating Resin',
    category: 'Chemicals',
    currentStock: 1400,
    unit: 'KG',
    minSafetyBuffer: 800,
    targetStock: 2000,
    reorderLevel: 900,
    unitCost: 180,
    warehouseLocation: 'Chemical Bay 1',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-003',
    itemCode: 'RAW-GEL-01',
    name: 'UV-Stabilized PU Gelcoat (White / Clear)',
    category: 'Chemicals',
    currentStock: 180,
    unit: 'KG',
    minSafetyBuffer: 100,
    targetStock: 300,
    reorderLevel: 120,
    unitCost: 320,
    warehouseLocation: 'Tinting Booth Bay',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-004',
    itemCode: 'CHM-CAT-01',
    name: 'MEKP Catalyst (Methyl Ethyl Ketone Peroxide)',
    category: 'Chemicals',
    currentStock: 45,
    unit: 'KG',
    minSafetyBuffer: 20,
    targetStock: 60,
    reorderLevel: 25,
    unitCost: 240,
    warehouseLocation: 'Flammable Store A',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-005',
    itemCode: 'CHM-ACC-01',
    name: 'Cobalt Accelerator Solution (6%)',
    category: 'Chemicals',
    currentStock: 30,
    unit: 'KG',
    minSafetyBuffer: 15,
    targetStock: 40,
    reorderLevel: 18,
    unitCost: 380,
    warehouseLocation: 'Flammable Store B',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },

  // 🧵 Reinforcements & Fiberglass
  {
    id: 'inv-006',
    itemCode: 'RAW-FBR-01',
    name: 'E-Glass Chopped Strand Mat (CSM 300)',
    category: 'Fiberglass',
    currentStock: 550,
    unit: 'KG',
    minSafetyBuffer: 300,
    targetStock: 800,
    reorderLevel: 350,
    unitCost: 165,
    warehouseLocation: 'Fiber Bay 2',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-007',
    itemCode: 'RAW-FBR-02',
    name: 'E-Glass Chopped Strand Mat (CSM 450)',
    category: 'Fiberglass',
    currentStock: 750,
    unit: 'KG',
    minSafetyBuffer: 400,
    targetStock: 1000,
    reorderLevel: 450,
    unitCost: 160,
    warehouseLocation: 'Fiber Bay 2',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-008',
    itemCode: 'RAW-FBR-03',
    name: 'Woven Roving Glass Fabric (600 GSM)',
    category: 'Fiberglass',
    currentStock: 280,
    unit: 'KG',
    minSafetyBuffer: 150,
    targetStock: 400,
    reorderLevel: 180,
    unitCost: 185,
    warehouseLocation: 'Fiber Bay 2',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },

  // 🎨 Pigments & Paints
  {
    id: 'inv-009',
    itemCode: 'PIG-TEAK-01',
    name: 'Natural Teak EXGC-510 Pigment Paste',
    category: 'Pigments',
    currentStock: 35,
    unit: 'KG',
    minSafetyBuffer: 20,
    targetStock: 50,
    reorderLevel: 22,
    unitCost: 450,
    warehouseLocation: 'Tinting Bay',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-010',
    itemCode: 'PIG-ROSE-02',
    name: 'Rosewood EXGC-520 Pigment Paste',
    category: 'Pigments',
    currentStock: 25,
    unit: 'KG',
    minSafetyBuffer: 15,
    targetStock: 40,
    reorderLevel: 18,
    unitCost: 460,
    warehouseLocation: 'Tinting Bay',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-011',
    itemCode: 'PIG-WALN-03',
    name: 'Walnut EXGC-530 Pigment Paste',
    category: 'Pigments',
    currentStock: 22,
    unit: 'KG',
    minSafetyBuffer: 15,
    targetStock: 35,
    reorderLevel: 16,
    unitCost: 470,
    warehouseLocation: 'Tinting Bay',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },

  // 🪵 Core & Structural
  {
    id: 'inv-012',
    itemCode: 'CORE-FOAM-01',
    name: 'High-Density PU Foam Core Sheet (25mm)',
    category: 'Core & Structural',
    currentStock: 110,
    unit: 'Sheets',
    minSafetyBuffer: 50,
    targetStock: 150,
    reorderLevel: 60,
    unitCost: 550,
    warehouseLocation: 'Core Rack C-1',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-013',
    itemCode: 'CORE-TMB-01',
    name: 'Treated Hardwood / Pine Reinforcement Batten',
    category: 'Core & Structural',
    currentStock: 380,
    unit: 'Mtrs',
    minSafetyBuffer: 150,
    targetStock: 500,
    reorderLevel: 180,
    unitCost: 85,
    warehouseLocation: 'Carpentry Timber Yard',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-014',
    itemCode: 'FRM-REG-01',
    name: 'Regular Heavy FRP Frame Profile Extrusions',
    category: 'Core & Structural',
    currentStock: 420,
    unit: 'Rft',
    minSafetyBuffer: 200,
    targetStock: 600,
    reorderLevel: 250,
    unitCost: 120,
    warehouseLocation: 'Frame Extrusion Shed',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },

  // 🔐 Hardware & Locks
  {
    id: 'inv-015',
    itemCode: 'HRD-LCK-01',
    name: 'Baby Latch (Powder Coated Black)',
    category: 'Hardware',
    currentStock: 130,
    unit: 'Sets',
    minSafetyBuffer: 80,
    targetStock: 200,
    reorderLevel: 90,
    unitCost: 350,
    warehouseLocation: 'Hardware Bay H-1',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-016',
    itemCode: 'HRD-LCK-02',
    name: 'Mortise Door Lock Set (Brass Cylinder)',
    category: 'Hardware',
    currentStock: 65,
    unit: 'Sets',
    minSafetyBuffer: 40,
    targetStock: 100,
    reorderLevel: 45,
    unitCost: 1250,
    warehouseLocation: 'Hardware Secure Bay',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-017',
    itemCode: 'HRD-HNG-01',
    name: 'SS 304 Heavy Ball Bearing Hinges (5x3x3mm)',
    category: 'Hardware',
    currentStock: 210,
    unit: 'Pairs',
    minSafetyBuffer: 100,
    targetStock: 300,
    reorderLevel: 120,
    unitCost: 280,
    warehouseLocation: 'Hardware Bay H-2',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },

  // 🧰 Consumables
  {
    id: 'inv-018',
    itemCode: 'CSM-THN-01',
    name: 'NC Thinner / Acetone Cleaning Solvent',
    category: 'Consumables',
    currentStock: 95,
    unit: 'Ltrs',
    minSafetyBuffer: 50,
    targetStock: 150,
    reorderLevel: 60,
    unitCost: 130,
    warehouseLocation: 'Chemical Store C-3',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-019',
    itemCode: 'CSM-TAP-01',
    name: 'Industrial Masking Tape (2 inch)',
    category: 'Consumables',
    currentStock: 70,
    unit: 'Rolls',
    minSafetyBuffer: 30,
    targetStock: 100,
    reorderLevel: 35,
    unitCost: 65,
    warehouseLocation: 'Paint Shop Store',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-020',
    itemCode: 'CSM-SND-01',
    name: 'Abrasive Flap Sanding Discs #80 / #120',
    category: 'Consumables',
    currentStock: 85,
    unit: 'Pcs',
    minSafetyBuffer: 40,
    targetStock: 120,
    reorderLevel: 50,
    unitCost: 45,
    warehouseLocation: 'Finishing Tool Rack',
    status: 'IN_STOCK',
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_FINISHED_GOODS_BUFFER: FinishedGoodsBufferItem[] = [
  {
    id: 'fg-001',
    sku: 'FG-CLS-210X80-TK',
    modelCode: 'EXM-A-101',
    modelName: 'Classic Single Panel Plain (Room / Entrance)',
    category: 'CAT_A',
    sizeLabel: '210 × 80 cm',
    heightCm: 210,
    widthCm: 80,
    finishColor: 'Natural Teak EXGC-510',
    handing: 'UNIVERSAL',
    minBufferTarget: 10,
    currentBalance: 12,
    reservedCount: 4,
    availableBalance: 8,
    unitValuation: 6800,
    totalValuation: 81600,
    deficitCount: 0,
    status: 'HEALTHY',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fg-002',
    sku: 'FG-ROY-210X80-RW',
    modelCode: 'EXM-B-201',
    modelName: 'Kerala Royal Teak Woodgrain Embossed',
    category: 'CAT_B',
    sizeLabel: '210 × 80 cm',
    heightCm: 210,
    widthCm: 80,
    finishColor: 'Rosewood EXGC-520',
    handing: 'UNIVERSAL',
    minBufferTarget: 10,
    currentBalance: 8,
    reservedCount: 2,
    availableBalance: 6,
    unitValuation: 7600,
    totalValuation: 60800,
    deficitCount: 2,
    status: 'LOW_BUFFER',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fg-003',
    sku: 'FG-BTH-200X75-TK',
    modelCode: 'EXM-A-121',
    modelName: 'Waterproof Toilet / Bathroom Flush Door',
    category: 'CAT_A',
    sizeLabel: '200 × 75 cm',
    heightCm: 200,
    widthCm: 75,
    finishColor: 'Natural Teak EXGC-510',
    handing: 'UNIVERSAL',
    minBufferTarget: 15,
    currentBalance: 16,
    reservedCount: 5,
    availableBalance: 11,
    unitValuation: 5800,
    totalValuation: 92800,
    deficitCount: 0,
    status: 'HEALTHY',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fg-004',
    sku: 'FG-BTH-195X70-WH',
    modelCode: 'EXM-A-121',
    modelName: 'Compact Bathroom Waterproof Door',
    category: 'CAT_A',
    sizeLabel: '195 × 70 cm',
    heightCm: 195,
    widthCm: 70,
    finishColor: 'Pure White Marine Gelcoat',
    handing: 'UNIVERSAL',
    minBufferTarget: 10,
    currentBalance: 6,
    reservedCount: 1,
    availableBalance: 5,
    unitValuation: 5400,
    totalValuation: 32400,
    deficitCount: 4,
    status: 'LOW_BUFFER',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fg-005',
    sku: 'FG-GEO-208X78-WN',
    modelCode: 'EXM-B-202',
    modelName: 'Geometric 4-Panel Classic Bedroom Door',
    category: 'CAT_B',
    sizeLabel: '208 × 78 cm',
    heightCm: 208,
    widthCm: 78,
    finishColor: 'Walnut EXGC-530',
    handing: 'UNIVERSAL',
    minBufferTarget: 8,
    currentBalance: 9,
    reservedCount: 3,
    availableBalance: 6,
    unitValuation: 7600,
    totalValuation: 68400,
    deficitCount: 0,
    status: 'HEALTHY',
    updatedAt: new Date().toISOString(),
  },
];

// ── Store File Helpers ───────────────────────────────────────────────────────

const getConfigPath = () => getDataFilePath('stock-config.json');
const getInventoryPath = () => getDataFilePath('inventory-store.json');
const getFinishedGoodsPath = () => getDataFilePath('finished-goods-store.json');
const getProductionStorePath = () => getDataFilePath('production-store.json');

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[stockMaintenanceService] Failed to write ${filePath}:`, err);
  }
}

// ── Config Management ────────────────────────────────────────────────────────

export function getStockMaintenanceConfig(): StockMaintenanceConfig {
  return readJsonFile<StockMaintenanceConfig>(getConfigPath(), DEFAULT_STOCK_CONFIG);
}

export async function saveStockMaintenanceConfig(
  updates: Partial<StockMaintenanceConfig>
): Promise<StockMaintenanceConfig> {
  await assertWriteAllowed('save stock maintenance config');
  const current = getStockMaintenanceConfig();
  const next: StockMaintenanceConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile(getConfigPath(), next);
  return next;
}

export const updateStockMaintenanceConfig = saveStockMaintenanceConfig;

// ── Raw Materials Store Ledger ───────────────────────────────────────────────

export function getRawMaterialsInventory(): RawMaterialStockItem[] {
  let current = readJsonFile<RawMaterialStockItem[]>(getInventoryPath(), DEFAULT_RAW_MATERIALS);
  if (!Array.isArray(current) || current.length === 0) {
    writeJsonFile(getInventoryPath(), DEFAULT_RAW_MATERIALS);
    return DEFAULT_RAW_MATERIALS;
  }

  // Ensure items have proper status based on currentStock & minSafetyBuffer
  // Note: We do NOT re-merge DEFAULT_RAW_MATERIALS so that user-deleted demo items stay deleted,
  // and user-edited names/rates are permanently preserved!
  let mutated = false;
  const seenIds = new Set<string>();
  const normalized = current.map((item, idx) => {
    let itemId = item.id;
    if (!itemId || seenIds.has(itemId)) {
      mutated = true;
      const codePart = (item.itemCode || `rm-${idx}`).toLowerCase().replace(/[^a-z0-9]/g, '-');
      itemId = `inv-${codePart}-${idx + 1}`;
    }
    seenIds.add(itemId);

    const minBuffer = Number(item.minSafetyBuffer) || Number(item.reorderLevel) || 10;
    const stock = Math.max(0, Number(item.currentStock) || 0);
    const target = Number(item.targetStock) || minBuffer * 2;
    const unitCost = Number(item.unitCost) || 100;
    let nextStatus: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' = 'IN_STOCK';
    if (stock <= 0) {
      nextStatus = 'CRITICAL';
    } else if (stock <= minBuffer) {
      nextStatus = 'LOW_STOCK';
    }
    if (
      item.id !== itemId ||
      item.status !== nextStatus ||
      item.minSafetyBuffer !== minBuffer ||
      item.targetStock !== target ||
      item.unitCost !== unitCost
    ) {
      mutated = true;
      return {
        ...item,
        id: itemId,
        minSafetyBuffer: minBuffer,
        targetStock: target,
        unitCost,
        status: nextStatus,
      };
    }
    return item;
  });

  if (mutated) {
    writeJsonFile(getInventoryPath(), normalized);
  }
  return normalized;
}

export async function createRawMaterialItem(
  input: CreateRawMaterialInput
): Promise<RawMaterialStockItem> {
  await assertWriteAllowed('create raw material item');
  const items = getRawMaterialsInventory();

  const name = String(input.name || '').trim();
  if (!name) throw new Error('Raw material name is required.');

  // Generate item code if not provided
  let code = String(input.itemCode || '').trim().toUpperCase();
  if (!code) {
    const catPrefixMap: Record<RawMaterialCategory, string> = {
      Chemicals: 'CHM',
      Fiberglass: 'FBR',
      Pigments: 'PIG',
      'Core & Structural': 'STR',
      Hardware: 'HRD',
      Consumables: 'CSM',
    };
    const prefix = catPrefixMap[input.category] || 'RAW';
    const rand = Math.floor(100 + Math.random() * 900);
    code = `RAW-${prefix}-${rand}`;
  }

  // Ensure unique code
  if (items.some((i) => (i.itemCode || '').toUpperCase() === code)) {
    code = `${code}-${Math.floor(10 + Math.random() * 90)}`;
  }

  const stock = Math.max(0, Number(input.currentStock) || 0);
  const minBuffer = Math.max(0, Number(input.minSafetyBuffer) || Number(input.reorderLevel) || 10);
  const target = Math.max(minBuffer, Number(input.targetStock) || minBuffer * 2);
  const unitCost = Math.max(0, Number(input.unitCost) || 0);

  let status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' = 'IN_STOCK';
  if (stock <= 0) status = 'CRITICAL';
  else if (stock <= minBuffer) status = 'LOW_STOCK';

  const newItem: RawMaterialStockItem = {
    id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemCode: code,
    name,
    category: input.category || 'Consumables',
    currentStock: stock,
    unit: String(input.unit || 'KG').trim(),
    minSafetyBuffer: minBuffer,
    targetStock: target,
    reorderLevel: minBuffer,
    unitCost,
    warehouseLocation: String(input.warehouseLocation || 'Main Store Rack').trim(),
    status,
    updatedAt: new Date().toISOString(),
  };

  items.unshift(newItem);
  writeJsonFile(getInventoryPath(), items);
  return newItem;
}

export async function updateRawMaterialItem(
  id: string,
  updates: UpdateRawMaterialInput
): Promise<RawMaterialStockItem> {
  await assertWriteAllowed('update raw material item');
  const items = getRawMaterialsInventory();
  const idx = items.findIndex((i) => i.id === id || i.itemCode === id);
  if (idx === -1) throw new Error(`Raw material item "${id}" not found.`);

  const current = items[idx];
  const name = updates.name !== undefined ? String(updates.name).trim() : current.name;
  if (!name) throw new Error('Raw material name cannot be empty.');

  const category = updates.category !== undefined ? updates.category : current.category;
  const unit = updates.unit !== undefined ? String(updates.unit).trim() : current.unit;
  const warehouseLocation =
    updates.warehouseLocation !== undefined
      ? String(updates.warehouseLocation).trim()
      : current.warehouseLocation;

  const currentStock =
    updates.currentStock !== undefined
      ? Math.max(0, Number(updates.currentStock) || 0)
      : current.currentStock;

  const minSafetyBuffer =
    updates.minSafetyBuffer !== undefined
      ? Math.max(0, Number(updates.minSafetyBuffer) || 0)
      : current.minSafetyBuffer;

  const targetStock =
    updates.targetStock !== undefined
      ? Math.max(minSafetyBuffer, Number(updates.targetStock) || minSafetyBuffer * 2)
      : current.targetStock;

  const unitCost =
    updates.unitCost !== undefined
      ? Math.max(0, Number(updates.unitCost) || 0)
      : current.unitCost;

  let status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' = 'IN_STOCK';
  if (currentStock <= 0) status = 'CRITICAL';
  else if (currentStock <= minSafetyBuffer) status = 'LOW_STOCK';

  const updated: RawMaterialStockItem = {
    ...current,
    name,
    category,
    unit,
    warehouseLocation,
    currentStock,
    minSafetyBuffer,
    targetStock,
    unitCost,
    status,
    updatedAt: new Date().toISOString(),
  };

  items[idx] = updated;
  writeJsonFile(getInventoryPath(), items);
  return updated;
}

export async function deleteRawMaterialItem(
  id: string
): Promise<{ success: boolean; id: string; itemCode: string; name: string }> {
  await assertWriteAllowed('delete raw material item');
  const items = getRawMaterialsInventory();
  const idx = items.findIndex((i) => i.id === id || i.itemCode === id);
  if (idx === -1) throw new Error(`Raw material item "${id}" not found.`);

  const [removed] = items.splice(idx, 1);
  writeJsonFile(getInventoryPath(), items);
  return {
    success: true,
    id: removed.id,
    itemCode: removed.itemCode,
    name: removed.name,
  };
}

export async function manualStockOut(
  itemId: string,
  qty: number,
  reason: string = 'Manual Floor Issue',
  department?: string
): Promise<RawMaterialStockItem> {
  const deductQty = Math.max(0, Number(qty) || 0);
  if (deductQty <= 0) {
    throw new Error('Valid positive quantity is required for stock deduction.');
  }
  const fullReason = department ? `[${department}] ${reason}` : reason;
  return adjustRawMaterialStock(itemId, -deductQty, fullReason);
}

export async function adjustRawMaterialStock(
  itemId: string,
  adjustmentQty: number,
  reason: string = 'Manual Adjustment'
): Promise<RawMaterialStockItem> {
  await assertWriteAllowed('adjust raw material stock');
  const items = getRawMaterialsInventory();
  const idx = items.findIndex((i) => i.id === itemId || i.itemCode === itemId);
  if (idx === -1) throw new Error(`Raw material item "${itemId}" not found.`);

  const item = items[idx];
  const nextQty = Math.max(0, Number((item.currentStock + adjustmentQty).toFixed(2)));
  const minBuffer = item.minSafetyBuffer || 10;
  let nextStatus: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' = 'IN_STOCK';
  if (nextQty <= 0) nextStatus = 'CRITICAL';
  else if (nextQty <= minBuffer) nextStatus = 'LOW_STOCK';

  const updated: RawMaterialStockItem = {
    ...item,
    currentStock: nextQty,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  items[idx] = updated;
  writeJsonFile(getInventoryPath(), items);
  return updated;
}

// ── BOQ Raw Material Auto-Deduction ──────────────────────────────────────────

export type DeductibleBoqMaterialInput = {
  itemName?: string;
  name?: string;
  quantity?: number;
  issuedQty?: number;
  qty?: number;
  formulaQty?: number;
  unit?: string;
  category?: string;
  rawMaterialKey?: string;
};

export async function deductBoqMaterialsFromInventory(
  issuedItems: DeductibleBoqMaterialInput[],
  voucherNumber?: string,
  prodOrderId?: string
): Promise<{ deductedCount: number; summary: string[] }> {
  await assertWriteAllowed('deduct BOQ materials from inventory');
  const config = getStockMaintenanceConfig();
  if (!config.autoDeductBoqMaterials) {
    return { deductedCount: 0, summary: ['Auto-deduction disabled in stock config'] };
  }

  const items = getRawMaterialsInventory();
  let deductedCount = 0;
  const summary: string[] = [];

  for (const issued of issuedItems) {
    const qty = Math.max(0, Number(issued.issuedQty ?? issued.quantity ?? issued.qty ?? issued.formulaQty) || 0);
    if (qty <= 0) continue;

    const lowerName = (issued.name || issued.itemName || issued.rawMaterialKey || '').toLowerCase().trim();
    if (!lowerName) continue;

    // Fuzzy match item
    const matchIdx = items.findIndex((rm) => {
      const rmLower = rm.name.toLowerCase();
      if (rmLower === lowerName) return true;
      if (lowerName.includes('resin') && rmLower.includes('resin')) return true;
      if (lowerName.includes('csm') && rmLower.includes('csm')) return true;
      if (lowerName.includes('mat') && rmLower.includes('mat')) return true;
      if (lowerName.includes('catalyst') && rmLower.includes('catalyst')) return true;
      if (lowerName.includes('accelerator') && rmLower.includes('accelerator')) return true;
      if (lowerName.includes('gelcoat') && rmLower.includes('gelcoat')) return true;
      if (lowerName.includes('pigment') && rmLower.includes('pigment')) return true;
      if (lowerName.includes('lock') && rmLower.includes('lock')) return true;
      if (lowerName.includes('latch') && rmLower.includes('latch')) return true;
      if (lowerName.includes('hinge') && rmLower.includes('hinge')) return true;
      return false;
    });

    if (matchIdx >= 0) {
      const rm = items[matchIdx];
      const nextStock = Math.max(0, Number((rm.currentStock - qty).toFixed(2)));
      items[matchIdx] = {
        ...rm,
        currentStock: nextStock,
        status: nextStock <= 0 ? 'CRITICAL' : nextStock <= rm.minSafetyBuffer ? 'LOW_STOCK' : 'IN_STOCK',
        updatedAt: new Date().toISOString(),
      };
      deductedCount++;
      summary.push(`Deducted ${qty} ${rm.unit} of ${rm.name} (Remaining: ${nextStock})`);
    }
  }

  if (deductedCount > 0) {
    writeJsonFile(getInventoryPath(), items);
  }
  return { deductedCount, summary };
}

export async function restoreBoqMaterialsToInventory(
  reversedItems: DeductibleBoqMaterialInput[],
  voucherNumber?: string,
  prodOrderId?: string
): Promise<{ restoredCount: number }> {
  await assertWriteAllowed('restore BOQ materials to inventory');
  const items = getRawMaterialsInventory();
  let restoredCount = 0;

  for (const item of reversedItems) {
    const qty = Math.max(0, Number(item.issuedQty ?? item.quantity ?? item.qty ?? item.formulaQty) || 0);
    if (qty <= 0) continue;
    const lowerName = (item.name || item.itemName || item.rawMaterialKey || '').toLowerCase().trim();
    if (!lowerName) continue;

    const matchIdx = items.findIndex((rm) => {
      const rmLower = rm.name.toLowerCase();
      return rmLower.includes(lowerName) || lowerName.includes(rmLower);
    });

    if (matchIdx >= 0) {
      items[matchIdx].currentStock = Number((items[matchIdx].currentStock + qty).toFixed(2));
      items[matchIdx].status =
        items[matchIdx].currentStock <= items[matchIdx].minSafetyBuffer ? 'LOW_STOCK' : 'IN_STOCK';
      items[matchIdx].updatedAt = new Date().toISOString();
      restoredCount++;
    }
  }

  if (restoredCount > 0) {
    writeJsonFile(getInventoryPath(), items);
  }
  return { restoredCount };
}

export interface BoqMaterialStockDeltaItem {
  key?: string;
  name: string;
  unit: string;
  deltaQty: number; // Positive = extra issued (deduct from stock), Negative = returned (restore to stock)
  rate?: number;
}

export async function adjustBoqMaterialsStockDelta(
  deltaItems: BoqMaterialStockDeltaItem[],
  voucherNumber?: string,
  prodOrderId?: string
): Promise<{ deductedCount: number; restoredCount: number; summary: string[] }> {
  await assertWriteAllowed('adjust BOQ materials stock delta');
  const config = getStockMaintenanceConfig();
  if (!config.autoDeductBoqMaterials) {
    return { deductedCount: 0, restoredCount: 0, summary: ['Auto-deduction disabled in stock config'] };
  }

  const itemsToDeduct: DeductibleBoqMaterialInput[] = [];
  const itemsToRestore: DeductibleBoqMaterialInput[] = [];
  const summary: string[] = [];

  for (const item of deltaItems) {
    if (!item.name || Math.abs(item.deltaQty) < 0.0001) continue;
    if (item.deltaQty > 0) {
      itemsToDeduct.push({
        name: item.name,
        issuedQty: item.deltaQty,
        unit: item.unit,
        rawMaterialKey: item.key,
      });
      summary.push(`Deducted extra ${item.deltaQty} ${item.unit} of ${item.name}`);
    } else {
      itemsToRestore.push({
        name: item.name,
        issuedQty: Math.abs(item.deltaQty),
        unit: item.unit,
        rawMaterialKey: item.key,
      });
      summary.push(`Restored ${Math.abs(item.deltaQty)} ${item.unit} of ${item.name} to stock`);
    }
  }

  let deductedCount = 0;
  let restoredCount = 0;

  if (itemsToDeduct.length > 0) {
    const res = await deductBoqMaterialsFromInventory(itemsToDeduct, voucherNumber, prodOrderId);
    deductedCount = res.deductedCount;
  }
  if (itemsToRestore.length > 0) {
    const res = await restoreBoqMaterialsToInventory(itemsToRestore, voucherNumber, prodOrderId);
    restoredCount = res.restoredCount;
  }

  return { deductedCount, restoredCount, summary };
}

// ── WIP Stage-Wise Factory Floor Stock Tracker ───────────────────────────────

export function getWipStageStockSummary(): {
  stages: WipStageStockItem[];
  totalWipDoors: number;
  totalWipValuation: number;
  reworkStation: ReworkStationSummary;
} {
  const prodOrders = readJsonFile<ProductionOrder[]>(getProductionStorePath(), []);
  const activeOrders = prodOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'DELIVERY');

  const STAGE_KEYS: ProductionStage[] = [
    'QUEUED',
    'MOLDING',
    'CUTTING_FINISHING',
    'PAINT_SECTION',
    'PACKING',
  ];

  // Stage-based standard cost multipliers per door for WIP valuation
  // Raw chemicals + contractor piece-rate labor accrued up to that point
  const STAGE_VALUATION_PER_DOOR: Record<ProductionStage, { material: number; labor: number }> = {
    QUEUED: { material: 1400, labor: 0 },
    MOLDING: { material: 2800, labor: 500 },
    CUTTING_FINISHING: { material: 3200, labor: 700 },
    PAINT_SECTION: { material: 3800, labor: 1100 },
    PACKING: { material: 4100, labor: 1250 },
    DELIVERY: { material: 4100, labor: 1250 },
    INSTALLATION: { material: 4100, labor: 1550 },
    COMPLETED: { material: 4100, labor: 1550 },
    FINISHING_GRAINS: { material: 3800, labor: 1100 },
    CNC_ROUTING: { material: 3200, labor: 700 },
    QA_INSPECTION: { material: 3200, labor: 700 },
    PU_COATING: { material: 3800, labor: 1100 },
  };

  const stageBuckets: Record<ProductionStage, WipStageStockItem> = {
    QUEUED: { stage: 'QUEUED', stageLabel: '1. Queue (Awaiting Press)', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    MOLDING: { stage: 'MOLDING', stageLabel: '2. Molding (Layup & Press)', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    CUTTING_FINISHING: { stage: 'CUTTING_FINISHING', stageLabel: '3. Cutting & Finishing', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    PAINT_SECTION: { stage: 'PAINT_SECTION', stageLabel: '4. Finishing & PU Painting', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    PACKING: { stage: 'PACKING', stageLabel: '5. Packing & Crating', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    DELIVERY: { stage: 'DELIVERY', stageLabel: 'Delivery', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    INSTALLATION: { stage: 'INSTALLATION', stageLabel: 'Installation', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    COMPLETED: { stage: 'COMPLETED', stageLabel: 'Completed', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    FINISHING_GRAINS: { stage: 'FINISHING_GRAINS', stageLabel: 'Painting', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    CNC_ROUTING: { stage: 'CNC_ROUTING', stageLabel: 'Cutting', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    QA_INSPECTION: { stage: 'QA_INSPECTION', stageLabel: 'Cutting', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
    PU_COATING: { stage: 'PU_COATING', stageLabel: 'Painting', orderCount: 0, doorCount: 0, totalSqFt: 0, rawMaterialValue: 0, contractorLaborValue: 0, totalAccruedValuation: 0, orders: [] },
  };

  let totalWipDoors = 0;
  let totalWipValuation = 0;

  for (const order of activeOrders) {
    let normalizedStage: ProductionStage = order.status;
    if (normalizedStage === 'FINISHING_GRAINS' || normalizedStage === 'PU_COATING') {
      normalizedStage = 'PAINT_SECTION';
    } else if (normalizedStage === 'CNC_ROUTING' || normalizedStage === 'QA_INSPECTION') {
      normalizedStage = 'CUTTING_FINISHING';
    }

    const bucket = stageBuckets[normalizedStage];
    if (!bucket) continue;

    const doors = Array.isArray(order.doors) ? order.doors : [];
    const doorsCount = doors.length || order.quantity || 1;
    const sqFt = doors.reduce((s: number, d: { finishedWidthMm?: number; finishedHeightMm?: number }) => {
      const w = d.finishedWidthMm ? d.finishedWidthMm / 10 : 80;
      const h = d.finishedHeightMm ? d.finishedHeightMm / 10 : 210;
      return s + (w * h) / 929.0304;
    }, 0);

    const costProfile = STAGE_VALUATION_PER_DOOR[normalizedStage] || { material: 2000, labor: 500 };
    const matVal = costProfile.material * doorsCount;
    const labVal = costProfile.labor * doorsCount;
    const stageVal = matVal + labVal;

    bucket.orderCount += 1;
    bucket.doorCount += doorsCount;
    bucket.totalSqFt = Number((bucket.totalSqFt + sqFt).toFixed(2));
    bucket.rawMaterialValue += matVal;
    bucket.contractorLaborValue += labVal;
    bucket.totalAccruedValuation += stageVal;

    totalWipDoors += doorsCount;
    totalWipValuation += stageVal;

    bucket.orders.push({
      id: order.id,
      jobCardNumber: order.jobCardNumber,
      customerName: order.customerName,
      doorsCount,
      sqFt: Number(sqFt.toFixed(1)),
      boqIssued: Boolean(order.boqIssuedAt),
    });
  }

  // Rework Station Tracking
  const reworkItems: ReworkStationItem[] = [];
  const reworkOrderIds = new Set<string>();

  for (const order of prodOrders) {
    const doors = Array.isArray(order.doors) ? order.doors : [];
    for (const d of doors) {
      if (d.qcInspection?.decision === 'REWORK_REQUIRED' || d.qcStatus === 'REJECTED' || (d as any).qcStatus === 'REWORK') {
        reworkItems.push({
          orderId: order.id,
          jobCardNumber: order.jobCardNumber,
          customerName: order.customerName,
          doorNumber: d.doorNumber,
          doorId: d.id,
          reworkReason: d.qcInspection?.reworkNotes || d.moldingNotes || 'Quality Correction Required',
          defectType: d.qcInspection?.defectType || 'Surface / Dimension Rectification',
          reportedAt: d.qcInspection?.inspectedAt || order.updatedAt,
          gangName: d.moldedByGangName || 'Floor Gang',
        });
        reworkOrderIds.add(order.id);
      }
    }

    if (order.stageHistory && Array.isArray(order.stageHistory)) {
      const reworkStage = order.stageHistory.find((sh) => sh.isRework);
      if (reworkStage && !reworkOrderIds.has(order.id) && order.status !== 'COMPLETED') {
        reworkItems.push({
          orderId: order.id,
          jobCardNumber: order.jobCardNumber,
          customerName: order.customerName,
          reworkReason: reworkStage.reworkReason || 'Stage Rework in Progress',
          defectType: 'Stage Defect Rectification',
          reportedAt: reworkStage.completedAt,
          gangName: reworkStage.gangName || 'Floor Team',
        });
        reworkOrderIds.add(order.id);
      }
    }
  }

  let totalReworkCost = 0;
  try {
    const expensesPath = getDataFilePath('order-direct-expenses.json');
    if (fs.existsSync(expensesPath)) {
      const exp = JSON.parse(fs.readFileSync(expensesPath, 'utf8'));
      if (Array.isArray(exp)) {
        totalReworkCost = exp
          .filter((e: any) => e.category === 'REWORK')
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      }
    }
  } catch {}

  const reworkStation: ReworkStationSummary = {
    reworkDoorsCount: reworkItems.length,
    reworkOrdersCount: reworkOrderIds.size,
    totalReworkCost: Math.round(totalReworkCost),
    items: reworkItems,
  };

  const resultStages = STAGE_KEYS.map((k) => stageBuckets[k]);
  return { stages: resultStages, totalWipDoors, totalWipValuation, reworkStation };
}

// ── Finished Goods Buffer Stock Registry ─────────────────────────────────────

export function getFinishedGoodsInventory(): FinishedGoodsBufferItem[] {
  const current = readJsonFile<FinishedGoodsBufferItem[]>(
    getFinishedGoodsPath(),
    DEFAULT_FINISHED_GOODS_BUFFER
  );
  if (!Array.isArray(current) || current.length === 0) {
    writeJsonFile(getFinishedGoodsPath(), DEFAULT_FINISHED_GOODS_BUFFER);
    return DEFAULT_FINISHED_GOODS_BUFFER;
  }

  let mutated = false;
  const normalized = current.map((item) => {
    const bal = Math.max(0, Number(item.currentBalance) || 0);
    const rsv = Math.max(0, Number(item.reservedCount) || 0);
    const avail = Math.max(0, bal - rsv);
    const target = Math.max(1, Number(item.minBufferTarget) || 5);
    const unitVal = Number(item.unitValuation) || 6800;
    const totalVal = bal * unitVal;
    const deficit = Math.max(0, target - bal);
    let status: 'HEALTHY' | 'LOW_BUFFER' | 'OUT_OF_STOCK' = 'HEALTHY';
    if (bal <= 0) status = 'OUT_OF_STOCK';
    else if (bal < target) status = 'LOW_BUFFER';

    if (
      item.availableBalance !== avail ||
      item.totalValuation !== totalVal ||
      item.deficitCount !== deficit ||
      item.status !== status
    ) {
      mutated = true;
      return {
        ...item,
        currentBalance: bal,
        reservedCount: rsv,
        availableBalance: avail,
        minBufferTarget: target,
        unitValuation: unitVal,
        totalValuation: totalVal,
        deficitCount: deficit,
        status,
      };
    }
    return item;
  });

  if (mutated) {
    writeJsonFile(getFinishedGoodsPath(), normalized);
  }
  return normalized;
}

export async function adjustFinishedGoodsStock(
  itemId: string,
  adjustmentQty: number,
  reason: string = 'Stock Adjustment'
): Promise<FinishedGoodsBufferItem> {
  await assertWriteAllowed('adjust finished goods stock');
  const items = getFinishedGoodsInventory();
  const idx = items.findIndex((i) => i.id === itemId || i.sku === itemId);
  if (idx === -1) throw new Error(`Finished goods item "${itemId}" not found.`);

  const item = items[idx];
  const nextBal = Math.max(0, item.currentBalance + adjustmentQty);
  const avail = Math.max(0, nextBal - item.reservedCount);
  const target = item.minBufferTarget;
  const deficit = Math.max(0, target - nextBal);
  let status: 'HEALTHY' | 'LOW_BUFFER' | 'OUT_OF_STOCK' = 'HEALTHY';
  if (nextBal <= 0) status = 'OUT_OF_STOCK';
  else if (nextBal < target) status = 'LOW_BUFFER';

  const updated: FinishedGoodsBufferItem = {
    ...item,
    currentBalance: nextBal,
    availableBalance: avail,
    deficitCount: deficit,
    totalValuation: nextBal * item.unitValuation,
    status,
    updatedAt: new Date().toISOString(),
  };

  items[idx] = updated;
  writeJsonFile(getFinishedGoodsPath(), items);
  return updated;
}

// ── Company-Wide Consistent Stock Executive Overview ─────────────────────────

export function getCompanyStockOverview(): CompanyStockOverview {
  const config = getStockMaintenanceConfig();
  const rawMaterials = getRawMaterialsInventory();
  const wipSummary = getWipStageStockSummary();
  const finishedGoods = getFinishedGoodsInventory();

  // 1. Raw Materials Valuation
  const rmTotalValue = Math.round(
    rawMaterials.reduce((sum, rm) => sum + (rm.currentStock * rm.unitCost), 0)
  );
  const rmLowStock = rawMaterials.filter((rm) => rm.status === 'LOW_STOCK').length;
  const rmCritical = rawMaterials.filter((rm) => rm.status === 'CRITICAL').length;

  // 2. Finished Goods Valuation
  const fgTotalValue = Math.round(
    finishedGoods.reduce((sum, fg) => sum + fg.totalValuation, 0)
  );
  const fgTotalDoors = finishedGoods.reduce((sum, fg) => sum + fg.currentBalance, 0);
  const fgAvailableDoors = finishedGoods.reduce((sum, fg) => sum + fg.availableBalance, 0);
  const fgReservedDoors = finishedGoods.reduce((sum, fg) => sum + fg.reservedCount, 0);
  const fgDeficitCount = finishedGoods.reduce((sum, fg) => sum + fg.deficitCount, 0);

  // 3. Total Consistent Inventory Valuation
  const totalValuation = rmTotalValue + wipSummary.totalWipValuation + fgTotalValue;
  const surplusDeficit = totalValuation - config.consistentTargetValuation;

  let healthStatus: 'HEALTHY_BUFFER' | 'ON_TRACK' | 'DEFICIT_WARNING' = 'HEALTHY_BUFFER';
  if (surplusDeficit < -(config.consistentTargetValuation * 0.15)) {
    healthStatus = 'DEFICIT_WARNING';
  } else if (surplusDeficit < 0) {
    healthStatus = 'ON_TRACK';
  }

  // 4. Reorder Recommendations
  const recommendations: ReorderRecommendation[] = [];

  // RM recommendations
  rawMaterials
    .filter((rm) => rm.status !== 'IN_STOCK')
    .forEach((rm) => {
      const deficit = Math.max(0, rm.targetStock - rm.currentStock);
      recommendations.push({
        type: 'RAW_MATERIAL',
        itemId: rm.id,
        itemCode: rm.itemCode,
        name: rm.name,
        category: rm.category,
        currentStock: rm.currentStock,
        targetStock: rm.targetStock,
        suggestedReorderQty: deficit > 0 ? deficit : rm.minSafetyBuffer,
        unit: rm.unit,
        unitCost: rm.unitCost,
        estimatedCost: Math.round((deficit > 0 ? deficit : rm.minSafetyBuffer) * rm.unitCost),
        urgency: rm.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      });
    });

  // FG recommendations
  finishedGoods
    .filter((fg) => fg.deficitCount > 0)
    .forEach((fg) => {
      recommendations.push({
        type: 'FINISHED_GOODS',
        itemId: fg.id,
        itemCode: fg.sku,
        name: `${fg.modelName} (${fg.sizeLabel})`,
        category: fg.category,
        currentStock: fg.currentBalance,
        targetStock: fg.minBufferTarget,
        suggestedReorderQty: fg.deficitCount,
        unit: 'Doors',
        unitCost: fg.unitValuation,
        estimatedCost: Math.round(fg.deficitCount * fg.unitValuation),
        urgency: fg.currentBalance === 0 ? 'HIGH' : 'MEDIUM',
      });
    });

  return {
    consistentTargetValuation: config.consistentTargetValuation,
    totalInventoryValuation: totalValuation,
    valuationSurplusDeficit: surplusDeficit,
    healthStatus,
    rawMaterialsSummary: {
      totalValue: rmTotalValue,
      skuCount: rawMaterials.length,
      lowStockCount: rmLowStock,
      criticalCount: rmCritical,
    },
    wipSummary: {
      totalValue: wipSummary.totalWipValuation,
      activeOrdersCount: wipSummary.stages.reduce((s, st) => s + st.orderCount, 0),
      totalDoorsInPipeline: wipSummary.totalWipDoors,
      stages: wipSummary.stages,
      reworkStation: wipSummary.reworkStation,
    },
    finishedGoodsSummary: {
      totalValue: fgTotalValue,
      totalBufferDoors: fgTotalDoors,
      availableDoors: fgAvailableDoors,
      reservedDoors: fgReservedDoors,
      deficitCount: fgDeficitCount,
    },
    reorderRecommendations: recommendations,
  };
}

// ── Rework Material Issue & Profit Ledger Accounting ─────────────────────────

export async function issueReworkMaterial(
  input: IssueReworkMaterialInput
): Promise<{
  success: boolean;
  voucherNumber: string;
  totalCost: number;
  deductedCount: number;
}> {
  await assertWriteAllowed('issue rework material');
  const rmInventory = getRawMaterialsInventory();
  let totalCost = 0;
  const deductionItems: DeductibleBoqMaterialInput[] = [];

  for (const it of input.items) {
    const qty = Math.max(0, Number(it.qty) || 0);
    if (qty <= 0) continue;
    const lower = (it.name || '').toLowerCase().trim();
    const match = rmInventory.find(
      (rm) => rm.name.toLowerCase() === lower || rm.itemCode.toLowerCase() === lower
    );
    const unitPrice = it.unitCost ?? match?.unitCost ?? 100;
    const lineCost = Math.round(qty * unitPrice);
    totalCost += lineCost;
    deductionItems.push({
      name: it.name,
      issuedQty: qty,
      unit: it.unit || match?.unit || 'KG',
    });
  }

  const voucherNumber = `RWK-MAT-${Date.now().toString().slice(-6)}`;

  // 1. Deduct from live raw materials store
  const { deductedCount } = await deductBoqMaterialsFromInventory(
    deductionItems,
    voucherNumber,
    input.prodOrderId
  );

  // 2. Link to order direct expenses as REWORK cost
  try {
    const { addOrderExpense } = await import('./orderProfitService');
    const desc = `Rework Material Issue: ${input.reason || 'Defect Rectification'} (${input.items.map((i) => `${i.qty} ${i.unit || 'units'} ${i.name}`).join(', ')})`;
    await addOrderExpense({
      orderId: input.prodOrderId,
      jobCardNumber: input.jobCardNumber,
      category: 'REWORK',
      amount: totalCost,
      description: desc,
      vendorOrParty: 'In-House RM Store',
      createdBy: input.issuedBy || 'Storekeeper',
    });
  } catch (err) {
    console.warn('[stockMaintenanceService] Failed to record order direct expense:', err);
  }

  return {
    success: true,
    voucherNumber,
    totalCost,
    deductedCount,
  };
}

// ── 1-Click Finished Goods Buffer Replenishment Order ────────────────────────

export async function createFgBufferReplenishmentOrder(
  fgItemId: string,
  quantityToMake?: number
): Promise<{ success: boolean; jobCardNumber: string; orderId: string }> {
  await assertWriteAllowed('create FG buffer replenishment production order');
  const items = getFinishedGoodsInventory();
  const fg = items.find((i) => i.id === fgItemId || i.sku === fgItemId);
  if (!fg) throw new Error(`FG item "${fgItemId}" not found.`);

  const qty = Math.max(1, quantityToMake || fg.deficitCount || 5);
  const nowIso = new Date().toISOString();

  // Import productionService create
  const { createProductionOrder } = await import('./productionService');

  const doorsInput = Array.from({ length: qty }).map((_, idx) => ({
    doorNumber: `FG-${idx + 1}`,
    model: fg.modelCode,
    rawHeightMm: fg.heightCm * 10 + 20,
    rawWidthMm: fg.widthCm * 10 + 20,
    finishedHeightMm: fg.heightCm * 10,
    finishedWidthMm: fg.widthCm * 10,
    handing: 'RH' as const,
    lockType: 'Baby Latch',
    finishColor: fg.finishColor,
  }));

  const newOrder = await createProductionOrder({
    customerName: 'FACTORY FG BUFFER STOCK (കമ്പനി സ്റ്റോക്ക് ബഫർ)',
    siteName: 'Main Finished Goods Warehouse',
    district: 'Warehouse',
    doorCategory: 'FRP_DOORS',
    lineAssigned: 'LINE-1',
    priority: 'NORMAL',
    doors: doorsInput,
    tolerances: { heightDeductionMm: 20, widthDeductionMm: 20 },
  });

  return {
    success: true,
    jobCardNumber: newOrder.jobCardNumber,
    orderId: newOrder.id,
  };
}
