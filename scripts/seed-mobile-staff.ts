import { ensureOperationalStaffUsers, OPERATIONAL_STAFF_SPECS } from '../lib/auth/operationalStaffSeed';

async function main() {
  console.log('Synchronizing 5 operational staff accounts...');
  await ensureOperationalStaffUsers();
  console.log('✓ Operational staff synced:');
  for (const s of OPERATIONAL_STAFF_SPECS) {
    console.log(`  - [${s.employeeCode}] ${s.name} (${s.mobileRole}) -> PIN: ${s.defaultPin}`);
  }
}

main().catch((err) => {
  console.error('Failed to seed:', err);
  process.exit(1);
});
