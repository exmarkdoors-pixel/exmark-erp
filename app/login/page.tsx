'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Delete,
  Eye,
  EyeOff,
  Factory,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { setAuthToken } from '@/lib/api/apiClient';

interface LoginDirectoryStaff {
  id: string;
  name: string;
  role: string;
  employeeCode?: string;
  department?: string;
  hasQuickPin: boolean;
}

export default function LoginPage() {
  const router = useRouter();

  const [staffDirectory, setStaffDirectory] = useState<LoginDirectoryStaff[]>([]);
  const [showLanPicker, setShowLanPicker] = useState(false);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');

  const [selectedStaff, setSelectedStaff] = useState<LoginDirectoryStaff | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Host Emergency Super Admin Reset state
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [resetPass, setResetPass] = useState('');
  const [resetPassConfirm, setResetPassConfirm] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const handleEmergencyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!resetPass || resetPass.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (resetPass !== resetPassConfirm) {
      setResetError('Passwords do not match.');
      return;
    }
    if (resetPin && !/^\d{4,6}$/.test(resetPin.trim())) {
      setResetError('Quick PIN must be 4 to 6 numeric digits.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/emergency-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: resetPass.trim(),
          newPin: resetPin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error || 'Failed to reset password.');
        return;
      }
      setResetSuccess('Super Admin password reset successfully! You can now log in.');
      setIdentifier('director@exmarkdoors.com');
      setPassword(resetPass.trim());
      if (resetPin.trim()) setPin(resetPin.trim());
      setTimeout(() => {
        setShowEmergencyModal(false);
        setResetPass('');
        setResetPassConfirm('');
        setResetPin('');
      }, 1500);
    } catch {
      setResetError('Network error connecting to reset service.');
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/login-directory', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setShowLanPicker(Boolean(data.showLanStaffPicker));
        setStaffDirectory(Array.isArray(data.staff) ? data.staff : []);
      })
      .catch(() => {
        // Ignore directory fetch errors — manual sign-in still works
      })
      .finally(() => {
        if (!cancelled) setLoadingDirectory(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffDirectory;
    return staffDirectory.filter((s) =>
      [s.name, s.role, s.employeeCode, s.department]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [staffDirectory, staffSearch]);

  const handleSelectStaffCard = (staff: LoginDirectoryStaff) => {
    setSelectedStaff(staff);
    setIdentifier(staff.employeeCode || staff.id);
    setError('');
    setPassword('');
    setPin('');
    const nextMethod = staff.hasQuickPin ? 'PIN' : 'PASSWORD';
    setAuthMethod(nextMethod);
    setTimeout(() => {
      if (nextMethod === 'PIN') {
        pinInputRef.current?.focus();
      } else {
        passwordInputRef.current?.focus();
      }
    }, 30);
  };

  const handleClearSelectedStaff = () => {
    setSelectedStaff(null);
    setIdentifier('');
    setPassword('');
    setPin('');
    setError('');
  };

  const handlePinKey = (digit: string) => {
    setError('');
    setPin((prev) => (prev.length < 6 ? `${prev}${digit}` : prev));
  };

  const handlePinBackspace = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Enter your Email, Staff Code (e.g. EXM-EMP-001), or 10-digit Phone.');
      return;
    }

    if (authMethod === 'PIN') {
      if (!/^\d{4,6}$/.test(pin)) {
        setError('Quick PIN must be 4 to 6 numeric digits.');
        return;
      }
    } else if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const payload =
        authMethod === 'PIN'
          ? { identifier: cleanIdentifier, pin, method: 'PIN' }
          : { identifier: cleanIdentifier, password, method: 'PASSWORD' };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      if (data.token && data.user) {
        setAuthToken(data.token, data.user);
      }

      router.replace('/');
    } catch {
      setError('Network error while connecting to EXMARK Factory Server.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Subtle Ambient Industrial Accent */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`w-full ${
          showLanPicker && staffDirectory.length > 0 ? 'max-w-5xl' : 'max-w-md'
        } z-10 grid grid-cols-1 ${
          showLanPicker && staffDirectory.length > 0 ? 'lg:grid-cols-12 gap-6 items-start' : ''
        }`}
      >
        {/* LEFT: Optional Non-Sensitive LAN Staff Terminal Picker */}
        {showLanPicker && staffDirectory.length > 0 && (
          <div className="lg:col-span-6 bg-slate-900/75 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Factory Terminal Quick Select
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap your name card, then unlock with your Password or Quick PIN.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {staffDirectory.length} Active
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff name, code (EXM-EMP-...), or role..."
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {loadingDirectory ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Loading active factory staff...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No matching staff cards. Enter your Email or Staff Code on the right.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[430px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaff?.id === staff.id;
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleSelectStaffCard(staff)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/70 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {staff.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white truncate">{staff.name}</p>
                          {staff.hasQuickPin && (
                            <span
                              title="4-6 digit Quick PIN enabled"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0"
                            >
                              PIN
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-amber-400/90 truncate">
                          {staff.role}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono truncate">
                          {staff.employeeCode && <span>{staff.employeeCode}</span>}
                          {staff.employeeCode && staff.department && <span>•</span>}
                          {staff.department && (
                            <span className="font-sans truncate">{staff.department}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RIGHT: Primary Sign-In Card */}
        <div
          className={`${
            showLanPicker && staffDirectory.length > 0 ? 'lg:col-span-6' : 'w-full'
          }`}
        >
          {/* Branding */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-13 h-13 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 border border-amber-400/30 p-3">
              <Factory className="w-7 h-7 text-slate-950" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              EXMARK <span className="text-amber-500">ERP</span>
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-1">
              Doors &amp; Frames Manufacturing OS • Staff Authentication
            </p>
            <div className="flex items-center gap-2 mt-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 text-[11px] text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Palakkad Manufacturing Plant • Secured LAN &amp; Desktop Terminal</span>
            </div>
          </div>

          <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 md:p-7 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Selected Staff Chip OR Manual Identifier Input */}
              {selectedStaff ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                      {selectedStaff.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {selectedStaff.name}
                      </div>
                      <div className="text-[11px] text-amber-300 font-medium truncate">
                        {selectedStaff.role}
                        {selectedStaff.employeeCode ? ` • ${selectedStaff.employeeCode}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedStaff}
                    className="text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 shrink-0"
                  >
                    Switch
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Staff Code, Email, or Phone
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. EXM-EMP-001 or admin@exmarkdoors.com"
                      autoComplete="username"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Credential Mode Switcher: Password vs Quick PIN */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('PASSWORD');
                    setError('');
                    setTimeout(() => passwordInputRef.current?.focus(), 20);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    authMethod === 'PASSWORD'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('PIN');
                    setError('');
                    setTimeout(() => pinInputRef.current?.focus(), 20);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    authMethod === 'PIN'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Quick PIN (4–6)
                </button>
              </div>

              {authMethod === 'PASSWORD' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      ref={passwordInputRef}
                      type={showSecret ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      title={showSecret ? 'Hide password' : 'Show password'}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      4–6 Digit Quick PIN
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
                      <input
                        ref={pinInputRef}
                        type={showSecret ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setPin(digits);
                        }}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-center tracking-[0.45em] font-mono text-base font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                        title={showSecret ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Touch-Friendly Factory Floor Keypad */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handlePinKey(digit)}
                        className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-bold text-slate-100 active:scale-95 transition-all"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPin('')}
                      className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-400 active:scale-95 transition-all"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinKey('0')}
                      className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-bold text-slate-100 active:scale-95 transition-all"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handlePinBackspace}
                      aria-label="Backspace PIN digit"
                      className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Unlock Terminal Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-start gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Signed session enforced on every device. Forgot your Password or Quick PIN? Ask your
                  Super Admin to reset it under{' '}
                  <span className="text-slate-200 font-semibold">
                    Settings → Staff Logins &amp; Roles
                  </span>
                  .
                </p>
              </div>

              <div className="text-center pt-1 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setResetError('');
                    setResetSuccess('');
                    setShowEmergencyModal(true);
                  }}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 underline font-medium cursor-pointer"
                >
                  Forgot Super Admin password? Host Emergency Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EMERGENCY SUPER ADMIN RESET MODAL (Localhost Only) */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0c1222] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Host Emergency Admin Reset</h3>
                <p className="text-xs text-slate-400">
                  Directly reset root Super Admin (<span className="text-amber-300">EXM-EMP-001</span>)
                </p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleEmergencyReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  New Super Admin Password * (min 6 chars)
                </label>
                <input
                  type="password"
                  value={resetPass}
                  onChange={(e) => setResetPass(e.target.value)}
                  placeholder="Enter new password (e.g. Exmark@2026)"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={resetPassConfirm}
                  onChange={(e) => setResetPassConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  New Quick PIN (Optional, 4–6 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 2026"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono tracking-widest text-amber-300 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enables rapid touch tap login on factory floor terminals.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Super Admin Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
