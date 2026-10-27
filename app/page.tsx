'use client';

import React, { useState, useEffect } from 'react';
import DemoNoticeBanner from '@/components/layout/DemoNoticeBanner';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import KpiCards from '@/components/dashboard/KpiCards';
import SalesChart from '@/components/dashboard/SalesChart';
import ProductionStatus from '@/components/dashboard/ProductionStatus';
import RecentOrdersTable from '@/components/dashboard/RecentOrdersTable';
import FollowUpReminders from '@/components/dashboard/FollowUpReminders';
import QuickActionsModal from '@/components/dashboard/QuickActionsModal';
import { UserRole } from '@/lib/auth/roles';

import {
  CustomersView,
  CrmLeadsView,
  QuotationsView,
  DoorMeasurementsView,
  SalesOrdersView,
  ProductionView,
  InventoryView,
  PurchasesView,
  AccountsGstView,
  EmployeesView,
  DispatchInstallationView,
  MarketingView,
  ReportsView,
  SettingsView,
} from '@/components/modules/ModuleViews';

import {
  DEMO_KPI_METRICS,
  DEMO_SALES_CHART_DATA,
  DEMO_PRODUCTION_LINES,
  DEMO_RECENT_ORDERS,
  DEMO_FOLLOW_UP_REMINDERS,
} from '@/data/demoData';

import { NavigationTab } from '@/types/erp';
import {
  Sparkles,
  CalendarCheck,
} from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Super Admin');
  const [userName, setUserName] = useState<string>('Nazer Karumban');

  // Verify and load active session user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUserRole(data.user.role);
          setUserName(data.user.name);
        }
      })
      .catch(() => {
        // Fallback to default
      });
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
        return 'Door Measurements Book';
      case 'sales-orders':
        return 'Sales & Work Orders';
      case 'production':
        return 'Plant Floor & Production';
      case 'inventory':
        return 'Raw Materials & Hardware';
      case 'purchases':
        return 'Purchases & Procurement';
      case 'accounts':
        return 'Accounts, GST & e-Way';
      case 'employees':
        return 'Factory Staff & Field Techs';
      case 'dispatch':
        return 'Dispatch & Installation Fleet';
      case 'marketing':
        return 'Showroom Racks & Marketing';
      case 'reports':
        return 'Analytics & Financial Reports';
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

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Demo Notice Banner */}
      <DemoNoticeBanner />

      <div className="flex flex-1 relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          userRole={userRole}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
            isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          {/* Top Sticky Navbar */}
          <Navbar
            currentTabName={getTabTitle(currentTab)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
            userRole={userRole}
            userName={userName}
          />

          {/* Main Body Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Dashboard View */}
            {currentTab === 'dashboard' && (
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
                          Palakkad Plant: Active
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
                        onClick={() => setIsQuickActionOpen(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/40 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Quick New Action
                      </button>
                      <button
                        onClick={() => setCurrentTab('measurements')}
                        className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4 text-red-400" />
                        Site Measurements
                      </button>
                    </div>
                  </div>
                </div>

                {/* 1. Demo KPI Cards */}
                <section aria-label="Key Performance Indicators">
                  <KpiCards
                    metrics={DEMO_KPI_METRICS}
                    onCardClick={handleKpiCardClick}
                  />
                </section>

                {/* 2. Middle Row: Sales Chart & Production Status */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Sales Chart (7 Cols) */}
                  <div className="lg:col-span-7">
                    <SalesChart data={DEMO_SALES_CHART_DATA} />
                  </div>

                  {/* Production Status (5 Cols) */}
                  <div className="lg:col-span-5">
                    <ProductionStatus
                      lines={DEMO_PRODUCTION_LINES}
                      onViewAllProduction={() => setCurrentTab('production')}
                    />
                  </div>
                </div>

                {/* 3. Bottom Row: Recent Orders Table & Follow-up Reminders */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Recent Orders Table (8 Cols) */}
                  <div className="xl:col-span-8">
                    <RecentOrdersTable
                      orders={DEMO_RECENT_ORDERS}
                      onViewAllOrders={() => setCurrentTab('sales-orders')}
                    />
                  </div>

                  {/* Follow-up Reminders (4 Cols) */}
                  <div className="xl:col-span-4">
                    <FollowUpReminders
                      initialReminders={DEMO_FOLLOW_UP_REMINDERS}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Other Sidebar Module Views */}
            {currentTab === 'customers' && <CustomersView />}
            {currentTab === 'crm' && <CrmLeadsView />}
            {currentTab === 'quotations' && <QuotationsView />}
            {currentTab === 'measurements' && <DoorMeasurementsView userRole={userRole} />}
            {currentTab === 'sales-orders' && <SalesOrdersView />}
            {currentTab === 'production' && <ProductionView />}
            {currentTab === 'inventory' && <InventoryView />}
            {currentTab === 'purchases' && <PurchasesView />}
            {currentTab === 'accounts' && <AccountsGstView />}
            {currentTab === 'employees' && <EmployeesView />}
            {currentTab === 'dispatch' && <DispatchInstallationView />}
            {currentTab === 'marketing' && <MarketingView />}
            {currentTab === 'reports' && <ReportsView />}
            {currentTab === 'settings' && <SettingsView />}
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-slate-800/80 bg-[#070D1E] py-4 px-6 text-xs text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wider">EXMARK DOORS</span>
                <span>•</span>
                <span>Palakkad Plant &amp; Ernakulam Corporate Hub</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-slate-400">FRP Molded &amp; WPC Solid Composite Doors</span>
                <span className="text-red-400 font-semibold">HSN 3925 / 18% GST</span>
                <span className="text-emerald-400">ISO 9001:2015</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Quick Action Modal */}
      <QuickActionsModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />
    </div>
  );
}
