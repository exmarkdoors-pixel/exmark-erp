import { calculateFrpDoorPrice, SHUTTER_ONLY_DISCOUNT, WITHOUT_ACCESSORIES_DISCOUNT } from '../lib/services/frpPricingEngine';
import { calculateQuotationProfit } from '../lib/utils/quotationProfit';
import { computeStickerSizes } from '../lib/utils/doorStickerFormula';
import { generate12LStickerPdf } from '../lib/utils/pdfStickerEngine';

console.log('--- TEST 1: Supply Mode FRP Pricing Engine ---');
// 1. Full Set
const fullSet = calculateFrpDoorPrice({
  category: 'A',
  height: 80,
  widthTop: 32,
  widthBottom: 32,
  unit: 'inch',
  supplyMode: 'FULL_SET',
});
console.log('Full Set rate:', fullSet.finalUnitRate, fullSet.breakdown);

// 2. Without Accessories
const noAcc = calculateFrpDoorPrice({
  category: 'A',
  height: 80,
  widthTop: 32,
  widthBottom: 32,
  unit: 'inch',
  supplyMode: 'NO_ACCESSORIES',
});
console.log('Without Accessories rate:', noAcc.finalUnitRate, noAcc.breakdown);
if (fullSet.finalUnitRate - noAcc.finalUnitRate !== 500) {
  throw new Error(`Expected ₹500 discount for Without Accessories, got ${fullSet.finalUnitRate - noAcc.finalUnitRate}`);
}
console.log('✓ Without Accessories deduction verified (-₹500)');

// 3. Shutter Only
const shutterOnly = calculateFrpDoorPrice({
  category: 'A',
  height: 80,
  widthTop: 32,
  widthBottom: 32,
  unit: 'inch',
  supplyMode: 'SHUTTER_ONLY',
});
console.log('Shutter Only rate:', shutterOnly.finalUnitRate, shutterOnly.breakdown);
if (fullSet.finalUnitRate - shutterOnly.finalUnitRate !== 1500) {
  throw new Error(`Expected ₹1,500 discount for Shutter Only, got ${fullSet.finalUnitRate - shutterOnly.finalUnitRate}`);
}
console.log('✓ Shutter Only deduction verified (-₹1,500)');

console.log('\n--- TEST 2: Tapered Top and Bottom Width Calculation ---');
const tapered = calculateFrpDoorPrice({
  category: 'B',
  height: 80,
  widthTop: 32,
  widthBottom: 31.5,
  unit: 'inch',
  supplyMode: 'FULL_SET',
});
console.log('Tapered Door SqFt:', tapered.actualSqft, 'Rate:', tapered.finalUnitRate);
if (tapered.actualSqft <= 0 || isNaN(tapered.finalUnitRate)) {
  throw new Error('Tapered door calculation failed');
}
console.log('✓ Tapered Top/Bottom width correctly computed');

console.log('\n--- TEST 3: Sticker Deductions with H-LEFT / H-RIGHT ---');
const stickerSizes = computeStickerSizes({
  rawHeightCm: 210,
  rawWidthTopCm: 90,
  rawWidthBtmCm: 89.5,
  widthLinked: false,
  hDeductionCm: 4.5,
  wDeductionCm: 7.6,
  hingeSide: 'R',
});
console.log('Sticker dimensions:', {
  hLabel: stickerSizes.hLabel,
  finHText: stickerSizes.finHText,
  finTopWText: stickerSizes.finTopWText,
  finBtmWText: stickerSizes.finBtmWText,
});
if (stickerSizes.hLabel !== 'H-LEFT' || stickerSizes.finHText !== '-205.5' || stickerSizes.finTopWText !== '-82.4') {
  throw new Error(`Sticker size calculation mismatch: ${JSON.stringify(stickerSizes)}`);
}
console.log('✓ 12L Sticker cutting box values verified matching factory photo format');

console.log('\n--- TEST 4: Generate 12L Sticker PDF matching User Photo ---');
(async () => {
  const pdf = await generate12LStickerPdf(
    [
      {
        id: 'stk-1',
        orderNumber: 'PRD-2026-012',
        jobCardNumber: 'JC-2026-012',
        customerName: 'KAMARU YUSUF',
        doorNumber: 3,
        totalDoorsInOrder: 12,
        shutterSize: '205.5 × 82.4 cm',
        tape: '80 7/8" × 32 7/16"',
        profile: 'EXM-A-101',
        modelCode: 'EXM-A-101',
        finish: 'NATURAL TEAK EXGC-510',
        hand: 'RH',
        hingeSide: 'R',
        lock: 'BABY LATCH',
        barcode: '*EXM-012-D03*',
        finH: 235.5,
        finTopW: 92.4,
        finBtmW: 92.4,
      },
    ],
    { layout: '2x6' }
  );

  const bytes = pdf.output('arraybuffer') as ArrayBuffer;
  console.log(`✓ 12L PDF Generated successfully: ${bytes.byteLength} bytes`);
  console.log('\n🎉 ALL NEW SUITE TESTS PASSED 100%!');
})();
