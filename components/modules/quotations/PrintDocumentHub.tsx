'use client';

import React from 'react';
import { HubQuotation, HubCustomer, HubDoorModel, formatDimensionDisplay, calculateSqFt } from './QuotationHub';
import { Building2, Calendar, FileText, CheckCircle2, QrCode, ShieldCheck, Printer } from 'lucide-react';

export type PrintTheme = 'tally-classic' | 'tally-modern' | 'tally-formal' | 'vyapar-elegant' | 'vyapar-modern';
export type DocumentType = 'quotation' | 'proforma' | 'salesOrder' | 'salesInvoice' | 'statement';

export interface StatementEntry {
  id: string;
  date: string;
  particulars: string;
  voucherType: 'Invoice' | 'Receipt' | 'Advance' | 'Credit Note';
  voucherNo: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PrintDocumentHubProps {
  theme: PrintTheme;
  documentType: DocumentType;
  quotation: HubQuotation;
  doorModels?: HubDoorModel[];
  customer?: HubCustomer;
  statementEntries?: StatementEntry[];
}

export const COMPANY_PROFILE = {
  name: 'EX-MARK DOORS',
  tagline: 'Premium FRP & WPC Molded Door Manufacturing Plant',
  address: 'Central Factory Unit, Cherur, Vengara, Malappuram, Kerala - 676304',
  phone: '+91 94479 28866',
  email: 'exmarkdoors@gmail.com',
  website: 'www.exmarkdoors.com',
  gstin: '32AAHFE4489L1Z2',
  pan: 'AAHFE4489L',
  stateCode: '32 (Kerala)',
  hsnCode: '39252000', // Builders' ware of plastics / FRP & WPC Doors
  bank: {
    bankName: 'State Bank of India',
    branch: 'Vengara Branch',
    accountName: 'EX-MARK DOORS PRIVATE LIMITED',
    accountNumber: '38472910482',
    ifsc: 'SBIN0070241',
    upiId: '9447928866@sbi',
  },
};

export const DOCUMENT_TITLES: Record<DocumentType, { en: string; ml: string; badge: string }> = {
  quotation: { en: 'QUOTATION / ESTIMATE', ml: 'ക്വട്ടേഷൻ / എസ്റ്റിമേറ്റ്', badge: 'ESTIMATE' },
  proforma: { en: 'PROFORMA INVOICE', ml: 'പ്രൊഫോർമ ഇൻവോയ്സ്', badge: 'PROFORMA' },
  salesOrder: { en: 'SALES WORK ORDER', ml: 'സെയിൽസ് വർക്ക് ഓർഡർ', badge: 'WORK ORDER' },
  salesInvoice: { en: 'TAX INVOICE (GST BILL)', ml: 'ടാക്സ് ഇൻവോയ്സ് (ജിഎസ്ടി)', badge: 'TAX INVOICE' },
  statement: { en: 'PARTY ACCOUNT STATEMENT', ml: 'കസ്റ്റമർ അക്കൗണ്ട് ലെഡ്ജർ', badge: 'LEDGER' },
};

// Generate default statement ledger data based on quotation
export function getSampleStatementEntries(quote: HubQuotation): StatementEntry[] {
  const gTotal = quote.grandTotal;
  const adv = quote.advanceAmount;
  const bal = gTotal - adv;

  return [
    {
      id: 'TXN-01',
      date: '15 Oct 2026',
      particulars: 'Opening Balance (മുമ്പുള്ള ബാക്കി)',
      voucherType: 'Invoice',
      voucherNo: 'OB-00',
      debit: 0,
      credit: 0,
      balance: 0,
    },
    {
      id: 'TXN-02',
      date: '20 Oct 2026',
      particulars: `Sales Order Advance Recd: ${quote.itemsSummary}`,
      voucherType: 'Advance',
      voucherNo: `RCT-2026-${quote.id.replace('QT-', '')}`,
      debit: 0,
      credit: adv,
      balance: -adv,
    },
    {
      id: 'TXN-03',
      date: quote.date || '27 Oct 2026',
      particulars: `Tax Invoice Generated: ${quote.itemsSummary}`,
      voucherType: 'Invoice',
      voucherNo: `INV-2026-${quote.id.replace('QT-', '')}`,
      debit: gTotal,
      credit: 0,
      balance: bal,
    },
  ];
}

export function PrintDocumentHub({
  theme,
  documentType,
  quotation,
  doorModels = [],
  customer,
  statementEntries,
}: PrintDocumentHubProps) {
  const titles = DOCUMENT_TITLES[documentType];
  const entries = statementEntries || getSampleStatementEntries(quotation);

  const customerName = customer?.name || quotation.customerName || 'Er. Jacob Roy';
  const customerLocation = customer?.location || quotation.location || 'Ernakulam, Kerala';
  const customerPhone = customer?.phone || '+91 98470 11223';
  const customerGstin = customer?.gstin || '32ABCPR1234A1Z1';

  // 1. TALLY CLASSIC THEME
  if (theme === 'tally-classic') {
    return (
      <div className="font-mono text-black bg-white p-6 leading-tight select-text text-xs border-2 border-black max-w-4xl mx-auto shadow-sm">
        {/* Top Header */}
        <div className="text-center border-b-2 border-black pb-3">
          <p className="text-[10px] tracking-widest uppercase font-bold text-slate-700">GST Compliance Form</p>
          <h1 className="text-xl font-bold uppercase tracking-wider">{titles.en}</h1>
          <p className="text-sm font-bold mt-1">{COMPANY_PROFILE.name}</p>
          <p className="text-[11px]">{COMPANY_PROFILE.address}</p>
          <p className="text-[11px]">
            GSTIN: <span className="font-bold">{COMPANY_PROFILE.gstin}</span> | State: {COMPANY_PROFILE.stateCode} | Phone: {COMPANY_PROFILE.phone}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-2 border-r-2 border-black space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-600">Buyer / Billed To:</p>
            <p className="text-sm font-bold">{customerName}</p>
            <p>{customerLocation}</p>
            <p>Phone: {customerPhone}</p>
            <p>Buyer GSTIN: {customerGstin || 'Unregistered / Direct'}</p>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">Doc No:</span>
              <span className="font-bold">{quotation.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Dated:</span>
              <span>{quotation.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode / Terms:</span>
              <span>{quotation.advancePercent}% Advance / Despatch on balance</span>
            </div>
            <div className="flex justify-between">
              <span>Dispatch Plant:</span>
              <span>Central Vengara Unit</span>
            </div>
          </div>
        </div>

        {/* Items or Statement Table */}
        {documentType === 'statement' ? (
          renderTallyStatementTable(entries)
        ) : (
          renderTallyItemTable(quotation, doorModels)
        )}

        {/* Tally Financial Summary */}
        <div className="grid grid-cols-2 border-t-2 border-black">
          <div className="p-2 border-r-2 border-black space-y-2 text-[11px]">
            <p className="font-bold uppercase">Bank Particulars for RTGS/NEFT:</p>
            <p>Bank: {COMPANY_PROFILE.bank.bankName}</p>
            <p>A/c No: {COMPANY_PROFILE.bank.accountNumber}</p>
            <p>IFSC: {COMPANY_PROFILE.bank.ifsc}</p>
            <p>Branch: {COMPANY_PROFILE.bank.branch}</p>
            <p className="text-[10px] italic pt-1">Declaration: We declare that this document shows actual door manufacturing prices.</p>
          </div>
          <div className="p-2 space-y-1 text-right text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold">₹{quotation.subtotal.toLocaleString('en-IN')}.00</span>
            </div>
            <div className="flex justify-between">
              <span>Output GST ({quotation.gstRate}%):</span>
              <span className="font-bold">₹{quotation.gstAmount.toLocaleString('en-IN')}.00</span>
            </div>
            <div className="flex justify-between border-t border-black pt-1 text-sm font-bold">
              <span>Total Amount:</span>
              <span>₹{quotation.grandTotal.toLocaleString('en-IN')}.00</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-black pt-1 text-[11px]">
              <span>Required Advance ({quotation.advancePercent}%):</span>
              <span className="font-bold">₹{quotation.advanceAmount.toLocaleString('en-IN')}.00</span>
            </div>
          </div>
        </div>

        {/* Tally Signature Footer */}
        <div className="grid grid-cols-2 border-t-2 border-black pt-6 pb-2 text-center text-[11px]">
          <div>Customer&apos;s Seal &amp; Signature</div>
          <div className="font-bold">
            For {COMPANY_PROFILE.name}
            <div className="h-8" />
            Authorized Signatory
          </div>
        </div>
      </div>
    );
  }

  // 2. TALLY MODERN (PRIME STYLE COMPACT ERP)
  if (theme === 'tally-modern') {
    return (
      <div className="font-sans text-slate-900 bg-white p-6 select-text text-xs border border-slate-300 max-w-4xl mx-auto shadow-sm">
        {/* Header Bar */}
        <div className="bg-[#1e293b] text-white p-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold tracking-wide">{COMPANY_PROFILE.name}</h1>
            <p className="text-[11px] text-slate-300">{COMPANY_PROFILE.tagline}</p>
            <p className="text-[10px] text-slate-400">GSTIN: {COMPANY_PROFILE.gstin} | State: {COMPANY_PROFILE.stateCode}</p>
          </div>
          <div className="text-right">
            <span className="bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded">
              {titles.en}
            </span>
            <p className="text-xs font-mono font-bold mt-1 text-slate-200">{quotation.id}</p>
            <p className="text-[10px] text-slate-400">Date: {quotation.date}</p>
          </div>
        </div>

        {/* Party Details */}
        <div className="grid grid-cols-2 border-x border-b border-slate-300 bg-slate-50/70 p-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Consignee / Client</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{customerName}</p>
            <p className="text-slate-600">{customerLocation}</p>
            <p className="text-slate-600">Mob: {customerPhone}</p>
            <p className="font-mono text-[11px] font-semibold text-slate-700">GSTIN: {customerGstin || 'Unregistered'}</p>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Order &amp; Tax Terms</span>
            <p className="font-semibold text-slate-800">Tax Type: {quotation.gstMode.toUpperCase()}</p>
            <p className="text-slate-600">IS Standard: IS 14856:2000 Impact Tested</p>
            <p className="text-slate-600">Terms: {quotation.advancePercent}% Advance</p>
          </div>
        </div>

        {/* Items or Statement */}
        {documentType === 'statement' ? (
          renderTallyStatementTable(entries, true)
        ) : (
          renderTallyItemTable(quotation, doorModels, true)
        )}

        {/* Bottom Financial Grid */}
        <div className="grid grid-cols-2 border border-slate-300 mt-2 bg-slate-50/40 p-3 rounded-b-lg">
          <div className="text-[11px] space-y-1 text-slate-600">
            <p className="font-bold text-slate-800">Electronic Bank Transfer:</p>
            <p>A/c Name: {COMPANY_PROFILE.bank.accountName}</p>
            <p>A/c No: {COMPANY_PROFILE.bank.accountNumber} ({COMPANY_PROFILE.bank.bankName})</p>
            <p>IFSC: {COMPANY_PROFILE.bank.ifsc} | Branch: {COMPANY_PROFILE.bank.branch}</p>
          </div>
          <div className="space-y-1 text-right text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">₹{quotation.subtotal.toLocaleString('en-IN')}.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST ({quotation.gstRate}%):</span>
              <span className="font-mono font-medium">₹{quotation.gstAmount.toLocaleString('en-IN')}.00</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold text-slate-900">
              <span>Net Total:</span>
              <span className="font-mono text-emerald-700">₹{quotation.grandTotal.toLocaleString('en-IN')}.00</span>
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-rose-700 border-t border-dashed border-slate-300 pt-1">
              <span>{quotation.advancePercent}% Advance Required:</span>
              <span className="font-mono">₹{quotation.advanceAmount.toLocaleString('en-IN')}.00</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. TALLY FORMAL (FULL COMPREHENSIVE TAX INVOICE)
  if (theme === 'tally-formal') {
    return (
      <div className="font-serif text-slate-900 bg-white p-6 select-text text-xs border-2 border-slate-800 max-w-4xl mx-auto shadow-sm">
        <div className="text-center border-b-2 border-slate-800 pb-2">
          <h2 className="text-base font-extrabold uppercase tracking-wide">{titles.en}</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">(Under Rule 46 of Central Goods and Services Tax Rules, 2017)</p>
        </div>

        {/* Dual Party Grid: Billed To vs Consignee Shipped To */}
        <div className="grid grid-cols-2 border-b-2 border-slate-800">
          <div className="p-3 border-r-2 border-slate-800 space-y-1 text-xs">
            <p className="text-[10px] font-bold uppercase text-slate-600">Supplier Details:</p>
            <p className="font-bold text-sm">{COMPANY_PROFILE.name}</p>
            <p>{COMPANY_PROFILE.address}</p>
            <p>GSTIN: <span className="font-mono font-bold">{COMPANY_PROFILE.gstin}</span></p>
            <p>State: {COMPANY_PROFILE.stateCode}</p>
          </div>
          <div className="p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">Invoice / Ref No:</span>
              <span className="font-mono font-bold">{quotation.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{quotation.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Note:</span>
              <span>Site Delivery via Malappuram Logistics</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Terms:</span>
              <span>{quotation.advancePercent}% Advance</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-slate-800 bg-slate-50/50">
          <div className="p-3 border-r-2 border-slate-800 space-y-0.5 text-xs">
            <p className="text-[10px] font-bold uppercase text-slate-600">Details of Receiver (Billed To):</p>
            <p className="font-bold text-sm">{customerName}</p>
            <p>{customerLocation}</p>
            <p>State: Kerala (Code 32)</p>
            <p>GSTIN / UIN: <span className="font-mono font-bold">{customerGstin || 'Unregistered'}</span></p>
          </div>
          <div className="p-3 space-y-0.5 text-xs">
            <p className="text-[10px] font-bold uppercase text-slate-600">Details of Consignee (Shipped To):</p>
            <p className="font-bold text-sm">{customerName}</p>
            <p>Site Location: {customerLocation}</p>
            <p>Contact Phone: {customerPhone}</p>
          </div>
        </div>

        {/* Items Table */}
        {documentType === 'statement' ? (
          renderTallyStatementTable(entries)
        ) : (
          renderTallyItemTable(quotation, doorModels)
        )}

        {/* GST Tax Breakdown Sub-Table */}
        <div className="border-t-2 border-slate-800 p-2 text-xs">
          <table className="w-full text-left text-[11px] border border-slate-400">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-center font-bold">
                <th className="p-1 border-r border-slate-400">HSN/SAC</th>
                <th className="p-1 border-r border-slate-400">Taxable Value</th>
                <th className="p-1 border-r border-slate-400">Central Tax (CGST)</th>
                <th className="p-1 border-r border-slate-400">State Tax (SGST)</th>
                <th className="p-1">Total Tax Amount</th>
              </tr>
            </thead>
            <tbody className="text-center">
              <tr className="border-b border-slate-300 font-mono">
                <td className="p-1 border-r border-slate-400">{COMPANY_PROFILE.hsnCode}</td>
                <td className="p-1 border-r border-slate-400">₹{quotation.subtotal.toLocaleString('en-IN')}</td>
                <td className="p-1 border-r border-slate-400">{Math.round(quotation.gstRate / 2)}% (₹{Math.round(quotation.gstAmount / 2).toLocaleString('en-IN')})</td>
                <td className="p-1 border-r border-slate-400">{Math.round(quotation.gstRate / 2)}% (₹{Math.round(quotation.gstAmount / 2).toLocaleString('en-IN')})</td>
                <td className="p-1 font-bold">₹{quotation.gstAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="flex justify-between items-center bg-slate-100 border-y-2 border-slate-800 p-2 text-sm font-bold">
          <span>Total Invoice Amount (in figures):</span>
          <span className="font-mono text-base">₹{quotation.grandTotal.toLocaleString('en-IN')}.00</span>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 pt-6 text-center text-xs">
          <div>
            <p className="border-t border-slate-500 w-48 mx-auto pt-1 font-semibold">Customer Acceptance &amp; Seal</p>
          </div>
          <div>
            <p className="font-bold">For {COMPANY_PROFILE.name}</p>
            <div className="h-10" />
            <p className="border-t border-slate-500 w-48 mx-auto pt-1 font-semibold">Authorized Signatory</p>
          </div>
        </div>
      </div>
    );
  }

  // 4. VYAPAR ELEGANT (COLOR ACCENT & CARD THEME)
  if (theme === 'vyapar-elegant') {
    return (
      <div className="font-sans text-slate-800 bg-white p-6 select-text text-xs max-w-4xl mx-auto shadow-sm rounded-xl border border-rose-100">
        {/* Vyapar Color Banner */}
        <div className="flex justify-between items-start border-b-2 border-rose-600 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
              EX
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{COMPANY_PROFILE.name}</h1>
              <p className="text-xs text-rose-600 font-semibold">{COMPANY_PROFILE.tagline}</p>
              <p className="text-[11px] text-slate-500">{COMPANY_PROFILE.address}</p>
              <p className="text-[10px] text-slate-400">GSTIN: {COMPANY_PROFILE.gstin} | Mob: {COMPANY_PROFILE.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              {titles.badge}
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 mt-1">{quotation.id}</p>
            <p className="text-[11px] text-slate-500">Date: {quotation.date}</p>
          </div>
        </div>

        {/* Vyapar Modern Cards */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Bill To Party</span>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{customerName}</h3>
            <p className="text-xs text-slate-600">{customerLocation}</p>
            <p className="text-xs text-slate-600">Phone: {customerPhone}</p>
            <p className="text-[11px] font-mono font-medium text-slate-700">GSTIN: {customerGstin || 'Unregistered'}</p>
          </div>
          <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Instant UPI Payment</span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">UPI ID: {COMPANY_PROFILE.bank.upiId}</p>
              <p className="text-[10px] text-slate-500">Scan via GPay / PhonePe / Paytm</p>
              <p className="text-xs font-bold text-emerald-700 mt-1">Advance: ₹{quotation.advanceAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-16 h-16 bg-white border border-rose-200 rounded-lg flex items-center justify-center p-1 shadow-sm">
              <QrCode className="w-12 h-12 text-rose-600" />
            </div>
          </div>
        </div>

        {/* Items or Statement */}
        {documentType === 'statement' ? (
          renderVyaparStatementTable(entries)
        ) : (
          renderVyaparItemTable(quotation, doorModels)
        )}

        {/* Vyapar Summary & Bank Cards */}
        <div className="grid grid-cols-2 gap-4 mt-4 items-start">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px]">
            <p className="font-bold text-slate-800 uppercase text-[10px]">Bank Transfer Information:</p>
            <p className="text-slate-700">Bank: <span className="font-semibold">{COMPANY_PROFILE.bank.bankName}</span></p>
            <p className="text-slate-700">A/c No: <span className="font-mono font-bold text-slate-900">{COMPANY_PROFILE.bank.accountNumber}</span></p>
            <p className="text-slate-700">IFSC: <span className="font-mono font-bold text-slate-900">{COMPANY_PROFILE.bank.ifsc}</span></p>
            <p className="text-slate-700">Branch: {COMPANY_PROFILE.bank.branch}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900">₹{quotation.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST ({quotation.gstRate}%):</span>
              <span className="font-mono font-semibold text-slate-900">₹{quotation.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-black text-rose-600">
              <span>Grand Total:</span>
              <span className="font-mono">₹{quotation.grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-emerald-700 border-t border-dashed border-slate-200 pt-1">
              <span>{quotation.advancePercent}% Advance:</span>
              <span className="font-mono">₹{quotation.advanceAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-500">
          <p>Thank you for choosing EX-MARK Doors! For support, call +91 94479 28866.</p>
          <p className="font-semibold text-slate-700">Authorized Signatory - Exmark ERP</p>
        </div>
      </div>
    );
  }

  // 5. VYAPAR MODERN (CLEAN RETAIL MINIMALIST)
  return (
    <div className="font-sans text-slate-900 bg-white p-6 select-text text-xs max-w-4xl mx-auto shadow-sm border border-slate-200 rounded-lg">
      <div className="flex justify-between items-start border-b border-slate-300 pb-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{COMPANY_PROFILE.name}</h1>
          <p className="text-xs text-slate-500">{COMPANY_PROFILE.address}</p>
          <p className="text-xs text-slate-500">GSTIN: {COMPANY_PROFILE.gstin} | Mob: {COMPANY_PROFILE.phone}</p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-slate-900 text-white font-bold text-xs px-3 py-1 rounded uppercase tracking-wider">
            {titles.en}
          </span>
          <p className="text-sm font-mono font-bold mt-1 text-slate-900">{quotation.id}</p>
          <p className="text-[11px] text-slate-500">Date: {quotation.date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 my-3 p-3 bg-slate-50 rounded border border-slate-200 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Customer Information</span>
          <p className="font-bold text-slate-900 text-sm mt-0.5">{customerName}</p>
          <p className="text-slate-600">{customerLocation}</p>
          <p className="text-slate-600">Mob: {customerPhone}</p>
        </div>
        <div className="text-right space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Summary Specs</span>
          <p className="text-slate-700 font-medium">{quotation.itemsSummary}</p>
          <p className="text-emerald-700 font-bold">{quotation.advancePercent}% Advance Term</p>
        </div>
      </div>

      {documentType === 'statement' ? (
        renderVyaparStatementTable(entries)
      ) : (
        renderVyaparItemTable(quotation, doorModels)
      )}

      {/* Prominent Net Payable Box */}
      <div className="flex justify-between items-center bg-[#0f172a] text-white p-4 rounded-lg my-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Total Net Payable</span>
          <p className="text-xs text-slate-300 mt-0.5">Includes {quotation.gstRate}% SGST &amp; CGST tax regime</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black font-mono text-emerald-400">
            ₹{quotation.grandTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-400">
        <p>Manufactured according to IS 14856:2000 specifications.</p>
        <p className="font-bold text-slate-700">For EX-MARK DOORS</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER TABLE RENDERERS (Tally vs Vyapar)
// -------------------------------------------------------------

function renderTallyItemTable(quotation: HubQuotation, doorModels: HubDoorModel[], isModern = false) {
  const rows = quotation.itemRows || [];

  return (
    <table className={`w-full text-left text-xs my-2 border-collapse ${isModern ? 'border border-slate-300' : 'border-b-2 border-black'}`}>
      <thead>
        <tr className={isModern ? 'bg-slate-800 text-white font-bold text-[11px]' : 'border-b-2 border-black font-bold text-[11px]'}>
          <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
          <th className="p-2 border-r border-slate-300">Description of Door Goods</th>
          <th className="p-2 border-r border-slate-300">Dimensions (H × W)</th>
          <th className="p-2 border-r border-slate-300 text-center w-12">Qty</th>
          <th className="p-2 border-r border-slate-300 text-right w-24">Rate (₹)</th>
          <th className="p-2 text-right w-24">Amount (₹)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {rows.map((row, i) => {
          const model = doorModels.find((m) => m.id === row.modelId) || { code: 'EXM', title: 'FRP Door', finish: 'Std' };
          const wTop = row.widthTop ?? row.width ?? 0;
          const wBottom = row.widthBottom ?? wTop;
          const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
          const wBtmFrac = row.widthBottomFraction || wTopFrac;
          const sqft = calculateSqFt(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const dim = formatDimensionDisplay(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const lineTotal = (Number(row.qty) || 0) * row.rate;

          return (
            <tr key={i} className="text-[11px]">
              <td className="p-1.5 border-r border-slate-300 text-center font-mono">{i + 1}</td>
              <td className="p-1.5 border-r border-slate-300">
                <span className="font-bold">{model.code} - {model.title}</span>
                <span className="text-[10px] text-slate-500 block">Finish: {model.finish}</span>
              </td>
              <td className="p-1.5 border-r border-slate-300 font-mono">
                {dim} <span className="text-[10px] text-slate-500">({sqft} sqft)</span>
              </td>
              <td className="p-1.5 border-r border-slate-300 text-center font-bold">{row.qty}</td>
              <td className="p-1.5 border-r border-slate-300 text-right font-mono">₹{row.rate.toLocaleString('en-IN')}</td>
              <td className="p-1.5 text-right font-mono font-bold">₹{lineTotal.toLocaleString('en-IN')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderVyaparItemTable(quotation: HubQuotation, doorModels: HubDoorModel[]) {
  const rows = quotation.itemRows || [];

  return (
    <table className="w-full text-left text-xs my-2 rounded-lg overflow-hidden border border-slate-200">
      <thead>
        <tr className="bg-rose-50 text-rose-900 font-bold text-[11px] border-b border-rose-100">
          <th className="p-2.5 text-center w-8">#</th>
          <th className="p-2.5">Item &amp; Specifications</th>
          <th className="p-2.5">Dimensions &amp; Area</th>
          <th className="p-2.5 text-center w-12">Qty</th>
          <th className="p-2.5 text-right w-24">Price (₹)</th>
          <th className="p-2.5 text-right w-24">Total (₹)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, i) => {
          const model = doorModels.find((m) => m.id === row.modelId) || { code: 'EXM', title: 'FRP Door', finish: 'Std' };
          const wTop = row.widthTop ?? row.width ?? 0;
          const wBottom = row.widthBottom ?? wTop;
          const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
          const wBtmFrac = row.widthBottomFraction || wTopFrac;
          const sqft = calculateSqFt(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const dim = formatDimensionDisplay(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const lineTotal = (Number(row.qty) || 0) * row.rate;

          return (
            <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
              <td className="p-2 text-center font-mono text-slate-400">{i + 1}</td>
              <td className="p-2">
                <span className="font-bold text-slate-900">{model.code} - {model.title}</span>
                <span className="text-[10px] text-slate-500 block">Finish: {model.finish}</span>
              </td>
              <td className="p-2 font-mono text-slate-700">
                {dim} <span className="text-[10px] text-rose-600 font-semibold">({sqft} sqft)</span>
              </td>
              <td className="p-2 text-center font-bold text-slate-800">{row.qty} Pcs</td>
              <td className="p-2 text-right font-mono text-slate-700">₹{row.rate.toLocaleString('en-IN')}</td>
              <td className="p-2 text-right font-mono font-bold text-slate-900">₹{lineTotal.toLocaleString('en-IN')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderTallyStatementTable(entries: StatementEntry[], isModern = false) {
  return (
    <div className="my-2">
      <div className="text-center font-bold text-xs uppercase mb-1">Customer Ledger Statement</div>
      <table className={`w-full text-left text-xs border-collapse ${isModern ? 'border border-slate-300' : 'border-y-2 border-black'}`}>
        <thead>
          <tr className={isModern ? 'bg-slate-800 text-white font-bold text-[10px]' : 'border-b-2 border-black font-bold text-[10px]'}>
            <th className="p-1.5 border-r border-slate-300 w-20">Date</th>
            <th className="p-1.5 border-r border-slate-300">Particulars</th>
            <th className="p-1.5 border-r border-slate-300 w-24">Vch Type</th>
            <th className="p-1.5 border-r border-slate-300 w-24">Vch No</th>
            <th className="p-1.5 border-r border-slate-300 text-right w-24">Debit (₹)</th>
            <th className="p-1.5 border-r border-slate-300 text-right w-24">Credit (₹)</th>
            <th className="p-1.5 text-right w-24">Balance (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {entries.map((e, idx) => (
            <tr key={idx} className="text-[11px] font-mono">
              <td className="p-1.5 border-r border-slate-300">{e.date}</td>
              <td className="p-1.5 border-r border-slate-300 font-sans font-medium">{e.particulars}</td>
              <td className="p-1.5 border-r border-slate-300 text-slate-600">{e.voucherType}</td>
              <td className="p-1.5 border-r border-slate-300 font-bold">{e.voucherNo}</td>
              <td className="p-1.5 border-r border-slate-300 text-right">{e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '-'}</td>
              <td className="p-1.5 border-r border-slate-300 text-right text-emerald-700">{e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '-'}</td>
              <td className="p-1.5 text-right font-bold">{e.balance >= 0 ? `₹${e.balance.toLocaleString('en-IN')} Dr` : `₹${Math.abs(e.balance).toLocaleString('en-IN')} Cr`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderVyaparStatementTable(entries: StatementEntry[]) {
  return (
    <div className="my-2">
      <div className="text-center font-bold text-xs uppercase text-slate-700 mb-1">Customer Account Transaction Statement</div>
      <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-rose-50 text-rose-900 font-bold text-[10px]">
            <th className="p-2 w-20">Date</th>
            <th className="p-2">Description / Transaction</th>
            <th className="p-2 w-20">Type</th>
            <th className="p-2 w-24">Ref No</th>
            <th className="p-2 text-right w-20">Debit (₹)</th>
            <th className="p-2 text-right w-20">Credit (₹)</th>
            <th className="p-2 text-right w-24">Balance (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e, idx) => (
            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50 text-[11px]' : 'bg-white text-[11px]'}>
              <td className="p-2 text-slate-500 font-mono">{e.date}</td>
              <td className="p-2 font-medium text-slate-800">{e.particulars}</td>
              <td className="p-2 text-slate-600">{e.voucherType}</td>
              <td className="p-2 font-mono font-bold text-slate-700">{e.voucherNo}</td>
              <td className="p-2 text-right font-mono text-slate-900">{e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '-'}</td>
              <td className="p-2 text-right font-mono text-emerald-600 font-bold">{e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '-'}</td>
              <td className="p-2 text-right font-mono font-black text-rose-600">{e.balance >= 0 ? `₹${e.balance.toLocaleString('en-IN')} Dr` : `₹${Math.abs(e.balance).toLocaleString('en-IN')} Cr`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
