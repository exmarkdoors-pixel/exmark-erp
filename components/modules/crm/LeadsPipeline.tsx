'use client';

import React, { useState } from 'react';
import {
  Target,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Building2,
  Phone,
  Plus,
  X,
  FileCheck,
  ShieldCheck,
  Truck,
  Layers,
  Sparkles,
  ChevronRight,
  Send,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

// 1. കൃത്യമായ സ്റ്റേജ് ക്രമം നിർവ്വചിക്കുക (Exact definitions as requested)
export const PIPELINE_STAGES = [
  {
    key: 'inquiries',
    label: 'New Inquiries',
    desc: 'Kerala architect, contractor & dealer inquiries',
    accentColor: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    key: 'measurement',
    label: 'Measurement Scheduled',
    desc: 'Site tape measurement visit booked',
    accentColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    key: 'quotation',
    label: 'Quotation Submitted',
    desc: 'Formal GST quote submitted with rate cards',
    accentColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
  {
    key: 'negotiation',
    label: 'Final Negotiation',
    desc: 'Final specs lock & price negotiation',
    accentColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
];

export const SALES_ORDER_STEPS = [
  'Order Confirmed & Specs Locked',
  '50% Advance Received',
  'In Production (FRP Press / WPC Line)',
  'QC Passed (IS 14856:2000)',
  'Dispatched & Installed',
];

export interface LeadItem {
  id: string;
  leadCode?: string;
  title: string;
  client: string;
  contactPerson?: string;
  phone: string;
  district: string;
  doors?: string;
  doorCount?: number;
  value: number;
  stage: 'inquiries' | 'measurement' | 'quotation' | 'negotiation';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesOrderItem {
  id: string;
  leadId: string;
  title: string;
  client: string;
  value: number;
  doors: string;
  stepIndex: number;
  advanceStatus: string;
  createdAt: string;
}

// Initial Kerala Project Demo Data
export const INITIAL_LEADS: LeadItem[] = [
  {
    id: 'lead-101',
    leadCode: 'LEAD-KL-801',
    title: 'Skyline Sea View Luxury Apartments',
    client: 'Skyline Builders Kochi',
    contactPerson: 'Mr. Manoj Varma (Project Head)',
    phone: '+91 94470 12345',
    district: 'Ernakulam',
    doors: '48 Bath FRP Doors (EXM-A-100)',
    doorCount: 48,
    value: 360000,
    stage: 'inquiries',
    notes: 'Architect requested Teak woodgrain samples for 48 bathroom openings.',
    createdAt: '28/10/2026',
  },
  {
    id: 'lead-102',
    leadCode: 'LEAD-KL-802',
    title: 'Malabar Heritage Villa Project',
    client: 'Malabar Prime Developers',
    contactPerson: 'Ar. Fathima Farhana',
    phone: '+91 98950 54321',
    district: 'Kozhikode',
    doors: '18 WPC Solid Extruded Doors',
    doorCount: 18,
    value: 153000,
    stage: 'measurement',
    notes: 'Site measurement scheduled with Anoop Krishnan for Tuesday.',
    createdAt: '27/10/2026',
  },
  {
    id: 'lead-103',
    leadCode: 'LEAD-KL-803',
    title: 'Silver Oak Resort & Convention Center',
    client: 'Green Valley Resorts Ltd',
    contactPerson: 'Mr. Thomas Mathew (General Manager)',
    phone: '+91 97450 67890',
    district: 'Wayanad',
    doors: '34 Premium FRP Moisture-Shield Doors',
    doorCount: 34,
    value: 272000,
    stage: 'quotation',
    notes: 'GST Quotation QTE-2026-042 sent with 18% GST and 5-year warranty.',
    createdAt: '25/10/2026',
  },
  {
    id: 'lead-104',
    leadCode: 'LEAD-KL-804',
    title: 'Sobha Royal Suites Block-B',
    client: 'Sobha Developers Thrissur',
    contactPerson: 'Er. Rajesh Menon (Chief Engineer)',
    phone: '+91 94460 33445',
    district: 'Thrissur',
    doors: '60 Monolithic Molded FRP Doors',
    doorCount: 60,
    value: 450000,
    stage: 'negotiation',
    notes: 'Final price negotiation in progress. Click to convert to Sales Order once approved!',
    createdAt: '24/10/2026',
  },
];

export const INITIAL_SALES_ORDERS: SalesOrderItem[] = [
  {
    id: 'SO-2026-090',
    leadId: 'lead-099',
    title: 'Cyber Towers Executive Restrooms',
    client: 'Prestige Group Kakkanad',
    value: 210000,
    doors: '28 FRP Doors (White Gloss)',
    stepIndex: 2, // 'In Production (FRP Press / WPC Line)'
    advanceStatus: '50% Advance Verified',
    createdAt: '25/10/2026',
  },
  {
    id: 'SO-2026-089',
    leadId: 'lead-098',
    title: 'Calicut Medical College Doctors Quarters',
    client: 'Kerala PWD Works Feroke',
    value: 395000,
    doors: '52 Heavy-Duty Fire-Retardant FRP Doors',
    stepIndex: 3, // 'QC Passed (IS 14856:2000)'
    advanceStatus: '50% Advance Verified',
    createdAt: '22/10/2026',
  },
];

export default function LeadsPipeline() {
  const [leads, setLeads] = useState<LeadItem[]>([...INITIAL_LEADS]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderItem[]>([...INITIAL_SALES_ORDERS]);
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'ORDERS'>('PIPELINE');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  // New Lead form state
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDistrict, setNewDistrict] = useState('Ernakulam');
  const [newDoors, setNewDoors] = useState('25 FRP Bath Doors');
  const [newValue, setNewValue] = useState('185000');

  // 2. സ്റ്റെപ്പ് ബൈ സ്റ്റെപ്പ് ആയി അടുത്ത ഘട്ടത്തിലേക്ക് മാറ്റുന്ന ഫങ്ഷൻ
  const handleFollowUp = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation(); // ഇവന്റ് ബബ്ലിങ് തടയുന്നു

    setLeads((prevLeads) => {
      const updatedLeads: LeadItem[] = [];

      for (const lead of prevLeads) {
        if (lead.id !== leadId) {
          updatedLeads.push(lead);
          continue;
        }

        const stageKeys = PIPELINE_STAGES.map((s) => s.key);
        const currentIndex = stageKeys.indexOf(lead.stage);

        // ഫൈനൽ നെഗോഷിയേഷൻ കഴിഞ്ഞാൽ സെയിൽസ് ഓർഡറിലേക്ക് മാറ്റുക
        if (lead.stage === 'negotiation') {
          convertToSalesOrder(lead);
          setToastMessage(`🎉 Lead "${lead.title}" converted to Sales Order!`);
          setTimeout(() => setToastMessage(null), 4000);
          continue; // പൈപ്പ്ലൈനിൽ നിന്ന് ഒഴിവാക്കുന്നു (removes from pipeline)
        }

        // അടുത്ത സ്റ്റേജിലേക്ക് കൃത്യമായി മാറ്റുന്നു
        if (currentIndex !== -1 && currentIndex < stageKeys.length - 1) {
          const nextStage = stageKeys[currentIndex + 1] as LeadItem['stage'];
          const nextStageLabel = PIPELINE_STAGES[currentIndex + 1].label;
          setToastMessage(`Lead moved to: ${nextStageLabel}`);
          setTimeout(() => setToastMessage(null), 3000);

          updatedLeads.push({
            ...lead,
            stage: nextStage,
            updatedAt: new Date().toISOString(),
          });
        } else {
          updatedLeads.push(lead);
        }
      }

      return updatedLeads; // സെയിൽസ് ഓർഡറിലേക്ക് മാറിയവ നീക്കം ചെയ്യുന്നു
    });
  };

  // 3. ഫൈനൽ നെഗോഷിയേഷൻ കഴിഞ്ഞാൽ സെയിൽസ് ഓർഡർ ക്രിയേറ്റ് ചെയ്യുന്ന ലോജിക്
  const convertToSalesOrder = (lead: any) => {
    const newSO: SalesOrderItem = {
      id: `SO-2026-0${salesOrders.length + 91}`,
      leadId: lead.id,
      title: lead.title,
      client: lead.client,
      value: lead.value,
      doors: lead.doors || 'FRP & WPC Doors',
      stepIndex: 0, // ആദ്യ സ്റ്റെപ്പ്: Order Confirmed
      advanceStatus: 'Pending 50% Advance',
      createdAt: new Date().toLocaleDateString('en-IN'),
    };

    setSalesOrders((prevOrders) => [newSO, ...prevOrders]);
  };

  // 4. സെയിൽസ് ഓർഡറിലെ ഓരോ സ്റ്റെപ്പും മുന്നോട്ട് മാറ്റുന്ന ഫങ്ഷൻ
  const advanceSalesOrderStep = (orderId: string) => {
    setSalesOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.stepIndex < SALES_ORDER_STEPS.length - 1) {
          const nextStep = order.stepIndex + 1;
          const nextStepLabel = SALES_ORDER_STEPS[nextStep];
          setToastMessage(`Order ${order.id} advanced to: ${nextStepLabel}`);
          setTimeout(() => setToastMessage(null), 3000);

          return {
            ...order,
            stepIndex: nextStep,
            advanceStatus: nextStep >= 1 ? '50% Advance Verified' : order.advanceStatus,
          };
        }
        return order;
      })
    );
  };

  const handleCreateNewLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClient.trim()) return;

    const newLead: LeadItem = {
      id: `lead-${Date.now()}`,
      leadCode: `LEAD-KL-${Math.floor(800 + Math.random() * 200)}`,
      title: newTitle.trim(),
      client: newClient.trim(),
      phone: newPhone.trim() || '+91 94470 00000',
      district: newDistrict,
      doors: newDoors.trim() || 'FRP & WPC Doors',
      doorCount: parseInt(newDoors) || 20,
      value: parseFloat(newValue) || 150000,
      stage: 'inquiries',
      createdAt: new Date().toLocaleDateString('en-IN'),
    };

    setLeads((prev) => [newLead, ...prev]);
    setIsNewLeadOpen(false);
    setNewTitle('');
    setNewClient('');
    setNewPhone('');
    setToastMessage(`New lead "${newLead.title}" added to pipeline!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const totalSalesOrdersValue = salesOrders.reduce((sum, o) => sum + (o.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header and KPI Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-red-500" />
            <span>Kerala CRM &amp; Sales Pipeline</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated stage progression: Inquiries &rarr; Measurement &rarr; Quotation &rarr; Negotiation &rarr; Sales Order
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation Segment Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#070D1E] rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('PIPELINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PIPELINE'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              Pipeline ({leads.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ORDERS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <span>Sales Orders ({salesOrders.length})</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsNewLeadOpen(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-red-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Pipeline Leads</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{leads.length} Leads</div>
          <div className="text-[11px] text-blue-400 font-semibold">₹{(totalPipelineValue / 100000).toFixed(2)} Lakhs Pipeline</div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final Negotiation</span>
          <div className="text-xl sm:text-2xl font-black text-amber-500">
            {leads.filter((l) => l.stage === 'negotiation').length} Ready
          </div>
          <div className="text-[11px] text-amber-400 font-semibold">Click to Convert to Sales Order</div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirmed Sales Orders</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-500">{salesOrders.length} Orders</div>
          <div className="text-[11px] text-emerald-400 font-semibold">₹{(totalSalesOrdersValue / 100000).toFixed(2)} Lakhs Booked</div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">50% Advance Status</span>
          <div className="text-xl sm:text-2xl font-black text-cyan-400">
            {salesOrders.filter((o) => o.stepIndex >= 1).length} / {salesOrders.length}
          </div>
          <div className="text-[11px] text-cyan-300 font-semibold">Advance Verified</div>
        </div>
      </div>

      {/* VIEW 1: KANBAN PIPELINE */}
      {activeTab === 'PIPELINE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE_STAGES.map((col, idx) => {
            const colLeads = leads.filter((l) => l.stage === col.key);
            const isLastLeadStage = col.key === 'negotiation';

            return (
              <div
                key={col.key}
                className="bg-slate-100/70 dark:bg-[#070D1E] rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                {/* Column Header */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{col.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/10 text-red-500">
                      {colLeads.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{col.desc}</p>
                </div>

                {/* Cards Rail */}
                <div className="space-y-3 flex-1">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-md space-y-2 hover:border-slate-700 transition-all"
                    >
                      {/* Lead Title & Value */}
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">{lead.title}</h4>
                        <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{(lead.value / 100000).toFixed(1)}L
                        </span>
                      </div>

                      {/* Client, District & Doors */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{lead.client}</div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span>{lead.phone}</span>
                          <span>&bull;</span>
                          <span className="text-amber-400 font-semibold">{lead.district}</span>
                        </div>
                        {lead.doors && (
                          <div className="text-[10px] text-cyan-400 font-medium pt-0.5">{lead.doors}</div>
                        )}
                      </div>

                      {lead.notes && (
                        <p className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-[#070D1E]/60 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                          {lead.notes}
                        </p>
                      )}

                      {/* Action Button: handleFollowUp(e, lead.id) */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-slate-500">{lead.leadCode || lead.id}</span>

                        <button
                          type="button"
                          onClick={(e) => handleFollowUp(e, lead.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                            isLastLeadStage
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40'
                              : 'bg-red-600/15 hover:bg-red-600/30 text-red-400 border border-red-500/30'
                          }`}
                          title={
                            isLastLeadStage
                              ? 'Convert Lead to Sales Order and release to Production'
                              : `Advance Lead to next stage`
                          }
                        >
                          {isLastLeadStage ? (
                            <>
                              <span>Convert to Sales Order</span>
                              <Sparkles className="w-3 h-3 text-amber-300" />
                            </>
                          ) : (
                            <>
                              <span>Advance Stage</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
                      No leads currently in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: SALES ORDERS 5-STEP TRACKER */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Sales Orders 5-Step Production &amp; Installation Pipeline</span>
              </h3>
              <p className="text-xs text-slate-400">
                Tracking every order through the 5 standardized stages to site handover
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {salesOrders.length} Confirmed Orders
            </span>
          </div>

          <div className="space-y-4">
            {salesOrders.map((order) => {
              const isCompleted = order.stepIndex >= SALES_ORDER_STEPS.length - 1;

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-[#0B132B] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4"
                >
                  {/* Top Bar of Order Card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-black text-white text-xs shadow-md">
                        SO
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-emerald-400">{order.id}</span>
                          <span className="text-slate-500">&bull;</span>
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">{order.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400">
                          {order.client} &bull; <span className="text-cyan-400">{order.doors}</span> &bull; Booked: {order.createdAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-black text-emerald-400">
                          ₹{order.value.toLocaleString('en-IN')}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.stepIndex >= 1
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {order.advanceStatus}
                        </span>
                      </div>

                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => advanceSalesOrderStep(order.id)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                          title="Advance order to next factory/dispatch milestone"
                        >
                          <span>Advance Step</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Installed &amp; Closed</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5-Step Visual Progression Rail */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                    {SALES_ORDER_STEPS.map((stepLabel, sIdx) => {
                      const isPast = sIdx < order.stepIndex;
                      const isCurrent = sIdx === order.stepIndex;
                      const isFuture = sIdx > order.stepIndex;

                      return (
                        <div
                          key={sIdx}
                          className={`p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between space-y-2 ${
                            isCurrent
                              ? 'bg-emerald-500/10 border-emerald-500/60 shadow-sm'
                              : isPast
                              ? 'bg-slate-50 dark:bg-[#070D1E] border-slate-200 dark:border-slate-800/80 opacity-90'
                              : 'bg-slate-50/50 dark:bg-[#070D1E]/40 border-slate-200/50 dark:border-slate-800/40 opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400">Step {sIdx + 1}</span>
                            {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                          </div>
                          <div
                            className={`font-bold text-[11px] leading-snug ${
                              isCurrent
                                ? 'text-emerald-400 font-black'
                                : isPast
                                ? 'text-slate-700 dark:text-slate-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {stepLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {salesOrders.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No active sales orders yet. Convert a lead from the Final Negotiation column to generate one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW LEAD QUICK MODAL */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#070D1E] border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-sm text-white">Add New Kerala Inquiry Lead</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewLeadOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Project / Inquiry Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kozhikode Hill View Apartments"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Client / Builder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Malabar Developers"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 94470 12345"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">District</label>
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    {[
                      'Ernakulam',
                      'Kozhikode',
                      'Thrissur',
                      'Kannur',
                      'Malappuram',
                      'Palakkad',
                      'Wayanad',
                      'Kottayam',
                      'Thiruvananthapuram',
                      'Kollam',
                      'Alappuzha',
                      'Kasaragod',
                      'Pathanamthitta',
                      'Idukki',
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Doors &amp; Material</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 FRP Doors"
                    value={newDoors}
                    onChange={(e) => setNewDoors(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Est. Value (₹)</label>
                  <input
                    type="number"
                    placeholder="220000"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] text-emerald-400 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLeadOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black cursor-pointer shadow-md shadow-red-950/40"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
