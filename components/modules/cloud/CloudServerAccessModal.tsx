'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Cloud,
  QrCode,
  Smartphone,
  Laptop,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Server,
  Users,
  Wifi,
  Sparkles,
  ArrowRight,
  Info,
  Play,
  Square,
  RotateCcw,
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface TunnelStatus {
  active: boolean;
  tunnelUrl: string | null;
  staffMobileUrl: string | null;
  primaryUrl: string;
  lanIp: string;
  lanUrl: string;
  localPort: number;
  pid: number | null;
  mode: string;
  connectedAt: string | null;
  qrGlobal: string | null;
  qrMobile: string | null;
  logs?: string[];
  config?: {
    hasToken: boolean;
    customDomain: string | null;
  };
}

interface CloudServerAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REGISTERED_STAFF_DIRECTORY = [
  {
    code: 'EXM-EMP-001',
    name: 'Super Admin',
    role: 'Super Admin',
    credential: 'Password or Quick PIN',
    badge: 'FULL ERP ACCESS',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  {
    code: 'EXM-EMP-002',
    name: 'Riyas Sales Head',
    role: 'Sales Manager',
    credential: 'Password or Quick PIN',
    badge: 'CRM & QUOTATIONS',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    code: 'EXM-EMP-003',
    name: 'Accounts Executive',
    role: 'Accounts & Daybook',
    credential: 'Password or Quick PIN',
    badge: 'BILLING & VOUCHERS',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    code: 'FLD-01',
    name: 'Anas Site Measurer',
    role: 'Site Engineer',
    credential: 'Quick PIN or Password',
    badge: 'MOBILE FIELD APP',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    code: 'DRV-01',
    name: 'Ratheesh Logistics',
    role: 'Delivery Driver',
    credential: 'Quick PIN or Password',
    badge: 'DISPATCH & FLEET',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    code: 'FLR-01',
    name: 'Haris Floor Operator',
    role: 'Production Lead',
    credential: 'Quick PIN',
    badge: 'MOLDING & CNC',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
];

export function CloudServerAccessModal({ isOpen, onClose }: CloudServerAccessModalProps) {
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [copiedGlobal, setCopiedGlobal] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [copiedLan, setCopiedLan] = useState(false);
  const [activeQrTarget, setActiveQrTarget] = useState<'GLOBAL' | 'MOBILE'>('GLOBAL');

  const [showLogs, setShowLogs] = useState(false);
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');

  const fetchTunnelState = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/cloud-tunnel');
      const data = await res.json();
      if (data.success) {
        setTunnel(data);
      }
    } catch (err) {
      console.warn('Failed to query cloud tunnel state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTunnelState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const copyToClipboard = (text: string, type: 'GLOBAL' | 'MOBILE' | 'LAN') => {
    navigator.clipboard.writeText(text);
    if (type === 'GLOBAL') {
      setCopiedGlobal(true);
      setTimeout(() => setCopiedGlobal(false), 2500);
    } else if (type === 'MOBILE') {
      setCopiedMobile(true);
      setTimeout(() => setCopiedMobile(false), 2500);
    } else {
      setCopiedLan(true);
      setTimeout(() => setCopiedLan(false), 2500);
    }
  };

  // 1-Click Start / Reconnect Tunnel
  const handleStartOrRestart = async () => {
    setActionBusy('STARTING');
    try {
      const res = await fetch('/api/system/cloud-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START' }),
      });
      const data = await res.json();
      if (data.success) {
        setTunnel((prev) => ({
          ...(prev || {}),
          ...data,
        }));
        notify('ok', data.message || 'Cloudflare Tunnel online! Global URL generated.');
      } else {
        notify('err', data.error || 'Failed to start tunnel.');
      }
    } catch (err: any) {
      notify('err', err.message || 'Network request failed.');
    } finally {
      setActionBusy(null);
    }
  };

  // 1-Click Stop Tunnel
  const handleStopTunnel = async () => {
    setActionBusy('STOPPING');
    try {
      const res = await fetch('/api/system/cloud-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP' }),
      });
      const data = await res.json();
      if (data.success) {
        setTunnel((prev) => (prev ? { ...prev, active: false, tunnelUrl: null, staffMobileUrl: null } : null));
        notify('ok', 'Cloudflare tunnel stopped cleanly.');
      }
    } catch (err: any) {
      notify('err', err.message || 'Failed to stop tunnel.');
    } finally {
      setActionBusy(null);
    }
  };

  // Probe External Connectivity
  const handleProbe = async () => {
    setActionBusy('PROBING');
    try {
      const res = await fetch('/api/system/cloud-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PROBE' }),
      });
      const data = await res.json();
      if (data.reachable) {
        notify('ok', `🎉 Verified! Global URL is reachable from the public internet (HTTP ${data.status || 200}).`);
      } else {
        notify('err', `Could not reach tunnel from outside: ${data.error || data.reason || 'Edge connecting'}`);
      }
    } catch (err: any) {
      notify('err', `Probe failed: ${err.message}`);
    } finally {
      setActionBusy(null);
    }
  };

  // Save Permanent Token Configuration
  const handleSaveConfig = async () => {
    setActionBusy('SAVING_CONFIG');
    try {
      const res = await fetch('/api/system/cloud-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_CONFIG',
          tunnelToken: tokenInput.trim() || undefined,
          customDomain: customDomainInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify('ok', 'Permanent Cloudflare configuration saved. Click "Start / Restart" to apply.');
        setShowTokenConfig(false);
      }
    } catch (err: any) {
      notify('err', err.message || 'Failed to save config');
    } finally {
      setActionBusy(null);
    }
  };

  const isOnline = Boolean(tunnel?.active && tunnel?.tunnelUrl);
  const activeUrl = tunnel?.tunnelUrl || tunnel?.primaryUrl || 'http://localhost:4000';
  const mobileUrl = tunnel?.staffMobileUrl || `${activeUrl}/mobile`;
  const qrImage = activeQrTarget === 'GLOBAL' ? tunnel?.qrGlobal : tunnel?.qrMobile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Cloud Server &amp; Remote Access Hub
                </h3>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    GLOBAL HTTPS ONLINE
                  </span>
                ) : actionBusy === 'STARTING' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
                    CONNECTING CLOUDFLARE EDGE...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    TUNNEL OFFLINE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Encrypted multi-device access on smartphones (4G/5G), tablets, and external laptops via Cloudflare
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchTunnelState}
              disabled={loading || !!actionBusy}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner Alert */}
        {banner && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              banner.type === 'ok'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            }`}
          >
            <span>{banner.text}</span>
            <button onClick={() => setBanner(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Main Action Banner: Start / Reconnect / Stop */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-bold text-white text-xs flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span>Cloudflare Global Tunnel Controls</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Port {tunnel?.localPort || 4000} &bull; {tunnel?.mode || 'TRYCLOUDFLARE'})
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                {isOnline
                  ? 'Tunnel is running. You can verify public reachability, get a fresh link, or stop the tunnel.'
                  : 'Tunnel is currently offline. Click below to start the Cloudflare tunnel in the background.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {isOnline ? (
                <>
                  <button
                    type="button"
                    onClick={handleProbe}
                    disabled={!!actionBusy}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${actionBusy === 'PROBING' ? 'animate-spin' : ''}`} />
                    <span>Test Reachability</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOrRestart}
                    disabled={!!actionBusy}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <RotateCcw className={`w-3 h-3 ${actionBusy === 'STARTING' ? 'animate-spin' : ''}`} />
                    <span>Get New Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopTunnel}
                    disabled={!!actionBusy}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Square className="w-3 h-3 text-rose-400" />
                    <span>Stop</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartOrRestart}
                  disabled={!!actionBusy}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                >
                  {actionBusy === 'STARTING' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting to Cloudflare Edge...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Cloud Tunnel Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Top Row: Global HTTPS Link + QR Scanner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left 7 Cols: URL Cards */}
            <div className="md:col-span-7 space-y-3">
              {/* Global HTTPS Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-slate-900 border border-blue-500/30 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Global HTTPS Cloud URL (Worldwide)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-semibold">
                    Works on 4G / 5G Mobile Data
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-white truncate select-all">
                    {isOnline ? tunnel?.tunnelUrl : 'Tunnel Offline — Click "Start Cloud Tunnel Now" above'}
                  </span>
                  {isOnline && tunnel?.tunnelUrl && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tunnel.tunnelUrl!, 'GLOBAL')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        {copiedGlobal ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedGlobal ? 'Copied' : 'Copy'}</span>
                      </button>
                      <a
                        href={tunnel.tunnelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  Access from any smartphone, home PC, or showroom laptop without any VPN or router configuration.
                </p>
              </div>

              {/* Mobile Staff Hub URL Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Mobile Field Operations Terminal (/mobile)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Optimized for Site Measurers &amp; Drivers
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-emerald-300 truncate select-all">
                    {isOnline ? mobileUrl : `${tunnel?.lanUrl || 'http://localhost:4000'}/mobile`}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mobileUrl, 'MOBILE')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 transition"
                    >
                      {copiedMobile ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedMobile ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={mobileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 transition"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Open</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Local Factory LAN URL Card */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-300 block">Factory Wi-Fi LAN Address (Super Fast):</span>
                    <span className="font-mono text-slate-400">{tunnel?.lanUrl || 'http://192.168.8.101:4000'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(tunnel?.lanUrl || 'http://localhost:4000', 'LAN')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition shrink-0"
                >
                  {copiedLan ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copiedLan ? 'Copied' : 'Copy LAN'}</span>
                </button>
              </div>
            </div>

            {/* Right 5 Cols: Smartphone QR Code Scanner */}
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="inline-flex p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveQrTarget('GLOBAL')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                    activeQrTarget === 'GLOBAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Web ERP
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrTarget('MOBILE')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                    activeQrTarget === 'MOBILE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mobile Field App
                </button>
              </div>

              {/* QR Image Box */}
              <div className="p-3 bg-white rounded-xl shadow-lg border border-slate-200">
                {qrImage ? (
                  <img
                    src={qrImage}
                    alt="EXMARK ERP Remote Access QR Code"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex flex-col items-center justify-center text-slate-600">
                    <QrCode className="w-12 h-12 mb-1" />
                    <span className="text-[10px]">Start tunnel to generate QR</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-bold text-white text-xs block">
                  Scan with any Phone Camera
                </span>
                <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                  Opens instantly in Chrome or Safari on 4G/5G mobile data.
                </p>
              </div>
            </div>
          </div>

          {/* Live Connection Logs Drawer */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-850 transition"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-xs text-slate-200">Live Cloudflare Connection Logs</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {tunnel?.logs?.length || 0} events
                </span>
              </div>
              {showLogs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showLogs && (
              <div className="p-3 bg-slate-950 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto space-y-1 border-t border-slate-800">
                {tunnel?.logs && tunnel.logs.length > 0 ? (
                  tunnel.logs.map((logLine, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-all">
                      {logLine}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No connection log events recorded yet.</div>
                )}
              </div>
            )}
          </div>

          {/* Permanent Named Tunnel Configuration Accordion */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTokenConfig(!showTokenConfig)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-850 transition"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">
                  Want a Permanent URL that Never Changes? (Cloudflare Token)
                </span>
                {tunnel?.config?.hasToken && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Token Configured
                  </span>
                )}
              </div>
              {showTokenConfig ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showTokenConfig && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                <p className="text-[11px] text-slate-300">
                  TryCloudflare subdomains change whenever restarted. To give your staff a <strong>permanent fixed domain</strong> (e.g. <code className="text-amber-400">erp.exmarkdoors.com</code>), create a free tunnel in Cloudflare Zero Trust and paste the tunnel token below:
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Cloudflare Tunnel Token (eyJh...)
                    </label>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste your Cloudflare Tunnel Token here"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Custom Public Domain / Hostname (Optional)
                    </label>
                    <input
                      type="text"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      placeholder="e.g. https://erp.exmarkdoors.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={actionBusy === 'SAVING_CONFIG'}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                  >
                    Save Permanent Configuration
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Staff ID & Password Directory */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-400" />
                <span className="font-bold text-white text-xs">
                  Staff ID Login Directory &amp; Instructions
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Staff can log in from any phone or PC using their <strong>Staff ID</strong> + <strong>Password / PIN</strong>
              </span>
            </div>

            {/* Step-by-Step Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-blue-400 block">Step 1: Open Link</span>
                <p className="text-slate-400">
                  Open the Global HTTPS URL or scan the QR Code on your mobile phone or laptop.
                </p>
              </div>

              <div className="p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-emerald-400 block">Step 2: Enter Staff ID</span>
                <p className="text-slate-400">
                  Type your Staff ID code (e.g. <strong className="text-white">EXM-EMP-001</strong> or <strong className="text-white">FLD-01</strong>) instead of an email.
                </p>
              </div>

              <div className="p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-amber-400 block">Step 3: Enter Password/PIN</span>
                <p className="text-slate-400">
                  Enter your assigned password or 4-digit Quick PIN. You are instantly authenticated!
                </p>
              </div>
            </div>

            {/* Staff Accounts Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Staff ID (Employee Code)</th>
                    <th className="p-2">Staff Name</th>
                    <th className="p-2">Assigned Role</th>
                    <th className="p-2">Auth Credential</th>
                    <th className="p-2 text-right">Access Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {REGISTERED_STAFF_DIRECTORY.map((s) => (
                    <tr key={s.code} className="hover:bg-slate-800/40 transition">
                      <td className="p-2 font-mono font-bold text-red-400">{s.code}</td>
                      <td className="p-2 font-semibold text-white">{s.name}</td>
                      <td className="p-2 text-slate-300">{s.role}</td>
                      <td className="p-2 text-slate-400 flex items-center gap-1 font-mono text-[10px]">
                        <KeyRound className="w-3 h-3 text-slate-500" />
                        {s.credential}
                      </td>
                      <td className="p-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${s.badgeColor}`}>
                          {s.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Encrypted with 256-bit TLS &bull; Multi-Device Access Online
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
