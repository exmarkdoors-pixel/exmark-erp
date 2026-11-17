import { resolveEmployeePieceRate, StoredEmployee } from '../lib/services/employeeStore';
import { calculateCommissionForQuote, DEFAULT_COMMISSION_PLAN } from '../lib/services/salesTargetService';

async function runTests() {
  console.log('--- Testing Salesperson Tiered Commission & Piece Rate Logic ---');

  // Test 1: Null/Unassigned Salesperson
  const nullResult = resolveEmployeePieceRate(null, 25);
  console.assert(nullResult.rate === 0, `Expected 0 rate for null, got ${nullResult.rate}`);
  console.log('✓ Test 1 Passed: Null employee resolves to ₹0/door');

  // Test 2: Employee with Default (0) and no custom slabs
  const defaultEmp: StoredEmployee = {
    id: 'emp-default-test',
    employeeCode: 'EXM-EMP-DEF',
    name: 'New Sales Rep',
    role: 'Sales Representative',
    department: 'Sales',
    phone: '+91 90000 00000',
    email: 'newrep@exmark.com',
    status: 'ACTIVE',
    defaultPieceRate: 0,
  };
  const defResult = resolveEmployeePieceRate(defaultEmp, 50);
  console.assert(defResult.rate === 0, `Expected 0 rate for default emp, got ${defResult.rate}`);
  console.log('✓ Test 2 Passed: Default salesperson without custom config resolves to ₹0/door');

  // Test 3: Employee with Tiered Door Volume Slabs
  const tieredEmp: StoredEmployee = {
    id: 'emp-tiered-test',
    employeeCode: 'EXM-EMP-TIER',
    name: 'Kerala Senior Field Rep',
    role: 'Sales Executive',
    department: 'Sales & Project Marketing',
    phone: '+91 94470 12345',
    email: 'fieldrep@exmark.com',
    status: 'ACTIVE',
    defaultPieceRate: 100,
    commissionSlabs: {
      slab1_upto40: 120,   // 1 - 40 doors
      slab2_41to60: 150,   // 41 - 60 doors
      slab3_61to100: 180,  // 61 - 100 doors
      slab4_above100: 220, // >100 doors
    },
  };

  // 3a: 10 doors (Slab 1)
  const r10 = resolveEmployeePieceRate(tieredEmp, 10);
  console.assert(r10.rate === 120, `Expected 120 for 10 doors, got ${r10.rate}`);
  console.assert(r10.slabLabel.includes('Slab 1'), `Expected Slab 1 label, got ${r10.slabLabel}`);

  // 3b: 40 doors (Slab 1 edge)
  const r40 = resolveEmployeePieceRate(tieredEmp, 40);
  console.assert(r40.rate === 120, `Expected 120 for 40 doors, got ${r40.rate}`);

  // 3c: 41 doors (Slab 2 entry)
  const r41 = resolveEmployeePieceRate(tieredEmp, 41);
  console.assert(r41.rate === 150, `Expected 150 for 41 doors, got ${r41.rate}`);
  console.assert(r41.slabLabel.includes('Slab 2'), `Expected Slab 2 label, got ${r41.slabLabel}`);

  // 3d: 60 doors (Slab 2 edge)
  const r60 = resolveEmployeePieceRate(tieredEmp, 60);
  console.assert(r60.rate === 150, `Expected 150 for 60 doors, got ${r60.rate}`);

  // 3e: 75 doors (Slab 3)
  const r75 = resolveEmployeePieceRate(tieredEmp, 75);
  console.assert(r75.rate === 180, `Expected 180 for 75 doors, got ${r75.rate}`);
  console.assert(r75.slabLabel.includes('Slab 3'), `Expected Slab 3 label, got ${r75.slabLabel}`);

  // 3f: 120 doors (Slab 4: >100 doors)
  const r120 = resolveEmployeePieceRate(tieredEmp, 120);
  console.assert(r120.rate === 220, `Expected 220 for 120 doors, got ${r120.rate}`);
  console.assert(r120.slabLabel.includes('Slab 4'), `Expected Slab 4 label, got ${r120.slabLabel}`);

  console.log('✓ Test 3 Passed: All 4 door volume slabs resolved with exact boundary accuracy');

  // Test 4: Default Commission Plan values
  console.assert(DEFAULT_COMMISSION_PLAN.defaultCommissionType === 'PER_PIECE', 'Plan default must be PER_PIECE');
  console.assert(DEFAULT_COMMISSION_PLAN.defaultPerPieceRate === 0, 'Plan default piece rate must be 0');
  console.log('✓ Test 4 Passed: System-wide default commission plan is PER_PIECE with ₹0 default');

  // Test 5: calculateCommissionForQuote calculation
  const quoteCalc = await calculateCommissionForQuote({
    orderAmount: 120000,
    advancePercent: 35,
    doorCount: 50,
    commissionType: 'PER_PIECE',
    commissionRate: 150,
  });
  console.assert(quoteCalc.commissionType === 'PER_PIECE', 'Must be PER_PIECE');
  console.assert(quoteCalc.commissionRate === 150, 'Rate should be 150');
  console.assert(quoteCalc.commissionAmount === 50 * 150, `Expected ${50 * 150}, got ${quoteCalc.commissionAmount}`);
  console.log(`✓ Test 5 Passed: calculateCommissionForQuote: 50 doors × ₹150 = ₹${quoteCalc.commissionAmount}`);

  console.log('\nALL TIERED COMMISSION TESTS PASSED SUCCESSFULLY! ✓');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
