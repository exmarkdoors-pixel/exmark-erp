import {
  computeDoorTolerances,
  cmToTapeInchFormatted,
} from '../lib/services/toleranceCalculation';
import {
  returnDeliveredDoorToStock,
  sellStockDoor,
  listReadyStockDoors,
  getReadyStockDoor,
} from '../lib/services/readyStockDoorService';
import {
  getSalespersonLeaderboard,
  listStaffTargets,
  getCurrentPeriodKey,
} from '../lib/services/salesTargetService';

async function runTests() {
  console.log('====================================================');
  console.log('EXMARK ERP - FACTORY OPERATIONS & LEADERBOARD VERIFICATION');
  console.log('====================================================\n');

  // ── TEST 1: Frame Opening Live Auto-Calculation ─────────────────
  console.log('▶ TEST 1: Frame Opening Live Auto-Calculation...');
  const calc1 = computeDoorTolerances({
    rawHeightMm: 2100,
    rawWidthTopMm: 900,
    frameTypeName: 'Regular Factory Frame 70×45mm',
    floorCondition: 'FINISHED_TILE',
  });
  console.log(`  Regular Frame (2100x900 mm) + Finished Tile (12mm):`);
  console.log(`  -> Shutter Size: ${calc1.shutterHeightMm} x ${calc1.effectiveShutterWidthMm} mm`);
  console.log(`  -> Deductions: H -${calc1.totalHeightDeductionMm}mm, W -${calc1.totalWidthDeductionMm}mm`);
  console.log(`  -> Inch Display: ${calc1.shutterTapeInchText}`);
  if (calc1.shutterHeightMm !== 2083 || calc1.effectiveShutterWidthMm !== 815) {
    throw new Error(`Test 1 Failed: Expected 2083x815, got ${calc1.shutterHeightMm}x${calc1.effectiveShutterWidthMm}`);
  }
  console.log('  ✔ TEST 1 PASSED!\n');

  // ── TEST 2: Concrete Floor Clearance Calculation ────────────────
  console.log('▶ TEST 2: Unfinished Concrete Floor Clearance...');
  const calc2 = computeDoorTolerances({
    rawHeightMm: 2100,
    rawWidthTopMm: 900,
    frameTypeName: 'Regular Factory Frame 70×45mm',
    floorCondition: 'UNFINISHED_CONCRETE',
  });
  console.log(`  Regular Frame (2100x900 mm) + Unfinished Concrete (25mm):`);
  console.log(`  -> Shutter Size: ${calc2.shutterHeightMm} x ${calc2.effectiveShutterWidthMm} mm`);
  console.log(`  -> Deductions: H -${calc2.totalHeightDeductionMm}mm, W -${calc2.totalWidthDeductionMm}mm`);
  if (calc2.shutterHeightMm !== 2070 || calc2.effectiveShutterWidthMm !== 815) {
    throw new Error(`Test 2 Failed: Expected 2070x815, got ${calc2.shutterHeightMm}x${calc2.effectiveShutterWidthMm}`);
  }
  console.log('  ✔ TEST 2 PASSED!\n');

  // ── TEST 3: Return Delivered Door to Stock ────────────────────────
  console.log('▶ TEST 3: Return Delivered Door to Stock...');
  const testJobCard = `JC-TEST-${Date.now().toString(36)}`;
  const restocked = await returnDeliveredDoorToStock({
    jobCardNumber: testJobCard,
    customerName: 'Test Architect Haris Calicut',
    itemType: 'DOOR_ONLY',
    doorModelName: '32mm Molded Teak FRP Door',
    doorCategory: 'FRP_DOORS',
    doorHeightMm: 2050,
    doorWidthMm: 800,
    doorThicknessMm: 32,
    doorFinishColor: 'Natural Teak',
    returnReason: 'Site frame tolerance mismatch / Shutter oversized',
    rackLocation: 'Godown Bay 2 / Return Bay R-1',
    resalePrice: 4800,
    originalCostValuation: 2600,
    notes: 'Test return delivery entry',
  });

  console.log(`  Restocked Door Created:`);
  console.log(`  -> Stock Code: ${restocked.stockCode}`);
  console.log(`  -> Condition: ${restocked.condition}`);
  console.log(`  -> Job Card: ${restocked.returnedFromJobCard}`);
  console.log(`  -> Customer: ${restocked.returnedCustomerName}`);
  console.log(`  -> Reason: ${restocked.returnReason}`);
  console.log(`  -> Rack: ${restocked.rackLocation}`);
  console.log(`  -> Resale Price: ₹${restocked.sellingPrice}`);

  if (restocked.condition !== 'RETURNED_DELIVERY' || restocked.returnedFromJobCard !== testJobCard) {
    throw new Error('Test 3 Failed: Restocked door condition or jobCard does not match');
  }

  const returnedList = await listReadyStockDoors({ condition: 'RETURNED_DELIVERY' });
  const found = returnedList.find((d) => d.id === restocked.id);
  if (!found) {
    throw new Error('Test 3 Failed: Restocked door not found in RETURNED_DELIVERY filter');
  }
  console.log('  ✔ TEST 3 PASSED!\n');

  // ── TEST 4: Sell Stock Door & Sales Leaderboard Auto-Update ───────
  console.log('▶ TEST 4: Sell Stock Door & Auto-Update Sales Leaderboard...');
  const currentPeriod = getCurrentPeriodKey();
  const staffList = await listStaffTargets(currentPeriod);
  if (staffList.length === 0) {
    throw new Error('Test 4 Failed: No staff targets found to test leaderboard');
  }

  const targetStaff = staffList[0];
  const initialDoors = targetStaff.achievedDoors || 0;
  const initialRevenue = targetStaff.achievedRevenue || 0;
  console.log(`  Target Salesperson: ${targetStaff.employeeName} (${targetStaff.employeeCode})`);
  console.log(`  Baseline -> Doors: ${initialDoors}, Revenue: ₹${initialRevenue}`);

  const salePrice = 5200;
  const soldDoor = await sellStockDoor({
    id: restocked.id,
    salePrice,
    customerName: 'Direct Buyer Skyline Apartments',
    salespersonId: targetStaff.employeeId,
    salespersonCode: targetStaff.employeeCode,
    salespersonName: targetStaff.employeeName,
    notes: 'Cash & Carry stock purchase',
  });

  console.log(`  Sold Door:`);
  console.log(`  -> Status: ${soldDoor.status}`);
  console.log(`  -> Sale Price: ₹${soldDoor.salePrice}`);
  console.log(`  -> Sold To: ${soldDoor.soldToCustomer}`);
  console.log(`  -> Salesperson: ${soldDoor.salespersonName}`);

  if (soldDoor.status !== 'SOLD' || soldDoor.soldToCustomer !== 'Direct Buyer Skyline Apartments') {
    throw new Error('Test 4 Failed: Door status was not updated to SOLD');
  }

  // Check updated leaderboard
  const leaderboard = await getSalespersonLeaderboard(currentPeriod);
  const updatedStaffMetric = leaderboard.find((m) => m.employeeId === targetStaff.employeeId);
  if (!updatedStaffMetric) {
    throw new Error('Test 4 Failed: Salesperson not found in leaderboard');
  }

  console.log(`  Updated Leaderboard Metric for ${updatedStaffMetric.employeeName}:`);
  console.log(`  -> Achieved Doors: ${updatedStaffMetric.achievedDoors} (Expected: ${initialDoors + (restocked.quantity || 1)})`);
  console.log(`  -> Achieved Revenue: ₹${updatedStaffMetric.achievedRevenue} (Expected: ₹${initialRevenue + salePrice})`);
  console.log(`  -> Doors Pacing: ${updatedStaffMetric.doorsPacingPercent}%`);
  console.log(`  -> Revenue Pacing: ${updatedStaffMetric.revenuePacingPercent}%`);
  console.log(`  -> Leaderboard Rank: #${updatedStaffMetric.rank}`);

  if (updatedStaffMetric.achievedDoors !== initialDoors + (restocked.quantity || 1)) {
    throw new Error(`Test 4 Failed: Expected achievedDoors ${initialDoors + 1}, got ${updatedStaffMetric.achievedDoors}`);
  }
  if (updatedStaffMetric.achievedRevenue !== initialRevenue + salePrice) {
    throw new Error(`Test 4 Failed: Expected achievedRevenue ${initialRevenue + salePrice}, got ${updatedStaffMetric.achievedRevenue}`);
  }
  console.log('  ✔ TEST 4 PASSED!\n');

  console.log('====================================================');
  console.log('🎉 ALL 4 TESTS PASSED FLAWLESSLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
