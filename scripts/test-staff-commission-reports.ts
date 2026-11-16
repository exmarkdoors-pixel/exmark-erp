import assert from 'assert';
import {
  calculateCommissionForQuote,
  updateQuotationCommissionOverride,
  updateStaffCommissionScheme,
  getStaffOrderReport,
} from '../lib/services/salesTargetService';
import { listQuotations } from '../lib/services/quotationService';

async function runTests() {
  console.log('🧪 Starting Staff Commission, Order Reports & Target Expansion Tests...');

  // 1. Commission Calculation Test - PERCENTAGE mode
  console.log('\n--- 1. Testing Percentage Commission Model ---');
  const pctResult = await calculateCommissionForQuote({
    salespersonId: 'emp-001',
    quotationId: 'Q-TEST-001',
    orderAmount: 100000,
    doorsCount: 10,
    advancePercent: 50,
    commissionType: 'PERCENTAGE',
    commissionRate: 3.0,
  });
  console.log('Percentage result:', pctResult);
  assert.strictEqual(pctResult.commissionType, 'PERCENTAGE');
  assert.strictEqual(pctResult.commissionRate, 3.0);
  // Base 3.0% of 1,00,000 = 3,000. Advance bonus 0.5% (>= 50%) = 500. Total = 3,500.
  assert.strictEqual(pctResult.breakdown.baseAmount, 3000);
  assert.strictEqual(pctResult.breakdown.bonusAmount, 500);
  assert.strictEqual(pctResult.commissionAmount, 3500);
  console.log('✅ Percentage commission calculation verified!');

  // 2. Commission Calculation Test - PER_PIECE mode
  console.log('\n--- 2. Testing Per Piece (₹/door) Commission Model ---');
  const pieceResult = await calculateCommissionForQuote({
    salespersonId: 'emp-001',
    quotationId: 'Q-TEST-002',
    orderAmount: 150000,
    doorsCount: 20,
    advancePercent: 50,
    commissionType: 'PER_PIECE',
    commissionRate: 200,
  });
  console.log('Per piece result:', pieceResult);
  assert.strictEqual(pieceResult.commissionType, 'PER_PIECE');
  assert.strictEqual(pieceResult.commissionRate, 200);
  // Base 20 doors * ₹200 = 4,000. Advance bonus ₹25 * 20 = 500. Total = 4,500.
  assert.strictEqual(pieceResult.breakdown.baseAmount, 4000);
  assert.strictEqual(pieceResult.breakdown.bonusAmount, 500);
  assert.strictEqual(pieceResult.commissionAmount, 4500);
  console.log('✅ Per piece (₹/door) commission calculation verified!');

  // 3. Test Quotation Commission Override
  console.log('\n--- 3. Testing Commission Override on Quotation ---');
  const quotes = await listQuotations();
  if (quotes.length > 0) {
    const targetQuote = quotes[0];
    const res = await updateQuotationCommissionOverride(
      targetQuote.id,
      'PER_PIECE',
      250,
      'Custom project piece rate negotiated'
    );
    console.log(`Updated Quote ${targetQuote.id} commission:`, {
      type: res.updatedQuotation?.commissionType,
      rate: res.updatedQuotation?.commissionRate,
      amount: res.updatedQuotation?.commissionAmount,
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.updatedQuotation?.commissionType, 'PER_PIECE');
    assert.strictEqual(res.updatedQuotation?.commissionRate, 250);
    assert(res.updatedQuotation?.commissionAmount! > 0);
    console.log('✅ Quotation commission override saved and recomputed!');
  }

  // 4. Test Staff Commission Scheme Update
  console.log('\n--- 4. Testing Staff Default Commission Scheme Update ---');
  const staffScheme = await updateStaffCommissionScheme(
    'emp-001',
    'PER_PIECE',
    175
  );
  console.log('Staff Scheme Updated:', staffScheme);
  assert.strictEqual(staffScheme.success, true);
  assert.strictEqual(staffScheme.target?.commissionType, 'PER_PIECE');
  assert.strictEqual(staffScheme.target?.commissionRate, 175);
  console.log('✅ Staff default commission scheme updated!');
  console.log('✅ Staff default commission scheme updated!');

  // 5. Test Staff Order Reports
  console.log('\n--- 5. Testing Staff Order Reports (Daily, Weekly, Monthly & All Staff) ---');

  // 5a. Monthly Report (All Staff)
  const monthlyReport = await getStaffOrderReport({
    frequency: 'MONTHLY',
    salespersonId: 'ALL',
    month: '2026-11',
  });
  console.log(`Monthly All-Staff: ${monthlyReport.summary.totalOrders} orders, ₹${monthlyReport.summary.totalRevenue} revenue, ₹${monthlyReport.summary.totalCommission} commission, ${monthlyReport.allStaffComparative.length} staff ranked`);
  assert(monthlyReport.periodLabel.includes('Monthly'));
  assert(Array.isArray(monthlyReport.allStaffComparative));

  // 5b. Weekly Report (Specific Staff)
  const weeklyReport = await getStaffOrderReport({
    frequency: 'WEEKLY',
    salespersonId: 'ALL',
  });
  console.log(`Weekly Report: ${weeklyReport.summary.totalOrders} orders in current 7 days`);
  assert(weeklyReport.periodLabel.includes('Weekly'));

  // 5c. Daily Report
  const dailyReport = await getStaffOrderReport({
    frequency: 'DAILY',
    salespersonId: 'ALL',
    date: '2026-11-15',
  });
  console.log(`Daily Report: ${dailyReport.summary.totalOrders} orders on 2026-11-15`);
  assert(dailyReport.periodLabel.includes('Daily'));

  console.log('\n🎉 ALL STAFF COMMISSION & ORDER REPORT TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
