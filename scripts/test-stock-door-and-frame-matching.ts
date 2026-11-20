import {
  createReadyStockDoor,
  listReadyStockDoors,
  matchStockDoors,
  allocateStockDoor,
  releaseStockDoor,
  deleteReadyStockDoor,
} from '../lib/services/readyStockDoorService';

async function testStockMatchingSystem() {
  console.log('--- STARTING READY STOCK MATCHING & REPAINTING TEST ---');

  // 1. Create Test Stock Items
  console.log('\n[Step 1] Creating multi-mode test stock items...');

  // Item A: Complete Door + Frame Set (Frost White)
  const itemA = await createReadyStockDoor({
    itemType: 'DOOR_AND_FRAME',
    stockCode: 'TEST-SET-001',
    doorModelName: '32mm Molded Teak FRP Door',
    doorCategory: 'FRP_DOORS',
    doorHeightMm: 2085,
    doorWidthMm: 815,
    doorThicknessMm: 32,
    doorFinishColor: 'Frost White',
    isDoorRepaintable: true,
    frameTypeName: 'WPC Solid Extruded 100×65mm',
    frameHeightMm: 2100,
    frameWidthMm: 900,
    frameFinishColor: 'Frost White',
    isFrameRepaintable: true,
    quantity: 1,
    rackLocation: 'Godown Bay 2 / Rack A',
    condition: 'OLD_STOCK',
    sellingPrice: 7800,
    notes: 'Complete set, can be repainted to any color',
  });
  console.log(`Created Full Set: ${itemA.stockCode} (${itemA.doorHeightMm}×${itemA.doorWidthMm}mm Door, ${itemA.frameHeightMm}×${itemA.frameWidthMm}mm Frame)`);

  // Item B: Door Only (Burma Teak)
  const itemB = await createReadyStockDoor({
    itemType: 'DOOR_ONLY',
    stockCode: 'TEST-DOOR-002',
    doorModelName: '30mm Waterproof Bathroom Flush',
    doorCategory: 'FRP_DOORS',
    doorHeightMm: 2050,
    doorWidthMm: 750,
    doorThicknessMm: 30,
    doorFinishColor: 'Burma Teak',
    isDoorRepaintable: true,
    quantity: 2,
    rackLocation: 'Godown Bay 1 / Rack C',
    condition: 'CANCELLED_JOB',
    sellingPrice: 5800,
  });
  console.log(`Created Door Only: ${itemB.stockCode} (${itemB.doorHeightMm}×${itemB.doorWidthMm}mm)`);

  // Item C: Frame Only (Rosewood)
  const itemC = await createReadyStockDoor({
    itemType: 'FRAME_ONLY',
    stockCode: 'TEST-FRM-003',
    frameTypeName: 'WPC Extruded 125×65mm Frame',
    frameHeightMm: 2060,
    frameWidthMm: 760,
    frameFinishColor: 'Rosewood',
    isFrameRepaintable: true,
    quantity: 1,
    rackLocation: 'Timber Bay / Stand B',
    condition: 'SURPLUS_PRODUCTION',
    sellingPrice: 2800,
  });
  console.log(`Created Frame Only: ${itemC.stockCode} (${itemC.frameHeightMm}×${itemC.frameWidthMm}mm)`);

  // 2. Query Test 1: Full Set Match with 1mm delta and color repainting
  console.log('\n[Step 2] Testing 1mm-2mm delta query for Full Set (Target: 2086×814mm, Color: Teak)...');
  const match1 = await matchStockDoors({
    targetDoorHeightMm: 2086,
    targetDoorWidthMm: 814,
    targetFrameHeightMm: 2100,
    targetFrameWidthMm: 900,
    targetColor: 'Teak',
    toleranceMm: 5,
  });

  console.log(`Found ${match1.totalMatches} total matches.`);
  console.log(`Full Set matches: ${match1.fullSetMatches.length}`);
  if (match1.fullSetMatches.length === 0) {
    throw new Error('Test 2 failed: Expected full set match for Item A');
  }
  const topMatch = match1.fullSetMatches[0];
  console.log(`Matched Door: ${topMatch.door.stockCode}`);
  console.log(`Fit Quality: ${topMatch.fitQuality}`);
  console.log(`Color Status: ${topMatch.colorStatus} -> ${topMatch.colorNote}`);
  console.log(`Fitting Recommendation: ${topMatch.fittingRecommendation}`);

  if (topMatch.fitQuality !== 'PERFECT_MATCH') {
    throw new Error('Test 2 failed: 1mm delta should be PERFECT_MATCH');
  }
  if (topMatch.colorStatus !== 'REPAINTABLE') {
    throw new Error('Test 2 failed: White door for Teak query should be marked REPAINTABLE');
  }

  // 3. Query Test 2: Door Only Match (Target: 2052×748mm)
  console.log('\n[Step 3] Testing Door Only match (Target: 2052×748mm, 2mm delta)...');
  const match2 = await matchStockDoors({
    targetDoorHeightMm: 2052,
    targetDoorWidthMm: 748,
    toleranceMm: 5,
  });
  console.log(`Door Only matches: ${match2.doorOnlyMatches.length}`);
  const doorMatch = match2.doorOnlyMatches.find((m) => m.door.stockCode === 'TEST-DOOR-002');
  if (!doorMatch) {
    throw new Error('Test 3 failed: Expected Item B to match');
  }
  console.log(`Matched: ${doorMatch.door.stockCode}, Delta: H=${doorMatch.doorHeightDeltaMm}mm, W=${doorMatch.doorWidthDeltaMm}mm, Fit: ${doorMatch.fitQuality}`);

  // 4. Query Test 3: Planable Trimmable Sizing Test (Target: 2080×808mm, delta 7mm)
  console.log('\n[Step 4] Testing Planable/Trim fit with 7mm difference...');
  const match3 = await matchStockDoors({
    targetDoorHeightMm: 2080,
    targetDoorWidthMm: 808,
    toleranceMm: 12,
  });
  const trimmableMatch = match3.fullSetMatches.find((m) => m.door.stockCode === 'TEST-SET-001');
  if (!trimmableMatch) {
    throw new Error('Test 4 failed: Expected Item A to match under 12mm tolerance');
  }
  console.log(`Matched Trimmable: ${trimmableMatch.door.stockCode}, Fit Quality: ${trimmableMatch.fitQuality}`);
  console.log(`Recommendation: ${trimmableMatch.fittingRecommendation}`);
  if (trimmableMatch.fitQuality !== 'TRIMMABLE') {
    throw new Error('Test 4 failed: 7mm delta should be TRIMMABLE');
  }

  // 5. Test Allocation & Reservation
  console.log('\n[Step 5] Testing Allocation & Reservation...');
  const allocated = await allocateStockDoor(itemA.id, 'QTN-2026-TEST', 'Nazer Karumban');
  console.log(`Allocated: ${allocated.stockCode}, Status: ${allocated.status}, Reserved For: ${allocated.reservedForCustomer}`);
  if (allocated.status !== 'RESERVED') {
    throw new Error('Test 5 failed: Item should be RESERVED');
  }

  // 6. Test Release
  console.log('\n[Step 6] Testing Release...');
  const released = await releaseStockDoor(itemA.id);
  console.log(`Released: ${released.stockCode}, Status: ${released.status}`);
  if (released.status !== 'AVAILABLE') {
    throw new Error('Test 6 failed: Item should be AVAILABLE after release');
  }

  // 7. Clean up test items
  await deleteReadyStockDoor(itemA.id);
  await deleteReadyStockDoor(itemB.id);
  await deleteReadyStockDoor(itemC.id);
  console.log('\nCleaned up all temporary test items.');

  console.log('\n>>> ALL READY STOCK MATCHING & REPAINTING TESTS PASSED! <<<');
}

testStockMatchingSystem().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
