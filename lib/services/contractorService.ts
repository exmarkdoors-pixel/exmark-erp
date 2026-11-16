import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import {
  getOperationLockGroup,
  OPERATION_LOCK_GROUP_LABELS,
  OperationLockGroup,
  OrderPieceRateGroupLock,
  OrderPieceRateLockSummary,
} from '../utils/pieceRateLocks';

export type { OperationLockGroup, OrderPieceRateGroupLock, OrderPieceRateLockSummary };
export { getOperationLockGroup };

// ── Types ────────────────────────────────────────────────────────────────────

export type ContractorTrade = 'MOLDING' | 'CUTTING_GRINDING' | 'PAINTING' | 'SITE_FITTING';

export interface ContractorRateCard {
  id: string;
  name: string;
  moldingDoorWithFrame: number;   // ₹500
  moldingOnlyDoor: number;        // ₹380
  moldingOnlyFrame: number;       // ₹125
  doorCutting: number;            // ₹100
  frameCutting: number;           // ₹100
  doorGrainsWithPaint: number;    // ₹300
  onlyClearCoat: number;          // ₹150
  twoSidePaint: number;           // ₹500
  siteFitting: number;            // ₹400
  updatedAt: string;
}

export type FloorGangScope =
  | 'MOLDING_ALL'
  | 'MOLDING_TEAM_1'
  | 'MOLDING_TEAM_2'
  | 'DOOR_CUTTING_FINISHING'
  | 'FRAME_CUTTING_FINISHING'
  | 'GRAINS_PAINTING'
  | 'PACKING_TEAM'
  | 'SITE_FITTING';

export interface Contractor {
  id: string; // CTR-001
  name: string;
  phone: string;
  trade: ContractorTrade;
  tradeLabel: string;
  isInHouseGang?: boolean;
  gangLeader?: string;
  memberNames?: string[];
  primaryStage?: string;
  teamScope?: FloorGangScope;
  upiId?: string;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalDoorsCompleted: number;
  totalEarned: number;
  totalPaid: number;
  balancePayable: number;
  openingBalance?: number;
  openingBalanceType?: 'PAYABLE' | 'RECEIVABLE';
  openingBalanceDate?: string;
  openingBalanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractorOperationType =
  | 'MOLDING_DOOR_WITH_FRAME'
  | 'MOLDING_ONLY_DOOR'
  | 'MOLDING_ONLY_FRAME'
  | 'DOOR_CUTTING'
  | 'FRAME_CUTTING'
  | 'DOOR_GRAINS_WITH_PAINT'
  | 'ONLY_CLEAR_COAT'
  | 'TWO_SIDE_PAINT'
  | 'SITE_FITTING';

export interface ContractorJobWorkRecord {
  id: string; // JWR-2026-XXXX
  contractorId: string;
  contractorName: string;
  trade: ContractorTrade;
  orderId: string;
  orderNumber: string;
  jobCardNumber?: string;
  doorId: string;
  doorNumber: string;
  doorModel: string;
  operation: ContractorOperationType;
  operationLabel: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  date: string;
  timestamp: number;
  notes?: string;
}

export type PaymentDisbursementMode = 'UPI' | 'BANK_NEFT' | 'CASH' | 'CHEQUE';

export interface ContractorPayoutVoucher {
  id: string; // VCHR-2026-XXXX
  voucherNumber: string;
  contractorId: string;
  contractorName: string;
  date: string;
  amount: number;
  paymentMode: PaymentDisbursementMode;
  referenceNumber?: string; // UTR / Cheque #
  notes?: string;
  recordedBy: string;
  timestamp: number;
}

export interface ContractorStore {
  contractors: Contractor[];
  rateCard: ContractorRateCard;
  workRecords: ContractorJobWorkRecord[];
  payouts: ContractorPayoutVoucher[];
}

export interface ContractorWeeklyStatement {
  contractor: Contractor;
  startDate: string;
  endDate: string;
  openingBalance: number;
  items: ContractorJobWorkRecord[];
  totalDoorsInPeriod: number;
  totalEarnedInPeriod: number;
  payoutsInPeriod: ContractorPayoutVoucher[];
  totalPaidInPeriod: number;
  closingBalance: number;
  generatedAt: string;
}

// ── Store Helpers ─────────────────────────────────────────────────────────────

const getStorePath = () => getDataFilePath('contractors-store.json');

export const DEFAULT_RATE_CARD: ContractorRateCard = {
  id: 'RC-DEFAULT-2026',
  name: 'Standard Kerala FRP Factory Contractor Piece-Rate Card',
  moldingDoorWithFrame: 500,
  moldingOnlyDoor: 380,
  moldingOnlyFrame: 125,
  doorCutting: 100,
  frameCutting: 100,
  doorGrainsWithPaint: 300,
  onlyClearCoat: 150,
  twoSidePaint: 500,
  siteFitting: 400,
  updatedAt: new Date().toISOString(),
};

const SEED_CONTRACTORS: Contractor[] = [
  {
    id: 'CTR-001',
    name: 'Mujeeb Rahman (Molding Gang)',
    phone: '+91 98471 23450',
    trade: 'MOLDING',
    tradeLabel: 'Door & Frame Molding & Resin Layup',
    upiId: 'mujeeb.layup@oksbi',
    bankAccount: '67123498112',
    ifscCode: 'SBIN0070182',
    bankName: 'State Bank of India, Malappuram',
    status: 'ACTIVE',
    totalDoorsCompleted: 14,
    totalEarned: 7000,
    totalPaid: 4000,
    balancePayable: 3000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CTR-002',
    name: 'Santhosh Kumar (Cutting & Sizing)',
    phone: '+91 97442 88120',
    trade: 'CUTTING_GRINDING',
    tradeLabel: 'Precision Door Sizing & Grinding',
    upiId: 'santhosh.cutting@icici',
    bankAccount: '19820500124',
    ifscCode: 'ICIC0001982',
    bankName: 'ICICI Bank, Manjeri',
    status: 'ACTIVE',
    totalDoorsCompleted: 12,
    totalEarned: 2400,
    totalPaid: 1500,
    balancePayable: 900,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CTR-003',
    name: 'Babu & Sons (PU & Woodgrain Artists)',
    phone: '+91 94463 55190',
    trade: 'PAINTING',
    tradeLabel: 'PU 2K Painting & Kerala Woodgrain Art',
    upiId: 'babu.paint@paytm',
    bankAccount: '054310100912',
    ifscCode: 'CNRB0000543',
    bankName: 'Canara Bank, Calicut',
    status: 'ACTIVE',
    totalDoorsCompleted: 10,
    totalEarned: 4500,
    totalPaid: 2500,
    balancePayable: 2000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CTR-004',
    name: 'Prasad V. (Kerala Site Fitting Team)',
    phone: '+91 99468 11209',
    trade: 'SITE_FITTING',
    tradeLabel: 'Site Door Fitting & Hardware Installation',
    upiId: 'prasad.fitting@okaxis',
    bankAccount: '91802003441',
    ifscCode: 'UTIB0000812',
    bankName: 'Axis Bank, Ernakulam',
    status: 'ACTIVE',
    totalDoorsCompleted: 8,
    totalEarned: 3200,
    totalPaid: 2000,
    balancePayable: 1200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function readStore(): ContractorStore {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) {
      const initial: ContractorStore = {
        contractors: [],
        rateCard: DEFAULT_RATE_CARD,
        workRecords: [],
        payouts: [],
      };
      fs.writeFileSync(storePath, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    const normalizedContractors = Array.isArray(parsed.contractors)
      ? parsed.contractors.map((c: Contractor) => ({
          ...c,
          primaryStage: c.primaryStage === 'FINISHING_GRAINS' ? 'PAINT_SECTION' : c.primaryStage,
        }))
      : [];
    return {
      contractors: normalizedContractors,
      rateCard: parsed.rateCard || DEFAULT_RATE_CARD,
      workRecords: Array.isArray(parsed.workRecords) ? parsed.workRecords : [],
      payouts: Array.isArray(parsed.payouts) ? parsed.payouts : [],
    };
  } catch {
    return {
      contractors: [],
      rateCard: DEFAULT_RATE_CARD,
      workRecords: [],
      payouts: [],
    };
  }
}

function writeStore(store: ContractorStore): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[contractorService] Failed to write store:', err);
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Rate Card Operations ──────────────────────────────────────────────────────

export function getRateCard(): ContractorRateCard {
  const store = readStore();
  return store.rateCard || DEFAULT_RATE_CARD;
}

export function updateRateCard(rates: Partial<ContractorRateCard>): ContractorRateCard {
  const store = readStore();
  store.rateCard = {
    ...store.rateCard,
    ...rates,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.rateCard;
}

export function getRateForOperation(operation: ContractorOperationType, customRates?: Partial<ContractorRateCard>): number {
  const rc = customRates ? { ...getRateCard(), ...customRates } : getRateCard();
  switch (operation) {
    case 'MOLDING_DOOR_WITH_FRAME':
      return rc.moldingDoorWithFrame || 500;
    case 'MOLDING_ONLY_DOOR':
      return rc.moldingOnlyDoor || 380;
    case 'MOLDING_ONLY_FRAME':
      return rc.moldingOnlyFrame || 125;
    case 'DOOR_CUTTING':
      return rc.doorCutting || 100;
    case 'FRAME_CUTTING':
      return rc.frameCutting || 100;
    case 'DOOR_GRAINS_WITH_PAINT':
      return rc.doorGrainsWithPaint || 300;
    case 'ONLY_CLEAR_COAT':
      return rc.onlyClearCoat || 150;
    case 'TWO_SIDE_PAINT':
      return rc.twoSidePaint || 500;
    case 'SITE_FITTING':
      return rc.siteFitting || 400;
    default:
      return 0;
  }
}

export function getOperationLabel(op: ContractorOperationType): string {
  switch (op) {
    case 'MOLDING_DOOR_WITH_FRAME':
      return 'Molding Door with Frame (₹500)';
    case 'MOLDING_ONLY_DOOR':
      return 'Molding Only Door (₹380)';
    case 'MOLDING_ONLY_FRAME':
      return 'Molding Only Frame (₹125)';
    case 'DOOR_CUTTING':
      return 'Door Cutting & Finishing (₹100)';
    case 'FRAME_CUTTING':
      return 'Frame Cutting & Finishing (₹100)';
    case 'DOOR_GRAINS_WITH_PAINT':
      return 'Grains & Painting (₹300)';
    case 'ONLY_CLEAR_COAT':
      return 'Only Clear Coat (₹150)';
    case 'TWO_SIDE_PAINT':
      return 'Two Side Paint (₹500)';
    case 'SITE_FITTING':
      return 'Site Fitting & Installation (₹400)';
    default:
      return op;
  }
}

// ── Contractor Directory Operations ──────────────────────────────────────────

export function getContractors(trade?: ContractorTrade): Contractor[] {
  const store = readStore();
  if (trade) {
    return store.contractors.filter((c) => c.trade === trade);
  }
  return store.contractors;
}

export function getContractorById(id: string): Contractor | null {
  const store = readStore();
  return store.contractors.find((c) => c.id === id) || null;
}

function resolveTradeLabel(trade: ContractorTrade, teamScope?: FloorGangScope): string {
  if (teamScope === 'MOLDING_TEAM_1') return 'Floor Gang: Molding Team 1';
  if (teamScope === 'MOLDING_TEAM_2') return 'Floor Gang: Molding Team 2';
  if (teamScope === 'DOOR_CUTTING_FINISHING') return 'Floor Gang: Door Cutting & Finishing';
  if (teamScope === 'FRAME_CUTTING_FINISHING') return 'Floor Gang: Frame Cutting & Finishing';
  if (teamScope === 'GRAINS_PAINTING') return 'Floor Gang: Grains & Painting';
  if (teamScope === 'PACKING_TEAM') return 'Floor Gang: Packing & Dispatch';
  if (teamScope === 'MOLDING_ALL') return 'Floor Gang: Door & Frame Molding';
  if (teamScope === 'SITE_FITTING') return 'Site Gang: Fitting & Door Installation';

  const tradeLabels: Record<ContractorTrade, string> = {
    MOLDING: 'Floor Gang: Door & Frame Molding',
    CUTTING_GRINDING: 'Floor Gang: Cutting & Finishing',
    PAINTING: 'Floor Gang: Grains & Painting',
    SITE_FITTING: 'Site Gang: Fitting & Door Installation',
  };
  return tradeLabels[trade] || trade;
}

export function recalculateContractorBalance(contractor: Contractor, store: ContractorStore): number {
  const initOpening = (contractor.openingBalance || 0) * (contractor.openingBalanceType === 'RECEIVABLE' ? -1 : 1);
  const totalEarned = store.workRecords
    .filter((w) => w.contractorId === contractor.id)
    .reduce((sum, w) => sum + w.totalAmount, 0);
  const totalPaid = store.payouts
    .filter((p) => p.contractorId === contractor.id)
    .reduce((sum, p) => sum + p.amount, 0);

  contractor.totalEarned = totalEarned;
  contractor.totalPaid = totalPaid;
  contractor.balancePayable = initOpening + totalEarned - totalPaid;
  return contractor.balancePayable;
}

export function createContractor(input: {
  name: string;
  phone: string;
  trade: ContractorTrade;
  isInHouseGang?: boolean;
  gangLeader?: string;
  memberNames?: string[];
  primaryStage?: string;
  teamScope?: FloorGangScope;
  upiId?: string;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  openingBalance?: number;
  openingBalanceType?: 'PAYABLE' | 'RECEIVABLE';
  openingBalanceDate?: string;
  openingBalanceNotes?: string;
}): Contractor {
  const store = readStore();
  const nextNum = store.contractors.length + 1;
  const id = `GNG-${String(nextNum).padStart(3, '0')}`;

  const normalizedStage =
    input.primaryStage?.trim() === 'FINISHING_GRAINS' ? 'PAINT_SECTION' : input.primaryStage?.trim() || undefined;

  const openingAmount = typeof input.openingBalance === 'number' ? input.openingBalance : 0;
  const openingType = input.openingBalanceType || 'PAYABLE';
  const initialBalance = openingAmount * (openingType === 'RECEIVABLE' ? -1 : 1);

  const newContractor: Contractor = {
    id,
    name: input.name.trim(),
    phone: input.phone.trim(),
    trade: input.trade,
    tradeLabel: resolveTradeLabel(input.trade, input.teamScope),
    isInHouseGang: input.isInHouseGang !== false,
    gangLeader: input.gangLeader?.trim() || undefined,
    memberNames: Array.isArray(input.memberNames)
      ? input.memberNames.map((m) => m.trim()).filter(Boolean)
      : undefined,
    primaryStage: normalizedStage,
    teamScope: input.teamScope,
    upiId: input.upiId?.trim() || undefined,
    bankAccount: input.bankAccount?.trim() || undefined,
    ifscCode: input.ifscCode?.trim() || undefined,
    bankName: input.bankName?.trim() || undefined,
    status: 'ACTIVE',
    totalDoorsCompleted: 0,
    totalEarned: 0,
    totalPaid: 0,
    openingBalance: openingAmount,
    openingBalanceType: openingType,
    openingBalanceDate: input.openingBalanceDate || new Date().toISOString().split('T')[0],
    openingBalanceNotes: input.openingBalanceNotes?.trim() || undefined,
    balancePayable: initialBalance,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.contractors.push(newContractor);
  writeStore(store);
  return newContractor;
}

export function updateContractor(id: string, updates: Partial<Contractor>): Contractor | null {
  const store = readStore();
  const idx = store.contractors.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const current = store.contractors[idx];
  const nextTrade = updates.trade || current.trade;
  const nextScope = updates.teamScope !== undefined ? updates.teamScope : current.teamScope;
  const nextStageRaw = updates.primaryStage !== undefined ? updates.primaryStage : current.primaryStage;
  const nextStage = nextStageRaw === 'FINISHING_GRAINS' ? 'PAINT_SECTION' : nextStageRaw;

  store.contractors[idx] = {
    ...current,
    ...updates,
    primaryStage: nextStage,
    trade: nextTrade,
    teamScope: nextScope,
    tradeLabel:
      updates.tradeLabel ||
      (updates.trade !== undefined || updates.teamScope !== undefined
        ? resolveTradeLabel(nextTrade, nextScope)
        : current.tradeLabel),
    updatedAt: new Date().toISOString(),
  };

  // Recalculate balance whenever opening balance or trade changes
  if (updates.openingBalance !== undefined || updates.openingBalanceType !== undefined) {
    recalculateContractorBalance(store.contractors[idx], store);
  }

  writeStore(store);
  return store.contractors[idx];
}

export function deleteContractor(id: string): boolean {
  const store = readStore();
  const prevLen = store.contractors.length;
  store.contractors = store.contractors.filter((c) => c.id !== id);
  if (store.contractors.length === prevLen) return false;
  writeStore(store);
  return true;
}

// ── Piece-Rate Work Crediting (Strict One-Time Lock per Job Work & Stage) ────

export class PieceRateDuplicateLockError extends Error {
  statusCode = 409;
  lockGroup: OperationLockGroup;
  existingRecord: ContractorJobWorkRecord;

  constructor(lockGroup: OperationLockGroup, existingRecord: ContractorJobWorkRecord) {
    const label = OPERATION_LOCK_GROUP_LABELS[lockGroup];
    super(
      `One-time piece-rate policy: "${label}" already credited once on ${
        existingRecord.jobCardNumber || existingRecord.orderNumber
      } (${existingRecord.contractorName} on ${existingRecord.date}). Rework carries ₹0 extra gang charge; create a New Job Card for additional paid work.`
    );
    this.name = 'PieceRateDuplicateLockError';
    this.lockGroup = lockGroup;
    this.existingRecord = existingRecord;
  }
}

function normalizeLockKey(v?: string | null): string {
  return (v || '').trim().toLowerCase();
}

function doesRecordMatchOrder(rec: ContractorJobWorkRecord, orderKeys: Set<string>): boolean {
  const candidates = [rec.orderId, rec.orderNumber, rec.jobCardNumber]
    .map(normalizeLockKey)
    .filter(Boolean);
  return candidates.some((c) => orderKeys.has(c));
}

function findBlockingPieceRateLock(
  store: ContractorStore,
  input: {
    orderId: string;
    orderNumber?: string;
    jobCardNumber?: string;
    doorId: string;
    operation: ContractorOperationType;
    quantity?: number;
    maxOrderDoorCount?: number;
  }
): { lockGroup: OperationLockGroup; existingRecord: ContractorJobWorkRecord } | null {
  const lockGroup = getOperationLockGroup(input.operation);
  const orderKeys = new Set(
    [input.orderId, input.orderNumber, input.jobCardNumber]
      .map(normalizeLockKey)
      .filter(Boolean)
  );
  if (orderKeys.size === 0) return null;

  const matchingGroupRecords = store.workRecords.filter(
    (rec) => doesRecordMatchOrder(rec, orderKeys) && getOperationLockGroup(rec.operation) === lockGroup
  );
  if (matchingGroupRecords.length === 0) return null;

  const incomingDoorKey = normalizeLockKey(input.doorId);
  const incomingIsBatch = incomingDoorKey.startsWith('batch');
  const incomingQty = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const maxDoors = input.maxOrderDoorCount && input.maxOrderDoorCount > 0 ? input.maxOrderDoorCount : 0;
  const creditedQty = matchingGroupRecords.reduce((s, r) => s + (Number(r.quantity) || 1), 0);

  // 1. Exact door-level lock: if this exact doorId already has credit for this stage (e.g. Door #1 already paid)
  if (!incomingIsBatch) {
    const exactDoor = matchingGroupRecords.find(
      (r) => normalizeLockKey(r.doorId) === incomingDoorKey
    );
    if (exactDoor) {
      return { lockGroup, existingRecord: exactDoor };
    }
  }

  // 2. Cap cumulative units at total doors in this Job Card (allows split teams up to maxOrderDoorCount)
  if (maxDoors > 0) {
    if (creditedQty >= maxDoors || creditedQty + incomingQty > maxDoors) {
      return { lockGroup, existingRecord: matchingGroupRecords[0] };
    }
  } else {
    // If maxOrderDoorCount is not provided:
    // Existing BATCH entry locks if incoming is also a batch or specific door
    const existingBatch = matchingGroupRecords.find((r) =>
      normalizeLockKey(r.doorId).startsWith('batch')
    );
    if (existingBatch) {
      return { lockGroup, existingRecord: existingBatch };
    }
    if (incomingIsBatch && matchingGroupRecords.length > 0) {
      return { lockGroup, existingRecord: matchingGroupRecords[0] };
    }
  }

  return null;
}

export function getOrderPieceRateLocks(
  orderKeysInput: {
    orderId: string;
    orderNumber?: string;
    jobCardNumber?: string;
  },
  totalDoors = 1
): OrderPieceRateLockSummary {
  const store = readStore();
  const keys = new Set(
    [orderKeysInput.orderId, orderKeysInput.orderNumber, orderKeysInput.jobCardNumber]
      .map(normalizeLockKey)
      .filter(Boolean)
  );

  const matchingAll = store.workRecords.filter((rec) => doesRecordMatchOrder(rec, keys));
  const groupsList: OperationLockGroup[] = [
    'MOLDING',
    'DOOR_CUTTING',
    'FRAME_CUTTING',
    'GRAINS_PAINTING',
    'SITE_FITTING',
  ];

  const maxDoors = Math.max(1, totalDoors);
  const groups = {} as Record<OperationLockGroup, OrderPieceRateGroupLock>;
  for (const grp of groupsList) {
    const recs = matchingAll.filter((r) => getOperationLockGroup(r.operation) === grp);
    const totalCreditedQty = recs.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const totalAmountCredited = recs.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const remainingDoorBalance = Math.max(0, maxDoors - totalCreditedQty);
    const isLocked = totalCreditedQty >= maxDoors;
    const latest = recs[0] || null;

    // Group contributing contractors
    const contributingMap = new Map<string, { contractorId: string; contractorName: string; quantity: number; amount: number }>();
    for (const r of recs) {
      const existing = contributingMap.get(r.contractorId);
      if (existing) {
        existing.quantity += Number(r.quantity) || 0;
        existing.amount += Number(r.totalAmount) || 0;
      } else {
        contributingMap.set(r.contractorId, {
          contractorId: r.contractorId,
          contractorName: r.contractorName,
          quantity: Number(r.quantity) || 0,
          amount: Number(r.totalAmount) || 0,
        });
      }
    }

    groups[grp] = {
      lockGroup: grp,
      label: OPERATION_LOCK_GROUP_LABELS[grp],
      isLocked,
      totalCreditedQty,
      totalAmountCredited,
      contractorName: latest?.contractorName || null,
      contributingContractors: Array.from(contributingMap.values()),
      remainingDoorBalance,
      operationLabel: latest?.operationLabel || null,
      lastPaidDate: latest?.date || null,
      creditedDoorIds: recs.map((r) => r.doorId),
    };
  }

  return {
    orderId: orderKeysInput.orderId,
    groups,
    totalCreditedAmount: matchingAll.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0),
    totalRecordsCount: matchingAll.length,
  };
}

export function recordPieceRateCredit(input: {
  contractorId: string;
  orderId: string;
  orderNumber: string;
  jobCardNumber?: string;
  doorId: string;
  doorNumber: string;
  doorModel: string;
  operation: ContractorOperationType;
  quantity?: number;
  customRate?: number;
  notes?: string;
  maxOrderDoorCount?: number;
}): ContractorJobWorkRecord {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === input.contractorId);
  if (!contractor) {
    throw new Error(`Contractor with ID ${input.contractorId} not found.`);
  }

  const blocker = findBlockingPieceRateLock(store, input);
  if (blocker) {
    throw new PieceRateDuplicateLockError(blocker.lockGroup, blocker.existingRecord);
  }

  const qty = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unitRate = input.customRate !== undefined ? input.customRate : getRateForOperation(input.operation);
  const totalAmount = qty * unitRate;

  const record: ContractorJobWorkRecord = {
    id: generateId('JWR'),
    contractorId: contractor.id,
    contractorName: contractor.name,
    trade: contractor.trade,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    jobCardNumber: input.jobCardNumber,
    doorId: input.doorId,
    doorNumber: input.doorNumber,
    doorModel: input.doorModel,
    operation: input.operation,
    operationLabel: getOperationLabel(input.operation),
    quantity: qty,
    unitRate,
    totalAmount,
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    notes: input.notes,
  };

  store.workRecords.unshift(record);

  // Update contractor financial balances
  contractor.totalDoorsCompleted += qty;
  contractor.totalEarned += totalAmount;
  contractor.balancePayable += totalAmount;
  contractor.updatedAt = new Date().toISOString();

  writeStore(store);
  return record;
}

export function recordPieceRateCreditIfUnpaid(input: {
  contractorId: string;
  orderId: string;
  orderNumber: string;
  jobCardNumber?: string;
  doorId: string;
  doorNumber: string;
  doorModel: string;
  operation: ContractorOperationType;
  quantity?: number;
  customRate?: number;
  notes?: string;
  maxOrderDoorCount?: number;
}): {
  created: boolean;
  record: ContractorJobWorkRecord | null;
  skippedReason: string | null;
  existingRecord: ContractorJobWorkRecord | null;
} {
  const store = readStore();
  const blocker = findBlockingPieceRateLock(store, input);
  if (blocker) {
    const label = OPERATION_LOCK_GROUP_LABELS[blocker.lockGroup];
    return {
      created: false,
      record: null,
      skippedReason: `One-time lock active: ${label} already paid once (${blocker.existingRecord.contractorName}) — Rework carries ₹0.`,
      existingRecord: blocker.existingRecord,
    };
  }

  const record = recordPieceRateCredit(input);
  return {
    created: true,
    record,
    skippedReason: null,
    existingRecord: null,
  };
}

// ── Contractor Disbursements & Payout Vouchers ────────────────────────────────

export function recordContractorPayout(input: {
  contractorId: string;
  amount: number;
  paymentMode: PaymentDisbursementMode;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
}): ContractorPayoutVoucher {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === input.contractorId);
  if (!contractor) {
    throw new Error(`Contractor with ID ${input.contractorId} not found.`);
  }

  if (input.amount <= 0) {
    throw new Error('Payout amount must be greater than zero.');
  }

  const voucherNum = `VCHR-2026-${String(store.payouts.length + 1).padStart(4, '0')}`;
  const voucher: ContractorPayoutVoucher = {
    id: generateId('vchr'),
    voucherNumber: voucherNum,
    contractorId: contractor.id,
    contractorName: contractor.name,
    date: new Date().toISOString().split('T')[0],
    amount: input.amount,
    paymentMode: input.paymentMode,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    recordedBy: input.recordedBy || 'Plant Accounts Desk',
    timestamp: Date.now(),
  };

  store.payouts.unshift(voucher);

  // Deduct from balance
  contractor.totalPaid += input.amount;
  contractor.balancePayable -= input.amount;
  contractor.updatedAt = new Date().toISOString();

  writeStore(store);
  return voucher;
}

export function getContractorWorkRecords(contractorId: string): ContractorJobWorkRecord[] {
  const store = readStore();
  return store.workRecords.filter((w) => w.contractorId === contractorId);
}

export function getAllWorkRecords(): ContractorJobWorkRecord[] {
  const store = readStore();
  return store.workRecords;
}

export function getContractorPayouts(contractorId: string): ContractorPayoutVoucher[] {
  const store = readStore();
  return store.payouts.filter((p) => p.contractorId === contractorId);
}

// ── Weekly Work Statement & PDF Generation ────────────────────────────────────

export function getContractorWeeklyStatement(
  contractorId: string,
  startDate?: string,
  endDate?: string
): ContractorWeeklyStatement {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === contractorId);
  if (!contractor) {
    throw new Error(`Contractor ${contractorId} not found.`);
  }

  // Default to current week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startStr = startDate || monday.toISOString().split('T')[0];
  const endStr = endDate || sunday.toISOString().split('T')[0];

  const startTime = new Date(startStr).getTime();
  const endTime = new Date(endStr).setHours(23, 59, 59, 999);

  // Filter records within period
  const workInPeriod = store.workRecords.filter(
    (w) => w.contractorId === contractorId && w.timestamp >= startTime && w.timestamp <= endTime
  );

  const payoutsInPeriod = store.payouts.filter(
    (p) => p.contractorId === contractorId && p.timestamp >= startTime && p.timestamp <= endTime
  );

  // Calculate earnings prior to period for opening balance
  const workPrior = store.workRecords.filter(
    (w) => w.contractorId === contractorId && w.timestamp < startTime
  );
  const payoutsPrior = store.payouts.filter(
    (p) => p.contractorId === contractorId && p.timestamp < startTime
  );

  const initOpening = (contractor.openingBalance || 0) * (contractor.openingBalanceType === 'RECEIVABLE' ? -1 : 1);
  const earnedPrior = workPrior.reduce((sum, w) => sum + w.totalAmount, 0);
  const paidPrior = payoutsPrior.reduce((sum, p) => sum + p.amount, 0);
  const openingBalance = initOpening + earnedPrior - paidPrior;

  const totalDoorsInPeriod = workInPeriod.reduce((sum, w) => sum + w.quantity, 0);
  const totalEarnedInPeriod = workInPeriod.reduce((sum, w) => sum + w.totalAmount, 0);
  const totalPaidInPeriod = payoutsInPeriod.reduce((sum, p) => sum + p.amount, 0);
  const closingBalance = openingBalance + totalEarnedInPeriod - totalPaidInPeriod;

  return {
    contractor,
    startDate: startStr,
    endDate: endStr,
    openingBalance,
    items: workInPeriod,
    totalDoorsInPeriod,
    totalEarnedInPeriod,
    payoutsInPeriod,
    totalPaidInPeriod,
    closingBalance,
    generatedAt: new Date().toISOString(),
  };
}
