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
  travelBataAllowance?: number;
  distanceTraveledKm?: number;
  foodAllowance: number;
  conveyanceAllowance: number;
  performanceBonus: number;
  grossSalary: number;

  // Deductions
  advanceDeduction: number;
  latePenaltyDeduction?: number;
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

// ── TotalX-Style Attendance, Selfie Punch-In, Shifts & Leave Types ─────────

export type PunchPolicyMode = 'GEOFENCED_FACTORY' | 'ANY_LOCATION';

export type OvertimeCalculationType = 'HOURLY_FIXED' | 'MULTIPLIER_1_5X' | 'MULTIPLIER_2_0X' | 'MULTIPLIER_1_0X';

export interface ShiftConfiguration {
  shiftName: string;
  startTime: string; // "08:30" (24h)
  endTime: string;   // "17:30" (24h)
  standardHours: number; // e.g. 9
  graceMinutesLate: number; // e.g. 15
  halfDayThresholdHours: number; // e.g. 4.5
  overtimeCalculationType: OvertimeCalculationType;
  customOvertimeHourlyRate?: number; // e.g. ₹120/hr when HOURLY_FIXED
  latePenaltyPerInstance?: number; // e.g. ₹100 or 0
}

export interface EmployeeAttendancePolicy {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  punchMode: PunchPolicyMode;
  enableLiveLocationTracking: boolean;
  travelRatePerKm: number; // e.g. ₹5/km for bike or ₹0 if salaried inside factory
  shift: ShiftConfiguration;
}

export interface FactoryGeofenceConfig {
  factoryName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 150
  address: string;
  googleMapsApiKey?: string;
}

export interface PayrollSystemConfig {
  geofence: FactoryGeofenceConfig;
  defaultShift: ShiftConfiguration;
  employeePolicies: Record<string, EmployeeAttendancePolicy>;
}

export interface PunchLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address: string;
  distanceFromFactoryMeters?: number;
  withinGeofence: boolean;
}

export interface DailyPunchEvent {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  role: string;
  date: string; // YYYY-MM-DD
  policyMode: PunchPolicyMode;
  punchInTime?: string; // ISO
  punchInLocation?: PunchLocationSnapshot;
  punchInSelfie?: string; // Watermarked JPEG data URL
  punchInDevice?: string; // "MOBILE_FIELD" | "DESKTOP_EXE"
  punchOutTime?: string; // ISO
  punchOutLocation?: PunchLocationSnapshot;
  punchOutSelfie?: string;
  lateMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  overtimeHoursCalculated: number; // Decimal hours e.g. 1.75
  status: 'IN' | 'OUT' | 'LATE' | 'ABSENT' | 'LEAVE';
  notes?: string;
  updatedAt: string;
}

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  leaveDaysCount: number;
  leaveType: 'CASUAL' | 'SICK' | 'PAID' | 'HALF_DAY' | 'EMERGENCY';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  appliedAt: string;
}
