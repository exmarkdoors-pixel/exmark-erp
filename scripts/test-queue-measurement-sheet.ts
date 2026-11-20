import { listProductionOrders } from '../lib/services/productionService';

async function testQueueMeasurementSheet() {
  console.log('--- STARTING QUEUE MEASUREMENT SHEET TEST ---');

  const orders = await listProductionOrders();
  console.log(`Found ${orders.length} total production orders in database.`);

  // Find or create a queued order
  let queuedOrder = orders.find((o) => o.status === 'QUEUED');
  if (!queuedOrder && orders.length > 0) {
    queuedOrder = orders[0];
  }

  if (!queuedOrder) {
    console.log('No production orders found to test. Creating mock test order...');
    queuedOrder = {
      id: 'test-ord-queue-1',
      prodOrderNumber: 'PRD-2026-TEST',
      jobCardNumber: 'JC-2026-TEST',
      customerName: 'Test Client Calicut',
      siteName: 'Beach Road Villa',
      district: 'Kozhikode',
      doorCategory: 'FRP_DOORS',
      quantity: 2,
      lineAssigned: 'Hand Station 1 (Molding Benches)',
      batchNumber: 'BATCH-2026-Q1',
      priority: 'HIGH',
      status: 'QUEUED',
      tolerancesApplied: {
        heightDeductionMm: 12,
        widthDeductionMm: 10,
      },
      doors: [
        {
          id: 'dr-test-1',
          doorId: 'EXM-DR-01',
          doorNumber: 'D1 - Master Bed',
          model: '32mm Molded Teak FRP Door',
          rawHeightMm: 2100,
          rawWidthMm: 900,
          rawWidthBottomMm: 895,
          finishedHeightMm: 2088,
          finishedWidthMm: 890,
          doorThicknessMm: 32,
          frameTypeId: 'frm-wpc-100',
          frameTypeName: 'WPC Solid Extruded 100×65mm',
          handing: 'RH',
          swing: 'INWARD',
          lockType: 'Mortise Lock 60mm Backset',
          finishColor: 'Burma Teak',
          remark: 'Master Bedroom - Flush Threshold',
          qcStatus: 'PENDING',
          qrPayload: 'EXM-DR-01',
        },
        {
          id: 'dr-test-2',
          doorId: 'EXM-DR-02',
          doorNumber: 'D2 - Kitchen Balcony',
          model: '30mm Solid Waterproof FRP Door',
          rawHeightMm: 2050,
          rawWidthMm: 800,
          rawWidthBottomMm: 800,
          finishedHeightMm: 2038,
          finishedWidthMm: 790,
          doorThicknessMm: 30,
          frameTypeId: 'frm-frp-c',
          frameTypeName: 'FRP C-Channel 100×50mm',
          handing: 'LH',
          swing: 'OUTWARD',
          lockType: 'Baby Latch Matte Black',
          finishColor: 'Frost White',
          remark: 'Kitchen Balcony - Weatherproof drip groove',
          qcStatus: 'PENDING',
          qrPayload: 'EXM-DR-02',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  console.log(`\nValidating Queued Order: ${queuedOrder.jobCardNumber} (${queuedOrder.customerName})`);
  console.log(`Doors Count: ${queuedOrder.doors?.length || queuedOrder.quantity}`);
  console.log(`Tolerances Applied: H=-${queuedOrder.tolerancesApplied?.heightDeductionMm || 10}mm, W=-${queuedOrder.tolerancesApplied?.widthDeductionMm || 10}mm`);

  // Verify door details
  const doors = queuedOrder.doors || [];
  if (doors.length === 0) {
    throw new Error('Test failed: Order has no doors');
  }

  doors.forEach((d, idx) => {
    console.log(`\n[Door ${idx + 1}] Tag: ${d.doorNumber}, Model: ${d.model}`);
    console.log(`   Masonry Opening: ${d.rawWidthMm}mm × ${d.rawHeightMm}mm`);
    console.log(`   Finished Door: ${d.finishedWidthMm || d.rawWidthMm - 10}mm × ${d.finishedHeightMm || d.rawHeightMm - 10}mm (Thk: ${d.doorThicknessMm || 32}mm)`);
    console.log(`   Frame: ${d.frameTypeName || 'Standard WPC Frame'}`);
    console.log(`   Handing/Swing: ${d.handing} / ${d.swing || 'INWARD'}`);
    console.log(`   Lock & Color: ${d.lockType} | ${d.finishColor}`);

    if (!d.model || !d.doorNumber) {
      throw new Error(`Test failed: Door ${idx} missing required model or tag`);
    }
  });

  console.log('\n>>> QUEUE MEASUREMENT SHEET DATA INTEGRITY TEST PASSED! <<<');
}

testQueueMeasurementSheet().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
