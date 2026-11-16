// ── EXMARK ERP — Marketing, Sales Targets, Expansion & Staff Commission Types ───────

export type TargetPeriodType = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type CommissionStatus = 'PROJECTED' | 'ACCRUED' | 'PAID' | 'VOID';
export type TargetStatus = 'ACTIVE' | 'LOCKED' | 'ARCHIVED';
export type CommissionType = 'PERCENTAGE' | 'PER_PIECE';

export interface CommissionTier {
  minPercentOfTarget: number; // e.g. 0, 70, 100, 130
  maxPercentOfTarget?: number | null; // e.g. 70, 100, 130, null
  commissionPercent: number; // e.g. 1.5, 2.5, 3.5, 5.0
  perDoorRate?: number; // e.g. ₹100, ₹150, ₹250 per door
  tierLabel: string; // e.g. "Base (<70%)", "Standard (70-100%)", "Accelerator (100-130%)", "Super Performer (>130%)"
}

export interface CommissionPlan {
  id: string;
  name: string;
  isDefault: boolean;
  basePercent: number; // Default 2.5%
  defaultCommissionType?: CommissionType; // 'PERCENTAGE' or 'PER_PIECE'
  defaultPerPieceRate?: number; // Default ₹150/door
  tiers: CommissionTier[];
  productSpecificIncentives?: {
    productCategory: string; // e.g. "PREMIUM_PU", "WPC_FRAME_COMBO"
    extraIncentivePerDoor: number; // e.g. ₹100
  }[];
  advanceCollectionBonusPercent?: number; // e.g. 0.5% if client pays >= 50% advance
  advanceCollectionBonusPerDoor?: number; // e.g. ₹25 per door bonus if client pays >= 50% advance
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSalesTarget {
  id: string; // e.g. "tgt-emp001-2026-11"
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  territoryDistrict: string; // e.g. "Calicut & Wayanad"
  targetPeriod: string; // "YYYY-MM", e.g. "2026-11"
  periodType: TargetPeriodType;
  revenueTarget: number; // e.g. ₹5,00,000
  doorQuantityTarget: number; // e.g. 60 doors
  collectionTarget: number; // e.g. ₹2,50,000
  newClientsTarget?: number; // e.g. 3 builder accounts
  commissionPlanId: string;
  commissionType?: CommissionType; // 'PERCENTAGE' | 'PER_PIECE'
  commissionRate?: number; // e.g. 2.5 (%) or 150 (₹/door)
  baseCommissionPercent: number;
  perPieceRate?: number;
  expansionDistricts?: string[]; // e.g. ['Malappuram', 'Kozhikode', 'Wayanad']
  quarterlyDoorTarget?: number;
  quarterlyRevenueTarget?: number;
  expansionNotes?: string;
  achievedRevenue: number;
  achievedDoors: number;
  achievedCollections: number;
  achievedNewClients: number;
  earnedCommission: number;
  pendingCommission: number;
  paidCommission: number;
  status: TargetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SalesCommissionRecord {
  id: string;
  quotationId: string;
  quoteNumber: string;
  orderId?: string;
  jobCardNumber?: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  orderAmount: number;
  advancePaid: number;
  doorCount: number;
  premiumPuDoorCount?: number;
  salespersonId: string;
  salespersonCode: string;
  salespersonName: string;
  targetPeriod: string; // "YYYY-MM"
  commissionType: CommissionType; // 'PERCENTAGE' | 'PER_PIECE'
  commissionRate: number; // Rate value (e.g. 2.5% or 150/pc)
  perPieceRate?: number;
  baseRatePercent: number;
  tierAcceleratorPercent: number;
  advanceBonusPercent: number;
  effectiveCommissionPercent: number;
  baseCommissionAmount: number;
  bonusAmount: number;
  totalCommissionAmount: number;
  status: CommissionStatus;
  payoutBatchId?: string;
  paymentMode?: string;
  paymentRef?: string;
  paidAt?: string;
  paidBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCampaign {
  id: string;
  name: string; // e.g. "Kerala Architect Connect IIA", "Showroom Display Rack Rollout"
  channel: 'ARCHITECT_OUTREACH' | 'DEALER_DISPLAY_RACKS' | 'DIGITAL_CAMPAIGN' | 'EXPO_BOOTH' | 'SITE_VISIT';
  territory: string; // e.g. "Ernakulam & Kochi Metro"
  budget: number;
  actualSpend: number;
  leadsGenerated: number;
  ordersWon: number;
  revenueWon: number;
  roiPercent: number;
  startDate: string;
  endDate: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TerritoryExpansionPlan {
  id: string;
  districtOrRegion: string; // e.g. "Kannur & Kasaragod", "Kozhikode North"
  state: string; // "Kerala", "Karnataka", "Tamil Nadu"
  tierCategory: 'METRO' | 'TIER_2' | 'RURAL';
  targetDealers: number;
  activeDealers: number;
  installedDisplayRacks: number;
  assignedRepId?: string;
  assignedRepName?: string;
  monthlyPotentialDoors: number;
  monthlyPotentialRevenue: number;
  currentMonthlyRevenue: number;
  penetrationRatePercent: number;
  status: 'EXPANDING' | 'ESTABLISHED' | 'UNTAPPED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalespersonPerformanceMetrics {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  targetRevenue: number;
  achievedRevenue: number;
  revenuePacingPercent: number;
  targetDoors: number;
  achievedDoors: number;
  doorsPacingPercent: number;
  targetCollections: number;
  achievedCollections: number;
  quotesCount: number;
  closedOrdersCount: number;
  conversionRatePercent: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  totalCommissionPending: number;
  rank: number;
  isTopPerformer: boolean;
}

export interface ExpansionSimulationParams {
  newSalesRepresentatives: number; // e.g. 1 - 10
  newDealerRacks: number; // e.g. 5 - 50
  targetPenetrationGrowthPercent: number; // e.g. 5% - 30%
  averageDoorSellingPrice: number; // default ₹8,200
  averageDoorsPerDealerMonth: number; // default 8 doors
  repMonthlySalaryCost: number; // default ₹30,000
  rackInstallationCost: number; // default ₹15,000 one-time
}

export interface ExpansionSimulationResult {
  incrementalDoorsPerMonth: number;
  incrementalMonthlyRevenue: number;
  grossMarginPercent: number;
  incrementalGrossProfit: number;
  monthlyOperatingExpense: number;
  netIncrementalMonthlyProfit: number;
  annualizedRevenueDelta: number;
  annualizedProfitDelta: number;
  paybackPeriodMonths: number;
  factoryCapacityUtilizationPercent: number;
}
