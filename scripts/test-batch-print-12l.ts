import { DEFAULT_BATCH_FACTORY_ORDERS, extractTopBtmWidths } from '../components/modules/production/BatchPrintHub';
import { generate12LStickerPdf } from '../lib/utils/pdfStickerEngine';

async function testBatchPrintHub() {
  console.log('🧪 Testing BatchPrintHub & 12L (2x6) Multi-Party Generation...');

  console.log(`Found ${DEFAULT_BATCH_FACTORY_ORDERS.length} factory reference parties.`);

  const allStickers: any[] = [];
  let stickerIdx = 0;

  for (const party of DEFAULT_BATCH_FACTORY_ORDERS) {
    console.log(`Checking party: ${party.customerName} (${party.doorsList.length} doors)`);
    for (const d of party.doorsList) {
      stickerIdx++;
      const widths = extractTopBtmWidths(d);
      allStickers.push({
        id: `stk-${stickerIdx}`,
        orderNumber: party.orderNumber,
        jobCardNumber: party.jobCardNumber,
        customerName: party.customerName,
        siteName: party.siteName,
        doorNumber: stickerIdx,
        totalDoorsInOrder: party.doorsList.length,
        shutterSize: d.shutterSize,
        tape: d.tape,
        profile: d.profile,
        finish: d.finish,
        hand: d.hand,
        hingeSide: d.hand.toUpperCase().startsWith('L') ? 'L' : 'R',
        lock: d.lock,
        remark: d.remark || '',
        barcode: `*EXM-${party.orderNumber.slice(-3)}-D0${stickerIdx}*`,
        finH: d.finH,
        finHText: d.finHText,
        finTopW: widths.topW,
        finBtmW: widths.btmW,
        finTopWText: widths.topText,
        finBtmWText: widths.btmText,
        isTapered: widths.isTapered,
      });
    }
  }

  console.log(`Total expanded stickers across all parties: ${allStickers.length}`);
  if (allStickers.length !== 8) {
    throw new Error(`Expected 8 stickers from demo parties, got ${allStickers.length}`);
  }

  // Check Sticker 1: RICHONE DOOR D1
  const s1 = allStickers[0];
  console.log(`Sticker 1: ${s1.customerName} - H: ${s1.finHText}, Top: ${s1.finTopWText}, Btm: ${s1.finBtmWText}`);
  if (s1.finHText !== '-209.8' || s1.finTopWText !== '-71.5' || s1.finBtmWText !== '-71.5') {
    throw new Error(`Sticker 1 mismatch! Expected -209.8, -71.5, -71.5, got ${s1.finHText}, ${s1.finTopWText}, ${s1.finBtmWText}`);
  }

  // Check Sticker 2: RICHONE DOOR D2 (Tapered Top 70.5, Btm 71.1)
  const s2 = allStickers[1];
  console.log(`Sticker 2: ${s2.customerName} - H: ${s2.finHText}, Top: ${s2.finTopWText}, Btm: ${s2.finBtmWText}`);
  if (s2.finHText !== '-207.9' || s2.finTopWText !== '-70.5' || s2.finBtmWText !== '-71.1') {
    throw new Error(`Sticker 2 mismatch! Expected -207.9, -70.5, -71.1, got ${s2.finHText}, ${s2.finTopWText}, ${s2.finBtmWText}`);
  }

  // Check Sticker 4: GLYS PROMOAD (H-RIGHT -192.3, Top -71.1, Btm -70.5)
  const s4 = allStickers[3];
  console.log(`Sticker 4: ${s4.customerName} - Hinge: ${s4.hingeSide}, H: ${s4.finHText}, Top: ${s4.finTopWText}, Btm: ${s4.finBtmWText}`);
  if (s4.hingeSide !== 'L' || s4.finHText !== '-192.3' || s4.finTopWText !== '-71.1' || s4.finBtmWText !== '-70.5') {
    throw new Error(`Sticker 4 mismatch! Expected Hinge L, -192.3, -71.1, -70.5, got Hinge ${s4.hingeSide}, ${s4.finHText}, ${s4.finTopWText}, ${s4.finBtmWText}`);
  }

  // Generate Vector PDF in 2x6 layout
  console.log('Generating 12L Vector PDF in 2x6 layout...');
  const doc = await generate12LStickerPdf(allStickers, {
    layout: '2x6',
    companyName: 'EXMARK DOORS',
  });

  const pdfBytes = doc.buildPdf();
  console.log(`Generated PDF successfully! Size: ${pdfBytes.length} bytes`);
  if (pdfBytes.length < 1000) {
    throw new Error('PDF output too small!');
  }

  console.log('🎉 ALL BATCH PRINT & 12L (2x6) TESTS PASSED SUCCESSFULLY!');
}

testBatchPrintHub().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
