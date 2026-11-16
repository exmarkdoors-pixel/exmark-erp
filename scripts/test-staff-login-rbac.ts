import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runStaffLoginAndRbacTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-staff-rbac-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log(`\nRunning Staff Login Architecture, HMAC Session & Dynamic RBAC Tests (Isolated: ${tempDir})\n`);

    const [
      {
        ensureUsersStore,
        listFactoryUsers,
        upsertFactoryUser,
      },
      { createSignedSessionToken, SESSION_COOKIE_NAME },
      { POST: postLoginRoute },
      { GET: getLoginDirRoute },
      { GET: getMeRoute },
      { GET: getUsersRoute, POST: postUsersRoute, DELETE: deleteUserRoute },
      { GET: getRbacRoute, PUT: putRbacRoute },
      { POST: postChangePasswordRoute },
      { GET: getMetricsRoute },
      { PUT: putProductionRoute },
      { POST: postEmployeesRoute, GET: getEmployeesRoute },
    ] = await Promise.all([
      import('../lib/auth/userStore'),
      import('../lib/auth/session'),
      import('../app/api/auth/login/route'),
      import('../app/api/auth/login-directory/route'),
      import('../app/api/auth/me/route'),
      import('../app/api/auth/users/route'),
      import('../app/api/auth/rbac/route'),
      import('../app/api/auth/change-password/route'),
      import('../app/api/dashboard/metrics/route'),
      import('../app/api/production/[id]/route'),
      import('../app/api/employees/route'),
    ]);

    // 1. Auto-cleanup / deduplication of duplicate entries (e.g. usr-prod-05) on initialization
    const seededUsers = await ensureUsersStore();
    const prodEmails = seededUsers.filter((u) => u.email.includes('plant.palakkad@exmarkdoors.com'));
    assert(prodEmails.length === 0, 'Duplicate plant.palakkad@exmarkdoors.com entry is excluded cleanly from seed');

    const superAdmin = seededUsers.find((u) => u.role === 'Super Admin');
    assert(Boolean(superAdmin && superAdmin.employeeCode === 'EXM-EMP-001'), 'Super Admin EXM-EMP-001 initialized');

    // 2. Forged unsigned cookie / tampered HMAC cookie rejection (401)
    const unsignedForged = Buffer.from(
      JSON.stringify({ id: superAdmin!.id, email: superAdmin!.email, role: 'Super Admin', issuedAt: Date.now() })
    ).toString('base64');
    const forgedMe = await getMeRoute(
      new NextRequest('http://localhost:4000/api/auth/me', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${unsignedForged}` },
      })
    );
    assert(forgedMe.status === 401, 'Forged unsigned cookie rejected with HTTP 401');

    const validSaToken = await createSignedSessionToken({
      id: superAdmin!.id,
      name: superAdmin!.name,
      email: superAdmin!.email,
      role: superAdmin!.role,
      employeeCode: superAdmin!.employeeCode,
      plantLocation: superAdmin!.plantLocation,
    });
    const tamperedV2 = `${validSaToken.slice(0, -4)}XXXX`;
    const tamperedMe = await getMeRoute(
      new NextRequest('http://localhost:4000/api/auth/me', {
        headers: { Authorization: `Bearer ${tamperedV2}` },
      })
    );
    assert(tamperedMe.status === 401, 'Tampered v2 HMAC signature rejected cleanly with HTTP 401');

    // 3. Unauthenticated operational endpoints return HTTP 401 even on localhost
    const unauthMetrics = await getMetricsRoute(new NextRequest('http://localhost:4000/api/dashboard/metrics'));
    assert(unauthMetrics.status === 401, 'Unauthenticated GET /api/dashboard/metrics rejects with HTTP 401');

    const unauthProd = await putProductionRoute(
      new NextRequest('http://localhost:4000/api/production/fake-id', {
        method: 'PUT',
        body: JSON.stringify({ stage: 'MOLDING' }),
      }),
      { params: Promise.resolve({ id: 'fake-id' }) }
    );
    assert(unauthProd.status === 401, 'Unauthenticated PUT /api/production/[id] rejects with HTTP 401');

    // 4. Create new Staff Login via Super Admin API with Email, Staff Code, Phone, Password, and 4-digit Quick PIN
    const createStaffRes = await postUsersRoute(
      new NextRequest('http://localhost:4000/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validSaToken}` },
        body: JSON.stringify({
          action: 'UPSERT_USER',
          name: 'Shibu Cutting Master',
          email: 'shibu@exmarkdoors.com',
          role: 'Production',
          department: 'Cutting & Finishing',
          employeeCode: 'EXM-EMP-025',
          phone: '+91 98470 55443',
          password: 'FactoryCut#2026',
          quickPin: '4829',
        }),
      })
    );
    const createStaffJson = await createStaffRes.json();
    assert(createStaffRes.status === 200 && createStaffJson.success, 'Super Admin created Shibu Cutting Master login with Quick PIN');
    const shibuId = createStaffJson.data.id as string;

    // 5. Login via Staff Code + Quick PIN AND via Phone + Password
    const pinLoginRes = await postLoginRoute(
      new NextRequest('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'EXM-EMP-025',
          pin: '4829',
          method: 'PIN',
        }),
      })
    );
    const pinLoginJson = await pinLoginRes.json();
    assert(pinLoginRes.status === 200 && pinLoginJson.token?.startsWith('v2.'), 'Login with Staff Code EXM-EMP-025 + Quick PIN 4829 returned v2 HMAC token');
    const shibuToken = pinLoginJson.token as string;

    const phoneLoginRes = await postLoginRoute(
      new NextRequest('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '9847055443',
          password: 'FactoryCut#2026',
          method: 'PASSWORD',
        }),
      })
    );
    assert(phoneLoginRes.status === 200, 'Login with normalized 10-digit Phone + Password succeeded');

    // Verify LAN Login Directory exposes ONLY non-sensitive picker fields (no email/phone/hashes)
    const dirRes = await getLoginDirRoute();
    const dirJson = await dirRes.json();
    const shibuDir = dirJson.staff.find((s: { employeeCode?: string }) => s.employeeCode === 'EXM-EMP-025');
    assert(
      Boolean(shibuDir && shibuDir.hasQuickPin && !('email' in shibuDir) && !('phone' in shibuDir) && !('passwordHash' in shibuDir)),
      'LAN login-directory returns non-sensitive Staff Picker cards with zero emails/phones/hashes'
    );

    // 6. Self password / Quick PIN change
    const selfChangeRes = await postChangePasswordRoute(
      new NextRequest('http://localhost:4000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shibuToken}` },
        body: JSON.stringify({
          currentSecret: '4829',
          newPin: '7391',
        }),
      })
    );
    assert(selfChangeRes.status === 200, 'Staff self-updated Quick PIN from 4829 to 7391');

    const newPinLoginRes = await postLoginRoute(
      new NextRequest('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'EXM-EMP-025', pin: '7391', method: 'PIN' }),
      })
    );
    assert(newPinLoginRes.status === 200, 'Login succeeds immediately with updated Quick PIN 7391');

    // 7. Non-Super-Admin receives 403 Forbidden on Admin endpoints
    const nonSaUsersRes = await getUsersRoute(
      new NextRequest('http://localhost:4000/api/auth/users', {
        headers: { Authorization: `Bearer ${shibuToken}` },
      })
    );
    assert(nonSaUsersRes.status === 403, 'Production user receives HTTP 403 on GET /api/auth/users');

    const nonSaRbacRes = await getRbacRoute(
      new NextRequest('http://localhost:4000/api/auth/rbac', {
        headers: { Authorization: `Bearer ${shibuToken}` },
      })
    );
    assert(nonSaRbacRes.status === 403, 'Production user receives HTTP 403 on GET /api/auth/rbac');

    // 8. Dynamic RBAC Persistence (rbac-roles.json) changes route access cleanly
    const currentRbacRes = await getRbacRoute(
      new NextRequest('http://localhost:4000/api/auth/rbac', {
        headers: { Authorization: `Bearer ${validSaToken}` },
      })
    );
    const currentRbac = (await currentRbacRes.json()).data as Record<string, string[]>;
    const updatedRoles = {
      ...currentRbac,
      Production: Array.from(new Set([...(currentRbac.Production || []), 'employees'])),
    };
    const saveRbacRes = await putRbacRoute(
      new NextRequest('http://localhost:4000/api/auth/rbac', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validSaToken}` },
        body: JSON.stringify({ roles: updatedRoles }),
      })
    );
    assert(saveRbacRes.status === 200 && fs.existsSync(path.join(tempDir, 'rbac-roles.json')), 'RBAC matrix saved cleanly to rbac-roles.json');

    // Now Production user can access GET /api/employees cleanly and see loginAccount enrichment
    await postEmployeesRoute(
      new NextRequest('http://localhost:4000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validSaToken}` },
        body: JSON.stringify({
          name: 'Shibu Cutting Master',
          employeeCode: 'EXM-EMP-025',
          email: 'shibu@exmarkdoors.com',
          department: 'Cutting & Finishing',
        }),
      })
    );
    const empRes = await getEmployeesRoute(
      new NextRequest('http://localhost:4000/api/employees', {
        headers: { Authorization: `Bearer ${shibuToken}` },
      })
    );
    const empJson = await empRes.json();
    assert(
      empRes.status === 200 && empJson.data[0]?.loginAccount?.hasQuickPin === true,
      'Dynamic RBAC update allows Shibu (Production) access to /api/employees with linked loginAccount metadata'
    );

    // 9. Immediate Token Revocation when Staff Account is Deactivated or Deleted
    await upsertFactoryUser({
      id: shibuId,
      name: 'Shibu Cutting Master',
      email: 'shibu@exmarkdoors.com',
      role: 'Production',
      isActive: false,
    });
    const deactivatedMeRes = await getMeRoute(
      new NextRequest('http://localhost:4000/api/auth/me', {
        headers: { Authorization: `Bearer ${shibuToken}` },
      })
    );
    assert(deactivatedMeRes.status === 401, 'Previously signed Shibu token is immediately rejected (401) upon deactivation');

    // 10. Last Super Admin protection & Demo Account Cleanup preserves custom staff
    const deleteLastSa = await deleteUserRoute(
      new NextRequest(`http://localhost:4000/api/auth/users?id=${superAdmin!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validSaToken}` },
      })
    );
    assert(deleteLastSa.status === 400, 'System blocks deleting the last remaining Super Admin account');

    // Re-activate Shibu (custom staff), then clean unused seeded demo placeholders
    await upsertFactoryUser({
      id: shibuId,
      name: 'Shibu Cutting Master',
      email: 'shibu@exmarkdoors.com',
      role: 'Production',
      isActive: true,
    });
    const cleanRes = await postUsersRoute(
      new NextRequest('http://localhost:4000/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validSaToken}` },
        body: JSON.stringify({ action: 'CLEAN_DEMO_USERS' }),
      })
    );
    const cleanJson = await cleanRes.json();
    const afterUsers = await listFactoryUsers();
    assert(
      cleanRes.status === 200 &&
        cleanJson.removedCount >= 1 &&
        afterUsers.some((u) => u.id === superAdmin!.id) &&
        afterUsers.some((u) => u.id === shibuId),
      `Demo cleanup removed ${cleanJson.removedCount} unused demo accounts while preserving Super Admin and custom staff Shibu`
    );

    console.log('\n✅ ALL STAFF LOGIN, HMAC SESSION, QUICK PIN & DYNAMIC RBAC TESTS PASSED!\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runStaffLoginAndRbacTests().catch((err) => {
  console.error('\n❌ STAFF LOGIN & RBAC TEST FAILED:', err);
  process.exit(1);
});
