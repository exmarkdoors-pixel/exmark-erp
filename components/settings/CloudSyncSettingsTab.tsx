'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Database,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  FolderSync,
  History,
  KeyRound,
  Trash2,
  Globe,
  QrCode,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import { CloudServerAccessModal } from '@/components/modules/cloud/CloudServerAccessModal';
import { LocalPostgresCard } from './LocalPostgresCard';

interface CloudSyncLogEntry {
  id: string;
  timestamp: string;
  kind: 'POSTGRES_PUSH' | 'POSTGRES_PULL' | 'DRIVE_BACKUP' | 'DRIVE_RESTORE' | 'OUTBOX';
  status: 'SUCCESS' | 'PARTIAL' | 'ERROR';
  summary: string;
  storesAffected: number;
  durationMs: number;
}

interface CloudSyncOverview {
  state: {
    enabled: boolean;
    postgresEnabled: boolean;
    driveEnabled: boolean;
    driveMode: 'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK';
    driveLocalFolder: string;
    googleAccountEmail: string;
    driveFolderName: string;
    autoSyncIntervalMinutes: number;
    driveRetentionCount: number;
    deviceName: string;
    dirtyStores: string[];
    lastPostgresSyncAt: string | null;
    lastDriveBackupAt: string | null;
    lastError: string | null;
    history: CloudSyncLogEntry[];
  };
  secretsSummary: {
    hasDatabaseUrl: boolean;
    maskedDatabaseUrl: string | null;
    hasOAuthCredentials: boolean;
    hasAppsScriptWebhook: boolean;
  };
  localStoreCount: number;
  isCloudRuntime: boolean;
}

interface StoreDiffItem {
  storeKey: string;
  status: 'IN_SYNC' | 'LOCAL_ONLY' | 'REMOTE_ONLY' | 'MODIFIED';
  localBytes: number;
  remoteBytes: number;
  remoteUpdatedAt: string | null;
  remoteDevice: string | null;
}

interface DriveBackupFile {
  id: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  source: string;
}

export default function CloudSyncSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [overview, setOverview] = useState<CloudSyncOverview | null>(null);
  const [detectedFolders, setDetectedFolders] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Editable config fields
  const [enabled, setEnabled] = useState(false);
  const [postgresEnabled, setPostgresEnabled] = useState(false);
  const [databaseUrlInput, setDatabaseUrlInput] = useState('');
  const [autoInterval, setAutoInterval] = useState(0);
  const [deviceName, setDeviceName] = useState('');

  const [driveEnabled, setDriveEnabled] = useState(false);
  const [driveMode, setDriveMode] = useState<'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK'>('LOCAL_FOLDER');
  const [driveLocalFolder, setDriveLocalFolder] = useState('');
  const [googleEmail, setGoogleEmail] = useState('exmarkdoors@gmail.com');
  const [driveFolderName, setDriveFolderName] = useState('EXMARK-ERP-Cloud');
  const [driveRetention, setDriveRetention] = useState(15);

  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthRefreshToken, setOauthRefreshToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookToken, setWebhookToken] = useState('');

  const [testReport, setTestReport] = useState<{
    postgres?: { reachable: boolean; tableReady: boolean; remoteStoresCount: number; latencyMs: number; message: string };
    drive?: { ready: boolean; targetLocation: string; message: string };
  } | null>(null);
  const [remoteDiff, setRemoteDiff] = useState<StoreDiffItem[] | null>(null);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[] | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 7000);
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/system/cloud-sync');
      const json = await res.json();
      if (res.ok && json.success) {
        const ov = json.overview as CloudSyncOverview;
        setOverview(ov);
        setDetectedFolders(Array.isArray(json.detectedDriveFolders) ? json.detectedDriveFolders : []);
        setEnabled(ov.state.enabled);
        setPostgresEnabled(ov.state.postgresEnabled);
        setAutoInterval(ov.state.autoSyncIntervalMinutes);
        setDeviceName(ov.state.deviceName);
        setDriveEnabled(ov.state.driveEnabled);
        setDriveMode(ov.state.driveMode);
        setDriveLocalFolder(ov.state.driveLocalFolder);
        setGoogleEmail(ov.state.googleAccountEmail || 'exmarkdoors@gmail.com');
        setDriveFolderName(ov.state.driveFolderName || 'EXMARK-ERP-Cloud');
        setDriveRetention(ov.state.driveRetentionCount || 15);
      } else {
        notify('error', json?.error || 'Super Admin login required to configure Cloud Sync.');
      }
    } catch {
      notify('error', 'Failed to reach /api/system/cloud-sync');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSaveConfig = async (extraPatch: Record<string, unknown> = {}) => {
    setBusy('save');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_CONFIG',
          enabled,
          postgresEnabled,
          cloudDatabaseUrl: databaseUrlInput.trim() || undefined,
          autoSyncIntervalMinutes: autoInterval,
          deviceName: deviceName.trim() || undefined,
          driveEnabled,
          driveMode,
          driveLocalFolder,
          googleAccountEmail: googleEmail,
          driveFolderName,
          driveRetentionCount: driveRetention,
          oauthClientId: oauthClientId.trim() || undefined,
          oauthClientSecret: oauthClientSecret.trim() || undefined,
          oauthRefreshToken: oauthRefreshToken.trim() || undefined,
          appsScriptWebhookUrl: webhookUrl.trim() || undefined,
          appsScriptToken: webhookToken.trim() || undefined,
          ...extraPatch,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOverview(json.overview);
        setDatabaseUrlInput('');
        setOauthClientId('');
        setOauthClientSecret('');
        setOauthRefreshToken('');
        setWebhookUrl('');
        setWebhookToken('');
        notify('success', json.message || 'Cloud Sync settings saved cleanly.');
      } else {
        notify('error', json?.error || 'Could not save Cloud Sync configuration.');
      }
    } catch {
      notify('error', 'Failed to save Cloud Sync configuration.');
    } finally {
      setBusy(null);
    }
  };

  const handleTestConnections = async () => {
    setBusy('test');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          cloudDatabaseUrl: databaseUrlInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTestReport(json.report);
        notify('success', 'Tested PostgreSQL & Google Drive channels.');
      } else {
        notify('error', json?.error || 'Connection test failed.');
      }
    } catch {
      notify('error', 'Connection test request failed.');
    } finally {
      setBusy(null);
    }
  };

  const handlePushNow = async (forceAll = false) => {
    setBusy('push');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PUSH_NOW', forceAll }),
      });
      const json = await res.json();
      if (json.overview) setOverview(json.overview);
      if (json.success) {
        const pg = json.result?.postgres;
        const dr = json.result?.drive;
        const msg = [
          pg?.attempted ? `Postgres: ${pg.pushedCount} updated, ${pg.skippedUnchangedCount} unchanged` : null,
          dr?.attempted && dr?.fileName ? `Drive: ${dr.fileName}` : null,
        ]
          .filter(Boolean)
          .join(' • ');
        notify('success', msg || 'Cloud sync finished cleanly.');
      } else {
        notify('error', json.result?.postgres?.error || json.result?.drive?.error || json.error || 'Sync failed.');
      }
    } catch {
      notify('error', 'Push sync request failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleInspectDiff = async () => {
    setBusy('diff');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'INSPECT_DIFF' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRemoteDiff(json.diff || []);
      } else {
        notify('error', json?.error || 'Could not inspect remote stores.');
      }
    } catch {
      notify('error', 'Failed to inspect remote stores.');
    } finally {
      setBusy(null);
    }
  };

  const handlePullFromPostgres = async (mode: 'MERGE_NEWER' | 'OVERWRITE_ALL') => {
    if (
      mode === 'OVERWRITE_ALL' &&
      !window.confirm(
        'Overwrite all local stores from Cloud PostgreSQL? A Pre-Restore backup snapshot will be created automatically first.'
      )
    ) {
      return;
    }
    setBusy('pull');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PULL_FROM_POSTGRES', mode }),
      });
      const json = await res.json();
      if (json.overview) setOverview(json.overview);
      if (res.ok && json.success) {
        notify(
          'success',
          `Pulled ${json.result.restoredStores.length} stores from Cloud PostgreSQL (Pre-restore: ${json.result.preRestoreBackupId}).`
        );
        handleInspectDiff();
      } else {
        notify('error', json?.error || 'Cloud pull failed.');
      }
    } catch {
      notify('error', 'Cloud pull request failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleDriveBackupNow = async () => {
    setBusy('drive-push');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BACKUP_TO_DRIVE' }),
      });
      const json = await res.json();
      if (json.overview) setOverview(json.overview);
      if (res.ok && json.success) {
        notify('success', json.result?.message || 'Google Drive snapshot uploaded.');
        handleListDriveBackups();
      } else {
        notify('error', json?.error || 'Google Drive backup failed.');
      }
    } catch {
      notify('error', 'Google Drive backup request failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleListDriveBackups = async () => {
    setBusy('drive-list');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LIST_DRIVE_BACKUPS' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDriveBackups(json.files || []);
      } else {
        notify('error', json?.error || 'Could not list Drive backups.');
      }
    } catch {
      notify('error', 'Failed to list Drive backups.');
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreDriveBackup = async (file: DriveBackupFile) => {
    if (
      !window.confirm(
        `Restore factory vault from Google Drive snapshot "${file.name}"? A local PRE_RESTORE backup will be created first.`
      )
    ) {
      return;
    }
    setBusy('drive-restore');
    try {
      const res = await apiFetch('/api/system/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESTORE_DRIVE_BACKUP', fileId: file.id }),
      });
      const json = await res.json();
      if (json.overview) setOverview(json.overview);
      if (res.ok && json.success) {
        notify(
          'success',
          `Restored ${json.result.restoredFiles.length} stores from ${file.name} (Backup ID: ${json.result.preRestoreBackupId}).`
        );
      } else {
        notify('error', json?.error || 'Drive restore failed.');
      }
    } catch {
      notify('error', 'Drive restore request failed.');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !overview) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Loading Hybrid Cloud Sync Engine &amp; Google Drive Status...
      </div>
    );
  }

  const dirtyCount = overview?.state.dirtyStores.length || 0;

  return (
    <div className="space-y-5">
      {banner && (
        <div
          className={`p-3.5 rounded-lg border text-sm font-medium flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* 0. Local PostgreSQL Server (Primary Offline SQL Database) */}
      <LocalPostgresCard />

      {/* 1. Overview KPI Header */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-sky-400" />
              Hybrid Cloud Sync — Offline-First Vault + PostgreSQL + Google Drive
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              C:\EXMARK-ERP-DATA always writes locally first (0ms delay), then syncs all {overview?.localStoreCount || 28}+ ERP modules to PostgreSQL and Google Drive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnections}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy === 'test' ? 'animate-spin' : ''}`} />
              Test Connections
            </button>
            <button
              type="button"
              onClick={() => handlePushNow(false)}
              disabled={busy !== null}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              {busy === 'push' ? 'Syncing...' : 'Sync Changed Now'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Local Vault Mode
            </div>
            <div className="text-emerald-300 font-bold mt-1">PRIMARY (OFFLINE-FIRST)</div>
            <div className="text-slate-400 text-[11px] mt-0.5">{overview?.localStoreCount || 0} active JSON stores</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-400" /> PostgreSQL Cloud Sync
            </div>
            <div className={`font-bold mt-1 ${overview?.state.postgresEnabled && overview?.secretsSummary.hasDatabaseUrl ? 'text-sky-300' : 'text-slate-400'}`}>
              {overview?.state.postgresEnabled && overview?.secretsSummary.hasDatabaseUrl
                ? 'CONFIGURED'
                : 'NOT ENABLED'}
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5 truncate">
              {overview?.state.lastPostgresSyncAt
                ? `Last: ${new Date(overview.state.lastPostgresSyncAt).toLocaleString()}`
                : 'Never pushed'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <FolderSync className="w-3.5 h-3.5 text-amber-400" /> Google Drive Backup
            </div>
            <div className={`font-bold mt-1 ${overview?.state.driveEnabled ? 'text-amber-300' : 'text-slate-400'}`}>
              {overview?.state.driveEnabled ? overview.state.driveMode : 'NOT ENABLED'}
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5 truncate">
              {overview?.state.lastDriveBackupAt
                ? `Last: ${new Date(overview.state.lastDriveBackupAt).toLocaleString()}`
                : overview?.state.googleAccountEmail || 'exmarkdoors@gmail.com'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Pending Sync Queue</div>
            <div className={`text-base font-black mt-0.5 ${dirtyCount > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {dirtyCount} store(s)
            </div>
            <div className="text-slate-400 text-[11px]">
              {dirtyCount > 0 ? 'Modified locally since last cloud push' : 'All stores match last sync'}
            </div>
          </div>
        </div>

        {/* Auto-sync bar */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800 text-xs">
          <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded accent-sky-500"
            />
            Enable Background Auto-Sync
          </label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Interval:</span>
            <select
              value={autoInterval}
              onChange={(e) => setAutoInterval(Number(e.target.value))}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white"
            >
              <option value={0}>Manual Only</option>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Workstation Name:</span>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white w-44"
              placeholder="FACTORY-MAIN-PC"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSaveConfig()}
            disabled={busy !== null}
            className="ml-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
          >
            {busy === 'save' ? 'Saving...' : 'Save Sync Settings'}
          </button>
        </div>
      </div>

      {/* Cloud Server Anywhere Access Hub Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1">
          <span className="font-bold text-white text-xs flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Cloud Server &amp; Anywhere Access Hub (Mobile &amp; Remote Laptops)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              Staff ID &amp; Password
            </span>
          </span>
          <p className="text-[11px] text-slate-400">
            Access the entire EXMARK ERP from any smartphone on 4G/5G, iPad, or remote laptop using your Staff ID with live QR Code pairing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAccessModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer transition"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Open Access Hub &amp; QR Code</span>
        </button>
      </div>

      {/* Cloud Server Access Modal */}
      <CloudServerAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
      />

      {/* Live Test Output */}
      {testReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div
            className={`p-4 rounded-xl border ${
              testReport.postgres?.reachable
                ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
                : 'bg-amber-950/30 border-amber-700/50 text-amber-200'
            }`}
          >
            <div className="font-bold uppercase text-[11px]">PostgreSQL Diagnostic</div>
            <p className="mt-1">{testReport.postgres?.message}</p>
          </div>
          <div
            className={`p-4 rounded-xl border ${
              testReport.drive?.ready
                ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
                : 'bg-amber-950/30 border-amber-700/50 text-amber-200'
            }`}
          >
            <div className="font-bold uppercase text-[11px]">Google Drive Diagnostic</div>
            <p className="mt-1">{testReport.drive?.message}</p>
          </div>
        </div>
      )}

      {/* 2. Channel 1: PostgreSQL Vault & Outbox Sync */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            Channel 1 — Cloud PostgreSQL Database (Supabase / Neon)
          </h3>
          <label className="flex items-center gap-2 text-xs text-slate-200 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={postgresEnabled}
              onChange={(e) => setPostgresEnabled(e.target.checked)}
              className="rounded accent-sky-500"
            />
            Sync to PostgreSQL
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end text-xs">
          <div className="md:col-span-2 space-y-1">
            <label className="text-slate-400 font-medium flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-400" />
              Supabase / Neon PostgreSQL URI (AES-256 Encrypted Locally, Never Exported)
            </label>
            <input
              type="password"
              value={databaseUrlInput}
              onChange={(e) => setDatabaseUrlInput(e.target.value)}
              placeholder={
                overview?.secretsSummary.maskedDatabaseUrl
                  ? `Saved: ${overview.secretsSummary.maskedDatabaseUrl} (leave blank to keep)`
                  : 'postgresql://postgres:PASSWORD@host:5432/postgres?sslmode=require'
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={busy !== null}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
            >
              Save URL
            </button>
            {overview?.secretsSummary.hasDatabaseUrl && (
              <button
                type="button"
                onClick={() => handleSaveConfig({ clearDatabaseUrl: true, postgresEnabled: false })}
                disabled={busy !== null}
                className="px-3 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-200 border border-red-700/50 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={() => handlePushNow(true)}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" /> Force Push All {overview?.localStoreCount || 28} Stores
          </button>
          <button
            type="button"
            onClick={handleInspectDiff}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
          >
            Inspect Cloud Diff
          </button>
          <button
            type="button"
            onClick={() => handlePullFromPostgres('MERGE_NEWER')}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CloudDownload className="w-3.5 h-3.5" /> Pull Remote (Keep Newer Local)
          </button>
          <button
            type="button"
            onClick={() => handlePullFromPostgres('OVERWRITE_ALL')}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" /> Restore Exact Cloud Mirror
          </button>
        </div>

        {remoteDiff && (
          <div className="rounded-lg border border-slate-800 bg-[#070D1E] p-3 max-h-60 overflow-y-auto text-xs space-y-1.5">
            <div className="font-bold text-slate-300">
              Remote Store Comparison ({remoteDiff.filter((d) => d.status !== 'IN_SYNC').length} difference(s))
            </div>
            {remoteDiff.map((row) => (
              <div key={row.storeKey} className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="font-mono text-slate-200">{row.storeKey}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    Local {(row.localBytes / 1024).toFixed(1)} KB vs Cloud {(row.remoteBytes / 1024).toFixed(1)} KB
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      row.status === 'IN_SYNC'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : row.status === 'MODIFIED'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-sky-500/20 text-sky-300'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Channel 2: Google Drive Automated Vault Backup */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderSync className="w-4 h-4 text-amber-400" />
            Channel 2 — Google Drive Cloud Backup ({googleEmail})
          </h3>
          <label className="flex items-center gap-2 text-xs text-slate-200 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={driveEnabled}
              onChange={(e) => setDriveEnabled(e.target.checked)}
              className="rounded accent-amber-500"
            />
            Enable Google Drive Sync
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Delivery Method</label>
            <select
              value={driveMode}
              onChange={(e) =>
                setDriveMode(e.target.value as 'LOCAL_FOLDER' | 'GOOGLE_OAUTH2' | 'APPS_SCRIPT_WEBHOOK')
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            >
              <option value="LOCAL_FOLDER">Google Drive Desktop Folder (Zero OAuth)</option>
              <option value="APPS_SCRIPT_WEBHOOK">Google Apps Script Bridge (exmarkdoors@gmail.com)</option>
              <option value="GOOGLE_OAUTH2">Google Drive Direct OAuth2 API</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 font-medium block mb-1">Google Account Email</label>
            <input
              type="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium block mb-1">Retention Snapshots</label>
            <input
              type="number"
              min={3}
              max={60}
              value={driveRetention}
              onChange={(e) => setDriveRetention(Number(e.target.value) || 15)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </div>
        </div>

        {driveMode === 'LOCAL_FOLDER' && (
          <div className="space-y-2 text-xs">
            <label className="text-slate-400 font-medium block">
              Local Google Drive Sync Folder Path (mirrored automatically by Google Drive for Desktop)
            </label>
            <input
              type="text"
              value={driveLocalFolder}
              onChange={(e) => setDriveLocalFolder(e.target.value)}
              placeholder="G:\My Drive\EXMARK-ERP-Cloud"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
            />
            {detectedFolders.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">Detected synced folders:</span>
                {detectedFolders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDriveLocalFolder(f)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] cursor-pointer"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {driveMode === 'APPS_SCRIPT_WEBHOOK' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Apps Script Web App URL {overview?.secretsSummary.hasAppsScriptWebhook ? '(Saved)' : ''}
              </label>
              <input
                type="password"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Shared Bridge Secret Token</label>
              <input
                type="password"
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder="Optional shared secret"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>
        )}

        {driveMode === 'GOOGLE_OAUTH2' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">
                OAuth Client ID {overview?.secretsSummary.hasOAuthCredentials ? '(Saved)' : ''}
              </label>
              <input
                type="password"
                value={oauthClientId}
                onChange={(e) => setOauthClientId(e.target.value)}
                placeholder="...apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">OAuth Client Secret</label>
              <input
                type="password"
                value={oauthClientSecret}
                onChange={(e) => setOauthClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">OAuth Refresh Token</label>
              <input
                type="password"
                value={oauthRefreshToken}
                onChange={(e) => setOauthRefreshToken(e.target.value)}
                placeholder="1//..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleSaveConfig()}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
          >
            Save Drive Settings
          </button>
          <button
            type="button"
            onClick={handleDriveBackupNow}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" /> Backup Vault to Google Drive Now
          </button>
          <button
            type="button"
            onClick={handleListDriveBackups}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
          >
            Browse Drive Snapshots
          </button>
        </div>

        {driveBackups && (
          <div className="rounded-lg border border-slate-800 bg-[#070D1E] p-3 space-y-2 text-xs max-h-56 overflow-y-auto">
            <div className="font-bold text-slate-300">
              Google Drive Backups ({driveBackups.length} found)
            </div>
            {driveBackups.length === 0 ? (
              <div className="text-slate-500">No Drive backups found yet.</div>
            ) : (
              driveBackups.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/60">
                  <div>
                    <span className="font-mono text-white">{f.name}</span>
                    <span className="text-slate-400 ml-2">
                      ({(f.sizeBytes / 1024).toFixed(1)} KB • {new Date(f.modifiedAt).toLocaleString()})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreDriveBackup(f)}
                    disabled={busy !== null}
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Sync Activity Ledger */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          Recent Cloud Sync History
        </h3>
        {!overview?.state.history || overview.state.history.length === 0 ? (
          <p className="text-xs text-slate-500">No sync runs recorded yet.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {overview.state.history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#070D1E] border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      h.status === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : h.status === 'PARTIAL'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {h.status}
                  </span>
                  <span className="font-mono text-slate-300">{h.kind}</span>
                  <span className="text-white">{h.summary}</span>
                </div>
                <span className="text-slate-400">
                  {new Date(h.timestamp).toLocaleString()} ({h.durationMs}ms)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
