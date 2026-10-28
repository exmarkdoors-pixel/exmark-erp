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
  UserCheck,
  Megaphone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
  Layers,
  X
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { UserRole, canAccessModule } from '@/lib/auth/roles';
import { Lock } from 'lucide-react';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  userRole?: UserRole;
  liveBadges?: Record<string, string>;
}

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  category?: 'Core' | 'Operations' | 'Admin';
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core' },
  { id: 'customers', label: 'Customers', icon: Users, badge: '128', category: 'Core' },
  { id: 'crm', label: 'CRM & Leads', icon: Target, badge: '9 New', badgeColor: 'bg-amber-500/20 text-amber-300', category: 'Core' },
  { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, badge: '24', badgeColor: 'bg-red-500/20 text-red-300', category: 'Core' },
  { id: 'measurements', label: 'Door Measurements', icon: Ruler, category: 'Core' },
  { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingBag, badge: '18 Active', category: 'Core' },
  { id: 'production', label: 'Production', icon: Factory, badge: '142 Units', badgeColor: 'bg-blue-500/20 text-blue-300', category: 'Operations' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, badge: '2 Low', badgeColor: 'bg-orange-500/20 text-orange-300', category: 'Operations' },
  { id: 'purchases', label: 'Purchases', icon: Layers, category: 'Operations' },
  { id: 'accounts', label: 'Accounts & GST', icon: ReceiptIndianRupee, category: 'Operations' },
  { id: 'employees', label: 'Employees', icon: UserCheck, category: 'Operations' },
  { id: 'dispatch', label: 'Dispatch & Installation', icon: Truck, category: 'Operations' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, category: 'Admin' },
  { id: 'reports', label: 'Reports', icon: BarChart3, category: 'Admin' },
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
  liveBadges,
}: SidebarProps) {
  const [factoryName, setFactoryName] = React.useState<string>('Central Manufacturing Unit');

  React.useEffect(() => {
    fetch('/api/settings/company-profile?view=active')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.activeFactory?.name) {
          const fac = data.activeFactory;
          setFactoryName(fac.address?.district ? `${fac.name} (${fac.address.district})` : fac.name);
        }
      })
      .catch(() => {});
  }, []);
  const handleItemClick = (tabId: NavigationTab) => {
    if (!canAccessModule(userRole, tabId)) {
      alert(`Access Restricted: Your current active role (${userRole}) does not have permission for the ${tabId} module. Switch to Super Admin or Management to access.`);
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#070D1E] text-slate-300 border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none shadow-2xl ${
          /* Desktop Width */
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          /* Mobile Drawer Position */
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-[#0B132B]/90">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* EXMARK Logo Emblem */}
            <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-900/30 text-white font-black tracking-tight border border-red-500/40">
              <span className="text-xl font-extrabold tracking-tighter">EX</span>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#070D1E]" title="Factory Online" />
            </div>

            {/* Brand Title (hidden when collapsed on desktop) */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-wider text-white">
                    EXMARK
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-600/90 text-white tracking-widest">
                    ERP
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight truncate">
                  FRP & WPC DOORS • KERALA
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isAllowed = canAccessModule(userRole, item.id);
            const prevItem = index > 0 ? NAV_ITEMS[index - 1] : null;
            const showCategoryDivider =
              (!isCollapsed || isMobileOpen) &&
              item.category &&
              (!prevItem || prevItem.category !== item.category);

            return (
              <React.Fragment key={item.id}>
                {showCategoryDivider && (
                  <div className="pt-3 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                    {item.category}
                  </div>
                )}
                <button
                  onClick={() => handleItemClick(item.id)}
                  title={isCollapsed && !isMobileOpen ? (isAllowed ? item.label : `${item.label} (Locked for ${userRole})`) : undefined}
                  className={`group relative flex items-center w-full rounded-lg transition-all duration-150 ${
                    isCollapsed && !isMobileOpen
                      ? 'justify-center h-11 px-0'
                      : 'justify-between px-3 py-2 text-sm'
                  } ${
                    !isAllowed
                      ? 'opacity-40 hover:opacity-75 text-slate-400 hover:bg-slate-800/30'
                      : isActive
                      ? 'bg-red-600/15 text-white font-semibold border border-red-500/40 shadow-sm shadow-red-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {/* Active Indicator Bar on Left */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-500 rounded-r-md" />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-red-500'
                          : 'text-slate-400 group-hover:text-red-400'
                      }`}
                    />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate text-left flex items-center gap-1.5">
                        {item.label}
                        {!isAllowed && <Lock className="w-3 h-3 text-slate-400" />}
                      </span>
                    )}
                  </div>

                  {/* Badge */}
                  {(!isCollapsed || isMobileOpen) && (liveBadges?.[item.id] || item.badge) && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-current/20 flex-shrink-0 ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {liveBadges?.[item.id] || item.badge}
                    </span>
                  )}

                  {/* Floating Tooltip when Collapsed on Desktop */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                      {(liveBadges?.[item.id] || item.badge) && (
                        <span className="ml-1.5 text-[10px] text-red-400 font-bold">
                          ({liveBadges?.[item.id] || item.badge})
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Plant Status Footer Card */}
        {(!isCollapsed || isMobileOpen) ? (
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
