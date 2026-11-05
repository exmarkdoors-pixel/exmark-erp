'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  ArrowRight,
  ArrowLeft,
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
  ChevronLeft,
  Send,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  FileText,
  CreditCard,
  MessageSquare,
  UserPlus,
  QrCode,
  Zap,
} from 'lucide-react';
import { WhatsAppLeadModal } from './WhatsAppLeadModal';
import { WhatsAppLoginModal } from './WhatsAppLoginModal';
import { ConvertLeadModal } from './ConvertLeadModal';
import { Customer } from '@/lib/services/customerService';
import { WhatsAppSession, DEFAULT_WHATSAPP_SESSION } from '@/lib/services/whatsappService';

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
  customerId?: string | null;
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
  advanceReceived?: number;
  advanceVerified?: boolean;
  paymentMode?: string;
  paymentRef?: string;
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
    advanceReceived: 105000,
    advanceVerified: true,
    paymentMode: 'NEFT/RTGS',
    paymentRef: 'HDFCR202699120',
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
    advanceReceived: 197500,
    advanceVerified: true,
    paymentMode: 'UPI',
    paymentRef: 'UPI-98471928371',
    createdAt: '22/10/2026',
  },
  {
    id: 'SO-2026-091',
    leadId: 'lead-101',
    title: 'Skyline Sea View Luxury Apartments',
    client: 'Skyline Builders Kochi',
    value: 360000,
    doors: '48 Bath FRP Doors (EXM-A-100)',
    stepIndex: 0, // 'Order Confirmed & Specs Locked'
    advanceStatus: 'Pending 40% Advance',
    advanceReceived: 0,
    advanceVerified: false,
    createdAt: '28/10/2026',
  },
];

export default function LeadsPipeline() {
  const [leads, setLeads] = useState<LeadItem[]>([...INITIAL_LEADS]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderItem[]>([...INITIAL_SALES_ORDERS]);
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'ORDERS'>('PIPELINE');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  // Existing registered customers list (from /api/customers)
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [alsoCreateCustomer, setAlsoCreateCustomer] = useState(false);

  // WhatsApp Session State & Login Modal
  const [waSession, setWaSession] = useState<WhatsAppSession>(DEFAULT_WHATSAPP_SESSION);
  const [isWaLoginOpen, setIsWaLoginOpen] = useState(false);

  // Convert Lead Modal state
  const [activeLeadForConvert, setActiveLeadForConvert] = useState<LeadItem | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isZeroed = localStorage.getItem('exmark_data_zeroed');
      if (isZeroed === 'true') {
        setLeads([]);
        setSalesOrders([]);
      } else {
        // Check live database store
        fetch('/api/crm/leads')
          .then((res) => res.json())
          .then((json) => {
            if (json && Array.isArray(json.data)) {
              if (json.data.length === 0) {
                setLeads([]);
              } else {
                const mappedLeads: LeadItem[] = json.data.map((l: any) => {
                  let mappedStage: LeadItem['stage'] = 'inquiries';
                  if (l.stage === 'MEASUREMENT_SCHEDULED' || l.stage === 'measurement') mappedStage = 'measurement';
                  else if (l.stage === 'QUOTE_SENT' || l.stage === 'quotation') mappedStage = 'quotation';
                  else if (l.stage === 'NEGOTIATION' || l.stage === 'negotiation') mappedStage = 'negotiation';

                  return {
                    id: l.id,
                    leadCode: l.leadCode,
                    customerId: l.customerId,
                    title: l.title,
                    client: l.client || l.contactPerson || l.title,
                    contactPerson: l.contactPerson || l.client,
                    phone: l.phone,
                    district: l.district,
                    doors: l.doors || 'FRP & WPC Doors',
                    doorCount: l.doorCount || 20,
                    value: l.value || l.estimatedValue || 150000,
                    stage: mappedStage,
                    notes: l.notes,
                    createdAt: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
                    updatedAt: l.updatedAt,
                  };
                });
                setLeads(mappedLeads);
              }
            }
          })
          .catch(() => {});
      }

      // Fetch registered customers
      fetch('/api/customers')
        .then((res) => res.json())
        .then((json) => {
          if (json && json.success && Array.isArray(json.data)) {
            setCustomersList(json.data);
          }
        })
        .catch(() => {});

      // Fetch WhatsApp Session
      fetch('/api/crm/whatsapp/session')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.session) {
            setWaSession(json.session);
          }
        })
        .catch(() => {});
    }
  }, []);

  // New Lead form state
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDistrict, setNewDistrict] = useState('Ernakulam');
  const [newDoors, setNewDoors] = useState('25 FRP Bath Doors');
  const [newValue, setNewValue] = useState('185000');

  // 40% Advance Gatekeeper Modal state
  const [activeAdvanceOrder, setActiveAdvanceOrder] = useState<SalesOrderItem | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositMode, setDepositMode] = useState<string>('UPI');
  const [depositRef, setDepositRef] = useState<string>('');
  const [depositNotes, setDepositNotes] = useState<string>('');

  // Follow-up notes modal state
  const [activeLeadForNotes, setActiveLeadForNotes] = useState<LeadItem | null>(null);
  const [followUpNoteText, setFollowUpNoteText] = useState<string>('');

  // WhatsApp Lead Dispatcher modal state
  const [activeLeadForWhatsApp, setActiveLeadForWhatsApp] = useState<LeadItem | null>(null);

  const handleWhatsAppLogged = (leadId: string, notes: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, notes: `${notes} (${new Date().toLocaleTimeString('en-IN')})` } : l))
    );
    setToastMessage(`WhatsApp dispatch successfully recorded in CRM follow-up timeline!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLeadConverted = (
    leadId: string,
    conversionType: 'CUSTOMER' | 'MEASUREMENT' | 'QUOTATION' | 'ORDER',
    details: { customerId?: string; quoteNo?: string; orderId?: string }
  ) => {
    if (conversionType === 'CUSTOMER') {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, customerId: details.customerId } : l))
      );
      setToastMessage('🎉 Lead successfully registered as a formal Customer in database!');
    } else if (conversionType === 'MEASUREMENT') {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: 'measurement' } : l))
      );
      setToastMessage('📐 Site tape measurement booked with engineer! Lead advanced.');
    } else if (conversionType === 'QUOTATION') {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: 'quotation' } : l))
      );
      setToastMessage(`📋 Formal GST quotation (${details.quoteNo || 'QTE-2026'}) created! Lead advanced.`);
    } else if (conversionType === 'ORDER') {
      const targetLead = leads.find((l) => l.id === leadId);
      if (targetLead) {
        convertToSalesOrder(targetLead);
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setToastMessage(`🎉 Lead converted to Production Sales Order (${details.orderId || 'SO-2026'})!`);
      }
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

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
          setToastMessage(`Lead advanced to: ${nextStageLabel}`);
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

  // 2b. സ്റ്റേജ് പിന്നോട്ട് മാറ്റുന്ന ഫങ്ഷൻ (Reverse Lead Stage)
  const handleReverseLead = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    const stageKeys = PIPELINE_STAGES.map((s) => s.key);

    setLeads((prevLeads) =>
      prevLeads.map((lead) => {
        if (lead.id !== leadId) return lead;
        const curIdx = stageKeys.indexOf(lead.stage);
        if (curIdx > 0) {
          const prevStage = stageKeys[curIdx - 1] as LeadItem['stage'];
          const prevStageLabel = PIPELINE_STAGES[curIdx - 1].label;
          setToastMessage(`↺ Lead "${lead.title}" rolled back to: ${prevStageLabel}`);
          setTimeout(() => setToastMessage(null), 3000);
          return {
            ...lead,
            stage: prevStage,
            updatedAt: new Date().toISOString(),
          };
        }
        return lead;
      })
    );
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
      advanceStatus: 'Pending 40% Advance',
      advanceReceived: 0,
      advanceVerified: false,
      createdAt: new Date().toLocaleDateString('en-IN'),
    };

    setSalesOrders((prevOrders) => [newSO, ...prevOrders]);
  };

  // 4. സെയിൽസ് ഓർഡറിലെ ഓരോ സ്റ്റെപ്പും മുന്നോട്ട് മാറ്റുന്ന ഫങ്ഷൻ (with 40% Advance Gatekeeper check)
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
            advanceStatus: nextStep >= 1 ? (order.advanceVerified ? order.advanceStatus : '50% Advance Verified') : order.advanceStatus,
          };
        }
        return order;
      })
    );
  };

  // 4b. Advance Click with 40% Gatekeeper modal trigger
  const handleAdvanceSalesOrderClick = (order: SalesOrderItem) => {
    const min40 = Math.round(order.value * 0.40);
    const recd = order.advanceReceived || 0;
    const isAdvOk = order.advanceVerified && recd >= min40;

    // Gatekeeper: Cannot move from Step 0 (Confirmed) into production without 40% deposit
    if (order.stepIndex === 0 && !isAdvOk) {
      setToastMessage(`⚠️ Minimum 40% advance required before moving into production (Currently ${Math.round((recd / order.value) * 100)}%).`);
      setTimeout(() => setToastMessage(null), 3500);
      openRecordAdvanceModal(order);
      return;
    }

    advanceSalesOrderStep(order.id);
  };

  // 4c. സെയിൽസ് ഓർഡർ സ്റ്റേജ് പിന്നോട്ട് മാറ്റുന്ന ഫങ്ഷൻ (Reverse Sales Order Step)
  const reverseSalesOrderStep = (orderId: string) => {
    setSalesOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.stepIndex > 0) {
          const prevStep = order.stepIndex - 1;
          const prevStepLabel = SALES_ORDER_STEPS[prevStep];
          setToastMessage(`↺ Order ${order.id} rolled back to: ${prevStepLabel}`);
          setTimeout(() => setToastMessage(null), 3000);

          return {
            ...order,
            stepIndex: prevStep,
            advanceStatus: prevStep === 0 && !order.advanceVerified ? 'Pending 40% Advance' : order.advanceStatus,
          };
        }
        return order;
      })
    );
  };

  // Open Record Advance Modal
  const openRecordAdvanceModal = (order: SalesOrderItem) => {
    setActiveAdvanceOrder(order);
    const min40 = Math.round(order.value * 0.40);
    setDepositAmount(order.advanceReceived && order.advanceReceived > 0 ? order.advanceReceived : min40);
    setDepositMode(order.paymentMode || 'UPI');
    setDepositRef(order.paymentRef || '');
    setDepositNotes('');
  };

  // Confirm Record Advance Modal
  const confirmRecordAdvance = () => {
    if (!activeAdvanceOrder) return;
    if (depositAmount <= 0) {
      setToastMessage('Please enter a valid deposit amount.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const pct = Math.round((depositAmount / activeAdvanceOrder.value) * 100);
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeAdvanceOrder.id) return o;
        const verified = pct >= 40;
        return {
          ...o,
          advanceReceived: depositAmount,
          advanceVerified: verified,
          paymentMode: depositMode,
          paymentRef: depositRef || 'ACCOUNTS-VERIFIED',
          advanceStatus: verified ? `${pct}% Advance Verified (${depositMode})` : `Partial Deposit (${pct}%)`,
          stepIndex: verified && o.stepIndex === 0 ? 1 : o.stepIndex, // Automatically advance to Step 1 (Advance Received)
        };
      })
    );

    setToastMessage(`Advance deposit of ₹${depositAmount.toLocaleString('en-IN')} (${pct}%) recorded and verified for ${activeAdvanceOrder.id}!`);
    setTimeout(() => setToastMessage(null), 4000);
    setActiveAdvanceOrder(null);
  };

  // Follow-up notes modal
  const openFollowUpNotesModal = (lead: LeadItem) => {
    setActiveLeadForNotes(lead);
    setFollowUpNoteText(lead.notes || '');
  };

  const saveFollowUpNotes = () => {
    if (!activeLeadForNotes) return;
    setLeads((prev) =>
      prev.map((l) => (l.id === activeLeadForNotes.id ? { ...l, notes: followUpNoteText.trim() } : l))
    );
    setToastMessage(`Follow-up notes updated for ${activeLeadForNotes.title}`);
    setTimeout(() => setToastMessage(null), 3000);
    setActiveLeadForNotes(null);
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customersList.find((c) => c.id === customerId);
    if (found) {
      setNewClient(found.firmName || found.name);
      setNewPhone(found.phone);
      if (found.district) setNewDistrict(found.district);
    }
  };

  const handleCreateNewLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClient.trim()) return;

    let targetCustomerId = selectedCustomerId || null;

    // If user asked to also save as customer
    if (alsoCreateCustomer && !targetCustomerId) {
      try {
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClient.trim(),
            phone: newPhone.trim() || '+91 94470 00000',
            district: newDistrict,
            town: newDistrict,
            type: 'BUILDER',
            creditLimit: 100000,
          }),
        });
        const custJson = await custRes.json();
        if (custJson.success && custJson.data) {
          targetCustomerId = custJson.data.id;
          setCustomersList((prev) => [custJson.data, ...prev]);
        }
      } catch (err) {
        console.warn('Failed to auto-create customer:', err);
      }
    }

    const payload = {
      title: newTitle.trim(),
      client: newClient.trim(),
      contactPerson: newClient.trim(),
      phone: newPhone.trim() || '+91 94470 00000',
      district: newDistrict,
      doors: newDoors.trim() || 'FRP & WPC Doors',
      doorCount: parseInt(newDoors) || 20,
      value: parseFloat(newValue) || 150000,
      stage: 'NEW',
      customerId: targetCustomerId,
    };

    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const savedLead: LeadItem =
        data.success && data.data
          ? {
              id: data.data.id,
              leadCode: data.data.leadCode,
              customerId: data.data.customerId,
              title: data.data.title,
              client: data.data.client || data.data.contactPerson,
              contactPerson: data.data.contactPerson,
              phone: data.data.phone,
              district: data.data.district,
              doors: data.data.doors || newDoors,
              doorCount: data.data.doorCount || parseInt(newDoors) || 20,
              value: data.data.value || parseFloat(newValue) || 150000,
              stage: 'inquiries',
              createdAt: new Date().toLocaleDateString('en-IN'),
            }
          : {
              id: `lead-${Date.now()}`,
              leadCode: `LEAD-KL-${Math.floor(800 + Math.random() * 200)}`,
              customerId: targetCustomerId,
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

      setLeads((prev) => [savedLead, ...prev]);
      setIsNewLeadOpen(false);
      setNewTitle('');
      setNewClient('');
      setNewPhone('');
      setSelectedCustomerId('');
      setAlsoCreateCustomer(false);
      setToastMessage(`🎉 New lead "${savedLead.title}" added to CRM pipeline!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage(`Error adding lead: ${err.message}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleConvertLeadToCustomer = async (lead: LeadItem) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.client || lead.title,
          phone: lead.phone || '+91 94470 00000',
          district: lead.district || 'Ernakulam',
          town: lead.district || 'Ernakulam',
          type: 'BUILDER',
          creditLimit: 100000,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer');
      }
      const customer = data.data;

      // Link lead on backend
      if (lead.id.startsWith('lead-api-')) {
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: customer.id }),
        }).catch(() => {});
      }

      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, customerId: customer.id } : l))
      );
      setCustomersList((prev) => [customer, ...prev]);

      setToastMessage(`🎉 Lead "${lead.client}" saved as registered Customer (${customer.customerCode})!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(`Failed to register customer: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
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
          {/* WhatsApp Connection Status Pill */}
          <button
            type="button"
            onClick={() => setIsWaLoginOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border shadow-sm ${
              waSession.connected
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/50 animate-pulse'
            }`}
            title="Manage EXMARK WhatsApp connection, pair phone or scan QR"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                waSession.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {waSession.connected ? `WhatsApp: ${waSession.phoneNumber || '+91 94470 12345'}` : 'Pair WhatsApp'}
            </span>
            <span className="sm:hidden">WhatsApp</span>
          </button>

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
                        <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                          <span>{lead.phone}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLeadForWhatsApp(lead);
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer inline-flex items-center gap-1 transition-all"
                            title={`Instant WhatsApp chat with ${lead.contactPerson || lead.client}`}
                          >
                            <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>
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

                      {/* Action Buttons: Reverse, Follow-up Notes, Advance / Convert */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] text-slate-500">{lead.leadCode || lead.id}</span>
                          {lead.customerId ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/25 inline-flex items-center gap-0.5"
                              title="Linked to Customer database"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
                              <span>Customer</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvertLeadToCustomer(lead);
                              }}
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 inline-flex items-center gap-0.5 cursor-pointer transition-all"
                              title="Save this lead as registered Customer in Customers database"
                            >
                              <UserPlus className="w-2.5 h-2.5" />
                              <span>+ Customer</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleReverseLead(e, lead.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 inline-flex items-center gap-1 cursor-pointer transition-all"
                              title="Roll back lead to previous pipeline stage"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                              <span>↺ Reverse</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLeadForWhatsApp(lead);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 cursor-pointer transition-all"
                            title="Compose and send WhatsApp message to client"
                          >
                            <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFollowUpNotesModal(lead);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 inline-flex items-center gap-1 cursor-pointer transition-all"
                            title="View or add follow-up action notes"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Notes</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLeadForConvert(lead);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-950/40 hover:bg-amber-900/50 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 cursor-pointer transition-all"
                            title="Convert this lead to Customer, Measurement, Quotation, or Sales Order"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>Convert</span>
                          </button>

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
                                <span>Convert to Order</span>
                                <Sparkles className="w-3 h-3 text-amber-300" />
                              </>
                            ) : (
                              <>
                                <span>Advance</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
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

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
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

                      {/* Advance Deposit Gatekeeper Button */}
                      <button
                        type="button"
                        onClick={() => openRecordAdvanceModal(order)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                          order.advanceVerified
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse'
                        }`}
                        title="Record or update advance deposit (Mandatory 40% before production release)"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{order.advanceVerified ? 'Deposit Paid' : 'Record 40% Advance'}</span>
                      </button>

                      {/* Reverse Step Button (Bidirectional progression) */}
                      {order.stepIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => reverseSalesOrderStep(order.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer inline-flex items-center gap-1 transition-all"
                          title="Roll back order to previous stage"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span>↺ Reverse</span>
                        </button>
                      )}

                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSalesOrderClick(order)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
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
                <label className="block text-slate-400 font-bold mb-1">Select from Registered Customers (Optional)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-slate-200 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Manual Client / Direct Kerala Inquiry --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.firmName ? `(${c.firmName})` : ''} — {c.town || c.district} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

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

              {!selectedCustomerId && (
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="alsoCreateCustomerCheck"
                    checked={alsoCreateCustomer}
                    onChange={(e) => setAlsoCreateCustomer(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="alsoCreateCustomerCheck" className="text-slate-300 font-medium cursor-pointer">
                    Also register this client as a formal Customer in the Customers database
                  </label>
                </div>
              )}

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
                  <span className="font-black text-emerald-400">₹{activeAdvanceOrder.value.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-1">
                  <span>Mandatory 40% Minimum:</span>
                  <span>₹{Math.round(activeAdvanceOrder.value * 0.40).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Deposit Amount Received (₹) *</label>
                <input
                  type="number"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount (e.g. 140000)"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2.5 text-white font-black text-sm focus:border-rose-500 focus:outline-none"
                />
                {(() => {
                  const pct = Math.round((depositAmount / activeAdvanceOrder.value) * 100);
                  const isOk = pct >= 40;
                  return (
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
                            <span>Deposit is under 40% (₹{Math.round(activeAdvanceOrder.value * 0.40).toLocaleString('en-IN')}). Minimum 40% required.</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Payment Mode</label>
                  <select
                    value={depositMode}
                    onChange={(e) => setDepositMode(e.target.value)}
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
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    placeholder="UTR / Ref ID"
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Accounts Verification Note</label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Verified with HDFC Bank / Cash Counter"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
                />
              </div>
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
                onClick={confirmRecordAdvance}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify &amp; Save Advance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP NOTES MODAL */}
      {activeLeadForNotes && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="font-black text-white text-sm">Lead Follow-up Notes</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeadForNotes(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="font-black text-white text-sm">{activeLeadForNotes.title}</div>
                <div className="text-slate-400 text-[11px]">{activeLeadForNotes.client} &bull; {activeLeadForNotes.district}</div>
                <div className="text-amber-400 font-bold text-[11px]">Stage: {PIPELINE_STAGES.find((s) => s.key === activeLeadForNotes.stage)?.label}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Follow-up Log / Customer Requests:</label>
                <textarea
                  rows={4}
                  value={followUpNoteText}
                  onChange={(e) => setFollowUpNoteText(e.target.value)}
                  placeholder="Record customer preferences, site visit date, dimension changes, or price notes..."
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveLeadForNotes(null)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFollowUpNotes}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WHATSAPP LEAD DISPATCHER MODAL */}
      <WhatsAppLeadModal
        isOpen={!!activeLeadForWhatsApp}
        onClose={() => setActiveLeadForWhatsApp(null)}
        lead={
          activeLeadForWhatsApp
            ? {
                id: activeLeadForWhatsApp.id,
                leadCode: activeLeadForWhatsApp.leadCode,
                title: activeLeadForWhatsApp.title,
                client: activeLeadForWhatsApp.client,
                contactPerson: activeLeadForWhatsApp.contactPerson || activeLeadForWhatsApp.client,
                phone: activeLeadForWhatsApp.phone,
                district: activeLeadForWhatsApp.district,
                doors: activeLeadForWhatsApp.doors,
                doorCount: activeLeadForWhatsApp.doorCount,
                value: activeLeadForWhatsApp.value,
                stage: activeLeadForWhatsApp.stage,
              }
            : null
        }
        onMessageLogged={handleWhatsAppLogged}
      />

      {/* WHATSAPP LOGIN & DEVICE PAIRING MODAL */}
      <WhatsAppLoginModal
        isOpen={isWaLoginOpen}
        onClose={() => setIsWaLoginOpen(false)}
        session={waSession}
        onSessionUpdated={(updated) => setWaSession(updated)}
      />

      {/* MULTI-ACTION CONVERT LEAD MODAL */}
      <ConvertLeadModal
        isOpen={!!activeLeadForConvert}
        onClose={() => setActiveLeadForConvert(null)}
        lead={activeLeadForConvert}
        onConverted={handleLeadConverted}
      />
    </div>
  );
}
