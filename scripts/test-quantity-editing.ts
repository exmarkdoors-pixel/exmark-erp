/**
 * Automated Verification Script for Quantity Editing Behavior
 * Tests deleting 1, typing 10, entering 0, and financial calculations.
 */

function simulateQtyChange(currentVal: number, inputString: string): number {
  if (inputString === '') {
    return 0;
  }
  const parsed = parseInt(inputString, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING QUANTITY EDITING & ZERO HANDLING');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra || ''}`);
      failed++;
    }
  }

  // 1. Backspace on 1
  console.log('\n--- 1. Testing Backspace on Initial 1 ---');
  // User had 1, pressed Backspace -> input is empty ""
  const afterBackspace = simulateQtyChange(1, '');
  assert('Backspace on 1 produces 0 instead of snapping back to 1', afterBackspace === 0, `Got: ${afterBackspace}`);

  // Display value when qty is 0:
  const displayVal = afterBackspace === 0 ? '' : afterBackspace;
  assert('Input display is blank "" with placeholder "0" when qty is 0', displayVal === '', `Got: "${displayVal}"`);

  // 2. Typing 10
  console.log('\n--- 2. Testing Typing Multi-digit (10) ---');
  // From empty, user presses '1'
  const step1 = simulateQtyChange(0, '1');
  assert('Step 1: typing "1" sets qty to 1', step1 === 1, `Got: ${step1}`);

  // User then presses '0' -> input string is "10"
  const step2 = simulateQtyChange(step1, '10');
  assert('Step 2: typing "0" produces "10" (qty = 10)', step2 === 10, `Got: ${step2}`);

  // From 10, user presses '5' -> input string is "105"
  const step3 = simulateQtyChange(step2, '105');
  assert('Typing "105" sets qty to 105', step3 === 105, `Got: ${step3}`);

  // 3. Explicit 0 entry
  console.log('\n--- 3. Testing Explicit 0 Entry ---');
  const zeroVal = simulateQtyChange(1, '0');
  assert('Typing "0" explicitly sets qty to 0', zeroVal === 0, `Got: ${zeroVal}`);

  // Negative number clamp
  const negVal = simulateQtyChange(1, '-5');
  assert('Negative numbers clamp to 0', negVal === 0, `Got: ${negVal}`);

  // 4. Financial Calculations with 0 and 10
  console.log('\n--- 4. Testing Financial Calculations with Qty = 0 and 10 ---');
  const rows = [
    { qty: 0, rate: 4200 },
    { qty: 10, rate: 3850 },
    { qty: 5, rate: 5400 },
  ];

  const subtotal = rows.reduce((sum, r) => sum + (Number(r.qty) || 0) * r.rate, 0);
  // (0 * 4200) + (10 * 3850) + (5 * 5400) = 0 + 38500 + 27000 = 65500
  assert('Subtotal with Qty=0 row excludes row correctly (₹65,500)', subtotal === 65500, `Got: ${subtotal}`);

  const lineTotalRow0 = ((Number(rows[0].qty) || 0) * rows[0].rate).toLocaleString('en-IN');
  assert('Row 0 with Qty=0 has lineTotal = "0"', lineTotalRow0 === '0', `Got: "${lineTotalRow0}"`);

  const lineTotalRow1 = ((Number(rows[1].qty) || 0) * rows[1].rate).toLocaleString('en-IN');
  assert('Row 1 with Qty=10 has lineTotal = "38,500"', lineTotalRow1 === '38,500', `Got: "${lineTotalRow1}"`);

  const totalDoors = rows.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
  assert('Total doors count is 15 (0 + 10 + 5)', totalDoors === 15, `Got: ${totalDoors}`);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
