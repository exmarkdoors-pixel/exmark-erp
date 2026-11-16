import 'dotenv/config';
import { ensureSchemaUpToDate } from '../lib/services/schemaMigrator';

async function main() {
  const result = await ensureSchemaUpToDate({
    createPreUpdateBackup: true,
  });

  console.log('====================================================');
  console.log('EXMARK ERP — ZERO-DATA-LOSS SCHEMA MIGRATION');
  console.log('====================================================');
  console.log(`Data Vault:       ${result.dataDir}`);
  console.log(`App Version:      ${result.appVersion}`);
  console.log(`Previous Schema:  v${result.previousVersion}`);
  console.log(`Current Schema:   v${result.currentVersion}`);
  console.log(`Pre-Update Snap:  ${result.preUpdateBackupId || 'None needed'}`);
  console.log(`Migrated:         ${result.migrated ? 'YES' : 'ALREADY UP TO DATE'}`);
  for (const step of result.applied) {
    console.log(`  - [v${step.version}] ${step.name}: ${step.summary}`);
  }
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Safe schema migration failed:', err);
  process.exit(1);
});
