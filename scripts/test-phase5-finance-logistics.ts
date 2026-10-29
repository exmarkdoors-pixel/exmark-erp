import {
  listInvoices,
  createInvoice,
  recordPayment,
  listFinancialTargets,
  createFinancialTarget,
  calculateBreakEven,
} from '../lib/services/financeService';

import {
  listDispatches,
  createDispatch,
  updateDispatchStatus,
  listInstallations,
  createInstallation,
  completeInstallationSignoff,
  generateWarrantyCertificate,
  listWarranties,
} from '../lib/services/fulfillmentService';

import { runAiStrategistAnalysis } from '../lib/services/aiStrategistService';

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

async function runPhase5Tests() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — Phase 5: Finance, Logistics & 15-Year Warranty Suite     ');
  console.log('========================================================================\n');

  try {
    // ── 1. TAX INVOICING & GST ENGINE ─────────────────────────────────────────
    console.log('--- 1. GST TAX INVOICING & AUTOMATED SETTLEMENT ---');
    const invoice = await createInvoice({
      customerId: 'cust-ph5-test-01',
      customerName: 'Sobha City Thrissur Project',
      subtotal: 200000,
      dueDate: '2026-11-30',
    });

    assert(Boolean(invoice.id), 'Tax invoice created with unique ID');
    assert(invoice.invoiceNumber.startsWith('INV-2026-'), 'Invoice number follows INV-2026-NNN format');
    assert(invoice.cgst === 18000, 'CGST is 9% (₹18,000)');
    assert(invoice.sgst === 18000, 'SGST is 9% (₹18,000)');
    assert(invoice.totalAmount === 236000, 'Total is Subtotal + CGST + SGST (₹2,36,000)');
    assert(invoice.balanceAmount === 236000, 'Initial balance equals total amount');
    assert(invoice.status === 'ISSUED', 'Initial invoice status is ISSUED');

    // Partial Payment
    const partPay = await recordPayment({
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: 100000,
      paymentMode: 'NEFT',
      referenceNumber: 'NEFT9908122',
    });

    assert(partPay.receiptNumber.startsWith('RCT-2026-'), 'Payment receipt generated (RCT-2026-NNN)');
    const invAfterPart = (await listInvoices()).find((i) => i.id === invoice.id);
    assert(invAfterPart?.paidAmount === 100000, 'Paid amount updated to ₹1,00,000');
    assert(invAfterPart?.balanceAmount === 136000, 'Balance reduced to ₹1,36,000');
    assert(invAfterPart?.status === 'ISSUED', 'Status remains ISSUED while balance > 0');

    // Final Settlement Payment
    await recordPayment({
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: 136000,
      paymentMode: 'RTGS',
      referenceNumber: 'RTGS9908123',
    });

    const invAfterFull = (await listInvoices()).find((i) => i.id === invoice.id);
    assert(invAfterFull?.balanceAmount === 0, 'Balance reaches ₹0 on full settlement');
    assert(invAfterFull?.status === 'PAID', 'Invoice status automatically flips to PAID');

    // ── 2. FINANCIAL TARGETS & BREAK-EVEN ANALYSIS ─────────────────────────────
    console.log('\n--- 2. TARGETS & BREAK-EVEN CALCULATION ---');
    const target = await createFinancialTarget({
      targetPeriod: '2026-11',
      salesRevenueTarget: 3500000,
      collectionsTarget: 3200000,
      frpDoorQuantityTarget: 420,
    });

    assert(target.targetPeriod === '2026-11', 'Target created for 2026-11');
    assert(target.status === 'APPROVED', 'Target status is APPROVED');

    const breakEven = calculateBreakEven({
      fixedOverheadCosts: 450000,
      averageFRPPricePerDoor: 8500,
      variableCostPerDoor: 4800,
      targetSalesRevenue: 3500000,
    });

    assert(breakEven.contributionMarginPerDoor === 3700, 'Contribution Margin is ₹3,700 per FRP door');
    assert(breakEven.breakEvenUnits === 122, 'Break-even volume calculated at 122 doors/month');
    assert(breakEven.marginOfSafetyPercentage > 50, 'Margin of Safety exceeds 50% on targeted revenue');

    // ── 3. FLEET DISPATCH & DELIVERY CHALLAN ───────────────────────────────────
    console.log('\n--- 3. LOGISTICS DISPATCH & CHALLAN ---');
    const dispatch = await createDispatch({
      customerName: 'Sobha City Thrissur Project',
      destinationAddress: 'Sobha City Tower 4, Puzhakkal, Thrissur',
      deliveryDistrict: 'Thrissur',
      vehicleNumber: 'KL-08-BQ-9102',
      driverName: 'Suresh Kumar',
      driverPhone: '9847055443',
      doorCount: 24,
      eWayBillNo: 'EWB-2026-8877112',
    });

    assert(Boolean(dispatch.id), 'Dispatch record created with unique ID');
    assert(dispatch.dispatchNumber.startsWith('DSP-2026-'), 'Dispatch number follows DSP-2026-NNN format');
    assert(dispatch.status === 'SCHEDULED', 'Initial dispatch status is SCHEDULED');

    const inTransit = await updateDispatchStatus(dispatch.id, 'IN_TRANSIT');
    assert(inTransit.status === 'IN_TRANSIT', 'Dispatch status updated to IN_TRANSIT');

    const delivered = await updateDispatchStatus(dispatch.id, 'DELIVERED');
    assert(delivered.status === 'DELIVERED', 'Dispatch status updated to DELIVERED');

    // ── 4. SITE INSTALLATION & 5-STAR SIGNOFF ──────────────────────────────────
    console.log('\n--- 4. SITE INSTALLATION & 5-STAR SIGNOFF ---');
    const installation = await createInstallation({
      dispatchId: dispatch.id,
      customerName: 'Sobha City Thrissur Project',
      siteAddress: 'Sobha City Tower 4, Puzhakkal, Thrissur',
      district: 'Thrissur',
      supervisorName: 'M. Shaji (Senior Installation Tech)',
      scheduledDate: '2026-11-05',
      doorCount: 24,
    });

    assert(Boolean(installation.id), 'Installation scheduled with unique ID');
    assert(installation.installationNumber.startsWith('INS-2026-'), 'Installation follows INS-2026-NNN format');
    assert(installation.status === 'PENDING', 'Initial installation status is PENDING');

    const signedOff = await completeInstallationSignoff({
      id: installation.id,
      clientSignoffName: 'Ar. Deepa Menon (Project Architect)',
      feedbackRating: 5,
      remarks: 'Perfect fitment, smooth acoustic closure and flawless finish.',
    });

    assert(signedOff.status === 'QUALITY_APPROVED', 'Installation status updated to QUALITY_APPROVED');
    assert(signedOff.clientFeedbackRating === 5, 'Client 5-star rating recorded');
    assert(Boolean(signedOff.completedDate), 'Signoff completion date recorded');

    // ── 5. 15-YEAR FRP MATERIAL WARRANTY CERTIFICATE ───────────────────────────
    console.log('\n--- 5. 15-YEAR FRP MATERIAL WARRANTY CERTIFICATE ---');
    const warranty = await generateWarrantyCertificate({
      customerName: 'Sobha City Thrissur Project',
      siteAddress: 'Sobha City Tower 4, Puzhakkal, Thrissur',
      district: 'Thrissur',
      warrantyPeriodYears: 15,
      coveredDoors: [
        { doorId: 'EXM-DR-2026-101', model: '32mm Molded Teak FRP Door', sizeMm: '2088 x 890 mm' },
        { doorId: 'EXM-DR-2026-102', model: '30mm Waterproof Solid Bathroom FRP Door', sizeMm: '2038 x 790 mm' },
      ],
    });

    assert(Boolean(warranty.certificateNumber), 'Warranty certificate issued with serial number');
    assert(warranty.certificateNumber.startsWith('EXM-WRN-2026-'), 'Certificate number follows EXM-WRN-2026-XXXX format');
    assert(warranty.warrantyPeriodYears === 15, 'Warranty term is exactly 15 Years');
    assert(warranty.coveredDoors.length === 2, '2 doors covered under warranty certificate');

    // Verify Mandatory Exclusions
    const exclusions = warranty.explicitExclusions.join(' ');
    assert(exclusions.includes('Hinges'), 'Exclusions explicitly include Hinges');
    assert(exclusions.includes('Locks'), 'Exclusions explicitly include Locks');
    assert(exclusions.includes('Handles'), 'Exclusions explicitly include Handles');
    assert(exclusions.includes('PU Paints'), 'Exclusions explicitly include Surface PU Paints');

    // Verify Bilingual Care Guidance
    assert(warranty.bilingualCareInstructions.english.length >= 3, 'Contains English care guidelines');
    assert(warranty.bilingualCareInstructions.malayalam.length >= 3, 'Contains Malayalam care guidelines (മലയാളം)');
    assert(
      warranty.bilingualCareInstructions.malayalam.some((m) => m.includes('സോപ്പ്')),
      'Malayalam guidance includes soap-water cleaning instructions'
    );

    // ── 6. AI FINANCIAL STRATEGIST ENGINE ──────────────────────────────────────
    console.log('\n--- 6. AI FINANCIAL STRATEGIST & READ-ONLY GOVERNANCE ---');
    const strategist = await runAiStrategistAnalysis();

    assert(typeof strategist.financialHealthScore === 'number', 'Financial health score computed');
    assert(strategist.financialHealthScore >= 0 && strategist.financialHealthScore <= 100, 'Score is in valid 0-100 range');
    assert(strategist.scenarios.length === 3, '3 forecast scenarios modeled (Conservative, Base, Expansion)');

    // Strict Governance Checks
    assert(strategist.governanceSummary.canExecutePayments === false, 'GOVERNANCE: Cannot execute payments');
    assert(strategist.governanceSummary.canAlterLedger === false, 'GOVERNANCE: Cannot alter ledger');
    assert(strategist.governanceSummary.requiresExecutiveApproval === true, 'GOVERNANCE: Requires executive sign-off');

    console.log('\n========================================================================');
    console.log(`  Phase 5 Suite Results: ${passed} PASSED / ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPhase5Tests();
