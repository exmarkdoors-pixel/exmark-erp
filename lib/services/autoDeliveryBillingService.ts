import fs from 'fs';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import {
  DEFAULT_CASH_BANK_IDS,
  createPaymentIn,
  createSalesInvoice,
  readAccountingStore,
} from './accountingService';
import type { AutoBillDeliveryResult, PendingDeliveryBillItem, SalesInvoiceRecord } from '@/types/accounting';

interface StoredQuotation {
  id: string;
  quoteNumber?: string;
  customerId?: string;
  customerName?: string;
  phone?: string;
  district?: string;
  date?: string;
  items?: Array<{
    description?: string;
    doorModel?: string;
    model?: string;
    quantity?: number;
    qty?: number;
    rate?: number;
    unitPrice?: number;
    amount?: number;
    total?: number;
  }>;
  subtotal?: number;
  totalAmount?: number;
  advanceAmount?: number;
  advanceVerified?: boolean;
  status?: string;
  orderStatus?: string;
  productionOrderId?: string;
}

interface StoredCustomer {
  id: string;
  name?: string;
  phone?: string;
  district?: string;
}

interface StoredDispatch {
  id: string;
  dispatchNumber?: string;
  salesOrderId?: string | null;
  customerName?: string;
  deliveryDistrict?: string;
  doorCount?: number;
  dispatchDate?: string;
  status?: string;
}

interface StoredProductionOrder {
  id: string;
  prodOrderNumber?: string;
  jobCardNumber?: string;
  salesOrderId?: string | null;
  measurementRef?: string | null;
  customerName?: string;
  district?: string;
  orderDate?: string;
  quantity?: number;
  doors?: Array<{ model?: string }>;
  status?: string;
  stage?: string;
}

function readJsonArray<T>(filename: string): T[] {
  try {
    const p = getDataFilePath(filename);
    if (!fs.existsSync(p)) return [];
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readDispatchesList(): StoredDispatch[] {
  try {
    const p = getDataFilePath('fulfillment-store.json');
    if (!fs.existsSync(p)) return [];
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(parsed?.dispatches) ? parsed.dispatches : [];
  } catch {
    return [];
  }
}

function normalizeRef(ref?: string | null): string {
  return String(ref || '').trim().toUpperCase();
}

function expandEquivalentRefs(refs: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const r of refs) {
    const norm = normalizeRef(r);
    if (!norm) continue;
    out.add(norm);
    if (norm.startsWith('QTN-')) out.add(norm.replace(/^QTN-/, 'SO-'));
    if (norm.startsWith('SO-')) out.add(norm.replace(/^SO-/, 'QTN-'));
  }
  return out;
}

export function findExistingAutoBill(refs: Array<string | null | undefined>): SalesInvoiceRecord | undefined {
  const refSet = expandEquivalentRefs(refs);
  if (refSet.size === 0) return undefined;
  const store = readAccountingStore();
  return store.salesInvoices.find((inv) => {
    const invRefs = expandEquivalentRefs([inv.orderRef, inv.invoiceNumber]);
    for (const r of refSet) {
      if (invRefs.has(r)) return true;
    }
    return false;
  });
}

function resolveLinkedQuotation(params: {
  salesOrderId?: string | null;
  orderRef?: string | null;
  productionOrderId?: string | null;
  customerName?: string | null;
}): {
  quote?: StoredQuotation;
  customer?: StoredCustomer;
  items: Array<{ description: string; qty: number; rate: number }>;
  totalAmount: number;
  advanceAmount: number;
  canonicalRef: string;
} {
  const quotes = readJsonArray<StoredQuotation>('quotations-store.json');
  const customers = readJsonArray<StoredCustomer>('customers-store.json');

  const refSet = expandEquivalentRefs([params.salesOrderId, params.orderRef]);

  let quote: StoredQuotation | undefined;
  if (params.salesOrderId) {
    quote = quotes.find(
      (q) =>
        q.id === params.salesOrderId ||
        normalizeRef(q.quoteNumber) === normalizeRef(params.salesOrderId) ||
        normalizeRef(q.quoteNumber?.replace(/^QTN-/, 'SO-')) === normalizeRef(params.salesOrderId)
    );
  }
  if (!quote && params.productionOrderId) {
    quote = quotes.find((q) => q.productionOrderId === params.productionOrderId);
  }
  if (!quote && refSet.size > 0) {
    quote = quotes.find((q) => {
      const qRefs = expandEquivalentRefs([q.id, q.quoteNumber]);
      for (const r of refSet) {
        if (qRefs.has(r)) return true;
      }
      return false;
    });
  }

  const customer = quote?.customerId
    ? customers.find((c) => c.id === quote.customerId)
    : params.customerName
    ? customers.find((c) => (c.name || '').toLowerCase() === params.customerName!.trim().toLowerCase())
    : undefined;

  const items: Array<{ description: string; qty: number; rate: number }> = [];
  if (quote && Array.isArray(quote.items) && quote.items.length > 0) {
    for (const it of quote.items) {
      const qty = Math.max(1, Number(it.quantity ?? it.qty ?? 1));
      const directRate = Number(it.rate ?? it.unitPrice ?? 0);
      const lineTotal = Number(it.amount ?? it.total ?? 0);
      const rate = directRate > 0 ? directRate : lineTotal > 0 ? Math.round((lineTotal / qty) * 100) / 100 : 0;
      if (rate > 0) {
        items.push({
          description: String(it.description || it.doorModel || it.model || 'FRP Molded Door').trim(),
          qty,
          rate,
        });
      }
    }
  }

  const quoteTotal = Math.round((Number(quote?.totalAmount ?? quote?.subtotal ?? 0) || 0) * 100) / 100;
  const itemsSum = Math.round(items.reduce((s, i) => s + i.qty * i.rate, 0) * 100) / 100;

  if (items.length === 0 && quoteTotal > 0) {
    const doorCount =
      quote?.items?.reduce((s, i) => s + Math.max(1, Number(i.quantity ?? i.qty ?? 1)), 0) || 1;
    items.push({
      description: `Delivered Door Consignment (${quote?.quoteNumber || params.orderRef || 'Order'})`,
      qty: doorCount,
      rate: Math.round((quoteTotal / doorCount) * 100) / 100,
    });
  }

  const totalAmount = itemsSum > 0 ? itemsSum : quoteTotal;
  const advanceAmount =
    quote && quote.advanceVerified !== false && Number(quote.advanceAmount || 0) > 0
      ? Math.min(totalAmount, Math.round(Number(quote.advanceAmount) * 100) / 100)
      : 0;

  const canonicalRef =
    quote?.quoteNumber?.replace(/^QTN-/, 'SO-') ||
    params.orderRef ||
    params.salesOrderId ||
    `DEL-${Date.now().toString().slice(-5)}`;

  return { quote, customer, items, totalAmount, advanceAmount, canonicalRef };
}

export function autoBillCompletedDelivery(params: {
  source: 'DISPATCH' | 'PRODUCTION' | 'ORDER';
  sourceId: string;
  salesOrderId?: string | null;
  orderRef?: string | null;
  productionOrderId?: string | null;
  customerName?: string | null;
  deliveryDate?: string;
  doorCount?: number;
  overrideAmount?: number;
  overrideAdvance?: number;
  createdBy?: string;
  forceEvenIfDisabled?: boolean;
}): AutoBillDeliveryResult {
  const store = readAccountingStore();
  if (!params.forceEvenIfDisabled && store.settings?.autoBillOnDelivery === false) {
    return {
      billed: false,
      alreadyBilled: false,
      skippedReason: 'Auto-Bill on Delivery is currently paused in Accounting settings.',
    };
  }

  const resolved = resolveLinkedQuotation({
    salesOrderId: params.salesOrderId,
    orderRef: params.orderRef,
    productionOrderId: params.productionOrderId,
    customerName: params.customerName,
  });

  // Duplicate guard across all linked reference identifiers
  const existing = findExistingAutoBill([
    params.sourceId,
    params.salesOrderId,
    params.orderRef,
    resolved.quote?.id,
    resolved.quote?.quoteNumber,
    resolved.canonicalRef,
  ]);
  if (existing) {
    return {
      billed: false,
      alreadyBilled: true,
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      totalAmount: existing.totalAmount,
      balanceDue: existing.balanceAmount,
      customerName: existing.customerName,
    };
  }

  const customerName =
    String(params.customerName || resolved.customer?.name || resolved.quote?.customerName || '').trim() ||
    'Delivered Customer';

  let items = resolved.items;
  let totalAmount = resolved.totalAmount;

  if (params.overrideAmount && Number(params.overrideAmount) > 0) {
    const qty = Math.max(1, Number(params.doorCount) || 1);
    const amt = Math.round(Number(params.overrideAmount) * 100) / 100;
    items = [
      {
        description: `Completed Delivery (${resolved.canonicalRef})`,
        qty,
        rate: Math.round((amt / qty) * 100) / 100,
      },
    ];
    totalAmount = amt;
  }

  if (totalAmount <= 0 || items.length === 0) {
    return {
      billed: false,
      alreadyBilled: false,
      customerName,
      skippedReason: `Delivery completed for ${customerName}, but no order price was linked yet. Enter net amount in Auto-Bill Delivered Parties to post.`,
    };
  }

  const date = params.deliveryDate || new Date().toISOString().slice(0, 10);
  const createdInvoice = createSalesInvoice({
    date,
    dueDate: date,
    customerId: resolved.customer?.id || resolved.quote?.customerId,
    customerName,
    customerPhone: resolved.customer?.phone || resolved.quote?.phone,
    orderRef: resolved.canonicalRef,
    items,
    gstMode: store.settings?.gstEnabled ? 'INTRA_STATE' : 'EXEMPT',
    gstRate: store.settings?.gstEnabled ? 18 : 0,
    notes: `Auto-billed on ${params.source} delivery completion (${params.sourceId})`,
    createdBy: params.createdBy || 'Auto-Delivery Billing',
  });

  // Automatically credit verified Advance paid on this order so Balance Due is immediately accurate
  const advanceToCredit =
    params.overrideAdvance !== undefined
      ? Math.min(createdInvoice.totalAmount, Math.max(0, Number(params.overrideAdvance) || 0))
      : Math.min(createdInvoice.totalAmount, resolved.advanceAmount);

  let paymentReceiptNumber: string | undefined;
  let finalBalance = createdInvoice.balanceAmount;

  if (advanceToCredit > 0.01) {
    const refreshedStore = readAccountingStore();
    const defaultCbId =
      refreshedStore.cashBankAccounts.find((c) => c.accountType === 'BANK')?.id ||
      refreshedStore.cashBankAccounts[0]?.id ||
      DEFAULT_CASH_BANK_IDS.CASH;

    const receipt = createPaymentIn({
      date,
      customerId: createdInvoice.customerId,
      customerName,
      invoiceId: createdInvoice.id,
      cashBankAccountId: defaultCbId,
      paymentMode: 'NEFT',
      amount: advanceToCredit,
      referenceNumber: `ADV-${resolved.canonicalRef}`,
      notes: `Auto-adjusted order advance against ${createdInvoice.invoiceNumber}`,
      createdBy: params.createdBy || 'Auto-Delivery Billing',
    });
    paymentReceiptNumber = receipt.receiptNumber;
    finalBalance = Math.round(Math.max(0, createdInvoice.totalAmount - advanceToCredit) * 100) / 100;
  }

  return {
    billed: true,
    alreadyBilled: false,
    invoiceId: createdInvoice.id,
    invoiceNumber: createdInvoice.invoiceNumber,
    totalAmount: createdInvoice.totalAmount,
    advanceAdjusted: advanceToCredit,
    balanceDue: finalBalance,
    paymentReceiptNumber,
    customerName,
  };
}

export function scanPendingDeliveredParties(): {
  autoBillOnDelivery: boolean;
  pendingItems: PendingDeliveryBillItem[];
} {
  const store = readAccountingStore();
  const pending: PendingDeliveryBillItem[] = [];
  const seenKeys = new Set<string>();

  const pushIfPending = (item: {
    source: 'DISPATCH' | 'PRODUCTION' | 'ORDER';
    sourceId: string;
    salesOrderId?: string | null;
    orderRef?: string | null;
    productionOrderId?: string | null;
    customerName?: string | null;
    district?: string;
    deliveryDate?: string;
    doorCount?: number;
  }) => {
    const resolved = resolveLinkedQuotation({
      salesOrderId: item.salesOrderId,
      orderRef: item.orderRef,
      productionOrderId: item.productionOrderId,
      customerName: item.customerName,
    });

    const key = normalizeRef(resolved.canonicalRef || item.sourceId);
    if (seenKeys.has(key)) return;

    const existing = findExistingAutoBill([
      item.sourceId,
      item.salesOrderId,
      item.orderRef,
      resolved.quote?.id,
      resolved.quote?.quoteNumber,
      resolved.canonicalRef,
    ]);
    if (existing) return;

    seenKeys.add(key);
    pending.push({
      source: item.source,
      sourceId: item.sourceId,
      orderRef: resolved.canonicalRef,
      customerName:
        String(item.customerName || resolved.customer?.name || resolved.quote?.customerName || 'Delivered Party').trim(),
      district: item.district || resolved.customer?.district || resolved.quote?.district || 'Kerala',
      deliveryDate: item.deliveryDate || new Date().toISOString().slice(0, 10),
      doorCount: Math.max(1, Number(item.doorCount) || 1),
      estimatedAmount: resolved.totalAmount,
      advanceAmount: resolved.advanceAmount,
      needsManualAmount: resolved.totalAmount <= 0,
    });
  };

  // 1. Delivered Dispatches
  for (const d of readDispatchesList()) {
    if (d.status !== 'DELIVERED') continue;
    pushIfPending({
      source: 'DISPATCH',
      sourceId: d.id,
      salesOrderId: d.salesOrderId,
      orderRef: d.dispatchNumber || d.id,
      customerName: d.customerName,
      district: d.deliveryDistrict,
      deliveryDate: d.dispatchDate,
      doorCount: d.doorCount,
    });
  }

  // 2. Delivered Production Orders
  for (const p of readJsonArray<StoredProductionOrder>('production-orders.json')) {
    const st = String(p.status || p.stage || '').toUpperCase();
    if (st !== 'DELIVERED' && st !== 'COMPLETED') continue;
    pushIfPending({
      source: 'PRODUCTION',
      sourceId: p.id,
      salesOrderId: p.salesOrderId,
      orderRef: p.measurementRef || p.jobCardNumber || p.prodOrderNumber || p.id,
      productionOrderId: p.id,
      customerName: p.customerName,
      district: p.district,
      deliveryDate: p.orderDate,
      doorCount: p.doors?.length || p.quantity || 1,
    });
  }

  // 3. Delivered Sales Orders / Quotations
  for (const q of readJsonArray<StoredQuotation>('quotations-store.json')) {
    const st = String(q.orderStatus || q.status || '').toUpperCase();
    if (st !== 'DELIVERED') continue;
    const doors = q.items?.reduce((s, i) => s + Math.max(1, Number(i.quantity ?? i.qty ?? 1)), 0) || 1;
    pushIfPending({
      source: 'ORDER',
      sourceId: q.id,
      salesOrderId: q.id,
      orderRef: q.quoteNumber?.replace(/^QTN-/, 'SO-') || q.id,
      customerName: q.customerName,
      district: q.district,
      deliveryDate: q.date,
      doorCount: doors,
    });
  }

  return {
    autoBillOnDelivery: store.settings?.autoBillOnDelivery !== false,
    pendingItems: pending,
  };
}

export function autoBillAllCompletedDeliveries(createdBy?: string): {
  billedCount: number;
  skippedCount: number;
  needsAmountCount: number;
  results: AutoBillDeliveryResult[];
} {
  const { pendingItems } = scanPendingDeliveredParties();
  let billedCount = 0;
  let skippedCount = 0;
  let needsAmountCount = 0;
  const results: AutoBillDeliveryResult[] = [];

  for (const item of pendingItems) {
    if (item.needsManualAmount) {
      needsAmountCount += 1;
      continue;
    }
    const res = autoBillCompletedDelivery({
      source: item.source,
      sourceId: item.sourceId,
      salesOrderId: item.source === 'ORDER' ? item.sourceId : undefined,
      orderRef: item.orderRef,
      productionOrderId: item.source === 'PRODUCTION' ? item.sourceId : undefined,
      customerName: item.customerName,
      deliveryDate: item.deliveryDate,
      doorCount: item.doorCount,
      createdBy: createdBy || 'Batch Auto-Delivery Billing',
      forceEvenIfDisabled: true,
    });
    results.push(res);
    if (res.billed) billedCount += 1;
    else skippedCount += 1;
  }

  return { billedCount, skippedCount, needsAmountCount, results };
}
