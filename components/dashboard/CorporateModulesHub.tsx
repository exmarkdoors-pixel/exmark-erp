'use client';

import React, { useState } from 'react';
import {
  Users,
  Target,
  FileSpreadsheet,
  Ruler,
  ShoppingBag,
  Factory,
  Boxes,
  Truck,
  ReceiptIndianRupee,
  UserCheck,
  Megaphone,
  BarChart3,
  Settings,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { UserRole, canAccessModule } from '@/lib/auth/roles';

interface CorporateModulesHubProps {
  onNavigateTab: (tab: NavigationTab) => void;
  userRole?: UserRole;
}

type HubFolderCategory = 'ALL' | 'CORE' | 'MANUFACTURING' | 'FINANCE_FULFILLMENT' | 'GOVERNANCE';

interface ModuleCardConfig {
  id: NavigationTab;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  folderCategory: 'CORE' | 'MANUFACTURING' | 'FINANCE_FULFILLMENT' | 'GOVERNANCE';
  folderName: string;
  badge: string;
  badgeColor: string;
  primaryMetric: string;
  accentColor: string;
}

const MODULES_DIRECTORY: ModuleCardConfig[] = [
  // Folder: Core Commercial & Engineering
  {
    id: 'customers',
    title: 'Customer & Dealer Registry',
    subtitle: 'Kerala Distribution Network',
    description: 'Tier-1 builders, wholesale distributors, architects, and direct villa clients across 14 Kerala districts.',
    icon: Users,
    folderCategory: 'CORE',
    folderName: 'Core Commercial',
    badge: '128 Verified',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    primaryMetric: '128 Active Dealers',
    accentColor: 'from-blue-600/20 to-transparent',
  },
  {
    id: 'crm',
    title: 'CRM & District Leads Pipeline',
    subtitle: 'Field Lead Tracking',
    description: 'Enquiries from Thrissur, Ernakulam, Kozhikode, and Trivandrum with automated stage progression.',
    icon: Target,
    folderCategory: 'CORE',
    folderName: 'Core Commercial',
    badge: '9 Priority',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    primaryMetric: '₹34.8L Pipeline',
    accentColor: 'from-amber-600/20 to-transparent',
  },
  {
    id: 'quotations',
    title: 'Quotations & BOQ Ingestion',
    subtitle: '18% GST Estimates',
    description: 'Direct PDF/Excel BOQ ingestion, Kerala rebate margin computation, and customer pricing sheets.',
    icon: FileSpreadsheet,
    folderCategory: 'CORE',
    folderName: 'Core Commercial',
    badge: '24 Open',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    primaryMetric: '24 Quotations Active',
    accentColor: 'from-rose-600/20 to-transparent',
  },
  {
    id: 'measurements',
    title: 'Site Measurements Book',
    subtitle: '4-Point Masonry Precision',
    description: 'Permanent database persistence: 4-point wall rebate checks, floor clearances, and site photos.',
    icon: Ruler,
    folderCategory: 'CORE',
    folderName: 'Core Commercial',
    badge: '28 Sites Saved',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    primaryMetric: '54 Openings Verified',
    accentColor: 'from-emerald-600/20 to-transparent',
  },
  {
    id: 'sales-orders',
    title: 'Sales & Work Orders',
    subtitle: 'Confirmed Factory Orders',
    description: 'Automated conversion from accepted quotations with advance deposit receipts and production lock.',
    icon: ShoppingBag,
    folderCategory: 'CORE',
    folderName: 'Core Commercial',
    badge: '18 Active',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    primaryMetric: '₹28.4L Booked',
    accentColor: 'from-indigo-600/20 to-transparent',
  },

  // Folder: Manufacturing & Supply Chain
  {
    id: 'production',
    title: 'Plant Floor & Job Cards',
    subtitle: 'Palakkad Press Operations',
    description: 'Hydraulic heated presses, FRP compression molding, resin-catalyst ratio checks, and thermal stickers.',
    icon: Factory,
    folderCategory: 'MANUFACTURING',
    folderName: 'Plant & Supply Chain',
    badge: '142 Units in Queue',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    primaryMetric: '8 Active Presses',
    accentColor: 'from-cyan-600/20 to-transparent',
  },
  {
    id: 'inventory',
    title: 'Raw Materials & Hardware',
    subtitle: 'Resin, Woven Roving & Stock',
    description: 'Real-time stock of orthophthalic resin, fiberglass matting, WPC pellets, pigments, and hinges.',
    icon: Boxes,
    folderCategory: 'MANUFACTURING',
    folderName: 'Plant & Supply Chain',
    badge: '2 Low Reorder',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    primaryMetric: '1,420 kg Resin In Stock',
    accentColor: 'from-orange-600/20 to-transparent',
  },
  {
    id: 'purchases',
    title: 'Purchases & Procurement',
    subtitle: 'Vendor Purchase Orders',
    description: 'Vendor bills, chemical supplier contracts, freight manifests, and automated PO generation.',
    icon: ShoppingBag,
    folderCategory: 'MANUFACTURING',
    folderName: 'Plant & Supply Chain',
    badge: '6 Pending Delivery',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    primaryMetric: '₹8.6L PO Committed',
    accentColor: 'from-purple-600/20 to-transparent',
  },

  // Folder: Finance, Fulfillment & Field
  {
    id: 'accounts',
    title: 'Accounts, GST & Invoices',
    subtitle: 'Tax Invoices & e-Way Bills',
    description: 'HSN 3925.20.00 compliance, 18% GST calculation, advance payment receipts, and balance ledger.',
    icon: ReceiptIndianRupee,
    folderCategory: 'FINANCE_FULFILLMENT',
    folderName: 'Finance & Field',
    badge: '₹14.2L Receivables',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    primaryMetric: '₹48.2L MTD Billing',
    accentColor: 'from-teal-600/20 to-transparent',
  },
  {
    id: 'employees',
    title: 'Factory Staff & Field Techs',
    subtitle: 'Workforce Management',
    description: 'Shift rosters, site measurement engineer assignments, plant operators, and installation teams.',
    icon: UserCheck,
    folderCategory: 'FINANCE_FULFILLMENT',
    folderName: 'Finance & Field',
    badge: '24 On Shift',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    primaryMetric: '24 Active Personnel',
    accentColor: 'from-sky-600/20 to-transparent',
  },
  {
    id: 'dispatch',
    title: 'Dispatch & Warranty Handover',
    subtitle: 'Fleet Logistics & Signoff',
    description: 'Dedicated delivery trucks (KL-09), site handover customer OTP verification, and 15-Year FRP Warranty.',
    icon: Truck,
    folderCategory: 'FINANCE_FULFILLMENT',
    folderName: 'Finance & Field',
    badge: '3 Fleet En Route',
    badgeColor: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
    primaryMetric: '15-Year Material Warranty',
    accentColor: 'from-lime-600/20 to-transparent',
  },

  // Folder: Enterprise Intelligence & Admin
  {
    id: 'reports',
    title: 'Executive Analytics & Reports',
    subtitle: 'Financial & Plant Metrics',
    description: 'District sales penetration, manufacturing reject rate (<0.8%), gross margins, and Excel export.',
    icon: BarChart3,
    folderCategory: 'GOVERNANCE',
    folderName: 'Executive & Admin',
    badge: 'Real-time Sync',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    primaryMetric: '28.6% Gross Margin',
    accentColor: 'from-violet-600/20 to-transparent',
  },
  {
    id: 'marketing',
    title: 'Showroom Racks & Marketing',
    subtitle: 'Dealer Display Units',
    description: 'Kerala dealer sample rack distribution, marketing collateral, physical demo door tracking.',
    icon: Megaphone,
    folderCategory: 'GOVERNANCE',
    folderName: 'Executive & Admin',
    badge: '32 Active Racks',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    primaryMetric: '32 Showroom Displays',
    accentColor: 'from-pink-600/20 to-transparent',
  },
  {
    id: 'settings',
    title: 'Master Rules & Customization',
    subtitle: 'System Engine & Security',
    description: '17 Customization domains, FRP-first rules, monotonic revision audit, rollback, and security access.',
    icon: Settings,
    folderCategory: 'GOVERNANCE',
    folderName: 'Executive & Admin',
    badge: 'v6 Published',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
    primaryMetric: '10 Audit Revisions',
    accentColor: 'from-red-600/20 to-transparent',
  },
];

export default function CorporateModulesHub({
  onNavigateTab,
  userRole = 'Super Admin',
}: CorporateModulesHubProps) {
  const [activeFolder, setActiveFolder] = useState<HubFolderCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModules = MODULES_DIRECTORY.filter((mod) => {
    const matchesFolder = activeFolder === 'ALL' || mod.folderCategory === activeFolder;
    const matchesSearch =
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.folderName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const folderStats = {
    all: MODULES_DIRECTORY.length,
    core: MODULES_DIRECTORY.filter((m) => m.folderCategory === 'CORE').length,
    manufacturing: MODULES_DIRECTORY.filter((m) => m.folderCategory === 'MANUFACTURING').length,
    finance: MODULES_DIRECTORY.filter((m) => m.folderCategory === 'FINANCE_FULFILLMENT').length,
    governance: MODULES_DIRECTORY.filter((m) => m.folderCategory === 'GOVERNANCE').length,
  };

  return (
    <div className="space-y-5 rounded-2xl bg-[#091024] border border-slate-800 p-5 sm:p-6 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                EXMARK Corporate Modules Hub
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  14 Modules Connected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Departmental operations directory and rapid navigation console for Palakkad Plant &amp; Kerala Branches
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter enterprise modules..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0B132B] border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      {/* Folder Tab Switches */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFolder('ALL')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeFolder === 'ALL'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>All Modules</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-slate-200">
            {folderStats.all}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('CORE')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeFolder === 'CORE'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>📁 Core Commercial</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-slate-200">
            {folderStats.core}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('MANUFACTURING')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeFolder === 'MANUFACTURING'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>📁 Plant &amp; Supply Chain</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-slate-200">
            {folderStats.manufacturing}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('FINANCE_FULFILLMENT')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeFolder === 'FINANCE_FULFILLMENT'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>📁 Finance &amp; Field Fleet</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-slate-200">
            {folderStats.finance}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('GOVERNANCE')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeFolder === 'GOVERNANCE'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>📁 Governance &amp; Admin</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-slate-200">
            {folderStats.governance}
          </span>
        </button>
      </div>

      {/* Grid of Folder-Based Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((mod) => {
          const Icon = mod.icon;
          const hasAccess = canAccessModule(userRole, mod.id);

          return (
            <div
              key={mod.id}
              onClick={() => {
                if (hasAccess) {
                  onNavigateTab(mod.id);
                } else {
                  alert(`Access Restricted: Role "${userRole}" lacks permissions for ${mod.title}.`);
                }
              }}
              className={`group relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                hasAccess
                  ? 'bg-[#0B132B]/70 hover:bg-[#0E1A38] border-slate-800/90 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-950/20 hover:-translate-y-0.5'
                  : 'bg-slate-900/30 border-slate-800/40 opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-800/80 group-hover:bg-red-600/20 text-slate-300 group-hover:text-red-400 border border-slate-700/60 group-hover:border-red-500/30 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      {mod.folderName}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-red-300 transition-colors">
                      {mod.title}
                    </h4>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${mod.badgeColor}`}
                >
                  {mod.badge}
                </span>
              </div>

              {/* Subtitle & Description */}
              <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                {mod.description}
              </p>

              {/* Footer: Metric + Action Link */}
              <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-300">
                  {mod.primaryMetric}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 group-hover:text-red-300 group-hover:translate-x-0.5 transition-all">
                  Open Module
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Safeguard Banner */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>FRP Primary Architecture Active • WPC Composite Modular Safeguard</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Single-Source ERP Hub • Zero Duplicate Modules</span>
        </div>
      </div>
    </div>
  );
}
