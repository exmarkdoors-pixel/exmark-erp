'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  FileSpreadsheet,
  Ruler,
  ShoppingBag,
  Factory,
  Boxes,
  Truck,
  ReceiptIndianRupee,
  ReceiptText,
  UserCheck,
  Megaphone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
  Layers,
  X,
  FlaskConical,
  Wrench,
  Repeat,
  ClipboardCheck,
  Ticket,
  Printer,
  Smartphone,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { UserRole, canAccessModule } from '@/lib/auth/roles';
import { apiFetch } from '@/lib/api/apiClient';
import { Lock } from 'lucide-react';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  userRole?: UserRole;
  allowedModules?: string[];
  liveBadges?: Record<string, string>;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: () => void;
}

const SIMPLE_MODE_TABS: NavigationTab[] = [
  'dashboard',
  'quotations',
  'crm',
  'production',
  'dispatch',
  'accounts',
  'settings',
];

const SIMPLE_LABELS: Partial<Record<NavigationTab, string>> = {
  dashboard: 'Dashboard',
  quotations: 'Quotations & Estimates',
  crm: 'CRM & Leads',
  production: 'Production Floor',
  dispatch: 'Packing & Dispatch',
  'mobile-field': 'Mobile Field Ops',
  accounts: 'Accounts & Accounting',
  settings: 'Settings & Staff',
};

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  category?: 'Core' | 'Operations' | 'Admin';
}

const NAV_ITEMS: NavItemConfig[] = [
  // Core Operational Pipeline
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core' },
  { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, badge: 'Estimates', badgeColor: 'bg-blue-500/20 text-blue-300', category: 'Core' },
  { id: 'measurements', label: 'Site Measurements', icon: Ruler, badge: '4-Pt Grid', badgeColor: 'bg-cyan-500/20 text-cyan-300', category: 'Core' },
  { id: 'sales-orders', label: 'Order Lock & Adv', icon: ShoppingBag, badge: 'Advance Lock', badgeColor: 'bg-rose-500/20 text-rose-300', category: 'Core' },
  { id: 'customers', label: 'Customers', icon: Users, badge: '128', category: 'Core' },
  { id: 'crm', label: 'CRM & Leads', icon: Target, badge: '9 New', badgeColor: 'bg-amber-500/20 text-amber-300', category: 'Core' },

  // Production Stage Operations (Active Core)
  { id: 'production', label: 'Production Floor', icon: Factory, badge: 'Kanban + Gangs', badgeColor: 'bg-emerald-500/20 text-emerald-300', category: 'Operations' },
  { id: 'batch-print', label: '12L & 4"×2" Stickers', icon: Printer, badge: '12L / Thermal', badgeColor: 'bg-rose-500/20 text-rose-300', category: 'Operations' },
  { id: 'bom', label: 'Auto-BOQ & Consumables', icon: FlaskConical, badge: 'BOQ + Shift', badgeColor: 'bg-emerald-500/20 text-emerald-300', category: 'Operations' },
  { id: 'quality', label: 'Quality Control (QC)', icon: ShieldCheck, badge: 'IQC/FQC', badgeColor: 'bg-teal-500/20 text-teal-300', category: 'Operations' },
  { id: 'maintenance', label: 'Plant Maintenance', icon: Wrench, badge: 'OEE / Molds', badgeColor: 'bg-amber-500/20 text-amber-300', category: 'Operations' },
  { id: 'job-work', label: 'Job Work Challans', icon: Repeat, badge: 'Outwork', badgeColor: 'bg-indigo-500/20 text-indigo-300', category: 'Operations' },

  // Fulfillment & Site Delivery
  { id: 'dispatch', label: 'Packing & Dispatch', icon: Truck, badge: 'Challan', badgeColor: 'bg-emerald-500/20 text-emerald-300', category: 'Operations' },
  { id: 'gate-pass', label: 'Security Gate Pass', icon: Ticket, badge: 'NRGP / RGP', badgeColor: 'bg-emerald-500/20 text-emerald-300', category: 'Operations' },
  { id: 'installation', label: 'Site Installation', icon: ClipboardCheck, badge: 'Conditional', badgeColor: 'bg-cyan-500/20 text-cyan-300', category: 'Operations' },
  { id: 'inventory', label: 'Stock Maintenance & Buffer', icon: Boxes, badge: 'Target Buffer', badgeColor: 'bg-amber-500/20 text-amber-300', category: 'Operations' },
  { id: 'purchases', label: 'Purchase Orders (PO)', icon: Layers, badge: 'Create PO', badgeColor: 'bg-purple-500/20 text-purple-300', category: 'Operations' },
  { id: 'mobile-field', label: 'Mobile Field Ops', icon: Smartphone, badge: 'Floor/GPS', badgeColor: 'bg-rose-500/20 text-rose-300', category: 'Operations' },

  // Accounts & Complete Double-Entry Accounting Suite (Non-GST Direct Sales)
  { id: 'accounts', label: 'Accounts & Accounting', icon: ReceiptIndianRupee, badge: 'Full Ledger', badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', category: 'Admin' },
  { id: 'sales', label: 'Sales & Returns', icon: ReceiptText, badge: 'Direct Sales', badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', category: 'Admin' },
  { id: 'employees', label: 'Employees & Roster', icon: UserCheck, category: 'Admin' },
  { id: 'marketing', label: 'Marketing & Sales Hub', icon: Megaphone, badge: 'Targets + Comm', badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30', category: 'Admin' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, category: 'Admin' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'Admin' },
];

export default function Sidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  userRole = 'Super Admin',
  allowedModules,
  liveBadges,
  isSimpleMode = true,
  onToggleSimpleMode,
}: SidebarProps) {
  const [factoryName, setFactoryName] = React.useState<string>('Central Manufacturing Unit');

  React.useEffect(() => {
    apiFetch('/api/settings/company-profile?view=active')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.activeFactory?.name) {
          const fac = data.activeFactory;
          setFactoryName(fac.address?.district ? `${fac.name} (${fac.address.district})` : fac.name);
        }
      })
      .catch(() => {});
  }, []);

  const hasModuleAccess = (tabId: NavigationTab) => {
    if (userRole === 'Super Admin') return true;
    if (allowedModules) {
      return allowedModules.includes(tabId);
    }
    return canAccessModule(userRole, tabId);
  };

  const handleItemClick = (tabId: NavigationTab) => {
    if (!hasModuleAccess(tabId)) {
      alert(`Access Restricted: Your current active role (${userRole}) does not have permission for the ${tabId} module. Contact Super Admin if access is needed.`);
      return;
    }
    onSelectTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Scrim */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#070D1E] text-slate-300 border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none shadow-2xl print:hidden ${
          /* Desktop Width */
          isCollapsed ? 'lg:w-16' : 'lg:w-56'
        } ${
          /* Mobile Drawer Position */
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-slate-800/80 bg-[#0B132B]/90">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* EXMARK Logo Emblem */}
            <div className="relative flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-md shadow-red-900/30 text-white font-black tracking-tight border border-red-500/40">
              <span className="text-sm font-extrabold tracking-tighter">EX</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#070D1E]" title="Factory Online" />
            </div>

            {/* Brand Title (hidden when collapsed on desktop) */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black tracking-wider text-white leading-none">
                    EXMARK
                  </span>
                  <span className="px-1 py-0.2 text-[8px] font-bold uppercase rounded bg-red-600/90 text-white tracking-wider">
                    ERP
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium tracking-tight truncate leading-tight mt-0.5">
                  FRP & WPC DOORS
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar">
          {(() => {
            const simpleTabsForRole: NavigationTab[] =
              userRole === 'Super Admin'
                ? [...SIMPLE_MODE_TABS, 'mobile-field']
                : SIMPLE_MODE_TABS;
            const visibleItems = isSimpleMode
              ? NAV_ITEMS.filter((item) => simpleTabsForRole.includes(item.id) || item.id === currentTab)
              : NAV_ITEMS;

            return visibleItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isAllowed = hasModuleAccess(item.id);
              const prevItem = index > 0 ? visibleItems[index - 1] : null;
              const showCategoryDivider =
                !isSimpleMode &&
                (!isCollapsed || isMobileOpen) &&
                item.category &&
                (!prevItem || prevItem.category !== item.category);
              const displayLabel = isSimpleMode ? (SIMPLE_LABELS[item.id] || item.label) : item.label;
              const badgeText = isSimpleMode ? liveBadges?.[item.id] : (liveBadges?.[item.id] || item.badge);

              return (
                <React.Fragment key={item.id}>
                  {showCategoryDivider && (
                    <div className="pt-2 pb-0.5 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 select-none">
                      {item.category}
                    </div>
                  )}
                  <button
                    onClick={() => handleItemClick(item.id)}
                    title={isCollapsed && !isMobileOpen ? (isAllowed ? displayLabel : `${displayLabel} (Locked for ${userRole})`) : undefined}
                    className={`group relative flex items-center w-full rounded-lg transition-all duration-150 cursor-pointer ${
                      isCollapsed && !isMobileOpen
                        ? 'justify-center h-9 px-0'
                        : isSimpleMode
                        ? 'justify-between px-2.5 py-2 text-xs'
                        : 'justify-between px-2.5 py-1.5 text-xs'
                    } ${
                      !isAllowed
                        ? 'opacity-40 hover:opacity-75 text-slate-400 hover:bg-slate-800/30'
                        : isActive
                        ? 'bg-red-600/15 text-white font-semibold border border-red-500/40 shadow-sm shadow-red-950/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    {/* Active Indicator Bar on Left */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-500 rounded-r-md" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-red-500'
                            : 'text-slate-400 group-hover:text-red-400'
                        }`}
                      />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate text-left flex items-center gap-1">
                          {displayLabel}
                          {!isAllowed && <Lock className="w-3 h-3 text-slate-400" />}
                        </span>
                      )}
                    </div>

                    {/* Badge */}
                    {(!isCollapsed || isMobileOpen) && badgeText && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-current/20 flex-shrink-0 ${
                          item.badgeColor || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {badgeText}
                      </span>
                    )}

                    {/* Floating Tooltip when Collapsed on Desktop */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {displayLabel}
                        {badgeText && (
                          <span className="ml-1.5 text-[10px] text-red-400 font-bold">
                            ({badgeText})
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </React.Fragment>
              );
            });
          })()}

          {/* Simple Mode / Full Modules Toggle Button */}
          {onToggleSimpleMode && (
            <div className="pt-3 mt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onToggleSimpleMode}
                title={isSimpleMode ? 'Expand all 19 manufacturing & admin modules' : 'Switch back to clean 7-tab Simple View'}
                className={`w-full flex items-center rounded-xl transition-all text-xs font-bold cursor-pointer border ${
                  isCollapsed && !isMobileOpen
                    ? 'justify-center h-10 px-0'
                    : 'justify-center gap-2 px-3 py-2.5'
                } ${
                  isSimpleMode
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
                }`}
              >
                {isSimpleMode ? (
                  <>
                    <LayoutGrid className="w-4 h-4 text-amber-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Show All Modules ({NAV_ITEMS.length})</span>}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Switch to Simple View</span>}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Plant Status Footer Card */}
        {(!isCollapsed || isMobileOpen) ? (
          isSimpleMode ? (
            <div className="px-3.5 py-2.5 mx-2.5 mb-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-300 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{factoryName}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold shrink-0 ml-2">Simple</span>
            </div>
          ) : (
            <div className="p-3 mx-2.5 mb-3 rounded-xl bg-gradient-to-br from-[#0B132B] to-slate-900 border border-slate-800 text-xs shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  {factoryName}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                FRP Press &amp; WPC Extrusion lines running Day Shift A (28 Techs).
              </p>
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-red-500" />
                  ISO 9001:2015
                </span>
                <span>v2.4 Pro</span>
              </div>
            </div>
          )
        ) : (
          <div className="p-2 mb-2 flex justify-center" title={`${factoryName}: Active`}>
            <div className="w-8 h-8 rounded-lg bg-[#0B132B] border border-slate-800 flex items-center justify-center text-red-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
