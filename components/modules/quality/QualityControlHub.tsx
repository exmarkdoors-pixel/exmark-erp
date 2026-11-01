'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Search,
  Plus,
  Filter,
  Layers,
  Sparkles,
  QrCode,
  Gauge,
  Thermometer,
  Ruler,
  Check,
  BarChart3,
  RefreshCw,
  Printer,
  X,
} from 'lucide-react';

export type QcStage = 'IQC' | 'IPQC' | 'FQC';

export interface QcInspectionItem {
  id: string; // e.g. QC-2026-088
  stage: QcStage;
  stageLabel: string;
  itemRef: string; // Batch or Job Card or Serial No
  description: string;
  inspectorName: string;
  inspectionDate: string;
  parameters: {
    name: string;
    targetSpec: string;
    actualObserved: string;
    passed: boolean;
  }[];
  verdict: 'PASSED' | 'REJECTED' | 'CONDITIONAL_PASS';
  defectType?: 'BLISTER_VOID' | 'WARPAGE' | 'COLOR_VARIATION' | 'THICKNESS_DEVIATION' | 'ROUTING_MISALIGNMENT' | 'NONE';
  actionTaken?: string;
  qcStampBarcode: string;
}

const SEED_QC_INSPECTIONS: QcInspectionItem[] = [
  {
    id: 'QC-2026-101',
    stage: 'FQC',
    stageLabel: 'Final Pre-Dispatch QA',
    itemRef: 'EX-2026-0042-01',
    description: 'Natural Teak Molded FRP Door (2050 × 750 × 32mm)',
    inspectorName: 'Suresh Kumar (QA Lead)',
    inspectionDate: '01 Nov 2026 14:15',
    parameters: [
      { name: 'Diagonal Squareness Check', targetSpec: 'Δ ≤ 1.0 mm', actualObserved: '0.4 mm', passed: true },
      { name: 'Core Thickness Uniformity', targetSpec: '32.0 ± 0.5 mm', actualObserved: '32.2 mm', passed: true },
      { name: 'Surface Gloss & Coating', targetSpec: 'Zero orange peel / no bubbles', actualObserved: 'Smooth Satin UV Finish', passed: true },
      { name: 'Lock Hole Rebate Depth', targetSpec: '68.0 ± 0.2 mm', actualObserved: '68.1 mm', passed: true },
    ],
    verdict: 'PASSED',
    defectType: 'NONE',
    actionTaken: 'Affixed tamper-proof EXMARK Hologram & 15-Year Quality Stamp',
    qcStampBarcode: 'EX-QC-PASS-78921',
  },
  {
    id: 'QC-2026-102',
    stage: 'IPQC',
    stageLabel: 'In-Process Press QA',
    itemRef: 'PRESS-BAY-03 (Job #1042)',
    description: 'Compression Molding Cycle - Hydraulic Press #3',
    inspectorName: 'Anandhu V. (Plant Tech)',
    inspectionDate: '01 Nov 2026 11:30',
    parameters: [
      { name: 'Platen Temperature Uniformity', targetSpec: '135°C ± 3°C', actualObserved: '136.2°C', passed: true },
      { name: 'Hydraulic Tonnage Hold', targetSpec: '180 Tonnes for 18 mins', actualObserved: '180 Tonnes held 18.2 mins', passed: true },
      { name: 'Air Pocket Ultrasonic Scan', targetSpec: 'Zero internal delamination', actualObserved: 'No void detected', passed: true },
    ],
    verdict: 'PASSED',
    defectType: 'NONE',
    actionTaken: 'Demolded and moved to CNC Edge Trimming Station',
    qcStampBarcode: 'EX-IPQC-PRESS-03-OK',
  },
  {
    id: 'QC-2026-103',
    stage: 'IQC',
    stageLabel: 'Inward Chemical Lot QC',
    itemRef: 'LOT-RES-2026-88',
    description: 'Isophthalic Resin Tanker Delivery (KL-07-CD-4421)',
    inspectorName: 'Dr. Radhakrishnan (Chemical Lab)',
    inspectionDate: '31 Oct 2026 16:00',
    parameters: [
      { name: 'Resin Viscosity @ 25°C', targetSpec: '450 - 550 cP', actualObserved: '510 cP (Brookfield)', passed: true },
      { name: 'Specific Gravity', targetSpec: '1.11 - 1.13 g/cm³', actualObserved: '1.12 g/cm³', passed: true },
      { name: 'Gel Time (MEKP 1.5%)', targetSpec: '18 - 22 mins', actualObserved: '20.5 mins', passed: true },
    ],
    verdict: 'PASSED',
    defectType: 'NONE',
    actionTaken: 'Approved for pumping into Silo #2',
    qcStampBarcode: 'EX-IQC-CHEM-LOT88',
  },
  {
    id: 'QC-2026-104',
    stage: 'FQC',
    stageLabel: 'Final Pre-Dispatch QA',
    itemRef: 'EX-2026-0039-04',
    description: 'Solid WPC Bathroom Door (1980 × 680 × 30mm)',
    inspectorName: 'Suresh Kumar (QA Lead)',
    inspectionDate: '31 Oct 2026 10:20',
    parameters: [
      { name: 'Diagonal Squareness Check', targetSpec: 'Δ ≤ 1.0 mm', actualObserved: '2.4 mm (Tilted)', passed: false },
      { name: 'Corner 90° Right Angle', targetSpec: '90° ± 0.05°', actualObserved: '90.25°', passed: false },
      { name: 'Water Resistance Submersion', targetSpec: 'Zero edge swelling 48hr', actualObserved: '0.0% swelling (Passed)', passed: true },
    ],
    verdict: 'REJECTED',
    defectType: 'WARPAGE',
    actionTaken: 'Non-Conformance Report #NCR-44 raised: Routed to Plant Floor CNC for rebating & square correction',
    qcStampBarcode: 'EX-QC-REJECT-NCR44',
  },
];

export interface InteractiveQcDoorItem {
  id: string;
  roomTag: string;
  orderId: string;
  customerName: string;
  shutterSize: string;
  dim: boolean;
  diag: boolean;
  flat: boolean;
  finish: boolean;
  lock: boolean;
}

const SEED_FLOOR_QC_ITEMS: InteractiveQcDoorItem[] = [
  { id: 'QC-D1', roomTag: 'D1 - Master Bed', orderId: 'SO-2026-091', customerName: 'Skyline Builders', shutterSize: '204.4 × 73.3 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-D2', roomTag: 'D2 - Bed 2 (1st Floor)', orderId: 'SO-2026-091', customerName: 'Skyline Builders', shutterSize: '204.4 × 73.3 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-D3', roomTag: 'D3 - Bed 3 (Guest)', orderId: 'SO-2026-091', customerName: 'Skyline Builders', shutterSize: '204.4 × 73.3 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-D4', roomTag: 'D4 - Kitchen & Utility', orderId: 'SO-2026-091', customerName: 'Skyline Builders', shutterSize: '201.5 × 68.2 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-D5', roomTag: 'D5 - Bathrooms (Waterproof)', orderId: 'SO-2026-091', customerName: 'Skyline Builders', shutterSize: '196.4 × 63.1 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-M1', roomTag: 'M1 - Main Entrance Inner', orderId: 'SO-2026-092', customerName: 'Malabar Heritage', shutterSize: '208.3 × 82.0 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-M2', roomTag: 'M2 - Bed 1 & 2', orderId: 'SO-2026-092', customerName: 'Malabar Heritage', shutterSize: '204.4 × 73.3 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
  { id: 'QC-V1', roomTag: 'V1 - Master Suite', orderId: 'SO-2026-093', customerName: 'Dr. Jacob Abraham', shutterSize: '206.6 × 75.8 cm', dim: true, diag: true, flat: true, finish: true, lock: true },
];

export default function QualityControlHub() {
  const [inspections, setInspections] = useState<QcInspectionItem[]>(SEED_QC_INSPECTIONS);
  const [selectedInspection, setSelectedInspection] = useState<QcInspectionItem>(SEED_QC_INSPECTIONS[0]);
  const [stageFilter, setStageFilter] = useState<'ALL' | QcStage>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'PASSED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewInspectionModalOpen, setIsNewInspectionModalOpen] = useState(false);
  const [floorQcItems, setFloorQcItems] = useState<InteractiveQcDoorItem[]>(SEED_FLOOR_QC_ITEMS);
  const [isPrintQcClipboardOpen, setIsPrintQcClipboardOpen] = useState(false);

  const toggleFloorQcCheck = (id: string, field: 'dim' | 'diag' | 'flat' | 'finish' | 'lock') => {
    setFloorQcItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: !item[field] } : item))
    );
  };

  // New Inspection Form State
  const [newStage, setNewStage] = useState<QcStage>('FQC');
  const [newItemRef, setNewItemRef] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInspectorName, setNewInspectorName] = useState('Suresh Kumar (QA Lead)');
  const [newParamDiagonal, setNewParamDiagonal] = useState('0.6 mm');
  const [newParamThickness, setNewParamThickness] = useState('32.1 mm');
  const [newVerdict, setNewVerdict] = useState<'PASSED' | 'REJECTED'>('PASSED');
  const [newDefectType, setNewDefectType] = useState<QcInspectionItem['defectType']>('NONE');
  const [newActionTaken, setNewActionTaken] = useState('');

  // Filtering
  const filteredInspections = inspections.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage = stageFilter === 'ALL' || item.stage === stageFilter;
    const matchVerdict = verdictFilter === 'ALL' || item.verdict === verdictFilter;
    return matchSearch && matchStage && matchVerdict;
  });

  // KPI Metrics
  const totalInspected = inspections.length;
  const passedCount = inspections.filter((i) => i.verdict === 'PASSED').length;
  const passRatePct = totalInspected > 0 ? (passedCount / totalInspected) * 100 : 100;
  const ncrCount = inspections.filter((i) => i.verdict === 'REJECTED').length;

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemRef.trim() || !newDescription.trim()) return;

    const newInsp: QcInspectionItem = {
      id: `QC-2026-${Date.now().toString().slice(-3)}`,
      stage: newStage,
      stageLabel: newStage === 'IQC' ? 'Inward Chemical Lot QC' : newStage === 'IPQC' ? 'In-Process Press QA' : 'Final Pre-Dispatch QA',
      itemRef: newItemRef,
      description: newDescription,
      inspectorName: newInspectorName,
      inspectionDate: 'Just now',
      parameters: [
        { name: 'Diagonal Tolerance Check', targetSpec: 'Δ ≤ 1.0 mm', actualObserved: newParamDiagonal, passed: newVerdict === 'PASSED' },
        { name: 'Core Thickness Profile', targetSpec: '32.0 ± 0.5 mm', actualObserved: newParamThickness, passed: true },
        { name: 'Surface Finishing & Coating', targetSpec: 'Zero blisters/scratches', actualObserved: 'Clean Satin Finish', passed: true },
      ],
      verdict: newVerdict,
      defectType: newDefectType,
      actionTaken: newActionTaken || (newVerdict === 'PASSED' ? 'Passed and stamped with Hologram barcode.' : 'Sent to rework station.'),
      qcStampBarcode: `EX-QC-${newVerdict === 'PASSED' ? 'PASS' : 'REJECT'}-${Date.now().toString().slice(-5)}`,
    };

    setInspections([newInsp, ...inspections]);
    setSelectedInspection(newInsp);
    setIsNewInspectionModalOpen(false);
    setNewItemRef('');
    setNewDescription('');
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#082032] to-[#070D1E] border border-teal-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Quality Control & Assurance (QA/QC)
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  SAP QM / ISO 9001 Benchmark
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                ക്വാളിറ്റി കൺട്രോൾ & ലാബ് ടെസ്റ്റിംഗ് • Inward raw chemicals, in-process hydraulic press & final diagonal audits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewInspectionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            + Log QC Inspection
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Pass Rate</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-teal-400">{passRatePct.toFixed(1)}%</div>
          <p className="text-xs text-slate-400 mt-1">{passedCount} of {totalInspected} audits passed</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Non-Conformance (NCR)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">{ncrCount} Active</div>
          <p className="text-xs text-rose-400/80 mt-1">Routed to factory floor rework</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Diagonal Tolerance</span>
            <Ruler className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">&le; 1.0 mm</div>
          <p className="text-xs text-slate-400 mt-1">Kerala site frame standard</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hot Press Inspection</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">135°C @ 180T</div>
          <p className="text-xs text-slate-400 mt-1">Zero air blister ultrasonic</p>
        </div>
      </div>

      {/* INTERACTIVE QC INSPECTION & PHYSICAL TICK CHECKLIST (FOR MOBILE & PRINT) */}
      <div className="bg-[#0B132B] border border-purple-900/60 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-[#070D1E] flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              Quality Control (QC) Floor Checklist & Digital Inspection (IS 14856:2000)
            </h3>
            <span className="text-xs text-slate-400">
              Live checkboxes for mobile/tablet floor auditing or click print for physical clipboard tick-sheet
            </span>
          </div>

          <button
            onClick={() => setIsPrintQcClipboardOpen(true)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Floor QC Sheet (പ്രിന്റ് ടിക്ക് ഷീറ്റ്) 🖨️</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#070D1E] text-slate-400 uppercase text-[10px]">
                <th className="p-3">Door / Room Tag</th>
                <th className="p-3">Order & Party</th>
                <th className="p-3 text-center">1. Dimensions (±1.5mm)</th>
                <th className="p-3 text-center">2. Diagonal Squareness</th>
                <th className="p-3 text-center">3. Flatness / Warpage</th>
                <th className="p-3 text-center">4. Polish & UV Finish</th>
                <th className="p-3 text-center">5. Lock Mortising</th>
                <th className="p-3 text-right">QC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {floorQcItems.map((door) => {
                const allPass = door.dim && door.diag && door.flat && door.finish && door.lock;
                return (
                  <tr key={door.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <strong className="text-white text-xs">{door.roomTag}</strong>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{door.shutterSize}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{door.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{door.orderId}</div>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={door.dim}
                        onChange={() => toggleFloorQcCheck(door.id, 'dim')}
                        className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={door.diag}
                        onChange={() => toggleFloorQcCheck(door.id, 'diag')}
                        className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={door.flat}
                        onChange={() => toggleFloorQcCheck(door.id, 'flat')}
                        className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={door.finish}
                        onChange={() => toggleFloorQcCheck(door.id, 'finish')}
                        className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={door.lock}
                        onChange={() => toggleFloorQcCheck(door.id, 'lock')}
                        className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          allPass
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                            : 'bg-rose-950 text-rose-400 border-rose-700'
                        }`}
                      >
                        {allPass ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> ✓ CERTIFIED PASS
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3" /> ⚠ REWORK REQUIRED
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Split: Left Log Table, Right Inspection Detail Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Inspection Directory */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0B132B]/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-400" />
                QC Audit Logs ({filteredInspections.length})
              </h2>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-slate-300"
              >
                <option value="ALL">All Stages (IQC / IPQC / FQC)</option>
                <option value="IQC">Inward Chemicals (IQC)</option>
                <option value="IPQC">Press Molding (IPQC)</option>
                <option value="FQC">Pre-Dispatch (FQC)</option>
              </select>

              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-slate-300"
              >
                <option value="ALL">All Verdicts</option>
                <option value="PASSED">Passed Only</option>
                <option value="REJECTED">Rejected / NCR</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by QC #, batch, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredInspections.map((item) => {
                const isSelected = selectedInspection.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedInspection(item)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-950/40 border-teal-500/60 shadow-lg shadow-teal-900/20'
                        : 'bg-[#070D1E]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#070D1E]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {item.stage}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{item.description}</h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.itemRef}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.verdict === 'PASSED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {item.verdict}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>{item.inspectorName}</span>
                      <span>{item.inspectionDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Selected Inspection Certificate & Test Results */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0B132B]/90 border border-slate-800/90 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {selectedInspection.id}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedInspection.stageLabel}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedInspection.verdict === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    VERDICT: {selectedInspection.verdict}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5">{selectedInspection.description}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Item Ref: {selectedInspection.itemRef}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`QC Certificate ${selectedInspection.id} generated for printing.`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-teal-400" />
                  Print QC Certificate
                </button>
              </div>
            </div>

            {/* Inspector and Timestamp */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#070D1E]/80 border border-slate-800/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Certified Inspector</span>
                <p className="font-bold text-white mt-0.5">{selectedInspection.inspectorName}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Date & Timestamp</span>
                <p className="font-bold text-slate-300 mt-0.5">{selectedInspection.inspectionDate}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Tamper-Proof Barcode</span>
                <p className="font-mono text-xs font-bold text-teal-300 mt-0.5 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-teal-400" />
                  {selectedInspection.qcStampBarcode}
                </p>
              </div>
            </div>

            {/* Test Parameters Evaluation Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-teal-400" />
                Laboratory & Field Tolerance Checks
              </h3>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#070D1E]/40 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Quality Parameter</th>
                      <th className="py-2.5 px-3">Standard Spec</th>
                      <th className="py-2.5 px-3">Observed Value</th>
                      <th className="py-2.5 px-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedInspection.parameters.map((param, idx) => (
                      <tr key={idx} className="hover:bg-teal-950/20">
                        <td className="py-2.5 px-3 font-semibold text-white">{param.name}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{param.targetSpec}</td>
                        <td className="py-2.5 px-3 font-mono text-white text-[11px]">{param.actualObserved}</td>
                        <td className="py-2.5 px-3 text-right">
                          {param.passed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                              <XCircle className="w-3.5 h-3.5" /> OUT OF SPEC
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Taken & Defect Resolution */}
            <div className="p-4 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Disposition & QA Action Taken:</span>
                {selectedInspection.defectType && selectedInspection.defectType !== 'NONE' && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/30">
                    Defect: {selectedInspection.defectType}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 bg-[#0B132B] p-3 rounded-lg border border-slate-800/80">
                {selectedInspection.actionTaken || 'None specified'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New QC Inspection Modal */}
      {isNewInspectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B132B] border border-teal-500/40 p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Log Quality Inspection</h3>
                  <p className="text-xs text-slate-400">ക്വാളിറ്റി ചെക്ക് എൻട്രി രേഖപ്പെടുത്തുക</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewInspectionModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Inspection Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as QcStage)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  >
                    <option value="FQC">Final Pre-Dispatch QA (FQC)</option>
                    <option value="IPQC">In-Process Press QA (IPQC)</option>
                    <option value="IQC">Inward Raw Chemicals (IQC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Item Ref / Job Card #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EX-2026-0055-01"
                    value={newItemRef}
                    onChange={(e) => setNewItemRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Door / Item Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solid WPC Molded Door - Teak Finish (80x34)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Diagonal Deviation (Target &le; 1.0mm)</label>
                  <input
                    type="text"
                    value={newParamDiagonal}
                    onChange={(e) => setNewParamDiagonal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Thickness (Target 32.0 ± 0.5mm)</label>
                  <input
                    type="text"
                    value={newParamThickness}
                    onChange={(e) => setNewParamThickness(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Inspection Verdict</label>
                  <select
                    value={newVerdict}
                    onChange={(e) => setNewVerdict(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white font-bold"
                  >
                    <option value="PASSED">PASSED (Zero Defect)</option>
                    <option value="REJECTED">REJECTED (Raise NCR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Defect Classification (if any)</label>
                  <select
                    value={newDefectType}
                    onChange={(e) => setNewDefectType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  >
                    <option value="NONE">None (Spec Passed)</option>
                    <option value="WARPAGE">Warpage / Frame Non-Square</option>
                    <option value="BLISTER_VOID">Air Blister / Lamination Void</option>
                    <option value="COLOR_VARIATION">Gelcoat / Shade Variation</option>
                    <option value="THICKNESS_DEVIATION">Core Thickness Deviation</option>
                    <option value="ROUTING_MISALIGNMENT">Lock Hole Routing Variation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Action / Disposition Note</label>
                <input
                  type="text"
                  placeholder="e.g. Hologram barcode applied or routed to CNC trimming"
                  value={newActionTaken}
                  onChange={(e) => setNewActionTaken(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewInspectionModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/30"
                >
                  Save QC Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PHYSICAL QC CLIPBOARD SHEET MODAL */}
      {isPrintQcClipboardOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  SHOP-FLOOR PHYSICAL QUALITY CONTROL (QC) CHECK-SHEET
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • IS 14856:2000 Inspection Sheet with Physical Tick Boxes [ ] for Clipboards
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Check-Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintQcClipboardOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-8 overflow-y-auto font-sans text-xs space-y-4 print:p-0 print:overflow-visible">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-rose-700 tracking-wider">
                    EXMARK DOORS — QUALITY CONTROL CLIPBOARD CHECKLIST
                  </div>
                  <div className="text-xs text-slate-700 font-bold">
                    PHYSICAL INSPECTION TICK-SHEET (IS 14856 : 2000 PROTOCOL)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Shop-Floor Inspector Form • Vengara Central Manufacturing Plant
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-purple-900 text-white rounded font-bold text-[10px]">
                    QC TICK-SHEET
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    Date: {new Date().toLocaleDateString('en-GB')}
                  </div>
                  <div className="text-[10px] text-slate-600">Shift: Floor Inspection</div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300 text-xs mt-3">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[10px]">
                    <th className="p-1.5 border-r border-slate-300 text-center">#</th>
                    <th className="p-1.5 border-r border-slate-300">Door &amp; Party</th>
                    <th className="p-1.5 border-r border-slate-300">Target Size</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Dim. (±1.5mm)</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Diag. (≤3mm)</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Flatness (≤3mm)</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Polish/UV</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Lock Mortise</th>
                    <th className="p-1.5 text-center">Final Stamp</th>
                  </tr>
                </thead>
                <tbody>
                  {floorQcItems.map((door, idx) => (
                    <tr key={door.id} className="border-b border-slate-300 text-[10px]">
                      <td className="p-1.5 border-r border-slate-300 font-bold text-center">
                        {idx + 1}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 font-bold">
                        {door.roomTag}
                        <br />
                        <span className="text-[9px] text-slate-500 font-normal">
                          {door.customerName} ({door.orderId})
                        </span>
                      </td>
                      <td className="p-1.5 border-r border-slate-300 font-mono">
                        {door.shutterSize}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                        [&nbsp;&nbsp;&nbsp;] Pass
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                        [&nbsp;&nbsp;&nbsp;] ≤3mm
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                        [&nbsp;&nbsp;&nbsp;] ≤3mm
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                        [&nbsp;&nbsp;&nbsp;] Pass
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                        [&nbsp;&nbsp;&nbsp;] Pass
                      </td>
                      <td className="p-1.5 text-center font-bold text-slate-700">
                        PASSED [&nbsp;&nbsp;&nbsp;]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end border-t border-slate-300 text-[11px] text-slate-600">
                <div>Inspector Name &amp; Badge: _______________________________</div>
                <div className="text-right">QC Lead Sign-off: _______________________________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
