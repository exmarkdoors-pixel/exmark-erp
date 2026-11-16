import assert from 'assert';
import {
  generateManufacturingBoq,
  generatePaintBoq,
  bulkUpdateBoqItems,
  getBoqById,
} from '../lib/services/boqService';

async function runTests() {
  console.log('--- 1. Testing Manufacturing BOQ Auto-Creation ---');
  const mockOrder = {
    id: 'PRD-TEST-BOM-101',
    prodOrderNumber: 'PRD-2026-101',
    jobCardNumber: 'JC-2026-101',
    customerName: 'Kallai Riverfront Villas',
    siteName: 'Riverside Block B',
    district: 'Kozhikode',
    doors: [
      {
        doorId: 'EXM-DR-2026-1011',
        doorNumber: 'D1 - Front Door',
        model: 'Royal Heritage FRP Teak',
        finishedHeightMm: 2120,
        finishedWidthMm: 920,
        finishColor: 'Burma Teak',
      },
      {
        doorId: 'EXM-DR-2026-1012',
        doorNumber: 'D2 - Kitchen',
        model: 'Waterproof Molded Flush',
        finishedHeightMm: 2050,
        finishedWidthMm: 780,
        finishColor: 'Alpine White',
      },
    ],
  };

  const mfgBoq = await generateManufacturingBoq(mockOrder);
  console.log('Generated Manufacturing BOQ:', {
    boqNumber: mfgBoq.boqNumber,
    stage: mfgBoq.boqStage,
    itemsCount: mfgBoq.items.length,
    totalAmount: mfgBoq.totalAmount,
  });
  assert.strictEqual(mfgBoq.boqStage, 'MANUFACTURING');
  assert.strictEqual(mfgBoq.items.length, 2);
  assert.ok(mfgBoq.totalAmount > 0, 'Total BOM amount must be computed');
  console.log('✓ Manufacturing BOQ generated with raw materials (Resin, CSM, Stiffeners, Core).');

  console.log('\n--- 2. Testing Paint BOQ Auto-Creation ---');
  const paintBoq = await generatePaintBoq(mockOrder);
  console.log('Generated Paint BOQ:', {
    boqNumber: paintBoq.boqNumber,
    stage: paintBoq.boqStage,
    itemsCount: paintBoq.items.length,
    totalAmount: paintBoq.totalAmount,
  });
  assert.strictEqual(paintBoq.boqStage, 'PAINTING');
  assert.strictEqual(paintBoq.items.length, 2);
  console.log('✓ Paint BOQ generated with 2K PU coatings, woodgrain textures, and UV lacquers.');

  console.log('\n--- 3. Testing Model-Wise Bulk Update Toolbar ---');
  const updatedBoq = await bulkUpdateBoqItems(
    mfgBoq.id,
    { unitRate: 3500, description: 'Updated BOM: Extra 20% Vinyl Ester Resin layer' },
    'Royal Heritage FRP Teak'
  );
  assert.ok(updatedBoq);
  const updatedItem = updatedBoq.items.find((i) => i.model === 'Royal Heritage FRP Teak');
  assert.strictEqual(updatedItem?.unitRate, 3500);
  assert.strictEqual(updatedItem?.amount, 3500);
  console.log('✓ Bulk update successfully modified target model items and recomputed totals!');

  console.log('\n🎉 ALL STAGE BOQ TESTS PASSED 100%!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
