'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Ruler,
  Wrench,
  QrCode,
  ShieldCheck,
  Lock,
  Delete,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronRight,
  User,
  Package,
  Phone,
} from 'lucide-react';
import { MobileStaffRole, mapUserToMobileRole } from '@/lib/auth/operationalStaffTypes';
import { setAuthToken, clearAuthToken } from '@/lib/api/apiClient';

export interface MobileStaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeCode?: string;
  department?: string;
  plantLocation?: string;
  mobileRole: MobileStaffRole;
}

interface StaffDirectoryCard {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  department: string;
  mobileRole: MobileStaffRole;
  icon: any;
  color: string;
  badge: string;
  description: string;
}

const DEFAULT_OPERATIONAL_STAFF: StaffDirectoryCard[] = [
  {
    id: 'usr-mobile-drv-01',
    employeeCode: 'DRV-01',
    name: 'Ratheesh Driver',
    role: 'Driver',
    department: 'Delivery Logistics & Fleet',
    mobileRole: 'DRIVER',
    icon: Truck,
    color: 'from-emerald-600 to-teal-800 border-emerald-500/50 text-emerald-300',
    badge: 'DELIVERY & VEHICLE FLEET',
    description: 'Vehicle Runs, Site GPS Route & Signature Handover',
  },
  {
    id: 'usr-mobile-fld-01',
    employeeCode: 'FLD-01',
    name: 'Anas Site Measurer',
    role: 'Site Engineer',
    department: 'Site Measurements & Architectural Survey',
    mobileRole: 'FIELD_STAFF',
    icon: Ruler,
    color: 'from-cyan-600 to-blue-800 border-cyan-500/50 text-cyan-300',
    badge: 'SITE MEASUREMENTS & QUOTES',
    description: 'Door Opening Book (cm/inch) & WhatsApp Quote',
  },
  {
    id: 'usr-mobile-inst-01',
    employeeCode: 'INST-01',
    name: 'Jafar Installation Lead',
    role: 'Installation',
    department: 'Door Fitting & Site Installation',
    mobileRole: 'INSTALLER',
    icon: Wrench,
    color: 'from-amber-600 to-orange-800 border-amber-500/50 text-amber-300',
    badge: 'DOOR FITTING & QC HANDOVER',
    description: '6-Point Fitting Checklist & Handover Rating',
  },
  {
    id: 'usr-mobile-flr-01',
    employeeCode: 'FLR-01',
    name: 'Haris Floor Operator',
    role: 'Production',
    department: 'FRP Molding & CNC Shop Floor',
    mobileRole: 'FLOOR',
    icon: QrCode,
    color: 'from-rose-600 to-pink-800 border-rose-500/50 text-rose-300',
    badge: 'PLANT FLOOR & BARCODE QR',
    description: 'Door Job Card, Press, Sizing & QC Stickers',
  },
  {
    id: 'usr-mobile-str-01',
    employeeCode: 'STR-01',
    name: 'Shafeek Storekeeper',
    role: 'Inventory',
    department: 'Factory Store & Raw Material Issue',
    mobileRole: 'STORE_KEEPER',
    icon: Package,
    color: 'from-orange-600 to-amber-800 border-orange-500/50 text-orange-300',
    badge: 'STORE BOQ ISSUE (LOCKED)',
    description: 'Zero-Edit Formula-Locked BOQ Issue & Receiver Sign-Off',
  },
  {
    id: 'usr-mobile-sls-01',
    employeeCode: 'SLS-01',
    name: 'Riyas Sales & CRM',
    role: 'Sales',
    department: 'CRM Leads & Customer Follow-Ups',
    mobileRole: 'SALES_CRM',
    icon: Phone,
    color: 'from-blue-600 to-indigo-800 border-blue-500/50 text-blue-300',
    badge: 'CRM LEADS & FOLLOW-UPS',
    description: 'Live Customer Leads, 1-Tap Call/WhatsApp & Follow-Ups',
  },
  {
    id: 'usr-mobile-mgr-01',
    employeeCode: 'MGR-01',
    name: 'Salman Factory Manager',
    role: 'Plant Supervisor',
    department: 'Management & Operations Oversight',
    mobileRole: 'MANAGER',
    icon: ShieldCheck,
    color: 'from-purple-600 to-indigo-800 border-purple-500/50 text-purple-300',
    badge: 'OPERATIONS COMMAND & FLEET GPS',
    description: 'Stage Bottlenecks, Team GPS & Full Supervision',
  },
];

interface MobileStaffAuthGateProps {
  children: (props: {
    user: MobileStaffUser;
    onLogout: () => void;
  }) => React.ReactNode;
}

export function MobileStaffAuthGate({ children }: MobileStaffAuthGateProps) {
  const [currentUser, setCurrentUser] = useState<MobileStaffUser | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);

  // Login UI states
  const [selectedStaff, setSelectedStaff] = useState<StaffDirectoryCard>(DEFAULT_OPERATIONAL_STAFF[0]);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [customIdentifier, setCustomIdentifier] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial Session Restore
  useEffect(() => {
    async function checkSession() {
      try {
        // Check localStorage first for instant offline/PWA restore
        const cached = localStorage.getItem('exmark_mobile_staff_session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id && parsed.role) {
              const mobileRole = parsed.mobileRole || mapUserToMobileRole(parsed.role, parsed.department);
              setCurrentUser({ ...parsed, mobileRole });
              setCheckingSession(false);
              return;
            }
          } catch {
            // invalid json, ignore
          }
        }

        // Check backend session cookie
        const res = await fetch('/api/auth/me', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const mobileRole = mapUserToMobileRole(data.user.role, data.user.department);
            const userObj: MobileStaffUser = {
              ...data.user,
              mobileRole,
            };
            setCurrentUser(userObj);
            localStorage.setItem('exmark_mobile_staff_session', JSON.stringify(userObj));
          }
        }
      } catch (err) {
        console.warn('Could not verify mobile session:', err);
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  // 2. Perform PIN Login
  const handlePinSubmit = async (pinToVerify?: string) => {
    const finalPin = pinToVerify || pinDigits;
    if (finalPin.length < 4) {
      setErrorMessage('Please enter your 4-digit PIN');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const identifier = isCustomMode
      ? customIdentifier.trim()
      : selectedStaff.employeeCode || selectedStaff.id;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          pin: finalPin,
          method: 'PIN',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const mobileRole = mapUserToMobileRole(data.user.role, data.user.department);
        const userObj: MobileStaffUser = {
          ...data.user,
          mobileRole,
        };

        if (data.token) {
          setAuthToken(data.token, userObj);
        }
        setCurrentUser(userObj);
        localStorage.setItem('exmark_mobile_staff_session', JSON.stringify(userObj));
      } else {
        setErrorMessage(data.error || 'Invalid Quick PIN. Please check and try again.');
        setPinDigits('');
      }
    } catch (err: any) {
      setErrorMessage('Connection failed. Please check factory Wi-Fi / LAN.');
      setPinDigits('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Numeric Keypad Button Click Handler
  const handleKeypadPress = (digit: string) => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (pinDigits.length < 4) {
      const nextPin = pinDigits + digit;
      setPinDigits(nextPin);
      if (nextPin.length === 4) {
        // Auto-submit on 4th digit
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    setPinDigits((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setPinDigits('');
    setErrorMessage(null);
  };

  // 4. Logout / Switch Staff Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAuthToken();
    localStorage.removeItem('exmark_mobile_staff_session');
    setCurrentUser(null);
    setPinDigits('');
    setErrorMessage(null);
  };

  // Initial loading splash
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#070d18] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center font-black text-xl shadow-lg shadow-rose-900/50 mb-3 animate-pulse">
          EX
        </div>
        <p className="text-xs text-slate-400 font-mono tracking-wider">VERIFYING STAFF TERMINAL...</p>
      </div>
    );
  }

  // If authenticated, render role-locked terminal!
  if (currentUser) {
    return <>{children({ user: currentUser, onLogout: handleLogout })}</>;
  }

  // Otherwise, render dedicated Staff Login Gate
  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between font-sans p-4 pt-safe pb-safe selection:bg-rose-500/30">
      {/* Top Header */}
      <div className="text-center pt-2 pb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-900 text-white font-black text-lg shadow-lg shadow-rose-900/40 mb-2">
          EX
        </div>
        <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center justify-center gap-1.5">
          <span>EXMARK MOBILE OPS</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400 font-bold">
            STAFF ONLY
          </span>
        </h1>
        <p className="text-[11px] text-slate-400">
          Operational Staff Terminal Login (സ്റ്റാഫ് ലോഗിൻ)
        </p>
      </div>

      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Staff Role Selector Strip (Carousel) */}
        {!isCustomMode ? (
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5 text-[11px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider">
                Select Your Role (റോൾ തിരഞ്ഞെടുക്കുക):
              </span>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold text-[10px]"
              >
                Custom Staff Code
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_OPERATIONAL_STAFF.map((staff) => {
                const isSelected = selectedStaff.id === staff.id;
                const Icon = staff.icon;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setPinDigits('');
                      setErrorMessage(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between relative cursor-pointer ${
                      isSelected
                        ? `bg-gradient-to-br ${staff.color} border-white/60 shadow-lg ring-2 ring-white/20`
                        : 'bg-[#111c34] border-slate-800 text-slate-400 hover:bg-[#162444] hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {staff.employeeCode}
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                        {staff.name}
                      </div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {staff.badge}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-[#111c34] border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Custom Employee Code / Email:</span>
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="text-cyan-400 font-semibold text-[11px]"
              >
                Back to 5 Staff Roles
              </button>
            </div>
            <input
              type="text"
              value={customIdentifier}
              onChange={(e) => setCustomIdentifier(e.target.value)}
              placeholder="e.g. DRV-01, FLD-01, INST-01, EXM-EMP-001"
              className="w-full bg-[#182849] border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs uppercase"
            />
          </div>
        )}

        {/* Selected Staff Confirmation Card */}
        <div className="bg-[#10192e] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{isCustomMode ? (customIdentifier || 'Custom User') : selectedStaff.name}</span>
                <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-300 font-mono">
                  {isCustomMode ? 'CUSTOM' : selectedStaff.employeeCode}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isCustomMode ? 'Operational Staff Login' : selectedStaff.description}
              </div>
            </div>
          </div>
        </div>

        {/* PIN Display Slots */}
        <div className="space-y-1.5 text-center">
          <div className="text-[11px] text-slate-400 font-medium">
            Enter 4-Digit Quick PIN (4 അക്ക പിൻ നൽകുക):
          </div>

          <div className="flex items-center justify-center gap-3 py-1">
            {[0, 1, 2, 3].map((slotIdx) => {
              const hasDigit = pinDigits.length > slotIdx;
              return (
                <div
                  key={slotIdx}
                  className={`w-11 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all border ${
                    hasDigit
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/20 scale-105'
                      : 'bg-[#111c34] border-slate-800 text-slate-600'
                  }`}
                >
                  {hasDigit ? '●' : '○'}
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-300 text-[11px] font-bold animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSubmitting && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying PIN...</span>
            </div>
          )}
        </div>

        {/* 0–9 Numeric Touch Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleKeypadPress(num)}
              className="h-13 bg-[#111c34] hover:bg-[#1a2b4f] active:bg-rose-600 active:text-white border border-slate-800 text-white font-bold text-xl rounded-xl transition shadow flex items-center justify-center cursor-pointer select-none"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={isSubmitting || pinDigits.length === 0}
            onClick={handleClear}
            className="h-13 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl transition flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleKeypadPress('0')}
            className="h-13 bg-[#111c34] hover:bg-[#1a2b4f] active:bg-rose-600 active:text-white border border-slate-800 text-white font-bold text-xl rounded-xl transition shadow flex items-center justify-center cursor-pointer select-none"
          >
            0
          </button>

          <button
            type="button"
            disabled={isSubmitting || pinDigits.length === 0}
            onClick={handleBackspace}
            className="h-13 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-slate-300 rounded-xl transition flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="text-center pt-3 text-[10px] text-slate-500 border-t border-slate-900">
        <span>EXMARK DOORS (P) LTD • Factory Staff Mobile Terminal</span>
      </div>
    </div>
  );
}
