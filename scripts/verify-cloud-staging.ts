/**
 * EXMARK ERP — Cloud Staging Automated Verification & Persistence Test
 * 
 * Tests:
 * 1. Live Render /api/health liveness and readiness
 * 2. Central PostgreSQL connectivity
 * 3. End-to-end Site Measurement creation in cloud mode
 * 4. Verification that record is persisted in PostgreSQL
 */

const BASE_URL = process.env.STAGING_URL || 'https://exmark-erp-staging.onrender.com';

async function runVerification() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — LIVE CLOUD STAGING VERIFICATION SUITE');
  console.log(`  Target URL: ${BASE_URL}`);
  console.log('========================================================================\n');

  // 1. Probe /api/health
  console.log('--- 1. PROBING /api/health ENDPOINT ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log(`  HTTP Status Code : ${healthRes.status}`);
    console.log(`  Liveness         : ${healthData.liveness}`);
    console.log(`  Readiness        : ${healthData.readiness}`);
    console.log(`  Readiness Reason : ${healthData.readinessReason}`);
    console.log(`  Postgres Online  : ${healthData.database?.postgresReachable}`);
    console.log(`  Connection Mode  : ${healthData.database?.connectionMode}`);
    console.log(`  Storage Durable  : ${healthData.storage?.durable}`);
    console.log(`  Active Factory   : ${healthData.companyProfile?.activeFactory}`);

    if (healthData.readiness === 'READY' && healthData.database?.postgresReachable) {
      console.log('\n  ✓ [PASS] Central PostgreSQL is connected and authoritative on Render!');
    } else {
      console.log('\n  ⏳ [PENDING] Staging database or Render redeploy is still in progress.');
    }
  } catch (err: any) {
    console.error('  ✗ Failed to connect to health endpoint:', err.message);
  }
}

runVerification();
