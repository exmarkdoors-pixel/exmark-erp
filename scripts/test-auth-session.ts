import fs from 'fs';
import os from 'os';
import path from 'path';

async function runAuthTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-auth-session-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log('===============================================================');
    console.log('EXMARK ERP: AUTHENTICATION & TERMINAL LOCKDOWN TEST SUITE');
    console.log(`Isolated Vault: ${tempDir}`);
    console.log('===============================================================');

    const [
      { authorizeRequest },
      { createSignedSessionToken, DEMO_USERS },
      { ensureUsersStore },
      { listCustomers, createCustomer },
    ] = await Promise.all([
      import('../lib/auth/authorization'),
      import('../lib/auth/session'),
      import('../lib/auth/userStore'),
      import('../lib/services/customerService'),
    ]);

    await ensureUsersStore();

    // TEST 1: Server-side authorization check with HMAC-signed Bearer token
    console.log('\n[TEST 1] Verifying server authorization with HMAC-signed Bearer token...');
    const adminUser = DEMO_USERS['director@exmarkdoors.com'];
    const token = await createSignedSessionToken({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      plantLocation: adminUser.plantLocation,
    });

    const reqWithBearer = new Request('http://localhost:4000/api/customers', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
    });

    const authResult1 = await authorizeRequest(reqWithBearer, 'customers', [
      'Super Admin',
      'Management',
      'Sales',
    ]);
    if (authResult1.errorResponse) {
      throw new Error(`Bearer auth failed: ${JSON.stringify(authResult1.errorResponse)}`);
    }
    console.log(
      `  PASSED: Authenticated user: ${authResult1.user?.name} (${authResult1.user?.role})`
    );

    // TEST 2: Unauthenticated localhost request MUST be rejected with 401 when requireLoginOnAllDevices is true
    console.log(
      '\n[TEST 2] Verifying localhost request WITHOUT token rejects cleanly (401)...'
    );
    const origAllowFallback = process.env.ALLOW_DEV_FALLBACK;
    delete process.env.ALLOW_DEV_FALLBACK;

    const reqLocalUnauth = new Request('http://localhost:4000/api/customers', {
      method: 'GET',
      headers: {
        host: 'localhost:4000',
      },
    });
    const authResult2 = await authorizeRequest(reqLocalUnauth, 'customers');
    if (origAllowFallback !== undefined) {
      process.env.ALLOW_DEV_FALLBACK = origAllowFallback;
    }

    if (!authResult2.errorResponse || authResult2.errorResponse.status !== 401) {
      throw new Error('Expected unauthenticated localhost request to be rejected with HTTP 401');
    }
    console.log('  PASSED: Unauthenticated localhost rejected with HTTP 401 (no auto Super Admin bypass).');

    // TEST 3: Customer creation workflow inside isolated tempDir
    console.log('\n[TEST 3] Creating customer in isolated database/JSON store...');
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
    console.log(
      `  PASSED: Created customer ${newCust.customerCode} - ${newCust.name} in ${newCust.town}, ${newCust.district}`
    );

    // TEST 4: Customer persistence verification
    console.log('\n[TEST 4] Verifying customer persistence in store...');
    const allCusts = await listCustomers({ search: testCustomerName });
    const found = allCusts.find((c) => c.name === testCustomerName);
    if (!found) {
      throw new Error('Saved customer could not be retrieved from store');
    }
    console.log(
      `  PASSED: Customer ${found.customerCode} successfully verified in isolated store.`
    );

    console.log('\n===============================================================');
    console.log('ALL AUTHENTICATION & TERMINAL LOCKDOWN TESTS PASSED!');
    console.log('===============================================================\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runAuthTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
