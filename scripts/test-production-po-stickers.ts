import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert';

// Isolate ALL tests inside a temporary factory data directory (NEVER touch C:\EXMARK-ERP-DATA!)
const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-overhaul-test-'));
process.env.EXMARK_DATA_DIR = tempDataDir;

async function run() {
  console.log(`=== EXMARK OVERHAUL TEST SUITE (Isolated dir: ${tempDataDir}) ===`);

  const {
    createProductionOrder,
    getProductionOrder,
    updateProductionStage,
    getNextProductionStage,
    getPrevProductionStage,
    markProductionBoqIssued,
    toggleProductionInstallation,
    ACTIVE_BOARD_STAGES,
  } = await import('../lib/services/productionService');

  const {
    createContractor,
    getContractors,
    recordPieceRateCredit,
    deleteContractor,
  } = await import('../lib/services/contractorService');

  const {
    addBoqExtraItem,
    listBoqExtraItems,
    updateBoqExtraItem,
  } = await import('../lib/services/boqExtraItemsService');

  const { generate12LStickerPdf, generateThermal4x2Pdf } = await import('../lib/utils/pdfStickerEngine');

  // Ensure auth/settings do not block test writes in isolated vault
  fs.writeFileSync(
    path.join(tempDataDir, 'settings-store.json'),
    JSON.stringify({ readOnlyMode: false, companyName: 'EXMARK TEST' }),
    'utf8'
  );

  // ── 1. Production Kanban Columns & Conditional Installation Path ────────────
  assert.strictEqual(ACTIVE_BOARD_STAGES.length, 7, 'Active Production Board must have 7 merged stages');
  assert.ok(ACTIVE_BOARD_STAGES.includes('CUTTING_FINISHING'), 'Missing Cutting & Finishing column');
  assert.ok(!ACTIVE_BOARD_STAGES.includes('FINISHING_GRAINS' as any), 'Merged FINISHING_GRAINS should not be a separate column');
  assert.ok(ACTIVE_BOARD_STAGES.includes('PAINT_SECTION'), 'Missing Grains & Painting column');
  assert.ok(!ACTIVE_BOARD_STAGES.includes('QA_INSPECTION' as any), 'Retired QA_INSPECTION should not be on active board');

  const doorSpec = [
    {
      doorId: 'EXM-TST-01',
      doorNumber: 'Door #1',
      model: 'EXM-A-118',
      rawHeightMm: 2100,
      rawWidthMm: 800,
      rawHeightCm: 210,
      rawWidthTopCm: 80,
      rawWidthBtmCm: 80,
      handing: 'RH' as const,
      lockType: 'Baby Latch Black',
      finishColor: 'Natural Teak',
    },
  ];

  // 1a. Delivery-Only Order (includeInstallation = false) -> DELIVERY advances straight to COMPLETED
  const ordNoInstall = await createProductionOrder({
    customerName: 'Delivery Only Client',
    siteName: 'Kakkanad',
    district: 'Ernakulam',
    includeInstallation: false,
    orderDate: '2026-11-10',
    doors: doorSpec,
  });
  assert.strictEqual(ordNoInstall.includeInstallation, false);
  await updateProductionStage(ordNoInstall.id, 'DELIVERY');
  const fetchedNoInstall = await getProductionOrder(ordNoInstall.id);
  assert.strictEqual(getNextProductionStage(fetchedNoInstall!), 'COMPLETED');
  const completedNoInstall = await updateProductionStage(ordNoInstall.id, 'COMPLETED');
  assert.ok(completedNoInstall.completedAt, 'Expected completedAt when finishing DELIVERY-only order');
  assert.strictEqual(getPrevProductionStage(completedNoInstall), 'DELIVERY');

  // 1b. Order WITH Installation (includeInstallation = true) -> DELIVERY advances to INSTALLATION -> COMPLETED
  const ordWithInstall = await createProductionOrder({
    customerName: 'Install Included Client',
    siteName: 'Calicut Beach',
    district: 'Kozhikode',
    includeInstallation: true,
    orderDate: '2026-11-11',
    doors: doorSpec,
  });
  await updateProductionStage(ordWithInstall.id, 'DELIVERY');
  const fetchedInstall = await getProductionOrder(ordWithInstall.id);
  assert.strictEqual(getNextProductionStage(fetchedInstall!), 'INSTALLATION');
  await updateProductionStage(ordWithInstall.id, 'INSTALLATION');
  const atInstall = await getProductionOrder(ordWithInstall.id);
  assert.strictEqual(getNextProductionStage(atInstall!), 'COMPLETED');
  await toggleProductionInstallation(ordNoInstall.id, true);
  assert.strictEqual((await getProductionOrder(ordNoInstall.id))?.includeInstallation, true);
  console.log('✓ Test 1 passed: Kanban columns + Conditional Installation branching.');

  // ── 2. In-House Floor Gangs & Stage History + Piece Rate Credit ──────────
  const newGang = createContractor({
    name: 'Shaji Floor Gang',
    phone: '+91 98470 55555',
    trade: 'MOLDING',
    isInHouseGang: true,
    gangLeader: 'Shaji',
    primaryStage: 'MOLDING',
    memberNames: ['Shaji', 'Unni', 'Binu'],
  });
  assert.ok(newGang.id.startsWith('GNG-'), `Expected GNG-* prefix, got ${newGang.id}`);
  assert.strictEqual(newGang.isInHouseGang, true);
  assert.deepStrictEqual(newGang.memberNames, ['Shaji', 'Unni', 'Binu']);

  const credit = recordPieceRateCredit({
    contractorId: newGang.id,
    orderId: ordWithInstall.id,
    orderNumber: ordWithInstall.prodOrderNumber,
    jobCardNumber: ordWithInstall.jobCardNumber,
    doorId: 'EXM-TST-01',
    doorNumber: 'Door #1',
    doorModel: 'EXM-A-118',
    operation: 'MOLDING_DOOR_WITH_FRAME',
    quantity: 1,
  });
  assert.strictEqual(credit.totalAmount, 500);
  const movedWithMeta = await updateProductionStage(ordWithInstall.id, 'PAINT_SECTION', {
    gangId: newGang.id,
    gangName: newGang.name,
    operation: 'DOOR_GRAINS_WITH_PAINT',
    amount: 300,
  });
  assert.ok(
    movedWithMeta.stageHistory?.some((h) => h.stage === 'PAINT_SECTION' && h.gangName === 'Shaji Floor Gang'),
    'stageHistory must record floor gang assignment'
  );
  assert.ok(getContractors().some((c) => c.id === newGang.id));
  assert.strictEqual(deleteContractor(newGang.id), true);
  console.log('✓ Test 2 passed: In-House Floor Gangs CRUD + Piece-Rate Ledger + stageHistory.');

  // ── 3. BOQ Mark Issued & Standalone Floor/Evening Consumables ─────────────
  const boqEligibleOrd = await createProductionOrder({
    customerName: 'BOQ Eligible Client',
    siteName: 'Edappal Site',
    district: 'Malappuram',
    includeInstallation: false,
    orderDate: '2026-11-11',
    doors: doorSpec,
  });
  assert.strictEqual((await getProductionOrder(boqEligibleOrd.id))?.boqIssuedAt, null);
  const issuedOrd = await markProductionBoqIssued(boqEligibleOrd.id);
  assert.ok(issuedOrd.boqIssuedAt, 'boqIssuedAt should be stamped after marking BOQ issued');

  const eveningConsumable = await addBoqExtraItem({
    orderKey: 'FLOOR-CONSUMABLES',
    itemName: 'PU Thinner',
    category: 'Chemical',
    specNote: 'Evening spray cleanup & thinning',
    quantity: 5,
    unit: 'Liters',
    unitRate: 170,
    issueShift: 'EVENING',
    issueDate: '2026-11-11',
    gangName: 'Painting Gang',
    isFloorConsumable: true,
  });
  assert.strictEqual(eveningConsumable.issueShift, 'EVENING');
  assert.strictEqual(eveningConsumable.isFloorConsumable, true);
  const fcList = await listBoqExtraItems(['FLOOR-CONSUMABLES']);
  assert.strictEqual(fcList.length, 1);
  const linked = await updateBoqExtraItem(eveningConsumable.id, { poNumber: 'PO-2026-101' });
  assert.strictEqual(linked?.poNumber, 'PO-2026-101');
  console.log('✓ Test 3 passed: BOQ Issued tracking + Standalone Evening Consumables + PO linkage.');

  // ── 4. Vector PDF Tests: 12L Top-Left Alignment (2 & 4 stickers) + 4x2 Thermal ─
  const makeSticker = (n: number, remark?: string) => ({
    id: `stk-${n}`,
    orderNumber: 'JC-2026-001',
    jobCardNumber: 'JC-2026-001',
    customerName: 'NAZER CLIENT',
    siteName: 'Malappuram',
    doorNumber: n,
    totalDoorsInOrder: 2,
    shutterSize: '205.5 x 72.4 cm',
    tape: '82 5/8" x 31 1/2"',
    profile: 'EXM-A-118',
    finish: 'Natural Teak',
    hand: 'RH',
    hingeSide: 'R',
    lock: 'Baby Latch Black',
    remark: remark || '',
    barcode: `*JC-2026-001-D0${n}*`,
  });

  // 2-sticker 12L A4 sheet must draw strictly near top edge (bottom-up PDF yPt >= 690pt out of 841.89pt)
  const pdf12LTwo = await generate12LStickerPdf([makeSticker(1), makeSticker(2)], {
    layout: '2x6',
    topMarginMm: 4,
    leftMarginMm: 4,
  });
  const pdf12LTwoBytes = Buffer.from(await (pdf12LTwo.output('arraybuffer') as ArrayBuffer)).toString('latin1');
  assert.ok(pdf12LTwoBytes.includes('/MediaBox [0 0 595.28 841.89]'), 'Expected A4 Portrait MediaBox');
  const rectMatches2 = [...pdf12LTwoBytes.matchAll(/([\d.]+)\s+([\d.]+)\s+[\d.]+\s+[\d.]+\s+re\s/g)];
  assert.ok(rectMatches2.length >= 2, 'Expected rectangles in 2-sticker 12L PDF');
  const minY2 = Math.min(...rectMatches2.map((m) => parseFloat(m[2])));
  assert.ok(
    minY2 >= 675,
    `Expected 2-sticker 12L boxes to anchor strictly at TOP row (PDF yPt >= 675pt), got min yPt=${minY2}`
  );

  // 4-sticker 12L A4 sheet stays in Top 2 rows (yPt >= 530pt)
  const pdf12LFour = await generate12LStickerPdf(
    [makeSticker(1), makeSticker(2), makeSticker(3), makeSticker(4)],
    { layout: '2x6', topMarginMm: 4, leftMarginMm: 4 }
  );
  const pdf12LFourBytes = Buffer.from(await (pdf12LFour.output('arraybuffer') as ArrayBuffer)).toString('latin1');
  const rectMatches4 = [...pdf12LFourBytes.matchAll(/([\d.]+)\s+([\d.]+)\s+[\d.]+\s+[\d.]+\s+re\s/g)];
  const minY4 = Math.min(...rectMatches4.map((m) => parseFloat(m[2])));
  assert.ok(
    minY4 >= 525,
    `Expected 4-sticker 12L boxes to anchor in top 2 rows (PDF yPt >= 525pt), got min yPt=${minY4}`
  );

  // 4" x 2" Thermal Roll PDF -> exact MediaBox [0 0 288 144] & 2 pages + conditional remark check
  const pdfThermal = await generateThermal4x2Pdf([makeSticker(1, ''), makeSticker(2, 'BATHROOM WATERPROOF')]);
  const pdfThermalBytes = Buffer.from(await (pdfThermal.output('arraybuffer') as ArrayBuffer)).toString('latin1');
  assert.ok(pdfThermalBytes.includes('/MediaBox [0 0 288 144]'), 'Expected exact 4"x2" (288x144pt) MediaBox');
  assert.ok(pdfThermalBytes.includes('/Count 2'), 'Expected 2 thermal label pages');
  const remarkOccurrences = (pdfThermalBytes.match(/REMARK:/g) || []).length;
  assert.strictEqual(remarkOccurrences, 1, 'Expected REMARK: only on non-empty sticker');
  console.log(
    `✓ Test 4 passed: 12L PDF Top-Left anchored (2-stk minY=${minY2.toFixed(1)}pt, 4-stk minY=${minY4.toFixed(1)}pt) + Thermal 4"x2" (288x144pt) PDF.`
  );

  // ── 5. Purchase Order Create -> Receive & Sync Inventory + Extra BOQ Link ─
  fs.writeFileSync(
    path.join(tempDataDir, 'inventory-store.json'),
    JSON.stringify([
      {
        id: 'inv-test-thinner',
        itemCode: 'RAW-901',
        name: 'PU Thinner',
        category: 'Chemical',
        currentStock: 4,
        unit: 'Liters',
        reorderLevel: 10,
        unitCost: 165,
        warehouseLocation: 'Chemical Rack A',
        status: 'Low Stock',
      },
    ]),
    'utf8'
  );
  const { POST: purchasesPost } = await import('../app/api/purchases/route');
  const { ensureUsersStore } = await import('../lib/auth/userStore');
  const { createSignedSessionToken, DEMO_USERS } = await import('../lib/auth/session');
  const { NextRequest } = await import('next/server');
  await ensureUsersStore();
  const sa = DEMO_USERS['director@exmarkdoors.com'];
  const saToken = await createSignedSessionToken({
    id: sa.id,
    name: sa.name,
    email: sa.email,
    role: sa.role,
    plantLocation: sa.plantLocation,
  });
  const createPoReq = new NextRequest('http://localhost:4000/api/purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${saToken}`,
    },
    body: JSON.stringify({
      supplierName: 'Malabar Chemicals',
      sourceType: 'FLOOR_CONSUMABLES',
      items: [
        {
          inventoryId: 'inv-test-thinner',
          extraItemId: eveningConsumable.id,
          itemName: 'PU Thinner',
          category: 'Chemical',
          quantity: 12,
          unit: 'Liters',
          unitPrice: 170,
        },
      ],
    }),
  });
  const createPoRes = await purchasesPost(createPoReq);
  const createPoJson = await createPoRes.json();
  assert.strictEqual(createPoJson.success, true, `PO create failed: ${createPoJson.error}`);
  assert.strictEqual(createPoJson.data.gstAmount, 0, 'Expected Non-GST 0 tax');
  assert.strictEqual(createPoJson.data.totalAmount, 2040);

  const receiveReq = new NextRequest('http://localhost:4000/api/purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${saToken}`,
    },
    body: JSON.stringify({ action: 'RECEIVE_AND_SYNC_STOCK', id: createPoJson.data.id }),
  });
  const receiveRes = await purchasesPost(receiveReq);
  const receiveJson = await receiveRes.json();
  assert.strictEqual(receiveJson.success, true);
  assert.strictEqual(receiveJson.data.status, 'RECEIVED');
  assert.strictEqual(receiveJson.syncedInventoryItems, 1);

  const invAfter = JSON.parse(fs.readFileSync(path.join(tempDataDir, 'inventory-store.json'), 'utf8'));
  assert.strictEqual(invAfter[0].currentStock, 16, 'Inventory should increment from 4 + 12 = 16');
  assert.strictEqual(invAfter[0].status, 'In Stock');
  console.log('✓ Test 5 passed: Purchase Order Non-GST Creation -> Receive -> Auto-Inventory Sync.');

  // Clean up temp dir cleanly
  fs.rmSync(tempDataDir, { recursive: true, force: true });
  console.log('=== ALL OVERHAUL TESTS PASSED (100%) ===');
}

run().catch((err) => {
  console.error('OVERHAUL TEST FAILED:', err);
  try {
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  } catch {}
  process.exit(1);
});
