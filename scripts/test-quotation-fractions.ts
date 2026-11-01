/**
 * Automated Verification Script for Inch Fraction Select Options in Quotations
 * Tests 16 carpentry tape fractions, area calculations, bi-directional unit conversion, and formatting.
 */

import {
  INCH_FRACTION_OPTIONS,
  parseInchFraction,
  decimalToInchFraction,
  formatDimensionDisplay,
} from '../components/modules/quotations/QuotationHub';

function calculateSqFt(
  h: number,
  w: number,
  unit: 'cm' | 'mm' | 'inch',
  hFrac?: string,
  wFrac?: string
): string {
  let hInches = h;
  let wInches = w;
  if (unit === 'inch') {
    hInches = h + parseInchFraction(hFrac);
    wInches = w + parseInchFraction(wFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wInches = w / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wInches = w / 25.4;
  }
  return ((hInches * wInches) / 144).toFixed(2);
}

function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING INCH FRACTIONS & QUOTATION SYSTEM');
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

  // 1. Verify 16 fractions definition
  console.log('\n--- 1. Testing 16 Fraction Options ---');
  assert('Has exactly 16 fraction options', INCH_FRACTION_OPTIONS.length === 16);
  assert('0" fraction evaluates to 0', parseInchFraction('0') === 0);
  assert('1/16" fraction evaluates to 0.0625', parseInchFraction('1/16') === 0.0625);
  assert('1/8" fraction evaluates to 0.125', parseInchFraction('1/8') === 0.125);
  assert('3/16" fraction evaluates to 0.1875', parseInchFraction('3/16') === 0.1875);
  assert('1/4" fraction evaluates to 0.25', parseInchFraction('1/4') === 0.25);
  assert('5/16" fraction evaluates to 0.3125', parseInchFraction('5/16') === 0.3125);
  assert('3/8" fraction evaluates to 0.375', parseInchFraction('3/8') === 0.375);
  assert('7/16" fraction evaluates to 0.4375', parseInchFraction('7/16') === 0.4375);
  assert('1/2" fraction evaluates to 0.5', parseInchFraction('1/2') === 0.5);
  assert('9/16" fraction evaluates to 0.5625', parseInchFraction('9/16') === 0.5625);
  assert('5/8" fraction evaluates to 0.625', parseInchFraction('5/8') === 0.625);
  assert('11/16" fraction evaluates to 0.6875', parseInchFraction('11/16') === 0.6875);
  assert('3/4" fraction evaluates to 0.75', parseInchFraction('3/4') === 0.75);
  assert('13/16" fraction evaluates to 0.8125', parseInchFraction('13/16') === 0.8125);
  assert('7/8" fraction evaluates to 0.875', parseInchFraction('7/8') === 0.875);
  assert('15/16" fraction evaluates to 0.9375', parseInchFraction('15/16') === 0.9375);

  // 2. Decimal to Fraction Decomposition
  console.log('\n--- 2. Testing Decimal To Fraction Decomposition ---');
  const d1 = decimalToInchFraction(80.125);
  assert('80.125 decomposes to 80 + 1/8"', d1.whole === 80 && d1.fraction === '1/8');

  const d2 = decimalToInchFraction(32.1875);
  assert('32.1875 decomposes to 32 + 3/16"', d2.whole === 32 && d2.fraction === '3/16');

  const d3 = decimalToInchFraction(78.5);
  assert('78.5 decomposes to 78 + 1/2"', d3.whole === 78 && d3.fraction === '1/2');

  const d4 = decimalToInchFraction(80.0);
  assert('80.0 decomposes to 80 + 0"', d4.whole === 80 && d4.fraction === '0');

  const d5 = decimalToInchFraction(80.0625);
  assert('80.0625 decomposes to 80 + 1/16"', d5.whole === 80 && d5.fraction === '1/16');

  const d6 = decimalToInchFraction(80.9375);
  assert('80.9375 decomposes to 80 + 15/16"', d6.whole === 80 && d6.fraction === '15/16');

  // 3. Area Calculations (Sq.Ft)
  console.log('\n--- 3. Testing Square Footage with Fractions ---');
  // 80 1/8" x 32 3/16" -> (80.125 * 32.1875) / 144 = 17.9097... -> 17.91
  const sq1 = calculateSqFt(80, 32, 'inch', '1/8', '3/16');
  assert('80 1/8" x 32 3/16" = 17.91 sqft', sq1 === '17.91', `Got: ${sq1}`);

  // 78 1/2" x 30" -> (78.5 * 30) / 144 = 16.3541... -> 16.35
  const sq2 = calculateSqFt(78, 30, 'inch', '1/2', '0');
  assert('78 1/2" x 30" = 16.35 sqft', sq2 === '16.35', `Got: ${sq2}`);

  // Metric cm comparison
  const sqCm = calculateSqFt(205, 75, 'cm');
  assert('205cm x 75cm = 16.55 sqft', sqCm === '16.55', `Got: ${sqCm}`);

  // Metric mm comparison
  const sqMm = calculateSqFt(2100, 900, 'mm');
  assert('2100mm x 900mm = 20.34 sqft', sqMm === '20.34', `Got: ${sqMm}`);

  // 4. Formatting Display
  console.log('\n--- 4. Testing Proforma Document Dimension Display ---');
  const fmt1 = formatDimensionDisplay(80, 32, 'inch', '1/8', '3/16');
  assert('Formatted 80 1/8" × 32 3/16"', fmt1 === '80 1/8" × 32 3/16"', `Got: ${fmt1}`);

  const fmt2 = formatDimensionDisplay(80, 32, 'inch', '0', '0');
  assert('Formatted 80" × 32"', fmt2 === '80" × 32"', `Got: ${fmt2}`);

  const fmt3 = formatDimensionDisplay(205, 75, 'cm');
  assert('Formatted 205 × 75 cm', fmt3 === '205 × 75 cm', `Got: ${fmt3}`);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
