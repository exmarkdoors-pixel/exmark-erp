import { generate12LStickerPdf, Printable12LStickerItem } from '../lib/utils/pdfStickerEngine';

async function testTowelStickerReferenceParity() {
  console.log('🧪 Testing Towel Sticker Reference PDF Parity (FM ALUMINIUM 19 Doors)...');

  // Build 19 doors matching the reference PDF exactly
  const stickers: Printable12LStickerItem[] = Array.from({ length: 19 }, (_, i) => ({
    id: `fm-d${i + 1}`,
    orderNumber: 'EXM-PO-2026-FM',
    jobCardNumber: 'JC-FM-01',
    customerName: 'FM ALUMINIUM',
    doorNumber: i + 1,
    totalDoorsInOrder: 19,
    profile: 'EXM-A-101',
    modelCode: 'EXM-A-101',
    shutterSize: '241.5 x 84.4 cm',
    tape: '95" x 33 1/4"',
    finish: 'NATURAL TEAK EXGC-510',
    hand: 'RH',
    hingeSide: 'R',
    lock: 'PLUSPOINT BLACK',
    barcode: `*FM-D${String(i + 1).padStart(2, '0')}*`,
    finH: 241.5,
    finHText: '-241.5',
    finTopW: 84.4,
    finBtmW: 84.4,
    finTopWText: '-84.4',
    finBtmWText: '-84.4',
    isTapered: false,
  }));

  console.log(`Generated ${stickers.length} test items.`);

  const doc = await generate12LStickerPdf(stickers, {
    layout: '2x6',
    companyName: 'EXMARK DOORS',
  });

  const pdfBytes = doc.buildPdf();
  const pdfString = Buffer.from(pdfBytes).toString('latin1');

  console.log(`PDF built successfully! Size: ${pdfBytes.length} bytes.`);

  // 1. Verify 2 pages generated for 19 doors (12 on page 1, 7 on page 2)
  const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
  console.log(`Total Pages found in PDF: ${pageMatches?.length}`);
  if (!pageMatches || pageMatches.length !== 2) {
    throw new Error(`Expected exactly 2 pages for 19 stickers (12L layout), got ${pageMatches?.length}`);
  }

  // 2. Verify PartyName and Customer
  if (!pdfString.includes('PartyName') || !pdfString.includes('FM ALUMINIUM')) {
    throw new Error('Expected PartyName and FM ALUMINIUM in PDF stream');
  }

  // 3. Verify Model/Part and Model Code
  if (!pdfString.includes('Model/Part') || !pdfString.includes('EXM-A-101')) {
    throw new Error('Expected Model/Part and EXM-A-101 in PDF stream');
  }

  // 4. Verify LOCK pill and COLOUR pill
  if (!pdfString.includes('LOCK:') || !pdfString.includes('PLUSPOINT BLACK')) {
    throw new Error('Expected LOCK: and PLUSPOINT BLACK in PDF stream');
  }
  if (!pdfString.includes('COLOUR:') || !pdfString.includes('NATURAL TEAK EXGC-510')) {
    throw new Error('Expected COLOUR: and NATURAL TEAK EXGC-510 in PDF stream');
  }

  // 5. Verify Cutting Box contains BOTTOM (and not BTM)
  if (!pdfString.includes('BOTTOM')) {
    throw new Error('Expected BOTTOM in PDF stream');
  }
  if (pdfString.includes('(BTM)')) {
    throw new Error('Found deprecated (BTM) in PDF stream, expected (BOTTOM)');
  }

  // 6. Verify H-LEFT, -241.5, TOP, and -84.4
  if (!pdfString.includes('H-LEFT') || !pdfString.includes('-241.5')) {
    throw new Error('Expected H-LEFT and -241.5 in PDF stream');
  }
  if (!pdfString.includes('TOP') || !pdfString.includes('-84.4')) {
    throw new Error('Expected TOP and -84.4 in PDF stream');
  }

  // 7. Verify door sequence numbers 1, 12, 13, 19
  if (!pdfString.includes('(1)') || !pdfString.includes('(12)') || !pdfString.includes('(13)') || !pdfString.includes('(19)')) {
    throw new Error('Expected door numbers 1, 12, 13, 19 in PDF stream');
  }

  console.log('✅ ALL 7 TOWEL STICKER REFERENCE PARITY CHECKS PASSED 100%!');
}

testTowelStickerReferenceParity().catch(err => {
  console.error('❌ Parity Test failed:', err);
  process.exit(1);
});
