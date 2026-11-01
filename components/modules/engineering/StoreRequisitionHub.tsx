'use client';

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Boxes,
  Layers,
  Calculator,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
  PackageCheck,
  Building2,
  X,
} from 'lucide-react';

interface ProductionRequisitionOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  siteName: string;
  jobCardNumber: string;
  doorsCount: number;
  doorsDesc: string;
  sqFtPerDoor: number;
}

const REQUISITION_ORDERS: ProductionRequisitionOrder[] = [
  {
    id: 'SO-2026-091',
    orderNumber: 'SO-2026-091',
    customerName: 'Skyline Builders (Kochi)',
    siteName: 'Skyline Prime Villa, Kakkanad, Ernakulam',
    jobCardNumber: 'JC-2026-881',
    doorsCount: 18,
    doorsDesc: '18 Sets FRP Heavy Molded Doors (Rose Wood finish)',
    sqFtPerDoor: 18.0,
  },
  {
    id: 'SO-2026-092',
    orderNumber: 'SO-2026-092',
    customerName: 'Malabar Heritage Project',
    siteName: 'Heritage Villas, Westhill, Kozhikode',
    jobCardNumber: 'JC-2026-882',
    doorsCount: 14,
    doorsDesc: '14 Sets WPC Solid Core Waterproof Doors (Teak finish)',
    sqFtPerDoor: 18.5,
  },
  {
    id: 'SO-2026-093',
    orderNumber: 'SO-2026-093',
    customerName: 'Dr. Jacob Abraham',
    siteName: 'Ottapalam, Palakkad',
    jobCardNumber: 'JC-2026-883',
    doorsCount: 10,
    doorsDesc: '10 Sets Luxury Designer FRP Doors (Mahogany finish)',
    sqFtPerDoor: 18.0,
  },
];

export default function StoreRequisitionHub() {
  const [orders, setOrders] = useState<ProductionRequisitionOrder[]>(REQUISITION_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('SO-2026-091');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isBatchBoqMode, setIsBatchBoqMode] = useState<boolean>(false);
  const [selectedBatchOrderIds, setSelectedBatchOrderIds] = useState<string[]>([
    'SO-2026-091',
    'SO-2026-092',
    'SO-2026-093',
  ]);

  useEffect(() => {
    let active = true;
    fetch('/api/production')
      .then((res) => res.json())
      .then((json) => {
        if (!active || !json.success || !Array.isArray(json.data) || json.data.length === 0) return;
        const liveOrders: ProductionRequisitionOrder[] = json.data.map((p: {
          id: string;
          salesOrderId?: string;
          prodOrderNumber: string;
          customerName?: string;
          siteName?: string;
          jobCardNumber: string;
          doors?: Array<{ length?: number }>;
          doorCategory?: string;
        }) => ({
          id: p.salesOrderId || p.id,
          orderNumber: p.salesOrderId || p.prodOrderNumber,
          customerName: p.customerName || 'Kerala Customer',
          siteName: p.siteName || `${p.customerName || 'Client'} Site`,
          jobCardNumber: p.jobCardNumber,
          doorsCount: p.doors?.length || 1,
          doorsDesc: `${p.doors?.length || 1} Sets (${p.doorCategory?.replace('_', ' ') || 'FRP Doors'})`,
          sqFtPerDoor: 18.0,
        }));
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newOrders = liveOrders.filter((o) => !existingIds.has(o.id));
          return [...prev, ...newOrders];
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleBatchOrder = (id: string) => {
    setSelectedBatchOrderIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((i) => i !== id) : prev) : [...prev, id]
    );
  };

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || orders[0] || REQUISITION_ORDERS[0];

  const batchOrders = orders.filter((o) => selectedBatchOrderIds.includes(o.id));

  // Dynamic calculations: either single order or consolidated multi-party batch
  const totalDoors = isBatchBoqMode
    ? batchOrders.reduce((sum, o) => sum + o.doorsCount, 0)
    : selectedOrder.doorsCount;

  const totalSqft = isBatchBoqMode
    ? parseFloat(
        batchOrders
          .reduce((sum, o) => sum + o.doorsCount * o.sqFtPerDoor, 0)
          .toFixed(1)
      )
    : parseFloat((selectedOrder.doorsCount * selectedOrder.sqFtPerDoor).toFixed(1));

  // Automated chemical & material formulas
  const resinKg = parseFloat((totalSqft * 0.30).toFixed(1));
  const fiberKg = parseFloat((totalSqft * 0.15).toFixed(1));
  const coreSheets = totalDoors;
  const polishLiters = parseFloat((totalDoors * 0.20).toFixed(1));
  const hingesPairs = totalDoors * 3;
  const screwBoxes = Math.ceil((totalDoors * 24) / 100);

  // Costs
  const resinCost = Math.round(resinKg * 190);
  const fiberCost = Math.round(fiberKg * 220);
  const coreCost = Math.round(coreSheets * 850);
  const polishCost = Math.round(polishLiters * 380);
  const hingesCost = Math.round(hingesPairs * 110);
  const screwsCost = Math.round(screwBoxes * 150);
  const grandTotalCost = resinCost + fiberCost + coreCost + polishCost + hingesCost + screwsCost;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
              {isBatchBoqMode
                ? 'Consolidated Batch BOQ & Bill of Materials'
                : 'Bill of Materials (BOM) & Factory Store Requisition'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isBatchBoqMode
              ? 'ഒന്നിലധികം പാർട്ടികളിൽ നിന്നുള്ള വാതിലുകൾ ഒരുമിച്ച് ബാച്ച് പ്രൊഡക്ഷൻ നടത്തുമ്പോൾ ആവശ്യമായ ആകെ മെറ്റീരിയൽ ലിസ്റ്റ് (Total Batch BOQ).'
              : 'Automated raw material calculation (Resin, Fiber Mat, PU core, PU polish, Hinges, Screws) per production order with printable Store Issue Slips.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Mode Switcher Button */}
          <button
            type="button"
            onClick={() => setIsBatchBoqMode(!isBatchBoqMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer ${
              isBatchBoqMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>⚡ Consolidated Multi-Party BOQ (പല പാർട്ടികളുടെ ആകെ BOQ)</span>
          </button>

          {!isBatchBoqMode && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 font-semibold shrink-0">
                Order:
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full md:w-auto bg-[#070D1E] border border-emerald-600/80 text-emerald-200 text-xs rounded-xl p-2 font-bold focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber}: {o.customerName} ({o.doorsCount} Doors)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MULTI-ORDER SELECTION PANEL (WHEN CONSOLIDATED BATCH BOQ MODE IS ACTIVE) */}
      {isBatchBoqMode && (
        <div className="bg-[#0B132B] border border-emerald-800/60 rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-emerald-400">
              Select Orders to Combine into Production Press Batch:
            </span>
            <span className="text-slate-400 font-semibold">
              {batchOrders.length} Parties Combined • {totalDoors} Doors in Batch ({totalSqft} Sq.Ft)
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {orders.map((ord) => {
              const isChecked = selectedBatchOrderIds.includes(ord.id);
              return (
                <label
                  key={ord.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    isChecked
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleBatchOrder(ord.id)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    <strong>{ord.orderNumber}</strong>: {ord.customerName.split('(')[0]} (
                    {ord.doorsCount} Doors)
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Total Door Area in Batch</div>
          <div className="text-2xl font-black text-white">{totalSqft} Sq.Ft</div>
          <div className="text-[11px] text-cyan-400 mt-1">{totalDoors} Door Shutters Total</div>
        </div>
        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">FRP Grade Resin Required</div>
          <div className="text-2xl font-black text-emerald-400">{resinKg} Kg</div>
          <div className="text-[11px] text-emerald-300 mt-1">Isophthalic Marine Grade (0.30 kg/sq.ft)</div>
        </div>
        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Fiberglass CSM 450 Mat</div>
          <div className="text-2xl font-black text-amber-400">{fiberKg} Kg</div>
          <div className="text-[11px] text-amber-300 mt-1">Double-layer Structural Glass (0.15 kg/sq.ft)</div>
        </div>
        <div className="bg-[#0B132B] border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Estimated Raw Material Cost</div>
          <div className="text-2xl font-black text-rose-400">
            ₹{grandTotalCost.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-300 mt-1">Direct Chemicals &amp; Hardware</div>
        </div>
      </div>

      {/* Material Breakdown Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">
              {isBatchBoqMode
                ? `Consolidated Material Requisition for ${batchOrders.length} Combined Orders`
                : `Material Requisition for Order: ${selectedOrder.orderNumber} (${selectedOrder.customerName})`}
            </h3>
            <span className="text-xs text-slate-400">
              {isBatchBoqMode
                ? `Combined Parties: ${batchOrders.map((b) => b.customerName.split('(')[0].trim()).join(' | ')} • Total Production Batch: ${totalDoors} Doors (${totalSqft} Sq.Ft)`
                : `Job Card: ${selectedOrder.jobCardNumber} • ${selectedOrder.doorsDesc}`}
            </span>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Store Issue Slip (സ്റ്റോർ ഇഷ്യൂ വൗച്ചർ) 🖨️</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#070D1E] text-slate-400 uppercase text-[10px]">
                <th className="p-3">#</th>
                <th className="p-3">Raw Material Description</th>
                <th className="p-3">Spec / Grade</th>
                <th className="p-3 text-right">Required Qty</th>
                <th className="p-3 text-right">Unit Rate (₹)</th>
                <th className="p-3 text-right">Total Est. Cost (₹)</th>
                <th className="p-3 text-center">Store Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">1</td>
                <td className="p-3">
                  <strong className="text-white">FRP Isophthalic Polyester Resin</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">High-tensile Marine / Door Grade Resin</span>
                </td>
                <td className="p-3 text-slate-300">ISO-6701 Grade</td>
                <td className="p-3 text-right font-black text-emerald-400">{resinKg} Kg</td>
                <td className="p-3 text-right text-slate-300">₹190 / Kg</td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{resinCost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    In Stock
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">2</td>
                <td className="p-3">
                  <strong className="text-white">Fiberglass Chopped Strand Mat (CSM 450)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">E-Glass Fiber Reinforcement Sheet</span>
                </td>
                <td className="p-3 text-slate-300">CSM 450 GSM</td>
                <td className="p-3 text-right font-black text-amber-400">{fiberKg} Kg</td>
                <td className="p-3 text-right text-slate-300">₹220 / Kg</td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{fiberCost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    In Stock
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">3</td>
                <td className="p-3">
                  <strong className="text-white">Internal Wooden Stiles/Rails &amp; PU Core</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Seasoned Hardwood Sub-frame with Sound Insulation</span>
                </td>
                <td className="p-3 text-slate-300">30mm Molded Density</td>
                <td className="p-3 text-right font-black text-white">{coreSheets} Core Sets</td>
                <td className="p-3 text-right text-slate-300">₹850 / Set</td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{coreCost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    Reserved
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">4</td>
                <td className="p-3">
                  <strong className="text-white">PU Woodgrain Polish &amp; UV Anti-Scratch Lacquer</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Rose Wood / Teak Topcoat Finish</span>
                </td>
                <td className="p-3 text-slate-300">Two-Pack PU Base</td>
                <td className="p-3 text-right font-black text-purple-400">{polishLiters} Liters</td>
                <td className="p-3 text-right text-slate-300">₹380 / Liter</td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{polishCost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    In Stock
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">5</td>
                <td className="p-3">
                  <strong className="text-white">SS 304 Bearing Hinges (100x75x3mm)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Corrosion Resistant Heavy Duty Hinges</span>
                </td>
                <td className="p-3 text-slate-300">Grade SS-304</td>
                <td className="p-3 text-right font-black text-cyan-400">{hingesPairs} Nos</td>
                <td className="p-3 text-right text-slate-300">₹110 / Each</td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{hingesCost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    In Stock
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-bold text-white">6</td>
                <td className="p-3">
                  <strong className="text-white">SS Star Fastener Screws &amp; Accessories</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Countersunk Self-threading 35mm screws</span>
                </td>
                <td className="p-3 text-slate-300">Box of 100 pcs</td>
                <td className="p-3 text-right font-black text-slate-200">{screwBoxes} Boxes</td>
                <td className="p-3 text-right text-slate-300">₹150 / Box</td>
                <td className="p-3 text-right font-bold text-white">
                  ₹{screwsCost.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    In Stock
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= PRINT PREVIEW MODAL ================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/85 backdrop-blur-md">
          <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  STORE MATERIAL REQUISITION &amp; ISSUE SLIP — {selectedOrder.orderNumber}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Official Store Release Document
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 overflow-y-auto font-sans text-xs space-y-5 print:p-0">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-rose-700 tracking-wider">
                    EXMARK DOORS — FACTORY STORE DIVISION
                  </div>
                  <div className="text-xs text-slate-700 font-bold">
                    STORE MATERIAL REQUISITION &amp; ISSUE SLIP (മെറ്റീരിയൽ ഇഷ്യൂ വൗച്ചർ)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Plant Unit, Vengara, Malappuram • Release to Hydraulic Press &amp; Assembly
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-emerald-900 text-white rounded font-bold text-[10px]">
                    STORE ISSUE SLIP
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    Slip #: {isBatchBoqMode ? `MR-BATCH-${batchOrders.length}P` : `MR-2026-${selectedOrder.orderNumber.slice(-3)}`}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Date: {new Date().toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs">
                <div>
                  <span className="text-[10px] text-emerald-900 font-bold uppercase">
                    {isBatchBoqMode ? 'Issued For Consolidated Production Run:' : 'Issued For Production Order:'}
                  </span>
                  <div className="text-sm font-black text-slate-950">
                    {isBatchBoqMode
                      ? `${batchOrders.length} Combined Parties (${batchOrders.map((b) => b.customerName.split('(')[0].trim()).join(', ')})`
                      : `${selectedOrder.orderNumber} — ${selectedOrder.customerName}`}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    {isBatchBoqMode ? 'Central Manufacturing Plant Floor Batch' : `Site: ${selectedOrder.siteName}`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-900 font-bold uppercase">
                    Job Card &amp; Target:
                  </span>
                  <div className="text-xs font-bold text-slate-900">
                    {isBatchBoqMode ? `BATCH-PRESS-${Date.now().toString().slice(-4)}` : selectedOrder.jobCardNumber} ({totalDoors} Door Shutters • {totalSqft} Sq.Ft)
                  </div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    Target Line: Line 1 (FRP Press) &amp; Line 2 (CNC)
                  </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300 text-xs mt-3">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">Raw Material Item</th>
                    <th className="p-2 border-r border-slate-300">Batch / Lot Spec</th>
                    <th className="p-2 border-r border-slate-300 text-right">Required Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right">Issued Qty</th>
                    <th className="p-2 text-center">Storekeeper Check</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">1</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>FRP Isophthalic Resin</strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">ISO-6701 Barrel Lot</td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {resinKg} Kg
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">_______ Kg</td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">2</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>Fiberglass CSM 450 Mat</strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">E-Glass Mat Roll</td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {fiberKg} Kg
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">_______ Kg</td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">3</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>Internal Subframe Stiles/Rails &amp; Core</strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">Seasoned Hardwood + Honeycomb</td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {coreSheets} Sets
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">_______ Sets</td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">4</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>PU Polish &amp; UV Anti-Scratch Lacquer</strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">Rose Wood / Teak Shade</td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {polishLiters} Liters
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">_______ Liters</td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-bold">5</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>SS 304 Bearing Hinges (100x75x3mm)</strong>
                    </td>
                    <td className="p-2 border-r border-slate-300">Grade SS-304 with Screws</td>
                    <td className="p-2 border-r border-slate-300 text-right font-black">
                      {hingesPairs} Nos
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right">_______ Nos</td>
                    <td className="p-2 text-center font-bold text-emerald-700">✓ ISSUED</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end border-t border-slate-300 text-[11px] text-slate-600">
                <div>
                  <div>Requisition Raised by: <strong>Production Supervisor</strong></div>
                  <div className="mt-4">Signature: __________________________</div>
                </div>
                <div className="text-right">
                  <div>Materials Issued by: <strong>Store In-Charge (Vengara)</strong></div>
                  <div className="mt-4">Storekeeper Signature &amp; Stamp: __________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
