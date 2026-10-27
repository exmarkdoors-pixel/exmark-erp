import fs from 'fs';
import path from 'path';
import {
  validateAndBumpVersion,
  acquireOrHeartbeatLease,
  releaseLease,
  getEntityVersion,
} from '../lib/services/concurrencyService';

async function runPhase8Tests() {
  console.log('--- RUNNING PHASE 8: MULTI-PLATFORM & CONCURRENCY TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(desc: string, cond: boolean) {
    if (cond) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Verify PWA Manifest
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    assert('manifest.json exists', fs.existsSync(manifestPath));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert('Manifest short_name is EXMARK ERP', manifest.short_name === 'EXMARK ERP');
    assert('Manifest theme_color is #E63946 (EXMARK Red)', manifest.theme_color === '#E63946');
    assert('Manifest background_color is #0B132B (EXMARK Navy)', manifest.background_color === '#0B132B');
    assert('Manifest display mode is standalone', manifest.display === 'standalone');
    assert('Manifest has 192 and 512 icons', manifest.icons.length >= 2);

    // 2. Verify Service Worker
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    assert('sw.js exists', fs.existsSync(swPath));
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert('Service worker handles install event', swContent.includes("addEventListener('install'"));
    assert('Service worker implements network-first with cache fallback', swContent.includes("fetch(request)"));

    // 3. Verify Electron setup
    const mainJsPath = path.join(process.cwd(), 'electron', 'main.js');
    const preloadJsPath = path.join(process.cwd(), 'electron', 'preload.js');
    const builderYmlPath = path.join(process.cwd(), 'electron-builder.yml');

    assert('electron/main.js exists', fs.existsSync(mainJsPath));
    assert('electron/preload.js exists', fs.existsSync(preloadJsPath));
    assert('electron-builder.yml exists', fs.existsSync(builderYmlPath));

    const mainJs = fs.readFileSync(mainJsPath, 'utf8');
    assert('Electron main enforces single instance lock', mainJs.includes('requestSingleInstanceLock'));
    assert('Electron main configures contextIsolation and sandbox', mainJs.includes('contextIsolation: true') && mainJs.includes('sandbox: true'));

    const preloadJs = fs.readFileSync(preloadJsPath, 'utf8');
    assert('Electron preload exposes electronAPI via contextBridge', preloadJs.includes('contextBridge.exposeInMainWorld'));

    // 4. Test Concurrency & Optimistic Locking
    const testEntityId = `QT-TEST-${Date.now()}`;
    const initialVersion = await getEntityVersion('QUOTATION', testEntityId);
    assert('Initial version defaults to 1 for new entity', initialVersion === 1);

    // Lease testing: User 1 leases record
    const lease1 = await acquireOrHeartbeatLease({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      userId: 'usr-palakkad-1',
      userName: 'Palakkad Sales Desk',
    });
    assert('User 1 successfully acquires editing lease', lease1.acquired === true);

    // User 2 attempts to lease while User 1 holds lease
    const lease2 = await acquireOrHeartbeatLease({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      userId: 'usr-kochi-2',
      userName: 'Kochi Branch Desk',
    });
    assert('User 2 lease request rejected due to active conflict', lease2.acquired === false);
    assert('Conflict identifies User 1 name correctly', lease2.conflictUser === 'Palakkad Sales Desk');

    // User 1 releases lease
    await releaseLease('QUOTATION', testEntityId, 'usr-palakkad-1');

    // User 2 now acquires lease
    const lease2Retry = await acquireOrHeartbeatLease({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      userId: 'usr-kochi-2',
      userName: 'Kochi Branch Desk',
    });
    assert('User 2 acquires lease after User 1 releases it', lease2Retry.acquired === true);

    // Optimistic locking: User 1 saves with expectedVersion 1
    const save1 = await validateAndBumpVersion({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      expectedVersion: 1,
      modifiedBy: 'Palakkad Sales Desk',
    });
    assert('User 1 save succeeded with expectedVersion 1', save1.success === true);
    assert('Version bumped from 1 to 2', save1.newVersion === 2);

    // User 2 attempts to save with stale expectedVersion 1
    const save2Stale = await validateAndBumpVersion({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      expectedVersion: 1,
      modifiedBy: 'Kochi Branch Desk',
    });
    assert('User 2 stale save failed with conflict error', save2Stale.success === false && save2Stale.conflict === true);
    assert('Conflict message informs user about current version', save2Stale.currentVersion === 2);

    // User 2 reloads and saves with expectedVersion 2
    const save2Resolved = await validateAndBumpVersion({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      expectedVersion: 2,
      modifiedBy: 'Kochi Branch Desk',
    });
    assert('User 2 resolved save succeeded with expectedVersion 2', save2Resolved.success === true);
    assert('Version bumped from 2 to 3', save2Resolved.newVersion === 3);

    // Final check
    const finalVersion = await getEntityVersion('QUOTATION', testEntityId);
    assert('Final stored version is 3', finalVersion === 3);

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log(`\nPHASE 8 SUMMARY: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runPhase8Tests();
