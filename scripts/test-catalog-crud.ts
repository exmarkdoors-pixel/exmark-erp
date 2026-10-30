/**
 * EXMARK ERP — Catalog Master CRUD & Bulk Upload Test Suite
 */

import {
  getCatalogMaster,
  saveDoorModel,
  deleteDoorModel,
  saveColour,
  deleteColour,
  saveLock,
  deleteLock,
  bulkUploadCatalog,
} from '../lib/services/catalogService';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`[ASSERTION FAILED]: ${msg}`);
}

async function run() {
  console.log('===============================================================');
  console.log('🚀 EXMARK ERP: CATALOG CRUD & BULK UPLOAD TEST SUITE');
  console.log('===============================================================\n');

  // Test 1: Get Initial Catalog Master
  console.log('[TEST 1] Fetching Catalog Master...');
  const initial = await getCatalogMaster();
  assert(initial.models.length >= 6, 'Should have standard default models');
  assert(initial.colours.length >= 7, 'Should have standard default colours');
  assert(initial.locks.length >= 6, 'Should have standard default locks');
  console.log(`  ✅ PASSED: Loaded ${initial.models.length} models, ${initial.colours.length} colours, ${initial.locks.length} locks.\n`);

  // Test 2: Add and Edit Door Model
  console.log('[TEST 2] Testing Add & Edit Door Model...');
  const testModelCode = `EXM-TEST-${Date.now().toString().slice(-4)}`;
  const createdModel = await saveDoorModel({
    code: testModelCode,
    name: 'EXM-TEST-100 Heavy Duty Security Door',
    category: 'Commercial Door',
    basePrice: 8900,
    ratePerSqFt: 480,
    defaultThickness: '35mm',
  });
  assert(createdModel.code === testModelCode, 'Created model code should match');
  assert(createdModel.basePrice === 8900, 'Created model price should be 8900');

  // Edit Model
  const updatedModel = await saveDoorModel({
    id: createdModel.id,
    code: testModelCode,
    name: 'EXM-TEST-100 Heavy Duty Security Door (Updated)',
    basePrice: 9200,
  });
  assert(updatedModel.basePrice === 9200, 'Updated model price should be 9200');
  console.log('  ✅ PASSED: Model created and updated successfully.\n');

  // Test 3: Add and Delete Colour
  console.log('[TEST 3] Testing Add & Delete Colour Finish...');
  const testColour = await saveColour({
    code: 'EXGC-999',
    name: 'Kerala Royal Ebony Black',
    finishType: 'Matte UV',
    hexColor: '#18181B',
  });
  assert(testColour.code === 'EXGC-999', 'Colour code should match');

  const deleteColourSuccess = await deleteColour(testColour.id);
  assert(deleteColourSuccess === true, 'Colour should be successfully deleted');
  console.log('  ✅ PASSED: Colour created and deleted successfully.\n');

  // Test 4: Add and Delete Lock
  console.log('[TEST 4] Testing Add & Delete Lock Option...');
  const testLock = await saveLock({
    name: 'Godrej Biometric Smart Deadbolt (+₹1600)',
    lockType: 'Digital Smart Lock',
    price: 1600,
  });
  assert(testLock.price === 1600, 'Lock price should be 1600');

  const deleteLockSuccess = await deleteLock(testLock.id);
  assert(deleteLockSuccess === true, 'Lock should be successfully deleted');
  console.log('  ✅ PASSED: Lock created and deleted successfully.\n');

  // Test 5: Clean up test model
  await deleteDoorModel(createdModel.id);
  console.log('  ✅ PASSED: Test model cleaned up.\n');

  // Test 6: Bulk Upload & Update
  console.log('[TEST 6] Testing Bulk Upload & Upsert for Models...');
  const bulkItems = [
    {
      code: 'EXM-BULK-01',
      name: 'EXM-BULK-01 Fire Resistant Hospital Door',
      category: 'Commercial Door',
      basePrice: 9500,
      ratePerSqFt: 520,
    },
    {
      code: 'EXM-BULK-02',
      name: 'EXM-BULK-02 Acoustic Studio Door',
      category: 'Commercial Door',
      basePrice: 10500,
      ratePerSqFt: 580,
    },
  ];

  const bulkResult = await bulkUploadCatalog('MODELS', bulkItems);
  assert(bulkResult.inserted + bulkResult.updated === 2, 'Should process 2 items in bulk');
  assert(bulkResult.errors.length === 0, 'Should have 0 errors in bulk upload');
  console.log(`  ✅ PASSED: Bulk uploaded 2 models (inserted: ${bulkResult.inserted}, updated: ${bulkResult.updated}).\n`);

  // Clean up bulk items
  await deleteDoorModel('EXM-BULK-01');
  await deleteDoorModel('EXM-BULK-02');

  console.log('===============================================================');
  console.log('🎉 ALL CATALOG MASTER & BULK UPLOAD TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('❌ CATALOG TEST FAILED:', err);
  process.exit(1);
});
