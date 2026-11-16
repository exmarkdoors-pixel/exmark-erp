/**
 * Automated Verification Suite for:
 * 1. Consolidated BOQ Custom Usage overrides & Buffer %
 * 2. Door-wise Molding Gang Custom Pick & Accountability Stamping
 * 3. Warranty & Damage Tracking API Verification
 */

import {
  listProductionOrders,
  updateProductionStage,
  stampDoorsMoldingGang,
  findDoorBySerial,
} from '../lib/services/productionService';
import {
  getBoqCustomUsage,
  saveBoqCustomUsage,
  clearBoqCustomUsage,
} from '../lib/services/boqCustomUsageService';
import { getContractors } from '../lib/services/contractorService';

async function runSuite() {
  console.log('\n======================================================');
  console.log('🧪 TEST SUITE: BOQ CUSTOM USAGE & DOOR-WISE MOLDING    ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Test BOQ Custom Usage Service
    console.log('▸ Test Group 1: BOQ Custom Usage Service Persistence');
    const testBatchKey = 'TEST_CONSOLIDATED_BATCH_2026';
    await clearBoqCustomUsage(testBatchKey);

    const saved = await saveBoqCustomUsage(testBatchKey, {
      bufferPercent: 10,
      overrides: {
        resin: { customQty: 48.5, customRate: 220, note: 'Heavy humid layup' },
        foam: { customQty: 6, customRate: 750 },
      },
      supervisorNotes: '10% buffer applied for special architectural batch',
    });

    assert(saved.bufferPercent === 10, 'Saved buffer percent matches 10%');
    assert(saved.overrides.resin?.customQty === 48.5, 'Resin override quantity stored as 48.5 Kg');
    assert(saved.overrides.foam?.customQty === 6, 'Foam override quantity stored as 6 Sheets');

    const fetched = await getBoqCustomUsage(testBatchKey);
    assert(fetched !== null && fetched.bufferPercent === 10, 'Fetched BOQ custom usage matches stored record');

    const cleared = await clearBoqCustomUsage(testBatchKey);
    assert(cleared === true, 'Successfully cleared test custom usage record');
    const afterClear = await getBoqCustomUsage(testBatchKey);
    assert(afterClear === null, 'Record is null after deletion');

    // 2. Test Door Stamping for Gang Molders
    console.log('\n▸ Test Group 2: Door-Wise Gang Molding Accountability');
    const orders = await listProductionOrders();
    if (orders.length === 0) {
      console.log('  ⚠️ No production orders available to test door stamping, creating mock or skipping.');
    } else {
      const order = orders[0];
      const contractors = getContractors();
      const gangA = contractors[0] || { id: 'GANG-TEST-A', name: 'Gang A Molding Team' };
      const gangB = contractors[1] || { id: 'GANG-TEST-B', name: 'Gang B Molding Team' };

      const doors = order.doors || [];
      if (doors.length >= 2) {
        const door1 = doors[0];
        const door2 = doors[1];

        const stamped = await stampDoorsMoldingGang(order.id, [
          { doorId: door1.doorId, gangId: gangA.id, gangName: gangA.name, moldingNotes: 'Custom Pick Gang A' },
          { doorId: door2.doorId, gangId: gangB.id, gangName: gangB.name, moldingNotes: 'Custom Pick Gang B' },
        ]);

        const updatedD1 = stamped.doors.find((d) => d.doorId === door1.doorId);
        const updatedD2 = stamped.doors.find((d) => d.doorId === door2.doorId);

        assert(updatedD1?.moldedByGangId === gangA.id, `Door 1 correctly stamped with Gang A ID (${gangA.id})`);
        assert(updatedD1?.moldedByGangName === gangA.name, `Door 1 stamped with Gang A Name (${gangA.name})`);
        assert(Boolean(updatedD1?.moldedAt), 'Door 1 has valid molding timestamp');

        assert(updatedD2?.moldedByGangId === gangB.id, `Door 2 correctly stamped with Gang B ID (${gangB.id})`);
        assert(updatedD2?.moldedByGangName === gangB.name, `Door 2 stamped with Gang B Name (${gangB.name})`);

        // 3. Test Warranty / Future Damage Lookup by Door Serial
        console.log('\n▸ Test Group 3: Warranty / Damage Door Serial Tracking Lookup');
        const found = await findDoorBySerial(door1.doorId);
        assert(found !== null, `Found door by serial ID: ${door1.doorId}`);
        assert(found?.door.moldedByGangName === gangA.name, 'Tracking query reflects verified molding gang');
      } else {
        console.log('  ⚠️ First order has less than 2 doors, skipping multi-door test.');
      }
    }

  } catch (err) {
    console.error('❌ Test suite threw an unhandled error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
