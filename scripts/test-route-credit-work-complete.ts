import { NextRequest } from 'next/server';
import { PUT } from '../app/api/production/[id]/route';
import { createProductionOrder, deleteProductionOrder, getProductionOrder } from '../lib/services/productionService';
import { getContractors, getContractorById } from '../lib/services/contractorService';

process.env.ALLOW_DEV_HEADERS = 'true';

async function runRouteTest() {
  console.log('🧪 Testing app/api/production/[id]/route.ts PUT handler for Work Complete Crediting...\n');

  const contractors = getContractors();
  const moldingGang = contractors.find((c) => c.trade === 'MOLDING') || contractors[0];
  const cuttingGang = contractors.find((c) => c.trade === 'CUTTING_GRINDING' || c.teamScope?.includes('CUTTING')) || contractors[1];

  const initialMoldingBalance = moldingGang.balancePayable || 0;
  const initialCuttingBalance = cuttingGang.balancePayable || 0;

  // 1. Create Order
  const jc = `JC-ROUTE-TEST-${Date.now().toString().slice(-5)}`;
  const prd = `PRD-RT-${Date.now().toString().slice(-5)}`;
  const order = await createProductionOrder({
    prodOrderNumber: prd,
    jobCardNumber: jc,
    customerName: 'Route Test Customer',
    siteName: 'Route Site',
    district: 'Calicut',
    phone: '9876543210',
    quantity: 2,
    doors: [
      { id: 'd-rt-1', doorNumber: '1', model: 'M-1', finishedWidthMm: 800, finishedHeightMm: 2000, finishColor: 'Teak', materialIssued: true },
      { id: 'd-rt-2', doorNumber: '2', model: 'M-2', finishedWidthMm: 850, finishedHeightMm: 2050, finishColor: 'Rosewood', materialIssued: true },
    ] as any,
  });

  try {
    // 2. Move QUEUED -> MOLDING via PUT route (creditNow = false by default)
    console.log('1. Moving QUEUED -> MOLDING via PUT route...');
    const req1 = new NextRequest(`http://localhost:4000/api/production/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'Super Admin' },
      body: JSON.stringify({
        stage: 'MOLDING',
        gangId: moldingGang.id,
        operation: 'MOLDING_DOOR_WITH_FRAME',
        creditNow: false,
      }),
    });
    const res1 = await PUT(req1, { params: Promise.resolve({ id: order.id }) });
    const json1 = await res1.json();
    console.log(`   Response success: ${json1.success}`);
    console.log(`   Message: ${json1.pieceRateMessage || json1.message}`);

    const moldingGangAfter1 = getContractorById(moldingGang.id);
    if (moldingGangAfter1?.balancePayable !== initialMoldingBalance) {
      throw new Error(`FAIL: Molding gang credited upon entry!`);
    }
    console.log(`   ✓ PASS: Balance unchanged (₹${moldingGangAfter1?.balancePayable}) - credit deferred.`);

    // 3. Mark work complete in MOLDING via COMPLETE_STAGE_WORK action
    console.log('\n2. Calling COMPLETE_STAGE_WORK for MOLDING...');
    const req2 = new NextRequest(`http://localhost:4000/api/production/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'Super Admin' },
      body: JSON.stringify({
        action: 'COMPLETE_STAGE_WORK',
        stage: 'MOLDING',
        gangId: moldingGang.id,
        operation: 'MOLDING_DOOR_WITH_FRAME',
      }),
    });
    const res2 = await PUT(req2, { params: Promise.resolve({ id: order.id }) });
    const json2 = await res2.json();
    console.log(`   Credited count: ${json2.creditedCount}, Total Amount: ₹${json2.totalAmount}`);
    console.log(`   Message: ${json2.message}`);

    const moldingGangAfter2 = getContractorById(moldingGang.id);
    const expectedMoldingBal = initialMoldingBalance + (json2.totalAmount || 0);
    if (moldingGangAfter2?.balancePayable !== expectedMoldingBal) {
      throw new Error(`FAIL: Balance did not update after COMPLETE_STAGE_WORK! Expected ₹${expectedMoldingBal}, got ₹${moldingGangAfter2?.balancePayable}`);
    }
    console.log(`   ✓ PASS: Molding gang credited ₹${json2.totalAmount} upon completing work!`);

    // 4. Move MOLDING -> CUTTING_FINISHING via PUT route
    console.log('\n3. Moving MOLDING -> CUTTING_FINISHING via PUT route...');
    const req3 = new NextRequest(`http://localhost:4000/api/production/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'Super Admin' },
      body: JSON.stringify({
        stage: 'CUTTING_FINISHING',
        gangId: cuttingGang.id,
        operation: 'DOOR_CUTTING',
        creditNow: false,
        previousStageCredit: {
          gangId: moldingGang.id,
          operation: 'MOLDING_DOOR_WITH_FRAME',
        },
      }),
    });
    const res3 = await PUT(req3, { params: Promise.resolve({ id: order.id }) });
    const json3 = await res3.json();
    console.log(`   Move response success: ${json3.success}`);
    console.log(`   Message: ${json3.pieceRateMessage || json3.message}`);

    const moldingGangAfter3 = getContractorById(moldingGang.id);
    if (moldingGangAfter3?.balancePayable !== expectedMoldingBal) {
      throw new Error(`FAIL: Molding gang was credited AGAIN on advance! 1x lock failed!`);
    }
    console.log(`   ✓ PASS: 1× lock held! Molding gang not double credited on stage move.`);

    const cuttingGangAfter3 = getContractorById(cuttingGang.id);
    if (cuttingGangAfter3?.balancePayable !== initialCuttingBalance) {
      throw new Error(`FAIL: Cutting gang credited before completing cutting work!`);
    }
    console.log(`   ✓ PASS: Cutting gang payment deferred upon entering CUTTING_FINISHING.`);

    // 5. Move CUTTING_FINISHING -> PAINT_SECTION (automatic stage-exit credit for cutting gang)
    console.log('\n4. Moving CUTTING_FINISHING -> PAINT_SECTION via PUT route...');
    const req4 = new NextRequest(`http://localhost:4000/api/production/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'Super Admin' },
      body: JSON.stringify({
        stage: 'PAINT_SECTION',
        creditNow: false,
        previousStageCredit: {
          gangId: cuttingGang.id,
          operation: 'DOOR_CUTTING',
        },
      }),
    });
    const res4 = await PUT(req4, { params: Promise.resolve({ id: order.id }) });
    const json4 = await res4.json();
    console.log(`   Move response success: ${json4.success}`);
    console.log(`   Message: ${json4.pieceRateMessage || json4.message}`);

    const cuttingGangAfter4 = getContractorById(cuttingGang.id);
    if ((cuttingGangAfter4?.balancePayable || 0) <= initialCuttingBalance) {
      throw new Error(`FAIL: Cutting gang did not get credited upon stage exit!`);
    }
    console.log(`   ✓ PASS: Cutting gang credited upon stage exit! New balance: ₹${cuttingGangAfter4?.balancePayable}`);

    console.log('\n🎉 ALL ROUTE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    console.log(`\nCleaning up order ${order.id}...`);
    await deleteProductionOrder(order.id);
    console.log('Cleanup complete.');
  }
}

runRouteTest().catch((e) => {
  console.error('\n❌ Route test failed:', e);
  process.exit(1);
});
