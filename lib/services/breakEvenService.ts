import fs from 'fs';
import path from 'path';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import { BreakEvenAnalysis, calculateBreakEven } from '@/types/finance';
import { computeOrderProfitSummaries } from './orderProfitService';
import { listBoqExtraItems } from './boqExtraItemsService';
import { getBoqMaterialRates } from './boqRateService';
import { getCustomFrames } from './frameService';
import { getRateCard } from './contractorService';
import { getFrpRateCardSettings } from './frpPricingEngine';
import { calculateDoorBatchBoq } from '@/lib/utils/boqFormulaEngine';
import { getMonthlyAccountingSummary, MonthlyAccountingSummary } from './daybookImportService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FixedOverheadCategory =
  | 'FACTORY_RENT'
  | 'SALARIES_FIXED'
  | 'ELECTRICITY_UTILITIES'
  | 'LOAN_EMI_DEPRECIATION'
  | 'OFFICE_ADMIN'
  | 'OTHER_FIXED';

export interface FixedOverheadItem {
  id: string;
  category: FixedOverheadCategory;
  name: string;
  monthlyAmount: number;
  active: boolean;
  notes?: string;
  updatedAt: string;
}

export interface FixedOverheadsStore {
  items: FixedOverheadItem[];
  updatedAt: string;
}

export interface UnitEconomicsBreakdown {
  avgSellingPricePerDoor: number;
  rawMaterialPerDoor: number;
  lockHardwarePerDoor: number;
  paintBomPerDoor: number;
  extraOrderItemsPerDoor: number;
  pieceRateLaborPerDoor: number;
  freightDirectPerDoor: number;
  totalMaterialPerDoor: number;
  totalVariableCostPerDoor: number;
  materialMarginPerDoor: number;
  contributionMarginPerDoor: number;
  contributionMarginRatioPct: number;
  dataBasisLabel: string;
  isEstimatedFallback: boolean;
}

export interface EngineeringCategoryRow {
  id: string;
  label: string;
  variant: string;
  sellingPrice: number;
  materialAndLockCost: number;
  paintBomCost: number;
  pieceRateCost: number;
  variableCost: number;
  cmPerDoor: number;
  cmRatioPct: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  isViable: boolean;
}

export interface CvpCurvePoint {
  doors: number;
  fixedCost: number;
  variableCost: number;
  totalCost: number;
  totalRevenue: number;
  operatingProfit: number;
}

export interface MonthlyActualProgress {
  monthKey: string;
  doorsAchieved: number;
  revenueAchieved: number;
  contributionGenerated: number;
  operatingProfitOrLoss: number;
  doorsRemainingToBreakEven: number;
  surplusDoorsAboveBreakEven: number;
  revenueRemainingToBreakEven: number;
  breakEvenProgressPct: number;
}

export interface ComprehensiveBreakEvenReport {
  generatedAt: string;
  monthKey: string;
  costDataSource: 'HYBRID_ERP' | 'IMPORTED_MONTH_DAYBOOK';
  workingDaysPerMonth: number;
  targetProfit: number;
  includeProjectedCosts: boolean;
  includeFloorConsumables: boolean;

  fixedCostsBreakdown: {
    recurringOverheadsTotal: number;
    importedFixedSalariesTotal: number;
    importedFixedOverheadsTotal: number;
    floorConsumablesTotal: number;
    totalFixedMonthlyCost: number;
    fixedCostsConfigured: boolean;
    recurringItems: FixedOverheadItem[];
  };

  dayBookSummary: MonthlyAccountingSummary;

  activeUnitEconomics: UnitEconomicsBreakdown;
  activeBreakEven: BreakEvenAnalysis;

  liveErpUnitEconomics: UnitEconomicsBreakdown;
  liveErpBreakEven: BreakEvenAnalysis;
  importedMonthUnitEconomics: UnitEconomicsBreakdown | null;
  importedMonthBreakEven: BreakEvenAnalysis | null;
  importedMonthNote: string | null;

  standardEngineeringBaseline: UnitEconomicsBreakdown;
  standardEngineeringBreakEven: BreakEvenAnalysis;
  engineeringMatrix: EngineeringCategoryRow[];

  monthProgress: MonthlyActualProgress;
  cvpCurve: CvpCurvePoint[];
}

export const FIXED_OVERHEAD_CATEGORY_LABELS: Record<FixedOverheadCategory, string> = {
  FACTORY_RENT: 'Factory Shed & Yard Rent',
  SALARIES_FIXED: 'Fixed Monthly Staff Salaries',
  ELECTRICITY_UTILITIES: '3-Phase Electricity & Water',
  LOAN_EMI_DEPRECIATION: 'Machinery EMI & Depreciation',
  OFFICE_ADMIN: 'Office, WiFi, Phone & Audit',
  OTHER_FIXED: 'Other Fixed Monthly Overhead',
};

// ── Fixed Overheads Store CRUD ────────────────────────────────────────────────

const getOverheadsPath = () => getDataFilePath('fixed-overheads-store.json');

function readOverheadsStore(): FixedOverheadsStore {
  try {
    const filePath = getOverheadsPath();
    if (!fs.existsSync(filePath)) {
      const initial: FixedOverheadsStore = { items: [], updatedAt: new Date().toISOString() };
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<FixedOverheadsStore>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

function writeOverheadsStore(store: FixedOverheadsStore): void {
  writeJsonSafe(getOverheadsPath(), store);
}

export function listFixedOverheads(): {
  items: FixedOverheadItem[];
  totalActiveFixedMonthly: number;
  updatedAt: string;
} {
  const store = readOverheadsStore();
  const totalActiveFixedMonthly = Math.round(
    store.items.filter((i) => i.active).reduce((s, i) => s + (Number(i.monthlyAmount) || 0), 0)
  );
  return {
    items: store.items,
    totalActiveFixedMonthly,
    updatedAt: store.updatedAt,
  };
}

export function saveFixedOverheadItem(input: {
  id?: string;
  category: FixedOverheadCategory;
  name: string;
  monthlyAmount: number;
  active?: boolean;
  notes?: string;
}): FixedOverheadItem {
  if (!input.name?.trim()) {
    throw new Error('Overhead name is required');
  }
  const amount = Math.round(Math.max(0, Number(input.monthlyAmount) || 0));
  const store = readOverheadsStore();
  const now = new Date().toISOString();

  if (input.id) {
    const idx = store.items.findIndex((i) => i.id === input.id);
    if (idx >= 0) {
      store.items[idx] = {
        ...store.items[idx],
        category: input.category || store.items[idx].category,
        name: input.name.trim(),
        monthlyAmount: amount,
        active: input.active !== undefined ? input.active : store.items[idx].active,
        notes: input.notes?.trim() || undefined,
        updatedAt: now,
      };
      store.updatedAt = now;
      writeOverheadsStore(store);
      return store.items[idx];
    }
  }

  const created: FixedOverheadItem = {
    id: `OH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    category: input.category || 'OTHER_FIXED',
    name: input.name.trim(),
    monthlyAmount: amount,
    active: input.active !== false,
    notes: input.notes?.trim() || undefined,
    updatedAt: now,
  };
  store.items.push(created);
  store.updatedAt = now;
  writeOverheadsStore(store);
  return created;
}

export function deleteFixedOverheadItem(id: string): boolean {
  const store = readOverheadsStore();
  const next = store.items.filter((i) => i.id !== id);
  if (next.length === store.items.length) return false;
  store.items = next;
  store.updatedAt = new Date().toISOString();
  writeOverheadsStore(store);
  return true;
}

export function applySampleKeralaPlantOverheads(): FixedOverheadsStore {
  const now = new Date().toISOString();
  const store: FixedOverheadsStore = {
    updatedAt: now,
    items: [
      {
        id: 'OH-SAMPLE-RENT',
        category: 'FACTORY_RENT',
        name: 'Factory Shed & Yard Rent',
        monthlyAmount: 85000,
        active: true,
        notes: 'Sample monthly factory rent',
        updatedAt: now,
      },
      {
        id: 'OH-SAMPLE-STAFF',
        category: 'SALARIES_FIXED',
        name: 'Fixed Salaried Staff (Supervisor, Office, Driver, Helper)',
        monthlyAmount: 195000,
        active: true,
        notes: 'Non-piece-rate monthly payroll',
        updatedAt: now,
      },
      {
        id: 'OH-SAMPLE-EB',
        category: 'ELECTRICITY_UTILITIES',
        name: 'KSEB 3-Phase Power & Utilities',
        monthlyAmount: 55000,
        active: true,
        notes: 'Compressors, routing, lighting',
        updatedAt: now,
      },
      {
        id: 'OH-SAMPLE-EMI',
        category: 'LOAN_EMI_DEPRECIATION',
        name: 'Mold Press & Machinery EMI / Depreciation',
        monthlyAmount: 75000,
        active: true,
        updatedAt: now,
      },
      {
        id: 'OH-SAMPLE-ADMIN',
        category: 'OFFICE_ADMIN',
        name: 'Office Admin, Phone, Internet & Accounts',
        monthlyAmount: 40000,
        active: true,
        updatedAt: now,
      },
    ],
  };
  writeOverheadsStore(store);
  return store;
}

// ── Unit Economics & Break-Even Engine ────────────────────────────────────────

function buildUnitEconomics(params: {
  totalDoors: number;
  totalRevenue: number;
  rawMaterialTotal: number;
  lockHardwareTotal: number;
  paintBomTotal: number;
  extraItemsTotal: number;
  pieceRateTotal: number;
  freightDirectTotal: number;
  dataBasisLabel: string;
  isEstimatedFallback?: boolean;
}): UnitEconomicsBreakdown {
  const doors = Math.max(1, params.totalDoors);
  const avgSellingPricePerDoor = Math.round(params.totalRevenue / doors);
  const rawMaterialPerDoor = Math.round(params.rawMaterialTotal / doors);
  const lockHardwarePerDoor = Math.round(params.lockHardwareTotal / doors);
  const paintBomPerDoor = Math.round(params.paintBomTotal / doors);
  const extraOrderItemsPerDoor = Math.round(params.extraItemsTotal / doors);
  const pieceRateLaborPerDoor = Math.round(params.pieceRateTotal / doors);
  const freightDirectPerDoor = Math.round(params.freightDirectTotal / doors);

  const totalMaterialPerDoor =
    rawMaterialPerDoor + lockHardwarePerDoor + paintBomPerDoor + extraOrderItemsPerDoor;
  const totalVariableCostPerDoor =
    totalMaterialPerDoor + pieceRateLaborPerDoor + freightDirectPerDoor;
  const materialMarginPerDoor = avgSellingPricePerDoor - totalMaterialPerDoor;
  const contributionMarginPerDoor = avgSellingPricePerDoor - totalVariableCostPerDoor;
  const contributionMarginRatioPct =
    avgSellingPricePerDoor > 0
      ? Number(((contributionMarginPerDoor / avgSellingPricePerDoor) * 100).toFixed(1))
      : 0;

  return {
    avgSellingPricePerDoor,
    rawMaterialPerDoor,
    lockHardwarePerDoor,
    paintBomPerDoor,
    extraOrderItemsPerDoor,
    pieceRateLaborPerDoor,
    freightDirectPerDoor,
    totalMaterialPerDoor,
    totalVariableCostPerDoor,
    materialMarginPerDoor,
    contributionMarginPerDoor,
    contributionMarginRatioPct,
    dataBasisLabel: params.dataBasisLabel,
    isEstimatedFallback: Boolean(params.isEstimatedFallback),
  };
}

function buildCvpCurve(
  fixedCost: number,
  avgPrice: number,
  varCost: number,
  breakEvenUnits: number,
  actualDoors: number
): CvpCurvePoint[] {
  const maxUnits = Math.max(
    40,
    actualDoors > 0 ? Math.ceil(actualDoors * 1.35) : 0,
    breakEvenUnits > 0 ? Math.ceil(breakEvenUnits * 1.8) : 200
  );
  const step = Math.max(1, Math.ceil(maxUnits / 8));
  const points: CvpCurvePoint[] = [];

  for (let i = 0; i <= 8; i++) {
    const doors = i === 0 ? 0 : Math.min(maxUnits, i * step);
    const variableCost = Math.round(doors * varCost);
    const totalCost = Math.round(fixedCost + variableCost);
    const totalRevenue = Math.round(doors * avgPrice);
    points.push({
      doors,
      fixedCost: Math.round(fixedCost),
      variableCost,
      totalCost,
      totalRevenue,
      operatingProfit: totalRevenue - totalCost,
    });
  }
  return points;
}

export async function computeComprehensiveBreakEven(options?: {
  month?: string;
  costDataSource?: 'HYBRID_ERP' | 'IMPORTED_MONTH_DAYBOOK';
  includeProjectedCosts?: boolean;
  includeFloorConsumables?: boolean;
  workingDaysPerMonth?: number;
  targetProfit?: number;
  targetSalesRevenue?: number;
}): Promise<ComprehensiveBreakEvenReport> {
  const monthKey =
    options?.month && /^\d{4}-\d{2}$/.test(options.month)
      ? options.month
      : new Date().toISOString().slice(0, 7);
  const includeProjectedCosts = options?.includeProjectedCosts ?? true;
  const includeFloorConsumables = options?.includeFloorConsumables ?? true;
  const workingDaysPerMonth = Math.max(1, Math.min(31, Number(options?.workingDaysPerMonth ?? 26) || 26));
  const targetProfit = Math.max(0, Number(options?.targetProfit ?? 0) || 0);
  const costDataSource = options?.costDataSource || 'HYBRID_ERP';

  const [
    orderProfit,
    floorConsumablesAll,
    boqRates,
  ] = await Promise.all([
    computeOrderProfitSummaries({ includeProjectedCosts }),
    listBoqExtraItems(['FLOOR-CONSUMABLES']),
    getBoqMaterialRates(),
  ]);

  const rateCard = getRateCard();
  const pricingSettings = getFrpRateCardSettings();
  const customFrames = getCustomFrames();
  const recurringOverheads = listFixedOverheads();
  const dayBookSummary = getMonthlyAccountingSummary(monthKey);

  // Selected month Floor/Evening Consumables (unallocated bulk shop consumables)
  const floorConsumablesTotal = Math.round(
    floorConsumablesAll
      .filter((it) => (it.issueDate || it.createdAt || '').startsWith(monthKey))
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
  );

  // Total Monthly Fixed Costs
  const totalFixedMonthlyCost = Math.round(
    recurringOverheads.totalActiveFixedMonthly +
      dayBookSummary.combinedFixedSalaryTotal +
      dayBookSummary.combinedFixedOverheadTotal +
      (includeFloorConsumables ? floorConsumablesTotal : 0)
  );

  // ── 1. Standard Engineering Baseline (80x210 cm Door + Frame + Rate Card) ───
  const stdBatch = calculateDoorBatchBoq(
    [
      {
        doorNumber: 'STD-D1',
        widthCm: boqRates.baseDoorWidthCm || 80,
        heightCm: boqRates.baseDoorHeightCm || 210,
        frameTypeId: 'FRM-REGULAR',
        frameTypeName: 'Regular Frame (72×50mm)',
        finishColor: 'Natural Teak Matte',
        lockType: 'Baby Latch Black',
        handing: 'RH',
        quantity: 1,
      },
    ],
    customFrames,
    boqRates
  );

  const shutterOnlyBatch = calculateDoorBatchBoq(
    [
      {
        doorNumber: 'SHUTTER-D1',
        widthCm: boqRates.baseDoorWidthCm || 80,
        heightCm: boqRates.baseDoorHeightCm || 210,
        frameTypeId: 'FRM-NONE',
        frameTypeName: 'Only Door (Shutter Only)',
        finishColor: 'Natural Teak Matte',
        lockType: 'Baby Latch Black',
        handing: 'RH',
        quantity: 1,
      },
    ],
    customFrames,
    boqRates
  );

  const stdRawMaterial = Math.round(stdBatch.grandTotalCost);
  const stdLockCost = Math.round(stdBatch.totalLockBoxCost);
  const stdPaintCost = Math.round((stdBatch.totalSqFt || 18.08) * 75);
  const stdPieceRate =
    rateCard.moldingDoorWithFrame + rateCard.doorCutting + rateCard.doorGrainsWithPaint;

  const standardEngineeringBaseline = buildUnitEconomics({
    totalDoors: 1,
    totalRevenue: pricingSettings.categoryPieceRates.C,
    rawMaterialTotal: stdRawMaterial,
    lockHardwareTotal: stdLockCost,
    paintBomTotal: stdPaintCost,
    extraItemsTotal: 0,
    pieceRateTotal: stdPieceRate,
    freightDirectTotal: 0,
    dataBasisLabel: `Standard Cat C (80×210cm Regular Frame + Baby Latch + Paint + Gang Rates)`,
    isEstimatedFallback: false,
  });

  const referenceTargetRev =
    options?.targetSalesRevenue && options.targetSalesRevenue > 0
      ? options.targetSalesRevenue
      : Math.max(totalFixedMonthlyCost * 2, standardEngineeringBaseline.avgSellingPricePerDoor * 150);

  const standardEngineeringBreakEven = calculateBreakEven({
    fixedOverheadCosts: totalFixedMonthlyCost,
    averageFRPPricePerDoor: standardEngineeringBaseline.avgSellingPricePerDoor,
    variableCostPerDoor: standardEngineeringBaseline.totalVariableCostPerDoor,
    targetSalesRevenue: referenceTargetRev,
    targetProfit,
    workingDaysPerMonth,
  });

  // Build Engineering Category A-E + Variant Comparison Matrix
  const catRates = pricingSettings.categoryPieceRates;
  const catVariants: Array<{
    id: string;
    label: string;
    variant: string;
    sellingPrice: number;
    materialAndLockCost: number;
    paintBomCost: number;
    pieceRateCost: number;
  }> = [
    {
      id: 'CAT_A',
      label: 'Category A Door',
      variant: '80×210cm + Regular Frame',
      sellingPrice: catRates.A,
      materialAndLockCost: stdRawMaterial + stdLockCost,
      paintBomCost: stdPaintCost,
      pieceRateCost: stdPieceRate,
    },
    {
      id: 'CAT_B',
      label: 'Category B Door',
      variant: '80×210cm + Regular Frame',
      sellingPrice: catRates.B,
      materialAndLockCost: stdRawMaterial + stdLockCost,
      paintBomCost: stdPaintCost,
      pieceRateCost: stdPieceRate,
    },
    {
      id: 'CAT_C',
      label: 'Category C Door',
      variant: '80×210cm + Regular Frame',
      sellingPrice: catRates.C,
      materialAndLockCost: stdRawMaterial + stdLockCost,
      paintBomCost: stdPaintCost,
      pieceRateCost: stdPieceRate,
    },
    {
      id: 'CAT_D',
      label: 'Category D Door',
      variant: '80×210cm + Regular Frame',
      sellingPrice: catRates.D,
      materialAndLockCost: stdRawMaterial + stdLockCost,
      paintBomCost: stdPaintCost,
      pieceRateCost: stdPieceRate,
    },
    {
      id: 'CAT_E',
      label: 'Category E Door',
      variant: '80×210cm + Regular Frame',
      sellingPrice: catRates.E,
      materialAndLockCost: stdRawMaterial + stdLockCost,
      paintBomCost: stdPaintCost,
      pieceRateCost: stdPieceRate,
    },
    {
      id: 'SHUTTER_ONLY',
      label: 'Cat C — Only Door',
      variant: 'Shutter Only (No Frame)',
      sellingPrice: catRates.C,
      materialAndLockCost: Math.round(shutterOnlyBatch.grandTotalCost + shutterOnlyBatch.totalLockBoxCost),
      paintBomCost: stdPaintCost,
      pieceRateCost: rateCard.moldingOnlyDoor + rateCard.doorCutting + rateCard.doorGrainsWithPaint,
    },
    {
      id: 'WITH_INSTALL',
      label: 'Cat C + Site Install',
      variant: '80×210cm + Fitting',
      sellingPrice: catRates.C + (pricingSettings.defaultInstallationRatePerDoor ?? 500),
      materialAndLockCost: stdRawMaterial + stdLockCost,
      paintBomCost: stdPaintCost,
      pieceRateCost: stdPieceRate + rateCard.siteFitting,
    },
  ];

  const engineeringMatrix: EngineeringCategoryRow[] = catVariants.map((cv) => {
    const variableCost = cv.materialAndLockCost + cv.paintBomCost + cv.pieceRateCost;
    const calc = calculateBreakEven({
      fixedOverheadCosts: totalFixedMonthlyCost,
      averageFRPPricePerDoor: cv.sellingPrice,
      variableCostPerDoor: variableCost,
      targetProfit,
      workingDaysPerMonth,
    });
    return {
      id: cv.id,
      label: cv.label,
      variant: cv.variant,
      sellingPrice: cv.sellingPrice,
      materialAndLockCost: cv.materialAndLockCost,
      paintBomCost: cv.paintBomCost,
      pieceRateCost: cv.pieceRateCost,
      variableCost,
      cmPerDoor: calc.contributionMarginPerDoor,
      cmRatioPct: Number((calc.contributionMarginRatio * 100).toFixed(1)),
      breakEvenUnits: calc.breakEvenUnits,
      breakEvenRevenue: calc.breakEvenRevenue,
      isViable: calc.isViable,
    };
  });

  // ── 2. Live Factory Actuals Unit Economics (Linked Orders in ERP) ───────────
  const linkedOrders = orderProfit.orders.filter(
    (o) => o.revenueSource !== 'UNLINKED' && o.totalDoors > 0
  );
  const linkedDoors = linkedOrders.reduce((s, o) => s + o.totalDoors, 0);

  let liveErpUnitEconomics: UnitEconomicsBreakdown;
  if (linkedOrders.length > 0 && linkedDoors > 0) {
    liveErpUnitEconomics = buildUnitEconomics({
      totalDoors: linkedDoors,
      totalRevenue: linkedOrders.reduce((s, o) => s + o.totalOrderRevenue, 0),
      rawMaterialTotal: linkedOrders.reduce((s, o) => s + o.rawDoorMaterialCost, 0),
      lockHardwareTotal: linkedOrders.reduce((s, o) => s + o.lockHardwareCost, 0),
      paintBomTotal: linkedOrders.reduce((s, o) => s + o.paintCost, 0),
      extraItemsTotal: linkedOrders.reduce((s, o) => s + o.extraBoqCost, 0),
      pieceRateTotal: linkedOrders.reduce((s, o) => s + o.totalLaborCost, 0),
      freightDirectTotal: linkedOrders.reduce((s, o) => s + o.totalDirectExpenses, 0),
      dataBasisLabel: `Live ERP Actuals (${linkedOrders.length} linked orders, ${linkedDoors} doors)`,
      isEstimatedFallback: false,
    });
  } else {
    liveErpUnitEconomics = {
      ...standardEngineeringBaseline,
      dataBasisLabel: 'Estimated from Standard Cat C BOM (no linked orders in ERP yet)',
      isEstimatedFallback: true,
    };
  }

  const monthLinkedOrders = linkedOrders.filter((o) =>
    (o.orderDate || '').startsWith(monthKey)
  );
  const actualErpMonthDoors = monthLinkedOrders.reduce((s, o) => s + o.totalDoors, 0);
  const actualErpMonthRevenue = monthLinkedOrders.reduce((s, o) => s + o.totalOrderRevenue, 0);

  const liveErpBreakEven = calculateBreakEven({
    fixedOverheadCosts: totalFixedMonthlyCost,
    averageFRPPricePerDoor: liveErpUnitEconomics.avgSellingPricePerDoor,
    variableCostPerDoor: liveErpUnitEconomics.totalVariableCostPerDoor,
    targetSalesRevenue:
      options?.targetSalesRevenue ?? (actualErpMonthRevenue > 0 ? actualErpMonthRevenue : referenceTargetRev),
    targetProfit,
    workingDaysPerMonth,
  });

  // ── 3. Imported Month / Vyapar Day Book Economics ───────────────────────────
  const importedMonthSales =
    dayBookSummary.manualSalesRevenue > 0
      ? dayBookSummary.manualSalesRevenue
      : dayBookSummary.dayBookSalesInflowTotal > 0
      ? dayBookSummary.dayBookSalesInflowTotal
      : actualErpMonthRevenue;
  const importedMonthDoors =
    dayBookSummary.manualDoorsSold > 0
      ? dayBookSummary.manualDoorsSold
      : actualErpMonthDoors > 0
      ? actualErpMonthDoors
      : importedMonthSales > 0 && standardEngineeringBaseline.avgSellingPricePerDoor > 0
      ? Math.round(importedMonthSales / standardEngineeringBaseline.avgSellingPricePerDoor)
      : 0;

  let importedMonthUnitEconomics: UnitEconomicsBreakdown | null = null;
  let importedMonthBreakEven: BreakEvenAnalysis | null = null;
  let importedMonthNote: string | null = null;

  const hasImportedVariable =
    dayBookSummary.combinedVariableMaterialTotal +
      dayBookSummary.combinedVariablePieceRateTotal +
      dayBookSummary.combinedVariableFreightTotal >
    0;
  const hasOnlyVyaparExpenseReport =
    !hasImportedVariable && dayBookSummary.combinedTotalFixedMonthly > 0;

  if (importedMonthDoors > 0 && (importedMonthSales > 0 || hasImportedVariable)) {
    const revTotal =
      importedMonthSales > 0
        ? importedMonthSales
        : importedMonthDoors * liveErpUnitEconomics.avgSellingPricePerDoor;

    // If user ONLY uploaded Vyapar Expense Report (with manual doors/sales but no Purchase Day Book),
    // borrow standard/live per-door material & piece-rate baseline so material costs aren't zeroed out!
    const matTotal =
      dayBookSummary.combinedVariableMaterialTotal > 0
        ? dayBookSummary.combinedVariableMaterialTotal
        : importedMonthDoors *
          (liveErpUnitEconomics.rawMaterialPerDoor +
            liveErpUnitEconomics.lockHardwarePerDoor +
            liveErpUnitEconomics.paintBomPerDoor);

    const laborTotal =
      dayBookSummary.combinedVariablePieceRateTotal > 0
        ? dayBookSummary.combinedVariablePieceRateTotal
        : importedMonthDoors * liveErpUnitEconomics.pieceRateLaborPerDoor;

    const freightTotal = dayBookSummary.combinedVariableFreightTotal;

    if (dayBookSummary.combinedVariableMaterialTotal === 0 && hasOnlyVyaparExpenseReport) {
      importedMonthNote =
        'Vyapar Expense Report provides Fixed Overheads, Salaries & Freight cleanly; Material & Piece-Rate costs per door use EXMARK BOM + Rate Card defaults cleanly.';
    }

    importedMonthUnitEconomics = buildUnitEconomics({
      totalDoors: importedMonthDoors,
      totalRevenue: revTotal,
      rawMaterialTotal: matTotal,
      lockHardwareTotal: 0,
      paintBomTotal: 0,
      extraItemsTotal: 0,
      pieceRateTotal: laborTotal,
      freightDirectTotal: freightTotal,
      dataBasisLabel: `Imported ${monthKey} (${importedMonthDoors} doors${
        dayBookSummary.manualDoorsSold > 0 ? ', manual/Vyapar count' : ', estimated from sales'
      })`,
      isEstimatedFallback: dayBookSummary.combinedVariableMaterialTotal === 0,
    });

    importedMonthBreakEven = calculateBreakEven({
      fixedOverheadCosts: totalFixedMonthlyCost,
      averageFRPPricePerDoor: importedMonthUnitEconomics.avgSellingPricePerDoor,
      variableCostPerDoor: importedMonthUnitEconomics.totalVariableCostPerDoor,
      targetSalesRevenue: revTotal,
      targetProfit,
      workingDaysPerMonth,
    });
  } else if (dayBookSummary.combinedTotalFixedMonthly > 0) {
    importedMonthNote = `Vyapar/Monthly Fixed Overheads (${monthKey}) added to Fixed Costs. Enter Month Doors Sold & Sales ₹ in the Importer or use Hybrid ERP mode.`;
  }

  // ── 4. Active Calculation Selection & Monthly Progress ──────────────────────
  const useImportedMode =
    costDataSource === 'IMPORTED_MONTH_DAYBOOK' &&
    importedMonthUnitEconomics !== null &&
    importedMonthBreakEven !== null;

  const activeUnitEconomics = useImportedMode
    ? importedMonthUnitEconomics!
    : liveErpUnitEconomics;
  const activeBreakEven = useImportedMode ? importedMonthBreakEven! : liveErpBreakEven;

  const monthDoorsAchieved = useImportedMode ? importedMonthDoors : actualErpMonthDoors;
  const monthRevenueAchieved = useImportedMode ? importedMonthSales : actualErpMonthRevenue;
  const contributionGenerated = Math.round(
    monthDoorsAchieved * activeUnitEconomics.contributionMarginPerDoor
  );

  const doorsRemainingToBreakEven = activeBreakEven.isViable
    ? Math.max(0, activeBreakEven.breakEvenUnits - monthDoorsAchieved)
    : 0;
  const surplusDoorsAboveBreakEven = activeBreakEven.isViable
    ? Math.max(0, monthDoorsAchieved - activeBreakEven.breakEvenUnits)
    : 0;
  const revenueRemainingToBreakEven = activeBreakEven.isViable
    ? Math.max(0, activeBreakEven.breakEvenRevenue - monthRevenueAchieved)
    : 0;
  const breakEvenProgressPct =
    activeBreakEven.breakEvenUnits > 0
      ? Number(
          Math.min(
            200,
            (monthDoorsAchieved / activeBreakEven.breakEvenUnits) * 100
          ).toFixed(1)
        )
      : monthDoorsAchieved > 0 && totalFixedMonthlyCost === 0
      ? 100
      : 0;

  const monthProgress: MonthlyActualProgress = {
    monthKey,
    doorsAchieved: monthDoorsAchieved,
    revenueAchieved: monthRevenueAchieved,
    contributionGenerated,
    operatingProfitOrLoss: contributionGenerated - totalFixedMonthlyCost,
    doorsRemainingToBreakEven,
    surplusDoorsAboveBreakEven,
    revenueRemainingToBreakEven,
    breakEvenProgressPct,
  };

  const cvpCurve = buildCvpCurve(
    totalFixedMonthlyCost,
    activeUnitEconomics.avgSellingPricePerDoor,
    activeUnitEconomics.totalVariableCostPerDoor,
    activeBreakEven.breakEvenUnits,
    monthDoorsAchieved
  );

  return {
    generatedAt: new Date().toISOString(),
    monthKey,
    costDataSource,
    workingDaysPerMonth,
    targetProfit,
    includeProjectedCosts,
    includeFloorConsumables,

    fixedCostsBreakdown: {
      recurringOverheadsTotal: recurringOverheads.totalActiveFixedMonthly,
      importedFixedSalariesTotal: dayBookSummary.combinedFixedSalaryTotal,
      importedFixedOverheadsTotal: dayBookSummary.combinedFixedOverheadTotal,
      floorConsumablesTotal,
      totalFixedMonthlyCost,
      fixedCostsConfigured: totalFixedMonthlyCost > 0,
      recurringItems: recurringOverheads.items,
    },

    dayBookSummary,
    activeUnitEconomics,
    activeBreakEven,
    liveErpUnitEconomics,
    liveErpBreakEven,
    importedMonthUnitEconomics,
    importedMonthBreakEven,
    importedMonthNote,
    standardEngineeringBaseline,
    standardEngineeringBreakEven,
    engineeringMatrix,
    monthProgress,
    cvpCurve,
  };
}
