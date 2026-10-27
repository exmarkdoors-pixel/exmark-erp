// ── AI Financial Strategist & Scenario Forecasting Types ─────────────────────

export type ForecastScenarioType = 'CONSERVATIVE' | 'BASE_CASE' | 'EXPANSION_GROWTH';

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
}

export interface StrategicRecommendation {
  id: string;
  category: 'CASH_FLOW' | 'PRICING' | 'PRODUCTION' | 'RISK_MANAGEMENT';
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  headline: string;
  detailedAnalysis: string;
  recommendedAction: string;
  financialImpactEstimate: string;
  governanceNotice: string; // Explicit statement: Requires Director sign-off, AI cannot autonomously execute
}

export interface AiStrategistAnalysisResult {
  generatedAt: string;
  financialHealthScore: number; // 0 - 100
  dsoDays: number; // Days Sales Outstanding
  cashRunwayMonths: number;
  highMarginFRPSharePercentage: number;
  recommendations: StrategicRecommendation[];
  scenarios: ForecastScenario[];
  governanceSummary: {
    canExecutePayments: false;
    canAlterLedger: false;
    requiresExecutiveApproval: true;
  };
}
