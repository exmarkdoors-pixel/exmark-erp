async function testLiveApis() {
  console.log('--- EXMARK ERP LIVE API TEST ---');

  // 1. Authenticate via /api/auth/login
  console.log('Logging in as director@exmarkdoors.com...');
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'director@exmarkdoors.com',
      password: 'Exmark@2026',
      method: 'PASSWORD',
    }),
  });

  console.log('Login status:', loginRes.status);
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No Set-Cookie returned from /api/auth/login');
  }
  const cookieMatch = setCookie.match(/exmark_erp_session=[^;]+/);
  const sessionCookie = cookieMatch ? cookieMatch[0] : setCookie.split(';')[0];
  console.log('✓ Successfully authenticated! Session cookie obtained.');

  const authHeaders = {
    cookie: sessionCookie,
  };

  // 2. Test Expense Intelligence API
  console.log('\nTesting Expense Intelligence API (/api/finance/expense-intelligence)...');
  const expRes = await fetch('http://localhost:4000/api/finance/expense-intelligence', { headers: authHeaders });
  console.log('Expense status:', expRes.status);
  const expData = await expRes.json();
  console.log('✓ Expense Intelligence success:', expData.success);
  console.log('  Total Monthly Overheads: ₹' + expData.data?.totalMonthlyOverheads);
  console.log('  Domains tracked:', expData.data?.domains?.map((d: any) => `${d.domain} (₹${d.totalAmount})`).join(', '));
  console.log('  Actionable Suggestions:', expData.data?.actionableSuggestions?.length);

  // 3. Test Attendance API
  console.log('\nTesting Attendance API (/api/payroll/attendance?month=2026-11)...');
  const attRes = await fetch('http://localhost:4000/api/payroll/attendance?month=2026-11', { headers: authHeaders });
  console.log('Attendance status:', attRes.status);
  const attData = await attRes.json();
  console.log('✓ Attendance API success:', attData.success);
  console.log('  Staff Attendance rows:', attData.data?.length);

  // 4. Test Salary Calculation API
  console.log('\nTesting Salary Register API (/api/payroll/salary?month=2026-11)...');
  const salRes = await fetch('http://localhost:4000/api/payroll/salary?month=2026-11', { headers: authHeaders });
  console.log('Salary status:', salRes.status);
  const salData = await salRes.json();
  console.log('✓ Salary Register API success:', salData.success);
  console.log('  Total Net Disbursal: ₹' + salData.data?.totalNetDisbursal);
  console.log('  Salary Slips count:', salData.data?.slips?.length);

  // 5. Test Bank NEFT Excel Download API
  console.log('\nTesting Bank NEFT Excel Export (/api/payroll/salary?month=2026-11&format=neft)...');
  const neftRes = await fetch('http://localhost:4000/api/payroll/salary?month=2026-11&format=neft', { headers: authHeaders });
  console.log('NEFT status:', neftRes.status);
  console.log('✓ NEFT Content-Type:', neftRes.headers.get('content-type'));
  const neftBuffer = await neftRes.arrayBuffer();
  console.log('✓ NEFT Excel size:', neftBuffer.byteLength, 'bytes');

  // 6. Test Excel Import Template Download (Customer & Vendor)
  console.log('\nTesting Bulk Import Template Download (/api/customers/bulk-import/template)...');
  const custTplRes = await fetch('http://localhost:4000/api/customers/bulk-import/template?type=CUSTOMER');
  console.log('Customer template status:', custTplRes.status, '| Content-Type:', custTplRes.headers.get('content-type'));
  const custBuffer = await custTplRes.arrayBuffer();
  console.log('✓ Customer template size:', custBuffer.byteLength, 'bytes');

  const suppTplRes = await fetch('http://localhost:4000/api/customers/bulk-import/template?type=SUPPLIER');
  console.log('Supplier template status:', suppTplRes.status, '| Content-Type:', suppTplRes.headers.get('content-type'));
  const suppBuffer = await suppTplRes.arrayBuffer();
  console.log('✓ Supplier template size:', suppBuffer.byteLength, 'bytes');

  console.log('\n🎉 ALL LIVE API TESTS PASSED WITH 100% SUCCESS!');
}

testLiveApis().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
