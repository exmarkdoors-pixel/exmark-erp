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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      <div className="flex flex-1 relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'settings') setSettingsInitialTab('customization');
            setCurrentTab(tab);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          userRole={userRole}
          allowedModules={effectiveAllowedModules}
          liveBadges={liveSidebarBadges}
          isSimpleMode={isSimpleMode}
          onToggleSimpleMode={handleToggleSimpleMode}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 min-w-0 print:pl-0 print:m-0 ${
            isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          {/* Top Sticky Navbar */}
          <Navbar
            currentTabName={getTabTitle(currentTab)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigateTab={(tab) => {
              if (tab === 'settings') setSettingsInitialTab('staff_access');
              setCurrentTab(tab);
            }}
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
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
          <main
            className={`flex-1 p-3 md:p-5 lg:p-6 w-full mx-auto space-y-6 pb-20 md:pb-6 print:p-0 print:m-0 print:max-w-none transition-all duration-200 ${
              ['quotations', 'production', 'sales-orders', 'inventory', 'batch-print'].includes(currentTab)
                ? 'max-w-[98%] 2xl:max-w-[1920px]'
                : 'max-w-7xl'
            }`}
          >
            {/* Security Prompt When Using Seeded / Temporary Password */}
            {mustChangePassword && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
                <div className="flex items-start gap-2.5 text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">First-Time Factory Security Setup:</span>{' '}
                    You are signed in with a default/temporary password. Set your own private Password &amp; optional 4–6 digit Quick PIN now.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCredentialModalTrigger((c) => c + 1)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set Password &amp; Quick PIN</span>
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
                {/* Hero / Factory Header Card */}
                {isSimpleMode ? (
                  <div className="rounded-2xl bg-[#0B132B] border border-slate-800 p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            {activeFactoryName}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400 font-medium">{userRole}</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                          Welcome, {userName}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                          Quick daily controls for quotations, leads, factory floor production, and stickers.
                        </p>
                      </div>

                      {/* 4 Primary 1-Click Daily Actions */}
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
                        {effectiveAllowedModules.includes('quotations') && (
                          <button
                            type="button"
                            onClick={() => setCurrentTab('quotations')}
                            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>+ New Quotation</span>
                          </button>
                        )}
                        {effectiveAllowedModules.includes('crm') && (
                          <button
                            type="button"
                            onClick={() => setCurrentTab('crm')}
                            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Target className="w-4 h-4 text-amber-400" />
                            <span>+ New Lead</span>
                          </button>
                        )}
                        {effectiveAllowedModules.includes('production') && (
                          <button
                            type="button"
                            onClick={() => setCurrentTab('production')}
                            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Factory className="w-4 h-4 text-emerald-400" />
                            <span>Production Floor</span>
                          </button>
                        )}
                        {effectiveAllowedModules.includes('batch-print') && (
                          <button
                            type="button"
                            onClick={() => setCurrentTab('batch-print')}
                            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-rose-400" />
                            <span>12L Stickers</span>
                          </button>
                        )}
                        {(userRole === 'Super Admin' ||
                          effectiveAllowedModules.includes('finance') ||
                          effectiveAllowedModules.includes('accounts')) && (
                          <button
                            type="button"
                            onClick={() => setIsEveningCloseOpen(true)}
                            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-amber-950/30 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Record Daily Evening Close (Sales, Purchases, Cash & WhatsApp Summary)"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Evening Close</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0F1E3D] to-[#162544] border border-slate-800 p-5 sm:p-6 shadow-xl">
                    {/* Subtle red accent glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/90 text-white shadow-xs">
                            EXMARK Manufacturing ERP
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-red-300 border border-red-500/30">
                            Role: {userRole}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {activeFactoryName}: Active
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                          Welcome, {userName}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                          FRP &amp; WPC Door Operations Control • Precision engineering for Kerala climate across 14 Kerala districts.
                        </p>
                      </div>

                      {/* Quick Stat Highlights */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap">
                        <button
                          onClick={() => setCurrentTab('production')}
                          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          title="Jump directly to Production Floor Queue"
                        >
                          <span>🏭 Production Floor</span>
                        </button>
                        <button
                          onClick={() => setCurrentTab('batch-print')}
                          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          title="Open 12L Barcode Sticker Generator"
                        >
                          <span>🏷️ 12L Stickers</span>
                        </button>
                        <button
                          onClick={() => setCurrentTab('accounts')}
                          className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          title="Accounts, Financial Analysis & Gang Weekly Payouts"
                        >
                          <span>💰 Accounts &amp; Finance</span>
                        </button>
                        {(userRole === 'Super Admin' ||
                          effectiveAllowedModules.includes('finance') ||
                          effectiveAllowedModules.includes('accounts')) && (
                          <button
                            type="button"
                            onClick={() => setIsEveningCloseOpen(true)}
                            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            title="Record Daily Evening Close"
                          >
                            <span>🌆 Evening Close</span>
                          </button>
                        )}
                        <button
                          onClick={() => setIsQuickActionOpen(true)}
                          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/40 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          Quick New Action
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. Live Database KPI Cards */}
                <section aria-label="Key Performance Indicators">
                  <KpiCards
                    metrics={liveKpiMetrics}
                    onCardClick={handleKpiCardClick}
                    isSimpleMode={isSimpleMode}
                  />
                </section>

                {/* Dashboard Sub-View Switcher Bar (Shown only in Full Ops Mode) */}
                {!isSimpleMode && (
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDashboardSubView('overview')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          dashboardSubView === 'overview'
                            ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <span>📊 Plant &amp; Sales Floor Charts</span>
                      </button>

                      <button
                        onClick={() => setDashboardSubView('control-center')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          dashboardSubView === 'control-center'
                            ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <span>🗂️ Corporate Control Center</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">10 Folders</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-View 1: EXMARK Corporate Control Center (Full Ops Mode when selected) */}
                {!isSimpleMode && dashboardSubView === 'control-center' && (
                  <CorporateControlCenter
                    onNavigateTab={(tab) => {
                      if (tab === 'settings') setSettingsInitialTab('customization');
                      setCurrentTab(tab);
                    }}
                    userRole={userRole}
                    allowedModules={effectiveAllowedModules}
                  />
                )}

                {/* Sub-View 2: Executive Overview (Default in both Simple Mode & Full Ops) */}
                {(isSimpleMode || dashboardSubView === 'overview') && (
                  <>
                    {/* Recent Orders Table & Follow-up Reminders (High priority daily view) */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                      <div className="rounded-2xl border border-slate-800/80 bg-[#0B132B]/70 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowDirectoryDrawer((v) => !v)}
                          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-900/60 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen className="w-4 h-4 text-amber-400" />
                            <div>
                              <span className="text-xs font-bold text-slate-200 block">
                                Browse All 10 Enterprise Modules &amp; Features (Directory)
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Need BOQ reports, Job Work, Inventory POs, or Quality Control? Open full directory here.
                              </span>
                            </div>
                          </div>
                          {showDirectoryDrawer ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        {showDirectoryDrawer && (
                          <div className="p-4 border-t border-slate-800">
                            <CorporateControlCenter
                              onNavigateTab={(tab) => {
                                if (tab === 'settings') setSettingsInitialTab('customization');
                                setCurrentTab(tab);
                              }}
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
            {currentTab === 'inventory' && effectiveAllowedModules.includes('inventory') && <InventoryView />}
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
            {currentTab === 'accounts' && effectiveAllowedModules.includes('accounts') && <AccountsGstView />}
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
          <footer className="mt-auto border-t border-slate-800/80 bg-[#070D1E] py-4 px-6 text-xs text-slate-400 print:hidden">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wider">{brandName}</span>
                <span>•</span>
                <span>{activeFactoryName} &amp; Corporate Hub</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-slate-400">FRP Molded &amp; WPC Solid Composite Doors</span>
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
