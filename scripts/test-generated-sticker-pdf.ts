import { generate12LStickerPdf, PureVectorPdf } from '../lib/utils/pdfStickerEngine';

async function testPdfEngine() {
  console.log('Testing PureVectorPdf with drawQrCode and 12L stickers...');
  const testStickers = [
    {
      id: 'D-001',
      orderNumber: 'JC-2026-089',
      jobCardNumber: 'JC-2026-089',
      customerName: 'NAZER (VENGARA) - ARCHITECT',
      siteName: 'Villa Project, Vengara',
      floorZone: 'Ground Floor',
      doorNumber: 1,
      totalDoorsInOrder: 4,
      shutterSize: '205.5 x 82.4 cm',
      tape: '80 7/8" x 32 7/16"',
      profile: 'EXM-A-101 Natural Teak',
      modelCode: 'EXM-A-101',
      finish: 'Natural Teak Matte',
      hand: 'RH',
      lock: 'Cylindrical Lock',
      remark: 'Top taper cut required for masonry lintel',
      barcode: '*JC-2026-089-D01*',
      rawHeightCm: 210,
      rawWidthTopCm: 90,
      rawWidthBtmCm: 89.5,
      finH: 205.5,
      finTopW: 82.4,
      finBtmW: 81.9,
      finHText: '205.5 cm',
      finTopWText: '82.4 cm',
      finBtmWText: '81.9 cm',
      tapeInchH: '80 7/8"',
      tapeInchTopW: '32 7/16"',
      tapeInchBtmW: '32 1/4"',
      isTapered: true,
      qrUrl: 'http://192.168.8.101:4000/track/JC-2026-089-D01',
    },
    {
      id: 'D-002',
      orderNumber: 'JC-2026-089',
      jobCardNumber: 'JC-2026-089',
      customerName: 'NAZER (VENGARA) - ARCHITECT',
      siteName: 'Villa Project, Vengara',
      floorZone: 'Ground Floor',
      doorNumber: 2,
      totalDoorsInOrder: 4,
      shutterSize: '205.5 x 72.4 cm',
      tape: '80 7/8" x 28 1/2"',
      profile: 'EXM-A-121 Eeti Wood Bathroom',
      modelCode: 'EXM-A-121',
      finish: 'Eeti Wood Glossy',
      hand: 'LH',
      lock: 'Bathroom Latch',
      barcode: '*JC-2026-089-D02*',
      finHText: '205.5 cm',
      finTopWText: '72.4 cm',
      finBtmWText: '72.4 cm',
      tapeInchH: '80 7/8"',
      tapeInchTopW: '28 1/2"',
      tapeInchBtmW: '28 1/2"',
      isTapered: false,
      qrUrl: 'http://192.168.8.101:4000/track/JC-2026-089-D02',
    },
  ];

  const pdf = await generate12LStickerPdf(testStickers as any, { layout: '2x6' });
  const bytes = pdf.buildPdf();
  console.log(`✓ 12L Sticker PDF generated successfully! Byte size: ${bytes.length} bytes`);

  const pdf34 = await generate12LStickerPdf(testStickers as any, { layout: '3x4' });
  const bytes34 = pdf34.buildPdf();
  console.log(`✓ 3x4 12L Sticker PDF generated successfully! Byte size: ${bytes34.length} bytes`);
}

testPdfEngine().catch(console.error);
