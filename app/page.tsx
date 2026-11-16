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
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';
import { apiFetch, clearAuthToken } from '@/lib/api/apiClient';

import {
  CustomersView,
  CrmLeadsView,
  QuotationsView,
  SalesOrdersView,
  SalesAndReturnView,
  ProductionView,
  BomAndRecipeView,
  BatchPrintView,
  InventoryView,
  PurchasesView,
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
  const [dashboardSubView, setDashboardSubView] = useState<'control-center' | 'overview'>('control-center');
  const [liveKpiMetrics, setLiveKpiMetrics] = useState<KpiMetric[]>(ZERO_KPI_METRICS);
  const [liveRecentOrders, setLiveRecentOrders] = useState<OrderItem[]>([]);
  const [liveSalesChartData] = useState<SalesChartDataPoint[]>([]);
  const [liveProductionLines] = useState<ProductionLine[]>([]);
  const [liveFollowUpReminders] = useState<FollowUpReminder[]>([]);
  const [liveSidebarBadges, setLiveSidebarBadges] = useState<Record<string, string>>({});
  const [activeFactoryName, setActiveFactoryName] = useState<string>('Central Manufacturing Unit');
  const [brandName, setBrandName] = useState<string>('EXMARK DOORS');

  const effectiveAllowedModules = useMemo(() => {
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
      case 'sales-orders':
        return 'Sales & Work Orders';
      case 'batch-print':
        return '12L Stickers & Batch Print Hub';
      case 'production':
        return 'Plant Floor & Production';
      case 'inventory':
        return 'Raw Materials & Hardware';
      case 'purchases':
        return 'Purchases & Procurement';
      case 'accounts':
        return 'Accounts & Billing';
      case 'employees':
        return 'Factory Staff & Field Techs';
      case 'dispatch':
        return 'Dispatch & Installation Fleet';
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

            {/* Unified Factory ERP Bonding Pipeline */}
            <div className="print:hidden">
              <UnifiedBondingPipelineBar
                currentTab={currentTab}
                onNavigate={(tab) => {
                  if (effectiveAllowedModules.includes(tab)) {
                    setCurrentTab(tab);
                  }
                }}
              />
            </div>

            {/* Dashboard View */}
            {currentTab === 'dashboard' && effectiveAllowedModules.includes('dashboard') && (
              <>
                {/* Hero / Factory Header Card */}
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
                        <span className="inline-flex items-center gap-1 text-xs text-amber-300 font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                          🏭 Production-First Mode • Billing: Future Phase
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                        Welcome, {userName}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                        FRP & WPC Door Operations Control • Precision engineering for Kerala climate: 100% waterproof, termite-proof, and acoustic door systems across 14 Kerala districts.
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
                        title="In-House Floor Gang Weekly Payouts & Accounts"
                      >
                        <span>👷 Floor Gang Payouts</span>
                      </button>
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

                {/* 1. Live Database KPI Cards */}
                <section aria-label="Key Performance Indicators">
                  <KpiCards
                    metrics={liveKpiMetrics}
                    onCardClick={handleKpiCardClick}
                  />
                </section>

                {/* Dashboard Sub-View Switcher Bar */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>

                {/* Sub-View 1: EXMARK Corporate Control Center (10 Enterprise Folders) */}
                {dashboardSubView === 'control-center' && (
                  <CorporateControlCenter
                    onNavigateTab={(tab) => {
                      if (tab === 'settings') setSettingsInitialTab('customization');
                      setCurrentTab(tab);
                    }}
                    userRole={userRole}
                    allowedModules={effectiveAllowedModules}
                  />
                )}

                {/* Sub-View 2: Executive Charts & Floor Load Overview */}
                {dashboardSubView === 'overview' && (
                  <>
                    {/* Middle Row: Sales Chart & Production Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Sales Chart (7 Cols) */}
                      <div className="lg:col-span-7">
                        <SalesChart data={liveSalesChartData} />
                      </div>

                      {/* Production Status (5 Cols) */}
                      <div className="lg:col-span-5">
                        <ProductionStatus
                          lines={liveProductionLines}
                          onViewAllProduction={() => setCurrentTab('production')}
                        />
                      </div>
                    </div>

                    {/* Bottom Row: Recent Orders Table & Follow-up Reminders */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                      {/* Recent Orders Table (8 Cols) */}
                      <div className="xl:col-span-8">
                        <RecentOrdersTable
                          orders={liveRecentOrders}
                          onViewAllOrders={() => setCurrentTab('sales-orders')}
                        />
                      </div>

                      {/* Follow-up Reminders (4 Cols) */}
                      <div className="xl:col-span-4">
                        <FollowUpReminders
                          initialReminders={liveFollowUpReminders}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Other Sidebar Module Views */}
            {currentTab === 'customers' && effectiveAllowedModules.includes('customers') && <CustomersView />}
            {currentTab === 'crm' && effectiveAllowedModules.includes('crm') && <CrmLeadsView />}
            {currentTab === 'quotations' && effectiveAllowedModules.includes('quotations') && <QuotationsView userRole={actualUser?.role} />}
            {currentTab === 'sales-orders' && effectiveAllowedModules.includes('sales-orders') && <SalesOrdersView />}
            {currentTab === 'sales' && effectiveAllowedModules.includes('sales') && <SalesAndReturnView />}
            {currentTab === 'production' && effectiveAllowedModules.includes('production') && <ProductionView />}
            {currentTab === 'bom' && effectiveAllowedModules.includes('bom') && <BomAndRecipeView />}
            {currentTab === 'quality' && effectiveAllowedModules.includes('quality') && <ProductionView />}
            {currentTab === 'maintenance' && effectiveAllowedModules.includes('maintenance') && <ProductionView />}
            {currentTab === 'job-work' && effectiveAllowedModules.includes('job-work') && <AccountsGstView />}
            {currentTab === 'batch-print' && effectiveAllowedModules.includes('batch-print') && <BatchPrintView />}
            {currentTab === 'inventory' && effectiveAllowedModules.includes('inventory') && <InventoryView />}
            {currentTab === 'purchases' && effectiveAllowedModules.includes('purchases') && <PurchasesView />}
            {currentTab === 'gate-pass' && effectiveAllowedModules.includes('gate-pass') && <DispatchInstallationView />}
            {currentTab === 'dispatch' && effectiveAllowedModules.includes('dispatch') && <DispatchInstallationView />}
            {currentTab === 'installation' && effectiveAllowedModules.includes('installation') && <SiteInstallationView />}
            {currentTab === 'mobile-field' && <MobileFieldOperationsHub />}
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
          { tab: 'crm' as NavigationTab, label: 'CRM', color: 'text-cyan-400', Icon: Users },
          { tab: 'sales-orders' as NavigationTab, label: 'Orders', color: 'text-rose-400', Icon: ClipboardList },
          { tab: 'bom' as NavigationTab, label: 'BOQ/BOM', color: 'text-emerald-400', Icon: Layers },
          { tab: 'production' as NavigationTab, label: 'Plant Floor', color: 'text-purple-400', Icon: ShieldCheck },
          { tab: 'batch-print' as NavigationTab, label: '12L Print', color: 'text-rose-500', Icon: Printer },
          { tab: 'accounts' as NavigationTab, label: 'Accounts', color: 'text-amber-400', Icon: ReceiptIndianRupee },
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
              <Icon className={`w-4 h-4 ${color}`} />
              <span>{label}</span>
            </button>
          ))}
      </nav>

      {/* Quick Action Modal */}
      <QuickActionsModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />
    </div>
  );
}
