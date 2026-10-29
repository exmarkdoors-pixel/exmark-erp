export {};

const BASE_URL = process.env.STAGING_URL || 'https://exmark-erp-staging.onrender.com';
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev_secret_exmark_erp_kerala_doors_manufacturing_stage4_auth_key';

async function applyMigration() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — APPLYING STAGING POSTGRESQL MIGRATION');
  console.log(`  Target: ${BASE_URL}/api/system/migrate`);
  console.log('========================================================================\n');

  try {
    const res = await fetch(`${BASE_URL}/api/system/migrate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_SECRET}`,
      },
    });

    const json = await res.json();
    console.log(`HTTP Status : ${res.status}`);
    console.log('Response    :', JSON.stringify(json, null, 2));

    // Verify resulting table status
    const statusRes = await fetch(`${BASE_URL}/api/system/migrate`, {
      headers: { Authorization: `Bearer ${AUTH_SECRET}` },
    });
    const statusJson = await statusRes.json();
    console.log('\nPost-Migration Status:');
    console.log(`  Migration Status    : ${statusJson.migrationStatus}`);
    console.log(`  Applied Migrations  : ${statusJson.appliedMigrationsCount}`);
    console.log(`  Public Tables Count : ${statusJson.publicTablesCount}`);
  } catch (err: any) {
    console.error('Migration trigger error:', err.message);
  }
}

applyMigration();
