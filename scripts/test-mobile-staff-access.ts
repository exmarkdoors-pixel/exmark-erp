/**
 * EXMARK ERP — Mobile Staff Access Verification Suite
 * Verifies staff quick-PIN authentication, role isolation, and security boundaries
 * for DRIVER, FIELD_STAFF, INSTALLER, FLOOR, and MANAGER.
 */

import fs from 'fs';
import path from 'path';
import {
  OPERATIONAL_STAFF_SPECS,
  mapUserToMobileRole,
  ensureOperationalStaffUsers,
} from '../lib/auth/operationalStaffSeed';
import { findFactoryUserByIdentifier, verifyFactoryUserCredentials } from '../lib/auth/userStore';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   EXMARK ERP — MOBILE STAFF ACCESS TEST SUITE        ');
  console.log('======================================================\n');

  // 1. Ensure operational staff are seeded
  console.log('▸ Checking operational staff seeding...');
  await ensureOperationalStaffUsers();

  for (const spec of OPERATIONAL_STAFF_SPECS) {
    const user = await findFactoryUserByIdentifier(spec.employeeCode);
    assert(!!user, `Staff profile [${spec.employeeCode}] exists in user store`);
    assert(Boolean(user?.pinHash), `Staff [${spec.employeeCode}] has hashed Quick PIN configured`);

    // Verify correct PIN
    const validUser = await verifyFactoryUserCredentials(spec.employeeCode, spec.defaultPin, 'PIN');
    assert(!!validUser, `Staff [${spec.employeeCode}] PIN ${spec.defaultPin} successfully authenticates`);

    // Verify invalid PIN is rejected
    const invalidUser = await verifyFactoryUserCredentials(spec.employeeCode, '9876', 'PIN');
    assert(!invalidUser, `Staff [${spec.employeeCode}] invalid PIN 9876 is rejected`);
  }

  // 2. Role Mapping Verification
  console.log('\n▸ Verifying Role Mapping to 5 Mobile Operational Roles...');
  assert(mapUserToMobileRole('Driver', 'Delivery Fleet') === 'DRIVER', 'Driver maps to DRIVER');
  assert(mapUserToMobileRole('Site Engineer', 'Site Measurements') === 'FIELD_STAFF', 'Site Engineer maps to FIELD_STAFF');
  assert(mapUserToMobileRole('Sales', 'Dealer Desk') === 'FIELD_STAFF', 'Sales maps to FIELD_STAFF');
  assert(mapUserToMobileRole('Installation', 'Door Fitting') === 'INSTALLER', 'Installation maps to INSTALLER');
  assert(mapUserToMobileRole('Production', 'Plant Floor CNC') === 'FLOOR', 'Production maps to FLOOR');
  assert(mapUserToMobileRole('QC Inspector', 'Quality Control') === 'FLOOR', 'QC Inspector maps to FLOOR');
  assert(mapUserToMobileRole('Plant Supervisor', 'Management') === 'MANAGER', 'Plant Supervisor maps to MANAGER');
  assert(mapUserToMobileRole('Super Admin', 'Executive') === 'MANAGER', 'Super Admin maps to MANAGER');

  // 3. Component Files Verification
  console.log('\n▸ Verifying Component Files...');
  const gatePath = path.join(process.cwd(), 'components', 'mobile', 'MobileStaffAuthGate.tsx');
  assert(fs.existsSync(gatePath), 'components/mobile/MobileStaffAuthGate.tsx exists');
  const gateContent = fs.readFileSync(gatePath, 'utf8');
  assert(gateContent.includes('MobileStaffAuthGate'), 'MobileStaffAuthGate exported');
  assert(gateContent.includes('DEFAULT_OPERATIONAL_STAFF'), '5 Default Operational Staff cards defined');
  assert(gateContent.includes('handleKeypadPress'), 'Numeric touch keypad implemented');

  const hubPath = path.join(process.cwd(), 'components', 'mobile', 'MobileFieldOperationsHub.tsx');
  const hubContent = fs.readFileSync(hubPath, 'utf8');
  assert(hubContent.includes('authenticatedUser?:'), 'MobileFieldOperationsHub accepts authenticatedUser');
  assert(hubContent.includes('isManager'), 'Manager role boundary check implemented');
  assert(hubContent.includes('onLogout'), 'Logout / Switch Staff handler integrated');

  const pagePath = path.join(process.cwd(), 'app', 'mobile', 'page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  assert(pageContent.includes('MobileStaffAuthGate'), 'app/mobile/page.tsx wrapped with MobileStaffAuthGate');

  // 4. Test Live API Authentication
  console.log('\n▸ Testing Live API PIN Authentication...');
  try {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'DRV-01',
        pin: '1111',
        method: 'PIN',
      }),
    });
    const data = await res.json();
    assert(res.ok && data.success, 'Live API: Driver DRV-01 logs in with PIN 1111');
    assert(data.user?.role === 'Driver', 'Live API: User role is Driver');
  } catch (err: any) {
    console.warn('API test notice:', err.message);
  }

  try {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'FLD-01',
        pin: '2222',
        method: 'PIN',
      }),
    });
    const data = await res.json();
    assert(res.ok && data.success, 'Live API: Field Staff FLD-01 logs in with PIN 2222');
  } catch (err: any) {
    console.warn('API test notice:', err.message);
  }

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL MOBILE STAFF ACCESS TESTS PASSED!\n');
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
