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
  Phone,
  Loader2,
  Trash2,
  Check,
  ClipboardPaste,
  FileText,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  parseCsvRows,
  parseLeadsCsv,
  parseExcelFile,
  generateExcelTemplate,
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
  const [inputMode, setInputMode] = useState<'UPLOAD' | 'PASTE'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedLeadItem[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'READY' | 'WARNINGS' | 'DUPLICATES' | 'ERRORS'>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Excel (.xlsx) Template Download
  const handleDownloadExcelTemplate = () => {
    try {
      const bytes = generateExcelTemplate('LEADS');
      const blob = new Blob([bytes as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'EXMARK_CRM_Leads_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(`Failed to generate Excel template: ${err.message}`);
    }
  };

  // Handle CSV Template Download
  const handleDownloadCsvTemplate = () => {
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

  // Process uploaded file (supports .xlsx, .xls, .csv, .tsv, .txt)
  const processFile = async (selectedFile: File) => {
    setErrorMsg(null);
    setIsParsing(true);
    setFile(selectedFile);

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    try {
      let rows: Array<Record<string, string>> = [];

      if (isExcel) {
        // Native binary Excel parser via SheetJS
        rows = await parseExcelFile(selectedFile);
      } else {
        // Text / CSV / TSV parser with BOM stripping
        const text = await selectedFile.text();
        if (!text || text.trim().length === 0) {
          setErrorMsg('The selected spreadsheet file is empty.');
          setParsedItems([]);
          setIsParsing(false);
          return;
        }
        rows = parseCsvRows(text);
      }

      if (rows.length === 0) {
        setErrorMsg('No data rows found in the file. Ensure headers and at least one lead row exist.');
        setParsedItems([]);
        setIsParsing(false);
        return;
      }

      const { items } = parseLeadsCsv(rows, existingLeads);
      setParsedItems(items);
    } catch (err: any) {
      setErrorMsg(`Failed to parse file: ${err.message || 'Corrupt or unsupported format'}`);
      setParsedItems([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Process text pasted from Excel / Google Sheets
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    setErrorMsg(null);

    if (!text.trim()) {
      setParsedItems([]);
      return;
    }

    try {
      const rows = parseCsvRows(text);
      if (rows.length === 0) {
        setParsedItems([]);
        return;
      }
      const { items } = parseLeadsCsv(rows, existingLeads);
      setParsedItems(items);
    } catch (err: any) {
      setErrorMsg(`Error parsing pasted data: ${err.message}`);
    }
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
    setPasteText('');
    setParsedItems([]);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Metrics
  const totalCount = parsedItems.length;
  const duplicateCount = parsedItems.filter((i) => i.isDuplicate).length;
  const errorCount = parsedItems.filter((i) => !i.isValid).length;
  const warningCount = parsedItems.filter((i) => i.isValid && !i.isDuplicate && i.warning).length;
  const readyCount = parsedItems.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate)).length;

  const filteredItems = useMemo(() => {
    if (activeFilter === 'READY') {
      return parsedItems.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate));
    }
    if (activeFilter === 'WARNINGS') {
      return parsedItems.filter((i) => i.isValid && !i.isDuplicate && i.warning);
    }
    if (activeFilter === 'DUPLICATES') {
      return parsedItems.filter((i) => i.isDuplicate);
    }
    if (activeFilter === 'ERRORS') {
      return parsedItems.filter((i) => !i.isValid);
    }
    return parsedItems;
  }, [parsedItems, activeFilter, skipDuplicates]);

  // Execute bulk import using authenticated apiFetch
  const handleImport = async () => {
    const leadsToImport = parsedItems.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate));
    if (leadsToImport.length === 0) {
      setErrorMsg('No valid leads available to import.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch('/api/crm/leads/bulk', {
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
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Excel (.xlsx) &amp; CSV Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Import leads directly from Microsoft Excel (.xlsx), CSV, or paste copied table rows
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
          {/* Step 1: Download Templates */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-red-400" />
                Step 1: Download Official Excel / CSV Template
              </span>
              <p className="text-[11px] text-slate-400">
                Includes Project Name, Client/Party, Contact, Mobile, District, Door Specs, Value, and Stage with sample rows.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg border border-emerald-500/40 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                title="Download formatted Excel (.xlsx) file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Excel Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                title="Download plain text CSV file"
              >
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                <span>CSV Template</span>
              </button>
            </div>
          </div>

          {/* Step 2: Input Mode Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setInputMode('UPLOAD')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                inputMode === 'UPLOAD'
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Option A: Upload File (.xlsx, .xls, .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('PASTE')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                inputMode === 'PASTE'
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Option B: Paste from Excel / Sheets (Ctrl+V)</span>
            </button>
          </div>

          {/* Mode A: Upload File */}
          {inputMode === 'UPLOAD' && (
            <div>
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
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                    {isParsing ? (
                      <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                    ) : (
                      <Upload className="w-6 h-6 animate-bounce" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    {isParsing ? 'Reading spreadsheet...' : 'Drag & Drop your Excel or CSV file here'}
                  </span>
                  <span className="text-xs text-slate-400 max-w-sm mb-3">
                    Supports Microsoft Excel (.xlsx, .xls), Google Sheets export, and CSV
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                    Native .xlsx support &bull; Automatic Delimiter &bull; UTF-8 BOM Safe
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl gap-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{file.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB &bull; {totalCount} row(s) loaded
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
              )}
            </div>
          )}

          {/* Mode B: Direct Paste */}
          {inputMode === 'PASTE' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Copy cells from Excel or Google Sheets (Ctrl+C) and paste below (Ctrl+V):</span>
                {pasteText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Text
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={'Project Name\tClient\tMobile\tDistrict\tDoors\nVilla Perinthalmanna\tSkyline\t9846012345\tMalappuram\t14 FRP\nKochi Flat\tMetro Builders\t9447067890\tErnakulam\t8 FRP'}
                className="w-full px-3 py-2 bg-slate-900/90 text-white font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-red-500 placeholder:text-slate-600 resize-y"
              />
            </div>
          )}

          {/* Results Summary & Table (if data parsed) */}
          {totalCount > 0 && (
            <div className="space-y-3 pt-1">
              {/* Filter Tabs / KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </div>
                  <div className="text-lg font-black text-emerald-400">{readyCount}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('WARNINGS')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activeFilter === 'WARNINGS'
                      ? 'bg-amber-950/40 border-amber-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Warnings
                  </div>
                  <div className="text-lg font-black text-amber-400">{warningCount}</div>
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
                    <Copy className="w-3 h-3" /> Duplicates
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
                    <AlertCircle className="w-3 h-3" /> Errors
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
                      <strong>{duplicateCount} lead(s)</strong> have matching mobile numbers already in CRM or repeated in this batch.
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
                      Skip duplicate numbers
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
                                ? 'bg-rose-950/20'
                                : isSkippedDueToDuplicate
                                ? 'bg-purple-950/10 opacity-70'
                                : item.warning
                                ? 'bg-amber-950/10'
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
                                {item.phone || <span className="text-amber-400">None</span>}
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
                              ) : item.warning ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  title={item.warning}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" /> {item.warning.includes('under 10') ? 'Short Phone' : 'No Phone'}
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
                Ready to import <strong className="text-white">{readyCount} lead(s)</strong> into Kerala CRM Pipeline
              </span>
            ) : (
              <span>Upload a file or paste rows from Excel to preview</span>
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
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
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
