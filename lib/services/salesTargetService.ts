import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { assertWriteAllowed } from './dbSyncEngine';
import { readEmployeesStore } from './employeeStore';
import {
  StaffSalesTarget,
  CommissionPlan,
  CommissionTier,
  SalesCommissionRecord,
  MarketingCampaign,
  TerritoryExpansionPlan,
  SalespersonPerformanceMetrics,
  ExpansionSimulationParams,
  ExpansionSimulationResult,
} from '@/types/salesTarget';

// ── Store File Paths ─────────────────────────────────────────────────────────

const getTargetsStorePath = () => getDataFilePath('sales-targets-store.json');
const getPlansStorePath = () => getDataFilePath('commission-plans-store.json');
const getCommissionsStorePath = () => getDataFilePath('sales-commissions-store.json');
const getExpansionStorePath = () => getDataFilePath('marketing-expansion-store.json');

// ── Default Baseline Seeds ───────────────────────────────────────────────────

export const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  { minPercentOfTarget: 0, maxPercentOfTarget: 70, commissionPercent: 1.5, perDoorRate: 100, tierLabel: 'Base Threshold (<70%)' },
  { minPercentOfTarget: 70, maxPercentOfTarget: 100, commissionPercent: 2.5, perDoorRate: 150, tierLabel: 'Standard Target (70–100%)' },
  { minPercentOfTarget: 100, maxPercentOfTarget: 130, commissionPercent: 3.5, perDoorRate: 200, tierLabel: 'Target Accelerator (100–130%)' },
  { minPercentOfTarget: 130, maxPercentOfTarget: null, commissionPercent: 5.0, perDoorRate: 250, tierLabel: 'Super Performer (>130%)' },
];

export const DEFAULT_COMMISSION_PLAN: CommissionPlan = {
  id: 'comm-plan-kerala-standard',
  name: 'Standard Kerala Field & Project Representative Plan',
  isDefault: true,
  basePercent: 2.5,
  defaultCommissionType: 'PERCENTAGE',
  defaultPerPieceRate: 150,
  tiers: DEFAULT_COMMISSION_TIERS,
  productSpecificIncentives: [
    { productCategory: 'PREMIUM_PU', extraIncentivePerDoor: 100 },
    { productCategory: 'WPC_FRAME_COMBO', extraIncentivePerDoor: 150 },
  ],
  advanceCollectionBonusPercent: 0.5, // +0.5% incentive if advance >= 50%
  advanceCollectionBonusPerDoor: 25, // +₹25/door incentive if advance >= 50%
  notes: 'Tier accelerators apply across all closed orders once staff passes target threshold.',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

export const DEFAULT_KERALA_TERRITORIES: TerritoryExpansionPlan[] = [
  {
    id: 'terr-malappuram',
    districtOrRegion: 'Malappuram (Home Base)',
    state: 'Kerala',
    tierCategory: 'METRO',
    targetDealers: 50,
    activeDealers: 35,
    installedDisplayRacks: 26,
    monthlyPotentialDoors: 550,
    monthlyPotentialRevenue: 4510000,
    currentMonthlyRevenue: 2870000,
    penetrationRatePercent: 70.0,
    status: 'ESTABLISHED',
    notes: 'Home territory — high builder brand loyalty, Vengara/Kottakkal/Manjeri dealer network.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-kozhikode',
    districtOrRegion: 'Kozhikode',
    state: 'Kerala',
    tierCategory: 'METRO',
    targetDealers: 45,
    activeDealers: 24,
    installedDisplayRacks: 18,
    monthlyPotentialDoors: 480,
    monthlyPotentialRevenue: 3936000,
    currentMonthlyRevenue: 1968000,
    penetrationRatePercent: 53.3,
    status: 'ESTABLISHED',
    notes: 'City & Feroke commercial hubs with active architect specifications.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-ernakulam',
    districtOrRegion: 'Ernakulam & Kochi Metro',
    state: 'Kerala',
    tierCategory: 'METRO',
    targetDealers: 60,
    activeDealers: 19,
    installedDisplayRacks: 15,
    monthlyPotentialDoors: 750,
    monthlyPotentialRevenue: 6150000,
    currentMonthlyRevenue: 1558000,
    penetrationRatePercent: 25.3,
    status: 'EXPANDING',
    notes: 'Massive apartment high-rise and luxury villa expansion potential in Aluva & Kakkanad.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-thrissur',
    districtOrRegion: 'Thrissur',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 40,
    activeDealers: 16,
    installedDisplayRacks: 12,
    monthlyPotentialDoors: 380,
    monthlyPotentialRevenue: 3116000,
    currentMonthlyRevenue: 1312000,
    penetrationRatePercent: 40.0,
    status: 'EXPANDING',
    notes: 'High NRI residential construction and commercial showroom market.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-palakkad',
    districtOrRegion: 'Palakkad',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 35,
    activeDealers: 11,
    installedDisplayRacks: 8,
    monthlyPotentialDoors: 300,
    monthlyPotentialRevenue: 2460000,
    currentMonthlyRevenue: 902000,
    penetrationRatePercent: 31.4,
    status: 'EXPANDING',
    notes: 'Industrial and border transit corridor with growing builder accounts.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-kannur',
    districtOrRegion: 'Kannur',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 35,
    activeDealers: 13,
    installedDisplayRacks: 10,
    monthlyPotentialDoors: 320,
    monthlyPotentialRevenue: 2624000,
    currentMonthlyRevenue: 1066000,
    penetrationRatePercent: 37.1,
    status: 'EXPANDING',
    notes: 'Coastal moisture climate makes FRP premium replacement highly receptive.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-kasaragod',
    districtOrRegion: 'Kasaragod',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 25,
    activeDealers: 7,
    installedDisplayRacks: 5,
    monthlyPotentialDoors: 200,
    monthlyPotentialRevenue: 1640000,
    currentMonthlyRevenue: 574000,
    penetrationRatePercent: 28.0,
    status: 'EXPANDING',
    notes: 'Kanhangad & Kasaragod coastal plywood dealers converting to FRP displays.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-wayanad',
    districtOrRegion: 'Wayanad',
    state: 'Kerala',
    tierCategory: 'RURAL',
    targetDealers: 20,
    activeDealers: 8,
    installedDisplayRacks: 6,
    monthlyPotentialDoors: 160,
    monthlyPotentialRevenue: 1312000,
    currentMonthlyRevenue: 656000,
    penetrationRatePercent: 40.0,
    status: 'EXPANDING',
    notes: 'Eco-resort, homestay and plantation bungalow teak finish architectural demand.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-kottayam',
    districtOrRegion: 'Kottayam',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 30,
    activeDealers: 6,
    installedDisplayRacks: 4,
    monthlyPotentialDoors: 280,
    monthlyPotentialRevenue: 2296000,
    currentMonthlyRevenue: 492000,
    penetrationRatePercent: 20.0,
    status: 'EXPANDING',
    notes: 'Central Travancore rubber-belt luxury homebuilders and church renovation projects.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-alappuzha',
    districtOrRegion: 'Alappuzha',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 25,
    activeDealers: 5,
    installedDisplayRacks: 3,
    monthlyPotentialDoors: 220,
    monthlyPotentialRevenue: 1804000,
    currentMonthlyRevenue: 410000,
    penetrationRatePercent: 20.0,
    status: 'UNTAPPED',
    notes: 'Waterfront resorts & backwater villas requiring 100% waterproof door solutions.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-kollam',
    districtOrRegion: 'Kollam',
    state: 'Kerala',
    tierCategory: 'TIER_2',
    targetDealers: 35,
    activeDealers: 7,
    installedDisplayRacks: 5,
    monthlyPotentialDoors: 320,
    monthlyPotentialRevenue: 2624000,
    currentMonthlyRevenue: 574000,
    penetrationRatePercent: 20.0,
    status: 'UNTAPPED',
    notes: 'Cashew processing belt and coastal city expansion.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-trivandrum',
    districtOrRegion: 'Thiruvananthapuram',
    state: 'Kerala',
    tierCategory: 'METRO',
    targetDealers: 50,
    activeDealers: 8,
    installedDisplayRacks: 6,
    monthlyPotentialDoors: 520,
    monthlyPotentialRevenue: 4264000,
    currentMonthlyRevenue: 656000,
    penetrationRatePercent: 16.0,
    status: 'UNTAPPED',
    notes: 'Capital city tech park expansion, government institutional & builder segment.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-idukki',
    districtOrRegion: 'Idukki',
    state: 'Kerala',
    tierCategory: 'RURAL',
    targetDealers: 15,
    activeDealers: 3,
    installedDisplayRacks: 2,
    monthlyPotentialDoors: 120,
    monthlyPotentialRevenue: 984000,
    currentMonthlyRevenue: 246000,
    penetrationRatePercent: 20.0,
    status: 'UNTAPPED',
    notes: 'Munnar & Kattappana high-altitude damp weather resort doors.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'terr-pathanamthitta',
    districtOrRegion: 'Pathanamthitta',
    state: 'Kerala',
    tierCategory: 'RURAL',
    targetDealers: 20,
    activeDealers: 4,
    installedDisplayRacks: 3,
    monthlyPotentialDoors: 150,
    monthlyPotentialRevenue: 1230000,
    currentMonthlyRevenue: 328000,
    penetrationRatePercent: 20.0,
    status: 'UNTAPPED',
    notes: 'NRI homebuilder community centered around Thiruvalla and Adoor.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

// ── Generic File Store Helpers ───────────────────────────────────────────────

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ── Commission Plans API ─────────────────────────────────────────────────────

export async function listCommissionPlans(): Promise<CommissionPlan[]> {
  const plans = readJsonFile<CommissionPlan[]>(getPlansStorePath(), [DEFAULT_COMMISSION_PLAN]);
  return plans;
}

export async function getDefaultCommissionPlan(): Promise<CommissionPlan> {
  const plans = await listCommissionPlans();
  return plans.find((p) => p.isDefault) || plans[0] || DEFAULT_COMMISSION_PLAN;
}

export async function saveCommissionPlan(plan: CommissionPlan): Promise<CommissionPlan> {
  await assertWriteAllowed('save commission plan');
  const plans = await listCommissionPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  const now = new Date().toISOString();
  if (idx !== -1) {
    plans[idx] = { ...plan, updatedAt: now };
  } else {
    plans.unshift({ ...plan, createdAt: now, updatedAt: now });
  }
  writeJsonFile(getPlansStorePath(), plans);
  return plan;
}

// ── Staff Sales Targets API ──────────────────────────────────────────────────

export function getCurrentPeriodKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function listStaffTargets(targetPeriod?: string): Promise<StaffSalesTarget[]> {
  const period = targetPeriod || getCurrentPeriodKey();
  let targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);

  // Ensure active staff have initialized targets for the current period
  const employees = readEmployeesStore().filter((e) => e.status === 'ACTIVE');
  let changed = false;

  for (const emp of employees) {
    const exists = targets.some((t) => t.employeeId === emp.id && t.targetPeriod === period);
    if (!exists) {
      const defaultPlan = await getDefaultCommissionPlan();
      const newTarget: StaffSalesTarget = {
        id: `tgt-${emp.employeeCode.toLowerCase()}-${period}`,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        department: emp.department || 'Sales & Projects',
        territoryDistrict: emp.location || 'Kozhikode & Malappuram',
        targetPeriod: period,
        periodType: 'MONTHLY',
        revenueTarget: 500000, // ₹5.00L baseline monthly target
        doorQuantityTarget: 60, // 60 doors baseline
        collectionTarget: 250000, // ₹2.50L advance/collection target
        newClientsTarget: 3,
        commissionPlanId: defaultPlan.id,
        baseCommissionPercent: defaultPlan.basePercent,
        achievedRevenue: 0,
        achievedDoors: 0,
        achievedCollections: 0,
        achievedNewClients: 0,
        earnedCommission: 0,
        pendingCommission: 0,
        paidCommission: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      targets.push(newTarget);
      changed = true;
    }
  }

  if (changed) {
    writeJsonFile(getTargetsStorePath(), targets);
  }

  return targets.filter((t) => t.targetPeriod === period);
}

export async function getOrCreateStaffTarget(
  employeeId: string,
  employeeCode: string,
  employeeName: string,
  targetPeriod?: string
): Promise<StaffSalesTarget> {
  const period = targetPeriod || getCurrentPeriodKey();
  const targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
  const found = targets.find((t) => t.employeeId === employeeId && t.targetPeriod === period);
  if (found) return found;

  const defaultPlan = await getDefaultCommissionPlan();
  const newTarget: StaffSalesTarget = {
    id: `tgt-${(employeeCode || 'emp').toLowerCase()}-${period}`,
    employeeId,
    employeeCode: employeeCode || 'EXM-SALES',
    employeeName,
    department: 'Sales & Projects',
    territoryDistrict: 'Kerala Territory',
    targetPeriod: period,
    periodType: 'MONTHLY',
    revenueTarget: 500000,
    doorQuantityTarget: 60,
    collectionTarget: 250000,
    newClientsTarget: 3,
    commissionPlanId: defaultPlan.id,
    baseCommissionPercent: defaultPlan.basePercent,
    achievedRevenue: 0,
    achievedDoors: 0,
    achievedCollections: 0,
    achievedNewClients: 0,
    earnedCommission: 0,
    pendingCommission: 0,
    paidCommission: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  targets.push(newTarget);
  writeJsonFile(getTargetsStorePath(), targets);
  return newTarget;
}

export async function saveStaffTarget(target: StaffSalesTarget): Promise<StaffSalesTarget> {
  await assertWriteAllowed('save staff target');
  const targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
  const idx = targets.findIndex((t) => t.id === target.id);
  const now = new Date().toISOString();
  if (idx !== -1) {
    targets[idx] = { ...target, updatedAt: now };
  } else {
    targets.unshift({ ...target, createdAt: now, updatedAt: now });
  }
  writeJsonFile(getTargetsStorePath(), targets);
  return target;
}

export async function updateStaffTarget(
  employeeId: string,
  targetPeriod: string,
  updates: Partial<StaffSalesTarget>
): Promise<StaffSalesTarget> {
  await assertWriteAllowed('update staff target');
  const targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
  const idx = targets.findIndex((t) => t.employeeId === employeeId && t.targetPeriod === targetPeriod);
  if (idx === -1) {
    throw new Error(`Target not found for employee ${employeeId} in period ${targetPeriod}`);
  }
  const now = new Date().toISOString();
  targets[idx] = { ...targets[idx], ...updates, updatedAt: now };
  writeJsonFile(getTargetsStorePath(), targets);
  return targets[idx];
}

// ── Commission Calculation & Ledger API ──────────────────────────────────────

export async function calculateCommissionForQuote(input: {
  orderAmount: number;
  advancePercent: number;
  doorCount?: number;
  doorsCount?: number;
  premiumPuCount?: number;
  salespersonId?: string;
  quotationId?: string;
  targetPeriod?: string;
  commissionType?: 'PERCENTAGE' | 'PER_PIECE';
  commissionRate?: number;
}): Promise<{
  commissionType: 'PERCENTAGE' | 'PER_PIECE';
  commissionRate: number;
  commissionPercent: number;
  commissionAmount: number;
  breakdown: {
    baseRatePercent: number;
    perDoorRate: number;
    tierAcceleratorPercent: number;
    advanceBonusPercent: number;
    effectivePercent: number;
    baseAmount: number;
    bonusAmount: number;
    totalAmount: number;
    tierLabel: string;
  };
}> {
  const plan = await getDefaultCommissionPlan();
  const period = input.targetPeriod || getCurrentPeriodKey();

  let staffTarget: StaffSalesTarget | undefined;
  if (input.salespersonId) {
    const targets = await listStaffTargets(period);
    staffTarget = targets.find((t) => t.employeeId === input.salespersonId);
  }

  // Resolve Commission Type: explicit input > staff target setting > plan default
  const commissionType: 'PERCENTAGE' | 'PER_PIECE' =
    input.commissionType || staffTarget?.commissionType || plan.defaultCommissionType || 'PERCENTAGE';

  let baseRate = 0;
  if (commissionType === 'PER_PIECE') {
    baseRate = input.commissionRate !== undefined
      ? Number(input.commissionRate)
      : (staffTarget?.perPieceRate || staffTarget?.commissionRate || plan.defaultPerPieceRate || 150);
  } else {
    baseRate = input.commissionRate !== undefined
      ? Number(input.commissionRate)
      : (staffTarget?.commissionRate || staffTarget?.baseCommissionPercent || plan.basePercent || 2.5);
  }

  let acceleratorPercent = 0;
  let acceleratorPerDoor = 0;
  let tierLabel = 'Standard Target (70–100%)';

  // If salespersonId is provided, check their target achievement pacing
  if (staffTarget && staffTarget.revenueTarget > 0) {
    const projectedTotal = staffTarget.achievedRevenue + input.orderAmount;
    const pacingRatio = (projectedTotal / staffTarget.revenueTarget) * 100;

    for (const tier of plan.tiers) {
      if (
        pacingRatio >= tier.minPercentOfTarget &&
        (tier.maxPercentOfTarget === null || tier.maxPercentOfTarget === undefined || pacingRatio < tier.maxPercentOfTarget)
      ) {
        tierLabel = tier.tierLabel;
        if (input.commissionRate === undefined) {
          if (commissionType === 'PERCENTAGE') {
            baseRate = tier.commissionPercent;
          } else if (tier.perDoorRate) {
            baseRate = tier.perDoorRate;
          }
        }
        break;
      }
    }
  }

  // Advance collection bonus: if client pays >= 50% advance
  let advanceBonusPercent = 0;
  let advanceBonusPerDoor = 0;
  if (input.advancePercent >= 50) {
    if (commissionType === 'PERCENTAGE' && plan.advanceCollectionBonusPercent) {
      advanceBonusPercent = plan.advanceCollectionBonusPercent;
    } else if (commissionType === 'PER_PIECE') {
      advanceBonusPerDoor = plan.advanceCollectionBonusPerDoor || 25; // ₹25/door advance bonus
    }
  }

  let baseAmount = 0;
  let bonusAmount = 0;
  let effectivePercent = 0;

  if (commissionType === 'PER_PIECE') {
    const doors = Math.max(1, Number(input.doorCount ?? input.doorsCount) || 1);
    baseAmount = Math.round(doors * (baseRate + acceleratorPerDoor));
    bonusAmount = Math.round(doors * advanceBonusPerDoor);
    effectivePercent = input.orderAmount > 0 ? Number(((baseAmount + bonusAmount) / input.orderAmount * 100).toFixed(2)) : 0;
  } else {
    effectivePercent = Number((baseRate + acceleratorPercent + advanceBonusPercent).toFixed(2));
    baseAmount = Math.round((input.orderAmount * (baseRate + acceleratorPercent)) / 100);
    bonusAmount = Math.round((input.orderAmount * advanceBonusPercent) / 100);
  }

  // Premium PU doors surcharge bonus
  if (input.premiumPuCount && input.premiumPuCount > 0) {
    bonusAmount += input.premiumPuCount * 100;
  }

  const totalAmount = baseAmount + bonusAmount;

  return {
    commissionType,
    commissionRate: baseRate,
    commissionPercent: effectivePercent,
    commissionAmount: totalAmount,
    breakdown: {
      baseRatePercent: commissionType === 'PERCENTAGE' ? baseRate : 0,
      perDoorRate: commissionType === 'PER_PIECE' ? baseRate : 0,
      tierAcceleratorPercent: acceleratorPercent,
      advanceBonusPercent,
      effectivePercent,
      baseAmount,
      bonusAmount,
      totalAmount,
      tierLabel,
    },
  };
}

export async function recordOrderCommission(order: {
  quotationId: string;
  quoteNumber: string;
  orderId?: string;
  jobCardNumber?: string;
  customerId: string;
  customerName: string;
  orderDate?: string;
  orderAmount: number;
  advancePaid: number;
  doorCount: number;
  premiumPuDoorCount?: number;
  salespersonId: string;
  salespersonCode?: string;
  salespersonName?: string;
  targetPeriod?: string;
  commissionType?: 'PERCENTAGE' | 'PER_PIECE';
  commissionRate?: number;
}): Promise<SalesCommissionRecord> {
  await assertWriteAllowed('record order commission');
  const commissions = readJsonFile<SalesCommissionRecord[]>(getCommissionsStorePath(), []);
  const period = order.targetPeriod || getCurrentPeriodKey();

  const advancePercent = order.orderAmount > 0 ? Math.round((order.advancePaid / order.orderAmount) * 100) : 0;
  const calc = await calculateCommissionForQuote({
    orderAmount: order.orderAmount,
    advancePercent,
    doorCount: order.doorCount,
    premiumPuCount: order.premiumPuDoorCount,
    salespersonId: order.salespersonId,
    targetPeriod: period,
    commissionType: order.commissionType,
    commissionRate: order.commissionRate,
  });

  const now = new Date().toISOString();
  const existingIdx = commissions.findIndex((c) => c.quotationId === order.quotationId);

  const record: SalesCommissionRecord = {
    id: existingIdx !== -1 ? commissions[existingIdx].id : `comm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    quotationId: order.quotationId,
    quoteNumber: order.quoteNumber,
    orderId: order.orderId,
    jobCardNumber: order.jobCardNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    orderDate: order.orderDate || now.slice(0, 10),
    orderAmount: order.orderAmount,
    advancePaid: order.advancePaid,
    doorCount: order.doorCount,
    premiumPuDoorCount: order.premiumPuDoorCount,
    salespersonId: order.salespersonId,
    salespersonCode: order.salespersonCode || 'EXM-SALES',
    salespersonName: order.salespersonName || 'Sales Representative',
    targetPeriod: period,
    commissionType: calc.commissionType,
    commissionRate: calc.commissionRate,
    perPieceRate: calc.commissionType === 'PER_PIECE' ? calc.commissionRate : undefined,
    baseRatePercent: calc.breakdown.baseRatePercent,
    tierAcceleratorPercent: calc.breakdown.tierAcceleratorPercent,
    advanceBonusPercent: calc.breakdown.advanceBonusPercent,
    effectiveCommissionPercent: calc.commissionPercent,
    baseCommissionAmount: calc.breakdown.baseAmount,
    bonusAmount: calc.breakdown.bonusAmount,
    totalCommissionAmount: calc.commissionAmount,
    status: 'ACCRUED',
    createdAt: existingIdx !== -1 ? commissions[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx !== -1) {
    commissions[existingIdx] = record;
  } else {
    commissions.unshift(record);
  }
  writeJsonFile(getCommissionsStorePath(), commissions);

  // Update staff target metrics in sales-targets-store.json
  const targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
  const targetIdx = targets.findIndex((t) => t.employeeId === order.salespersonId && t.targetPeriod === period);
  if (targetIdx !== -1) {
    const t = targets[targetIdx];
    t.achievedRevenue += order.orderAmount;
    t.achievedDoors += order.doorCount;
    t.achievedCollections += order.advancePaid;
    t.earnedCommission += calc.commissionAmount;
    t.pendingCommission += calc.commissionAmount;
    t.updatedAt = now;
    writeJsonFile(getTargetsStorePath(), targets);
  }

  return record;
}

export async function updateQuotationCommissionOverride(
  quotationId: string,
  commissionType: 'PERCENTAGE' | 'PER_PIECE',
  commissionRate: number,
  notes?: string
): Promise<{ success: boolean; updatedQuotation?: any; updatedCommission?: SalesCommissionRecord }> {
  await assertWriteAllowed('update quotation commission override');

  const quotesPath = getDataFilePath('quotations-store.json');
  let quotes: any[] = [];
  if (fs.existsSync(quotesPath)) {
    try {
      quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    } catch {}
  }

  const qIdx = quotes.findIndex((q) => q.id === quotationId || q.quoteNumber === quotationId);
  let updatedQuote: any = null;

  if (qIdx !== -1) {
    const q = quotes[qIdx];
    const totalDoors = Array.isArray(q.itemRows)
      ? q.itemRows.reduce((sum: number, r: any) => sum + (Number(r.qty) || 1), 0)
      : (Array.isArray(q.items) ? q.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0) : 1);

    const orderAmount = Number(q.totalAmount || q.grandTotal || 0);

    let commissionAmount = 0;
    let commissionPercent = 0;

    if (commissionType === 'PER_PIECE') {
      commissionAmount = Math.round(totalDoors * commissionRate);
      commissionPercent = orderAmount > 0 ? Number(((commissionAmount / orderAmount) * 100).toFixed(2)) : 0;
    } else {
      commissionPercent = Number(commissionRate);
      commissionAmount = Math.round((orderAmount * commissionPercent) / 100);
    }

    q.commissionType = commissionType;
    q.commissionRate = commissionRate;
    q.commissionPercent = commissionPercent;
    q.commissionAmount = commissionAmount;
    if (notes) q.notes = q.notes ? `${q.notes} | ${notes}` : notes;
    q.updatedAt = new Date().toISOString();

    quotes[qIdx] = q;
    writeJsonFile(quotesPath, quotes);
    updatedQuote = q;
  }

  // Update in sales-commissions-store.json if exists
  const commissions = readJsonFile<SalesCommissionRecord[]>(getCommissionsStorePath(), []);
  const commIdx = commissions.findIndex((c) => c.quotationId === quotationId || c.quoteNumber === quotationId);
  let updatedComm: SalesCommissionRecord | undefined;

  if (commIdx !== -1) {
    const c = commissions[commIdx];
    const doors = Math.max(1, c.doorCount || 1);
    const orderAmount = c.orderAmount || 0;

    let commissionAmount = 0;
    let commissionPercent = 0;

    if (commissionType === 'PER_PIECE') {
      commissionAmount = Math.round(doors * commissionRate);
      commissionPercent = orderAmount > 0 ? Number(((commissionAmount / orderAmount) * 100).toFixed(2)) : 0;
    } else {
      commissionPercent = Number(commissionRate);
      commissionAmount = Math.round((orderAmount * commissionPercent) / 100);
    }

    c.commissionType = commissionType;
    c.commissionRate = commissionRate;
    c.perPieceRate = commissionType === 'PER_PIECE' ? commissionRate : undefined;
    c.baseRatePercent = commissionType === 'PERCENTAGE' ? commissionRate : 0;
    c.effectiveCommissionPercent = commissionPercent;
    c.baseCommissionAmount = commissionAmount;
    c.totalCommissionAmount = commissionAmount;
    if (notes) c.notes = c.notes ? `${c.notes} | ${notes}` : notes;
    c.updatedAt = new Date().toISOString();

    commissions[commIdx] = c;
    writeJsonFile(getCommissionsStorePath(), commissions);
    updatedComm = c;
  }

  return { success: true, updatedQuotation: updatedQuote, updatedCommission: updatedComm };
}

export async function updateStaffCommissionScheme(
  employeeId: string,
  commissionType: 'PERCENTAGE' | 'PER_PIECE',
  commissionRate: number,
  targetPeriod?: string
): Promise<{ success: boolean; target?: StaffSalesTarget }> {
  await assertWriteAllowed('update staff commission scheme');
  const period = targetPeriod || getCurrentPeriodKey();
  let targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
  let tIdx = targets.findIndex((t) => (t.employeeId === employeeId || t.id.includes(employeeId.toLowerCase())) && t.targetPeriod === period);

  if (tIdx === -1) {
    const target = await getOrCreateStaffTarget(employeeId, employeeId, employeeId, period);
    targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
    tIdx = targets.findIndex((t) => t.id === target.id);
  }

  if (tIdx !== -1) {
    targets[tIdx].commissionType = commissionType;
    targets[tIdx].commissionRate = commissionRate;
    if (commissionType === 'PER_PIECE') {
      targets[tIdx].perPieceRate = commissionRate;
    } else {
      targets[tIdx].baseCommissionPercent = commissionRate;
    }
    targets[tIdx].updatedAt = new Date().toISOString();
    writeJsonFile(getTargetsStorePath(), targets);
    return { success: true, target: targets[tIdx] };
  }

  return { success: false };
}

export const accrueCommissionForQuotation = recordOrderCommission;

export async function listCommissions(filter?: {
  salespersonId?: string;
  period?: string;
  status?: string;
}): Promise<SalesCommissionRecord[]> {
  let commissions = readJsonFile<SalesCommissionRecord[]>(getCommissionsStorePath(), []);
  if (filter?.salespersonId) {
    commissions = commissions.filter((c) => c.salespersonId === filter.salespersonId);
  }
  if (filter?.period) {
    commissions = commissions.filter((c) => c.targetPeriod === filter.period);
  }
  if (filter?.status) {
    commissions = commissions.filter((c) => c.status === filter.status);
  }
  return commissions;
}

export async function payoutCommissions(
  commissionIds: string[],
  payoutRef: string,
  paidBy: string,
  paymentMode = 'NEFT/BANK_TRANSFER'
): Promise<{ success: boolean; updatedCount: number; totalPaid: number }> {
  await assertWriteAllowed('payout commissions');
  const commissions = readJsonFile<SalesCommissionRecord[]>(getCommissionsStorePath(), []);
  const batchId = `payout-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  let updatedCount = 0;
  let totalPaid = 0;

  for (const c of commissions) {
    if (commissionIds.includes(c.id) && c.status === 'ACCRUED') {
      c.status = 'PAID';
      c.payoutBatchId = batchId;
      c.paymentRef = payoutRef;
      c.paidBy = paidBy;
      c.paymentMode = paymentMode;
      c.paidAt = now;
      c.updatedAt = now;
      totalPaid += c.totalCommissionAmount;
      updatedCount++;

      // Adjust staff target pending vs paid
      const targets = readJsonFile<StaffSalesTarget[]>(getTargetsStorePath(), []);
      const t = targets.find((tgt) => tgt.employeeId === c.salespersonId && tgt.targetPeriod === c.targetPeriod);
      if (t) {
        t.pendingCommission = Math.max(0, t.pendingCommission - c.totalCommissionAmount);
        t.paidCommission += c.totalCommissionAmount;
        t.updatedAt = now;
        writeJsonFile(getTargetsStorePath(), targets);
      }
    }
  }

  writeJsonFile(getCommissionsStorePath(), commissions);
  return { success: true, updatedCount, totalPaid };
}

// ── Territory Expansion & What-If Simulation API ─────────────────────────────

export async function listTerritoryExpansion(): Promise<TerritoryExpansionPlan[]> {
  const territories = readJsonFile<TerritoryExpansionPlan[]>(getExpansionStorePath(), DEFAULT_KERALA_TERRITORIES);
  if (!territories || territories.length < 14) {
    writeJsonFile(getExpansionStorePath(), DEFAULT_KERALA_TERRITORIES);
    return DEFAULT_KERALA_TERRITORIES;
  }
  return territories;
}

export async function saveTerritoryExpansion(items: TerritoryExpansionPlan[]): Promise<void> {
  await assertWriteAllowed('save territory expansion');
  writeJsonFile(getExpansionStorePath(), items);
}

export function simulateExpansion(params: ExpansionSimulationParams): ExpansionSimulationResult {
  const {
    newSalesRepresentatives,
    newDealerRacks,
    targetPenetrationGrowthPercent,
    averageDoorSellingPrice = 8200,
    averageDoorsPerDealerMonth = 8,
    repMonthlySalaryCost = 30000,
    rackInstallationCost = 15000,
  } = params;

  // Each new sales rep brings an average of 4 active dealer relations
  const dealerFromReps = newSalesRepresentatives * 4;
  const totalNewActiveDealers = dealerFromReps + Math.round(newDealerRacks * 0.7);

  // Incremental doors per month
  const incrementalDoorsPerMonth = Math.round(
    totalNewActiveDealers * averageDoorsPerDealerMonth * (1 + targetPenetrationGrowthPercent / 100)
  );

  const incrementalMonthlyRevenue = incrementalDoorsPerMonth * averageDoorSellingPrice;
  const grossMarginPercent = 38.5; // EXMARK FRP door manufacturing standard gross margin
  const incrementalGrossProfit = Math.round((incrementalMonthlyRevenue * grossMarginPercent) / 100);

  // Monthly operating expense: rep salaries + 2.5% rep commissions
  const monthlyRepCommission = Math.round(incrementalMonthlyRevenue * 0.025);
  const monthlyOperatingExpense = newSalesRepresentatives * repMonthlySalaryCost + monthlyRepCommission;

  const netIncrementalMonthlyProfit = Math.max(0, incrementalGrossProfit - monthlyOperatingExpense);
  const annualizedRevenueDelta = incrementalMonthlyRevenue * 12;
  const annualizedProfitDelta = netIncrementalMonthlyProfit * 12;

  // Upfront capital investment: display rack fabrication & initial sample kits
  const upfrontCapital = newDealerRacks * rackInstallationCost;
  const paybackPeriodMonths = netIncrementalMonthlyProfit > 0 ? Number((upfrontCapital / netIncrementalMonthlyProfit).toFixed(1)) : 99;

  // Factory capacity utilization impact (baseline capacity: 1,500 doors/month)
  const factoryCapacity = 1500;
  const factoryCapacityUtilizationPercent = Number(((incrementalDoorsPerMonth / factoryCapacity) * 100).toFixed(1));

  return {
    incrementalDoorsPerMonth,
    incrementalMonthlyRevenue,
    grossMarginPercent,
    incrementalGrossProfit,
    monthlyOperatingExpense,
    netIncrementalMonthlyProfit,
    annualizedRevenueDelta,
    annualizedProfitDelta,
    paybackPeriodMonths,
    factoryCapacityUtilizationPercent,
  };
}

export const simulateTerritoryExpansion = simulateExpansion;

// ── Marketing Campaigns API ──────────────────────────────────────────────────

const getCampaignsStorePath = () => getDataFilePath('marketing-campaigns-store.json');

export const DEFAULT_MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-architect-iia',
    name: 'IIA Kerala Chapter Architect Connect & Sample Kit Distribution',
    channel: 'ARCHITECT_OUTREACH',
    territory: 'Kochi, Calicut & Trivandrum',
    budget: 150000,
    actualSpend: 112000,
    leadsGenerated: 34,
    ordersWon: 12,
    revenueWon: 984000,
    roiPercent: 778.5,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    notes: 'Premium moisture-proof FRP acoustic sample folders delivered to 120 top architecture practices.',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'camp-dealer-rack',
    name: 'Kerala 6-Door Rotating Showroom Rack Rollout',
    channel: 'DEALER_DISPLAY_RACKS',
    territory: 'Malappuram & Kozhikode District',
    budget: 300000,
    actualSpend: 245000,
    leadsGenerated: 58,
    ordersWon: 27,
    revenueWon: 2214000,
    roiPercent: 803.6,
    startDate: '2026-09-15',
    endDate: '2026-12-15',
    status: 'ACTIVE',
    notes: 'Display stands installed in 22 premium sanitary & building material showrooms.',
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

export async function listMarketingCampaigns(): Promise<MarketingCampaign[]> {
  const campaigns = readJsonFile<MarketingCampaign[]>(getCampaignsStorePath(), DEFAULT_MARKETING_CAMPAIGNS);
  return campaigns;
}

export async function saveMarketingCampaign(campaign: MarketingCampaign): Promise<MarketingCampaign> {
  await assertWriteAllowed('save marketing campaign');
  const campaigns = await listMarketingCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaign.id);
  const now = new Date().toISOString();
  if (idx !== -1) {
    campaigns[idx] = { ...campaign, updatedAt: now };
  } else {
    campaigns.unshift({ ...campaign, createdAt: now, updatedAt: now });
  }
  writeJsonFile(getCampaignsStorePath(), campaigns);
  return campaign;
}

export async function createMarketingCampaign(
  input: Omit<MarketingCampaign, 'id' | 'actualSpend' | 'leadsGenerated' | 'ordersWon' | 'revenueWon' | 'roiPercent' | 'status' | 'createdAt' | 'updatedAt'> & Partial<MarketingCampaign>
): Promise<MarketingCampaign> {
  const newCamp: MarketingCampaign = {
    id: input.id || `camp-${Date.now().toString(36)}`,
    name: input.name,
    channel: input.channel,
    territory: input.territory,
    budget: input.budget || 0,
    actualSpend: input.actualSpend || 0,
    leadsGenerated: input.leadsGenerated || 0,
    ordersWon: input.ordersWon || 0,
    revenueWon: input.revenueWon || 0,
    roiPercent: input.roiPercent || 0,
    startDate: input.startDate || new Date().toISOString().slice(0, 10),
    endDate: input.endDate || new Date().toISOString().slice(0, 10),
    status: input.status || 'ACTIVE',
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return saveMarketingCampaign(newCamp);
}

// ── Salesperson Performance & Leaderboard API ────────────────────────────────

export async function getSalespersonLeaderboard(targetPeriod?: string): Promise<SalespersonPerformanceMetrics[]> {
  const period = targetPeriod || getCurrentPeriodKey();
  const targets = await listStaffTargets(period);
  const commissions = await listCommissions({ period });

  const metrics: SalespersonPerformanceMetrics[] = targets.map((t) => {
    const staffCommissions = commissions.filter((c) => c.salespersonId === t.employeeId);
    const quotesCount = staffCommissions.length;
    const closedOrdersCount = staffCommissions.filter((c) => c.status === 'ACCRUED' || c.status === 'PAID').length;
    const conversionRatePercent = quotesCount > 0 ? Number(((closedOrdersCount / quotesCount) * 100).toFixed(1)) : 0;

    const revenuePacingPercent = t.revenueTarget > 0 ? Number(((t.achievedRevenue / t.revenueTarget) * 100).toFixed(1)) : 0;
    const doorsPacingPercent = t.doorQuantityTarget > 0 ? Number(((t.achievedDoors / t.doorQuantityTarget) * 100).toFixed(1)) : 0;

    return {
      employeeId: t.employeeId,
      employeeCode: t.employeeCode,
      employeeName: t.employeeName,
      targetRevenue: t.revenueTarget,
      achievedRevenue: t.achievedRevenue,
      revenuePacingPercent,
      targetDoors: t.doorQuantityTarget,
      achievedDoors: t.achievedDoors,
      doorsPacingPercent,
      targetCollections: t.collectionTarget,
      achievedCollections: t.achievedCollections,
      quotesCount,
      closedOrdersCount,
      conversionRatePercent,
      totalCommissionEarned: t.earnedCommission,
      totalCommissionPaid: t.paidCommission,
      totalCommissionPending: t.pendingCommission,
      rank: 1,
      isTopPerformer: false,
    };
  });

  // Sort descending by achieved revenue
  metrics.sort((a, b) => b.achievedRevenue - a.achievedRevenue);
  metrics.forEach((m, idx) => {
    m.rank = idx + 1;
    m.isTopPerformer = idx === 0 && m.achievedRevenue > 0;
  });

  return metrics;
}

// ── Staff Orders & Commission Report API (Daily, Weekly, Monthly, All-Staff) ─

export function parseDateToISO(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const d = slashMatch[1].padStart(2, '0');
    const m = slashMatch[2].padStart(2, '0');
    const y = slashMatch[3];
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export interface StaffOrderReportFilter {
  salespersonId?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
}

export async function getStaffOrderReport(filter: StaffOrderReportFilter) {
  const frequency = filter.frequency || 'MONTHLY';
  const todayISO = new Date().toISOString().slice(0, 10);

  let startISO = '';
  let endISO = '';
  let periodLabel = '';

  if (frequency === 'DAILY') {
    const d = filter.date || todayISO;
    startISO = d;
    endISO = d;
    const formatted = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    periodLabel = `Daily Orders Report — ${formatted}`;
  } else if (frequency === 'WEEKLY') {
    if (filter.startDate && filter.endDate) {
      startISO = filter.startDate;
      endISO = filter.endDate;
    } else {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay() + 1; // Monday
      const last = first + 6; // Sunday
      const monday = new Date(curr.setDate(first));
      const sunday = new Date(curr.setDate(last));
      startISO = monday.toISOString().slice(0, 10);
      endISO = sunday.toISOString().slice(0, 10);
    }
    periodLabel = `Weekly Orders Report — ${startISO} to ${endISO}`;
  } else if (frequency === 'MONTHLY') {
    const mKey = filter.month || getCurrentPeriodKey();
    startISO = `${mKey}-01`;
    const [y, m] = mKey.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    endISO = `${mKey}-${String(lastDay).padStart(2, '0')}`;
    const monthName = new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    periodLabel = `Monthly Sales Order & Commission Report — ${monthName}`;
  } else {
    startISO = filter.startDate || todayISO;
    endISO = filter.endDate || todayISO;
    periodLabel = `Sales Orders Report — ${startISO} to ${endISO}`;
  }

  // Read Quotes
  const quotesPath = getDataFilePath('quotations-store.json');
  let quotes: any[] = [];
  if (fs.existsSync(quotesPath)) {
    try {
      quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    } catch {}
  }

  // Read Staff Targets and Employees
  const period = startISO.slice(0, 7);
  const targets = await listStaffTargets(period);
  const employees = readEmployeesStore();

  // Find targeted salesperson if not ALL
  const targetStaffId = filter.salespersonId && filter.salespersonId !== 'ALL' ? filter.salespersonId : null;
  const staffTarget = targetStaffId ? targets.find((t) => t.employeeId === targetStaffId) : null;
  const staffEmp = targetStaffId ? employees.find((e) => e.id === targetStaffId) : null;

  // Filter orders matching date range
  const matchedOrders: any[] = [];

  for (const q of quotes) {
    const qIso = parseDateToISO(q.date || q.createdAt);
    if (qIso < startISO || qIso > endISO) continue;

    // Filter by staff if requested
    if (targetStaffId) {
      if (q.salespersonId !== targetStaffId) continue;
    }

    const totalDoors = Array.isArray(q.itemRows)
      ? q.itemRows.reduce((sum: number, r: any) => sum + (Number(r.qty) || 1), 0)
      : (Array.isArray(q.items) ? q.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0) : 1);

    const orderAmount = Number(q.totalAmount || q.grandTotal || 0);
    const advanceAmount = Number(q.advanceAmount || 0);

    const commType: 'PERCENTAGE' | 'PER_PIECE' = q.commissionType || (staffTarget?.commissionType ?? 'PERCENTAGE');
    const commRate = Number(q.commissionRate ?? (q.commissionPercent ?? (commType === 'PER_PIECE' ? 150 : 2.5)));
    const commAmount = Number(q.commissionAmount ?? (commType === 'PER_PIECE' ? Math.round(totalDoors * commRate) : Math.round((orderAmount * commRate) / 100)));
    const commPercent = orderAmount > 0 ? Number(((commAmount / orderAmount) * 100).toFixed(1)) : (commType === 'PERCENTAGE' ? commRate : 0);

    matchedOrders.push({
      id: q.id,
      quoteNumber: q.quoteNumber || q.id,
      date: q.date || qIso,
      isoDate: qIso,
      customerName: q.customerName || 'Direct Client',
      location: q.location || 'Kerala',
      doorsCount: totalDoors,
      orderAmount,
      advanceAmount,
      commissionType: commType,
      commissionRate: commRate,
      commissionPercent: commPercent,
      commissionAmount: commAmount,
      status: q.commissionStatus || (q.isConfirmed ? 'ACCRUED' : 'PROJECTED'),
      salespersonId: q.salespersonId || 'DIRECT',
      salespersonName: q.salespersonName || 'Direct / Factory Unit',
      salespersonCode: q.salespersonCode || 'EXM-DIRECT',
      itemsSummary: q.itemsSummary || `${totalDoors} FRP Doors Schedule`,
      isConfirmed: Boolean(q.isConfirmed),
    });
  }

  // Sort orders descending by date
  matchedOrders.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

  // Compute Summary
  const totalOrders = matchedOrders.length;
  const totalDoors = matchedOrders.reduce((sum, o) => sum + o.doorsCount, 0);
  const totalRevenue = matchedOrders.reduce((sum, o) => sum + o.orderAmount, 0);
  const totalAdvance = matchedOrders.reduce((sum, o) => sum + o.advanceAmount, 0);
  const totalCommission = matchedOrders.reduce((sum, o) => sum + o.commissionAmount, 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Build All-Staff Comparative analysis
  const staffMap = new Map<string, {
    salespersonId: string;
    salespersonName: string;
    salespersonCode: string;
    territory: string;
    ordersCount: number;
    doorsCount: number;
    totalRevenue: number;
    advanceCollected: number;
    commissionType: 'PERCENTAGE' | 'PER_PIECE';
    commissionRate: number;
    totalCommission: number;
    targetRevenue: number;
    achievementPercent: number;
  }>();

  // Initialize from targets list
  for (const t of targets) {
    staffMap.set(t.employeeId, {
      salespersonId: t.employeeId,
      salespersonName: t.employeeName,
      salespersonCode: t.employeeCode,
      territory: t.territoryDistrict || 'Kerala',
      ordersCount: 0,
      doorsCount: 0,
      totalRevenue: 0,
      advanceCollected: 0,
      commissionType: t.commissionType || 'PERCENTAGE',
      commissionRate: t.commissionRate || t.baseCommissionPercent || 2.5,
      totalCommission: 0,
      targetRevenue: t.revenueTarget,
      achievementPercent: 0,
    });
  }

  // Aggregate orders per staff
  for (const o of matchedOrders) {
    if (o.salespersonId && o.salespersonId !== 'DIRECT') {
      const entry = staffMap.get(o.salespersonId) || {
        salespersonId: o.salespersonId,
        salespersonName: o.salespersonName,
        salespersonCode: o.salespersonCode,
        territory: 'Kerala Territory',
        ordersCount: 0,
        doorsCount: 0,
        totalRevenue: 0,
        advanceCollected: 0,
        commissionType: o.commissionType,
        commissionRate: o.commissionRate,
        totalCommission: 0,
        targetRevenue: 500000,
        achievementPercent: 0,
      };

      entry.ordersCount++;
      entry.doorsCount += o.doorsCount;
      entry.totalRevenue += o.orderAmount;
      entry.advanceCollected += o.advanceAmount;
      entry.totalCommission += o.commissionAmount;
      staffMap.set(o.salespersonId, entry);
    }
  }

  const allStaffComparative = Array.from(staffMap.values()).map((s) => {
    const ach = s.targetRevenue > 0 ? Number(((s.totalRevenue / s.targetRevenue) * 100).toFixed(1)) : 0;
    return { ...s, achievementPercent: ach, rank: 1 };
  });

  allStaffComparative.sort((a, b) => b.totalRevenue - a.totalRevenue);
  allStaffComparative.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return {
    periodLabel,
    frequency,
    dateRange: { start: startISO, end: endISO },
    filterSalespersonId: targetStaffId || 'ALL',
    salesperson: targetStaffId ? {
      id: targetStaffId,
      name: staffTarget?.employeeName || staffEmp?.name || 'Sales Representative',
      code: staffTarget?.employeeCode || staffEmp?.employeeCode || 'EXM-SALES',
      department: staffTarget?.department || staffEmp?.department || 'Sales',
      territory: staffTarget?.territoryDistrict || staffEmp?.location || 'Kerala',
      commissionType: staffTarget?.commissionType || 'PERCENTAGE',
      commissionRate: staffTarget?.commissionRate || staffTarget?.baseCommissionPercent || 2.5,
    } : null,
    orders: matchedOrders,
    summary: {
      totalOrders,
      totalDoors,
      totalRevenue,
      totalAdvance,
      totalCommission,
      averageOrderValue,
    },
    allStaffComparative,
  };
}
