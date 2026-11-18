'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  Repeat,
  Split,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Plus,
  Filter,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Printer
} from 'lucide-react';

export interface JobWorkChallan {
  id: string; // e.g. JW-2026-041
  challanDate: string;
  vendorName: string;
  vendorGstin: string;
  vendorDistrict: string;
  processType: 'GLASS_INSERT' | 'BRASS_INLAY' | 'PU_LACQUER' | 'ALU_POWDER_COAT';
  processLabel: string;
  itemsSummary: string;
  quantityDoors: number;
  taxableMaterialValue: number;
  expectedReturnDate: string;
  daysRemainingSection143: number; // 365 days statutory deadline
  status: 'SENT_TO_VENDOR' | 'IN_PROCESSING' | 'RETURNED_RECEIVED' | 'INSPECTION_PENDING';
  jobCharges: number;
  eWayBillNo?: string;
  notes: string;
}

const SEED_JOB_WORKS: JobWorkChallan[] = [
  {
    id: 'JW-2026-081',
    challanDate: '28 Oct 2026',
    vendorName: 'St. Jude Toughened Glass & Etching Works',
    vendorGstin: '',
    vendorDistrict: 'Aluva, Ernakulam',
    processType: 'GLASS_INSERT',
    processLabel: '8mm Frosted & Beveled Decorative Glass Insert',
    itemsSummary: '12 Sets WPC Hybrid Living Room Doors with Center Oval Cutout',
    quantityDoors: 12,
    taxableMaterialValue: 84000,
    expectedReturnDate: '06 Nov 2026',
    daysRemainingSection143: 360,
    status: 'IN_PROCESSING',
    jobCharges: 16800,
    eWayBillNo: 'WB-2026-1201',
    notes: 'Beveled floral etching design #FL-4. Silicone sealed water-tight edge.',
  },
  {
    id: 'JW-2026-082',
    challanDate: '24 Oct 2026',
    vendorName: 'Malabar Brass CNC Carving & Inlays',
    vendorGstin: '',
    vendorDistrict: 'Kottakkal, Malappuram',
    processType: 'BRASS_INLAY',
    processLabel: 'Antique Brass Strip & Nilavilakku CNC Routing Inlay',
    itemsSummary: '4 Sets Royal Heritage FRP Teak Main Villa Doors',
    quantityDoors: 4,
    taxableMaterialValue: 48000,
    expectedReturnDate: '02 Nov 2026',
    daysRemainingSection143: 356,
    status: 'SENT_TO_VENDOR',
    jobCharges: 12400,
    eWayBillNo: 'WB-2026-1244',
    notes: 'Solid 3mm solid brass inlay strip with dual protective clear coat.',
  },
  {
    id: 'JW-2026-083',
    challanDate: '15 Oct 2026',
    vendorName: 'Cochin Precision Powder Coaters',
    vendorGstin: '',
    vendorDistrict: 'Kalamassery, Ernakulam',
    processType: 'ALU_POWDER_COAT',
    processLabel: 'Matte Charcoal Grey 80 Micron Powder Coating',
    itemsSummary: '24 Sets Heavy Extruded Aluminum Weather Sub-Frames',
    quantityDoors: 24,
    taxableMaterialValue: 56000,
    expectedReturnDate: '22 Oct 2026',
    daysRemainingSection143: 348,
    status: 'RETURNED_RECEIVED',
    jobCharges: 9600,
    eWayBillNo: 'WB-2026-0912',
    notes: 'Completed, inspected by plant QC and verified adhesion cross-hatch test.',
  },
];

export default function SubcontractingHub() {
  const [challans, setChallans] = useState<JobWorkChallan[]>([]);
  const [selectedChallan, setSelectedChallan] = useState<JobWorkChallan | null>(null);

  useEffect(() => {
    apiFetch('/api/job-work')
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setChallans(json.data);
          if (json.data.length > 0) setSelectedChallan(json.data[0]);
        }
      })
      .catch(() => {});
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);

  // New challan form state
  const [newVendor, setNewVendor] = useState('');
  const [newVendorDistrict, setNewVendorDistrict] = useState('Ernakulam');
  const [newProcess, setNewProcess] = useState<JobWorkChallan['processType']>('GLASS_INSERT');
  const [newSummary, setNewSummary] = useState('');
  const [newQty, setNewQty] = useState(6);
  const [newMaterialVal, setNewMaterialVal] = useState(42000);
  const [newJobCharges, setNewJobCharges] = useState(8400);

  // Filter
  const filteredChallans = challans.filter((c) => {
    const matchSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.itemsSummary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // KPIs
  const totalOutsourceDoors = challans
    .filter((c) => c.status !== 'RETURNED_RECEIVED')
    .reduce((sum, c) => sum + c.quantityDoors, 0);

  const totalOutsourceValue = challans
    .filter((c) => c.status !== 'RETURNED_RECEIVED')
    .reduce((sum, c) => sum + c.taxableMaterialValue, 0);

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSummary.trim()) return;

    try {
      const res = await apiFetch('/api/job-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: newVendor,
          vendorDistrict: newVendorDistrict,
          processType: newProcess,
          itemsSummary: newSummary,
          quantityDoors: Number(newQty),
          taxableMaterialValue: Number(newMaterialVal),
          jobCharges: Number(newJobCharges),
          notes: 'Outward Delivery Challan for outsourced finishing / assembly return tracking (Non-GST).',
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json.data) {
        setChallans((prev) => [json.data, ...prev]);
        setSelectedChallan(json.data);
      }
    } catch {
      // Non-fatal
    }
    setIsChallanModalOpen(false);
    setNewSummary('');
  };

  return (
    <div className="space-y-3 text-slate-200">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#0B132B] border border-indigo-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <Repeat className="w-4 h-4 text-indigo-400 shrink-0" />
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
            Subcontracting &amp; Job Work Challans
          </h1>
          <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Outwork
          </span>
        </div>

        <button
          onClick={() => setIsChallanModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Outward Challan
        </button>
      </div>

      {/* Compact KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="px-3 py-2 rounded-xl bg-[#0B132B]/80 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Doors at Outsource</span>
            <Package className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-0.5 text-lg font-black text-indigo-300 leading-tight">{totalOutsourceDoors} Units</div>
          <p className="text-[10px] text-indigo-400/80">Glass &amp; Brass CNC</p>
        </div>

        <div className="px-3 py-2 rounded-xl bg-[#0B132B]/80 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Outsource Value</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-0.5 text-lg font-black text-emerald-400 leading-tight">₹{totalOutsourceValue.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400">Dispatched value</p>
        </div>

        <div className="px-3 py-2 rounded-xl bg-[#0B132B]/80 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Return Window</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-0.5 text-lg font-black text-white leading-tight">365 Days</div>
          <p className="text-[10px] text-slate-400">Returnable challan</p>
        </div>

        <div className="px-3 py-2 rounded-xl bg-[#0B132B]/80 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Challan Control</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-0.5 text-lg font-black text-teal-400 leading-tight">100% Verified</div>
          <p className="text-[10px] text-teal-400/80">Active tracking</p>
        </div>
      </div>

      {/* Main Split: Left Challans List, Right Delivery Challan Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0B132B]/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Delivery Challans ({filteredChallans.length})
              </h2>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search vendor or challan #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredChallans.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No outward job work challans created yet.
                </div>
              ) : (
                filteredChallans.map((ch) => {
                const isSelected = selectedChallan?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChallan(ch)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-900/20'
                        : 'bg-[#070D1E]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#070D1E]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {ch.id}
                          </span>
                          <span className="text-[10px] text-slate-400">{ch.challanDate}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{ch.vendorName}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ch.processLabel}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ch.status === 'RETURNED_RECEIVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : ch.status === 'IN_PROCESSING'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {ch.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>Doors: {ch.quantityDoors} Units</span>
                      <span className="text-indigo-300 font-bold">₹{ch.taxableMaterialValue.toLocaleString()} Mat.</span>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Selected Challan Official View */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedChallan ? (
            <div className="p-8 rounded-2xl bg-[#0B132B]/90 border border-dashed border-slate-800 text-center space-y-2">
              <Repeat className="w-8 h-8 text-indigo-400 mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-white">No Outward Job Work Challans</h3>
              <p className="text-xs text-slate-400">
                Create an outward job work challan to track subcontracted glass inserts, brass carving, or coatings.
              </p>
            </div>
          ) : (
          <div className="p-6 rounded-2xl bg-[#0B132B]/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedChallan.id}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Outward Job Work Delivery Challan
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5">{selectedChallan.vendorName}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedChallan.vendorDistrict}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Delivery Challan ${selectedChallan.id} printed.`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  Print Challan
                </button>
              </div>
            </div>

            {/* Statutory Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#070D1E]/80 border border-slate-800/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Process Type</span>
                <p className="font-bold text-indigo-300 mt-0.5">{selectedChallan.processLabel}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Total Doors Sent</span>
                <p className="font-bold text-white mt-0.5">{selectedChallan.quantityDoors} Units</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Expected Return</span>
                <p className="font-bold text-amber-400 mt-0.5">{selectedChallan.expectedReturnDate}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Return Window</span>
                <p className="font-bold text-teal-400 mt-0.5">{selectedChallan.daysRemainingSection143} Days Left</p>
              </div>
            </div>

            {/* Material Manifest Description */}
            <div className="p-4 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Item Manifest & Technical Instructions:</span>
              <p className="text-xs text-white font-medium bg-[#0B132B] p-3 rounded-lg border border-slate-800/80">
                {selectedChallan.itemsSummary}
              </p>
              <p className="text-[11px] text-slate-400 italic mt-1">
                Note: {selectedChallan.notes}
              </p>
            </div>

            {/* Financials & Dispatch Note */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800">
                <span className="text-slate-400">Material Value:</span>
                <div className="text-base font-black text-white mt-0.5">₹{selectedChallan.taxableMaterialValue.toLocaleString()}</div>
                <span className="text-[10px] text-slate-500">Outwork dispatch item value</span>
              </div>

              <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800">
                <span className="text-slate-400">Agreed Job Work Charges:</span>
                <div className="text-base font-black text-emerald-400 mt-0.5">₹{selectedChallan.jobCharges.toLocaleString()}</div>
                <span className="text-[10px] text-slate-500">Direct agreed job work rate</span>
              </div>

              <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800">
                <span className="text-slate-400">Transport Ref / Slip:</span>
                <div className="text-xs font-mono font-bold text-indigo-300 mt-1">{selectedChallan.eWayBillNo || 'Local Dispatch'}</div>
                <span className="text-[10px] text-slate-500">Returnable vehicle transit</span>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* New Challan Modal */}
      {isChallanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B132B] border border-indigo-500/40 p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Outward Job Work Challan</h3>
                  <p className="text-xs text-slate-400">ഡെലിവറി ചലാൻ (ഔട്ട്‌വേർഡ് ജോബ് വർക്ക്)</p>
                </div>
              </div>
              <button
                onClick={() => setIsChallanModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChallan} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Outsource Vendor Name</label>
                <input
                  type="text"
                  required
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">District / Location</label>
                <input
                  type="text"
                  value={newVendorDistrict}
                  onChange={(e) => setNewVendorDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subcontract Process</label>
                <select
                  value={newProcess}
                  onChange={(e) => setNewProcess(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                >
                  <option value="GLASS_INSERT">Toughened Decorative Glass Insert & Acid Etching</option>
                  <option value="BRASS_INLAY">Antique Brass Strip & Nilavilakku CNC Routing Inlay</option>
                  <option value="PU_LACQUER">Automotive High Gloss PU Lacquering</option>
                  <option value="ALU_POWDER_COAT">Aluminum Sub-Frame Powder Coating</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Door Model & Item Manifest</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 8 Sets Royal Teak FRP Doors with Center Glass Cutout..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity (Doors)</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Material Value (₹)</label>
                  <input
                    type="number"
                    value={newMaterialVal}
                    onChange={(e) => setNewMaterialVal(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Job Charges (₹)</label>
                  <input
                    type="number"
                    value={newJobCharges}
                    onChange={(e) => setNewJobCharges(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChallanModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  Issue Delivery Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
