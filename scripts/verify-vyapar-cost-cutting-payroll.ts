/**
 * Verification Test Suite for:
 * 1. Vyapar Bulk Party Import Engine
 * 2. Cost-Cutting & Expense Intelligence Monitor
 * 3. Factory Attendance & Payroll Disbursal Suite
 */

import {
  generateVyaparPartyTemplateBuffer,
  normalizeVyaparPartyRow,
  detectVyaparHeaderMapping,
} from '../lib/services/vyaparPartyImportService';
import {
  getExpenseIntelligenceReport,
  simulateCostCutting,
} from '../lib/services/expenseIntelligenceService';
import {
  getMonthlyAttendance,
  calculateMonthlySalaries,
  generateBankNeftWorkbook,
} from '../lib/services/payrollService';
import * as XLSX from 'xlsx';

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 RUNNING EXMARK ERP EXPANSION SUITE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ── TEST 1: VYAPAR TEMPLATE GENERATION ──────────────────────────────────
  console.log('--- 1. Testing Vyapar Excel Template Generator ---');
  try {
    const templateBuffer = generateVyaparPartyTemplateBuffer();
    const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
    assert(workbook.SheetNames.length > 0, 'Workbook generated with sheets');
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet);
    assert(rows.length >= 3, `Template contains sample party rows (Found ${rows.length})`);
  } catch (err: any) {
    assert(false, 'Vyapar Excel Template Generator', err.message);
  }

  // ── TEST 2: VYAPAR HEADER AUTO-MAPPING & ROW NORMALIZATION ──────────────
  console.log('\n--- 2. Testing Vyapar Row Normalization & Kerala District Detection ---');
  try {
    const rawHeaders = ['Party Name', 'Phone Number', 'Billing Address', 'GSTIN', 'Opening Balance', 'Balance Type'];
    const mapping = detectVyaparHeaderMapping(rawHeaders);
    assert(mapping.partyName === 'Party Name', 'Auto-detect name column');
    assert(mapping.phone === 'Phone Number', 'Auto-detect phone column');
    assert(mapping.openingBalance === 'Opening Balance', 'Auto-detect balance column');

    const rawVyaparRow = {
      'Party Name': 'Malabar Wood & Doors Trading',
      'Phone Number': '+91 94471 23456',
      'Billing Address': 'NH Bypass, Koduvally, Kozhikode, Kerala 673572',
      'GSTIN': '32AABCM1234F1Z5',
      'Opening Balance': '45000',
      'Balance Type': 'To Receive (Dr)',
    };

    const normalized = normalizeVyaparPartyRow(rawVyaparRow, mapping, 'DEALER');
    assert(normalized.name === 'Malabar Wood & Doors Trading', 'Clean customer name extracted');
    assert(normalized.phone === '9447123456', `Phone normalized to 10 digits (Got ${normalized.phone})`);
    assert(normalized.district === 'Kozhikode', `Kerala district identified (Got ${normalized.district})`);
    assert(normalized.gstin === '32AABCM1234F1Z5', 'GSTIN uppercase normalized');
    assert(normalized.openingBalance === 45000, 'Opening balance parsed as number');
    assert(normalized.balanceType === 'TO_RECEIVE', 'Balance type resolved to TO_RECEIVE');
  } catch (err: any) {
    assert(false, 'Vyapar Row Normalization', err.message);
  }

  // ── TEST 3: EXPENSE & COST-CUTTING INTELLIGENCE REPORT ───────────────────
  console.log('\n--- 3. Testing Factory Expense Intelligence & Cost-Cutting Report ---');
  try {
    const report = await getExpenseIntelligenceReport();
    assert(report.domains.length === 6, `Report covers all 6 overhead domains (Found ${report.domains.length})`);
    assert(report.totalMonthlyOverheads > 0, `Total overheads computed (₹${report.totalMonthlyOverheads})`);
    assert(report.averageOverheadPerDoor > 0, `Overhead per door calculated (₹${report.averageOverheadPerDoor.toFixed(0)})`);
    assert(report.anomalyAlerts.length > 0, `Anomalies detected with audit recommendations (Found ${report.anomalyAlerts.length})`);

    // Test What-If Cost Cutting Simulation
    const activeIds = report.anomalyAlerts.map(a => a.id);
    const simulation = simulateCostCutting(report, activeIds);
    assert(simulation.monthlySavings > 0, `Simulated monthly savings computed (₹${simulation.monthlySavings})`);
    assert(simulation.projectedMarginPercent > simulation.originalMarginPercent, 'Projected profit margin expands after savings');
    assert(simulation.extendedCashRunwayDays > 0, `Cash runway extended by ${simulation.extendedCashRunwayDays} days`);
  } catch (err: any) {
    assert(false, 'Expense Intelligence Service', err.message);
  }

  // ── TEST 4: FACTORY ATTENDANCE & PAYROLL SUITE ───────────────────────────
  console.log('\n--- 4. Testing Attendance Matrix, Salary Slip & Bank NEFT Excel ---');
  try {
    const month = '2026-11';
    const attendance = await getMonthlyAttendance(month);
    assert(Array.isArray(attendance) && attendance.length > 0, `Monthly attendance records retrieved (${attendance.length} staff)`);
    const firstEmp = attendance[0];
    assert(Object.keys(firstEmp.dailyStatus).length > 0, `Daily status map populated for Day 1..${firstEmp.daysInMonth}`);
    assert(firstEmp.payableDays > 0, `Payable days calculated: ${firstEmp.payableDays} days`);

    // Test Salary Slip Computation
    const salaryOverview = await calculateMonthlySalaries(month);
    assert(salaryOverview.totalEmployees > 0, `Calculated salary slips for ${salaryOverview.totalEmployees} employees`);
    assert(salaryOverview.totalGrossPayable > 0, `Gross payroll computed (₹${salaryOverview.totalGrossPayable})`);
    assert(salaryOverview.totalNetDisbursal > 0, `Net disbursal calculated (₹${salaryOverview.totalNetDisbursal})`);

    const slip = salaryOverview.slips[0];
    assert(typeof slip.netPayableInWords === 'string' && slip.netPayableInWords.length > 5, `Net payable words generated ("${slip.netPayableInWords}")`);

    // Test Bank NEFT Workbook Generation
    const neftBuffer = generateBankNeftWorkbook(month, salaryOverview.slips);
    const neftWb = XLSX.read(neftBuffer, { type: 'buffer' });
    assert(neftWb.SheetNames.length > 0 && neftWb.SheetNames.some(s => s.includes('NEFT')), 'Bank NEFT Excel sheet created with NEFT tab');
  } catch (err: any) {
    assert(false, 'Payroll & Attendance Service', err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
