/**
 * EXMARK ERP — Factory Attendance & Payroll Management Engine
 * Handles 31-day visual attendance matrices, automated salary calculation,
 * PagarBook / SalaryBox / Biometric spreadsheet imports, A4 payslip generation,
 * Bank NEFT transfer spreadsheets, and double-entry accounting disbursals.
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import { readEmployeesStore, StoredEmployee } from './employeeStore';
import {
  AttendanceStatus,
  EmployeeMonthlyAttendance,
  MonthlyPayrollOverview,
  PayrollImportSource,
  SalarySlipRecord,
} from '@/types/payroll';
import { createManualJournal, SYSTEM_ACCOUNT_IDS } from './accountingService';
import { resolveEmployeePolicy } from './payrollPolicyStore';
import { getMonthPunches, getStaffMonthlyDistanceKm } from './fieldTrackingService';

const PAYROLL_STORE_FILE = 'payroll-store.json';

interface PayrollStoreSchema {
  attendance: Record<string, EmployeeMonthlyAttendance[]>; // key: YYYY-MM
  salarySlips: Record<string, SalarySlipRecord[]>; // key: YYYY-MM
}

function getPayrollStorePath(): string {
  return getDataFilePath(PAYROLL_STORE_FILE);
}

function readPayrollStore(): PayrollStoreSchema {
  try {
    const fullPath = getPayrollStorePath();
    if (!fs.existsSync(fullPath)) {
      const init: PayrollStoreSchema = { attendance: {}, salarySlips: {} };
      writeJsonSafe(fullPath, init);
      return init;
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      attendance: parsed?.attendance || {},
      salarySlips: parsed?.salarySlips || {},
    };
  } catch {
    return { attendance: {}, salarySlips: {} };
  }
}

function writePayrollStore(data: PayrollStoreSchema): void {
  const fullPath = getPayrollStorePath();
  writeJsonSafe(fullPath, data);
}

/**
 * Gets days count for a given month string (YYYY-MM)
 */
export function getDaysInMonth(monthStr: string): number {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthNumStr, 10) || new Date().getMonth() + 1;
  return new Date(year, month, 0).getDate();
}

/**
 * Generates number to Indian Rupees words
 */
export function numberToWordsInr(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded <= 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertSection(n: number): string {
    let str = '';
    if (n > 99) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += single[n] + ' ';
    }
    return str.trim();
  }

  let crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem %= 100000;
  let thousand = Math.floor(rem / 1000);
  rem %= 1000;
  let hundred = rem;

  let words = '';
  if (crore > 0) words += convertSection(crore) + ' Crore ';
  if (lakh > 0) words += convertSection(lakh) + ' Lakh ';
  if (thousand > 0) words += convertSection(thousand) + ' Thousand ';
  if (hundred > 0) words += convertSection(hundred) + ' ';

  return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

/**
 * Retrieves or initializes monthly attendance grid for all employees
 */
export async function getMonthlyAttendance(month: string): Promise<EmployeeMonthlyAttendance[]> {
  const store = readPayrollStore();
  const employees = readEmployeesStore();
  const daysInMonth = getDaysInMonth(month);

  const existingList = store.attendance[month] || [];
  const existingMap = new Map<string, EmployeeMonthlyAttendance>();
  for (const item of existingList) {
    existingMap.set(item.employeeId, item);
  }

  const result: EmployeeMonthlyAttendance[] = [];

  for (const emp of employees) {
    if (emp.status !== 'ACTIVE') continue;

    const existing = existingMap.get(emp.id);
    if (existing) {
      result.push(existing);
      continue;
    }

    // Initialize clean attendance grid for this employee
    const dailyStatus: Record<number, AttendanceStatus> = {};
    let totalPresent = 0;
    let totalWeeklyOffs = 0;

    const [yStr, mStr] = month.split('-');
    const year = parseInt(yStr, 10);
    const mIndex = parseInt(mStr, 10) - 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, mIndex, day);
      const isSunday = date.getDay() === 0;
      if (isSunday) {
        dailyStatus[day] = 'WO';
        totalWeeklyOffs++;
      } else {
        dailyStatus[day] = 'P';
        totalPresent++;
      }
    }

    const initRecord: EmployeeMonthlyAttendance = {
      employeeId: emp.id,
      employeeCode: emp.employeeCode || `EXM-EMP-${emp.id.slice(-3)}`,
      employeeName: emp.name,
      department: emp.department || 'Production',
      role: emp.role || 'Artisan',
      month,
      daysInMonth,
      dailyStatus,
      totalPresent,
      totalAbsent: 0,
      totalHalfDays: 0,
      totalWeeklyOffs,
      totalHolidays: 0,
      totalOvertimeHours: 0,
      payableDays: totalPresent + totalWeeklyOffs,
      lastUpdated: new Date().toISOString(),
    };

    result.push(initRecord);
  }

  return result;
}

/**
 * Saves updated attendance records for a month
 */
export async function saveMonthlyAttendance(month: string, records: EmployeeMonthlyAttendance[]): Promise<void> {
  const store = readPayrollStore();
  store.attendance[month] = records;
  writePayrollStore(store);
}

/**
 * Calculates monthly salary slips for all employees based on attendance and base salary
 */
export async function calculateMonthlySalaries(month: string): Promise<MonthlyPayrollOverview> {
  const store = readPayrollStore();
  const employees = readEmployeesStore();
  const attendanceList = await getMonthlyAttendance(month);
  const daysInMonth = getDaysInMonth(month);

  const empMap = new Map<string, StoredEmployee>();
  for (const emp of employees) {
    empMap.set(emp.id, emp);
  }

  const existingSlips = store.salarySlips[month] || [];
  const existingSlipMap = new Map<string, SalarySlipRecord>();
  for (const slip of existingSlips) {
    existingSlipMap.set(slip.employeeId, slip);
  }

  const monthPunches = getMonthPunches(month);
  const slips: SalarySlipRecord[] = [];

  for (const att of attendanceList) {
    const emp = empMap.get(att.employeeId);
    const existing = existingSlipMap.get(att.employeeId);
    const policy = resolveEmployeePolicy(att.employeeId, emp);

    const baseMonthlySalary = Number(emp?.salary || 22000);
    const perDaySalary = Math.round(baseMonthlySalary / daysInMonth);
    const earnedBasicPay = Math.round(perDaySalary * att.payableDays);

    // Hourly Overtime (OT) calculation per employee shift policy
    const shiftHours = Math.max(1, Number(policy.shift.standardHours || 8));
    const regularHourlyRate = perDaySalary / shiftHours;
    let overtimeHourlyRate = Math.round(regularHourlyRate * 1.5);
    if (policy.shift.overtimeCalculationType === 'HOURLY_FIXED' && policy.shift.customOvertimeHourlyRate) {
      overtimeHourlyRate = Math.round(policy.shift.customOvertimeHourlyRate);
    } else if (policy.shift.overtimeCalculationType === 'MULTIPLIER_2_0X') {
      overtimeHourlyRate = Math.round(regularHourlyRate * 2.0);
    } else if (policy.shift.overtimeCalculationType === 'MULTIPLIER_1_0X') {
      overtimeHourlyRate = Math.round(regularHourlyRate);
    }

    const empMonthPunches = monthPunches.filter((p) => p.employeeId === att.employeeId);
    const punchOtHours = empMonthPunches.reduce((sum, p) => sum + (Number(p.overtimeHoursCalculated) || 0), 0);
    const overtimeHours = Number(Math.max(Number(att.totalOvertimeHours || 0), punchOtHours).toFixed(2));
    const earnedOvertimePay = Math.round(overtimeHours * overtimeHourlyRate);

    // GPS Route Distance Travel Bata calculation
    const distanceTraveledKm = getStaffMonthlyDistanceKm(att.employeeId, month);
    const autoTravelBata = Math.round(distanceTraveledKm * (policy.travelRatePerKm || 0));
    const travelBataAllowance = existing?.travelBataAllowance ?? autoTravelBata;

    const foodAllowance = existing?.foodAllowance ?? 1500;
    const conveyanceAllowance = existing?.conveyanceAllowance ?? 1000;
    const performanceBonus = existing?.performanceBonus ?? 0;
    const grossSalary =
      earnedBasicPay +
      earnedOvertimePay +
      travelBataAllowance +
      foodAllowance +
      conveyanceAllowance +
      performanceBonus;

    // Late penalty auto-compute if configured
    const lateCount = empMonthPunches.filter((p) => p.lateMinutes > 0).length;
    const autoLatePenalty = lateCount * Number(policy.shift.latePenaltyPerInstance || 0);

    // Deductions
    const advanceDeduction = existing?.advanceDeduction ?? 0;
    const latePenaltyDeduction = existing?.latePenaltyDeduction ?? autoLatePenalty;
    const canteenFoodDeduction = existing?.canteenFoodDeduction ?? 0;
    const pfDeduction = existing?.pfDeduction ?? 0;
    const esiDeduction = existing?.esiDeduction ?? 0;
    const otherDeductions = existing?.otherDeductions ?? 0;
    const totalDeductions =
      advanceDeduction +
      latePenaltyDeduction +
      canteenFoodDeduction +
      pfDeduction +
      esiDeduction +
      otherDeductions;

    const netPayableRupees = Math.max(0, grossSalary - totalDeductions);
    const netPayableInWords = numberToWordsInr(netPayableRupees);

    const slip: SalarySlipRecord = {
      id: existing?.id || `slip-${month}-${att.employeeCode}-${Date.now()}`,
      salarySlipNumber: existing?.salarySlipNumber || `EXM-SAL-${month.replace('-', '')}-${att.employeeCode.slice(-4)}`,
      month,
      employeeId: att.employeeId,
      employeeCode: att.employeeCode,
      employeeName: att.employeeName,
      department: att.department,
      role: att.role,
      bankName: existing?.bankName || 'State Bank of India',
      bankAccountNumber: existing?.bankAccountNumber || '389012345678',
      ifscCode: existing?.ifscCode || 'SBIN0001234',
      totalDaysInMonth: daysInMonth,
      payableDays: att.payableDays,
      overtimeHours,
      baseMonthlySalary,
      perDaySalary,
      earnedBasicPay,
      overtimeHourlyRate,
      earnedOvertimePay,
      travelBataAllowance,
      distanceTraveledKm,
      foodAllowance,
      conveyanceAllowance,
      performanceBonus,
      grossSalary,
      advanceDeduction,
      latePenaltyDeduction,
      canteenFoodDeduction,
      pfDeduction,
      esiDeduction,
      otherDeductions,
      totalDeductions,
      netPayableRupees,
      netPayableInWords,
      paymentStatus: existing?.paymentStatus || 'PENDING',
      paymentMode: existing?.paymentMode || 'BANK_NEFT',
      disbursedDate: existing?.disbursedDate,
      disbursedFromAccountId: existing?.disbursedFromAccountId,
      disbursalReference: existing?.disbursalReference,
      disbursalJournalId: existing?.disbursalJournalId,
      generatedAt: existing?.generatedAt || new Date().toISOString(),
    };

    slips.push(slip);
  }

  // Update store
  store.salarySlips[month] = slips;
  writePayrollStore(store);

  const totalGrossPayable = slips.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalAdvancesDeducted = slips.reduce((sum, s) => sum + s.advanceDeduction, 0);
  const totalNetDisbursal = slips.reduce((sum, s) => sum + s.netPayableRupees, 0);
  const disbursedCount = slips.filter((s) => s.paymentStatus === 'DISBURSED').length;

  return {
    month,
    totalEmployees: slips.length,
    totalGrossPayable,
    totalAdvancesDeducted,
    totalNetDisbursal,
    disbursedCount,
    pendingCount: slips.length - disbursedCount,
    attendanceLoggedCount: attendanceList.length,
    slips,
  };
}

/**
 * Disburses selected salary slips and automatically posts a Double-Entry Accounting payment voucher
 */
export async function disburseSalaries(
  month: string,
  slipIds: string[],
  cashBankAccountId: string,
  user = 'Super Admin'
): Promise<{ disbursedCount: number; journalEntryId?: string; totalAmount: number }> {
  const store = readPayrollStore();
  const slips = store.salarySlips[month] || [];

  let totalAmount = 0;
  let disbursedCount = 0;

  for (const slip of slips) {
    if (slipIds.includes(slip.id) && slip.paymentStatus !== 'DISBURSED') {
      slip.paymentStatus = 'DISBURSED';
      slip.disbursedDate = new Date().toISOString().slice(0, 10);
      slip.disbursedFromAccountId = cashBankAccountId;
      slip.disbursalReference = `SAL-${month}-BATCH`;
      totalAmount += slip.netPayableRupees;
      disbursedCount++;
    }
  }

  let journalEntryId: string | undefined;

  // Post Double-Entry Journal Entry
  if (totalAmount > 0) {
    try {
      const journal = createManualJournal({
        date: new Date().toISOString().slice(0, 10),
        reference: `SAL-DISB-${month}`,
        narration: `Monthly Factory Payroll Disbursal for ${month} (${disbursedCount} staff members)`,
        lines: [
          {
            accountId: SYSTEM_ACCOUNT_IDS.FACTORY_LABOR, // coa-5100-labor (Debit Expense)
            debit: totalAmount,
            credit: 0,
            lineNote: `Gross Wages & Salaries for ${month}`,
          },
          {
            accountId: SYSTEM_ACCOUNT_IDS.MAIN_BANK, // coa-1010-bank (Credit Asset)
            debit: 0,
            credit: totalAmount,
            lineNote: `Bank NEFT salary batch transfer`,
          },
        ],
        createdBy: user,
      });

      journalEntryId = journal.id;
      for (const slip of slips) {
        if (slipIds.includes(slip.id)) {
          slip.disbursalJournalId = journalEntryId;
        }
      }
    } catch {
      // Non-fatal if accounting store fails
    }
  }

  writePayrollStore(store);

  return { disbursedCount, journalEntryId, totalAmount };
}

/**
 * Generates an official Bank NEFT Batch Upload Excel workbook
 */
export function generateBankNeftWorkbook(month: string, slips: SalarySlipRecord[]): Uint8Array {
  const wb = XLSX.utils.book_new();

  const neftRows = slips
    .filter((s) => s.paymentMode === 'BANK_NEFT' && s.netPayableRupees > 0)
    .map((s, idx) => ({
      'Sr No': idx + 1,
      'Beneficiary Name': s.employeeName,
      'Employee Code': s.employeeCode,
      'Bank Name': s.bankName || 'State Bank of India',
      'Account Number': s.bankAccountNumber || '389012345678',
      'IFSC Code': s.ifscCode || 'SBIN0001234',
      'Net Amount (₹)': s.netPayableRupees,
      'Payment Type': 'NEFT',
      'Narration': `EXMARK SALARY ${month}`,
    }));

  const ws = XLSX.utils.json_to_sheet(neftRows);
  XLSX.utils.book_append_sheet(wb, ws, `NEFT_Salary_${month}`);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

/**
 * Updates individual salary slip earnings/deductions (TotalX inline adjustment) and recomputes net pay.
 */
export async function updateSalarySlipAdjustment(
  month: string,
  employeeId: string,
  patch: Partial<
    Pick<
      SalarySlipRecord,
      | 'travelBataAllowance'
      | 'foodAllowance'
      | 'conveyanceAllowance'
      | 'performanceBonus'
      | 'advanceDeduction'
      | 'latePenaltyDeduction'
      | 'canteenFoodDeduction'
      | 'pfDeduction'
      | 'esiDeduction'
      | 'otherDeductions'
      | 'overtimeHours'
      | 'overtimeHourlyRate'
    >
  >
): Promise<SalarySlipRecord | null> {
  const store = readPayrollStore();
  const slips = store.salarySlips[month] || [];
  const idx = slips.findIndex((s) => s.employeeId === employeeId);
  if (idx === -1) return null;

  const s = { ...slips[idx], ...patch };
  if (patch.overtimeHours !== undefined || patch.overtimeHourlyRate !== undefined) {
    s.earnedOvertimePay = Math.round(Number(s.overtimeHours || 0) * Number(s.overtimeHourlyRate || 0));
  }

  s.grossSalary =
    Number(s.earnedBasicPay || 0) +
    Number(s.earnedOvertimePay || 0) +
    Number(s.travelBataAllowance || 0) +
    Number(s.foodAllowance || 0) +
    Number(s.conveyanceAllowance || 0) +
    Number(s.performanceBonus || 0);

  s.totalDeductions =
    Number(s.advanceDeduction || 0) +
    Number(s.latePenaltyDeduction || 0) +
    Number(s.canteenFoodDeduction || 0) +
    Number(s.pfDeduction || 0) +
    Number(s.esiDeduction || 0) +
    Number(s.otherDeductions || 0);

  s.netPayableRupees = Math.max(0, s.grossSalary - s.totalDeductions);
  s.netPayableInWords = numberToWordsInr(s.netPayableRupees);

  slips[idx] = s;
  store.salarySlips[month] = slips;
  writePayrollStore(store);
  return s;
}
