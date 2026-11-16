// ── AI Financial Strategist & Scenario Forecasting Types ─────────────────────

export type ForecastScenarioType = 'CONSERVATIVE' | 'BASE_CASE' | 'EXPANSION_GROWTH';

export interface MonthlyProjection {
  month: string;
  projectedRevenue: number;
  cogsChemicals: number;
  directLaborGang: number;
  factoryOverheads: number;
  ebitda: number;
  netProfit: number;
  doorsVolume: number;
}

export interface ForecastScenario {
  scenario: ForecastScenarioType;
  title: string;
  description: string;
  projectedRevenue: number;
  projectedGrossProfit: number;
  projectedDoorsVolume: number;
  projectedNetMarginPercentage: number;
  assumptions: string[];
  riskFactors: string[];
  monthlyProjections: MonthlyProjection[];
}

export interface ProfitMaximizationPillar {
  id: string;
  title: string;
  category: 'PRODUCT_MIX' | 'CHEMICAL_BOQ' | 'GANG_LABOR' | 'WORKING_CAPITAL' | 'DIMENSIONAL_PRICING';
  headline: string;
  baselineMetric: string;
  maximizedTarget: string;
  monthlyGainRupees: number;
  annualizedGainRupees: number;
  implementationAction: string;
  roiTimelineWeeks: number;
}

export interface StrategicRecommendation {
  id: string;
  category: 'CASH_FLOW' | 'PRICING' | 'PRODUCTION' | 'RISK_MANAGEMENT';
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  headline: string;
  detailedAnalysis: string;
  recommendedAction: string;
  financialImpactEstimate: string;
  governanceNotice: string;
}

export interface WhatIfParameters {
  volumePercentChange: number; // e.g. -20 to +50
  pricePercentChange: number; // e.g. -10 to +20
  chemicalCostPercentChange: number; // e.g. -10 to +20
  laborEfficiencyPercentChange: number; // e.g. -10 to +20
}

export interface WhatIfResult {
  baselineRevenue: number;
  baselineNetProfit: number;
  adjustedRevenue: number;
  adjustedNetProfit: number;
  adjustedGrossMarginPercent: number;
  adjustedEbitda: number;
  ebitdaDeltaRupees: number;
  breakevenDoorsMonthly: number;
  cashRunwayMonths: number;
}

export interface AiStrategistAnalysisResult {
  generatedAt: string;
  financialHealthScore: number; // 0 - 100
  dsoDays: number; // Days Sales Outstanding
  cashRunwayMonths: number;
  highMarginFRPSharePercentage: number;
  currentMonthlyRevenue: number;
  currentMonthlyEbitda: number;
  maximizedMonthlyPotentialProfit: number;
  profitMaximizationPillars: ProfitMaximizationPillar[];
  recommendations: StrategicRecommendation[];
  scenarios: ForecastScenario[];
  defaultWhatIf: WhatIfResult;
  governanceSummary: {
    canExecutePayments: false;
    canAlterLedger: false;
    requiresExecutiveApproval: true;
  };
}
