'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Database,
  Building2,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseCsvRows } from '@/lib/utils/bulkUploadParser';
import {
  detectVyaparHeaderMapping,
  normalizeVyaparRow,
} from '@/lib/services/vyaparParserUtils';
import {
  NormalizedPartyImportRecord,
  PartyDuplicateStrategy,
  PartyImportFieldMapping,
  PartyImportSummary,
} from '@/types/vyaparSync';
import { CustomerType } from '@/lib/services/customerService';
import { apiFetch } from '@/lib/api/apiClient';

interface VyaparPartyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  onImportSuccess?: () => void;
  isSupplierMode?: boolean;
  partyType?: 'CUSTOMER' | 'SUPPLIER';
}

export function VyaparPartyImportModal({
  isOpen,
  onClose,
  onImportComplete,
  onImportSuccess,
  isSupplierMode = false,
  partyType,
}: VyaparPartyImportModalProps) {
  const isSupplier = isSupplierMode || partyType === 'SUPPLIER';
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'PREVIEW' | 'IMPORTING' | 'SUMMARY'>('UPLOAD');
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<Array<Record<string, string>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<PartyImportFieldMapping>({ partyName: '', phone: '' });
  const [previewRecords, setPreviewRecords] = useState<NormalizedPartyImportRecord[]>([]);

  // Import options
  const [duplicateStrategy, setDuplicateStrategy] = useState<PartyDuplicateStrategy>('SKIP');
  const [defaultCustomerType, setDefaultCustomerType] = useState<CustomerType>('DEALER');
  const [postOpeningBalancesToLedger, setPostOpeningBalancesToLedger] = useState<boolean>(true);
  const [defaultDistrict, setDefaultDistrict] = useState<string>('Malappuram');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<PartyImportSummary | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsLoading(true);
    setFileName(file.name);

    try {
      let parsedRows: Array<Record<string, string>> = [];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
        const text = await file.text();
        parsedRows = parseCsvRows(text);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
      }

      if (parsedRows.length === 0) {
        throw new Error('The uploaded file is empty or could not be parsed.');
      }

      const fileHeaders = Object.keys(parsedRows[0] || {});
      setRawRows(parsedRows);
      setHeaders(fileHeaders);

      const autoMap = detectVyaparHeaderMapping(fileHeaders);
      setMapping(autoMap);

      // Generate initial preview of 5 rows
      const previews = parsedRows.slice(0, 10).map((r, i) =>
        normalizeVyaparRow(r, autoMap, defaultCustomerType, defaultDistrict, i + 1)
      );
      setPreviewRecords(previews);

      setStep('PREVIEW');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    setIsLoading(true);
    setStep('IMPORTING');
    setErrorMsg(null);

    try {
      const res = await apiFetch('/api/customers/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rawRows,
          mapping,
          duplicateStrategy,
          defaultCustomerType,
          postOpeningBalancesToLedger,
          defaultDistrict,
          importAsSuppliers: isSupplierMode,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete import');
      }

      setSummary(json.data);
      setStep('SUMMARY');
      if (onImportComplete) onImportComplete();
      if (onImportSuccess) onImportSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error executing bulk import.');
      setStep('PREVIEW');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-2xl bg-[#091024] border border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-slate-900/40 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>{isSupplier ? 'Import Suppliers from Vyapar / Excel' : 'Vyapar App & Bulk Party Importer'}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Vyapar Compatible
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                1-Click migration of Customers, Dealers, Builders &amp; Suppliers with balances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 'UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 rounded-2xl p-8 text-center transition-all bg-slate-900/30 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Upload Vyapar Party Excel or CSV</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code> exported from Vyapar App or Excel
                  </p>
                </div>
                <label className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>Choose File to Import</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                </label>
              </div>

              {/* Template Download Box */}
              <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Need the Official EXMARK Excel Template?</h4>
                    <p className="text-[11px] text-slate-400">
                      Standard import template with sample rows and field formatting guide
                    </p>
                  </div>
                </div>
                <a
                  href="/api/customers/bulk-import/template"
                  download="EXMARK_Party_Import_Template.xlsx"
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .xlsx</span>
                </a>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Options */}
          {step === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="font-bold text-white">
                  File: <span className="text-blue-400">{fileName}</span> ({rawRows.length} total parties)
                </span>
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Choose Different File
                </button>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0B132B] border border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Duplicate Handling (Phone/GST Match)
                  </label>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as PartyDuplicateStrategy)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="SKIP">Skip existing duplicates (Safe)</option>
                    <option value="UPDATE_MERGE">Update existing addresses &amp; balances</option>
                    <option value="CREATE_NEW">Create as new separate party</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Default Customer Type</label>
                  <select
                    value={defaultCustomerType}
                    onChange={(e) => setDefaultCustomerType(e.target.value as CustomerType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="DEALER">Wholesale Dealer</option>
                    <option value="BUILDER">Builder / Contractor</option>
                    <option value="ARCHITECT">Architect Partner</option>
                    <option value="RETAIL">Direct Retail Client</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="postLedger"
                      checked={postOpeningBalancesToLedger}
                      onChange={(e) => setPostOpeningBalancesToLedger(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="postLedger" className="text-xs text-slate-200 cursor-pointer font-semibold">
                      Post Opening Balances into Accounting General Ledger (Double-Entry AR/AP)
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">Balance Sheet Balanced</span>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <span>First {previewRecords.length} Parties Preview</span>
                  <span className="text-[10px] font-normal text-slate-400">(Auto-normalized for Kerala)</span>
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-56">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Party Name</th>
                        <th className="p-2">Phone (10-Digit)</th>
                        <th className="p-2">District</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Opening Bal (₹)</th>
                        <th className="p-2">Balance Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {previewRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="p-2 font-bold text-white truncate max-w-[140px]">{r.name}</td>
                          <td className="p-2 font-mono text-cyan-300">{r.phone}</td>
                          <td className="p-2 text-slate-300">{r.district}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                              {r.type}
                            </span>
                          </td>
                          <td className="p-2 font-mono font-bold text-amber-300">
                            {r.openingBalance > 0 ? `₹${r.openingBalance.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                r.balanceType === 'TO_PAY'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {r.balanceType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Executing / Progress */}
          {step === 'IMPORTING' && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <h4 className="text-sm font-bold text-white">Importing Parties &amp; Syncing Ledgers...</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Validating mobile numbers, Kerala districts, duplicate records, and posting double-entry opening balances.
              </p>
            </div>
          )}

          {/* STEP 4: Summary */}
          {step === 'SUMMARY' && summary && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-base font-black text-white">Import Successfully Completed!</h4>
                <p className="text-xs text-slate-300">
                  Processed {summary.totalRowsProcessed} parties from your file.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 bg-[#0B132B] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">New Customers</span>
                  <span className="text-lg font-black text-emerald-400">{summary.importedCustomers}</span>
                </div>
                <div className="p-3 bg-[#0B132B] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Updated</span>
                  <span className="text-lg font-black text-blue-400">{summary.updatedExistingCount}</span>
                </div>
                <div className="p-3 bg-[#0B132B] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Skipped Duplicates</span>
                  <span className="text-lg font-black text-slate-300">{summary.skippedDuplicatesCount}</span>
                </div>
                <div className="p-3 bg-[#0B132B] rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Ledger Postings</span>
                  <span className="text-lg font-black text-amber-400">{summary.openingBalancesPostedCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {step === 'SUMMARY' ? 'Close' : 'Cancel'}
          </button>

          {step === 'PREVIEW' && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isLoading || rawRows.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Execute Import ({rawRows.length} Parties)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'SUMMARY' && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Done &amp; View Parties
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
