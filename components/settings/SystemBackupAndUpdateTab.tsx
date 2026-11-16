'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  KeyRound,
  History,
  FileCheck2,
  BookOpenCheck,
  FolderOpen,
  Copy,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';

interface VaultStatusData {
  dataDir: string;
  backupDir: string;
  isExternalDataDir: boolean;
  isExternalBackupDir: boolean;
  configuredEnvVar: string | null;
}

interface ReleaseInfoData {
  releaseDir: string;
  executablePath: string | null;
  workspaceDistDir: string | null;
  packagedArtifacts: Array<{
    name: string;
    sizeBytes: number;
    updatedAt: string;
  }>;
}

interface SchemaStatusData {
  schemaVersion: number;
  appVersion: string;
  lastMigratedAt: string;
  appliedMigrations: Array<{
    version: number;
    name: string;
    appliedAt: string;
    summary: string;
  }>;
}

interface SnapshotMeta {
  backupId: string;
  timestamp: string;
  trigger: string;
  filesIncluded: string[];
  totalSizeBytes: number;
  checksumSha256: string;
  verified: boolean;
}

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeCode: string;
  customPasswordSet: boolean;
  isActive: boolean;
}

export default function SystemBackupAndUpdateTab() {
  const [loading, setLoading] = useState(true);
  const [vaultStatus, setVaultStatus] = useState<VaultStatusData | null>(null);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfoData | null>(null);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatusData | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.1');
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change state
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // Fresh Factory Reset phrase state
  const [resetPhrase, setResetPhrase] = useState<string>('');
  const [showResetBox, setShowResetBox] = useState<boolean>(false);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 6000);
  };

  const loadVaultStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultRes, usersRes] = await Promise.all([
        apiFetch('/api/system/vault-status'),
        apiFetch('/api/auth/users'),
      ]);
      if (vaultRes.ok) {
        const json = await vaultRes.json();
        if (json.success) {
          setVaultStatus(json.vaultStatus);
          setReleaseInfo(json.releaseInfo || null);
          setSchemaStatus(json.schemaStatus);
          setAppVersion(json.appVersion || '1.0.1');
          setRecordCounts(json.recordCounts || {});
          setSnapshots(Array.isArray(json.snapshots) ? json.snapshots : []);
        }
      } else {
        const errJson = await vaultRes.json().catch(() => null);
        showNotice('error', errJson?.error || 'Super Admin login required to manage factory backups.');
      }

      if (usersRes.ok) {
        const uJson = await usersRes.json();
        if (uJson.success && Array.isArray(uJson.data)) {
          setUsers(uJson.data);
          setSelectedUserEmail((prev) => prev || uJson.data[0]?.email || '');
        }
      }
    } catch {
      showNotice('error', 'Could not reach factory vault diagnostics API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVaultStatus();
  }, [loadVaultStatus]);

  const handleCreatePreUpdateBackup = async () => {
    setBusyAction('backup');
    try {
      const res = await apiFetch('/api/system/vault-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_PRE_UPDATE_BACKUP' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Backup failed');
      showNotice('success', json.message);
      await loadVaultStatus();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Backup creation failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadOfflineBundle = async () => {
    setBusyAction('download');
    try {
      const res = await apiFetch('/api/system/backup/download');
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Download unauthorized or failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exmark-factory-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotice('success', 'Downloaded verified portable factory backup JSON for USB / Google Drive safekeeping.');
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to download backup file.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUploadRestoreBundle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!window.confirm(`Restore factory data from ${file.name}? A pre-restore safety backup will be created automatically first.`)) {
      return;
    }

    setBusyAction('restore-file');
    try {
      const rawText = await file.text();
      const bundle = JSON.parse(rawText);
      const res = await apiFetch('/api/system/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Restore failed');
      showNotice('success', `${json.message} (Pre-restore snapshot: ${json.preRestoreBackupId})`);
      await loadVaultStatus();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to verify or restore backup file.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifySnapshot = async (backupId: string) => {
    setBusyAction(`verify-${backupId}`);
    try {
      const res = await apiFetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', backupId }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        throw new Error(json.errors?.join('; ') || json.error || 'Checksum mismatch detected');
      }
      showNotice('success', `Snapshot ${backupId} passed SHA-256 integrity verification cleanly.`);
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Snapshot verification failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestoreSnapshot = async (backupId: string) => {
    if (!window.confirm(`Restore data vault from snapshot ${backupId}? An automatic PRE_RESTORE archive of current files will be saved first.`)) {
      return;
    }
    setBusyAction(`restore-${backupId}`);
    try {
      const res = await apiFetch('/api/system/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Snapshot restore failed');
      showNotice('success', `${json.message} (Pre-restore backup: ${json.preRestoreBackupId})`);
      await loadVaultStatus();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Snapshot restore failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunSchemaUpgrade = async () => {
    setBusyAction('migrate');
    try {
      const res = await apiFetch('/api/system/vault-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_SCHEMA_MIGRATION' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Schema check failed');
      showNotice('success', json.message);
      await loadVaultStatus();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Migration failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail || newPassword.length < 6) {
      showNotice('error', 'Select an account and enter a password with at least 6 characters.');
      return;
    }
    setBusyAction('password');
    try {
      const res = await apiFetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PASSWORD',
          email: selectedUserEmail,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Password update failed');
      setNewPassword('');
      showNotice('success', json.message);
      await loadVaultStatus();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleFreshFactoryReset = async () => {
    if (resetPhrase.trim() !== 'FRESH FACTORY START') {
      showNotice('error', 'Please type FRESH FACTORY START exactly to confirm wiping test transactions.');
      return;
    }
    setBusyAction('reset');
    try {
      const res = await apiFetch('/api/system/reset-zero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPhrase: resetPhrase.trim(),
          cleanTestBackups: true,
          resetEmployees: true,
          inventoryZeroMode: 'keep-zero',
          createPreResetBackup: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Factory reset failed');
      setResetPhrase('');
      setShowResetBox(false);
      showNotice(
        'success',
        `Factory reset complete! All transactions cleared to 0 while BOQ formulas, Lock Kits, Frames & Settings remained preserved. (Safety backup: ${json.result?.preResetBackupId || 'Saved'})`
      );
      await loadVaultStatus();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Factory reset failed.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* 1. Data Vault & Schema Status */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-400" />
              External Factory Data Vault &amp; Schema Control
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live factory data is separated from application code so future upgrades never overwrite orders, rates, or formulas.
            </p>
          </div>
          <button
            type="button"
            onClick={loadVaultStatus}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 flex items-center gap-1.5 self-start cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Vault Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#070D1E] border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Active Data Vault Path</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  vaultStatus?.isExternalDataDir
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {vaultStatus?.isExternalDataDir ? 'EXTERNAL ISOLATED' : 'APP-LOCAL PATH'}
              </span>
            </div>
            <p className="font-mono text-white break-all">{vaultStatus?.dataDir || 'Loading...'}</p>
            <p className="text-[11px] text-slate-500">
              Env var: <code className="text-slate-300">{vaultStatus?.configuredEnvVar ? 'EXMARK_DATA_DIR set' : 'Not set (set C:\\EXMARK-ERP-DATA)'}</code>
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070D1E] border border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Snapshots Archive Folder</span>
            <p className="font-mono text-white break-all">{vaultStatus?.backupDir || 'Loading...'}</p>
            <p className="text-[11px] text-slate-500">
              {snapshots.length} verified SHA-256 snapshot(s) on disk
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070D1E] border border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Software &amp; Schema Version</span>
            <p className="text-sm font-black text-emerald-400">
              ERP v{appVersion} • Schema v{schemaStatus?.schemaVersion ?? 0}
            </p>
            <p className="text-[11px] text-slate-500">
              Last migrated: {schemaStatus?.lastMigratedAt ? new Date(schemaStatus.lastMigratedAt).toLocaleString() : 'Never run'}
            </p>
          </div>
        </div>

        {/* Desktop EXE & Release Locations */}
        {releaseInfo && (
          <div className="p-3.5 rounded-lg bg-[#070D1E] border border-slate-800 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                  Windows EXE Release Hub &amp; Binary Path
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(releaseInfo.releaseDir);
                  showNotice('success', `Copied EXE release folder path: ${releaseInfo.releaseDir}`);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy Release Path
              </button>
            </div>
            <p className="font-mono text-white break-all">{releaseInfo.releaseDir}</p>
            <div className="flex flex-wrap gap-2">
              {releaseInfo.packagedArtifacts.length > 0 ? (
                releaseInfo.packagedArtifacts.map((art) => (
                  <span
                    key={art.name}
                    className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[11px]"
                  >
                    {art.name} ({(art.sizeBytes / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-500">
                  Run desktop build or &quot;npm run desktop:publish&quot; to populate EXE files in {releaseInfo.releaseDir}.
                </span>
              )}
            </div>
            {(releaseInfo.executablePath || releaseInfo.workspaceDistDir) && (
              <p className="text-[11px] text-slate-400 font-mono break-all">
                {releaseInfo.executablePath
                  ? `Running EXE: ${releaseInfo.executablePath}`
                  : `Build Staging Folder: ${releaseInfo.workspaceDistDir}`}
              </p>
            )}
          </div>
        )}

        {/* Record Counts Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
          {[
            ['Customers', recordCounts.customers],
            ['Quotations', recordCounts.quotations],
            ['CRM Leads', recordCounts.leads],
            ['Measurements', recordCounts.measurements],
            ['Production', recordCounts.production],
            ['Invoices', recordCounts.invoices],
            ['Contractors', recordCounts.contractors],
            ['BOQs', recordCounts.boqs],
            ['Purchases', recordCounts.purchases],
            ['Staff', recordCounts.employees],
            ['Login Users', recordCounts.users],
            ['Snapshots', snapshots.length],
          ].map(([label, val]) => (
            <div key={String(label)} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">{label}</div>
              <div className="text-base font-black text-white mt-0.5">{val ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Backup & Zero-Data-Loss Controls */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          One-Click Pre-Update Backup, Offline Export &amp; Restore
        </h3>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleCreatePreUpdateBackup}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            {busyAction === 'backup' ? 'Creating Snapshot...' : 'Create Pre-Update Backup Now'}
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleDownloadOfflineBundle}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {busyAction === 'download' ? 'Preparing JSON...' : 'Download Offline Backup File (USB / Cloud)'}
          </button>

          <label className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>{busyAction === 'restore-file' ? 'Verifying & Restoring...' : 'Restore from Offline Backup File'}</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleUploadRestoreBundle}
              className="hidden"
            />
          </label>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleRunSchemaUpgrade}
            className="px-4 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            {busyAction === 'migrate' ? 'Checking...' : 'Run Non-Destructive Schema Upgrade Check'}
          </button>
        </div>

        {/* Snapshots Table */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" />
            Local Factory Snapshot History
          </div>
          {snapshots.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#070D1E] border border-dashed border-slate-800 text-xs text-slate-400">
              No backup snapshots found in the current backup vault. Click &quot;Create Pre-Update Backup Now&quot; to archive current rates &amp; settings.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070D1E] text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Snapshot ID</th>
                    <th className="py-2.5 px-3">Trigger</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3">SHA-256 Digest</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#0B132B]">
                  {snapshots.slice(0, 12).map((snap) => (
                    <tr key={snap.backupId}>
                      <td className="py-2 px-3 font-mono font-bold text-white">{snap.backupId}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                          {snap.trigger}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {new Date(snap.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-emerald-400">
                        {snap.checksumSha256.slice(0, 16)}... ({snap.filesIncluded.length} files)
                      </td>
                      <td className="py-2 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleVerifySnapshot(snap.backupId)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                        >
                          Verify SHA-256
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap.backupId)}
                          className="px-2.5 py-1 rounded bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 text-[11px] font-semibold cursor-pointer"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Persistent Factory User Passwords */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            Factory Login Passwords (Persisted Inside External Vault)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Password changes are stored inside <code className="text-slate-300">users-store.json</code> in your external data vault so updates never reset factory passwords. To create new logins, set 4–6 digit Quick PINs, or remove unused demo accounts, open the <strong>Staff Logins &amp; Roles</strong> tab in Settings.
          </p>
        </div>

        <form onSubmit={handleUpdateUserPassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Staff Account</label>
            <select
              value={selectedUserEmail}
              onChange={(e) => setSelectedUserEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name} ({u.role}) {u.customPasswordSet ? '✓ Custom Password' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">New Password (Min 6 chars)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new secure password"
              className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={busyAction !== null}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
          >
            Update Factory Password
          </button>
        </form>
      </div>

      {/* 4. Future Update SOP Formalities */}
      <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-blue-400" />
          Future Software Update Formalities (Zero Data Loss SOP)
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
          <li>
            <strong>External Data Vault Verified:</strong> Keep <code className="text-emerald-300">EXMARK_DATA_DIR=C:\EXMARK-ERP-DATA</code> configured in <code className="text-slate-200">.env.local</code> so replacing app code folders never touches live JSON data or backups.
          </li>
          <li>
            <strong>Pre-Update Backup (30 sec):</strong> Click <em>Create Pre-Update Backup Now</em> and optionally <em>Download Offline Backup File</em> to USB or Google Drive before updating.
          </li>
          <li>
            <strong>Run One-Click Updater:</strong> Double-click <code className="text-amber-300">update-factory-erp.bat</code> — it automatically snapshots data, updates code, executes non-destructive schema migrations (<code className="text-slate-200">npm run erp:migrate</code>), rebuilds Next.js, and starts the server.
          </li>
          <li>
            <strong>Post-Update Verification:</strong> Confirm active orders, custom FRP rate cards, Lock Box kits, and BOQ rates match on the dashboard before closing the update window.
          </li>
        </ol>
      </div>

      {/* 5. Danger Zone: Fresh Factory Reset */}
      <div className="bg-rose-950/20 p-5 rounded-xl border border-rose-500/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Fresh Factory Start Reset (Clear All Transactions)
            </h3>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Wipes all customers, quotes, leads, measurements, production orders, invoices, contractors, and staff to 0 while keeping calibrated BOQ formulas, Lock Box Kits, Frame presets, Tolerances, and Company Profile intact. Creates an automatic <code className="text-rose-200">PRE_RESET</code> safety backup first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetBox(!showResetBox)}
            className="px-3.5 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-500/50 text-xs font-bold text-white cursor-pointer self-start"
          >
            {showResetBox ? 'Cancel Reset' : 'Prepare Fresh Reset'}
          </button>
        </div>

        {showResetBox && (
          <div className="pt-3 border-t border-rose-500/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="block text-[11px] text-rose-200 mb-1">
                Type <strong className="font-mono text-white">FRESH FACTORY START</strong> to confirm:
              </label>
              <input
                type="text"
                value={resetPhrase}
                onChange={(e) => setResetPhrase(e.target.value)}
                placeholder="FRESH FACTORY START"
                className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-rose-500/40 text-xs text-white font-mono"
              />
            </div>
            <button
              type="button"
              disabled={busyAction !== null || resetPhrase.trim() !== 'FRESH FACTORY START'}
              onClick={handleFreshFactoryReset}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              {busyAction === 'reset' ? 'Resetting...' : 'Wipe Transactions & Start Fresh'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
