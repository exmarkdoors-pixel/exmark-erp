import {
  AiStrategistAnalysisResult,
  ForecastScenario,
  StrategicRecommendation,
  ProfitMaximizationPillar,
  MonthlyProjection,
  WhatIfParameters,
  WhatIfResult,
} from '@/types/aiStrategist';
import { listInvoices, listPayments, listFinancialTargets } from './financeService';
import { listProductionOrders } from './productionService';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateMonthlyProjections(
  baseMonthlyRev: number,
  growthRate: number,
  grossMarginPct: number,
  doorsPerMonth: number
): MonthlyProjection[] {
  const result: MonthlyProjection[] = [];
  const currentDate = new Date();
  const currentMonthIdx = currentDate.getMonth();

  for (let i = 0; i < 6; i++) {
    const monthIdx = (currentMonthIdx + i) % 12;
    const compoundMultiplier = Math.pow(1 + growthRate, i);
    const rev = Math.round(baseMonthlyRev * compoundMultiplier);
    const doors = Math.round(doorsPerMonth * compoundMultiplier);

    const cogsChemicals = Math.round(rev * (1 - grossMarginPct / 100) * 0.65);
    const directLaborGang = Math.round(rev * (1 - grossMarginPct / 100) * 0.35);
    const factoryOverheads = Math.round(380000 + i * 12000);
    const ebitda = Math.round(rev - (cogsChemicals + directLaborGang + factoryOverheads));
    const netProfit = Math.round(ebitda * 0.82); // After depreciation & taxes

    result.push({
      month: MONTH_NAMES[monthIdx],
      projectedRevenue: rev,
      cogsChemicals,
      directLaborGang,
      factoryOverheads,
      ebitda,
      netProfit,
      doorsVolume: doors,
    });
  }

  return result;
}

export function calculateWhatIf(params: WhatIfParameters): WhatIfResult {
  const baseMonthlyRev = 2850000;
  const baseMonthlyDoors = 350;
  const baseChemicalCogs = 1250000;
  const baseGangLabor = 480000;
  const baseOverheads = 420000;

  const volumeFactor = 1 + (params.volumePercentChange || 0) / 100;
  const priceFactor = 1 + (params.pricePercentChange || 0) / 100;
  const chemicalCostFactor = 1 + (params.chemicalCostPercentChange || 0) / 100;
  const laborEfficiencyFactor = 1 - (params.laborEfficiencyPercentChange || 0) / 100;

  const adjustedRevenue = Math.round(baseMonthlyRev * volumeFactor * priceFactor);
  const adjustedCogs = Math.round(
    baseChemicalCogs * volumeFactor * chemicalCostFactor +
    baseGangLabor * volumeFactor * laborEfficiencyFactor
  );
  const adjustedGrossProfit = adjustedRevenue - adjustedCogs;
  const adjustedEbitda = adjustedGrossProfit - baseOverheads;
  const adjustedNetProfit = Math.round(adjustedEbitda * 0.82);
  const adjustedGrossMarginPercent = Number(((adjustedGrossProfit / Math.max(adjustedRevenue, 1)) * 100).toFixed(1));

  const baselineGrossProfit = baseMonthlyRev - (baseChemicalCogs + baseGangLabor);
  const baselineEbitda = baselineGrossProfit - baseOverheads;
  const baselineNetProfit = Math.round(baselineEbitda * 0.82);

  const ebitdaDeltaRupees = adjustedEbitda - baselineEbitda;

  // Breakeven doors calculation
  const avgDoorPrice = (baseMonthlyRev / baseMonthlyDoors) * priceFactor;
  const variableCostPerDoor = adjustedCogs / (baseMonthlyDoors * volumeFactor);
  const contributionPerDoor = Math.max(1000, avgDoorPrice - variableCostPerDoor);
  const breakevenDoorsMonthly = Math.ceil(baseOverheads / contributionPerDoor);

  // Cash runway estimate based on ₹12L liquid reserves
  const cashRunwayMonths = Number(
    (1200000 / Math.max(adjustedCogs + baseOverheads - adjustedRevenue * 0.9, 250000)).toFixed(1)
  );

  return {
    baselineRevenue: baseMonthlyRev,
    baselineNetProfit,
    adjustedRevenue,
    adjustedNetProfit,
    adjustedGrossMarginPercent,
    adjustedEbitda,
    ebitdaDeltaRupees,
    breakevenDoorsMonthly,
    cashRunwayMonths: Math.min(12, Math.max(1.2, cashRunwayMonths)),
  };
}

export async function runAiStrategistAnalysis(): Promise<AiStrategistAnalysisResult> {
  const [invoices, payments, targets, prodOrders] = await Promise.all([
    listInvoices(),
    listPayments(),
    listFinancialTargets(),
    listProductionOrders(),
  ]);

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0) || 2850000;
  const totalReceivables = invoices.reduce((sum, i) => sum + i.balanceAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // DSO calculation
  const dsoDays = Math.round((totalReceivables / Math.max(totalBilled, 1)) * 30) || 24;

  const monthlyBurn = 450000;
  const estimatedBankBalance = Math.max(1150000, totalCollected - 200000);
  const cashRunwayMonths = parseFloat((estimatedBankBalance / monthlyBurn).toFixed(1));

  // High-margin FRP doors analysis
  let totalDoorsProduced = 0;
  let premiumDoorsCount = 0;

  prodOrders.forEach((order) => {
    order.doors.forEach((d) => {
      totalDoorsProduced++;
      if (d.model.includes('35mm') || d.model.includes('Teak') || d.model.includes('CNC') || d.model.includes('Molded')) {
        premiumDoorsCount++;
      }
    });
  });

  const highMarginShare = totalDoorsProduced > 0
    ? Math.round((premiumDoorsCount / totalDoorsProduced) * 100)
    : 68;

  // Health Score calculation (0 - 100)
  let healthScore = 78;
  if (dsoDays < 20) healthScore += 10;
  else if (dsoDays > 40) healthScore -= 15;

  if (cashRunwayMonths >= 3) healthScore += 10;
  else if (cashRunwayMonths < 1.5) healthScore -= 20;

  healthScore = Math.min(96, Math.max(45, healthScore));

  const activeTargetRev = targets[0]?.salesRevenueTarget || 2850000;
  const activeTargetDoors = targets[0]?.frpDoorQuantityTarget || 360;

  // 5-Pillar Profit Maximization System
  const profitMaximizationPillars: ProfitMaximizationPillar[] = [
    {
      id: 'pillar-1',
      title: 'Premium Molded & PU Texture Shift',
      category: 'PRODUCT_MIX',
      headline: 'Shift 25% of Standard Flush Orders to Molded Teak PU Coated Doors',
      baselineMetric: `${highMarginShare}% Premium Share (₹2,200 avg contribution/door)`,
      maximizedTarget: '85% Premium Share (₹4,100 avg contribution/door)',
      monthlyGainRupees: 245000,
      annualizedGainRupees: 2940000,
      implementationAction:
        'Instruct sales consultants & architect reps to showcase Natural Teak Molded EXGC-510 finishes during site measurements.',
      roiTimelineWeeks: 2,
    },
    {
      id: 'pillar-2',
      title: 'BOQ Chemical Resin Buffer Optimization',
      category: 'CHEMICAL_BOQ',
      headline: 'Trim Shop-Floor Resin & Glass Roving Wastage from 10% to 4%',
      baselineMetric: '10.5% Actual Resin Buffer Overrun',
      maximizedTarget: '4.0% Standard Lean Formulated Buffer',
      monthlyGainRupees: 135000,
      annualizedGainRupees: 1620000,
      implementationAction:
        'Enforce computerized pre-mixed resin weighing scales and calibrated peristaltic catalyst dispensers on Plant Lines 1 & 2.',
      roiTimelineWeeks: 1,
    },
    {
      id: 'pillar-3',
      title: 'Contractor Gang Labor Lock & Duplicate Protection',
      category: 'GANG_LABOR',
      headline: 'Automated Piece-Rate Stage Locking & Anti-Duplicate Payouts',
      baselineMetric: 'Manual stage advance claims with occasional duplicate rework charges',
      maximizedTarget: 'Single/Dual Team Door Picker with zero duplicate payout protection',
      monthlyGainRupees: 78000,
      annualizedGainRupees: 936000,
      implementationAction:
        'Enforce ERP gang stage locks so supervisors cannot credit duplicate molding payouts on the same door serial.',
      roiTimelineWeeks: 1,
    },
    {
      id: 'pillar-4',
      title: 'Mandatory 40% Advance Payment Gatekeeper',
      category: 'WORKING_CAPITAL',
      headline: 'Compress Collection DSO from 38 Days to 16 Days',
      baselineMetric: `${dsoDays} Days Sales Outstanding (₹${totalReceivables.toLocaleString('en-IN')} pending)`,
      maximizedTarget: '16 Days DSO with mandatory 40% verified advance before press release',
      monthlyGainRupees: 82000, // Imputed interest + bad debt reduction
      annualizedGainRupees: 984000,
      implementationAction:
        'Enforce system block on Job Card molding release until accounts marks 40% advance verified.',
      roiTimelineWeeks: 3,
    },
    {
      id: 'pillar-5',
      title: 'Dimensional Surcharge on Oversized Openings',
      category: 'DIMENSIONAL_PRICING',
      headline: 'Automated Pricing for Custom Heights (>210cm) and Widths (>90cm)',
      baselineMetric: 'Flat rates applied to custom architectural door openings',
      maximizedTarget: 'Automated +₹350/sq.ft dynamic rate card pricing on size excesses',
      monthlyGainRupees: 112000,
      annualizedGainRupees: 1344000,
      implementationAction:
        'Connect Mobile Field Measurement app directly to ERP FrpPricingEngine for real-time dimension surcharge.',
      roiTimelineWeeks: 1,
    },
  ];

  const totalMonthlyGain = profitMaximizationPillars.reduce((sum, p) => sum + p.monthlyGainRupees, 0);

  const recommendations: StrategicRecommendation[] = [
    {
      id: 'rec-1',
      category: 'CASH_FLOW',
      urgency: totalReceivables > 400000 ? 'CRITICAL' : 'HIGH',
      headline: 'Mandatory 40% Advance Lock on Kerala Dealer & Architect Orders',
      detailedAnalysis: `Current receivables stand at ₹${totalReceivables.toLocaleString('en-IN')}, with an estimated DSO of ${dsoDays} days. Enforcing mandatory 40% advance before press release eliminates bad debt risk and unlocks ₹8.2L in operating liquidity.`,
      recommendedAction: 'Keep advance verification gatekeeper locked on all job cards.',
      financialImpactEstimate: 'Accelerates cash turnaround by 18 days and reduces financing costs.',
      governanceNotice: 'Director approval required. AI Strategist cannot autonomously alter credit terms.',
    },
    {
      id: 'rec-2',
      category: 'PRICING',
      urgency: 'HIGH',
      headline: 'Promote 32mm Molded Teak & CNC Routing for Luxury Kerala Villas',
      detailedAnalysis: `Molded Teak and CNC Routed FRP doors yield ₹3,900 - ₹5,100 contribution margin per unit (44.5% CM ratio) compared to ₹2,200 for plain commodity bathroom doors.`,
      recommendedAction: 'Direct mobile field staff to pre-select Molded Teak during site measurements.',
      financialImpactEstimate: `Projected +₹2.45L monthly incremental profit if premium share rises to 85%.`,
      governanceNotice: 'Commercial advisory only. Does not modify factory retail price books.',
    },
    {
      id: 'rec-3',
      category: 'PRODUCTION',
      urgency: 'MEDIUM',
      headline: 'Hydrate Raw Chemical Inventory Ahead of Post-Monsoon Construction Surge',
      detailedAnalysis: 'Historical Kerala construction schedules surge in October-March. Maintaining 2 weeks of compression press pre-molding inventory buffers against supply chain price spikes.',
      recommendedAction: 'Secure bulk contracts for unsaturated polyester resin and roving.',
      financialImpactEstimate: 'Saves 3.5% on bulk chemical procurement and prevents press idle time.',
      governanceNotice: 'Requires Plant Operations Director sign-off on inventory purchase orders.',
    },
  ];

  const scenarios: ForecastScenario[] = [
    {
      scenario: 'CONSERVATIVE',
      title: 'Monsoon Construction Dip Scenario (-15% Volume)',
      description: 'Accounts for severe monsoon rainfall across Kerala districts slowing down site measurements and exterior framing.',
      projectedRevenue: Math.round(activeTargetRev * 0.85),
      projectedGrossProfit: Math.round(activeTargetRev * 0.85 * 0.32),
      projectedDoorsVolume: Math.round(activeTargetDoors * 0.85),
      projectedNetMarginPercentage: 11.8,
      assumptions: [
        'Site measurement visits in hilly districts reduced by 20% due to weather',
        'Raw material resin cost fluctuates up by 4% due to logistics tariffs',
        'Plant operates at single shift (8 hours)',
      ],
      riskFactors: [
        'Extended dealer payment terms requested',
        'Delayed site plastering by civil contractors',
      ],
      monthlyProjections: generateMonthlyProjections(activeTargetRev * 0.85, 0.015, 32, activeTargetDoors * 0.85),
    },
    {
      scenario: 'BASE_CASE',
      title: 'Current Operational Baseline & Approved Target',
      description: 'Consistent execution of authorized dealer orders across Kozhikode, Ernakulam, Malappuram and Thrissur with normal factory press cycles.',
      projectedRevenue: activeTargetRev,
      projectedGrossProfit: Math.round(activeTargetRev * 0.37),
      projectedDoorsVolume: activeTargetDoors,
      projectedNetMarginPercentage: 16.2,
      assumptions: [
        'Line 1 (300-ton press) maintains 88% capacity utilization',
        'Raw material supply chain remains stable at current contract rates',
        'Average realization of ₹8,400 per FRP door set',
      ],
      riskFactors: [
        'Periodic power cuts or diesel generator fuel cost escalation',
      ],
      monthlyProjections: generateMonthlyProjections(activeTargetRev, 0.035, 37, activeTargetDoors),
    },
    {
      scenario: 'EXPANSION_GROWTH',
      title: 'Northern Kerala Dealer Expansion (+25% Volume & Profit Maximization)',
      description: 'Aggressive onboarding of 15 new authorized hardware and sanitaryware dealers in Kannur, Kasaragod, and Ernakulam with full 5-pillar profit optimization.',
      projectedRevenue: Math.round(activeTargetRev * 1.25),
      projectedGrossProfit: Math.round(activeTargetRev * 1.25 * 0.42),
      projectedDoorsVolume: Math.round(activeTargetDoors * 1.25),
      projectedNetMarginPercentage: 21.5,
      assumptions: [
        'Second shift activated on Line 1 (Hydraulic Press) & Line 2 (CNC)',
        'Bulk procurement discount of 4% on unsaturated polyester resin and roving',
        '5-Pillar profit maximization targets fully met',
      ],
      riskFactors: [
        'Requires additional CNC operator and finishing staff recruitment',
        'Initial working capital requirement increases by ₹4.5 Lakhs',
      ],
      monthlyProjections: generateMonthlyProjections(activeTargetRev * 1.25, 0.055, 42, activeTargetDoors * 1.25),
    },
  ];

  const defaultWhatIf = calculateWhatIf({
    volumePercentChange: 0,
    pricePercentChange: 0,
    chemicalCostPercentChange: 0,
    laborEfficiencyPercentChange: 0,
  });

  return {
    generatedAt: new Date().toISOString(),
    financialHealthScore: healthScore,
    dsoDays,
    cashRunwayMonths,
    highMarginFRPSharePercentage: highMarginShare,
    currentMonthlyRevenue: activeTargetRev,
    currentMonthlyEbitda: Math.round(activeTargetRev * 0.22),
    maximizedMonthlyPotentialProfit: Math.round(activeTargetRev * 0.22) + totalMonthlyGain,
    profitMaximizationPillars,
    recommendations,
    scenarios,
    defaultWhatIf,
    governanceSummary: {
      canExecutePayments: false,
      canAlterLedger: false,
      requiresExecutiveApproval: true,
    },
  };
}
