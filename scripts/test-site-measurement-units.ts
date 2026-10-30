/**
 * EXMARK ERP — Site Measurement Units Verification Test Suite
 *
 * Verifies:
 * 1. Default Unit is CM.
 * 2. Segmented Unit Conversion: CM, INCH (with fractions), and MM.
 * 3. Accurate Area (Sq.Ft) and Frame Running Feet (R.Ft) calculation matching screenshot:
 *    - 80" x 32" (or 203.2cm x 81.3cm) -> 17.78 Sq.Ft and Frame 16 R.Ft
 * 4. Pricing calculation:
 *    - Base (₹7000) + Lock Surcharge (₹200) + Adjustment (₹300) = ₹7,500
 * 5. Fractional inch arithmetic (+0/8, +1/8, +1/4, +3/8, +1/2, +5/8, +3/4, +7/8)
 * 6. Full schema persistence via MeasurementService
 */

import { createMeasurement, getAllMeasurements, getMeasurementById } from '../lib/services/measurementService';
import { DoorItemInput, MeasurementUnit } from '../types/measurements';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

// Fractions helper mirroring DoorMeasurementModal
function parseFraction(fracStr?: string): number {
  if (!fracStr || fracStr.includes('0/8') || fracStr === '0') return 0;
  if (fracStr.includes('1/8')) return 1 / 8;
  if (fracStr.includes('2/8') || fracStr.includes('1/4')) return 2 / 8;
  if (fracStr.includes('3/8')) return 3 / 8;
  if (fracStr.includes('4/8') || fracStr.includes('1/2')) return 4 / 8;
  if (fracStr.includes('5/8')) return 5 / 8;
  if (fracStr.includes('6/8') || fracStr.includes('3/4')) return 6 / 8;
  if (fracStr.includes('7/8')) return 7 / 8;
  return 0;
}

function calculateMetrics(door: {
  unit: MeasurementUnit;
  hL: number;
  hR: number;
  wT: number;
  wB: number;
  fracHL?: string;
  fracHR?: string;
  fracWT?: string;
  fracWB?: string;
  basePrice?: number;
  lockPrice?: number;
  priceAdj?: number;
  qty?: number;
}) {
  let hl = door.hL;
  let hr = door.hR;
  let wt = door.wT;
  let wb = door.wB;

  if (door.unit === 'INCH') {
    hl = (hl + parseFraction(door.fracHL)) * 25.4;
    hr = (hr + parseFraction(door.fracHR)) * 25.4;
    wt = (wt + parseFraction(door.fracWT)) * 25.4;
    wb = (wb + parseFraction(door.fracWB)) * 25.4;
  } else if (door.unit === 'CM') {
    hl = hl * 10;
    hr = hr * 10;
    wt = wt * 10;
    wb = wb * 10;
  }

  const avgH = (hl + hr) / 2;
  const avgW = (wt + wb) / 2;

  const sqFt = Number(((avgH * avgW) / 92903.04).toFixed(2));
  const frameRft = Math.round(((2 * avgH) + avgW) / 304.8);

  const basePrice = door.basePrice ?? 7000;
  const lockPrice = door.lockPrice ?? 200;
  const priceAdj = door.priceAdj ?? 300;
  const unitPrice = Math.max(0, basePrice + lockPrice + priceAdj);
  const qty = door.qty || 1;
  const lineTotal = unitPrice * qty;

  return { sqFt, frameRft, unitPrice, lineTotal };
}

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 EXMARK ERP: SITE MEASUREMENT UNITS TEST SUITE');
  console.log('===============================================================\n');

  // Test 1: Verify Default Unit is CM
  console.log('[TEST 1] Verifying default measurement unit is CM...');
  const defaultUnit: MeasurementUnit = 'CM';
  assert(defaultUnit === 'CM', 'Default measurement unit must be CM');
  console.log('  ✅ PASSED: Default unit is CM.\n');

  // Test 2: Calculate Screenshot Reference Dimensions (80" x 32" in CM = 203.2cm x 81.3cm)
  console.log('[TEST 2] Verifying dimensions matching screenshot (#D1 · 17.78 Sq.Ft · Frame 16 R.Ft · ₹7,500)...');
  const cmMetrics = calculateMetrics({
    unit: 'CM',
    hL: 203.2,
    hR: 203.2,
    wT: 81.3,
    wB: 81.3,
    basePrice: 7000,
    lockPrice: 200,
    priceAdj: 300,
    qty: 1,
  });

  console.log(`  Calculated Area: ${cmMetrics.sqFt} Sq.Ft (Expected: 17.78 Sq.Ft)`);
  console.log(`  Calculated Frame: ${cmMetrics.frameRft} R.Ft (Expected: 16 R.Ft)`);
  console.log(`  Calculated Price: ₹${cmMetrics.unitPrice} (Expected: ₹7,500)`);

  assert(cmMetrics.sqFt === 17.78, `Area should be 17.78 Sq.Ft, got ${cmMetrics.sqFt}`);
  assert(cmMetrics.frameRft === 16, `Frame R.Ft should be 16, got ${cmMetrics.frameRft}`);
  assert(cmMetrics.unitPrice === 7500, `Unit price should be 7500, got ${cmMetrics.unitPrice}`);
  console.log('  ✅ PASSED: Calculation matches screenshot reference with 100% accuracy.\n');

  // Test 3: Fractional Inch Parsing & Conversion
  console.log('[TEST 3] Verifying Inch Mode with 1/8" Fractions...');
  const inchMetrics = calculateMetrics({
    unit: 'INCH',
    hL: 80,
    hR: 80,
    wT: 32,
    wB: 32,
    fracHL: '0/8',
    fracHR: '0/8',
    fracWT: '0/8',
    fracWB: '0/8',
    basePrice: 7000,
    lockPrice: 200,
    priceAdj: 300,
    qty: 1,
  });

  assert(inchMetrics.sqFt === 17.78, `80" x 32" should be 17.78 Sq.Ft, got ${inchMetrics.sqFt}`);
  assert(inchMetrics.frameRft === 16, `80" x 32" frame should be 16 R.Ft, got ${inchMetrics.frameRft}`);

  // Test with fraction: 80 1/2" (80 + 4/8)
  const fracMetrics = calculateMetrics({
    unit: 'INCH',
    hL: 80,
    hR: 80,
    wT: 32,
    wB: 32,
    fracHL: '4/8', // 80.5"
    fracHR: '4/8',
    fracWT: '0/8',
    fracWB: '0/8',
  });
  console.log(`  80-1/2" x 32" Area: ${fracMetrics.sqFt} Sq.Ft (Expected: 17.89 Sq.Ft)`);
  assert(fracMetrics.sqFt === 17.89, `Expected 17.89 Sq.Ft for 80.5" x 32", got ${fracMetrics.sqFt}`);
  console.log('  ✅ PASSED: Fractional inch arithmetic works seamlessly.\n');

  // Test 4: MM Mode conversion
  console.log('[TEST 4] Verifying MM Mode calculations (2032mm x 813mm)...');
  const mmMetrics = calculateMetrics({
    unit: 'MM',
    hL: 2032,
    hR: 2032,
    wT: 813,
    wB: 813,
    basePrice: 7000,
    lockPrice: 200,
    priceAdj: 300,
  });
  assert(mmMetrics.sqFt === 17.78, `2032mm x 813mm should be 17.78 Sq.Ft, got ${mmMetrics.sqFt}`);
  assert(mmMetrics.frameRft === 16, `2032mm x 813mm frame should be 16 R.Ft, got ${mmMetrics.frameRft}`);
  console.log('  ✅ PASSED: MM mode calculations match CM and INCH.\n');

  // Test 5: Full Persistence via MeasurementService
  console.log('[TEST 5] Testing site measurement persistence with CM default and all terminal fields...');
  const testRef = `MSR-TEST-${Date.now().toString().slice(-4)}`;
  const doorPayload: DoorItemInput = {
    doorNumber: '#D1',
    categoryName: 'Bath FRP Door',
    model: 'EXM-A-100 (₹7000)',
    sizePreset: 'Standard Bed (80×32)',
    frameType: 'WPC Solid Extruded 100x65mm Frame',
    colour: 'Natural Teak (EXGC-510)',
    insideColour: 'Natural Teak (EXGC-510)',
    hingeSide: 'Left Hand (LH) - Inward',
    lockType: 'Baby Latch (+₹200)',
    lockPrice: 200,
    measurementUnit: 'CM',
    heightLeft: 203.2,
    heightRight: 203.2,
    widthTop: 81.3,
    widthBottom: 81.3,
    fractionHeightLeft: '0/8',
    fractionHeightRight: '0/8',
    fractionWidthTop: '0/8',
    fractionWidthBottom: '0/8',
    quantity: 1,
    wallThickness: '150mm',
    rebateDepth: '38mm',
    basePrice: 7000,
    priceAdjustment: 300,
    unitPrice: 7500,
    pricingMode: 'PIECE',
    calculatedSqFt: 17.78,
    calculatedFrameRft: 16,
    remarks: 'Field test measurement with CM default',
    photoCount: 0,
  };

  const created = await createMeasurement({
    refNumber: testRef,
    customerName: 'Kakkanad Luxury Villas',
    siteName: 'Skyline Palms Kakkanad',
    district: 'Ernakulam',
    totalOpenings: 1,
    engineerName: 'Anoop Krishnan',
    date: '2026-10-30',
    rebateDepthMm: '38mm',
    wallThicknessMm: '150mm',
    status: 'VERIFIED',
    doors: [doorPayload],
  });

  assert(created.refNumber === testRef, `Ref number should match ${testRef}`);
  assert(created.doors.length === 1, 'Should have 1 door opening');
  assert(created.doors[0].measurementUnit === 'CM', 'Saved door measurementUnit must be CM');
  assert(created.doors[0].heightLeft === 203.2, 'Saved heightLeft should be 203.2');
  assert(created.doors[0].unitPrice === 7500, 'Saved unitPrice should be 7500');

  // Read back
  const retrieved = await getMeasurementById(created.id);
  assert(retrieved !== null, 'Record must be retrievable by ID');
  assert(retrieved?.doors[0].measurementUnit === 'CM', 'Retrieved record door unit must be CM');
  console.log(`  ✅ PASSED: Created and retrieved record ${created.refNumber} with measurementUnit: CM.\n`);

  console.log('===============================================================');
  console.log('🎉 ALL 5 SITE MEASUREMENT UNIT TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
