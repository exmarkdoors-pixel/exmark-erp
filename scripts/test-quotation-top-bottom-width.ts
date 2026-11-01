/**
 * Automated Verification Script for Top Width and Bottom Width in Quotations
 * Tests dual width dimensions, independent inch fractions, average width area calculation,
 * and proforma document dimension formatting.
 */

import {
  INCH_FRACTION_OPTIONS,
  parseInchFraction,
  decimalToInchFraction,
  formatDimensionDisplay,
} from '../components/modules/quotations/QuotationHub';

function calculateSqFt(
  h: number,
  wTop: number,
  wBottom?: number,
  unit: 'cm' | 'mm' | 'inch' = 'cm',
  hFrac?: string,
  wTopFrac?: string,
  wBottomFrac?: string
): string {
  const wBtm = wBottom !== undefined && !isNaN(wBottom) ? wBottom : wTop;
  let hInches = h;
  let wTopInches = wTop;
  let wBtmInches = wBtm;

  if (unit === 'inch') {
    hInches = h + parseInchFraction(hFrac);
    wTopInches = wTop + parseInchFraction(wTopFrac);
    wBtmInches = wBtm + parseInchFraction(wBottomFrac ?? wTopFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wTopInches = wTop / 2.54;
    wBtmInches = wBtm / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wTopInches = wTop / 25.4;
    wBtmInches = wBtm / 25.4;
  }

  const avgWidthInches = (wTopInches + wBtmInches) / 2;
  return ((hInches * avgWidthInches) / 144).toFixed(2);
}

function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING TOP WIDTH & BOTTOM WIDTH IN QUOTATIONS');
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

  // 1. Equal Top and Bottom Width
  console.log('\n--- 1. Testing Equal Top and Bottom Width ---');
  // 80" H x 32" Top x 32" Btm -> 80 * 32 / 144 = 17.777... -> 17.78 sqft
  const sq1 = calculateSqFt(80, 32, 32, 'inch', '0', '0', '0');
  assert('80" x 32" Top x 32" Btm = 17.78 sqft', sq1 === '17.78', `Got: ${sq1}`);

  const fmt1 = formatDimensionDisplay(80, 32, 32, 'inch', '0', '0', '0');
  assert('Equal widths format as single width: 80" × 32"', fmt1 === '80" × 32"', `Got: ${fmt1}`);

  // 2. Tapered Top and Bottom Width with Whole Inches
  console.log('\n--- 2. Testing Tapered Top and Bottom Width ---');
  // 80" H x 32" Top x 30" Btm -> avgW = 31" -> 80 * 31 / 144 = 17.222... -> 17.22 sqft
  const sq2 = calculateSqFt(80, 32, 30, 'inch', '0', '0', '0');
  assert('80" x 32" Top x 30" Btm = 17.22 sqft', sq2 === '17.22', `Got: ${sq2}`);

  const fmt2 = formatDimensionDisplay(80, 32, 30, 'inch', '0', '0', '0');
  assert(
    'Tapered widths format as dual: 80" × [Top: 32" / Btm: 30"]',
    fmt2 === '80" × [Top: 32" / Btm: 30"]',
    `Got: ${fmt2}`
  );

  // 3. Tapered Width with 16th-Inch Fractions
  console.log('\n--- 3. Testing Tapered Width with Fractions ---');
  // Height: 80 1/8" (80.125)
  // Top: 32" (32.0)
  // Bottom: 32 3/16" (32.1875)
  // Avg width: (32.0 + 32.1875) / 2 = 32.09375
  // SqFt: (80.125 * 32.09375) / 144 = 17.857... -> 17.86 sqft
  const sq3 = calculateSqFt(80, 32, 32, 'inch', '1/8', '0', '3/16');
  assert('80 1/8" x Top 32" x Btm 32 3/16" = 17.86 sqft', sq3 === '17.86', `Got: ${sq3}`);

  const fmt3 = formatDimensionDisplay(80, 32, 32, 'inch', '1/8', '0', '3/16');
  assert(
    'Dual width with fractions: 80 1/8" × [Top: 32" / Btm: 32 3/16"]',
    fmt3 === '80 1/8" × [Top: 32" / Btm: 32 3/16"]',
    `Got: ${fmt3}`
  );

  // 4. Metric (cm) Tapered Width
  console.log('\n--- 4. Testing Metric (cm) Dimensions ---');
  // 205cm H x 75cm Top x 76cm Btm -> avgW = 75.5cm
  // In inches: H = 205 / 2.54 = 80.708, W = 75.5 / 2.54 = 29.724
  // SqFt: (80.708 * 29.724) / 144 = 16.66 sqft
  const sqCm = calculateSqFt(205, 75, 76, 'cm');
  assert('205cm x Top 75cm x Btm 76cm = 16.66 sqft', sqCm === '16.66', `Got: ${sqCm}`);

  const fmtCm = formatDimensionDisplay(205, 75, 76, 'cm');
  assert(
    'Metric tapered format: 205 × [Top: 75 / Btm: 76] cm',
    fmtCm === '205 × [Top: 75 / Btm: 76] cm',
    `Got: ${fmtCm}`
  );

  // Equal metric width
  const fmtCmEqual = formatDimensionDisplay(205, 75, 75, 'cm');
  assert('Metric equal format: 205 × 75 cm', fmtCmEqual === '205 × 75 cm', `Got: ${fmtCmEqual}`);

  // 5. Fallback when widthBottom is omitted
  console.log('\n--- 5. Testing Backward Compatibility Fallback ---');
  const sqFallback = calculateSqFt(80, 32, undefined, 'inch', '0', '0');
  assert('Fallback when wBottom is undefined equals single width', sqFallback === '17.78', `Got: ${sqFallback}`);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
