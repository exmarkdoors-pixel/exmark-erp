'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAuthToken } from '@/lib/api/apiClient';
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
  KeyRound,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  MessageCircle,
  Globe,
  Cloud,
  LayoutGrid,
  Users,
  Target,
  FileSpreadsheet,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';
import { WhatsAppLoginModal } from '@/components/modules/crm/WhatsAppLoginModal';
import { WhatsAppSession, DEFAULT_WHATSAPP_SESSION } from '@/lib/services/whatsappService';
import { CloudServerAccessModal } from '@/components/modules/cloud/CloudServerAccessModal';

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenQuickAction: () => void;
  currentTabName: string;
  userRole?: UserRole;
  actualRole?: UserRole;
  userName?: string;
  userEmail?: string;
  employeeCode?: string;
  hasQuickPin?: boolean;
  credentialModalTrigger?: number;
  onRoleChange?: (role: UserRole) => void;
  onRbacSaved?: (updatedRoles: Record<string, string[]>) => void;
  onCredentialsUpdated?: () => void;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: () => void;
}

interface QuickSearchEntry {
  id: string;
  type: 'Quotation' | 'Lead' | 'Customer' | 'Page';
  title: string;
  subtitle: string;
  targetTab: NavigationTab;
}

const RBAC_MODULE_LABELS: Array<{ id: string; name: string }> = [
  { id: 'dashboard', name: 'Executive Dashboard' },
  { id: 'customers', name: 'Customers & Dealers' },
  { id: 'crm', name: 'CRM & Leads Pipeline' },
  { id: 'quotations', name: 'Quotations & Estimates' },
  { id: 'sales-orders', name: 'Sales Orders Registry' },
  { id: 'sales', name: 'Sales & Returns' },
  { id: 'bom', name: 'BOM & Material Issue' },
  { id: 'production', name: 'Plant Floor & Production' },
  { id: 'quality', name: 'Quality Control (QC)' },
  { id: 'maintenance', name: 'Plant Maintenance' },
  { id: 'job-work', name: 'Job Work & Contractors' },
  { id: 'batch-print', name: '12L Stickers & Batch Print' },
  { id: 'inventory', name: 'Inventory & Stock' },
  { id: 'purchases', name: 'Purchases & Suppliers' },
  { id: 'gate-pass', name: 'Gate Pass' },
  { id: 'dispatch', name: 'Dispatch & Logistics' },
  { id: 'installation', name: 'Site Installation' },
  { id: 'accounts', name: 'Accounts & Vouchers' },
  { id: 'employees', name: 'Employees & Roster' },
  { id: 'marketing', name: 'Marketing Campaigns' },
  { id: 'reports', name: 'Analytics & Reports' },
  { id: 'settings', name: 'System Settings & Security' },
];

const RBAC_ROLE_ORDER: UserRole[] = Object.keys(ERP_ROLES) as UserRole[];

export default function Navbar({
  onOpenMobileSidebar,
  onNavigateTab,
  onOpenQuickAction,
  currentTabName,
  userRole = 'Super Admin',
  actualRole,
  userName = 'Factory Staff',
  userEmail,
  employeeCode,
  hasQuickPin = false,
  credentialModalTrigger = 0,
  onRoleChange,
  onRbacSaved,
  onCredentialsUpdated,
  isSimpleMode = true,
  onToggleSimpleMode,
}: NavbarProps) {
  const router = useRouter();
  const isRealSuperAdmin = actualRole === 'Super Admin';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  // Live Quick Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchEntries, setSearchEntries] = useState<QuickSearchEntry[]>([]);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const loadSearchIndex = useCallback(async () => {
    if (searchLoaded || searchLoading) return;
    setSearchLoading(true);
    try {
      const [qRes, lRes, cRes] = await Promise.all([
        apiFetch('/api/quotations').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/crm/leads').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/customers').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const entries: QuickSearchEntry[] = [];

      // Built-in quick module shortcuts
      const shortcuts: Array<{ title: string; subtitle: string; tab: NavigationTab }> = [
        { title: 'Quotations & Estimates', subtitle: 'Create or edit door quotations', tab: 'quotations' },
        { title: 'CRM & Leads Pipeline', subtitle: 'Leads, follow-ups & bulk import', tab: 'crm' },
        { title: 'Production Floor', subtitle: 'Kanban job cards & molding gangs', tab: 'production' },
        { title: '12L & Thermal Stickers', subtitle: 'Batch door barcode sticker printing', tab: 'batch-print' },
        { title: 'Packing & Dispatch', subtitle: 'Delivery challans & gate passes', tab: 'dispatch' },
        { title: 'Accounts & Payouts', subtitle: 'Cashbook, advances & gang weekly payout', tab: 'accounts' },
        { title: 'Customers & Dealers', subtitle: 'Builder & architect directory', tab: 'customers' },
        { title: 'Settings & Staff Access', subtitle: 'Company bank details, staff logins & RBAC', tab: 'settings' },
      ];
      shortcuts.forEach((s) =>
        entries.push({ id: `page-${s.tab}`, type: 'Page', title: s.title, subtitle: s.subtitle, targetTab: s.tab })
      );

      if (qRes && Array.isArray(qRes.data)) {
        qRes.data.slice(0, 60).forEach((q: any) => {
          entries.push({
            id: `q-${q.id}`,
            type: 'Quotation',
            title: `${q.quotationNumber || q.id} — ${q.customerName || q.clientName || 'Client'}`,
            subtitle: `${q.district || 'Kerala'} • ₹${Number(q.grandTotal || q.totalAmount || 0).toLocaleString('en-IN')}`,
            targetTab: 'quotations',
          });
        });
      }

      if (lRes && Array.isArray(lRes.data)) {
        lRes.data.slice(0, 60).forEach((l: any) => {
          entries.push({
            id: `l-${l.id}`,
            type: 'Lead',
            title: `${l.title || l.client || 'Lead'} (${l.leadCode || 'CRM'})`,
            subtitle: `${l.client || l.contactPerson || ''} • ${l.phone || 'No Phone'} • ${l.district || ''}`,
            targetTab: 'crm',
          });
        });
      }

      if (cRes && Array.isArray(cRes.data)) {
        cRes.data.slice(0, 60).forEach((c: any) => {
          entries.push({
            id: `c-${c.id}`,
            type: 'Customer',
            title: c.name || 'Customer',
            subtitle: `${c.phone || ''} • ${c.district || c.town || 'Kerala'}`,
            targetTab: 'customers',
          });
        });
      }

      setSearchEntries(entries);
      setSearchLoaded(true);
    } finally {
      setSearchLoading(false);
    }
  }, [searchLoaded, searchLoading]);

  // Ctrl+K shortcut & click outside handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
        loadSearchIndex();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [loadSearchIndex]);

  const filteredSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchEntries.filter((e) => e.type === 'Page').slice(0, 6);
    return searchEntries
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchEntries, searchQuery]);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const todayLabel = isMounted
    ? (() => {
        try {
          return new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        } catch {
          return 'Today';
        }
      })()
    : '';

  // Persisted RBAC matrix modal state (Super Admin only)
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);

  // Inbuilt WhatsApp session state & modal
  const [waSession, setWaSession] = useState<WhatsAppSession>(DEFAULT_WHATSAPP_SESSION);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  // Cloud Remote Access Hub state & modal
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/system/cloud-tunnel')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setIsCloudActive(Boolean(data.active && data.tunnelUrl));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/crm/whatsapp/session')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && data.session) {
          setWaSession(data.session);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [rbacLoading, setRbacLoading] = useState(false);
  const [rbacSaving, setRbacSaving] = useState(false);
  const [rbacMessage, setRbacMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [matrixPermissions, setMatrixPermissions] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const [role, cfg] of Object.entries(ERP_ROLES)) {
      initial[role] = [...cfg.allowedModules];
    }
    return initial;
  });

  // Self-service Password / Quick PIN modal state
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [lastTriggerSeen, setLastTriggerSeen] = useState(0);
  const [currentSecret, setCurrentSecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [credSaving, setCredSaving] = useState(false);
  const [credFeedback, setCredFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (credentialModalTrigger > lastTriggerSeen) {
    setLastTriggerSeen(credentialModalTrigger);
    setShowProfileMenu(false);
    setCredFeedback(null);
    setIsCredModalOpen(true);
  }

  const loadRbacMatrix = useCallback(async () => {
    if (!isRealSuperAdmin) return;
    setRbacLoading(true);
    setRbacMessage(null);
    try {
      const res = await apiFetch('/api/auth/rbac');
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setMatrixPermissions(data.data);
      } else {
        setRbacMessage({ type: 'err', text: data.error || 'Could not load RBAC policy.' });
      }
    } catch {
      setRbacMessage({ type: 'err', text: 'Failed to load RBAC matrix from server.' });
    } finally {
      setRbacLoading(false);
    }
  }, [isRealSuperAdmin]);

  const handleOpenRbacModal = () => {
    if (!isRealSuperAdmin) return;
    setIsRbacModalOpen(true);
    loadRbacMatrix();
  };

  const togglePermission = (role: string, modId: string) => {
    if (role === 'Super Admin') return;
    setMatrixPermissions((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(modId)
        ? current.filter((m) => m !== modId)
        : [...current, modId];
      return { ...prev, [role]: updated };
    });
  };

  const handleSaveRbacMatrix = async () => {
    if (!isRealSuperAdmin) return;
    setRbacSaving(true);
    setRbacMessage(null);
    try {
      const res = await apiFetch('/api/auth/rbac', {
        method: 'PUT',
        body: JSON.stringify({ roles: matrixPermissions }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRbacMessage({ type: 'err', text: data.error || 'Failed to save permission matrix.' });
        return;
      }
      if (data.data) {
        setMatrixPermissions(data.data);
        onRbacSaved?.(data.data);
      }
      setRbacMessage({ type: 'ok', text: 'Role permissions saved cleanly to factory storage.' });
      setTimeout(() => {
        setIsRbacModalOpen(false);
      }, 650);
    } catch {
      setRbacMessage({ type: 'err', text: 'Network error saving RBAC matrix.' });
    } finally {
      setRbacSaving(false);
    }
  };

  const handleSaveOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredFeedback(null);

    if (!currentSecret.trim()) {
      setCredFeedback({ type: 'err', text: 'Enter your current password or existing PIN first.' });
      return;
    }
    if (!newPassword.trim() && !newPin.trim()) {
      setCredFeedback({
        type: 'err',
        text: 'Enter a new password, a new 4–6 digit Quick PIN, or both.',
      });
      return;
    }
    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setCredFeedback({ type: 'err', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setCredFeedback({ type: 'err', text: 'New password and confirmation do not match.' });
        return;
      }
    }
    if (newPin.trim() && !/^\d{4,6}$/.test(newPin.trim())) {
      setCredFeedback({ type: 'err', text: 'Quick PIN must be exactly 4 to 6 numeric digits.' });
      return;
    }

    setCredSaving(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentSecret: currentSecret.trim(),
          ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
          ...(newPin.trim() ? { newPin: newPin.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCredFeedback({ type: 'err', text: data.error || 'Could not update credentials.' });
        return;
      }

      setCredFeedback({ type: 'ok', text: data.message || 'Password / PIN updated successfully.' });
      setCurrentSecret('');
      setNewPassword('');
      setConfirmNewPassword('');
      setNewPin('');
      onCredentialsUpdated?.();
      setTimeout(() => {
        setIsCredModalOpen(false);
        setCredFeedback(null);
      }, 900);
    } catch {
      setCredFeedback({ type: 'err', text: 'Network error updating credentials.' });
    } finally {
      setCredSaving(false);
    }
  };

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

  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'EX';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[#0B132B] border-b border-slate-800 shadow-md print:hidden">
      {/* Left: Mobile Toggle + Breadcrumb / Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 whitespace-nowrap">
          {!isSimpleMode && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span>EXMARK</span>
              <span>/</span>
            </div>
          )}
          <h1 className="text-base sm:text-lg font-bold text-white capitalize tracking-tight flex items-center gap-2 whitespace-nowrap">
            {currentTabName}
          </h1>
          {!isSimpleMode && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Ops
            </span>
          )}
        </div>
      </div>

      {/* Center: Interactive Live Quick Search Bar */}
      <div ref={searchContainerRef} className="hidden md:flex items-center flex-1 max-w-md mx-6 relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => {
              setIsSearchOpen(true);
              loadSearchIndex();
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              if (!searchLoaded) loadSearchIndex();
            }}
            placeholder="Quick search: quotations, leads, clients, pages..."
            className="w-full pl-9 pr-14 py-1.5 bg-slate-900/90 text-sm text-slate-200 placeholder-slate-400 rounded-lg border border-slate-700/80 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded">
              Ctrl K
            </kbd>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {isSearchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B132B] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60">
              <span>{searchQuery.trim() ? `Matches for "${searchQuery}"` : 'Quick Jump'}</span>
              {searchLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />}
            </div>

            {filteredSearchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching quotations, leads, or customers found.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
                {filteredSearchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab(item.targetTab);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/80 transition flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          item.type === 'Quotation'
                            ? 'bg-blue-500/15 text-blue-400'
                            : item.type === 'Lead'
                            ? 'bg-amber-500/15 text-amber-400'
                            : item.type === 'Customer'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.type === 'Quotation' ? (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        ) : item.type === 'Lead' ? (
                          <Target className="w-3.5 h-3.5" />
                        ) : item.type === 'Customer' ? (
                          <Users className="w-3.5 h-3.5" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Mode Toggle, Cloud, WhatsApp, Admin Tools, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Simple UI / Full Operations Switcher Pill */}
        {onToggleSimpleMode && (
          <button
            type="button"
            onClick={onToggleSimpleMode}
            title={
              isSimpleMode
                ? 'Simple UI active (7 clean tabs). Click to switch to Full Operations Mode (all 19 modules).'
                : 'Full Operations Mode active. Click to switch to clean Simple UI.'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isSimpleMode
                ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
            }`}
          >
            {isSimpleMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Simple UI</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Full Ops</span>
              </>
            )}
          </button>
        )}

        {/* SUPER ADMIN ONLY: Role View Preview & RBAC Matrix (shown in Full Ops mode to keep Simple UI clean) */}
        {isMounted && isRealSuperAdmin && !isSimpleMode && (
          <>
            {/* Direct Super Admin Access to Mobile Field Operations */}
            <a
              href="/mobile"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition cursor-pointer"
              title="Open Mobile Field App (/mobile) with Fleet GPS Monitor & Universal Measurement"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Field App</span>
            </a>

            <div
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs"
              title="Super Admin View Preview: inspect UI permissions as another role"
            >
              <span className="text-slate-400 font-medium hidden xl:inline">Preview Role:</span>
              <select
                value={userRole}
                onChange={(e) => onRoleChange?.(e.target.value as UserRole)}
                className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer text-xs"
              >
                {RBAC_ROLE_ORDER.map((roleOpt) => (
                  <option key={roleOpt} value={roleOpt} className="bg-slate-900 text-white">
                    {roleOpt}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenRbacModal}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              title="Super Admin: Manage Role-Based Access Control (RBAC) Permissions"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline text-[11px]">Role Matrix</span>
            </button>
          </>
        )}

        {/* Non-Super-Admin read-only role badge */}
        {isMounted && !isRealSuperAdmin && !isSimpleMode && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{userRole}</span>
          </div>
        )}

        {/* Date & Location Pill (Full Ops Mode) */}
        {!isSimpleMode && (
          <div className="hidden 2xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-red-400" />
            <span>{todayLabel || 'Active Shift'}</span>
            <span className="text-slate-600">•</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Kerala Plant</span>
          </div>
        )}

        {/* Inbuilt WhatsApp Live Session Indicator & Quick Pairing */}
        <button
          type="button"
          onClick={() => setIsWaModalOpen(true)}
          title={waSession.connected ? `WhatsApp Linked: ${waSession.phoneNumber} (${waSession.deviceName})` : 'Connect & Pair Inbuilt WhatsApp Web'}
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            waSession.connected
              ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60 shadow-xs'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${waSession.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline font-mono text-[11px]">
            {waSession.connected ? (waSession.phoneNumber ? waSession.phoneNumber.replace('+91 ', '') : 'Linked') : 'WhatsApp'}
          </span>
        </button>

        {/* Cloud Remote Anywhere Access Hub */}
        <button
          type="button"
          onClick={() => setIsCloudModalOpen(true)}
          title={isCloudActive ? 'Cloud Server Active (Global HTTPS Online)' : 'Cloud Server & Remote Multi-Device Access Hub'}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            isCloudActive
              ? 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border-blue-700/60 shadow-xs'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden xl:inline">Cloud</span>
          <span className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
        </button>

        {/* 1-Click Lock / Switch Staff for shared factory floor PCs & tablets */}
        <button
          type="button"
          onClick={handleLogout}
          title="Lock terminal & switch staff user"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Switch Staff</span>
        </button>

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

        {/* User Profile & Session Dropdown */}
        <div className="relative pl-2 border-l border-slate-800">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-slate-800">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight">{userName}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-400 font-semibold">{userRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className="p-3 bg-[#0B132B] border-b border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Signed-In Staff Session
                </span>
                <p className="text-xs font-bold text-white mt-0.5 truncate">{userName}</p>
                {(employeeCode || userEmail) && (
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {employeeCode ? `${employeeCode} • ` : ''}
                    {userEmail || ''}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-500/30">
                    {actualRole || userRole}
                  </span>
                  {hasQuickPin && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PIN Enabled
                    </span>
                  )}
                </div>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setCredFeedback(null);
                    setIsCredModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors text-left"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>My Password / Quick PIN</span>
                </button>

                {isRealSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigateTab('settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors text-left"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Staff Logins &amp; Roles</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock / Switch Staff Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PERSISTED RBAC ROLE PERMISSIONS MATRIX MODAL (SUPER ADMIN ONLY) */}
      {isRbacModalOpen && isRealSuperAdmin && (
        <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-3 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-bold text-white text-sm">
                  Super Admin: Persistent Role-Based Access Control (RBAC) Matrix
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

            <div className="p-5 space-y-3 text-xs overflow-y-auto">
              <p className="text-slate-400">
                Configure module access per factory role. Changes save directly to{' '}
                <code className="text-amber-300">rbac-roles.json</code> and enforce immediately across
                API routes and staff screens:
              </p>

              {rbacMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                    rbacMessage.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {rbacMessage.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{rbacMessage.text}</span>
                </div>
              )}

              {rbacLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading persisted role policy...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0b1120] text-slate-300 font-bold border-b border-slate-800">
                        <th className="p-2.5 sticky left-0 bg-[#0b1120] min-w-[190px]">
                          System Module
                        </th>
                        {RBAC_ROLE_ORDER.map((role) => (
                          <th key={role} className="p-2 text-center whitespace-nowrap text-[11px]">
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {RBAC_MODULE_LABELS.map((mod) => (
                        <tr key={mod.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-2.5 font-semibold text-white sticky left-0 bg-[#111827] border-r border-slate-800/60">
                            {mod.name}
                          </td>
                          {RBAC_ROLE_ORDER.map((role) => {
                            const isSuper = role === 'Super Admin';
                            const isChecked =
                              isSuper || (matrixPermissions[role] || []).includes(mod.id);
                            return (
                              <td key={role} className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isSuper}
                                  onChange={() => togglePermission(role, mod.id)}
                                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0 disabled:opacity-60"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Super Admin always retains Executive Dashboard, Employees, and Settings access.
              </span>
              <button
                type="button"
                onClick={handleSaveRbacMatrix}
                disabled={rbacSaving || rbacLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {rbacSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Permission Matrix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELF-SERVICE MY PASSWORD / QUICK PIN MODAL */}
      {isCredModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-[85] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Update My Password &amp; Quick PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCredModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOwnCredentials} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                <div className="font-bold text-white">{userName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {actualRole || userRole}
                  {employeeCode ? ` • ${employeeCode}` : ''}
                </div>
              </div>

              {credFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 ${
                    credFeedback.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {credFeedback.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{credFeedback.text}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Current Password or PIN *
                </label>
                <input
                  type="password"
                  value={currentSecret}
                  onChange={(e) => setCurrentSecret(e.target.value)}
                  placeholder="Verify current password or PIN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  New Password (min 6 chars, optional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {newPassword.trim().length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  New 4–6 Digit Quick PIN (optional)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={hasQuickPin ? '•••• (leave blank to keep current PIN)' : 'Set 4–6 digit floor PIN'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCredModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={credSaving}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {credSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Inbuilt WhatsApp Device Pairing & Session Modal */}
      <WhatsAppLoginModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        session={waSession}
        onSessionUpdated={(updated) => setWaSession(updated)}
      />

      {/* Cloud Server & Anywhere Multi-Device Access Modal */}
      <CloudServerAccessModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />
    </header>
  );
}
