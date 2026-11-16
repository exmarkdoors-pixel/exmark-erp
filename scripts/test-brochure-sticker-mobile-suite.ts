import { generate12LStickerPdf, PureVectorPdf } from '../lib/utils/pdfStickerEngine';
import { GET as getBrochure } from '../app/api/catalog/brochure/[code]/route';
import { POST as postLocation, GET as getLocation } from '../app/api/tracking/location/route';
import { POST as postPhoto, GET as getPhotos } from '../app/api/fulfillment/photos/route';
import { POST as postInspection, GET as getInspections } from '../app/api/fulfillment/inspection/route';

async function runTestSuite() {
  console.log('========================================================');
  console.log('  EXMARK ERP — FULL BROCHURE, STICKER & MOBILE SUITE    ');
  console.log('========================================================\n');

  // Test 1: 12L Vector Sticker with Top & Bottom Widths and QR Code
  console.log('▸ Test 1: 12L Sticker Vector PDF Generation...');
  const testItems = [
    {
      id: 'D-001',
      orderNumber: 'JC-2026-089',
      jobCardNumber: 'JC-2026-089',
      customerName: 'NAZER (VENGARA) - ARCHITECT',
      siteName: 'Villa Project, Vengara',
      floorZone: 'Ground Floor',
      doorNumber: 1,
      totalDoorsInOrder: 4,
      shutterSize: '205.5 x 82.4 / 81.9 cm',
      tape: '80 7/8" x 32 7/16"',
      profile: 'EXM-A-101 Natural Teak',
      modelCode: 'EXM-A-101',
      finish: 'Natural Teak Matte',
      hand: 'RH',
      lock: 'Cylindrical Privacy',
      remark: 'Top lintel taper cut required',
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
  ];

  const pdf2x6 = await generate12LStickerPdf(testItems as any, { layout: '2x6' });
  const bytes2x6 = pdf2x6.buildPdf();
  if (bytes2x6.length < 5000) throw new Error('12L 2x6 PDF too small');
  console.log(`  ✓ 2x6 12L PDF built: ${bytes2x6.length} bytes`);

  const pdf3x4 = await generate12LStickerPdf(testItems as any, { layout: '3x4' });
  const bytes34 = pdf3x4.buildPdf();
  if (bytes34.length < 5000) throw new Error('12L 3x4 PDF too small');
  console.log(`  ✓ 3x4 12L PDF built: ${bytes34.length} bytes`);

  // Test 2: Door Model Brochure Generator
  console.log('\n▸ Test 2: Door Model Technical Brochure Synthesis...');
  const reqBrochure = new Request('http://localhost:4000/api/catalog/brochure/EXM-A-101');
  const resBrochure = await getBrochure(reqBrochure as any, { params: Promise.resolve({ code: 'EXM-A-101' }) });
  if (resBrochure.status !== 200) throw new Error(`Brochure failed with status ${resBrochure.status}`);
  const brochureBlob = await resBrochure.blob();
  console.log(`  ✓ Technical Brochure PDF built: ${brochureBlob.size} bytes (${resBrochure.headers.get('content-type')})`);

  // Test 3: GPS Tracking Service
  console.log('\n▸ Test 3: Fleet & Staff GPS Tracking API...');
  const reqGps = new Request('http://localhost:4000/api/tracking/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staffId: 'STAFF-TEST-01',
      staffName: 'Nazer Delivery Driver',
      role: 'DRIVER',
      latitude: 11.0425,
      longitude: 75.9876,
      accuracy: 8.5,
      speed: 42.0,
      heading: 180,
    }),
  });
  const resGps = await postLocation(reqGps as any);
  const dataGps = await resGps.json();
  if (!dataGps.success) throw new Error('GPS ping failed');
  console.log('  ✓ GPS breadcrumb recorded successfully.');

  const resGetGps = await getLocation(new Request('http://localhost:4000/api/tracking/location') as any);
  const dataGetGps = await resGetGps.json();
  if (!dataGetGps.success || !Array.isArray(dataGetGps.activeStaff)) throw new Error('Failed to get GPS staff list');
  console.log(`  ✓ Retrieved active staff GPS tracking count: ${dataGetGps.activeStaff.length}`);

  // Test 4: Fulfillment Photos (After-Delivery Proof)
  console.log('\n▸ Test 4: After-Delivery & Installation Photos API...');
  const dummyBase64 = 'data:image/jpeg;base64,' + Buffer.from('TEST_IMAGE_CONTENT').toString('base64');
  const reqPhoto = new Request('http://localhost:4000/api/fulfillment/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'JC-2026-089',
      jobCardNumber: 'JC-2026-089',
      doorId: 'JC-2026-089-D01',
      type: 'DELIVERY_PROOF',
      photoBase64: dummyBase64,
      caption: 'Gate delivery handover photo',
      takenBy: 'Driver Shafi',
    }),
  });
  const resPhoto = await postPhoto(reqPhoto as any);
  const dataPhoto = await resPhoto.json();
  if (!dataPhoto.success) throw new Error('Photo upload failed');
  console.log(`  ✓ After-delivery photo recorded: ${dataPhoto.photo.id}`);

  // Test 5: 6-Point Site Quality Inspection
  console.log('\n▸ Test 5: 6-Point Site Quality Inspection Checklist API...');
  const reqInsp = new Request('http://localhost:4000/api/fulfillment/inspection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'JC-2026-089',
      jobCardNumber: 'JC-2026-089',
      customerName: 'NAZER (VENGARA) - ARCHITECT',
      siteAddress: 'Near Town Hall, Vengara',
      technicianName: 'Suresh Installer',
      checks: {
        framePlumbAndLevel: true,
        uniformPerimeterGap: true,
        hingeScrewsFirm: true,
        lockLatchOperationSmooth: true,
        bottomClearanceFloorLevel: true,
        surfaceFinishScratchFree: true,
      },
      overallRating: 5,
      technicianNotes: 'Installed and handed over in perfect alignment.',
    }),
  });
  const resInsp = await postInspection(reqInsp as any);
  const dataInsp = await resInsp.json();
  if (!dataInsp.success) throw new Error('Inspection submit failed');
  console.log(`  ✓ 6-Point Inspection recorded: ${dataInsp.inspection.id} (Rating: ${dataInsp.inspection.overallRating}★)`);

  console.log('\n========================================================');
  console.log('  ALL TESTS PASSED WITH 100% SUCCESS!                     ');
  console.log('========================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
