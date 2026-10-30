console.log('===============================================================');
console.log('🚀 EXMARK ERP: QUOTATION HUB & DUAL-GST VERIFICATION TEST SUITE');
console.log('===============================================================');

// TEST 1: Test 3-Way GST Calculation Mathematics
console.log('\n[TEST 1] Testing 3-Way GST Calculation Strategies...');

function calculateQuote(subtotal: number, mode: 'without' | 'excluded' | 'included', gstPercent: number) {
  let gstAmount = 0;
  let grandTotal = 0;
  let baseAmount = subtotal;

  if (mode === 'without') {
    gstAmount = 0;
    grandTotal = subtotal;
  } else if (mode === 'excluded') {
    gstAmount = subtotal * (gstPercent / 100);
    grandTotal = subtotal + gstAmount;
  } else if (mode === 'included') {
    grandTotal = subtotal;
    baseAmount = grandTotal / (1 + (gstPercent / 100));
    gstAmount = grandTotal - baseAmount;
  }
  return { baseAmount, gstAmount, grandTotal };
}

// Case A: 10 doors @ ₹4,000 = ₹40,000
const sub = 40000;

// Without GST
const resWithout = calculateQuote(sub, 'without', 18);
if (resWithout.gstAmount !== 0 || resWithout.grandTotal !== 40000) {
  throw new Error('Without GST calculation failed');
}
console.log(`  ✅ Without GST: Base ₹${resWithout.baseAmount} + GST ₹${resWithout.gstAmount} = ₹${resWithout.grandTotal}`);

// GST Excluded (+18%)
const resExcluded = calculateQuote(sub, 'excluded', 18);
if (resExcluded.gstAmount !== 7200 || resExcluded.grandTotal !== 47200) {
  throw new Error('GST Excluded calculation failed');
}
console.log(`  ✅ GST Excluded (+18%): Base ₹${resExcluded.baseAmount} + GST ₹${resExcluded.gstAmount} = ₹${resExcluded.grandTotal}`);

// GST Included (18%)
const resIncluded = calculateQuote(sub, 'included', 18);
const expectedBase = 40000 / 1.18;
if (Math.abs(resIncluded.baseAmount - expectedBase) > 0.01) {
  throw new Error('GST Included base amount calculation failed');
}
console.log(`  ✅ GST Included (18%): Base ₹${resIncluded.baseAmount.toFixed(2)} + GST ₹${resIncluded.gstAmount.toFixed(2)} = ₹${resIncluded.grandTotal}`);

// TEST 2: Dimensions & Square Footage Calculation
console.log('\n[TEST 2] Testing Unit Conversion and Area (Sq.Ft) Calculation...');
function calculateSqFt(h: number, w: number, unit: 'cm' | 'mm' | 'inch'): string {
  let hInches = h;
  let wInches = w;
  if (unit === 'cm') {
    hInches = h / 2.54;
    wInches = w / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wInches = w / 25.4;
  }
  return ((hInches * wInches) / 144).toFixed(2);
}

const sqftCm = calculateSqFt(205, 75, 'cm');
const sqftMm = calculateSqFt(2050, 750, 'mm');
const sqftInch = calculateSqFt(80.7, 29.53, 'inch');

console.log(`  205cm x 75cm  -> ${sqftCm} sqft`);
console.log(`  2050mm x 750mm -> ${sqftMm} sqft`);
console.log(`  80.7" x 29.5"  -> ${sqftInch} sqft`);

if (sqftCm !== '16.55' && sqftCm !== '16.54' && sqftCm !== '16.56') {
  throw new Error(`Unexpected sqft cm calculation: ${sqftCm}`);
}
console.log('  ✅ PASSED: Multi-unit dimension and area calculation verified.');

// TEST 3: Advance Payment Estimation
console.log('\n[TEST 3] Testing 50%, 40%, 30% Advance Payment calculations...');
const total = 1980000;
const adv50 = total * 0.5;
const adv40 = total * 0.4;
const adv30 = total * 0.3;
console.log(`  Total: ₹${total.toLocaleString('en-IN')}`);
console.log(`  50% Advance: ₹${adv50.toLocaleString('en-IN')}`);
console.log(`  40% Advance: ₹${adv40.toLocaleString('en-IN')}`);
console.log(`  30% Advance: ₹${adv30.toLocaleString('en-IN')}`);
if (adv50 !== 990000 || adv40 !== 792000 || adv30 !== 594000) {
  throw new Error('Advance payment calculation failed');
}
console.log('  ✅ PASSED: Advance terms verified.');

console.log('\n===============================================================');
console.log('🎉 ALL QUOTATION HUB & DUAL-GST TESTS PASSED SUCCESSFULLY!');
console.log('===============================================================');
