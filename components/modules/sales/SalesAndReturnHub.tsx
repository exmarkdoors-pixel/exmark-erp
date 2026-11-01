'use client';

import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  FileText,
  RotateCcw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Building2,
  X,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  Layers,
  Factory,
  Boxes,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { PrintDocumentHub, PrintTheme, DocumentType } from '../quotations/PrintDocumentHub';
import { HubQuotation } from '../quotations/QuotationHub';

// Types
export interface SalesInvoice {
  id: string; // e.g. INV-2026-101
  orderRef?: string; // e.g. SO-2026-101
  customerName: string;
  phone: string;
  location: string;
  district: string;
  date: string;
  dueDate: string;
  itemsSummary: string;
  doorsCount: number;
  subtotal: number; // Taxable
  cgst: number; // 9%
  sgst: number; // 9%
  gstAmount: number; // 18%
  grandTotal: number;
  advanceCredited: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  eWayBillNo?: string;
  vehicleNo?: string;
}
export type SalesInvoiceItem = SalesInvoice;

export type ReturnReason =
  | 'SIZE_TOLERANCE_MISMATCH'
  | 'TRANSIT_SURFACE_DAMAGE'
  | 'LOCK_HINGE_MISALIGNMENT'
  | 'CLIENT_DESIGN_CHANGE'
  | 'FACTORY_QC_REJECT';

export type ReturnDisposition =
  | 'REWORK_PLANT_FLOOR'
  | 'RESTOCK_INVENTORY'
  | 'SCRAP_WRITE_OFF';

export interface SalesReturnCreditNote {
  id: string; // e.g. CN-2026-001
  invoiceRef: string; // e.g. INV-2026-101
  customerName: string;
  district: string;
  returnDate: string;
  doorsReturned: number;
  doorModelCode: string;
  doorModelTitle: string;
  returnReason: ReturnReason;
  taxableRefund: number;
  cgstReversal: number;
  sgstReversal: number;
  totalCreditAmount: number;
  disposition: ReturnDisposition;
  status: 'DRAFT' | 'APPROVED' | 'CREDIT_ISSUED' | 'LEDGER_ADJUSTED';
  notes?: string;
}

export const RETURN_REASONS: Record<ReturnReason, { en: string; ml: string }> = {
  SIZE_TOLERANCE_MISMATCH: {
    en: 'Site Opening Tolerance Mismatch',
    ml: 'സൈറ്റ് അളവ് വ്യത്യാസം (മസോൺ ഫ്രെയിം വ്യത്യാസം)',
  },
  TRANSIT_SURFACE_DAMAGE: {
    en: 'Transit Surface Scratch / Coating Chip',
    ml: 'വാഹന ചരക്കുനീക്കത്തിലെ സ്ക്രാച്ച് / പോറലുകൾ',
  },
  LOCK_HINGE_MISALIGNMENT: {
    en: 'Lock Hole / Hinge Routing Variation',
    ml: 'ലോക്ക് ഹോൾ / ഹിഞ്ച് റൂട്ടിംഗ് വ്യത്യാസം',
  },
  CLIENT_DESIGN_CHANGE: {
    en: 'Client Shade / Finish Design Modification',
    ml: 'ഉപഭോക്താവിന്റെ ഡിസൈൻ / ഷേഡ് മാറ്റം',
  },
  FACTORY_QC_REJECT: {
    en: 'Factory Floor QA Tolerance Rejection',
    ml: 'ഫാക്ടറി ക്വാളിറ്റി ചെക്ക് റിജക്ഷൻ',
  },
};

export const DISPOSITION_LABELS: Record<ReturnDisposition, { en: string; ml: string; color: string }> = {
  REWORK_PLANT_FLOOR: {
    en: 'Route to Plant Floor (Resizing & Buffing)',
    ml: 'ഫാക്ടറി പ്ലാന്റിൽ റീവർക്ക് / സൈസിംഗ് ചെയ്യുക',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  RESTOCK_INVENTORY: {
    en: 'Restock into Finished Goods Bay',
    ml: 'ഫിനിഷ്ഡ് ഗുഡ്സ് വെയർഹൗസിലേക്ക് തിരിച്ചെടുക്കുക',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  SCRAP_WRITE_OFF: {
    en: 'Scrap & Material Recovery',
    ml: 'സ്ക്രാപ്പ് / മെറ്റീരിയൽ റിക്കവറി',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
};

// Seed Invoices
const INITIAL_SALES_INVOICES: SalesInvoice[] = [
  {
    id: 'INV-2026-101',
    orderRef: 'SO-2026-101',
    customerName: 'Er. Jacob Roy (Roy Architects)',
    phone: '+91 98470 11223',
    location: 'Edappally, Kochi',
    district: 'Ernakulam',
    date: '28 Oct 2026',
    dueDate: '10 Nov 2026',
    itemsSummary: '10 Sets Natural Teak FRP Molded Doors (205 × 75 cm)',
    doorsCount: 10,
    subtotal: 32627,
    cgst: 2936,
    sgst: 2936,
    gstAmount: 5873,
    grandTotal: 38500,
    advanceCredited: 20000,
    balanceDue: 18500,
    paymentStatus: 'PARTIAL',
    eWayBillNo: '321829471029',
    vehicleNo: 'KL-07-CD-4819',
  },
  {
    id: 'INV-2026-102',
    orderRef: 'SO-2026-102',
    customerName: 'Secura Mall Ventures LLP',
    phone: '+91 98956 02866',
    location: 'Perinthalmanna Bypass',
    district: 'Malappuram',
    date: '27 Oct 2026',
    dueDate: '05 Nov 2026',
    itemsSummary: '163 MS Shaft & Heavy Duty Service Doors',
    doorsCount: 163,
    subtotal: 1677966,
    cgst: 151017,
    sgst: 151017,
    gstAmount: 302034,
    grandTotal: 1980000,
    advanceCredited: 990000,
    balanceDue: 990000,
    paymentStatus: 'PARTIAL',
    eWayBillNo: '321938472910',
    vehicleNo: 'KL-10-AZ-9921',
  },
  {
    id: 'INV-2026-103',
    orderRef: 'SO-2026-103',
    customerName: 'Varghese Mathew (Mathew Constructions)',
    phone: '+91 94471 88990',
    location: 'Infopark Road, Kakkanad',
    district: 'Ernakulam',
    date: '25 Oct 2026',
    dueDate: '30 Oct 2026',
    itemsSummary: '55 Waterproof Bathroom Flush Doors (200 × 70 cm)',
    doorsCount: 55,
    subtotal: 184322,
    cgst: 16589,
    sgst: 16589,
    gstAmount: 33178,
    grandTotal: 217500,
    advanceCredited: 217500,
    balanceDue: 0,
    paymentStatus: 'PAID',
    eWayBillNo: '321890382911',
    vehicleNo: 'KL-07-BQ-1284',
  },
  {
    id: 'INV-2026-104',
    orderRef: 'SO-2026-104',
    customerName: 'Shabeer Ali (Malabar Luxury Builders)',
    phone: '+91 98950 33445',
    location: 'Manjeri Road, Nilambur',
    district: 'Kozhikode',
    date: '24 Oct 2026',
    dueDate: '02 Nov 2026',
    itemsSummary: '30 WPC Denwood Bedroom Doors (Oak Laminated)',
    doorsCount: 30,
    subtotal: 137288,
    cgst: 12356,
    sgst: 12356,
    gstAmount: 24712,
    grandTotal: 162000,
    advanceCredited: 100000,
    balanceDue: 62000,
    paymentStatus: 'PARTIAL',
    eWayBillNo: '321948291038',
    vehicleNo: 'KL-11-BV-8832',
  },
];

// Seed Credit Notes (Sales Returns)
const INITIAL_SALES_RETURNS: SalesReturnCreditNote[] = [
  {
    id: 'CN-2026-001',
    invoiceRef: 'INV-2026-101',
    customerName: 'Er. Jacob Roy (Roy Architects)',
    district: 'Ernakulam',
    returnDate: '30 Oct 2026',
    doorsReturned: 1,
    doorModelCode: 'EXM-A-101',
    doorModelTitle: 'Natural Teak Classic Molded FRP',
    returnReason: 'SIZE_TOLERANCE_MISMATCH',
    taxableRefund: 3263,
    cgstReversal: 294,
    sgstReversal: 294,
    totalCreditAmount: 3850,
    disposition: 'REWORK_PLANT_FLOOR',
    status: 'CREDIT_ISSUED',
    notes: 'Site frame rebate 1.2 cm narrower than drawing. Routed to Press Line 2 for edge trimming.',
  },
  {
    id: 'CN-2026-002',
    invoiceRef: 'INV-2026-104',
    customerName: 'Shabeer Ali (Malabar Luxury Builders)',
    district: 'Kozhikode',
    returnDate: '29 Oct 2026',
    doorsReturned: 2,
    doorModelCode: 'EXM-WPC-201',
    doorModelTitle: 'Denwood WPC Solid Core Bedroom Door',
    returnReason: 'TRANSIT_SURFACE_DAMAGE',
    taxableRefund: 9152,
    cgstReversal: 824,
    sgstReversal: 824,
    totalCreditAmount: 10800,
    disposition: 'REWORK_PLANT_FLOOR',
    status: 'APPROVED',
    notes: 'Corner transit surface scuffing reported during unloading. Dispatched touchup gel-coat.',
  },
];

export default function SalesAndReturnHub() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'returns' | 'ledger'>('invoices');
  const [invoices, setInvoices] = useState<SalesInvoice[]>(INITIAL_SALES_INVOICES);
  const [returns, setReturns] = useState<SalesReturnCreditNote[]>(INITIAL_SALES_RETURNS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('ALL');
  const [filterPayment, setFilterPayment] = useState('ALL');

  // Modals
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<SalesInvoice | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState<ReturnReason>('SIZE_TOLERANCE_MISMATCH');
  const [returnDisposition, setReturnDisposition] = useState<ReturnDisposition>('REWORK_PLANT_FLOOR');
  const [returnNotes, setReturnNotes] = useState('');

  // Print Hub state
  const [previewDoc, setPreviewDoc] = useState<HubQuotation | null>(null);
  const [printDocType, setPrintDocType] = useState<DocumentType>('salesInvoice');
  const [printTheme, setPrintTheme] = useState<PrintTheme>('tally-classic');
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  // Audio tone helper
  const playBeep = (freq = 560, duration = 0.1) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Restore zero baseline if active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isZeroed = localStorage.getItem('exmark_data_zeroed');
      if (isZeroed === 'true') {
        setInvoices([]);
        setReturns([]);
      }
      const savedTheme = localStorage.getItem('exmark_print_theme') as PrintTheme;
      if (savedTheme) setPrintTheme(savedTheme);
    }
  }, []);

  // Financial Calculations
  const grossSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalReturns = returns.reduce((sum, ret) => sum + ret.totalCreditAmount, 0);
  const netSales = Math.max(0, grossSales - totalReturns);
  const totalAdvance = invoices.reduce((sum, inv) => sum + inv.advanceCredited, 0);
  const totalReceivable = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const totalDoorsSold = invoices.reduce((sum, inv) => sum + inv.doorsCount, 0);
  const totalDoorsReturned = returns.reduce((sum, ret) => sum + ret.doorsReturned, 0);

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchQuery =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDistrict = filterDistrict === 'ALL' || inv.district === filterDistrict;
    const matchPayment = filterPayment === 'ALL' || inv.paymentStatus === filterPayment;
    return matchQuery && matchDistrict && matchPayment;
  });

  // Filtered Returns
  const filteredReturns = returns.filter((ret) => {
    return (
      ret.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Open Invoice in 5-Theme Print Hub
  const handlePrintInvoice = (inv: SalesInvoice) => {
    const quoteAdapted: HubQuotation = {
      id: inv.id,
      customerName: inv.customerName,
      location: `${inv.location}, ${inv.district}`,
      itemsSummary: inv.itemsSummary,
      gstMode: 'included',
      gstRate: 18,
      subtotal: inv.subtotal,
      gstAmount: inv.gstAmount,
      grandTotal: inv.grandTotal,
      advancePercent: Math.round((inv.advanceCredited / inv.grandTotal) * 100),
      advanceAmount: inv.advanceCredited,
      date: inv.date,
    };
    setPrintDocType('salesInvoice');
    setPreviewDoc(quoteAdapted);
    playBeep(640, 0.12);
  };

  // Open Credit Note in 5-Theme Print Hub
  const handlePrintCreditNote = (ret: SalesReturnCreditNote) => {
    const quoteAdapted: HubQuotation = {
      id: ret.id,
      customerName: ret.customerName,
      location: `${ret.district}, Kerala (Ref: ${ret.invoiceRef})`,
      itemsSummary: `CREDIT NOTE: ${ret.doorsReturned} Unit ${ret.doorModelTitle} [Reason: ${RETURN_REASONS[ret.returnReason].en}]`,
      gstMode: 'included',
      gstRate: 18,
      subtotal: ret.taxableRefund,
      gstAmount: ret.cgstReversal + ret.sgstReversal,
      grandTotal: ret.totalCreditAmount,
      advancePercent: 0,
      advanceAmount: 0,
      date: ret.returnDate,
    };
    setPrintDocType('creditNote');
    setPreviewDoc(quoteAdapted);
    playBeep(580, 0.12);
  };

  // Trigger Return Wizard from Invoice Row
  const handleInitiateReturn = (inv: SalesInvoice) => {
    setSelectedInvoiceForReturn(inv);
    setReturnQty(1);
    setReturnReason('SIZE_TOLERANCE_MISMATCH');
    setReturnDisposition('REWORK_PLANT_FLOOR');
    setReturnNotes('');
    setIsReturnModalOpen(true);
    playBeep(520, 0.08);
  };

  // Submit Sales Return
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForReturn) return;

    const unitPrice = Math.round(selectedInvoiceForReturn.grandTotal / selectedInvoiceForReturn.doorsCount);
    const totalCredit = unitPrice * returnQty;
    const taxable = Math.round(totalCredit / 1.18);
    const gstRev = totalCredit - taxable;
    const cgstRev = Math.round(gstRev / 2);
    const sgstRev = gstRev - cgstRev;

    const newCreditNoteId = `CN-2026-00${returns.length + 1}`;

    const newCreditNote: SalesReturnCreditNote = {
      id: newCreditNoteId,
      invoiceRef: selectedInvoiceForReturn.id,
      customerName: selectedInvoiceForReturn.customerName,
      district: selectedInvoiceForReturn.district,
      returnDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      doorsReturned: returnQty,
      doorModelCode: 'EXM-RET-01',
      doorModelTitle: `${selectedInvoiceForReturn.itemsSummary.split('(')[0].trim()}`,
      returnReason,
      taxableRefund: taxable,
      cgstReversal: cgstRev,
      sgstReversal: sgstRev,
      totalCreditAmount: totalCredit,
      disposition: returnDisposition,
      status: 'CREDIT_ISSUED',
      notes: returnNotes.trim() || `Processed for ${selectedInvoiceForReturn.customerName}`,
    };

    setReturns([newCreditNote, ...returns]);
    setIsReturnModalOpen(false);
    playBeep(720, 0.15);
    showToast('Credit Note Issued', `Recorded ${newCreditNoteId} for ₹${totalCredit.toLocaleString('en-IN')}. Reversal applied.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-white">{toastMessage.title}</p>
            <p className="text-[11px] text-emerald-300">{toastMessage.desc}</p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0F1E3D] to-[#162544] border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-xs flex items-center gap-1.5">
                <ReceiptText className="w-3.5 h-3.5" />
                Sales &amp; Sales Return Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                GST Section 34 Compliant
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                HSN 3925 / 18% GST
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Commercial Sales &amp; Returns Register (സെയിൽസ് &amp; ക്രെഡിറ്റ് നോട്ട്)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Official GST Tax Invoicing, dealer credit notes, size mismatch adjustments, factory rework routing, and net sales reconciliation for Kerala door projects.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('returns');
                if (invoices.length > 0) handleInitiateReturn(invoices[0]);
              }}
              className="px-3.5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>+ Record Sales Return</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (invoices.length > 0) handlePrintInvoice(invoices[0]);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/40 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Hub (5 Themes)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-[#0B132B] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Gross Billed Sales</span>
          <p className="text-lg sm:text-xl font-bold text-white mt-1">₹{(grossSales / 100000).toFixed(2)}L</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{totalDoorsSold} Doors Billed</span>
        </div>

        <div className="bg-[#0B132B] p-4 rounded-xl border border-rose-900/40">
          <span className="text-xs text-rose-400 block font-medium flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            Sales Returns
          </span>
          <p className="text-lg sm:text-xl font-bold text-rose-400 mt-1">₹{(totalReturns / 100000).toFixed(2)}L</p>
          <span className="text-[11px] text-rose-300 mt-0.5 block">{totalDoorsReturned} Doors Credited</span>
        </div>

        <div className="bg-[#0B132B] p-4 rounded-xl border border-emerald-900/40">
          <span className="text-xs text-emerald-400 block font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Net Billed Sales
          </span>
          <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">₹{(netSales / 100000).toFixed(2)}L</p>
          <span className="text-[11px] text-emerald-300 mt-0.5 block">Gross minus Returns</span>
        </div>

        <div className="bg-[#0B132B] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Advances Credited</span>
          <p className="text-lg sm:text-xl font-bold text-cyan-400 mt-1">₹{(totalAdvance / 100000).toFixed(2)}L</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Bank / UPI Received</span>
        </div>

        <div className="bg-[#0B132B] p-4 rounded-xl border border-slate-800 col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 block font-medium">Receivables Outstanding</span>
          <p className="text-lg sm:text-xl font-bold text-amber-400 mt-1">₹{(totalReceivable / 100000).toFixed(2)}L</p>
          <span className="text-[11px] text-amber-300 mt-0.5 block">Net Due from Clients</span>
        </div>
      </div>

      {/* Main Tab Controller */}
      <div className="bg-[#0B132B] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 bg-[#0d1733]">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Tax Invoices (സെയിൽസ് ഇൻവോയ്സ്)</span>
              <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {invoices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('returns')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Sales Returns &amp; Credit Notes (ക്രെഡിറ്റ് നോട്ട്)</span>
              <span className="bg-slate-800 text-rose-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {returns.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Reconciliation Ledger (നെറ്റ് സെയിൽസ്)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, client, district..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-medium"
            />
          </div>
        </div>

        {/* TAB 1: TAX INVOICES REGISTRY */}
        {activeTab === 'invoices' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Filter District:</span>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:border-red-500 cursor-pointer text-xs"
                >
                  <option value="ALL">All Kerala Districts</option>
                  <option value="Ernakulam">Ernakulam</option>
                  <option value="Malappuram">Malappuram</option>
                  <option value="Kozhikode">Kozhikode</option>
                  <option value="Thrissur">Thrissur</option>
                </select>

                <span className="text-slate-400 font-semibold ml-2">Payment:</span>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:border-red-500 cursor-pointer text-xs"
                >
                  <option value="ALL">All Status</option>
                  <option value="PAID">Paid in Full</option>
                  <option value="PARTIAL">Partial Balance Due</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>

              <span className="text-xs text-slate-400">
                Showing {filteredInvoices.length} of {invoices.length} Tax Invoices
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3">Invoice Ref</th>
                    <th className="p-3">Customer &amp; Kerala Site</th>
                    <th className="p-3">Door Specifications</th>
                    <th className="p-3 text-right">Taxable (₹)</th>
                    <th className="p-3 text-right">18% GST (₹)</th>
                    <th className="p-3 text-right">Total Value</th>
                    <th className="p-3 text-right">Advance Paid</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-500">
                          <ReceiptText className="w-8 h-8 text-slate-600" />
                          <p className="font-bold text-slate-300 text-sm">0 Tax Invoices Found</p>
                          <p className="text-xs text-slate-400">
                            Convert an active Sales Order or record a direct sale to generate official GST Tax Invoices.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 font-mono font-bold">
                          <span className="text-emerald-400">{inv.id}</span>
                          {inv.orderRef && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              From: {inv.orderRef}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{inv.customerName}</div>
                          <div className="text-[10px] text-slate-400">
                            {inv.location} &bull; {inv.district} &bull; {inv.date}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 max-w-[220px]">
                          <span className="truncate block font-medium">{inv.itemsSummary}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {inv.doorsCount} Door Sets &bull; HSN 3925
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          ₹{inv.subtotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400 text-[11px]">
                          ₹{inv.gstAmount.toLocaleString('en-IN')}
                          <span className="block text-[9px] text-slate-500">9% C + 9% S</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{inv.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-cyan-400 text-[11px]">
                          ₹{inv.advanceCredited.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {inv.balanceDue === 0 ? (
                            <span className="text-emerald-400 text-[10px] bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                              PAID IN FULL
                            </span>
                          ) : (
                            <span className="text-amber-400">
                              ₹{inv.balanceDue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePrintInvoice(inv)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
                              title="Print Invoice in 5 Themes (Tally & Vyapar)"
                            >
                              <Printer className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Print</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInitiateReturn(inv)}
                              className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs rounded border border-rose-800/50 transition cursor-pointer flex items-center gap-1"
                              title="Issue Sales Return (Credit Note)"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-400" />
                              <span>Return ↩</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SALES RETURNS & CREDIT NOTES */}
        {activeTab === 'returns' && (
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">GST Section 34 Credit Note Compliance:</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  When doors are returned due to site opening variation, surface scratch, or design change, an official GST Credit Note is issued, reversing 18% GST (HSN 3925) and deducting from customer accounts.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3">Credit Note #</th>
                    <th className="p-3">Original Invoice</th>
                    <th className="p-3">Customer &amp; District</th>
                    <th className="p-3">Returned Doors &amp; Spec</th>
                    <th className="p-3">Reason for Return</th>
                    <th className="p-3 text-right">Credit Value (₹)</th>
                    <th className="p-3">Factory Disposition</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-500">
                          <RotateCcw className="w-8 h-8 text-slate-600" />
                          <p className="font-bold text-slate-300 text-sm">0 Sales Returns Recorded</p>
                          <p className="text-xs text-slate-400">
                            No door returns or credit notes recorded. Click "+ Record Sales Return" above if a customer returns doors.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 font-mono font-bold text-rose-400">{ret.id}</td>
                        <td className="p-3 font-mono text-cyan-400">{ret.invoiceRef}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{ret.customerName}</div>
                          <div className="text-[10px] text-slate-400">
                            {ret.district} &bull; {ret.returnDate}
                          </div>
                        </td>
                        <td className="p-3 text-slate-200">
                          <span className="font-semibold block">{ret.doorsReturned} Units Returned</span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {ret.doorModelTitle}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-200 block text-[11px]">
                            {RETURN_REASONS[ret.returnReason].en}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {RETURN_REASONS[ret.returnReason].ml}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">
                          ₹{ret.totalCreditAmount.toLocaleString('en-IN')}
                          <span className="block text-[9px] text-slate-500 font-mono">
                            Taxable: ₹{ret.taxableRefund} + GST: ₹{ret.cgstReversal + ret.sgstReversal}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border block w-fit ${
                              DISPOSITION_LABELS[ret.disposition].color
                            }`}
                          >
                            {DISPOSITION_LABELS[ret.disposition].en}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            {ret.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintCreditNote(ret)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Print GST Credit Note (5 Themes)"
                          >
                            <Printer className="w-3.5 h-3.5 text-rose-400" />
                            <span>Print Note</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RECONCILIATION LEDGER */}
        {activeTab === 'ledger' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase">Gross Billing Total</span>
                <p className="text-2xl font-black text-white">₹{grossSales.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-400">Total Tax Invoices issued</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-rose-900/50 space-y-1">
                <span className="text-xs text-rose-400 font-semibold uppercase">Less: Sales Returns</span>
                <p className="text-2xl font-black text-rose-400">-₹{totalReturns.toLocaleString('en-IN')}</p>
                <p className="text-xs text-rose-300/80">Credit Notes issued under Section 34</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/50 space-y-1">
                <span className="text-xs text-emerald-400 font-semibold uppercase">Equals: Net Realized Sales</span>
                <p className="text-2xl font-black text-emerald-400">₹{netSales.toLocaleString('en-IN')}</p>
                <p className="text-xs text-emerald-300/80">Recognized factory commercial revenue</p>
              </div>
            </div>

            {/* Customer Net Breakdown Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3">Customer / Dealer</th>
                    <th className="p-3">District</th>
                    <th className="p-3 text-right">Invoices Value (₹)</th>
                    <th className="p-3 text-right">Returns (Credit Note) (₹)</th>
                    <th className="p-3 text-right">Net Sales (₹)</th>
                    <th className="p-3 text-right">Balance Due (₹)</th>
                    <th className="p-3 text-center">Ledger Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {invoices.map((inv) => {
                    const custReturns = returns
                      .filter((r) => r.customerName === inv.customerName)
                      .reduce((sum, r) => sum + r.totalCreditAmount, 0);
                    const custNet = Math.max(0, inv.grandTotal - custReturns);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3">
                          <span className="font-bold text-white block">{inv.customerName}</span>
                          <span className="text-[10px] text-slate-400">{inv.phone}</span>
                        </td>
                        <td className="p-3 text-slate-300">{inv.district}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          ₹{inv.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-400">
                          {custReturns > 0 ? `-₹${custReturns.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{custNet.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-amber-400 font-semibold">
                          ₹{inv.balanceDue.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const quoteAdapted: HubQuotation = {
                                id: inv.id,
                                customerName: inv.customerName,
                                location: `${inv.location}, ${inv.district}`,
                                itemsSummary: inv.itemsSummary,
                                gstMode: 'included',
                                gstRate: 18,
                                subtotal: inv.subtotal,
                                gstAmount: inv.gstAmount,
                                grandTotal: inv.grandTotal,
                                advancePercent: Math.round((inv.advanceCredited / inv.grandTotal) * 100),
                                advanceAmount: inv.advanceCredited,
                                date: inv.date,
                              };
                              setPrintDocType('statement');
                              setPreviewDoc(quoteAdapted);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-slate-700 transition cursor-pointer"
                          >
                            View Statement 📊
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RECORD SALES RETURN (CREDIT NOTE) MODAL */}
      {isReturnModalOpen && selectedInvoiceForReturn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Sales Return (ക്രെഡിറ്റ് നോട്ട്)</h3>
                  <p className="text-xs text-slate-400">GST Section 34 Tax Credit Note Issuance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Reference:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedInvoiceForReturn.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold text-white">{selectedInvoiceForReturn.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Doors in Invoice:</span>
                  <span className="font-semibold text-slate-200">{selectedInvoiceForReturn.doorsCount} Sets</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Returned Door Quantity (എണ്ണം)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedInvoiceForReturn.doorsCount}
                    value={returnQty}
                    onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-white font-bold text-center focus:border-rose-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Calculated Credit Amount (₹)
                  </label>
                  <div className="bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-rose-400 font-mono font-bold text-center">
                    ₹{((Math.round(selectedInvoiceForReturn.grandTotal / selectedInvoiceForReturn.doorsCount) * returnQty)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reason for Return (തിരിച്ചയക്കാനുള്ള കാരണം)
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer"
                >
                  {Object.entries(RETURN_REASONS).map(([k, val]) => (
                    <option key={k} value={k}>
                      {val.en} ({val.ml})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Factory Material Disposition (ഫാക്ടറി നടപടി)
                </label>
                <select
                  value={returnDisposition}
                  onChange={(e) => setReturnDisposition(e.target.value as ReturnDisposition)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer"
                >
                  {Object.entries(DISPOSITION_LABELS).map(([k, val]) => (
                    <option key={k} value={k}>
                      {val.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Site / Inspection Notes (പരിശോധന കുറിപ്പ്)
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Specify dimension variation or inspection remark..."
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Issue Credit Note &amp; Adjust (ക്രെഡിറ്റ് നോട്ട് രേഖപ്പെടുത്തുക)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT DOCUMENT MODAL (5 Themes) */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-[#131d35]">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {previewDoc.id}
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Official GST Print &amp; Document Hub</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-900/40 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Type & Theme Toolbar */}
            <div className="border-b border-slate-800 bg-[#090e1a] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <ReceiptText className="w-3.5 h-3.5 text-rose-400" />
                  <span>Document Mode:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'salesInvoice', label: 'Tax Invoice (GST Bill)' },
                      { id: 'creditNote', label: 'GST Credit Note (Sales Return)' },
                      { id: 'salesOrder', label: 'Sales Order Ref' },
                      { id: 'statement', label: 'Party Statement' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPrintDocType(m.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        printDocType === m.id
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Print Theme:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'tally-classic', label: '🏛️ Tally Classic' },
                      { id: 'tally-modern', label: '📊 Tally Modern' },
                      { id: 'tally-formal', label: '📋 Tally Formal' },
                      { id: 'vyapar-elegant', label: '🎨 Vyapar Elegant' },
                      { id: 'vyapar-modern', label: '🏷️ Vyapar Modern' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setPrintTheme(t.id);
                        if (typeof window !== 'undefined') localStorage.setItem('exmark_print_theme', t.id);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        printTheme === t.id
                          ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div id="printableQuoteArea" className="p-4 sm:p-6 overflow-y-auto bg-slate-950/90 text-slate-900 flex justify-center">
              <div className="w-full max-w-4xl bg-white shadow-2xl rounded-sm">
                <PrintDocumentHub
                  theme={printTheme}
                  documentType={printDocType}
                  quotation={previewDoc}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
