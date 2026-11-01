'use client';

import React from 'react';
import { Building2, Calendar, FileText, CheckCircle2, QrCode, ShieldCheck, Printer } from 'lucide-react';
import { ReportExecutionResult } from '@/types/communication';

export type ReportPrintTheme = 'tally-classic' | 'tally-modern' | 'tally-formal' | 'vyapar-executive';

export interface ReportPrintDocumentHubProps {
  theme: ReportPrintTheme;
  reportResult: ReportExecutionResult;
  reportTitle?: string;
  reportCode?: string;
  factoryName?: string;
  preparedBy?: string;
}

export const COMPANY_PROFILE = {
  name: 'EX-MARK DOORS PRIVATE LIMITED',
  tagline: 'Premium Polymer, FRP & WPC Molded Door Manufacturing Plant',
  address: 'Central Factory Unit, Cherur, Vengara, Malappuram, Kerala - 676304',
  phone: '+91 94479 28866',
  email: 'exmarkdoors@gmail.com',
  website: 'www.exmarkdoors.com',
  gstin: '32AAHFE4489L1Z2',
  pan: 'AAHFE4489L',
  stateCode: '32 (Kerala)',
  hsnCode: '39252000',
};

export function ReportPrintDocumentHub({
  theme,
  reportResult,
  reportTitle,
  reportCode,
  factoryName = 'Central Manufacturing Unit (Malappuram)',
  preparedBy = 'Plant Accounts & Operations Desk',
}: ReportPrintDocumentHubProps) {
  const title = reportTitle || reportResult.title || 'Executive Business Report';
  const code = reportCode || reportResult.reportCode || 'EXMARK-REPORT';
  const rows = reportResult.rows || [];
  const colKeys = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Calculate column totals for numeric columns
  const numericTotals: Record<string, number> = {};
  colKeys.forEach((key) => {
    const isNum = rows.some((r) => typeof r[key] === 'number');
    if (isNum) {
      numericTotals[key] = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
    }
  });

  const generatedDate = new Date(reportResult.generatedAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Theme-specific styling classes
  const isTallyClassic = theme === 'tally-classic';
  const isTallyModern = theme === 'tally-modern';
  const isTallyFormal = theme === 'tally-formal';
  const isVyapar = theme === 'vyapar-executive';

  return (
    <div
      className={`w-full bg-white text-slate-900 p-6 sm:p-8 font-sans printable-report-sheet ${
        isTallyClassic
          ? 'border-2 border-slate-900 font-serif'
          : isTallyFormal
          ? 'border border-slate-400 font-mono text-xs'
          : isVyapar
          ? 'border-t-4 border-t-rose-600 border border-slate-200'
          : 'border border-slate-300'
      }`}
      style={{ minHeight: '1000px', backgroundColor: '#ffffff', color: '#0f172a' }}
    >
      {/* 1. OFFICIAL CORPORATE HEADER */}
      <div className={`pb-4 border-b ${isTallyClassic ? 'border-b-2 border-slate-900' : isVyapar ? 'border-b-2 border-rose-600' : 'border-slate-300'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xl sm:text-2xl font-black tracking-tight ${isVyapar ? 'text-rose-700' : 'text-slate-900'}`}>
                {COMPANY_PROFILE.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-300">
                ISO 9001:2015 CERTIFIED
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600">{COMPANY_PROFILE.tagline}</p>
            <p className="text-[11px] text-slate-500">{COMPANY_PROFILE.address}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600 pt-0.5">
              <span><strong>GSTIN:</strong> {COMPANY_PROFILE.gstin}</span>
              <span>•</span>
              <span><strong>PAN:</strong> {COMPANY_PROFILE.pan}</span>
              <span>•</span>
              <span><strong>State:</strong> {COMPANY_PROFILE.stateCode}</span>
              <span>•</span>
              <span><strong>Phone:</strong> {COMPANY_PROFILE.phone}</span>
            </div>
          </div>

          <div className="text-right sm:self-start">
            <div className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded ${
              isVyapar ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-900 border border-slate-300'
            }`}>
              AUDIT REPORT
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">CONFIDENTIAL &amp; PROPRIETARY</div>
          </div>
        </div>
      </div>

      {/* 2. REPORT TITLE & AUDIT METADATA BAR */}
      <div className={`my-4 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs ${
        isTallyClassic
          ? 'bg-slate-50 border border-slate-900'
          : isVyapar
          ? 'bg-rose-50/60 border border-rose-200'
          : isTallyModern
          ? 'bg-slate-100 border border-slate-300'
          : 'bg-slate-50 border border-slate-300'
      }`}>
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider block">
            REPORT CODE: {code} • {factoryName}
          </span>
          <h2 className={`text-base sm:text-lg font-black tracking-tight mt-0.5 ${isVyapar ? 'text-rose-900' : 'text-slate-900'}`}>
            {title}
          </h2>
        </div>

        <div className="text-left sm:text-right text-[11px] font-mono text-slate-600">
          <div><strong>Generated:</strong> {generatedDate}</div>
          <div><strong>Prepared By:</strong> {preparedBy}</div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI SUMMARY STRIP */}
      {reportResult.summaryMetrics && Object.keys(reportResult.summaryMetrics).length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Executive Summary Highlights (ഓഡിറ്റ് സമറി)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(reportResult.summaryMetrics).map(([key, val]) => (
              <div
                key={key}
                className={`p-2.5 rounded-lg border text-left ${
                  isVyapar
                    ? 'bg-rose-50/30 border-rose-200'
                    : isTallyClassic
                    ? 'bg-white border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[9px] uppercase font-bold text-slate-500 block truncate">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-black font-mono text-slate-900 block mt-0.5">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN AUDIT TABLE */}
      <div className="mb-6 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg">
            No report data recorded for the selected period.
          </div>
        ) : (
          <table className={`w-full text-left text-xs border-collapse ${
            isTallyClassic ? 'border-2 border-slate-900' : 'border border-slate-300'
          }`}>
            <thead>
              <tr className={`${
                isVyapar
                  ? 'bg-rose-700 text-white font-bold'
                  : isTallyClassic
                  ? 'bg-slate-900 text-white font-bold'
                  : isTallyModern
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-400'
              } text-[10px] uppercase tracking-wider`}>
                <th className="p-2.5 w-10 text-center border-r border-slate-300/40">#</th>
                {colKeys.map((key) => {
                  const isNum = typeof rows[0][key] === 'number';
                  return (
                    <th
                      key={key}
                      className={`p-2.5 border-r border-slate-300/40 ${isNum ? 'text-right' : 'text-left'}`}
                    >
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-[11px]">
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} hover:bg-slate-100/60 transition-colors`}
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">
                    {idx + 1}
                  </td>
                  {colKeys.map((key) => {
                    const val = row[key];
                    const isNum = typeof val === 'number';
                    const isCurrency = isNum && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('margin') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('price') || key.toLowerCase().includes('gst') || key.toLowerCase().includes('due'));

                    return (
                      <td
                        key={key}
                        className={`p-2 border-r border-slate-200 ${
                          isNum ? 'text-right font-mono font-medium text-slate-900' : 'text-left text-slate-800'
                        }`}
                      >
                        {isCurrency ? (
                          <span className="font-bold">₹{val.toLocaleString('en-IN')}</span>
                        ) : isNum ? (
                          val.toLocaleString('en-IN')
                        ) : (
                          val ?? '-'
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Totals Footer Row */}
            <tfoot className={`font-bold text-xs ${
              isTallyClassic
                ? 'border-t-2 border-slate-900 bg-slate-100'
                : 'border-t-2 border-slate-400 bg-slate-100'
            }`}>
              <tr>
                <td className="p-2.5 text-center border-r border-slate-300 font-mono">Σ</td>
                {colKeys.map((key, cIdx) => {
                  const hasTotal = numericTotals[key] !== undefined;
                  const isCurrency = hasTotal && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('margin') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('price') || key.toLowerCase().includes('gst') || key.toLowerCase().includes('due'));

                  return (
                    <td
                      key={key}
                      className={`p-2.5 border-r border-slate-300 ${
                        hasTotal ? 'text-right font-mono font-black text-slate-900' : 'text-left text-slate-500'
                      }`}
                    >
                      {cIdx === 0 && !hasTotal ? (
                        <span>TOTALS ({rows.length} Records)</span>
                      ) : hasTotal ? (
                        isCurrency ? (
                          <span>₹{numericTotals[key].toLocaleString('en-IN')}</span>
                        ) : (
                          <span>{numericTotals[key].toLocaleString('en-IN')}</span>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* 5. STATUTORY AUDIT & VERIFICATION FOOTER */}
      <div className="pt-6 border-t-2 border-slate-300 mt-auto space-y-6" style={{ pageBreakInside: 'avoid' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
          {/* Signatory 1 */}
          <div className="space-y-8">
            <div className="text-[11px] text-slate-500">Data Extracted & Prepared By</div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-900">{preparedBy}</p>
              <p className="text-[10px] text-slate-500 font-mono">Operations Data Desk</p>
            </div>
          </div>

          {/* Signatory 2 */}
          <div className="space-y-8">
            <div className="text-[11px] text-slate-500">Audited & Reconciled By</div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-900">Plant General Manager</p>
              <p className="text-[10px] text-slate-500 font-mono">Central Unit, Malappuram</p>
            </div>
          </div>

          {/* Signatory 3 */}
          <div className="space-y-8">
            <div className="text-[11px] text-slate-500">Authorized Signatory / Managing Director</div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-black text-slate-900">EX-MARK DOORS PVT LTD</p>
              <p className="text-[10px] text-slate-500 font-mono">Official Corporate Seal</p>
            </div>
          </div>
        </div>

        {/* Verification Bottom Seal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-slate-700" />
            <span>Digital Audit Hash: <strong>EXM-AUD-{code}-{Date.now().toString().slice(-6)}</strong></span>
          </div>
          <div>Computer Generated System Audit Document • Valid without physical stamp</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}

export default ReportPrintDocumentHub;
