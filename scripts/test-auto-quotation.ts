/**
 * EXMARK ERP — Dual-Rate Auto Quotation Verification Test Suite
 */

import { createMeasurement, getMeasurementById } from '../lib/services/measurementService';
import { createQuotation, getQuotation } from '../lib/services/quotationService';
import { DoorItemInput } from '../types/measurements';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`[ASSERTION FAILED]: ${msg}`);
}

async function run() {
  console.log('===============================================================');
  console.log('🚀 EXMARK ERP: DUAL-RATE AUTO QUOTATION TEST SUITE');
  console.log('===============================================================\n');

  // Step 1: Create a verified Site Measurement with 2 doors
  console.log('[TEST 1] Creating a test Site Measurement with 2 openings...');
  const refNum = `MSR-QTEST-${Date.now().toString().slice(-4)}`;
  const doors: DoorItemInput[] = [
    {
      doorNumber: '#D1',
      categoryName: 'Bath FRP Door',
      model: 'EXM-A-100 (₹7000)',
      frameType: 'WPC Solid Extruded 100x65mm Frame',
      colour: 'Natural Teak (EXGC-510)',
      hingeSide: 'Left Hand (LH) - Inward',
      lockType: 'Baby Latch (+₹200)',
      lockPrice: 200,
      measurementUnit: 'CM',
      heightLeft: 203.2,
      heightRight: 203.2,
      widthTop: 81.3,
      widthBottom: 81.3,
      quantity: 1,
      basePrice: 7000,
      priceAdjustment: 300,
      unitPrice: 7500, // Per piece rate
      calculatedSqFt: 17.78,
      calculatedFrameRft: 16,
    },
    {
      doorNumber: '#D2',
      categoryName: 'Bed Room Door',
      model: 'EXM-B-200 Teak Woodgrain (₹8200)',
      frameType: 'WPC Solid Extruded 100x65mm Frame',
      colour: 'Natural Teak (EXGC-510)',
      hingeSide: 'Right Hand (RH) - Inward',
      lockType: 'Mortise Lock 60mm (+₹850)',
      lockPrice: 850,
      measurementUnit: 'INCH',
      heightLeft: 80,
      heightRight: 80,
      widthTop: 32,
      widthBottom: 32,
      quantity: 2,
      basePrice: 8200,
      priceAdjustment: 0,
      unitPrice: 9050, // Per piece rate: 8200 + 850
      calculatedSqFt: 17.78,
      calculatedFrameRft: 16,
    },
  ];

  const measurement = await createMeasurement({
    refNumber: refNum,
    customerName: 'Kochi Waterfront Residencies',
    siteName: 'Marine Drive Block B',
    district: 'Ernakulam',
    date: '2026-10-30',
    totalOpenings: 3,
    status: 'VERIFIED',
    doors,
  });

  assert(measurement.doors.length === 2, 'Should have 2 door opening specs');
  console.log(`  ✅ PASSED: Created measurement ${measurement.refNumber} with 3 total doors.\n`);

  // Step 2: Auto Quotation using PER_PIECE Strategy
  console.log('[TEST 2] Testing Auto Quotation via PER_PIECE strategy...');
  // Total piece subtotal = 1 * 7500 + 2 * 9050 = 7500 + 18100 = 25600
  const pieceItems = measurement.doors.map((d) => ({
    doorCategory: 'FRP_DOORS' as const,
    doorModel: `${d.doorNumber}: ${d.model}`,
    heightMm: 2032,
    widthMm: 813,
    thicknessMm: 32,
    finishColor: d.colour,
    quantity: d.quantity || 1,
    unitPrice: d.unitPrice || 7500,
    gstRate: 18,
    totalPrice: (d.unitPrice || 7500) * (d.quantity || 1),
  }));

  const pieceQuote = await createQuotation({
    customerId: measurement.customerId || 'cust-demo',
    date: '2026-10-30',
    validUntil: '2026-11-30',
    notes: `Converted from ${measurement.refNumber} using PER_PIECE rate`,
    items: pieceItems,
  });

  assert(pieceQuote.subtotal === 25600, `Expected subtotal 25600, got ${pieceQuote.subtotal}`);
  const expectedPieceGst = Math.round(25600 * 0.18); // 4608
  assert(pieceQuote.gstAmount === expectedPieceGst, `Expected GST ${expectedPieceGst}, got ${pieceQuote.gstAmount}`);
  assert(pieceQuote.totalAmount === 25600 + expectedPieceGst, 'Total amount should equal subtotal + GST');
  console.log(`  Piece Subtotal: ₹${pieceQuote.subtotal}`);
  console.log(`  Piece GST 18%: ₹${pieceQuote.gstAmount}`);
  console.log(`  Piece Grand Total: ₹${pieceQuote.totalAmount}`);
  console.log('  ✅ PASSED: Per Piece Rate Quotation calculated with 100% mathematical accuracy.\n');

  // Step 3: Auto Quotation using PER_SQFT Strategy
  console.log('[TEST 3] Testing Auto Quotation via PER_SQFT strategy...');
  // Sq.Ft Rate: ₹420/sq.ft
  // Door 1: (17.78 * 420) + 200 (lock) + 300 (adj) = 7468 + 200 + 300 = 7968
  // Door 2: (17.78 * 420) + 850 (lock) = 7468 + 850 = 8318 (qty 2 = 16636)
  // Total Sq.Ft Subtotal = 7968 + 16636 = 24604
  const sqftRate = 420;
  const sqftItems = measurement.doors.map((d) => {
    const sqft = d.calculatedSqFt || 17.78;
    const lock = d.lockPrice || 200;
    const adj = d.priceAdjustment || 0;
    const unitPrice = Math.round(sqft * sqftRate + lock + adj);
    const qty = d.quantity || 1;
    return {
      doorCategory: 'FRP_DOORS' as const,
      doorModel: `${d.doorNumber}: ${d.model} [${sqft} Sq.Ft @ ₹${sqftRate}/sqft]`,
      heightMm: 2032,
      widthMm: 813,
      thicknessMm: 32,
      finishColor: d.colour,
      quantity: qty,
      unitPrice,
      gstRate: 18,
      totalPrice: unitPrice * qty,
    };
  });

  const sqftQuote = await createQuotation({
    customerId: measurement.customerId || 'cust-demo',
    date: '2026-10-30',
    validUntil: '2026-11-30',
    notes: `Converted from ${measurement.refNumber} using PER_SQFT rate`,
    items: sqftItems,
  });

  assert(sqftQuote.subtotal === 24604, `Expected sqft subtotal 24604, got ${sqftQuote.subtotal}`);
  const expectedSqftGst = Math.round(24604 * 0.18); // 4429
  assert(sqftQuote.gstAmount === expectedSqftGst, `Expected GST ${expectedSqftGst}, got ${sqftQuote.gstAmount}`);
  assert(sqftQuote.totalAmount === 24604 + expectedSqftGst, 'Total should equal subtotal + GST');
  console.log(`  Sq.Ft Subtotal: ₹${sqftQuote.subtotal}`);
  console.log(`  Sq.Ft GST 18%: ₹${sqftQuote.gstAmount}`);
  console.log(`  Sq.Ft Grand Total: ₹${sqftQuote.totalAmount}`);
  console.log('  ✅ PASSED: Square Feet Rate Quotation calculated with 100% mathematical accuracy.\n');

  console.log('===============================================================');
  console.log('🎉 ALL DUAL-RATE AUTO QUOTATION TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('❌ AUTO QUOTATION TEST FAILED:', err);
  process.exit(1);
});
