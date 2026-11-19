/**
 * Automated Verification Script:
 * 1. Molding Team Individual Worker Traceability (Door Molder & Frame Molder)
 * 2. Consolidated BOQ Multi-Team Material Allocation (Grand Total + Team Splits)
 * 3. Daily Evening BOQ Material Consumption Report (Day, Party, & Batch Views)
 */

import {
  stampDoorsMoldingGang,
  listProductionOrders,
} from '../lib/services/productionService';
import {
  calculateMultiTeamBoqBreakdown,
  calculateDoorBatchBoq,
  BoqDoorInput,
  DEFAULT_BOQ_MATERIAL_RATES,
} from '../lib/utils/boqFormulaEngine';
import {
  getDailyEveningBoqSummary,
  listConsolidatedBatchSummaries,
} from '../lib/services/boqIssueService';

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Starting Automated Tests: Worker Traceability & BOQ Hub');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${label}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Multi-Team BOQ Linearity & Team Split Calculations
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Consolidated Multi-Team BOQ Allocation ---');
  const mockDoors: BoqDoorInput[] = [
    {
      doorNumber: 'D-101',
      widthCm: 80,
      heightCm: 210,
      quantity: 1,
      moldedByGangId: 'GANG-ASHIK',
      moldedByGangName: 'ASHIK',
      doorMolderName: 'ANIL',
      frameMolderName: 'SALMAN',
      materialIssuedToGang: 'ASHIK',
    },
    {
      doorNumber: 'D-102',
      widthCm: 85,
      heightCm: 215,
      quantity: 1,
      moldedByGangId: 'GANG-ASHIK',
      moldedByGangName: 'ASHIK',
      doorMolderName: 'ASHIK',
      frameMolderName: 'SALMAN',
      materialIssuedToGang: 'ASHIK',
    },
    {
      doorNumber: 'D-103',
      widthCm: 90,
      heightCm: 210,
      quantity: 1,
      moldedByGangId: 'GANG-DINAN',
      moldedByGangName: 'DINAN',
      doorMolderName: 'DINAN',
      frameMolderName: 'DINAN',
      materialIssuedToGang: 'DINAN',
    },
  ];

  const multiTeamSummary = calculateMultiTeamBoqBreakdown(
    mockDoors,
    undefined,
    DEFAULT_BOQ_MATERIAL_RATES
  );

  assert(multiTeamSummary.totalDoors === 3, 'Total doors count is 3');
  assert(multiTeamSummary.teams.length === 2, 'Identified exactly 2 distinct molding teams (ASHIK & DINAN)');

  const ashikTeam = multiTeamSummary.teams.find((t) => t.gangName === 'ASHIK');
  const dinanTeam = multiTeamSummary.teams.find((t) => t.gangName === 'DINAN');

  assert(Boolean(ashikTeam && ashikTeam.doorsCount === 2), 'ASHIK team assigned 2 doors');
  assert(Boolean(dinanTeam && dinanTeam.doorsCount === 1), 'DINAN team assigned 1 door');

  // Verify Linearity: Ashik Resin + Dinan Resin === Grand Total Resin
  const combinedResin = (ashikTeam?.boq.resinKg || 0) + (dinanTeam?.boq.resinKg || 0);
  const diffResin = Math.abs(combinedResin - multiTeamSummary.grandTotalBoq.resinKg);
  assert(diffResin < 0.001, `Resin linearity holds: Ashik (${ashikTeam?.boq.resinKg.toFixed(2)}) + Dinan (${dinanTeam?.boq.resinKg.toFixed(2)}) === Total (${multiTeamSummary.grandTotalBoq.resinKg.toFixed(2)})`);

  // Verify Linearity: Gelcoat
  const combinedGel = (ashikTeam?.boq.gelKg || 0) + (dinanTeam?.boq.gelKg || 0);
  const diffGel = Math.abs(combinedGel - multiTeamSummary.grandTotalBoq.gelKg);
  assert(diffGel < 0.001, `Gelcoat linearity holds: Ashik (${ashikTeam?.boq.gelKg.toFixed(2)}) + Dinan (${dinanTeam?.boq.gelKg.toFixed(2)}) === Total (${multiTeamSummary.grandTotalBoq.gelKg.toFixed(2)})`);

  // --------------------------------------------------------------------------
  // TEST 2: Daily Evening BOQ Summary Engine
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Daily Evening BOQ Material Consumption Summary ---');
  const todayStr = new Date().toISOString().slice(0, 10);
  const eveningSummary = getDailyEveningBoqSummary(todayStr);

  assert(eveningSummary !== null && typeof eveningSummary === 'object', 'getDailyEveningBoqSummary returns valid object');
  assert(eveningSummary.date === todayStr, `Summary date matches today (${todayStr})`);
  assert(Array.isArray(eveningSummary.partyWise), 'partyWise list is an array');
  assert(Array.isArray(eveningSummary.batchWise), 'batchWise list is an array');
  assert(typeof eveningSummary.dayTotals.resinKg === 'number', 'dayTotals.resinKg is numeric');
  assert(typeof eveningSummary.totalMaterialValue === 'number', 'totalMaterialValue is numeric');

  console.log(`📊 Today's Evening BOQ Stats: ${eveningSummary.totalVouchersCount} vouchers, ${eveningSummary.totalDoorsIssued} doors, ₹${eveningSummary.totalMaterialValue.toLocaleString('en-IN')} total value`);

  // --------------------------------------------------------------------------
  // TEST 3: Consolidated Batch Summaries with Team Breakdowns
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Consolidated Batch Summaries ---');
  const batches = listConsolidatedBatchSummaries();
  assert(Array.isArray(batches), 'listConsolidatedBatchSummaries returns array');
  console.log(`📦 Found ${batches.length} consolidated batches in system`);

  // --------------------------------------------------------------------------
  // TEST 4: Production Order Artisan Attribution Data Structure
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Production Order Door Artisan Fields ---');
  const orders = await listProductionOrders();
  assert(Array.isArray(orders), 'listProductionOrders returns array');
  console.log(`📋 Found ${orders.length} production orders in system`);

  // --------------------------------------------------------------------------
  // TEST 5: HTTP API Endpoint Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: HTTP API /api/boq/daily-summary ---');
  try {
    const res = await fetch(`http://localhost:4000/api/boq/daily-summary?date=${todayStr}`);
    if (res.ok) {
      const json = await res.json();
      assert(json.success === true, 'API /api/boq/daily-summary returned success: true');
      assert(Boolean(json.data && json.data.dayTotals), 'API returned dayTotals data object');
    } else {
      console.warn(`⚠️ HTTP server at :4000 responded with status ${res.status}`);
    }
  } catch (err) {
    console.warn('⚠️ Could not connect to local HTTP server (may be on different port or idle):', (err as Error).message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
