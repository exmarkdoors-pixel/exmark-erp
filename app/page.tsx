'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import UnifiedBondingPipelineBar from '@/components/layout/UnifiedBondingPipelineBar';
import KpiCards from '@/components/dashboard/KpiCards';
import SalesChart from '@/components/dashboard/SalesChart';
import ProductionStatus from '@/components/dashboard/ProductionStatus';
import RecentOrdersTable from '@/components/dashboard/RecentOrdersTable';
import FollowUpReminders from '@/components/dashboard/FollowUpReminders';
import QuickActionsModal from '@/components/dashboard/QuickActionsModal';
import CorporateControlCenter from '@/components/dashboard/CorporateControlCenter';
import { ALL_ERP_MODULES, ERP_ROLES, UserRole } from '@/lib/auth/roles';
import { apiFetch, clearAuthToken } from '@/lib/api/apiClient';
import DailyEveningClosingModal from '@/components/modules/finance/DailyEveningClosingModal';

import {
  CustomersView,
  CrmLeadsView,
  QuotationsView,
  DoorMeasurementsView,
  SalesOrdersView,
  SalesAndReturnView,
  ProductionView,
  BomAndRecipeView,
  QualityControlView,
  PlantMaintenanceView,
  SubcontractingView,
  BatchPrintView,
  InventoryView,
  PurchasesView,
  GatePassView,
  DispatchInstallationView,
  SiteInstallationView,
  AccountsGstView,
  EmployeesView,
  MarketingView,
  ReportsView,
  SettingsView,
} from '@/components/modules/ModuleViews';
import { MobileFieldOperationsHub } from '@/components/mobile/MobileFieldOperationsHub';

import { NavigationTab, KpiMetric, OrderItem, SalesChartDataPoint, ProductionLine, FollowUpReminder } from '@/types/erp';
import {
  Sparkles,
  Users,
  ClipboardList,
  Layers,
  ShieldCheck,
  Printer,
  KeyRound,
  ShieldAlert,
  Loader2,
  ReceiptIndianRupee,
  Settings as SettingsIcon,
  FileSpreadsheet,
  Target,
  Factory,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  FolderOpen,
  Calendar,
} from 'lucide-react';

const ZERO_KPI_METRICS: KpiMetric[] = [
  {
    id: 'monthly-sales',
    title: 'Active Pipeline & Quotes',
    value: '₹0.00',
    change: '0 Quotes',
    isPositive: false,
    period: 'fresh baseline',
    subtext: '0 Total Openings • Ready for new site quotes',
    badge: 'Live Ledger',
    iconName: 'IndianRupee',
    accentColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'pending-quotations',
    title: 'Pending Quotations',
    value: '0 Quotes',
    change: '₹0.00',
    isPositive: false,
    period: 'awaiting approval',
    subtext: '0 site estimates active across 14 districts',
    badge: 'Quotes Queue',
    iconName: 'FileSpreadsheet',
    accentColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'production-orders',
    title: 'Plant Floor & Job Cards',
    value: '0 Orders',
    change: '0 Doors',
    isPositive: false,
    period: 'active floor load',
    subtext: 'Factory workshop ready for new production releases',
    badge: 'Plant Verified',
    iconName: 'Factory',
    accentColor: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'receivables',
    title: 'Outstanding Receivables',
    value: '₹0.00',
    change: '0% Due',
    isPositive: true,
    period: 'pending collection',
    subtext: 'Total billing: ₹0.00 • Balance: ₹0.00',
    badge: 'Verified Balance',
    iconName: 'CreditCard',
    accentColor: 'from-red-500 to-rose-600',
  },
];

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [activeSubViewId, setActiveSubViewId] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModuleExpanded, setIsModuleExpanded] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isEveningCloseOpen, setIsEveningCloseOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Super Admin');
  const [userName, setUserName] = useState<string>('EXMARK Staff');
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'redirecting'>('checking');
  const [actualUser, setActualUser] = useState<{
    id: string;
    name: string;
    email?: string;
    role: UserRole;
    employeeCode?: string;
  } | null>(null);
  const [serverPermissions, setServerPermissions] = useState<string[] | undefined>(undefined);
  const [allRolePermissions, setAllRolePermissions] = useState<Record<string, string[]> | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [hasQuickPin, setHasQuickPin] = useState(false);
  const [credentialModalTrigger, setCredentialModalTrigger] = useState(0);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'customization' | 'staff_access'>('customization');
  const [dashboardSubView, setDashboardSubView] = useState<'control-center' | 'overview'>('overview');
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(true);
  const [showDirectoryDrawer, setShowDirectoryDrawer] = useState<boolean>(false);
  const [liveKpiMetrics, setLiveKpiMetrics] = useState<KpiMetric[]>(ZERO_KPI_METRICS);
  const [liveRecentOrders, setLiveRecentOrders] = useState<OrderItem[]>([]);
  const [liveSalesChartData] = useState<SalesChartDataPoint[]>([]);
  const [liveProductionLines] = useState<ProductionLine[]>([]);
  const [liveFollowUpReminders] = useState<FollowUpReminder[]>([]);
  const [liveSidebarBadges, setLiveSidebarBadges] = useState<Record<string, string>>({});
  const [activeFactoryName, setActiveFactoryName] = useState<string>('Central Manufacturing Unit');
  const [brandName, setBrandName] = useState<string>('EXMARK DOORS');

  // Hydrate persisted Simple UI mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('exmark_ui_simple_mode');
      if (saved === 'false') setIsSimpleMode(false);
      else if (saved === 'true') setIsSimpleMode(true);
    } catch {
      // Default to Simple Mode
    }
  }, []);

  const handleToggleSimpleMode = () => {
    setIsSimpleMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('exmark_ui_simple_mode', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleToggleModuleExpanded = () => {
    setIsModuleExpanded((prev) => {
      const next = !prev;
      if (next) {
        setIsSidebarCollapsed(true);
      }
      return next;
    });
  };

  // Esc key restores standard view when in full-screen module fit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModuleExpanded) {
        setIsModuleExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModuleExpanded]);

  // Dispatch window resize event after sidebar/module transitions to auto-fit charts and tables
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);
    return () => clearTimeout(timer);
  }, [isSidebarCollapsed, isModuleExpanded]);

  const effectiveAllowedModules = useMemo(() => {
    if (userRole === 'Super Admin') {
      const extra = allRolePermissions?.['Super Admin'] || serverPermissions || [];
      return Array.from(new Set([...ALL_ERP_MODULES, ...extra]));
    }
    if (allRolePermissions && allRolePermissions[userRole]) {
      return allRolePermissions[userRole];
    }
    if (userRole === actualUser?.role && serverPermissions) {
      return serverPermissions;
    }
    return ERP_ROLES[userRole]?.allowedModules || [];
  }, [allRolePermissions, userRole, actualUser, serverPermissions]);

  // Verify and load active signed session user cleanly before rendering ERP data
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.status === 401) {
          clearAuthToken();
          if (!cancelled) {
            setAuthStatus('redirecting');
            if (typeof window !== 'undefined') {
              window.location.replace('/login');
            }
          }
          return;
        }

        const data = await res.json();
        if (!data || !data.authenticated || !data.user) {
          clearAuthToken();
          if (!cancelled) {
            setAuthStatus('redirecting');
            if (typeof window !== 'undefined') {
              window.location.replace('/login');
            }
          }
          return;
        }

        if (cancelled) return;
        const verifiedRole = data.user.role as UserRole;
        setActualUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: verifiedRole,
          employeeCode: data.user.employeeCode,
        });
        setUserRole(verifiedRole);
        setUserName(data.user.name);
        setMustChangePassword(Boolean(data.mustChangePassword));
        setHasQuickPin(Boolean(data.hasQuickPin));
        const perms = Array.isArray(data.permissions) ? (data.permissions as string[]) : undefined;
        setServerPermissions(perms);

        if (perms && !perms.includes('dashboard') && perms.length > 0) {
          setCurrentTab((perms.includes('production') ? 'production' : perms[0]) as NavigationTab);
        }

        setAuthStatus('authenticated');

        if (verifiedRole === 'Super Admin') {
          apiFetch('/api/auth/rbac')
            .then((r) => (r.ok ? r.json() : null))
            .then((rbacRes) => {
              if (!cancelled && rbacRes?.success && rbacRes.data) {
                setAllRolePermissions(rbacRes.data);
              }
            })
            .catch(() => {});
        }

        apiFetch('/api/settings/company-profile?view=active')
          .then((r) => (r.ok ? r.json() : null))
          .then((profileRes) => {
            if (cancelled || !profileRes?.success || !profileRes.data) return;
            if (profileRes.data.brandName) setBrandName(profileRes.data.brandName);
            if (profileRes.activeFactory?.name) {
              const fac = profileRes.activeFactory;
              const displayName = fac.address?.district ? `${fac.name} (${fac.address.district})` : fac.name;
              setActiveFactoryName(displayName);
            }
          })
          .catch(() => {});

        apiFetch('/api/dashboard/metrics')
          .then((r) => (r.ok ? r.json() : null))
          .then((metricsRes) => {
            if (cancelled || !metricsRes?.success) return;
            if (Array.isArray(metricsRes.kpiMetrics)) setLiveKpiMetrics(metricsRes.kpiMetrics);
            if (Array.isArray(metricsRes.recentOrders)) setLiveRecentOrders(metricsRes.recentOrders);
            if (metricsRes.sidebarBadges) setLiveSidebarBadges(metricsRes.sidebarBadges);
          })
          .catch((err) => {
            console.warn('Dashboard live metrics deferred:', err);
          });
      } catch {
        clearAuthToken();
        if (!cancelled) {
          setAuthStatus('redirecting');
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }
      }
    };

    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNavigateSubCategory = (tab: NavigationTab, subViewId?: string) => {
    if (tab === 'settings') {
      if (subViewId === 'staff_access') {
        setSettingsInitialTab('staff_access');
      } else {
        setSettingsInitialTab('customization');
      }
    }
    setActiveSubViewId(subViewId);
    setCurrentTab(tab);
  };

  // Tab label helper for the navbar
  const getTabTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Overview';
      case 'customers':
        return 'Customer & Dealer Management';
      case 'crm':
        return 'CRM & Leads Pipeline';
      case 'quotations':
        return 'Quotations & Estimates';
      case 'measurements':
        return 'Site Measurements & 4-Point Verification';
      case 'sales-orders':
        return 'Sales & Work Orders';
      case 'sales':
        return 'Direct Sales & Returns (Non-GST)';
      case 'batch-print':
        return '12L Stickers & Batch Print Hub';
      case 'production':
        return 'Plant Floor & Production';
      case 'bom':
        return 'Auto-BOQ & Consumables';
      case 'quality':
        return 'Quality Control (IQC / IPQC / FQC)';
      case 'maintenance':
        return 'Plant Maintenance & OEE';
      case 'job-work':
        return 'Subcontracting & Job Work Challans';
      case 'inventory':
        return 'Raw Materials & Hardware';
      case 'purchases':
        return 'Purchases & Procurement';
      case 'gate-pass':
        return 'Security Gate Pass (NRGP / RGP)';
      case 'accounts':
        return 'Accounts & Accounting';
      case 'employees':
        return 'Factory Staff & Field Techs';
      case 'dispatch':
        return 'Dispatch & Delivery Fleet';
      case 'installation':
        return 'Site Installation & Punch List';
      case 'marketing':
        return 'Showroom Racks & Marketing';
      case 'reports':
        return 'Analytics & Financial Reports';
      case 'mobile-field':
        return 'Mobile Field Operations & Fleet GPS';
      case 'settings':
        return 'Factory Configuration & Settings';
      default:
        return 'Dashboard';
    }
  };

  const handleKpiCardClick = (metricId: string) => {
    switch (metricId) {
      case 'monthly-sales':
        setCurrentTab('reports');
        break;
      case 'pending-quotations':
        setCurrentTab('quotations');
        break;
      case 'production-orders':
        setCurrentTab('production');
        break;
      case 'receivables':
        setCurrentTab('accounts');
        break;
      default:
        break;
    }
  };

  if (authStatus !== 'authenticated') {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <div className="text-sm font-bold tracking-wide text-white">
          {authStatus === 'redirecting' ? 'Redirecting to EXMARK Staff Sign-In...' : 'Verifying EXMARK Factory Session...'}
        </div>
        <div className="text-xs text-slate-400">
          Securing role permissions &amp; plant data workspace
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      <div className="flex flex-1 relative w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentTab={currentTab}
          activeSubViewId={activeSubViewId}
          onSelectTab={(tab) => handleNavigateSubCategory(tab, undefined)}
          onSelectSubCategory={handleNavigateSubCategory}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          userRole={userRole}
          allowedModules={effectiveAllowedModules}
          liveBadges={liveSidebarBadges}
          isSimpleMode={isSimpleMode}
          onToggleSimpleMode={handleToggleSimpleMode}
          isModuleExpanded={isModuleExpanded}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 max-w-full overflow-x-hidden print:pl-0 print:m-0 ${
            isModuleExpanded
              ? 'lg:pl-0'
              : isSidebarCollapsed
              ? 'lg:pl-16'
              : 'lg:pl-64'
          }`}
        >
          {/* Top Sticky Navbar */}
          <Navbar
            currentTabName={getTabTitle(currentTab)}
            currentTab={currentTab}
            activeSubViewId={activeSubViewId}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigateTab={(tab) => handleNavigateSubCategory(tab, undefined)}
            onNavigateSubCategory={handleNavigateSubCategory}
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
            isModuleExpanded={isModuleExpanded}
            onToggleModuleExpanded={handleToggleModuleExpanded}
            userRole={userRole}
            actualRole={actualUser?.role}
            userName={userName}
            userEmail={actualUser?.email}
            employeeCode={actualUser?.employeeCode}
            hasQuickPin={hasQuickPin}
            credentialModalTrigger={credentialModalTrigger}
            onRoleChange={(role) => setUserRole(role)}
            onRbacSaved={(updated) => setAllRolePermissions(updated)}
            onCredentialsUpdated={() => {
              setMustChangePassword(false);
              setHasQuickPin(true);
            }}
            isSimpleMode={isSimpleMode}
            onToggleSimpleMode={handleToggleSimpleMode}
          />

          {/* Main Body Content */}
          <main className="flex-1 p-2 sm:p-2.5 md:p-3 lg:p-3.5 w-full max-w-full min-w-0 space-y-3 pb-16 md:pb-4 print:p-0 print:m-0 print:max-w-none transition-all duration-200 overflow-x-clip">
            {/* Security Prompt When Using Seeded / Temporary Password */}
            {mustChangePassword && (
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print:hidden">
                <div className="flex items-center gap-2 text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <span className="font-bold text-amber-300">First-Time Security Setup:</span>{' '}
                    Set your own private Password &amp; optional Quick PIN now.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCredentialModalTrigger((c) => c + 1)}
                  className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set Password / PIN</span>
                </button>
              </div>
            )}

            {/* Unified Factory ERP Bonding Pipeline (Dashboard-only in Simple Mode to maximize workspace) */}
            {(!isSimpleMode || currentTab === 'dashboard') && (
              <div className="print:hidden">
                <UnifiedBondingPipelineBar
                  currentTab={currentTab}
                  isSimpleMode={isSimpleMode}
                  onNavigate={(tab) => {
                    if (effectiveAllowedModules.includes(tab)) {
                      setCurrentTab(tab);
                    }
                  }}
                />
              </div>
            )}

            {/* Dashboard View */}
            {currentTab === 'dashboard' && effectiveAllowedModules.includes('dashboard') && (
              <>
                {/* Ultra-Minimal Single-Row Greeting & Daily Actions Bar */}
                <div className="rounded-xl bg-[#0B132B] border border-slate-800 px-3.5 py-2 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Factory Online" />
                      <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                        Welcome, {userName}
                      </h2>
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-emerald-400 border border-slate-800 truncate max-w-[200px]">
                        {activeFactoryName}
                      </span>
                      <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                        {userRole}
                      </span>

                      {/* Inline Full-Ops Dashboard View Switcher */}
                      {!isSimpleMode && (
                        <div className="inline-flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 ml-1">
                          <button
                            type="button"
                            onClick={() => setDashboardSubView('overview')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                              dashboardSubView === 'overview'
                                ? 'bg-red-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Overview
                          </button>
                          <button
                            type="button"
                            onClick={() => setDashboardSubView('control-center')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                              dashboardSubView === 'control-center'
                                ? 'bg-red-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Modules (7 Domains)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Compact 1-Click Primary Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {effectiveAllowedModules.includes('quotations') && (
                        <button
                          type="button"
                          onClick={() => setCurrentTab('quotations')}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>+ Quotation</span>
                        </button>
                      )}
                      {effectiveAllowedModules.includes('crm') && (
                        <button
                          type="button"
                          onClick={() => setCurrentTab('crm')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          <span>+ Lead</span>
                        </button>
                      )}
                      {effectiveAllowedModules.includes('production') && (
                        <button
                          type="button"
                          onClick={() => setCurrentTab('production')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Factory className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Production</span>
                        </button>
                      )}
                      {effectiveAllowedModules.includes('batch-print') && (
                        <button
                          type="button"
                          onClick={() => setCurrentTab('batch-print')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-400" />
                          <span>Stickers</span>
                        </button>
                      )}
                      {!isSimpleMode && effectiveAllowedModules.includes('accounts') && (
                        <button
                          type="button"
                          onClick={() => setCurrentTab('accounts')}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/30 transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ReceiptIndianRupee className="w-3.5 h-3.5" />
                          <span>Accounts</span>
                        </button>
                      )}
                      {(userRole === 'Super Admin' ||
                        effectiveAllowedModules.includes('finance') ||
                        effectiveAllowedModules.includes('accounts')) && (
                        <button
                          type="button"
                          onClick={() => setIsEveningCloseOpen(true)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-extrabold transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                          title="Record Daily Evening Close (Sales, Purchases, Cash & WhatsApp Summary)"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Evening Close</span>
                        </button>
                      )}
                      {!isSimpleMode && (
                        <button
                          type="button"
                          onClick={() => setIsQuickActionOpen(true)}
                          className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Quick</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. Live Database KPI Cards */}
                <section aria-label="Key Performance Indicators">
                  <KpiCards
                    metrics={liveKpiMetrics}
                    onCardClick={handleKpiCardClick}
                    isSimpleMode={isSimpleMode}
                  />
                </section>

                {/* Sub-View 1: EXMARK Corporate Control Center (Full Ops Mode when selected) */}
                {!isSimpleMode && dashboardSubView === 'control-center' && (
                  <CorporateControlCenter
                    onNavigateTab={(tab) => handleNavigateSubCategory(tab, undefined)}
                    onSelectSubCategory={handleNavigateSubCategory}
                    userRole={userRole}
                    allowedModules={effectiveAllowedModules}
                  />
                )}

                {/* Sub-View 2: Executive Overview (Default in both Simple Mode & Full Ops) */}
                {(isSimpleMode || dashboardSubView === 'overview') && (
                  <>
                    {/* Recent Orders Table & Follow-up Reminders (High priority daily view) */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
                      <div className="xl:col-span-8">
                        <RecentOrdersTable
                          orders={liveRecentOrders}
                          onViewAllOrders={() => setCurrentTab('sales-orders')}
                        />
                      </div>

                      <div className="xl:col-span-4">
                        <FollowUpReminders
                          initialReminders={liveFollowUpReminders}
                        />
                      </div>
                    </div>

                    {/* Sales Chart & Production Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                      <div className="lg:col-span-7">
                        <SalesChart data={liveSalesChartData} />
                      </div>

                      <div className="lg:col-span-5">
                        <ProductionStatus
                          lines={liveProductionLines}
                          onViewAllProduction={() => setCurrentTab('production')}
                        />
                      </div>
                    </div>

                    {/* Collapsible Enterprise Directory Drawer in Simple Mode */}
                    {isSimpleMode && (
                      <div className="rounded-xl border border-slate-800/80 bg-[#0B132B]/70 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowDirectoryDrawer((v) => !v)}
                          className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-slate-900/60 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-200 truncate">
                              All 7 Enterprise Domains Directory
                            </span>
                            <span className="hidden sm:inline text-[11px] text-slate-500 truncate">
                              · Sales, Purchases, Manufacturing, Accounting, Store/Stock, Logistics &amp; Settings
                            </span>
                          </div>
                          {showDirectoryDrawer ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {showDirectoryDrawer && (
                          <div className="p-3 border-t border-slate-800">
                            <CorporateControlCenter
                              onNavigateTab={(tab) => handleNavigateSubCategory(tab, undefined)}
                              onSelectSubCategory={handleNavigateSubCategory}
                              userRole={userRole}
                              allowedModules={effectiveAllowedModules}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Other Sidebar Module Views */}
            {currentTab === 'customers' && effectiveAllowedModules.includes('customers') && <CustomersView />}
            {currentTab === 'crm' && effectiveAllowedModules.includes('crm') && <CrmLeadsView />}
            {currentTab === 'quotations' && effectiveAllowedModules.includes('quotations') && <QuotationsView userRole={actualUser?.role} />}
            {currentTab === 'measurements' && effectiveAllowedModules.includes('measurements') && <DoorMeasurementsView />}
            {currentTab === 'sales-orders' && effectiveAllowedModules.includes('sales-orders') && <SalesOrdersView />}
            {currentTab === 'sales' && effectiveAllowedModules.includes('sales') && <SalesAndReturnView />}
            {currentTab === 'production' && effectiveAllowedModules.includes('production') && <ProductionView />}
            {currentTab === 'bom' && effectiveAllowedModules.includes('bom') && <BomAndRecipeView />}
            {currentTab === 'quality' && effectiveAllowedModules.includes('quality') && <QualityControlView />}
            {currentTab === 'maintenance' && effectiveAllowedModules.includes('maintenance') && <PlantMaintenanceView />}
            {currentTab === 'job-work' && effectiveAllowedModules.includes('job-work') && <SubcontractingView />}
            {currentTab === 'batch-print' && effectiveAllowedModules.includes('batch-print') && <BatchPrintView />}
            {currentTab === 'inventory' && effectiveAllowedModules.includes('inventory') && (
              <InventoryView
                initialTab={
                  activeSubViewId === 'RM' ||
                  activeSubViewId === 'WIP' ||
                  activeSubViewId === 'FG' ||
                  activeSubViewId === 'READY_STOCK' ||
                  activeSubViewId === 'CONFIG'
                    ? activeSubViewId
                    : undefined
                }
              />
            )}
            {currentTab === 'purchases' && effectiveAllowedModules.includes('purchases') && <PurchasesView />}
            {currentTab === 'gate-pass' && effectiveAllowedModules.includes('gate-pass') && <GatePassView />}
            {currentTab === 'dispatch' && effectiveAllowedModules.includes('dispatch') && <DispatchInstallationView />}
            {currentTab === 'installation' && effectiveAllowedModules.includes('installation') && <SiteInstallationView />}
            {currentTab === 'mobile-field' && (
              <MobileFieldOperationsHub
                authenticatedUser={
                  actualUser
                    ? {
                        id: actualUser.id,
                        name: actualUser.name,
                        role: userRole,
                        employeeCode: actualUser.employeeCode,
                        mobileRole:
                          userRole === 'Super Admin' || userRole === 'Management' || userRole === 'Plant Supervisor'
                            ? 'MANAGER'
                            : userRole === 'Driver'
                            ? 'DRIVER'
                            : userRole === 'Installation'
                            ? 'INSTALLER'
                            : userRole === 'Production'
                            ? 'FLOOR'
                            : 'FIELD_STAFF',
                      }
                    : undefined
                }
              />
            )}
            {currentTab === 'accounts' && effectiveAllowedModules.includes('accounts') && (
              <AccountsGstView initialSubView={activeSubViewId} />
            )}
            {currentTab === 'employees' && effectiveAllowedModules.includes('employees') && (
              <EmployeesView
                userRole={actualUser?.role}
                onManageStaffLogins={() => {
                  setSettingsInitialTab('staff_access');
                  setCurrentTab('settings');
                }}
              />
            )}
            {currentTab === 'marketing' && effectiveAllowedModules.includes('marketing') && <MarketingView />}
            {currentTab === 'reports' && effectiveAllowedModules.includes('reports') && <ReportsView />}
            {currentTab === 'settings' && effectiveAllowedModules.includes('settings') && (
              <SettingsView
                key={settingsInitialTab}
                userRole={actualUser?.role}
                currentUserId={actualUser?.id}
                initialTab={settingsInitialTab}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-slate-800/80 bg-[#070D1E] py-2 px-4 text-[11px] text-slate-400 print:hidden">
            <div className="w-full max-w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wider">{brandName}</span>
                <span>·</span>
                <span>{activeFactoryName}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-slate-400">FRP &amp; WPC Doors</span>
                <span className="text-red-400 font-semibold">Direct Factory Pricing</span>
                <span className="text-emerald-400">ISO 9001:2015</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* MOBILE RESPONSIVE BOTTOM NAVIGATION BAR (PERMISSION-GATED) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0B132B] border-t border-slate-800 flex items-center justify-around z-40 px-2 text-[10px] print:hidden shadow-2xl backdrop-blur-md"
      >
        {[
          { tab: 'dashboard' as NavigationTab, label: 'Home', color: 'text-red-400', Icon: LayoutDashboard },
          { tab: 'quotations' as NavigationTab, label: 'Quotes', color: 'text-blue-400', Icon: FileSpreadsheet },
          { tab: 'crm' as NavigationTab, label: 'CRM', color: 'text-amber-400', Icon: Target },
          { tab: 'production' as NavigationTab, label: 'Plant', color: 'text-emerald-400', Icon: Factory },
          { tab: 'accounts' as NavigationTab, label: 'Accounts', color: 'text-indigo-400', Icon: ReceiptIndianRupee },
          { tab: 'settings' as NavigationTab, label: 'Settings', color: 'text-slate-200', Icon: SettingsIcon },
        ]
          .filter((item) => effectiveAllowedModules.includes(item.tab))
          .slice(0, 5)
          .map(({ tab, label, color, Icon }) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`flex flex-col items-center gap-1 p-1 transition cursor-pointer ${
                currentTab === tab ? `${color} font-bold` : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${currentTab === tab ? color : 'text-slate-400'}`} />
              <span>{label}</span>
            </button>
          ))}
      </nav>

      {/* Quick Action Modal */}
      <QuickActionsModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />

      {/* Daily Evening Closing Modal (1-Click Access from Dashboard) */}
      <DailyEveningClosingModal
        isOpen={isEveningCloseOpen}
        onClose={() => setIsEveningCloseOpen(false)}
      />
    </div>
  );
}
