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
} from 'lucide-react';
import {
  DEMO_CUSTOMERS,
  DEMO_INVENTORY,
  DEMO_PRODUCTION_LINES,
  DEMO_COMPANY_INFO,
} from '@/data/demoData';
import { DoorMeasurementModal } from './DoorMeasurementModal';
import { SiteMeasurementRecord } from '@/types/measurements';
import ProductCategoriesSettings from '@/components/settings/ProductCategoriesSettings';

/* -------------------------------------------------------------
 * 1. CUSTOMERS VIEW
 * ------------------------------------------------------------- */
export function CustomersView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = DEMO_CUSTOMERS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
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
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dealer name or Kerala district..."
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
          <option value="Dealer">Authorized Dealers</option>
          <option value="Builder">Direct Builders</option>
          <option value="Architect">Architects & Designers</option>
        </select>
      </div>

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
                <p className="text-xs text-slate-400">{customer.firmName}</p>
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
                <span className="text-[10px] text-slate-400 block">Total Orders</span>
                <span className="font-bold text-slate-900 dark:text-white">{customer.ordersCount} ({customer.totalVolume})</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">Outstanding</span>
                <span className="font-bold text-red-500">{customer.outstandingBalance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. CRM & LEADS VIEW
 * ------------------------------------------------------------- */
export function CrmLeadsView() {
  const stages = [
    {
      title: 'New Inquiries',
      count: '6 Leads',
      leads: [
        { name: 'Kochi Waterfront Apartments', contact: 'Er. Jacob Roy', units: '48 FRP Doors', district: 'Ernakulam', est: '₹4.2L' },
        { name: 'Calicut Heritage Villa', contact: 'M. K. Basheer', units: '14 WPC Doors', district: 'Kozhikode', est: '₹1.8L' },
      ],
    },
    {
      title: 'Measurement Scheduled',
      count: '4 Sites',
      leads: [
        { name: 'Green Meadows Luxury', contact: 'Ar. Ananya Nair', units: '30 Solid Hybrid', district: 'Thrissur', est: '₹3.6L' },
        { name: 'Kannur Seashore Hotel', contact: 'Ashraf K.', units: '22 Fire Retardant', district: 'Kannur', est: '₹2.9L' },
      ],
    },
    {
      title: 'Quotation Submitted',
      count: '5 Quotes',
      leads: [
        { name: 'Skyline Palms Kakkanad', contact: 'Varghese Mathew', units: '36 WPC Frames', district: 'Ernakulam', est: '₹2.16L' },
        { name: 'Perinthalmanna Clinic', contact: 'Dr. Faizal', units: '18 Antibacterial FRP', district: 'Malappuram', est: '₹1.9L' },
      ],
    },
    {
      title: 'Final Negotiation',
      count: '3 Tenders',
      leads: [
        { name: 'Malabar Luxury Builders', contact: 'Shabeer Ali', units: '24 Molded Teak', district: 'Kozhikode', est: '₹2.88L' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
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
        <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors">
          + New CRM Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.title}
            className="bg-slate-100/70 dark:bg-[#070D1E] rounded-xl p-3.5 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-900 dark:text-white">{stage.title}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/10 text-red-500">
                {stage.count}
              </span>
            </div>
            <div className="space-y-2.5">
              {stage.leads.map((lead, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0B132B] p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{lead.name}</h4>
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{lead.est}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{lead.contact} • {lead.district}</p>
                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="font-medium text-red-500">{lead.units}</span>
                    <span className="hover:text-white cursor-pointer">Follow up &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. QUOTATIONS VIEW
 * ------------------------------------------------------------- */
export function QuotationsView() {
  return (
    <div className="space-y-6">
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
        <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500">
          + Create New Quote
        </button>
      </div>

      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Quotations Pipeline</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Quote #</th>
                <th className="p-3">Client</th>
                <th className="p-3">Door Model & Specs</th>
                <th className="p-3 text-center">Doors</th>
                <th className="p-3">Base Price</th>
                <th className="p-3">GST (18%)</th>
                <th className="p-3">Total (INR)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-white">QTN-2026-442</td>
                <td className="p-3">Malabar Builders (Kozhikode)</td>
                <td className="p-3">FRP 32mm Molded Teak with Honeycomb Core</td>
                <td className="p-3 text-center font-bold">24</td>
                <td className="p-3">₹2,44,067</td>
                <td className="p-3">₹43,933</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">₹2,88,000</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-500 font-bold">Approved</span></td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-white">QTN-2026-443</td>
                <td className="p-3">Skyline Kakkanad Tower B</td>
                <td className="p-3">WPC 30mm Waterproof Solid Bathroom Doors</td>
                <td className="p-3 text-center font-bold">36</td>
                <td className="p-3">₹1,83,050</td>
                <td className="p-3">₹32,950</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">₹2,16,000</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-500 font-bold">Sent to Client</span></td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-white">QTN-2026-444</td>
                <td className="p-3">Thrissur Elite Architect Studio</td>
                <td className="p-3">FRP 35mm CNC Carved Rosewood with Brass Beading</td>
                <td className="p-3 text-center font-bold">12</td>
                <td className="p-3">₹1,65,254</td>
                <td className="p-3">₹29,746</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">₹1,95,000</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-500 font-bold">Converted</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                <span>Date: {m.date}</span>
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
    </div>
  );
}

/* -------------------------------------------------------------
 * 5. SALES ORDERS VIEW
 * ------------------------------------------------------------- */
export function SalesOrdersView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-red-500" />
            Complete Sales Orders Registry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Work orders, advance receipts, dispatch dispatch dates & GST invoice status
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Active Orders</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">18 Orders</p>
          <span className="text-[11px] text-emerald-500 font-semibold">171 Door Sets</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Work Order Value</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹16.41 Lakhs</p>
          <span className="text-[11px] text-slate-400">Average: ₹91.1k/order</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">In Production Floor</span>
          <p className="text-2xl font-bold text-blue-500">11 Orders</p>
          <span className="text-[11px] text-blue-400">FRP Press & CNC</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Ready to Dispatch</span>
          <p className="text-2xl font-bold text-emerald-500">4 Orders</p>
          <span className="text-[11px] text-emerald-400">QC Passed</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 6. PRODUCTION VIEW
 * ------------------------------------------------------------- */
export function ProductionView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-red-500" />
            Manufacturing Operations & Plant Floor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time shop floor control, hydraulic press cycles, extruder feeds and CNC carving
          </p>
        </div>
      </div>

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
    </div>
  );
}

/* -------------------------------------------------------------
 * 7. INVENTORY VIEW
 * ------------------------------------------------------------- */
export function InventoryView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-red-500" />
            Raw Material & Hardware Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resin chemicals, fiberglass roving, WPC virgin polymer granules & SS hinges
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DEMO_INVENTORY.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-mono text-slate-400">{item.itemCode}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{item.currentStock} {item.unit}</td>
                  <td className="p-3">{item.reorderLevel} {item.unit}</td>
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-red-500" />
            Purchases & Supplier Invoices
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resin suppliers, wood composite granules, glass fiber rolls & packaging procurement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Monthly Purchase Volume</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹19.45 Lakhs</p>
          <span className="text-[11px] text-slate-400">Oct 2026 Raw Materials</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Active Vendor POs</span>
          <p className="text-2xl font-bold text-blue-500">6 Purchase Orders</p>
          <span className="text-[11px] text-blue-400">Kerala & Gujarat Chemical Hubs</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Input Tax Credit (GST)</span>
          <p className="text-2xl font-bold text-emerald-500">₹3.50 Lakhs</p>
          <span className="text-[11px] text-emerald-400">Available on GSTR-2B</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 9. ACCOUNTS & GST VIEW
 * ------------------------------------------------------------- */
export function AccountsGstView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ReceiptIndianRupee className="w-6 h-6 text-red-500" />
            Accounts & GST Compliance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            HSN 3925 door tax reconciliation, e-Way bills, dealer credits & cashflow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">GST Summary (October 2026)</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Outward Taxable Sales (HSN 3925):</span>
              <span className="font-bold text-slate-900 dark:text-white">₹41,22,881</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">CGST (9%):</span>
              <span className="font-bold text-slate-900 dark:text-white">₹3,71,059</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">SGST (9% Kerala):</span>
              <span className="font-bold text-slate-900 dark:text-white">₹3,71,059</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-500 font-bold">
              <span>Total GST Collected:</span>
              <span>₹7,42,118</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">e-Way Bill Generation & Inward Logistics</h3>
          <p className="text-xs text-slate-400">
            Automated e-Way bills generated for Kerala interstate and intra-state transports &gt; ₹50,000 threshold.
          </p>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-300">
            <p className="font-mono text-emerald-400">e-Way Bill #2119-0941-8842</p>
            <p className="text-[11px] text-slate-400 mt-1">Vehicle: KL-09-AH-4122 • Destination: Kakkanad, Kochi (36 WPC Doors)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 10. EMPLOYEES VIEW
 * ------------------------------------------------------------- */
export function EmployeesView() {
  const employees = [
    { name: 'Nazer Karumban', role: 'Plant & Operations Director', dept: 'Executive & Strategy', phone: '+91 94470 12000' },
    { name: 'Rajesh P.', role: 'FRP Hydraulic Press Lead', dept: 'Production Line 1', phone: '+91 98471 44551' },
    { name: 'Binu Kumar', role: 'WPC Extrusion Specialist', dept: 'Production Line 2', phone: '+91 97450 66772' },
    { name: 'Faizal Rahman', role: '5-Axis CNC & CAD/CAM Lead', dept: 'CNC Routing', phone: '+91 99951 88990' },
    { name: 'Deepa V.', role: 'Quality Assurance Head', dept: 'Testing & QA', phone: '+91 94002 33441' },
    { name: 'Anoop Krishnan', role: 'Senior Site Measurement Eng.', dept: 'Field Operations', phone: '+91 94463 55667' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-red-500" />
            Factory Staff & Field Engineers Roster
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Factory technicians, CNC programmers, QC inspectors and site measurement supervisors
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp, i) => (
          <div key={i} className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-red-500">
                {emp.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</h4>
                <p className="text-xs text-red-500 font-medium">{emp.role}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex justify-between">
              <span>{emp.dept}</span>
              <span>{emp.phone}</span>
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-red-500" />
            Dispatch Logistics & Site Installation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated delivery fleet covering all 14 Kerala districts from Palakkad / Calicut plant
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold uppercase text-red-500">Route 1: Malabar Region</span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Palakkad &rarr; Malappuram &rarr; Kozhikode &rarr; Kannur</h3>
          <p className="text-xs text-slate-400">Truck KL-09-AW-8210 • 48 Door Units loaded • Departed 08:30 AM</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-500 font-semibold">En Route to Calicut</span>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold uppercase text-red-500">Route 2: Central Kerala</span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Palakkad &rarr; Thrissur &rarr; Ernakulam / Kochi</h3>
          <p className="text-xs text-slate-400">Truck KL-09-AH-4122 • 36 Bathroom Doors • Delivery Kakkanad Site</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-500 font-semibold">Delivered at Kakkanad</span>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold uppercase text-red-500">Route 3: South Kerala</span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Palakkad &rarr; Alappuzha &rarr; Kollam &rarr; Trivandrum</h3>
          <p className="text-xs text-slate-400">Truck KL-09-BK-1102 • 28 Custom Main Doors • Loading in Progress</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-500 font-semibold">Loading at Bay 3</span>
        </div>
      </div>
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-red-500" />
            Executive Business Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            FRP vs WPC manufacturing margins, dealer sales ranking and district growth
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs text-slate-400">Gross Production Margin</span>
          <p className="text-2xl font-bold text-emerald-500">32.4%</p>
          <p className="text-xs text-slate-400">Higher margin on CNC custom carved FRP doors</p>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs text-slate-400">Zero-Defect QA Pass Rate</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">99.2%</p>
          <p className="text-xs text-slate-400">Only 4 doors sent for re-polish this month</p>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs text-slate-400">Top Growth District</span>
          <p className="text-2xl font-bold text-red-500">Ernakulam (+24%)</p>
          <p className="text-xs text-slate-400">High demand in Kakkanad & Marine Drive apartments</p>
        </div>
      </div>
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
