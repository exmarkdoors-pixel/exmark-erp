import {
  listProductionOrders,
  createProductionOrder,
  getProductionOrder,
  updateProductionStage,
  updateDoorQc,
} from '../lib/services/productionService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  EXMARK ERP — Phase 3 Production Verification Suite ');
  console.log('====================================================\n');

  try {
    // 1. List Production Orders
    console.log('--- PRODUCTION ORDER QUEUE TESTS ---');
    const initialOrders = await listProductionOrders();
    assert(Array.isArray(initialOrders), 'listProductionOrders returns array');

    // 2. Create Production Order with Job Card & Tolerances
    console.log('\n--- JOB CARD & TOLERANCE CALCULATION TESTS ---');
    const createdOrder = await createProductionOrder({
      customerName: 'Skyline Builders Ernakulam',
      siteName: 'Skyline Palms Tower C',
      district: 'Ernakulam',
      lineAssigned: 'Line 1: FRP Hydraulic Press (300 Ton)',
      priority: 'HIGH',
      tolerances: {
        heightDeductionMm: 12, // 12mm floor + frame clearance
        widthDeductionMm: 10,  // 10mm rebate clearance
      },
      doors: [
        {
          doorNumber: 'D101 - Main Entrance',
          model: '35mm Heavy Duty Rosewood FRP Door',
          rawHeightMm: 2120,
          rawWidthMm: 950,
          handing: 'RH',
          lockType: 'Mortise Lock 60mm',
          finishColor: 'Rosewood',
        },
        {
          doorNumber: 'D102 - Toilet 1',
          model: '30mm Waterproof Solid Bathroom FRP Door',
          rawHeightMm: 2080,
          rawWidthMm: 750,
          handing: 'LH',
          lockType: 'Baby Latch',
          finishColor: 'Frost White',
        },
      ],
    });

    assert(!!createdOrder.id, 'createProductionOrder assigns unique order ID');
    assert(createdOrder.prodOrderNumber.startsWith('PRD-2026-'), 'Assigns PRD-2026-NNN order number');
    assert(createdOrder.jobCardNumber.startsWith('JC-2026-'), 'Assigns JC-2026-NNN job card number');
    assert(createdOrder.doors.length === 2, 'Creates correct number of door line items');

    // 3. Finished Dimensions & Door Unique Tracking
    console.log('\n--- DOOR-WISE CUTTING & SERIAL TRACKING TESTS ---');
    const door1 = createdOrder.doors[0];
    const door2 = createdOrder.doors[1];

    assert(door1.doorId.startsWith('EXM-DR-2026-'), 'Assigns unique EXM-DR-2026-XXXX sequential serial to Door 1');
    assert(door2.doorId.startsWith('EXM-DR-2026-'), 'Assigns unique EXM-DR-2026-XXXX sequential serial to Door 2');
    assert(door1.doorId !== door2.doorId, 'Door IDs are distinct');

    // Finished Height: 2120 - 12 = 2108mm
    assert(door1.finishedHeightMm === 2108, 'Finished Height = Raw Height - 12mm (2120 - 12 = 2108mm)');
    // Finished Width: 950 - 10 = 940mm
    assert(door1.finishedWidthMm === 940, 'Finished Width = Raw Width - 10mm (950 - 10 = 940mm)');

    // Finished Height: 2080 - 12 = 2068mm
    assert(door2.finishedHeightMm === 2068, 'Door 2 Finished Height correctly computed (2080 - 12 = 2068mm)');
    // Finished Width: 750 - 10 = 740mm
    assert(door2.finishedWidthMm === 740, 'Door 2 Finished Width correctly computed (750 - 10 = 740mm)');

    // QR Payload validation
    assert(door1.qrPayload.includes(door1.doorId), 'QR payload contains unique door ID');
    assert(door1.qrPayload.includes('2108x940mm'), 'QR payload contains finished cut dimensions');

    // 4. Production Stage Progression
    console.log('\n--- PRODUCTION STAGE LIFECYCLE TESTS ---');
    assert(createdOrder.status === 'QUEUED', 'Initial status is QUEUED');

    const inMolding = await updateProductionStage(createdOrder.id, 'MOLDING');
    assert(inMolding.status === 'MOLDING', 'Advances to MOLDING stage');
    assert(!!inMolding.startedAt, 'Records startedAt timestamp on first progression');

    const inCnc = await updateProductionStage(createdOrder.id, 'CNC_ROUTING');
    assert(inCnc.status === 'CNC_ROUTING', 'Advances to CNC_ROUTING stage');

    const inPu = await updateProductionStage(createdOrder.id, 'PU_COATING');
    assert(inPu.status === 'PU_COATING', 'Advances to PU_COATING stage');

    const inQa = await updateProductionStage(createdOrder.id, 'QA_INSPECTION');
    assert(inQa.status === 'QA_INSPECTION', 'Advances to QA_INSPECTION stage');

    // 5. Individual Door QC Update
    console.log('\n--- INDIVIDUAL DOOR QC VERIFICATION TESTS ---');
    const updatedQc = await updateDoorQc(createdOrder.id, door1.id, 'PASSED');
    const checkedDoor = updatedQc.doors.find((d) => d.id === door1.id);
    assert(checkedDoor?.qcStatus === 'PASSED', 'Individual door QC status updated to PASSED');

    // 6. Complete Order
    const completedOrder = await updateProductionStage(createdOrder.id, 'COMPLETED');
    assert(completedOrder.status === 'COMPLETED', 'Advances to COMPLETED stage');
    assert(!!completedOrder.completedAt, 'Records completedAt timestamp');

    // 7. Get Production Order by ID
    const retrieved = await getProductionOrder(createdOrder.id);
    assert(retrieved?.id === createdOrder.id, 'getProductionOrder retrieves persisted order');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
