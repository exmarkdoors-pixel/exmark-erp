import fs from 'fs';
import { getDataFilePath } from '../utils/dataPaths';
import { ProductionOrder, ProductionDoorItem } from './productionService';

const getProductionStorePath = () => getDataFilePath('production-store.json');
const getQuotationsStorePath = () => getDataFilePath('quotations-store.json');
const getCustomersStorePath = () => getDataFilePath('customers-store.json');

export interface CustomerOrderMilestone {
  key: string;
  name: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  completedAt?: string | null;
}

export interface SanitizedCustomerDoor {
  doorId: string;
  doorNumber: string;
  model: string;
  finishColor: string;
  handing: 'LH' | 'RH' | string;
  lockType: string;
  finishedHeightMm: number;
  finishedWidthMm: number;
  finishedHeightCm: number;
  finishedWidthCm: number;
  finishedSizeInches: string;
  qcStatus: string;
  trackingUrl: string;
}

export interface SanitizedCustomerOrderStatus {
  orderId: string;
  jobCardNumber: string;
  prodOrderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  siteName: string;
  district: string;
  doorCategory: string;
  quantity: number;
  orderDate: string;
  targetDeliveryDate?: string | null;
  daysRemaining?: number | null;
  includeInstallation: boolean;
  overallStatus: 'IN_PRODUCTION' | 'READY_TO_DISPATCH' | 'DISPATCHED' | 'DELIVERED_INSTALLED';
  overallStatusLabel: string;
  progressPercent: number;
  currentStageName: string;
  financialSummary: {
    totalAmount: number;
    advanceAmount: number;
    advanceVerified: boolean;
    balanceDue: number;
    paymentAdvice: string;
  };
  deliveryInfo: {
    vehicleNumber?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    dispatchTimestamp?: string | null;
    installationNote: string;
  };
  milestones: CustomerOrderMilestone[];
  doors: SanitizedCustomerDoor[];
  helpline: {
    phone: string;
    phoneDisplay: string;
    whatsapp: string;
    companyName: string;
    location: string;
  };
}

/**
 * Maps raw production stages to customer-friendly milestones.
 */
function buildMilestones(
  order: ProductionOrder,
  quoteConfirmedDate?: string | null
): { milestones: CustomerOrderMilestone[]; progressPercent: number; currentStageName: string; overallStatus: SanitizedCustomerOrderStatus['overallStatus']; overallStatusLabel: string } {
  const stage = order.status;
  const history = order.stageHistory || [];

  const getStageCompletedAt = (stageName: string): string | null => {
    const entry = history.slice().reverse().find((h) => h.stage === stageName);
    return entry?.completedAt || null;
  };

  // 6 Customer Milestones
  // 1: Order Confirmed
  // 2: Core Molding & Pressing (MOLDING)
  // 3: Precision Sizing & QC (CUTTING_FINISHING)
  // 4: Architectural PU Coating & Finish (FINISHING_GRAINS, PAINT_SECTION)
  // 5: Heavy Duty Packaging (PACKING)
  // 6: Delivery & Site Installation (DELIVERY, COMPLETED)

  const isConfirmed = true;
  const isMoldingDone = ['CUTTING_FINISHING', 'FINISHING_GRAINS', 'PAINT_SECTION', 'PACKING', 'DELIVERY', 'COMPLETED'].includes(stage);
  const isSizingDone = ['FINISHING_GRAINS', 'PAINT_SECTION', 'PACKING', 'DELIVERY', 'COMPLETED'].includes(stage);
  const isPuCoatingDone = ['PACKING', 'DELIVERY', 'COMPLETED'].includes(stage);
  const isPackagingDone = ['DELIVERY', 'COMPLETED'].includes(stage);
  const isDeliveryDone = stage === 'COMPLETED';

  // Determine current active milestone
  let currentKey = 'MOLDING';
  let progressPercent = 20;
  let overallStatus: SanitizedCustomerOrderStatus['overallStatus'] = 'IN_PRODUCTION';
  let overallStatusLabel = 'In Production';

  if (stage === 'QUEUED') {
    currentKey = 'CONFIRMED';
    progressPercent = 15;
    overallStatus = 'IN_PRODUCTION';
    overallStatusLabel = 'Order Confirmed - In Queue';
  } else if (stage === 'MOLDING') {
    currentKey = 'MOLDING';
    progressPercent = 35;
    overallStatus = 'IN_PRODUCTION';
    overallStatusLabel = 'Core Molding & Hot Pressing';
  } else if (stage === 'CUTTING_FINISHING') {
    currentKey = 'SIZING_QC';
    progressPercent = 55;
    overallStatus = 'IN_PRODUCTION';
    overallStatusLabel = 'Precision Sizing & QC';
  } else if (stage === 'FINISHING_GRAINS' || stage === 'PAINT_SECTION') {
    currentKey = 'PU_COATING';
    progressPercent = 75;
    overallStatus = 'IN_PRODUCTION';
    overallStatusLabel = 'PU Coating & Architectural Finish';
  } else if (stage === 'PACKING') {
    currentKey = 'PACKAGING';
    progressPercent = 90;
    overallStatus = 'READY_TO_DISPATCH';
    overallStatusLabel = 'Quality Passed & Packaged';
  } else if (stage === 'DELIVERY') {
    currentKey = 'DELIVERY';
    progressPercent = 95;
    overallStatus = 'DISPATCHED';
    overallStatusLabel = 'Dispatched / In Transit';
  } else if (stage === 'COMPLETED') {
    currentKey = 'DELIVERY';
    progressPercent = 100;
    overallStatus = 'DELIVERED_INSTALLED';
    overallStatusLabel = order.includeInstallation ? 'Delivered & Site Installed' : 'Delivered to Site';
  }

  const milestones: CustomerOrderMilestone[] = [
    {
      key: 'CONFIRMED',
      name: 'Order Confirmed & Advance Verified',
      description: 'Design specifications locked, factory job card issued, and advance payment credited.',
      isCompleted: isConfirmed,
      isCurrent: currentKey === 'CONFIRMED',
      completedAt: quoteConfirmedDate || order.createdAt || null,
    },
    {
      key: 'MOLDING',
      name: 'FRP Core Molding & Hot Pressing',
      description: 'Heavy gauge FRP architectural door faces pressed with high-density polymer core.',
      isCompleted: isMoldingDone,
      isCurrent: currentKey === 'MOLDING',
      completedAt: getStageCompletedAt('MOLDING'),
    },
    {
      key: 'SIZING_QC',
      name: 'Precision Sizing, Mortise & QC Inspection',
      description: 'Computerized CNC edge sizing, lock pocket milling, and rigorous quality check.',
      isCompleted: isSizingDone,
      isCurrent: currentKey === 'SIZING_QC',
      completedAt: getStageCompletedAt('CUTTING_FINISHING'),
    },
    {
      key: 'PU_COATING',
      name: 'Architectural PU Coating & Grain Finish',
      description: 'UV-resistant premium polyurethane wood grain texture coating and cure.',
      isCompleted: isPuCoatingDone,
      isCurrent: currentKey === 'PU_COATING',
      completedAt: getStageCompletedAt('PAINT_SECTION') || getStageCompletedAt('FINISHING_GRAINS'),
    },
    {
      key: 'PACKAGING',
      name: 'Protective Packaging & QR Stamped',
      description: 'Multi-layer bubble and corrugated packaging with individual door warranty QR stamped.',
      isCompleted: isPackagingDone,
      isCurrent: currentKey === 'PACKAGING',
      completedAt: getStageCompletedAt('PACKING'),
    },
    {
      key: 'DELIVERY',
      name: order.includeInstallation ? 'Dispatched / Site Installed' : 'Dispatched / Site Delivery',
      description: order.includeInstallation
        ? 'Transportation to project site with laser installation by EXMARK certified crew.'
        : 'Dispatched on factory vehicle with transit tracking and handoff.',
      isCompleted: isDeliveryDone,
      isCurrent: currentKey === 'DELIVERY',
      completedAt: getStageCompletedAt('COMPLETED') || getStageCompletedAt('DELIVERY'),
    },
  ];

  return {
    milestones,
    progressPercent,
    currentStageName: overallStatusLabel,
    overallStatus,
    overallStatusLabel,
  };
}

/**
 * Retrieves and sanitizes the order status for public customer view.
 * Searches by Job Card #, Production Order ID, or Quotation #.
 */
export async function getSanitizedCustomerOrderStatus(
  searchQuery: string
): Promise<SanitizedCustomerOrderStatus | null> {
  const query = (searchQuery || '').trim();
  if (!query) return null;

  // 1. Read production store
  const prodPath = getProductionStorePath();
  let productionOrders: ProductionOrder[] = [];
  try {
    if (fs.existsSync(prodPath)) {
      productionOrders = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
    }
  } catch {
    productionOrders = [];
  }

  // Find matching production order
  const normalizedQuery = query.toLowerCase();
  let matchedOrder = productionOrders.find(
    (o) =>
      (o.jobCardNumber && o.jobCardNumber.toLowerCase() === normalizedQuery) ||
      (o.prodOrderNumber && o.prodOrderNumber.toLowerCase() === normalizedQuery) ||
      (o.id && o.id.toLowerCase() === normalizedQuery)
  );

  // 2. Read quotations store
  const quotePath = getQuotationsStorePath();
  let quotations: Array<Record<string, unknown>> = [];
  try {
    if (fs.existsSync(quotePath)) {
      quotations = JSON.parse(fs.readFileSync(quotePath, 'utf8'));
    }
  } catch {
    quotations = [];
  }

  // Find linked quotation
  let matchedQuote: Record<string, unknown> | undefined;
  if (matchedOrder) {
    matchedQuote = quotations.find(
      (q) =>
        (matchedOrder?.jobCardNumber && q.jobCardNumber === matchedOrder.jobCardNumber) ||
        (matchedOrder?.salesOrderId && (q.id === matchedOrder.salesOrderId || q.quoteNumber === matchedOrder.salesOrderId)) ||
        (matchedOrder?.customerName && String(q.customerName || '').toLowerCase() === matchedOrder.customerName.toLowerCase())
    );
  } else {
    // If not matched directly in production, check if query matches quotation
    matchedQuote = quotations.find(
      (q) =>
        (q.quoteNumber && String(q.quoteNumber).toLowerCase() === normalizedQuery) ||
        (q.jobCardNumber && String(q.jobCardNumber).toLowerCase() === normalizedQuery) ||
        (q.id && String(q.id).toLowerCase() === normalizedQuery)
    );

    if (matchedQuote && matchedQuote.jobCardNumber) {
      matchedOrder = productionOrders.find(
        (o) => o.jobCardNumber && o.jobCardNumber.toLowerCase() === String(matchedQuote!.jobCardNumber).toLowerCase()
      );
    }
  }

  // 3. Read customers store
  const custPath = getCustomersStorePath();
  let customers: Array<Record<string, unknown>> = [];
  try {
    if (fs.existsSync(custPath)) {
      customers = JSON.parse(fs.readFileSync(custPath, 'utf8'));
    }
  } catch {
    customers = [];
  }

  const custName = matchedOrder?.customerName || String(matchedQuote?.customerName || '');
  const custId = String(matchedQuote?.customerId || '');
  const matchedCust = customers.find(
    (c) =>
      (custId && c.id === custId) ||
      (custName && String(c.name || '').toLowerCase() === custName.toLowerCase())
  );

  // If neither order nor quote found, return null
  if (!matchedOrder && !matchedQuote) {
    return null;
  }

  // Build financial calculations (strictly customer-safe)
  const totalAmount = Number(matchedQuote?.totalAmount || matchedQuote?.subtotal || 0);
  const advanceAmount = Number(
    matchedQuote?.advanceAmount !== undefined
      ? matchedQuote.advanceAmount
      : Math.round(totalAmount * 0.4)
  );
  const advanceVerified = Boolean(matchedQuote?.advanceVerified ?? true);
  const balanceDue = Math.max(0, totalAmount - advanceAmount);

  // Target delivery date & countdown
  const targetDateStr = (matchedQuote?.targetDeliveryDate as string) || (matchedQuote?.validUntil as string) || null;
  let daysRemaining: number | null = null;
  if (targetDateStr) {
    try {
      const targetTime = new Date(targetDateStr).getTime();
      const nowTime = new Date().getTime();
      const diffMs = targetTime - nowTime;
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      daysRemaining = null;
    }
  }

  // Synthesize or sanitize doors
  let doors: SanitizedCustomerDoor[] = [];
  if (matchedOrder && matchedOrder.doors && matchedOrder.doors.length > 0) {
    doors = matchedOrder.doors.map((d: ProductionDoorItem, idx: number) => {
      const heightMm = d.finishedHeightMm || d.rawHeightMm || 2100;
      const widthMm = d.finishedWidthMm || d.rawWidthMm || 800;
      const heightInches = (heightMm / 25.4).toFixed(1);
      const widthInches = (widthMm / 25.4).toFixed(1);

      return {
        doorId: d.doorId || `EXM-DR-${idx + 1}`,
        doorNumber: d.doorNumber || `Door #${idx + 1}`,
        model: d.model || 'EXM-A-101',
        finishColor: d.finishColor || 'Natural Teak Matte',
        handing: d.handing || 'RH',
        lockType: d.lockType || 'Standard Lock Pocket',
        finishedHeightMm: heightMm,
        finishedWidthMm: widthMm,
        finishedHeightCm: Number((heightMm / 10).toFixed(1)),
        finishedWidthCm: Number((widthMm / 10).toFixed(1)),
        finishedSizeInches: `${heightInches}" × ${widthInches}"`,
        qcStatus: d.qcStatus || 'PENDING',
        trackingUrl: `/track/${d.doorId || ''}`,
      };
    });
  } else if (matchedQuote && Array.isArray(matchedQuote.items)) {
    // Fallback if production order not released yet
    doors = (matchedQuote.items as Array<Record<string, unknown>>).flatMap((item, itemIdx) => {
      const qty = Number(item.quantity) || 1;
      const hMm = Number(item.heightMm) || 2100;
      const wMm = Number(item.widthMm) || 800;
      const result: SanitizedCustomerDoor[] = [];
      for (let q = 1; q <= qty; q++) {
        result.push({
          doorId: `EXM-DR-QTN-${itemIdx + 1}-${q}`,
          doorNumber: `Door #${itemIdx + 1}.${q}`,
          model: String(item.doorModel || 'EXM-A-101'),
          finishColor: String(item.finishColor || 'Natural Teak Matte'),
          handing: 'RH',
          lockType: 'Standard Mortise Cutout',
          finishedHeightMm: hMm,
          finishedWidthMm: wMm,
          finishedHeightCm: Number((hMm / 10).toFixed(1)),
          finishedWidthCm: Number((wMm / 10).toFixed(1)),
          finishedSizeInches: `${(hMm / 25.4).toFixed(1)}" × ${(wMm / 25.4).toFixed(1)}"`,
          qcStatus: 'SCHEDULED',
          trackingUrl: '#',
        });
      }
      return result;
    });
  }

  // Build milestone progression
  const fallbackOrder: ProductionOrder = matchedOrder || {
    id: String(matchedQuote?.id || 'pending'),
    prodOrderNumber: 'PRD-PENDING',
    jobCardNumber: String(matchedQuote?.jobCardNumber || matchedQuote?.quoteNumber || 'JC-PENDING'),
    customerName: custName || 'Valued Client',
    siteName: String(matchedQuote?.location || 'Site Location'),
    district: String(matchedCust?.district || 'Kerala'),
    doorCategory: 'FRP_DOORS',
    quantity: doors.length || 1,
    lineAssigned: 'Standard Line',
    batchNumber: 'BTH-PENDING',
    priority: 'NORMAL',
    status: 'QUEUED',
    includeInstallation: Boolean(matchedQuote?.includeInstallation),
    tolerancesApplied: { heightDeductionMm: 0, widthDeductionMm: 0 },
    doors: [],
    createdAt: String(matchedQuote?.createdAt || new Date().toISOString()),
    updatedAt: String(matchedQuote?.updatedAt || new Date().toISOString()),
  };

  const { milestones, progressPercent, currentStageName, overallStatus, overallStatusLabel } =
    buildMilestones(fallbackOrder, String(matchedQuote?.createdAt || null));

  const customerPhone = String(matchedCust?.phone || matchedQuote?.phone || '');

  return {
    orderId: matchedOrder?.id || String(matchedQuote?.id || ''),
    jobCardNumber: matchedOrder?.jobCardNumber || String(matchedQuote?.jobCardNumber || matchedQuote?.quoteNumber || ''),
    prodOrderNumber: matchedOrder?.prodOrderNumber || 'PRD-PENDING',
    customerName: custName || 'Valued Client',
    customerPhone: customerPhone || null,
    siteName: matchedOrder?.siteName || String(matchedQuote?.location || 'Site Location'),
    district: matchedOrder?.district || String(matchedCust?.district || 'Kerala'),
    doorCategory: matchedOrder?.doorCategory || 'FRP_DOORS',
    quantity: matchedOrder?.quantity || doors.length || 1,
    orderDate: matchedOrder?.orderDate || String(matchedQuote?.date || 'Recent'),
    targetDeliveryDate: targetDateStr,
    daysRemaining,
    includeInstallation: Boolean(matchedOrder?.includeInstallation ?? matchedQuote?.includeInstallation),
    overallStatus,
    overallStatusLabel,
    progressPercent,
    currentStageName,
    financialSummary: {
      totalAmount,
      advanceAmount,
      advanceVerified,
      balanceDue,
      paymentAdvice:
        balanceDue > 0
          ? 'Balance payable upon delivery via UPI, Bank Transfer (NEFT/IMPS), or Cash to driver.'
          : 'Payment fully settled. Thank you for your business!',
    },
    deliveryInfo: {
      vehicleNumber: overallStatus === 'DISPATCHED' ? 'KL-10-AZ-4521' : null,
      driverName: overallStatus === 'DISPATCHED' ? 'Shafeeq (EXMARK Logistics)' : null,
      driverPhone: overallStatus === 'DISPATCHED' ? '9847123456' : null,
      dispatchTimestamp: null,
      installationNote: (matchedOrder?.includeInstallation ?? matchedQuote?.includeInstallation)
        ? 'Professional site installation by EXMARK factory technicians included.'
        : 'Supply & factory packaging. Delivery to curb/gate.',
    },
    milestones,
    doors,
    helpline: {
      phone: '+919447928866',
      phoneDisplay: '+91 94479 28866',
      whatsapp: '919447928866',
      companyName: 'EXMARK FRP ARCHITECTURAL DOORS',
      location: 'Malappuram & Calicut, Kerala',
    },
  };
}
