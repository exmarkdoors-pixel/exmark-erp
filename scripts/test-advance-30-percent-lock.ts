import assert from 'assert';
import {
  createQuotation,
  updateQuotation,
  getQuotation,
} from '../lib/services/quotationService';

async function runTests() {
  console.log('=== TEST 1: Minimum 30% Advance Calculation & Presets ===');
  const grandTotal = 100000;
  const min30 = Math.round(grandTotal * 0.30);
  assert.strictEqual(min30, 30000, '30% of 100,000 must be 30,000');

  // Test presets
  const presets = [30, 40, 50, 100];
  for (const p of presets) {
    const amt = Math.round(grandTotal * (p / 100));
    assert.ok(amt >= min30, `Preset ${p}% must be >= min 30%`);
  }
  console.log('✓ Presets verified (all >= 30%)');

  console.log('\n=== TEST 2: Custom Advance Amount Validation ===');
  // Scenario A: Custom amount above 30% (e.g. ₹45,000)
  const validCustomAmt = 45000;
  const validPct = Math.round((validCustomAmt / grandTotal) * 100);
  const isValidA = validCustomAmt >= min30 && validPct >= 30;
  assert.strictEqual(isValidA, true, 'Custom ₹45,000 must be valid');
  assert.strictEqual(validPct, 45, 'Custom percentage should be 45%');
  console.log(`✓ Custom advance ₹${validCustomAmt} (${validPct}%) is valid and accepted.`);

  // Scenario B: Custom amount exactly 30% (e.g. ₹30,000)
  const exactCustomAmt = 30000;
  const exactPct = Math.round((exactCustomAmt / grandTotal) * 100);
  const isValidB = exactCustomAmt >= min30 && exactPct >= 30;
  assert.strictEqual(isValidB, true, 'Custom ₹30,000 must be valid');
  assert.strictEqual(exactPct, 30, 'Exact percentage should be 30%');
  console.log(`✓ Custom advance ₹${exactCustomAmt} (${exactPct}%) exactly at threshold is valid.`);

  // Scenario C: Custom amount below 30% (e.g. ₹20,000)
  const invalidCustomAmt = 20000;
  const invalidPct = Math.round((invalidCustomAmt / grandTotal) * 100);
  const isValidC = invalidCustomAmt >= min30 && invalidPct >= 30;
  assert.strictEqual(isValidC, false, 'Custom ₹20,000 must be rejected/locked');
  console.log(`✓ Custom advance ₹${invalidCustomAmt} (${invalidPct}%) correctly flagged as below 30% minimum lock.`);

  console.log('\n=== TEST 3: Backend Safeguard on Order Confirmation ===');
  // Create test draft quotation
  const draft = await createQuotation({
    customerId: 'CUST-TEST-ADV',
    customerName: 'Test Client For 30% Lock',
    location: 'Malappuram',
    itemsSummary: '10 FRP Doors',
    date: '17 Nov 2026',
    validUntil: '24 Nov 2026',
    items: [
      {
        doorCategory: 'FRP_DOORS',
        doorModel: 'EXM-A-101',
        heightMm: 2100,
        widthMm: 800,
        thicknessMm: 32,
        gstRate: 0,
        quantity: 10,
        unitPrice: 10000,
        totalPrice: 100000,
      },
    ],
    overrideSubtotal: 100000,
    overrideTotalAmount: 100000,
    advancePercent: 50,
    advanceAmount: 50000,
    isConfirmed: false,
  });

  console.log(`Draft quotation created: ${draft.id} (Total: ₹${draft.totalAmount})`);

  // Attempting to confirm with < 30% advance should throw an error
  let blocked = false;
  try {
    await updateQuotation(draft.id, {
      isConfirmed: true,
      advanceAmount: 15000, // 15% - should be rejected!
      salespersonId: 'SP-01',
    });
  } catch (err: any) {
    blocked = true;
    console.log(`✓ Order confirmation with ₹15,000 (15%) blocked as expected: "${err.message}"`);
  }
  assert.strictEqual(blocked, true, 'Confirming order with < 30% advance MUST throw error');

  // Confirming with >= 30% advance should succeed
  const confirmed = await updateQuotation(draft.id, {
    isConfirmed: true,
    advanceAmount: 35000, // 35% - should be accepted!
    jobCardNumber: 'JC-2026-TEST30',
    salespersonId: 'SP-01',
  });

  assert.strictEqual(confirmed.isConfirmed, true, 'Order should be confirmed');
  assert.strictEqual(confirmed.advanceAmount, 35000, 'Advance amount should be ₹35,000');
  console.log(`✓ Order confirmed successfully with ₹35,000 (35%) advance! Job Card: ${confirmed.jobCardNumber}`);

  console.log('\n=========================================');
  console.log('ALL 30% ADVANCE LOCK TESTS PASSED!');
  console.log('=========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
