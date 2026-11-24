'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  FileSpreadsheet,
  ShoppingBag,
  Factory,
  Boxes,
  Truck,
  ReceiptIndianRupee,
  Megaphone,
  BarChart3,
  Settings,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  ShieldCheck,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { UserRole, canAccessModule } from '@/lib/auth/roles';

export type CardStatus = 'Operational' | 'Setup Required' | 'In Development' | 'Not Available';

export type EnterpriseDomainCategory =
  | 'SALES'
  | 'PURCHASES'
  | 'MANUFACTURING'
  | 'ACCOUNTING'
  | 'STOCK'
  | 'LOGISTICS'
  | 'SETTINGS';

export interface ControlCard {
  id: string;
  name: string;
  description: string;
  targetTab: NavigationTab;
  targetSubViewId?: string;
  status: CardStatus;
  badge?: string;
  isQuickAction?: boolean;
}

export interface ControlFolder {
  id: string;
  number: number;
  name: string;
  category: EnterpriseDomainCategory;
  accentColor: string; // Tailwind border/badge color class
  bgGradient: string;
  icon: React.ElementType;
  cards: ControlCard[];
}

interface CorporateControlCenterProps {
  onNavigateTab: (tab: NavigationTab) => void;
  onSelectSubCategory?: (tab: NavigationTab, subViewId?: string) => void;
  userRole?: UserRole;
  allowedModules?: string[];
}

const CONTROL_FOLDERS: ControlFolder[] = [
  // 1. SALES & COMMERCIAL
  {
    id: 'folder-sales',
    number: 1,
    name: 'SALES & COMMERCIAL',
    category: 'SALES',
    accentColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    bgGradient: 'from-blue-600/15 via-blue-900/5 to-transparent',
    icon: ShoppingBag,
    cards: [
      { id: 'c1-1', name: 'Quotations & Estimates', description: 'Direct factory pricing, area calculations, profit & 5-pillar risk scores', targetTab: 'quotations', status: 'Operational', badge: 'Estimates', isQuickAction: true },
      { id: 'c1-2', name: 'Site Measurements (4-Point Grid)', description: 'Field opening verification, laser levels, rebate depths & auto-quote generation', targetTab: 'measurements', status: 'Operational', badge: '4-Pt Grid' },
      { id: 'c1-3', name: 'Sales Orders & Advance Lock', description: 'Confirmed order registry, advance audit verification & release to factory floor', targetTab: 'sales-orders', status: 'Operational', badge: 'Advance Lock' },
      { id: 'c1-4', name: 'Customers & Wholesale Dealers', description: 'Verified Kerala builders, wholesale dealers, architects & contact ledger', targetTab: 'customers', status: 'Operational', badge: 'Directory' },
      { id: 'c1-5', name: 'CRM & Leads Pipeline', description: 'District sales inquiries across 14 Kerala districts with follow-up scheduler', targetTab: 'crm', status: 'Operational', badge: '14 Districts' },
      { id: 'c1-6', name: 'Project Risk & Profit Calculator', description: 'BOM cost stack breakdown, margin safety & geotagged warranty validation', targetTab: 'quotations', status: 'Operational', badge: 'Risk & Profit' },
      { id: 'c1-7', name: 'Sales Leaderboard & Performance', description: 'Door volume & financial revenue leaderboard with Kerala district ranking', targetTab: 'reports', status: 'Operational', badge: 'Leaderboard' },
      { id: 'c1-8', name: 'Customer Statements & Ledger', description: 'Billing history, advance receipts, pending balances & payment aging', targetTab: 'accounts', status: 'Operational', badge: 'Statements' },
      { id: 'c1-9', name: 'Vyapar Parties & Customer Sync', description: 'Bulk 1-click import of customer directories & opening balances from Vyapar App or Excel', targetTab: 'customers', status: 'Operational', badge: 'Vyapar Sync' },
    ],
  },

  // 2. PURCHASES & PROCUREMENT
  {
    id: 'folder-purchases',
    number: 2,
    name: 'PURCHASES & PROCUREMENT',
    category: 'PURCHASES',
    accentColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    bgGradient: 'from-emerald-600/15 via-emerald-900/5 to-transparent',
    icon: ShoppingCart,
    cards: [
      { id: 'c2-1', name: 'Approved Suppliers & Vendors', description: 'Approved chemical, resin, fiberglass roving & hardware vendor master', targetTab: 'purchases', status: 'Operational', badge: 'Vendor Master' },
      { id: 'c2-2', name: 'Purchase Order Requisitions', description: 'Formal supplier purchase requisitions, chemical PO approvals & GST terms', targetTab: 'purchases', status: 'Operational', badge: 'Live POs', isQuickAction: true },
      { id: 'c2-3', name: 'Vendor Bills & Goods Inward GRN', description: 'Vendor delivery challans, bills upload & warehouse inward verification', targetTab: 'purchases', status: 'Operational', badge: 'GRN Inward' },
      { id: 'c2-4', name: 'Chemical & Hardware Procurement', description: 'Direct purchase records for catalyst, resin barrels, hinges & mortise locks', targetTab: 'purchases', status: 'Operational', badge: 'Chemical PO' },
      { id: 'c2-5', name: 'Vendor Ledger & Statements', description: 'Supplier payable balances, debit notes & payment transaction registry', targetTab: 'purchases', status: 'Operational', badge: 'Ledger' },
      { id: 'c2-6', name: 'Purchase Audit & Reconciliation', description: 'Physical vs ERP GRN reconciliation and delivery variance checks', targetTab: 'purchases', status: 'Operational', badge: 'Recon' },
    ],
  },

  // 3. MANUFACTURING & PRODUCTION
  {
    id: 'folder-manufacturing',
    number: 3,
    name: 'MANUFACTURING & PRODUCTION',
    category: 'MANUFACTURING',
    accentColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    bgGradient: 'from-purple-600/15 via-purple-900/5 to-transparent',
    icon: Factory,
    cards: [
      { id: 'c3-1', name: 'Manufacturing Kanban Board', description: 'Multi-stage floor lanes: Molding, Cutting, Finishing/Grains, Painting & Delivery', targetTab: 'production', status: 'Operational', badge: 'Live Floor', isQuickAction: true },
      { id: 'c3-2', name: 'Job Cards & Layup Specs', description: 'Artisan craft job cards with manual resin, pigment & CSM layup specifications', targetTab: 'production', status: 'Operational', badge: 'Job Cards' },
      { id: 'c3-3', name: '12L & 4"×2" Stickers Studio', description: 'CNC trimming measurement labels, chowkhat frame tolerances & shop floor QR passes', targetTab: 'batch-print', status: 'Operational', badge: '12L Thermal' },
      { id: 'c3-4', name: 'Auto-BOQ & Chemical Recipes', description: 'Resin, Catalyst, GEL & CSM layup formulation with timber reeper wood deductions', targetTab: 'bom', status: 'Operational', badge: 'Shift BOQ' },
      { id: 'c3-5', name: 'Quality Control (IQC / FQC)', description: 'Inward raw material testing, curing hardness inspection & pre-dispatch checklist', targetTab: 'quality', status: 'Operational', badge: 'Live QA' },
      { id: 'c3-6', name: 'Plant Maintenance & Molds', description: 'FRP master molds conditioning, spray gun service, circular saws & breakdown work orders', targetTab: 'maintenance', status: 'Operational', badge: 'OEE / Molds' },
      { id: 'c3-7', name: 'Subcontracting & Job Work', description: 'Glass inserts, brass inlay outwork challans & subcontractor piece-rate settlement', targetTab: 'job-work', status: 'Operational', badge: 'Outwork' },
      { id: 'c3-8', name: 'In-House Floor Gangs Tracking', description: 'Manage floor mold teams & per-stage piece-rate credits inside the factory', targetTab: 'production', status: 'Operational', badge: 'Piece Rate' },
      { id: 'c3-9', name: 'Rework & Defect Log', description: 'Surface refinish tracking, bubble corrections & scrap rate monitoring (<0.8%)', targetTab: 'production', status: 'Operational', badge: 'Defects' },
      { id: 'c3-10', name: 'Plant Staff Attendance & Payroll', description: 'Daily technician presence, OT hours, biometric sync & salary slips', targetTab: 'employees', status: 'Operational', badge: 'Staff Payroll' },
    ],
  },

  // 4. ACCOUNTING & FINANCE
  {
    id: 'folder-accounting',
    number: 4,
    name: 'ACCOUNTING & FINANCE',
    category: 'ACCOUNTING',
    accentColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bgGradient: 'from-amber-600/15 via-amber-900/5 to-transparent',
    icon: ReceiptIndianRupee,
    cards: [
      { id: 'c4-1', name: 'Accounting Master Hub', description: 'Executive revenue, billing status, quick vouchers & financial KPI balance cards', targetTab: 'accounts', targetSubViewId: 'OVERVIEW', status: 'Operational', badge: 'Master Suite', isQuickAction: true },
      { id: 'c4-2', name: 'Cash & Bank Book / Day Book', description: 'Multi-account Cash, Bank & UPI accounts with daily receipt and payment entries', targetTab: 'accounts', targetSubViewId: 'CASH_BANK', status: 'Operational', badge: 'Multi-Bank' },
      { id: 'c4-3', name: 'Party-to-Party Settlement', description: 'Cross-party settlement: transfer credits/balances between customers, suppliers & contractors', targetTab: 'accounts', targetSubViewId: 'PARTY_TO_PARTY', status: 'Operational', badge: 'Direct Transfer' },
      { id: 'c4-4', name: 'Chart of Accounts (COA)', description: 'Complete double-entry ledger tree: Assets, Liabilities, Equity, Revenue & Expenses', targetTab: 'accounts', targetSubViewId: 'COA', status: 'Operational', badge: 'Ledger Tree' },
      { id: 'c4-5', name: 'Direct Sales & Receipts', description: 'Direct factory sales invoices, advance receipts allocations & return credit notes', targetTab: 'sales', status: 'Operational', badge: 'Non-GST' },
      { id: 'c4-6', name: 'Floor Gang Piece-Rate Payouts', description: 'Weekly artisan mold gang earnings, debit advance deductions & A4 PDF payment slips', targetTab: 'accounts', targetSubViewId: 'CONTRACTORS', status: 'Operational', badge: 'Piece Rate' },
      { id: 'c4-7', name: 'Financial Reports & P&L', description: 'Profit & Loss, Balance Sheet, Party Aging Statements & Financial Year-End Closing', targetTab: 'reports', status: 'Operational', badge: 'P&L / Balance' },
      { id: 'c4-8', name: 'Financial Strategist & Runway', description: 'AI cash runway & profitability scenario simulator with cash flow projections', targetTab: 'accounts', status: 'Operational', badge: 'AI Forecast' },
      { id: 'c4-9', name: 'Break-Even Door Volume Analysis', description: 'Fixed vs variable cost break-even door volume model for plant efficiency', targetTab: 'accounts', status: 'Operational', badge: 'Break-Even' },
      { id: 'c4-10', name: 'Cost-Cutting & Expense Monitor', description: 'Real-time audit of Food, Diesel, Overtime & Chemical waste with What-If simulator', targetTab: 'accounts', targetSubViewId: 'EXPENSE_INTELLIGENCE', status: 'Operational', badge: 'Cost-Cutting' },
    ],
  },

  // 5. STORE OR STOCK
  {
    id: 'folder-stock',
    number: 5,
    name: 'STORE OR STOCK',
    category: 'STOCK',
    accentColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    bgGradient: 'from-cyan-600/15 via-cyan-900/5 to-transparent',
    icon: Boxes,
    cards: [
      { id: 'c5-1', name: 'Ready Stock Doors Hub', description: 'Finished doors buffer inventory, old stock storage, location bins & clearance management', targetTab: 'inventory', targetSubViewId: 'READY_STOCK', status: 'Operational', badge: 'Finished Stock', isQuickAction: true },
      { id: 'c5-2', name: 'Old Stock Matching Engine', description: 'Automated dimensional match reminder when new job cards match existing warehouse stock', targetTab: 'inventory', targetSubViewId: 'READY_STOCK', status: 'Operational', badge: 'Auto-Match' },
      { id: 'c5-3', name: 'Frame-to-Door Auto Calculator', description: 'Auto-calculate finished door cutting size directly from raw frame opening measurements', targetTab: 'inventory', targetSubViewId: 'READY_STOCK', status: 'Operational', badge: 'Auto Ded' },
      { id: 'c5-4', name: 'Delivered Door Return to Stock', description: 'Accept customer post-delivery door returns back into stock with inspection notes', targetTab: 'inventory', targetSubViewId: 'READY_STOCK', status: 'Operational', badge: 'Returns' },
      { id: 'c5-5', name: 'Old Stock 12L Stickers', description: 'Generate vector 12L thermal stickers specifically for warehouse ready stock doors', targetTab: 'inventory', targetSubViewId: 'READY_STOCK', status: 'Operational', badge: '12L QR' },
      { id: 'c5-6', name: 'Raw Materials & Chemical Stock', description: 'Resin, roving, pigment drums, WPC frames & SS lock inventory with min-stock alert triggers', targetTab: 'inventory', targetSubViewId: 'RM', status: 'Operational', badge: 'Chemical Stock' },
      { id: 'c5-7', name: 'Buffer Configuration & Alerts', description: 'Set minimum stock thresholds, buffer alerts and automated procurement triggers', targetTab: 'inventory', targetSubViewId: 'CONFIG', status: 'Operational', badge: 'Min Alerts' },
    ],
  },

  // 6. LOGISTICS & DISPATCH
  {
    id: 'folder-logistics',
    number: 6,
    name: 'LOGISTICS & DISPATCH',
    category: 'LOGISTICS',
    accentColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    bgGradient: 'from-orange-600/15 via-orange-900/5 to-transparent',
    icon: Truck,
    cards: [
      { id: 'c6-1', name: 'Packing & Dispatch Challans', description: 'Waterproof stretch-wrap QA verification, delivery challans & driver vehicle allocation', targetTab: 'dispatch', status: 'Operational', badge: 'Challans', isQuickAction: true },
      { id: 'c6-2', name: 'Security Gate Pass (NRGP / RGP)', description: 'Outward non-returnable delivery gate passes & returnable steel rack tracking', targetTab: 'gate-pass', status: 'Operational', badge: 'NRGP/RGP' },
      { id: 'c6-3', name: 'Driver & Delivery Fleet (KL-09)', description: 'Kerala delivery fleet logistics, lorry driver logbook & multi-site route drops', targetTab: 'dispatch', status: 'Operational', badge: 'KL-09 Fleet' },
      { id: 'c6-4', name: 'Site Installation & Handover', description: '5-star site handover, plumb verification, client signature & completion photo upload', targetTab: 'installation', status: 'Operational', badge: 'Site Ops' },
      { id: 'c6-5', name: 'Mobile Field Operations (GPS)', description: 'Driver and technician field application with geofence validation and proof of delivery', targetTab: 'mobile-field', status: 'Operational', badge: 'Field App' },
      { id: 'c6-6', name: '15-Year FRP Warranty Registry', description: 'Official 15-Year FRP door structural warranty issuance with customer QR lookup', targetTab: 'dispatch', status: 'Operational', badge: '15-Yr Warranty' },
      { id: 'c6-7', name: 'Geofenced Future Warranty Portal', description: 'GPS coordinates, 500m geofence validation & public scan portal', targetTab: 'dispatch', status: 'Operational', badge: 'GPS Geofence' },
    ],
  },

  // 7. SETTINGS & SYSTEM
  {
    id: 'folder-settings',
    number: 7,
    name: 'SETTINGS & SYSTEM',
    category: 'SETTINGS',
    accentColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    bgGradient: 'from-rose-600/15 via-rose-900/5 to-transparent',
    icon: Settings,
    cards: [
      { id: 'c7-1', name: 'Staff Access & Employee Master', description: 'Factory operators, shift rosters, sales staff & field installation technicians', targetTab: 'employees', status: 'Operational', badge: 'Staff Master' },
      { id: 'c7-2', name: 'Enterprise RBAC Roles & Permissions', description: 'Multi-role permission matrix: Super Admin, Sales, Production, Accounts, Driver & Floor', targetTab: 'settings', targetSubViewId: 'staff_access', status: 'Operational', badge: 'RBAC Security' },
      { id: 'c7-3', name: 'Chowkhat & Frame Deductions', description: 'Top, bottom, lock-side & hinge-side tolerances for Wood, Concrete, WPC & Granite frames', targetTab: 'settings', targetSubViewId: 'customization', status: 'Operational', badge: 'Tolerances' },
      { id: 'c7-4', name: 'Product Categories & Models', description: 'FRP Doors Primary (Mandatory) & WPC Doors configurations, surface textures & colors', targetTab: 'settings', targetSubViewId: 'customization', status: 'Operational', badge: 'Categories' },
      { id: 'c7-5', name: 'Automated Backup & Snapshots', description: 'Point-in-time database snapshots with cryptographic SHA-256 verification hash', targetTab: 'settings', targetSubViewId: 'customization', status: 'Operational', badge: 'SHA-256' },
      { id: 'c7-6', name: 'Cloud Sync & Offline SQLite', description: 'Dual-write offline fallback and PostgreSQL production cloud replication', targetTab: 'settings', targetSubViewId: 'customization', status: 'Operational', badge: 'PG / SQLite' },
      { id: 'c7-7', name: 'Tamper-Evident System Audit Logs', description: 'Immutable activity log with actor IP, timestamp, role changes & financial edits', targetTab: 'settings', targetSubViewId: 'customization', status: 'Operational', badge: 'Audit Trail' },
      { id: 'c7-8', name: 'Inbuilt Software Updates', description: 'Production release channel status, git hash verification & 1-click update deployment', targetTab: 'settings', targetSubViewId: 'customization', status: 'Operational', badge: 'Version Updates' },
      { id: 'c7-9', name: 'Factory Attendance & Payroll Hub', description: '31-day visual attendance grid, monthly salary slip generator & Bank NEFT batch', targetTab: 'employees', status: 'Operational', badge: 'Payroll' },
    ],
  },
];

export default function CorporateControlCenter({
  onNavigateTab,
  onSelectSubCategory,
  userRole = 'Super Admin',
  allowedModules,
}: CorporateControlCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | EnterpriseDomainCategory>('ALL');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [favoriteCardIds, setFavoriteCardIds] = useState<string[]>([]);
  const [recentlyUsedIds, setRecentlyUsedIds] = useState<string[]>([]);

  // Load favorites & recent from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem('exmark_control_center_favs');
      if (savedFavs) setFavoriteCardIds(JSON.parse(savedFavs));
      const savedRecent = localStorage.getItem('exmark_control_center_recent');
      if (savedRecent) setRecentlyUsedIds(JSON.parse(savedRecent));
    } catch {
      // Ignore in SSR
    }
  }, []);

  const toggleFavorite = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteCardIds((prev) => {
      const updated = prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId];
      try {
        localStorage.setItem('exmark_control_center_favs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const hasModuleAccess = (targetTab: NavigationTab) => {
    if (userRole === 'Super Admin') return true;
    if (allowedModules) {
      return allowedModules.includes(targetTab);
    }
    return canAccessModule(userRole, targetTab);
  };

  const handleCardClick = (card: ControlCard) => {
    const isAllowed = hasModuleAccess(card.targetTab);
    if (!isAllowed) {
      alert(`Access Restricted: Your current active role (${userRole}) does not have permission for the ${card.name} module.`);
      return;
    }

    // Record in recently used
    setRecentlyUsedIds((prev) => {
      const updated = [card.id, ...prev.filter((id) => id !== card.id)].slice(0, 6);
      try {
        localStorage.setItem('exmark_control_center_recent', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (card.targetSubViewId && onSelectSubCategory) {
      onSelectSubCategory(card.targetTab, card.targetSubViewId);
    } else {
      onNavigateTab(card.targetTab);
    }
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const expandAll = () => setCollapsedFolders({});
  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    CONTROL_FOLDERS.forEach((f) => {
      allCollapsed[f.id] = true;
    });
    setCollapsedFolders(allCollapsed);
  };

  // Find cards for Favorites & Recently Used
  const allCardsMap = useMemo(() => {
    const map = new Map<string, { card: ControlCard; folder: ControlFolder }>();
    CONTROL_FOLDERS.forEach((folder) => {
      folder.cards.forEach((card) => {
        map.set(card.id, { card, folder });
      });
    });
    return map;
  }, []);

  // Filter folders and cards
  const filteredFolders = useMemo(() => {
    return CONTROL_FOLDERS.filter((folder) => {
      if (activeCategory !== 'ALL' && folder.category !== activeCategory) return false;
      return true;
    }).map((folder) => {
      const matchingCards = folder.cards.filter((card) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          card.name.toLowerCase().includes(q) ||
          card.description.toLowerCase().includes(q) ||
          folder.name.toLowerCase().includes(q)
        );
      });
      return {
        ...folder,
        cards: matchingCards,
      };
    }).filter((folder) => folder.cards.length > 0);
  }, [activeCategory, searchQuery]);

  const totalCardsCount = useMemo(() => {
    return CONTROL_FOLDERS.reduce((sum, f) => sum + f.cards.length, 0);
  }, []);

  const getStatusBadge = (status: CardStatus) => {
    switch (status) {
      case 'Operational':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Operational
          </span>
        );
      case 'Setup Required':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Setup Required
          </span>
        );
      case 'In Development':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            In Development
          </span>
        );
      case 'Not Available':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Not Available
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0E1A38] to-[#162544] border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-xs">
                EXMARK CORPORATE CONTROL CENTER
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                7 Enterprise Domains Connected
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
                {totalCardsCount} Enterprise Modules
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Enterprise Operations Directory &amp; Navigation Switchboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Complete 7-domain enterprise control center inspired by SAP S/4HANA &amp; Odoo specifications. Unified access to Sales, Purchases, Manufacturing, Accounting, Store/Stock, Logistics and System Governance.
            </p>
          </div>

          {/* Quick Actions & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All 7 Domains ({CONTROL_FOLDERS.length})
            </button>
            <button
              onClick={() => setActiveCategory('SALES')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'SALES'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              💼 Sales
            </button>
            <button
              onClick={() => setActiveCategory('PURCHASES')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'PURCHASES'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              🛒 Purchases
            </button>
            <button
              onClick={() => setActiveCategory('MANUFACTURING')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'MANUFACTURING'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              🏭 Manufacturing
            </button>
            <button
              onClick={() => setActiveCategory('ACCOUNTING')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'ACCOUNTING'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              💰 Accounting
            </button>
            <button
              onClick={() => setActiveCategory('STOCK')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'STOCK'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📦 Store / Stock
            </button>
            <button
              onClick={() => setActiveCategory('LOGISTICS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'LOGISTICS'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              🚚 Logistics
            </button>
            <button
              onClick={() => setActiveCategory('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'SETTINGS'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter module cards..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#070D1E] border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 2. Pinned Favorites Section (if any) */}
      {favoriteCardIds.length > 0 && !searchQuery && (
        <div className="rounded-xl bg-[#0B132B]/60 border border-amber-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Pinned Enterprise Favourites</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {favoriteCardIds.map((cardId) => {
              const item = allCardsMap.get(cardId);
              if (!item) return null;
              const { card, folder } = item;
              const Icon = folder.icon;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="group relative rounded-xl bg-[#070D1E] hover:bg-[#0E1A38] border border-slate-800 hover:border-amber-500/40 p-3.5 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                          {card.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {folder.name}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(card.id, e)}
                      className="text-amber-400 hover:text-slate-400 p-1 cursor-pointer"
                      title="Remove from favourites"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/60">
                    {getStatusBadge(card.status)}
                    <span className="text-slate-400 group-hover:text-amber-400 font-semibold flex items-center gap-0.5">
                      Launch <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. The 7 Enterprise Domains Grid */}
      <div className="space-y-5">
        {filteredFolders.map((folder) => {
          const isCollapsed = collapsedFolders[folder.id];
          const FolderIcon = folder.icon;

          return (
            <div
              key={folder.id}
              className="rounded-2xl bg-[#091024] border border-slate-800/90 shadow-xl overflow-hidden transition-all"
            >
              {/* Folder Header Banner */}
              <div
                onClick={() => toggleFolderCollapse(folder.id)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-gradient-to-r ${folder.bgGradient} border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border font-extrabold ${folder.accentColor}`}
                  >
                    <FolderIcon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                        DOMAIN {folder.number}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {folder.name}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {folder.cards.length} operational module cards
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {isCollapsed ? 'Click to Expand' : 'Click to Collapse'}
                  </span>
                  <div className="p-1 rounded-lg bg-slate-800/60 text-slate-300">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Folder Content Cards */}
              {!isCollapsed && (
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {folder.cards.map((card) => {
                      const isAllowed = hasModuleAccess(card.targetTab);
                      const isFav = favoriteCardIds.includes(card.id);

                      return (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick(card)}
                          className={`group relative rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                            isAllowed
                              ? 'bg-[#0B132B]/80 hover:bg-[#0E1A38] border-slate-800/90 hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5'
                              : 'bg-slate-900/30 border-slate-800/40 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div>
                            {/* Card Top Row: Name + Star + Badge */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-300 transition-colors leading-snug">
                                {card.name}
                              </h4>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => toggleFavorite(card.id, e)}
                                  className="text-slate-600 hover:text-amber-400 p-0.5 transition-colors cursor-pointer"
                                  title={isFav ? 'Remove favourite' : 'Add to favourites'}
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Card Description */}
                            <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                              {card.description}
                            </p>
                          </div>

                          {/* Card Footer: Status + Metric Badge */}
                          <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] mt-auto">
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(card.status)}
                              {card.badge && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {card.badge}
                                </span>
                              )}
                            </div>

                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all">
                              {isAllowed ? 'Open' : <Lock className="w-3 h-3 text-slate-500" />}
                              {isAllowed && <ArrowRight className="w-3 h-3" />}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Footer System Bar */}
      <div className="rounded-xl bg-[#0B132B]/40 border border-slate-800 p-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>FRP Doors Primary (Mandatory) • WPC Optional Shield • 10 Enterprise Folders Live</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span>Role: <strong className="text-white">{userRole}</strong></span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Single-Instance Central DB</span>
        </div>
      </div>
    </div>
  );
}
