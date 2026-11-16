import assert from 'assert';
import {
  getRateCard,
  updateRateCard,
  getContractors,
  createContractor,
  recordPieceRateCredit,
  recordContractorPayout,
  getContractorWeeklyStatement,
} from '../lib/services/contractorService';

async function runTests() {
  console.log('--- 1. Testing Contractor Piece-Rate Master Card ---');
  const rates = getRateCard();
  console.log('Loaded rates:', rates);
  assert.strictEqual(rates.moldingDoorWithFrame, 500, 'Molding door with frame must be ₹500');
  assert.strictEqual(rates.moldingOnlyDoor, 380, 'Molding only door must be ₹380');
  assert.strictEqual(rates.moldingOnlyFrame, 125, 'Molding only frame must be ₹125');
  assert.strictEqual(rates.doorCutting, 100, 'Door cutting must be ₹100');
  assert.strictEqual(rates.frameCutting, 100, 'Frame cutting must be ₹100');
  assert.strictEqual(rates.doorGrainsWithPaint, 300, 'Door grains with paint must be ₹300');
  assert.strictEqual(rates.onlyClearCoat, 150, 'Only clear coat must be ₹150');
  assert.strictEqual(rates.twoSidePaint, 500, 'Two side paint must be ₹500');
  assert.strictEqual(rates.siteFitting, 400, 'Site fitting must be ₹400');
  console.log('✓ All 9 configured piece rates match user specification perfectly.');

  console.log('\n--- 2. Testing Contractor Creation & Directory ---');
  const initialList = getContractors();
  assert.ok(initialList.length >= 4, 'Must have at least 4 seeded trade contractors');
  console.log(`✓ Directory active with ${initialList.length} contractors across Molding, Cutting, Painting, and Site Fitting.`);

  const newContractor = createContractor({
    name: 'Kasargod Precision Fitting Gang',
    phone: '+91 94951 88200',
    trade: 'SITE_FITTING',
    upiId: 'kasargod.fit@upi',
  });
  assert.ok(newContractor.id.startsWith('CTR-'), 'Contractor ID must be formatted');
  assert.strictEqual(newContractor.trade, 'SITE_FITTING');
  console.log(`✓ Created new contractor: ${newContractor.name} (${newContractor.id})`);

  console.log('\n--- 3. Testing Piece-Rate Work Crediting ---');
  const work1 = recordPieceRateCredit({
    contractorId: newContractor.id,
    orderId: 'ORD-TEST-001',
    orderNumber: 'SO-2026-901',
    doorId: 'EXM-DR-2026-9011',
    doorNumber: 'D1 - Main Entrance',
    doorModel: 'Heritage Embossed Teak',
    operation: 'SITE_FITTING',
    quantity: 5,
  });
  assert.strictEqual(work1.unitRate, 400, 'Site fitting piece rate must be ₹400');
  assert.strictEqual(work1.totalAmount, 2000, '5 doors @ ₹400 = ₹2,000');
  console.log('✓ 5 site fitting doors credited: ₹2,000');

  console.log('\n--- 4. Testing Contractor Disbursements & Payout Voucher ---');
  const voucher = recordContractorPayout({
    contractorId: newContractor.id,
    amount: 1500,
    paymentMode: 'UPI',
    referenceNumber: 'UPI-4310928812',
    notes: 'Weekly advance payout',
  });
  assert.ok(voucher.voucherNumber.startsWith('VCHR-'), 'Voucher must have number');
  assert.strictEqual(voucher.amount, 1500);
  console.log(`✓ Payout voucher ${voucher.voucherNumber} recorded: ₹1,500 via ${voucher.paymentMode}`);

  console.log('\n--- 5. Testing Weekly Work Report & Balance Reconciliation ---');
  const statement = getContractorWeeklyStatement(newContractor.id);
  console.log('Statement totals:', {
    doors: statement.totalDoorsInPeriod,
    earned: statement.totalEarnedInPeriod,
    paid: statement.totalPaidInPeriod,
    closingBalance: statement.closingBalance,
  });
  assert.strictEqual(statement.totalDoorsInPeriod, 5);
  assert.strictEqual(statement.totalEarnedInPeriod, 2000);
  assert.strictEqual(statement.totalPaidInPeriod, 1500);
  assert.strictEqual(statement.closingBalance, 500, 'Closing balance must be ₹500 (₹2000 earned - ₹1500 paid)');
  console.log('✓ Weekly work report and statement balance reconciled accurately!');

  console.log('\n🎉 ALL CONTRACTOR WORKFLOW TESTS PASSED 100%!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
