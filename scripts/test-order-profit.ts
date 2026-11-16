import fs from 'fs';
import os from 'os';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runOrderProfitTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-order-profit-test-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log(`\nRunning Order-Wise Profit & P&L Tests (Isolated dir: ${tempDir})\n`);

    const [
      { createCustomer },
      { createQuotation, updateQuotation },
      { createProductionOrder },
      { generateManufacturingBoq, generatePaintBoq },
      { addBoqExtraItem },
      { createContractor, recordPieceRateCredit, getRateCard },
      { createInvoice, recordPayment },
      {
        addOrderExpense,
        deleteOrderExpense,
        computeOrderProfitSummaries,
      },
      { getBoqMaterialRates },
      { generateReport, exportReportAsCsv },
    ] = await Promise.all([
      import('../lib/services/customerService'),
      import('../lib/services/quotationService'),
      import('../lib/services/productionService'),
      import('../lib/services/boqService'),
      import('../lib/services/boqExtraItemsService'),
      import('../lib/services/contractorService'),
      import('../lib/services/financeService'),
      import('../lib/services/orderProfitService'),
      import('../lib/services/boqRateService'),
      import('../lib/services/reportService'),
    ]);

    // 1. Customer & 0% Non-GST Quotation with Installation
    const customer = await createCustomer({
      name: 'Malabar Builders Kochi',
      phone: '9847001122',
      town: 'Edappally',
      district: 'Ernakulam',
      type: 'BUILDER',
      status: 'ACTIVE',
      creditLimit: 500000,
      outstandingBalance: 0,
    });

    const quote = await createQuotation({
      customerId: customer.id,
      customerName: customer.name,
      location: 'Ernakulam',
      date: '2026-11-11',
      validUntil: '2026-12-11',
      overrideSubtotal: 17600,
      overrideTotalAmount: 17600,
      includeInstallation: true,
      installationMode: 'PER_DOOR',
      installationRate: 800,
      installationQty: 2,
      installationAmount: 1600,
      advancePercent: 40,
      advanceAmount: 7000,
      items: [
        {
          doorCategory: 'FRP_DOORS',
          doorModel: '32mm Molded Teak FRP Door',
          heightMm: 2100,
          widthMm: 800,
          thicknessMm: 32,
          finishColor: 'Teak',
          quantity: 2,
          unitPrice: 8000,
          gstRate: 0,
          totalPrice: 16000,
        },
      ],
    });

    // Confirm quotation with ₹7,000 advance paid
    await updateQuotation(quote.id, {
      isConfirmed: true,
      status: 'CONVERTED',
      jobCardNumber: 'JC-TEST-101',
    });
    // Also inject advancePaid field matching QuotationHub persistence
    const quoteStorePath = path.join(tempDir, 'quotations-store.json');
    const rawQuotes = JSON.parse(fs.readFileSync(quoteStorePath, 'utf-8'));
    rawQuotes[0].advancePaid = 7000;
    fs.writeFileSync(quoteStorePath, JSON.stringify(rawQuotes, null, 2));

    // Create Sales Invoice & matching receipt of ₹7,000 (verifying no double-counting)
    const inv = await createInvoice({
      salesOrderId: quote.quoteNumber,
      customerId: customer.id,
      customerName: customer.name,
      subtotal: 17600,
    });
    await recordPayment({
      invoiceId: inv.id,
      customerId: customer.id,
      customerName: customer.name,
      amount: 7000,
      paymentMode: 'UPI',
      referenceNumber: 'UPI-REF-01',
    });

    // 2. Production Order linked to Quotation
    const prodOrder = await createProductionOrder({
      salesOrderId: quote.quoteNumber,
      customerName: customer.name,
      siteName: 'Skyline Villas Edappally',
      district: 'Ernakulam',
      orderDate: '2026-11-11',
      includeInstallation: true,
      doors: [
        {
          doorNumber: 'D1',
          model: '32mm Molded Teak FRP Door',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishColor: 'Teak',
          lockType: 'Baby Latch Black',
        },
        {
          doorNumber: 'D2',
          model: '32mm Molded Teak FRP Door',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishColor: 'Teak',
          lockType: 'Baby Latch Black',
        },
      ],
    });

    // 3. Auto-BOQ (Manufacturing + Painting) & Extra Store Items
    const mfgBoq = await generateManufacturingBoq(prodOrder, true);
    const paintBoq = await generatePaintBoq(prodOrder);
    assert(mfgBoq.totalAmount > 0, `Manufacturing BOQ generated (₹${mfgBoq.totalAmount})`);
    assert(paintBoq.totalAmount > 0, `Paint BOQ generated (₹${paintBoq.totalAmount})`);

    await addBoqExtraItem({
      orderKey: prodOrder.id,
      itemName: 'MASK',
      category: 'Consumable',
      quantity: 1,
      unit: 'Nos',
      unitRate: 150,
    });
    // Shared Floor Consumables must NOT leak into per-order profit
    await addBoqExtraItem({
      orderKey: 'FLOOR-CONSUMABLES',
      itemName: 'Evening Cotton Waste Bulk',
      category: 'Consumable',
      quantity: 1,
      unit: 'Bundle',
      unitRate: 999,
      isFloorConsumable: true,
    });

    // 4. Floor Gangs & Piece-Rate Credits
    const moldGang = createContractor({
      name: 'Ashik Molding Gang',
      phone: '9999900001',
      trade: 'MOLDING',
      isInHouseGang: true,
    });
    const paintGang = createContractor({
      name: 'Rafi Paint Gang',
      phone: '9999900002',
      trade: 'PAINTING',
      isInHouseGang: true,
    });

    recordPieceRateCredit({
      contractorId: moldGang.id,
      orderId: prodOrder.id,
      orderNumber: prodOrder.prodOrderNumber,
      jobCardNumber: prodOrder.jobCardNumber,
      doorId: 'BATCH',
      doorNumber: 'D1-D2',
      doorModel: '32mm Teak FRP',
      operation: 'MOLDING_DOOR_WITH_FRAME',
      quantity: 2,
    });
    recordPieceRateCredit({
      contractorId: paintGang.id,
      orderId: prodOrder.id,
      orderNumber: prodOrder.prodOrderNumber,
      jobCardNumber: prodOrder.jobCardNumber,
      doorId: 'BATCH',
      doorNumber: 'D1-D2',
      doorModel: '32mm Teak FRP',
      operation: 'DOOR_GRAINS_WITH_PAINT',
      quantity: 2,
    });

    // 5. Direct Expenses (Freight + Loading, then delete Loading)
    const expFreight = await addOrderExpense({
      orderId: prodOrder.id,
      jobCardNumber: prodOrder.jobCardNumber,
      category: 'FREIGHT',
      description: 'Pickup Van Freight to Edappally',
      amount: 850,
      vendorOrParty: 'KL-07 Freight',
    });
    const expLoading = await addOrderExpense({
      orderId: prodOrder.id,
      jobCardNumber: prodOrder.jobCardNumber,
      category: 'LOADING_UNLOADING',
      description: 'Loading helpers',
      amount: 250,
    });
    assert(expFreight.amount === 850 && expLoading.amount === 250, 'Direct order expenses added');

    const deleted = await deleteOrderExpense(expLoading.id);
    assert(deleted === true, 'Direct order expense deleted cleanly');

    // 6. Compute Order-Wise Profit (Actual Only)
    const actualRes = await computeOrderProfitSummaries({
      orderId: prodOrder.id,
      includeProjectedCosts: false,
    });
    assert(actualRes.orders.length === 1, 'Filtered to 1 target production order');
    const ord = actualRes.orders[0];

    assert(ord.revenueSource === 'QUOTATION', 'Matched quotation revenue source');
    assert(ord.totalOrderRevenue === 17600, `Order revenue is ₹17,600 (got ${ord.totalOrderRevenue})`);
    assert(ord.doorsRevenue === 16000, `Doors revenue is ₹16,000 (got ${ord.doorsRevenue})`);
    assert(ord.installationRevenue === 1600, `Installation revenue is ₹1,600 (got ${ord.installationRevenue})`);
    assert(ord.cashCollected === 7000, `Cash collected is ₹7,000 without double-counting advance+receipt (got ${ord.cashCollected})`);

    // Lock hardware = 2 doors * active rate for Baby Latch Black (₹720 in vault defaults)
    const activeRates = await getBoqMaterialRates();
    const babyLatch = activeRates.lockBoxProfiles.find((p) =>
      p.name.toLowerCase().includes('baby latch')
    );
    const expectedLockCost = 2 * (babyLatch?.boxCost ?? 720);
    assert(
      ord.lockHardwareCost === expectedLockCost,
      `Lock box kits cost is ₹${expectedLockCost} (got ${ord.lockHardwareCost})`
    );
    assert(ord.rawDoorMaterialCost === mfgBoq.totalAmount, 'Raw door material matches saved Mfg BOQ');
    assert(ord.paintCost === paintBoq.totalAmount, 'Paint BOM matches saved Painting BOQ');
    assert(ord.extraBoqCost === 150, `Extra store cost is ₹150 excluding shared FLOOR-CONSUMABLES (got ${ord.extraBoqCost})`);

    const expectedMatTotal = mfgBoq.totalAmount + expectedLockCost + paintBoq.totalAmount + 150;
    assert(ord.totalMaterialCost === expectedMatTotal, `Total materials ₹${expectedMatTotal} matches exact sum`);

    assert(ord.moldingLaborCost === 1000, `Molding piece-rate labor ₹1,000 (got ${ord.moldingLaborCost})`);
    assert(ord.paintingLaborCost === 600, `Painting piece-rate labor ₹600 (got ${ord.paintingLaborCost})`);
    assert(ord.totalLaborCost === 1600, `Actual piece-rate labor ₹1,600 (got ${ord.totalLaborCost})`);
    assert(ord.freightCost === 850 && ord.totalDirectExpenses === 850, `Freight expense ₹850 (got ${ord.totalDirectExpenses})`);

    const expectedTotalCost = expectedMatTotal + 1600 + 850;
    const expectedNetProfit = 17600 - expectedTotalCost;
    const expectedMargin = Number(((expectedNetProfit / 17600) * 100).toFixed(1));
    assert(ord.totalCost === expectedTotalCost, `Total Cost ₹${expectedTotalCost} exact`);
    assert(ord.netProfit === expectedNetProfit, `Net Profit ₹${expectedNetProfit} exact`);
    assert(ord.profitMarginPct === expectedMargin, `Margin ${expectedMargin}% exact`);

    // 7. Projected Remaining Costs Toggle (Cutting ₹100*2 + Site Fitting ₹400*2 = ₹1,000)
    const rateCard = getRateCard();
    const expectedProjLabor = 2 * rateCard.doorCutting + 2 * rateCard.siteFitting;
    const projRes = await computeOrderProfitSummaries({
      orderId: prodOrder.id,
      includeProjectedCosts: true,
    });
    const ordProj = projRes.orders[0];
    assert(
      ordProj.totalLaborCost === 1600 + expectedProjLabor,
      `Projected labor adds ₹${expectedProjLabor} for unlogged cutting & fitting (total ₹${ordProj.totalLaborCost})`
    );
    assert(
      ordProj.netProfit === expectedNetProfit - expectedProjLabor,
      'Projected net profit reduces by projected labor exactly'
    );

    // 8. Financial Report & CSV Export
    const pnlReport = await generateReport('ORDER_WISE_PROFIT_PNL');
    assert(pnlReport.rows.length === 1, 'ORDER_WISE_PROFIT_PNL report generated 1 order row');
    assert(pnlReport.rows[0].netProfit === expectedNetProfit, 'Report netProfit matches service breakdown');
    const csv = exportReportAsCsv(pnlReport);
    assert(
      csv.includes(prodOrder.jobCardNumber) && csv.includes('netProfit'),
      'CSV export contains Job Card & P&L columns'
    );

    console.log('\n✅ ALL ORDER-WISE PROFIT & P&L TESTS PASSED!\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runOrderProfitTests().catch((err) => {
  console.error('\n❌ ORDER-WISE PROFIT TEST FAILED:', err);
  process.exit(1);
});
