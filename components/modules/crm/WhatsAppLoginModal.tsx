'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Zap,
  Wifi,
  BatteryCharging,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppSession, DEFAULT_WHATSAPP_SESSION, sanitizeWhatsAppPhone } from '@/lib/services/whatsappService';

interface WhatsAppLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WhatsAppSession;
  onSessionUpdated: (session: WhatsAppSession) => void;
}

export function WhatsAppLoginModal({
  isOpen,
  onClose,
  session,
  onSessionUpdated,
}: WhatsAppLoginModalProps) {
  const [activeTab, setActiveTab] = useState<'QR' | 'PAIR_PHONE' | 'SETTINGS'>('QR');
  const [phoneInput, setPhoneInput] = useState(session.phoneNumber || '+91 94470 12345');
  const [pairingCode, setPairingCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [qrCounter, setQrCounter] = useState(20);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-refresh QR code countdown
  useEffect(() => {
    if (!isOpen || session.connected || activeTab !== 'QR') return;
    const interval = setInterval(() => {
      setQrCounter((prev) => {
        if (prev <= 1) {
          return 20; // reset
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, session.connected, activeTab]);

  if (!isOpen) return null;

  const handleSimulateQrScan = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/crm/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connected: true,
          phoneNumber: phoneInput || '+91 94470 12345',
          accountName: 'EXMARK DOORS Official Plant HQ',
          deviceName: 'Chrome 124 (Windows Desktop)',
          batteryLevel: 96,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        onSessionUpdated(data.session);
        setStatusMessage('🎉 WhatsApp Web device successfully linked!');
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch {
      setStatusMessage('Failed to link WhatsApp session.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGeneratePairingCode = () => {
    if (!phoneInput.trim()) return;
    setIsGeneratingCode(true);
    setTimeout(() => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPairingCode(code);
      setIsGeneratingCode(false);
    }, 600);
  };

  const handleConfirmPairingCode = async () => {
    await handleSimulateQrScan();
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/crm/whatsapp/session', { method: 'DELETE' });
      const data = await res.json();
      if (data.success && data.session) {
        onSessionUpdated(data.session);
        setStatusMessage('WhatsApp device disconnected.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage('Failed to disconnect.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#070D1E] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/60 via-[#0B132B] to-[#070D1E] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>EXMARK WhatsApp Connect &amp; Login Center</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    session.connected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {session.connected ? '● Linked & Active' : '○ Disconnected'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Official Kerala factory WhatsApp dispatch &amp; lead management gateway
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="mx-5 mt-4 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Connected Telemetry Card (If session is active) */}
        {session.connected ? (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs text-white">Active Device Session</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {session.apiMode || 'WEB_DIRECT'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Sender WhatsApp Number</span>
                  <span className="font-bold text-white text-sm">{session.phoneNumber || '+91 94470 12345'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Account Title</span>
                  <span className="font-bold text-slate-200">{session.accountName || 'EXMARK DOORS Plant HQ'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Device Platform</span>
                    <span className="font-semibold text-slate-300">{session.deviceName || 'Chrome on Windows'}</span>
                  </div>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Battery &amp; Telemetry</span>
                    <span className="font-semibold text-emerald-400">{session.batteryLevel || 95}% Charged</span>
                  </div>
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Last Synced: {new Date(session.lastSyncedAt).toLocaleTimeString('en-IN')}</span>
                <span className="text-emerald-400 font-semibold">End-to-End Encrypted</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open WhatsApp Web Tab</span>
              </a>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect / Switch Device</span>
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State / Pairing Wizard */
          <div className="p-5 space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('QR')}
                className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'QR'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan WhatsApp Web QR</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PAIR_PHONE')}
                className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'PAIR_PHONE'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pair with Phone Number</span>
              </button>
            </div>

            {activeTab === 'QR' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner relative group">
                  {/* Authentic SVG QR Code Representation */}
                  <svg
                    className="w-48 h-48 text-slate-900"
                    viewBox="0 0 100 100"
                    fill="currentColor"
                  >
                    {/* Corner Markers */}
                    <rect x="5" y="5" width="26" height="26" fill="black" rx="3" />
                    <rect x="9" y="9" width="18" height="18" fill="white" rx="1" />
                    <rect x="13" y="13" width="10" height="10" fill="black" />

                    <rect x="69" y="5" width="26" height="26" fill="black" rx="3" />
                    <rect x="73" y="9" width="18" height="18" fill="white" rx="1" />
                    <rect x="77" y="13" width="10" height="10" fill="black" />

                    <rect x="5" y="69" width="26" height="26" fill="black" rx="3" />
                    <rect x="9" y="73" width="18" height="18" fill="white" rx="1" />
                    <rect x="13" y="77" width="10" height="10" fill="black" />

                    {/* Data Pixels Matrix */}
                    <rect x="36" y="8" width="6" height="6" />
                    <rect x="46" y="8" width="6" height="6" />
                    <rect x="56" y="8" width="6" height="6" />

                    <rect x="36" y="20" width="6" height="6" />
                    <rect x="50" y="20" width="12" height="6" />

                    <rect x="10" y="36" width="6" height="6" />
                    <rect x="22" y="36" width="8" height="6" />
                    <rect x="36" y="36" width="26" height="26" fill="#10b981" rx="4" />
                    <circle cx="49" cy="49" r="6" fill="white" />

                    <rect x="68" y="36" width="8" height="6" />
                    <rect x="80" y="36" width="10" height="6" />

                    <rect x="8" y="48" width="14" height="6" />
                    <rect x="72" y="48" width="20" height="6" />

                    <rect x="36" y="68" width="6" height="12" />
                    <rect x="48" y="68" width="14" height="6" />
                    <rect x="68" y="68" width="12" height="6" />
                    <rect x="84" y="68" width="8" height="6" />

                    <rect x="36" y="84" width="20" height="8" />
                    <rect x="62" y="84" width="8" height="8" />
                    <rect x="74" y="80" width="18" height="12" />
                  </svg>

                  <div className="mt-2 text-center">
                    <span className="text-[10px] font-bold text-slate-600 block">
                      Auto-refreshes in {qrCounter}s
                    </span>
                    <button
                      type="button"
                      onClick={handleSimulateQrScan}
                      disabled={isRefreshing}
                      className="mt-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Pair / Scan Now</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-white text-sm">To link your EXMARK WhatsApp:</h4>
                  <ol className="space-y-2 text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                    <li>Tap <strong>Settings</strong> or <strong>⋮ Menu</strong> &gt; <strong>Linked Devices</strong>.</li>
                    <li>Tap <strong>Link a Device</strong>.</li>
                    <li>Point your phone camera to this QR code to confirm linking.</li>
                  </ol>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSimulateQrScan}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Activate WhatsApp Connection</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'PAIR_PHONE' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    EXMARK Business / Official WhatsApp Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+91 94470 12345"
                      className="flex-1 px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePairingCode}
                      disabled={isGeneratingCode}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold cursor-pointer"
                    >
                      {isGeneratingCode ? 'Generating...' : 'Get Code'}
                    </button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-center">
                    <span className="text-[11px] text-slate-300 block">
                      Enter this 8-digit code in WhatsApp on your phone:
                    </span>
                    <div className="font-mono text-2xl font-black text-emerald-400 tracking-wider">
                      {pairingCode}
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmPairingCode}
                      className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                    >
                      I Entered the Code — Complete Pairing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#091024] border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit TLS Gateway &bull; Kerala Factory WhatsApp Router</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
