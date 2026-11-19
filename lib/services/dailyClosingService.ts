/**
 * EXMARK ERP — Daily Evening Business Closing & Financial Health Forecasting Service
 */

import fs from 'fs';
import path from 'path';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import {
  DailyClosingEntry,
  DailyClosingOverviewResponse,
  DailyClosingStore,
  BusinessHealthScorecard,
  MtdBreakEvenStatus,
  ForecastingProjections,
  HealthStatus,
} from '@/types/dailyClosing';

const STORE_FILENAME = 'daily-closing-store.json';
const getStorePath = () => getDataFilePath(STORE_FILENAME);

const DEFAULT_SETTINGS = {
  monthlyFixedOverhead: 350000,
  targetGrossMarginPct: 35,
  targetNetMarginPct: 15,
  standardBoqCostPerDoor: 2200,
  workingDaysPerMonth: 26,
};

export function readDailyClosingStore(): DailyClosingStore {
  try {
    const storePath = getStorePath();
    if (!fs.existsSync(storePath)) {
      const initial: DailyClosingStore = {
        entries: [],
        settings: { ...DEFAULT_SETTINGS },
        updatedAt: new Date().toISOString(),
      };
      writeJsonSafe(storePath, initial);
      return initial;
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as DailyClosingStore;
    return {
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed?.settings || {}),
      },
      updatedAt: parsed?.updatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      entries: [],
      settings: { ...DEFAULT_SETTINGS },
      updatedAt: new Date().toISOString(),
    };
  }
}

export function writeDailyClosingStore(store: DailyClosingStore): void {
  const storePath = getStorePath();
  store.updatedAt = new Date().toISOString();
  writeJsonSafe(storePath, store);
}

/**
 * Calculates financial margins and health score for a single daily entry.
 */
export function calculateDailyMetrics(
  sales: number,
  purchases: number,
  expenses: number,
  doorsProduced: number,
  standardBoqCost: number = 2200
) {
  const grossProfit = Math.round(sales - purchases);
  const grossMarginPct = sales > 0 ? parseFloat(((grossProfit / sales) * 100).toFixed(1)) : 0;
  const netProfit = Math.round(grossProfit - expenses);
  const netMarginPct = sales > 0 ? parseFloat(((netProfit / sales) * 100).toFixed(1)) : 0;

  const actualMaterialCostPerDoor =
    doorsProduced > 0 ? Math.round(purchases / doorsProduced) : 0;
  const boqVariancePerDoor =
    doorsProduced > 0 ? actualMaterialCostPerDoor - standardBoqCost : 0;

  // Composite 0 - 100 Health Score
  let score = 50; // Neutral baseline

  // Gross Margin Contribution (up to +20 / -20)
  if (grossMarginPct >= 35) score += 20;
  else if (grossMarginPct >= 25) score += 10;
  else if (grossMarginPct < 15) score -= 20;

  // Net Margin Contribution (up to +20 / -20)
  if (netMarginPct >= 15) score += 20;
  else if (netMarginPct >= 8) score += 10;
  else if (netMarginPct < 0) score -= 25; // Operating loss

  // BOQ Efficiency Contribution (up to +10 / -10)
  if (doorsProduced > 0) {
    if (boqVariancePerDoor <= 0) score += 10; // Under or at BOQ budget
    else if (boqVariancePerDoor > 500) score -= 15; // Material overrun
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    grossProfit,
    grossMarginPct,
    netProfit,
    netMarginPct,
    actualMaterialCostPerDoor,
    boqVariancePerDoor,
    dailyHealthScore: finalScore,
  };
}

/**
 * Saves or updates today's evening closing entry.
 */
export function saveDailyClosingEntry(input: {
  entryDate: string; // "YYYY-MM-DD"
  enteredBy?: string;
  totalSalesRevenue: number;
  doorsSold?: number;
  salesSplit?: { cash: number; bankUpi: number; creditReceivable: number };
  totalPurchases: number;
  purchaseSplit?: {
    timberAndFrames: number;
    boardsAndSkins: number;
    glueAndResins: number;
    hardwareAndAccessories: number;
    otherConsumables: number;
  };
  totalExpenses: number;
  expenseSplit?: {
    dailyLaborAndWages: number;
    vehicleAndFuelBata: number;
    powerAndGenerator: number;
    maintenanceAndTools: number;
    officeAndRefreshment: number;
    miscellaneous: number;
  };
  doorsProduced: number;
  openingCashInHand?: number;
  closingCashInHand?: number;
  shiftNotes?: string;
  weatherOrMarketEvent?: string;
}): DailyClosingEntry {
  const store = readDailyClosingStore();
  const entryDate = input.entryDate || new Date().toISOString().slice(0, 10);
  const id = `EOD-${entryDate}`;

  const metrics = calculateDailyMetrics(
    input.totalSalesRevenue,
    input.totalPurchases,
    input.totalExpenses,
    input.doorsProduced,
    store.settings.standardBoqCostPerDoor
  );

  const newEntry: DailyClosingEntry = {
    id,
    entryDate,
    timestamp: new Date().toISOString(),
    enteredBy: input.enteredBy || 'Factory Manager',
    totalSalesRevenue: Math.max(0, input.totalSalesRevenue),
    doorsSold: Math.max(0, input.doorsSold || 0),
    salesSplit: input.salesSplit || {
      cash: Math.round(input.totalSalesRevenue * 0.3),
      bankUpi: Math.round(input.totalSalesRevenue * 0.7),
      creditReceivable: 0,
    },
    totalPurchases: Math.max(0, input.totalPurchases),
    purchaseSplit: input.purchaseSplit || {
      timberAndFrames: Math.round(input.totalPurchases * 0.4),
      boardsAndSkins: Math.round(input.totalPurchases * 0.35),
      glueAndResins: Math.round(input.totalPurchases * 0.15),
      hardwareAndAccessories: Math.round(input.totalPurchases * 0.05),
      otherConsumables: Math.round(input.totalPurchases * 0.05),
    },
    totalExpenses: Math.max(0, input.totalExpenses),
    expenseSplit: input.expenseSplit || {
      dailyLaborAndWages: Math.round(input.totalExpenses * 0.5),
      vehicleAndFuelBata: Math.round(input.totalExpenses * 0.2),
      powerAndGenerator: Math.round(input.totalExpenses * 0.15),
      maintenanceAndTools: Math.round(input.totalExpenses * 0.05),
      officeAndRefreshment: Math.round(input.totalExpenses * 0.05),
      miscellaneous: Math.round(input.totalExpenses * 0.05),
    },
    doorsProduced: Math.max(0, input.doorsProduced),
    openingCashInHand: input.openingCashInHand,
    closingCashInHand: input.closingCashInHand,
    shiftNotes: input.shiftNotes?.trim() || undefined,
    weatherOrMarketEvent: input.weatherOrMarketEvent?.trim() || undefined,
    dailyGrossProfit: metrics.grossProfit,
    dailyGrossMarginPct: metrics.grossMarginPct,
    dailyNetProfit: metrics.netProfit,
    dailyNetMarginPct: metrics.netMarginPct,
    actualMaterialCostPerDoor: metrics.actualMaterialCostPerDoor,
    boqVariancePerDoor: metrics.boqVariancePerDoor,
    dailyHealthScore: metrics.dailyHealthScore,
  };

  // Upsert by date
  const existingIndex = store.entries.findIndex((e) => e.entryDate === entryDate);
  if (existingIndex >= 0) {
    store.entries[existingIndex] = newEntry;
  } else {
    store.entries.push(newEntry);
  }

  // Sort chronological
  store.entries.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  writeDailyClosingStore(store);

  return newEntry;
}

/**
 * Computes Month-to-Date (MTD) Break-Even Absorption & Progress.
 */
export function computeMtdBreakEven(
  entries: DailyClosingEntry[],
  settings = DEFAULT_SETTINGS,
  targetMonthKey?: string
): MtdBreakEvenStatus {
  const monthKey = targetMonthKey || new Date().toISOString().slice(0, 7);
  const monthEntries = entries.filter((e) => e.entryDate.startsWith(monthKey));

  let mtdSalesRevenue = 0;
  let mtdPurchases = 0;
  let mtdExpenses = 0;
  let mtdDoorsProduced = 0;
  let mtdDoorsSold = 0;

  for (const e of monthEntries) {
    mtdSalesRevenue += e.totalSalesRevenue;
    mtdPurchases += e.totalPurchases;
    mtdExpenses += e.totalExpenses;
    mtdDoorsProduced += e.doorsProduced;
    mtdDoorsSold += e.doorsSold;
  }

  const mtdGrossProfit = mtdSalesRevenue - mtdPurchases;
  const mtdNetOperatingProfit = mtdGrossProfit - mtdExpenses;

  const totalDoors = mtdDoorsSold > 0 ? mtdDoorsSold : mtdDoorsProduced;
  const avgSellingPrice = totalDoors > 0 ? Math.round(mtdSalesRevenue / totalDoors) : 7500;
  const avgVarCost =
    totalDoors > 0 ? Math.round((mtdPurchases + mtdExpenses * 0.4) / totalDoors) : 4800;
  const contributionMargin = Math.max(1, avgSellingPrice - avgVarCost);

  const fixedOverhead = settings.monthlyFixedOverhead;
  const breakEvenDoorsNeeded = Math.ceil(fixedOverhead / contributionMargin);
  const breakEvenDoorsAchieved = mtdDoorsProduced;
  const breakEvenProgressPct =
    breakEvenDoorsNeeded > 0
      ? parseFloat(((breakEvenDoorsAchieved / breakEvenDoorsNeeded) * 100).toFixed(1))
      : 0;

  const elapsedDays = Math.max(1, new Date().getDate());
  const totalWorkingDays = settings.workingDaysPerMonth;
  const expectedPacePct = (elapsedDays / totalWorkingDays) * 100;

  let breakEvenStatus: MtdBreakEvenStatus['breakEvenStatus'] = 'ON_TRACK';
  if (breakEvenDoorsAchieved >= breakEvenDoorsNeeded) {
    breakEvenStatus = 'ACHIEVED';
  } else if (breakEvenProgressPct >= expectedPacePct - 5) {
    breakEvenStatus = 'ON_TRACK';
  } else if (breakEvenProgressPct >= expectedPacePct - 20) {
    breakEvenStatus = 'AT_RISK';
  } else {
    breakEvenStatus = 'BEHIND';
  }

  const dailyDoorPace = elapsedDays > 0 ? breakEvenDoorsAchieved / elapsedDays : 0;
  const doorsRemaining = Math.max(0, breakEvenDoorsNeeded - breakEvenDoorsAchieved);
  const daysToBreakEvenEstimated =
    dailyDoorPace > 0 && doorsRemaining > 0 ? Math.ceil(doorsRemaining / dailyDoorPace) : null;

  return {
    monthKey,
    elapsedDays,
    totalWorkingDays,
    monthlyFixedOverhead: fixedOverhead,
    mtdSalesRevenue,
    mtdPurchases,
    mtdExpenses,
    mtdGrossProfit,
    mtdNetOperatingProfit,
    mtdDoorsProduced,
    averageSellingPricePerDoor: avgSellingPrice,
    averageVariableCostPerDoor: avgVarCost,
    contributionMarginPerDoor: contributionMargin,
    breakEvenDoorsNeeded,
    breakEvenDoorsAchieved,
    breakEvenProgressPct,
    breakEvenStatus,
    daysToBreakEvenEstimated,
  };
}

/**
 * Computes 360° Business Health Scorecard.
 */
export function computeHealthScorecard(
  entries: DailyClosingEntry[],
  settings = DEFAULT_SETTINGS
): BusinessHealthScorecard {
  const recent = entries.slice(0, 14); // Last 14 logged entries
  if (recent.length === 0) {
    const dummyMetric = (label: string, unit: string) => ({
      label,
      value: 0,
      unit,
      target: 0,
      status: 'WATCH' as HealthStatus,
      commentary: 'Awaiting first daily evening entries to evaluate.',
    });
    return {
      overallScore: 50,
      overallStatus: 'WATCH',
      summary: 'No evening closing data entered yet. Start by logging today.',
      metrics: {
        grossMargin: dummyMetric('Gross Margin', '%'),
        netMargin: dummyMetric('Net Operating Margin', '%'),
        opexRatio: dummyMetric('Opex Ratio', '%'),
        boqMaterialEfficiency: dummyMetric('BOQ Variance', '₹/door'),
        breakEvenVelocity: dummyMetric('Break-Even Pace', '%'),
        cashGenerationRatio: dummyMetric('Cash Inflow Ratio', '%'),
      },
    };
  }

  let totSales = 0;
  let totPurchases = 0;
  let totExpenses = 0;
  let totDoors = 0;
  let totCashInflow = 0;

  for (const e of recent) {
    totSales += e.totalSalesRevenue;
    totPurchases += e.totalPurchases;
    totExpenses += e.totalExpenses;
    totDoors += e.doorsProduced;
    totCashInflow += e.salesSplit?.cash || 0 + (e.salesSplit?.bankUpi || 0);
  }

  const grossProfit = totSales - totPurchases;
  const netProfit = grossProfit - totExpenses;
  const grossMarginPct = totSales > 0 ? (grossProfit / totSales) * 100 : 0;
  const netMarginPct = totSales > 0 ? (netProfit / totSales) * 100 : 0;
  const opexRatio = totSales > 0 ? (totExpenses / totSales) * 100 : 0;

  const actualAvgMatCost = totDoors > 0 ? totPurchases / totDoors : settings.standardBoqCostPerDoor;
  const boqVariance = Math.round(actualAvgMatCost - settings.standardBoqCostPerDoor);

  const mtd = computeMtdBreakEven(entries, settings);
  const cashGenRatio = totSales > 0 ? (totCashInflow / totSales) * 100 : 0;

  // Grade Metrics
  const grossStatus: HealthStatus =
    grossMarginPct >= settings.targetGrossMarginPct ? 'HEALTHY' : grossMarginPct >= 25 ? 'WATCH' : 'CRITICAL';
  const netStatus: HealthStatus =
    netMarginPct >= settings.targetNetMarginPct ? 'HEALTHY' : netMarginPct >= 8 ? 'WATCH' : 'CRITICAL';
  const opexStatus: HealthStatus = opexRatio <= 20 ? 'HEALTHY' : opexRatio <= 28 ? 'WATCH' : 'CRITICAL';
  const boqStatus: HealthStatus = boqVariance <= 0 ? 'HEALTHY' : boqVariance <= 250 ? 'WATCH' : 'CRITICAL';
  const bepStatus: HealthStatus =
    mtd.breakEvenStatus === 'ACHIEVED' || mtd.breakEvenStatus === 'ON_TRACK'
      ? 'HEALTHY'
      : mtd.breakEvenStatus === 'AT_RISK'
      ? 'WATCH'
      : 'CRITICAL';
  const cashStatus: HealthStatus = cashGenRatio >= 85 ? 'HEALTHY' : cashGenRatio >= 65 ? 'WATCH' : 'CRITICAL';

  // Overall Score Calculation (0 - 100)
  let score = 0;
  score += grossStatus === 'HEALTHY' ? 25 : grossStatus === 'WATCH' ? 15 : 5;
  score += netStatus === 'HEALTHY' ? 25 : netStatus === 'WATCH' ? 15 : 0;
  score += opexStatus === 'HEALTHY' ? 15 : opexStatus === 'WATCH' ? 10 : 0;
  score += boqStatus === 'HEALTHY' ? 15 : boqStatus === 'WATCH' ? 10 : 0;
  score += bepStatus === 'HEALTHY' ? 10 : bepStatus === 'WATCH' ? 5 : 0;
  score += cashStatus === 'HEALTHY' ? 10 : cashStatus === 'WATCH' ? 5 : 0;

  const overallScore = Math.min(100, Math.max(0, score));
  const overallStatus: HealthStatus =
    overallScore >= 80 ? 'HEALTHY' : overallScore >= 60 ? 'WATCH' : 'CRITICAL';

  const summary =
    overallStatus === 'HEALTHY'
      ? `Strong financial performance. Gross margin at ${grossMarginPct.toFixed(1)}% and positive net cash velocity.`
      : overallStatus === 'WATCH'
      ? `Moderate health. Opex ratio is ${opexRatio.toFixed(1)}%. Monitor material variance against BOQ standards.`
      : `Critical warning. Low profit margin or high expense burn rate detected. Immediate operational review advised.`;

  return {
    overallScore,
    overallStatus,
    summary,
    metrics: {
      grossMargin: {
        label: 'Gross Profit Margin',
        value: parseFloat(grossMarginPct.toFixed(1)),
        unit: '%',
        target: settings.targetGrossMarginPct,
        status: grossStatus,
        commentary:
          grossStatus === 'HEALTHY'
            ? 'Exceeding target margin threshold.'
            : 'Pricing or raw material inflation pressure.',
      },
      netMargin: {
        label: 'Net Operating Margin',
        value: parseFloat(netMarginPct.toFixed(1)),
        unit: '%',
        target: settings.targetNetMarginPct,
        status: netStatus,
        commentary:
          netStatus === 'HEALTHY'
            ? 'Solid bottom-line cash profitability.'
            : 'Operating expenses eroding gross earnings.',
      },
      opexRatio: {
        label: 'Opex to Sales Ratio',
        value: parseFloat(opexRatio.toFixed(1)),
        unit: '%',
        target: 18,
        status: opexStatus,
        commentary:
          opexStatus === 'HEALTHY'
            ? 'Factory overheads lean and well-controlled.'
            : 'Daily labor, power, or fuel overhead is high relative to sales.',
      },
      boqMaterialEfficiency: {
        label: 'BOQ Material Cost Variance',
        value: boqVariance,
        unit: '₹/door',
        target: 0,
        status: boqStatus,
        commentary:
          boqStatus === 'HEALTHY'
            ? 'Actual door material cost is within standard BOQ recipe.'
            : `Actual cost ₹${Math.round(actualAvgMatCost)}/door vs BOQ budget ₹${settings.standardBoqCostPerDoor}.`,
      },
      breakEvenVelocity: {
        label: 'Break-Even Velocity',
        value: mtd.breakEvenProgressPct,
        unit: '%',
        target: 100,
        status: bepStatus,
        commentary:
          mtd.breakEvenStatus === 'ACHIEVED'
            ? 'Full factory fixed overhead absorbed for this month!'
            : `${mtd.breakEvenDoorsAchieved} / ${mtd.breakEvenDoorsNeeded} doors achieved to cover overheads.`,
      },
      cashGenerationRatio: {
        label: 'Cash Collection Ratio',
        value: parseFloat(cashGenRatio.toFixed(1)),
        unit: '%',
        target: 85,
        status: cashStatus,
        commentary:
          cashStatus === 'HEALTHY'
            ? 'Cash & UPI collections strong with low credit leakage.'
            : 'Excessive credit sales; tighten dealer credit window.',
      },
    },
  };
}

/**
 * Computes 30 / 60 / 90 Day Predictive Business Forecasting.
 */
export function computeForecasting(
  entries: DailyClosingEntry[],
  settings = DEFAULT_SETTINGS
): ForecastingProjections {
  const recent7 = entries.slice(0, 7);
  const sampleCount = recent7.length;

  if (sampleCount === 0) {
    return {
      runRateDailySales: 0,
      projectedMonthEndSales: 0,
      projectedMonthEndGrossProfit: 0,
      projectedMonthEndNetProfit: 0,
      projectedMonthEndDoors: 0,
      forecast60DayRevenue: 0,
      forecast90DayRevenue: 0,
      dailyCashBurnRate: 0,
      cashRunwayDays: 90,
      runwayStatus: 'HEALTHY',
      confidenceScore: 10,
    };
  }

  const avgDailySales = Math.round(
    recent7.reduce((sum, e) => sum + e.totalSalesRevenue, 0) / sampleCount
  );
  const avgDailyPurchases = Math.round(
    recent7.reduce((sum, e) => sum + e.totalPurchases, 0) / sampleCount
  );
  const avgDailyExpenses = Math.round(
    recent7.reduce((sum, e) => sum + e.totalExpenses, 0) / sampleCount
  );
  const avgDailyDoors = Math.round(
    recent7.reduce((sum, e) => sum + e.doorsProduced, 0) / sampleCount
  );

  const mtd = computeMtdBreakEven(entries, settings);
  const remainingWorkingDays = Math.max(0, settings.workingDaysPerMonth - mtd.elapsedDays);

  const projectedMonthEndSales = mtd.mtdSalesRevenue + avgDailySales * remainingWorkingDays;
  const projectedMonthEndPurchases = mtd.mtdPurchases + avgDailyPurchases * remainingWorkingDays;
  const projectedMonthEndExpenses = mtd.mtdExpenses + avgDailyExpenses * remainingWorkingDays;
  const projectedMonthEndGrossProfit = projectedMonthEndSales - projectedMonthEndPurchases;
  const projectedMonthEndNetProfit = projectedMonthEndGrossProfit - projectedMonthEndExpenses;
  const projectedMonthEndDoors = mtd.mtdDoorsProduced + avgDailyDoors * remainingWorkingDays;

  // 60 and 90 Day Horizon (assuming 26 working days per month)
  const forecast60DayRevenue = Math.round(projectedMonthEndSales + avgDailySales * 26);
  const forecast90DayRevenue = Math.round(forecast60DayRevenue + avgDailySales * 26);

  const dailyCashBurn = avgDailyPurchases + avgDailyExpenses;
  // Estimate runway assuming 15 days of operating cash buffer
  const cashRunwayDays = dailyCashBurn > 0 ? Math.round((avgDailySales * 20) / dailyCashBurn) : 90;
  const runwayStatus: HealthStatus =
    cashRunwayDays >= 45 ? 'HEALTHY' : cashRunwayDays >= 20 ? 'WATCH' : 'CRITICAL';

  const confidenceScore = Math.min(95, sampleCount * 14);

  return {
    runRateDailySales: avgDailySales,
    projectedMonthEndSales,
    projectedMonthEndGrossProfit,
    projectedMonthEndNetProfit,
    projectedMonthEndDoors,
    forecast60DayRevenue,
    forecast90DayRevenue,
    dailyCashBurnRate: dailyCashBurn,
    cashRunwayDays,
    runwayStatus,
    confidenceScore,
  };
}

/**
 * Pre-fills system suggestions for today's sales and door output from active ERP stores.
 */
export function getTodaySystemSuggestions(): {
  invoicedRevenue: number;
  doorsCompletedToday: number;
  purchaseOrdersLogged: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  let invoicedRevenue = 0;
  let doorsCompletedToday = 0;
  let purchaseOrdersLogged = 0;

  // Inspect finance-store.json for today's invoices
  try {
    const finPath = getDataFilePath('finance-store.json');
    if (fs.existsSync(finPath)) {
      const data = JSON.parse(fs.readFileSync(finPath, 'utf8'));
      if (Array.isArray(data?.invoices)) {
        for (const inv of data.invoices) {
          if (inv.invoiceDate === today || inv.createdAt?.slice(0, 10) === today) {
            invoicedRevenue += Number(inv.totalAmount || 0);
          }
        }
      }
    }
  } catch {}

  // Inspect production-store.json for completed doors today
  try {
    const prodPath = getDataFilePath('production-store.json');
    if (fs.existsSync(prodPath)) {
      const data = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
      const orders = Array.isArray(data?.orders) ? data.orders : [];
      for (const ord of orders) {
        if (ord.updatedAt?.slice(0, 10) === today && (ord.status === 'COMPLETED' || ord.status === 'QC_PASSED')) {
          doorsCompletedToday += Number(ord.quantity || 1);
        }
      }
    }
  } catch {}

  // Inspect purchases-store.json for logged purchases
  try {
    const purchPath = getDataFilePath('purchases-store.json');
    if (fs.existsSync(purchPath)) {
      const data = JSON.parse(fs.readFileSync(purchPath, 'utf8'));
      const orders = Array.isArray(data?.purchaseOrders) ? data.purchaseOrders : [];
      for (const po of orders) {
        if (po.orderDate === today || po.createdAt?.slice(0, 10) === today) {
          purchaseOrdersLogged += Number(po.totalAmount || 0);
        }
      }
    }
  } catch {}

  return {
    invoicedRevenue: Math.round(invoicedRevenue),
    doorsCompletedToday,
    purchaseOrdersLogged: Math.round(purchaseOrdersLogged),
  };
}

import { getDailyEveningBoqSummary } from './boqIssueService';

/**
 * Formats a clean, high-impact WhatsApp executive report text for factory partners.
 */
export function formatWhatsAppExecutiveReport(
  entry: DailyClosingEntry,
  mtd: MtdBreakEvenStatus,
  health: BusinessHealthScorecard,
  boqSummary?: import('./boqIssueService').DailyEveningBoqSummary | null
): string {
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const boqIndicator =
    entry.boqVariancePerDoor <= 0
      ? `✅ Under BOQ budget by ${fmt(Math.abs(entry.boqVariancePerDoor))}/door`
      : `⚠️ Over BOQ budget by +${fmt(entry.boqVariancePerDoor)}/door`;

  const boqBlock = boqSummary && boqSummary.totalDoorsIssued > 0
    ? [
        `───────────────────────────────`,
        `🧪 *Today's BOQ Material Consumption* (${boqSummary.totalDoorsIssued} Doors):`,
        `   • Resin: ${boqSummary.dayTotals.resinKg} Kg | Gelcoat: ${boqSummary.dayTotals.gelKg} Kg`,
        `   • Catalyst: ${boqSummary.dayTotals.catalystGrams}g | CSM 300: ${boqSummary.dayTotals.csm300Kg} Kg`,
        `   • Reepers: ${boqSummary.dayTotals.woodReepersCount} Pcs | Lock Kits: ${boqSummary.dayTotals.lockKitsCount}`,
        `   • Total Floor Material Value: ${fmt(boqSummary.totalMaterialValue)}`,
      ]
    : [];

  return [
    `🏭 *EXMARK DOORS — DAILY EVENING CLOSING*`,
    `📅 *Date*: ${entry.entryDate} | *By*: ${entry.enteredBy}`,
    `───────────────────────────────`,
    `💰 *Total Sales Billed*: ${fmt(entry.totalSalesRevenue)} (${entry.doorsSold} Doors)`,
    `   • Cash: ${fmt(entry.salesSplit?.cash || 0)}`,
    `   • Bank / UPI: ${fmt(entry.salesSplit?.bankUpi || 0)}`,
    `   • Credit: ${fmt(entry.salesSplit?.creditReceivable || 0)}`,
    `───────────────────────────────`,
    `📦 *Raw Material Purchases*: ${fmt(entry.totalPurchases)}`,
    `⚙️ *Operating Expenses*: ${fmt(entry.totalExpenses)}`,
    `🏭 *Factory Output*: ${entry.doorsProduced} Doors Finished`,
    ...boqBlock,
    `───────────────────────────────`,
    `📈 *Gross Profit*: ${fmt(entry.dailyGrossProfit)} (*${entry.dailyGrossMarginPct}%*)`,
    `🏆 *Net Operating Profit*: ${fmt(entry.dailyNetProfit)} (*${entry.dailyNetMarginPct}%*)`,
    `📊 *BOQ Unit Cost*: ${fmt(entry.actualMaterialCostPerDoor)}/door (${boqIndicator})`,
    `───────────────────────────────`,
    `🎯 *MTD Break-Even Pace*: ${mtd.breakEvenDoorsAchieved} / ${mtd.breakEvenDoorsNeeded} Doors (${mtd.breakEvenProgressPct}%)`,
    `⭐ *Business Health Score*: *${health.overallScore} / 100* (${health.overallStatus})`,
    entry.shiftNotes ? `📝 *Notes*: ${entry.shiftNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Returns full overview for UI and API endpoints.
 */
export function getDailyClosingOverview(targetDate?: string): DailyClosingOverviewResponse {
  const store = readDailyClosingStore();
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);
  const todayEntry = store.entries.find((e) => e.entryDate === dateStr) || null;

  const mtdBreakEven = computeMtdBreakEven(store.entries, store.settings);
  const healthScorecard = computeHealthScorecard(store.entries, store.settings);
  const forecasting = computeForecasting(store.entries, store.settings);
  const suggestedTodayData = getTodaySystemSuggestions();
  let todayBoqConsumption: DailyClosingOverviewResponse['todayBoqConsumption'] = undefined;
  try {
    todayBoqConsumption = getDailyEveningBoqSummary(dateStr);
  } catch {}

  return {
    todayEntry,
    historicalEntries: store.entries.slice(0, 30),
    mtdBreakEven,
    healthScorecard,
    forecasting,
    suggestedTodayData,
    todayBoqConsumption,
  };
}
