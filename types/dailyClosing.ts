/**
 * EXMARK ERP — Daily Evening Business Closing & Financial Health Forecasting Types
 */

export interface SalesPaymentSplit {
  cash: number;
  bankUpi: number;
  creditReceivable: number;
}

export interface PurchaseCategorySplit {
  timberAndFrames: number;
  boardsAndSkins: number; // MDF, HDF, FRP sheets
  glueAndResins: number;  // Resins, catalyst, adhesives
  hardwareAndAccessories: number;
  otherConsumables: number;
}

export interface OperatingExpenseSplit {
  dailyLaborAndWages: number;
  vehicleAndFuelBata: number;
  powerAndGenerator: number;
  maintenanceAndTools: number;
  officeAndRefreshment: number;
  miscellaneous: number;
}

export interface DailyClosingEntry {
  id: string; // e.g. "EOD-2026-11-16"
  entryDate: string; // "YYYY-MM-DD"
  timestamp: string; // ISO 8601
  enteredBy: string; // Username of manager / accountant

  // 1. Sales & Revenue
  totalSalesRevenue: number;
  doorsSold: number;
  salesSplit: SalesPaymentSplit;

  // 2. Purchases & Direct Material
  totalPurchases: number;
  purchaseSplit: PurchaseCategorySplit;

  // 3. Operational Expenses (Opex)
  totalExpenses: number;
  expenseSplit: OperatingExpenseSplit;

  // 4. Production & Factory Output
  doorsProduced: number;

  // 5. Cash Reconciliation (Optional)
  openingCashInHand?: number;
  closingCashInHand?: number;

  // 6. Qualitative Context
  shiftNotes?: string;
  weatherOrMarketEvent?: string; // e.g. "Heavy monsoon downpour", "Transport strike"

  // System Calculated Daily Snapshot
  dailyGrossProfit: number;
  dailyGrossMarginPct: number;
  dailyNetProfit: number;
  dailyNetMarginPct: number;
  actualMaterialCostPerDoor: number;
  boqVariancePerDoor: number; // Positive = Overrun, Negative = Savings
  dailyHealthScore: number; // 0 - 100
}

export interface DailyClosingStore {
  entries: DailyClosingEntry[];
  settings: {
    monthlyFixedOverhead: number; // Default: 350000
    targetGrossMarginPct: number; // Default: 35%
    targetNetMarginPct: number;   // Default: 15%
    standardBoqCostPerDoor: number; // Default: 2200
    workingDaysPerMonth: number;  // Default: 26
  };
  updatedAt: string;
}

export type HealthStatus = 'HEALTHY' | 'WATCH' | 'CRITICAL';

export interface BusinessHealthMetric {
  label: string;
  value: number;
  unit: string;
  target: number;
  status: HealthStatus;
  commentary: string;
}

export interface BusinessHealthScorecard {
  overallScore: number; // 0 - 100
  overallStatus: HealthStatus;
  summary: string;
  metrics: {
    grossMargin: BusinessHealthMetric;
    netMargin: BusinessHealthMetric;
    opexRatio: BusinessHealthMetric;
    boqMaterialEfficiency: BusinessHealthMetric;
    breakEvenVelocity: BusinessHealthMetric;
    cashGenerationRatio: BusinessHealthMetric;
  };
}

export interface MtdBreakEvenStatus {
  monthKey: string; // "YYYY-MM"
  elapsedDays: number;
  totalWorkingDays: number;
  monthlyFixedOverhead: number;
  mtdSalesRevenue: number;
  mtdPurchases: number;
  mtdExpenses: number;
  mtdGrossProfit: number;
  mtdNetOperatingProfit: number;
  mtdDoorsProduced: number;
  averageSellingPricePerDoor: number;
  averageVariableCostPerDoor: number;
  contributionMarginPerDoor: number;
  breakEvenDoorsNeeded: number;
  breakEvenDoorsAchieved: number;
  breakEvenProgressPct: number;
  breakEvenStatus: 'ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
  daysToBreakEvenEstimated: number | null;
}

export interface ForecastingProjections {
  runRateDailySales: number;
  projectedMonthEndSales: number;
  projectedMonthEndGrossProfit: number;
  projectedMonthEndNetProfit: number;
  projectedMonthEndDoors: number;
  forecast60DayRevenue: number;
  forecast90DayRevenue: number;
  dailyCashBurnRate: number;
  cashRunwayDays: number;
  runwayStatus: HealthStatus;
  confidenceScore: number; // 0 - 100% based on entry count
}

export interface DailyClosingOverviewResponse {
  todayEntry: DailyClosingEntry | null;
  historicalEntries: DailyClosingEntry[];
  mtdBreakEven: MtdBreakEvenStatus;
  healthScorecard: BusinessHealthScorecard;
  forecasting: ForecastingProjections;
  suggestedTodayData: {
    invoicedRevenue: number;
    doorsCompletedToday: number;
    purchaseOrdersLogged: number;
  };
}
