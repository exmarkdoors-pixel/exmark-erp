'use client';

import React, { useState } from 'react';
import {
  Ticket,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Filter,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Printer,
  Sparkles
} from 'lucide-react';

export type GatePassType = 'NRGP_OUTWARD' | 'RGP_OUTWARD' | 'INWARD_MATERIAL';

export interface GatePassRecord {
  id: string; // e.g. GP-2026-112
  passType: GatePassType;
  passTypeLabel: string;
  vehicleNo: string; // e.g. KL-09-AB-4451
  driverName: string;
  driverPhone: string;
  destinationOrParty: string;
  materialManifest: string;
  unitsCount: number;
  invoiceOrRef: string;
  eWayBillNo?: string;
  securityGuardName: string;
  issuedTimestamp: string;
  returnDueTimestamp?: string;
  status: 'GATE_CLEARED' | 'LOADING_BAY' | 'PENDING_RETURN' | 'CLOSED';
  notes: string;
}

const SEED_GATE_PASSES: GatePassRecord[] = [
  {
    id: 'GP-2026-101',
    passType: 'NRGP_OUTWARD',
    passTypeLabel: 'Non-Returnable (Commercial Dispatch)',
    vehicleNo: 'KL-09-BK-8821 (Tata 407)',
    driverName: 'Muhammed Shafi',
    driverPhone: '+91 94471 88992',
    destinationOrParty: 'Kochi Luxury Villas Pvt Ltd (Edappally Site)',
    materialManifest: '10 Sets Royal Teak FRP Molded Doors + 10 Sets WPC Frames',
    unitsCount: 20,
    invoiceOrRef: 'INV-2026-101',
    eWayBillNo: '321894451201',
    securityGuardName: 'Gopinathan (Main Gate A)',
    issuedTimestamp: '01 Nov 2026 14:30',
    status: 'GATE_CLEARED',
    notes: 'Commercial delivery with verified e-Way bill and strapped corner protectors.',
  },
  {
    id: 'GP-2026-102',
    passType: 'RGP_OUTWARD',
    passTypeLabel: 'Returnable Gate Pass (Tools / Pallets)',
    vehicleNo: 'KL-08-CC-2219 (Mahindra Bolero)',
    driverName: 'Santhosh Kumar',
    driverPhone: '+91 98460 33441',
    destinationOrParty: 'St. Jude Toughened Glass Works (Aluva)',
    materialManifest: '6 Heavy Steel Heavy-Duty Door Stacking Pallets (Exmark Fab)',
    unitsCount: 6,
    invoiceOrRef: 'JW-2026-081',
    securityGuardName: 'Gopinathan (Main Gate A)',
    issuedTimestamp: '01 Nov 2026 11:15',
    returnDueTimestamp: '06 Nov 2026',
    status: 'PENDING_RETURN',
    notes: 'Returnable steel transport cradles. Must be returned with glass-fitted doors.',
  },
  {
    id: 'GP-2026-103',
    passType: 'INWARD_MATERIAL',
    passTypeLabel: 'Inward Raw Material Receipt',
    vehicleNo: 'KL-07-CD-4421 (Chemical Tanker)',
    driverName: 'Ramesh Babu',
    driverPhone: '+91 98472 55667',
    destinationOrParty: 'Kalyan Polymers & Resins Ltd',
    materialManifest: 'Bulk Unsaturated Isophthalic Resin (12,000 Litres)',
    unitsCount: 1,
    invoiceOrRef: 'PO-2026-055',
    securityGuardName: 'Vijayan Pillai (Gate B)',
    issuedTimestamp: '01 Nov 2026 09:40',
    status: 'GATE_CLEARED',
    notes: 'Chemical lot sampled by QC and pumped into Silo #2.',
  },
];

export default function GatePassHub() {
  const [gatePasses, setGatePasses] = useState<GatePassRecord[]>(SEED_GATE_PASSES);
  const [selectedPass, setSelectedPass] = useState<GatePassRecord>(SEED_GATE_PASSES[0]);
  const [typeFilter, setTypeFilter] = useState<'ALL' | GatePassType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPassModalOpen, setIsNewPassModalOpen] = useState(false);

  // New Pass state
  const [newPassType, setNewPassType] = useState<GatePassType>('NRGP_OUTWARD');
  const [newVehicleNo, setNewVehicleNo] = useState('KL-09-');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('+91 ');
  const [newParty, setNewParty] = useState('');
  const [newManifest, setNewManifest] = useState('');
  const [newUnits, setNewUnits] = useState(10);
  const [newInvoiceRef, setNewInvoiceRef] = useState('INV-2026-105');
  const [newEWayBill, setNewEWayBill] = useState('');

  // Filter
  const filteredPasses = gatePasses.filter((gp) => {
    const matchSearch =
      gp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.destinationOrParty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || gp.passType === typeFilter;
    return matchSearch && matchType;
  });

  // KPIs
  const todayOutwardTrucks = gatePasses.filter((gp) => gp.passType === 'NRGP_OUTWARD').length;
  const pendingRgpCount = gatePasses.filter((gp) => gp.passType === 'RGP_OUTWARD' && gp.status === 'PENDING_RETURN').length;
  const inwardReceipts = gatePasses.filter((gp) => gp.passType === 'INWARD_MATERIAL').length;

  const handleCreateGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleNo.trim() || !newParty.trim()) return;

    const newGp: GatePassRecord = {
      id: `GP-2026-${Date.now().toString().slice(-3)}`,
      passType: newPassType,
      passTypeLabel:
        newPassType === 'NRGP_OUTWARD'
          ? 'Non-Returnable (Commercial Dispatch)'
          : newPassType === 'RGP_OUTWARD'
          ? 'Returnable Gate Pass (Tools / Pallets)'
          : 'Inward Raw Material Receipt',
      vehicleNo: newVehicleNo,
      driverName: newDriverName || 'Plant Fleet Driver',
      driverPhone: newDriverPhone,
      destinationOrParty: newParty,
      materialManifest: newManifest || 'Custom polymer door consignment',
      unitsCount: Number(newUnits),
      invoiceOrRef: newInvoiceRef,
      eWayBillNo: newEWayBill || (newPassType === 'NRGP_OUTWARD' ? `3218944${Date.now().toString().slice(-5)}` : undefined),
      securityGuardName: 'Gopinathan (Main Gate A)',
      issuedTimestamp: 'Just now',
      returnDueTimestamp: newPassType === 'RGP_OUTWARD' ? 'In 7 days' : undefined,
      status: 'GATE_CLEARED',
      notes: 'Cleared by Security Officer with physical cargo count inspection.',
    };

    setGatePasses([newGp, ...gatePasses]);
    setSelectedPass(newGp);
    setIsNewPassModalOpen(false);
    setNewParty('');
    setNewManifest('');
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0E281E] to-[#070D1E] border border-emerald-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Gate Pass & Logistics Security (RGP / NRGP)
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SAP LE-TRA / Factory Security Standard
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                ഗേറ്റ് പാസ് & ഇ-വേ ബിൽ • Commercial delivery slips, returnable steel cradles, chemical tankers & security sign-off
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewPassModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            + Generate Gate Pass
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outward Fleet Dispatched</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{todayOutwardTrucks} Lorries</div>
          <p className="text-xs text-slate-400 mt-1">Non-Returnable (NRGP)</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Returnable Pallets Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">{pendingRgpCount} Passes</div>
          <p className="text-xs text-amber-400/80 mt-1">Steel racks with glass vendors</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inward Deliveries</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-400">{inwardReceipts} Loads</div>
          <p className="text-xs text-slate-400 mt-1">Resin tankers & roving batches</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Gatehouse</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-teal-300">Gate A & B Active</div>
          <p className="text-xs text-slate-400 mt-1">100% manifest verified</p>
        </div>
      </div>

      {/* Main Split: Left Gate Passes List, Right Official Gate Pass Paperwork */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0B132B]/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-400" />
                Gate Logbook ({filteredPasses.length})
              </h2>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-slate-300"
              >
                <option value="ALL">All Passes (NRGP / RGP / Inward)</option>
                <option value="NRGP_OUTWARD">Non-Returnable (NRGP)</option>
                <option value="RGP_OUTWARD">Returnable (RGP)</option>
                <option value="INWARD_MATERIAL">Inward Chemical / RM</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search vehicle #, driver, or party..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredPasses.map((gp) => {
                const isSelected = selectedPass.id === gp.id;
                return (
                  <div
                    key={gp.id}
                    onClick={() => setSelectedPass(gp)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-900/20'
                        : 'bg-[#070D1E]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#070D1E]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {gp.id}
                          </span>
                          <span className="text-[10px] font-mono text-white font-bold">{gp.vehicleNo}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{gp.destinationOrParty}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{gp.materialManifest}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          gp.status === 'GATE_CLEARED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {gp.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>Driver: {gp.driverName}</span>
                      <span>{gp.issuedTimestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Selected Official Gate Pass Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0B132B]/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedPass.id}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedPass.passTypeLabel}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5">{selectedPass.destinationOrParty}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Vehicle: <strong className="text-white font-mono">{selectedPass.vehicleNo}</strong> • Driver: {selectedPass.driverName} ({selectedPass.driverPhone})</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Official Gate Pass ${selectedPass.id} printed for security gate.`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Print Security Pass
                </button>
              </div>
            </div>

            {/* Official Security Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#070D1E]/80 border border-slate-800/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Security Gate Officer</span>
                <p className="font-bold text-white mt-0.5">{selectedPass.securityGuardName}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Exit / Clearance Time</span>
                <p className="font-bold text-emerald-400 mt-0.5">{selectedPass.issuedTimestamp}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Invoice / PO Reference</span>
                <p className="font-mono font-bold text-cyan-300 mt-0.5">{selectedPass.invoiceOrRef}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Kerala e-Way Bill</span>
                <p className="font-mono font-bold text-purple-300 mt-0.5">{selectedPass.eWayBillNo || 'Local / Exempt'}</p>
              </div>
            </div>

            {/* Manifest Summary */}
            <div className="p-4 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cargo & Physical Load Manifest:</span>
              <p className="text-xs text-white font-medium bg-[#0B132B] p-3 rounded-lg border border-slate-800/80">
                {selectedPass.materialManifest}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                <span>Total Physical Quantity: <strong className="text-white">{selectedPass.unitsCount} Units / Sets</strong></span>
                {selectedPass.returnDueTimestamp && (
                  <span className="text-amber-400 font-bold">Returnable Due By: {selectedPass.returnDueTimestamp}</span>
                )}
              </div>
            </div>

            {/* Security Stamp QR / Barcode Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#0B132B] to-[#070D1E] border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Security Inspection Stamp Verified</h4>
                  <p className="text-[11px] text-slate-400">Door strapping, seal integrity, and vehicle tare weight validated.</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> GATE PASS VALID
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* New Gate Pass Modal */}
      {isNewPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B132B] border border-emerald-500/40 p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Generate Factory Gate Pass</h3>
                  <p className="text-xs text-slate-400">ഫാക്ടറി ഗേറ്റ് പാസ് ഇഷ്യൂ ചെയ്യുക</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPassModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGatePass} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Pass Category</label>
                  <select
                    value={newPassType}
                    onChange={(e) => setNewPassType(e.target.value as GatePassType)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-bold"
                  >
                    <option value="NRGP_OUTWARD">Outward Non-Returnable (NRGP)</option>
                    <option value="RGP_OUTWARD">Outward Returnable (RGP)</option>
                    <option value="INWARD_MATERIAL">Inward Raw Material Receipt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Vehicle Registration #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KL-09-BK-8821"
                    value={newVehicleNo}
                    onChange={(e) => setNewVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammed Shafi"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Driver Mobile #</label>
                  <input
                    type="text"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Destination Party / Job Site / Supplier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Er. Jacob Roy Villa (Edappally) or Supplier Name"
                  value={newParty}
                  onChange={(e) => setNewParty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Cargo / Physical Load Manifest</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 10 Sets Royal Teak FRP Molded Doors + 10 Sets WPC Frames..."
                  value={newManifest}
                  onChange={(e) => setNewManifest(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={newUnits}
                    onChange={(e) => setNewUnits(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Invoice / Ref #</label>
                  <input
                    type="text"
                    value={newInvoiceRef}
                    onChange={(e) => setNewInvoiceRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#070D1E] border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">e-Way Bill #</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={newEWayBill}
                    onChange={(e) => setNewEWayBill(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#070D1E] border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPassModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                >
                  Issue Security Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
