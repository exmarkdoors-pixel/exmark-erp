'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Calendar,
  UserCheck,
  Building2,
  TrendingUp,
  Percent,
  Coins,
  Search,
  Filter,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
  Download,
  Award,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { COMPANY_PROFILE } from '../quotations/PrintDocumentHub';

interface StaffOrderReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSalespersonId?: string;
  initialStaffId?: string;
  initialFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export function StaffOrderReportModal({
  isOpen,
  onClose,
  initialSalespersonId = 'ALL',
  initialStaffId,
  initialFrequency = 'MONTHLY',
}: StaffOrderReportModalProps) {
  if (!isOpen) return null;

  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>(initialFrequency);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || initialSalespersonId);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);
  const [salesStaffList, setSalesStaffList] = useState<any[]>([]);
  const [activeViewMode, setActiveViewMode] = useState<'orders' | 'allStaffComparative'>('orders');

  // Load Sales Staff List
  useEffect(() => {
    fetch('/api/employees')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setSalesStaffList(d.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Report Data
  const fetchReport = () => {
    setIsLoading(true);
    let url = `/api/sales/reports/staff-orders?frequency=${frequency.toLowerCase()}`;
    if (selectedStaffId && selectedStaffId !== 'ALL') {
      url += `&salespersonId=${encodeURIComponent(selectedStaffId)}`;
    }
    if (frequency === 'DAILY') {
      url += `&date=${encodeURIComponent(selectedDate)}`;
    } else if (frequency === 'MONTHLY') {
      url += `&month=${encodeURIComponent(selectedMonth)}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setReportData(res.data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load staff orders report:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [frequency, selectedStaffId, selectedDate, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const summary = reportData?.summary || {
    totalOrders: 0,
    totalDoors: 0,
    totalRevenue: 0,
    totalAdvance: 0,
    totalCommission: 0,
    averageOrderValue: 0,
  };

  const orders = reportData?.orders || [];
  const allStaff = reportData?.allStaffComparative || [];
  const staff = reportData?.salesperson;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Screen Header & Filter Bar (Hidden on Print) */}
        <div className="flex flex-col gap-3 p-4 bg-slate-950/80 border-b border-slate-800 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Staff Sales Order & Commission Report</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    A4 PDF Print Hub
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Daily, Weekly, Monthly staff order analysis &amp; piece-rate / percentage commission ledger
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/40"
                title="Print or Export as Clean A4 PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF (A4)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar: Staff Selection, Frequency, Date */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Staff Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-400 font-semibold">Staff:</span>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">
                    👥 All Sales Staff (Consolidated)
                  </option>
                  {salesStaffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                      {s.name} ({s.employeeCode || 'REP'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency Selector */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      frequency === f
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f === 'DAILY' ? 'Daily' : f === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>

              {/* Specific Date or Month Picker */}
              {frequency === 'DAILY' && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none cursor-pointer"
                  />
                </div>
              )}

              {frequency === 'MONTHLY' && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* View Mode Toggle: Orders vs All-Staff Comparative */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveViewMode('orders')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeViewMode === 'orders'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Order Schedule ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('allStaffComparative')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeViewMode === 'allStaffComparative'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All-Staff Ranking ({allStaff.length})
              </button>
            </div>
          </div>
        </div>

        {/* Printable Sheet Body */}
        <div id="printableStaffReportArea" className="p-4 sm:p-8 overflow-y-auto bg-slate-950 text-slate-100 print:p-0 print:bg-white print:text-black">
          <div className="w-full max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 print:border-none print:shadow-none print:p-0 print:rounded-none">
            {/* 1. Official Kerala Factory Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-7 h-7 text-rose-700 shrink-0" />
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-950">
                      {COMPANY_PROFILE.name}
                    </h1>
                    <p className="text-[11px] font-semibold text-rose-700 tracking-wide">
                      {COMPANY_PROFILE.tagline}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 mt-1 max-w-md">
                  {COMPANY_PROFILE.address} • Ph: {COMPANY_PROFILE.phone} • Email: {COMPANY_PROFILE.email}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-black text-xs tracking-wider uppercase">
                  SALES REPORT
                </span>
                <div className="text-[11px] font-bold text-slate-800 mt-1">
                  {reportData?.periodLabel || 'Executive Sales Summary'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* 2. Staff Profile & Scope Strip */}
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Sales Personnel</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-4 h-4 text-rose-700" />
                  <span>
                    {staff ? `${staff.name} (${staff.code})` : 'All Kerala Sales Staff & Representatives'}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Territory / District</span>
                <span className="font-semibold text-slate-800">
                  {staff?.territory || 'All 14 Kerala Districts'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Default Commission Scheme</span>
                <span className="font-mono font-bold text-rose-800">
                  {staff ? (
                    staff.commissionType === 'PER_PIECE' ? `₹${staff.commissionRate} / Door (Per Piece)` : `${staff.commissionRate}% of Revenue`
                  ) : (
                    'Percentage (%) & Per-Piece (₹/Door)'
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Period Range</span>
                <span className="font-mono font-semibold text-slate-700">
                  {reportData?.dateRange?.start} to {reportData?.dateRange?.end}
                </span>
              </div>
            </div>

            {/* 3. Executive KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Orders Booked</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                  {summary.totalOrders}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Doors Volume</span>
                <span className="text-lg font-black font-mono text-cyan-800 mt-0.5 block">
                  {summary.totalDoors} Units
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Revenue</span>
                <span className="text-lg font-black font-mono text-emerald-700 mt-0.5 block">
                  ₹{summary.totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Advance Collected</span>
                <span className="text-lg font-black font-mono text-blue-700 mt-0.5 block">
                  ₹{summary.totalAdvance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">Commission Earned</span>
                <span className="text-lg font-black font-mono text-amber-900 mt-0.5 block">
                  ₹{summary.totalCommission.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 4. Tab A: Itemized Order Schedule Table */}
            {activeViewMode === 'orders' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>Itemized Sales Orders Registry</span>
                    <span className="text-[10px] font-normal text-slate-500 font-mono">
                      ({orders.length} Records)
                    </span>
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Values shown in Indian Rupees (INR ₹)
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date &amp; Quote #</th>
                        <th className="p-2.5">Customer &amp; Site</th>
                        <th className="p-2.5">Sales Rep</th>
                        <th className="p-2.5 text-center">Doors</th>
                        <th className="p-2.5 text-right">Order Value</th>
                        <th className="p-2.5 text-right">Commission Rate</th>
                        <th className="p-2.5 text-right">Earned Comm.</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                            No orders found for the selected time horizon and salesperson.
                          </td>
                        </tr>
                      ) : (
                        orders.map((o: any) => (
                          <tr key={o.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-2.5 font-mono">
                              <span className="font-bold text-slate-900 block">{o.quoteNumber}</span>
                              <span className="text-[10px] text-slate-500">{o.date}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 block">{o.customerName}</span>
                              <span className="text-[10px] text-slate-500 block">📍 {o.location}</span>
                            </td>
                            <td className="p-2.5 text-[11px]">
                              <span className="font-medium text-slate-800 block">{o.salespersonName}</span>
                              <span className="text-[9px] font-mono text-slate-500">{o.salespersonCode}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-cyan-800">
                              {o.doorsCount}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              ₹{o.orderAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right font-mono text-[11px]">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {o.commissionType === 'PER_PIECE' ? `₹${o.commissionRate}/pc` : `${o.commissionRate}%`}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-amber-800">
                              ₹{o.commissionAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                                o.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : o.status === 'ACCRUED'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="p-2.5 uppercase text-[10px]">
                          Grand Total ({orders.length} Orders)
                        </td>
                        <td className="p-2.5 text-center font-mono text-cyan-800 font-black">
                          {summary.totalDoors}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800 font-black">
                          ₹{summary.totalRevenue.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-[10px] text-slate-500">
                          Total Paid/Accr.
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-900 font-black text-sm">
                          ₹{summary.totalCommission.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Tab B: All-Staff Comparative Leaderboard Table */}
            {activeViewMode === 'allStaffComparative' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>All-Staff Performance &amp; Commission Comparative Analysis</span>
                    <span className="text-[10px] font-normal text-slate-500 font-mono">
                      ({allStaff.length} Sales Representatives)
                    </span>
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Ranked by revenue generation
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center">Rank</th>
                        <th className="p-2.5">Staff Name &amp; Code</th>
                        <th className="p-2.5">Assigned District</th>
                        <th className="p-2.5 text-center">Orders</th>
                        <th className="p-2.5 text-center">Doors</th>
                        <th className="p-2.5 text-right">Revenue</th>
                        <th className="p-2.5 text-right">Commission Model</th>
                        <th className="p-2.5 text-right">Commission Earned</th>
                        <th className="p-2.5 text-right">Quota Achieve %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allStaff.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                            No sales staff records found for this period.
                          </td>
                        </tr>
                      ) : (
                        allStaff.map((s: any) => (
                          <tr key={s.salespersonId} className="hover:bg-slate-50/80 transition">
                            <td className="p-2.5 text-center font-bold">
                              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
                                s.rank === 1
                                  ? 'bg-amber-400 text-amber-950 font-black'
                                  : s.rank === 2
                                  ? 'bg-slate-300 text-slate-900 font-black'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                #{s.rank}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 block">{s.salespersonName}</span>
                              <span className="text-[10px] font-mono text-slate-500">{s.salespersonCode}</span>
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-700">
                              {s.territory}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                              {s.ordersCount}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-cyan-800">
                              {s.doorsCount}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                              ₹{s.totalRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right font-mono text-[11px]">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {s.commissionType === 'PER_PIECE' ? `₹${s.commissionRate}/pc` : `${s.commissionRate}%`}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-amber-900">
                              ₹{s.totalCommission.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                s.achievementPercent >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.achievementPercent >= 70
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {s.achievementPercent}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="p-2.5 uppercase text-[10px]">
                          All Staff Consolidated Total
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {allStaff.reduce((sum: number, s: any) => sum + s.ordersCount, 0)}
                        </td>
                        <td className="p-2.5 text-center font-mono text-cyan-800 font-black">
                          {allStaff.reduce((sum: number, s: any) => sum + s.doorsCount, 0)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800 font-black">
                          ₹{allStaff.reduce((sum: number, s: any) => sum + s.totalRevenue, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-[10px] text-slate-500">
                          Total Comm.
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-900 font-black text-sm">
                          ₹{allStaff.reduce((sum: number, s: any) => sum + s.totalCommission, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Legal / Verification Notes & Signature Blocks */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="max-w-md">
                  <span className="font-bold text-slate-800 uppercase block mb-0.5">Report Certification Note</span>
                  <p className="leading-relaxed">
                    This official sales order and staff commission record is generated from the EXMARK Factory ERP database.
                    Commission calculations conform to approved management policy (% of net order value or ₹ piece-rate per door).
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">EX-MARK DOORS PRIVATE LIMITED</span>
                  <span className="text-[9px] text-slate-400">Vengara Factory Accounts &amp; Commercial Unit</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="border-t border-slate-400 pt-1 text-center">
                  <span className="font-semibold text-slate-700 block">Prepared By</span>
                  <span className="text-[9px] text-slate-400">Sales Desk Coordinator</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-center">
                  <span className="font-semibold text-slate-700 block">Verified By</span>
                  <span className="text-[9px] text-slate-400">Plant Accounts Manager</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-center">
                  <span className="font-semibold text-slate-700 block">Managing Director / Partner</span>
                  <span className="text-[9px] text-slate-400">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
