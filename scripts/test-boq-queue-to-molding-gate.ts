import fs from 'fs';
import path from 'path';

// Set up an isolated test vault so production data is never touched!
const TEST_VAULT = path.join(process.cwd(), '.tmp-test-vault-gate-' + Date.now());
process.env.EXMARK_DATA_DIR = TEST_VAULT;

async function runTests() {
  console.log('--- STARTING BOQ QUEUE-TO-MOLDING GATE INTEGRATION TEST ---');
  console.log(`Isolated Data Directory: ${TEST_VAULT}`);

  if (!fs.existsSync(TEST_VAULT)) {
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  }

  // Import services AFTER environment variable is set
  const {
    isOrderEligibleForBoqIssue,
    isDoorEligibleForBoqIssue,
    recordDoorMaterialIssue,
    markProductionBoqIssued,
    IneligibleBoqStageError,
    DuplicateBoqIssueError,
    BOQ_ELIGIBLE_STAGES,
  } = await import('../lib/services/productionService');

  // Seed test orders directly into production-store.json
  const storeFile = path.join(TEST_VAULT, 'production-store.json');
  const nowIso = new Date().toISOString();

  const testOrders = [
    {
      id: 'ORD-GATE-001',
      prodOrderNumber: 'PRD-GATE-001',
      jobCardNumber: 'JC-GATE-001',
      customerName: 'Kochi Queued Party',
      siteName: 'Kochi Project',
      district: 'Ernakulam',
      doorCategory: 'FRP_DOORS',
      quantity: 2,
      lineAssigned: 'LINE-1',
      batchNumber: 'B-001',
      priority: 'NORMAL',
      status: 'QUEUED',
      doors: [
        {
          id: 'D-001-A',
          doorId: 'EXM-GATE-01A',
          doorNumber: 'D1',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'RH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-001-A',
          materialIssued: false,
        },
        {
          id: 'D-001-B',
          doorId: 'EXM-GATE-01B',
          doorNumber: 'D2',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'LH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-001-B',
          materialIssued: false,
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ORD-GATE-002',
      prodOrderNumber: 'PRD-GATE-002',
      jobCardNumber: 'JC-GATE-002',
      customerName: 'Calicut Molding Party',
      siteName: 'Calicut Villa',
      district: 'Kozhikode',
      doorCategory: 'FRP_DOORS',
      quantity: 2,
      lineAssigned: 'LINE-2',
      batchNumber: 'B-002',
      priority: 'HIGH',
      status: 'MOLDING',
      doors: [
        {
          id: 'D-002-A',
          doorId: 'EXM-GATE-02A',
          doorNumber: 'D1',
          model: 'EXM-ROYAL',
          rawHeightMm: 2100,
          rawWidthMm: 850,
          finishedHeightMm: 2080,
          finishedWidthMm: 830,
          handing: 'RH',
          lockType: 'Mortise Lock',
          finishColor: 'Rosewood',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-002-A',
          materialIssued: true,
          materialIssueBatchId: 'BOQ-BATCH-INIT-001',
          materialIssuedAt: nowIso,
        },
        {
          id: 'D-002-B',
          doorId: 'EXM-GATE-02B',
          doorNumber: 'D2',
          model: 'EXM-ROYAL',
          rawHeightMm: 2100,
          rawWidthMm: 850,
          finishedHeightMm: 2080,
          finishedWidthMm: 830,
          handing: 'LH',
          lockType: 'Mortise Lock',
          finishColor: 'Rosewood',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-002-B',
          materialIssued: false,
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ORD-GATE-003',
      prodOrderNumber: 'PRD-GATE-003',
      jobCardNumber: 'JC-GATE-003',
      customerName: 'Thrissur Cutting Party',
      siteName: 'Thrissur Complex',
      district: 'Thrissur',
      doorCategory: 'FRP_DOORS',
      quantity: 2,
      lineAssigned: 'LINE-1',
      batchNumber: 'B-003',
      priority: 'NORMAL',
      status: 'CUTTING_FINISHING',
      doors: [
        {
          id: 'D-003-A',
          doorId: 'EXM-GATE-03A',
          doorNumber: 'D1',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'RH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-003-A',
          materialIssued: false,
          stage: 'CUTTING_FINISHING',
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ORD-GATE-004',
      prodOrderNumber: 'PRD-GATE-004',
      jobCardNumber: 'JC-GATE-004',
      customerName: 'Kannur Paint Party',
      siteName: 'Kannur Heights',
      district: 'Kannur',
      doorCategory: 'FRP_DOORS',
      quantity: 1,
      lineAssigned: 'LINE-1',
      batchNumber: 'B-004',
      priority: 'NORMAL',
      status: 'PAINT_SECTION',
      doors: [
        {
          id: 'D-004-A',
          doorId: 'EXM-GATE-04A',
          doorNumber: 'D1',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'RH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-004-A',
          materialIssued: false,
          stage: 'PAINT_SECTION',
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ORD-GATE-005',
      prodOrderNumber: 'PRD-GATE-005',
      jobCardNumber: 'JC-GATE-005',
      customerName: 'Trivandrum Delivery Party',
      siteName: 'Trivandrum Flat',
      district: 'Trivandrum',
      doorCategory: 'FRP_DOORS',
      quantity: 1,
      lineAssigned: 'LINE-1',
      batchNumber: 'B-005',
      priority: 'NORMAL',
      status: 'DELIVERY',
      doors: [
        {
          id: 'D-005-A',
          doorId: 'EXM-GATE-05A',
          doorNumber: 'D1',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'RH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-005-A',
          materialIssued: false,
          stage: 'DELIVERY',
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  fs.writeFileSync(storeFile, JSON.stringify(testOrders, null, 2), 'utf8');
  console.log('Seeded 5 test orders in QUEUED, MOLDING, CUTTING_FINISHING, PAINT_SECTION, and DELIVERY.');

  // Test 1: Stage eligibility checks
  console.log('\n[TEST 1] Testing isOrderEligibleForBoqIssue function:');
  const chk1 = isOrderEligibleForBoqIssue(testOrders[0] as any);
  if (!chk1.eligible) throw new Error('Test 1 Fail: Order in QUEUED must be eligible!');
  console.log('✓ Order 1 (QUEUED) is correctly ELIGIBLE');

  const chk2 = isOrderEligibleForBoqIssue(testOrders[1] as any);
  if (!chk2.eligible) throw new Error('Test 1 Fail: Order in MOLDING must be eligible!');
  console.log('✓ Order 2 (MOLDING) is correctly ELIGIBLE');

  const chk3 = isOrderEligibleForBoqIssue(testOrders[2] as any);
  if (chk3.eligible) throw new Error('Test 1 Fail: Order in CUTTING_FINISHING must NOT be eligible!');
  console.log('✓ Order 3 (CUTTING_FINISHING) is correctly INELIGIBLE:', chk3.reason);

  const chk4 = isOrderEligibleForBoqIssue(testOrders[3] as any);
  if (chk4.eligible) throw new Error('Test 1 Fail: Order in PAINT_SECTION must NOT be eligible!');
  console.log('✓ Order 4 (PAINT_SECTION) is correctly INELIGIBLE:', chk4.reason);

  const chk5 = isOrderEligibleForBoqIssue(testOrders[4] as any);
  if (chk5.eligible) throw new Error('Test 1 Fail: Order in DELIVERY must NOT be eligible!');
  console.log('✓ Order 5 (DELIVERY) is correctly INELIGIBLE:', chk5.reason);

  // Test 2: Issue BOQ for Order 1 (QUEUED) -> Should succeed!
  console.log('\n[TEST 2] Issuing BOQ for Order in QUEUED (JC-GATE-001):');
  const updated1 = await recordDoorMaterialIssue('ORD-GATE-001', {
    doorIds: ['D-001-A', 'D-001-B'],
    batchId: 'BOQ-TEST-VOUCHER-001',
    gangName: 'Molding Team 1',
    totalIssuedValue: 4500,
  });
  if (!updated1.doors.every((d) => d.materialIssued)) {
    throw new Error('Test 2 Fail: Doors were not marked as issued!');
  }
  console.log(`✓ Successfully issued BOQ for Order in QUEUED: all ${updated1.doors.length} doors marked issued.`);

  // Test 3: Issue BOQ for balance door in Order 2 (MOLDING) -> Should succeed!
  console.log('\n[TEST 3] Issuing balance door for Order in MOLDING (JC-GATE-002):');
  const updated2 = await recordDoorMaterialIssue('ORD-GATE-002', {
    doorIds: ['D-002-B'],
    batchId: 'BOQ-TEST-VOUCHER-002',
    gangName: 'Molding Team 2',
    totalIssuedValue: 2400,
  });
  if (!updated2.doors.find((d) => d.id === 'D-002-B')?.materialIssued) {
    throw new Error('Test 3 Fail: Balance door D2 was not marked as issued!');
  }
  console.log('✓ Successfully issued balance door D2 in MOLDING.');

  // Test 4: Attempt to issue BOQ for Order in CUTTING_FINISHING -> MUST THROW IneligibleBoqStageError
  console.log('\n[TEST 4] Attempting to issue BOQ for Order in CUTTING_FINISHING (JC-GATE-003):');
  let thrownCut = false;
  try {
    await recordDoorMaterialIssue('ORD-GATE-003', {
      doorIds: ['D-003-A'],
      batchId: 'BOQ-TEST-FAIL-001',
    });
  } catch (err: any) {
    if (err instanceof IneligibleBoqStageError) {
      thrownCut = true;
      console.log('✓ Caught expected IneligibleBoqStageError:', err.message);
    } else {
      throw new Error(`Unexpected error type: ${err}`);
    }
  }
  if (!thrownCut) {
    throw new Error('Test 4 Fail: Issuing BOQ for CUTTING_FINISHING order did NOT throw IneligibleBoqStageError!');
  }

  // Test 5: Attempt to issue BOQ for Order in PAINT_SECTION -> MUST THROW IneligibleBoqStageError
  console.log('\n[TEST 5] Attempting to issue BOQ for Order in PAINT_SECTION (JC-GATE-004):');
  let thrownPaint = false;
  try {
    await recordDoorMaterialIssue('ORD-GATE-004', {
      doorIds: ['D-004-A'],
      batchId: 'BOQ-TEST-FAIL-002',
    });
  } catch (err: any) {
    if (err instanceof IneligibleBoqStageError) {
      thrownPaint = true;
      console.log('✓ Caught expected IneligibleBoqStageError:', err.message);
    } else {
      throw new Error(`Unexpected error type: ${err}`);
    }
  }
  if (!thrownPaint) {
    throw new Error('Test 5 Fail: Issuing BOQ for PAINT_SECTION order did NOT throw IneligibleBoqStageError!');
  }

  // Test 6: Attempt to markEntireBoqIssued for Order in DELIVERY -> MUST THROW IneligibleBoqStageError
  console.log('\n[TEST 6] Attempting markProductionBoqIssued on DELIVERY order (JC-GATE-005):');
  let thrownDeliv = false;
  try {
    await markProductionBoqIssued('ORD-GATE-005');
  } catch (err: any) {
    if (err instanceof IneligibleBoqStageError) {
      thrownDeliv = true;
      console.log('✓ Caught expected IneligibleBoqStageError on delivery order:', err.message);
    } else {
      throw new Error(`Unexpected error type: ${err}`);
    }
  }
  if (!thrownDeliv) {
    throw new Error('Test 6 Fail: markProductionBoqIssued did NOT throw IneligibleBoqStageError on DELIVERY order!');
  }

  // Test 7: Duplicate prevention check still active on already issued door
  console.log('\n[TEST 7] Attempting duplicate issue on already issued door in MOLDING:');
  let thrownDup = false;
  try {
    await recordDoorMaterialIssue('ORD-GATE-002', {
      doorIds: ['D-002-A'], // already issued
      batchId: 'BOQ-TEST-FAIL-DUP',
    });
  } catch (err: any) {
    if (err instanceof DuplicateBoqIssueError) {
      thrownDup = true;
      console.log('✓ Caught expected DuplicateBoqIssueError:', err.message);
    } else {
      throw new Error(`Unexpected error type: ${err}`);
    }
  }
  if (!thrownDup) {
    throw new Error('Test 7 Fail: Duplicate issue did not throw DuplicateBoqIssueError!');
  }

  // Clean up
  try {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    console.log('\nCleaned up isolated test vault.');
  } catch {}

  console.log('\n======================================================');
  console.log('🎉 ALL 7 TESTS PASSED SUCCESSFULLY! ZERO DEFECTS!');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
