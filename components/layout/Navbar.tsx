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
  Building2,
  Boxes,
  ShoppingCart,
} from 'lucide-react';
import { NavigationTab } from '@/types/erp';
import {
  UniversalSearchEntry,
  UniversalSearchResultType,
  searchUniversalCatalog,
} from '@/lib/utils/universalSearchIndex';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';
import { WhatsAppLoginModal } from '@/components/modules/crm/WhatsAppLoginModal';
import { WhatsAppSession, DEFAULT_WHATSAPP_SESSION } from '@/lib/services/whatsappService';
import { CloudServerAccessModal } from '@/components/modules/cloud/CloudServerAccessModal';
import { CreateCompanyModal } from '@/components/company/CreateCompanyModal';
import type { CompanySummary } from '@/types/companyRegistry';

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

const RBAC_MODULE_LABELS: Array<{ id: string; name: string }> = [
  { id: 'dashboard', name: 'Executive Dashboard' },
  { id: 'customers', name: 'Customers & Dealers' },
  { id: 'crm', name: 'CRM & Leads Pipeline' },
  { id: 'quotations', name: 'Quotations & Estimates' },
  { id: 'measurements', name: 'Site Measurements' },
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
  { id: 'mobile-field', name: 'Mobile Field Ops & GPS' },
  { id: 'accounts', name: 'Accounts & Vouchers' },
  { id: 'finance', name: 'Financial & Evening Close' },
  { id: 'daily-closing', name: 'Evening Close Register' },
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

  // Multi-Company Switcher state
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [activeCompany, setActiveCompany] = useState<CompanySummary | null>(null);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [switchingCompanyId, setSwitchingCompanyId] = useState<string | null>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await apiFetch('/api/companies');
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && json.data) {
        setCompanies(Array.isArray(json.data.companies) ? json.data.companies : []);
        setActiveCompany(json.data.activeCompany || null);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setShowCompanyMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === activeCompany?.id) {
      setShowCompanyMenu(false);
      return;
    }
    setSwitchingCompanyId(companyId);
    try {
      const res = await apiFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SWITCH', companyId }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setShowCompanyMenu(false);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch {
      // ignore
    } finally {
      setSwitchingCompanyId(null);
    }
  };

  // Live Universal Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [dynamicEntries, setDynamicEntries] = useState<UniversalSearchEntry[]>([]);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const loadSearchIndex = useCallback(async () => {
    if (searchLoading) return;
    setSearchLoading(true);
    try {
      const [prodRes, qRes, custRes, invRes, poRes, lRes] = await Promise.all([
        apiFetch('/api/production').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/quotations').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/customers').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/inventory').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/purchases').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/crm/leads').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const entries: UniversalSearchEntry[] = [];

      // 1. Production Orders & Job Cards
      if (prodRes?.data && Array.isArray(prodRes.data)) {
        prodRes.data.slice(0, 80).forEach((order: any) => {
          const jc = order.jobCardNumber || order.prodOrderNumber || order.id;
          const cust = order.customerName || 'Client';
          const doorsCount = order.doors?.length || order.quantity || 1;
          const stage = order.status || 'QUEUED';
          entries.push({
            id: `prod-${order.id}`,
            type: 'JOB_CARD',
            title: `${jc} — ${cust}`,
            subtitle: `${doorsCount} Door(s) • Stage: ${stage} • ${order.siteName || order.district || 'Factory Floor'}`,
            targetTab: 'production',
            categoryLabel: 'Job Cards & Production',
            keywords: [jc.toLowerCase(), cust.toLowerCase(), stage.toLowerCase(), 'job card', 'order', 'door', 'ജോബ് കാർഡ്'],
            code: jc,
            badge: stage,
          });
        });
      }

      // 2. Quotations & Estimates
      if (qRes?.data && Array.isArray(qRes.data)) {
        qRes.data.slice(0, 60).forEach((q: any) => {
          const qNum = q.quotationNumber || q.id;
          const cust = q.customerName || q.clientName || 'Client';
          const amt = Number(q.grandTotal || q.totalAmount || 0);
          entries.push({
            id: `q-${q.id}`,
            type: 'QUOTATION',
            title: `${qNum} — ${cust}`,
            subtitle: `₹${amt.toLocaleString('en-IN')} • ${q.district || 'Kerala'} • Status: ${q.status || 'Draft'}`,
            targetTab: 'quotations',
            categoryLabel: 'Quotations & Estimates',
            keywords: [qNum.toLowerCase(), cust.toLowerCase(), 'quotation', 'estimate', 'കൊട്ടേഷൻ'],
            code: qNum,
            badge: `₹${amt.toLocaleString('en-IN')}`,
          });
        });
      }

      // 3. Customers & Parties
      if (custRes?.data && Array.isArray(custRes.data)) {
        custRes.data.slice(0, 80).forEach((c: any) => {
          const name = c.name || 'Customer';
          const town = c.district || c.town || 'Kerala';
          const phone = c.phone || '';
          entries.push({
            id: `cust-${c.id}`,
            type: 'CUSTOMER',
            title: name,
            subtitle: `${phone ? `${phone} • ` : ''}${town} • ${c.type || 'Customer'}`,
            targetTab: 'customers',
            categoryLabel: 'Customers & Dealers',
            keywords: [name.toLowerCase(), phone.toLowerCase(), town.toLowerCase(), 'party', 'dealer', 'client', 'പാർട്ടി'],
            code: c.customerCode || c.id,
            badge: c.type || 'Dealer',
          });
        });
      }

      // 4. Raw Materials & Stock Items
      if (invRes?.data && Array.isArray(invRes.data)) {
        invRes.data.slice(0, 60).forEach((item: any) => {
          const code = item.itemCode || item.id;
          const name = item.name || 'Raw Material';
          const stock = Number(item.currentStock) || 0;
          const unit = item.unit || 'Units';
          entries.push({
            id: `inv-${item.id}`,
            type: 'STOCK_MATERIAL',
            title: `${name} (${code})`,
            subtitle: `Stock: ${stock} ${unit} • Category: ${item.category || 'Store'} • Loc: ${item.warehouseLocation || 'Rack'}`,
            targetTab: 'inventory',
            categoryLabel: 'Raw Materials & Stock',
            keywords: [name.toLowerCase(), code.toLowerCase(), (item.category || '').toLowerCase(), 'stock', 'store', 'material', 'റോ മെറ്റീരിയൽ'],
            code,
            badge: `${stock} ${unit}`,
          });
        });
      }

      // 5. Purchases & Suppliers
      if (poRes?.data && Array.isArray(poRes.data)) {
        poRes.data.slice(0, 50).forEach((po: any) => {
          const poNum = po.poNumber || po.id;
          const vendor = po.vendorName || 'Supplier';
          const amt = Number(po.totalAmount || 0);
          entries.push({
            id: `po-${po.id}`,
            type: 'PURCHASE_ORDER',
            title: `${poNum} — ${vendor}`,
            subtitle: `₹${amt.toLocaleString('en-IN')} • Status: ${po.status || 'Draft'} • ${po.items?.length || 0} item(s)`,
            targetTab: 'purchases',
            categoryLabel: 'Purchases & Suppliers',
            keywords: [poNum.toLowerCase(), vendor.toLowerCase(), 'po', 'purchase', 'supplier', 'പർച്ചേസ്'],
            code: poNum,
            badge: po.status || 'PO',
          });
        });
      }

      // 6. CRM Leads
      if (lRes?.data && Array.isArray(lRes.data)) {
        lRes.data.slice(0, 50).forEach((l: any) => {
          const title = l.title || l.client || 'Lead';
          const phone = l.phone || '';
          entries.push({
            id: `lead-${l.id}`,
            type: 'CRM_LEAD',
            title: `${title} (${l.leadCode || 'CRM'})`,
            subtitle: `${phone ? `${phone} • ` : ''}${l.district || 'Kerala'} • Stage: ${l.status || 'New'}`,
            targetTab: 'crm',
            categoryLabel: 'CRM & Leads',
            keywords: [title.toLowerCase(), phone.toLowerCase(), 'lead', 'crm', 'ലീഡ്'],
            code: l.leadCode || l.id,
            badge: l.status || 'Lead',
          });
        });
      }

      setDynamicEntries(entries);
      setSearchLoaded(true);
    } catch (err) {
      console.warn('[Navbar] Search dynamic background preload non-fatal warning:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [searchLoading]);

  // Eagerly preload dynamic entities on mount
  useEffect(() => {
    loadSearchIndex();
  }, [loadSearchIndex]);

  // Ctrl+K shortcut & click outside handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        mobileSearchInputRef.current?.focus();
        setIsSearchOpen(true);
        if (!searchLoaded) loadSearchIndex();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
        mobileSearchInputRef.current?.blur();
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
  }, [loadSearchIndex, searchLoaded]);

  // High-performance search ranking
  const filteredSearchResults = useMemo(() => {
    return searchUniversalCatalog(searchQuery, dynamicEntries);
  }, [searchQuery, dynamicEntries]);

  // Reset highlight index on query change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleSearchNavigate = (item: UniversalSearchEntry) => {
    onNavigateTab(item.targetTab);
    setIsSearchOpen(false);
    setSearchQuery('');
  };
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 md:px-4 bg-[#0B132B] border-b border-slate-800 shadow-sm print:hidden">
      {/* Left: Mobile Toggle + Breadcrumb / Title */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Mobile Search Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen(true);
            setTimeout(() => {
              mobileSearchInputRef.current?.focus();
            }, 50);
          }}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 md:hidden focus:outline-none cursor-pointer"
          aria-label="Quick Search"
          title="Search all modules & records (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-300" />
        </button>

        <div className="flex items-center gap-2 whitespace-nowrap">
          {!isSimpleMode && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <span>EXMARK</span>
              <span>/</span>
            </div>
          )}
          <h1 className="text-sm sm:text-base font-bold text-white capitalize tracking-tight flex items-center gap-1.5 whitespace-nowrap">
            {currentTabName}
          </h1>

          {/* Multi-Company Switcher + Create New Company Dropdown */}
          <div ref={companyMenuRef} className="relative ml-0.5">
            <button
              type="button"
              onClick={() => setShowCompanyMenu((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-bold text-emerald-300 transition cursor-pointer max-w-[175px]"
              title="Switch Company or Create New Company"
            >
              <Building2 className="w-3 h-3 shrink-0 text-emerald-400" />
              <span className="truncate">{activeCompany?.brandName || 'EXMARK Doors'}</span>
              <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
            </button>

            {showCompanyMenu && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#0B132B] border border-slate-700 shadow-2xl overflow-hidden z-50">
                <div className="px-3.5 py-2.5 bg-[#070D1E] border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Companies ({companies.length || 1})
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Isolated Books</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/70">
                  {companies.map((comp) => {
                    const isActive = comp.id === activeCompany?.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        disabled={switchingCompanyId !== null}
                        onClick={() => handleSwitchCompany(comp.id)}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                          isActive ? 'bg-emerald-500/10' : 'hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{comp.brandName}</span>
                            {comp.isDefault && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">Primary</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {comp.businessType} • {comp.gstEnabled ? 'GST ON' : 'Non-GST'}
                          </div>
                        </div>
                        {switchingCompanyId === comp.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                        ) : isActive ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="p-2 bg-[#070D1E] border-t border-slate-800 space-y-1.5">
                  {(isRealSuperAdmin || userRole === 'Super Admin' || userRole === 'Management') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCompanyMenu(false);
                        setIsCreateCompanyOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Create New Company</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompanyMenu(false);
                      onNavigateTab('settings');
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                  >
                    Manage Companies in Settings
                  </button>
                </div>
              </div>
            )}
          </div>
          {!isSimpleMode && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Ops
            </span>
          )}
        </div>
      </div>

      {/* Center: Interactive Live Universal Search Bar */}
      <div ref={searchContainerRef} className="hidden md:flex items-center flex-1 max-w-lg mx-6 relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => {
              setIsSearchOpen(true);
              if (!searchLoaded) loadSearchIndex();
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              if (!searchLoaded) loadSearchIndex();
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1 < filteredSearchResults.length ? prev + 1 : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredSearchResults.length - 1)));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = filteredSearchResults[highlightedIndex];
                if (selected) handleSearchNavigate(selected);
              } else if (e.key === 'Escape') {
                setIsSearchOpen(false);
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Search all: Stock, Stickers, Job Cards, Quotes, Accounts (e.g. S, A, 12L)..."
            className="w-full pl-9 pr-14 py-1.5 bg-slate-900/90 text-sm text-slate-200 placeholder-slate-400 rounded-lg border border-slate-700/80 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all font-medium"
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
            <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 font-medium">
              <span className="flex items-center gap-1.5">
                {searchQuery.trim() ? (
                  <>
                    <span>Matches for &quot;<strong className="text-white">{searchQuery}</strong>&quot;</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-mono text-[10px]">
                      {filteredSearchResults.length} found
                    </span>
                  </>
                ) : (
                  <span>Quick Navigation &amp; Common Shortcuts</span>
                )}
              </span>
              {searchLoading && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Indexing...</span>
                </span>
              )}
            </div>

            {filteredSearchResults.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">No matching modules, orders or materials found.</div>
                <div className="text-[11px] text-slate-500">
                  Try typing &quot;s&quot; for Stock/Stickers/Sales, &quot;a&quot; for Accounts, or customer names.
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
                {filteredSearchResults.map((item, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  const renderIcon = () => {
                    switch (item.type) {
                      case 'MODULE':
                        return <LayoutGrid className="w-4 h-4 text-cyan-400 shrink-0" />;
                      case 'FEATURE':
                        return <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />;
                      case 'JOB_CARD':
                        return <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
                      case 'QUOTATION':
                        return <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />;
                      case 'CUSTOMER':
                        return <Users className="w-4 h-4 text-indigo-400 shrink-0" />;
                      case 'STOCK_MATERIAL':
                        return <Boxes className="w-4 h-4 text-orange-400 shrink-0" />;
                      case 'PURCHASE_ORDER':
                        return <ShoppingCart className="w-4 h-4 text-rose-400 shrink-0" />;
                      case 'CRM_LEAD':
                        return <Target className="w-4 h-4 text-yellow-400 shrink-0" />;
                      default:
                        return <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />;
                    }
                  };

                  const getBadgeClass = () => {
                    switch (item.type) {
                      case 'MODULE':
                        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
                      case 'FEATURE':
                        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
                      case 'JOB_CARD':
                        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
                      case 'QUOTATION':
                        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
                      case 'CUSTOMER':
                        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
                      case 'STOCK_MATERIAL':
                        return 'bg-orange-950/80 text-orange-300 border-orange-700/60';
                      case 'PURCHASE_ORDER':
                        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
                      case 'CRM_LEAD':
                        return 'bg-yellow-950/80 text-yellow-300 border-yellow-700/60';
                      default:
                        return 'bg-slate-900 text-slate-400 border-slate-700';
                    }
                  };

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSearchNavigate(item)}
                      className={`w-full px-3.5 py-2.5 text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                        isHighlighted
                          ? 'bg-blue-600/25 border-l-2 border-blue-400'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          {renderIcon()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{item.title}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase ${getBadgeClass()}`}>
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-3 py-1.5 bg-[#070D1E] border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>↑↓ to navigate • ↵ to select • ESC to close</span>
              <span>All 24 ERP Modules Indexed</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Search Overlay Modal */}
      {isSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 p-3 bg-black/85 backdrop-blur-sm flex flex-col justify-start">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden mt-1">
            <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-[#070D1E]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={mobileSearchInputRef}
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules, job cards, stock (S, A, 12L)..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="px-2 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg ml-1"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-800/60 p-1">
              {filteredSearchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching modules, orders or materials found.
                </div>
              ) : (
                filteredSearchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSearchNavigate(item)}
                    className="w-full p-2.5 text-left hover:bg-slate-800/80 rounded-xl transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 shrink-0">
                      {item.type.replace('_', ' ')}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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

        {/* SUPER ADMIN DIRECT ACCESS: Mobile Field App (Available in BOTH Simple Mode & Full Ops Mode) */}
        {isMounted && isRealSuperAdmin && (
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
        )}

        {/* SUPER ADMIN ONLY: Role View Preview & RBAC Matrix (shown in Full Ops mode to keep Simple UI clean) */}
        {isMounted && isRealSuperAdmin && !isSimpleMode && (
          <>
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
                Super Admin always retains unrestricted access across all ERP modules (Financial, Accounts, Evening Close, Mobile Field Ops &amp; Settings).
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

      {/* Create New Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onCreated={() => {
          loadCompanies();
        }}
      />
    </header>
  );
}
