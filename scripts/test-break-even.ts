import fs from 'fs';
import os from 'os';
import path from 'path';
import { calculateBreakEven } from '../types/finance';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runBreakEvenTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-breakeven-test-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log(`\nRunning Break-Even Calculation Method Tests (Isolated: ${tempDir})\n`);

    // 1. Pure Calculator Dynamic Formulas & Edge-Case Guards
    const std = calculateBreakEven({
      fixedOverheadCosts: 450000,
      averageFRPPricePerDoor: 8500,
      variableCostPerDoor: 4800,
      targetSalesRevenue: 2500000,
    });
    assert(std.breakEvenUnits === 122 && std.contributionMarginPerDoor === 3700, 'Standard compatibility check (122 doors, ₹3,700 CM)');

    const custom = calculateBreakEven({
      fixedOverheadCosts: 300000,
      averageFRPPricePerDoor: 9000,
      variableCostPerDoor: 5000,
      targetProfit: 200000,
      workingDaysPerMonth: 25,
      targetSalesRevenue: 1500000,
    });
    assert(custom.contributionMarginPerDoor === 4000, 'Custom CM = ₹9,000 - ₹5,000 = ₹4,000');
    assert(custom.breakEvenUnits === 75, 'Custom BEP = 3,00,000 / 4,000 = 75 Doors');
    assert(custom.requiredUnitsForTargetProfit === 125, 'Target Profit Doors = (3L + 2L) / 4,000 = 125 Doors');
    assert(custom.dailyBreakEvenUnits === 3 && custom.dailyTargetProfitUnits === 5, 'Daily pace = 3.0 BEP/day, 5.0 Profit/day');
    assert(
      custom.formulaDetails.cmPerDoor.includes('₹9,000') &&
        custom.formulaDetails.cmPerDoor.includes('₹5,000') &&
        !custom.formulaDetails.cmPerDoor.includes('8,500'),
      'formulaDetails uses dynamic runtime numbers (no hardcoded ₹8,500 string)'
    );
    assert(
      custom.formulaDetails.breakEvenUnits.includes('75 Doors') &&
        !custom.formulaDetails.breakEvenUnits.includes('122 Doors'),
      'breakEvenUnits formula updates dynamically (75 Doors)'
    );

    const nonViable = calculateBreakEven({
      fixedOverheadCosts: 300000,
      averageFRPPricePerDoor: 4000,
      variableCostPerDoor: 4500,
    });
    assert(!nonViable.isViable && nonViable.breakEvenUnits === 0 && Number.isFinite(nonViable.breakEvenRevenue), 'Guards negative CM cleanly without NaN/Infinity');

    const zeroPrice = calculateBreakEven({
      fixedOverheadCosts: 200000,
      averageFRPPricePerDoor: 0,
      variableCostPerDoor: 3000,
    });
    assert(!zeroPrice.isViable && zeroPrice.contributionMarginRatio === 0, 'Guards zero selling price cleanly');

    // 2. Live ERP Service Integration Tests
    const [
      { createCustomer },
      { createQuotation, updateQuotation },
      { createProductionOrder },
      { generateManufacturingBoq, generatePaintBoq },
      { addBoqExtraItem },
      { createContractor, recordPieceRateCredit },
      {
        saveFixedOverheadItem,
        deleteFixedOverheadItem,
        computeComprehensiveBreakEven,
      },
      { generateReport },
    ] = await Promise.all([
      import('../lib/services/customerService'),
      import('../lib/services/quotationService'),
      import('../lib/services/productionService'),
      import('../lib/services/boqService'),
      import('../lib/services/boqExtraItemsService'),
      import('../lib/services/contractorService'),
      import('../lib/services/breakEvenService'),
      import('../lib/services/reportService'),
    ]);

    const monthKey = '2026-11';
    const ohRent = saveFixedOverheadItem({
      category: 'FACTORY_RENT',
      name: 'Factory Shed Rent',
      monthlyAmount: 80000,
    });
    const ohStaff = saveFixedOverheadItem({
      category: 'SALARIES_FIXED',
      name: 'Office & Supervisor Salary',
      monthlyAmount: 120000,
    });
    const ohTemp = saveFixedOverheadItem({
      category: 'OTHER_FIXED',
      name: 'Temp Mistake',
      monthlyAmount: 50000,
    });
    assert(ohRent.monthlyAmount === 80000 && ohStaff.monthlyAmount === 120000, 'Fixed overheads saved cleanly');
    assert(deleteFixedOverheadItem(ohTemp.id) === true, 'Deleted extra overhead item cleanly');

    // Create Customer, Order (10 doors @ ₹9,000 = ₹90,000), BOQ, Piece-Rate, & Floor Consumables
    const cust = await createCustomer({
      name: 'Thrissur Heights',
      phone: '9847123456',
      town: 'Puzhakkal',
      district: 'Thrissur',
      type: 'BUILDER',
      status: 'ACTIVE',
      creditLimit: 500000,
      outstandingBalance: 0,
    });

    const quote = await createQuotation({
      customerId: cust.id,
      customerName: cust.name,
      date: `${monthKey}-05`,
      validUntil: `${monthKey}-30`,
      overrideSubtotal: 90000,
      overrideTotalAmount: 90000,
      items: [
        {
          doorCategory: 'FRP_DOORS',
          doorModel: '32mm Teak FRP',
          heightMm: 2100,
          widthMm: 800,
          thicknessMm: 32,
          quantity: 10,
          unitPrice: 9000,
          gstRate: 0,
          totalPrice: 90000,
        },
      ],
    });
    await updateQuotation(quote.id, { isConfirmed: true, status: 'CONVERTED' });

    const prodOrder = await createProductionOrder({
      salesOrderId: quote.quoteNumber,
      customerName: cust.name,
      siteName: 'Tower 1',
      district: 'Thrissur',
      orderDate: `${monthKey}-06`,
      doors: Array.from({ length: 10 }, (_, idx) => ({
        doorNumber: `D${idx + 1}`,
        model: '32mm Teak FRP',
        rawHeightMm: 2100,
        rawWidthMm: 800,
        finishColor: 'Natural Teak Matte',
        lockType: 'Baby Latch Black',
      })),
    });

    await generateManufacturingBoq(prodOrder, true);
    await generatePaintBoq(prodOrder);

    const gang = createContractor({
      name: 'Suresh Molding Gang',
      phone: '9999988888',
      trade: 'MOLDING',
      isInHouseGang: true,
    });
    recordPieceRateCredit({
      contractorId: gang.id,
      orderId: prodOrder.id,
      orderNumber: prodOrder.prodOrderNumber,
      jobCardNumber: prodOrder.jobCardNumber,
      doorId: 'BATCH',
      doorNumber: 'D1-D10',
      doorModel: '32mm Teak',
      operation: 'MOLDING_DOOR_WITH_FRAME',
      quantity: 10,
    });

    // Evening / Store Bulk Floor Consumable for 2026-11
    await addBoqExtraItem({
      orderKey: 'FLOOR-CONSUMABLES',
      itemName: 'Evening Gloves & Brushes',
      category: 'Consumable',
      quantity: 1,
      unit: 'Lot',
      unitRate: 2000,
      issueDate: `${monthKey}-10`,
      isFloorConsumable: true,
    });

    const withFloor = await computeComprehensiveBreakEven({
      month: monthKey,
      includeFloorConsumables: true,
      workingDaysPerMonth: 26,
      targetProfit: 100000,
    });

    assert(withFloor.fixedCostsBreakdown.floorConsumablesTotal === 2000, 'Floor consumables (₹2,000) summed for selected month');
    assert(
      withFloor.fixedCostsBreakdown.totalFixedMonthlyCost === 202000,
      `Total monthly fixed cost = 80,000 + 120,000 + 2,000 = ₹2,02,000 (got ${withFloor.fixedCostsBreakdown.totalFixedMonthlyCost})`
    );
    assert(
      withFloor.liveErpUnitEconomics.avgSellingPricePerDoor === 9000,
      `Live ERP avg price per door is ₹9,000 (got ${withFloor.liveErpUnitEconomics.avgSellingPricePerDoor})`
    );
    assert(withFloor.liveErpBreakEven.isViable && withFloor.liveErpBreakEven.breakEvenUnits > 0, `Live BEP computed (${withFloor.liveErpBreakEven.breakEvenUnits} doors)`);
    assert(
      withFloor.liveErpBreakEven.requiredUnitsForTargetProfit > withFloor.liveErpBreakEven.breakEvenUnits,
      'Target profit doors > break-even doors'
    );
    assert(withFloor.monthProgress.doorsAchieved === 10, 'Month progress tracks 10 doors achieved');
    assert(withFloor.engineeringMatrix.length === 7, 'Standard engineering matrix outputs 7 variants (Cat A-E, Shutter, Install)');

    const withoutFloor = await computeComprehensiveBreakEven({
      month: monthKey,
      includeFloorConsumables: false,
    });
    assert(
      withoutFloor.fixedCostsBreakdown.totalFixedMonthlyCost === 200000,
      'Disabling includeFloorConsumables drops fixed cost to ₹2,00,000'
    );

    const rep = await generateReport('BREAK_EVEN_CVP_ANALYSIS', { startDate: `${monthKey}-01` });
    assert(rep.rows.length === 7 && Boolean(rep.summaryMetrics.liveBreakEvenUnits), 'BREAK_EVEN_CVP_ANALYSIS report generated cleanly');

    console.log('\n✅ ALL BREAK-EVEN ENGINE TESTS PASSED!\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runBreakEvenTests().catch((err) => {
  console.error('\n❌ BREAK-EVEN TEST FAILED:', err);
  process.exit(1);
});
