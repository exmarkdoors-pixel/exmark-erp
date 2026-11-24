/**
 * EXMARK ERP — Automated Verification for TotalX Payroll, Geofence Punch-In,
 * Hourly OT, Customer Visits & GMap Route Distance Calculation.
 * Uses an isolated temporary data vault so production data in C:\EXMARK-ERP-DATA is untouched.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert';

const tmpVault = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-totalx-test-'));
process.env.EXMARK_DATA_DIR = tmpVault;
process.env.EXMARK_AUTO_BOOTSTRAP = 'false';

import {
  calculateDistanceMeters,
  calculateRouteDistanceKm,
} from '../lib/utils/geoAttendanceUtils';
import {
  getPayrollSystemConfig,
  savePayrollSystemConfig,
} from '../lib/services/payrollPolicyStore';
import {
  processPunchEvent,
  recordCustomerVisit,
  recordGpsBreadcrumb,
  getStaffDailyRouteLog,
  applyLeaveRequest,
  reviewLeaveRequest,
} from '../lib/services/fieldTrackingService';
import {
  calculateMonthlySalaries,
  getMonthlyAttendance,
  updateSalarySlipAdjustment,
} from '../lib/services/payrollService';
import { writeEmployeesStore } from '../lib/services/employeeStore';

async function runTests() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — TOTALX PAYROLL & GEO-TRACKING VERIFICATION');
  console.log('========================================================================');

  // 1. Seed isolated employees
  writeEmployeesStore([
    {
      id: 'emp-factory-01',
      employeeCode: 'FAC-01',
      name: 'Ramesh CNC Operator',
      role: 'CNC Operator',
      department: 'Production',
      phone: '9847000001',
      email: 'ramesh@exmark.local',
      status: 'ACTIVE',
      salary: 24000,
    },
    {
      id: 'emp-field-01',
      employeeCode: 'FLD-01',
      name: 'Anas Site Engineer',
      role: 'Field Engineer',
      department: 'Site Measurement',
      phone: '9847000002',
      email: 'anas@exmark.local',
      status: 'ACTIVE',
      salary: 27000,
    },
  ]);

  // 2. Configure Geofence & Hourly OT Policy
  const cfg = getPayrollSystemConfig();
  cfg.geofence = {
    factoryName: 'EXMARK Vengara Plant',
    latitude: 11.0512,
    longitude: 75.9928,
    radiusMeters: 150,
    address: 'Vengara, Kerala',
  };
  cfg.defaultShift = {
    shiftName: 'General Shift',
    startTime: '08:30',
    endTime: '17:30',
    standardHours: 9,
    graceMinutesLate: 15,
    halfDayThresholdHours: 4.5,
    overtimeCalculationType: 'HOURLY_FIXED',
    customOvertimeHourlyRate: 150,
    latePenaltyPerInstance: 100,
  };
  savePayrollSystemConfig(cfg);

  // Initialize attendance matrix for November 2026
  await getMonthlyAttendance('2026-11');

  // Test A: Haversine Distance Calculation
  const distSame = calculateDistanceMeters(11.0512, 75.9928, 11.0513, 75.9929);
  assert(distSame < 30, `Expected <30m, got ${distSame}m`);
  const distFar = calculateDistanceMeters(11.0512, 75.9928, 11.0612, 75.9928);
  assert(distFar > 1000, `Expected >1000m, got ${distFar}m`);
  console.log(`[PASS] Test A: Haversine Distance (${distSame}m local, ${distFar}m far)`);

  // Test B: Geofenced Staff Punch-In (Reject outside radius, Accept inside radius)
  const rejectedPunch = processPunchEvent({
    employeeId: 'emp-factory-01',
    action: 'IN',
    latitude: 11.0612, // ~1.1 km away
    longitude: 75.9928,
    selfieDataUrl: 'data:image/jpeg;base64,TEST_DATA',
    dateOverride: '2026-11-25',
    timestampOverride: '2026-11-25T03:00:00.000Z', // 08:30 AM IST
  });
  assert(!rejectedPunch.success, 'Factory worker outside geofence MUST be rejected');
  console.log(`[PASS] Test B1: Geofence Rejection verified (${rejectedPunch.error})`);

  const acceptedPunchIn = processPunchEvent({
    employeeId: 'emp-factory-01',
    action: 'IN',
    latitude: 11.05125, // ~5m from gate
    longitude: 75.99285,
    selfieDataUrl: 'data:image/jpeg;base64,TEST_SELFIE_IN',
    dateOverride: '2026-11-25',
    timestampOverride: '2026-11-25T03:00:00.000Z', // 08:30 AM IST
  });
  assert(acceptedPunchIn.success, `Factory worker inside geofence failed: ${acceptedPunchIn.error}`);
  assert(acceptedPunchIn.punch?.lateMinutes === 0, '08:30 AM punch should not be marked late');

  // Punch-Out at 19:30 IST (11 hours worked -> 2.0 OT hours beyond 9h shift)
  const acceptedPunchOut = processPunchEvent({
    employeeId: 'emp-factory-01',
    action: 'OUT',
    latitude: 11.05125,
    longitude: 75.99285,
    selfieDataUrl: 'data:image/jpeg;base64,TEST_SELFIE_OUT',
    dateOverride: '2026-11-25',
    timestampOverride: '2026-11-25T14:00:00.000Z', // 19:30 PM IST
  });
  assert(acceptedPunchOut.success, 'Factory punch-out failed');
  assert(
    acceptedPunchOut.punch?.overtimeHoursCalculated === 2,
    `Expected 2.0 OT hours, got ${acceptedPunchOut.punch?.overtimeHoursCalculated}`
  );
  console.log(`[PASS] Test B2: Hourly OT Computation verified (Worked 11h -> +2.0 OT hrs)`);

  // Test C: Field Staff Any-Location Punch-In & Live Route + Customer Visit
  const fieldPunch = processPunchEvent({
    employeeId: 'emp-field-01',
    action: 'IN',
    latitude: 11.2588, // Calicut (~25 km from factory!)
    longitude: 75.7804,
    address: 'Mavoor Road, Calicut',
    selfieDataUrl: 'data:image/jpeg;base64,FIELD_SELFIE',
    dateOverride: '2026-11-25',
    timestampOverride: '2026-11-25T03:30:00.000Z', // 09:00 AM IST (15m beyond 08:45 grace -> late!)
  });
  assert(fieldPunch.success, `Field any-location punch failed: ${fieldPunch.error}`);
  assert(fieldPunch.punch?.policyMode === 'ANY_LOCATION', 'Expected ANY_LOCATION mode');
  assert(fieldPunch.punch?.lateMinutes === 30, `Expected 30m late, got ${fieldPunch.punch?.lateMinutes}`);
  console.log(`[PASS] Test C1: Field Roaming Any-Location Punch-In verified (Late: 30 mins)`);

  // Add route GPS breadcrumbs from Calicut to Kottakkal
  recordGpsBreadcrumb({
    staffId: 'emp-field-01',
    staffName: 'Anas Site Engineer',
    role: 'Field Engineer',
    date: '2026-11-25',
    latitude: 11.2588,
    longitude: 75.7804,
    timestamp: '2026-11-25T04:00:00.000Z',
  });
  recordGpsBreadcrumb({
    staffId: 'emp-field-01',
    staffName: 'Anas Site Engineer',
    role: 'Field Engineer',
    date: '2026-11-25',
    latitude: 11.1500,
    longitude: 75.8800,
    timestamp: '2026-11-25T05:00:00.000Z',
  });
  recordGpsBreadcrumb({
    staffId: 'emp-field-01',
    staffName: 'Anas Site Engineer',
    role: 'Field Engineer',
    date: '2026-11-25',
    latitude: 11.0000,
    longitude: 76.0000,
    timestamp: '2026-11-25T06:00:00.000Z',
  });

  // Record a Customer Visit with Geo-Tagged Selfie
  const visit = await recordCustomerVisit({
    staffId: 'emp-field-01',
    staffCode: 'FLD-01',
    staffName: 'Anas Site Engineer',
    staffRole: 'Field Engineer',
    customerName: 'Mr. Faisal Residence',
    customerPhone: '9847123456',
    customerAddress: 'Kottakkal Town, Malappuram',
    latitude: 11.0000,
    longitude: 76.0000,
    formattedAddress: 'Kottakkal, Malappuram, Kerala',
    selfieUrl: 'data:image/jpeg;base64,VISIT_SELFIE',
    siteType: 'VILLA',
    stage: 'MEASUREMENT_TAKEN',
    doorCountEstimate: 14,
    autoCreateCustomerInCrm: false,
  });
  assert(visit.id.startsWith('VISIT-'), 'Visit ID malformed');

  const routeLog = getStaffDailyRouteLog('emp-field-01', '2026-11-25');
  assert(routeLog.totalDistanceKm > 20, `Expected >20 km route distance, got ${routeLog.totalDistanceKm}`);
  assert(routeLog.estimatedTravelBata > 100, `Expected >₹100 travel bata, got ₹${routeLog.estimatedTravelBata}`);
  assert(routeLog.visits.length === 1, 'Expected 1 visit in route log');
  console.log(
    `[PASS] Test C2: GMap Route History & Customer Visit (${routeLog.totalDistanceKm} km -> ₹${routeLog.estimatedTravelBata} Travel Bata)`
  );

  // Test D: Monthly Salary Calculation (Hourly OT + Travel Bata + Late Penalty)
  const overview = await calculateMonthlySalaries('2026-11');
  const factorySlip = overview.slips.find((s) => s.employeeId === 'emp-factory-01');
  const fieldSlip = overview.slips.find((s) => s.employeeId === 'emp-field-01');

  assert(factorySlip, 'Factory slip missing');
  assert(factorySlip.overtimeHours === 2, `Expected 2 OT hrs, got ${factorySlip.overtimeHours}`);
  assert(factorySlip.overtimeHourlyRate === 150, `Expected ₹150/hr, got ${factorySlip.overtimeHourlyRate}`);
  assert(factorySlip.earnedOvertimePay === 300, `Expected ₹300 OT pay, got ${factorySlip.earnedOvertimePay}`);

  assert(fieldSlip, 'Field slip missing');
  assert((fieldSlip.travelBataAllowance || 0) > 100, 'Expected GPS travel bata in field slip');
  assert(fieldSlip.latePenaltyDeduction === 100, `Expected ₹100 late penalty, got ${fieldSlip.latePenaltyDeduction}`);

  // Inline bonus adjustment test
  const updatedSlip = await updateSalarySlipAdjustment('2026-11', 'emp-field-01', {
    performanceBonus: 2000,
  });
  assert(updatedSlip?.performanceBonus === 2000, 'Inline bonus update failed');
  console.log('[PASS] Test D: TotalX Payroll Hourly OT, GPS Travel Bata & Inline Bonus verified');

  // Test E: Leave Application & Approval
  const lv = applyLeaveRequest({
    employeeId: 'emp-factory-01',
    fromDate: '2026-11-28',
    toDate: '2026-11-28',
    leaveType: 'CASUAL',
    reason: 'Family event',
  });
  const approved = reviewLeaveRequest(lv.id, 'APPROVED', 'Super Admin');
  assert(approved?.status === 'APPROVED', 'Leave approval failed');
  console.log('[PASS] Test E: Mobile Leave Submission & Approval verified');

  // Cleanup temp directory
  fs.rmSync(tmpVault, { recursive: true, force: true });
  console.log('\n[ALL TOTALX PAYROLL & GEO-TRACKING TESTS PASSED SUCCESSFULLY!]');
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
