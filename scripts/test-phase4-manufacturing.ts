import {
  listProductionOrders,
  createProductionOrder,
  getProductionOrder,
  updateProductionStage,
  updateDoorQcWithChecklist,
  findDoorBySerial,
  confirmStickerRemoval,
  ProductionStage,
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

async function runManufacturingTests() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — Phase 4: Manufacturing & Quality Control Suite          ');
  console.log('========================================================================\n');

  try {
    // 1. Initial orders queue
    console.log('--- 1. SHOP FLOOR QUEUE INSPECTION ---');
    const initialOrders = await listProductionOrders();
    assert(Array.isArray(initialOrders), 'listProductionOrders returns array');

    // 2. Job Card Creation with Cutting Deductions
    console.log('\n--- 2. JOB CARD & CUTTING DEDUCTIONS ---');
    const newOrder = await createProductionOrder({
      customerName: 'Skyline Malabar Villas',
      siteName: 'Villa 14',
      district: 'Kozhikode',
      doorCategory: 'FRP_DOORS',
      lineAssigned: 'Line 1: FRP Hydraulic Press (300 Ton)',
      priority: 'HIGH',
      tolerances: {
        heightDeductionMm: 12,
        widthDeductionMm: 10,
      },
      doors: [
        {
          doorNumber: 'D1 - Main Entrance',
          model: '32mm Molded Teak FRP Door',
          rawHeightMm: 2100,
          rawWidthMm: 900,
          handing: 'RH',
          lockType: 'Mortise Lock 60mm',
          finishColor: 'Burma Teak',
        },
        {
          doorNumber: 'D2 - Master Bed',
          model: '30mm Waterproof Solid Bathroom FRP Door',
          rawHeightMm: 2050,
          rawWidthMm: 800,
          handing: 'LH',
          lockType: 'Baby Latch',
          finishColor: 'Frost White',
        },
      ],
    });

    assert(Boolean(newOrder.id), 'Production order created with unique ID');
    assert(newOrder.jobCardNumber.startsWith('JC-2026-'), 'Job Card follows JC-2026-XXX format');
    assert(newOrder.prodOrderNumber.startsWith('PRD-2026-'), 'Prod Order follows PRD-2026-XXX format');
    assert(newOrder.status === 'QUEUED', 'Initial status is QUEUED');
    assert(newOrder.doors.length === 2, '2 doors assigned to Job Card');

    // Verify Cutting Deduction
    const door1 = newOrder.doors[0];
    assert(door1.doorId.startsWith('EXM-DR-2026-'), 'Door 1 has deterministic serial ID EXM-DR-2026-XXXX');
    assert(door1.finishedHeightMm === 2100 - 12, 'Door 1 height deducted by 12mm (2088mm)');
    assert(door1.finishedWidthMm === 900 - 10, 'Door 1 width deducted by 10mm (890mm)');

    const door2 = newOrder.doors[1];
    assert(door2.doorId.startsWith('EXM-DR-2026-'), 'Door 2 has deterministic serial ID EXM-DR-2026-XXXX');
    assert(door2.finishedHeightMm === 2050 - 12, 'Door 2 height deducted by 12mm (2038mm)');
    assert(door2.finishedWidthMm === 800 - 10, 'Door 2 width deducted by 10mm (790mm)');

    // 3. Stage Transitions
    console.log('\n--- 3. STAGE TRACKING WORKFLOW ---');
    const stages: ProductionStage[] = ['MOLDING', 'CNC_ROUTING', 'PU_COATING', 'QA_INSPECTION'];
    let currentOrder = newOrder;

    for (const stage of stages) {
      currentOrder = await updateProductionStage(newOrder.id, stage);
      assert(currentOrder.status === stage, `Advanced production order to ${stage}`);
      assert(Boolean(currentOrder.startedAt), 'startedAt timestamp registered');
    }

    // 4. QC Technical Checklist & Defect Tracking
    console.log('\n--- 4. FINAL QC TECHNICAL CHECKLIST & DEFECT TRACKING ---');
    // Test rework logging on door 1
    const reworkOrder = await updateDoorQcWithChecklist(newOrder.id, door1.id, {
      inspectedAt: new Date().toISOString(),
      inspectorName: 'Chief Inspector Rajesh K.',
      checklist: {
        dimensionalAccuracy: true,
        squarenessTolerance: true,
        surfaceCoatingAdhesion: false, // Coating flaw
        lockPocketAccuracy: true,
        hingeRebateEdgeSealing: true,
        waterImmersionDensity: true,
      },
      decision: 'REWORK_REQUIRED',
      defectType: 'PU_COATING_PEEL',
      defectSeverity: 'MINOR',
      reworkNotes: 'Buff coating blemishes on rear face and re-spray PU clearcoat.',
      actionTaken: 'Sent back to PU coating booth for secondary bake.',
    });

    const d1AfterRework = reworkOrder.doors.find((d) => d.id === door1.id);
    assert(d1AfterRework?.qcStatus === 'REJECTED', 'Door 1 qcStatus marked REJECTED pending rework');
    assert(d1AfterRework?.qcInspection?.decision === 'REWORK_REQUIRED', 'Inspection decision is REWORK_REQUIRED');
    assert(d1AfterRework?.qcInspection?.defectType === 'PU_COATING_PEEL', 'Defect logged as PU_COATING_PEEL');

    // Test passing QC on door 2
    const passOrder = await updateDoorQcWithChecklist(newOrder.id, door2.id, {
      inspectedAt: new Date().toISOString(),
      inspectorName: 'Chief Inspector Rajesh K.',
      checklist: {
        dimensionalAccuracy: true,
        squarenessTolerance: true,
        surfaceCoatingAdhesion: true,
        lockPocketAccuracy: true,
        hingeRebateEdgeSealing: true,
        waterImmersionDensity: true,
      },
      decision: 'PASSED',
      defectType: 'NONE',
      actionTaken: 'Approved for yellow barcode sticker packaging.',
    });

    const d2AfterPass = passOrder.doors.find((d) => d.id === door2.id);
    assert(d2AfterPass?.qcStatus === 'PASSED', 'Door 2 qcStatus marked PASSED');
    assert(d2AfterPass?.qcInspection?.decision === 'PASSED', 'Door 2 certified passed all 6 QC checks');

    // 5. Temporary QR Code Tracking & Serial Lookup
    console.log('\n--- 5. TEMPORARY QR TRACKING LOOKUP ---');
    const tracked = await findDoorBySerial(door2.doorId);
    assert(tracked !== null, `findDoorBySerial finds door "${door2.doorId}"`);
    assert(tracked?.order.customerName === 'Skyline Malabar Villas', 'Tracked order references correct client');
    assert(tracked?.door.model === '30mm Waterproof Solid Bathroom FRP Door', 'Tracked door specs match');

    // 6. Post-Installation Sticker Removal Confirmation
    console.log('\n--- 6. POST-INSTALLATION STICKER REMOVAL CONFIRMATION ---');
    assert(!tracked?.door.stickerRemovedAt, 'Sticker removal initially not confirmed');

    const removalResult = await confirmStickerRemoval(
      door2.doorId,
      'Site Supervisor Haris',
      'Door fitted, hinges aligned, surface cleaned and sticker removed'
    );

    assert(removalResult.success === true, 'Sticker removal confirmed');
    assert(Boolean(removalResult.door.stickerRemovedAt), 'Sticker removal timestamp recorded');
    assert(removalResult.door.stickerRemovedBy === 'Site Supervisor Haris', 'Sticker removedBy recorded');

    // Verify lookup reflects removal confirmation
    const reTracked = await findDoorBySerial(door2.doorId);
    assert(Boolean(reTracked?.door.stickerRemovedAt), 'Serial lookup shows confirmed sticker removal');

    // 7. Complete Production
    console.log('\n--- 7. PRODUCTION ORDER COMPLETION ---');
    const completedOrder = await updateProductionStage(newOrder.id, 'COMPLETED');
    assert(completedOrder.status === 'COMPLETED', 'Order status COMPLETED');
    assert(Boolean(completedOrder.completedAt), 'completedAt timestamp recorded');

    console.log('\n========================================================================');
    console.log(`  Phase 4 Suite Results: ${passed} PASSED / ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runManufacturingTests();
