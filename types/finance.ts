// ── Shared Finance Types & Calculation Utilities (Client & Server Safe) ─────

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMode = 'NEFT' | 'RTGS' | 'UPI' | 'CHEQUE' | 'CASH';
export type TargetStatus = 'DRAFT' | 'APPROVED' | 'LOCKED' | 'REVISED';

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-001
  salesOrderId?: string | null;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  cgst: number; // 9%
  sgst: number; // 9%
  igst: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  eWayBillNumber?: string | null;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface Payment {
  id: string;
  receiptNumber: string; // RCT-2026-001
  invoiceId?: string | null;
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string;
  createdAt: string;
  _demo?: boolean;
}

export interface FinancialTarget {
  id: string;
  targetPeriod: string; // e.g. "2026-10"
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  salesRevenueTarget: number;
  collectionsTarget: number;
  frpDoorQuantityTarget: number;
  grossProfitTarget: number;
  expenseBudget: number;
  status: TargetStatus;
  baselineSnapshot?: string | null;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface BreakEvenAnalysis {
  fixedOverheadCosts: number;
  averageFRPPricePerDoor: number;
  variableCostPerDoor: number;
  contributionMarginPerDoor: number;
  contributionMarginRatio: number;
  isViable: boolean;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  targetSalesRevenue: number;
  targetProfit: number;
  requiredUnitsForTargetProfit: number;
  requiredRevenueForTargetProfit: number;
  workingDaysPerMonth: number;
  dailyBreakEvenUnits: number;
  dailyTargetProfitUnits: number;
  marginOfSafetyAmount: number;
  marginOfSafetyPercentage: number;
  formulaDetails: {
    cmPerDoor: string;
    breakEvenUnits: string;
    breakEvenRevenue: string;
    marginOfSafety: string;
    targetProfitUnits: string;
  };
}

export interface FinanceStore {
  invoices: Invoice[];
  payments: Payment[];
  targets: FinancialTarget[];
}

function formatInrNum(val: number): string {
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

/**
 * FRP Manufacturing Break-Even Calculator (CVP Engine)
 * Dynamically computes Contribution Margin, BEP Units/Revenue, Daily Pace & Target Profit.
 */
export function calculateBreakEven(params?: {
  fixedOverheadCosts?: number;
  averageFRPPricePerDoor?: number;
  variableCostPerDoor?: number;
  targetSalesRevenue?: number;
  targetProfit?: number;
  workingDaysPerMonth?: number;
}): BreakEvenAnalysis {
  const fixedOverhead = Math.max(0, Number(params?.fixedOverheadCosts ?? 450000) || 0);
  const avgPrice = Math.max(0, Number(params?.averageFRPPricePerDoor ?? 8500) || 0);
  const varCost = Math.max(0, Number(params?.variableCostPerDoor ?? 4800) || 0);
  const targetRevenue = Math.max(0, Number(params?.targetSalesRevenue ?? 2500000) || 0);
  const targetProfit = Math.max(0, Number(params?.targetProfit ?? 0) || 0);
  const workingDaysPerMonth = Math.max(1, Math.min(31, Number(params?.workingDaysPerMonth ?? 26) || 26));

  const cmPerDoor = avgPrice - varCost;
  const cmRatio = avgPrice > 0 ? parseFloat((cmPerDoor / avgPrice).toFixed(4)) : 0;
  const isViable = avgPrice > 0 && cmPerDoor > 0 && cmRatio > 0;

  const breakEvenUnits = isViable ? Math.ceil(fixedOverhead / cmPerDoor) : 0;
  const breakEvenRevenue = isViable ? Math.round(fixedOverhead / cmRatio) : 0;

  const requiredUnitsForTargetProfit = isViable
    ? Math.ceil((fixedOverhead + targetProfit) / cmPerDoor)
    : 0;
  const requiredRevenueForTargetProfit = isViable
    ? Math.round((fixedOverhead + targetProfit) / cmRatio)
    : 0;

  const dailyBreakEvenUnits = isViable
    ? parseFloat((breakEvenUnits / workingDaysPerMonth).toFixed(1))
    : 0;
  const dailyTargetProfitUnits = isViable
    ? parseFloat((requiredUnitsForTargetProfit / workingDaysPerMonth).toFixed(1))
    : 0;

  const marginOfSafetyAmount =
    isViable && targetRevenue > breakEvenRevenue
      ? Math.round(targetRevenue - breakEvenRevenue)
      : 0;

  const marginOfSafety =
    isViable && targetRevenue > breakEvenRevenue && targetRevenue > 0
      ? parseFloat((((targetRevenue - breakEvenRevenue) / targetRevenue) * 100).toFixed(1))
      : 0;

  const cmPctLabel = `${(cmRatio * 100).toFixed(2)}%`;

  return {
    fixedOverheadCosts: fixedOverhead,
    averageFRPPricePerDoor: avgPrice,
    variableCostPerDoor: varCost,
    contributionMarginPerDoor: cmPerDoor,
    contributionMarginRatio: cmRatio,
    isViable,
    breakEvenUnits,
    breakEvenRevenue,
    targetSalesRevenue: targetRevenue,
    targetProfit,
    requiredUnitsForTargetProfit,
    requiredRevenueForTargetProfit,
    workingDaysPerMonth,
    dailyBreakEvenUnits,
    dailyTargetProfitUnits,
    marginOfSafetyAmount,
    marginOfSafetyPercentage: marginOfSafety,
    formulaDetails: {
      cmPerDoor: `Contribution Margin = Avg Price (${formatInrNum(avgPrice)}) - Variable Cost (${formatInrNum(varCost)}) = ${formatInrNum(cmPerDoor)}/Door`,
      breakEvenUnits: isViable
        ? `Break-Even Units = Fixed Overheads (${formatInrNum(fixedOverhead)}) / CM (${formatInrNum(cmPerDoor)}) = ${breakEvenUnits} Doors`
        : 'Not Viable: Variable Cost per Door >= Avg Selling Price (Contribution Margin <= 0)',
      breakEvenRevenue: isViable
        ? `Break-Even Sales = Fixed Overheads (${formatInrNum(fixedOverhead)}) / CM Ratio (${cmPctLabel}) = ${formatInrNum(breakEvenRevenue)}`
        : 'Not Viable: CM Ratio <= 0%',
      marginOfSafety: isViable
        ? `Margin of Safety = (${formatInrNum(targetRevenue)} - ${formatInrNum(breakEvenRevenue)}) / ${formatInrNum(targetRevenue)} = ${marginOfSafety}%`
        : 'Not Viable: Break-Even Boundary Unreachable at Current Unit Margin',
      targetProfitUnits: isViable
        ? `Target Profit Doors = (${formatInrNum(fixedOverhead)} + ${formatInrNum(targetProfit)}) / ${formatInrNum(cmPerDoor)} = ${requiredUnitsForTargetProfit} Doors`
        : 'Adjust Selling Price or Reduce Variable Cost to achieve positive Contribution Margin',
    },
  };
}
