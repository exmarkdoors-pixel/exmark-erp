'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Users,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Copy,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  AccountingBucket,
  ColumnMapping,
} from '@/lib/utils/daybookParser';
import type {
  DayBookImportPreviewResponse,
  MonthlyAccountingSummary,
  MonthlyExpenseLine,
  MonthlyPayrollLine,
  PreviewDayBookRow,
} from '@/lib/services/daybookImportService';

const BUCKET_OPTIONS: Array<{ value: AccountingBucket; label: string; colorClass: string }> = [
  { value: 'FIXED_SALARY', label: 'Fixed Staff Salary (Fixed)', colorClass: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' },
  { value: 'FIXED_OVERHEAD', label: 'Fixed Factory Overhead (Fixed)', colorClass: 'text-red-300 bg-red-500/15 border-red-500/30' },
  { value: 'VARIABLE_FREIGHT', label: 'Variable Freight / Comm.', colorClass: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  { value: 'VARIABLE_MATERIAL', label: 'Raw Material Purchase (Var)', colorClass: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  { value: 'VARIABLE_PIECE_RATE', label: 'Gang Piece-Rate Labor (Var)', colorClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  { value: 'INFLOW_SALES_RECEIPT', label: 'Sales / Receipt (Inflow)', colorClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  { value: 'IGNORE_NON_EXPENSE', label: 'Contra / Vendor / Ignore', colorClass: 'text-slate-400 bg-slate-800 border-slate-700' },
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function getPrevMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

const formatInr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export interface DayBookAndExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  onSaved?: () => void | Promise<void>;
}

export function DayBookAndExpensesModal({
  isOpen,
  onClose,
  monthKey: initialMonthKey,
  onSaved,
}: DayBookAndExpensesModalProps) {
  const [activeTab, setActiveTab] = useState<'VYAPAR_IMPORT' | 'QUICK_MONTH_SHEET'>('VYAPAR_IMPORT');
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [summary, setSummary] = useState<MonthlyAccountingSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vyapar / Day Book Import State
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<DayBookImportPreviewResponse | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewDayBookRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showColMap, setShowColMap] = useState(false);
  const [colOverride, setColOverride] = useState<Partial<ColumnMapping>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick 1-Month Expenses & Staff Salaries State
  const [salaries, setSalaries] = useState<MonthlyPayrollLine[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpenseLine[]>([]);
  const [manualDoorsSold, setManualDoorsSold] = useState<string>('');
  const [manualSalesRevenue, setManualSalesRevenue] = useState<string>('');
  const [sheetNotes, setSheetNotes] = useState('');

  useEffect(() => {
    setMonthKey(initialMonthKey);
  }, [initialMonthKey]);

  const loadMonthData = useCallback(async (targetMonth: string) => {
    try {
      const res = await fetch(`/api/finance/daybook?month=${encodeURIComponent(targetMonth)}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const data = json.data as MonthlyAccountingSummary;
        setSummary(data);
        setSalaries(
          data.sheet?.salaries?.length
            ? data.sheet.salaries
            : [{ id: `SAL-${Date.now()}`, employeeName: '', role: 'Supervisor / Office', monthlySalary: 0, active: true }]
        );
        setExpenses(
          data.sheet?.expenses?.length
            ? data.sheet.expenses
            : [{ id: `MEXP-${Date.now()}`, label: '', bucket: 'FIXED_OVERHEAD', amount: 0, active: true }]
        );
        setManualDoorsSold(data.manualDoorsSold > 0 ? String(data.manualDoorsSold) : '');
        setManualSalesRevenue(data.manualSalesRevenue > 0 ? String(data.manualSalesRevenue) : '');
        setSheetNotes(data.sheet?.notes || '');
      }
    } catch {
      // ignore initial load error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setToast(null);
      loadMonthData(monthKey);
    }
  }, [isOpen, monthKey, loadMonthData]);

  if (!isOpen) return null;

  const runPreview = async (
    nextBase64 = fileBase64,
    nextRawText = rawText,
    nextFileName = fileName,
    override?: Partial<ColumnMapping>
  ) => {
    setError(null);
    setIsProcessing(true);
    try {
      const res = await fetch('/api/finance/daybook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PREVIEW',
          fileBase64: nextBase64,
          rawText: nextRawText,
          fileName: nextFileName,
          defaultMonth: monthKey,
          columnOverride: override ?? (Object.keys(colOverride).length ? colOverride : undefined),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Unable to parse file or pasted Day Book.');
        return;
      }
      const prevData = json.data as DayBookImportPreviewResponse;
      setPreview(prevData);
      setPreviewRows(prevData.rows);
      setColOverride(prevData.columnMapping);
    } catch {
      setError('Failed to preview uploaded accounting file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);

    if (/\.(xlsx|xlsm)$/i.test(file.name)) {
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      setFileBase64(b64);
      setRawText('');
      await runPreview(b64, '', file.name, {});
    } else {
      const txt = await file.text();
      setFileBase64(undefined);
      setRawText(txt);
      await runPreview(undefined, txt, file.name, {});
    }
  };

  const handleCommitImport = async () => {
    if (!preview || previewRows.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/daybook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMMIT_IMPORT',
          fileName: fileName || 'Vyapar Export',
          detectedFormat: preview.detectedFormat,
          sourceType: preview.sourceType,
          rowsSkippedBanner: preview.rowsSkippedBanner,
          rowsSkippedTotals: preview.rowsSkippedTotals,
          skipDuplicates,
          rows: previewRows,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to save imported entries.');
        return;
      }
      const { insertedCount, skippedDuplicates: skipped } = json.data;
      setToast(`Imported ${insertedCount} Vyapar/Day Book entries (${skipped} duplicate rows skipped).`);
      setPreview(null);
      setPreviewRows([]);
      setFileBase64(undefined);
      setRawText('');
      setFileName('');
      await loadMonthData(monthKey);
      await onSaved?.();
    } catch {
      setError('Network error while committing import.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const res = await fetch(`/api/finance/daybook?batchId=${encodeURIComponent(batchId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToast('Removed imported batch.');
        await loadMonthData(monthKey);
        await onSaved?.();
      }
    } catch {
      setError('Failed to delete batch.');
    }
  };

  const handleEntryBucketChange = async (entryId: string, bucket: AccountingBucket) => {
    try {
      const res = await fetch('/api/finance/daybook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, bucket }),
      });
      if (res.ok) {
        await loadMonthData(monthKey);
        await onSaved?.();
      }
    } catch {
      setError('Failed to reclassify entry.');
    }
  };

  const handleSaveMonthSheet = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/daybook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_MONTH_SHEET',
          monthKey,
          salaries,
          expenses,
          manualDoorsSold: manualDoorsSold ? Number(manualDoorsSold) : 0,
          manualSalesRevenue: manualSalesRevenue ? Number(manualSalesRevenue) : 0,
          notes: sheetNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to save monthly expense & salary sheet.');
        return;
      }
      setToast(`Saved 1-Month Expenses & Staff Salary sheet for ${monthKey}.`);
      await loadMonthData(monthKey);
      await onSaved?.();
    } catch {
      setError('Network error saving monthly sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClonePrevMonth = async () => {
    const prevM = getPrevMonth(monthKey);
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/daybook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLONE_PREVIOUS_MONTH',
          fromMonth: prevM,
          toMonth: monthKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || `No saved sheet found for ${prevM}`);
        return;
      }
      setToast(`Cloned fixed staff salaries & recurring expenses from ${prevM} into ${monthKey}.`);
      await loadMonthData(monthKey);
      await onSaved?.();
    } catch {
      setError('Failed to clone previous month.');
    } finally {
      setIsProcessing(false);
    }
  };

  const computePreviewBucketSum = (b: AccountingBucket) =>
    previewRows
      .filter((r) => r.includedInBreakEven && r.bucket === b)
      .reduce((s, r) => s + r.effectiveAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-500" />
              <span>Import Vyapar Expense Report / Day Book &amp; 1-Month Salaries</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload Vyapar <strong>.xlsx / .csv</strong> directly, paste from Excel, or enter 1-month Staff Salaries &amp; Factory Bills without double-counting Purchases or Contra transfers.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[11px] text-slate-400 font-semibold">Month:</label>
            <input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vyapar Export Quick Guide */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div>
              <strong>Using Vyapar Software?</strong> Uploading just <strong>Vyapar → Reports → Expense Category Report</strong> (or <strong>Expense Report</strong>) `.xlsx` is <strong>100% enough</strong> when your orders/BOQ are in EXMARK ERP.
            </div>
            <div className="text-[11px] text-blue-300/80">
              If uploading a full <strong>Vyapar Day Book</strong>, Purchases &amp; Vendor Payment-Out rows are automatically separated from Fixed Overheads so nothing is double-counted.
            </div>
          </div>
        </div>

        {toast && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
        {error && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('VYAPAR_IMPORT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === 'VYAPAR_IMPORT'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Vyapar / Day Book File Upload &amp; Paste</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUICK_MONTH_SHEET')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === 'QUICK_MONTH_SHEET'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1-Month Staff Salaries &amp; Quick Expenses ({monthKey})</span>
          </button>
        </div>

        {activeTab === 'VYAPAR_IMPORT' ? (
          <div className="space-y-4">
            {/* Upload + Paste Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-red-500/60 bg-slate-900/60 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-7 h-7 text-red-400" />
                <div className="text-xs font-bold text-white">
                  {fileName ? `Selected: ${fileName}` : 'Choose Vyapar Excel (.xlsx), CSV, or Tally XML'}
                </div>
                <span className="text-[11px] text-slate-400">
                  Supports Vyapar Expense Category Report, Expense Transaction Report &amp; Day Book
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xlsm,.csv,.tsv,.txt,.xml"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Or Copy &amp; Paste Straight From Excel / Vyapar</span>
                  <button
                    type="button"
                    disabled={isProcessing || (!rawText.trim() && !fileBase64)}
                    onClick={() => runPreview()}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    {isProcessing ? 'Parsing...' : 'Preview & Classify'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setFileBase64(undefined);
                  }}
                  placeholder={`Category Name\tAmount\nFactory Rent\t60000\nStaff Salary\t110000\nKSEB Power Bill\t32000\nDelivery Freight\t14000`}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Live Parsed Preview */}
            {preview && (
              <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Detected: {preview.detectedFormat.replace(/_/g, ' ')} ({preview.sourceType})
                    </span>
                    <span className="text-slate-400">
                      {previewRows.length} rows parsed
                      {preview.rowsSkippedBanner > 0 ? ` • ${preview.rowsSkippedBanner} top banner rows stripped` : ''}
                      {preview.rowsSkippedTotals > 0 ? ` • ${preview.rowsSkippedTotals} Total/summary rows stripped` : ''}
                      {preview.duplicateCount > 0 ? ` • ${preview.duplicateCount} duplicate entries detected` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowColMap((p) => !p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Column Mapping</span>
                    </button>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                      />
                      <span>Skip Duplicates</span>
                    </label>
                  </div>
                </div>

                {showColMap && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    {(
                      [
                        ['dateCol', 'Date Column'],
                        ['categoryCol', 'Category Column'],
                        ['particularsCol', 'Particulars / Party'],
                        ['amountCol', 'Amount Column'],
                        ['voucherTypeCol', 'Type / Voucher Column'],
                      ] as Array<[keyof ColumnMapping, string]>
                    ).map(([field, label]) => (
                      <div key={field}>
                        <span className="text-slate-400 block mb-1">{label}</span>
                        <select
                          value={colOverride[field] ?? -1}
                          onChange={(e) => {
                            const updated = { ...colOverride, [field]: Number(e.target.value) };
                            setColOverride(updated);
                            runPreview(fileBase64, rawText, fileName, updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100"
                        >
                          <option value={-1}>-- None --</option>
                          {preview.headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h || `Column ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bucket Totals Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                    <span className="text-[10px] text-indigo-300 block">Fixed Salaries</span>
                    <strong className="font-mono text-xs text-white">{formatInr(computePreviewBucketSum('FIXED_SALARY'))}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <span className="text-[10px] text-red-300 block">Fixed Overheads</span>
                    <strong className="font-mono text-xs text-white">{formatInr(computePreviewBucketSum('FIXED_OVERHEAD'))}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <span className="text-[10px] text-purple-300 block">Freight (Var)</span>
                    <strong className="font-mono text-xs text-white">{formatInr(computePreviewBucketSum('VARIABLE_FREIGHT'))}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <span className="text-[10px] text-blue-300 block">Materials (Var)</span>
                    <strong className="font-mono text-xs text-white">{formatInr(computePreviewBucketSum('VARIABLE_MATERIAL'))}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <span className="text-[10px] text-amber-300 block">Piece-Rate (Var)</span>
                    <strong className="font-mono text-xs text-white">{formatInr(computePreviewBucketSum('VARIABLE_PIECE_RATE'))}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 block">Sales / Inflow</span>
                    <strong className="font-mono text-xs text-white">{formatInr(computePreviewBucketSum('INFLOW_SALES_RECEIPT'))}</strong>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2 text-center">Use</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Category / Particulars</th>
                        <th className="p-2 text-right">Amount ₹</th>
                        <th className="p-2">Classification Bucket</th>
                        <th className="p-2">Reason / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className={!row.includedInBreakEven ? 'opacity-50' : ''}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.includedInBreakEven}
                              onChange={(e) =>
                                setPreviewRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, includedInBreakEven: e.target.checked } : r
                                  )
                                )
                              }
                            />
                          </td>
                          <td className="p-2 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="p-2">
                            <div className="font-bold text-white">{row.particulars}</div>
                            {row.category && row.category !== row.particulars && (
                              <div className="text-[10px] text-slate-400">Cat: {row.category}</div>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-white whitespace-nowrap">
                            {formatInr(row.effectiveAmount)}
                          </td>
                          <td className="p-2">
                            <select
                              value={row.bucket}
                              onChange={(e) => {
                                const newBucket = e.target.value as AccountingBucket;
                                setPreviewRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          bucket: newBucket,
                                          includedInBreakEven: newBucket !== 'IGNORE_NON_EXPENSE',
                                        }
                                      : r
                                  )
                                );
                              }}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-100"
                            >
                              {BUCKET_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 text-[10px] text-slate-400">
                            {row.isDuplicate ? (
                              <span className="text-amber-400 font-bold">Duplicate already in vault</span>
                            ) : (
                              row.classificationReason
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setPreviewRows([]);
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Discard Preview
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCommitImport}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {isProcessing ? 'Saving...' : 'Save & Apply to Break-Even'}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Imported Batches & Entries for Selected Month */}
            {summary && (summary.batches.length > 0 || summary.entries.length > 0) && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Saved Vyapar / Day Book Imports for {monthKey} ({summary.entries.length} entries)
                  </h3>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="text-indigo-300">Salary: {formatInr(summary.dayBookFixedSalaryTotal)}</span>
                    <span className="text-red-300">Fixed OH: {formatInr(summary.dayBookFixedOverheadTotal)}</span>
                    <span className="text-purple-300">Freight: {formatInr(summary.dayBookVariableFreightTotal)}</span>
                    <span className="text-slate-400">Ignored: {formatInr(summary.dayBookIgnoredTotal)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {summary.batches.map((b) => (
                    <div
                      key={b.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 flex items-center gap-2 text-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-white">{b.fileName}</span>
                      <span className="text-[10px] text-slate-400">({b.insertedRows} rows)</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="Delete this entire uploaded file batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Particulars / Category</th>
                        <th className="p-2 text-right">Amount ₹</th>
                        <th className="p-2">Bucket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {summary.entries.map((e) => (
                        <tr key={e.id}>
                          <td className="p-2 font-mono text-[11px] text-slate-400">{e.date}</td>
                          <td className="p-2 font-semibold text-slate-100">{e.particulars}</td>
                          <td className="p-2 text-right font-mono font-bold text-white">
                            {formatInr(e.effectiveAmount)}
                          </td>
                          <td className="p-2">
                            <select
                              value={e.bucket}
                              onChange={(ev) =>
                                handleEntryBucketChange(e.id, ev.target.value as AccountingBucket)
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-100"
                            >
                              {BUCKET_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: 1-Month Staff Salaries & Expenses Quick Sheet */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                Quick-enter monthly Fixed Staff Salaries &amp; Factory Expenses for <strong>{monthKey}</strong>.
              </div>
              <button
                type="button"
                onClick={handleClonePrevMonth}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Clone Staff &amp; Bills from {getPrevMonth(monthKey)}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Fixed Staff Salaries Table */}
              <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Fixed Monthly Staff Salaries</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSalaries((prev) => [
                        ...prev,
                        {
                          id: `SAL-${Date.now()}-${prev.length}`,
                          employeeName: '',
                          role: 'Production Staff',
                          monthlySalary: 0,
                          active: true,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Staff
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {salaries.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        value={row.employeeName}
                        onChange={(e) =>
                          setSalaries((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, employeeName: e.target.value } : s))
                          )
                        }
                        placeholder="Staff / Team Name"
                        className="col-span-5 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                      />
                      <input
                        type="text"
                        value={row.role}
                        onChange={(e) =>
                          setSalaries((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, role: e.target.value } : s))
                          )
                        }
                        placeholder="Role"
                        className="col-span-3 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300"
                      />
                      <input
                        type="number"
                        min="0"
                        value={row.monthlySalary || ''}
                        onChange={(e) =>
                          setSalaries((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, monthlySalary: Number(e.target.value) || 0 } : s
                            )
                          )
                        }
                        placeholder="₹ Salary"
                        className="col-span-3 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setSalaries((prev) => prev.filter((_, i) => i !== idx))}
                        className="col-span-1 p-1 text-rose-400 hover:text-rose-300 flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Expenses Table */}
              <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4" />
                    <span>1-Month Factory Expenses &amp; Bills</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setExpenses((prev) => [
                        ...prev,
                        {
                          id: `MEXP-${Date.now()}-${prev.length}`,
                          label: '',
                          bucket: 'FIXED_OVERHEAD',
                          amount: 0,
                          active: true,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Expense
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expenses.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) =>
                          setExpenses((prev) =>
                            prev.map((ex, i) => (i === idx ? { ...ex, label: e.target.value } : ex))
                          )
                        }
                        placeholder="Expense (Rent, KSEB, Freight...)"
                        className="col-span-5 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                      />
                      <select
                        value={row.bucket}
                        onChange={(e) =>
                          setExpenses((prev) =>
                            prev.map((ex, i) =>
                              i === idx
                                ? { ...ex, bucket: e.target.value as MonthlyExpenseLine['bucket'] }
                                : ex
                            )
                          )
                        }
                        className="col-span-3 px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-200"
                      >
                        <option value="FIXED_OVERHEAD">Fixed OH</option>
                        <option value="FIXED_SALARY">Salary</option>
                        <option value="VARIABLE_FREIGHT">Freight (Var)</option>
                        <option value="VARIABLE_MATERIAL">Material (Var)</option>
                        <option value="VARIABLE_PIECE_RATE">Piece Rate (Var)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={row.amount || ''}
                        onChange={(e) =>
                          setExpenses((prev) =>
                            prev.map((ex, i) =>
                              i === idx ? { ...ex, amount: Number(e.target.value) || 0 } : ex
                            )
                          )
                        }
                        placeholder="₹ Amt"
                        className="col-span-3 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setExpenses((prev) => prev.filter((_, i) => i !== idx))}
                        className="col-span-1 p-1 text-rose-400 hover:text-rose-300 flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Historical Month Volume & Sales Override */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Doors Sold in {monthKey} (If evaluating old Vyapar month)
                </label>
                <input
                  type="number"
                  min="0"
                  value={manualDoorsSold}
                  onChange={(e) => setManualDoorsSold(e.target.value)}
                  placeholder="e.g. 160"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Total Month Sales Revenue ₹ (Optional override)
                </label>
                <input
                  type="number"
                  min="0"
                  value={manualSalesRevenue}
                  onChange={(e) => setManualSalesRevenue(e.target.value)}
                  placeholder="e.g. 1360000"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={sheetNotes}
                  onChange={(e) => setSheetNotes(e.target.value)}
                  placeholder="From Vyapar P&L / Register..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveMonthSheet}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {isProcessing ? 'Saving...' : `Save ${monthKey} Salaries & Expenses`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
