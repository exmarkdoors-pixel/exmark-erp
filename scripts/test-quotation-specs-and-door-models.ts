import assert from 'assert';
import {
  saveCustomDoorModel,
  getAllAvailableDoorModels,
} from '../lib/services/doorModelCatalogService';
import {
  resolveItemLockName,
  resolveItemColourName,
  resolveItemThickness,
  resolveItemFrameName,
} from '../components/modules/quotations/PrintDocumentHub';

async function runTests() {
  console.log('--- 1. Testing Door Model Simplification ---');
  // Saving a model with ONLY code and price (no title, no material)
  const testCode = `EXM-TEST-${Date.now().toString().slice(-4)}`;
  const savedModel = await saveCustomDoorModel({
    code: testCode,
    defaultPrice: 7750,
  });

  console.log(`Saved model:`, savedModel);
  assert.strictEqual(savedModel.code, testCode.toUpperCase(), 'Code should match');
  assert.strictEqual(savedModel.defaultPrice, 7750, 'Price should match');
  assert.strictEqual(savedModel.name, testCode.toUpperCase(), 'Name should default to code');
  assert.ok(savedModel.code, 'Should have a model code');

  const allModels = getAllAvailableDoorModels();
  const found = allModels.find((m) => m.code === testCode.toUpperCase());
  assert.ok(found, 'New model should be found in catalog');
  console.log('✓ Door model simplification (only code and price required) verified!');

  console.log('\n--- 2. Testing 5-Specification Resolution on Quotation Items ---');

  // Test Case A: Modern Row with explicit names
  const modernRow = {
    id: 1,
    modelId: 'MOD-A-101',
    modelCode: 'EXM-A-101',
    lockName: 'MORTISE 6-LEVER PREMIUM',
    colourName: 'Rose Wood Glossy',
    thicknessLabel: '35 mm Extra Heavy',
    frameTypeName: 'Super 100×50mm Chowkhat Section',
    height: 210,
    widthTop: 80,
    unit: 'cm',
  };

  assert.strictEqual(resolveItemLockName(modernRow), 'MORTISE 6-LEVER PREMIUM');
  assert.strictEqual(resolveItemColourName(modernRow), 'Rose Wood Glossy');
  assert.strictEqual(resolveItemThickness(modernRow), '35 mm Extra Heavy');
  assert.strictEqual(resolveItemFrameName(modernRow), 'Super 100×50mm Chowkhat Section');
  console.log('✓ Modern row explicit specifications resolved accurately:');
  console.log(`  - Lock: ${resolveItemLockName(modernRow)}`);
  console.log(`  - Colour: ${resolveItemColourName(modernRow)}`);
  console.log(`  - Thickness: ${resolveItemThickness(modernRow)}`);
  console.log(`  - Frame: ${resolveItemFrameName(modernRow)}`);

  // Test Case B: Legacy / Sparse Row with only IDs
  const sparseRow = {
    id: 2,
    modelId: 'MOD-A-102',
    lockId: 'lock-none',
    colourId: 'col-teak-matte',
    thicknessId: 'thk-30mm',
    frameTypeId: 'FRM-REGULAR',
    height: 80,
    widthTop: 30,
    unit: 'inch',
  };

  assert.ok(resolveItemLockName(sparseRow).includes('BABY LATCH'));
  assert.ok(resolveItemColourName(sparseRow).includes('Teak'));
  assert.ok(resolveItemThickness(sparseRow).includes('30mm'));
  assert.ok(resolveItemFrameName(sparseRow).includes('72mm') || resolveItemFrameName(sparseRow).includes('Regular'));
  console.log('✓ Sparse/ID-only row fallback specifications resolved:');
  console.log(`  - Lock: ${resolveItemLockName(sparseRow)}`);
  console.log(`  - Colour: ${resolveItemColourName(sparseRow)}`);
  console.log(`  - Thickness: ${resolveItemThickness(sparseRow)}`);
  console.log(`  - Frame: ${resolveItemFrameName(sparseRow)}`);

  // Test Case C: Row with NO metadata (completely empty fallback defaults)
  const emptyRow = {
    id: 3,
    height: 210,
    widthTop: 80,
  };

  assert.strictEqual(resolveItemLockName(emptyRow), 'BABY LATCH');
  assert.strictEqual(resolveItemColourName(emptyRow), 'Natural Teak');
  assert.strictEqual(resolveItemThickness(emptyRow), '30 mm');
  assert.strictEqual(resolveItemFrameName(emptyRow), 'Regular 72×50mm Chowkhat Section');
  console.log('✓ Empty row defaults verified:');
  console.log(`  - Lock: ${resolveItemLockName(emptyRow)}`);
  console.log(`  - Colour: ${resolveItemColourName(emptyRow)}`);
  console.log(`  - Thickness: ${resolveItemThickness(emptyRow)}`);
  console.log(`  - Frame: ${resolveItemFrameName(emptyRow)}`);

  // Test Case D: "Without Lock" accessory flag
  const noLockRow = {
    withoutAccessories: true,
  };
  assert.strictEqual(resolveItemLockName(noLockRow), 'Without Lock');
  console.log('✓ Without Lock condition verified!');

  console.log('\n=========================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('=========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
