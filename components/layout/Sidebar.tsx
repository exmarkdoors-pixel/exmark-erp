'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Search,
  Lock,
  Sparkles,
  LayoutGrid,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { UserRole, canAccessModule } from '@/lib/auth/roles';
import { apiFetch } from '@/lib/api/apiClient';
import {
  CORPORATE_ERP_DOMAINS,
  CorporateCategory,
  CorporateSubCategory,
  getCategoryByTabId,
} from '@/types/corporateNavigation';

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
  activeSubViewId?: string;
  onSelectSubCategory?: (tab: NavigationTab, subViewId?: string) => void;
  isModuleExpanded?: boolean;
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
  isSimpleMode = false,
  onToggleSimpleMode,
  activeSubViewId,
  onSelectSubCategory,
  isModuleExpanded = false,
}: SidebarProps) {
  const [factoryName, setFactoryName] = useState<string>('Central Manufacturing Unit');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Track expanded accordion categories (all open by default or auto-expand active)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    sales: true,
    purchases: true,
    manufacturing: true,
    accounting: true,
    stock: true,
    logistics: false,
    settings: false,
  });

  // Automatically expand category when currentTab changes
  useEffect(() => {
    const activeCat = getCategoryByTabId(currentTab);
    if (activeCat) {
      setExpandedCategories((prev) => ({
        ...prev,
        [activeCat.id]: true,
      }));
    }
  }, [currentTab]);

  useEffect(() => {
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

  const handleSubCategoryClick = (sub: CorporateSubCategory) => {
    if (!hasModuleAccess(sub.tabId)) {
      alert(
        `Access Restricted: Your current active role (${userRole}) does not have permission for the ${sub.label} module. Contact Super Admin if access is needed.`
      );
      return;
    }
    if (onSelectSubCategory) {
      onSelectSubCategory(sub.tabId, sub.subViewId);
    } else {
      onSelectTab(sub.tabId);
    }
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const handleDashboardClick = () => {
    if (!hasModuleAccess('dashboard')) return;
    onSelectTab('dashboard');
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Filter categories and sub-categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CORPORATE_ERP_DOMAINS;
    const q = searchQuery.toLowerCase().trim();
    return CORPORATE_ERP_DOMAINS.map((cat) => ({
      ...cat,
      subCategories: cat.subCategories.filter(
        (sub) =>
          sub.label.toLowerCase().includes(q) ||
          sub.description.toLowerCase().includes(q) ||
          (sub.labelMl && sub.labelMl.toLowerCase().includes(q))
      ),
    })).filter((cat) => cat.subCategories.length > 0 || cat.label.toLowerCase().includes(q));
  }, [searchQuery]);

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
          /* Desktop Width & Fullscreen Fit */
          isModuleExpanded
            ? 'lg:-translate-x-full'
            : isCollapsed
            ? 'lg:w-16 lg:translate-x-0'
            : 'lg:w-64 lg:translate-x-0'
        } ${
          /* Mobile Drawer Position */
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-13 px-3.5 border-b border-slate-800/80 bg-[#0B132B]/95">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* EXMARK Logo Emblem */}
            <div className="relative flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-md shadow-red-900/40 text-white font-black tracking-tight border border-red-500/40">
              <span className="text-sm font-extrabold tracking-tighter">EX</span>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#070D1E]"
                title="Factory Production Online"
              />
            </div>

            {/* Brand Title (hidden when collapsed on desktop) */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-wider text-white leading-none">
                    EXMARK
                  </span>
                  <span className="px-1 py-0.2 text-[8px] font-black uppercase rounded bg-red-600/90 text-white tracking-wider">
                    ERP
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold tracking-tight truncate leading-tight mt-0.5">
                  CORPORATE ERP SUITE
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
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
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Content Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
          {/* Executive Dashboard Root Button */}
          <button
            onClick={handleDashboardClick}
            title={isCollapsed && !isMobileOpen ? 'Executive Dashboard' : undefined}
            className={`group relative flex items-center w-full rounded-xl transition-all duration-150 cursor-pointer ${
              isCollapsed && !isMobileOpen
                ? 'justify-center h-10 px-0 mb-2'
                : 'justify-between px-3 py-2 text-xs mb-1'
            } ${
              currentTab === 'dashboard'
                ? 'bg-red-600/20 text-white font-bold border border-red-500/50 shadow-sm shadow-red-950/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {currentTab === 'dashboard' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-500 rounded-r-md" />
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              <LayoutDashboard
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  currentTab === 'dashboard' ? 'text-red-500' : 'text-slate-400 group-hover:text-red-400'
                }`}
              />
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white leading-tight">Executive Dashboard</span>
                  <span className="text-[9px] text-slate-400">Plant KPIs &amp; Daily Health</span>
                </div>
              )}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                LIVE
              </span>
            )}
          </button>

          {/* Quick Module Filter (hidden when collapsed) */}
          {(!isCollapsed || isMobileOpen) && !isSimpleMode && (
            <div className="relative mb-2 px-1">
              <Search className="absolute left-3 top-2.5 w-3 h-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full bg-[#0B132B] border border-slate-800 focus:border-cyan-500/60 rounded-lg pl-7 pr-6 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* MODE A: SIMPLE MODE (7 Core Tabs) */}
          {isSimpleMode ? (
            <div className="space-y-1">
              {SIMPLE_MODE_TABS.map((tabId) => {
                const isActive = currentTab === tabId;
                const isAllowed = hasModuleAccess(tabId);
                const label = SIMPLE_LABELS[tabId] || tabId;
                const badgeText = liveBadges?.[tabId];

                return (
                  <button
                    key={tabId}
                    onClick={() => {
                      if (!isAllowed) {
                        alert(`Access Restricted for ${userRole}.`);
                        return;
                      }
                      onSelectTab(tabId);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    className={`group relative flex items-center w-full rounded-xl transition-all cursor-pointer ${
                      isCollapsed && !isMobileOpen ? 'justify-center h-10 px-0' : 'justify-between px-3 py-2 text-xs'
                    } ${
                      !isAllowed
                        ? 'opacity-40 text-slate-500'
                        : isActive
                        ? 'bg-red-600/20 text-white font-bold border border-red-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-r" />}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LayoutGrid
                        className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-slate-400 group-hover:text-white'}`}
                      />
                      {(!isCollapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!isCollapsed || isMobileOpen) && badgeText && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {badgeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* MODE B: CORPORATE ERP ACCORDIONS (7 Major Enterprise Categories) */
            <div className="space-y-1.5">
              {filteredCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isExpanded = Boolean(expandedCategories[category.id]) || Boolean(searchQuery.trim());
                const isCatActive = category.subCategories.some((s) => s.tabId === currentTab);
                const accessibleSubs = category.subCategories.filter((s) => hasModuleAccess(s.tabId));

                return (
                  <div
                    key={category.id}
                    className={`rounded-xl transition-all ${
                      isCatActive
                        ? 'bg-slate-900/60 border border-slate-700/60'
                        : 'bg-slate-900/20 border border-slate-800/40 hover:border-slate-800'
                    }`}
                    onMouseEnter={() => setHoveredCategory(category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {/* Category Header Accordion Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCollapsed && !isMobileOpen) {
                          onToggleCollapse();
                        } else {
                          toggleCategory(category.id);
                        }
                      }}
                      title={
                        isCollapsed && !isMobileOpen
                          ? `${category.label} (${category.subCategories.length} sub-modules)`
                          : undefined
                      }
                      className={`w-full flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
                        isCollapsed && !isMobileOpen ? 'p-2 justify-center h-10' : 'px-2.5 py-2'
                      } ${
                        isCatActive
                          ? 'text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                            category.borderColor
                          } ${isCatActive ? category.badgeColor : 'bg-slate-800/60 text-slate-400'}`}
                        >
                          <CategoryIcon className={`w-3.5 h-3.5 ${category.accentColor}`} />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 truncate">
                              {category.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${category.borderColor} ${category.badgeColor}`}
                          >
                            {accessibleSubs.length}
                          </span>
                          <span className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>
                      )}

                      {/* Desktop Collapsed Hover Flyout Menu */}
                      {isCollapsed && !isMobileOpen && hoveredCategory === category.id && (
                        <div className="absolute left-full top-0 ml-3 w-56 p-2 bg-[#0B132B] border border-slate-700 rounded-xl shadow-2xl z-50 space-y-1">
                          <div className="px-2 py-1 border-b border-slate-800 mb-1">
                            <div className="text-xs font-black text-white uppercase">{category.label}</div>
                          </div>
                          {category.subCategories.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive =
                              currentTab === sub.tabId &&
                              (!sub.subViewId || sub.subViewId === activeSubViewId);
                            const allowed = hasModuleAccess(sub.tabId);

                            return (
                              <button
                                key={sub.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubCategoryClick(sub);
                                }}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                  !allowed
                                    ? 'opacity-40 text-slate-500'
                                    : isSubActive
                                    ? 'bg-red-600/20 text-white border border-red-500/40'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <SubIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate">{sub.label}</span>
                                </div>
                                {sub.badge && (
                                  <span className="text-[8.5px] px-1 rounded bg-slate-800 text-slate-400">
                                    {sub.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </button>

                    {/* Sub-Categories List (Accordion Body) */}
                    {(!isCollapsed || isMobileOpen) && isExpanded && (
                      <div className="pt-0.5 pb-1 px-1.5 space-y-0.5 border-t border-slate-800/40 mt-0.5">
                        {category.subCategories.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive =
                            currentTab === sub.tabId &&
                            (!sub.subViewId || sub.subViewId === activeSubViewId);
                          const isAllowed = hasModuleAccess(sub.tabId);
                          const liveBadge = liveBadges?.[sub.tabId] || sub.badge;

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSubCategoryClick(sub)}
                              className={`group/sub relative w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                                !isAllowed
                                  ? 'opacity-40 hover:opacity-70 text-slate-500'
                                  : isSubActive
                                  ? 'bg-red-600/20 text-white font-bold border border-red-500/40 shadow-xs'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                              }`}
                            >
                              {isSubActive && (
                                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-red-500 rounded-r" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 pl-1">
                                <SubIcon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSubActive
                                      ? 'text-red-400'
                                      : 'text-slate-400 group-hover/sub:text-slate-200'
                                  }`}
                                />
                                <div className="flex flex-col text-left min-w-0">
                                  <span className="truncate text-[11px] leading-tight">
                                    {sub.label}
                                  </span>
                                </div>
                                {!isAllowed && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />}
                              </div>

                              {liveBadge && (
                                <span
                                  className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                                    sub.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {liveBadge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple Mode / Full Corporate View Toggle */}
          {onToggleSimpleMode && (
            <div className="pt-3 mt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onToggleSimpleMode}
                title={
                  isSimpleMode
                    ? 'Expand to Corporate ERP 7-Domain Categorized View'
                    : 'Switch back to clean 7-tab Simple View'
                }
                className={`w-full flex items-center rounded-xl transition-all text-xs font-bold cursor-pointer border ${
                  isCollapsed && !isMobileOpen ? 'justify-center h-10 px-0' : 'justify-center gap-2 px-3 py-2'
                } ${
                  isSimpleMode
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
                }`}
              >
                {isSimpleMode ? (
                  <>
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Corporate 7-Domain View</span>}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Simple 7-Tab View</span>}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Plant Status Footer Card */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="p-2.5 mx-2 mb-2.5 rounded-xl bg-gradient-to-br from-[#0B132B] to-slate-900 border border-slate-800 text-xs shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-200 truncate">
                <Flame className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{factoryName}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[9.5px] text-emerald-400 font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-red-500" />
                EXMARK ISO 9001
              </span>
              <span className="font-mono text-cyan-400 font-bold">v1.5.0 Corp</span>
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
