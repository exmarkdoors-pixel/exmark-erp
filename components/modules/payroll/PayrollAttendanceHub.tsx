'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  Calendar,
  DollarSign,
  Printer,
  CheckCircle2,
  Download,
  CreditCard,
  Save,
  Search,
  Clock,
  Sliders,
  Camera,
  MapPin,
  Edit3,
  ClipboardCheck,
  Navigation,
  X,
} from 'lucide-react';
import type {
  EmployeeMonthlyAttendance,
  AttendanceStatus,
  SalarySlipRecord,
  MonthlyPayrollOverview,
  DailyPunchEvent,
  FactoryGeofenceConfig,
  LeaveRequestRecord,
} from '@/types/payroll';
import { PayslipPrintModal } from './PayslipPrintModal';
import { StaffGMapRouteVisualizer } from '../fieldservice/StaffGMapRouteVisualizer';
import {
  TotalXPolicySettingsModal,
  SalarySlipAdjustmentModal,
} from './TotalXSettingsAndAdjustmentModals';
import { MobileSelfiePunchPanel } from '@/components/mobile/MobileSelfiePunchPanel';
import { MobileCustomerVisitModal } from '@/components/mobile/MobileCustomerVisitModal';

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  P: { label: 'P', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  A: { label: 'A', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  HD: { label: 'HD', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  OT: { label: 'OT', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  WO: { label: 'WO', bg: 'bg-slate-700/40', text: 'text-slate-400', border: 'border-slate-600/40' },
  H: { label: 'H', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  L: { label: 'L', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
};

const STATUS_CYCLE: AttendanceStatus[] = ['P', 'OT', 'HD', 'A', 'WO', 'H', 'L'];

type HubTab = 'LIVE_TODAY' | 'ROUTE_HISTORY' | 'ATTENDANCE' | 'SALARY_REGISTER' | 'LEAVES';

export function PayrollAttendanceHub() {
  const currentMonthStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<HubTab>('LIVE_TODAY');

  // Attendance matrix & salary register
  const [attendanceList, setAttendanceList] = useState<EmployeeMonthlyAttendance[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [payrollOverview, setPayrollOverview] = useState<MonthlyPayrollOverview | null>(null);
  const [isPayrollLoading, setIsPayrollLoading] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);

  // TotalX Live Today, Geofence & Leaves states
  const [livePunches, setLivePunches] = useState<DailyPunchEvent[]>([]);
  const [geofenceConfig, setGeofenceConfig] = useState<FactoryGeofenceConfig | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [liveLocationsCount, setLiveLocationsCount] = useState<number>(0);

  // Modals
  const [selectedSlip, setSelectedSlip] = useState<SalarySlipRecord | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<SalarySlipRecord | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDesktopPunchModal, setShowDesktopPunchModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [desktopPunchEmpId, setDesktopPunchEmpId] = useState<string>('');
  const [zoomedSelfie, setZoomedSelfie] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadAttendance = useCallback(async (month: string) => {
    setIsAttendanceLoading(true);
    try {
      const res = await apiFetch(`/api/payroll/attendance?month=${month}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAttendanceList(json.data);
        if (!desktopPunchEmpId && json.data.length > 0) {
          setDesktopPunchEmpId(json.data[0].employeeId);
        }
      }
    } catch {
      notify('Failed to load employee attendance.');
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [desktopPunchEmpId]);

  const loadSalaryRegister = useCallback(async (month: string) => {
    setIsPayrollLoading(true);
    try {
      const res = await apiFetch(`/api/payroll/salary?month=${month}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPayrollOverview(json.data);
      }
    } catch {
      notify('Failed to load monthly salary register.');
    } finally {
      setIsPayrollLoading(false);
    }
  }, []);

  const loadTotalXLiveTelemetry = useCallback(async () => {
    try {
      const [punchRes, leaveRes, locRes] = await Promise.all([
        apiFetch(`/api/payroll/punch?date=${todayStr}`),
        apiFetch('/api/payroll/leaves'),
        apiFetch('/api/tracking/location'),
      ]);
      const pJson = await punchRes.json();
      if (pJson.success) {
        setLivePunches(Array.isArray(pJson.punches) ? pJson.punches : []);
        if (pJson.geofence) setGeofenceConfig(pJson.geofence);
      }
      const lJson = await leaveRes.json();
      if (lJson.success && Array.isArray(lJson.data)) {
        setLeaveRequests(lJson.data);
      }
      const tJson = await locRes.json();
      if (tJson.success && Array.isArray(tJson.activeStaff)) {
        setLiveLocationsCount(tJson.activeStaff.length);
      }
    } catch {
      // non-fatal
    }
  }, [todayStr]);

  useEffect(() => {
    loadAttendance(selectedMonth);
    loadSalaryRegister(selectedMonth);
    loadTotalXLiveTelemetry();
  }, [selectedMonth, loadAttendance, loadSalaryRegister, loadTotalXLiveTelemetry]);

  const handleCellClick = (employeeId: string, day: number) => {
    setAttendanceList((prev) =>
      prev.map((emp) => {
        if (emp.employeeId !== employeeId) return emp;
        const currentStatus = emp.dailyStatus[day] || 'P';
        const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
        const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];

        const updatedStatus = { ...emp.dailyStatus, [day]: nextStatus };

        let pCount = 0;
        let aCount = 0;
        let hdCount = 0;
        let woCount = 0;
        let hCount = 0;
        Object.values(updatedStatus).forEach((st) => {
          if (st === 'P' || st === 'OT' || st === 'L') pCount++;
          else if (st === 'A') aCount++;
          else if (st === 'HD') hdCount++;
          else if (st === 'WO') woCount++;
          else if (st === 'H') hCount++;
        });

        const payableDays = pCount + woCount + hCount + hdCount * 0.5;

        return {
          ...emp,
          dailyStatus: updatedStatus,
          totalPresent: pCount,
          totalAbsent: aCount,
          totalHalfDays: hdCount,
          totalWeeklyOffs: woCount,
          totalHolidays: hCount,
          payableDays,
        };
      })
    );
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const res = await apiFetch('/api/payroll/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          records: attendanceList,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify('Attendance matrix saved cleanly.');
        loadSalaryRegister(selectedMonth);
      } else {
        notify(json.error || 'Failed to save attendance.');
      }
    } catch {
      notify('Network error saving attendance.');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleMarkAllPresentToday = () => {
    const today = new Date().getDate();
    setAttendanceList((prev) =>
      prev.map((emp) => ({
        ...emp,
        dailyStatus: {
          ...emp.dailyStatus,
          [today]: 'P',
        },
      }))
    );
    notify(`Marked all staff PRESENT for Day ${today}. Click Save Attendance to apply.`);
  };

  const handleDisburseAll = async () => {
    if (!payrollOverview || payrollOverview.pendingCount === 0) {
      alert('No pending salaries to disburse.');
      return;
    }

    const confirmDisburse = confirm(
      `Disburse ₹${payrollOverview.totalNetDisbursal.toLocaleString(
        'en-IN'
      )} for ${payrollOverview.pendingCount} staff members?\n\nThis will post a double-entry Factory Labor Expense voucher (DR Labor Expense / CR Main Bank).`
    );

    if (!confirmDisburse) return;

    setIsDisbursing(true);
    try {
      const res = await apiFetch('/api/payroll/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          paymentMode: 'BANK_NEFT',
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`Disbursed ${json.disbursedCount} salaries and posted accounting voucher.`);
        loadSalaryRegister(selectedMonth);
      } else {
        notify(json.error || 'Failed to disburse salaries.');
      }
    } catch {
      notify('Network error executing disbursal.');
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleReviewLeave = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await apiFetch('/api/payroll/leaves', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status }),
      });
      const json = await res.json();
      if (json.success) {
        setLeaveRequests((prev) => prev.map((l) => (l.id === leaveId ? json.leave : l)));
        notify(`Leave request ${status.toLowerCase()} and attendance updated.`);
        loadAttendance(selectedMonth);
        loadSalaryRegister(selectedMonth);
      }
    } catch {
      notify('Failed to update leave status.');
    }
  };

  const handleApproveTravelBata = async (employeeId: string, bataAmount: number) => {
    try {
      const slip = payrollOverview?.slips.find((s) => s.employeeId === employeeId);
      const nextBata = (slip?.travelBataAllowance || 0) + bataAmount;
      const res = await apiFetch('/api/payroll/salary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          employeeId,
          adjustments: { travelBataAllowance: nextBata },
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`Approved ₹${bataAmount} GPS Travel Bata directly into payroll slip!`);
        loadSalaryRegister(selectedMonth);
      }
    } catch {
      notify('Failed to apply travel bata.');
    }
  };

  const daysInMonthCount = attendanceList[0]?.daysInMonth || 30;
  const daysArray = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  const filteredAttendance = attendanceList.filter(
    (a) =>
      a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Live Today metrics
  const punchedInCount = livePunches.filter((p) => p.status === 'IN' || p.status === 'LATE').length;
  const lateInCount = livePunches.filter((p) => p.lateMinutes > 0).length;
  const shiftDoneCount = livePunches.filter((p) => p.status === 'OUT').length;
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'PENDING').length;

  const staffOptions = attendanceList.map((a) => ({
    id: a.employeeId,
    employeeCode: a.employeeCode,
    name: a.employeeName,
    role: a.role,
  }));

  const selectedDesktopEmp =
    attendanceList.find((a) => a.employeeId === desktopPunchEmpId) || attendanceList[0];

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div className="px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Top Control & Summary Banner ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B132B] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              <span>TotalX Workforce, Geo-Selfie Attendance &amp; Hourly OT Payroll</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Location-based &amp; roaming selfie punch-in, live Google Maps route history, customer site selfies &amp; hourly overtime payroll.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowDesktopPunchModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Desktop / .exe Selfie Punch</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Geofence, Shift &amp; OT Rules</span>
            </button>

            {activeTab === 'ATTENDANCE' && (
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingAttendance ? 'Saving...' : 'Save Matrix'}</span>
              </button>
            )}

            {activeTab === 'SALARY_REGISTER' && (
              <>
                <a
                  href={`/api/payroll/salary?month=${selectedMonth}&format=neft`}
                  download={`EXMARK-Bank-NEFT-${selectedMonth}.xlsx`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Bank NEFT Excel</span>
                </a>
                <button
                  type="button"
                  onClick={handleDisburseAll}
                  disabled={isDisbursing || !payrollOverview || payrollOverview.pendingCount === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isDisbursing ? 'Disbursing...' : 'Disburse via Bank'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* TotalX 5 Live KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Today In / On Duty</span>
            <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {punchedInCount + shiftDoneCount} / {attendanceList.length}
            </p>
            <span className="text-[10px] text-slate-500">{lateInCount} Late Arrivals Today</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Live GPS Field Units</span>
            <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">
              {liveLocationsCount} Active
            </p>
            <span className="text-[10px] text-slate-500">Tracked on Route Map</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Pending Leaves</span>
            <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
              {pendingLeavesCount} Requests
            </p>
            <span className="text-[10px] text-slate-500">From Mobile Staff App</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Payroll</span>
            <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ₹{(payrollOverview?.totalGrossPayable || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-500">Includes Hourly OT &amp; Bata</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">Net Disbursal</span>
            <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              ₹{(payrollOverview?.totalNetDisbursal || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-emerald-500 font-semibold">
              {payrollOverview?.disbursedCount || 0} Paid • {payrollOverview?.pendingCount || 0} Pending
            </span>
          </div>
        </div>
      </div>

      {/* ── TotalX Multi-Tab Navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-800">
        {[
          { id: 'LIVE_TODAY', label: 'Live Today & Selfie Punches', icon: Camera },
          { id: 'ROUTE_HISTORY', label: 'GMap Route History & Visits', icon: Navigation },
          { id: 'ATTENDANCE', label: '31-Day Attendance Matrix', icon: Calendar },
          { id: 'SALARY_REGISTER', label: 'Salary & Hourly OT Register', icon: DollarSign },
          { id: 'LEAVES', label: `Leave Approvals (${pendingLeavesCount})`, icon: ClipboardCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as HubTab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: LIVE TODAY SELFIE PUNCHES (TOTALX VIEW) ───────────────── */}
      {activeTab === 'LIVE_TODAY' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Today&apos;s Live Selfie Attendance Feed ({todayStr})
              </h3>
              <p className="text-xs text-slate-400">
                Real-time geofenced factory punches &amp; roaming field staff GPS check-ins
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVisitModal(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Log Field Customer Visit</span>
            </button>
          </div>

          {livePunches.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-700 rounded-2xl text-xs text-slate-400 space-y-2">
              <p>No selfie punches recorded yet today ({todayStr}).</p>
              <p>
                Staff can punch in from <code className="text-cyan-400 font-mono">https://exmarerp.com/mobile</code> or click{' '}
                <b>&quot;Desktop / .exe Selfie Punch&quot;</b> above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {livePunches.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {p.punchInSelfie && (
                        <img
                          src={p.punchInSelfie}
                          alt={p.employeeName}
                          onClick={() => setZoomedSelfie(p.punchInSelfie || null)}
                          className="w-14 h-14 rounded-xl object-cover border border-emerald-500/40 cursor-pointer shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-black text-xs text-slate-900 dark:text-white">{p.employeeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {p.employeeCode} • {p.role}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-black ${
                            p.policyMode === 'ANY_LOCATION'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {p.policyMode === 'ANY_LOCATION' ? 'Field Any-Location' : 'Factory Geofence'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        p.status === 'IN'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center bg-black/20 p-2 rounded-lg text-[10px] font-mono">
                    <div>
                      <div className="text-slate-400">IN</div>
                      <div className="text-emerald-400 font-bold">
                        {p.punchInTime ? new Date(p.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">OUT</div>
                      <div className="text-rose-400 font-bold">
                        {p.punchOutTime ? new Date(p.punchOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'ON DUTY'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">OT HRS</div>
                      <div className="text-purple-400 font-bold">+{p.overtimeHoursCalculated || 0}h</div>
                    </div>
                  </div>

                  {p.punchInLocation && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1">
                      <span className="truncate">📍 {p.punchInLocation.address}</span>
                      {typeof p.punchInLocation.distanceFromFactoryMeters === 'number' && (
                        <span className="font-mono text-emerald-400 shrink-0">
                          {p.punchInLocation.distanceFromFactoryMeters}m
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: GMAP ROUTE HISTORY & CUSTOMER VISITS ─────────────────── */}
      {activeTab === 'ROUTE_HISTORY' && (
        <StaffGMapRouteVisualizer
          employees={staffOptions}
          geofence={geofenceConfig}
          onApplyTravelBata={handleApproveTravelBata}
        />
      )}

      {/* ── TAB 3: 31-DAY ATTENDANCE MATRIX ─────────────────────────────── */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
              <span className="font-bold text-slate-500">Legend:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">P = Present</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">OT = Overtime</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">HD = Half Day</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">A = Absent</span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">L = Leave</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 font-bold">WO = Week Off</span>
              <button
                type="button"
                onClick={handleMarkAllPresentToday}
                className="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
              >
                Mark All Present Today
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 min-w-[160px]">
                    Employee
                  </th>
                  <th className="p-2.5 text-center min-w-[60px]">Days</th>
                  {daysArray.map((day) => (
                    <th key={day} className="p-1.5 text-center min-w-[28px] font-mono text-[10px]">
                      {day}
                    </th>
                  ))}
                  <th className="p-2.5 text-center min-w-[60px] bg-slate-100 dark:bg-slate-900 font-bold text-purple-400">
                    OT Hrs
                  </th>
                  <th className="p-2.5 text-center min-w-[70px] bg-slate-100 dark:bg-slate-900 font-black">
                    Payable
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isAttendanceLoading ? (
                  <tr>
                    <td colSpan={daysInMonthCount + 4} className="p-8 text-center text-slate-400">
                      Loading attendance grid...
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonthCount + 4} className="p-8 text-center text-slate-400">
                      No employees found for this month.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((emp) => (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="p-2.5 sticky left-0 z-10 bg-white dark:bg-[#0B132B]">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {emp.employeeName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {emp.employeeCode} • {emp.role}
                        </div>
                      </td>

                      <td className="p-2 text-center font-mono text-[11px] text-slate-500">
                        {emp.totalPresent}P / {emp.totalAbsent}A
                      </td>

                      {daysArray.map((day) => {
                        const status = emp.dailyStatus[day] || 'P';
                        const config = STATUS_CONFIG[status] || STATUS_CONFIG.P;
                        const dayOt = emp.dailyOtHours?.[day];
                        return (
                          <td key={day} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleCellClick(emp.employeeId, day)}
                              className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] border transition-all cursor-pointer ${config.bg} ${config.text} ${config.border}`}
                              title={`Day ${day}: ${config.label}${dayOt ? ` (+${dayOt}h OT)` : ''} (Click to change)`}
                            >
                              {config.label}
                            </button>
                          </td>
                        );
                      })}

                      <td className="p-2 text-center font-mono text-purple-400 font-bold text-xs">
                        {emp.totalOvertimeHours || 0}h
                      </td>

                      <td className="p-2.5 text-center font-black font-mono text-emerald-400 text-xs bg-slate-50 dark:bg-black/20">
                        {emp.payableDays} d
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: MONTHLY SALARY REGISTER & HOURLY OT ───────────────────── */}
      {activeTab === 'SALARY_REGISTER' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-3 p-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3 text-center">Payable</th>
                  <th className="p-3 text-right">Earned Base</th>
                  <th className="p-3 text-right">Hourly OT</th>
                  <th className="p-3 text-right">Travel Bata &amp; Allow.</th>
                  <th className="p-3 text-right">Deductions</th>
                  <th className="p-3 text-right font-black">Net Salary (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isPayrollLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Computing hourly OT &amp; salary register...
                    </td>
                  </tr>
                ) : !payrollOverview || payrollOverview.slips.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No salary records generated.
                    </td>
                  </tr>
                ) : (
                  payrollOverview.slips.map((slip) => (
                    <tr
                      key={slip.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {slip.employeeName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {slip.employeeCode} • {slip.department}
                        </div>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {slip.payableDays} / {slip.totalDaysInMonth}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        ₹{slip.earnedBasicPay.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 text-right font-mono">
                        <div className="text-purple-400 font-bold">
                          ₹{slip.earnedOvertimePay.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9.5px] text-slate-400">
                          {slip.overtimeHours}h × ₹{slip.overtimeHourlyRate}
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono">
                        <div className="text-cyan-400 font-bold">
                          ₹{(
                            (slip.travelBataAllowance || 0) +
                            slip.foodAllowance +
                            slip.conveyanceAllowance +
                            slip.performanceBonus
                          ).toLocaleString('en-IN')}
                        </div>
                        {(slip.distanceTraveledKm || 0) > 0 && (
                          <div className="text-[9.5px] text-slate-400">
                            GPS: {slip.distanceTraveledKm} km
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono text-rose-500">
                        ₹{slip.totalDeductions.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 text-right font-mono font-black text-emerald-400 text-sm">
                        ₹{slip.netPayableRupees.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            slip.paymentStatus === 'DISBURSED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {slip.paymentStatus}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSlip(slip)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-bold cursor-pointer"
                            title="Adjust Hourly OT, Travel Bata, Bonus & Deductions"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlip(slip);
                              setIsPayslipOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Payslip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: LEAVE APPROVALS QUEUE ────────────────────────────────── */}
      {activeTab === 'LEAVES' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Staff Leave Requests (Submitted via Mobile &amp; Desktop App)
          </h3>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Leave Type</th>
                  <th className="p-3">Dates &amp; Days</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No leave applications recorded.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((lv) => (
                    <tr key={lv.id}>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{lv.employeeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{lv.employeeCode}</div>
                      </td>
                      <td className="p-3 font-bold text-cyan-400">{lv.leaveType}</td>
                      <td className="p-3 font-mono text-slate-300">
                        {lv.fromDate} → {lv.toDate} ({lv.leaveDaysCount}d)
                      </td>
                      <td className="p-3 text-slate-400 max-w-xs">{lv.reason}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            lv.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : lv.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {lv.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {lv.status === 'PENDING' ? (
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReviewLeave(lv.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewLeave(lv.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Reviewed by {lv.reviewedBy || 'Admin'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Desktop / .exe Native Selfie Punch Modal */}
      {showDesktopPunchModal && selectedDesktopEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 my-auto">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-black">Desktop / .exe Station Punch-In</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDesktopPunchModal(false);
                  loadTotalXLiveTelemetry();
                  loadAttendance(selectedMonth);
                }}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[82vh] overflow-y-auto">
              <div>
                <label className="text-[10.5px] text-slate-400 block mb-1">Select Staff Member</label>
                <select
                  value={desktopPunchEmpId}
                  onChange={(e) => setDesktopPunchEmpId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white font-bold"
                >
                  {attendanceList.map((a) => (
                    <option key={a.employeeId} value={a.employeeId}>
                      {a.employeeName} ({a.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <MobileSelfiePunchPanel
                employeeId={selectedDesktopEmp.employeeId}
                employeeCode={selectedDesktopEmp.employeeCode}
                employeeName={selectedDesktopEmp.employeeName}
                department={selectedDesktopEmp.department}
                onOpenCustomerVisitModal={() => {
                  setShowDesktopPunchModal(false);
                  setShowVisitModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Field Visit Modal (triggerable from Desktop Hub as well) */}
      {selectedDesktopEmp && (
        <MobileCustomerVisitModal
          isOpen={showVisitModal}
          onClose={() => setShowVisitModal(false)}
          staffId={selectedDesktopEmp.employeeId}
          staffCode={selectedDesktopEmp.employeeCode}
          staffName={selectedDesktopEmp.employeeName}
          staffRole={selectedDesktopEmp.role}
          onVisitLogged={() => {
            notify('Customer site visit & geo-selfie logged cleanly!');
            loadTotalXLiveTelemetry();
          }}
        />
      )}

      {/* Policy & Shift Config Modal */}
      <TotalXPolicySettingsModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        onSaved={() => {
          notify('Workforce geofence, shift & hourly OT rules saved!');
          loadTotalXLiveTelemetry();
          loadSalaryRegister(selectedMonth);
        }}
      />

      {/* Inline Salary Adjustment Modal */}
      <SalarySlipAdjustmentModal
        slip={editingSlip}
        month={selectedMonth}
        onClose={() => setEditingSlip(null)}
        onUpdated={() => {
          notify('Salary slip updated & recalculated.');
          loadSalaryRegister(selectedMonth);
        }}
      />

      {/* Payslip Print Modal */}
      <PayslipPrintModal
        slip={selectedSlip}
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
      />

      {/* Selfie Zoom Overlay */}
      {zoomedSelfie && (
        <div
          onClick={() => setZoomedSelfie(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={zoomedSelfie} alt="Verified Selfie" className="max-w-lg w-full rounded-2xl border border-slate-700" />
        </div>
      )}
    </div>
  );
}
export default PayrollAttendanceHub;
