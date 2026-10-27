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
  breakEvenUnits: number;
  breakEvenRevenue: number;
  targetSalesRevenue: number;
  marginOfSafetyPercentage: number;
  formulaDetails: {
    cmPerDoor: string;
    breakEvenUnits: string;
    breakEvenRevenue: string;
    marginOfSafety: string;
  };
}

export interface FinanceStore {
  invoices: Invoice[];
  payments: Payment[];
  targets: FinancialTarget[];
}

/**
 * FRP Manufacturing Break-Even Calculator
 * Explicitly displays all financial accounting formulas and ratios
 */
export function calculateBreakEven(params?: {
  fixedOverheadCosts?: number;
  averageFRPPricePerDoor?: number;
  variableCostPerDoor?: number;
  targetSalesRevenue?: number;
}): BreakEvenAnalysis {
  // Typical Kerala FRP Door Factory baseline parameters:
  const fixedOverhead = params?.fixedOverheadCosts ?? 450000; // Rent, depreciation, plant staff, utilities
  const avgPrice = params?.averageFRPPricePerDoor ?? 8500;   // 32mm Molded FRP door avg retail/dealer rate
  const varCost = params?.variableCostPerDoor ?? 4800;      // Resin, fiberglass mat, core filler, PU paint, labor

  const cmPerDoor = avgPrice - varCost;
  const cmRatio = parseFloat((cmPerDoor / avgPrice).toFixed(4));
  const breakEvenUnits = Math.ceil(fixedOverhead / cmPerDoor);
  const breakEvenRevenue = Math.round(fixedOverhead / cmRatio);
  const targetRevenue = params?.targetSalesRevenue ?? 2500000;

  const marginOfSafety = targetRevenue > breakEvenRevenue
    ? parseFloat((((targetRevenue - breakEvenRevenue) / targetRevenue) * 100).toFixed(1))
    : 0;

  return {
    fixedOverheadCosts: fixedOverhead,
    averageFRPPricePerDoor: avgPrice,
    variableCostPerDoor: varCost,
    contributionMarginPerDoor: cmPerDoor,
    contributionMarginRatio: cmRatio,
    breakEvenUnits,
    breakEvenRevenue,
    targetSalesRevenue: targetRevenue,
    marginOfSafetyPercentage: marginOfSafety,
    formulaDetails: {
      cmPerDoor: 'Contribution Margin = Selling Price (₹8,500) - Variable Cost (₹4,800) = ₹3,700/Door',
      breakEvenUnits: 'Break-Even Units = Fixed Overheads (₹4,50,000) / Contribution Margin (₹3,700) = 122 Doors',
      breakEvenRevenue: 'Break-Even Sales = Fixed Overheads / CM Ratio (43.53%) = ₹10,33,770',
      marginOfSafety: 'Margin of Safety = (Target Revenue - Break-Even Revenue) / Target Revenue * 100',
    },
  };
}
