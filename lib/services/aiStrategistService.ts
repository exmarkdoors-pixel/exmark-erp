import {
  AiStrategistAnalysisResult,
  ForecastScenario,
  StrategicRecommendation,
} from '@/types/aiStrategist';
import { listInvoices, listPayments, listFinancialTargets } from './financeService';
import { listProductionOrders } from './productionService';

export async function runAiStrategistAnalysis(): Promise<AiStrategistAnalysisResult> {
  const [invoices, payments, targets, prodOrders] = await Promise.all([
    listInvoices(),
    listPayments(),
    listFinancialTargets(),
    listProductionOrders(),
  ]);

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0) || 500000;
  const totalReceivables = invoices.reduce((sum, i) => sum + i.balanceAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // DSO = (Receivables / Invoiced Sales) * 365 (or 30 if monthly)
  const dsoDays = Math.round((totalReceivables / Math.max(totalBilled, 1)) * 30);

  // Monthly burn estimate (factory fixed costs + wages ~ 4.5L)
  const monthlyBurn = 450000;
  const estimatedBankBalance = Math.max(850000, totalCollected - 200000);
  const cashRunwayMonths = parseFloat((estimatedBankBalance / monthlyBurn).toFixed(1));

  // High-margin FRP doors analysis:
  // Models like 35mm Heavy Duty Rosewood or 32mm Molded Teak are premium margin
  let totalDoorsProduced = 0;
  let premiumDoorsCount = 0;

  prodOrders.forEach((order) => {
    order.doors.forEach((d) => {
      totalDoorsProduced++;
      if (d.model.includes('35mm') || d.model.includes('Teak') || d.model.includes('CNC')) {
        premiumDoorsCount++;
      }
    });
  });

  const highMarginShare = totalDoorsProduced > 0
    ? Math.round((premiumDoorsCount / totalDoorsProduced) * 100)
    : 65;

  // Health Score calculation (0 - 100)
  let healthScore = 75;
  if (dsoDays < 20) healthScore += 10;
  else if (dsoDays > 40) healthScore -= 15;

  if (cashRunwayMonths >= 3) healthScore += 10;
  else if (cashRunwayMonths < 1.5) healthScore -= 20;

  healthScore = Math.min(95, Math.max(40, healthScore));

  const recommendations: StrategicRecommendation[] = [
    {
      id: 'rec-1',
      category: 'CASH_FLOW',
      urgency: totalReceivables > 200000 ? 'HIGH' : 'MEDIUM',
      headline: 'Implement 50% Advance Requirement on Dealer Stocking Orders',
      detailedAnalysis: `Current receivables stand at ₹${totalReceivables.toLocaleString('en-IN')}, with an estimated DSO of ${dsoDays} days. Enforcing mandatory 50% advance before job card release will trim collection lag and protect operating liquidity.`,
      recommendedAction: 'Apply advance payment rule to all dealer orders exceeding ₹1,00,000.',
      financialImpactEstimate: 'Accelerates working capital turnover by 14 days and lowers bad debt exposure.',
      governanceNotice: 'Director approval required. AI Strategist cannot autonomously alter credit limits or hold dealer dispatches.',
    },
    {
      id: 'rec-2',
      category: 'PRICING',
      urgency: 'HIGH',
      headline: 'Prioritize 32mm & 35mm Molded Teak FRP Doors over Commodity Plain Doors',
      detailedAnalysis: `Molded Teak and CNC Routed FRP doors yield ₹3,700 - ₹4,900 contribution margin per unit (43.5% CM ratio) compared to ₹2,200 for plain bathroom doors. Premium models currently represent ${highMarginShare}% of shop floor volume.`,
      recommendedAction: 'Direct sales executive follow-ups to push premium timber textures for high-end Kerala villa projects.',
      financialImpactEstimate: 'Estimated ₹1.8L monthly incremental contribution margin if premium share rises to 80%.',
      governanceNotice: 'Commercial strategy advisory only. Does not modify factory retail price books.',
    },
    {
      id: 'rec-3',
      category: 'PRODUCTION',
      urgency: 'MEDIUM',
      headline: 'Pre-Molding Stock Buffer Ahead of South-West Monsoon Construction Surge',
      detailedAnalysis: 'Historical Kerala construction schedules experience heavy pre-monsoon roofing and post-monsoon interior fitting surges. Hydrating fiberglass roving stock in April prevents monsoon transit delays.',
      recommendedAction: 'Schedule 2 weeks of compression press pre-molding for standard sizes (2100x900mm).',
      financialImpactEstimate: 'Prevents factory stock-outs and captures emergency contractor spot orders.',
      governanceNotice: 'Requires Plant Operations Director sign-off on inventory purchase orders.',
    },
  ];

  const activeTargetRev = targets[0]?.salesRevenueTarget || 3000000;
  const activeTargetDoors = targets[0]?.frpDoorQuantityTarget || 380;

  const scenarios: ForecastScenario[] = [
    {
      scenario: 'CONSERVATIVE',
      title: 'Monsoon Construction Dip Scenario (-15% Volume)',
      description: 'Accounts for severe monsoon rainfall across Kerala districts slowing down site measurements and exterior framing.',
      projectedRevenue: Math.round(activeTargetRev * 0.85),
      projectedGrossProfit: Math.round(activeTargetRev * 0.85 * 0.32),
      projectedDoorsVolume: Math.round(activeTargetDoors * 0.85),
      projectedNetMarginPercentage: 11.5,
      assumptions: [
        'Site measurement visits in Wayanad and Idukki reduced by 25% due to weather',
        'Raw material resin cost fluctuates up by 5% due to logistics tariffs',
        'Plant operates at single shift (8 hours)',
      ],
      riskFactors: [
        'Extended dealer payment terms requested',
        'Delayed site plastering by civil contractors',
      ],
    },
    {
      scenario: 'BASE_CASE',
      title: 'Current Operational Baseline & Approved Target',
      description: 'Consistent execution of authorized dealer orders across Kozhikode, Ernakulam and Thrissur with normal factory press cycles.',
      projectedRevenue: activeTargetRev,
      projectedGrossProfit: Math.round(activeTargetRev * 0.36),
      projectedDoorsVolume: activeTargetDoors,
      projectedNetMarginPercentage: 15.8,
      assumptions: [
        'Line 1 (300-ton press) maintains 88% capacity utilization',
        'Raw material supply chain remains stable at current contract rates',
        'Average realization of ₹8,500 per FRP door set',
      ],
      riskFactors: [
        'Periodic power cuts or diesel generator fuel cost escalation',
      ],
    },
    {
      scenario: 'EXPANSION_GROWTH',
      title: 'Northern Kerala Dealer Expansion Scenario (+25% Volume)',
      description: 'Aggressive onboarding of 15 new authorized hardware and sanitaryware dealers in Kannur, Kasaragod, and Malappuram.',
      projectedRevenue: Math.round(activeTargetRev * 1.25),
      projectedGrossProfit: Math.round(activeTargetRev * 1.25 * 0.39),
      projectedDoorsVolume: Math.round(activeTargetDoors * 1.25),
      projectedNetMarginPercentage: 19.4,
      assumptions: [
        'Second shift activated on Line 1 (Hydraulic Press) & Line 2 (CNC)',
        'Bulk procurement discount of 4% on unsaturated polyester resin and roving',
        'Dealers maintain 30-day payment cycle backed by security post-dated cheques',
      ],
      riskFactors: [
        'Requires additional CNC operator and finishing staff recruitment',
        'Initial working capital requirement increases by ₹4.5 Lakhs',
      ],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    financialHealthScore: healthScore,
    dsoDays,
    cashRunwayMonths,
    highMarginFRPSharePercentage: highMarginShare,
    recommendations,
    scenarios,
    governanceSummary: {
      canExecutePayments: false,
      canAlterLedger: false,
      requiresExecutiveApproval: true,
    },
  };
}
