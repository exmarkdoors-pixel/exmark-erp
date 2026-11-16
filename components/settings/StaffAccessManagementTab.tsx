'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';

export interface SafeFactoryUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  employeeCode?: string;
  plantLocation?: string;
  phone?: string;
  customAllowedModules?: string[] | null;
  customPasswordSet?: boolean;
  mustChangePassword?: boolean;
  hasQuickPin?: boolean;
  isActive?: boolean;
  isDemoPlaceholder?: boolean;
  lastLoginAt?: string;
  updatedAt?: string;
}

interface AuthSecurityConfig {
  requireLoginOnAllDevices: boolean;
  showLanStaffPicker: boolean;
  updatedAt?: string;
}

interface StaffAccessManagementTabProps {
  currentUserId?: string;
}

const ROLE_OPTIONS: UserRole[] = Object.keys(ERP_ROLES) as UserRole[];

const ALL_MODULE_CHOICES: Array<{ id: string; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Customers' },
  { id: 'crm', label: 'CRM Leads' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'sales-orders', label: 'Sales Orders' },
  { id: 'sales', label: 'Sales & Billing' },
  { id: 'production', label: 'Production Board' },
  { id: 'bom', label: 'BOQ / BOM' },
  { id: 'batch-print', label: '12L Sticker Print' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'installation', label: 'Site Installation' },
  { id: 'accounts', label: 'Accounts & Daybook' },
  { id: 'employees', label: 'Employees Roster' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

interface DepartmentPreset {
  id: string;
  label: string;
  role: UserRole;
  department: string;
  credentialMode: 'PIN_ONLY' | 'BOTH' | 'PASSWORD_ONLY';
}

const STAFF_DEPARTMENT_PRESETS: DepartmentPreset[] = [
  { id: 'molding', label: 'Molding Lead', role: 'Production', department: 'Molding Section', credentialMode: 'PIN_ONLY' },
  { id: 'door-cut', label: 'Door Cutting & Finishing', role: 'Production', department: 'Door Cutting & Finishing', credentialMode: 'PIN_ONLY' },
  { id: 'frame-cut', label: 'Frame Cutting & Finishing', role: 'Production', department: 'Frame Cutting & Finishing', credentialMode: 'PIN_ONLY' },
  { id: 'paint', label: 'Grains & Painting', role: 'Production', department: 'Grains & Painting', credentialMode: 'PIN_ONLY' },
  { id: 'store', label: 'Store & Inventory', role: 'Inventory', department: 'Raw Materials & Hardware Store', credentialMode: 'BOTH' },
  { id: 'purchase', label: 'Purchase Officer', role: 'Purchase', department: 'Procurement', credentialMode: 'PASSWORD_ONLY' },
  { id: 'sales', label: 'Sales & Quotations', role: 'Sales', department: 'Sales & Dealer Desk', credentialMode: 'BOTH' },
  { id: 'accounts', label: 'Accounts & Billing', role: 'Accounts', department: 'Accounts & Daybook', credentialMode: 'PASSWORD_ONLY' },
  { id: 'site', label: 'Site & Fitting', role: 'Installation', department: 'Site Measurement & Fitting', credentialMode: 'PIN_ONLY' },
  { id: 'supervisor', label: 'Supervisor / Management', role: 'Plant Supervisor', department: 'Management', credentialMode: 'BOTH' },
];

interface StaffLoginPassSlip {
  name: string;
  employeeCode: string;
  identifier: string;
  role: UserRole;
  department: string;
  pin?: string;
  password?: string;
  allowedModules: string[];
  lanUrl: string;
}

export default function StaffAccessManagementTab({
  currentUserId,
}: StaffAccessManagementTabProps) {
  const [users, setUsers] = useState<SafeFactoryUserView[]>([]);
  const [securityConfig, setSecurityConfig] = useState<AuthSecurityConfig>({
    requireLoginOnAllDevices: true,
    showLanStaffPicker: true,
  });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Create / Edit Staff Login Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeFactoryUserView | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Production');
  const [formCode, setFormCode] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPin, setFormPin] = useState('');
  const [clearExistingPin, setClearExistingPin] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [credentialMode, setCredentialMode] = useState<'PIN_ONLY' | 'BOTH' | 'PASSWORD_ONLY'>('PIN_ONLY');
  const [syncToRoster, setSyncToRoster] = useState(true);
  const [mustChangePass, setMustChangePass] = useState(false);
  const [moduleOverrideMode, setModuleOverrideMode] = useState<'ROLE_DEFAULT' | 'CUSTOM'>('ROLE_DEFAULT');
  const [customModules, setCustomModules] = useState<string[]>(ERP_ROLES.Production.allowedModules);
  const [loginPassSlip, setLoginPassSlip] = useState<StaffLoginPassSlip | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/users');
      const data = await res.json();
      if (!res.ok || !data.success) {
        showBanner('err', data.error || 'Could not load factory staff accounts.');
        return;
      }
      setUsers(Array.isArray(data.data) ? data.data : []);
      if (data.securityConfig) {
        setSecurityConfig(data.securityConfig);
      }
    } catch {
      showBanner('err', 'Network error loading factory staff accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/auth/users')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || !data.success) {
          setBanner({ type: 'err', text: data.error || 'Could not load factory staff accounts.' });
          return;
        }
        setUsers(Array.isArray(data.data) ? data.data : []);
        if (data.securityConfig) {
          setSecurityConfig(data.securityConfig);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBanner({ type: 'err', text: 'Network error loading factory staff accounts.' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const demoPlaceholderCount = useMemo(
    () => users.filter((u) => u.isDemoPlaceholder && !u.customPasswordSet).length,
    [users]
  );

  const superAdminUser = useMemo(
    () => users.find((u) => u.role === 'Super Admin'),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.name, u.email, u.employeeCode, u.department, u.phone, u.role]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [users, searchQuery, roleFilter]);

  const suggestNextStaffCode = () => {
    let maxNum = 10;
    for (const u of users) {
      const match = u.employeeCode?.match(/EXM-EMP-(\d+)/i);
      if (match) {
        const n = Number(match[1]);
        if (Number.isFinite(n) && n > maxNum) maxNum = n;
      }
    }
    return `EXM-EMP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('Production');
    setFormCode(suggestNextStaffCode());
    setFormDepartment('Door Cutting & Finishing');
    setFormPhone('');
    setFormPassword('');
    setFormPin('');
    setClearExistingPin(false);
    setFormIsActive(true);
    setCredentialMode('PIN_ONLY');
    setSyncToRoster(true);
    setMustChangePass(false);
    setModuleOverrideMode('ROLE_DEFAULT');
    setCustomModules([...ERP_ROLES.Production.allowedModules]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: SafeFactoryUserView) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormCode(user.employeeCode || '');
    setFormDepartment(user.department || '');
    setFormPhone(user.phone || '');
    setFormPassword('');
    setFormPin('');
    setClearExistingPin(false);
    setFormIsActive(user.isActive !== false);
    setCredentialMode('BOTH');
    setSyncToRoster(true);
    setMustChangePass(Boolean(user.mustChangePassword));
    if (Array.isArray(user.customAllowedModules)) {
      setModuleOverrideMode('CUSTOM');
      setCustomModules(user.customAllowedModules);
    } else {
      setModuleOverrideMode('ROLE_DEFAULT');
      setCustomModules([...(ERP_ROLES[user.role]?.allowedModules || ['dashboard'])]);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const applyDepartmentPreset = (preset: DepartmentPreset) => {
    setFormRole(preset.role);
    setFormDepartment(preset.department);
    setCredentialMode(preset.credentialMode);
    if (moduleOverrideMode === 'ROLE_DEFAULT') {
      setCustomModules([...(ERP_ROLES[preset.role]?.allowedModules || ['dashboard'])]);
    }
  };

  const handleGeneratePin = () => {
    const generated = String(Math.floor(1000 + Math.random() * 9000));
    setFormPin(generated);
    setClearExistingPin(false);
  };

  const toggleCustomModule = (moduleId: string) => {
    if (moduleId === 'dashboard') return;
    setCustomModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSaveStaffUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Staff Name is required.');
      return;
    }

    const usePassword = credentialMode === 'PASSWORD_ONLY' || credentialMode === 'BOTH';
    const usePin = credentialMode === 'PIN_ONLY' || credentialMode === 'BOTH';

    if (!editingUser) {
      if (credentialMode === 'PIN_ONLY' && !/^\d{4,6}$/.test(formPin.trim())) {
        setFormError('Enter a 4–6 digit Quick PIN for shop-floor PIN login.');
        return;
      }
      if (credentialMode === 'PASSWORD_ONLY' && formPassword.trim().length < 6) {
        setFormError('Password must be at least 6 characters long.');
        return;
      }
      if (credentialMode === 'BOTH' && formPassword.trim().length < 6 && !/^\d{4,6}$/.test(formPin.trim())) {
        setFormError('Provide at least a 6+ char Password or a 4–6 digit Quick PIN.');
        return;
      }
    }

    if (usePassword && formPassword.trim() && formPassword.trim().length < 6) {
      setFormError('Password must be at least 6 characters when provided.');
      return;
    }
    if (usePin && formPin.trim() && !/^\d{4,6}$/.test(formPin.trim())) {
      setFormError('Quick PIN must be 4 to 6 numeric digits.');
      return;
    }

    setBusyAction('save-user');
    try {
      const payload: Record<string, unknown> = {
        action: 'UPSERT_USER',
        id: editingUser?.id,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        department: formDepartment.trim(),
        employeeCode: formCode.trim(),
        phone: formPhone.trim(),
        isActive: formIsActive,
        mustChangePassword: mustChangePass,
        syncToEmployeeRoster: syncToRoster,
        customAllowedModules:
          moduleOverrideMode === 'CUSTOM' ? Array.from(new Set(['dashboard', ...customModules])) : null,
      };
      if (usePassword && formPassword.trim()) {
        payload.password = formPassword.trim();
      }
      if (clearExistingPin) {
        payload.quickPin = null;
      } else if (usePin && formPin.trim()) {
        payload.quickPin = formPin.trim();
      }

      const res = await apiFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to save staff login account.');
        return;
      }

      const savedUser = data.data as SafeFactoryUserView;
      const effectiveAllowed =
        moduleOverrideMode === 'CUSTOM'
          ? Array.from(new Set(['dashboard', ...customModules]))
          : [...(ERP_ROLES[formRole]?.allowedModules || ['dashboard'])];

      if (!editingUser || (usePassword && formPassword.trim()) || (usePin && formPin.trim())) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
        setLoginPassSlip({
          name: savedUser.name,
          employeeCode: savedUser.employeeCode || formCode.trim(),
          identifier: savedUser.employeeCode || savedUser.email,
          role: savedUser.role,
          department: savedUser.department || formDepartment.trim(),
          pin: usePin && formPin.trim() ? formPin.trim() : undefined,
          password: usePassword && formPassword.trim() ? formPassword.trim() : undefined,
          allowedModules: effectiveAllowed,
          lanUrl: `${origin}/login`,
        });
        setCopiedSlip(false);
      }

      setIsModalOpen(false);
      showBanner('ok', data.message || `Saved login for ${formName.trim()}.`);
      await loadUsers();
    } catch {
      setFormError('Network error saving staff account.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleActive = async (user: SafeFactoryUserView) => {
    if (user.id === currentUserId) {
      showBanner('err', 'You cannot pause your own currently signed-in account.');
      return;
    }
    setBusyAction(`toggle-${user.id}`);
    try {
      const res = await apiFetch('/api/auth/users', {
        method: 'PATCH',
        body: JSON.stringify({
          id: user.id,
          isActive: user.isActive === false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showBanner('err', data.error || 'Could not update active status.');
        return;
      }
      showBanner(
        'ok',
        `${user.name} login ${user.isActive === false ? 'activated' : 'paused'}.`
      );
      await loadUsers();
    } catch {
      showBanner('err', 'Network error updating staff status.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteUser = async (user: SafeFactoryUserView) => {
    if (user.id === currentUserId) {
      showBanner('err', 'You cannot delete your own currently active Super Admin session.');
      return;
    }
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Remove ERP login for "${user.name}" (${user.email})? They will immediately lose system access.`)
    ) {
      return;
    }

    setBusyAction(`delete-${user.id}`);
    try {
      const res = await apiFetch(`/api/auth/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showBanner('err', data.error || 'Could not delete staff login.');
        return;
      }
      showBanner('ok', data.message || `Removed login for ${user.name}.`);
      await loadUsers();
    } catch {
      showBanner('err', 'Network error deleting staff login.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCleanDemoUsers = async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Remove all uncustomized demo/sample staff logins? Custom passwords, your active Super Admin, and newly created staff accounts are preserved.'
      )
    ) {
      return;
    }
    setBusyAction('clean-demo');
    try {
      const res = await apiFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'CLEAN_DEMO_USERS' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showBanner('err', data.error || 'Failed to clean unused demo logins.');
        return;
      }
      showBanner('ok', data.message || 'Demo placeholder logins cleaned.');
      await loadUsers();
    } catch {
      showBanner('err', 'Network error cleaning demo accounts.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleSecuritySetting = async (
    key: 'requireLoginOnAllDevices' | 'showLanStaffPicker'
  ) => {
    const nextConfig = {
      ...securityConfig,
      [key]: !securityConfig[key],
    };
    setBusyAction(`sec-${key}`);
    try {
      const res = await apiFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'UPDATE_SECURITY_CONFIG',
          ...nextConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showBanner('err', data.error || 'Failed to save security setting.');
        return;
      }
      if (data.securityConfig) {
        setSecurityConfig(data.securityConfig);
      }
      showBanner('ok', data.message || 'Factory login security settings updated.');
    } catch {
      showBanner('err', 'Network error saving security settings.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5 text-slate-200">
      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            banner.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 0. ROOT SUPER ADMIN CREDENTIALS CARD */}
      {superAdminUser && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-5 rounded-2xl border-2 border-amber-500/50 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">
                    {superAdminUser.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                    Super Admin Root
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                    {superAdminUser.employeeCode || 'EXM-EMP-001'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                  <span>Login Email: <strong className="text-slate-200">{superAdminUser.email}</strong></span>
                  <span>•</span>
                  <span>
                    Password Status:{' '}
                    <strong className="text-emerald-400">
                      {superAdminUser.customPasswordSet ? 'Active Custom Password' : 'Active (Exmark@2026)'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Quick PIN:{' '}
                    <strong className={superAdminUser.hasQuickPin ? 'text-emerald-400' : 'text-slate-500'}>
                      {superAdminUser.hasQuickPin ? 'Enabled (Touch-Keypad Active)' : 'Not Set'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openEditModal(superAdminUser)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Super Admin Password / PIN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Terminal & Factory Security Policy Controls */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Staff Login Architecture &amp; Factory Terminal Security
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Control staff login accounts, 4–6 digit floor Quick PINs, demo cleanup, and signed session enforcement stored inside{' '}
              <code className="text-amber-300">users-store.json</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demoPlaceholderCount > 0 && (
              <button
                type="button"
                onClick={handleCleanDemoUsers}
                disabled={busyAction !== null}
                className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clean Unused Demo Accounts ({demoPlaceholderCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Staff Login</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#070D1E] border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Require Login on All Devices (Localhost, EXE &amp; LAN)
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every user must unlock with Email/Staff Code + Password or Quick PIN. Disables automatic Super Admin bypass.
              </p>
            </div>
            <button
              type="button"
              disabled={busyAction === 'sec-requireLoginOnAllDevices'}
              onClick={() => handleToggleSecuritySetting('requireLoginOnAllDevices')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] border shrink-0 cursor-pointer transition ${
                securityConfig.requireLoginOnAllDevices
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {securityConfig.requireLoginOnAllDevices ? 'ENFORCED ON' : 'BYPASS OPEN'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070D1E] border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Show LAN Staff Quick-Select Cards on /login
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Shows only Staff Name, Role, Code &amp; Dept cards on shop-floor tablets for fast Quick PIN tap login (hides emails &amp; phones).
              </p>
            </div>
            <button
              type="button"
              disabled={busyAction === 'sec-showLanStaffPicker'}
              onClick={() => handleToggleSecuritySetting('showLanStaffPicker')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] border shrink-0 cursor-pointer transition ${
                securityConfig.showLanStaffPicker
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {securityConfig.showLanStaffPicker ? 'PICKER SHOWN' : 'HIDDEN'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter + Staff Account Registry */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff name, EXM-EMP code, email, phone..."
              className="w-full bg-[#070D1E] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#070D1E] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Roles ({users.length})</option>
              {ROLE_OPTIONS.map((roleOpt) => (
                <option key={roleOpt} value={roleOpt}>
                  {roleOpt}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              title="Reload staff logins"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading factory staff logins...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            No matching staff accounts found. Click <strong>Create Staff Login</strong> to add one.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#070D1E] text-slate-400 text-[11px] uppercase border-b border-slate-800">
                  <th className="p-3">Staff &amp; Code</th>
                  <th className="p-3">Role &amp; Department</th>
                  <th className="p-3">Email / Phone</th>
                  <th className="p-3">Auth &amp; PIN</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isActive = u.isActive !== false;
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{u.name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              YOU
                            </span>
                          )}
                          {u.isDemoPlaceholder && !u.customPasswordSet && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {u.employeeCode || u.id}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ERP_ROLES[u.role]?.badgeColor ||
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {u.department || 'General'}
                        </div>
                        {Array.isArray(u.customAllowedModules) && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                            Custom: {u.customAllowedModules.length} modules
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="text-slate-200 font-mono text-[11px]">{u.email}</div>
                        {u.phone && (
                          <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                            {u.phone}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              u.customPasswordSet
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {u.customPasswordSet ? 'Custom Pass' : 'Default Pass'}
                          </span>
                          {u.hasQuickPin ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                              <KeyRound className="w-2.5 h-2.5" />
                              PIN Ready
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-slate-800">
                              No PIN
                            </span>
                          )}
                        </div>
                        {u.lastLoginAt && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Last sign-in: {new Date(u.lastLoginAt).toLocaleString()}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          disabled={isSelf || busyAction === `toggle-${u.id}`}
                          onClick={() => handleToggleActive(u)}
                          title={
                            isSelf
                              ? 'Cannot pause own signed-in session'
                              : isActive
                                ? 'Click to pause staff login'
                                : 'Click to activate staff login'
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 cursor-pointer disabled:opacity-60 ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserCheck className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <UserMinus className="w-3 h-3" /> Paused
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Edit / Pass / PIN</span>
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              disabled={busyAction === `delete-${u.id}`}
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 cursor-pointer disabled:opacity-50"
                              title="Remove staff login"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Tip: Want to control which screens a role (e.g. <strong>Production</strong> or{' '}
            <strong>Accounts</strong>) can open? Use the <strong>Role Matrix</strong> button in the top bar.
          </span>
        </div>
      </div>

      {/* 3. Create / Edit Staff Login Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#141d33]">
              <div className="flex items-center gap-2">
                {editingUser ? (
                  <Edit2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Plus className="w-4 h-4 text-emerald-400" />
                )}
                <h3 className="font-bold text-white text-sm">
                  {editingUser
                    ? `Edit Staff Login: ${editingUser.name}`
                    : 'Create New Staff Login Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffUser} className="p-5 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick Department / Section Presets */}
              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    1-Click Factory / Office Department Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STAFF_DEPARTMENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyDepartmentPreset(preset)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                          formDepartment === preset.department && formRole === preset.role
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rajesh Cutting Lead"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Staff Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="EXM-EMP-011"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Login Email <span className="text-slate-500 font-normal">(optional for shop floor)</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Mobile Phone (Optional Login ID)
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="94470 00000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Assigned ERP Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setFormRole(nextRole);
                      if (moduleOverrideMode === 'ROLE_DEFAULT') {
                        setCustomModules([...(ERP_ROLES[nextRole]?.allowedModules || ['dashboard'])]);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {ROLE_OPTIONS.map((roleOpt) => (
                      <option key={roleOpt} value={roleOpt}>
                        {roleOpt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Factory Section / Department
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Door Cutting & Finishing"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <strong className="text-amber-300">{formRole}:</strong>{' '}
                {ERP_ROLES[formRole]?.description}
              </div>

              {/* Credential Mode Selector */}
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-200 uppercase">Login Credential Mode</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'PIN_ONLY', label: 'Quick PIN Only (Shop Floor)' },
                        { id: 'BOTH', label: 'Password + PIN' },
                        { id: 'PASSWORD_ONLY', label: 'Password Only (Office PC)' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCredentialMode(m.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          credentialMode === m.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(credentialMode === 'BOTH' || credentialMode === 'PASSWORD_ONLY') && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                        {editingUser ? 'New Password (optional)' : 'Initial Password (min 6 chars)'}
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={editingUser ? 'Leave blank to keep existing' : 'Min 6 characters'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {(credentialMode === 'PIN_ONLY' || credentialMode === 'BOTH') && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-300 uppercase">
                          4–6 Digit Quick PIN
                        </label>
                        <button
                          type="button"
                          onClick={handleGeneratePin}
                          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        >
                          Generate 4-Digit PIN
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        disabled={clearExistingPin}
                        value={formPin}
                        onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={
                          editingUser?.hasQuickPin
                            ? '•••• (leave blank to keep)'
                            : 'e.g. 4829'
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono tracking-widest text-white focus:outline-none focus:border-amber-500 disabled:opacity-40"
                      />
                      {editingUser?.hasQuickPin && (
                        <label className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] text-rose-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={clearExistingPin}
                            onChange={(e) => setClearExistingPin(e.target.checked)}
                          />
                          <span>Remove Quick PIN</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Per-User Module Access Override Panel */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-200 uppercase">Module Access Permissions</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModuleOverrideMode('ROLE_DEFAULT')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        moduleOverrideMode === 'ROLE_DEFAULT'
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      Inherit Role Matrix ({formRole})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModuleOverrideMode('CUSTOM');
                        if (customModules.length === 0) {
                          setCustomModules([...(ERP_ROLES[formRole]?.allowedModules || ['dashboard'])]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        moduleOverrideMode === 'CUSTOM'
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      Custom Modules for This User
                    </button>
                  </div>
                </div>

                {moduleOverrideMode === 'CUSTOM' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {ALL_MODULE_CHOICES.map((mod) => {
                      const checked = customModules.includes(mod.id);
                      const locked = mod.id === 'dashboard' || (formRole === 'Super Admin' && (mod.id === 'settings' || mod.id === 'employees'));
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${
                            checked
                              ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-200 font-semibold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked || locked}
                            disabled={locked}
                            onChange={() => toggleCustomModule(mod.id)}
                            className="w-3.5 h-3.5 rounded accent-cyan-500"
                          />
                          <span>{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToRoster}
                    onChange={(e) => setSyncToRoster(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span>Sync into Employees Roster</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mustChangePass}
                    onChange={(e) => setMustChangePass(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span>Require Password Change on First Login</span>
                </label>

                {editingUser?.id !== currentUserId && (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span>Account Active (allow staff login)</span>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyAction === 'save-user'}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {busyAction === 'save-user' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'Save Account Changes' : 'Create Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Shareable Staff Login Pass Card */}
      {loginPassSlip && (
        <div className="fixed inset-0 bg-black/85 z-[95] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-emerald-500/40 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-950/50 border-b border-emerald-500/30 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Staff Login Pass Ready</h3>
              </div>
              <button
                type="button"
                onClick={() => setLoginPassSlip(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">{loginPassSlip.name}</span>
                  <span className="font-mono text-amber-300 font-bold">{loginPassSlip.employeeCode}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Role / Section:</span>
                  <strong className="text-white">{loginPassSlip.role} ({loginPassSlip.department})</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Login URL:</span>
                  <span className="font-mono text-cyan-300">{loginPassSlip.lanUrl}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Login ID / Staff Code:</span>
                  <strong className="font-mono text-white">{loginPassSlip.identifier}</strong>
                </div>
                {loginPassSlip.pin && (
                  <div className="flex justify-between text-slate-300">
                    <span>Quick PIN:</span>
                    <strong className="font-mono text-emerald-400 tracking-widest text-sm">{loginPassSlip.pin}</strong>
                  </div>
                )}
                {loginPassSlip.password && (
                  <div className="flex justify-between text-slate-300">
                    <span>Initial Password:</span>
                    <strong className="font-mono text-amber-300">{loginPassSlip.password}</strong>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  Allowed Modules: <span className="text-slate-200">{loginPassSlip.allowedModules.join(', ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    const msg = [
                      `*EXMARK ERP Staff Login Pass*`,
                      `Name: ${loginPassSlip.name} (${loginPassSlip.employeeCode})`,
                      `Role: ${loginPassSlip.role} — ${loginPassSlip.department}`,
                      `Login Link: ${loginPassSlip.lanUrl}`,
                      `Staff Code / ID: ${loginPassSlip.identifier}`,
                      loginPassSlip.pin ? `Quick PIN: ${loginPassSlip.pin}` : '',
                      loginPassSlip.password ? `Password: ${loginPassSlip.password}` : '',
                    ]
                      .filter(Boolean)
                      .join('\n');
                    navigator.clipboard?.writeText(msg);
                    setCopiedSlip(true);
                    setTimeout(() => setCopiedSlip(false), 2500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSlip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSlip ? 'Copied Slip!' : 'Copy WhatsApp / Text Slip'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginPassSlip(null)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
