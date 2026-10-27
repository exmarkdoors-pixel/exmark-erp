'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';

interface RolePreset {
  role: UserRole;
  email: string;
  name: string;
  dept: string;
}

const ROLE_PRESETS: RolePreset[] = [
  { role: 'Super Admin', email: 'director@exmarkdoors.com', name: 'Nazer Karumban', dept: 'Executive & Plant Strategy' },
  { role: 'Management', email: 'management@exmarkdoors.com', name: 'Amina Rahman', dept: 'Operations & KPI Oversight' },
  { role: 'Sales', email: 'sales.calicut@exmarkdoors.com', name: 'Shabeer Ali', dept: 'Kerala Dealer & Builder Sales' },
  { role: 'Accounts', email: 'accounts.kochi@exmarkdoors.com', name: 'Varghese Mathew', dept: 'GST, e-Way & Receivables' },
  { role: 'Production', email: 'plant.palakkad@exmarkdoors.com', name: 'Rajesh P.', dept: 'FRP Press & WPC Extrusion' },
  { role: 'Inventory', email: 'inventory@exmarkdoors.com', name: 'Deepa V.', dept: 'Raw Material Silos & Hardware' },
  { role: 'Purchase', email: 'purchase@exmarkdoors.com', name: 'Suresh Kumar', dept: 'Chemicals & Polymer Procurement' },
  { role: 'HR', email: 'hr@exmarkdoors.com', name: 'Priya Nair', dept: 'Plant Rosters & Factory Staff' },
  { role: 'Installation', email: 'site.installation@exmarkdoors.com', name: 'Anoop Krishnan', dept: 'Site Measurements & Delivery' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('director@exmarkdoors.com');
  const [password, setPassword] = useState('Exmark@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Super Admin');

  const handleSelectPreset = (preset: RolePreset) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
    setPassword('Exmark@2026');
    setErrorMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccessMsg(`Authenticated as ${data.user.name} (${data.user.role}). Redirecting...`);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login error occurred.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-red-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* EXMARK Brand Logo */}
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-950/60 text-white font-black tracking-tight border border-red-500/50">
            <span className="text-2xl font-black">EX</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-wider text-white">EXMARK</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-red-600 text-white tracking-widest">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">
              KERALA FRP & WPC DOORS • PALAKKAD PLANT
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">
          Enterprise Operations Sign In
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Stage 4: Role-Based Access Control &amp; Secure Server-Side Sessions
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-[#0B132B] py-7 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-800 space-y-6">
          {/* Role Quick Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                Select Role Profile (Demo Testing):
              </span>
              <span className="text-[10px] text-slate-400">9 Enterprise Roles</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {ROLE_PRESETS.map((preset) => {
                const isSelected = selectedRole === preset.role;
                return (
                  <button
                    key={preset.role}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-left transition-all border ${
                      isSelected
                        ? 'bg-red-600/20 text-white border-red-500 shadow-xs'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate font-bold">{preset.role}</div>
                    <div className="text-[10px] text-slate-400 truncate">{preset.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorized Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 text-sm text-white placeholder-slate-500 rounded-lg border border-slate-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="name@exmarkdoors.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-900 text-sm text-white placeholder-slate-500 rounded-lg border border-slate-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default demo pass: <code className="text-slate-300 font-mono">Exmark@2026</code>
              </span>
            </div>

            {/* Selected Role Summary Pill */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Role:</span>
                <span className="font-bold text-white text-sm">{selectedRole}</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">
                  {ERP_ROLES[selectedRole]?.description}
                </span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-600/20 text-red-300 border border-red-500/30">
                Active Role
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Session...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Operations Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Audit Footer */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bcrypt Salted Hash • HTTP-Only Cookie • Server-Side Sessions</span>
            </div>
            <Link
              href="/"
              className="text-xs text-red-400 hover:text-red-300 font-medium inline-block"
            >
              &larr; Return to Dashboard Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
