import fs from 'fs';
import path from 'path';
import assert from 'assert';

// 1. Setup isolated test environment
const TEST_DIR = path.join(process.cwd(), '.tmp-test-vault-stock-' + Date.now());
process.env.EXMARK_DATA_DIR = TEST_DIR;

async function runStockMaintenanceTests() {
  console.log(`\n=============================================================`);
  console.log(`🧪 EXMARK ERP - STOCK MAINTENANCE & BUFFER AUTOMATED TESTS`);
  console.log(`Using Isolated Test Vault: ${TEST_DIR}`);
  console.log(`=============================================================\n`);

  try {
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Dynamic import so it reads the new EXMARK_DATA_DIR
    const {
      getCompanyStockOverview,
      getRawMaterialsInventory,
      adjustRawMaterialStock,
      deductBoqMaterialsFromInventory,
      restoreBoqMaterialsToInventory,
      getWipStageStockSummary,
      getFinishedGoodsInventory,
      adjustFinishedGoodsStock,
      createFgBufferReplenishmentOrder,
      updateStockMaintenanceConfig,
      getStockMaintenanceConfig,
    } = await import('../lib/services/stockMaintenanceService');

    // -------------------------------------------------------------
    // Test 1: Baseline Overview & Defaults
    // -------------------------------------------------------------
    console.log(`▶ Test 1: Verifying baseline overview and default configurations...`);
    const overview = getCompanyStockOverview();
    assert.strictEqual(overview.consistentTargetValuation, 2500000, 'Default target valuation should be ₹25,00,000');
    assert.ok(overview.rawMaterialsSummary.skuCount >= 20, `Should seed at least 20 raw material SKUs (got ${overview.rawMaterialsSummary.skuCount})`);
    assert.ok(overview.rawMaterialsSummary.totalValue > 0, 'RM stock should have positive valuation');
    assert.ok(overview.finishedGoodsSummary.totalBufferDoors >= 5, 'Should seed standard FG buffer doors');
    console.log(`  ✔ Overview passed: Target = ₹${overview.consistentTargetValuation.toLocaleString()}, RM Items = ${overview.rawMaterialsSummary.skuCount}, FG Doors = ${overview.finishedGoodsSummary.totalBufferDoors}`);

    // -------------------------------------------------------------
    // Test 2: Raw Material Stock Adjustments & Status Transitions
    // -------------------------------------------------------------
    console.log(`\n▶ Test 2: Testing Raw Material inventory adjustments & status triggers...`);
    // First ensure baseline 1200 stock (minSafetyBuffer is 500)
    await adjustRawMaterialStock('RAW-RES-01', 1200, 'Opening factory stock inward');
    
    // Consume 800 -> 400 (LOW_STOCK)
    const resin = await adjustRawMaterialStock('RAW-RES-01', -800, 'Consume resin for production');
    assert.strictEqual(resin.currentStock, 400, 'Resin stock should be 1200 - 800 = 400');
    assert.strictEqual(resin.status, 'LOW_STOCK', 'Resin stock (400) should be LOW_STOCK (< minBuffer 500)');

    // Consume 400 -> 0 (CRITICAL)
    const resinCritical = await adjustRawMaterialStock('RAW-RES-01', -400, 'High consumption emergency');
    assert.strictEqual(resinCritical.currentStock, 0, 'Resin stock should be 400 - 400 = 0');
    assert.strictEqual(resinCritical.status, 'CRITICAL', 'Resin stock (0) should be CRITICAL');

    // Restock 1200 -> 1200 (IN_STOCK)
    const resinRestocked = await adjustRawMaterialStock('RAW-RES-01', 1200, 'Supplier tanker delivery');
    assert.strictEqual(resinRestocked.currentStock, 1200, 'Resin stock should be 0 + 1200 = 1200');
    assert.strictEqual(resinRestocked.status, 'IN_STOCK', 'Resin stock should return to IN_STOCK');
    console.log(`  ✔ RM Adjustment & status transitions verified (LOW_STOCK -> CRITICAL -> IN_STOCK).`);

    // -------------------------------------------------------------
    // Test 3: BOQ Auto-Deduction and Restoration
    // -------------------------------------------------------------
    console.log(`\n▶ Test 3: Testing BOQ automatic material deduction & voucher restoration...`);
    await adjustRawMaterialStock('RAW-FBR-02', 200, 'Inward fiber rolls for test');
    const initialResin = getRawMaterialsInventory().find((i) => i.itemCode === 'RAW-RES-01')!.currentStock;
    const initialFiber = getRawMaterialsInventory().find((i) => i.itemCode === 'RAW-FBR-02')!.currentStock;

    // Deduct
    const deductionItems = [
      { rawMaterialKey: 'resin', itemName: 'Isophthalic Polyester Resin', qty: 50, uom: 'kg' },
      { rawMaterialKey: 'csmMat', itemName: 'E-Glass Chopped Strand Mat', qty: 25, uom: 'kg' },
    ];
    await deductBoqMaterialsFromInventory(deductionItems, 'VCH-TEST-001', 'ORD-TEST-001');

    const postDeductResin = getRawMaterialsInventory().find((i) => i.itemCode === 'RAW-RES-01')!.currentStock;
    const postDeductFiber = getRawMaterialsInventory().find((i) => i.itemCode === 'RAW-FBR-02')!.currentStock;
    assert.strictEqual(postDeductResin, initialResin - 50, 'Resin should be deducted by 50 kg');
    assert.strictEqual(postDeductFiber, initialFiber - 25, 'Fiberglass should be deducted by 25 kg');
    console.log(`  ✔ Deducted 50kg resin and 25kg fiberglass successfully.`);

    // Restore
    await restoreBoqMaterialsToInventory(deductionItems, 'VCH-TEST-001', 'ORD-TEST-001');
    const postRestoreResin = getRawMaterialsInventory().find((i) => i.itemCode === 'RAW-RES-01')!.currentStock;
    const postRestoreFiber = getRawMaterialsInventory().find((i) => i.itemCode === 'RAW-FBR-02')!.currentStock;
    assert.strictEqual(postRestoreResin, initialResin, 'Resin should be restored to initial balance');
    assert.strictEqual(postRestoreFiber, initialFiber, 'Fiberglass should be restored to initial balance');
    console.log(`  ✔ Restored raw materials upon voucher cancellation.`);

    // -------------------------------------------------------------
    // Test 4: Finished Goods Buffer Adjustments & Balances
    // -------------------------------------------------------------
    console.log(`\n▶ Test 4: Testing Finished Goods buffer adjustments and available calculations...`);
    const fgItem = await adjustFinishedGoodsStock('fg-002', 5, 'Completed batch buffer transfer');
    assert.strictEqual(fgItem.currentBalance, 13, 'Balance should be 8 + 5 = 13');
    assert.strictEqual(fgItem.availableBalance, 13 - fgItem.reservedCount, 'Available should equal current - reserved');
    assert.strictEqual(fgItem.status, 'HEALTHY', '13 is >= minBuffer 10, status should be HEALTHY');
    console.log(`  ✔ FG Item updated: Balance = ${fgItem.currentBalance}, Reserved = ${fgItem.reservedCount}, Available = ${fgItem.availableBalance}, Status = ${fgItem.status}`);

    // -------------------------------------------------------------
    // Test 5: 1-Click Finished Goods Buffer Replenishment Order
    // -------------------------------------------------------------
    console.log(`\n▶ Test 5: Testing 1-click FG Buffer replenishment order creation...`);
    const replenishmentOrder = await createFgBufferReplenishmentOrder('fg-002', 10);
    assert.ok(replenishmentOrder.success, 'Order creation should report success');
    assert.ok(replenishmentOrder.orderId && replenishmentOrder.orderId.length > 0, 'Order ID should be present');
    console.log(`  ✔ Replenishment production order created: ${replenishmentOrder.orderId} (Job Card: ${replenishmentOrder.jobCardNumber})`);

    // -------------------------------------------------------------
    // Test 6: WIP Factory Stage Stock Summary
    // -------------------------------------------------------------
    console.log(`\n▶ Test 6: Testing WIP Factory Stage valuation with queued replenishment order...`);
    const wipSummary = getWipStageStockSummary();
    const queuedStage = wipSummary.stages.find((s) => s.stage === 'QUEUED');
    assert.ok(queuedStage, 'QUEUED stage should be present');
    assert.ok(queuedStage.doorCount >= 10, 'Should count at least 10 doors in QUEUED stage');
    assert.ok(queuedStage.totalAccruedValuation >= 14000, '10 doors in QUEUED should have at least ₹14,000 valuation');
    console.log(`  ✔ WIP Queued Stage: ${queuedStage.doorCount} doors, ₹${queuedStage.totalAccruedValuation.toLocaleString()} valuation.`);

    // -------------------------------------------------------------
    // Test 7: Target Valuation Configuration Updates
    // -------------------------------------------------------------
    console.log(`\n▶ Test 7: Testing Stock Maintenance Target Configuration updates...`);
    const updatedConfig = await updateStockMaintenanceConfig({
      consistentTargetValuation: 3200000,
      autoDeductBoqMaterials: true,
    });
    assert.strictEqual(updatedConfig.consistentTargetValuation, 3200000, 'Config target should be ₹32,00,000');
    assert.strictEqual(getStockMaintenanceConfig().consistentTargetValuation, 3200000, 'Persisted config should match');
    console.log(`  ✔ Config successfully updated and persisted: Target = ₹${updatedConfig.consistentTargetValuation.toLocaleString()}`);

    console.log(`\n=============================================================`);
    console.log(`✅ ALL 7 STOCK MAINTENANCE & BUFFER TESTS PASSED PERFECTLY!`);
    console.log(`=============================================================\n`);
  } finally {
    // Clean up isolated test vault
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
      console.log(`🧹 Cleaned up isolated test vault: ${TEST_DIR}`);
    }
  }
}

runStockMaintenanceTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
