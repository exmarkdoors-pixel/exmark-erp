/**
 * EXMARK ERP — Verification Test for Tolerance Sync & Base Piece Minimum Price Lock
 */

import { computeDoorTolerances, getFactoryToleranceDefaults } from '../lib/services/toleranceSyncEngine';
import { calculateFrpDoorPrice, getFrpRateCardSettings } from '../lib/services/frpPricingEngine';

function runTests() {
  console.log('\n======================================================');
  console.log('  TESTING TOLERANCE SYNC & BASE PRICE LOCK ENGINES     ');
  console.log('======================================================\n');

  // Test 1: Factory Tolerance Defaults
  const defaults = getFactoryToleranceDefaults();
  console.log('1. Factory Tolerance Defaults:');
  console.log(`   - Default Side Rebate: ${defaults.defaultSideRebateMm} mm`);
  console.log(`   - Default Tile Clearance: ${defaults.defaultBottomTileClearanceMm} mm`);
  console.log(`   - Default Unfinished Floor Clearance: ${defaults.defaultBottomUnfinishedClearanceMm} mm`);
  console.log(`   - Default Top Gap: ${defaults.defaultTopGapMm} mm`);

  if (defaults.defaultSideRebateMm !== 40 || defaults.defaultBottomTileClearanceMm !== 12) {
    throw new Error('Default tolerance mismatch');
  }
  console.log('   ✓ Factory tolerance defaults verified.\n');

  // Test 2: Regular Frame with Finished Tile Floor
  const regTile = computeDoorTolerances({
    rawHeightMm: 2100,
    rawWidthTopMm: 800,
    frameTypeName: 'Regular FRP Frame (72x50mm)',
    floorCondition: 'FINISHED_TILE',
  });
  console.log('2. Regular Frame (Finished Tile Floor):');
  console.log(`   - Raw: 2100 × 800 mm`);
  console.log(`   - Deductions: Height -${regTile.totalHeightDeductionMm} mm, Width -${regTile.totalWidthDeductionMm} mm`);
  console.log(`   - Finished Shutter: ${regTile.shutterHeightMm} × ${regTile.shutterWidthTopMm} mm (${regTile.shutterSizeCmText})`);
  console.log(`   - Tape: ${regTile.shutterTapeInchText}`);

  if (regTile.totalHeightDeductionMm !== 17 || regTile.totalWidthDeductionMm !== 85) {
    throw new Error(`Expected H-17mm, W-85mm but got H-${regTile.totalHeightDeductionMm}, W-${regTile.totalWidthDeductionMm}`);
  }
  console.log('   ✓ Regular frame tile deductions verified (H-17mm, W-85mm).\n');

  // Test 3: Regular Frame with Unfinished Concrete Floor
  const regUnfinished = computeDoorTolerances({
    rawHeightMm: 2100,
    rawWidthTopMm: 800,
    frameTypeName: 'Regular FRP Frame (72x50mm)',
    floorCondition: 'UNFINISHED_CONCRETE',
  });
  console.log('3. Regular Frame (Unfinished Concrete Floor):');
  console.log(`   - Deductions: Height -${regUnfinished.totalHeightDeductionMm} mm, Width -${regUnfinished.totalWidthDeductionMm} mm`);
  console.log(`   - Finished Shutter: ${regUnfinished.shutterHeightMm} × ${regUnfinished.shutterWidthTopMm} mm (${regUnfinished.shutterSizeCmText})`);

  if (regUnfinished.totalHeightDeductionMm !== 30 || regUnfinished.totalWidthDeductionMm !== 85) {
    throw new Error(`Expected H-30mm, W-85mm but got H-${regUnfinished.totalHeightDeductionMm}, W-${regUnfinished.totalWidthDeductionMm}`);
  }
  console.log('   ✓ Unfinished concrete floor deductions verified (H-30mm, W-85mm).\n');

  // Test 4: Mini Frame 40x25mm
  const mini = computeDoorTolerances({
    rawHeightMm: 2050,
    rawWidthTopMm: 750,
    frameTypeName: 'Mini Frame (40x25mm)',
    floorCondition: 'FINISHED_TILE',
  });
  console.log('4. Mini Frame (Bathroom / Toilet Door):');
  console.log(`   - Deductions: Height -${mini.totalHeightDeductionMm} mm, Width -${mini.totalWidthDeductionMm} mm`);
  console.log(`   - Finished Shutter: ${mini.shutterHeightMm} × ${mini.shutterWidthTopMm} mm (${mini.shutterSizeCmText})`);

  if (mini.totalHeightDeductionMm !== 17 || mini.totalWidthDeductionMm !== 75) {
    throw new Error(`Expected H-17mm, W-75mm but got H-${mini.totalHeightDeductionMm}, W-${mini.totalWidthDeductionMm}`);
  }
  console.log('   ✓ Mini frame deductions verified (H-17mm, W-75mm).\n');

  // Test 5: Base Piece Minimum Price Lock
  console.log('5. Testing Base Piece Minimum Price Lock:');
  const smallDoor = calculateFrpDoorPrice({
    category: 'A',
    height: 190,
    widthTop: 70,
    unit: 'cm',
  });
  console.log(`   - Small Door (190 × 70 cm = ${smallDoor.actualSqft} sq.ft):`);
  console.log(`   - Final Unit Rate: ₹${smallDoor.finalUnitRate.toLocaleString('en-IN')}`);
  console.log(`   - Breakdown: ${smallDoor.breakdown}`);

  if (smallDoor.finalUnitRate < 7000) {
    throw new Error(`Base piece minimum price failed! Price dropped to ₹${smallDoor.finalUnitRate}`);
  }
  console.log('   ✓ Base piece minimum price locked at ₹7,000 for small door.\n');

  const stdDoor = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    unit: 'cm',
  });
  console.log(`   - Standard Door (210 × 80 cm = ${stdDoor.actualSqft} sq.ft): ₹${stdDoor.finalUnitRate}`);
  if (stdDoor.finalUnitRate !== 7000) throw new Error('Standard door rate mismatch');

  const largeDoor = calculateFrpDoorPrice({
    category: 'A',
    height: 220,
    widthTop: 95,
    unit: 'cm',
  });
  console.log(`   - Large Door (220 × 95 cm = ${largeDoor.actualSqft} sq.ft): ₹${largeDoor.finalUnitRate}`);
  if (largeDoor.finalUnitRate <= 7000) throw new Error('Large door surcharge failed');

  console.log('\n======================================================');
  console.log('  ALL TOLERANCE & BASE PRICE LOCK TESTS PASSED! 🎉    ');
  console.log('======================================================\n');
}

runTests();
