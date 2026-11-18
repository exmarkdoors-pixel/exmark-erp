'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Save,
  Zap,
  Server,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';

interface LocalPgStatus {
  install: {
    installed: boolean;
    versionDetected: string | null;
    serviceName: string | null;
    serviceStatus: 'Running' | 'Stopped' | 'NotFound' | 'Unknown';
    pgDumpPath: string | null;
  };
  config: {
    enabled: boolean;
    host: string;
    port: number;
    database: string;
    user: string;
    hasPassword: boolean;
    maskedUrl: string;
    updatedAt: string;
  };
  live: {
    connected: boolean;
    latencyMs: number;
    pgVersion: string | null;
    tableCount: number;
    vaultStoresInSql: number;
    dbSizeMb: number;
    error: string | null;
  };
}

export function LocalPostgresCard() {
  const [status, setStatus] = useState<LocalPgStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('exmark_erp');
  const [user, setUser] = useState('postgres');
  const [password, setPassword] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/system/local-postgres');
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(data);
        setHost(data.config.host || '127.0.0.1');
        setPort(String(data.config.port || 5432));
        setDatabase(data.config.database || 'exmark_erp');
        setUser(data.config.user || 'postgres');
      }
    } catch {
      // ignore initial error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runAction = async (action: 'TEST' | 'SAVE_AND_INIT' | 'SYNC_VAULT' | 'BACKUP_SQL') => {
    setBusyAction(action);
    setMessage(null);
    try {
      const res = await apiFetch('/api/system/local-postgres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          host,
          port: Number(port) || 5432,
          database,
          user,
          password: password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Operation failed');
      }
      setMessage({ type: 'success', text: data.message || 'Completed successfully.' });
      if (action === 'SAVE_AND_INIT') {
        setPassword('');
      }
      await loadStatus();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Local PostgreSQL action failed',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const isConnected = Boolean(status?.live?.connected);

  return (
    <div className="rounded-2xl bg-[#0B132B] border border-slate-800 p-5 space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Local PostgreSQL SQL Server (Primary Offline DB)
              </h3>
              {loading ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  Checking...
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3" />
                  ONLINE • {status?.live.latencyMs}ms
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertTriangle className="w-3 h-3" />
                  NOT CONNECTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fast, durable 100% local relational SQL database on this factory PC — works in both Web Server &amp; Desktop `.exe`.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Live Metrics Strip */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Server className="w-3 h-3 text-blue-400" /> Windows Service
            </div>
            <div className="font-bold text-white mt-1 truncate">
              {status.install.serviceName || status.install.versionDetected || 'Not Detected'}
            </div>
            <div
              className={`text-[11px] font-semibold ${
                status.install.serviceStatus === 'Running' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {status.install.serviceStatus}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">PostgreSQL Engine</div>
            <div className="font-bold text-white mt-1 truncate">
              {status.live.pgVersion || status.install.versionDetected || '—'}
            </div>
            <div className="text-[11px] text-slate-400">
              DB: <span className="text-slate-200 font-mono">{status.config.database}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">SQL Tables &amp; Vault</div>
            <div className="font-bold text-white mt-1">
              {status.live.tableCount} Tables
            </div>
            <div className="text-[11px] text-emerald-400">
              {status.live.vaultStoresInSql} Vault Stores in SQL
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Database Size</div>
            <div className="font-bold text-white mt-1">
              {status.live.dbSizeMb > 0 ? `${status.live.dbSizeMb} MB` : '0 MB'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              AES-256 Vault Protected
            </div>
          </div>
        </div>
      )}

      {/* Connection Credentials Form */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Host</label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Database</label>
          <input
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Username</label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Password {status?.config.hasPassword && <span className="text-emerald-400">(Saved)</span>}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={status?.config.hasPassword ? '•••••••• (unchanged)' : 'Enter postgres password'}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => runAction('TEST')}
          disabled={Boolean(busyAction)}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {busyAction === 'TEST' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
          <span>Test Connection</span>
        </button>

        <button
          type="button"
          onClick={() => runAction('SAVE_AND_INIT')}
          disabled={Boolean(busyAction)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-950/40"
        >
          {busyAction === 'SAVE_AND_INIT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save &amp; Initialize Local SQL</span>
        </button>

        <button
          type="button"
          onClick={() => runAction('SYNC_VAULT')}
          disabled={Boolean(busyAction) || !isConnected}
          className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          {busyAction === 'SYNC_VAULT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Sync Vault to PostgreSQL</span>
        </button>

        <button
          type="button"
          onClick={() => runAction('BACKUP_SQL')}
          disabled={Boolean(busyAction) || !isConnected}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          {busyAction === 'BACKUP_SQL' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>Backup SQL (.dump)</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
              : 'bg-rose-950/40 text-rose-300 border-rose-700/50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {!message && status?.live?.error && !isConnected && (
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300">
          Status Note: {status.live.error}
        </div>
      )}
    </div>
  );
}
