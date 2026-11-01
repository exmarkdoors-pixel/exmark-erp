'use client';

import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  UserCheck,
  Search,
  Plus,
  Filter,
  ShieldCheck,
  Sparkles,
  QrCode,
  Ruler,
  AlertTriangle,
  Award,
  Calendar,
  Lock,
  Printer
} from 'lucide-react';

export interface SiteSnagItem {
  id: string;
  description: string;
  isResolved: boolean;
  category: 'FRAME_GAP' | 'LOCK_ALIGNMENT' | 'SURFACE_SCRATCH' | 'HINGE_CREAK';
}

export interface SiteInstallationOrder {
  id: string; // e.g. INS-2026-061
  orderRef: string; // e.g. SO-2026-101
  clientName: string;
  phone: string;
  siteAddress: string;
  district: string;
  doorsCount: number;
  leadCarpenter: string;
  carpenterPhone: string;
  scheduleDate: string;
  status: 'SCHEDULED' | 'IN_FITTING' | 'SNAG_REVIEW' | 'CUSTOMER_SIGNOFF';
  masonryCheckPassed: boolean;
  snags: SiteSnagItem[];
  customerOtpVerified: boolean;
  warrantyActivated: boolean;
  customerFeedbackScore: number; // 1 to 5 stars
  notes: string;
}

const SEED_INSTALLATIONS: SiteInstallationOrder[] = [
  {
    id: 'INS-2026-091',
    orderRef: 'SO-2026-101',
    clientName: 'Er. Jacob Roy (Roy Architects Villa)',
    phone: '+91 98470 11223',
    siteAddress: 'Villa #14, Skyline Meadows, Edappally',
    district: 'Ernakulam',
    doorsCount: 10,
    leadCarpenter: 'Babu Master (Master Carpenter)',
    carpenterPhone: '+91 94471 22334',
    scheduleDate: '01 Nov 2026',
    status: 'SNAG_REVIEW',
    masonryCheckPassed: true,
    customerOtpVerified: false,
    warrantyActivated: false,
    customerFeedbackScore: 5,
    notes: '9 doors fitted perfectly with magnetic catches. 1 bathroom door lock strike plate adjusted.',
    snags: [
      { id: 'SNG-01', description: 'Master Bed Door: Adjust lock strike plate rebate 1mm for smooth latching', isResolved: true, category: 'LOCK_ALIGNMENT' },
      { id: 'SNG-02', description: 'Guest Bed Door: Check top gap perimeter (currently 2.5mm, target 3mm)', isResolved: true, category: 'FRAME_GAP' },
      { id: 'SNG-03', description: 'Remove protective plastic peel after final painting team leaves', isResolved: false, category: 'SURFACE_SCRATCH' },
    ],
  },
  {
    id: 'INS-2026-092',
    orderRef: 'SO-2026-102',
    clientName: 'Dr. Anita Menon (Menon Residence)',
    phone: '+91 94470 88990',
    siteAddress: 'Menon Bungalow, Chevayur',
    district: 'Kozhikode',
    doorsCount: 6,
    leadCarpenter: 'Chandran C. (Senior Tech)',
    carpenterPhone: '+91 98462 77889',
    scheduleDate: '02 Nov 2026',
    status: 'SCHEDULED',
    masonryCheckPassed: true,
    customerOtpVerified: false,
    warrantyActivated: false,
    customerFeedbackScore: 0,
    notes: 'Site plastering completed. WPC frame rebate checked against Site Measurement Book.',
    snags: [],
  },
  {
    id: 'INS-2026-093',
    orderRef: 'SO-2026-098',
    clientName: 'Kochi Luxury Villas Pvt Ltd',
    phone: '+91 98460 11223',
    siteAddress: 'Plot 4, Kakkanad Infopark Road',
    district: 'Ernakulam',
    doorsCount: 18,
    leadCarpenter: 'Sasi Kumar',
    carpenterPhone: '+91 94475 66778',
    scheduleDate: '29 Oct 2026',
    status: 'CUSTOMER_SIGNOFF',
    masonryCheckPassed: true,
    customerOtpVerified: true,
    warrantyActivated: true,
    customerFeedbackScore: 5,
    notes: '100% completed. Customer verified OTP #8921. 15-Year FRP Material Warranty issued.',
    snags: [
      { id: 'SNG-11', description: 'Balcony door threshold bottom sweep weather seal fitted', isResolved: true, category: 'FRAME_GAP' },
    ],
  },
];

export default function SiteInstallationHub() {
  const [installations, setInstallations] = useState<SiteInstallationOrder[]>(SEED_INSTALLATIONS);
  const [selectedInst, setSelectedInst] = useState<SiteInstallationOrder>(SEED_INSTALLATIONS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // New installation state
  const [newOrderRef, setNewOrderRef] = useState('SO-2026-105');
  const [newClientName, setNewClientName] = useState('');
  const [newPhone, setNewPhone] = useState('+91 ');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newDistrict, setNewDistrict] = useState('Ernakulam');
  const [newDoorsCount, setNewDoorsCount] = useState(8);
  const [newCarpenter, setNewCarpenter] = useState('Babu Master');
  const [newCarpenterPhone, setNewCarpenterPhone] = useState('+91 94471 22334');

  // Filter
  const filteredInst = installations.filter((i) => {
    const matchSearch =
      i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.siteAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // KPIs
  const totalFittedDoors = installations.reduce((sum, i) => sum + i.doorsCount, 0);
  const pendingSnagsCount = installations.reduce(
    (sum, i) => sum + i.snags.filter((s) => !s.isResolved).length,
    0
  );
  const activeSignoffs = installations.filter((i) => i.status === 'CUSTOMER_SIGNOFF').length;

  const toggleSnagResolution = (snagId: string) => {
    const updatedSnags = selectedInst.snags.map((s) =>
      s.id === snagId ? { ...s, isResolved: !s.isResolved } : s
    );
    const updatedInst = { ...selectedInst, snags: updatedSnags };
    setSelectedInst(updatedInst);
    setInstallations(installations.map((i) => (i.id === updatedInst.id ? updatedInst : i)));
  };

  const handleVerifyOtpAndActivateWarranty = () => {
    const updatedInst: SiteInstallationOrder = {
      ...selectedInst,
      customerOtpVerified: true,
      warrantyActivated: true,
      status: 'CUSTOMER_SIGNOFF',
    };
    setSelectedInst(updatedInst);
    setInstallations(installations.map((i) => (i.id === updatedInst.id ? updatedInst : i)));
    alert(`Customer OTP verified successfully! 15-Year EXMARK FRP Material Warranty certificate activated for ${selectedInst.clientName}.`);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newInst: SiteInstallationOrder = {
      id: `INS-2026-${Date.now().toString().slice(-3)}`,
      orderRef: newOrderRef,
      clientName: newClientName,
      phone: newPhone,
      siteAddress: newSiteAddress,
      district: newDistrict,
      doorsCount: Number(newDoorsCount),
      leadCarpenter: newCarpenter,
      carpenterPhone: newCarpenterPhone,
      scheduleDate: 'Tomorrow 09:30 AM',
      status: 'SCHEDULED',
      masonryCheckPassed: true,
      customerOtpVerified: false,
      warrantyActivated: false,
      customerFeedbackScore: 5,
      notes: 'Site installation allocated with heavy stainless hinge screws & magnetic floor stops.',
      snags: [],
    };

    setInstallations([newInst, ...installations]);
    setSelectedInst(newInst);
    setIsNewOrderModalOpen(false);
    setNewClientName('');
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0E2835] to-[#070D1E] border border-cyan-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Site Installation & Field Punch List
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Dynamics 365 Field Service Benchmark
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                സൈറ്റ് ഫിറ്റിംഗ് & സർവീസ് • Field carpenter allocation, snag punch list & 15-Year Warranty customer OTP sign-off
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            + Schedule Site Fitting
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doors Under Installation</span>
            <ClipboardCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-cyan-300">{totalFittedDoors} Units</div>
          <p className="text-xs text-slate-400 mt-1">Across Kerala job sites</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Snag List Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">{pendingSnagsCount} Pending</div>
          <p className="text-xs text-amber-400/80 mt-1">Punch list clearance in progress</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer OTP Sign-Offs</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{activeSignoffs} Completed</div>
          <p className="text-xs text-emerald-400/80 mt-1">15-Year Warranty Activated</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fitment Rating</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-300">5.0 / 5.0 ★</div>
          <p className="text-xs text-slate-400 mt-1">Architect & Client Satisfaction</p>
        </div>
      </div>

      {/* Main Split: Left Site Orders, Right Snag List & Handover Sign-off */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0B132B]/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Site Fitting Schedule ({filteredInst.length})
              </h2>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search client, site, or order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredInst.map((inst) => {
                const isSelected = selectedInst.id === inst.id;
                return (
                  <div
                    key={inst.id}
                    onClick={() => setSelectedInst(inst)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-900/20'
                        : 'bg-[#070D1E]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#070D1E]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {inst.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{inst.orderRef}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{inst.clientName}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{inst.siteAddress} ({inst.district})</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          inst.status === 'CUSTOMER_SIGNOFF'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : inst.status === 'SNAG_REVIEW'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>Doors: {inst.doorsCount} Sets</span>
                      <span>Lead: {inst.leadCarpenter}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Selected Site Detail & Digital Punch List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0B132B]/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {selectedInst.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Order {selectedInst.orderRef}</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      selectedInst.warrantyActivated
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {selectedInst.warrantyActivated ? '15-Year Warranty Active' : 'Fitting in Progress'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5">{selectedInst.clientName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedInst.siteAddress} • Phone: {selectedInst.phone}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Installation Handover Sheet printed for ${selectedInst.clientName}.`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  Print Handover Sheet
                </button>
              </div>
            </div>

            {/* Carpenter Team & Schedule */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#070D1E]/80 border border-slate-800/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Lead Master Carpenter</span>
                <p className="font-bold text-white mt-0.5">{selectedInst.leadCarpenter}</p>
                <span className="text-[10px] text-slate-500">{selectedInst.carpenterPhone}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Installation Date</span>
                <p className="font-bold text-cyan-300 mt-0.5">{selectedInst.scheduleDate}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Masonry Opening Check</span>
                <p className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 4-Point Plumb Verified
                </p>
              </div>
            </div>

            {/* Digital Snag Punch List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-cyan-400" />
                  Site Snagging & Quality Punch List ({selectedInst.snags.length} Items)
                </h3>
                <span className="text-[11px] text-slate-400">Click to toggle resolved</span>
              </div>

              {selectedInst.snags.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#070D1E] border border-slate-800 text-center text-xs text-slate-400">
                  Zero snags reported. Site doors fit with precision tolerances.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedInst.snags.map((snag) => (
                    <div
                      key={snag.id}
                      onClick={() => toggleSnagResolution(snag.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        snag.isResolved
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-amber-950/20 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {snag.isResolved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`font-semibold ${snag.isResolved ? 'line-through text-slate-400' : 'text-white'}`}>
                            {snag.description}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500">{snag.category}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          snag.isResolved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {snag.isResolved ? 'RESOLVED' : 'PENDING'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Handover OTP Verification & 15-Year Warranty Activation Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0E2835] via-[#0B132B] to-[#070D1E] border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Customer Handover Sign-off & 15-Year Material Warranty
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Requires on-site homeowner / architect OTP confirmation
                  </p>
                </div>

                {selectedInst.warrantyActivated ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certificate Issued
                  </span>
                ) : (
                  <button
                    onClick={handleVerifyOtpAndActivateWarranty}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
                  >
                    Verify Client OTP & Activate Warranty
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Installation Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B132B] border border-cyan-500/40 p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Schedule Site Fitting Order</h3>
                  <p className="text-xs text-slate-400">സൈറ്റ് ഇൻസ്റ്റലേഷൻ ഷെഡ്യൂൾ ചെയ്യുക</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Sales / Work Order Ref</label>
                  <input
                    type="text"
                    required
                    value={newOrderRef}
                    onChange={(e) => setNewOrderRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Total Doors to Fit</label>
                  <input
                    type="number"
                    value={newDoorsCount}
                    onChange={(e) => setNewDoorsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Customer / Architect Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Er. Jacob Roy"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Site Address & Villa Landmark</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline Meadows, Edappally"
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">District</label>
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  >
                    <option value="Ernakulam">Ernakulam</option>
                    <option value="Kozhikode">Kozhikode</option>
                    <option value="Malappuram">Malappuram</option>
                    <option value="Thrissur">Thrissur</option>
                    <option value="Trivandrum">Trivandrum</option>
                    <option value="Kottayam">Kottayam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Lead Master Carpenter</label>
                  <input
                    type="text"
                    value={newCarpenter}
                    onChange={(e) => setNewCarpenter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Carpenter Mobile #</label>
                  <input
                    type="text"
                    value={newCarpenterPhone}
                    onChange={(e) => setNewCarpenterPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30"
                >
                  Confirm Fitting Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
