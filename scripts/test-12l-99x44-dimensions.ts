import { generate12LStickerPdf, Printable12LStickerItem } from '../lib/utils/pdfStickerEngine';
import { PAPER_PRESETS } from '../components/modules/production/BatchPrintHub';

async function test12LDimensions() {
  console.log('🧪 Testing 12L (99mm x 44mm) Sticker Sheet Dimensions & Math...');

  // 1. Verify Standard Preset Dimensions
  const stdPreset = PAPER_PRESETS['Standard 12L Die-Cut (99 x 44 mm)'];
  if (!stdPreset) throw new Error('Missing Standard 12L Die-Cut (99 x 44 mm) preset!');
  console.log('Preset:', stdPreset);

  const { labelWidthMm, labelHeightMm, topMarginMm, leftMarginMm, rowGapMm, colGapMm } = stdPreset;

  if (labelWidthMm !== 99 || labelHeightMm !== 44) {
    throw new Error(`Expected 99x44mm label, got ${labelWidthMm}x${labelHeightMm}mm`);
  }
  if (topMarginMm !== 9) {
    throw new Error(`Expected 9mm top margin, got ${topMarginMm}mm`);
  }
  if (colGapMm !== 3.2) {
    throw new Error(`Expected 3.2mm column gap, got ${colGapMm}mm`);
  }
  if (rowGapMm !== 3.0) {
    throw new Error(`Expected 3.0mm row gap, got ${rowGapMm}mm`);
  }

  // 2. Mathematical Fit Checks on A4 (210 x 297 mm)
  const cols = 2;
  const rows = 6;

  // Horizontal math: leftMargin + 2*99 + 3.2 + rightMargin = 210
  const usedWidth = leftMarginMm + cols * labelWidthMm + colGapMm * (cols - 1);
  const remainingRightMargin = 210 - usedWidth;
  console.log(`Horizontal width check: Used = ${usedWidth.toFixed(2)}mm, Right Margin = ${remainingRightMargin.toFixed(2)}mm`);
  if (remainingRightMargin < 3.5 || remainingRightMargin > 5.5) {
    throw new Error(`Right margin out of expected range: ${remainingRightMargin}mm`);
  }

  // Vertical math: topMargin + 6*44 + 5*3.0 + bottomMargin = 297
  const usedHeight = topMarginMm + rows * labelHeightMm + rowGapMm * (rows - 1);
  const remainingBottomMargin = 297 - usedHeight;
  console.log(`Vertical height check: Used = ${usedHeight.toFixed(2)}mm, Bottom Margin = ${remainingBottomMargin.toFixed(2)}mm`);
  if (Math.abs(remainingBottomMargin - 9.0) > 0.5) {
    throw new Error(`Bottom margin should be ~9mm, got ${remainingBottomMargin.toFixed(2)}mm`);
  }

  // 3. Test Vector PDF Generation with 12 labels
  const mockStickers: Printable12LStickerItem[] = Array.from({ length: 12 }).map((_, i) => ({
    id: `stk-${i + 1}`,
    orderNumber: 'JC-2026-TEST',
    customerName: 'RICHONE DOOR',
    doorNumber: i + 1,
    totalDoorsInOrder: 12,
    shutterSize: '-209.8 x -71.5 cm',
    tape: '84 3/8" x 31 1/8"',
    profile: 'EXMB-212',
    finish: 'ROSE WOOD',
    hand: 'RH',
    hingeSide: 'R',
    lock: 'BABY LATCH',
    barcode: `*EXM-TEST-${i + 1}*`,
    finH: 209.8,
    finHText: '-209.8',
    finTopW: 71.5,
    finTopWText: '-71.5',
    finBtmW: 71.5,
    finBtmWText: '-71.5',
    remark: i === 0 ? 'URGENT FACTORY RUN' : '',
  }));

  const pdf = await generate12LStickerPdf(mockStickers, {
    topMarginMm: stdPreset.topMarginMm,
    leftMarginMm: stdPreset.leftMarginMm,
    rowGapMm: stdPreset.rowGapMm,
    colGapMm: stdPreset.colGapMm,
  });

  const pdfBytes = pdf.buildPdf();
  console.log(`Generated 12L PDF byte length: ${pdfBytes.length} bytes`);
  if (pdfBytes.length < 500) {
    throw new Error('Generated PDF byte length suspiciously small!');
  }

  console.log('✅ All 12L 99mm x 44mm dimension and PDF generation tests PASSED!');
}

test12LDimensions().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
