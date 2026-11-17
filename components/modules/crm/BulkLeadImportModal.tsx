'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Users,
  Building2,
  Phone,
  Layers,
  ArrowRight,
  Loader2,
  Trash2,
  Check,
} from 'lucide-react';
import {
  parseCsvRows,
  parseLeadsCsv,
  getSampleCsvTemplate,
  ParsedLeadItem,
} from '@/lib/utils/bulkUploadParser';
import { LeadItem } from './LeadsPipeline';

interface BulkLeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads: LeadItem[];
  onImportSuccess: (importedCount: number) => void;
}

export function BulkLeadImportModal({
  isOpen,
  onClose,
  existingLeads,
  onImportSuccess,
}: BulkLeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedLeadItem[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'READY' | 'DUPLICATES' | 'ERRORS'>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle template download
  const handleDownloadTemplate = () => {
    const csvContent = getSampleCsvTemplate('LEADS');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EXMARK_CRM_Leads_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Process uploaded CSV file
  const processFile = (selectedFile: File) => {
    setErrorMsg(null);
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.type.includes('csv') && !selectedFile.type.includes('text')) {
      setErrorMsg('Please upload a valid .csv spreadsheet file.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          setErrorMsg('The selected CSV file is empty.');
          setParsedItems([]);
          return;
        }

        const rows = parseCsvRows(text);
        if (rows.length === 0) {
          setErrorMsg('No data rows found in the CSV file. Please make sure headers and data rows exist.');
          setParsedItems([]);
          return;
        }

        const { items } = parseLeadsCsv(rows, existingLeads);
        setParsedItems(items);
      } catch (err: any) {
        setErrorMsg(`Failed to parse CSV file: ${err.message || 'Malformed CSV format'}`);
        setParsedItems([]);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error reading file.');
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedItems([]);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Metrics
  const totalCount = parsedItems.length;
  const duplicateCount = parsedItems.filter((i) => i.isDuplicate).length;
  const errorCount = parsedItems.filter((i) => !i.isValid).length;
  const readyCount = parsedItems.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate)).length;

  const filteredItems = useMemo(() => {
    if (activeFilter === 'READY') {
      return parsedItems.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate));
    }
    if (activeFilter === 'DUPLICATES') {
      return parsedItems.filter((i) => i.isDuplicate);
    }
    if (activeFilter === 'ERRORS') {
      return parsedItems.filter((i) => !i.isValid);
    }
    return parsedItems;
  }, [parsedItems, activeFilter, skipDuplicates]);

  // Execute bulk import
  const handleImport = async () => {
    const leadsToImport = parsedItems.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate));
    if (leadsToImport.length === 0) {
      setErrorMsg('No valid leads available to import.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/crm/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToImport }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import bulk leads');
      }

      onImportSuccess(data.count || leadsToImport.length);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error during bulk lead import');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Bulk Lead Import</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Kerala CRM
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Import multiple leads from an Excel/CSV spreadsheet directly into your sales pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200 text-xs">
          {/* Template Download & Instructions Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-red-400" />
                Step 1: Download Standard Template
              </span>
              <p className="text-[11px] text-slate-400">
                Includes required headers (title, client, phone, district, doors, value, stage, notes) and sample Kerala architect/builder rows.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white rounded-lg border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-red-400" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                isDragging
                  ? 'border-red-500 bg-red-950/20'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                <Upload className="w-6 h-6 animate-bounce" />
              </div>
              <span className="text-sm font-bold text-white mb-1">
                Drag &amp; Drop your leads CSV file here
              </span>
              <span className="text-xs text-slate-400 max-w-sm mb-3">
                or click to browse your computer (.csv format supported from Excel, Google Sheets, or CRM exports)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                UTF-8 CSV &bull; Automatic Phone Normalization &bull; Duplicate Detection
              </span>
            </div>
          ) : (
            /* Uploaded File Overview & Filter Tabs */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-white block truncate">{file.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB &bull; {totalCount} total row(s) detected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/50 rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* KPI Badges / Filter Switch */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Rows</div>
                  <div className="text-lg font-black text-white">{totalCount}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('READY')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activeFilter === 'READY'
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready To Import
                  </div>
                  <div className="text-lg font-black text-emerald-400">{readyCount}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('DUPLICATES')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activeFilter === 'DUPLICATES'
                      ? 'bg-purple-950/40 border-purple-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Duplicate Phone
                  </div>
                  <div className="text-lg font-black text-purple-400">{duplicateCount}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('ERRORS')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activeFilter === 'ERRORS'
                      ? 'bg-rose-950/40 border-rose-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Validation Errors
                  </div>
                  <div className="text-lg font-black text-rose-400">{errorCount}</div>
                </button>
              </div>

              {/* Duplicate Handling Option */}
              {duplicateCount > 0 && (
                <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs text-purple-200">
                      <strong>{duplicateCount} lead(s)</strong> have phone numbers already in CRM or repeated in this file.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Skip duplicates on import
                    </span>
                  </label>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[36vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Project / Title</th>
                        <th className="p-2.5">Client &amp; Phone</th>
                        <th className="p-2.5">District</th>
                        <th className="p-2.5">Doors &amp; Count</th>
                        <th className="p-2.5">Est. Value</th>
                        <th className="p-2.5">Stage</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-[11px]">
                      {filteredItems.map((item, idx) => {
                        const isSkippedDueToDuplicate = item.isDuplicate && skipDuplicates;
                        const rowError = !item.isValid;

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-900/50 transition ${
                              rowError
                                ? 'bg-rose-950/15'
                                : isSkippedDueToDuplicate
                                ? 'bg-purple-950/10 opacity-70'
                                : 'bg-slate-950/30'
                            }`}
                          >
                            <td className="p-2.5 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-white">
                              <div>{item.title}</div>
                              {item.notes && (
                                <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                                  {item.notes}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-200">{item.client}</div>
                              <div className="text-slate-400 flex items-center gap-1 font-mono text-[10px]">
                                <Phone className="w-2.5 h-2.5" />
                                {item.phone || <span className="text-rose-400">Missing</span>}
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-300">{item.district}</td>
                            <td className="p-2.5">
                              <span className="font-semibold text-slate-200">{item.doorCount} doors</span>
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {item.doors}
                              </div>
                            </td>
                            <td className="p-2.5 font-bold text-emerald-400">
                              {item.value > 0 ? `₹${item.value.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="p-2.5">
                              <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {item.stage}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              {rowError ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                  title={item.error}
                                >
                                  <AlertCircle className="w-2.5 h-2.5" /> Invalid
                                </span>
                              ) : item.isDuplicate ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                  title={item.duplicateReason}
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  {skipDuplicates ? 'Skip Dup' : 'Duplicate'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <Check className="w-2.5 h-2.5" /> Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Callout */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {readyCount > 0 ? (
              <span>
                Ready to import <strong className="text-white">{readyCount} lead(s)</strong> into Kerala CRM
              </span>
            ) : (
              <span>Upload a CSV file to preview and import</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={readyCount === 0 || isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-950/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Leads...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import {readyCount} Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
