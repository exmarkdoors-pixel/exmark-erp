import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import { listProductionOrders, ProductionOrder, ProductionStage } from './productionService';
import { listQuotations, Quotation } from './quotationService';
import { listBoqs, BoqMaster } from './boqService';
import { listBoqExtraItems, BoqExtraItem } from './boqExtraItemsService';
import {
  getAllWorkRecords,
  getRateCard,
  ContractorJobWorkRecord,
  ContractorRateCard,
} from './contractorService';
import { getBoqMaterialRates } from './boqRateService';
import { getCustomFrames } from './frameService';
import { listInvoices, listPayments } from './financeService';
import { calculateDoorBatchBoq } from '@/lib/utils/boqFormulaEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderExpenseCategory =
  | 'FREIGHT'
  | 'LOADING_UNLOADING'
  | 'COMMISSION'
  | 'REWORK'
  | 'OTHER';

export interface OrderDirectExpense {
  id: string;
  orderId: string;
  jobCardNumber?: string;
  category: OrderExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendorOrParty?: string;
  createdBy?: string;
  createdAt: string;
}

export interface AddOrderExpenseInput {
  orderId: string;
  jobCardNumber?: string;
  category: OrderExpenseCategory;
  description: string;
  amount: number;
  date?: string;
  vendorOrParty?: string;
  createdBy?: string;
}

export interface OrderProfitBreakdown {
  orderId: string;
  prodOrderNumber: string;
  jobCardNumber: string;
  quoteNumber: string | null;
  quoteId: string | null;
  customerName: string;
  siteName: string;
  district: string;
  orderDate: string;
  completedDate: string | null;
  status: ProductionStage;
  totalDoors: number;
  totalSqFt: number;
  includeInstallation: boolean;

  // Revenue (0% Non-GST)
  revenueSource: 'QUOTATION' | 'INVOICE' | 'UNLINKED';
  doorsRevenue: number;
  installationRevenue: number;
  discountAmount: number;
  totalOrderRevenue: number;
  cashCollected: number;
  balanceReceivable: number;

  // Material Costs (zero double-counting: raw door BOM + lock kits + paint BOM + store extras)
  chemicalCost: number;
  timberCost: number;
  foamCost: number;
  rawDoorMaterialCost: number;
  mfgBoqNumber: string | null;
  mfgBoqSource: 'SAVED_BOQ' | 'FORMULA_LIVE';
  lockHardwareCost: number;
  actualPaintCost: number;
  projectedPaintCost: number;
  paintCost: number;
  paintBoqNumber: string | null;
  extraBoqCost: number;
  extraBoqItems: BoqExtraItem[];
  otherBoqCost: number;
  totalMaterialCost: number;

  // Piece-Rate Labor (Floor Gangs)
  moldingLaborCost: number;
  cuttingLaborCost: number;
  paintingLaborCost: number;
  siteFittingLaborCost: number;
  actualPieceRateCost: number;
  projectedPieceRateCost: number;
  totalLaborCost: number;
  workRecords: ContractorJobWorkRecord[];

  // Direct Order Expenses (Freight, Loading, Commission, Rework, Other)
  freightCost: number;
  loadingUnloadingCost: number;
  commissionCost: number;
  reworkCost: number;
  otherDirectExpenseCost: number;
  totalDirectExpenses: number;
  directExpenses: OrderDirectExpense[];

  // Profit Totals
  totalProjectedAddition: number;
  totalCost: number;
  netProfit: number;
  profitMarginPct: number;
  costPerDoor: number;
  profitPerDoor: number;
}

export interface OrderProfitPortfolioSummary {
  totalOrders: number;
  linkedOrdersCount: number;
  completedOrdersCount: number;
  totalDoors: number;
  totalRevenue: number;
  totalCollected: number;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalDirectExpenses: number;
  totalCost: number;
  totalNetProfit: number;
  avgMarginPct: number;
  profitableOrdersCount: number;
  lossOrdersCount: number;
}

export interface OrderProfitReportResponse {
  includeProjectedCosts: boolean;
  generatedAt: string;
  summary: OrderProfitPortfolioSummary;
  orders: OrderProfitBreakdown[];
}

export const ORDER_EXPENSE_CATEGORY_LABELS: Record<OrderExpenseCategory, string> = {
  FREIGHT: 'Freight & Vehicle Hire',
  LOADING_UNLOADING: 'Loading & Unloading',
  COMMISSION: 'Sales / Agent Commission',
  REWORK: 'Rework & Rectification',
  OTHER: 'Other Direct Expense',
};

// ── Direct Order Expenses Persistence ─────────────────────────────────────────

const getExpensesStorePath = () => getDataFilePath('order-expenses-store.json');

function readExpensesStore(): OrderDirectExpense[] {
  try {
    const storePath = getExpensesStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderDirectExpense[]) : [];
  } catch {
    return [];
  }
}

function writeExpensesStore(expenses: OrderDirectExpense[]): void {
  const storePath = getExpensesStorePath();
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(expenses, null, 2), 'utf8');
}

export async function listOrderExpenses(orderId?: string): Promise<OrderDirectExpense[]> {
  const all = readExpensesStore();
  if (!orderId) return all;
  const target = normalizeKey(orderId);
  return all.filter(
    (e) => normalizeKey(e.orderId) === target || normalizeKey(e.jobCardNumber) === target
  );
}

export async function addOrderExpense(input: AddOrderExpenseInput): Promise<OrderDirectExpense> {
  const amount = Math.round(Math.max(0, Number(input.amount) || 0));
  if (!input.orderId?.trim()) {
    throw new Error('orderId is required for a direct order expense');
  }
  if (!input.description?.trim()) {
    throw new Error('Expense description is required');
  }
  if (amount <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  const all = readExpensesStore();
  const created: OrderDirectExpense = {
    id: `OEXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId: input.orderId.trim(),
    jobCardNumber: input.jobCardNumber?.trim() || undefined,
    category: input.category || 'OTHER',
    description: input.description.trim(),
    amount,
    date: input.date?.trim() || new Date().toISOString().split('T')[0],
    vendorOrParty: input.vendorOrParty?.trim() || undefined,
    createdBy: input.createdBy?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  all.unshift(created);
  writeExpensesStore(all);
  return created;
}

export async function deleteOrderExpense(expenseId: string): Promise<boolean> {
  const all = readExpensesStore();
  const next = all.filter((e) => e.id !== expenseId);
  if (next.length === all.length) return false;
  writeExpensesStore(next);
  return true;
}

// ── Matching & Calculation Helpers ────────────────────────────────────────────

type ExtendedQuotation = Quotation & {
  grandTotal?: number;
  advancePaid?: number;
};

function normalizeKey(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function buildOrderMatchKeys(order: ProductionOrder, matchedQuote: ExtendedQuotation | null): Set<string> {
  const keys = new Set<string>();
  const rawValues = [
    order.id,
    order.prodOrderNumber,
    order.jobCardNumber,
    order.salesOrderId,
    matchedQuote?.id,
    matchedQuote?.quoteNumber,
    matchedQuote?.jobCardNumber,
  ];
  for (const v of rawValues) {
    const k = normalizeKey(v);
    if (k) keys.add(k);
  }
  return keys;
}

function findMatchedQuotation(
  order: ProductionOrder,
  quotations: ExtendedQuotation[]
): ExtendedQuotation | null {
  const orderKeys = [
    normalizeKey(order.salesOrderId),
    normalizeKey(order.jobCardNumber),
    normalizeKey(order.prodOrderNumber),
    normalizeKey(order.id),
  ].filter(Boolean);

  for (const key of orderKeys) {
    const found = quotations.find(
      (q) =>
        normalizeKey(q.id) === key ||
        normalizeKey(q.quoteNumber) === key ||
        normalizeKey(q.jobCardNumber) === key
    );
    if (found) return found;
  }
  return null;
}

function computeOrderRevenue(
  order: ProductionOrder,
  quote: ExtendedQuotation | null,
  keys: Set<string>,
  invoices: Awaited<ReturnType<typeof listInvoices>>,
  payments: Awaited<ReturnType<typeof listPayments>>
) {
  const matchedInvoices = invoices.filter(
    (inv) => inv.salesOrderId && keys.has(normalizeKey(inv.salesOrderId))
  );
  const matchedInvoiceIds = new Set(matchedInvoices.map((i) => i.id));
  const matchedPayments = payments.filter(
    (p) => p.invoiceId && matchedInvoiceIds.has(p.invoiceId)
  );

  const invoicePaidSum = matchedInvoices.reduce((s, inv) => s + (Number(inv.paidAmount) || 0), 0);
  const paymentsSum = matchedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const invoiceCollected = Math.max(invoicePaidSum, paymentsSum);

  if (quote) {
    const discountAmount = Math.max(0, Number(quote.discount) || 0);
    const installRev = quote.includeInstallation
      ? Math.max(0, Number(quote.installationAmount) || 0)
      : 0;
    const rawTotal = Math.max(
      0,
      Number(quote.grandTotal ?? quote.totalAmount ?? quote.subtotal ?? 0)
    );
    const itemsSum = Array.isArray(quote.items)
      ? quote.items.reduce(
          (sum, it) =>
            sum + (Number(it.totalPrice) || (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)),
          0
        )
      : 0;

    // Quotations saved from QuotationHub store overrideTotalAmount = doorsSubtotal + installationAmount.
    // Quotes saved directly via API calcTotals() may exclude installationAmount from totalAmount.
    const totalAlreadyIncludesInstall =
      installRev === 0 || Math.abs(rawTotal - Math.max(0, itemsSum - discountAmount)) > 2;

    const totalOrderRevenue = Math.round(
      totalAlreadyIncludesInstall ? rawTotal : rawTotal + installRev
    );
    const doorsRevenue = Math.max(0, totalOrderRevenue - Math.round(installRev));

    const quoteAdvancePaid =
      typeof quote.advancePaid === 'number' && Number.isFinite(quote.advancePaid)
        ? Math.max(0, quote.advancePaid)
        : quote.isConfirmed || quote.status === 'CONVERTED'
        ? Math.max(0, Number(quote.advanceAmount) || 0)
        : 0;

    const cashCollected = Math.round(Math.max(invoiceCollected, quoteAdvancePaid));
    return {
      revenueSource: 'QUOTATION' as const,
      doorsRevenue,
      installationRevenue: Math.round(installRev),
      discountAmount: Math.round(discountAmount),
      totalOrderRevenue,
      cashCollected,
      balanceReceivable: Math.max(0, totalOrderRevenue - cashCollected),
    };
  }

  if (matchedInvoices.length > 0) {
    const totalOrderRevenue = Math.round(
      matchedInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)
    );
    const cashCollected = Math.round(invoiceCollected);
    return {
      revenueSource: 'INVOICE' as const,
      doorsRevenue: totalOrderRevenue,
      installationRevenue: 0,
      discountAmount: 0,
      totalOrderRevenue,
      cashCollected,
      balanceReceivable: Math.max(0, totalOrderRevenue - cashCollected),
    };
  }

  return {
    revenueSource: 'UNLINKED' as const,
    doorsRevenue: 0,
    installationRevenue: 0,
    discountAmount: 0,
    totalOrderRevenue: 0,
    cashCollected: 0,
    balanceReceivable: 0,
  };
}

function computeOrderMaterials(
  order: ProductionOrder,
  keys: Set<string>,
  boqs: BoqMaster[],
  extraItems: BoqExtraItem[],
  boqRates: Awaited<ReturnType<typeof getBoqMaterialRates>>,
  customFrames: ReturnType<typeof getCustomFrames>,
  includeProjectedCosts: boolean
) {
  const rawDoors = order.doors || [];
  const batchCalc = calculateDoorBatchBoq(
    rawDoors.map((d) => ({
      doorNumber: d.doorNumber,
      widthCm:
        d.rawWidthTopCm && d.rawWidthTopCm > 0
          ? d.rawWidthTopCm
          : d.rawWidthMm && d.rawWidthMm > 0
          ? d.rawWidthMm / 10
          : d.finishedWidthMm && d.finishedWidthMm > 0
          ? d.finishedWidthMm / 10
          : boqRates.baseDoorWidthCm,
      heightCm:
        d.rawHeightCm && d.rawHeightCm > 0
          ? d.rawHeightCm
          : d.rawHeightMm && d.rawHeightMm > 0
          ? d.rawHeightMm / 10
          : d.finishedHeightMm && d.finishedHeightMm > 0
          ? d.finishedHeightMm / 10
          : boqRates.baseDoorHeightCm,
      frameTypeId: d.frameTypeId,
      frameTypeName: d.frameTypeName,
      finishColor: d.finishColor,
      lockId: d.lockId,
      lockType: d.lockType,
      handing: d.handing,
      quantity: 1,
    })),
    customFrames,
    boqRates
  );

  const totalDoors = rawDoors.length > 0 ? rawDoors.length : Math.max(0, Number(order.quantity) || 0);
  const totalSqFt = Number((batchCalc.totalSqFt || totalDoors * 16.5).toFixed(2));

  const orderBoqs = boqs.filter((b) => keys.has(normalizeKey(b.orderId)));
  const mfgBoq = orderBoqs.find((b) => b.boqStage === 'MANUFACTURING');
  const paintBoqs = orderBoqs.filter((b) => b.boqStage === 'PAINTING');
  const otherBoqs = orderBoqs.filter(
    (b) => b.boqStage !== 'MANUFACTURING' && b.boqStage !== 'PAINTING'
  );

  const chemicalCost = Math.round(batchCalc.totalChemicalCost);
  const timberCost = Math.round(batchCalc.totalWoodCost);
  const foamCost = Math.round(batchCalc.foamCost);
  const lockHardwareCost = Math.round(batchCalc.totalLockBoxCost);

  // MANUFACTURING BOQ holds raw door material (chemicals + wood + foam), excluding lock box kits.
  const rawDoorMaterialCost =
    mfgBoq && mfgBoq.totalAmount > 0
      ? Math.round(mfgBoq.totalAmount)
      : Math.round(batchCalc.grandTotalCost);

  const actualPaintCost = Math.round(
    paintBoqs.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0)
  );
  const projectedPaintCost = paintBoqs.length === 0 ? Math.round(totalSqFt * 75) : 0;
  const paintCost = includeProjectedCosts ? actualPaintCost + projectedPaintCost : actualPaintCost;

  // Match extra items tied to this order; exclude shared FLOOR-CONSUMABLES bucket unless matched explicitly.
  const matchedExtras = extraItems.filter((item) => {
    const key = normalizeKey(item.orderKey);
    return key !== '' && key !== 'floor-consumables' && keys.has(key);
  });
  const extraBoqCost = Math.round(
    matchedExtras.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
  );
  const otherBoqCost = Math.round(
    otherBoqs.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0)
  );

  const totalMaterialCost =
    rawDoorMaterialCost + lockHardwareCost + paintCost + extraBoqCost + otherBoqCost;

  return {
    totalDoors,
    totalSqFt,
    chemicalCost,
    timberCost,
    foamCost,
    rawDoorMaterialCost,
    mfgBoqNumber: mfgBoq?.boqNumber || null,
    mfgBoqSource: (mfgBoq && mfgBoq.totalAmount > 0 ? 'SAVED_BOQ' : 'FORMULA_LIVE') as
      | 'SAVED_BOQ'
      | 'FORMULA_LIVE',
    lockHardwareCost,
    actualPaintCost,
    projectedPaintCost,
    paintCost,
    paintBoqNumber: paintBoqs[0]?.boqNumber || null,
    extraBoqCost,
    extraBoqItems: matchedExtras,
    otherBoqCost,
    totalMaterialCost,
  };
}

function computeOrderLabor(
  order: ProductionOrder,
  totalDoors: number,
  keys: Set<string>,
  allWorkRecords: ContractorJobWorkRecord[],
  rateCard: ContractorRateCard,
  includeProjectedCosts: boolean
) {
  const matchedRecords = allWorkRecords.filter((rec) => {
    const recKeys = [
      normalizeKey(rec.orderId),
      normalizeKey(rec.orderNumber),
      normalizeKey(rec.jobCardNumber),
    ].filter(Boolean);
    return recKeys.some((rk) => keys.has(rk));
  });

  const sumByTrade = (trade: ContractorJobWorkRecord['trade']) =>
    Math.round(
      matchedRecords
        .filter((r) => r.trade === trade)
        .reduce((s, r) => s + (Number(r.totalAmount) || 0), 0)
    );

  const moldingLaborCost = sumByTrade('MOLDING');
  const cuttingLaborCost = sumByTrade('CUTTING_GRINDING');
  const paintingLaborCost = sumByTrade('PAINTING');
  const siteFittingLaborCost = sumByTrade('SITE_FITTING');
  const actualPieceRateCost =
    moldingLaborCost + cuttingLaborCost + paintingLaborCost + siteFittingLaborCost;

  let projectedPieceRateCost = 0;
  if (totalDoors > 0) {
    const rawDoorsList = order.doors || [];
    const framedDoorsCount =
      rawDoorsList.length > 0
        ? rawDoorsList.filter((d) => {
            const fid = (d.frameTypeId || '').toUpperCase();
            const fname = (d.frameTypeName || '').toLowerCase();
            return fid !== 'FRM-005' && !fname.includes('without frame') && !fname.includes('shutter only');
          }).length
        : totalDoors;

    if (moldingLaborCost === 0) {
      projectedPieceRateCost +=
        framedDoorsCount * rateCard.moldingDoorWithFrame +
        (totalDoors - framedDoorsCount) * rateCard.moldingOnlyDoor;
    }
    if (cuttingLaborCost === 0) {
      projectedPieceRateCost +=
        totalDoors * rateCard.doorCutting + framedDoorsCount * rateCard.frameCutting;
    }
    if (paintingLaborCost === 0) projectedPieceRateCost += totalDoors * rateCard.doorGrainsWithPaint;
    if (siteFittingLaborCost === 0 && order.includeInstallation) {
      projectedPieceRateCost += totalDoors * rateCard.siteFitting;
    }
  }
  projectedPieceRateCost = Math.round(projectedPieceRateCost);

  const totalLaborCost = includeProjectedCosts
    ? actualPieceRateCost + projectedPieceRateCost
    : actualPieceRateCost;

  return {
    moldingLaborCost,
    cuttingLaborCost,
    paintingLaborCost,
    siteFittingLaborCost,
    actualPieceRateCost,
    projectedPieceRateCost,
    totalLaborCost,
    workRecords: matchedRecords,
  };
}

function computeOrderDirectExpenses(keys: Set<string>, allDirectExpenses: OrderDirectExpense[]) {
  const matched = allDirectExpenses.filter(
    (exp) => keys.has(normalizeKey(exp.orderId)) || keys.has(normalizeKey(exp.jobCardNumber))
  );

  const sumCat = (cat: OrderExpenseCategory) =>
    Math.round(matched.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0));

  const freightCost = sumCat('FREIGHT');
  const loadingUnloadingCost = sumCat('LOADING_UNLOADING');
  const commissionCost = sumCat('COMMISSION');
  const reworkCost = sumCat('REWORK');
  const otherDirectExpenseCost = sumCat('OTHER');
  const totalDirectExpenses =
    freightCost + loadingUnloadingCost + commissionCost + reworkCost + otherDirectExpenseCost;

  return {
    freightCost,
    loadingUnloadingCost,
    commissionCost,
    reworkCost,
    otherDirectExpenseCost,
    totalDirectExpenses,
    directExpenses: matched,
  };
}

// ── Main Profit Engine ────────────────────────────────────────────────────────

export async function computeOrderProfitSummaries(options?: {
  orderId?: string;
  includeProjectedCosts?: boolean;
}): Promise<OrderProfitReportResponse> {
  const includeProjectedCosts = Boolean(options?.includeProjectedCosts);

  const [
    orders,
    quotations,
    boqs,
    extraItems,
    boqRates,
    invoices,
    payments,
    allDirectExpenses,
  ] = await Promise.all([
    listProductionOrders(),
    listQuotations(),
    listBoqs(),
    listBoqExtraItems(),
    getBoqMaterialRates(),
    listInvoices(),
    listPayments(),
    listOrderExpenses(),
  ]);

  const workRecords = getAllWorkRecords();
  const rateCard = getRateCard();
  const customFrames = getCustomFrames();

  const filterKey = normalizeKey(options?.orderId);
  const targetOrders = filterKey
    ? orders.filter(
        (o) =>
          normalizeKey(o.id) === filterKey ||
          normalizeKey(o.jobCardNumber) === filterKey ||
          normalizeKey(o.prodOrderNumber) === filterKey ||
          normalizeKey(o.salesOrderId) === filterKey
      )
    : orders;

  const breakdowns: OrderProfitBreakdown[] = targetOrders.map((order) => {
    const matchedQuote = findMatchedQuotation(order, quotations as ExtendedQuotation[]);
    const keys = buildOrderMatchKeys(order, matchedQuote);

    const rev = computeOrderRevenue(order, matchedQuote, keys, invoices, payments);
    const mat = computeOrderMaterials(
      order,
      keys,
      boqs,
      extraItems,
      boqRates,
      customFrames,
      includeProjectedCosts
    );
    const labor = computeOrderLabor(
      order,
      mat.totalDoors,
      keys,
      workRecords,
      rateCard,
      includeProjectedCosts
    );
    const direct = computeOrderDirectExpenses(keys, allDirectExpenses);

    const totalProjectedAddition = mat.projectedPaintCost + labor.projectedPieceRateCost;
    const totalCost = mat.totalMaterialCost + labor.totalLaborCost + direct.totalDirectExpenses;
    const netProfit = rev.totalOrderRevenue - totalCost;
    const profitMarginPct =
      rev.totalOrderRevenue > 0
        ? Number(((netProfit / rev.totalOrderRevenue) * 100).toFixed(1))
        : 0;
    const costPerDoor = mat.totalDoors > 0 ? Math.round(totalCost / mat.totalDoors) : 0;
    const profitPerDoor = mat.totalDoors > 0 ? Math.round(netProfit / mat.totalDoors) : 0;

    return {
      orderId: order.id,
      prodOrderNumber: order.prodOrderNumber,
      jobCardNumber: order.jobCardNumber || order.prodOrderNumber,
      quoteNumber: matchedQuote?.quoteNumber || (order.salesOrderId || null),
      quoteId: matchedQuote?.id || null,
      customerName: order.customerName,
      siteName: order.siteName,
      district: order.district,
      orderDate: order.orderDate || order.createdAt.slice(0, 10),
      completedDate: order.completedAt ? order.completedAt.slice(0, 10) : null,
      status: order.status,
      totalDoors: mat.totalDoors,
      totalSqFt: mat.totalSqFt,
      includeInstallation: Boolean(order.includeInstallation || matchedQuote?.includeInstallation),

      ...rev,
      chemicalCost: mat.chemicalCost,
      timberCost: mat.timberCost,
      foamCost: mat.foamCost,
      rawDoorMaterialCost: mat.rawDoorMaterialCost,
      mfgBoqNumber: mat.mfgBoqNumber,
      mfgBoqSource: mat.mfgBoqSource,
      lockHardwareCost: mat.lockHardwareCost,
      actualPaintCost: mat.actualPaintCost,
      projectedPaintCost: mat.projectedPaintCost,
      paintCost: mat.paintCost,
      paintBoqNumber: mat.paintBoqNumber,
      extraBoqCost: mat.extraBoqCost,
      extraBoqItems: mat.extraBoqItems,
      otherBoqCost: mat.otherBoqCost,
      totalMaterialCost: mat.totalMaterialCost,

      moldingLaborCost: labor.moldingLaborCost,
      cuttingLaborCost: labor.cuttingLaborCost,
      paintingLaborCost: labor.paintingLaborCost,
      siteFittingLaborCost: labor.siteFittingLaborCost,
      actualPieceRateCost: labor.actualPieceRateCost,
      projectedPieceRateCost: labor.projectedPieceRateCost,
      totalLaborCost: labor.totalLaborCost,
      workRecords: labor.workRecords,

      ...direct,
      totalProjectedAddition,
      totalCost,
      netProfit,
      profitMarginPct,
      costPerDoor,
      profitPerDoor,
    };
  });

  // Sort most recent orders first
  breakdowns.sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));

  const totalRevenue = breakdowns.reduce((s, o) => s + o.totalOrderRevenue, 0);
  const totalNetProfit = breakdowns.reduce((s, o) => s + o.netProfit, 0);
  const linkedOrders = breakdowns.filter((o) => o.revenueSource !== 'UNLINKED');

  const summary: OrderProfitPortfolioSummary = {
    totalOrders: breakdowns.length,
    linkedOrdersCount: linkedOrders.length,
    completedOrdersCount: breakdowns.filter((o) => o.status === 'COMPLETED').length,
    totalDoors: breakdowns.reduce((s, o) => s + o.totalDoors, 0),
    totalRevenue,
    totalCollected: breakdowns.reduce((s, o) => s + o.cashCollected, 0),
    totalMaterialCost: breakdowns.reduce((s, o) => s + o.totalMaterialCost, 0),
    totalLaborCost: breakdowns.reduce((s, o) => s + o.totalLaborCost, 0),
    totalDirectExpenses: breakdowns.reduce((s, o) => s + o.totalDirectExpenses, 0),
    totalCost: breakdowns.reduce((s, o) => s + o.totalCost, 0),
    totalNetProfit,
    avgMarginPct:
      totalRevenue > 0 ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1)) : 0,
    profitableOrdersCount: linkedOrders.filter((o) => o.netProfit >= 0).length,
    lossOrdersCount: linkedOrders.filter((o) => o.netProfit < 0).length,
  };

  return {
    includeProjectedCosts,
    generatedAt: new Date().toISOString(),
    summary,
    orders: breakdowns,
  };
}
