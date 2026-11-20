'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Globe,
  Smartphone,
  HardDrive,
  RefreshCw,
  QrCode,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Lock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';

interface TunnelData {
  active: boolean;
  tunnelUrl: string | null;
  staffMobileUrl: string | null;
  primaryUrl: string;
  lanIp: string;
  lanUrl: string;
  localPort: number;
  mode: string;
  connectedAt: string | null;
  qrGlobal: string | null;
  qrMobile: string | null;
  logs: string[];
}

export function HybridCloudGatewayCard() {
  const [data, setData] = useState<TunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 6000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/system/cloud-tunnel');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    setBusy('start');
    try {
      const res = await apiFetch('/api/system/cloud-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify('success', 'Cloudflare Secure Gateway started successfully!');
        await fetchStatus();
      } else {
        notify('error', json?.message || 'Failed to start cloud gateway.');
      }
    } catch {
      notify('error', 'Error connecting to gateway supervisor.');
    } finally {
      setBusy(null);
    }
  };

  const handleStop = async () => {
    setBusy('stop');
    try {
      const res = await apiFetch('/api/system/cloud-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify('success', 'Cloud Gateway stopped.');
        await fetchStatus();
      }
    } catch {
      notify('error', 'Failed to stop cloud gateway.');
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 3000);
  };

  const active = Boolean(data?.active && data?.tunnelUrl);

  return (
    <div className="bg-white border-2 border-black rounded-xl p-5 shadow-sm text-black space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-black bg-black text-white rounded">HYBRID CLOUD</span>
            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-black" />
              Hybrid Cloud Gateway &amp; Zero-Data-Loss Center
            </h3>
          </div>
          <p className="text-xs text-black/70 font-medium">
            Run locally in factory (<code className="font-bold">C:\EXMARK-ERP-DATA</code>) with 100% Zero Data Loss, while allowing field staff &amp; remote showrooms instant mobile HTTPS access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {active ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-black hover:text-white border border-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              {busy === 'stop' ? 'Stopping...' : 'Stop Gateway'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={busy !== null}
              className="px-4 py-1.5 rounded-lg bg-black hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {busy === 'start' ? 'Connecting Edge...' : 'Start Cloud Gateway'}
            </button>
          )}

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 rounded-lg border border-black hover:bg-black/5 text-black cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-2 border-black'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-black" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Grid of Key Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Pillar 1: Local Vault Master */}
        <div className="p-3.5 rounded-lg border border-black bg-white space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-black/70">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-black" /> Local Data Vault
            </span>
            <span className="px-1.5 py-0.5 text-[10px] bg-black text-white font-black rounded">MASTER</span>
          </div>
          <div className="text-sm font-black text-black">C:\EXMARK-ERP-DATA</div>
          <p className="text-[11px] text-black/80 leading-relaxed">
            All factory production, orders &amp; invoices live safely on your machine. 0ms local latency.
          </p>
        </div>

        {/* Pillar 2: Data Loss Protection */}
        <div className="p-3.5 rounded-lg border border-black bg-white space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-black/70">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-black" /> Data Loss Safety
            </span>
            <span className="px-1.5 py-0.5 text-[10px] bg-black text-white font-black rounded">ACTIVE</span>
          </div>
          <div className="text-sm font-black text-black">100% Immutable Snapshots</div>
          <p className="text-[11px] text-black/80 leading-relaxed">
            Pre-sync snapshots taken in <code className="font-bold">backups/</code>. Nothing is ever overwritten or lost.
          </p>
        </div>

        {/* Pillar 3: Cloud Gateway Status */}
        <div className="p-3.5 rounded-lg border border-black bg-white space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-black/70">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-black" /> Cloud Gateway Edge
            </span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-black rounded ${
                active ? 'bg-black text-white' : 'bg-black/10 text-black'
              }`}
            >
              {active ? 'ONLINE (HTTPS)' : 'STANDBY'}
            </span>
          </div>
          <div className="text-sm font-black text-black truncate">
            {active ? 'Cloudflare Tunnel Active' : 'Ready to Connect'}
          </div>
          <p className="text-[11px] text-black/80 leading-relaxed">
            {active
              ? `Connected via Cloudflare Edge (Mumbai/Chennai)`
              : 'Click "Start Cloud Gateway" to open global mobile access.'}
          </p>
        </div>
      </div>

      {/* Active Gateway URLs and Mobile QR Code Bar */}
      {active && data?.tunnelUrl && (
        <div className="p-4 rounded-xl border-2 border-black bg-black/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">Live Cloud Access Endpoints</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1 rounded bg-black hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              Show Mobile QR Code
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Full Web ERP */}
            <div className="p-3 rounded-lg border border-black bg-white space-y-1">
              <div className="text-[11px] font-bold text-black/70 flex items-center justify-between">
                <span>💻 Main Web ERP (Showrooms &amp; Tablets)</span>
                <span className="text-[10px] font-mono">Port 4000</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={data.tunnelUrl}
                  className="w-full font-mono text-xs p-1.5 rounded border border-black/30 bg-black/5 select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(data.tunnelUrl!, 'main')}
                  className="px-2.5 py-1.5 border border-black rounded hover:bg-black hover:text-white transition-colors shrink-0"
                  title="Copy URL"
                >
                  {copied === 'main' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={data.tunnelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 border border-black rounded hover:bg-black hover:text-white transition-colors shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Mobile Staff App */}
            <div className="p-3 rounded-lg border border-black bg-white space-y-1">
              <div className="text-[11px] font-bold text-black/70 flex items-center justify-between">
                <span>📱 Field Staff &amp; Measurement Terminal</span>
                <span className="text-[10px] font-mono">4G / 5G Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={data.staffMobileUrl || `${data.tunnelUrl}/mobile`}
                  className="w-full font-mono text-xs p-1.5 rounded border border-black/30 bg-black/5 select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(data.staffMobileUrl || `${data.tunnelUrl}/mobile`, 'mobile')}
                  className="px-2.5 py-1.5 border border-black rounded hover:bg-black hover:text-white transition-colors shrink-0"
                  title="Copy URL"
                >
                  {copied === 'mobile' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={data.staffMobileUrl || `${data.tunnelUrl}/mobile`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 border border-black rounded hover:bg-black hover:text-white transition-colors shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-6 text-black space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h4 className="text-base font-black">Scan on Mobile (Zero Setup)</h4>
                <p className="text-xs text-black/70">Connect any phone (4G/5G) directly to your factory ERP</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full border border-black hover:bg-black hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white border border-black rounded-xl">
              {data?.qrMobile || data?.qrGlobal ? (
                <img
                  src={data?.qrMobile || data?.qrGlobal || ''}
                  alt="Mobile Access QR Code"
                  className="w-64 h-64 object-contain border border-black/20 rounded"
                />
              ) : (
                <div className="p-8 text-xs text-black/50">Generating QR code...</div>
              )}
              <div className="mt-3 text-center space-y-1">
                <div className="text-xs font-mono font-bold break-all bg-black/5 p-2 rounded border border-black/20">
                  {data?.staffMobileUrl || data?.tunnelUrl}
                </div>
                <p className="text-[11px] text-black/70">
                  Open phone camera, scan this QR code, and log in to record measurements or check job cards on site.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 rounded-lg bg-black text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
