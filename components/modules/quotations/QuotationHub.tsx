'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PrintDocumentHub, PrintTheme, DocumentType } from './PrintDocumentHub';
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Search,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  FileCheck,
  Percent,
} from 'lucide-react';

// Customer interface
export interface HubCustomer {
  id: string;
  name: string;
  phone: string;
  location: string;
  type: string;
  gstin?: string;
}

// Door Model interface
export interface HubDoorModel {
  id: string;
  code: string;
  title: string;
  material: 'FRP' | 'WPC' | 'Steel';
  rate: number;
  finish: string;
}

// 16th-inch fractions specification for door carpentry & manufacturing
export const INCH_FRACTION_OPTIONS = [
  { value: '0', label: '0" (Exact)', dec: 0 },
  { value: '1/16', label: '1/16"', dec: 1 / 16 },
  { value: '1/8', label: '1/8"', dec: 2 / 16 },
  { value: '3/16', label: '3/16"', dec: 3 / 16 },
  { value: '1/4', label: '1/4"', dec: 4 / 16 },
  { value: '5/16', label: '5/16"', dec: 5 / 16 },
  { value: '3/8', label: '3/8"', dec: 6 / 16 },
  { value: '7/16', label: '7/16"', dec: 7 / 16 },
  { value: '1/2', label: '1/2"', dec: 8 / 16 },
  { value: '9/16', label: '9/16"', dec: 9 / 16 },
  { value: '5/8', label: '5/8"', dec: 10 / 16 },
  { value: '11/16', label: '11/16"', dec: 11 / 16 },
  { value: '3/4', label: '3/4"', dec: 12 / 16 },
  { value: '13/16', label: '13/16"', dec: 13 / 16 },
  { value: '7/8', label: '7/8"', dec: 14 / 16 },
  { value: '15/16', label: '15/16"', dec: 15 / 16 },
];

export function parseInchFraction(fracStr?: string): number {
  if (!fracStr || fracStr === '0' || fracStr === '0/8' || fracStr === '0/16') return 0;
  const match = INCH_FRACTION_OPTIONS.find((f) => f.value === fracStr);
  if (match) return match.dec;
  const parts = fracStr.split('/');
  if (parts.length === 2) {
    const n = parseFloat(parts[0]);
    const d = parseFloat(parts[1]);
    return d > 0 ? n / d : 0;
  }
  return 0;
}

export function decimalToInchFraction(decimalInches: number): { whole: number; fraction: string } {
  const whole = Math.floor(decimalInches);
  const rem = decimalInches - whole;
  const sixteenths = Math.round(rem * 16);
  if (sixteenths <= 0) return { whole, fraction: '0' };
  if (sixteenths >= 16) return { whole: whole + 1, fraction: '0' };
  if (sixteenths % 8 === 0) return { whole, fraction: `${sixteenths / 8}/2` }; // 1/2
  if (sixteenths % 4 === 0) return { whole, fraction: `${sixteenths / 4}/4` }; // 1/4, 3/4
  if (sixteenths % 2 === 0) return { whole, fraction: `${sixteenths / 2}/8` }; // 1/8, 3/8, 5/8, 7/8
  return { whole, fraction: `${sixteenths}/16` };
}

export function formatDimensionDisplay(
  height: number,
  widthTop: number,
  widthBottomOrUnit?: number | 'cm' | 'mm' | 'inch',
  unitOrHFrac?: 'cm' | 'mm' | 'inch' | string,
  hFracOrWTopFrac?: string,
  wTopFracOrWBtmFrac?: string,
  wBottomFrac?: string
): string {
  // If called with legacy 5 args: (h, w, unit, hFrac, wFrac)
  if (typeof widthBottomOrUnit === 'string') {
    const unit = widthBottomOrUnit as 'cm' | 'mm' | 'inch';
    const hFrac = typeof unitOrHFrac === 'string' ? unitOrHFrac : '0';
    const wFrac = typeof hFracOrWTopFrac === 'string' ? hFracOrWTopFrac : '0';

    if (unit === 'inch') {
      const hText = hFrac && hFrac !== '0' ? `${height} ${hFrac}"` : `${height}"`;
      const wText = wFrac && wFrac !== '0' ? `${widthTop} ${wFrac}"` : `${widthTop}"`;
      return `${hText} × ${wText}`;
    }
    return `${height} × ${widthTop} ${unit}`;
  }

  // Called with 7 args: (h, wTop, wBtm, unit, hFrac, wTopFrac, wBtmFrac)
  const wBtm = typeof widthBottomOrUnit === 'number' && !isNaN(widthBottomOrUnit) ? widthBottomOrUnit : widthTop;
  const unit = (typeof unitOrHFrac === 'string' && ['cm', 'mm', 'inch'].includes(unitOrHFrac))
    ? (unitOrHFrac as 'cm' | 'mm' | 'inch')
    : 'inch';
  const hFrac = typeof hFracOrWTopFrac === 'string' ? hFracOrWTopFrac : '0';
  const wTopFrac = typeof wTopFracOrWBtmFrac === 'string' ? wTopFracOrWBtmFrac : '0';
  const wBtmFrac = typeof wBottomFrac === 'string' ? wBottomFrac : wTopFrac;

  if (unit === 'inch') {
    const hText = hFrac && hFrac !== '0' ? `${height} ${hFrac}"` : `${height}"`;
    const wTopText = wTopFrac && wTopFrac !== '0' ? `${widthTop} ${wTopFrac}"` : `${widthTop}"`;
    const wBtmText = wBtmFrac && wBtmFrac !== '0' ? `${wBtm} ${wBtmFrac}"` : `${wBtm}"`;

    if (wTopText === wBtmText) {
      return `${hText} × ${wTopText}`;
    }
    return `${hText} × [Top: ${wTopText} / Btm: ${wBtmText}]`;
  }

  if (widthTop === wBtm) {
    return `${height} × ${widthTop} ${unit}`;
  }
  return `${height} × [Top: ${widthTop} / Btm: ${wBtm}] ${unit}`;
}

export function calculateSqFt(
  h: number,
  wTop: number,
  wBottom?: number,
  unit: 'cm' | 'mm' | 'inch' = 'cm',
  hFrac?: string,
  wTopFrac?: string,
  wBottomFrac?: string
): string {
  const wBtm = wBottom !== undefined && !isNaN(wBottom) ? wBottom : wTop;
  let hInches = h;
  let wTopInches = wTop;
  let wBtmInches = wBtm;

  if (unit === 'inch') {
    hInches = h + parseInchFraction(hFrac);
    wTopInches = wTop + parseInchFraction(wTopFrac);
    wBtmInches = wBtm + parseInchFraction(wBottomFrac ?? wTopFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wTopInches = wTop / 2.54;
    wBtmInches = wBtm / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wTopInches = wTop / 25.4;
    wBtmInches = wBtm / 25.4;
  }

  const avgWidthInches = (wTopInches + wBtmInches) / 2;
  return ((hInches * avgWidthInches) / 144).toFixed(2);
}

// Quotation Item Row Draft
export interface QuoteItemRow {
  id: number;
  modelId: string;
  unit: 'cm' | 'mm' | 'inch';
  height: number;
  heightFraction?: string;
  widthTop?: number;
  widthTopFraction?: string;
  widthBottom?: number;
  widthBottomFraction?: string;
  width: number;
  widthFraction?: string;
  qty: number;
  rate: number;
}

// Saved Quotation Record
export interface HubQuotation {
  id: string;
  customerName: string;
  location: string;
  itemsSummary: string;
  gstMode: 'without' | 'excluded' | 'included';
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  advancePercent: number;
  advanceAmount: number;
  date: string;
  itemRows?: QuoteItemRow[];
}

// Lead item
export interface HubLead {
  id: string;
  title: string;
  client: string;
  value: string;
  doors: string;
  stage: 'inquiries' | 'measurement' | 'quotation' | 'negotiation';
  notes?: string;
}

// Sales Order item
export interface HubSalesOrder {
  id: string;
  title: string;
  client: string;
  value: string;
  doors: string;
  stepIndex: number;
  advancePaid: string;
  totalNumericValue?: number;
  advanceAmount?: number;
  advanceVerified?: boolean;
  paymentMode?: string;
  paymentRef?: string;
  isConvertedToSales?: boolean;
  convertedInvoiceId?: string;
}

// Initial Customers
const INITIAL_CUSTOMERS: HubCustomer[] = [
  { id: 'CUST-001', name: 'Er. Jacob Roy', phone: '+91 98470 11223', location: 'Ernakulam', type: 'Architect', gstin: '32ABCPR1234A1Z1' },
  { id: 'CUST-002', name: 'Ar. Ananya Nair', phone: '+91 97450 44556', location: 'Thrissur', type: 'Architect', gstin: '' },
  { id: 'CUST-003', name: 'Varghese Mathew', phone: '+91 94471 88990', location: 'Kakkanad, Ernakulam', type: 'Contractor', gstin: '32AABCV5678B1Z2' },
  { id: 'CUST-004', name: 'Shabeer Ali (Malabar Luxury Builders)', phone: '+91 98950 33445', location: 'Nilambur, Kozhikode', type: 'Builder', gstin: '32AAAFM9012C1Z3' },
  { id: 'CUST-005', name: 'Secura Mall Ventures LLP', phone: '+91 98956 02866', location: 'Perinthalmanna', type: 'Builder', gstin: '32AFRFS1232G1Z4' },
  { id: 'CUST-006', name: 'Kerala Grand Villas', phone: '+91 94479 66778', location: 'Ernakulam', type: 'Builder', gstin: '' },
];

// Initial Door Models
const INITIAL_MODELS: HubDoorModel[] = [
  { id: 'MOD-101', code: 'EXM-A-101', title: 'Natural Teak Classic Molded', material: 'FRP', rate: 3850, finish: 'Natural Teak Matte' },
  { id: 'MOD-103', code: 'EXM-AB-103', title: 'Rose Wood Fusion Design', material: 'FRP', rate: 4200, finish: 'Rose Wood Glossy' },
  { id: 'MOD-113', code: 'EXM-A-113', title: 'Mahogany Waterproof Flush Door', material: 'FRP', rate: 3600, finish: 'Mahogany Matte' },
  { id: 'MOD-121', code: 'EXM-A-121', title: 'Eeti Wood Heavy Bathroom Door', material: 'FRP', rate: 3950, finish: 'Eeti Wood' },
  { id: 'MOD-201', code: 'EXM-WPC-201', title: 'Denwood WPC Solid Core Bedroom Door', material: 'WPC', rate: 5400, finish: 'Oak Wood Laminated' },
  { id: 'MOD-701', code: 'EXM-MS-701', title: 'Double Skin GI Steel Shaft Duct Door', material: 'Steel', rate: 6560, finish: 'Powder Coated Grey' },
];

// Initial Quotations
const INITIAL_QUOTATIONS: HubQuotation[] = [
  {
    id: 'QT-2026-104',
    customerName: 'Secura Mall Ventures LLP',
    location: 'Perinthalmanna',
    itemsSummary: '163 MS Shaft & FRP Service Doors',
    gstMode: 'excluded',
    gstRate: 18,
    subtotal: 1677966,
    gstAmount: 302034,
    grandTotal: 1980000,
    advancePercent: 50,
    advanceAmount: 990000,
    date: '25 Oct 2026',
  },
  {
    id: 'QT-2026-105',
    customerName: 'Varghese Mathew',
    location: 'Kakkanad',
    itemsSummary: '55 Heavy Duty FRP Bathroom Flush Doors',
    gstMode: 'included',
    gstRate: 18,
    subtotal: 610169,
    gstAmount: 109831,
    grandTotal: 720000,
    advancePercent: 50,
    advanceAmount: 360000,
    date: '24 Oct 2026',
  },
  {
    id: 'QT-2026-106',
    customerName: 'Shabeer Ali (Malabar Luxury Builders)',
    location: 'Nilambur',
    itemsSummary: '22 FRP Waterproof Doors',
    gstMode: 'without',
    gstRate: 0,
    subtotal: 290000,
    gstAmount: 0,
    grandTotal: 290000,
    advancePercent: 50,
    advanceAmount: 145000,
    date: '22 Oct 2026',
  },
];

// Initial Leads
const INITIAL_LEADS: HubLead[] = [
  { id: 'LEAD-2026-001', title: 'Kochi Waterfront Apartments - Tower C', client: 'Er. Jacob Roy - Ernakulam', value: '₹4.2L', doors: '32 FRP Doors', stage: 'inquiries', notes: 'Inquiry received via WhatsApp' },
  { id: 'LEAD-2026-005', title: 'Kakkanad IT Park Villa', client: 'Mr. Unnikrishnan - Ernakulam', value: '₹3.5L', doors: '18 WPC Doors', stage: 'inquiries', notes: 'Rosewood finish samples requested' },
  { id: 'LEAD-2026-012', title: 'Waterfront Villas FRP Schedule', client: 'Kerala Grand Villas - Ernakulam', value: '₹3.4L', doors: '20 FRP Doors', stage: 'inquiries', notes: 'Frame sizes 750x2050mm' },
  { id: 'LEAD-2026-013', title: 'Waterfront Villas FRP Schedule Phase B', client: 'Kerala Grand Villas - Ernakulam', value: '₹3.4L', doors: '20 FRP Doors', stage: 'inquiries', notes: 'Pending site inspection' },
  { id: 'LEAD-2026-002', title: 'Green Meadows Luxury Villas - Phase 2', client: 'Ar. Ananya Nair - Thrissur', value: '₹3.6L', doors: '14 WPC Doors', stage: 'measurement', notes: 'Measurement scheduled' },
  { id: 'LEAD-2026-003', title: 'Skyline Palmes Kakkanad - Block B', client: 'Varghese Mathew - Ernakulam', value: '₹7.2L', doors: '55 FRP Doors', stage: 'quotation', notes: 'BOQ submitted' },
  { id: 'LEAD-2026-004', title: 'Malabar Luxury Builders - Nilambur', client: 'Shabeer Ali - Kozhikode', value: '₹2.9L', doors: '22 FRP Doors', stage: 'negotiation', notes: 'Final rate negotiation' },
];

// Initial Sales Orders
const INITIAL_ORDERS: HubSalesOrder[] = [
  { id: 'SO-2026-088', title: 'Secura Centre Mall - Shaft & Service Doors', client: 'Secura Mall Ventures', value: '₹19.8L', doors: '163 MS Shaft Doors', stepIndex: 2, advancePaid: '₹9.9L (50% Recd)', totalNumericValue: 1980000, advanceAmount: 990000, advanceVerified: true, paymentMode: 'NEFT/RTGS' },
  { id: 'SO-2026-089', title: 'Autumn Leaves Luxury Villa 17', client: 'Mr. Anas - Calicut', value: '₹1.85L', doors: '12 FRP Doors', stepIndex: 3, advancePaid: '₹92,500 (50% Recd)', totalNumericValue: 185000, advanceAmount: 92500, advanceVerified: true, paymentMode: 'UPI' },
  { id: 'SO-2026-090', title: 'Skyline Palms Luxury Tower C', client: 'Varghese Mathew - Ernakulam', value: '₹3.6L', doors: '25 FRP Doors', stepIndex: 0, advancePaid: 'Pending 40% Advance', totalNumericValue: 360000, advanceAmount: 0, advanceVerified: false },
];

const STAGE_ORDER: Array<HubLead['stage']> = ['inquiries', 'measurement', 'quotation', 'negotiation'];
const STAGE_LABELS: Record<HubLead['stage'], string> = {
  inquiries: 'New Inquiries',
  measurement: 'Measurement Scheduled',
  quotation: 'Quotation Submitted',
  negotiation: 'Final Negotiation',
};

const ORDER_STEPS = [
  'Order Confirmed & Specs Locked',
  '50% Advance Received',
  'In Production (FRP Press / Extrusion)',
  'QC Passed (IS 14856)',
  'Dispatched & Installed',
];

export function QuotationHub() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'quotations' | 'pipeline' | 'salesOrders'>('quotations');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Helper to create a clean zero-baseline draft row
  const createZeroRow = (id = 1, modelId = ''): QuoteItemRow => ({
    id,
    modelId: modelId || INITIAL_MODELS[0]?.id || 'MOD-101',
    unit: 'inch',
    height: 0,
    heightFraction: '0',
    widthTop: 0,
    widthTopFraction: '0',
    widthBottom: 0,
    widthBottomFraction: '0',
    width: 0,
    widthFraction: '0',
    qty: 0,
    rate: 0,
  });

  // Entities
  const [customers, setCustomers] = useState<HubCustomer[]>(INITIAL_CUSTOMERS);
  const [doorModels, setDoorModels] = useState<HubDoorModel[]>(INITIAL_MODELS);
  const [quotations, setQuotations] = useState<HubQuotation[]>(INITIAL_QUOTATIONS);
  const [leads, setLeads] = useState<HubLead[]>(INITIAL_LEADS);
  const [salesOrders, setSalesOrders] = useState<HubSalesOrder[]>(INITIAL_ORDERS);

  // Active Quote Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(INITIAL_CUSTOMERS[0].id);
  const [advancePercent, setAdvancePercent] = useState<number>(50);
  const [gstMode, setGstMode] = useState<'without' | 'excluded' | 'included'>('excluded');
  const [customGstPercent, setCustomGstPercent] = useState<number>(18);
  const [quoteItemRows, setQuoteItemRows] = useState<QuoteItemRow[]>([
    { id: 1, modelId: INITIAL_MODELS[0].id, unit: 'cm', height: 205, heightFraction: '0', widthTop: 75, widthTopFraction: '0', widthBottom: 75, widthBottomFraction: '0', width: 75, widthFraction: '0', qty: 10, rate: INITIAL_MODELS[0].rate },
    { id: 2, modelId: INITIAL_MODELS[1].id, unit: 'cm', height: 205, heightFraction: '0', widthTop: 80, widthTopFraction: '0', widthBottom: 80, widthBottomFraction: '0', width: 80, widthFraction: '0', qty: 5, rate: INITIAL_MODELS[1].rate },
  ]);

  // Modals & Print Options
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddDoorModelOpen, setIsAddDoorModelOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<HubQuotation | null>(null);
  const [printTheme, setPrintTheme] = useState<PrintTheme>('tally-classic');
  const [printDocType, setPrintDocType] = useState<DocumentType>('quotation');
  const [activeLeadModal, setActiveLeadModal] = useState<HubLead | null>(null);
  const [leadModalNotes, setLeadModalNotes] = useState<string>('');
  const [isZeroConfirmOpen, setIsZeroConfirmOpen] = useState(false);

  // 40% Advance Gatekeeper Modal state
  const [activeAdvanceOrder, setActiveAdvanceOrder] = useState<HubSalesOrder | null>(null);
  const [advanceDepositAmount, setAdvanceDepositAmount] = useState<number>(0);
  const [advanceDepositMode, setAdvanceDepositMode] = useState<string>('UPI');
  const [advanceDepositRef, setAdvanceDepositRef] = useState<string>('');
  const [advanceDepositNotes, setAdvanceDepositNotes] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('exmark_print_theme') as PrintTheme;
      if (saved) setPrintTheme(saved);

      const isZeroed = localStorage.getItem('exmark_data_zeroed');
      if (isZeroed === 'true') {
        setQuotations([]);
        setLeads([]);
        setSalesOrders([]);
        setCustomers([]);
        setSelectedCustomerId('');
        setQuoteItemRows([createZeroRow(1, INITIAL_MODELS[0]?.id)]);
      } else {
        // Fetch actual live customers from store
        fetch('/api/customers')
          .then((res) => res.json())
          .then((json) => {
            if (json && Array.isArray(json.data)) {
              if (json.data.length === 0) {
                setCustomers([]);
                setSelectedCustomerId('');
              } else {
                setCustomers(json.data);
                if (json.data[0]) setSelectedCustomerId(json.data[0].id);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleSelectTheme = (t: PrintTheme) => {
    setPrintTheme(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('exmark_print_theme', t);
    }
  };

  // Add Customer Form Fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLocation, setNewCustLocation] = useState('');
  const [newCustType, setNewCustType] = useState('Architect');
  const [newCustGst, setNewCustGst] = useState('');

  // Add Model Form Fields
  const [newModelCode, setNewModelCode] = useState('');
  const [newModelTitle, setNewModelTitle] = useState('');
  const [newModelMaterial, setNewModelMaterial] = useState<'FRP' | 'WPC' | 'Steel'>('FRP');
  const [newModelRate, setNewModelRate] = useState('4200');
  const [newModelFinish, setNewModelFinish] = useState('Matte Teak / Rosewood');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'success' | 'info' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Audio synthesis feedback
  const playBeep = (freq = 520, duration = 0.08) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  // Calculations for Active Form
  const subtotal = quoteItemRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * r.rate, 0);
  const effectiveGstPercent = gstMode === 'without' ? 0 : customGstPercent;

  let gstAmount = 0;
  let grandTotal = 0;
  let itemsSubtotal = subtotal;

  if (gstMode === 'without') {
    gstAmount = 0;
    grandTotal = subtotal;
  } else if (gstMode === 'excluded') {
    gstAmount = subtotal * (effectiveGstPercent / 100);
    grandTotal = subtotal + gstAmount;
  } else if (gstMode === 'included') {
    grandTotal = subtotal;
    itemsSubtotal = grandTotal / (1 + effectiveGstPercent / 100);
    gstAmount = grandTotal - itemsSubtotal;
  }

  const advanceAmount = grandTotal * (advancePercent / 100);
  const balanceAmount = grandTotal - advanceAmount;

  // Row Manipulation
  const handleAddRow = () => {
    const nextId = quoteItemRows.length + 1;
    const firstModel = doorModels[0];
    setQuoteItemRows([
      ...quoteItemRows,
      {
        id: nextId,
        modelId: firstModel.id,
        unit: 'cm',
        height: 205,
        heightFraction: '0',
        widthTop: 75,
        widthTopFraction: '0',
        widthBottom: 75,
        widthBottomFraction: '0',
        width: 75,
        widthFraction: '0',
        qty: 1,
        rate: firstModel.rate,
      },
    ]);
  };

  const handleUpdateRow = (index: number, updates: Partial<QuoteItemRow>) => {
    const updated = [...quoteItemRows];
    const currentRow = updated[index];

    // Handle unit conversion if unit changes
    if (updates.unit && updates.unit !== currentRow.unit) {
      let h = currentRow.height;
      let wT = currentRow.widthTop ?? currentRow.width ?? 0;
      let wB = currentRow.widthBottom ?? wT;
      const oldUnit = currentRow.unit;
      const newUnit = updates.unit;

      let hInches = h;
      let wTInches = wT;
      let wBInches = wB;

      if (oldUnit === 'inch') {
        hInches += parseInchFraction(currentRow.heightFraction);
        wTInches += parseInchFraction(currentRow.widthTopFraction || currentRow.widthFraction);
        wBInches += parseInchFraction(currentRow.widthBottomFraction || currentRow.widthTopFraction || currentRow.widthFraction);
      } else if (oldUnit === 'cm') {
        hInches = h / 2.54;
        wTInches = wT / 2.54;
        wBInches = wB / 2.54;
      } else if (oldUnit === 'mm') {
        hInches = h / 25.4;
        wTInches = wT / 25.4;
        wBInches = wB / 25.4;
      }

      if (newUnit === 'inch') {
        const hDecomp = decimalToInchFraction(hInches);
        const wtDecomp = decimalToInchFraction(wTInches);
        const wbDecomp = decimalToInchFraction(wBInches);
        updates.height = hDecomp.whole;
        updates.heightFraction = hDecomp.fraction;
        updates.widthTop = wtDecomp.whole;
        updates.widthTopFraction = wtDecomp.fraction;
        updates.widthBottom = wbDecomp.whole;
        updates.widthBottomFraction = wbDecomp.fraction;
        updates.width = wtDecomp.whole;
        updates.widthFraction = wtDecomp.fraction;
      } else if (newUnit === 'cm') {
        updates.height = Math.round(hInches * 2.54 * 10) / 10;
        updates.widthTop = Math.round(wTInches * 2.54 * 10) / 10;
        updates.widthBottom = Math.round(wBInches * 2.54 * 10) / 10;
        updates.width = updates.widthTop;
        updates.heightFraction = '0';
        updates.widthTopFraction = '0';
        updates.widthBottomFraction = '0';
        updates.widthFraction = '0';
      } else if (newUnit === 'mm') {
        updates.height = Math.round(hInches * 25.4);
        updates.widthTop = Math.round(wTInches * 25.4);
        updates.widthBottom = Math.round(wBInches * 25.4);
        updates.width = updates.widthTop;
        updates.heightFraction = '0';
        updates.widthTopFraction = '0';
        updates.widthBottomFraction = '0';
        updates.widthFraction = '0';
      }
    }

    // Auto-update rate when model changes
    if (updates.modelId && updates.modelId !== currentRow.modelId) {
      const found = doorModels.find((m) => m.id === updates.modelId);
      if (found) updates.rate = found.rate;
    }

    updated[index] = { ...currentRow, ...updates };
    setQuoteItemRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    if (quoteItemRows.length <= 1) {
      showToast('Warning', 'Quotation must have at least one door item.', 'info');
      return;
    }
    setQuoteItemRows(quoteItemRows.filter((_, idx) => idx !== index));
  };

  const handleClearAllToZero = () => {
    setQuoteItemRows([createZeroRow(1, doorModels[0]?.id)]);
    playBeep(480, 0.08);
    showToast('Workbench Cleared to Zero', 'All door quantities, dimensions, and rates set to 0 (₹0).', 'info');
  };

  // Save Quotation
  const handleSaveQuotation = () => {
    const totalDoors = quoteItemRows.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    if (totalDoors <= 0) {
      playBeep(350, 0.15);
      showToast('Zero Quantity', 'Please enter a door quantity greater than 0 before generating a quotation.', 'info');
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId) || { name: 'Direct Client', location: 'Kerala' };
    const newQuoteId = `QT-2026-0${quotations.length + 109}`;

    const newQuote: HubQuotation = {
      id: newQuoteId,
      customerName: cust.name,
      location: cust.location,
      itemsSummary: `${totalDoors} FRP & WPC Doors (${quoteItemRows.length} Sizes)`,
      gstMode,
      gstRate: effectiveGstPercent,
      subtotal: Math.round(itemsSubtotal),
      gstAmount: Math.round(gstAmount),
      grandTotal: Math.round(grandTotal),
      advancePercent,
      advanceAmount: Math.round(advanceAmount),
      date: '27 Oct 2026',
      itemRows: [...quoteItemRows],
    };

    setQuotations([newQuote, ...quotations]);
    playBeep(640, 0.12);
    showToast('Quotation Created Successfully', `${newQuoteId} for ${cust.name} (Total: ₹${Math.round(grandTotal).toLocaleString('en-IN')})`);
    setPreviewQuote(newQuote);
  };

  // Add Customer Action
  const handleSaveCustomer = () => {
    if (!newCustName.trim() || !newCustPhone.trim() || !newCustLocation.trim()) {
      showToast('Missing Details', 'Please fill Customer Name, Phone, and Location.', 'info');
      return;
    }
    const newId = `CUST-0${customers.length + 10}`;
    const newCustomer: HubCustomer = {
      id: newId,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      location: newCustLocation.trim(),
      type: newCustType,
      gstin: newCustGst.trim(),
    };

    setCustomers([newCustomer, ...customers]);
    setSelectedCustomerId(newId);
    setIsAddCustomerOpen(false);
    playBeep(600, 0.1);
    showToast('Customer Added', `${newCustomer.name} (${newCustomer.location}) added and selected for this quote!`);

    setNewCustName('');
    setNewCustPhone('');
    setNewCustLocation('');
    setNewCustGst('');
  };

  // Add Door Model Action
  const handleSaveDoorModel = () => {
    const code = newModelCode.trim().toUpperCase();
    const title = newModelTitle.trim();
    if (!code || !title) {
      showToast('Missing Details', 'Please provide Model Code and Model Title.', 'info');
      return;
    }
    const newModId = `MOD-${doorModels.length + 101}`;
    const newModel: HubDoorModel = {
      id: newModId,
      code,
      title,
      material: newModelMaterial,
      rate: parseFloat(newModelRate) || 3500,
      finish: newModelFinish.trim() || 'Standard Factory Finish',
    };

    setDoorModels([...doorModels, newModel]);
    setIsAddDoorModelOpen(false);
    playBeep(620, 0.1);
    showToast('Model Added to Catalog', `${code} (${title}) is now available in door selectors!`);

    setNewModelCode('');
    setNewModelTitle('');
    setNewModelRate('4200');
  };

  // Pipeline Actions
  const handleAdvanceLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const idx = STAGE_ORDER.indexOf(lead.stage);

    if (lead.stage === 'negotiation') {
      const numVal = parseFloat(lead.value.replace(/[^0-9.]/g, '')) * 100000 || 250000;
      const newSo: HubSalesOrder = {
        id: `SO-2026-0${salesOrders.length + 90}`,
        title: lead.title,
        client: lead.client,
        value: lead.value,
        doors: lead.doors,
        stepIndex: 0,
        advancePaid: 'Pending 40% Advance',
        totalNumericValue: numVal,
        advanceAmount: 0,
        advanceVerified: false,
      };
      setSalesOrders([newSo, ...salesOrders]);
      setLeads(leads.filter((l) => l.id !== leadId));
      playBeep(640, 0.12);
      showToast('Converted to Sales Order', `${newSo.id} created for ${lead.client}`);
      return;
    }

    if (idx !== -1 && idx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[idx + 1];
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l)));
      playBeep(520, 0.08);
      showToast('Stage Advanced', `${lead.title} moved to ${STAGE_LABELS[nextStage]}`);
    }
  };

  // Reverse Lead Stage (Bidirectional CRM)
  const handleReverseLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const idx = STAGE_ORDER.indexOf(lead.stage);
    if (idx > 0) {
      const prevStage = STAGE_ORDER[idx - 1];
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, stage: prevStage } : l)));
      playBeep(480, 0.08);
      showToast('Stage Rolled Back', `${lead.title} moved back to ${STAGE_LABELS[prevStage]}`, 'info');
    }
  };

  // Sales Order Step Advancement
  const handleAdvanceSalesOrder = (orderId: string) => {
    setSalesOrders(
      salesOrders.map((o) => {
        if (o.id !== orderId) return o;
        if (o.stepIndex < ORDER_STEPS.length - 1) {
          const nextIndex = o.stepIndex + 1;
          const nextStepLabel = ORDER_STEPS[nextIndex];
          playBeep(580, 0.1);
          showToast('Order Step Advanced', `${o.id} is now: ${nextStepLabel}`);
          return {
            ...o,
            stepIndex: nextIndex,
            advancePaid: nextIndex >= 1 ? (o.advanceVerified ? o.advancePaid : '50% Advance Recd') : o.advancePaid,
          };
        }
        return o;
      })
    );
  };

  // Reverse Sales Order Step (Bidirectional Orders)
  const handleReverseSalesOrder = (orderId: string) => {
    setSalesOrders(
      salesOrders.map((o) => {
        if (o.id !== orderId) return o;
        if (o.stepIndex > 0) {
          const prevIndex = o.stepIndex - 1;
          const prevStepLabel = ORDER_STEPS[prevIndex];
          playBeep(480, 0.08);
          showToast('Order Step Rolled Back', `${o.id} reversed to: ${prevStepLabel}`, 'info');
          return {
            ...o,
            stepIndex: prevIndex,
            advancePaid: prevIndex === 0 && !o.advanceVerified ? 'Pending 40% Advance' : o.advancePaid,
          };
        }
        return o;
      })
    );
  };

  // Advance Click with 40% Gatekeeper check
  const handleAdvanceSalesOrderClick = (order: HubSalesOrder) => {
    const val = order.totalNumericValue || (parseFloat(order.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
    const min40 = Math.round(val * 0.40);
    const recd = order.advanceAmount || 0;
    const isAdvOk = order.advanceVerified && recd >= min40;

    if (order.stepIndex === 0 && !isAdvOk) {
      playBeep(420, 0.12);
      showToast('Advance Required', 'Minimum 40% advance deposit is mandatory before releasing to production.', 'info');
      setActiveAdvanceOrder(order);
      setAdvanceDepositAmount(recd > 0 ? recd : min40);
      setAdvanceDepositMode(order.paymentMode || 'UPI');
      setAdvanceDepositRef(order.paymentRef || '');
      setAdvanceDepositNotes('');
      return;
    }

    handleAdvanceSalesOrder(order.id);
  };

  const confirmAdvanceDeposit = () => {
    if (!activeAdvanceOrder) return;
    const val = activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
    const pct = Math.round((advanceDepositAmount / val) * 100);
    const verified = pct >= 40;

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeAdvanceOrder.id) return o;
        return {
          ...o,
          advanceAmount: advanceDepositAmount,
          advanceVerified: verified,
          paymentMode: advanceDepositMode,
          paymentRef: advanceDepositRef || 'ACCOUNTS-VERIFIED',
          advancePaid: verified ? `₹${(advanceDepositAmount / 100000).toFixed(2)}L (${pct}% Verified)` : `Partial (₹${advanceDepositAmount})`,
          stepIndex: verified && o.stepIndex === 0 ? 1 : o.stepIndex,
        };
      })
    );

    playBeep(640, 0.15);
    showToast('Advance Deposit Verified', `₹${advanceDepositAmount.toLocaleString('en-IN')} (${pct}%) recorded for ${activeAdvanceOrder.id}. Released for production!`);
    setActiveAdvanceOrder(null);
  };

  // Convert Sales Order to Sales (Tax Invoice)
  const handleConvertToSales = (order: HubSalesOrder) => {
    const totalVal = order.totalNumericValue || (parseFloat(order.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
    const recd = order.advanceAmount || Math.round(totalVal * 0.5);
    const invoiceId = `INV-2026-${order.id.replace(/[^0-9]/g, '').slice(-3) || '101'}`;

    const invoiceQuote: HubQuotation = {
      id: invoiceId,
      customerName: order.client,
      location: 'Kerala Project Site',
      itemsSummary: `${order.doors} [Sales Order: ${order.id}]`,
      gstMode: 'included',
      gstRate: 18,
      subtotal: Math.round(totalVal / 1.18),
      gstAmount: Math.round(totalVal - (totalVal / 1.18)),
      grandTotal: totalVal,
      advancePercent: Math.round((recd / totalVal) * 100),
      advanceAmount: recd,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    // Mark Sales Order as converted to sales
    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              isConvertedToSales: true,
              convertedInvoiceId: invoiceId,
            }
          : o
      )
    );

    // Add to Active Quotations / Invoices registry if not already present
    setQuotations((prev) => {
      if (prev.some((q) => q.id === invoiceId)) return prev;
      return [invoiceQuote, ...prev];
    });

    setPrintDocType('salesInvoice');
    setPreviewQuote(invoiceQuote);
    playBeep(720, 0.15);
    showToast('Converted to Sales', `Sales Order ${order.id} converted to Tax Invoice ${invoiceId}! Opening Print Hub...`);
  };

  const handleGenerateInvoiceFromOrder = handleConvertToSales;

  // Clear All Data as Zero
  const handleClearAllDataAsZero = () => {
    setQuotations([]);
    setLeads([]);
    setSalesOrders([]);
    setQuoteItemRows([createZeroRow(1, doorModels[0]?.id)]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('exmark_data_zeroed', 'true');
    }
    setIsZeroConfirmOpen(false);
    playBeep(440, 0.15);
    showToast('All Data Cleared to Zero', '0 quotations, 0 leads, 0 orders, ₹0 metrics.');
  };

  // Restore Standard Templates Data
  const handleResetData = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setDoorModels(INITIAL_MODELS);
    setQuotations(INITIAL_QUOTATIONS);
    setLeads(INITIAL_LEADS);
    setSalesOrders(INITIAL_ORDERS);
    setSelectedCustomerId(INITIAL_CUSTOMERS[0].id);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('exmark_data_zeroed');
    }
    handleClearAllToZero();
    showToast('Template Data Restored', 'Standard Kerala quotations, leads, and orders loaded.');
  };

  return (
    <div className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col font-sans rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto">
          <div
            className={`p-3.5 rounded-xl border shadow-2xl flex items-start gap-2.5 text-xs transition-all duration-300 ${
              toastMessage.type === 'info'
                ? 'bg-[#261017] border-rose-500/50 text-rose-200'
                : 'bg-[#0f241d] border-emerald-500/50 text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-white">{toastMessage.title}</strong>
              <span className="opacity-90">{toastMessage.desc}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP SYSTEM BAR */}
      <header className="h-14 border-b border-slate-800 bg-[#0d1424] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center font-black text-white text-base shadow-md shadow-rose-900/40">
            EX
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400">EXMARK</span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>
                  {activeTab === 'quotations'
                    ? 'Quotations Management Hub'
                    : activeTab === 'pipeline'
                    ? 'CRM & Leads Pipeline'
                    : 'Sales Orders Step-by-Step'}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Live Ops
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Search & Audio Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, quotes, models, clients..."
              className="w-64 bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="text-xs text-slate-400 border border-slate-800 px-2.5 py-1.5 rounded-lg bg-slate-900/40 hidden sm:flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>27 Oct 2026 - Kerala Plant</span>
          </div>

          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Sound Feedback"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const newId = `LEAD-2026-0${leads.length + 15}`;
              const newL: HubLead = {
                id: newId,
                title: 'New Calicut Commercial Project',
                client: 'Er. Hashim & Associates - Calicut',
                value: '₹5.5L',
                doors: '40 FRP Heavy Duty Doors',
                stage: 'inquiries',
                notes: 'Direct architect inquiry through WhatsApp.',
              };
              setLeads([newL, ...leads]);
              playBeep(560, 0.1);
              showToast('New Lead Created', `Added ${newId}: ${newL.title}`);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-rose-900/30 flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New CRM Lead</span>
          </button>
        </div>
      </header>

      {/* TOP VIEW SWITCHER TABS */}
      <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#0b101d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Door Manufacturing &amp; Sales System</span>
            <span className="text-xs font-normal text-slate-400 hidden lg:inline">
              | Dual GST Calculation, Custom Dimensions &amp; Door Catalog Sync
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={`px-3.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quotations'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Quotations Section</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'quotations' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {quotations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Pipeline Board</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">
              {leads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('salesOrders')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'salesOrders'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Sales Orders Tracking</span>
            <span className="bg-slate-800 text-cyan-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {salesOrders.length} Orders
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsZeroConfirmOpen(true)}
            className="px-2.5 py-1 text-xs text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-md transition cursor-pointer flex items-center gap-1.5"
            title="Clear all quotations, CRM leads, and sales orders to zero"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>Clear All Data as Zero</span>
          </button>

          <button
            type="button"
            onClick={handleResetData}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
            title="Restore standard template data"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Templates</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: QUOTATIONS HUB & FORM VIEW */}
      {activeTab === 'quotations' && (
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* QUOTATION CREATOR WORKBENCH */}
          <div className="bg-[#10172a] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
                  📝
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Create A New Quotation (ക്രിയേറ്റ് എ ന്യൂ കൊട്ടേഷൻ)</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      QT-2026-0{quotations.length + 109}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Configure customer, door schedule, dimensions (cm/mm/inch), price per door &amp; GST option
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAllToZero}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  title="Clear all rows to 0 (₹0 Subtotal)"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Clear to Zero (0 Data)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuotation}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-rose-900/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Save &amp; Generate Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1. CUSTOMER SELECTION & ADVANCE ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/70 p-4 rounded-xl border border-slate-800/80">
              {/* Customer Dropdown with + Add Customer button */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Customer / Client Name (കസ്റ്റമർ പേര്) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Customer (പുതിയ കസ്റ്റമർ)</span>
                  </button>
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500 transition font-medium cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.location}) - {c.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advance Payment Setting */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Advance Required (അഡ്വാൻസ്) *
                  </label>
                  <span className="text-[10px] text-slate-400">Standard 50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={advancePercent}
                    onChange={(e) => setAdvancePercent(parseFloat(e.target.value) || 50)}
                    className="bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-medium cursor-pointer"
                  >
                    <option value="50">50% Advance</option>
                    <option value="40">40% Advance</option>
                    <option value="30">30% Advance</option>
                    <option value="100">100% Full Payment</option>
                  </select>
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-right">
                    <span className="text-[10px] text-slate-400 block leading-none">Estimated Advance</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      ₹{(advanceAmount / 100000).toFixed(2)}L
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DOOR ITEMS BUILDER TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Door Models &amp; Dimensions Schedule
                  </h4>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Default Unit: Centimeter (cm)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddDoorModelOpen(true)}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Door Model (പുതിയ മോഡൽ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>+ Add Item Row</span>
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0c1222]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#11182c] border-b border-slate-800 text-[11px] font-bold text-slate-300">
                      <th className="p-3 w-48">Door Model (മോഡൽ)</th>
                      <th className="p-3 w-28">Unit (യൂണിറ്റ്)</th>
                      <th className="p-3 w-64">Dimensions (H &times; Top/Btm W)</th>
                      <th className="p-3 w-20 text-center">Qty</th>
                      <th className="p-3 w-32 text-right">Price / Rate (₹)</th>
                      <th className="p-3 w-28 text-right">Line Total</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {quoteItemRows.map((row, idx) => {
                      const wTop = row.widthTop ?? row.width ?? 0;
                      const wBottom = row.widthBottom ?? wTop;
                      const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
                      const wBtmFrac = row.widthBottomFraction || wTopFrac;

                      const sqft = calculateSqFt(
                        row.height,
                        wTop,
                        wBottom,
                        row.unit,
                        row.heightFraction,
                        wTopFrac,
                        wBtmFrac
                      );
                      const lineTotal = ((Number(row.qty) || 0) * row.rate).toLocaleString('en-IN');

                      return (
                        <tr key={row.id || idx} className="hover:bg-slate-900/60 transition">
                          <td className="p-2.5">
                            <select
                              value={row.modelId}
                              onChange={(e) => handleUpdateRow(idx, { modelId: e.target.value })}
                              className="w-full bg-[#131b2e] border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-medium focus:border-rose-500 cursor-pointer"
                            >
                              {doorModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.code} - {m.title} ({m.material})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-2.5">
                            <select
                              value={row.unit}
                              onChange={(e) => handleUpdateRow(idx, { unit: e.target.value as 'cm' | 'mm' | 'inch' })}
                              className="w-full bg-[#131b2e] border border-slate-700 rounded p-1.5 text-xs text-cyan-300 font-bold focus:border-cyan-500 cursor-pointer"
                            >
                              <option value="cm">cm (Default)</option>
                              <option value="mm">mm</option>
                              <option value="inch">inch</option>
                            </select>
                          </td>

                          <td className="p-2.5">
                            {row.unit === 'inch' ? (
                              <div className="space-y-1.5 py-0.5">
                                {/* Height */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold w-12">Height:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Height (inches)"
                                  />
                                  <select
                                    value={row.heightFraction || '0'}
                                    onChange={(e) => handleUpdateRow(idx, { heightFraction: e.target.value })}
                                    className="bg-[#131b2e] border border-slate-700 rounded p-1 text-[11px] font-mono text-cyan-300 cursor-pointer"
                                    title="Height Fraction (1/16, 1/8, etc.)"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Top Width */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-cyan-400 font-bold w-12">W (Top):</span>
                                  <input
                                    type="number"
                                    value={wTop === 0 ? '' : wTop}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      if (wBottom === wTop) {
                                        handleUpdateRow(idx, { widthTop: val, widthBottom: val, width: val });
                                      } else {
                                        handleUpdateRow(idx, { widthTop: val, width: val });
                                      }
                                    }}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Top Width (inches)"
                                  />
                                  <select
                                    value={wTopFrac}
                                    onChange={(e) => {
                                      const frac = e.target.value;
                                      if (wBtmFrac === wTopFrac) {
                                        handleUpdateRow(idx, { widthTopFraction: frac, widthBottomFraction: frac, widthFraction: frac });
                                      } else {
                                        handleUpdateRow(idx, { widthTopFraction: frac, widthFraction: frac });
                                      }
                                    }}
                                    className="bg-[#131b2e] border border-slate-700 rounded p-1 text-[11px] font-mono text-cyan-300 cursor-pointer"
                                    title="Top Width Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Bottom Width */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-cyan-400 font-bold w-12">W (Btm):</span>
                                  <input
                                    type="number"
                                    value={wBottom === 0 ? '' : wBottom}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { widthBottom: parseFloat(e.target.value) || 0 })}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Bottom Width (inches)"
                                  />
                                  <select
                                    value={wBtmFrac}
                                    onChange={(e) => handleUpdateRow(idx, { widthBottomFraction: e.target.value })}
                                    className="bg-[#131b2e] border border-slate-700 rounded p-1 text-[11px] font-mono text-cyan-300 cursor-pointer"
                                    title="Bottom Width Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[10px] text-emerald-400 font-mono ml-1 font-semibold whitespace-nowrap">({sqft} sqft)</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 py-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold w-12">Height:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="w-16 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={`Height (${row.unit})`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">{row.unit}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-cyan-400 font-bold w-12">W (Top):</span>
                                  <input
                                    type="number"
                                    value={wTop === 0 ? '' : wTop}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      if (wBottom === wTop) {
                                        handleUpdateRow(idx, { widthTop: val, widthBottom: val, width: val });
                                      } else {
                                        handleUpdateRow(idx, { widthTop: val, width: val });
                                      }
                                    }}
                                    className="w-16 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={`Top Width (${row.unit})`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">{row.unit}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-cyan-400 font-bold w-12">W (Btm):</span>
                                  <input
                                    type="number"
                                    value={wBottom === 0 ? '' : wBottom}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { widthBottom: parseFloat(e.target.value) || 0 })}
                                    className="w-16 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={`Bottom Width (${row.unit})`}
                                  />
                                  <span className="text-[10px] text-emerald-400 font-mono ml-1 font-semibold whitespace-nowrap">({sqft} sqft)</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.qty === 0 ? '' : (row.qty ?? '')}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  handleUpdateRow(idx, { qty: 0 });
                                } else {
                                  const parsed = parseInt(val, 10);
                                  handleUpdateRow(idx, { qty: isNaN(parsed) ? 0 : Math.max(0, parsed) });
                                }
                              }}
                              className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-center font-bold text-white focus:outline-none focus:border-rose-500"
                            />
                          </td>

                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                value={row.rate === 0 ? '' : row.rate}
                                placeholder="0"
                                onChange={(e) => handleUpdateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                className="w-24 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-bold text-emerald-400"
                              />
                            </div>
                          </td>

                          <td className="p-2.5 text-right font-mono font-bold text-slate-200">
                            ₹{lineTotal}
                          </td>

                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              className="text-slate-400 hover:text-red-400 p-1 cursor-pointer transition"
                              title="Remove Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. GST SELECTION & FINANCIAL BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-800">
              {/* GST 3-Way Mode Selector */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    GST Tax Selection (ജിഎസ്ടി ഓപ്ഷൻ) *
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Select whether prices are Without GST (0%), Exclude GST (+18%), or Include GST.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition ${
                      gstMode === 'without'
                        ? 'border-emerald-500/80 bg-emerald-950/20'
                        : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="hubGstMode"
                        value="without"
                        checked={gstMode === 'without'}
                        onChange={() => setGstMode('without')}
                        className="text-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">Without GST</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1">0% Tax (സീറോ GST)</span>
                  </label>

                  <label
                    className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition ${
                      gstMode === 'excluded'
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="hubGstMode"
                        value="excluded"
                        checked={gstMode === 'excluded'}
                        onChange={() => setGstMode('excluded')}
                        className="text-rose-600"
                      />
                      <span className="text-xs font-bold text-white">GST Excluded</span>
                    </div>
                    <span className="text-[10px] text-rose-300 mt-1">+18% Added to Base</span>
                  </label>

                  <label
                    className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition ${
                      gstMode === 'included'
                        ? 'border-cyan-500/80 bg-cyan-950/20'
                        : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="hubGstMode"
                        value="included"
                        checked={gstMode === 'included'}
                        onChange={() => setGstMode('included')}
                        className="text-cyan-500"
                      />
                      <span className="text-xs font-bold text-white">GST Included</span>
                    </div>
                    <span className="text-[10px] text-cyan-300 mt-1">MRP Inclusive Rate</span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400">GST Percentage Rate:</span>
                  <div className="flex items-center gap-1.5 w-32">
                    <input
                      type="number"
                      value={gstMode === 'without' ? 0 : customGstPercent}
                      disabled={gstMode === 'without'}
                      onChange={(e) => setCustomGstPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs text-right font-mono text-slate-100 focus:outline-none focus:border-rose-500 disabled:opacity-50"
                    />
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="bg-gradient-to-br from-slate-900 to-[#121a2d] p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Items Total (Subtotal):</span>
                  <span className="font-mono text-slate-200 font-bold">
                    ₹{Math.round(itemsSubtotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>
                    {gstMode === 'without'
                      ? 'GST Amount (0% - Without GST):'
                      : gstMode === 'excluded'
                      ? `GST Amount (+${effectiveGstPercent}% Excluded):`
                      : `Included GST (${effectiveGstPercent}%):`}
                  </span>
                  <span className="font-mono text-slate-200 font-bold">
                    ₹{Math.round(gstAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-white font-extrabold text-base border-t border-slate-700 pt-2">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-400">
                    ₹{Math.round(grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-rose-300 font-bold border-t border-slate-800 pt-1.5 text-xs">
                  <span>{advancePercent}% Advance Required:</span>
                  <span className="font-mono">
                    ₹{Math.round(advanceAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Balance at Delivery:</span>
                  <span className="font-mono">
                    ₹{Math.round(balanceAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RECENT QUOTATIONS TABLE */}
          <div className="bg-[#10172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  All Active Quotations ({quotations.length} Quotes)
                </h3>
                <p className="text-[11px] text-slate-400">Saved Kerala dealer &amp; project quotations with live GST status</p>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                Total Value: ₹{(quotations.reduce((acc, q) => acc + q.grandTotal, 0) / 100000).toFixed(1)}L
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3">Quote #</th>
                    <th className="p-3">Customer &amp; Project</th>
                    <th className="p-3">Doors &amp; Spec</th>
                    <th className="p-3">Tax Regime</th>
                    <th className="p-3 text-right">Quote Value</th>
                    <th className="p-3 text-right">Advance Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {quotations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-500">
                          <FileSpreadsheet className="w-8 h-8 text-slate-600" />
                          <p className="font-bold text-slate-300 text-sm">0 Quotation Records</p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            All data cleared to zero. Use the door workbench above to draft and save your first factory quotation.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    quotations.map((q) => {
                    let modeBadge = (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                        +18% GST Excl
                      </span>
                    );
                    if (q.gstMode === 'without') {
                      modeBadge = (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          Without GST (0%)
                        </span>
                      );
                    } else if (q.gstMode === 'included') {
                      modeBadge = (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                          GST Incl
                        </span>
                      );
                    }

                    return (
                      <tr key={q.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 font-mono font-bold">
                          <span className={q.id.startsWith('INV-') ? 'text-emerald-400' : 'text-rose-400'}>
                            {q.id}
                          </span>
                          {q.id.startsWith('INV-') && (
                            <span className="block mt-0.5 w-fit px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              SALES INVOICE
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{q.customerName}</div>
                          <div className="text-[10px] text-slate-400">
                            {q.location} &bull; {q.date}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">{q.itemsSummary}</td>
                        <td className="p-3">{modeBadge}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{q.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-[11px] font-mono text-slate-300">
                          ₹{q.advanceAmount.toLocaleString('en-IN')} ({q.advancePercent}%)
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (q.id.startsWith('INV-')) {
                                setPrintDocType('salesInvoice');
                              } else {
                                setPrintDocType('quotation');
                              }
                              setPreviewQuote(q);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition cursor-pointer"
                          >
                            View &amp; Print
                          </button>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PIPELINE KANBAN BOARD */}
      {activeTab === 'pipeline' && (
        <div className="p-5 overflow-x-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-w-[1000px]">
            {STAGE_ORDER.map((stageKey) => {
              const stageLeads = leads.filter((l) => l.stage === stageKey);
              const isLastStage = stageKey === 'negotiation';

              return (
                <div
                  key={stageKey}
                  className="bg-[#0e1627] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden"
                >
                  <div className="p-3 border-b border-slate-800 bg-[#111a30] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          stageKey === 'inquiries'
                            ? 'bg-blue-500'
                            : stageKey === 'measurement'
                            ? 'bg-amber-500'
                            : stageKey === 'quotation'
                            ? 'bg-purple-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {STAGE_LABELS[stageKey]}
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {stageLeads.length} Leads
                    </span>
                  </div>

                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-[#131d33] hover:bg-[#16233f] border border-slate-700/60 rounded-lg p-3.5 shadow-sm transition flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white leading-snug">{lead.title}</h4>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded shrink-0">
                              {lead.value}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 font-medium">{lead.client}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                            <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                              {lead.id}
                            </span>
                            <span className="truncate">{lead.doors}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLeadModal(lead);
                              setLeadModalNotes(lead.notes || '');
                            }}
                            className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            View Log
                          </button>

                          <div className="flex items-center gap-1.5">
                            {stageKey !== 'inquiries' && (
                              <button
                                type="button"
                                onClick={() => handleReverseLead(lead.id)}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition cursor-pointer"
                                title="Roll back lead to previous stage"
                              >
                                ↺ Reverse
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAdvanceLead(lead.id)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer ${
                                isLastStage
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white'
                              }`}
                            >
                              {isLastStage ? 'Create Sales Order 📦' : 'Follow up →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: SALES ORDERS TRACKING VIEW */}
      {activeTab === 'salesOrders' && (
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Sales Orders Workflow Engine</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                5-Stage Execution: Order Confirmed &rarr; 50% Advance Recd &rarr; In Production &rarr; QC Passed &rarr; Dispatched &amp; Installed
              </p>
            </div>
            <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-lg font-mono font-semibold">
              Active Work Orders: {salesOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {salesOrders.length === 0 ? (
              <div className="p-12 text-center bg-[#11192e] border border-slate-800 rounded-xl space-y-2">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">0 Active Factory Work Orders</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All production orders cleared to zero. Generate quotations and verify 40% advance to release jobs to the plant floor.
                </p>
              </div>
            ) : (
              salesOrders.map((order) => {
              const isFinished = order.stepIndex === ORDER_STEPS.length - 1;

              return (
                <div
                  key={order.id}
                  className="bg-[#11192e] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                          {order.id}
                        </span>
                        <h4 className="text-sm font-bold text-white inline-block">{order.title}</h4>
                        {order.isConvertedToSales && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>CONVERTED TO SALES: {order.convertedInvoiceId}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {order.client} &bull; {order.doors}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">{order.value}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{order.advancePaid}</span>
                      </div>

                      {/* Advance Deposit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const val = order.totalNumericValue || (parseFloat(order.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
                          const min40 = Math.round(val * 0.40);
                          setActiveAdvanceOrder(order);
                          setAdvanceDepositAmount(order.advanceAmount && order.advanceAmount > 0 ? order.advanceAmount : min40);
                          setAdvanceDepositMode(order.paymentMode || 'UPI');
                          setAdvanceDepositRef(order.paymentRef || '');
                          setAdvanceDepositNotes('');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                          order.advanceVerified
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}
                        title="Record 40% advance deposit"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{order.advanceVerified ? 'Deposit Paid' : 'Record 40% Advance'}</span>
                      </button>

                      {/* Reverse Step Button */}
                      {order.stepIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReverseSalesOrder(order.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer inline-flex items-center gap-1 transition"
                          title="Roll back order to previous stage"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span>↺ Reverse</span>
                        </button>
                      )}

                      {!isFinished ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSalesOrderClick(order)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1"
                        >
                          <span>Advance Step</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Delivered</span>
                        </span>
                      )}

                      {/* Convert to Sales Action */}
                      {order.isConvertedToSales ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Converted: {order.convertedInvoiceId}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConvertToSales(order)}
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 border border-slate-700 shadow-sm"
                            title="Open Converted Tax Invoice in Print Hub"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View Invoice 📄</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConvertToSales(order)}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                          title="Convert this Sales Order into a confirmed Sales Invoice (Tax Invoice)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Convert to Sales 🧾</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5-Step Visual Progression */}
                  <div className="flex items-start justify-between pt-2 gap-2 flex-wrap sm:flex-nowrap">
                    {ORDER_STEPS.map((s, idx) => {
                      const isDone = idx <= order.stepIndex;
                      const isCur = idx === order.stepIndex;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center text-center relative min-w-[70px]">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative z-10 ${
                              isCur
                                ? 'bg-rose-600 text-white ring-4 ring-rose-500/20'
                                : isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isDone && !isCur ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold mt-2 leading-tight ${
                              isCur ? 'text-rose-400' : isDone ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            {s}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* PRINT / VIEW MULTI-THEME DOCUMENT MODAL */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
            {/* Top Modal Header */}
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-[#131d35]">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {previewQuote.id}
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Print &amp; Document Hub (Tally &amp; Vyapar Formats)</span>
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
                  onClick={() => setPreviewQuote(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Type & Theme Switcher Toolbars */}
            <div className="border-b border-slate-800 bg-[#090e1a] p-3 space-y-2.5 text-xs">
              {/* Document Type Selector */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                  <span>Document Mode:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'quotation', label: 'Quotation (എസ്റ്റിമേറ്റ്)' },
                      { id: 'proforma', label: 'Proforma Invoice' },
                      { id: 'salesOrder', label: 'Sales Work Order' },
                      { id: 'salesInvoice', label: 'Tax Invoice (GST Bill)' },
                      { id: 'statement', label: 'Party Statement (ലെഡ്ജർ)' },
                    ] as const
                  ).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setPrintDocType(doc.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        printDocType === doc.id
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Convert from Sales Order to Sales (Tax Invoice) */}
              {printDocType === 'salesOrder' && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs gap-2 flex-wrap sm:flex-nowrap animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Currently viewing <strong>Sales Work Order</strong>. Ready to convert to official Tax Invoice?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintDocType('salesInvoice');
                      playBeep(720, 0.12);
                      showToast('Converted to Sales', 'Document mode switched to Tax Invoice (GST Bill).');
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow whitespace-nowrap ml-auto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Convert to Sales (Tax Invoice) ➔</span>
                  </button>
                </div>
              )}

              {/* Theme Selector (3 Tally + 2 Vyapar) */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Print Theme:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'tally-classic', label: '🏛️ Tally Classic (സിമ്പിൾ)' },
                      { id: 'tally-modern', label: '📊 Tally Modern (പ്രൈം)' },
                      { id: 'tally-formal', label: '📋 Tally Formal (ജിഎസ്ടി)' },
                      { id: 'vyapar-elegant', label: '🎨 Vyapar Elegant (കളർ)' },
                      { id: 'vyapar-modern', label: '🏷️ Vyapar Modern (ക്ലീൻ)' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTheme(t.id)}
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

            {/* Printable Sheet Body */}
            <div id="printableQuoteArea" className="p-4 sm:p-6 overflow-y-auto bg-slate-950/90 text-slate-900 flex justify-center">
              <div className="w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-200">
                <PrintDocumentHub
                  theme={printTheme}
                  documentType={printDocType}
                  quotation={previewQuote}
                  doorModels={doorModels}
                  customer={
                    customers.find((c) => c.name === previewQuote.customerName) ||
                    customers.find((c) => c.id === selectedCustomerId)
                  }
                />
              </div>
            </div>

            {/* Modal Bottom Status Bar */}
            <div className="p-3 bg-[#0a0f1d] border-t border-slate-800 flex justify-between items-center text-xs">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Active Theme: <strong className="text-white uppercase">{printTheme.replace('-', ' ')}</strong> | Mode: <strong className="text-cyan-400 uppercase">{printDocType}</strong> (Saved)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewQuote(null)}
                  className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-sm font-bold text-white">Add New Customer (പുതിയ കസ്റ്റമർ)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Customer / Firm Name *</label>
                <input
                  type="text"
                  placeholder="E.g. Ar. Faisal & Partners / Skyline Builders"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    placeholder="+91 98470 XXXXX"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">District / Location *</label>
                  <input
                    type="text"
                    placeholder="E.g. Ernakulam, Malappuram"
                    value={newCustLocation}
                    onChange={(e) => setNewCustLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Customer Category</label>
                  <select
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Architect">Architect / Consultant</option>
                    <option value="Contractor">Building Contractor</option>
                    <option value="Dealer">Dealer / Retailer</option>
                    <option value="Direct Client">Direct Home Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="32AAAAA0000A1Z5"
                    value={newCustGst}
                    onChange={(e) => setNewCustGst(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500 uppercase font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md transition cursor-pointer"
              >
                Save &amp; Select Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DOOR MODEL MODAL */}
      {isAddDoorModelOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <h3 className="text-sm font-bold text-white">Add New Door Model (പുതിയ ഡോർ മോഡൽ)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDoorModelOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Model Code *</label>
                  <input
                    type="text"
                    placeholder="EXM-A-128"
                    value={newModelCode}
                    onChange={(e) => setNewModelCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Material / Type</label>
                  <select
                    value={newModelMaterial}
                    onChange={(e) => setNewModelMaterial(e.target.value as 'FRP' | 'WPC' | 'Steel')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="FRP">FRP (Fiber Reinforced Polymer)</option>
                    <option value="WPC">WPC (Wood Plastic Composite)</option>
                    <option value="Steel">MS / GI Steel Shaft Door</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Model Title / Finish Description *</label>
                <input
                  type="text"
                  placeholder="E.g. Natural Teak Premium Classic Molded"
                  value={newModelTitle}
                  onChange={(e) => setNewModelTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Default Base Rate (₹) *</label>
                  <input
                    type="number"
                    placeholder="4200"
                    value={newModelRate}
                    onChange={(e) => setNewModelRate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Standard Finish</label>
                  <input
                    type="text"
                    placeholder="Matte Teak / Rosewood"
                    value={newModelFinish}
                    onChange={(e) => setNewModelFinish(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddDoorModelOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDoorModel}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md transition cursor-pointer"
              >
                Save &amp; Sync to Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD ACTION MODAL */}
      {activeLeadModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#131c31]">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {activeLeadModal.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{activeLeadModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeadModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <p className="text-xs text-slate-400">Client / Architect</p>
                  <p className="font-medium text-slate-200">{activeLeadModal.client}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Deal Value</p>
                  <p className="font-bold text-emerald-400 text-base">{activeLeadModal.value}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current Stage</p>
                  <p className="font-medium text-amber-300">{STAGE_LABELS[activeLeadModal.stage]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Door Requirements</p>
                  <p className="font-medium text-slate-200">{activeLeadModal.doors}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Follow-up Notes / Activity Log
                </label>
                <textarea
                  rows={3}
                  value={leadModalNotes}
                  onChange={(e) => setLeadModalNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                  placeholder="E.g., Site visit scheduled with contractor for measurements..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setLeads(leads.filter((l) => l.id !== activeLeadModal.id));
                  setActiveLeadModal(null);
                  showToast('Lead Deleted', 'Lead removed from pipeline.');
                }}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded hover:bg-red-950/30 transition cursor-pointer"
              >
                Delete Lead
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLeadModal(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAdvanceLead(activeLeadModal.id);
                    setActiveLeadModal(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-900/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Advance to Next Stage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 40% ADVANCE DEPOSIT GATEKEEPER MODAL */}
      {activeAdvanceOrder && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-black text-white text-sm">Record Advance Deposit / പേയ്‌മെന്റ് വെരിഫിക്കേഷൻ</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdvanceOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const totalVal = activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
                const min40 = Math.round(totalVal * 0.40);
                const pct = Math.round((advanceDepositAmount / totalVal) * 100);
                const isOk = pct >= 40;

                return (
                  <>
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-slate-400">
                        <span>Order ID:</span>
                        <span className="font-mono font-bold text-white">{activeAdvanceOrder.id}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Customer:</span>
                        <span className="font-semibold text-slate-200">{activeAdvanceOrder.client}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total Order Value:</span>
                        <span className="font-black text-emerald-400">₹{totalVal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-1">
                        <span>Mandatory 40% Minimum:</span>
                        <span>₹{min40.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Deposit Amount Received (₹) *</label>
                      <input
                        type="number"
                        value={advanceDepositAmount || ''}
                        onChange={(e) => setAdvanceDepositAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Enter amount (e.g. 140000)"
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2.5 text-white font-black text-sm focus:border-rose-500 focus:outline-none"
                      />
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Percentage of Order:</span>
                          <span className={`font-black ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isNaN(pct) ? 0 : pct}% of total
                          </span>
                        </div>
                        <div
                          className={`p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                            isOk
                              ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                          }`}
                        >
                          {isOk ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              <span>Valid deposit ({pct}%). Unlocks production release immediately.</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                              <span>Deposit is under 40% (₹{min40.toLocaleString('en-IN')}). Minimum 40% required.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Payment Mode</label>
                        <select
                          value={advanceDepositMode}
                          onChange={(e) => setAdvanceDepositMode(e.target.value)}
                          className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer"
                        >
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="NEFT/RTGS">NEFT / RTGS (Bank Transfer)</option>
                          <option value="Cheque">Cheque Deposit</option>
                          <option value="Cash">Cash Receipt</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Reference / UTR No.</label>
                        <input
                          type="text"
                          value={advanceDepositRef}
                          onChange={(e) => setAdvanceDepositRef(e.target.value)}
                          placeholder="UTR / Ref ID"
                          className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Accounts Verification Note</label>
                      <input
                        type="text"
                        value={advanceDepositNotes}
                        onChange={(e) => setAdvanceDepositNotes(e.target.value)}
                        placeholder="Verified with HDFC Bank / Cash Counter"
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveAdvanceOrder(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAdvanceDeposit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify &amp; Save Advance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ZERO ALL DATA MODAL */}
      {isZeroConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/60 border border-rose-800/60">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear All Data to Zero?</h3>
                <p className="text-xs text-slate-400">Reset factory operations to zero baseline</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear all <strong>quotations ({quotations.length})</strong>, <strong>CRM leads ({leads.length})</strong>, and <strong>active work orders ({salesOrders.length})</strong> to zero records. The quotation draft workbench will reset all quantities, dimensions, and rates to <strong>₹0</strong>.
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsZeroConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllDataAsZero}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All to Zero</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Media Isolation Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printableQuoteArea,
          #printableQuoteArea * {
            visibility: visible !important;
          }
          #printableQuoteArea {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default QuotationHub;
