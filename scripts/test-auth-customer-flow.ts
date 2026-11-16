/**
 * EXMARK ERP — Authentication & Customer Creation Test Suite
 * Validates:
 * 1. HMAC-signed Admin Bearer & Cookie authentication
 * 2. Unsigned forged Base64 token rejection (401)
 * 3. Unauthenticated request rejection (401)
 * 4. Unauthorized role rejection (403)
 * 5. Expired signed token rejection (401)
 * 6. Customer creation & persistence inside isolated EXMARK_DATA_DIR
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';

async function runTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-auth-customer-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log('====================================================');
    console.log('EXMARK ERP — Auth & Customer Creation Verification');
    console.log(`Isolated Data Vault: ${tempDir}`);
    console.log('====================================================\n');

    const [
      { authorizeRequest },
      { createSignedSessionToken, DEMO_USERS, SESSION_COOKIE_NAME },
      { signSessionPayload },
      { ensureUsersStore },
      { POST: createCustomerRoute, GET: listCustomerRoute },
    ] = await Promise.all([
      import('../lib/auth/authorization'),
      import('../lib/auth/session'),
      import('../lib/auth/sessionSecret'),
      import('../lib/auth/userStore'),
      import('../app/api/customers/route'),
    ]);

    await ensureUsersStore();

    let passed = 0;
    let total = 0;

    function assert(condition: boolean, desc: string) {
      total++;
      if (condition) {
        console.log(`[PASS] ${desc}`);
        passed++;
      } else {
        console.error(`[FAIL] ${desc}`);
        throw new Error(`Test assertion failed: ${desc}`);
      }
    }

    // 1. Generate valid HMAC-signed admin session token
    const adminUser = DEMO_USERS['director@exmarkdoors.com'];
    const validAdminToken = await createSignedSessionToken({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      plantLocation: adminUser.plantLocation,
    });

    // Test 1: Bearer Token Authorization
    console.log('\n--- 1. Signed Bearer Token Authorization ---');
    const bearerReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
      },
    });
    const bearerAuth = await authorizeRequest(bearerReq, 'customers', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    assert(bearerAuth.user !== null && bearerAuth.user.role === 'Super Admin', 'Admin authenticated successfully via HMAC Bearer token');
    assert(bearerAuth.errorResponse === null, 'No error response for valid HMAC Bearer token');

    // Test 2: Cookie Header Authorization (exmark_erp_session)
    console.log('\n--- 2. Signed Cookie Header Authorization ---');
    const cookieReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'GET',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${validAdminToken}; other_cookie=xyz`,
      },
    });
    const cookieAuth = await authorizeRequest(cookieReq, 'customers', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    assert(cookieAuth.user !== null && cookieAuth.user.email === 'director@exmarkdoors.com', 'Admin authenticated successfully via signed Cookie header');

    // Test 3: Forged unsigned Base64 token rejection (401)
    console.log('\n--- 3. Forged Unsigned Token Rejection ---');
    const forgedToken = Buffer.from(
      JSON.stringify({
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'Super Admin',
        issuedAt: Date.now(),
      })
    ).toString('base64');
    const forgedReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'GET',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${forgedToken}`,
      },
    });
    const forgedAuth = await authorizeRequest(forgedReq, 'customers');
    assert(forgedAuth.user === null && forgedAuth.errorResponse?.status === 401, 'Unsigned forged token rejected with HTTP 401');

    // Test 4: Unauthenticated Request Rejection (401)
    console.log('\n--- 4. Unauthenticated Request Rejection ---');
    const unauthReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hacker Customer' }),
    });
    const unauthRes = await createCustomerRoute(unauthReq);
    const unauthJson = await unauthRes.json();
    assert(unauthRes.status === 401, 'Unauthenticated customer creation returns HTTP 401');
    assert(String(unauthJson.error || '').includes('Authentication required'), 'Returns "Authentication required" message');

    // Test 5: Unauthorized Role Rejection (403)
    console.log('\n--- 5. Unauthorized Role Rejection (RBAC) ---');
    const prodUser = DEMO_USERS['plant@exmarkdoors.com']; // Production role
    const prodToken = await createSignedSessionToken({
      id: prodUser.id,
      name: prodUser.name,
      email: prodUser.email,
      role: prodUser.role,
      plantLocation: prodUser.plantLocation,
    });

    const prodReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${prodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Unauthorized Attempt Customer',
        type: 'DEALER',
        district: 'Palakkad',
        town: 'Palakkad',
        phone: '+91 94470 00000',
      }),
    });
    const prodRes = await createCustomerRoute(prodReq);
    const prodJson = await prodRes.json();
    assert(prodRes.status === 403, 'Unauthorized Production role customer creation returns HTTP 403 Forbidden');
    assert(String(prodJson.error || '').includes('Access denied'), 'Returns "Access denied" message');

    // Test 6: Expired Signed Token Rejection (401)
    console.log('\n--- 6. Expired Signed Token Handling ---');
    const expiredToken = signSessionPayload({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      issuedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago (max is 7 days)
    });
    const expiredReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    const expiredAuth = await authorizeRequest(expiredReq, 'customers');
    assert(expiredAuth.user === null, 'Expired signed session rejected as null user');
    assert(expiredAuth.errorResponse?.status === 401, 'Expired signed session returns HTTP 401');

    // Test 7: Complete Customer Creation Workflow
    console.log('\n--- 7. End-to-End Customer Creation Workflow ---');
    const testCustomerPayload = {
      name: `Malabar Elite Developers (${Date.now()})`,
      firmName: 'Malabar Elite Builders & Contractors LLP',
      type: 'BUILDER' as const,
      district: 'Kozhikode',
      town: 'Mavoor Road',
      address: '4th Floor, Skyline Towers, Mavoor Road, Kozhikode, Kerala 673004',
      gstin: '32AABCE5678F1Z9',
      phone: '+91 98471 23456',
      email: 'projects@malabarelite.com',
      creditLimit: 500000,
    };

    const createReq = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCustomerPayload),
    });

    const createRes = await createCustomerRoute(createReq);
    const createJson = await createRes.json();
    assert(createRes.status === 201, 'Authenticated customer creation returns HTTP 201 Created');
    assert(createJson.success === true, 'Response payload has success: true');
    assert(createJson.data && createJson.data.id, 'Response payload contains persisted customer ID');
    const newCustomerId = createJson.data.id;

    // Test 8: Customer Persistence & Query
    console.log('\n--- 8. Customer Persistence Verification ---');
    const listReq = new NextRequest(
      `http://localhost:3000/api/customers?search=${encodeURIComponent(testCustomerPayload.name)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validAdminToken}`,
        },
      }
    );
    const listRes = await listCustomerRoute(listReq);
    const listJson = await listRes.json();
    assert(listRes.status === 200, 'Customer query returns HTTP 200 OK');
    assert(listJson.success === true, 'Customer query response success: true');
    const found = (listJson.data as Array<{ id: string; district?: string; firmName?: string }>).find(
      (c) => c.id === newCustomerId
    );
    assert(found !== undefined, 'Newly created customer is persistently retrieved in customers list');
    assert(found?.district === 'Kozhikode', 'Customer district verified in persistence store');
    assert(found?.firmName === testCustomerPayload.firmName, 'Customer firm name matches input');

    console.log('\n====================================================');
    console.log(`ALL ${passed}/${total} AUTH & CUSTOMER TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('\nTest suite failed with error:', err);
  process.exit(1);
});
