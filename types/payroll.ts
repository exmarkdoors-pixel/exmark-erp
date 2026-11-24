// ── Factory Attendance & Payroll Types ─────────────────────────────────────

export type AttendanceStatus =
  | 'P'   // Present (Full Day)
  | 'A'   // Absent
  | 'HD'  // Half Day
  | 'OT'  // Overtime (Full Day + OT)
  | 'WO'  // Weekly Off
  | 'H'   // Paid Holiday
  | 'L';  // Authorized Leave

export interface DailyAttendanceRecord {
  day: number; // 1 to 31
  status: AttendanceStatus;
  otHours?: number;
  notes?: string;
}

export interface EmployeeMonthlyAttendance {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  role: string;
  month: string; // YYYY-MM
  daysInMonth: number;
  dailyStatus: Record<number, AttendanceStatus>;
  dailyOtHours?: Record<number, number>;
  totalPresent: number;
  totalAbsent: number;
  totalHalfDays: number;
  totalWeeklyOffs: number;
  totalHolidays: number;
  totalOvertimeHours: number;
  payableDays: number;
  lastUpdated: string;
}

export interface SalarySlipRecord {
  id: string;
  salarySlipNumber: string;
  month: string; // YYYY-MM
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  role: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  
  // Days & Hours Breakdown
  totalDaysInMonth: number;
  payableDays: number;
  overtimeHours: number;

  // Earnings
  baseMonthlySalary: number;
  perDaySalary: number;
  earnedBasicPay: number;
  overtimeHourlyRate: number;
  earnedOvertimePay: number;
  foodAllowance: number;
  conveyanceAllowance: number;
  performanceBonus: number;
  grossSalary: number;

  // Deductions
  advanceDeduction: number;
  canteenFoodDeduction: number;
  pfDeduction: number;
  esiDeduction: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net Pay
  netPayableRupees: number;
  netPayableInWords: string;

  // Disbursal status
  paymentStatus: 'PENDING' | 'DISBURSED' | 'PARTIAL';
  paymentMode: 'BANK_NEFT' | 'UPI' | 'CASH' | 'CHEQUE';
  disbursedDate?: string;
  disbursedFromAccountId?: string;
  disbursalReference?: string;
  disbursalJournalId?: string;
  generatedAt: string;
}

export type PayrollImportSource =
  | 'PAGARBOOK'
  | 'SALARYBOX'
  | 'KEKA'
  | 'BIOMETRIC_EXCEL'
  | 'EXMARK_TEMPLATE';

export interface BankNeftTransferRow {
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  amount: number;
  narration: string;
  employeeCode: string;
}

export interface MonthlyPayrollOverview {
  month: string; // YYYY-MM
  totalEmployees: number;
  totalGrossPayable: number;
  totalAdvancesDeducted: number;
  totalNetDisbursal: number;
  disbursedCount: number;
  pendingCount: number;
  attendanceLoggedCount: number;
  slips: SalarySlipRecord[];
}
