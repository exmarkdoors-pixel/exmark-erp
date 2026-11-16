'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
  Ruler,
  Paintbrush,
  PackageCheck,
  Truck,
  Phone,
  MessageSquare,
  QrCode,
  FileCheck,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CreditCard,
  Lock,
} from 'lucide-react';
import type { SanitizedCustomerOrderStatus, SanitizedCustomerDoor } from '@/lib/services/orderStatusService';

export default function CustomerOrderStatusPage() {
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';

  const [data, setData] = useState<SanitizedCustomerOrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterHanding, setFilterHanding] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'DOORS' | 'FINANCIALS' | 'DELIVERY'>('DOORS');

  useEffect(() => {
    if (!orderId) return;
    setIsLoading(true);
    fetch(`/api/order-status/${encodeURIComponent(orderId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || 'Order record not found');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to factory server');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Retrieving Order Status...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting directly to EXMARK Doors Kerala production system</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Order Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          {error || `We could not locate an active project with reference "${orderId}".`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="tel:+919447928866"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Call Factory Helpline</span>
          </a>
          <a
            href="https://wa.me/919447928866"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Helpline</span>
          </a>
        </div>
      </div>
    );
  }

  // Filter doors
  const filteredDoors = data.doors.filter((door) => {
    const matchesSearch =
      door.doorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      door.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      door.finishColor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      door.doorId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHanding = filterHanding === 'ALL' || door.handing === filterHanding;
    return matchesSearch && matchesHanding;
  });

  const getMilestoneIcon = (key: string) => {
    switch (key) {
      case 'CONFIRMED':
        return <FileCheck className="w-4 h-4" />;
      case 'MOLDING':
        return <Layers className="w-4 h-4" />;
      case 'SIZING_QC':
        return <Ruler className="w-4 h-4" />;
      case 'PU_COATING':
        return <Paintbrush className="w-4 h-4" />;
      case 'PACKAGING':
        return <PackageCheck className="w-4 h-4" />;
      case 'DELIVERY':
        return <Truck className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusBadgeColor = (status: SanitizedCustomerOrderStatus['overallStatus']) => {
    switch (status) {
      case 'DELIVERED_INSTALLED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'DISPATCHED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'READY_TO_DISPATCH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'IN_PRODUCTION':
      default:
        return 'bg-red-500/20 text-red-300 border-red-500/40';
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello EXMARK Doors, inquiring about my Order #${data.jobCardNumber} for ${data.customerName}.`
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* ================= TOP BRANDING NAVBAR ================= */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-900/40 border border-red-400/30">
              EX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wide text-white text-sm sm:text-base">EXMARK DOORS</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-800 text-red-300">
                  ISO 9001:2015
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Kerala Architectural FRP &amp; Composite Systems</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Print Order Summary"
            >
              <Printer className="w-4 h-4" />
            </button>
            <a
              href={`https://wa.me/${data.helpline.whatsapp}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Help</span>
            </a>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ================= HERO PROJECT SUMMARY CARD ================= */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-900/70 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-wrap items-start justify-between gap-4 relative z-10 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Tracking</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono font-bold text-red-400">{data.jobCardNumber}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{data.customerName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {data.siteName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Ordered: {data.orderDate}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black tracking-wide ${getStatusBadgeColor(data.overallStatus)}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>{data.overallStatusLabel.toUpperCase()}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Total Doors: <strong className="text-white">{data.quantity} Nos</strong>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs relative z-10">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Overall Progress</span>
              <span className="text-lg font-black text-white">{data.progressPercent}%</span>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Target Delivery</span>
              <span className="text-sm font-bold text-white truncate block">
                {data.targetDeliveryDate ? data.targetDeliveryDate : 'In Schedule'}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                {data.daysRemaining !== null && data.daysRemaining !== undefined
                  ? data.daysRemaining > 0
                    ? `⏱️ In ${data.daysRemaining} Days`
                    : data.daysRemaining === 0
                    ? '🚚 Arriving Today'
                    : 'Dispatched'
                  : 'On Production Schedule'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Installation</span>
              <span className="text-sm font-bold text-white block">
                {data.includeInstallation ? 'Site Installation' : 'Supply Only'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {data.includeInstallation ? 'EXMARK Crew Fitting' : 'Factory Protective Pack'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Payment Status</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {data.financialSummary.advanceVerified ? 'Advance Verified' : 'Pending'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Bal: ₹{data.financialSummary.balanceDue.toLocaleString('en-IN')} on delivery
              </span>
            </div>
          </div>
        </section>

        {/* ================= VISUAL 6-STAGE MILESTONE STEPPER ================= */}
        <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                Factory Production Pipeline
              </h2>
              <p className="text-[11px] text-slate-400">Live milestones from raw FRP layup to site delivery</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-800/60 text-red-300 font-mono text-[10px] font-bold">
              {data.currentStageName}
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {data.milestones.map((m, idx) => (
              <div key={m.key} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                    m.isCompleted
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                      : m.isCurrent
                      ? 'bg-red-600 text-white ring-4 ring-red-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {m.isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    getMilestoneIcon(m.key)
                  )}
                </div>

                <div className="ml-3 sm:ml-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        m.isCurrent
                          ? 'text-red-400'
                          : m.isCompleted
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {idx + 1}. {m.name}
                    </span>
                    {m.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-600/20 text-red-300 border border-red-500/30">
                        Current Stage
                      </span>
                    )}
                    {m.completedAt && (
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">
                        {new Date(m.completedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION TABS ================= */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('DOORS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'DOORS'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Door Schedule ({data.doors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FINANCIALS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'FINANCIALS'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment &amp; Balance</span>
          </button>

          <button
            onClick={() => setActiveTab('DELIVERY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'DELIVERY'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Delivery &amp; Site</span>
          </button>
        </div>

        {/* ================= TAB 1: DOOR SCHEDULE ================= */}
        {activeTab === 'DOORS' && (
          <section className="space-y-3">
            {/* Filter / Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search door number, model, color..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">Handing:</span>
                <select
                  value={filterHanding}
                  onChange={(e) => setFilterHanding(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="ALL">All (LH &amp; RH)</option>
                  <option value="RH">Right Hand (RH)</option>
                  <option value="LH">Left Hand (LH)</option>
                </select>
              </div>
            </div>

            {/* Door Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDoors.map((door) => (
                <div
                  key={door.doorId}
                  className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition relative overflow-hidden group shadow-sm"
                >
                  {/* Top Bar: Door # and Model */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-block px-2 py-0.5 rounded bg-red-600/10 border border-red-500/20 text-red-400 font-mono font-bold text-xs mb-1">
                        {door.doorNumber}
                      </div>
                      <h3 className="font-bold text-sm text-white group-hover:text-red-400 transition">{door.model}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        door.qcStatus === 'PASSED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {door.qcStatus === 'PASSED' ? 'QC Passed ✓' : 'In Production'}
                    </span>
                  </div>

                  {/* Dimension & Finish Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Size (H × W)</span>
                      <strong className="text-slate-200">
                        {door.finishedHeightCm} × {door.finishedWidthCm} cm
                      </strong>
                      <span className="text-[10px] text-slate-400 block font-mono">({door.finishedSizeInches})</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Finish &amp; Color</span>
                      <strong className="text-slate-200 truncate block" title={door.finishColor}>
                        {door.finishColor}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Handing / Swing</span>
                      <strong className="text-slate-200">{door.handing === 'RH' ? 'Right Hand (RH)' : 'Left Hand (LH)'}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Lock Pocket</span>
                      <strong className="text-slate-200 truncate block" title={door.lockType}>
                        {door.lockType}
                      </strong>
                    </div>
                  </div>

                  {/* Genuine Certificate QR Button */}
                  {door.trackingUrl && door.trackingUrl !== '#' && (
                    <a
                      href={door.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-red-400" />
                      <span>View Genuine Certificate QR</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {filteredDoors.length === 0 && (
              <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                No doors matched your search criteria.
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 2: FINANCIAL SUMMARY ================= */}
        {activeTab === 'FINANCIALS' && (
          <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-md space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Customer Account &amp; Payment Summary
              </h2>
              <p className="text-[11px] text-slate-400">Official order accounting and delivery settlement statement</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Total Project Value</span>
                <span className="text-2xl font-black text-white">
                  ₹{data.financialSummary.totalAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Inclusive of GST &amp; Hardware</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Advance Received</span>
                <span className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                  ₹{data.financialSummary.advanceAmount.toLocaleString('en-IN')}
                  {data.financialSummary.advanceVerified && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1 font-semibold">
                  Verified with Bank / Cash Counter ✓
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Balance Due on Delivery</span>
                <span className="text-2xl font-black text-amber-400">
                  ₹{data.financialSummary.balanceDue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-amber-400/80 block mt-1 font-semibold">
                  Payable on site or before dispatch
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Payment Guidelines &amp; Accepted Modes
              </h4>
              <p className="text-slate-400 leading-relaxed">{data.financialSummary.paymentAdvice}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">✓ Instant UPI (Google Pay, PhonePe, Paytm)</span>
                <span className="flex items-center gap-1">✓ NEFT / RTGS to Factory Account</span>
                <span className="flex items-center gap-1">✓ Cash against Official Receipt</span>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 3: DELIVERY & SITE INFO ================= */}
        {activeTab === 'DELIVERY' && (
          <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-md space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                Delivery Logistics &amp; Site Installation
              </h2>
              <p className="text-[11px] text-slate-400">Dispatch route, site readiness, and technical fitting details</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 text-[11px] uppercase font-bold block">Delivery Destination</span>
                <h3 className="font-bold text-sm text-white">{data.siteName}</h3>
                <p className="text-slate-400">{data.district}, Kerala</p>
                <div className="pt-2 text-[11px] text-slate-400">
                  Target Date:{' '}
                  <strong className="text-white">
                    {data.targetDeliveryDate ? data.targetDeliveryDate : 'Within standard lead time'}
                  </strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 text-[11px] uppercase font-bold block">Installation Support</span>
                <h3 className="font-bold text-sm text-white">
                  {data.includeInstallation ? 'Factory Fitting Included' : 'Supply Only'}
                </h3>
                <p className="text-slate-400 leading-relaxed">{data.deliveryInfo.installationNote}</p>
              </div>
            </div>

            {data.deliveryInfo.vehicleNumber && (
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <Truck className="w-4 h-4" />
                  Vehicle Dispatched: {data.deliveryInfo.vehicleNumber}
                </div>
                {data.deliveryInfo.driverName && (
                  <p className="text-slate-300">
                    Driver / In-charge: <strong>{data.deliveryInfo.driverName}</strong>
                    {data.deliveryInfo.driverPhone && (
                      <a
                        href={`tel:${data.deliveryInfo.driverPhone}`}
                        className="ml-2 text-blue-400 underline font-bold"
                      >
                        Call Driver ({data.deliveryInfo.driverPhone})
                      </a>
                    )}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ================= BOTTOM FACTORY CONTACT FOOTER ================= */}
        <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 sm:p-6 text-center space-y-3">
          <h3 className="text-sm font-bold text-white">Need help or want to schedule site delivery?</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Our customer relations and factory dispatch desk are available Monday to Saturday, 8:30 AM to 6:30 PM.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <a
              href={`tel:${data.helpline.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call Factory Desk ({data.helpline.phoneDisplay})</span>
            </a>

            <a
              href={`https://wa.me/${data.helpline.whatsapp}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
          <p className="text-[10px] text-slate-500 pt-2">
            EXMARK FRP DOORS • ISO 9001:2015 Registered • All composite materials certified 100% water &amp; termite proof
          </p>
        </section>
      </main>
    </div>
  );
}
