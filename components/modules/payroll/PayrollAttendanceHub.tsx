'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  Calendar,
  Users,
  DollarSign,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  CreditCard,
  Save,
  Search,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type {
  EmployeeMonthlyAttendance,
  AttendanceStatus,
  SalarySlipRecord,
  MonthlyPayrollOverview,
} from '@/types/payroll';
import { PayslipPrintModal } from './PayslipPrintModal';

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

export function PayrollAttendanceHub() {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'SALARY_REGISTER'>('ATTENDANCE');

  // Attendance state
  const [attendanceList, setAttendanceList] = useState<EmployeeMonthlyAttendance[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Payroll register state
  const [payrollOverview, setPayrollOverview] = useState<MonthlyPayrollOverview | null>(null);
  const [isPayrollLoading, setIsPayrollLoading] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Payslip modal state
  const [selectedSlip, setSelectedSlip] = useState<SalarySlipRecord | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // Toast notice
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load attendance data
  const loadAttendance = async (month: string) => {
    setIsAttendanceLoading(true);
    try {
      const res = await apiFetch(`/api/payroll/attendance?month=${month}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAttendanceList(json.data);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
      notify('Failed to load employee attendance.');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Load salary register data
  const loadSalaryRegister = async (month: string) => {
    setIsPayrollLoading(true);
    try {
      const res = await apiFetch(`/api/payroll/salary?month=${month}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPayrollOverview(json.data);
      }
    } catch (err) {
      console.error('Failed to load salary register:', err);
      notify('Failed to load monthly salary register.');
    } finally {
      setIsPayrollLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(selectedMonth);
    loadSalaryRegister(selectedMonth);
  }, [selectedMonth]);

  // Cycle attendance status when clicking a cell
  const handleCellClick = (employeeId: string, day: number) => {
    setAttendanceList((prev) =>
      prev.map((emp) => {
        if (emp.employeeId !== employeeId) return emp;
        const currentStatus = emp.dailyStatus[day] || 'P';
        const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
        const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];

        const updatedStatus = { ...emp.dailyStatus, [day]: nextStatus };

        // Recalculate totals
        let pCount = 0;
        let aCount = 0;
        let hdCount = 0;
        let woCount = 0;
        let hCount = 0;
        Object.values(updatedStatus).forEach((st) => {
          if (st === 'P' || st === 'OT') pCount++;
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

  // Save attendance to backend
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
        notify('✅ Attendance matrix saved successfully!');
        // Refresh salary register as well
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

  // Mark all present for today
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
    notify(`Marked all employees PRESENT for Day ${today}. Click 'Save Attendance' to persist.`);
  };

  // Disburse salaries and post double-entry vouchers
  const handleDisburseAll = async () => {
    if (!payrollOverview || payrollOverview.pendingCount === 0) {
      alert('No pending salaries to disburse.');
      return;
    }

    const confirmDisburse = confirm(
      `Disburse ₹${payrollOverview.totalNetDisbursal.toLocaleString(
        'en-IN'
      )} for ${payrollOverview.pendingCount} staff members?\n\nThis will automatically post a double-entry Factory Labor Expense voucher (DR Labor Expense / CR Main Bank).`
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
        notify(`🎉 Successfully disbursed ${json.disbursedCount} salaries! Accounting voucher created.`);
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

  const daysInMonthCount = attendanceList[0]?.daysInMonth || 30;
  const daysArray = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  const filteredAttendance = attendanceList.filter(
    (a) =>
      a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />
              <span>Factory Attendance &amp; Payroll Suite</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Integrate PagarBook/Biometric Excel, log daily presence, generate A4 payslips &amp; Bank NEFT batches.
            </p>
          </div>

          {/* Month selector & Primary Actions */}
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

            {activeTab === 'ATTENDANCE' ? (
              <>
                <button
                  type="button"
                  onClick={handleMarkAllPresentToday}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Mark All Present Today
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={isSavingAttendance}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingAttendance ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </>
            ) : (
              <>
                <a
                  href={`/api/payroll/salary?month=${selectedMonth}&format=neft`}
                  download={`EXMARK-Bank-NEFT-${selectedMonth}.xlsx`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bank NEFT Excel</span>
                </a>
                <button
                  type="button"
                  onClick={handleDisburseAll}
                  disabled={isDisbursing || !payrollOverview || payrollOverview.pendingCount === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isDisbursing ? 'Disbursing...' : 'Disburse via Bank'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Financial & Disbursal Metric Cards */}
        {payrollOverview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Staff</span>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {payrollOverview.totalEmployees} Active
              </p>
              <span className="text-[10px] text-slate-500">
                {payrollOverview.attendanceLoggedCount} Logged this month
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Payroll</span>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                ₹{payrollOverview.totalGrossPayable.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-500">Includes Overtime &amp; Allowances</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-rose-400 block">Advance Deductions</span>
              <p className="text-lg font-black text-rose-400 font-mono mt-0.5">
                ₹{payrollOverview.totalAdvancesDeducted.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-500">Recovered from monthly salary</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">Net Bank Disbursal</span>
              <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                ₹{payrollOverview.totalNetDisbursal.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-emerald-500 font-semibold">
                {payrollOverview.disbursedCount} Disbursed • {payrollOverview.pendingCount} Pending
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Switcher: Attendance Matrix vs Salary Register ─────────────── */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'ATTENDANCE'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>31-Day Attendance Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SALARY_REGISTER')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SALARY_REGISTER'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Monthly Salary Register &amp; Bank NEFT</span>
        </button>
      </div>

      {/* ── TAB 1: 31-Day Attendance Matrix ──────────────────────────────── */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
              <span className="font-bold text-slate-500">Legend:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">P = Present</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">OT = Overtime</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">HD = Half Day</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">A = Absent</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 font-bold">WO = Weekly Off</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">H = Holiday</span>
              <span className="text-[10px] text-slate-500 italic ml-2">(Click any cell to cycle status)</span>
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

          {/* Matrix Scrollable Table */}
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
                  <th className="p-2.5 text-center min-w-[70px] bg-slate-100 dark:bg-slate-900 font-black">
                    Payable
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isAttendanceLoading ? (
                  <tr>
                    <td colSpan={daysInMonthCount + 3} className="p-8 text-center text-slate-400">
                      Loading attendance grid...
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonthCount + 3} className="p-8 text-center text-slate-400">
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
                        return (
                          <td key={day} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleCellClick(emp.employeeId, day)}
                              className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] border transition-all cursor-pointer ${config.bg} ${config.text} ${config.border}`}
                              title={`Day ${day}: ${config.label} (Click to change)`}
                            >
                              {config.label}
                            </button>
                          </td>
                        );
                      })}

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

      {/* ── TAB 2: Monthly Salary Register ───────────────────────────────── */}
      {activeTab === 'SALARY_REGISTER' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-3 p-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3 text-center">Payable Days</th>
                  <th className="p-3 text-right">Base Pay</th>
                  <th className="p-3 text-right">Overtime</th>
                  <th className="p-3 text-right">Allowances</th>
                  <th className="p-3 text-right">Gross Pay</th>
                  <th className="p-3 text-right">Deductions</th>
                  <th className="p-3 text-right font-black">Net Salary (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isPayrollLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      Computing salary register...
                    </td>
                  </tr>
                ) : !payrollOverview || payrollOverview.slips.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No salary records generated. Ensure employees exist.
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

                      <td className="p-3 text-right font-mono text-amber-500">
                        {slip.earnedOvertimePay > 0
                          ? `₹${slip.earnedOvertimePay.toLocaleString('en-IN')}`
                          : '—'}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-500">
                        ₹{(slip.foodAllowance + slip.conveyanceAllowance + slip.performanceBonus).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{slip.grossSalary.toLocaleString('en-IN')}
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlip(slip);
                            setIsPayslipOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Payslip</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Print Modal */}
      <PayslipPrintModal
        slip={selectedSlip}
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
      />
    </div>
  );
}
export default PayrollAttendanceHub;
