import {
  listInvoices,
  createInvoice,
  listPayments,
  recordPayment,
  listFinancialTargets,
  createFinancialTarget,
  calculateBreakEven,
} from '../lib/services/financeService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  EXMARK ERP — Phase 4 Finance & Strategist Suite   ');
  console.log('====================================================\n');

  try {
    // 1. Invoices
    console.log('--- INVOICES & GST ENGINE TESTS ---');
    const invoices = await listInvoices();
    assert(Array.isArray(invoices), 'listInvoices returns array');

    const createdInv = await createInvoice({
      customerId: 'cust-test-01',
      customerName: 'Kochi Waterfront Builders',
      subtotal: 100000,
    });

    assert(createdInv.invoiceNumber.startsWith('INV-2026-'), 'Assigns INV-2026-NNN format');
    // 100,000 subtotal -> CGST 9% = 9,000, SGST 9% = 9,000 -> Total = 118,000
    assert(createdInv.cgst === 9000, 'CGST is exactly 9% of subtotal (₹9,000)');
    assert(createdInv.sgst === 9000, 'SGST is exactly 9% of subtotal (₹9,000)');
    assert(createdInv.totalAmount === 118000, 'Total is Subtotal + CGST + SGST (₹1,18,000)');
    assert(createdInv.balanceAmount === 118000, 'Initial balance equals total amount');
    assert(createdInv.status === 'ISSUED', 'Initial status is ISSUED');

    // 2. Payments & Auto-Settlement
    console.log('\n--- PAYMENTS & RECEIPT TESTS ---');
    const partPayment = await recordPayment({
      invoiceId: createdInv.id,
      customerId: createdInv.customerId,
      customerName: createdInv.customerName,
      amount: 50000,
      paymentMode: 'NEFT',
      referenceNumber: 'NEFT990182',
    });

    assert(partPayment.receiptNumber.startsWith('RCT-2026-'), 'Assigns RCT-2026-NNN receipt number');
    
    // Check updated invoice
    const invAfterPart = (await listInvoices()).find((i) => i.id === createdInv.id);
    assert(invAfterPart?.paidAmount === 50000, 'Paid amount updated to ₹50,000');
    assert(invAfterPart?.balanceAmount === 68000, 'Balance updated to ₹68,000 (118,000 - 50,000)');
    assert(invAfterPart?.status === 'ISSUED', 'Status remains ISSUED while balance > 0');

    // Full settlement
    await recordPayment({
      invoiceId: createdInv.id,
      customerId: createdInv.customerId,
      customerName: createdInv.customerName,
      amount: 68000,
      paymentMode: 'RTGS',
      referenceNumber: 'RTGS990183',
    });

    const invAfterFull = (await listInvoices()).find((i) => i.id === createdInv.id);
    assert(invAfterFull?.balanceAmount === 0, 'Balance reaches ₹0 on full settlement');
    assert(invAfterFull?.status === 'PAID', 'Status automatically updates to PAID');

    // 3. Financial Targets
    console.log('\n--- FINANCIAL TARGET WORKFLOW TESTS ---');
    const targets = await listFinancialTargets();
    assert(Array.isArray(targets), 'listFinancialTargets returns array');

    const newTarget = await createFinancialTarget({
      targetPeriod: '2026-11',
      salesRevenueTarget: 3200000,
      collectionsTarget: 2900000,
      frpDoorQuantityTarget: 400,
    });

    assert(newTarget.targetPeriod === '2026-11', 'Target created for period 2026-11');
    assert(newTarget.frpDoorQuantityTarget === 400, 'Door target is 400 units');
    assert(newTarget.status === 'APPROVED', 'Target status is APPROVED');

    // 4. Break-Even Analysis Engine
    console.log('\n--- BREAK-EVEN CALCULATOR TESTS ---');
    const be = calculateBreakEven({
      fixedOverheadCosts: 450000,
      averageFRPPricePerDoor: 8500,
      variableCostPerDoor: 4800,
      targetSalesRevenue: 2500000,
    });

    // CM = 8500 - 4800 = 3700
    assert(be.contributionMarginPerDoor === 3700, 'Contribution Margin = 8500 - 4800 = ₹3,700/Door');
    // Break-even units = 450,000 / 3,700 = 121.62 -> 122 doors
    assert(be.breakEvenUnits === 122, 'Break-even units is 122 doors');
    // Margin of safety = (2,500,000 - 1,033,770) / 2,500,000 * 100 = ~58.6%
    assert(be.marginOfSafetyPercentage > 50, 'Margin of Safety is positive and above 50%');
    assert(!!be.formulaDetails.cmPerDoor, 'Formula details include Contribution Margin definition');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
