'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Download,
  Filter,
  Eye,
  X,
  FileText,
  Clock,
  User,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  PlusCircle,
  Activity,
} from 'lucide-react';
import type { AuditLogRecord, AuditLogQueryResult } from '@/lib/audit/auditLogger';
import { apiFetch } from '@/lib/api/apiClient';

export default function AuditActivityLogsTab() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    todayCount: 0,
    createCount: 0,
    editCount: 0,
    deleteCount: 0,
  });

  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (actionFilter && actionFilter !== 'ALL') qs.set('action', actionFilter);
      if (entityFilter && entityFilter !== 'ALL') qs.set('entityType', entityFilter);
      qs.set('page', String(page));
      qs.set('limit', '25');

      if (dateRangeFilter === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        qs.set('fromDate', todayStr);
        qs.set('toDate', todayStr);
      } else if (dateRangeFilter === 'LAST_7_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        qs.set('fromDate', d.toISOString().slice(0, 10));
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        qs.set('fromDate', startOfMonth);
      }

      const res = await apiFetch(`/api/system/audit-log?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Failed to fetch logs (HTTP ${res.status})`);
      }

      const result = json.data as AuditLogQueryResult;
      setLogs(result.logs || []);
      setTotalCount(result.totalCount || 0);
      setTotalPages(result.totalPages || 1);
      if (result.metrics) {
        setMetrics(result.metrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [search, actionFilter, entityFilter, dateRangeFilter, page]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (actionFilter && actionFilter !== 'ALL') qs.set('action', actionFilter);
      if (entityFilter && entityFilter !== 'ALL') qs.set('entityType', entityFilter);
      qs.set('export', 'csv');

      const res = await apiFetch(`/api/system/audit-log?${qs.toString()}`);
      if (!res.ok) throw new Error('CSV Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exmark-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    const a = (action || '').toUpperCase();
    if (a.includes('CREATE') || a === 'BOQ_ISSUED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <PlusCircle className="w-3 h-3 text-emerald-700" />
          {action}
        </span>
      );
    }
    if (a.includes('UPDATE') || a.includes('EDIT') || a === 'BOQ_VOUCHER_EDITED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <Edit3 className="w-3 h-3 text-blue-700" />
          {action}
        </span>
      );
    }
    if (a.includes('DELETE') || a.includes('REVERSE') || a.includes('CANCEL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
          <Trash2 className="w-3 h-3 text-red-700" />
          {action}
        </span>
      );
    }
    if (a.includes('STATUS')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Activity className="w-3 h-3 text-amber-700" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
        {action}
      </span>
    );
  };

  const getEntityBadge = (entity: string) => {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-black border border-slate-400">
        {entity}
      </span>
    );
  };

  return (
    <div className="space-y-4 text-black bg-white font-sans">
      {/* Top Banner */}
      <div className="p-4 bg-slate-50 border-2 border-black rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-black text-white rounded-lg shadow-sm">
            <History className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-black flex items-center gap-2">
              System Activity &amp; Audit Log
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Real-time persistent audit tracking across all transactions, creations, edits, and deletions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            disabled={isLoading}
            onClick={fetchAuditLogs}
            className="px-3 py-1.5 rounded-lg border-2 border-black bg-white hover:bg-slate-100 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-black hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white border-2 border-black rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-black text-slate-500 block">Total Logged</span>
          <span className="text-lg font-black text-black">{metrics.totalEvents.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 bg-white border-2 border-black rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-black text-slate-500 block">Today&apos;s Actions</span>
          <span className="text-lg font-black text-black">{metrics.todayCount.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 bg-white border-2 border-black rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-black text-emerald-700 block">Created Records</span>
          <span className="text-lg font-black text-emerald-700">{metrics.createCount.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 bg-white border-2 border-black rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-black text-blue-700 block">Edits &amp; Updates</span>
          <span className="text-lg font-black text-blue-700">{metrics.editCount.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 bg-white border-2 border-black rounded-lg shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-black text-red-700 block">Deletions / Reversals</span>
          <span className="text-lg font-black text-red-700">{metrics.deleteCount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg flex flex-wrap items-center gap-2.5 text-xs">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by Job Card, Quotation, Voucher, Customer, Staff, Note..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md bg-white text-black font-semibold text-xs focus:border-black outline-none"
          />
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500">Action:</label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-black font-bold text-xs focus:border-black outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE / EDIT</option>
            <option value="DELETE">DELETE</option>
            <option value="BOQ">BOQ Actions</option>
            <option value="STATUS_CHANGE">STATUS CHANGE</option>
          </select>
        </div>

        {/* Entity filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500">Module:</label>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-black font-bold text-xs focus:border-black outline-none"
          >
            <option value="ALL">All Modules</option>
            <option value="ORDER">Production Orders / Job Cards</option>
            <option value="QUOTATION">Quotations</option>
            <option value="BOQ">BOQ &amp; Material Issue</option>
            <option value="INVENTORY">Inventory &amp; Stock</option>
            <option value="CUSTOMER">Customers &amp; Parties</option>
            <option value="SETTINGS">System Settings &amp; Rules</option>
          </select>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500">Time:</label>
          <select
            value={dateRangeFilter}
            onChange={(e) => {
              setDateRangeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-black font-bold text-xs focus:border-black outline-none"
          >
            <option value="ALL">All History</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="THIS_MONTH">This Month</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="border-2 border-black rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-black text-white text-[10px] uppercase font-black tracking-wider">
                <th className="py-2.5 px-3">Date &amp; Time (IST)</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Performed By</th>
                <th className="py-2.5 px-3">Summary Description</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-red-600 font-bold">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">No activity logs match the selected filters.</p>
                    <p className="text-[11px] text-slate-400">Try clearing search or broadening filter options.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedTime = dateObj.toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-slate-400 inline mr-1" />
                        {formattedTime}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{getEntityBadge(log.entityType)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black whitespace-nowrap">
                        {log.entityId || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <User className="w-3 h-3 text-slate-400 inline mr-1" />
                        {log.userName || log.userId || 'System'}
                      </td>
                      <td className="py-2.5 px-3 text-black font-medium max-w-md truncate" title={log.summary}>
                        {log.summary}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-black font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-xs"
                        >
                          <Eye className="w-3 h-3 text-blue-600" />
                          <span>View Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-xs font-semibold">
          <div className="text-slate-600">
            Showing <span className="font-bold text-black">{logs.length}</span> of{' '}
            <span className="font-bold text-black">{totalCount}</span> total events
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <span className="text-black font-bold font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail / Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm print:hidden">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-black rounded-xl shadow-2xl border-2 border-black flex flex-col font-sans">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-black text-white border-b-2 border-black">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Audit Event Details: {selectedLog.action}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {new Date(selectedLog.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs bg-white text-black">
              {/* Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Action Type</span>
                    <span className="font-black text-black">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Module / Entity</span>
                    <span className="font-black text-black">{selectedLog.entityType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Record Identifier</span>
                    <span className="font-mono font-black text-black">{selectedLog.entityId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Performed By</span>
                    <span className="font-bold text-black">{selectedLog.userName || selectedLog.userId}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Event Description</span>
                  <p className="text-xs font-bold text-black">{selectedLog.summary}</p>
                </div>
              </div>

              {/* Details & Diff Payload */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Change Diff &amp; Payload Details:
                </label>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-[300px]">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.details, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center font-bold">
                    No extra metadata was attached to this transaction.
                  </div>
                )}
              </div>

              {/* Technical Footprint */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">
                <div>
                  <span className="font-bold text-slate-800">Event ID:</span> {selectedLog.id}
                </div>
                <div>
                  <span className="font-bold text-slate-800">IP Address:</span> {selectedLog.ipAddress || 'Localhost / Internal'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-300 text-right">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-black text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
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
