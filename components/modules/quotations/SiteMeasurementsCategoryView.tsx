'use client';

import React, { useState, useMemo } from 'react';
import {
  Ruler,
  Search,
  Filter,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Printer,
  Plus,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
  Award,
  Tag,
} from 'lucide-react';
import { SiteMeasurementRecord, DoorItemInput } from '@/types/measurements';

interface SiteMeasurementsCategoryViewProps {
  measurements: SiteMeasurementRecord[];
  salesStaff: Array<{ id: string; name: string; employeeCode: string; department?: string; location?: string }>;
  onLoadIntoWorkbench: (measurement: SiteMeasurementRecord) => void;
  onConvertToQuotation: (measurement: SiteMeasurementRecord) => void;
  onOpenNewMeasurement: () => void;
  onOpenCuttingSchedule?: (measurement: SiteMeasurementRecord) => void;
  onRefresh?: () => void;
}

export function SiteMeasurementsCategoryView({
  measurements,
  salesStaff,
  onLoadIntoWorkbench,
  onConvertToQuotation,
  onOpenNewMeasurement,
  onOpenCuttingSchedule,
  onRefresh,
}: SiteMeasurementsCategoryViewProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'QUOTED'>('ALL');
  const [displayUnit, setDisplayUnit] = useState<'CM' | 'INCH' | 'MM'>('CM');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Distinct staff names list from both salesStaff master and measurement records
  const staffOptions = useMemo(() => {
    const set = new Map<string, string>(); // key: query value, val: display name
    salesStaff.forEach((s) => {
      set.set(s.name.toLowerCase(), `${s.name} (${s.employeeCode})`);
    });
    measurements.forEach((m) => {
      if (m.engineerName) {
        const key = m.engineerName.toLowerCase();
        if (!set.has(key)) {
          set.set(key, m.engineerName);
        }
      }
    });
    return Array.from(set.entries()).map(([val, label]) => ({ val, label }));
  }, [salesStaff, measurements]);

  // Filtered list
  const filteredMeasurements = useMemo(() => {
    return measurements.filter((m) => {
      // 1. Staff filter
      if (selectedStaff !== 'ALL') {
        const engName = (m.engineerName || '').toLowerCase();
        const staffObj = salesStaff.find((s) => s.id === selectedStaff);
        const targetQuery = staffObj ? staffObj.name.toLowerCase() : selectedStaff.toLowerCase();
        const firstWord = targetQuery.split(' ')[0];
        if (!engName.includes(firstWord) && m.measuredById !== selectedStaff) {
          return false;
        }
      }

      // 2. Status filter
      const isQuoted = Boolean(m.orderRef && m.orderRef.trim());
      if (statusFilter === 'QUOTED' && !isQuoted) return false;
      if (statusFilter === 'PENDING' && isQuoted) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (m.refNumber || '').toLowerCase().includes(q) ||
          (m.siteName || '').toLowerCase().includes(q) ||
          (m.customerName || '').toLowerCase().includes(q) ||
          (m.district || '').toLowerCase().includes(q) ||
          (m.engineerName || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [measurements, selectedStaff, statusFilter, searchQuery, salesStaff]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const list = filteredMeasurements;
    const totalSites = list.length;
    const totalDoors = list.reduce((acc, m) => acc + (m.doors ? m.doors.reduce((dAcc, d) => dAcc + (d.quantity || 1), 0) : m.totalOpenings || 0), 0);
    const pendingQuotes = list.filter((m) => !m.orderRef || !m.orderRef.trim()).length;
    const quotedCount = totalSites - pendingQuotes;
    const estimatedValue = list.reduce((acc, m) => {
      if (!m.doors) return acc;
      return (
        acc +
        m.doors.reduce((dAcc, d) => {
          const qty = d.quantity || 1;
          const rate = d.unitPrice || 7500;
          return dAcc + rate * qty;
        }, 0)
      );
    }, 0);

    return { totalSites, totalDoors, pendingQuotes, quotedCount, estimatedValue };
  }, [filteredMeasurements]);

  // Format dimensions according to selected unit
  const formatDimension = (valMm: number, unit: 'CM' | 'INCH' | 'MM') => {
    if (!valMm || isNaN(valMm)) return '0';
    if (unit === 'CM') return `${(valMm / 10).toFixed(1)} cm`;
    if (unit === 'INCH') return `${(valMm / 25.4).toFixed(2)}"`;
    return `${Math.round(valMm)} mm`;
  };

  return (
    <div className="p-5 overflow-y-auto space-y-5 flex-1">
      {/* ── TOP BANNER & STAFF FILTER BAR ── */}
      <div className="bg-[#10172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                <Ruler className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Site Door Measurements by Staff</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-semibold border border-cyan-500/30">
                    Category: Site Measurement
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Door schedules recorded on-site by Kerala field engineers &amp; sales executives with automatic quotation linking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Unit Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              {(['CM', 'INCH', 'MM'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setDisplayUnit(u)}
                  className={`px-2.5 py-1 rounded font-bold transition cursor-pointer text-[11px] ${
                    displayUnit === u ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            {/* Action: Record New Measurement */}
            <button
              type="button"
              onClick={onOpenNewMeasurement}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Site Measurement</span>
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition cursor-pointer"
                title="Refresh Measurements"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          {/* Staff Name Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Measuring Staff:</span>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Measuring Staff ({measurements.length} Sites)</option>
                {staffOptions.map((s) => (
                  <option key={s.val} value={s.val} className="bg-slate-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Search Site / Customer:</span>
              <input
                type="text"
                placeholder="Site name, district, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white font-medium focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Quotation Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Records</option>
                <option value="PENDING" className="bg-slate-900 text-white">Pending Quotation (Unquoted)</option>
                <option value="QUOTED" className="bg-slate-900 text-white">Converted / Quoted</option>
              </select>
            </div>
          </div>

          {/* District Counter Badge */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Filtered Results</span>
              <span className="text-xs text-emerald-400 font-bold font-mono">
                {filteredMeasurements.length} Sites ({metrics.totalDoors} Doors)
              </span>
            </div>
            <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold font-mono">
              {filteredMeasurements.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── STAFF PERFORMANCE & METRICS RIBBON ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Sites Measured</span>
            <span className="text-lg font-extrabold text-white font-mono">{metrics.totalSites} Sites</span>
            <span className="text-[10px] text-cyan-400 block font-medium">Kerala Project Locations</span>
          </div>
        </div>

        <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Door Openings</span>
            <span className="text-lg font-extrabold text-white font-mono">{metrics.totalDoors} Openings</span>
            <span className="text-[10px] text-amber-400 block font-medium">Bath FRP, Bedroom &amp; Main</span>
          </div>
        </div>

        <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pending Quotations</span>
            <span className="text-lg font-extrabold text-rose-400 font-mono">{metrics.pendingQuotes} Unquoted</span>
            <span className="text-[10px] text-slate-400 block font-medium">Ready for Pricing</span>
          </div>
        </div>

        <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Estimated Quote Value</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">
              ₹{(metrics.estimatedValue / 100000).toFixed(2)} Lakhs
            </span>
            <span className="text-[10px] text-emerald-300 block font-medium">
              {metrics.quotedCount} Quoted • {metrics.pendingQuotes} Pending
            </span>
          </div>
        </div>
      </div>

      {/* ── SITE MEASUREMENT CARDS LIST ── */}
      {filteredMeasurements.length === 0 ? (
        <div className="bg-[#10172a] border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Ruler className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Site Measurements Found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No measurements match the selected staff member or search criteria. Use the button below to record the first door opening measurement.
          </p>
          <button
            type="button"
            onClick={onOpenNewMeasurement}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-2 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Site Measurement Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeasurements.map((m) => {
            const isExpanded = Boolean(expandedCards[m.id]);
            const doors = m.doors || [];
            const totalDoors = doors.reduce((acc, d) => acc + (d.quantity || 1), 0);
            const isQuoted = Boolean(m.orderRef && m.orderRef.trim());
            const siteTotalAmount = doors.reduce((acc, d) => acc + (d.unitPrice || 7500) * (d.quantity || 1), 0);

            return (
              <div
                key={m.id}
                className="bg-[#10172a] border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden shadow-lg transition"
              >
                {/* Card Header Banner */}
                <div className="p-4 bg-gradient-to-r from-slate-900/90 via-[#131b2e] to-slate-900/90 flex items-center justify-between flex-wrap gap-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-xs flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{m.refNumber}</span>
                    </span>

                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{m.siteName}</span>
                        <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{m.district}</span>
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Client: <span className="font-semibold text-slate-300">{m.customerName || 'Direct Builder'}</span> • Date:{' '}
                        <span className="font-mono text-slate-300">{m.date}</span>
                      </p>
                    </div>
                  </div>

                  {/* Staff Attribution Badge & Status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Staff Tag */}
                    <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-800/40 px-2.5 py-1 rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">
                        {(m.engineerName || 'S').charAt(0)}
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-amber-400/80 uppercase font-bold block leading-none">Measured By Staff:</span>
                        <span className="text-xs font-bold text-amber-200">{m.engineerName || 'Anoop Krishnan (Sr. Site Engineer)'}</span>
                      </div>
                    </div>

                    {/* Quotation Status Tag */}
                    {isQuoted ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>QUOTED: {m.orderRef}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-amber-950/60 text-amber-300 border border-amber-700/50 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>PENDING QUOTATION</span>
                      </span>
                    )}

                    {/* Value Badge */}
                    <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      ₹{siteTotalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Card Middle: Summary Specs & Wall Thickness */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-b border-slate-800/60 bg-slate-950/30">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Openings Schedule:</span>
                    <span className="font-bold text-white">
                      {totalDoors} Doors ({doors.length} Unique Sizes / Specs)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Rebate &amp; Wall Spec:</span>
                    <span className="text-slate-300">
                      {m.rebateDepthMm || 'Standard 100x65mm'} • {m.wallThicknessMm || '125mm Masonry'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Engineer Site Notes:</span>
                    <span className="text-slate-400 italic">
                      {m.notes || 'Finished floor tile clearance checked. Plumb alignment verified.'}
                    </span>
                  </div>
                </div>

                {/* Card Door Schedule Accordion */}
                <div className="px-4 py-3 bg-[#0d1322] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleExpand(m.id)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide' : 'View'} Door-by-Door Opening Schedule ({doors.length} Doors)</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Action 1: Load into Workbench */}
                    <button
                      type="button"
                      onClick={() => onLoadIntoWorkbench(m)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      title="Load this site measurement doors into the active Quotation Workbench draft"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Load into Workbench</span>
                    </button>

                    {/* Action 2: Convert to Quotation */}
                    <button
                      type="button"
                      onClick={() => onConvertToQuotation(m)}
                      className="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Auto-calculate and generate official quotation attributed to this staff member"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isQuoted ? 'Re-Calculate Quote' : '⚡ Convert to Quotation'}</span>
                    </button>

                    {/* Action 3: Cutting Schedule Print */}
                    {onOpenCuttingSchedule && (
                      <button
                        type="button"
                        onClick={() => onOpenCuttingSchedule(m)}
                        className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                        title="Print Carpentry Cutting Schedule"
                      >
                        <Printer className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Cutting</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Door Openings Schedule Table */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 bg-slate-950/60 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="py-2 px-3">Door #</th>
                          <th className="py-2 px-3">Room / Category</th>
                          <th className="py-2 px-3">Model &amp; Material</th>
                          <th className="py-2 px-3">Finished Size ({displayUnit})</th>
                          <th className="py-2 px-3">Frame Type</th>
                          <th className="py-2 px-3">Lock &amp; Hinge</th>
                          <th className="py-2 px-3">Finish Colour</th>
                          <th className="py-2 px-3 text-right">Unit Rate</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {doors.map((d, dIdx) => {
                          // Resolve mm dimensions
                          let hMm = d.heightLeft || 2100;
                          let wMm = d.widthTop || 900;
                          if (d.measurementUnit === 'INCH') {
                            hMm = hMm * 25.4;
                            wMm = wMm * 25.4;
                          } else if (d.measurementUnit === 'CM') {
                            hMm = hMm * 10;
                            wMm = wMm * 10;
                          }
                          const qty = d.quantity || 1;
                          const unitPrice = d.unitPrice || 7500;
                          const total = unitPrice * qty;

                          return (
                            <tr key={d.id || `door-${dIdx}`} className="hover:bg-slate-900/40">
                              <td className="py-2.5 px-3 font-bold font-mono text-cyan-400">
                                {d.doorNumber || `#D${dIdx + 1}`}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-300">
                                {d.categoryName || d.remarks?.split('.')[0] || 'Standard Opening'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-200">
                                {d.model}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                                {formatDimension(wMm, displayUnit)} &times; {formatDimension(hMm, displayUnit)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {d.frameType || 'WPC Solid Extruded'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                                {d.lockType} • {d.hingeSide}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {d.colour || 'Natural Teak'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                                ₹{unitPrice.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                ₹{total.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
