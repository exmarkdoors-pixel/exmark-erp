// ── EXMARK ERP — Complete Double-Entry Accounting Types (Client & Server Safe) ──

export type AccountGroup = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export type AccountSubType =
  | 'CASH'
  | 'BANK'
  | 'RECEIVABLE'
  | 'INVENTORY'
  | 'FIXED_ASSET'
  | 'OTHER_ASSET'
  | 'PAYABLE'
  | 'TAX_PAYABLE'
  | 'TAX_INPUT'
  | 'CUSTOMER_ADVANCE'
  | 'LOAN'
  | 'OTHER_LIABILITY'
  | 'CAPITAL'
  | 'RETAINED_EARNINGS'
  | 'SALES'
  | 'SALES_RETURN'
  | 'OTHER_INCOME'
  | 'PURCHASE'
  | 'DIRECT_EXPENSE'
  | 'OPERATING_EXPENSE';

export type BalanceSide = 'DEBIT' | 'CREDIT';

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'CONTRACTOR' | 'OTHER';

export type AccountingPaymentMode = 'CASH' | 'UPI' | 'NEFT' | 'RTGS' | 'CHEQUE' | 'CARD';

export type VoucherSourceType =
  | 'MANUAL'
  | 'SALES_INVOICE'
  | 'PAYMENT_IN'
  | 'CREDIT_NOTE'
  | 'OTHER_INCOME'
  | 'PURCHASE_BILL'
  | 'PAYMENT_OUT'
  | 'EXPENSE'
  | 'CONTRA'
  | 'PARTY_TO_PARTY'
  | 'YEAR_CLOSE';

export interface FinancialYearCloseRecord {
  id: string;
  fyLabel: string;
  fromDate: string;
  toDate: string;
  mode: 'CARRY_FORWARD_NEW_COMPANY' | 'IN_PLACE';
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  closingCapital: number;
  closingJournalId?: string;
  nextCompanyId?: string;
  nextCompanyName?: string;
  snapshotFile: string;
  closedBy: string;
  closedAt: string;
}

export interface OpeningBalanceEntryInput {
  accountId: string;
  openingBalance: number;
  openingType: BalanceSide;
}

export interface OpeningBalancesSnapshot {
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    group: AccountGroup;
    subType: AccountSubType;
    openingBalance: number;
    openingType: BalanceSide;
    linkedCashBankName?: string;
  }>;
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  difference: number;
  isBalanced: boolean;
}

export interface FinancialYearClosePreview {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  fyLabel: string;
  nextFyStart: string;
  suggestedNextCompanyName: string;
  lockDate?: string;
  alreadyClosed: boolean;
  pnlSummary: {
    totalRevenue: number;
    totalDirectCost: number;
    totalOperatingExpenses: number;
    netProfit: number;
  };
  carryForwardAccounts: Array<{
    accountId: string;
    code: string;
    name: string;
    group: AccountGroup;
    openingBalance: number;
    openingType: BalanceSide;
  }>;
  cashBankCarryForward: Array<{
    id: string;
    name: string;
    accountType: 'CASH' | 'BANK' | 'UPI_WALLET';
    closingBalance: number;
  }>;
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    closingCapitalWithProfit: number;
    totalCarryForwardDebit: number;
    totalCarryForwardCredit: number;
    isBalanced: boolean;
  };
  openVouchers: {
    unpaidSalesCount: number;
    unpaidSalesTotal: number;
    unpaidPurchasesCount: number;
    unpaidPurchasesTotal: number;
  };
  closedYears: FinancialYearCloseRecord[];
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  group: AccountGroup;
  subType: AccountSubType;
  parentId?: string;
  openingBalance: number;
  openingType: BalanceSide;
  isSystem: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartOfAccountWithBalance extends ChartOfAccount {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingType: BalanceSide;
  transactionCount: number;
  isDeletable?: boolean;
  deleteBlockReason?: string;
  childCount?: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  linkedAccountId: string;
  description?: string;
  isSystem?: boolean;
  createdAt: string;
}

export interface CashBankAccount {
  id: string;
  coaAccountId: string;
  name: string;
  accountType: 'CASH' | 'BANK' | 'UPI_WALLET';
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  openingBalance: number;
  isDefault?: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashBankAccountWithBalance extends CashBankAccount {
  totalInflow: number;
  totalOutflow: number;
  closingBalance: number;
  transactionCount: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnCode?: string;
  qty: number;
  unit?: string;
  rate: number;
  amount: number;
}

export interface SalesInvoiceRecord {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  orderRef?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  gstRate: number; // 0, 5, 12, 18, 28
  gstMode: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  creditNoteAmount: number;
  balanceAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  eWayBillNo?: string;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInRecord {
  id: string;
  receiptNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  cashBankAccountId: string;
  cashBankAccountName: string;
  paymentMode: AccountingPaymentMode;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  collectionType?: 'DIRECT_BANK' | 'CASH_IN_HAND' | 'UPI_QR';
  journalEntryId?: string;
  createdAt: string;
}

export interface SalesReturnCreditNoteRecord {
  id: string;
  creditNoteNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  reason: string;
  subtotal: number;
  gstRate: number;
  gstMode: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface OtherIncomeRecord {
  id: string;
  voucherNumber: string;
  date: string;
  incomeAccountId: string;
  incomeAccountName: string;
  cashBankAccountId: string;
  cashBankAccountName: string;
  paymentMode: AccountingPaymentMode;
  receivedFrom: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface PurchaseBillRecord {
  id: string;
  billNumber: string;
  vendorBillNo?: string;
  date: string;
  dueDate: string;
  supplierName: string;
  supplierPhone?: string;
  supplierGstin?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  gstRate: number;
  gstMode: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOutRecord {
  id: string;
  voucherNumber: string;
  date: string;
  supplierName: string;
  billId?: string;
  billNumber?: string;
  cashBankAccountId: string;
  cashBankAccountName: string;
  paymentMode: AccountingPaymentMode;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  voucherNumber: string;
  date: string;
  categoryId: string;
  categoryName: string;
  linkedAccountId: string;
  cashBankAccountId: string;
  cashBankAccountName: string;
  paymentMode: AccountingPaymentMode;
  payeeName: string;
  subtotal: number;
  gstRate: number;
  taxAmount: number;
  totalAmount: number;
  referenceNumber?: string;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface ContraTransferRecord {
  id: string;
  voucherNumber: string;
  date: string;
  transferType: 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'BANK_TRANSFER';
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
}

export type PartyToPartyPaymentMode =
  | 'DIRECT_BANK'
  | 'DIRECT_UPI'
  | 'CASH'
  | 'BOOK_ADJUSTMENT'
  | 'CHEQUE';

export interface PartyToPartyPaymentRecord {
  id: string;
  voucherNumber: string;
  date: string;
  // Paying Party (Credit)
  fromPartyId?: string;
  fromPartyName: string;
  fromPartyType: PartyType;
  fromAccountId: string;
  fromAccountName: string;
  // Receiving Party (Debit)
  toPartyId?: string;
  toPartyName: string;
  toPartyType: PartyType;
  toAccountId: string;
  toAccountName: string;
  // Payment details
  amount: number;
  paymentMode: PartyToPartyPaymentMode;
  referenceNumber?: string;
  narration: string;
  journalEntryId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineNote?: string;
}

export interface JournalEntryRecord {
  id: string;
  journalNumber: string;
  date: string;
  sourceType: VoucherSourceType;
  sourceId?: string;
  partyName?: string;
  partyType?: PartyType;
  reference?: string;
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutoBillDeliveryResult {
  billed: boolean;
  alreadyBilled: boolean;
  skippedReason?: string;
  invoiceNumber?: string;
  invoiceId?: string;
  totalAmount?: number;
  advanceAdjusted?: number;
  balanceDue?: number;
  paymentReceiptNumber?: string;
  customerName?: string;
}

export interface PendingDeliveryBillItem {
  source: 'DISPATCH' | 'PRODUCTION' | 'ORDER';
  sourceId: string;
  orderRef: string;
  customerName: string;
  district?: string;
  deliveryDate: string;
  doorCount: number;
  estimatedAmount: number;
  advanceAmount: number;
  needsManualAmount: boolean;
}

export interface AccountingLedgerStore {
  version: number;
  settings?: {
    gstEnabled: boolean;
    autoBillOnDelivery?: boolean;
    lockDate?: string;
    closedYears?: FinancialYearCloseRecord[];
  };
  accounts: ChartOfAccount[];
  expenseCategories: ExpenseCategory[];
  cashBankAccounts: CashBankAccount[];
  salesInvoices: SalesInvoiceRecord[];
  paymentsIn: PaymentInRecord[];
  creditNotes: SalesReturnCreditNoteRecord[];
  otherIncomes: OtherIncomeRecord[];
  purchaseBills: PurchaseBillRecord[];
  paymentsOut: PaymentOutRecord[];
  expenses: ExpenseRecord[];
  contraTransfers: ContraTransferRecord[];
  partyToPartyPayments?: PartyToPartyPaymentRecord[];
  journals: JournalEntryRecord[];
  updatedAt: string;
}

export interface AccountStatementLine {
  date: string;
  voucherNumber: string;
  sourceType: VoucherSourceType;
  particulars: string;
  reference?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
}

export interface AccountStatementResponse {
  mode: 'ACCOUNT' | 'PARTY';
  title: string;
  subtitle: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  openingType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingType: BalanceSide;
  lines: AccountStatementLine[];
}

export type AccountingReportType =
  | 'PNL'
  | 'BALANCE_SHEET'
  | 'TRIAL_BALANCE'
  | 'DAY_BOOK'
  | 'CASH_BANK_SUMMARY'
  | 'AGING'
  | 'EXPENSE_BY_CATEGORY'
  | 'GST_SUMMARY'
  | 'PARTY_TO_PARTY'
  | 'SALESMAN_COLLECTION'
  | 'CUSTOMER_CREDIT_SUMMARY';

export interface AccountingOverviewPayload {
  gstEnabled: boolean;
  kpis: {
    totalSales: number;
    totalSalesReturns: number;
    netSales: number;
    totalOtherIncome: number;
    totalReceivables: number;
    totalPurchases: number;
    totalPayables: number;
    totalExpenses: number;
    totalCashBalance: number;
    totalBankBalance: number;
    totalCashAndBank: number;
    netProfit: number;
    gstOutput: number;
    gstInput: number;
    netGstPayable: number;
  };
  counts: {
    salesInvoices: number;
    paymentsIn: number;
    creditNotes: number;
    otherIncomes: number;
    purchaseBills: number;
    paymentsOut: number;
    expenses: number;
    expenseCategories: number;
    cashBankAccounts: number;
    contraTransfers: number;
    partyToPartyPayments: number;
    coaAccounts: number;
    journals: number;
  };
  accounts: ChartOfAccountWithBalance[];
  expenseCategories: ExpenseCategory[];
  cashBankAccounts: CashBankAccountWithBalance[];
}
