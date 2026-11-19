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
    subtitle: 'റോ മെറ്റീരിയൽ സ്റ്റോർ, ഫ്ലോർ സ്റ്റേജ് ഇൻവെന്ററി, ബഫർ പ്ലാനിംഗ്',
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
      'സ്റ്റോക്ക്',
      'ഇൻവെന്ററി',
      'റോ മെറ്റീരിയൽ',
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
    keywords: ['s', 'store', 'raw materials', 'chemicals', 'resin', 'fiberglass', 'സ്റ്റോർ'],
  },
  {
    id: 'feat-fg-buffer',
    type: 'FEATURE',
    title: 'Finished Goods Buffer Stock',
    subtitle: 'Physical door balance, reservations & deficit replenishment',
    targetTab: 'inventory',
    categoryLabel: 'Modules & Navigation',
    keywords: ['finished goods', 'buffer', 'door stock', 'replenish', 'ഫിനിഷ്ഡ് ഗുഡ്സ്'],
  },

  // ── 2. Store Requisition & BOM
  {
    id: 'mod-bom',
    type: 'MODULE',
    title: 'Store Requisition Hub & Daily BOQ',
    subtitle: 'ഡെയിലി BOQ ഇഷ്യൂ, സ്റ്റോർ സ്ലിപ്പ്, മെറ്റീരിയൽ ഡിഡക്ഷൻ',
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
      'സ്റ്റോർ സ്ലിപ്പ്',
      'മെറ്റീരിയൽ ഇഷ്യൂ',
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
    keywords: ['a', 'auto boq', 'formula', 'material calculation', 'ഓട്ടോ boq'],
  },
  {
    id: 'feat-evening-boq-report',
    type: 'FEATURE',
    title: 'Daily Evening BOQ Consumption Report',
    subtitle: 'Today consumed raw materials summary by party, batch or day',
    targetTab: 'bom',
    categoryLabel: 'Modules & Navigation',
    keywords: ['evening boq', 'daily boq report', 'consumption', 'ഈവനിംഗ് റിപ്പോർട്ട്', 'മെറ്റീരിയൽ ഉപയോഗം'],
  },

  // ── 3. Stickers & Batch Printing
  {
    id: 'mod-batch-print',
    type: 'MODULE',
    title: 'Stickers & Batch Print Hub (12L Universal)',
    subtitle: 'ടോവൽ സ്റ്റിക്കർ സ്റ്റുഡിയോ, 12L മൾട്ടി-പാർട്ടി ബാച്ച് പ്രിന്റിംഗ്',
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
      'സ്റ്റിക്കർ',
      'ടോവൽ സ്റ്റിക്കർ',
      'ബാച്ച് പ്രിന്റ്',
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
    keywords: ['towel sticker', 'studio', 'qr', '12l', 'cutting label', 'ടോവൽ'],
  },

  // ── 4. Sales Orders
  {
    id: 'mod-sales-orders',
    type: 'MODULE',
    title: 'Sales Orders Registry',
    subtitle: 'കൺഫേംഡ് ഓർഡർ ബുക്കിംഗ്, അഡ്വാൻസ് വെരിഫിക്കേഷൻ',
    targetTab: 'sales-orders',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'sales orders', 'orders', 'booking', 'advance verification', 'approval', 'സെയിൽസ് ഓർഡറുകൾ'],
    badge: 'Live Orders',
  },

  // ── 5. Site Measurements
  {
    id: 'mod-measurements',
    type: 'MODULE',
    title: 'Site Measurements & Door Schedules',
    subtitle: 'ഫീൽഡ് സർവേ, 4-പോയിന്റ് അളവുകൾ, ഡോർ ഷെഡ്യൂൾ',
    targetTab: 'measurements',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'site measurements', 'measurements', 'dimensions', 'door survey', 'field survey', 'സൈറ്റ് അളവുകൾ'],
    badge: '4-Point',
  },

  // ── 6. Sales & Invoicing
  {
    id: 'mod-sales',
    type: 'MODULE',
    title: 'Sales Invoicing & Billing',
    subtitle: 'ടാക്സ് ഇൻവോയ്സ്, ഇ-വേ ബില്ലിംഗ്, സെയിൽസ് റിട്ടേൺസ്',
    targetTab: 'sales',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'sales', 'invoice', 'billing', 'tax invoice', 'gst', 'returns', 'സെയിൽസ്', 'ഇൻവോയ്സ്'],
  },

  // ── 7. Settings & Staff Access
  {
    id: 'mod-settings',
    type: 'MODULE',
    title: 'System Settings & Security',
    subtitle: 'കമ്പനി പ്രൊഫൈൽ, സ്റ്റാഫ് ലോഗിൻ RBAC, ടോളറൻസുകൾ',
    targetTab: 'settings',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'settings', 'system settings', 'staff access', 'rbac', 'security', 'tolerances', 'frames', 'സെറ്റിംഗ്സ്'],
  },
  {
    id: 'feat-staff-rbac',
    type: 'FEATURE',
    title: 'Staff Access & RBAC Permissions',
    subtitle: 'Role-based access matrix for Super Admin, Sales, Production, Accounts',
    targetTab: 'settings',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'staff access', 'rbac', 'roles', 'permissions', 'ജീവനക്കാരുടെ അനുമതികൾ'],
  },
  {
    id: 'feat-tolerances',
    type: 'FEATURE',
    title: 'Frame Types & Deduction Tolerances',
    subtitle: 'Configure Mini, Regular, Double Rebate frame deductions (-4.5cm / -7.6cm)',
    targetTab: 'settings',
    categoryLabel: 'Modules & Navigation',
    keywords: ['frame types', 'tolerances', 'deductions', 'rebate', 'ഫ്രെയിം ടോളറൻസ്'],
  },

  // ── 8. Purchases & Suppliers
  {
    id: 'mod-purchases',
    type: 'MODULE',
    title: 'Suppliers & Purchase Orders',
    subtitle: 'കെമിക്കൽ പർച്ചേസ്, സപ്ലയർമാർ, നോൺ-GST PO',
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
      'പർച്ചേസ്',
      'സപ്ലയർമാർ',
    ],
    badge: 'Live POs',
  },

  // ── 9. Installation
  {
    id: 'mod-installation',
    type: 'MODULE',
    title: 'Site Installation & Handover',
    subtitle: 'സൈറ്റ് ഇൻസ്റ്റാളേഷൻ, ഫിറ്റിംഗ്, കീ ഹാൻഡ്ഓവർ സർട്ടിഫിക്കറ്റ്',
    targetTab: 'installation',
    categoryLabel: 'Modules & Navigation',
    keywords: ['s', 'site installation', 'installation', 'fitting', 'handover', 'key handover', 'ഇൻസ്റ്റാളേഷൻ'],
  },

  // ── 10. Accounts & Vouchers
  {
    id: 'mod-accounts',
    type: 'MODULE',
    title: 'Accounts, Vouchers & Cashbook',
    subtitle: 'ക്യാഷ് ബുക്ക്, ഡേ ബുക്ക്, ലെഡ്ജർ, BEP ബ്രേക്ക്-ഈവൻ',
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
      'അക്കൗണ്ട്സ്',
      'ക്യാഷ് ബുക്ക്',
      'പെയ്‌മെന്റുകൾ',
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
    keywords: ['evening close', 'daily closing', 'cash reconcile', 'ഡെയിലി ക്ലോസിംഗ്'],
  },

  // ── 11. Analytics & Reports
  {
    id: 'mod-reports',
    type: 'MODULE',
    title: 'Analytics & Performance Reports',
    subtitle: 'എക്‌സിക്യൂട്ടീവ് അനലിറ്റിക്സ്, പ്രോഫിറ്റ് & ലോസ്, BOQ റിപ്പോർട്ട്',
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
      'അനലിറ്റിക്സ്',
      'റിപ്പോർട്ടുകൾ',
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
    keywords: ['a', 'after packing', 'verification pass', 'qc sticker', 'പാക്കിംഗ് പാസ്സ്'],
  },

  // ── 13. Employees & Roster
  {
    id: 'mod-employees',
    type: 'MODULE',
    title: 'Attendance & Employees Roster',
    subtitle: 'ഫാക്ടറി ജീവനക്കാരുടെ ഹാജർ, ഷിഫ്റ്റ് റോസ്റ്റർ, പേറോൾ',
    targetTab: 'employees',
    categoryLabel: 'Modules & Navigation',
    keywords: ['a', 'attendance', 'employees', 'staff', 'shift roster', 'payroll', 'hr', 'ജീവനക്കാർ', 'ഹാജർ'],
  },

  // ── 14. Quotations
  {
    id: 'mod-quotations',
    type: 'MODULE',
    title: 'Quotations & Estimates',
    subtitle: 'ഡോർ കൊട്ടേഷൻ തയ്യാറാക്കൽ, പ്രൈസിംഗ്, BOQ കോസ്റ്റ് സിങ്ക്',
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
      'കൊട്ടേഷൻ',
      'എസ്റ്റിമേറ്റ്',
    ],
    badge: 'Estimates',
  },

  // ── 15. Production Floor
  {
    id: 'mod-production',
    type: 'MODULE',
    title: 'Production Floor & Kanban',
    subtitle: 'ജോബ് കാർഡുകൾ, മോൾഡിംഗ്, കട്ടിംഗ്, പെയിന്റിംഗ്, പാക്കിംഗ്',
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
      'പ്രൊഡക്ഷൻ',
      'ജോബ് കാർഡ്',
      'മോൾഡിംഗ് ഗ്യാങ്ങ്',
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
    keywords: ['rework', 'defects', 'qc rework', 'rectification', 'റീവർക്ക്'],
  },

  // ── 16. Quality Control
  {
    id: 'mod-quality',
    type: 'MODULE',
    title: 'Quality Control (QC) & Inspection',
    subtitle: '6-പോയിന്റ് ടെക്നിക്കൽ ഇൻസ്പെക്ഷൻ, ഡിഫക്റ്റ് ട്രാക്കിംഗ്',
    targetTab: 'quality',
    categoryLabel: 'Modules & Navigation',
    keywords: ['q', 'quality', 'qc', 'inspection', 'defects', 'tolerance check', 'ക്വാളിറ്റി'],
  },

  // ── 17. CRM & Leads
  {
    id: 'mod-crm',
    type: 'MODULE',
    title: 'CRM & Leads Pipeline',
    subtitle: 'കസ്റ്റമർ ലീഡ്സ്, ഫോളോ-അപ്പുകൾ, സെയിൽസ് പൈപ്പ്‌ലൈൻ',
    targetTab: 'crm',
    categoryLabel: 'Modules & Navigation',
    keywords: ['c', 'crm', 'leads', 'inquiries', 'follow-ups', 'sales pipeline', 'deals', 'ലീഡ്സ്'],
  },

  // ── 18. Customers & Dealers
  {
    id: 'mod-customers',
    type: 'MODULE',
    title: 'Customers & Dealers Directory',
    subtitle: 'ബിൽഡർമാർ, ആർക്കിടെക്റ്റുകൾ, ഹോൾസെയിൽ ഡീലർമാർ',
    targetTab: 'customers',
    categoryLabel: 'Modules & Navigation',
    keywords: ['c', 'customers', 'dealers', 'clients', 'parties', 'architects', 'builders', 'പാർട്ടികൾ', 'ഡീലർമാർ'],
    badge: 'Directory',
  },

  // ── 19. Contractors & Job Work
  {
    id: 'mod-job-work',
    type: 'MODULE',
    title: 'Job Work & Floor Gangs (Contractors)',
    subtitle: 'പീസ്-റേറ്റ് ലെഡ്ജർ, ഫ്ലോർ ഗ്യാങ് അസൈൻമെന്റ്, കൂലി കണക്കുകൾ',
    targetTab: 'job-work',
    categoryLabel: 'Modules & Navigation',
    keywords: ['j', 'job work', 'contractors', 'floor gangs', 'piece-rate', 'labor payouts', 'കരാറുകാർ', 'കൂലി'],
    badge: 'Piece-Rate',
  },

  // ── 20. Gate Pass
  {
    id: 'mod-gate-pass',
    type: 'MODULE',
    title: 'Gate Pass Management',
    subtitle: 'വെഹിക്കിൾ ഔട്ട്‌വേർഡ്, മെറ്റീരിയൽ ഗേറ്റ് പാസ്സ് (റിട്ടേണബിൾ / നോൺ-റിട്ടേണബിൾ)',
    targetTab: 'gate-pass',
    categoryLabel: 'Modules & Navigation',
    keywords: ['g', 'gate pass', 'vehicle pass', 'outward', 'dispatch pass', 'security', 'ഗേറ്റ് പാസ്സ്'],
  },

  // ── 21. Dispatch & Delivery Challan
  {
    id: 'mod-dispatch',
    type: 'MODULE',
    title: 'Dispatch & Delivery Challan',
    subtitle: 'ഡെലിവറി ചെല്ലാൻ, ക്രേറ്റിംഗ്, കെഎൽ-09 ട്രക്ക് ഡിസ്പാച്ച്',
    targetTab: 'dispatch',
    categoryLabel: 'Modules & Navigation',
    keywords: ['d', 'dispatch', 'delivery challan', 'transport', 'shipping', 'crating', 'warranty', 'ഡെലിവറി'],
    badge: 'Delivery Challan',
  },

  // ── 22. Plant Maintenance
  {
    id: 'mod-maintenance',
    type: 'MODULE',
    title: 'Plant Maintenance & Machinery',
    subtitle: 'ഹൈഡ്രോളിക് പ്രസ്സ്, കംപ്രസ്സർ, മെഷീൻ ലോഗ് ബുക്ക്',
    targetTab: 'maintenance',
    categoryLabel: 'Modules & Navigation',
    keywords: ['m', 'maintenance', 'machinery', 'hydraulic press', 'preventive maintenance', 'പ്ലാന്റ് മെയിന്റനൻസ്'],
  },

  // ── 23. Mobile Field Ops
  {
    id: 'mod-mobile-field',
    type: 'MODULE',
    title: 'Mobile Field Ops & Floor QR',
    subtitle: 'മൊബൈൽ ഫീൽഡ് മെഷർമെന്റ്, ഫ്ലോർ ക്യുആർ സ്കാനർ, ഫ്ലീറ്റ് GPS',
    targetTab: 'mobile-field',
    categoryLabel: 'Modules & Navigation',
    keywords: ['m', 'mobile', 'field ops', 'gps', 'mobile qr', 'scanner', 'android app', 'മൊബൈൽ'],
  },

  // ── 24. Marketing
  {
    id: 'mod-marketing',
    type: 'MODULE',
    title: 'Marketing Campaigns & WhatsApp',
    subtitle: 'ബ്രോഷർ ബ്രോഡ്കാസ്റ്റ്, കാറ്റലോഗ്, കസ്റ്റമർ മെസ്സേജിംഗ്',
    targetTab: 'marketing',
    categoryLabel: 'Modules & Navigation',
    keywords: ['m', 'marketing', 'whatsapp', 'campaigns', 'broadcast', 'മാർക്കറ്റിംഗ്'],
  },

  // ── 25. Executive Dashboard
  {
    id: 'mod-dashboard',
    type: 'MODULE',
    title: 'Executive Dashboard & Control Center',
    subtitle: 'ഫാക്ടറി ലൈവ് സ്റ്റാറ്റസ്, ഓപ്പറേഷണൽ കെപിഐ, ബിസിനസ്സ് അവലോകനം',
    targetTab: 'dashboard',
    categoryLabel: 'Modules & Navigation',
    keywords: ['d', 'dashboard', 'control center', 'executive', 'kpi', 'overview', 'ഡാഷ്‌ബോർഡ്'],
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
