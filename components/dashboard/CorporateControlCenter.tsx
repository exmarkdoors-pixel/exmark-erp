'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Ruler,
  ShoppingBag,
  Factory,
  Boxes,
  Truck,
  ReceiptIndianRupee,
  Megaphone,
  BarChart3,
  Settings,
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

export interface ControlCard {
  id: string;
  name: string;
  description: string;
  targetTab: NavigationTab;
  status: CardStatus;
  badge?: string;
  isQuickAction?: boolean;
}

export interface ControlFolder {
  id: string;
  number: number;
  name: string;
  category: 'COMMERCIAL' | 'PRODUCTION' | 'FINANCE' | 'SYSTEM';
  accentColor: string; // Tailwind border/badge color class
  bgGradient: string;
  icon: React.ElementType;
  cards: ControlCard[];
}

interface CorporateControlCenterProps {
  onNavigateTab: (tab: NavigationTab) => void;
  userRole?: UserRole;
}

const CONTROL_FOLDERS: ControlFolder[] = [
  // FOLDER 1 — CUSTOMERS & CRM
  {
    id: 'folder-1',
    number: 1,
    name: 'CUSTOMERS & CRM',
    category: 'COMMERCIAL',
    accentColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    bgGradient: 'from-blue-600/15 via-blue-900/5 to-transparent',
    icon: Users,
    cards: [
      { id: 'c1-1', name: 'Customer Register', description: '19 verified Kerala builders & wholesale dealers', targetTab: 'customers', status: 'Operational', badge: '19 Records' },
      { id: 'c1-2', name: 'New Customer', description: 'Register builder, architect partner or direct client', targetTab: 'customers', status: 'Operational', isQuickAction: true },
      { id: 'c1-3', name: 'Customer Sites', description: 'Kerala project sites & multi-tower locations', targetTab: 'customers', status: 'Operational' },
      { id: 'c1-4', name: 'Leads', description: 'District sales inquiries across 14 Kerala districts', targetTab: 'crm', status: 'Operational', badge: '19 Leads' },
      { id: 'c1-5', name: 'Follow-ups', description: 'Client appointment reminders & site visit scheduling', targetTab: 'crm', status: 'Operational' },
      { id: 'c1-6', name: 'Sales Pipeline', description: 'Opportunity tracking from New to Quotation Issued', targetTab: 'crm', status: 'Operational' },
      { id: 'c1-7', name: 'Customer Communication', description: 'Interaction logs, phone notes & WhatsApp timeline', targetTab: 'crm', status: 'Operational' },
      { id: 'c1-8', name: 'Customer Documents', description: 'GST certificates, tax declarations & agreement files', targetTab: 'customers', status: 'Operational' },
    ],
  },

  // FOLDER 2 — MEASUREMENTS & BOQ
  {
    id: 'folder-2',
    number: 2,
    name: 'MEASUREMENTS & BOQ',
    category: 'COMMERCIAL',
    accentColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    bgGradient: 'from-emerald-600/15 via-emerald-900/5 to-transparent',
    icon: Ruler,
    cards: [
      { id: 'c2-1', name: 'New Site Measurement', description: '4-point masonry check with mm/cm conversion', targetTab: 'measurements', status: 'Operational', isQuickAction: true },
      { id: 'c2-2', name: 'Measurement Book', description: '28 persistent sites, 54 verified door openings', targetTab: 'measurements', status: 'Operational', badge: '28 Sites' },
      { id: 'c2-3', name: 'Measurement Approval', description: 'Senior engineer signoff before factory production release', targetTab: 'measurements', status: 'Operational' },
      { id: 'c2-4', name: 'Measurement PDF', description: 'Customer measurement sheet with floor clearance specs', targetTab: 'measurements', status: 'Operational' },
      { id: 'c2-5', name: 'Customer Confirmation', description: 'Expiring secure token link for customer approval', targetTab: 'measurements', status: 'Operational', badge: 'Token Portal' },
      { id: 'c2-6', name: 'BOQ Management', description: 'Itemized door schedule, square foot area & rate builder', targetTab: 'quotations', status: 'Operational', badge: '16 BOQs' },
      { id: 'c2-7', name: 'BOQ Import', description: 'Import architect door schedules from Excel/CSV', targetTab: 'quotations', status: 'Operational' },
      { id: 'c2-8', name: 'BOQ Comparison', description: 'Tender vs measured opening variance analysis', targetTab: 'quotations', status: 'Operational' },
      { id: 'c2-9', name: 'BOQ Reports', description: 'Material breakdown & hardware estimation sheets', targetTab: 'reports', status: 'Operational' },
    ],
  },

  // FOLDER 3 — SALES & ORDERS
  {
    id: 'folder-3',
    number: 3,
    name: 'SALES & ORDERS',
    category: 'COMMERCIAL',
    accentColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    bgGradient: 'from-indigo-600/15 via-indigo-900/5 to-transparent',
    icon: ShoppingBag,
    cards: [
      { id: 'c3-1', name: 'New Quotation', description: 'Build Kerala 18% GST estimate (HSN 3925.20.00)', targetTab: 'quotations', status: 'Operational', isQuickAction: true },
      { id: 'c3-2', name: 'Quotation Register', description: '18 active quotes in ledger totaling ₹55.84 Lakhs', targetTab: 'quotations', status: 'Operational', badge: '18 Quotes' },
      { id: 'c3-3', name: 'Proforma Invoice', description: 'Formal advance proforma with Kerala bank account details', targetTab: 'accounts', status: 'Operational' },
      { id: 'c3-4', name: 'New Sales Order', description: 'Accept quotation with required advance verification', targetTab: 'sales-orders', status: 'Operational' },
      { id: 'c3-5', name: 'Order Approval', description: 'Manager sign-off gate before plant floor job release', targetTab: 'sales-orders', status: 'Operational' },
      { id: 'c3-6', name: 'Advance Verification', description: 'Accounts audit: minimum 40% advance payment rule', targetTab: 'accounts', status: 'Operational' },
      { id: 'c3-7', name: 'Order Register', description: '16 confirmed work orders locked in manufacturing', targetTab: 'sales-orders', status: 'Operational', badge: '16 Active' },
      { id: 'c3-8', name: 'Customer Statements', description: 'Billing history, advance receipts & pending balance', targetTab: 'accounts', status: 'Operational' },
    ],
  },

  // FOLDER 4 — FRP PRODUCTION
  {
    id: 'folder-4',
    number: 4,
    name: 'FRP PRODUCTION',
    category: 'PRODUCTION',
    accentColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    bgGradient: 'from-cyan-600/15 via-cyan-900/5 to-transparent',
    icon: Factory,
    cards: [
      { id: 'c4-1', name: 'Production Dashboard', description: 'Central plant floor status: 8 hydraulic press lines', targetTab: 'production', status: 'Operational', badge: 'Active Plant' },
      { id: 'c4-2', name: 'Job Cards', description: 'Individual press route cards with resin mix specs', targetTab: 'production', status: 'Operational' },
      { id: 'c4-3', name: 'Door ID Tracking', description: 'Sequential serial numbering EXM-DR-2026-XXXX', targetTab: 'production', status: 'Operational' },
      { id: 'c4-4', name: 'Cutting Calculator', description: 'Finished = Raw - (Rebate & Floor Clearances)', targetTab: 'production', status: 'Operational' },
      { id: 'c4-5', name: 'Cutting Sheet', description: 'Operator dimension sheets for CNC & panel saw', targetTab: 'production', status: 'Operational' },
      { id: 'c4-6', name: 'Manufacturing Board', description: 'Live line balancing: Molded, Solid Core & Flush lines', targetTab: 'production', status: 'Operational' },
      { id: 'c4-7', name: 'QC Inspection', description: 'Waterproof seal, diagonal plumb & finish check', targetTab: 'production', status: 'Operational' },
      { id: 'c4-8', name: 'Rework', description: 'Defect logging & surface refinish tracking (<0.8%)', targetTab: 'production', status: 'Operational' },
      { id: 'c4-9', name: 'Packing', description: 'Corner foam protection & waterproof stretch wrapping', targetTab: 'production', status: 'Operational' },
    ],
  },

  // FOLDER 5 — INVENTORY & PURCHASE
  {
    id: 'folder-5',
    number: 5,
    name: 'INVENTORY & PURCHASE',
    category: 'PRODUCTION',
    accentColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bgGradient: 'from-amber-600/15 via-amber-900/5 to-transparent',
    icon: Boxes,
    cards: [
      { id: 'c5-1', name: 'Raw Material Stock', description: 'Resin, woven roving, pigments & catalyst inventory', targetTab: 'inventory', status: 'Operational', badge: '6 Materials' },
      { id: 'c5-2', name: 'Frame Material Calculator', description: 'WPC extruded frame & FRP wrap stock estimator', targetTab: 'inventory', status: 'Operational' },
      { id: 'c5-3', name: 'Hardware BOQ', description: 'SS 304 hinges, mortise locks & tower bolt stock', targetTab: 'inventory', status: 'Operational' },
      { id: 'c5-4', name: 'Suppliers', description: 'Approved chemical, resin & hardware vendor master', targetTab: 'purchases', status: 'Operational' },
      { id: 'c5-5', name: 'Purchase Orders', description: 'Formal purchase requisitions with GST tax split', targetTab: 'purchases', status: 'Operational', badge: '3 POs' },
      { id: 'c5-6', name: 'Purchase Bill Upload', description: 'Vendor tax invoices & goods inward delivery notes', targetTab: 'purchases', status: 'Operational' },
      { id: 'c5-7', name: 'Material Issues', description: 'FIFO inventory issue to factory floor press lines', targetTab: 'inventory', status: 'Operational' },
      { id: 'c5-8', name: 'Stock Audit', description: 'Physical vs ERP ledger reconciliation ledger', targetTab: 'inventory', status: 'Operational' },
      { id: 'c5-9', name: 'Low Stock Alerts', description: 'Automated reorder triggers for resin & hardener', targetTab: 'inventory', status: 'Operational' },
    ],
  },

  // FOLDER 6 — ACCOUNTS & FINANCE
  {
    id: 'folder-6',
    number: 6,
    name: 'ACCOUNTS & FINANCE',
    category: 'FINANCE',
    accentColor: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    bgGradient: 'from-teal-600/15 via-teal-900/5 to-transparent',
    icon: ReceiptIndianRupee,
    cards: [
      { id: 'c6-1', name: 'Accounts Dashboard', description: 'Executive revenue, billing & collection overview', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-2', name: 'Receipts', description: 'Advance & balance receipts totaling ₹28.84 Lakhs', targetTab: 'accounts', status: 'Operational', badge: '₹28.8L Rec' },
      { id: 'c6-3', name: 'Customer Advances', description: 'Advance deposit validation for sales order release', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-4', name: 'Tax Invoices', description: '15 GST invoices totaling ₹54.36 Lakhs with e-Way info', targetTab: 'accounts', status: 'Operational', badge: '₹54.4L Inv' },
      { id: 'c6-5', name: 'Payments', description: 'Cheque, NEFT & cash payment registry with UTR', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-6', name: 'Expenses', description: 'Factory diesel, freight & plant operational expenses', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-7', name: 'Bank/Cash', description: 'Current account bank reconciliation & cash voucher log', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-8', name: 'Outstanding', description: 'Total receivables due across Kerala: ₹25.52 Lakhs', targetTab: 'accounts', status: 'Operational', badge: '₹25.5L Due' },
      { id: 'c6-9', name: 'Financial Strategist', description: 'AI cash runway & profitability scenario simulator', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-10', name: 'Break-even Analysis', description: 'Fixed vs variable cost break-even door volume', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-11', name: 'Monthly Targets', description: 'Executive sales goals & run rate tracker', targetTab: 'accounts', status: 'Operational' },
      { id: 'c6-12', name: 'Cash Flow Forecast', description: '30/60/90-day cash flow projection model', targetTab: 'accounts', status: 'Operational' },
    ],
  },

  // FOLDER 7 — REPORTS & DOCUMENTS
  {
    id: 'folder-7',
    number: 7,
    name: 'REPORTS & DOCUMENTS',
    category: 'FINANCE',
    accentColor: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    bgGradient: 'from-violet-600/15 via-violet-900/5 to-transparent',
    icon: BarChart3,
    cards: [
      { id: 'c7-1', name: 'Customer Reports', description: 'Dealer sales contribution & district volume breakdown', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-2', name: 'BOQ Reports', description: 'Tender material schedules vs actual door counts', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-3', name: 'Measurement Reports', description: 'Site openings verified across all 14 districts', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-4', name: 'Sales Reports', description: 'Monthly district sales penetration & order margins', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-5', name: 'Production Reports', description: 'Press yield, daily door output & defect metrics', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-6', name: 'Inventory Reports', description: 'Raw material stock valuation & turnover ratio', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-7', name: 'Finance Reports', description: 'Gross profit margins, tax summaries & collections', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-8', name: 'A4 Cutting PDFs', description: '12 stickers per A4 page (2x6 layout) print preview', targetTab: 'production', status: 'Operational', badge: '12/Page A4' },
      { id: 'c7-9', name: 'Thermal Stickers', description: '203/300 DPI single/batch thermal label printing', targetTab: 'production', status: 'Operational' },
      { id: 'c7-10', name: 'Video Reports', description: 'Animated executive snapshot summary with voiceover', targetTab: 'reports', status: 'Operational' },
      { id: 'c7-11', name: 'Export Center', description: 'One-click Excel (.xlsx) and CSV ledger exports', targetTab: 'reports', status: 'Operational' },
    ],
  },

  // FOLDER 8 — COMMUNICATION
  {
    id: 'folder-8',
    number: 8,
    name: 'COMMUNICATION',
    category: 'COMMERCIAL',
    accentColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    bgGradient: 'from-rose-600/15 via-rose-900/5 to-transparent',
    icon: Megaphone,
    cards: [
      { id: 'c8-1', name: 'WhatsApp Business API', description: 'Meta Cloud API credentials, webhook & phone ID settings', targetTab: 'settings', status: 'Setup Required', badge: 'Needs Token' },
      { id: 'c8-2', name: 'WhatsApp Communication Center', description: 'Authorized WhatsApp messaging console & templates', targetTab: 'marketing', status: 'Setup Required' },
      { id: 'c8-3', name: 'Send Quotation', description: 'Send finalized 18% GST quote directly to client WhatsApp', targetTab: 'quotations', status: 'Setup Required' },
      { id: 'c8-4', name: 'Send Invoice', description: 'Dispatch official tax invoice & payment receipt PDF', targetTab: 'accounts', status: 'Setup Required' },
      { id: 'c8-5', name: 'Send Measurement PDF', description: 'Transmit masonry dimensions sheet for architect sign-off', targetTab: 'measurements', status: 'Setup Required' },
      { id: 'c8-6', name: 'Customer Confirmation Links', description: 'Expiring 7-day token link for one-touch client approval', targetTab: 'measurements', status: 'Operational', badge: 'Live Adapter' },
      { id: 'c8-7', name: 'Reminder Templates', description: 'Follow-up message templates with Malayalam/English text', targetTab: 'settings', status: 'Operational' },
      { id: 'c8-8', name: 'Delivery Status Tracking', description: 'Dispatch departure & vehicle driver ETA notices', targetTab: 'dispatch', status: 'Operational' },
    ],
  },

  // FOLDER 9 — DISPATCH & WARRANTY
  {
    id: 'folder-9',
    number: 9,
    name: 'DISPATCH & WARRANTY',
    category: 'PRODUCTION',
    accentColor: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
    bgGradient: 'from-lime-600/15 via-lime-900/5 to-transparent',
    icon: Truck,
    cards: [
      { id: 'c9-1', name: 'Packing List', description: 'Batch delivery manifests itemized by door opening number', targetTab: 'dispatch', status: 'Operational' },
      { id: 'c9-2', name: 'Dispatch Register', description: 'Kerala delivery fleet (KL-09 trucks) & driver logbook', targetTab: 'dispatch', status: 'Operational', badge: 'KL-09 Fleet' },
      { id: 'c9-3', name: 'Door QR Tracking', description: 'Removable door label QR scanning for delivery check', targetTab: 'dispatch', status: 'Operational' },
      { id: 'c9-4', name: 'Delivery Confirmation', description: 'Client physical delivery acknowledgement on site', targetTab: 'dispatch', status: 'Operational' },
      { id: 'c9-5', name: 'Installation', description: '5-star site handover, plumb verification & photo upload', targetTab: 'dispatch', status: 'Operational' },
      { id: 'c9-6', name: 'Warranty Certificates', description: 'Official 15-Year FRP Material Warranty (Excludes Hardware)', targetTab: 'dispatch', status: 'Operational', badge: '15-Year FRP' },
      { id: 'c9-7', name: 'Warranty Claims', description: 'Material claim verification & inspection history', targetTab: 'dispatch', status: 'Operational' },
      { id: 'c9-8', name: 'Service History', description: 'After-sales alignment adjustments & maintenance logs', targetTab: 'dispatch', status: 'Operational' },
    ],
  },

  // FOLDER 10 — ADMIN & SYSTEM
  {
    id: 'folder-10',
    number: 10,
    name: 'ADMIN & SYSTEM',
    category: 'SYSTEM',
    accentColor: 'text-red-400 border-red-500/30 bg-red-500/10',
    bgGradient: 'from-red-600/15 via-red-900/5 to-transparent',
    icon: Settings,
    cards: [
      { id: 'c10-1', name: 'Employees', description: 'Factory operators, shift rosters & field technicians', targetTab: 'employees', status: 'Operational', badge: '6 Staff' },
      { id: 'c10-2', name: 'Roles and Permissions', description: 'Super Admin, Sales, Accounts, Production, Installation', targetTab: 'settings', status: 'Operational' },
      { id: 'c10-3', name: 'Admin Customization', description: '17 Customization domains, revisions & 1-click rollback', targetTab: 'settings', status: 'Operational', badge: 'v14 Active' },
      { id: 'c10-4', name: 'Product Categories', description: 'FRP Doors Primary (Mandatory) & WPC Doors (Optional OFF)', targetTab: 'settings', status: 'Operational', badge: 'FRP First' },
      { id: 'c10-5', name: 'Cloud Database', description: 'Managed PostgreSQL connection & dual-write JSON engine', targetTab: 'settings', status: 'Setup Required', badge: 'PG Ready' },
      { id: 'c10-6', name: 'Backup Management', description: 'Point-in-time snapshots with cryptographic SHA-256 hash', targetTab: 'settings', status: 'Operational', badge: 'SHA-256' },
      { id: 'c10-7', name: 'Windows Desktop', description: 'Electron runtime packaging (EXMARK-ERP-Setup.exe)', targetTab: 'settings', status: 'Operational', badge: 'Electron' },
      { id: 'c10-8', name: 'Android/iPhone PWA', description: 'Progressive Web App with service worker offline caching', targetTab: 'settings', status: 'Operational', badge: 'PWA Ready' },
      { id: 'c10-9', name: 'System Health', description: 'Multi-user concurrency lock, process load & server uptime', targetTab: 'settings', status: 'Operational' },
      { id: 'c10-10', name: 'Audit Logs', description: 'Tamper-evident system activity log with actor IP & timestamp', targetTab: 'settings', status: 'Operational' },
      { id: 'c10-11', name: 'Updates', description: 'Production release channel status & phase version changelog', targetTab: 'settings', status: 'Operational' },
    ],
  },
];

export default function CorporateControlCenter({
  onNavigateTab,
  userRole = 'Super Admin',
}: CorporateControlCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'COMMERCIAL' | 'PRODUCTION' | 'FINANCE' | 'SYSTEM'>('ALL');
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

  const handleCardClick = (card: ControlCard) => {
    const isAllowed = canAccessModule(userRole, card.targetTab);
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

    onNavigateTab(card.targetTab);
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
                10 Enterprise Folders Connected
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
                {totalCardsCount} Working Modules
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Enterprise Operations Directory &amp; Navigation Switchboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Complete folder-and-card control center inspired by DoorCraft Pro specifications. Unified access to Commercial, FRP Press Manufacturing, Accounting, Logistics and Admin Governance.
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
              All 10 Folders ({CONTROL_FOLDERS.length})
            </button>
            <button
              onClick={() => setActiveCategory('COMMERCIAL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'COMMERCIAL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📁 Commercial &amp; Sales (3)
            </button>
            <button
              onClick={() => setActiveCategory('PRODUCTION')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'PRODUCTION'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📁 Factory &amp; Logistics (3)
            </button>
            <button
              onClick={() => setActiveCategory('FINANCE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'FINANCE'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📁 Accounts &amp; Reports (2)
            </button>
            <button
              onClick={() => setActiveCategory('SYSTEM')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'SYSTEM'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📁 Admin &amp; Platform (2)
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

      {/* 3. The 10 Folders Grid */}
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
                        FOLDER {folder.number}
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
                      const isAllowed = canAccessModule(userRole, card.targetTab);
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
