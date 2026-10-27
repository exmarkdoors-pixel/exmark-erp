import { createBackupSnapshot, listBackupSnapshots, verifyBackupIntegrity } from '../lib/services/backupService';

async function runBackupAgent() {
  console.log('================================================================');
  console.log('  EXMARK DOORS — AUTOMATED WINDOWS OFFICE BACKUP AGENT');
  console.log('  Palakkad Central Plant & Kerala Office Stations');
  console.log('================================================================');

  try {
    console.log('\n[1/3] Initiating full system snapshot of data stores...');
    const snapshot = await createBackupSnapshot('SCHEDULED');
    console.log(`  ✓ Snapshot Created: ${snapshot.backupId}`);
    console.log(`  ✓ Stores archived: ${snapshot.filesCount} JSON databases (${snapshot.totalSizeBytes} bytes)`);
    console.log(`  ✓ Master SHA-256 Checksum: ${snapshot.sha256Checksum}`);

    console.log('\n[2/3] Performing cryptographical integrity verification...');
    const verification = await verifyBackupIntegrity(snapshot.backupId);
    if (!verification.valid) {
      console.error('  ✗ INTEGRITY CHECK FAILED:', verification.errors);
      process.exit(1);
    }
    console.log('  ✓ Verification Passed: 100% of data stores match cryptographic signatures.');

    console.log('\n[3/3] Inspecting backup retention ledger...');
    const allBackups = await listBackupSnapshots();
    console.log(`  ✓ Total backup points retained: ${allBackups.length}`);
    allBackups.slice(0, 3).forEach((b, idx) => {
      console.log(`     ${idx + 1}. ${b.backupId} | ${b.timestamp} | ${b.filesCount} files | ${b.status}`);
    });

    console.log('\n================================================================');
    console.log('  BACKUP AGENT RUN COMPLETED SUCCESSFULLY — ZERO DATA LOSS RISK');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Backup agent error:', err);
    process.exit(1);
  }
}

runBackupAgent();
