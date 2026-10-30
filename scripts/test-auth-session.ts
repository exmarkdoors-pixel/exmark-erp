import { authorizeRequest } from '../lib/auth/authorization';
import { listCustomers, createCustomer } from '../lib/services/customerService';
import { NextRequest } from 'next/server';

async function runAuthTests() {
  console.log('===============================================================');
  console.log('🔒 EXMARK ERP: AUTHENTICATION & CUSTOMER CREATION TEST SUITE');
  console.log('===============================================================');

  // TEST 1: Server-side authorization check with Bearer token
  console.log('\n[TEST 1] Verifying server authorization with Bearer token...');
  const testUser = {
    id: 'usr-admin-01',
    name: 'Nazer Karumban',
    email: 'director@exmarkdoors.com',
    role: 'Super Admin',
    plantLocation: 'Central Manufacturing Plant',
    issuedAt: Date.now(),
  };
  const token = Buffer.from(JSON.stringify(testUser)).toString('base64');
  const reqWithBearer = new Request('http://localhost:3000/api/customers', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });

  const authResult1 = await authorizeRequest(reqWithBearer, 'customers', ['Super Admin', 'Management', 'Sales']);
  if (authResult1.errorResponse) {
    throw new Error(`Bearer auth failed: ${JSON.stringify(authResult1.errorResponse)}`);
  }
  console.log(`  ✅ PASSED: Authenticated user: ${authResult1.user?.name} (${authResult1.user?.role})`);

  // TEST 2: Localhost auto-authentication check
  console.log('\n[TEST 2] Verifying localhost workstation auto-authentication...');
  const reqLocal = new Request('http://localhost:3000/api/customers', {
    method: 'GET',
    headers: {
      'host': 'localhost:3000',
    },
  });
  const authResult2 = await authorizeRequest(reqLocal, 'customers');
  if (authResult2.errorResponse) {
    throw new Error('Localhost auto-auth failed');
  }
  console.log(`  ✅ PASSED: Local workstation authorized as: ${authResult2.user?.name} (${authResult2.user?.role})`);

  // TEST 3: Customer creation workflow
  console.log('\n[TEST 3] Creating customer in persistent database/JSON store...');
  const testCustomerName = `Auto Test Customer ${Date.now()}`;
  const newCust = await createCustomer({
    name: testCustomerName,
    firmName: 'Malabar Doors & Interiors',
    type: 'DEALER',
    district: 'Kozhikode',
    town: 'Feroke',
    phone: '+91 94470 99887',
    email: 'test.dealer@exmarkdoors.com',
    creditLimit: 250000,
    outstandingBalance: 0,
    status: 'ACTIVE',
  });

  if (!newCust || !newCust.id || newCust.name !== testCustomerName) {
    throw new Error('Customer creation returned invalid data');
  }
  console.log(`  ✅ PASSED: Created customer ${newCust.customerCode} - ${newCust.name} in ${newCust.town}, ${newCust.district}`);

  // TEST 4: Customer persistence verification
  console.log('\n[TEST 4] Verifying customer persistence in store...');
  const allCusts = await listCustomers({ search: testCustomerName });
  const found = allCusts.find((c) => c.name === testCustomerName);
  if (!found) {
    throw new Error('Saved customer could not be retrieved from store');
  }
  console.log(`  ✅ PASSED: Customer ${found.customerCode} successfully verified in persistent store.`);

  console.log('\n===============================================================');
  console.log('🎉 ALL AUTHENTICATION & CUSTOMER CREATION TESTS PASSED!');
  console.log('===============================================================\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
