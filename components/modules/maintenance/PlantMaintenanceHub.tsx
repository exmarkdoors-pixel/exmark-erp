'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Cpu,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  Search,
  Filter,
  Flame,
  Gauge,
  Thermometer,
  ShieldCheck,
  RefreshCw,
  Zap,
  BarChart3
} from 'lucide-react';

export interface PlantMachine {
  id: string; // e.g. MCH-PRS-01
  name: string;
  category: 'Hydraulic Hot Press' | 'CNC Router' | 'Resin Dispenser' | 'Air Compressor';
  location: string;
  status: 'OPERATIONAL' | 'PREVENTIVE_DUE' | 'BREAKDOWN' | 'CALIBRATION';
  tonnageOrPower: string;
  lastServiceDate: string;
  nextServiceDueDate: string;
  totalRunHours: number;
  oeeAvailability: number; // e.g. 96.5%
  oeePerformance: number; // e.g. 94.2%
  oeeQuality: number; // e.g. 99.1%
  activeOperator: string;
}

export interface MaintenanceTicket {
  id: string; // e.g. TKT-2026-031
  machineId: string;
  machineName: string;
  type: 'PREVENTIVE' | 'BREAKDOWN' | 'CALIBRATION';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  assignedEngineer: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reportedDate: string;
  downtimeMinutes: number;
}

const SEED_MACHINES: PlantMachine[] = [
  {
    id: 'MCH-PRS-01',
    name: 'Hydraulic Compression Press #1 (Main Door Bay)',
    category: 'Hydraulic Hot Press',
    location: 'Bay 1 - Molding Line',
    status: 'OPERATIONAL',
    tonnageOrPower: '200 Tonne / 45 kW Heated Platens',
    lastServiceDate: '15 Oct 2026',
    nextServiceDueDate: '15 Nov 2026',
    totalRunHours: 3420,
    oeeAvailability: 97.2,
    oeePerformance: 95.0,
    oeeQuality: 99.4,
    activeOperator: 'Ramesh K. (Senior Pressman)',
  },
  {
    id: 'MCH-PRS-02',
    name: 'Hydraulic Compression Press #2',
    category: 'Hydraulic Hot Press',
    location: 'Bay 1 - Molding Line',
    status: 'OPERATIONAL',
    tonnageOrPower: '180 Tonne / 37 kW Platens',
    lastServiceDate: '10 Oct 2026',
    nextServiceDueDate: '10 Nov 2026',
    totalRunHours: 2980,
    oeeAvailability: 95.5,
    oeePerformance: 93.8,
    oeeQuality: 98.9,
    activeOperator: 'Sujith M.',
  },
  {
    id: 'MCH-CNC-01',
    name: '3-Axis Heavy CNC Router (Lock & Hinge Rebater)',
    category: 'CNC Router',
    location: 'Bay 2 - Finishing Floor',
    status: 'PREVENTIVE_DUE',
    tonnageOrPower: '9 kW Spindle / 24000 RPM',
    lastServiceDate: '01 Oct 2026',
    nextServiceDueDate: '02 Nov 2026 (Due Tomorrow)',
    totalRunHours: 1850,
    oeeAvailability: 92.0,
    oeePerformance: 91.5,
    oeeQuality: 99.8,
    activeOperator: 'Arun Prasad',
  },
  {
    id: 'MCH-PRS-03',
    name: 'Hydraulic Heated Press #3',
    category: 'Hydraulic Hot Press',
    location: 'Bay 1 - Molding Line',
    status: 'BREAKDOWN',
    tonnageOrPower: '160 Tonne / 30 kW Platens',
    lastServiceDate: '12 Sep 2026',
    nextServiceDueDate: 'Overdue',
    totalRunHours: 4100,
    oeeAvailability: 78.4,
    oeePerformance: 85.0,
    oeeQuality: 97.2,
    activeOperator: 'Under Maintenance',
  },
  {
    id: 'MCH-CMP-01',
    name: 'Screw Air Compressor Unit (Central Pneumatics)',
    category: 'Air Compressor',
    location: 'Utility Room 1',
    status: 'OPERATIONAL',
    tonnageOrPower: '10 Bar / 22 kW Rotary Screw',
    lastServiceDate: '20 Oct 2026',
    nextServiceDueDate: '20 Dec 2026',
    totalRunHours: 5200,
    oeeAvailability: 99.0,
    oeePerformance: 98.5,
    oeeQuality: 100.0,
    activeOperator: 'Automated PLC',
  },
];

const SEED_TICKETS: MaintenanceTicket[] = [
  {
    id: 'TKT-2026-031',
    machineId: 'MCH-PRS-03',
    machineName: 'Hydraulic Heated Press #3',
    type: 'BREAKDOWN',
    priority: 'CRITICAL',
    title: 'Hydraulic Cylinder Seal Leakage on Lower Ram',
    description: 'Pressure drops from 160 Bar to 110 Bar during 18-min curing cycle. Replaced seal kit needed.',
    assignedEngineer: 'Haridas (Chief Plant Engineer)',
    status: 'IN_PROGRESS',
    reportedDate: '01 Nov 2026 09:15',
    downtimeMinutes: 140,
  },
  {
    id: 'TKT-2026-032',
    machineId: 'MCH-CNC-01',
    machineName: '3-Axis Heavy CNC Router',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    title: 'Spindle Bearing Greasing & Collet Calibration',
    description: 'Scheduled monthly high-temperature synthetic grease application on main ceramic spindle bearings.',
    assignedEngineer: 'Deepak V.',
    status: 'OPEN',
    reportedDate: '01 Nov 2026 12:00',
    downtimeMinutes: 0,
  },
];

export default function PlantMaintenanceHub() {
  const [machines, setMachines] = useState<PlantMachine[]>(SEED_MACHINES);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(SEED_TICKETS);
  const [selectedMachine, setSelectedMachine] = useState<PlantMachine>(SEED_MACHINES[0]);
  const [activeTab, setActiveTab] = useState<'MACHINES' | 'TICKETS' | 'OEE_ANALYTICS'>('MACHINES');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // New ticket state
  const [ticketMachineId, setTicketMachineId] = useState('MCH-PRS-01');
  const [ticketType, setTicketType] = useState<MaintenanceTicket['type']>('PREVENTIVE');
  const [ticketPriority, setTicketPriority] = useState<MaintenanceTicket['priority']>('HIGH');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketEngineer, setTicketEngineer] = useState('Haridas (Chief Plant Engineer)');

  // Overall OEE Index computation: Avg(Availability) * Avg(Performance) * Avg(Quality)
  const avgAvailability = machines.reduce((sum, m) => sum + m.oeeAvailability, 0) / machines.length;
  const avgPerformance = machines.reduce((sum, m) => sum + m.oeePerformance, 0) / machines.length;
  const avgQuality = machines.reduce((sum, m) => sum + m.oeeQuality, 0) / machines.length;
  const plantOeeIndex = (avgAvailability / 100) * (avgPerformance / 100) * (avgQuality / 100) * 100;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

    const mach = machines.find((m) => m.id === ticketMachineId) || machines[0];

    const newTkt: MaintenanceTicket = {
      id: `TKT-2026-${Date.now().toString().slice(-3)}`,
      machineId: mach.id,
      machineName: mach.name,
      type: ticketType,
      priority: ticketPriority,
      title: ticketTitle,
      description: ticketDescription,
      assignedEngineer: ticketEngineer,
      status: 'OPEN',
      reportedDate: 'Just now',
      downtimeMinutes: ticketType === 'BREAKDOWN' ? 30 : 0,
    };

    setTickets([newTkt, ...tickets]);
    setIsTicketModalOpen(false);
    setTicketTitle('');
    setTicketDescription('');
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#1E1B0E] to-[#070D1E] border border-amber-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Plant & Machinery Maintenance (OEE)
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SAP PM / Total Productive Maintenance
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                പ്ലാന്റ് മെയിന്റനൻസ് & മെഷീൻ കാര്യക്ഷമത • Hydraulic compression presses, CNC routers, uptime & OEE
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            + New Maintenance Work Order
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Plant OEE</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">{plantOeeIndex.toFixed(1)}%</div>
          <p className="text-xs text-amber-400/80 mt-1">World Class Target: &ge; 85.0%</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Heavy Equipment</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{machines.length} Units</div>
          <p className="text-xs text-slate-400 mt-1">Presses, CNCs & Compressors</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Machine Availability</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{avgAvailability.toFixed(1)}%</div>
          <p className="text-xs text-slate-400 mt-1">Plant uptime availability</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tickets</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">
            {tickets.filter((t) => t.status !== 'RESOLVED').length} Open
          </div>
          <p className="text-xs text-rose-400/80 mt-1">1 Critical Breakdown</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('MACHINES')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'MACHINES'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Machinery Master & Live Status ({machines.length})
        </button>
        <button
          onClick={() => setActiveTab('TICKETS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'TICKETS'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Maintenance Work Orders ({tickets.length})
        </button>
      </div>

      {activeTab === 'MACHINES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Machine List */}
          <div className="lg:col-span-6 space-y-3">
            {machines.map((mach) => {
              const isSelected = selectedMachine.id === mach.id;
              const machOee = (mach.oeeAvailability / 100) * (mach.oeePerformance / 100) * (mach.oeeQuality / 100) * 100;
              return (
                <div
                  key={mach.id}
                  onClick={() => setSelectedMachine(mach)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-900/20'
                      : 'bg-[#0B132B]/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {mach.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            mach.status === 'OPERATIONAL'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : mach.status === 'PREVENTIVE_DUE'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {mach.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">{mach.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{mach.location} • {mach.tonnageOrPower}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase">OEE</span>
                      <div className="text-base font-black text-amber-300">{machOee.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-500">Run Hours:</span>
                      <p className="font-mono font-bold text-slate-300">{mach.totalRunHours} hrs</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Next Service:</span>
                      <p className="font-bold text-slate-300">{mach.nextServiceDueDate}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Operator:</span>
                      <p className="font-bold text-slate-300 line-clamp-1">{mach.activeOperator}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Machine Detail & OEE Breakdown */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-2xl bg-[#0B132B]/90 border border-slate-800 shadow-xl space-y-5">
              <div className="pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {selectedMachine.id}
                  </span>
                  <span className="text-xs text-slate-400">{selectedMachine.category}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{selectedMachine.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedMachine.tonnageOrPower}</p>
              </div>

              {/* OEE 3-Factor Breakdown */}
              <div className="p-4 rounded-xl bg-[#070D1E] border border-amber-500/30 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  TPM OEE Breakdown (Overall Equipment Effectiveness)
                </h4>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Availability (A)</span>
                    <div className="text-lg font-black text-emerald-400 mt-1">{selectedMachine.oeeAvailability}%</div>
                    <span className="text-[10px] text-slate-500">Uptime vs Planned</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Performance (P)</span>
                    <div className="text-lg font-black text-blue-400 mt-1">{selectedMachine.oeePerformance}%</div>
                    <span className="text-[10px] text-slate-500">Curing Cycle Speed</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Quality (Q)</span>
                    <div className="text-lg font-black text-purple-400 mt-1">{selectedMachine.oeeQuality}%</div>
                    <span className="text-[10px] text-slate-500">Zero Defect Ratio</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Total OEE Index (A × P × Q):</span>
                  <span className="text-base font-black text-amber-300">
                    {(
                      (selectedMachine.oeeAvailability / 100) *
                      (selectedMachine.oeePerformance / 100) *
                      (selectedMachine.oeeQuality / 100) *
                      100
                    ).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Maintenance History */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Service Records
                </h4>
                <div className="p-3 rounded-lg bg-[#070D1E] border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Service:</span>
                    <span className="text-white font-medium">{selectedMachine.lastServiceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Next Scheduled PM:</span>
                    <span className="text-amber-400 font-bold">{selectedMachine.nextServiceDueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Shift Lead:</span>
                    <span className="text-white">{selectedMachine.activeOperator}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TICKETS' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0B132B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070D1E] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Subject & Issue</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.map((tkt) => (
                  <tr key={tkt.id} className="hover:bg-amber-950/20">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">{tkt.id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{tkt.machineName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {tkt.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tkt.priority === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {tkt.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{tkt.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{tkt.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{tkt.assignedEngineer}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tkt.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : tkt.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {tkt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B132B] border border-amber-500/40 p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Maintenance Work Order</h3>
                  <p className="text-xs text-slate-400">മെഷീൻ സർവീസ് / റിപ്പയർ ടിക്കറ്റ്</p>
                </div>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Machinery</label>
                <select
                  value={ticketMachineId}
                  onChange={(e) => setTicketMachineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Maintenance Type</label>
                  <select
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance (PM)</option>
                    <option value="BREAKDOWN">Breakdown / Emergency Repair</option>
                    <option value="CALIBRATION">Platen Thermal Calibration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                  >
                    <option value="CRITICAL">Critical (Production Halt)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Routine / Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Issue Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hydraulic pump pressure loss or oil filter replacement"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Detailed Symptoms & Work Required</label>
                <textarea
                  rows={3}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Describe abnormal noise, hydraulic leakage, or temperature variance..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Maintenance Engineer</label>
                <input
                  type="text"
                  value={ticketEngineer}
                  onChange={(e) => setTicketEngineer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/30"
                >
                  Dispatch Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
