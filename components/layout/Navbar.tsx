'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuthToken } from '@/lib/api/apiClient';
import {
  Menu,
  Search,
  Bell,
  PlusCircle,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  PackageCheck,
  Shield,
  LogOut,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { UserRole } from '@/lib/auth/roles';

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenQuickAction: () => void;
  currentTabName: string;
  userRole?: UserRole;
  userName?: string;
  onRoleChange?: (role: UserRole) => void;
}

export default function Navbar({
  onOpenMobileSidebar,
  onNavigateTab,
  onOpenQuickAction,
  currentTabName,
  userRole = 'Super Admin',
  userName = 'Nazer Karumban',
  onRoleChange,
}: NavbarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [matrixPermissions, setMatrixPermissions] = useState<Record<string, string[]>>({
    'Super Admin': ['crm', 'quotations', 'measurements', 'sales-orders', 'bom', 'production', 'accounts', 'batch-print'],
    'Plant Supervisor': ['measurements', 'sales-orders', 'bom', 'production', 'batch-print'],
    'Site Engineer': ['crm', 'quotations', 'measurements'],
    'Accounts': ['sales-orders', 'accounts', 'batch-print'],
    'QC Inspector': ['measurements', 'production', 'batch-print'],
  });

  const togglePermission = (role: string, modId: string) => {
    if (role === 'Super Admin') return; // Super admin has full access
    setMatrixPermissions((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(modId)
        ? current.filter((m) => m !== modId)
        : [...current, modId];
      return { ...prev, [role]: updated };
    });
  };

  // Prevent hydration mismatch: interactive/dynamic elements only render on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthToken();
      router.push('/login');
      router.refresh();
    }
  };

  const notifications = [
    {
      id: 1,
      title: 'High-Value FRP Quote Requested',
      description: 'Malabar Luxury Builders requested 32mm Teak finish door quote.',
      time: '12m ago',
      type: 'quote',
      urgent: true,
    },
    {
      id: 2,
      title: 'WPC Extrusion Batch Finished',
      description: '45 waterproof bathroom door cores calibrated and sent to QA.',
      time: '34m ago',
      type: 'production',
      urgent: false,
    },
    {
      id: 3,
      title: 'Dispatch Vehicle En Route',
      description: 'Truck KL-09-AH-4122 departed for Kakkanad / Kochi delivery.',
      time: '1h ago',
      type: 'dispatch',
      urgent: false,
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[#0B132B] border-b border-slate-800 shadow-md print:hidden">
      {/* Left: Mobile Toggle + Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>EXMARK</span>
            <span>/</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white capitalize tracking-tight flex items-center gap-2">
            {currentTabName}
          </h1>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Live Ops
          </span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders, dealers, door specs, HSN..."
            className="w-full pl-9 pr-12 py-1.5 bg-slate-900/90 text-sm text-slate-200 placeholder-slate-400 rounded-lg border border-slate-700/80 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right: Actions, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* ACTIVE ROLE SELECTOR DROPDOWN — client-only to prevent hydration mismatch */}
        {isMounted && (
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
            <span className="text-slate-400 font-medium hidden lg:inline">Active Role:</span>
            <select
              value={userRole}
              onChange={(e) => onRoleChange?.(e.target.value as UserRole)}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="Super Admin" className="bg-slate-900 text-white">👑 Super Admin</option>
              <option value="Plant Supervisor" className="bg-slate-900 text-white">🏭 Plant Supervisor</option>
              <option value="Site Engineer" className="bg-slate-900 text-white">📐 Site Engineer</option>
              <option value="Accounts" className="bg-slate-900 text-white">💰 Accounts & Billing</option>
              <option value="QC Inspector" className="bg-slate-900 text-white">🔍 QC Inspector</option>
            </select>
          </div>
        )}

        {/* RBAC PERMISSIONS MATRIX TRIGGER */}
        <button
          onClick={() => setIsRbacModalOpen(true)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
          title="Super Admin: Manage Role-Based Access Control (RBAC) Permissions"
        >
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline text-[11px]">Role Matrix</span>
        </button>

        {/* Date & Location Pill (Hidden on Mobile) */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-red-400" />
          <span>27 Oct 2026</span>
          <span className="text-slate-600">•</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Kerala Plant</span>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={onOpenQuickAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-lg shadow-sm shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Action</span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {!notificationsRead && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0B132B]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 bg-[#0B132B] border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">Notifications</span>
                  <span className="px-1.5 py-0.2 text-[10px] bg-red-600/80 text-white rounded-full font-bold">
                    3 New
                  </span>
                </div>
                <button
                  onClick={() => setNotificationsRead(true)}
                  className="text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  Mark read
                </button>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 hover:bg-slate-800/60 transition-colors flex items-start gap-3"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        item.urgent
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {item.type === 'quote' && <FileText className="w-3.5 h-3.5" />}
                      {item.type === 'production' && <Sparkles className="w-3.5 h-3.5" />}
                      {item.type === 'dispatch' && <PackageCheck className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{item.time}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-slate-950 text-center border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigateTab('crm');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1"
                >
                  View all factory alerts & tasks &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Dropdown */}
        <div className="relative pl-2 border-l border-slate-800">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-slate-800">
              {userName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight">
                {userName}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-400 font-semibold">
                  {userRole}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className="p-3 bg-[#0B132B] border-b border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Role Profile:</span>
                <p className="text-xs font-bold text-white mt-0.5">{userName}</p>
                <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-500/30">
                  {userRole}
                </span>
              </div>

              <div className="p-1 space-y-0.5 text-xs">
                <Link
                  href="/login"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span>Switch Role / Sign In</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RBAC ROLE PERMISSIONS MATRIX MODAL */}
      {isRbacModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-3 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-bold text-white text-sm">
                  Super Admin: Role-Based Access Control (RBAC) Permissions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRbacModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <p className="text-slate-400">
                സൂപ്പർ അഡ്മിന് ഓരോ റോളിനും (Plant Supervisor, Site Engineer, Accounts, QC Inspector) ആക്സസ് ചെയ്യാവുന്ന മോഡ്യൂളുകൾ ടിക്ക് ചെയ്ത് നൽകാം:
              </p>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b1120] text-slate-300 font-bold border-b border-slate-800">
                      <th className="p-2.5">System Module</th>
                      <th className="p-2.5 text-center">Super Admin</th>
                      <th className="p-2.5 text-center">Plant Supervisor</th>
                      <th className="p-2.5 text-center">Site Engineer</th>
                      <th className="p-2.5 text-center">Accounts</th>
                      <th className="p-2.5 text-center">QC Inspector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {[
                      { id: 'crm', name: 'CRM & Leads Pipeline' },
                      { id: 'quotations', name: 'Quotations & Estimates' },
                      { id: 'measurements', name: 'Door Measurement Book' },
                      { id: 'sales-orders', name: 'Sales Orders Registry' },
                      { id: 'bom', name: 'BOM & Material Issue' },
                      { id: 'production', name: 'Plant Floor & Production' },
                      { id: 'accounts', name: 'Accounts, GST & Vouchers' },
                      { id: 'batch-print', name: '12L Stickers & Batch Print' },
                    ].map((mod) => (
                      <tr key={mod.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-bold text-white">{mod.name}</td>
                        {['Super Admin', 'Plant Supervisor', 'Site Engineer', 'Accounts', 'QC Inspector'].map(
                          (role) => {
                            const isSuper = role === 'Super Admin';
                            const isChecked = isSuper || (matrixPermissions[role] || []).includes(mod.id);
                            return (
                              <td key={role} className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isSuper}
                                  onChange={() => togglePermission(role, mod.id)}
                                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0 disabled:opacity-75"
                                />
                              </td>
                            );
                          }
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Changes apply immediately upon role switching
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRbacModalOpen(false);
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Permission Matrix (അനുമതികൾ സൂക്ഷിക്കുക)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
