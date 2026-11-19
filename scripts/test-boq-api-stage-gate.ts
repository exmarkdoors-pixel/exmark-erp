import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const TEST_VAULT = path.join(process.cwd(), '.tmp-test-vault-api-gate-' + Date.now());
process.env.EXMARK_DATA_DIR = TEST_VAULT;
process.env.DATABASE_FALLBACK_FILE = path.join(TEST_VAULT, 'database-fallback-safety.json');

async function runApiGateTests() {
  console.log('--- STARTING BOQ API STAGE-GATE INTEGRATION TEST ---');
  if (!fs.existsSync(TEST_VAULT)) {
    fs.mkdirSync(TEST_VAULT, { recursive: true });
  }

  const nowIso = new Date().toISOString();
  const testOrders = [
    {
      id: 'ORD-API-001',
      prodOrderNumber: 'PRD-API-001',
      jobCardNumber: 'JC-API-001',
      customerName: 'Kochi Queued Client',
      siteName: 'Kochi Site',
      district: 'Ernakulam',
      doorCategory: 'FRP_DOORS',
      quantity: 1,
      lineAssigned: 'LINE-1',
      batchNumber: 'B-001',
      priority: 'NORMAL',
      status: 'QUEUED',
      doors: [
        {
          id: 'D-API-01',
          doorId: 'EXM-API-01',
          doorNumber: 'D1',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'RH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-API-01',
          materialIssued: false,
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ORD-API-002',
      prodOrderNumber: 'PRD-API-002',
      jobCardNumber: 'JC-API-002',
      customerName: 'Malappuram Paint Client',
      siteName: 'Malappuram Site',
      district: 'Malappuram',
      doorCategory: 'FRP_DOORS',
      quantity: 1,
      lineAssigned: 'LINE-2',
      batchNumber: 'B-002',
      priority: 'NORMAL',
      status: 'PAINT_SECTION',
      doors: [
        {
          id: 'D-API-02',
          doorId: 'EXM-API-02',
          doorNumber: 'D1',
          model: 'EXM-CLASSIC',
          rawHeightMm: 2100,
          rawWidthMm: 800,
          finishedHeightMm: 2080,
          finishedWidthMm: 780,
          handing: 'RH',
          lockType: 'Baby Latch',
          finishColor: 'Teak',
          qcStatus: 'PENDING',
          qrPayload: 'https://exmark.in/track/D-API-02',
          materialIssued: false,
          stage: 'PAINT_SECTION',
        },
      ],
      tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 20 },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  fs.writeFileSync(path.join(TEST_VAULT, 'production-store.json'), JSON.stringify(testOrders, null, 2), 'utf8');

  // Import API route handler & auth
  const { createSignedSessionToken, DEMO_USERS } = await import('../lib/auth/session');
  const { POST } = await import('../app/api/boq/issue/route');

  const adminUser = DEMO_USERS['director@exmarkdoors.com'];
  const token = await createSignedSessionToken({
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role,
    plantLocation: adminUser.plantLocation,
  });
  const authHeaders = {
    authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Case 1: Post BOQ for order in PAINT_SECTION (Single Order) -> MUST RETURN HTTP 400 with STAGE_NOT_ELIGIBLE_FOR_BOQ
  console.log('\n[API TEST 1] POST /api/boq/issue with Order in PAINT_SECTION:');
  const req1 = new NextRequest('http://localhost:3000/api/boq/issue', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prodOrderId: 'ORD-API-002',
      doorIds: ['D-API-02'],
      items: [{ itemName: 'Resin', category: 'Chemical', quantity: 8, unit: 'Kg', unitPrice: 180, total: 1440 }],
      shift: 'MORNING',
      gangName: 'Molding Team',
      source: 'DESKTOP',
    }),
  });

  const res1 = await POST(req1);
  const json1 = await res1.json();
  console.log(`HTTP Status: ${res1.status}, Code: ${json1.code}`);
  console.log(`Error Message: ${json1.error}`);
  if (res1.status !== 400 || json1.code !== 'STAGE_NOT_ELIGIBLE_FOR_BOQ') {
    throw new Error(`API Test 1 Failed! Expected 400 STAGE_NOT_ELIGIBLE_FOR_BOQ, got ${res1.status}`);
  }
  console.log('✓ API correctly rejected past-molding order with HTTP 400!');

  // Case 2: Post Consolidated Batch containing an order in PAINT_SECTION -> MUST RETURN HTTP 400 with STAGE_NOT_ELIGIBLE_FOR_BOQ
  console.log('\n[API TEST 2] POST /api/boq/issue with Consolidated Batch containing PAINT_SECTION party:');
  const req2 = new NextRequest('http://localhost:3000/api/boq/issue', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      mode: 'CONSOLIDATED_BATCH',
      entries: [
        { prodOrderId: 'ORD-API-001', doorIds: ['D-API-01'] }, // QUEUED (valid)
        { prodOrderId: 'ORD-API-002', doorIds: ['D-API-02'] }, // PAINT_SECTION (invalid)
      ],
      items: [{ itemName: 'Resin', category: 'Chemical', quantity: 16, unit: 'Kg', unitPrice: 180, total: 2880 }],
      shift: 'MORNING',
      gangName: 'Molding Team',
      source: 'DESKTOP',
    }),
  });

  const res2 = await POST(req2);
  const json2 = await res2.json();
  console.log(`HTTP Status: ${res2.status}, Code: ${json2.code}`);
  console.log(`Error Message: ${json2.error}`);
  if (res2.status !== 400 || json2.code !== 'STAGE_NOT_ELIGIBLE_FOR_BOQ') {
    throw new Error(`API Test 2 Failed! Expected 400 STAGE_NOT_ELIGIBLE_FOR_BOQ, got ${res2.status}`);
  }
  console.log('✓ API correctly rejected batch containing past-molding party with HTTP 400!');

  // Case 3: Post BOQ for order in QUEUED -> MUST SUCCEED (HTTP 200)
  console.log('\n[API TEST 3] POST /api/boq/issue with Order in QUEUED (JC-API-001):');
  const req3 = new NextRequest('http://localhost:3000/api/boq/issue', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prodOrderId: 'ORD-API-001',
      doorIds: ['D-API-01'],
      items: [{ itemName: 'Resin', category: 'Chemical', quantity: 8, unit: 'Kg', unitPrice: 180, total: 1440 }],
      shift: 'MORNING',
      gangName: 'Molding Team',
      source: 'DESKTOP',
    }),
  });

  const res3 = await POST(req3);
  const json3 = await res3.json();
  console.log(`HTTP Status: ${res3.status}, Success: ${json3.success}`);
  if (res3.status !== 200 || !json3.success) {
    throw new Error(`API Test 3 Failed! Expected 200 Success, got ${res3.status}: ${json3.error}`);
  }
  console.log(`✓ API successfully issued BOQ voucher: ${json3.data.voucher.voucherNumber}`);

  // Clean up
  try {
    fs.rmSync(TEST_VAULT, { recursive: true, force: true });
    console.log('\nCleaned up API test vault.');
  } catch {}

  console.log('\n======================================================');
  console.log('🎉 ALL API STAGE-GATE TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

runApiGateTests().catch((err) => {
  console.error('\n❌ API TEST RUN FAILED:', err);
  process.exit(1);
});
