// ── Expense & Cost-Cutting Intelligence Types ───────────────────────────────

export type ExpenseCategoryDomain =
  | 'FOOD_CANTEEN'
  | 'FUEL_FLEET'
  | 'LABOR_OVERTIME'
  | 'ELECTRICITY_POWER'
  | 'CHEMICAL_WASTAGE'
  | 'OFFICE_MISC';

export interface ExpenseDomainBreakdown {
  domain: ExpenseCategoryDomain;
  label: string;
  labelMl: string;
  monthlyAmount: number;
  weeklyAmount: number;
  percentageOfOverheads: number;
  costPerDoor: number;
  benchmarkCostPerDoor: number;
  variancePercentage: number;
  anomalyDetected: boolean;
  anomalyReason?: string;
  iconName: string;
  colorClass: string;
}

export interface CostCuttingSuggestion {
  id: string;
  domain: ExpenseCategoryDomain;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  titleMl: string;
  headline: string;
  detailedAudit: string;
  actionItem: string;
  policyRecommendation: string;
  currentExpenseMonthly: number;
  targetBenchmarkMonthly: number;
  estimatedMonthlySavings: number;
  annualizedSavings: number;
  roiDays: number;
}

export interface ExpenseIntelligenceReport {
  timestamp: string;
  periodLabel: string;
  totalMonthlyOverheads: number;
  totalMonthlyRevenue: number;
  overheadToRevenueRatio: number;
  totalManufacturedDoors: number;
  averageOverheadPerDoor: number;
  domains: ExpenseDomainBreakdown[];
  anomalyAlerts: CostCuttingSuggestion[];
  generalSuggestions: CostCuttingSuggestion[];
  totalPotentialMonthlySavings: number;
  totalPotentialAnnualSavings: number;
  projectedNetMarginGainPercent: number;
}

export interface CostCuttingSimulationInput {
  activeSuggestionIds: string[];
}

export interface CostCuttingSimulationResult {
  activeCount: number;
  monthlySavings: number;
  annualSavings: number;
  originalOverheadRatio: number;
  newOverheadRatio: number;
  originalMarginPercent: number;
  projectedMarginPercent: number;
  extendedCashRunwayDays: number;
}
