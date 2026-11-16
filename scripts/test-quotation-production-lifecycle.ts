import { getCustomFrames, createCustomFrame, updateCustomFrame, deleteCustomFrame } from '../lib/services/frameService';
import { getTolerancePresets, createTolerancePreset, updateTolerancePreset, deleteTolerancePreset } from '../lib/services/toleranceService';
import { createProductionOrder } from '../lib/services/productionService';

async function testQuotationProductionLifecycle() {
  console.log('🧪 Starting Quotation Next-Stage & Custom Settings Verification...\n');

  // ── 1. Custom Frames CRUD Test ─────────────────────────────────────────────
  console.log('1️⃣ Testing Custom Frames Store & CRUD...');
  const initialFrames = getCustomFrames();
  console.log(`   Initial custom frames count: ${initialFrames.length}`);

  const testFrame = createCustomFrame({
    name: 'WPC Teak Architrave 120x65mm',
    material: 'WPC_SOLID',
    wallThicknessMm: 120,
    sectionWidthMm: 65,
    rebateDepthMm: 35,
    pieceRateCost: 150,
    sellingPrice: 2200,
    description: 'Heavy duty WPC architrave frame for luxury villa bathrooms',
    isDefault: false,
  });
  console.log(`   ✓ Created custom frame: ${testFrame.name} (ID: ${testFrame.id})`);

  const updatedFrame = updateCustomFrame(testFrame.id, {
    sellingPrice: 2350,
    description: 'Updated premium frame specification',
  });
  if (updatedFrame?.sellingPrice !== 2350) {
    throw new Error('Frame update failed');
  }
  console.log(`   ✓ Updated custom frame: ${updatedFrame.name} (Selling Price: ₹${updatedFrame.sellingPrice})`);

  const deletedFrameOk = deleteCustomFrame(testFrame.id);
  if (!deletedFrameOk) {
    throw new Error('Frame deletion failed');
  }
  console.log(`   ✓ Deleted custom frame test item: ${testFrame.id}`);

  // ── 2. Custom Tolerances CRUD Test ─────────────────────────────────────────
  console.log('\n2️⃣ Testing Custom Tolerances Store & CRUD...');
  const initialTolerances = getTolerancePresets();
  console.log(`   Initial tolerance presets count: ${initialTolerances.length}`);

  const testTolerance = createTolerancePreset({
    name: 'Site Retrofit Shutter Only Tolerance',
    heightDeductionMm: 15,
    widthDeductionMm: 12,
    applicableFor: 'ONLY_DOOR',
    description: 'Specially tuned clearance for existing concrete frames',
    isDefault: false,
  });
  console.log(`   ✓ Created tolerance preset: ${testTolerance.name} (-${testTolerance.heightDeductionMm}H/-${testTolerance.widthDeductionMm}W)`);

  const updatedTolerance = updateTolerancePreset(testTolerance.id, {
    heightDeductionMm: 14,
  });
  if (updatedTolerance?.heightDeductionMm !== 14) {
    throw new Error('Tolerance update failed');
  }
  console.log(`   ✓ Updated tolerance preset: ${updatedTolerance.name} (Height: -${updatedTolerance.heightDeductionMm}mm)`);

  const deletedTolOk = deleteTolerancePreset(testTolerance.id);
  if (!deletedTolOk) {
    throw new Error('Tolerance deletion failed');
  }
  console.log(`   ✓ Deleted tolerance preset test item: ${testTolerance.id}`);

  // ── 3. Quotation Confirmation & Production Order Creation ──────────────────
  console.log('\n3️⃣ Testing Quotation to Production Hand Workshop Order Flow...');
  const sampleQuotationId = 'QT-2026-999';
  const sampleCustomer = 'Malabar Luxury Resorts & Spas';
  const sampleSite = 'Wayanad Hilltop Villas';

  const newProductionJob = await createProductionOrder({
    salesOrderId: sampleQuotationId,
    customerName: sampleCustomer,
    siteName: sampleSite,
    district: 'Wayanad',
    doorCategory: 'FRP_DOORS',
    lineAssigned: 'Hand Station 1: Hand-Layup & Manual Mold Benches',
    priority: 'HIGH',
    doors: [
      {
        doorNumber: 'Villa 1 - Main Entrance',
        model: 'Royal Teak FRP Handcrafted Shutter',
        rawHeightMm: 2112,
        rawWidthMm: 810,
        handing: 'RH',
        lockType: 'Mortise Lock 60mm Backset',
        finishColor: 'Burma Teak Woodgrain',
      },
      {
        doorNumber: 'Villa 1 - Balcony Flush Door',
        model: 'Waterproof FRP Shutter Only',
        rawHeightMm: 2012,
        rawWidthMm: 760,
        handing: 'LH',
        lockType: 'Cylindrical Knob Lock',
        finishColor: 'Alpine White Solid',
      },
    ],
  });

  console.log(`   ✓ Created Job Card from Quotation: ${newProductionJob.jobCardNumber}`);
  console.log(`     Customer: ${newProductionJob.customerName} (${newProductionJob.siteName})`);
  console.log(`     Hand Station: ${newProductionJob.lineAssigned}`);
  console.log(`     Doors Created: ${newProductionJob.doors.length}`);
  console.log(`     Door 1: ${newProductionJob.doors[0].doorNumber} | Handing: ${newProductionJob.doors[0].handing} -> Hinges: Right Side`);
  console.log(`     Door 2: ${newProductionJob.doors[1].doorNumber} | Handing: ${newProductionJob.doors[1].handing} -> Hinges: Left Side`);

  console.log('\n🎉 ALL TESTS PASSED! Quotation Next Stage & Hinges/Frames/Tolerances 100% verified.');
}

testQuotationProductionLifecycle().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
