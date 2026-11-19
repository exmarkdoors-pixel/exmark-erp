import fs from 'fs';
import path from 'path';
import { sanitizePdfText, generate12LStickerPdf } from '../lib/utils/pdfStickerEngine';

async function runTests() {
  console.log('--- Testing Standard Unslashed Normal Zero for 12L Sticker Prints ---');

  // Test 1: globals.css check
  const cssPath = path.join(process.cwd(), 'app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  if (!cssContent.includes('.clean-unslashed-zero')) {
    throw new Error('FAIL: globals.css missing .clean-unslashed-zero');
  }
  if (!cssContent.includes('font-feature-settings: "zero" 0 !important')) {
    throw new Error('FAIL: globals.css missing font-feature-settings: "zero" 0 !important');
  }
  if (!cssContent.includes('[data-sticker="true"]')) {
    throw new Error('FAIL: globals.css missing [data-sticker="true"] selector');
  }
  console.log('✅ globals.css enforces unslashed zero and disables slashed glyphs');

  // Test 2: StickerPrintModal.tsx check
  const modalPath = path.join(process.cwd(), 'components/modules/production/StickerPrintModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  if (!modalContent.includes('data-sticker="true"')) {
    throw new Error('FAIL: StickerPrintModal missing data-sticker="true"');
  }
  if (!modalContent.includes('clean-unslashed-zero')) {
    throw new Error('FAIL: StickerPrintModal missing clean-unslashed-zero');
  }
  // Check cutting box lines in 12L format don't have font-mono
  const modal12lSlice = modalContent.slice(modalContent.indexOf('Two-Column Boxed Cutting Size Grid (Full Width, matching factory reference photo)'));
  const modalCuttingBoxSlice = modal12lSlice.slice(0, 800);
  if (modalCuttingBoxSlice.includes('font-mono')) {
    throw new Error('FAIL: StickerPrintModal cutting box still contains font-mono');
  }
  if (!modalCuttingBoxSlice.includes('font-sans font-black tracking-tight tabular-nums')) {
    throw new Error('FAIL: StickerPrintModal cutting box missing tabular-nums sans styling');
  }
  console.log('✅ StickerPrintModal uses clean sans tabular-nums without font-mono in cutting box');

  // Test 3: BatchPrintHub.tsx check
  const hubPath = path.join(process.cwd(), 'components/modules/production/BatchPrintHub.tsx');
  const hubContent = fs.readFileSync(hubPath, 'utf8');
  if (!hubContent.includes('clean-unslashed-zero')) {
    throw new Error('FAIL: BatchPrintHub missing clean-unslashed-zero');
  }
  const hub12lSlice = hubContent.slice(hubContent.indexOf('Two-Column Boxed Cutting Size Grid (Full Width, matching factory reference photo)'));
  const hubCuttingBoxSlice = hub12lSlice.slice(0, 800);
  if (hubCuttingBoxSlice.includes('font-mono')) {
    throw new Error('FAIL: BatchPrintHub cutting box still contains font-mono');
  }
  if (!hubCuttingBoxSlice.includes('font-sans font-black tracking-tight tabular-nums')) {
    throw new Error('FAIL: BatchPrintHub cutting box missing tabular-nums sans styling');
  }
  console.log('✅ BatchPrintHub uses clean sans tabular-nums without font-mono in cutting box');

  // Test 4: sanitizePdfText unicode slashed zero sanitization
  const slashedInput = 'DOOR \u00D81 \u00F82 \u22053 \u29B54 \u23005 -205.0';
  const sanitized = sanitizePdfText(slashedInput);
  if (sanitized !== 'DOOR 01 02 03 04 05 -205.0') {
    throw new Error(`FAIL: sanitizePdfText failed to replace slashed zeros. Got: "${sanitized}"`);
  }
  console.log('✅ sanitizePdfText properly converts slashed zero Unicode glyphs (Ø, ø, ∅) to plain "0"');

  // Test 5: Vector PDF Generation with 12L format
  const sampleItems = [
    {
      orderNumber: 'EXM-2026-001',
      customerName: 'Anil Kumar 007',
      doorNumber: '01',
      modelCode: 'EXM-A-101',
      profile: 'EXM-A-101',
      hingeSide: 'R',
      lock: 'Baby Latch',
      finish: 'Teak 01',
      finH: 205.0,
      finTopW: 80.0,
      finBtmW: 80.0,
      heightMm: 2050,
      widthMm: 800,
    },
    {
      orderNumber: 'EXM-2026-002',
      customerName: 'Babu 080',
      doorNumber: '08',
      modelCode: 'EXM-B-208',
      profile: 'EXM-B-208',
      hingeSide: 'L',
      lock: 'Mortise 80mm',
      finish: 'Walnut 08',
      finH: 198.0,
      finTopW: 78.0,
      finBtmW: 78.5,
      remark: 'Careful with zero vs 8',
    },
  ];

  const doc = await generate12LStickerPdf(sampleItems as any, {
    layout: '2x6',
    topMarginMm: 16.0,
    leftMarginMm: 6.0,
  });

  const pdfBytes = doc.buildPdf();
  const pdfString = Buffer.from(pdfBytes).toString('utf-8');

  if (!pdfString.startsWith('%PDF-1.4')) {
    throw new Error('FAIL: PDF generation failed or produced invalid PDF header');
  }
  if (!pdfString.includes('/BaseFont /Helvetica')) {
    throw new Error('FAIL: PDF missing Helvetica font');
  }
  console.log('✅ PureVectorPdf generates valid 12L sticker PDF using clean Helvetica font');

  console.log('\n🎉 ALL 5 TESTS PASSED: Slashed zeros eliminated, normal open zero enforced across preview, browser print, and PDF export.');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
