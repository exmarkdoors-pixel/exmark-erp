import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert';

async function runTests() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-factory-test-'));
  const tempDataDir = path.join(tempRoot, 'data');
  const tempBackupDir = path.join(tempRoot, 'backups');

  process.env.EXMARK_DATA_DIR = tempDataDir;
  process.env.EXMARK_BACKUP_DIR = tempBackupDir;
  process.env.EXMARK_AUTO_BOOTSTRAP = 'false';
  process.env.EXMARK_LOCAL_FACTORY = 'true';

  try {
    fs.mkdirSync(tempDataDir, { recursive: true });
    fs.mkdirSync(tempBackupDir, { recursive: true });

    const { getDataFilePath } = await import('../lib/utils/dataPaths');
    const { resetAllModulesToZero } = await import('../lib/services/factoryResetService');
    const { ensureSchemaUpToDate, CURRENT_SCHEMA_VERSION } = await import('../lib/services/schemaMigrator');
    const { getBoqMaterialRates, saveBoqMaterialRates } = await import('../lib/services/boqRateService');
    const { getFrpRateCardSettings, saveFrpRateCardSettings } = await import('../lib/services/frpPricingEngine');
    const { getCustomFrames } = await import('../lib/services/frameService');
    const { getTolerancePresets } = await import('../lib/services/toleranceService');
    const { getContractors, getRateCard } = await import('../lib/services/contractorService');
    const { updateFactoryUserPassword, verifyFactoryUserCredentials } = await import('../lib/auth/userStore');
    const { verifyBackupIntegrity } = await import('../lib/services/backupService');
    const { buildPortableBackupBundle } = await import('../app/api/system/backup/download/route');
    const { restoreFromBundle } = await import('../app/api/system/backup/restore/route');

    console.log('[1/4] Initializing calibrated master config & seeding fake transaction data...');
    await getBoqMaterialRates();
    getFrpRateCardSettings();
    getCustomFrames();
    getTolerancePresets();

    // Seed fake transactions + contractors + customization revisions + fake EXM-BAK folders
    fs.writeFileSync(getDataFilePath('customers-store.json'), JSON.stringify([{ id: 'c1', name: 'Demo Builder' }]));
    fs.writeFileSync(getDataFilePath('leads-store.json'), JSON.stringify([{ id: 'l1', title: 'Demo Lead' }]));
    fs.writeFileSync(getDataFilePath('quotations-store.json'), JSON.stringify([{ id: 'q1', quoteNumber: 'QTN-01', totalAmount: 99000 }]));
    fs.writeFileSync(getDataFilePath('measurements-store.json'), JSON.stringify([{ id: 'm1', siteName: 'Demo Site' }]));
    fs.writeFileSync(getDataFilePath('production-store.json'), JSON.stringify([{ id: 'p1', prodOrderNumber: 'PRD-01' }]));
    fs.writeFileSync(getDataFilePath('boq-store.json'), JSON.stringify([{ id: 'b1' }]));
    fs.writeFileSync(getDataFilePath('boq-extra-items.json'), JSON.stringify([{ id: 'be1' }]));
    fs.writeFileSync(getDataFilePath('boq-lock-readiness.json'), JSON.stringify({ 'ORD-1': { lockReady: true } }));
    fs.writeFileSync(getDataFilePath('finance-store.json'), JSON.stringify({ invoices: [{ id: 'i1' }], payments: [{ id: 'pay1' }], targets: [{ id: 't1' }] }));
    fs.writeFileSync(getDataFilePath('fulfillment-store.json'), JSON.stringify({ dispatches: [{ id: 'd1' }], installations: [{ id: 'in1' }], warranties: [{ id: 'w1' }] }));
    fs.writeFileSync(getDataFilePath('purchases-store.json'), JSON.stringify([{ id: 'po1' }]));
    fs.writeFileSync(getDataFilePath('employees-store.json'), JSON.stringify([{ id: 'e1', name: 'Fake Staff' }]));
    fs.writeFileSync(
      getDataFilePath('contractors-store.json'),
      JSON.stringify({
        contractors: [{ id: 'CTR-001', name: 'Seed Contractor' }],
        rateCard: { id: 'RC-CUSTOM', name: 'Custom Factory Rates', moldingDoorWithFrame: 525 },
        workRecords: [{ id: 'W1' }],
        payouts: [{ id: 'P1' }],
      })
    );
    fs.writeFileSync(
      getDataFilePath('inventory-store.json'),
      JSON.stringify([{ id: 'INV-1', itemCode: 'RM-RESIN', name: 'Resin', currentStock: 500, status: 'IN_STOCK' }])
    );
    fs.writeFileSync(
      getDataFilePath('customization-store.json'),
      JSON.stringify({
        active: { companyProfile: { brandName: 'MY FACTORY DOORS' } },
        draft: { companyProfile: { brandName: 'MY FACTORY DOORS' } },
        revisions: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
      })
    );
    fs.mkdirSync(path.join(tempBackupDir, 'EXM-BAK-OLD-TEST-1'), { recursive: true });
    fs.mkdirSync(path.join(tempBackupDir, 'EXM-BAK-OLD-TEST-2'), { recursive: true });

    console.log('[2/4] Running resetAllModulesToZero() & verifying complete clean wipe + formula preservation...');
    const resetRes = await resetAllModulesToZero({
      cleanTestBackups: true,
      resetEmployees: true,
      inventoryZeroMode: 'keep-zero',
      createPreResetBackup: true,
    });

    assert.strictEqual(resetRes.success, true, 'resetAllModulesToZero succeeded');
    assert.ok(resetRes.preResetBackupId, 'PRE_RESET safety snapshot created');
    assert.strictEqual(resetRes.removedTestBackups, 2, 'Old test EXM-BAK backups cleaned');

    const emptyArrayFiles = [
      'customers-store.json',
      'leads-store.json',
      'quotations-store.json',
      'measurements-store.json',
      'production-store.json',
      'boq-store.json',
      'boq-extra-items.json',
      'purchases-store.json',
      'employees-store.json',
    ];
    for (const fname of emptyArrayFiles) {
      const content = JSON.parse(fs.readFileSync(getDataFilePath(fname), 'utf8'));
      assert.deepStrictEqual(content, [], `${fname} cleared to []`);
    }

    assert.deepStrictEqual(JSON.parse(fs.readFileSync(getDataFilePath('boq-lock-readiness.json'), 'utf8')), {});
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(getDataFilePath('finance-store.json'), 'utf8')), {
      invoices: [],
      payments: [],
      targets: [],
    });
    assert.strictEqual(getContractors().length, 0, 'Contractors list is clean empty [] after reset');
    assert.strictEqual(getRateCard().moldingDoorWithFrame, 525, 'Custom contractor rateCard preserved');

    const invAfter = JSON.parse(fs.readFileSync(getDataFilePath('inventory-store.json'), 'utf8'));
    assert.strictEqual(invAfter[0].currentStock, 0, 'Inventory SKU stock set to 0 cleanly');

    const custStoreAfter = JSON.parse(fs.readFileSync(getDataFilePath('customization-store.json'), 'utf8'));
    assert.strictEqual(custStoreAfter.revisions.length, 1, 'Customization revisions compacted to 1 baseline');
    assert.strictEqual(custStoreAfter.active.companyProfile.brandName, 'MY FACTORY DOORS', 'Company profile preserved');

    const boqRatesAfter = await getBoqMaterialRates();
    assert.ok(boqRatesAfter.lockBoxProfiles.some((k) => k.name.includes('Baby Latch Black') && k.boxCost === 200), 'Lock box kit Baby Latch preserved');
    assert.ok(boqRatesAfter.lockBoxProfiles.some((k) => k.name.includes('Antique Exmark') && k.boxCost === 600), 'Lock box kit Antique Exmark preserved');

    console.log('[3/4] Testing zero-data-loss schema migration & persistent user password update...');
    // Add live customer, quote, custom resin rate, custom FRP rate & change user password
    fs.writeFileSync(getDataFilePath('customers-store.json'), JSON.stringify([{ id: 'CUST-LIVE-1', name: 'Real Factory Client' }]));
    fs.writeFileSync(getDataFilePath('quotations-store.json'), JSON.stringify([{ id: 'QT-LIVE-1', totalAmount: 185000 }]));
    await saveBoqMaterialRates({ resinRatePerKg: 215 });

    const frpBefore = getFrpRateCardSettings();
    const modifiedFrp = {
      ...frpBefore,
      categoryPieceRates: { ...frpBefore.categoryPieceRates, A: 7450 },
    };
    saveFrpRateCardSettings(modifiedFrp);

    // Strip an optional additive field and set schemaVersion to 0 to simulate pre-update data
    const rawRateCard = JSON.parse(fs.readFileSync(getDataFilePath('pricing-rate-card.json'), 'utf8'));
    delete rawRateCard.defaultInstallationRatePerDoor;
    fs.writeFileSync(getDataFilePath('pricing-rate-card.json'), JSON.stringify(rawRateCard, null, 2));
    fs.writeFileSync(getDataFilePath('schema-version.json'), JSON.stringify({ schemaVersion: 0, appVersion: '0.1.0', lastMigratedAt: '', appliedMigrations: [] }));

    await updateFactoryUserPassword('director@exmarkdoors.com', 'FactoryPass#99');

    const mig1 = await ensureSchemaUpToDate({ createPreUpdateBackup: true });
    assert.strictEqual(mig1.migrated, true, 'Migration applied from v0 -> v2');
    assert.strictEqual(mig1.currentVersion, CURRENT_SCHEMA_VERSION, 'Schema upgraded to latest version');
    assert.ok(mig1.preUpdateBackupId, 'Pre-update backup created cleanly');

    const migVerify = await verifyBackupIntegrity(mig1.preUpdateBackupId!);
    assert.strictEqual(migVerify.valid, true, 'Pre-update snapshot passes SHA-256 verification');

    const mig2 = await ensureSchemaUpToDate({ createPreUpdateBackup: true });
    assert.strictEqual(mig2.migrated, false, 'Migration is idempotent on repeat run');

    const custLive = JSON.parse(fs.readFileSync(getDataFilePath('customers-store.json'), 'utf8'));
    const quoteLive = JSON.parse(fs.readFileSync(getDataFilePath('quotations-store.json'), 'utf8'));
    const ratesLive = await getBoqMaterialRates();
    const frpLive = getFrpRateCardSettings();

    assert.strictEqual(custLive[0].name, 'Real Factory Client', 'Live customer preserved untouched');
    assert.strictEqual(quoteLive[0].totalAmount, 185000, 'Live quotation preserved untouched');
    assert.strictEqual(ratesLive.resinRatePerKg, 215, 'User custom BOQ resin rate preserved');
    assert.strictEqual(frpLive.categoryPieceRates.A, 7450, 'User custom Category A FRP rate preserved');
    assert.strictEqual(frpLive.defaultInstallationRatePerDoor, 500, 'Missing additive field backfilled safely');

    const validAuth = await verifyFactoryUserCredentials('director@exmarkdoors.com', 'FactoryPass#99');
    const oldAuth = await verifyFactoryUserCredentials('director@exmarkdoors.com', 'Exmark@2026');
    assert.ok(validAuth, 'Updated factory user password works after migration');
    assert.strictEqual(oldAuth, null, 'Old default password rejected after password change');

    console.log('[4/4] Testing portable backup bundle download, SHA-256 tamper guard & safe restore...');
    const bundle = buildPortableBackupBundle();
    assert.ok(bundle.storeCount >= 10, 'Portable bundle captured all vault stores');

    // Tamper test: modify one byte in bundle.stores without updating checksum -> MUST throw
    const tampered = JSON.parse(JSON.stringify(bundle));
    tampered.stores['customers-store.json'] = '[{"id":"HACK"}]';
    let tamperRejected = false;
    try {
      await restoreFromBundle(tampered);
    } catch {
      tamperRejected = true;
    }
    assert.strictEqual(tamperRejected, true, 'Tampered backup bundle rejected by SHA-256 check');

    // Corrupt local file, restore valid bundle -> verify restoration + PRE_RESTORE archive
    fs.writeFileSync(getDataFilePath('customers-store.json'), '[]');
    const restoreRes = await restoreFromBundle(bundle);
    assert.ok(restoreRes.preRestoreBackupId, 'PRE_RESTORE snapshot created prior to restore');
    const restoredCust = JSON.parse(fs.readFileSync(getDataFilePath('customers-store.json'), 'utf8'));
    assert.strictEqual(restoredCust[0].name, 'Real Factory Client', 'Restored exact live factory customer');

    console.log('ALL FACTORY RESET, ZERO-DATA-LOSS MIGRATION & BACKUP/RESTORE TESTS PASSED!');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
