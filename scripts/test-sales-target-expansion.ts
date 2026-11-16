import {
  listStaffTargets,
  updateStaffTarget,
  calculateCommissionForQuote,
  accrueCommissionForQuotation,
  listCommissions,
  payoutCommissions,
  listTerritoryExpansion,
  simulateTerritoryExpansion,
  listMarketingCampaigns,
  createMarketingCampaign,
} from '../lib/services/salesTargetService';

async function runTestSuite() {
  console.log('--- STARTING SALES TARGET & EXPANSION TEST SUITE ---');

  const period = '2026-11';

  // 1. Test Targets Initialization
  console.log('\n[1] Testing Staff Sales Targets...');
  const targets = await listStaffTargets(period);
  console.log(`Found ${targets.length} targets for period ${period}.`);
  if (targets.length === 0) {
    throw new Error('Expected default targets to be initialized.');
  }
  const firstTarget = targets[0];
  console.log(`First Target: ${firstTarget.employeeName} (${firstTarget.employeeCode}) - Target Revenue: ₹${firstTarget.revenueTarget}`);

  // Update target
  const updatedTarget = await updateStaffTarget(firstTarget.employeeId, period, {
    revenueTarget: 350000,
    doorQuantityTarget: 40,
    territoryDistrict: 'Malappuram Central',
  });
  console.log(`Updated Target for ${updatedTarget.employeeName}: ₹${updatedTarget.revenueTarget}, ${updatedTarget.doorQuantityTarget} doors.`);

  // 2. Test Commission Calculation Engine
  console.log('\n[2] Testing Commission Calculation Engine...');
  const calc1 = await calculateCommissionForQuote({
    orderAmount: 100000,
    advancePercent: 50,
    doorCount: 10,
    salespersonId: firstTarget.employeeId,
    targetPeriod: period,
  });
  console.log('Commission Result (50% adv):', calc1);
  if (calc1.commissionAmount <= 0) {
    throw new Error('Commission amount should be > 0');
  }

  // 3. Test Commission Accrual on Quotation Confirmation
  console.log('\n[3] Testing Commission Accrual on Order Confirmation...');
  const qId = `QT-TEST-${Date.now().toString().slice(-4)}`;
  const quoteDummy = {
    quotationId: qId,
    quoteNumber: qId,
    customerId: 'CUST-001',
    customerName: 'Test Builder Corp',
    orderAmount: 180000,
    advancePaid: 90000,
    orderDate: '2026-11-15',
    salespersonId: firstTarget.employeeId,
    salespersonName: firstTarget.employeeName,
    salespersonCode: firstTarget.employeeCode,
    doorCount: 18,
  };

  const accruedRecord = await accrueCommissionForQuotation(quoteDummy);
  console.log('Accrued Commission Record:', accruedRecord.id, 'Amount: ₹' + accruedRecord.totalCommissionAmount, 'Status:', accruedRecord.status);
  if (accruedRecord.status !== 'ACCRUED') {
    throw new Error('Accrued record status must be ACCRUED');
  }

  // 4. Test Settle Commission Payout Batch
  console.log('\n[4] Testing Batch Commission Settlement...');
  const settlement = await payoutCommissions(
    [accruedRecord.id],
    'NEFT-TEST-2026',
    'Super Admin',
    'BANK_TRANSFER'
  );
  console.log('Settlement Result:', settlement);
  if (settlement.updatedCount !== 1) {
    throw new Error('Expected 1 settled commission record');
  }

  // Verify status in ledger
  const allComms = await listCommissions();
  const checked = allComms.find((c) => c.id === accruedRecord.id);
  console.log('Verified Commission in Store Status:', checked?.status, 'Payment Ref:', checked?.paymentRef);
  if (checked?.status !== 'PAID') {
    throw new Error('Commission status must be PAID after settlement');
  }

  // 5. Test Territory Expansion Matrix & What-If Simulation
  console.log('\n[5] Testing Territory Expansion Matrix & Simulator...');
  const territories = await listTerritoryExpansion();
  console.log(`Found ${territories.length} Kerala territory plans in store.`);
  if (territories.length < 14) {
    throw new Error('Expected all 14 Kerala districts in territory matrix');
  }

  const simResult = await simulateTerritoryExpansion({
    newSalesRepresentatives: 4,
    newDealerRacks: 20,
    targetPenetrationGrowthPercent: 20,
    averageDoorSellingPrice: 8500,
    averageDoorsPerDealerMonth: 12,
    repMonthlySalaryCost: 32000,
    rackInstallationCost: 15000,
  });
  console.log('Expansion Simulation Result:', simResult);
  if (simResult.annualizedRevenueDelta <= 0 || simResult.paybackPeriodMonths <= 0) {
    throw new Error('Simulation result values invalid');
  }

  // 6. Test Marketing Campaigns
  console.log('\n[6] Testing Marketing Campaigns...');
  const newCamp = await createMarketingCampaign({
    name: 'Kochi Architect Summit 2026',
    channel: 'ARCHITECT_OUTREACH',
    territory: 'Ernakulam & Kochi',
    budget: 65000,
    startDate: '2026-11-20',
    endDate: '2026-12-20',
  });
  console.log('Created Campaign:', newCamp.id, newCamp.name, 'Budget: ₹' + newCamp.budget);

  const camps = await listMarketingCampaigns();
  console.log(`Total active campaigns in store: ${camps.length}`);

  console.log('\n>>> ALL SALES TARGET, COMMISSION & EXPANSION TESTS PASSED SUCCESSFULLY! <<<');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
