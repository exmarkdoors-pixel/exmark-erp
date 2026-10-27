'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
}

export default function Navbar({
  onOpenMobileSidebar,
  onNavigateTab,
  onOpenQuickAction,
  currentTabName,
  userRole = 'Super Admin',
  userName = 'Nazer Karumban',
}: NavbarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[#0B132B] border-b border-slate-800 shadow-md">
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
    </header>
  );
}
