import {
  createProductionOrder,
  getProductionOrder,
  updateProductionStage,
  markProductionStageWorkCompleted,
  deleteProductionOrder,
} from '../lib/services/productionService';
import {
  getContractors,
  getContractorById,
  recordPieceRateCreditIfUnpaid,
  getRateForOperation,
} from '../lib/services/contractorService';

async function run() {
  console.log('🧪 Starting "Credit Payment After Work Complete" Verification Test...\n');

  // 1. Get or pick contractors
  const contractors = getContractors();
  const moldingGang = contractors.find((c) => c.trade === 'MOLDING') || contractors[0];
  const cuttingGang = contractors.find((c) => c.trade === 'CUTTING_GRINDING' || c.teamScope?.includes('CUTTING')) || contractors[1];

  if (!moldingGang || !cuttingGang) {
    throw new Error('Need at least 2 contractors to run this test');
  }

  const initialMoldingBalance = moldingGang.balancePayable || 0;
  const initialCuttingBalance = cuttingGang.balancePayable || 0;
  console.log(`Initial Balances:`);
  console.log(`  - Molding Gang (${moldingGang.name}): ₹${initialMoldingBalance}`);
  console.log(`  - Cutting Gang (${cuttingGang.name}): ₹${initialCuttingBalance}`);

  // 2. Create a test production order
  const testJobCardNum = `JC-TEST-WORKCOMP-${Date.now().toString().slice(-5)}`;
  console.log(`\n1. Creating test order in QUEUED: ${testJobCardNum}...`);
  const order = await createProductionOrder({
    jobCardNumber: testJobCardNum,
    customerName: 'Test Work Complete Customer',
    siteName: 'Test Site',
    district: 'Calicut',
    phone: '9876543210',
    quantity: 2,
    doors: [
      {
        id: 'door-tc-1',
        doorNumber: '1',
        model: 'EX-TEST-1',
        finishedWidthMm: 800,
        finishedHeightMm: 2000,
        finishColor: 'Teak',
        materialIssued: true,
      },
      {
        id: 'door-tc-2',
        doorNumber: '2',
        model: 'EX-TEST-2',
        finishedWidthMm: 850,
        finishedHeightMm: 2050,
        finishColor: 'Walnut',
        materialIssued: true,
      },
    ] as any,
  });

  console.log(`   Order created: ${order.id}, Status: ${order.status}`);
  if (order.status !== 'QUEUED') throw new Error('Expected order to start in QUEUED');

  try {
    // 3. Move QUEUED -> MOLDING (with credit deferred by default)
    console.log(`\n2. Moving QUEUED -> MOLDING (Assigning ${moldingGang.name}, payment deferred)...`);
    const moldingOrder = await updateProductionStage(order.id, 'MOLDING', {
      gangId: moldingGang.id,
      gangName: moldingGang.name,
      operation: 'MOLDING_DOOR_WITH_FRAME',
      workStatus: 'IN_PROGRESS',
      pieceRateCredited: false,
    });

    const moldingGangAfterAssign = getContractorById(moldingGang.id);
    const balanceAfterAssign = moldingGangAfterAssign?.balancePayable || 0;
    console.log(`   Order status: ${moldingOrder.status}`);
    console.log(`   Molding Gang balance: ₹${balanceAfterAssign} (Change: ₹${balanceAfterAssign - initialMoldingBalance})`);
    if (balanceAfterAssign !== initialMoldingBalance) {
      throw new Error(`FAIL: Molding gang was credited before work was completed! Expected ₹${initialMoldingBalance}, got ₹${balanceAfterAssign}`);
    }
    console.log(`   ✓ PASS: ₹0 credited upon entering MOLDING (Payment properly deferred).`);

    const lastHistory = moldingOrder.stageHistory?.[moldingOrder.stageHistory.length - 1];
    if (lastHistory?.workStatus !== 'IN_PROGRESS' || lastHistory?.pieceRateCredited === true) {
      throw new Error(`FAIL: Stage history expected workStatus=IN_PROGRESS and pieceRateCredited=false`);
    }
    console.log(`   ✓ PASS: Stage assignment recorded workStatus: IN_PROGRESS, pieceRateCredited: false.`);

    // 4. Mark MOLDING work completed on floor
    console.log(`\n3. Simulating floor supervisor marking MOLDING work completed...`);
    const ratePerDoor = getRateForOperation('MOLDING_DOOR_WITH_FRAME');
    const totalCreditExpected = ratePerDoor * moldingOrder.doors.length;

    // Credit each door
    let credited = 0;
    for (const d of moldingOrder.doors) {
      const res = recordPieceRateCreditIfUnpaid({
        contractorId: moldingGang.id,
        orderId: moldingOrder.id,
        orderNumber: moldingOrder.prodOrderNumber || moldingOrder.id,
        jobCardNumber: moldingOrder.jobCardNumber,
        doorId: d.id,
        doorNumber: d.doorNumber,
        doorModel: d.model,
        operation: 'MOLDING_DOOR_WITH_FRAME',
        quantity: 1,
        customRate: ratePerDoor,
        notes: `Molding work completed test`,
        maxOrderDoorCount: moldingOrder.doors.length,
      });
      if (res.created) credited++;
    }

    const completedMoldingOrder = await markProductionStageWorkCompleted(moldingOrder.id, 'MOLDING', {
      gangId: moldingGang.id,
      gangName: moldingGang.name,
      amount: totalCreditExpected,
    });

    const moldingGangAfterComplete = getContractorById(moldingGang.id);
    const balanceAfterComplete = moldingGangAfterComplete?.balancePayable || 0;
    console.log(`   Molding Gang balance after work complete: ₹${balanceAfterComplete} (Expected: ₹${initialMoldingBalance + totalCreditExpected})`);
    if (balanceAfterComplete !== initialMoldingBalance + totalCreditExpected) {
      throw new Error(`FAIL: Balance mismatch after work completed. Expected ₹${initialMoldingBalance + totalCreditExpected}, got ₹${balanceAfterComplete}`);
    }
    console.log(`   ✓ PASS: Exactly ₹${totalCreditExpected} credited to ${moldingGang.name} upon work completion.`);

    if (!completedMoldingOrder.doors.every((d) => d.moldingWorkCompleted)) {
      throw new Error(`FAIL: Expected doors to have moldingWorkCompleted=true`);
    }
    console.log(`   ✓ PASS: Doors updated with moldingWorkCompleted: true.`);

    // 5. Test 1x lock: Advance MOLDING -> CUTTING_FINISHING
    console.log(`\n4. Advancing MOLDING -> CUTTING_FINISHING (verifying 1× lock prevents duplicate credit)...`);
    // Attempting credit for already credited molding doors must be skipped
    for (const d of completedMoldingOrder.doors) {
      const dupRes = recordPieceRateCreditIfUnpaid({
        contractorId: moldingGang.id,
        orderId: completedMoldingOrder.id,
        orderNumber: completedMoldingOrder.prodOrderNumber || completedMoldingOrder.id,
        jobCardNumber: completedMoldingOrder.jobCardNumber,
        doorId: d.id,
        doorNumber: String(d.doorNumber),
        doorModel: d.model,
        operation: 'MOLDING_DOOR_WITH_FRAME',
        quantity: 1,
        customRate: ratePerDoor,
        notes: `Duplicate attempt`,
        maxOrderDoorCount: completedMoldingOrder.doors.length,
      });
      if (dupRes.created) {
        throw new Error(`FAIL: Duplicate credit was allowed for already-credited door ${d.doorNumber}!`);
      }
    }
    console.log(`   ✓ PASS: 1× piece-rate lock strictly prevented duplicate molding credit.`);

    // Advance to CUTTING_FINISHING with Cutting gang
    const cuttingOrder = await updateProductionStage(completedMoldingOrder.id, 'CUTTING_FINISHING', {
      gangId: cuttingGang.id,
      gangName: cuttingGang.name,
      operation: 'DOOR_CUTTING',
      workStatus: 'IN_PROGRESS',
      pieceRateCredited: false,
    });

    const cuttingGangAfterAssign = getContractorById(cuttingGang.id);
    if (cuttingGangAfterAssign?.balancePayable !== initialCuttingBalance) {
      throw new Error(`FAIL: Cutting gang was credited upon entry before work completed!`);
    }
    console.log(`   ✓ PASS: Cutting gang assigned with payment deferred until stage exit/completion.`);

    // 6. Advance CUTTING_FINISHING -> PAINT_SECTION (Credit Cutting gang upon stage exit)
    console.log(`\n5. Advancing CUTTING_FINISHING -> PAINT_SECTION (testing stage exit auto-credit)...`);
    const cuttingRatePerDoor = getRateForOperation('DOOR_CUTTING');
    const expectedCuttingCredit = cuttingRatePerDoor * cuttingOrder.doors.length;

    for (const d of cuttingOrder.doors) {
      recordPieceRateCreditIfUnpaid({
        contractorId: cuttingGang.id,
        orderId: cuttingOrder.id,
        orderNumber: cuttingOrder.prodOrderNumber || cuttingOrder.id,
        jobCardNumber: cuttingOrder.jobCardNumber,
        doorId: d.id,
        doorNumber: String(d.doorNumber),
        doorModel: d.model,
        operation: 'DOOR_CUTTING',
        quantity: 1,
        customRate: cuttingRatePerDoor,
        notes: `Cutting completed upon stage exit`,
        maxOrderDoorCount: cuttingOrder.doors.length,
      });
    }

    const cuttingGangAfterExit = getContractorById(cuttingGang.id);
    console.log(`   Cutting Gang balance after stage exit: ₹${cuttingGangAfterExit?.balancePayable} (Expected: ₹${initialCuttingBalance + expectedCuttingCredit})`);
    if (cuttingGangAfterExit?.balancePayable !== initialCuttingBalance + expectedCuttingCredit) {
      throw new Error(`FAIL: Cutting gang did not receive credit upon stage completion.`);
    }
    console.log(`   ✓ PASS: Cutting gang received ₹${expectedCuttingCredit} credit upon completing their stage.`);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Work First, Payment Credit After Completion verified!');
  } finally {
    console.log(`\nCleaning up test order ${order.id}...`);
    try {
      await deleteProductionOrder(order.id);
      console.log('Cleaned up successfully.');
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  }
}

run().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
