import React from 'react';
import {
  ShoppingBag,
  FileSpreadsheet,
  Ruler,
  Target,
  Users,
  Megaphone,
  Layers,
  PackageCheck,
  ReceiptText,
  FlaskConical,
  Factory,
  Printer,
  ShieldCheck,
  Wrench,
  Repeat,
  ReceiptIndianRupee,
  CreditCard,
  ArrowLeftRight,
  BookOpen,
  Receipt,
  Coins,
  BarChart3,
  Boxes,
  Sparkles,
  Calculator,
  Undo2,
  QrCode,
  Package,
  Truck,
  Ticket,
  ClipboardCheck,
  Smartphone,
  Building2,
  UserCheck,
  Sliders,
  Cloud,
  LayoutDashboard,
} from 'lucide-react';
import { NavigationTab } from './erp';

export type CorporateCategoryId =
  | 'sales'
  | 'purchases'
  | 'manufacturing'
  | 'accounting'
  | 'stock'
  | 'logistics'
  | 'settings';

export type CorporateDomainId = CorporateCategoryId;

export interface CorporateSubCategory {
  id: string;
  label: string;
  labelMl?: string;
  tabId: NavigationTab;
  subViewId?: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  description: string;
  isQuickAction?: boolean;
}

export interface CorporateCategory {
  id: CorporateCategoryId;
  code: string;
  label: string;
  labelMl?: string;
  icon: React.ElementType;
  accentColor: string;
  borderColor: string;
  badgeColor: string;
  bgGradient: string;
  description: string;
  subCategories: CorporateSubCategory[];
}

export const CORPORATE_ERP_DOMAINS: CorporateCategory[] = [
  // 1. SALES & COMMERCIAL
  {
    id: 'sales',
    code: 'SALES',
    label: 'Sales & Commercial',
    icon: ShoppingBag,
    accentColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    bgGradient: 'from-blue-600/15 via-blue-900/5 to-transparent',
    description: 'Quotations, 4-point site measurements, advance lock, CRM leads & dealer network',
    subCategories: [
      {
        id: 'quotations-mgmt',
        label: 'Quotations & Estimates',
        tabId: 'quotations',
        icon: FileSpreadsheet,
        badge: 'Estimates',
        badgeColor: 'bg-blue-500/20 text-blue-300',
        description: 'Direct factory pricing, area calculations, profit & 5-pillar risk scores',
        isQuickAction: true,
      },
      {
        id: 'site-measurements',
        label: 'Site Measurements (4-Pt)',
        tabId: 'measurements',
        icon: Ruler,
        badge: '4-Pt Grid',
        badgeColor: 'bg-cyan-500/20 text-cyan-300',
        description: 'Field opening verification, laser levels, rebate depths & auto-quote generation',
      },
      {
        id: 'sales-order-lock',
        label: 'Order Lock & Advances',
        tabId: 'sales-orders',
        icon: ShoppingBag,
        badge: 'Advance Lock',
        badgeColor: 'bg-rose-500/20 text-rose-300',
        description: 'Confirmed order registry, advance audit verification & release to factory floor',
      },
      {
        id: 'crm-pipeline',
        label: 'CRM & Leads Pipeline',
        tabId: 'crm',
        icon: Target,
        badge: '14 Districts',
        badgeColor: 'bg-amber-500/20 text-amber-300',
        description: 'District sales inquiries, follow-up scheduler & automated WhatsApp logs',
      },
      {
        id: 'customers-dealers',
        label: 'Customers & Dealers',
        tabId: 'customers',
        icon: Users,
        badge: 'Directory',
        badgeColor: 'bg-slate-700 text-slate-300',
        description: 'Verified Kerala builders, wholesale dealers, project sites & multi-tower locations',
      },
      {
        id: 'sales-leaderboard',
        label: 'Leaderboard & Marketing',
        tabId: 'marketing',
        subViewId: 'LEADERBOARD',
        icon: Megaphone,
        badge: 'Rankings',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Salesperson targets, door volume & value leaderboard, and commission calculator',
      },
    ],
  },

  // 2. PURCHASES & PROCUREMENT
  {
    id: 'purchases',
    code: 'PURCHASES',
    label: 'Purchases & Procurement',
    icon: Layers,
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    bgGradient: 'from-purple-600/15 via-purple-900/5 to-transparent',
    description: 'Purchase orders, chemical & hardware suppliers, inward goods bills & procurement rates',
    subCategories: [
      {
        id: 'po-generator',
        label: 'Purchase Orders (PO)',
        tabId: 'purchases',
        icon: Layers,
        badge: 'Create PO',
        badgeColor: 'bg-purple-500/20 text-purple-300',
        description: 'Formal purchase requisitions, chemical supplier POs, approval status & PDF generation',
        isQuickAction: true,
      },
      {
        id: 'suppliers-master',
        label: 'Suppliers & Chemical Vendors',
        tabId: 'purchases',
        subViewId: 'SUPPLIERS',
        icon: PackageCheck,
        badge: 'Vendors',
        badgeColor: 'bg-slate-700 text-slate-300',
        description: 'Approved chemical, resin, catalyst, foam & SS hardware vendor profiles',
      },
      {
        id: 'goods-inward',
        label: 'Goods Inward & Bills',
        tabId: 'purchases',
        subViewId: 'INWARD',
        icon: ReceiptText,
        badge: 'GRN Bills',
        badgeColor: 'bg-purple-500/20 text-purple-300',
        description: 'Vendor invoices upload, goods receipt notes (GRN) & delivery inward tracking',
      },
      {
        id: 'procurement-rates',
        label: 'BOQ Material Rates',
        tabId: 'bom',
        subViewId: 'RATES',
        icon: FlaskConical,
        badge: 'Formula',
        badgeColor: 'bg-purple-500/20 text-purple-300',
        description: 'Global raw material cost baseline: Resin, GEL, CSM 300, Wood & Rigid Foam rates',
      },
    ],
  },

  // 3. MANUFACTURING & PLANT
  {
    id: 'manufacturing',
    code: 'MANUFACTURING',
    label: 'Manufacturing & Plant',
    icon: Factory,
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    bgGradient: 'from-emerald-600/15 via-emerald-900/5 to-transparent',
    description: 'Production floor, job cards, CNC 12L stickers, auto-BOQ chemicals, QA & maintenance',
    subCategories: [
      {
        id: 'production-floor',
        label: 'Production Floor & Kanban',
        tabId: 'production',
        icon: Factory,
        badge: 'Kanban + Gangs',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Job cards, artisan hand-layup mold benches, sequential serial tracking & stage progress',
        isQuickAction: true,
      },
      {
        id: 'cutting-stickers',
        label: '12L & 4"×2" Stickers Studio',
        tabId: 'batch-print',
        icon: Printer,
        badge: '12L / Thermal',
        badgeColor: 'bg-rose-500/20 text-rose-300',
        description: 'CNC trimming measurement labels, chowkhat frame tolerances & shop floor QR passes',
      },
      {
        id: 'auto-boq-chemicals',
        label: 'Auto-BOQ & Chemical Recipes',
        tabId: 'bom',
        icon: FlaskConical,
        badge: 'Shift BOQ',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Resin, Catalyst, GEL & CSM layup formulation with timber reeper wood deductions',
      },
      {
        id: 'quality-control',
        label: 'Quality Control (IQC / FQC)',
        tabId: 'quality',
        icon: ShieldCheck,
        badge: 'IQC/FQC',
        badgeColor: 'bg-teal-500/20 text-teal-300',
        description: 'Inward raw material testing, curing hardness inspection & pre-dispatch checklist',
      },
      {
        id: 'plant-maintenance',
        label: 'Plant Maintenance & Molds',
        tabId: 'maintenance',
        icon: Wrench,
        badge: 'OEE / Molds',
        badgeColor: 'bg-amber-500/20 text-amber-300',
        description: 'FRP master molds conditioning, spray gun service, circular saws & breakdown work orders',
      },
      {
        id: 'job-work-outwork',
        label: 'Subcontracting & Job Work',
        tabId: 'job-work',
        icon: Repeat,
        badge: 'Outwork',
        badgeColor: 'bg-indigo-500/20 text-indigo-300',
        description: 'Glass inserts, brass inlay outwork challans & subcontractor piece-rate settlement',
      },
    ],
  },

  // 4. ACCOUNTING & FINANCE
  {
    id: 'accounting',
    code: 'ACCOUNTING',
    label: 'Accounting & Finance',
    icon: ReceiptIndianRupee,
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    bgGradient: 'from-amber-600/15 via-amber-900/5 to-transparent',
    description: 'Double-entry general ledger, Cash & Bank, Party-to-Party, Direct Sales, Payouts & P&L',
    subCategories: [
      {
        id: 'accounting-hub',
        label: 'Accounting Master Hub',
        tabId: 'accounts',
        subViewId: 'OVERVIEW',
        icon: ReceiptIndianRupee,
        badge: 'Master Suite',
        badgeColor: 'bg-amber-500/20 text-amber-300',
        description: 'Executive revenue, billing status, quick vouchers & financial KPI balance cards',
        isQuickAction: true,
      },
      {
        id: 'cash-bank-book',
        label: 'Cash & Bank / Day Book',
        tabId: 'accounts',
        subViewId: 'CASH_BANK',
        icon: CreditCard,
        badge: 'Multi-Bank',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Multi-account Cash, Bank & UPI accounts with daily receipt and payment entries',
      },
      {
        id: 'party-to-party',
        label: 'Party-to-Party Settlement',
        tabId: 'accounts',
        subViewId: 'PARTY_TO_PARTY',
        icon: ArrowLeftRight,
        badge: 'Direct Transfer',
        badgeColor: 'bg-cyan-500/20 text-cyan-300',
        description: 'Cross-party settlement: transfer credits/balances between customers, suppliers & contractors',
      },
      {
        id: 'chart-of-accounts',
        label: 'Chart of Accounts (COA)',
        tabId: 'accounts',
        subViewId: 'COA',
        icon: BookOpen,
        badge: 'Ledger Tree',
        badgeColor: 'bg-slate-700 text-slate-300',
        description: 'Complete double-entry ledger tree: Assets, Liabilities, Equity, Revenue & Expenses',
      },
      {
        id: 'direct-sales-billing',
        label: 'Direct Sales & Receipts',
        tabId: 'sales',
        icon: Receipt,
        badge: 'Non-GST',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Direct factory sales invoices, advance receipts allocations & return credit notes',
      },
      {
        id: 'gang-piece-rate-payouts',
        label: 'Floor Gang Piece-Rate Payouts',
        tabId: 'accounts',
        subViewId: 'CONTRACTORS',
        icon: Coins,
        badge: 'Piece Rate',
        badgeColor: 'bg-amber-500/20 text-amber-300',
        description: 'Weekly artisan mold gang earnings, debit advance deductions & A4 PDF payment slips',
      },
      {
        id: 'financial-reports',
        label: 'Financial Reports & P&L',
        tabId: 'reports',
        icon: BarChart3,
        badge: 'P&L / Balance',
        badgeColor: 'bg-purple-500/20 text-purple-300',
        description: 'Profit & Loss, Balance Sheet, Party Aging Statements & Financial Year-End Closing',
      },
    ],
  },

  // 5. STORE OR STOCK
  {
    id: 'stock',
    code: 'STORE & STOCK',
    label: 'Store & Stock Management',
    icon: Boxes,
    accentColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    bgGradient: 'from-cyan-600/15 via-cyan-900/5 to-transparent',
    description: 'Ready stock doors hub, frame-to-door auto calculator, matching engine & raw materials buffer',
    subCategories: [
      {
        id: 'ready-stock-doors',
        label: 'Ready Stock Doors Hub',
        tabId: 'inventory',
        subViewId: 'READY_STOCK',
        icon: Boxes,
        badge: 'Finished Stock',
        badgeColor: 'bg-cyan-500/20 text-cyan-300',
        description: 'Finished doors buffer inventory, old stock storage, location bins & clearance management',
        isQuickAction: true,
      },
      {
        id: 'stock-matching-engine',
        label: 'Old Stock Matching Engine',
        tabId: 'inventory',
        subViewId: 'READY_STOCK',
        icon: Sparkles,
        badge: 'Auto-Match',
        badgeColor: 'bg-amber-500/20 text-amber-300',
        description: 'Automated dimensional match reminder when new job cards match existing warehouse stock',
      },
      {
        id: 'frame-to-door-calc',
        label: 'Frame-to-Door Auto Calculator',
        tabId: 'inventory',
        subViewId: 'READY_STOCK',
        icon: Calculator,
        badge: 'Auto Ded',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Auto-calculate finished door cutting size directly from raw frame opening measurements',
      },
      {
        id: 'return-door-stock',
        label: 'Delivered Door Return to Stock',
        tabId: 'inventory',
        subViewId: 'READY_STOCK',
        icon: Undo2,
        badge: 'Returns',
        badgeColor: 'bg-rose-500/20 text-rose-300',
        description: 'Accept customer post-delivery door returns back into stock with inspection notes',
      },
      {
        id: 'old-stock-stickers',
        label: 'Old Stock 12L Stickers',
        tabId: 'inventory',
        subViewId: 'READY_STOCK',
        icon: QrCode,
        badge: '12L QR',
        badgeColor: 'bg-cyan-500/20 text-cyan-300',
        description: 'Generate vector 12L thermal stickers specifically for warehouse ready stock doors',
      },
      {
        id: 'raw-materials-inventory',
        label: 'Raw Materials & Buffers',
        tabId: 'inventory',
        subViewId: 'RM',
        icon: Package,
        badge: 'Chemical Stock',
        badgeColor: 'bg-blue-500/20 text-blue-300',
        description: 'Resin, roving, pigment drums, WPC frames & SS lock inventory with min-stock alert triggers',
      },
    ],
  },

  // 6. LOGISTICS, DISPATCH & FIELD
  {
    id: 'logistics',
    code: 'LOGISTICS & DISPATCH',
    label: 'Logistics & Dispatch',
    icon: Truck,
    accentColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    bgGradient: 'from-orange-600/15 via-orange-900/5 to-transparent',
    description: 'Stretch-wrap packing passes, delivery challans, security gate passes & mobile GPS tracking',
    subCategories: [
      {
        id: 'packing-dispatch',
        label: 'Packing & Dispatch Challans',
        tabId: 'dispatch',
        icon: Truck,
        badge: 'Challans',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Waterproof stretch-wrap QA verification, delivery challans & driver vehicle allocation',
        isQuickAction: true,
      },
      {
        id: 'security-gate-pass',
        label: 'Security Gate Pass (NRGP / RGP)',
        tabId: 'gate-pass',
        icon: Ticket,
        badge: 'NRGP/RGP',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Factory gate outbound pass, vehicle number verification & security guard sign-off',
      },
      {
        id: 'site-installation',
        label: 'Site Installation & Sign-off',
        tabId: 'installation',
        icon: ClipboardCheck,
        badge: 'Handover',
        badgeColor: 'bg-cyan-500/20 text-cyan-300',
        description: 'Site fitting verification, plumb check, geotagged photos & digital customer signature',
      },
      {
        id: 'mobile-field-ops',
        label: 'Mobile Field Operations Hub',
        tabId: 'mobile-field',
        icon: Smartphone,
        badge: 'GPS App',
        badgeColor: 'bg-rose-500/20 text-rose-300',
        description: 'Responsive mobile portal for field technicians, driver dispatch runs & QR scanning',
      },
    ],
  },

  // 7. SETTINGS & ADMINISTRATION
  {
    id: 'settings',
    code: 'SETTINGS & ADMIN',
    label: 'Settings & System Administration',
    icon: Sliders,
    accentColor: 'text-slate-300',
    borderColor: 'border-slate-500/30',
    badgeColor: 'bg-slate-700 text-slate-300 border-slate-600/40',
    bgGradient: 'from-slate-700/15 via-slate-900/5 to-transparent',
    description: 'Company profile, user management & RBAC, frame tolerances, and local database sync',
    subCategories: [
      {
        id: 'company-factory-profile',
        label: 'Company & Factory Profile',
        tabId: 'settings',
        subViewId: 'company',
        icon: Building2,
        badge: 'Multi-Unit',
        badgeColor: 'bg-slate-700 text-slate-300',
        description: 'Central manufacturing unit profile, branch addresses, GSTIN & official bank details',
      },
      {
        id: 'staff-access-control',
        label: 'Employees & Access (RBAC)',
        tabId: 'employees',
        icon: UserCheck,
        badge: '14 Roles',
        badgeColor: 'bg-purple-500/20 text-purple-300',
        description: 'Staff directory, employee codes, module access permissions & security passcodes',
      },
      {
        id: 'rbac-staff-security',
        label: 'Role Permissions & Access Matrix',
        tabId: 'settings',
        subViewId: 'staff_access',
        icon: ShieldCheck,
        badge: 'RBAC Access',
        badgeColor: 'bg-rose-500/20 text-rose-300',
        description: 'Configure multi-role permissions, restrict finance, quotations and production access',
      },
      {
        id: 'frame-tolerances-config',
        label: 'Frame Profiles & Tolerances',
        tabId: 'settings',
        subViewId: 'customization',
        icon: Sliders,
        badge: 'Synced',
        badgeColor: 'bg-cyan-500/20 text-cyan-300',
        description: 'Configure standard and custom frame profiles, CM deductions & factory rebate standards',
      },
      {
        id: 'database-cloud-sync',
        label: 'Database Backup & Cloud Sync',
        tabId: 'settings',
        subViewId: 'backup_sync',
        icon: Cloud,
        badge: 'Postgres 18',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
        description: 'Local PostgreSQL 18 zero-loss durability, automatic JSON backups & Google Drive vault sync',
      },
    ],
  },
];

/**
 * Resolves the parent Corporate Category for any given NavigationTab.
 */
export function getCategoryByTabId(tabId: NavigationTab): CorporateCategory | null {
  for (const cat of CORPORATE_ERP_DOMAINS) {
    if (cat.subCategories.some((sub) => sub.tabId === tabId)) {
      return cat;
    }
  }
  return null;
}

/**
 * Returns a flattened array of all sub-categories across the corporate ERP.
 */
export function getAllCorporateSubCategories(): CorporateSubCategory[] {
  return CORPORATE_ERP_DOMAINS.flatMap((cat) => cat.subCategories);
}

/**
 * Resolves the breadcrumb path [CategoryLabel, SubCategoryLabel] for the active tab and subView.
 */
export function getCorporateBreadcrumb(
  tabId: NavigationTab,
  subViewId?: string
): { category: CorporateCategory | null; subCategory: CorporateSubCategory | null } {
  const category = getCategoryByTabId(tabId);
  if (!category) {
    return { category: null, subCategory: null };
  }
  const matchedSub =
    (subViewId ? category.subCategories.find((s) => s.tabId === tabId && s.subViewId === subViewId) : null) ||
    category.subCategories.find((s) => s.tabId === tabId) ||
    category.subCategories[0];

  return { category, subCategory: matchedSub || null };
}
