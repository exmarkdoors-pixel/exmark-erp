import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  createRawMaterialItem,
  updateRawMaterialItem,
  deleteRawMaterialItem,
  manualStockOut,
  getRawMaterialsInventory,
  deductBoqMaterialsFromInventory,
  issueReworkMaterial,
  getWipStageStockSummary,
  getCompanyStockOverview,
} from '../lib/services/stockMaintenanceService';
import { listOrderExpenses } from '../lib/services/orderProfitService';
import { getDataFilePath } from '../lib/utils/dataPaths';

async function runTests() {
  console.log('🧪 Starting Stock Maintenance CRUD & Rework Station Verification...\n');

  // Backup existing inventory store file to restore after test
  const invPath = getDataFilePath('inventory-store.json');
  const backupInv = fs.existsSync(invPath) ? fs.readFileSync(invPath, 'utf8') : null;

  try {
    // ── Test 1: Add New Stock Item ──────────────────────────────────────────
    console.log('--- Test 1: Add New Stock Item (+ Add New RM) ---');
    const testItem = await createRawMaterialItem({
      name: 'High Impact Vinyl Ester Resin (TEST-RM)',
      category: 'Chemicals',
      unit: 'KG',
      currentStock: 250,
      minSafetyBuffer: 50,
      targetStock: 500,
      unitCost: 350,
      warehouseLocation: 'Chemical Bay 3',
    });

    assert(testItem.id, 'Created item must have an id');
    assert.strictEqual(testItem.name, 'High Impact Vinyl Ester Resin (TEST-RM)');
    assert.strictEqual(testItem.currentStock, 250);
    assert.strictEqual(testItem.unitCost, 350);
    assert.strictEqual(testItem.status, 'IN_STOCK');
    console.log(`✅ Test 1 Passed: Added ${testItem.name} (${testItem.itemCode}) with ${testItem.currentStock} ${testItem.unit}`);

    // ── Test 2: Edit Item Name & Properties ─────────────────────────────────
    console.log('\n--- Test 2: Edit Item Name & Buffer Rates ---');
    const updatedItem = await updateRawMaterialItem(testItem.id, {
      name: 'Premium Vinyl Ester Resin 901 (UPDATED)',
      unitCost: 380,
      minSafetyBuffer: 100,
      targetStock: 600,
      warehouseLocation: 'Chemical Bay 3 - Rack A',
    });

    assert.strictEqual(updatedItem.name, 'Premium Vinyl Ester Resin 901 (UPDATED)');
    assert.strictEqual(updatedItem.unitCost, 380);
    assert.strictEqual(updatedItem.minSafetyBuffer, 100);
    assert.strictEqual(updatedItem.warehouseLocation, 'Chemical Bay 3 - Rack A');

    // Verify it persists through getRawMaterialsInventory without seed revert
    const allRm = getRawMaterialsInventory();
    const fetched = allRm.find((r) => r.id === testItem.id);
    assert(fetched, 'Updated item must be found in inventory');
    assert.strictEqual(fetched.name, 'Premium Vinyl Ester Resin 901 (UPDATED)');
    console.log(`✅ Test 2 Passed: Updated item persists cleanly as "${fetched.name}" @ ₹${fetched.unitCost}/${fetched.unit}`);

    // ── Test 3: Manual Stock-Out (- Minus) ──────────────────────────────────
    console.log('\n--- Test 3: Manual Stock-Out (- Minus) ---');
    const deductedItem = await manualStockOut(testItem.id, 50, 'Scrap / Testing Layup', 'Molding Gang');
    assert.strictEqual(deductedItem.currentStock, 200);
    assert.strictEqual(deductedItem.status, 'IN_STOCK');

    // Deduct down to below safety buffer (100) -> Should become LOW_STOCK
    const lowStockItem = await manualStockOut(testItem.id, 120, 'Floor Issue', 'Molding Gang');
    assert.strictEqual(lowStockItem.currentStock, 80);
    assert.strictEqual(lowStockItem.status, 'LOW_STOCK');
    console.log(`✅ Test 3 Passed: Manual stock-out deducted 170 KG total; remaining stock: ${lowStockItem.currentStock} KG (${lowStockItem.status})`);

    // ── Test 4: BOQ Auto-Deduction ──────────────────────────────────────────
    console.log('\n--- Test 4: BOQ Auto-Deduction from Store ---');
    const { deductedCount, summary } = await deductBoqMaterialsFromInventory(
      [
        {
          name: updatedItem.name,
          issuedQty: 20,
          unit: 'KG',
        },
      ],
      'BOQ-TEST-001',
      'ORD-TEST-001'
    );
    assert(deductedCount >= 1, 'Should deduct at least 1 item matching name');
    const postBoqRm = getRawMaterialsInventory();
    const postBoqItem = postBoqRm.find((r) => r.id === testItem.id);
    assert.strictEqual(postBoqItem?.currentStock, 60);
    console.log(`✅ Test 4 Passed: BOQ Auto-deduction reduced stock to ${postBoqItem?.currentStock} KG. Summary: ${summary[0]}`);

    // ── Test 5: Delete Item (Demo Cleanup) & Verify No Re-seed ──────────────
    console.log('\n--- Test 5: Delete Item & Verify No Re-seed ---');
    const deleteResult = await deleteRawMaterialItem(testItem.id);
    assert.strictEqual(deleteResult.success, true);

    // Call getRawMaterialsInventory() multiple times to ensure it never re-creates deleted item
    const refreshed = getRawMaterialsInventory();
    const shouldNotExist = refreshed.find((r) => r.id === testItem.id);
    assert.strictEqual(shouldNotExist, undefined, 'Deleted item must NOT be resurrected by seed merge');
    console.log(`✅ Test 5 Passed: Deleted item "${deleteResult.name}" successfully removed and stays permanently deleted!`);

    // ── Test 6: Rework Material Issue & Direct Order Expense Booking ────────
    console.log('\n--- Test 6: Rework Material Issue & Profit Ledger Booking ---');
    const reworkResult = await issueReworkMaterial({
      prodOrderId: 'ORD-TEST-REWORK-001',
      jobCardNumber: 'EXM-TEST-RWK',
      customerName: 'Test Builder Kochi',
      reason: 'Surface pinhole rectification & patch layup',
      issuedBy: 'QC Inspector',
      items: [
        {
          name: 'UV-Stabilized PU Gelcoat (White / Clear)',
          qty: 3,
          unit: 'KG',
          unitCost: 320,
        },
        {
          name: 'NC Thinner / Acetone Cleaning Solvent',
          qty: 2,
          unit: 'Ltrs',
          unitCost: 130,
        },
      ],
    });

    assert.strictEqual(reworkResult.success, true);
    assert.strictEqual(reworkResult.totalCost, 3 * 320 + 2 * 130); // 960 + 260 = 1220
    assert(reworkResult.voucherNumber.startsWith('RWK-MAT-'));

    // Verify order direct expense was recorded under category: REWORK
    const expenses = await listOrderExpenses('ORD-TEST-REWORK-001');
    const matchExp = expenses.find((e) => e.category === 'REWORK' && e.amount === 1220);
    assert(matchExp, 'Order direct expenses must contain the reworkCost entry of ₹1,220');
    console.log(`✅ Test 6 Passed: Rework voucher ${reworkResult.voucherNumber} created ₹${reworkResult.totalCost} expense linked to order profit ledger!`);

    // ── Test 7: WIP Floor Stage Inventory with Rework Station Summary ───────
    console.log('\n--- Test 7: WIP Floor Stage Inventory with Rework Station ---');
    const wipSummary = getWipStageStockSummary();
    assert(Array.isArray(wipSummary.stages), 'WIP must have stages array');
    assert.strictEqual(wipSummary.stages.length, 5);
    assert(wipSummary.reworkStation !== undefined, 'WIP summary must include reworkStation');
    assert(typeof wipSummary.reworkStation.totalReworkCost === 'number');

    const overview = getCompanyStockOverview();
    assert(overview.wipSummary.reworkStation !== undefined, 'Overview must include reworkStation');
    console.log(`✅ Test 7 Passed: WIP Stage Tracker shows 5 active stages + Rework Station with ₹${wipSummary.reworkStation.totalReworkCost.toLocaleString('en-IN')} total rework cost.`);

    console.log('\n🎉 ALL 7 STOCK MAINTENANCE CRUD & REWORK TESTS PASSED (100%)!');
  } finally {
    // Restore backup
    if (backupInv) {
      fs.writeFileSync(invPath, backupInv, 'utf8');
      console.log('🧹 Cleaned up test items and restored original inventory store.');
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
