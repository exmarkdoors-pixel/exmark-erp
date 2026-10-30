'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
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
  ChevronRight,
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

// Quotation Item Row Draft
export interface QuoteItemRow {
  id: number;
  modelId: string;
  unit: 'cm' | 'mm' | 'inch';
  height: number;
  width: number;
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
  { id: 'SO-2026-088', title: 'Secura Centre Mall - Shaft & Service Doors', client: 'Secura Mall Ventures', value: '₹19.8L', doors: '163 MS Shaft Doors', stepIndex: 2, advancePaid: '₹9.9L (50% Recd)' },
  { id: 'SO-2026-089', title: 'Autumn Leaves Luxury Villa 17', client: 'Mr. Anas - Calicut', value: '₹1.85L', doors: '12 FRP Doors', stepIndex: 3, advancePaid: '₹92,500 (50% Recd)' },
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
    { id: 1, modelId: INITIAL_MODELS[0].id, unit: 'cm', height: 205, width: 75, qty: 10, rate: INITIAL_MODELS[0].rate },
    { id: 2, modelId: INITIAL_MODELS[1].id, unit: 'cm', height: 205, width: 80, qty: 5, rate: INITIAL_MODELS[1].rate },
  ]);

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddDoorModelOpen, setIsAddDoorModelOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<HubQuotation | null>(null);
  const [activeLeadModal, setActiveLeadModal] = useState<HubLead | null>(null);
  const [leadModalNotes, setLeadModalNotes] = useState<string>('');

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

  // Helpers
  const calculateSqFt = (h: number, w: number, unit: 'cm' | 'mm' | 'inch'): string => {
    let hInches = h;
    let wInches = w;
    if (unit === 'cm') {
      hInches = h / 2.54;
      wInches = w / 2.54;
    } else if (unit === 'mm') {
      hInches = h / 25.4;
      wInches = w / 25.4;
    }
    return ((hInches * wInches) / 144).toFixed(2);
  };

  // Calculations for Active Form
  const subtotal = quoteItemRows.reduce((sum, r) => sum + r.qty * r.rate, 0);
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
        width: 75,
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
      let w = currentRow.width;
      const oldUnit = currentRow.unit;
      const newUnit = updates.unit;

      if (oldUnit === 'mm') { h /= 10; w /= 10; }
      else if (oldUnit === 'inch') { h *= 2.54; w *= 2.54; }

      if (newUnit === 'mm') { h *= 10; w *= 10; }
      else if (newUnit === 'inch') { h /= 2.54; w /= 2.54; }

      updates.height = Math.round(h * 10) / 10;
      updates.width = Math.round(w * 10) / 10;
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

  const handleClearAll = () => {
    const firstModel = doorModels[0];
    setQuoteItemRows([
      { id: 1, modelId: firstModel.id, unit: 'cm', height: 205, width: 75, qty: 1, rate: firstModel.rate },
    ]);
    showToast('Form Reset', 'Quotation items reset to 1 standard door specification.', 'info');
  };

  // Save Quotation
  const handleSaveQuotation = () => {
    const cust = customers.find((c) => c.id === selectedCustomerId) || { name: 'Direct Client', location: 'Kerala' };
    const newQuoteId = `QT-2026-0${quotations.length + 109}`;
    const totalDoors = quoteItemRows.reduce((acc, r) => acc + r.qty, 0);

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
      const newSo: HubSalesOrder = {
        id: `SO-2026-0${salesOrders.length + 90}`,
        title: lead.title,
        client: lead.client,
        value: lead.value,
        doors: lead.doors,
        stepIndex: 0,
        advancePaid: 'Pending 50% Advance',
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
            advancePaid: nextIndex >= 1 ? '50% Advance Recd' : o.advancePaid,
          };
        }
        return o;
      })
    );
  };

  // Reset Demo
  const handleResetDemo = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setDoorModels(INITIAL_MODELS);
    setQuotations(INITIAL_QUOTATIONS);
    setLeads(INITIAL_LEADS);
    setSalesOrders(INITIAL_ORDERS);
    setSelectedCustomerId(INITIAL_CUSTOMERS[0].id);
    handleClearAll();
    showToast('Demo Data Reset', 'Quotations, customers, and door models restored.');
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
            onClick={handleResetDemo}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
            title="Reset Demo Data"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
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
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Clear All
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
                      <th className="p-3 w-32">Unit (അളവ് യൂണിറ്റ്)</th>
                      <th className="p-3 w-48">Dimensions (H &times; W)</th>
                      <th className="p-3 w-20 text-center">Qty</th>
                      <th className="p-3 w-32 text-right">Price / Rate (₹)</th>
                      <th className="p-3 w-28 text-right">Line Total</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {quoteItemRows.map((row, idx) => {
                      const sqft = calculateSqFt(row.height, row.width, row.unit);
                      const lineTotal = (row.qty * row.rate).toLocaleString('en-IN');

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
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={row.height}
                                onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                className="w-16 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                title={`Height (${row.unit})`}
                              />
                              <span className="text-slate-400">&times;</span>
                              <input
                                type="number"
                                value={row.width}
                                onChange={(e) => handleUpdateRow(idx, { width: parseFloat(e.target.value) || 0 })}
                                className="w-16 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                title={`Width (${row.unit})`}
                              />
                              <span className="text-[10px] text-slate-400 font-mono">({sqft} sqft)</span>
                            </div>
                          </td>

                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={row.qty}
                              onChange={(e) => handleUpdateRow(idx, { qty: parseInt(e.target.value) || 1 })}
                              className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-center font-bold text-white"
                            />
                          </td>

                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                value={row.rate}
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
                  {quotations.map((q) => {
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
                        <td className="p-3 font-mono font-bold text-rose-400">{q.id}</td>
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
                            onClick={() => setPreviewQuote(q)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition cursor-pointer"
                          >
                            View &amp; Print
                          </button>
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

                        <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center">
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
            {salesOrders.map((order) => {
              const isFinished = order.stepIndex === ORDER_STEPS.length - 1;

              return (
                <div
                  key={order.id}
                  className="bg-[#11192e] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                        {order.id}
                      </span>
                      <h4 className="text-sm font-bold text-white inline-block ml-2">{order.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {order.client} &bull; {order.doors}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">{order.value}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{order.advancePaid}</span>
                      </div>
                      {!isFinished ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSalesOrder(order.id)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                        >
                          Advance Step &rarr;
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Delivered</span>
                        </span>
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
            })}
          </div>
        </div>
      )}

      {/* PRINT / VIEW QUOTATION MODAL */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {previewQuote.id}
                </span>
                <h3 className="text-sm font-bold text-white">Quotation Document Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuote(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Sheet Body */}
            <div id="printableQuoteArea" className="p-6 overflow-y-auto bg-slate-950 text-slate-100 text-xs space-y-4">
              {/* Letterhead */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center font-black text-white text-xl">
                    EX
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white tracking-wide">EX-MARK DOORS</h2>
                    <p className="text-[11px] text-slate-400">Cherur, Vengara, Malappuram, Kerala - 676304</p>
                    <p className="text-[10px] text-slate-400">
                      Ph: +91 9447928866 | Email: exmarkdoors@gmail.com | GSTIN: 32AAHFE4489L1Z2
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                    Proforma Quotation
                  </span>
                  <p className="text-xs font-mono font-bold text-white mt-1">{previewQuote.id}</p>
                  <p className="text-[10px] text-slate-400">Date: {previewQuote.date}</p>
                </div>
              </div>

              {/* Bill To & Commercial Overview */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotation Prepared For:</p>
                  <p className="text-sm font-bold text-white mt-0.5">{previewQuote.customerName}</p>
                  <p className="text-xs text-slate-300">{previewQuote.location}, Kerala</p>
                  <p className="text-xs text-slate-400">+91 94479 28866 (Exmark Verified)</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax &amp; Terms Regime:</p>
                  <p className="text-xs font-semibold text-amber-300 mt-0.5">
                    {previewQuote.gstMode === 'without'
                      ? 'Without GST (0% Tax)'
                      : previewQuote.gstMode === 'excluded'
                      ? `GST Excluded (+${previewQuote.gstRate}% SGST/CGST)`
                      : `GST Included (${previewQuote.gstRate}% Tax Included)`}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Advance Term:{' '}
                    <span className="font-bold text-emerald-400">
                      {previewQuote.advancePercent}% Advance (₹{previewQuote.advanceAmount.toLocaleString('en-IN')})
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">Validity: 15 Days | Plant: Vengara Central Unit</p>
                </div>
              </div>

              {/* Table of Doors */}
              <div>
                <table className="w-full text-left border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[10px] uppercase font-bold">
                      <th className="p-2 border-r border-slate-800">#</th>
                      <th className="p-2 border-r border-slate-800">Door Model &amp; Specs</th>
                      <th className="p-2 border-r border-slate-800">Dimensions &amp; Area</th>
                      <th className="p-2 border-r border-slate-800 text-center">Qty</th>
                      <th className="p-2 border-r border-slate-800 text-right">Unit Rate (₹)</th>
                      <th className="p-2 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {previewQuote.itemRows && previewQuote.itemRows.length > 0 ? (
                      previewQuote.itemRows.map((row, i) => {
                        const model = doorModels.find((m) => m.id === row.modelId) || {
                          code: 'EXM-DOOR',
                          title: 'FRP Door',
                          finish: 'Standard',
                        };
                        const sqft = calculateSqFt(row.height, row.width, row.unit);
                        const lineTotal = row.qty * row.rate;

                        return (
                          <tr key={i} className="text-[11px] text-slate-300">
                            <td className="p-2 border-r border-slate-800 text-center font-mono">{i + 1}</td>
                            <td className="p-2 border-r border-slate-800">
                              <span className="font-bold text-white">
                                {model.code} - {model.title}
                              </span>
                              <div className="text-[10px] text-slate-400">Finish: {model.finish}</div>
                            </td>
                            <td className="p-2 border-r border-slate-800 font-mono">
                              {row.height} &times; {row.width} {row.unit}{' '}
                              <span className="text-slate-400 text-[10px]">({sqft} sqft)</span>
                            </td>
                            <td className="p-2 border-r border-slate-800 text-center font-bold">{row.qty} Pcs</td>
                            <td className="p-2 border-r border-slate-800 text-right font-mono">
                              ₹{row.rate.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-100">
                              ₹{lineTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="text-[11px] text-slate-300">
                        <td className="p-2 border-r border-slate-800 text-center font-mono">1</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-white">
                          {previewQuote.itemsSummary}
                        </td>
                        <td className="p-2 border-r border-slate-800 font-mono">205 &times; 75 cm</td>
                        <td className="p-2 border-r border-slate-800 text-center font-bold">Standard Batch</td>
                        <td className="p-2 border-r border-slate-800 text-right font-mono">
                          ₹{previewQuote.subtotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-100">
                          ₹{previewQuote.subtotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium text-slate-200">
                      ₹{previewQuote.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({previewQuote.gstRate}%):</span>
                    <span className="font-mono font-medium text-slate-200">
                      ₹{previewQuote.gstAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1.5 text-sm">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-400">
                      ₹{previewQuote.grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-300 font-semibold border-t border-slate-800 pt-1 text-[11px]">
                    <span>{previewQuote.advancePercent}% Advance Required:</span>
                    <span className="font-mono">
                      ₹{previewQuote.advanceAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 space-y-1">
                <p className="font-bold text-slate-300">Terms &amp; Conditions:</p>
                <p>1. 50% advance along with confirmed work order; 30% before factory despatch; balance 20% on site installation.</p>
                <p>2. Manufactured in accordance with IS 14856:2000 standard specifications for high-impact water resistance.</p>
                <p>3. Delivery lead time: 3 to 4 weeks from final site measurement sign-off.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewQuote(null)}
                className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
              >
                Close
              </button>
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
    </div>
  );
}

export default QuotationHub;
