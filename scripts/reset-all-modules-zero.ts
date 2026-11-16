import 'dotenv/config';
import {
  resetAllModulesToZero,
  FactoryResetOptions,
  FactoryResetResult,
} from '../lib/services/factoryResetService';

export { resetAllModulesToZero };
export type { FactoryResetOptions, FactoryResetResult };

const invokedScript = (process.argv[1] || '').replace(/\\/g, '/');
if (
  invokedScript.endsWith('scripts/reset-all-modules-zero.ts') ||
  invokedScript.endsWith('scripts/reset-all-modules-zero.js')
) {
  resetAllModulesToZero()
    .then((res) => {
      console.log('====================================================');
      console.log('EXMARK ERP — FRESH FACTORY START RESET COMPLETE');
      console.log('====================================================');
      console.log(`Data Dir:          ${res.dataDir}`);
      console.log(`Backup Dir:        ${res.backupDir}`);
      console.log(`Pre-Reset Backup:  ${res.preResetBackupId || 'Skipped'}`);
      console.log(`Wiped Stores:      ${res.wipedStores.length}`);
      console.log(`Preserved Configs: ${res.preservedStores.length}`);
      console.log(`Test Backups Rm:   ${res.removedTestBackups}`);
      console.log(`Postgres Cleared:  ${res.postgresCleared}`);
      console.log('====================================================');
    })
    .catch((err) => {
      console.error('Fresh factory reset failed:', err);
      process.exit(1);
    });
}
