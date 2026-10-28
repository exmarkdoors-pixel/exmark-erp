'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Target,
  FileSpreadsheet,
  Ruler,
  ShoppingBag,
  Factory,
  Boxes,
  Truck,
  ReceiptIndianRupee,
  UserCheck,
  Megaphone,
  BarChart3,
  Settings,
  Layers,
  Search,
  Plus,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Filter,
  Edit2,
  Printer,
  TrendingUp,
  Share2,
  Award,
  ShieldCheck,
  Download,
} from 'lucide-react';
import {
  DEMO_INVENTORY,
  DEMO_PRODUCTION_LINES,
  DEMO_COMPANY_INFO,
} from '@/data/demoData';
import { DoorMeasurementModal } from './DoorMeasurementModal';
import { SiteMeasurementRecord } from '@/types/measurements';
import ProductCategoriesSettings from '@/components/settings/ProductCategoriesSettings';
import { CustomerFormModal } from './customers/CustomerFormModal';
import { LeadFormModal } from './crm/LeadFormModal';
import { QuotationBuilder } from './quotations/QuotationBuilder';
import { JobCardModal } from './production/JobCardModal';
import { StickerPrintModal } from './production/StickerPrintModal';
import { PaymentReceiptModal } from './finance/PaymentReceiptModal';
import { FinancialStrategistModal } from './finance/FinancialStrategistModal';
import { WhatsAppSendModal } from './communication/WhatsAppSendModal';
import { CustomerConfirmationModal } from './communication/CustomerConfirmationModal';
import { DispatchScheduleModal } from './fulfillment/DispatchScheduleModal';
import { InstallationSignoffModal } from './fulfillment/InstallationSignoffModal';
import { WarrantyCertificateModal } from './fulfillment/WarrantyCertificateModal';
import { DispatchRecord, InstallationRecord, WarrantyCertificate } from '@/types/fulfillment';
import { Customer } from '@/lib/services/customerService';
import { Lead } from '@/lib/services/crmService';
import { Quotation } from '@/lib/services/quotationService';
import { ProductionOrder, ProductionStage } from '@/lib/services/productionService';
import { Invoice, Payment, FinancialTarget } from '@/types/finance';
import { ReportExecutionResult, WhatsAppDocumentType } from '@/types/communication';

/* -------------------------------------------------------------
 * 1. CUSTOMERS VIEW
 * ------------------------------------------------------------- */
export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/customers')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setCustomers(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCustomerSaved = (saved: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    setToastMessage(`Customer "${saved.name}" (${saved.town}) successfully saved.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.town.toLowerCase().includes(q) ||
      (c.firmName && c.firmName.toLowerCase().includes(q));
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-red-500" />
            Dealer & Builder Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kerala Authorized Dealers, Commercial Builders, Architects & Direct Contractors
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dealer name, town or Kerala district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0B132B] rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-[#0B132B] rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
        >
          <option value="All">All Customer Types</option>
          <option value="DEALER">Authorized Dealers</option>
          <option value="BUILDER">Direct Builders</option>
          <option value="ARCHITECT">Architects & Designers</option>
          <option value="RETAIL">Retail Customers</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading customer directory...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          No customers found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-red-500/50 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {customer.type}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {customer.name}
                  </h3>
                  {customer.firmName && (
                    <p className="text-xs text-slate-400">{customer.firmName}</p>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  {customer.status}
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>{customer.town}, {customer.district}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 block">Credit Limit</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{customer.creditLimit?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 block">Outstanding</span>
                  <span className="font-bold text-red-500">₹{customer.outstandingBalance?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleCustomerSaved}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. CRM & LEADS VIEW
 * ------------------------------------------------------------- */
export function CrmLeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/crm/leads')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setLeads(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLeadSaved = (saved: Lead) => {
    setLeads((prev) => [saved, ...prev]);
    setToastMessage(`Lead "${saved.title}" added to pipeline.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFollowUp = async (leadId: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CALL',
          notes: 'Routine progress follow-up with client.',
        }),
      });
      if (res.ok) {
        setToastMessage('Follow-up logged successfully.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  const STAGES = [
    { key: 'NEW', title: 'New Inquiries' },
    { key: 'MEASUREMENT_SCHEDULED', title: 'Measurement Scheduled' },
    { key: 'QUOTE_SENT', title: 'Quotation Submitted' },
    { key: 'NEGOTIATION', title: 'Final Negotiation' },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-red-500" />
            CRM & Dealer Sales Pipeline
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track Kerala architect visits, contractor leads, and site negotiations
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors cursor-pointer"
        >
          + New CRM Lead
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading CRM pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((col) => {
            const colLeads = leads.filter((l) => l.stage === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-100/70 dark:bg-[#070D1E] rounded-xl p-3.5 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{col.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/10 text-red-500">
                    {colLeads.length} Leads
                  </span>
                </div>
                <div className="space-y-2.5">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white dark:bg-[#0B132B] p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{lead.title}</h4>
                        {lead.estimatedValue && (
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            ₹{(lead.estimatedValue / 100000).toFixed(1)}L
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lead.contactPerson} • {lead.district}
                      </p>
                      <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="font-mono text-[10px] text-slate-500">{lead.leadCode}</span>
                        <button
                          type="button"
                          onClick={() => handleFollowUp(lead.id)}
                          className="hover:text-red-500 text-slate-400 transition-colors cursor-pointer"
                        >
                          Follow up &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="p-4 text-center text-[11px] text-slate-400 italic">No leads in this stage</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleLeadSaved}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. QUOTATIONS VIEW
 * ------------------------------------------------------------- */
export function QuotationsView() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/quotations')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setQuotations(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleQuotationSaved = (saved: Quotation) => {
    setQuotations((prev) => [saved, ...prev]);
    setToastMessage(`Quotation "${saved.quoteNumber}" created successfully.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-red-500" />
            Door Quotation Estimates & Costing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            FRP door skin, core filler, frame rebate & 18% GST estimate builder
          </p>
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 cursor-pointer"
        >
          + Create New Quote
        </button>
      </div>

      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Quotations Pipeline</h3>
        
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading quotations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Quote #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Door Items</th>
                  <th className="p-3 text-center">Total Doors</th>
                  <th className="p-3">Base Price</th>
                  <th className="p-3">GST (18%)</th>
                  <th className="p-3">Total (INR)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.map((q) => {
                  const totalQty = q.items.reduce((sum, item) => sum + item.quantity, 0);
                  const firstModel = q.items[0]?.doorModel || 'FRP Door';
                  const extraCount = q.items.length > 1 ? ` (+${q.items.length - 1} more)` : '';
                  return (
                    <tr key={q.id}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white font-mono">{q.quoteNumber}</td>
                      <td className="p-3 text-slate-400">{q.date}</td>
                      <td className="p-3">{firstModel}{extraCount}</td>
                      <td className="p-3 text-center font-bold">{totalQty}</td>
                      <td className="p-3 font-mono">₹{q.subtotal?.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono">₹{q.gstAmount?.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white font-mono">
                        ₹{q.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.status === 'APPROVED'
                              ? 'bg-amber-500/15 text-amber-500'
                              : q.status === 'CONVERTED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-blue-500/15 text-blue-500'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuotationBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSaved={handleQuotationSaved}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 4. DOOR MEASUREMENTS VIEW
 * ------------------------------------------------------------- */
export function DoorMeasurementsView({ userRole }: { userRole?: string }) {
  const [measurements, setMeasurements] = useState<SiteMeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<SiteMeasurementRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedConfirmRecord, setSelectedConfirmRecord] = useState<SiteMeasurementRecord | null>(null);
  const [selectedWhatsAppRecord, setSelectedWhatsAppRecord] = useState<SiteMeasurementRecord | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/measurements')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (active && json && Array.isArray(json.data)) {
          setMeasurements(json.data);
        }
      })
      .catch((err) => {
        if (active) {
          setFetchError(err instanceof Error ? err.message : 'Unable to connect to measurements service');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/measurements');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        setMeasurements(json.data);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to connect to measurements service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenNew = () => {
    setSelectedMeasurement(null);
    setIsModalOpen(true);
  };

  const handleOpenRecord = (record: SiteMeasurementRecord) => {
    setSelectedMeasurement(record);
    setIsModalOpen(true);
  };

  const handleSaved = (savedRecord: SiteMeasurementRecord) => {
    setMeasurements((prev) => {
      const existsIdx = prev.findIndex((item) => item.id === savedRecord.id);
      if (existsIdx >= 0) {
        const updated = [...prev];
        updated[existsIdx] = savedRecord;
        return updated;
      }
      return [savedRecord, ...prev];
    });

    setToastMessage({
      type: 'success',
      text: `Measurement book "${savedRecord.refNumber}" (${savedRecord.siteName}) successfully saved!`,
    });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const filteredMeasurements = measurements.filter((m) => {
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      m.refNumber.toLowerCase().includes(q) ||
      m.siteName.toLowerCase().includes(q) ||
      (m.customerName && m.customerName.toLowerCase().includes(q)) ||
      (m.district && m.district.toLowerCase().includes(q)) ||
      (m.engineerName && m.engineerName.toLowerCase().includes(q)) ||
      (m.orderRef && m.orderRef.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // Calculate summary metrics
  const totalBooks = measurements.length;
  const totalOpenings = measurements.reduce(
    (acc, m) => acc + (m.totalOpenings || (m.doors ? m.doors.length : 0)),
    0
  );
  const approvedCount = measurements.filter(
    (m) => m.status === 'APPROVED' || m.status === 'SENT_TO_PRODUCTION'
  ).length;
  const draftOrReviewCount = measurements.filter(
    (m) => m.status === 'DRAFT' || m.status === 'VERIFIED'
  ).length;

  const getStatusBadge = (status: SiteMeasurementRecord['status']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3" /> Verified Dimensions
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Approved for Production
          </span>
        );
      case 'SENT_TO_PRODUCTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-3 h-3" /> On CNC / Press Line
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="flex items-center justify-between p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs shadow-lg animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ruler className="w-6 h-6 text-red-500" />
              Site Door Measurement Book
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 rounded-md">
              4-Point Precision
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Raw masonry opening measurements (Height L/R, Width Top/Bottom, rebate depth, handing & lock type) recorded by site engineers across Kerala
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => handleRefresh()}
            disabled={isLoading}
            title="Refresh measurements from database"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          <button
            id="record-new-site-measurement-btn"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-xs font-bold shadow-md shadow-red-900/30 hover:shadow-red-900/50 transition-all cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record New Site Measurement</span>
          </button>
        </div>
      </div>

      {/* KPI / Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Site Books</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalBooks}</p>
          <span className="text-[10px] text-slate-500">Active project registers</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Total Door Openings</span>
          <p className="text-xl font-bold text-red-400 mt-0.5">{totalOpenings} Sets</p>
          <span className="text-[10px] text-slate-500">FRP &amp; WPC shutters</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Approved for Plant</span>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{approvedCount}</p>
          <span className="text-[10px] text-emerald-500/90 font-medium">Validated dimensions</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Draft / Pending Review</span>
          <p className="text-xl font-bold text-amber-400 mt-0.5">{draftOrReviewCount}</p>
          <span className="text-[10px] text-amber-500/90 font-medium">Requires verification</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#0B132B] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by site name, ref number, customer, district, or engineer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {(['ALL', 'DRAFT', 'VERIFIED', 'APPROVED', 'SENT_TO_PRODUCTION'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'ALL'
                ? 'All'
                : st === 'SENT_TO_PRODUCTION'
                ? 'In Production'
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((skeleton) => (
            <div
              key={skeleton}
              className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-24 bg-slate-100 dark:bg-slate-900/60 rounded" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Error Loading Measurements</h3>
          <p className="text-xs text-red-300 max-w-md mx-auto">{fetchError}</p>
          <button
            onClick={() => handleRefresh()}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredMeasurements.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No site measurement records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search terms or filter selection.'
                : 'Start recording precise 4-point site measurements for customer sites across Kerala.'}
            </p>
          </div>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Record New Site Measurement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeasurements.map((m) => (
            <div
              key={m.id}
              className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm space-y-3 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Ref No & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                      {m.refNumber}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                      {m.siteName}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {m.customerName || 'Direct Builder / Client'}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(m.status)}</div>
                </div>

                {/* Details Box */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Openings:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {m.totalOpenings || (m.doors ? m.doors.length : 0)} Door Sets
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">District:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {m.district || 'Kerala'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Wall / Rebate:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {m.wallThicknessMm ? `${m.wallThicknessMm}mm` : '150mm'} / {m.rebateDepthMm ? `${m.rebateDepthMm}mm` : '35mm'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Site Engineer:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {m.engineerName || 'Site Engineer'}
                    </span>
                  </div>
                  {m.orderRef && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Order Ref:</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {m.orderRef}
                      </span>
                    </div>
                  )}
                </div>

                {/* Door preview pills if available */}
                {m.doors && m.doors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Door Dimensions Recorded:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {m.doors.slice(0, 3).map((d, dIdx) => (
                        <span
                          key={d.id || dIdx}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700/50"
                        >
                          {d.doorNumber}: {Math.min(d.heightLeft, d.heightRight)}×{Math.min(d.widthTop, d.widthBottom)}
                          {d.measurementUnit.toLowerCase()}
                        </span>
                      ))}
                      {m.doors.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-slate-400">
                          +{m.doors.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2 gap-2">
                <div className="flex items-center gap-2">
                  <span>Date: {m.date}</span>
                  <button
                    onClick={() => setSelectedWhatsAppRecord(m)}
                    className="text-emerald-500 hover:text-emerald-400 font-semibold cursor-pointer"
                    title="Send via WhatsApp"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setSelectedConfirmRecord(m)}
                    className="text-blue-500 hover:text-blue-400 font-semibold cursor-pointer"
                    title="Customer Confirmation Portal"
                  >
                    Confirm Portal
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenRecord(m)}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit record"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleOpenRecord(m)}
                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-400 font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <span>View Dimension Sheet</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Door Measurement Modal */}
      <DoorMeasurementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        initialRecord={selectedMeasurement}
        userRole={userRole}
      />

      <CustomerConfirmationModal
        isOpen={!!selectedConfirmRecord}
        onClose={() => setSelectedConfirmRecord(null)}
        measurement={selectedConfirmRecord}
        onConfirmed={() => {
          handleRefresh();
          setToastMessage({ type: 'success', text: 'Customer confirmation status recorded.' });
        }}
      />

      <WhatsAppSendModal
        isOpen={!!selectedWhatsAppRecord}
        onClose={() => setSelectedWhatsAppRecord(null)}
        initialRecipientPhone={selectedWhatsAppRecord?.district || '+91 94470 12345'}
        initialRecipientName={selectedWhatsAppRecord?.customerName || 'Client'}
        initialDocumentType={'MEASUREMENT_CONFIRMATION' as WhatsAppDocumentType}
        initialDocumentId={selectedWhatsAppRecord?.refNumber}
        onSent={() => {
          setToastMessage({ type: 'success', text: 'Measurement confirmation sent via WhatsApp.' });
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 5. SALES ORDERS VIEW
 * ------------------------------------------------------------- */
export function SalesOrdersView() {
  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    district: string;
    date: string;
    totalDoors: number;
    totalAmount: number;
    advanceAmount: number;
    advanceVerified: boolean;
    orderStatus: string;
  }>>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter((o) => o.orderStatus === filterStatus);

  const totalDoors = orders.reduce((sum, o) => sum + o.totalDoors, 0);
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const inProd = orders.filter((o) => o.orderStatus === 'IN_PRODUCTION').length;
  const readyDispatch = orders.filter((o) => o.orderStatus === 'READY_TO_DISPATCH').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-red-500" />
            Complete Sales Orders Registry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Work orders, advance receipts, dispatch dates &amp; GST invoice status across Kerala
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Confirmed Orders</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{orders.length} Orders</p>
          <span className="text-[11px] text-emerald-500 font-semibold">{totalDoors} Door Sets</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Work Order Value</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{(totalValue / 100000).toFixed(2)} Lakhs
          </p>
          <span className="text-[11px] text-slate-400">18% GST Included</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">In Production Floor</span>
          <p className="text-2xl font-bold text-blue-500">{inProd} Orders</p>
          <span className="text-[11px] text-blue-400">FRP Press &amp; CNC</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Ready to Dispatch</span>
          <p className="text-2xl font-bold text-emerald-500">{readyDispatch} Orders</p>
          <span className="text-[11px] text-emerald-400">QC Passed</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2">
            {['ALL', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_DISPATCH'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  filterStatus === st
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{filteredOrders.length} records found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Order Ref</th>
                <th className="p-3">Customer &amp; Site</th>
                <th className="p-3">District</th>
                <th className="p-3">Doors</th>
                <th className="p-3">Total Value</th>
                <th className="p-3">Advance Status</th>
                <th className="p-3">Production Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                    {ord.orderNumber}
                  </td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                    {ord.customerName}
                  </td>
                  <td className="p-3 text-slate-500">{ord.district}</td>
                  <td className="p-3 font-bold text-red-500">{ord.totalDoors} Units</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    ₹{ord.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Advance ₹{ord.advanceAmount.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.orderStatus === 'READY_TO_DISPATCH'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : ord.orderStatus === 'IN_PRODUCTION'
                          ? 'bg-blue-500/15 text-blue-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {ord.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 6. PRODUCTION VIEW
 * ------------------------------------------------------------- */
export function ProductionView() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState<boolean>(false);
  const [selectedStickerOrder, setSelectedStickerOrder] = useState<ProductionOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/production')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleJobCardSaved = (saved: ProductionOrder) => {
    setOrders((prev) => [saved, ...prev]);
    setToastMessage(`Job Card "${saved.jobCardNumber}" issued to plant floor.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAdvanceStage = async (orderId: string, currentStage: ProductionStage) => {
    const STAGE_ORDER: ProductionStage[] = [
      'QUEUED',
      'MOLDING',
      'CNC_ROUTING',
      'PU_COATING',
      'QA_INSPECTION',
      'COMPLETED',
    ];
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    if (currentIndex >= STAGE_ORDER.length - 1) return;

    const nextStage = STAGE_ORDER[currentIndex + 1];

    try {
      const res = await fetch(`/api/production/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? json.data : o)));
        setToastMessage(`Order advanced to: ${nextStage.replace('_', ' ')}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-red-500" />
            Manufacturing Operations & Plant Floor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            FRP 300-ton hydraulic compression press lines, CNC carving, PU coating and barcode labeling
          </p>
        </div>
        <button
          onClick={() => setIsJobCardModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Issue Production Job Card
        </button>
      </div>

      {/* Production Lines Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_PRODUCTION_LINES.map((line) => (
          <div
            key={line.id}
            className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{line.lineName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                {line.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{line.doorType}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Efficiency</span>
                <span className="font-bold text-red-500">{line.utilizationRate}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-600 h-2 rounded-full" style={{ width: `${line.utilizationRate}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
              <span>Supervisor: {line.shiftSupervisor}</span>
              <span>Batch: {line.batchCode}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Production Orders & Job Cards */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Shop Floor Job Cards</h3>
            <p className="text-[11px] text-slate-400">
              Door-wise unique identification, finished cutting calculations & QR stickers
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-red-500">
            {orders.length} Active Orders
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading plant floor queue...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No active production job cards found. Click &quot;Issue Production Job Card&quot; to release orders.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      {order.jobCardNumber}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {order.customerName} — {order.siteName} ({order.district})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : order.status === 'QUEUED'
                          ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => setSelectedStickerOrder(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-red-500" />
                      <span>Print A4 Stickers</span>
                    </button>
                    {order.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleAdvanceStage(order.id, order.status)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Advance Stage &rarr;
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    <span className="block text-[10px] text-slate-400">Plant Line:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{order.lineAssigned}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Total Doors:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{order.quantity} Doors</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Batch Code:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{order.batchNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Tolerances Applied:</span>
                    <span className="font-mono text-red-500">
                      -{order.tolerancesApplied?.heightDeductionMm || 10}mm H / -{order.tolerancesApplied?.widthDeductionMm || 10}mm W
                    </span>
                  </div>
                </div>

                {/* Door preview items */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-300">
                    <thead className="text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-1">Door Serial ID</th>
                        <th className="py-1">Location</th>
                        <th className="py-1">Model</th>
                        <th className="py-1">Raw Size</th>
                        <th className="py-1 font-bold text-red-500">Cut Size</th>
                        <th className="py-1">Handing</th>
                        <th className="py-1">Lock</th>
                        <th className="py-1">QC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {order.doors.map((door) => (
                        <tr key={door.id}>
                          <td className="py-1.5 font-mono text-slate-900 dark:text-white font-bold">{door.doorId}</td>
                          <td className="py-1.5">{door.doorNumber}</td>
                          <td className="py-1.5">{door.model}</td>
                          <td className="py-1.5 font-mono text-slate-400">{door.rawHeightMm}x{door.rawWidthMm}mm</td>
                          <td className="py-1.5 font-mono font-bold text-red-600 dark:text-red-400">
                            {door.finishedHeightMm}x{door.finishedWidthMm}mm
                          </td>
                          <td className="py-1.5 font-bold">{door.handing}</td>
                          <td className="py-1.5 text-slate-400">{door.lockType}</td>
                          <td className="py-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                door.qcStatus === 'PASSED'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-400'
                              }`}
                            >
                              {door.qcStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <JobCardModal
        isOpen={isJobCardModalOpen}
        onClose={() => setIsJobCardModalOpen(false)}
        onSaved={handleJobCardSaved}
      />

      <StickerPrintModal
        isOpen={!!selectedStickerOrder}
        onClose={() => setSelectedStickerOrder(null)}
        order={selectedStickerOrder}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 7. INVENTORY VIEW
 * ------------------------------------------------------------- */
export function InventoryView() {
  const [inventory, setInventory] = useState<Array<{
    id: string;
    itemCode: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    reorderLevel: number;
    warehouseLocation: string;
    status: string;
  }>>([]);

  const loadInventory = () => {
    fetch('/api/inventory')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setInventory(json.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAdjustStock = async (id: string, adjustment: number) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADJUST_STOCK', id, adjustment }),
      });
      const json = await res.json();
      if (json.success) {
        setInventory((prev) => prev.map((item) => (item.id === id ? json.data : item)));
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-red-500" />
            Raw Material &amp; Hardware Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resin chemicals, fiberglass roving, WPC virgin polymer granules &amp; SS hinges
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">SKU Code</th>
                <th className="p-3">Material Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Reorder Point</th>
                <th className="p-3">Warehouse Bay</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Quick Stock In / Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-mono text-slate-400">{item.itemCode}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="p-3 text-slate-400">{item.reorderLevel} {item.unit}</td>
                  <td className="p-3 text-slate-400">{item.warehouseLocation}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'In Stock'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => handleAdjustStock(item.id, 50)}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold hover:bg-emerald-500/20 text-[10px]"
                        title="Add 50 units"
                      >
                        +50 In
                      </button>
                      <button
                        onClick={() => handleAdjustStock(item.id, -25)}
                        className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-bold hover:bg-red-500/20 text-[10px]"
                        title="Consume 25 units"
                      >
                        -25 Out
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 8. PURCHASES VIEW
 * ------------------------------------------------------------- */
export function PurchasesView() {
  const [purchases, setPurchases] = useState<Array<{
    id: string;
    poNumber: string;
    supplierName: string;
    supplierGst: string;
    orderDate: string;
    expectedDate: string;
    itemsSummary: string;
    subtotal: number;
    gstAmount: number;
    totalAmount: number;
    status: string;
    paymentTerms: string;
  }>>([]);

  const loadPurchases = () => {
    fetch('/api/purchases')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPurchases(json.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalGstCredit = purchases.reduce((sum, p) => sum + p.gstAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-red-500" />
            Purchases &amp; Supplier Invoices
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resin chemicals, glass fiber rolls, hardware fittings &amp; packaging procurement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Monthly Procurement Volume</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{(totalSpend / 100000).toFixed(2)} Lakhs
          </p>
          <span className="text-[11px] text-slate-400">Active Vendor POs</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Active Vendor POs</span>
          <p className="text-2xl font-bold text-blue-500">{purchases.length} Purchase Orders</p>
          <span className="text-[11px] text-blue-400">Kerala &amp; Gujarat Chemical Hubs</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Input Tax Credit (GST)</span>
          <p className="text-2xl font-bold text-emerald-500">
            ₹{(totalGstCredit / 100000).toFixed(2)} Lakhs
          </p>
          <span className="text-[11px] text-emerald-400">Claimable on GSTR-2B</span>
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-xs uppercase text-slate-500">Vendor Purchase Orders Registry</h3>
          <span className="text-xs text-slate-400">{purchases.length} POs recorded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">PO Number</th>
                <th className="p-3">Vendor / Supplier</th>
                <th className="p-3">Order Date</th>
                <th className="p-3">Materials Description</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Input GST (18%)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchases.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                    {po.poNumber}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{po.supplierName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{po.supplierGst}</div>
                  </td>
                  <td className="p-3 text-slate-500">{po.orderDate}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                    {po.itemsSummary}
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    ₹{po.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 font-semibold text-emerald-600">
                    ₹{po.gstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        po.status === 'DELIVERED'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : po.status === 'IN_TRANSIT'
                          ? 'bg-blue-500/15 text-blue-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 9. ACCOUNTS & GST VIEW
 * ------------------------------------------------------------- */
export function AccountsGstView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isStrategistOpen, setIsStrategistOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/finance/invoices').then((r) => r.json()),
      fetch('/api/finance/payments').then((r) => r.json()),
      fetch('/api/finance/targets').then((r) => r.json()),
    ])
      .then(([invData, payData, tgtData]) => {
        if (active) {
          if (invData.success && Array.isArray(invData.data)) setInvoices(invData.data);
          if (payData.success && Array.isArray(payData.data)) setPayments(payData.data);
          if (tgtData.success && Array.isArray(tgtData.data)) setTargets(tgtData.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePaymentSaved = (saved: Payment) => {
    setPayments((prev) => [saved, ...prev]);
    // Refresh invoices to reflect updated balances
    fetch('/api/finance/invoices')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setInvoices(json.data);
      })
      .catch(() => {});
    setToastMessage(`Payment receipt "${saved.receiptNumber}" (₹${saved.amount.toLocaleString('en-IN')}) successfully generated.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTargetSaved = (saved: FinancialTarget) => {
    setTargets((prev) => [saved, ...prev]);
    setToastMessage(`Financial Target for ${saved.targetPeriod} locked and approved.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Calculations
  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCgst = invoices.reduce((sum, i) => sum + i.cgst, 0);
  const totalSgst = invoices.reduce((sum, i) => sum + i.sgst, 0);
  const totalReceivables = invoices.reduce((sum, i) => sum + i.balanceAmount, 0);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ReceiptIndianRupee className="w-6 h-6 text-red-500" />
            Accounts, GST Compliance & Financial Governance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            HSN 3925.20.00 tax reconciliation, 18% GST (CGST 9% + SGST 9%), bank receipts & strategist
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStrategistOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-red-500" /> Financial Strategist
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Payment Receipt
          </button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Invoiced Sales</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
            ₹{totalBilled.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">{invoices.length} Tax Invoices</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Collections Realized</span>
          <p className="text-xl font-black text-emerald-500 font-mono">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-600">{payments.length} Bank Receipts</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding Receivables</span>
          <p className="text-xl font-black text-red-500 font-mono">
            ₹{totalReceivables.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">Aging &gt; 30 Days</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">GST Liability (18%)</span>
          <p className="text-xl font-black text-blue-500 font-mono">
            ₹{(totalCgst + totalSgst).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">CGST 9% + SGST 9%</span>
        </div>
      </div>

      {/* Active Financial Target Banner */}
      {targets.length > 0 && (
        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">Active Target ({targets[0].targetPeriod}):</span>
            <span className="text-slate-600 dark:text-slate-300">Sales: ₹{targets[0].salesRevenueTarget.toLocaleString('en-IN')}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-300">Collections: ₹{targets[0].collectionsTarget.toLocaleString('en-IN')}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold text-red-600 dark:text-red-400">{targets[0].frpDoorQuantityTarget} FRP Doors</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 shrink-0">
            {targets[0].status}
          </span>
        </div>
      )}

      {/* Tax Invoices Section */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">GST Tax Invoices Register</h3>
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading invoice ledger...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 font-mono">Taxable Base</th>
                  <th className="p-3 font-mono">CGST (9%)</th>
                  <th className="p-3 font-mono">SGST (9%)</th>
                  <th className="p-3 font-mono">Grand Total</th>
                  <th className="p-3 font-mono">Balance Due</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3 text-slate-400">{inv.invoiceDate}</td>
                    <td className="p-3 font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono">₹{inv.cgst.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono">₹{inv.sgst.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono font-bold text-red-500">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-blue-500/15 text-blue-500'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Register */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Customer Payment Receipts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Receipt #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 font-mono">Amount (INR)</th>
                <th className="p-3">UTR / Ref #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{p.receiptNumber}</td>
                  <td className="p-3">{p.customerName}</td>
                  <td className="p-3 text-slate-400">{p.paymentDate}</td>
                  <td className="p-3 font-semibold">{p.paymentMode}</td>
                  <td className="p-3 font-mono font-bold text-emerald-500">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono text-slate-400">{p.referenceNumber || 'Counter Cash'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentReceiptModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSaved={handlePaymentSaved}
        invoices={invoices}
      />

      <FinancialStrategistModal
        isOpen={isStrategistOpen}
        onClose={() => setIsStrategistOpen(false)}
        onTargetCreated={handleTargetSaved}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 10. EMPLOYEES VIEW
 * ------------------------------------------------------------- */
export function EmployeesView() {
  const [employees, setEmployees] = useState<Array<{
    id: string;
    employeeCode: string;
    name: string;
    role: string;
    department: string;
    phone: string;
    email: string;
    status: string;
    location: string;
  }>>([]);

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setEmployees(json.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-red-500" />
            Factory Staff &amp; Field Engineers Roster
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Factory technicians, CNC programmers, QC inspectors and site measurement supervisors across Kerala
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 dark:bg-slate-800 flex items-center justify-center font-bold text-red-500">
                {emp.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400">{emp.employeeCode}</span>
                </div>
                <p className="text-xs text-red-500 font-medium">{emp.role}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
              <span>{emp.department}</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{emp.phone}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Station: {emp.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 11. DISPATCH & INSTALLATION VIEW
 * ------------------------------------------------------------- */
export function DispatchInstallationView() {
  const [activeTab, setActiveTab] = useState<'dispatches' | 'installations' | 'warranties'>('dispatches');
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [installations, setInstallations] = useState<InstallationRecord[]>([]);
  const [warranties, setWarranties] = useState<WarrantyCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationRecord | null>(null);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyCertificate | null>(null);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/fulfillment/dispatch').then((r) => r.json()),
      fetch('/api/fulfillment/installation').then((r) => r.json()),
      fetch('/api/fulfillment/warranty').then((r) => r.json()),
    ])
      .then(([dRes, iRes, wRes]) => {
        if (dRes.success) setDispatches(dRes.data);
        if (iRes.success) setInstallations(iRes.data);
        if (wRes.success) setWarranties(wRes.data);
      })
      .catch((err) => console.error('Failed to load fulfillment data:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/fulfillment/dispatch').then((r) => r.json()),
      fetch('/api/fulfillment/installation').then((r) => r.json()),
      fetch('/api/fulfillment/warranty').then((r) => r.json()),
    ])
      .then(([dRes, iRes, wRes]) => {
        if (dRes.success) setDispatches(dRes.data);
        if (iRes.success) setInstallations(iRes.data);
        if (wRes.success) setWarranties(wRes.data);
      })
      .catch((err) => console.error('Failed to load fulfillment data:', err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-red-500" />
            Dispatch Logistics, Installation &amp; FRP Warranty
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated delivery fleet across all 14 Kerala districts • Site installation sign-offs • Official 10/15 year FRP material warranty
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'dispatches' && (
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Dispatch
            </button>
          )}
          {activeTab === 'warranties' && (
            <button
              onClick={() => {
                setSelectedWarranty(null);
                setIsWarrantyModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"
            >
              <Award className="w-3.5 h-3.5" />
              Issue Warranty Certificate
            </button>
          )}
          <button
            onClick={loadData}
            title="Refresh records"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'dispatches'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Fleet Logistics &amp; Dispatches ({dispatches.length})
        </button>
        <button
          onClick={() => setActiveTab('installations')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'installations'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Site Installations &amp; Handover ({installations.length})
        </button>
        <button
          onClick={() => setActiveTab('warranties')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'warranties'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          FRP Warranty Certificates ({warranties.length})
        </button>
      </div>

      {/* TAB 1: DISPATCHES */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Active Dispatches</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{dispatches.length} Trips</p>
              <p className="text-[11px] text-slate-400">Palakkad central plant distribution</p>
            </div>
            <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-blue-500">Doors In Transit</span>
              <p className="text-xl font-bold text-blue-500 mt-1">
                {dispatches.filter((d) => d.status === 'IN_TRANSIT').reduce((a, b) => a + b.doorCount, 0)} Units
              </p>
              <p className="text-[11px] text-slate-400">On road to North/South Kerala hubs</p>
            </div>
            <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-emerald-500">Delivered Successfully</span>
              <p className="text-xl font-bold text-emerald-500 mt-1">
                {dispatches.filter((d) => d.status === 'DELIVERED').length} Sites
              </p>
              <p className="text-[11px] text-slate-400">Received &amp; verified at site warehouse</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Dispatch #</th>
                    <th className="px-4 py-3">Customer &amp; Destination</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Vehicle &amp; Driver</th>
                    <th className="px-4 py-3">Doors</th>
                    <th className="px-4 py-3">e-Way Bill</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {dispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {d.dispatchNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{d.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.destinationAddress}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {d.deliveryDistrict}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-800 dark:text-slate-200">{d.vehicleNumber}</div>
                        <div className="text-[11px] text-slate-400">{d.driverName} {d.driverPhone ? `• ${d.driverPhone}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-500">
                        {d.doorCount} Units
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {d.eWayBillNo || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'DELIVERED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : d.status === 'IN_TRANSIT'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dispatches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No dispatches found. Click &quot;Schedule Dispatch&quot; to register fleet transport.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INSTALLATIONS */}
      {activeTab === 'installations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Installation #</th>
                    <th className="px-4 py-3">Site / Customer</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Supervisor</th>
                    <th className="px-4 py-3">Doors</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rating &amp; Sign-Off</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {installations.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {inst.installationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{inst.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{inst.siteAddress}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {inst.district}
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                        {inst.supervisorName}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {inst.doorCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inst.status === 'QUALITY_APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : inst.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {inst.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inst.clientSignoffName ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-emerald-600 text-[11px]">
                              Signed by {inst.clientSignoffName}
                            </span>
                            <div className="text-[11px] text-amber-500">
                              {'★'.repeat(inst.clientFeedbackRating || 5)} ({inst.clientFeedbackRating}/5)
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Pending Handover</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inst.status !== 'QUALITY_APPROVED' ? (
                          <button
                            onClick={() => setSelectedInstallation(inst)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30"
                          >
                            Sign-Off
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedWarranty({
                                certificateNumber: `EXM-WRN-${inst.installationNumber}`,
                                salesOrderId: inst.salesOrderId,
                                customerName: inst.customerName,
                                siteAddress: inst.siteAddress,
                                district: inst.district,
                                warrantyPeriodYears: 15,
                                validFrom: new Date().toISOString().split('T')[0],
                                validUntil: '2041-10-27',
                                coveredDoors: [
                                  {
                                    doorId: `EXM-DR-${inst.installationNumber}-01`,
                                    model: 'EXM-FRP-TL101',
                                    sizeMm: '2085 x 888 mm',
                                  },
                                ],
                                coverageScope: 'FRP DOOR MATERIAL ONLY (100% Water, Termite & Borer Proof Body)',
                                explicitExclusions: [
                                  'SS Hinges, Tower Bolts, Handles, and Lock Hardware sets',
                                  'Surface PU Paints, Foiling, and Cosmetic finish weathering',
                                  'Damage arising from civil structure settlement or accidental mechanical impact',
                                  'Unapproved modifications, thermal burns, or acidic chemical washing',
                                ],
                                bilingualCareInstructions: {
                                  english: [
                                    'Clean door surfaces with mild soapy water and a soft cotton cloth only.',
                                    'Never use acidic floor cleaners, wire brushes, or harsh solvents on FRP doors.',
                                  ],
                                  malayalam: [
                                    'ഡോർ വൃത്തിയാക്കാൻ വീര്യം കുറഞ്ഞ സോപ്പ് വെള്ളവും കോട്ടൺ തുണിയും മാത്രം ഉപയോഗിക്കുക.',
                                    'ആസിഡ്, ഫിനോയിൽ അല്ലെങ്കിൽ കഠിനമായ കെമിക്കലുകൾ ഡോറിൽ ഒഴിക്കരുത്.',
                                  ],
                                },
                                issuedAt: new Date().toISOString(),
                              });
                              setIsWarrantyModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/30 flex items-center gap-1 ml-auto"
                          >
                            <Award className="w-3 h-3" />
                            View Warranty
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WARRANTIES */}
      {activeTab === 'warranties' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Official EXMARK FRP Door Material Warranty Standard
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Strictly protects <strong>FRP Door Material</strong> against water rot, termites &amp; swelling. Hinges, locks, and handles are explicitly excluded from warranty liability.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedWarranty(null);
                setIsWarrantyModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shrink-0 shadow-sm"
            >
              Issue New Warranty
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warranties.map((w) => (
              <div
                key={w.certificateNumber}
                className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-amber-500/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedWarranty(w);
                  setIsWarrantyModalOpen(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">
                      {w.certificateNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {w.customerName}
                    </h3>
                    <p className="text-xs text-slate-500">{w.siteAddress}, {w.district}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-black bg-amber-500/15 text-amber-600 border border-amber-500/30">
                    {w.warrantyPeriodYears} YEARS
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-600">
                    Scope: {w.coverageScope}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Valid: {w.validFrom} to {w.validUntil}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <span>Covered Doors: {w.coveredDoors?.length || 1} units</span>
                  <span className="text-amber-500 font-semibold hover:underline">
                    View &amp; Print Certificate &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <DispatchScheduleModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        onSuccess={(rec) => {
          setDispatches((prev) => [rec, ...prev]);
        }}
      />

      <InstallationSignoffModal
        isOpen={Boolean(selectedInstallation)}
        installation={selectedInstallation}
        onClose={() => setSelectedInstallation(null)}
        onSuccess={(updated) => {
          setInstallations((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i))
          );
        }}
      />

      <WarrantyCertificateModal
        isOpen={isWarrantyModalOpen}
        initialCertificate={selectedWarranty}
        onClose={() => {
          setIsWarrantyModalOpen(false);
          setSelectedWarranty(null);
        }}
        onSuccess={(cert) => {
          setWarranties((prev) => [cert, ...prev]);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 12. MARKETING VIEW
 * ------------------------------------------------------------- */
export function MarketingView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-red-500" />
            Dealer Display Marketing & Architect Outreach
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kerala showroom door display racks, architectural expo booths & catalog distribution
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kerala Dealer Showroom Rack Program</h3>
          <p className="text-xs text-slate-400">
            6-Door rotating showroom display stand showing FRP Molded Teak, Rosewood CNC Carved, and WPC Bathroom Doors installed in 42 dealer showrooms across Kerala.
          </p>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">IIA Kerala Chapter Architect Connect</h3>
          <p className="text-xs text-slate-400">
            Exclusive moisture-resistance and acoustic sample kits distributed to 120 leading Kerala architectural consultancies in Kochi, Calicut & Trivandrum.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 13. REPORTS VIEW
 * ------------------------------------------------------------- */
export function ReportsView() {
  const [selectedReportCode, setSelectedReportCode] = useState<string>('SALES_BY_DISTRICT');
  const [reportResult, setReportResult] = useState<ReportExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/reports?code=${selectedReportCode}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data) {
          setReportResult(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedReportCode]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!reportResult || !reportResult.rows.length) return;
    const colKeys = Object.keys(reportResult.rows[0]);
    const headers = colKeys.map((k) => `"${k.replace(/([A-Z])/g, ' $1').trim()}"`).join(',');
    const rows = reportResult.rows
      .map((row) =>
        colKeys
          .map((k) => {
            const val = row[k];
            if (val === undefined || val === null) return '""';
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EXMARK_${selectedReportCode}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage(`Exported ${reportResult.title} to Excel/CSV`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const REPORT_OPTIONS = [
    { code: 'SALES_BY_DISTRICT', title: 'District Sales & Dealer Volume' },
    { code: 'PRODUCTION_EFFICIENCY', title: 'Plant Line Output & QC Yield' },
    { code: 'OUTSTANDING_RECEIVABLES_AGING', title: 'Receivables Aging (>30, >60, >90 Days)' },
    { code: 'FRP_MODEL_MARGINS', title: 'FRP Door Model Profitability' },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-red-500" />
            Executive Business Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            FRP door sales, production capacity, receivables aging & dealer performance across Kerala
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Share via WhatsApp
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" /> Export Excel / CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-red-500" /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            onClick={() => {
              setIsLoading(true);
              setSelectedReportCode(opt.code);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedReportCode === opt.code
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0B132B] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {opt.title}
          </button>
        ))}
      </div>

      {/* Report Output Content */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-mono font-bold text-red-500 tracking-wider block">
                EXMARK DOORS ERP • OFFICIAL AUDIT REPORT
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {reportResult?.title || 'Business Intelligence Report'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Summary Metrics */}
        {reportResult && reportResult.summaryMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            {Object.entries(reportResult.summaryMetrics).map(([key, val]) => (
              <div key={key}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Compiling report data...</div>
        ) : !reportResult || reportResult.rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No data found for this report period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  {Object.keys(reportResult.rows[0]).map((colKey) => (
                    <th key={colKey} className="p-3">
                      {colKey.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    {Object.values(row).map((cellVal, cIdx) => (
                      <td
                        key={cIdx}
                        className={`p-3 ${
                          typeof cellVal === 'number'
                            ? 'font-mono font-bold text-slate-900 dark:text-white'
                            : ''
                        }`}
                      >
                        {typeof cellVal === 'number' && cellVal > 1000
                          ? `₹${cellVal.toLocaleString('en-IN')}`
                          : cellVal}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WhatsAppSendModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        initialDocumentType={'QUOTATION' as WhatsAppDocumentType}
        onSent={() => {
          setToastMessage('Report summary transmitted via WhatsApp Cloud API.');
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 14. SETTINGS VIEW
 * ------------------------------------------------------------- */
export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'categories' | 'profile'>('categories');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-red-500" />
            Admin Settings &amp; Plant Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Product categories (FRP primary, WPC toggle), factory parameters, GST registration &amp; role access
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Product Categories (FRP / WPC)
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Company Profile &amp; GST
        </button>
      </div>

      {activeTab === 'categories' && <ProductCategoriesSettings />}

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-[#0B132B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-3xl">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">EXMARK DOORS Enterprise Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Company Registered Name</label>
              <input
                type="text"
                readOnly
                value={DEMO_COMPANY_INFO.name}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">GSTIN Number (Kerala)</label>
              <input
                type="text"
                readOnly
                value={DEMO_COMPANY_INFO.gstin}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Manufacturing Plant Location</label>
              <input
                type="text"
                readOnly
                value={DEMO_COMPANY_INFO.factoryLocation}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Primary Focus: 100% Waterproof FRP Architectural Doors (HSN 3925.20.00)</span>
            <span className="text-emerald-500 font-bold">System Status: Active</span>
          </div>
        </div>
      )}
    </div>
  );
}
