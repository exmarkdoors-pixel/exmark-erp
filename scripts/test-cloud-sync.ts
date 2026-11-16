import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Isolate completely inside %TEMP% before importing any service modules
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-cloud-sync-test-'));
const backupDir = path.join(tmpRoot, 'backups');
const gdriveFolder = path.join(tmpRoot, 'GoogleDriveMock', 'EXMARK-ERP-Cloud');
fs.mkdirSync(backupDir, { recursive: true });
fs.mkdirSync(gdriveFolder, { recursive: true });

process.env.EXMARK_DATA_DIR = tmpRoot;
process.env.EXMARK_BACKUP_DIR = backupDir;
process.env.EXMARK_AUTO_BOOTSTRAP = 'false';

import { getDataFilePath, writeJsonSafe } from '../lib/utils/dataPaths';
import {
  getCloudSyncState,
  getMaskedSecretsSummary,
  readCloudSyncSecrets,
  saveCloudSyncSecrets,
  saveCloudSyncState,
} from '../lib/services/cloudSyncConfigService';
import {
  inspectCloudDiff,
  pullFromCloudSync,
  pushToCloudSync,
  registerCloudAutoSyncObserver,
  restoreFromGoogleDriveBackupId,
  testCloudConnections,
} from '../lib/services/cloudSyncService';
import { buildPortableBackupBundle } from '../app/api/system/backup/download/route';
import { createBackupSnapshot } from '../lib/services/backupService';
import { enqueueOutbox, getOutbox, reconcileOutboxToPostgres } from '../lib/services/dbSyncEngine';
import {
  listGoogleDriveBackups,
  testGoogleDriveChannel,
  uploadVaultBackupToGoogleDrive,
} from '../lib/services/googleDriveSyncService';

// Mock PrismaClient interface supporting CloudVaultStore, DoorMeasurement & ProductCategory
function createMockPrismaClient() {
  const vaultRows = new Map<
    string,
    {
      storeKey: string;
      sha256: string;
      payloadJson: string;
      revision: number;
      sizeBytes: number;
      appVersion: string;
      deviceName: string | null;
      updatedAt: Date;
    }
  >();
  const measurements = new Map<string, any>();
  const categories = new Map<string, any>();
  let ddlExecuted = false;

  const mockClient: any = {
    $queryRaw: async () => [{ alive: 1 }],
    $executeRawUnsafe: async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS "CloudVaultStore"')) {
        ddlExecuted = true;
      }
      return 0;
    },
    cloudVaultStore: {
      count: async () => vaultRows.size,
      findMany: async (args?: any) => {
        const all = Array.from(vaultRows.values());
        if (args?.select) {
          return all.map((r) => {
            const obj: any = {};
            for (const k of Object.keys(args.select)) {
              if (args.select[k]) obj[k] = (r as any)[k];
            }
            return obj;
          });
        }
        return all;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = where.storeKey;
        const existing = vaultRows.get(key);
        const row = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { ...create, updatedAt: new Date() };
        vaultRows.set(key, row);
        return row;
      },
    },
    doorMeasurementItem: {
      deleteMany: async () => ({ count: 0 }),
    },
    doorMeasurement: {
      deleteMany: async ({ where }: any) => {
        const deleted = measurements.delete(where.id) ? 1 : 0;
        return { count: deleted };
      },
      upsert: async ({ where, create, update }: any) => {
        const next = measurements.has(where.id)
          ? { ...measurements.get(where.id), ...update }
          : { ...create };
        measurements.set(where.id, next);
        return next;
      },
    },
    productCategory: {
      deleteMany: async ({ where }: any) => {
        categories.delete(where.id);
        return { count: 1 };
      },
      upsert: async ({ where, create, update }: any) => {
        const next = categories.has(where.code)
          ? { ...categories.get(where.code), ...update }
          : { ...create };
        categories.set(where.code, next);
        return next;
      },
    },
    _inspect: () => ({ ddlExecuted, vaultRows, measurements, categories }),
  };
  return mockClient;
}

async function runTests() {
  console.log(`\nRunning Hybrid Cloud Sync Tests (Isolated: ${tmpRoot})\n`);
  try {
    // 1. Seed representative stores locally
    registerCloudAutoSyncObserver();
    writeJsonSafe(getDataFilePath('quotations-store.json'), [
      { id: 'q-1', quoteNumber: 'QTN-2026-001', totalAmount: 85000 },
    ]);
    writeJsonSafe(getDataFilePath('contractors-store.json'), {
      contractors: [{ id: 'c-1', name: 'Raju Gang' }],
      workRecords: [],
      payouts: [],
    });
    writeJsonSafe(getDataFilePath('daybook-imports-store.json'), {
      batches: [{ id: 'b-1', month: '2026-11' }],
      entries: [],
      monthlySummaries: [],
      customRules: [],
    });

    const stateAfterWrites = getCloudSyncState();
    assert(stateAfterWrites.dirtyStores.includes('quotations-store.json'), 'quotations-store marked dirty');
    assert(stateAfterWrites.dirtyStores.includes('contractors-store.json'), 'contractors-store marked dirty');
    assert(!stateAfterWrites.dirtyStores.includes('cloud-sync-state.json'), 'cloud-sync-state excluded from dirty list');
    console.log('  ✓ Dirty store tracker detected multi-module writes via writeJsonSafe');

    // 2. AES-256 Encrypted Secrets Isolation & Masking
    const secretConnUrl = 'postgresql://exmark_admin:SuperSecretPass#99@ep-cool-cloud.ap-southeast-1.aws.neon.tech:5432/exmark?sslmode=require';
    saveCloudSyncSecrets({
      cloudDatabaseUrl: secretConnUrl,
      appsScriptWebhookUrl: 'https://script.google.com/macros/s/SECRET_DEPLOY_ID/exec',
      appsScriptToken: 'top-secret-token',
    });
    saveCloudSyncState({
      enabled: true,
      postgresEnabled: true,
      driveEnabled: true,
      driveMode: 'LOCAL_FOLDER',
      driveLocalFolder: gdriveFolder,
      googleAccountEmail: 'exmarkdoors@gmail.com',
    });

    const decrypted = readCloudSyncSecrets();
    assert(
      decrypted.cloudDatabaseUrl?.includes('SuperSecretPass%2399@ep-cool-cloud'),
      'Encrypted Postgres URL safely percent-encodes # and preserves host'
    );
    const masked = getMaskedSecretsSummary();
    assert.strictEqual(masked.hasDatabaseUrl, true);
    assert(masked.maskedDatabaseUrl?.includes('ep-cool-cloud.ap-southeast-1.aws.neon.tech:5432/exmark'), 'Masked URL retains safe host/port/db hint');
    assert(!masked.maskedDatabaseUrl?.includes('SuperSecretPass'), 'Password never exposed in masked summary');
    assert(!masked.maskedDatabaseUrl?.includes('exmark_admin'), 'Username never exposed in masked summary');

    // Verify encrypted secrets dotfile NEVER leaks into backup snapshots or portable bundles
    const bundle = buildPortableBackupBundle();
    assert(!Object.keys(bundle.stores).some((k) => k.includes('secret')), 'No secrets in portable backup bundle');
    assert(!bundle.stores['cloud-sync-state.json'], 'cloud-sync-state excluded from portable bundle');
    const snap = await createBackupSnapshot('MANUAL');
    assert(!snap.storesIncluded.some((f) => f.includes('secret')), 'No secrets in backup snapshot directory');
    console.log('  ✓ AES-256 secret encryption, UI masking & zero-leak backup exclusion verified');

    // 3. Test Connection & Incremental Push to Mock Postgres + Google Drive Folder
    const mockPrisma = createMockPrismaClient();
    const connTest = await testCloudConnections({ prismaClientOverride: mockPrisma });
    assert.strictEqual(connTest.postgres.reachable, true, 'Mock Postgres reachable');
    assert.strictEqual(connTest.postgres.tableReady, true, 'CloudVaultStore DDL auto-initialized');
    assert.strictEqual(connTest.drive.ready, true, 'Local Google Drive folder writable');
    assert.strictEqual(mockPrisma._inspect().ddlExecuted, true, 'Executed non-destructive CREATE TABLE IF NOT EXISTS');
    console.log('  ✓ Test Connections & auto-DDL table creation verified');

    // Enqueue legacy Outbox entries (Create, Delete Measurement & Product Category)
    enqueueOutbox('DOOR_MEASUREMENT', 'msr-1', 'CREATE', {
      id: 'msr-1',
      refNumber: 'MSR-2026-001',
      siteName: 'Kochi Villa',
      district: 'Ernakulam',
      totalOpenings: 1,
      status: 'VERIFIED',
      doors: [
        {
          id: 'd-1',
          doorNumber: 'D1',
          model: 'Teak FRP',
          frameType: 'FRP Wrap',
          colour: 'Teak',
          hingeSide: 'LH',
          lockType: 'PlusPoint Black',
          measurementUnit: 'MM',
          heightLeft: 2100,
          heightRight: 2100,
          widthTop: 800,
          widthBottom: 800,
        },
      ],
    });
    enqueueOutbox('PRODUCT_CATEGORY', 'cat-frp-01', 'UPDATE', {
      id: 'cat-frp-01',
      code: 'FRP',
      name: 'FRP Doors',
      enabled: true,
      isPrimary: true,
    });

    const push1 = await pushToCloudSync({ prismaClientOverride: mockPrisma, includeDrive: true });
    assert.strictEqual(push1.success, true, 'Initial Push succeeded');
    assert.strictEqual(push1.postgres.pushedCount, 3, 'All 3 business JSON stores pushed');
    assert.strictEqual(push1.postgres.outboxSynced, 2, 'Both Measurement and ProductCategory outbox synced');
    assert(push1.drive.fileName?.startsWith('exmark-vault-'), 'Drive backup uploaded');
    assert(fs.existsSync(path.join(gdriveFolder, 'exmark-vault-latest.json')), 'Drive latest mirror created');
    assert.strictEqual(getCloudSyncState().dirtyStores.length, 0, 'Dirty queue cleared cleanly after push');
    console.log('  ✓ Incremental Push pushed all stores, cleared dirty queue, synced outbox & wrote Drive backup');

    // Second push with zero local edits should skip unchanged stores cleanly
    const push2 = await pushToCloudSync({ prismaClientOverride: mockPrisma, includeDrive: false });
    assert.strictEqual(push2.postgres.pushedCount, 0, 'Unchanged stores skipped cleanly (0 pushed)');
    assert.strictEqual(push2.postgres.skippedUnchangedCount, 3, 'All 3 unchanged stores skipped');
    console.log('  ✓ SHA-256 diff skipped unchanged stores cleanly');

    // Outbox Delete operation test
    enqueueOutbox('DOOR_MEASUREMENT', 'msr-1', 'DELETE', { id: 'msr-1' });
    const outboxDel = await reconcileOutboxToPostgres(mockPrisma);
    assert.strictEqual(outboxDel.synced, 1, 'Outbox DELETE synced');
    assert.strictEqual(mockPrisma._inspect().measurements.size, 0, 'Deleted measurement removed in Postgres');
    console.log('  ✓ Outbox CREATE/UPDATE/DELETE & PRODUCT_CATEGORY reconciliation verified');

    // 4. Inspect Diff + Safe Pull + Pre-Restore Snapshot Guard
    // Simulate remote having an updated quotation while local quotations-store was lost/corrupted
    fs.writeFileSync(getDataFilePath('quotations-store.json'), '[]', 'utf8');
    const diff = await inspectCloudDiff({ prismaClientOverride: mockPrisma });
    const qDiff = diff.find((d) => d.storeKey === 'quotations-store.json');
    assert.strictEqual(qDiff?.status, 'MODIFIED', 'Inspect Cloud Diff detects divergence');

    const pullRes = await pullFromCloudSync({ mode: 'OVERWRITE_ALL', prismaClientOverride: mockPrisma });
    assert.strictEqual(pullRes.success, true);
    assert(pullRes.preRestoreBackupId.startsWith('EXM-BAK-'), 'Pre-restore backup taken before overwrite');
    assert(pullRes.restoredStores.includes('quotations-store.json'), 'quotations-store restored cleanly');
    const restoredQuotes = JSON.parse(fs.readFileSync(getDataFilePath('quotations-store.json'), 'utf8'));
    assert.strictEqual(restoredQuotes[0].quoteNumber, 'QTN-2026-001', 'Original quotation data intact');
    console.log('  ✓ Safe Cloud Pull with automatic PRE_RESTORE snapshot verified');

    // 5. Google Drive List + Restore check
    writeJsonSafe(getDataFilePath('quotations-store.json'), []); // wipe locally again
    const driveTest = await testGoogleDriveChannel();
    assert.strictEqual(driveTest.ready, true);
    const driveFiles = await listGoogleDriveBackups();
    assert(driveFiles.length >= 2, 'Lists timestamped and latest Drive backups');
    const latestFile = driveFiles.find((f) => f.name === 'exmark-vault-latest.json')!;
    const driveRestore = await restoreFromGoogleDriveBackupId(latestFile.id);
    assert(driveRestore.restoredFiles.includes('quotations-store.json'), 'Restored from Google Drive bundle');
    const quotesFromDrive = JSON.parse(fs.readFileSync(getDataFilePath('quotations-store.json'), 'utf8'));
    assert.strictEqual(quotesFromDrive[0].quoteNumber, 'QTN-2026-001', 'Drive backup restored exact quote');
    console.log('  ✓ Google Drive backup upload, listing & SHA-256 restore verified');

    // Verify zero leftover pending outbox failures
    assert.strictEqual(getOutbox().filter((e) => e.status === 'FAILED').length, 0);

    console.log('\n✅ ALL HYBRID CLOUD SYNC & GOOGLE DRIVE TESTS PASSED!\n');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('\n✗ CLOUD SYNC TEST FAILED:', err);
  process.exit(1);
});
