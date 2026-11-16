import assert from 'assert';
import { NextRequest } from 'next/server';
import { POST as postLoginRoute } from '../app/api/auth/login/route';
import { POST as postEmergencyResetRoute } from '../app/api/auth/emergency-reset/route';
import { verifyFactoryUserCredentials } from '../lib/auth/userStore';

async function runTests() {
  console.log('--- Testing Super Admin Password & PIN Authentication ---');

  // 1. Direct credential verification by Email + Password
  const userByPass = await verifyFactoryUserCredentials('director@exmarkdoors.com', 'Exmark@2026');
  assert.ok(userByPass, 'Super Admin must authenticate by Email + Password Exmark@2026');
  assert.strictEqual(userByPass.role, 'Super Admin', 'Role must be Super Admin');
  assert.strictEqual(userByPass.employeeCode, 'EXM-EMP-001', 'Code must be EXM-EMP-001');
  console.log('✅ 1. Direct Email + Password authentication passed.');

  // 2. Direct credential verification by Staff Code + Quick PIN
  const userByPin = await verifyFactoryUserCredentials('EXM-EMP-001', '2026', 'PIN');
  assert.ok(userByPin, 'Super Admin must authenticate by Staff Code EXM-EMP-001 + Quick PIN 2026');
  assert.strictEqual(userByPin.id, 'usr-admin-01');
  console.log('✅ 2. Direct Staff Code + Quick PIN authentication passed.');

  // 3. API Login Route via Email + Password
  const reqEmail = new NextRequest('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'director@exmarkdoors.com',
      password: 'Exmark@2026',
      authMethod: 'PASSWORD',
    }),
  });
  const resEmail = await postLoginRoute(reqEmail);
  assert.strictEqual(resEmail.status, 200, 'Login API must return 200');
  const dataEmail = await resEmail.json();
  assert.strictEqual(dataEmail.success, true);
  assert.strictEqual(dataEmail.user.role, 'Super Admin');
  console.log('✅ 3. API Login Route (/api/auth/login) via Email + Password passed.');

  // 4. API Login Route via Staff Code + PIN
  const reqPin = new NextRequest('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'EXM-EMP-001',
      pin: '2026',
      authMethod: 'PIN',
    }),
  });
  const resPin = await postLoginRoute(reqPin);
  assert.strictEqual(resPin.status, 200, 'Login API must return 200 with PIN');
  const dataPin = await resPin.json();
  assert.strictEqual(dataPin.success, true);
  assert.strictEqual(dataPin.user.role, 'Super Admin');
  console.log('✅ 4. API Login Route (/api/auth/login) via Staff Code + PIN passed.');

  // 5. Host Emergency Reset API
  const reqReset = new NextRequest('http://localhost:4000/api/auth/emergency-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'localhost:4000',
    },
    body: JSON.stringify({
      newPassword: 'Exmark@2026',
      newPin: '2026',
    }),
  });
  const resReset = await postEmergencyResetRoute(reqReset);
  assert.strictEqual(resReset.status, 200, 'Emergency reset API must return 200');
  const dataReset = await resReset.json();
  assert.strictEqual(dataReset.success, true);
  console.log('✅ 5. Host Emergency Reset API (/api/auth/emergency-reset) passed.');

  console.log('\n🎉 ALL SUPER ADMIN PASSWORD & PIN TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
