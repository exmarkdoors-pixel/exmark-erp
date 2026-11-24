/**
 * EXMARK ERP — Field Tracking, Geofenced Selfie Punch-In, Customer Visits & Route Logs
 */

import fs from 'fs';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import { readEmployeesStore } from './employeeStore';
import {
  getPayrollSystemConfig,
  resolveEmployeePolicy,
} from './payrollPolicyStore';
import { calculateDistanceMeters, calculateRouteDistanceKm } from '@/lib/utils/geoAttendanceUtils';
import { createCustomer, listCustomers } from './customerService';
import type {
  DailyPunchEvent,
  EmployeeMonthlyAttendance,
  LeaveRequestRecord,
  PunchLocationSnapshot,
} from '@/types/payroll';
import type {
  CustomerVisitRecord,
  CustomerVisitStage,
  GpsBreadcrumb,
  StaffDailyRouteLog,
} from '@/types/fieldVisits';

const PUNCHES_FILE = 'daily-punches-store.json';
const LEAVES_FILE = 'leave-requests-store.json';
const VISITS_FILE = 'customer-visits-store.json';
const TRACKING_FILE = 'gps-tracking-store.json';
const PAYROLL_STORE_FILE = 'payroll-store.json';

export function getIstDateString(date = new Date()): string {
  // Shift UTC epoch by +5h30m so toISOString() yields exact YYYY-MM-DD in IST regardless of server timezone
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

function readArrayStore<T>(filename: string): T[] {
  try {
    const filePath = getDataFilePath(filename);
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArrayStore<T>(filename: string, list: T[]): void {
  const filePath = getDataFilePath(filename);
  writeJsonSafe(filePath, list);
}

function readTrackingMap(): Record<string, GpsBreadcrumb[]> {
  try {
    const filePath = getDataFilePath(TRACKING_FILE);
    if (!fs.existsSync(filePath)) return {};
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, GpsBreadcrumb[]>) : {};
  } catch {
    return {};
  }
}

function writeTrackingMap(map: Record<string, GpsBreadcrumb[]>): void {
  const filePath = getDataFilePath(TRACKING_FILE);
  writeJsonSafe(filePath, map);
}

/**
 * Directly updates the 31-day monthly attendance matrix in payroll-store.json
 * when a selfie punch or approved leave is committed.
 */
function syncMonthlyAttendanceMatrixCell(
  employeeId: string,
  dateStr: string,
  status: 'P' | 'OT' | 'HD' | 'L',
  otHours = 0
): void {
  try {
    const monthStr = dateStr.slice(0, 7); // YYYY-MM
    const dayNum = parseInt(dateStr.slice(8, 10), 10);
    if (!monthStr || Number.isNaN(dayNum)) return;

    const payrollPath = getDataFilePath(PAYROLL_STORE_FILE);
    let store: {
      attendance: Record<string, EmployeeMonthlyAttendance[]>;
      salarySlips: Record<string, unknown[]>;
    } = { attendance: {}, salarySlips: {} };

    if (fs.existsSync(payrollPath)) {
      store = JSON.parse(fs.readFileSync(payrollPath, 'utf8'));
    }
    if (!store.attendance) store.attendance = {};
    const records: EmployeeMonthlyAttendance[] = store.attendance[monthStr] || [];

    const idx = records.findIndex((r) => r.employeeId === employeeId);
    if (idx === -1) return; // Will initialize cleanly on next payroll open

    const rec = { ...records[idx] };
    rec.dailyStatus = { ...(rec.dailyStatus || {}), [dayNum]: status };
    rec.dailyOtHours = { ...(rec.dailyOtHours || {}), [dayNum]: otHours };

    // Recompute summary counts
    let pCount = 0;
    let aCount = 0;
    let hdCount = 0;
    let woCount = 0;
    let hCount = 0;
    Object.values(rec.dailyStatus).forEach((st) => {
      if (st === 'P' || st === 'OT') pCount++;
      else if (st === 'A') aCount++;
      else if (st === 'HD') hdCount++;
      else if (st === 'WO') woCount++;
      else if (st === 'H') hCount++;
      else if (st === 'L') pCount++; // Paid Leave counts toward payable days unless unpaid
    });

    const totalOt = Object.values(rec.dailyOtHours || {}).reduce(
      (sum, h) => sum + (Number(h) || 0),
      0
    );

    rec.totalPresent = pCount;
    rec.totalAbsent = aCount;
    rec.totalHalfDays = hdCount;
    rec.totalWeeklyOffs = woCount;
    rec.totalHolidays = hCount;
    rec.totalOvertimeHours = Number(totalOt.toFixed(2));
    rec.payableDays = pCount + woCount + hCount + hdCount * 0.5;
    rec.lastUpdated = new Date().toISOString();

    records[idx] = rec;
    store.attendance[monthStr] = records;
    writeJsonSafe(payrollPath, store);
  } catch (err) {
    console.warn('[fieldTrackingService] Non-fatal matrix sync warning:', err);
  }
}

// ── Punch-In & Punch-Out Engine ───────────────────────────────────────────────

export interface PunchRequestInput {
  employeeId: string;
  action: 'IN' | 'OUT';
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address?: string;
  selfieDataUrl: string;
  device?: string;
  dateOverride?: string; // Optional YYYY-MM-DD for tests
  timestampOverride?: string; // Optional ISO timestamp for tests
}

export function getDailyPunches(dateStr?: string): DailyPunchEvent[] {
  const targetDate = dateStr || getIstDateString();
  const all = readArrayStore<DailyPunchEvent>(PUNCHES_FILE);
  return all.filter((p) => p.date === targetDate);
}

export function getMonthPunches(monthStr: string): DailyPunchEvent[] {
  const all = readArrayStore<DailyPunchEvent>(PUNCHES_FILE);
  return all.filter((p) => p.date.startsWith(monthStr));
}

export function getEmployeePunchStatus(
  employeeId: string,
  dateStr?: string
): DailyPunchEvent | null {
  const targetDate = dateStr || getIstDateString();
  const all = readArrayStore<DailyPunchEvent>(PUNCHES_FILE);
  return all.find((p) => p.employeeId === employeeId && p.date === targetDate) || null;
}

function parseShiftMinutesToday(timeHHMM: string, referenceIso: string): number {
  const [hStr, mStr] = (timeHHMM || '08:30').split(':');
  const h = parseInt(hStr, 10) || 8;
  const m = parseInt(mStr, 10) || 30;
  // Read UTC hours/minutes of (epoch + 5h30m) so IST calculation works identically on UTC cloud servers and local PC
  const ref = new Date(referenceIso);
  const ist = new Date(ref.getTime() + 5.5 * 3600 * 1000);
  const actualMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const shiftMinutes = h * 60 + m;
  return actualMinutes - shiftMinutes;
}

export function processPunchEvent(input: PunchRequestInput): {
  success: boolean;
  punch?: DailyPunchEvent;
  error?: string;
  distanceMeters?: number;
} {
  const employees = readEmployeesStore();
  const emp = employees.find(
    (e) => e.id === input.employeeId || e.employeeCode === input.employeeId
  );

  const empId = emp?.id || input.employeeId;
  const empCode = emp?.employeeCode || input.employeeId;
  const empName = emp?.name || 'Staff Member';
  const empDept = emp?.department || 'Operations';
  const empRole = emp?.role || 'Staff';

  const sysCfg = getPayrollSystemConfig();
  const policy = resolveEmployeePolicy(empId, emp);

  const distanceFromFactoryMeters = calculateDistanceMeters(
    input.latitude,
    input.longitude,
    sysCfg.geofence.latitude,
    sysCfg.geofence.longitude
  );

  const withinGeofence = distanceFromFactoryMeters <= sysCfg.geofence.radiusMeters;

  // Enforce geofence when policy is GEOFENCED_FACTORY
  if (policy.punchMode === 'GEOFENCED_FACTORY' && !withinGeofence) {
    return {
      success: false,
      distanceMeters: distanceFromFactoryMeters,
      error: `Outside Factory Geofence (${distanceFromFactoryMeters}m away, allowed ${sysCfg.geofence.radiusMeters}m). Move inside ${sysCfg.geofence.factoryName} to punch ${input.action}.`,
    };
  }

  if (!input.selfieDataUrl || !input.selfieDataUrl.startsWith('data:image/')) {
    return {
      success: false,
      error: 'A live geo-tagged selfie is mandatory for attendance punch.',
    };
  }

  const nowIso = input.timestampOverride || new Date().toISOString();
  const dateStr = input.dateOverride || getIstDateString(new Date(nowIso));

  const locSnapshot: PunchLocationSnapshot = {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    address:
      input.address ||
      (withinGeofence ? sysCfg.geofence.factoryName : `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`),
    distanceFromFactoryMeters,
    withinGeofence,
  };

  const allPunches = readArrayStore<DailyPunchEvent>(PUNCHES_FILE);
  const existingIdx = allPunches.findIndex(
    (p) => p.employeeId === empId && p.date === dateStr
  );

  if (input.action === 'IN') {
    const diffMin = parseShiftMinutesToday(policy.shift.startTime, nowIso);
    const lateMinutes = diffMin > policy.shift.graceMinutesLate ? diffMin : 0;

    const record: DailyPunchEvent =
      existingIdx !== -1
        ? {
            ...allPunches[existingIdx],
            punchInTime: allPunches[existingIdx].punchInTime || nowIso,
            punchInLocation: locSnapshot,
            punchInSelfie: input.selfieDataUrl,
            punchInDevice: input.device || 'MOBILE_FIELD',
            lateMinutes,
            status: lateMinutes > 0 ? 'LATE' : 'IN',
            updatedAt: nowIso,
          }
        : {
            id: `PUNCH-${dateStr}-${empCode}`,
            employeeId: empId,
            employeeCode: empCode,
            employeeName: empName,
            department: empDept,
            role: empRole,
            date: dateStr,
            policyMode: policy.punchMode,
            punchInTime: nowIso,
            punchInLocation: locSnapshot,
            punchInSelfie: input.selfieDataUrl,
            punchInDevice: input.device || 'MOBILE_FIELD',
            lateMinutes,
            workedMinutes: 0,
            overtimeMinutes: 0,
            overtimeHoursCalculated: 0,
            status: lateMinutes > 0 ? 'LATE' : 'IN',
            updatedAt: nowIso,
          };

    if (existingIdx !== -1) allPunches[existingIdx] = record;
    else allPunches.push(record);

    writeArrayStore(PUNCHES_FILE, allPunches);
    syncMonthlyAttendanceMatrixCell(empId, dateStr, 'P', 0);

    // Record initial GPS breadcrumb for route history
    recordGpsBreadcrumb({
      staffId: empId,
      staffName: empName,
      role: empRole,
      date: dateStr,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracyMeters,
      timestamp: nowIso,
    });

    return { success: true, punch: record, distanceMeters: distanceFromFactoryMeters };
  }

  // Action: OUT
  const existing = existingIdx !== -1 ? allPunches[existingIdx] : null;
  const punchInIso = existing?.punchInTime || nowIso;
  const workedMs = Math.max(0, new Date(nowIso).getTime() - new Date(punchInIso).getTime());
  const workedMinutes = Math.round(workedMs / 60000);

  const standardMinutes = (policy.shift.standardHours || 9) * 60;
  const overtimeMinutes = Math.max(0, workedMinutes - standardMinutes);
  const overtimeHoursCalculated =
    overtimeMinutes >= 15 ? Number((overtimeMinutes / 60).toFixed(2)) : 0;

  const updated: DailyPunchEvent = {
    id: existing?.id || `PUNCH-${dateStr}-${empCode}`,
    employeeId: empId,
    employeeCode: empCode,
    employeeName: empName,
    department: empDept,
    role: empRole,
    date: dateStr,
    policyMode: policy.punchMode,
    punchInTime: punchInIso,
    punchInLocation: existing?.punchInLocation || locSnapshot,
    punchInSelfie: existing?.punchInSelfie,
    punchInDevice: existing?.punchInDevice || input.device || 'MOBILE_FIELD',
    punchOutTime: nowIso,
    punchOutLocation: locSnapshot,
    punchOutSelfie: input.selfieDataUrl,
    lateMinutes: existing?.lateMinutes || 0,
    workedMinutes,
    overtimeMinutes,
    overtimeHoursCalculated,
    status: 'OUT',
    updatedAt: nowIso,
  };

  if (existingIdx !== -1) allPunches[existingIdx] = updated;
  else allPunches.push(updated);

  writeArrayStore(PUNCHES_FILE, allPunches);

  const workedHours = workedMinutes / 60;
  let matrixCode: 'P' | 'OT' | 'HD' = 'P';
  if (workedHours > 0 && workedHours < (policy.shift.halfDayThresholdHours || 4.5)) {
    matrixCode = 'HD';
  } else if (overtimeHoursCalculated >= 0.25) {
    matrixCode = 'OT';
  }
  syncMonthlyAttendanceMatrixCell(empId, dateStr, matrixCode, overtimeHoursCalculated);

  // Record closing GPS breadcrumb
  recordGpsBreadcrumb({
    staffId: empId,
    staffName: empName,
    role: empRole,
    date: dateStr,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracyMeters,
    timestamp: nowIso,
  });

  return { success: true, punch: updated, distanceMeters: distanceFromFactoryMeters };
}

// ── Leave Management Engine ───────────────────────────────────────────────────

export function getLeaveRequests(employeeId?: string): LeaveRequestRecord[] {
  const all = readArrayStore<LeaveRequestRecord>(LEAVES_FILE);
  if (employeeId) return all.filter((l) => l.employeeId === employeeId);
  return all.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export function applyLeaveRequest(input: {
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  fromDate: string;
  toDate: string;
  leaveType: LeaveRequestRecord['leaveType'];
  reason: string;
}): LeaveRequestRecord {
  const employees = readEmployeesStore();
  const emp = employees.find((e) => e.id === input.employeeId);

  const from = new Date(input.fromDate);
  const to = new Date(input.toDate);
  const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);

  const record: LeaveRequestRecord = {
    id: `LV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeId: emp?.id || input.employeeId,
    employeeCode: emp?.employeeCode || input.employeeCode || 'EMP',
    employeeName: emp?.name || input.employeeName || 'Staff Member',
    department: emp?.department || input.department || 'Operations',
    fromDate: input.fromDate,
    toDate: input.toDate,
    leaveDaysCount: input.leaveType === 'HALF_DAY' ? 0.5 : diffDays,
    leaveType: input.leaveType,
    reason: input.reason,
    status: 'PENDING',
    appliedAt: new Date().toISOString(),
  };

  const all = readArrayStore<LeaveRequestRecord>(LEAVES_FILE);
  all.unshift(record);
  writeArrayStore(LEAVES_FILE, all);
  return record;
}

export function reviewLeaveRequest(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewedBy = 'Super Admin'
): LeaveRequestRecord | null {
  const all = readArrayStore<LeaveRequestRecord>(LEAVES_FILE);
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  all[idx].status = status;
  all[idx].reviewedBy = reviewedBy;
  all[idx].reviewedAt = new Date().toISOString();
  writeArrayStore(LEAVES_FILE, all);

  if (status === 'APPROVED') {
    const start = new Date(all[idx].fromDate);
    const end = new Date(all[idx].toDate);
    const cellCode = all[idx].leaveType === 'HALF_DAY' ? 'HD' : 'L';
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      syncMonthlyAttendanceMatrixCell(all[idx].employeeId, dateStr, cellCode, 0);
    }
  }

  return all[idx];
}

// ── GPS Breadcrumbs & Route History ───────────────────────────────────────────

export function recordGpsBreadcrumb(ping: Omit<GpsBreadcrumb, 'date'> & { date?: string }): GpsBreadcrumb {
  const dateStr = ping.date || getIstDateString(new Date(ping.timestamp));
  const record: GpsBreadcrumb = {
    ...ping,
    date: dateStr,
  };

  const map = readTrackingMap();
  if (!map[record.staffId]) map[record.staffId] = [];
  map[record.staffId].push(record);

  // Retain up to 2,500 breadcrumbs per staff member (~10+ days of detailed 3-min route logs)
  if (map[record.staffId].length > 2500) {
    map[record.staffId] = map[record.staffId].slice(-2500);
  }
  writeTrackingMap(map);
  return record;
}

export function getAllActiveLiveLocations() {
  const map = readTrackingMap();
  const employees = readEmployeesStore();
  const today = getIstDateString();
  const punches = getDailyPunches(today);

  return Object.keys(map).map((staffId) => {
    const list = map[staffId] || [];
    const latest = list[list.length - 1];
    const emp = employees.find((e) => e.id === staffId || e.employeeCode === staffId);
    const punch = punches.find((p) => p.employeeId === staffId);
    const todayPoints = list.filter((p) => p.date === today);

    return {
      staffId,
      staffName: emp?.name || latest?.staffName || 'Field Staff',
      employeeCode: emp?.employeeCode || staffId,
      role: emp?.role || latest?.role || 'Field Ops',
      latest,
      punchStatus: punch?.status || 'NOT_PUNCHED',
      todayBreadcrumbsCount: todayPoints.length,
      todayDistanceKm: calculateRouteDistanceKm(todayPoints),
    };
  });
}

// ── Customer Site Visits with Geo-Tagged Selfies ──────────────────────────────

export async function recordCustomerVisit(input: {
  staffId: string;
  staffCode?: string;
  staffName: string;
  staffRole?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  formattedAddress: string;
  selfieUrl: string;
  siteType: CustomerVisitRecord['siteType'];
  stage: CustomerVisitStage;
  doorCountEstimate?: number;
  requirementsNotes?: string;
  followUpDate?: string;
  autoCreateCustomerInCrm?: boolean;
}): Promise<CustomerVisitRecord> {
  const nowIso = new Date().toISOString();
  const dateStr = getIstDateString(new Date(nowIso));
  let linkedCustomerId: string | undefined;

  // Match or register customer in ERP CRM Ledger cleanly
  if (input.autoCreateCustomerInCrm !== false && input.customerName.trim()) {
    try {
      const existingList = await listCustomers({ search: input.customerPhone || input.customerName });
      const normPhone = (input.customerPhone || '').replace(/\D/g, '').slice(-10);
      const matched = existingList.find(
        (c) =>
          (normPhone.length >= 7 && (c.phone || '').replace(/\D/g, '').slice(-10) === normPhone) ||
          c.name.trim().toLowerCase() === input.customerName.trim().toLowerCase()
      );
      if (matched) {
        linkedCustomerId = matched.id;
      } else {
        const created = await createCustomer({
          name: input.customerName.trim(),
          phone: input.customerPhone.trim() || '0000000000',
          type: input.siteType === 'BUILDER_PROJECT' ? 'BUILDER' : 'RETAIL',
          district: input.formattedAddress.split(',').slice(-2, -1)[0]?.trim() || 'Malappuram',
          town: input.formattedAddress.split(',')[0]?.trim() || input.customerAddress.slice(0, 30),
          address: input.customerAddress.trim() || input.formattedAddress,
          creditLimit: 50000,
          outstandingBalance: 0,
          salespersonId: input.staffId,
          salespersonName: input.staffName,
          salespersonCode: input.staffCode,
          status: 'ACTIVE',
        });
        linkedCustomerId = created.id;
      }
    } catch {
      // Non-fatal if customer already exists under strict validation
    }
  }

  const visit: CustomerVisitRecord = {
    id: `VISIT-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
    staffId: input.staffId,
    staffCode: input.staffCode || 'FIELD',
    staffName: input.staffName,
    staffRole: input.staffRole || 'Field Executive',
    date: dateStr,
    customerId: linkedCustomerId,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerAddress: input.customerAddress.trim(),
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      timestamp: nowIso,
    },
    formattedAddress: input.formattedAddress,
    selfieUrl: input.selfieUrl,
    siteType: input.siteType,
    stage: input.stage,
    doorCountEstimate: input.doorCountEstimate,
    requirementsNotes: input.requirementsNotes,
    followUpDate: input.followUpDate,
    createdAt: nowIso,
  };

  const all = readArrayStore<CustomerVisitRecord>(VISITS_FILE);
  all.unshift(visit);
  writeArrayStore(VISITS_FILE, all);

  // Also record GPS waypoint at visit spot
  recordGpsBreadcrumb({
    staffId: input.staffId,
    staffName: input.staffName,
    role: input.staffRole || 'Field Executive',
    date: dateStr,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracyMeters,
    timestamp: nowIso,
  });

  return visit;
}

export function getCustomerVisits(filter?: {
  staffId?: string;
  date?: string;
  month?: string;
}): CustomerVisitRecord[] {
  const all = readArrayStore<CustomerVisitRecord>(VISITS_FILE);
  return all.filter((v) => {
    if (filter?.staffId && v.staffId !== filter.staffId) return false;
    if (filter?.date && v.date !== filter.date) return false;
    if (filter?.month && !v.date.startsWith(filter.month)) return false;
    return true;
  });
}

export function getStaffDailyRouteLog(staffId: string, dateStr: string): StaffDailyRouteLog {
  const employees = readEmployeesStore();
  const emp = employees.find((e) => e.id === staffId || e.employeeCode === staffId);
  const policy = resolveEmployeePolicy(staffId, emp);

  const punch = getEmployeePunchStatus(staffId, dateStr);
  const map = readTrackingMap();
  const rawPoints = (map[staffId] || []).filter((p) => p.date === dateStr);
  const visits = getCustomerVisits({ staffId, date: dateStr }).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  // Combine waypoints chronologically
  const waypoints = [...rawPoints].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Build ordered geographic path including punch-in, breadcrumbs, visits, punch-out
  const pathPoints: Array<{ latitude: number; longitude: number }> = [];
  if (punch?.punchInLocation) {
    pathPoints.push({
      latitude: punch.punchInLocation.latitude,
      longitude: punch.punchInLocation.longitude,
    });
  }
  for (const w of waypoints) {
    pathPoints.push({ latitude: w.latitude, longitude: w.longitude });
  }
  if (punch?.punchOutLocation) {
    pathPoints.push({
      latitude: punch.punchOutLocation.latitude,
      longitude: punch.punchOutLocation.longitude,
    });
  }

  const totalDistanceKm = calculateRouteDistanceKm(pathPoints);
  const estimatedTravelBata = Math.round(totalDistanceKm * (policy.travelRatePerKm || 0));

  return {
    staffId,
    staffName: emp?.name || punch?.employeeName || 'Field Staff',
    employeeCode: emp?.employeeCode || punch?.employeeCode || staffId,
    date: dateStr,
    punchInTime: punch?.punchInTime,
    punchInLocation: punch?.punchInLocation
      ? {
          lat: punch.punchInLocation.latitude,
          lng: punch.punchInLocation.longitude,
          address: punch.punchInLocation.address,
        }
      : undefined,
    punchInSelfie: punch?.punchInSelfie,
    punchOutTime: punch?.punchOutTime,
    punchOutLocation: punch?.punchOutLocation
      ? {
          lat: punch.punchOutLocation.latitude,
          lng: punch.punchOutLocation.longitude,
          address: punch.punchOutLocation.address,
        }
      : undefined,
    punchOutSelfie: punch?.punchOutSelfie,
    waypoints,
    visits,
    totalDistanceKm,
    estimatedTravelBata,
  };
}

export function getStaffMonthlyDistanceKm(staffId: string, monthStr: string): number {
  const map = readTrackingMap();
  const points = (map[staffId] || []).filter((p) => p.date.startsWith(monthStr));
  if (points.length === 0) return 0;

  // Group by date and sum daily route km cleanly
  const byDate = new Map<string, GpsBreadcrumb[]>();
  for (const pt of points) {
    const arr = byDate.get(pt.date) || [];
    arr.push(pt);
    byDate.set(pt.date, arr);
  }

  let totalKm = 0;
  for (const dayPoints of byDate.values()) {
    dayPoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    totalKm += calculateRouteDistanceKm(dayPoints);
  }
  return Number(totalKm.toFixed(2));
}
