import { NavigationTab } from '@/types/erp';

export type UniversalSearchResultType =
  | 'MODULE'
  | 'FEATURE'
  | 'JOB_CARD'
  | 'QUOTATION'
  | 'CUSTOMER'
  | 'STOCK_MATERIAL'
  | 'PURCHASE_ORDER'
  | 'CRM_LEAD';

export interface UniversalSearchEntry {
  id: string;
  type: UniversalSearchResultType;
  title: string;
  subtitle: string;
  targetTab: NavigationTab;
  categoryLabel: string;
  keywords: string[];
  code?: string;
  badge?: string;
}

// ── Static Complete Catalog of All ERP Modules & Sub-Features ───────────────
export const STATIC_ERP_CATALOG: UniversalSearchEntry[] = [
  // ── 1. Stock & Inventory
  {
    id: 'mod-inventory',
    type: 'MODULE',
    title: 'Stock Maintenance & Buffer Planning',
    subtitle: 'Raw material store, floor stage inventory, buffer planning',
    targetTab: 'inventory',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      's',
      'stock',
      'inventory',
      'store',
      'raw materials',
      'buffer',
      'resin',
      'gelcoat',
      'csm',
      'locks',
      'foam',
      'batten',
    ],
    badge: 'Live Stock',
  },
  {
    id: 'feat-rm-store',
    type: 'FEATURE',
    title: 'Raw Material Store Ledger',
    subtitle: 'Chemicals, Resins, Fiberglass, Timber, Hardware store ledger',
    targetTab: 'inventory',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'store', 'raw materials', 'chemicals', 'resin', 'fiberglass'],
  },
  {
    id: 'feat-fg-buffer',
    type: 'FEATURE',
    title: 'Finished Goods Buffer Stock',
    subtitle: 'Physical door balance, reservations & deficit replenishment',
    targetTab: 'inventory',
    categoryLabel: 'Modules & Navigation',
    keywords: ['finished goods', 'buffer', 'door stock', 'replenish'],
  },

  // ── 2. Store Requisition & BOM
  {
    id: 'mod-bom',
    type: 'MODULE',
    title: 'Store Requisition Hub & Daily BOQ',
    subtitle: 'Daily BOQ issuance, store issue slip, material deduction',
    targetTab: 'bom',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      's',
      'store',
      'store requisition',
      'bom',
      'boq',
      'material issue',
      'evening boq',
      'daily boq report',
    ],
    badge: 'Daily BOQ',
  },
  {
    id: 'feat-auto-boq',
    type: 'FEATURE',
    title: 'Auto-BOQ & Material Calculation',
    subtitle: 'Real-time resin, mat, catalyst & hardware formula builder',
    targetTab: 'bom',
    categoryLabel: 'Modules & Navigation',
    keywords: ['a', 'auto boq', 'formula', 'material calculation'],
  },
  {
    id: 'feat-evening-boq-report',
    type: 'FEATURE',
    title: 'Daily Evening BOQ Consumption Report',
    subtitle: 'Today consumed raw materials summary by party, batch or day',
    targetTab: 'bom',
    categoryLabel: 'Modules & Navigation',
    keywords: ['evening boq', 'daily boq report', 'consumption'],
  },

  // ── 3. Stickers & Batch Printing
  {
    id: 'mod-batch-print',
    type: 'MODULE',
    title: 'Stickers & Batch Print Hub (12L Universal)',
    subtitle: 'Towel sticker studio, 12L multi-party batch printing',
    targetTab: 'batch-print',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      's',
      'stickers',
      'towel sticker',
      'batch print',
      '12l',
      'barcode',
      'qr sticker',
      'thermal print',
      'label',
      'cutting size',
    ],
    badge: '12L Universal',
  },
  {
    id: 'feat-towel-sticker-studio',
    type: 'FEATURE',
    title: 'Towel Sticker & QR Studio',
    subtitle: 'Individual and batch 12L door cutting dimension labels',
    targetTab: 'batch-print',
    categoryLabel: 'Modules & Navigation',
    keywords: ['towel sticker', 'studio', 'qr', '12l', 'cutting label'],
  },

  // ── 4. Sales Orders
  {
    id: 'mod-sales-orders',
    type: 'MODULE',
    title: 'Sales Orders Registry',
    subtitle: 'Confirmed order booking, advance verification',
    targetTab: 'sales-orders',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'sales orders', 'orders', 'booking', 'advance verification', 'approval'],
    badge: 'Live Orders',
  },

  // ── 5. Site Measurements
  {
    id: 'mod-measurements',
    type: 'MODULE',
    title: 'Site Measurements & Door Schedules',
    subtitle: 'Field survey, 4-point measurements, door schedule',
    targetTab: 'measurements',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'site measurements', 'measurements', 'dimensions', 'door survey', 'field survey'],
    badge: '4-Point',
  },

  // ── 6. Sales & Invoicing
  {
    id: 'mod-sales',
    type: 'MODULE',
    title: 'Sales Invoicing & Billing',
    subtitle: 'Tax invoice, e-way billing, sales returns',
    targetTab: 'sales',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'sales', 'invoice', 'billing', 'tax invoice', 'gst', 'returns'],
  },

  // ── 7. Settings & Staff Access
  {
    id: 'mod-settings',
    type: 'MODULE',
    title: 'System Settings & Security',
    subtitle: 'Company profile, staff login RBAC, tolerances',
    targetTab: 'settings',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'settings', 'system settings', 'staff access', 'rbac', 'security', 'tolerances', 'frames'],
  },
  {
    id: 'feat-staff-rbac',
    type: 'FEATURE',
    title: 'Staff Access & RBAC Permissions',
    subtitle: 'Role-based access matrix for Super Admin, Sales, Production, Accounts',
    targetTab: 'settings',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'staff access', 'rbac', 'roles', 'permissions'],
  },
  {
    id: 'feat-tolerances',
    type: 'FEATURE',
    title: 'Frame Types & Deduction Tolerances',
    subtitle: 'Configure Mini, Regular, Double Rebate frame deductions (-4.5cm / -7.6cm)',
    targetTab: 'settings',
    categoryLabel: 'Modules & Navigation',
    keywords: ['frame types', 'tolerances', 'deductions', 'rebate'],
  },

  // ── 8. Purchases & Suppliers
  {
    id: 'mod-purchases',
    type: 'MODULE',
    title: 'Suppliers & Purchase Orders',
    subtitle: 'Chemical purchases, suppliers, non-GST PO',
    targetTab: 'purchases',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      's',
      'suppliers',
      'purchases',
      'purchase orders',
      'vendors',
      'po',
      'chemical purchase',
      'raw material inward',
    ],
    badge: 'Live POs',
  },

  // ── 9. Installation
  {
    id: 'mod-installation',
    type: 'MODULE',
    title: 'Site Installation & Handover',
    subtitle: 'Site installation, fitting, key handover certificate',
    targetTab: 'installation',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'site installation', 'installation', 'fitting', 'handover', 'key handover'],
  },

  // ── 10. Accounts & Vouchers
  {
    id: 'mod-accounts',
    type: 'MODULE',
    title: 'Accounts, Vouchers & Cashbook',
    subtitle: 'Cash book, day book, ledger, BEP break-even analysis',
    targetTab: 'accounts',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      'a',
      'accounts',
      'vouchers',
      'cashbook',
      'daybook',
      'ledger',
      'expense',
      'bep',
      'bank',
      'payments',
    ],
    badge: 'Cashbook',
  },
  {
    id: 'feat-evening-close',
    type: 'FEATURE',
    title: 'Daily Evening Close Register',
    subtitle: 'Daily cash reconcile, sales summary & manager sign-off register',
    targetTab: 'accounts',
    categoryLabel: 'Modules & Navigation',
    keywords: ['evening close', 'daily closing', 'cash reconcile'],
  },

  // ── 11. Analytics & Reports
  {
    id: 'mod-reports',
    type: 'MODULE',
    title: 'Analytics & Performance Reports',
    subtitle: 'Executive analytics, profit & loss, BOQ report',
    targetTab: 'reports',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      'a',
      'analytics',
      'reports',
      'profit loss',
      'performance',
      'evening report',
      'boq reports',
    ],
    badge: 'BI Analytics',
  },

  // ── 12. Verification & QC After-Packing
  {
    id: 'feat-after-packing-pass',
    type: 'FEATURE',
    title: 'After-Packing Verification Pass',
    subtitle: 'Site inspection pass, QR verify and packaged door clearance',
    targetTab: 'batch-print',
    categoryLabel: 'Modules & Navigation',
    keywords: ['a', 'after packing', 'verification pass', 'qc sticker'],
  },

  // ── 13. Employees & Roster
  {
    id: 'mod-employees',
    type: 'MODULE',
    title: 'Attendance & Employees Roster',
    subtitle: 'Factory employee attendance, shift roster, payroll',
    targetTab: 'employees',
    categoryLabel: 'Modules & Navigation',
    keywords: ['a', 'attendance', 'employees', 'staff', 'shift roster', 'payroll', 'hr'],
  },

  // ── 14. Quotations
  {
    id: 'mod-quotations',
    type: 'MODULE',
    title: 'Quotations & Estimates',
    subtitle: 'Door quotation creation, pricing, BOQ cost sync',
    targetTab: 'quotations',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      'q',
      'quotations',
      'estimates',
      'quote',
      'door pricing',
      'boq cost',
      'rates',
    ],
    badge: 'Estimates',
  },

  // ── 15. Production Floor
  {
    id: 'mod-production',
    type: 'MODULE',
    title: 'Production Floor & Kanban',
    subtitle: 'Job cards, molding, cutting, painting, packing',
    targetTab: 'production',
    categoryLabel: 'Modules & Navigation',
    keywords: [
      'p',
      'production',
      'kanban',
      'job cards',
      'molding',
      'cutting',
      'finishing',
      'paint',
      'packing',
      'heat batch',
    ],
    badge: 'Kanban Live',
  },
  {
    id: 'feat-rework-station',
    type: 'FEATURE',
    title: 'Rework & Defect Rectification Station',
    subtitle: 'QC defect recovery, surface rework & extra material tracking',
    targetTab: 'production',
    categoryLabel: 'Modules & Navigation',
    keywords: ['rework', 'defects', 'qc rework', 'rectification'],
  },

  // ── 16. Quality Control
  {
    id: 'mod-quality',
    type: 'MODULE',
    title: 'Quality Control (QC) & Inspection',
    subtitle: '6-point technical inspection, defect tracking',
    targetTab: 'quality',
    categoryLabel: 'Modules & Navigation',
    keywords: ['q', 'quality', 'qc', 'inspection', 'defects', 'tolerance check'],
  },

  // ── 17. CRM & Leads
  {
    id: 'mod-crm',
    type: 'MODULE',
    title: 'CRM & Leads Pipeline',
    subtitle: 'Customer leads, follow-ups, sales pipeline',
    targetTab: 'crm',
    categoryLabel: 'Modules & Navigation',
    keywords: ['c', 'crm', 'leads', 'inquiries', 'follow-ups', 'sales pipeline', 'deals'],
  },

  // ── 18. Customers & Dealers
  {
    id: 'mod-customers',
    type: 'MODULE',
    title: 'Customers & Dealers Directory',
    subtitle: 'Builders, architects, wholesale dealers directory',
    targetTab: 'customers',
    categoryLabel: 'Modules & Navigation',
    keywords: ['c', 'customers', 'dealers', 'clients', 'parties', 'architects', 'builders'],
    badge: 'Directory',
  },

  // ── 19. Contractors & Job Work
  {
    id: 'mod-job-work',
    type: 'MODULE',
    title: 'Job Work & Floor Gangs (Contractors)',
    subtitle: 'Piece-rate ledger, floor gang assignment, wage records',
    targetTab: 'job-work',
    categoryLabel: 'Modules & Navigation',
    keywords: ['j', 'job work', 'contractors', 'floor gangs', 'piece-rate', 'labor payouts'],
    badge: 'Piece-Rate',
  },

  // ── 20. Gate Pass
  {
    id: 'mod-gate-pass',
    type: 'MODULE',
    title: 'Gate Pass Management',
    subtitle: 'Vehicle outward, material gate pass (returnable / non-returnable)',
    targetTab: 'gate-pass',
    categoryLabel: 'Modules & Navigation',
    keywords: ['g', 'gate pass', 'vehicle pass', 'outward', 'dispatch pass', 'security'],
  },

  // ── 21. Dispatch & Delivery Challan
  {
    id: 'mod-dispatch',
    type: 'MODULE',
    title: 'Dispatch & Delivery Challan',
    subtitle: 'Delivery challan, crating, KL-09 truck dispatch',
    targetTab: 'dispatch',
    categoryLabel: 'Modules & Navigation',
    keywords: ['d', 'dispatch', 'delivery challan', 'transport', 'shipping', 'crating', 'warranty'],
    badge: 'Delivery Challan',
  },

  // ── 22. Plant Maintenance
  {
    id: 'mod-maintenance',
    type: 'MODULE',
    title: 'Plant Maintenance & Machinery',
    subtitle: 'Hydraulic press, compressor, machine log book',
    targetTab: 'maintenance',
    categoryLabel: 'Modules & Navigation',
    keywords: ['m', 'maintenance', 'machinery', 'hydraulic press', 'preventive maintenance'],
  },

  // ── 23. Mobile Field Ops
  {
    id: 'mod-mobile-field',
    type: 'MODULE',
    title: 'Mobile Field Ops & Floor QR',
    subtitle: 'Mobile field measurement, floor QR scanner, fleet GPS',
    targetTab: 'mobile-field',
    categoryLabel: 'Modules & Navigation',
    keywords: ['m', 'mobile', 'field ops', 'gps', 'mobile qr', 'scanner', 'android app'],
  },

  // ── 24. Marketing
  {
    id: 'mod-marketing',
    type: 'MODULE',
    title: 'Marketing Campaigns & WhatsApp',
    subtitle: 'Brochure broadcast, catalog, customer messaging',
    targetTab: 'marketing',
    categoryLabel: 'Modules & Navigation',
    keywords: ['m', 'marketing', 'whatsapp', 'campaigns', 'broadcast'],
  },

  // ── 25. Executive Dashboard
  {
    id: 'mod-dashboard',
    type: 'MODULE',
    title: 'Executive Dashboard & Control Center',
    subtitle: 'Factory live status, operational KPIs, business overview',
    targetTab: 'dashboard',
    categoryLabel: 'Modules & Navigation',
    keywords: ['d', 'dashboard', 'control center', 'executive', 'kpi', 'overview'],
  },
];

// ── Search & Ranking Engine ──────────────────────────────────────────────────
export interface ScoredSearchResult {
  entry: UniversalSearchEntry;
  score: number;
}

export function searchUniversalCatalog(
  rawQuery: string,
  dynamicEntries: UniversalSearchEntry[] = []
): UniversalSearchEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    // Default top suggested modules when search is opened empty
    return STATIC_ERP_CATALOG.slice(0, 8);
  }

  const allEntries = [...STATIC_ERP_CATALOG, ...dynamicEntries];
  const scoredList: ScoredSearchResult[] = [];

  for (const entry of allEntries) {
    const titleLower = entry.title.toLowerCase();
    const subtitleLower = entry.subtitle.toLowerCase();
    const codeLower = (entry.code || '').toLowerCase();
    const categoryLower = entry.categoryLabel.toLowerCase();

    let score = 0;

    // 1. Direct startsWith matches on title (Highest Priority, e.g. typing 's' -> 'Stock Maintenance')
    if (titleLower.startsWith(query)) {
      score += 150;
    } else if (codeLower.startsWith(query)) {
      score += 140;
    }

    // 2. StartsWith on any distinct word inside the title (e.g. typing 's' -> 'Store Requisition', '12L Stickers')
    const words = titleLower.split(/[\s—&()\/,-]+/);
    if (words.some((w) => w.startsWith(query))) {
      score += 100;
    }

    // 3. Keyword exact match or keyword startsWith (e.g. 's' in keywords array)
    if (entry.keywords.some((kw) => kw === query)) {
      score += 110;
    } else if (entry.keywords.some((kw) => kw.startsWith(query))) {
      score += 85;
    }

    // 4. Substring contains match in title
    if (score === 0 && titleLower.includes(query)) {
      score += 60;
    }

    // 5. Code contains match (e.g. '2026' or '001')
    if (codeLower && codeLower.includes(query)) {
      score += 55;
    }

    // 6. Subtitle or category contains match
    if (subtitleLower.includes(query)) {
      score += 35;
    } else if (categoryLower.includes(query)) {
      score += 25;
    } else if (entry.keywords.some((kw) => kw.includes(query))) {
      score += 20;
    }

    if (score > 0) {
      scoredList.push({ entry, score });
    }
  }

  // Sort descending by relevance score
  scoredList.sort((a, b) => b.score - a.score);

  // Return up to top 24 most relevant results
  return scoredList.slice(0, 24).map((s) => s.entry);
}
