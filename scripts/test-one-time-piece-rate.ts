import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runOneTimePieceRateTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-one-time-piece-rate-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log(`\nRunning Strict One-Time Piece-Rate & Rework Lock Tests (Isolated: ${tempDir})\n`);

    const [
      { ensureUsersStore },
      { createSignedSessionToken, DEMO_USERS },
      { createProductionOrder },
      { createContractor, getContractorById },
      { computeOrderProfitSummaries },
      { PUT: putStageRoute },
      { GET: getLockRoute, POST: postCreditRoute },
    ] = await Promise.all([
      import('../lib/auth/userStore'),
      import('../lib/auth/session'),
      import('../lib/services/productionService'),
      import('../lib/services/contractorService'),
      import('../lib/services/orderProfitService'),
      import('../app/api/production/[id]/route'),
      import('../app/api/contractors/credit/route'),
    ]);

    await ensureUsersStore();
    const superAdmin = DEMO_USERS['director@exmarkdoors.com'];
    const adminToken = await createSignedSessionToken({
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
      plantLocation: superAdmin.plantLocation,
    });
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const moldGang = createContractor({
      name: 'Ashik Molding Gang',
      phone: '9847000101',
      trade: 'MOLDING',
      isInHouseGang: true,
    });
    const cutGang = createContractor({
      name: 'Dinan Door Cutting Team',
      phone: '9847000102',
      trade: 'CUTTING_GRINDING',
      isInHouseGang: true,
      primaryStage: 'CUTTING_FINISHING',
      teamScope: 'DOOR_CUTTING_FINISHING',
    });
    const frameCutGang = createContractor({
      name: 'Nafie Frame Cutting Team',
      phone: '9847000104',
      trade: 'CUTTING_GRINDING',
      isInHouseGang: true,
      primaryStage: 'CUTTING_FINISHING',
      teamScope: 'FRAME_CUTTING_FINISHING',
    });
    const paintGang = createContractor({
      name: 'Zakariya Grains & Paint Gang',
      phone: '9847000103',
      trade: 'PAINTING',
      isInHouseGang: true,
      primaryStage: 'PAINT_SECTION',
      teamScope: 'GRAINS_PAINTING',
    });

    const order1 = await createProductionOrder({
      customerName: 'Calicut Builders',
      siteName: 'Emerald Tower',
      district: 'Kozhikode',
      doors: [
        {
          doorNumber: 'D1',
          model: '32mm Teak FRP',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishColor: 'Natural Teak Matte',
          lockType: 'Baby Latch Black',
        },
        {
          doorNumber: 'D2',
          model: '32mm Teak FRP',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishColor: 'Natural Teak Matte',
          lockType: 'Baby Latch Black',
        },
      ],
    });

    const callStagePut = async (orderId: string, body: Record<string, unknown>) => {
      const req = new NextRequest(`http://localhost:4000/api/production/${orderId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const res = await putStageRoute(req, { params: Promise.resolve({ id: orderId }) });
      const json = await res.json();
      return { status: res.status, json };
    };

    // 1. First entry into MOLDING credits 1x (2 doors * ₹500 = ₹1,000)
    const move1 = await callStagePut(order1.id, {
      stage: 'MOLDING',
      gangId: moldGang.id,
      operation: 'MOLDING_DOOR_WITH_FRAME',
      customRate: 500,
    });
    assert(move1.status === 200 && move1.json.pieceRateSkipped === false, 'First pass into MOLDING credited cleanly');
    assert(getContractorById(moldGang.id)?.totalEarned === 1000, 'Molding gang earned ₹1,000 (2 × ₹500)');

    // 2. Inspect Lock Endpoint
    const lockRes = await getLockRoute(
      new NextRequest(
        `http://localhost:4000/api/contractors/credit?orderId=${order1.id}&jobCardNumber=${order1.jobCardNumber}&totalDoors=2`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )
    );
    const lockJson = await lockRes.json();
    assert(lockJson.data.groups.MOLDING.isLocked === true, 'Lock endpoint shows MOLDING locked after 1x payout');
    assert(lockJson.data.groups.DOOR_CUTTING.isLocked === false, 'DOOR_CUTTING remains unlocked before first pass');
    assert(lockJson.data.groups.FRAME_CUTTING.isLocked === false, 'FRAME_CUTTING remains unlocked before first pass');
    assert(lockJson.data.groups.GRAINS_PAINTING.isLocked === false, 'GRAINS_PAINTING remains unlocked before first pass');

    // 3. Rewind Back to QUEUED for Rework
    const rewind = await callStagePut(order1.id, {
      stage: 'QUEUED',
      skipAutoCredit: true,
      isRework: true,
      reworkReason: 'Corner resin touch-up rework',
    });
    assert(rewind.status === 200 && rewind.json.data.stageHistory.at(-1).isRework === true, 'Rework rollback logged with isRework=true');
    assert(getContractorById(moldGang.id)?.totalEarned === 1000, 'Rework rollback adds ₹0');

    // 4. Advance Forward Into MOLDING Again WITHOUT skipAutoCredit -> Server MUST pay ₹0!
    const reworkAdvance = await callStagePut(order1.id, {
      stage: 'MOLDING',
      gangId: moldGang.id,
      operation: 'MOLDING_DOOR_WITH_FRAME',
      customRate: 500,
    });
    assert(reworkAdvance.status === 200 && reworkAdvance.json.pieceRateSkipped === true, 'Rework re-entry into MOLDING skipped duplicate charge');
    assert(getContractorById(moldGang.id)?.totalEarned === 1000, 'Molding gang totalEarned remains strictly ₹1,000 after rework');
    assert(
      reworkAdvance.json.data.stageHistory.at(-1).amount === 0 &&
        reworkAdvance.json.data.stageHistory.at(-1).isRework === true,
      'Rework stage history entry logs amount=0'
    );

    // 5. Try sneaking manual duplicate credit via POST /api/contractors/credit (same op OR alternate Molding op) -> HTTP 409!
    const dupBatchReq = new NextRequest('http://localhost:4000/api/contractors/credit', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        contractorId: moldGang.id,
        orderId: order1.id,
        jobCardNumber: order1.jobCardNumber,
        doorId: `BATCH-${order1.jobCardNumber}`,
        operation: 'MOLDING_ONLY_DOOR',
        quantity: 2,
      }),
    });
    const dupBatchRes = await postCreditRoute(dupBatchReq);
    const dupBatchJson = await dupBatchRes.json();
    assert(dupBatchRes.status === 409 && dupBatchJson.code === 'PIECE_RATE_LOCKED', 'Manual duplicate/alternate Molding batch credit blocked with HTTP 409 Conflict');
    assert(getContractorById(moldGang.id)?.totalEarned === 1000, 'Balance still untouched at ₹1,000 after 409 reject');

    // 6. Dual-Party Cutting & Finishing (Door Team + Frame Team independent 1x) + Unified Grains & Painting (1x lock)
    const cutDualRes = await callStagePut(order1.id, {
      stage: 'CUTTING_FINISHING',
      assignments: [
        { gangId: cutGang.id, operation: 'DOOR_CUTTING', customRate: 100 },
        { gangId: frameCutGang.id, operation: 'FRAME_CUTTING', customRate: 100 },
      ],
    });
    assert(
      cutDualRes.status === 200 &&
        getContractorById(cutGang.id)?.totalEarned === 200 &&
        getContractorById(frameCutGang.id)?.totalEarned === 200,
      'Dual-party Cutting & Finishing credits BOTH Door Team (₹200) and Frame Team (₹200) independently on same Job Card'
    );

    // Repeating FRAME_CUTTING is blocked independently without blocking initial DOOR_CUTTING
    const repeatFrameCut = await postCreditRoute(
      new NextRequest('http://localhost:4000/api/contractors/credit', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          contractorId: frameCutGang.id,
          orderId: order1.id,
          jobCardNumber: order1.jobCardNumber,
          doorId: `BATCH-${order1.jobCardNumber}`,
          operation: 'FRAME_CUTTING',
          quantity: 2,
        }),
      })
    );
    assert(repeatFrameCut.status === 409, 'Repeat FRAME_CUTTING credit blocked with HTTP 409 Conflict');

    // Unified Grains & Painting (PAINT_SECTION): 1x credit, and repeat / legacy FINISHING_GRAINS normalize to PAINT_SECTION at ₹0
    const paintRes = await callStagePut(order1.id, {
      stage: 'FINISHING_GRAINS', // legacy alias should normalize cleanly to PAINT_SECTION!
      gangId: paintGang.id,
      operation: 'DOOR_GRAINS_WITH_PAINT',
      customRate: 300,
    });
    assert(
      paintRes.json.pieceRateSkipped === false &&
        paintRes.json.data.status === 'PAINT_SECTION' &&
        getContractorById(paintGang.id)?.totalEarned === 600,
      'Unified Grains & Painting normalizes legacy FINISHING_GRAINS -> PAINT_SECTION and credits 1x (₹600)'
    );

    // Rework or second pass with alternate painting op (TWO_SIDE_PAINT / ONLY_CLEAR_COAT) -> strictly ₹0 under unified GRAINS_PAINTING lock
    await callStagePut(order1.id, { stage: 'CUTTING_FINISHING', skipAutoCredit: true, isRework: true });
    const paintRepeat = await callStagePut(order1.id, {
      stage: 'PAINT_SECTION',
      gangId: paintGang.id,
      operation: 'TWO_SIDE_PAINT',
      customRate: 500,
    });
    assert(
      paintRepeat.json.pieceRateSkipped === true && getContractorById(paintGang.id)?.totalEarned === 600,
      'Unified GRAINS_PAINTING lock blocks alternate TWO_SIDE_PAINT rework credit at ₹0'
    );

    // 7. Create a NEW Supplementary Job Card for Extra Authorized Work -> Allows fresh 1x pay!
    const suppOrder = await createProductionOrder({
      customerName: order1.customerName,
      siteName: order1.siteName,
      district: order1.district,
      parentJobCardNumber: order1.jobCardNumber,
      isSupplementaryJobWork: true,
      doors: order1.doors.map((d) => ({
        doorNumber: d.doorNumber,
        model: d.model,
        rawHeightMm: d.rawHeightMm,
        rawWidthMm: d.rawWidthMm,
        finishColor: d.finishColor,
        lockType: d.lockType,
      })),
    });
    assert(suppOrder.parentJobCardNumber === order1.jobCardNumber && suppOrder.isSupplementaryJobWork === true, `Created supplementary Job Card ${suppOrder.jobCardNumber} linked to ${order1.jobCardNumber}`);

    const suppMove = await callStagePut(suppOrder.id, {
      stage: 'MOLDING',
      gangId: moldGang.id,
      operation: 'MOLDING_DOOR_WITH_FRAME',
      customRate: 500,
    });
    assert(suppMove.json.pieceRateSkipped === false && getContractorById(moldGang.id)?.totalEarned === 2000, 'New Supplementary Job Card allows fresh 1x piece-rate credit (+₹1,000 -> ₹2,000)');

    // 8. Verify Order-Wise Profit on original order1 matches exact 1x labor (1000 Molding + 200 Door Cutting + 200 Frame Cutting + 600 Grains&Paint = ₹2,000)
    const pnl = await computeOrderProfitSummaries({ orderId: order1.id });
    assert(pnl.orders[0].actualPieceRateCost === 2000, `Order1 Order-Wise Profit labor = ₹2,000 exact with zero rework duplication (got ${pnl.orders[0].actualPieceRateCost})`);

    console.log('\n✅ ALL STRICT ONE-TIME PIECE-RATE & REWORK LOCK TESTS PASSED!\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runOneTimePieceRateTests().catch((err) => {
  console.error('\n❌ ONE-TIME PIECE-RATE TEST FAILED:', err);
  process.exit(1);
});
