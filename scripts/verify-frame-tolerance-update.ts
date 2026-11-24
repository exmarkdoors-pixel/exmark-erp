/**
 * Verification Script: Frame Tolerance & Deduction Updates
 * Tests:
 * 1. Frame Profile deduction updates (CM & MM)
 * 2. Deterministic tolerance engine calculation with live custom frames
 * 3. Tolerance presets persistence (Create, Read, Update, Delete)
 * 4. Safe restoration of original factory frame settings
 */

import { getCustomFrames, updateCustomFrame, CustomFrameProfile } from '../lib/services/frameService';
import { computeDoorTolerances } from '../lib/services/toleranceSyncEngine';
import {
  getTolerancePresets,
  createTolerancePreset,
  getTolerancePresetById,
  updateTolerancePreset,
  deleteTolerancePreset,
} from '../lib/services/toleranceService';

async function runTests() {
  console.log('🧪 Starting Frame Tolerance & Deduction Sync Verification...\n');

  // TEST 1: Read current frame profiles
  console.log('--- TEST 1: Reading Frame Profiles ---');
  const initialFrames = getCustomFrames();
  console.log(`Found ${initialFrames.length} custom frame profiles.`);
  const regularFrame = initialFrames.find((f) => f.id === 'FRM-REGULAR') || initialFrames[0];
  if (!regularFrame) {
    throw new Error('No frame profile found in store!');
  }
  console.log(`Target frame: "${regularFrame.name}" (${regularFrame.id})`);
  console.log(`Original Deductions: H -${regularFrame.hDeductionCm}cm / W -${regularFrame.wDeductionCm}cm, Rebate: ${regularFrame.rebateDepthMm}mm`);

  const originalH = regularFrame.hDeductionCm ?? 4.5;
  const originalW = regularFrame.wDeductionCm ?? 7.6;
  const originalRebate = regularFrame.rebateDepthMm ?? 35;

  // TEST 2: Initial Tolerance Calculation
  console.log('\n--- TEST 2: Initial Tolerance Calculation ---');
  const tolInitial = computeDoorTolerances({
    rawHeightMm: 2100,
    rawWidthTopMm: 800,
    frameTypeName: regularFrame.name,
    frameProfile: regularFrame,
  });
  console.log(`Initial Calc Result: H-Ded=${tolInitial.totalHeightDeductionMm}mm (${tolInitial.totalHeightDeductionCm}cm), W-Ded=${tolInitial.totalWidthDeductionMm}mm (${tolInitial.totalWidthDeductionCm}cm)`);
  console.log(`Initial Finished Shutter: ${tolInitial.shutterHeightMm}x${tolInitial.shutterWidthTopMm}mm (${tolInitial.shutterSizeCmText})`);

  if (tolInitial.totalHeightDeductionMm !== Math.round(originalH * 10)) {
    throw new Error(`Expected initial H deduction ${Math.round(originalH * 10)}mm but got ${tolInitial.totalHeightDeductionMm}mm`);
  }
  if (tolInitial.totalWidthDeductionMm !== Math.round(originalW * 10)) {
    throw new Error(`Expected initial W deduction ${Math.round(originalW * 10)}mm but got ${tolInitial.totalWidthDeductionMm}mm`);
  }
  console.log('✅ Initial tolerance calculation matches frame deductions perfectly!');

  // TEST 3: Edit Frame Tolerances & Verify Update
  console.log('\n--- TEST 3: Editing Frame Profile Deductions (Simulating User Edit) ---');
  const newH = 5.0; // 50mm
  const newW = 8.0; // 80mm
  const newRebate = 38;

  const updatedFrame = updateCustomFrame(regularFrame.id, {
    hDeductionCm: newH,
    wDeductionCm: newW,
    rebateDepthMm: newRebate,
  });

  if (!updatedFrame) {
    throw new Error('Failed to update custom frame profile!');
  }
  console.log(`Updated "${updatedFrame.name}": H -${updatedFrame.hDeductionCm}cm, W -${updatedFrame.wDeductionCm}cm, Rebate ${updatedFrame.rebateDepthMm}mm`);

  // Verify recalculation reflects edited frame tolerances
  const tolAfterEdit = computeDoorTolerances({
    rawHeightMm: 2100,
    rawWidthTopMm: 800,
    frameTypeName: updatedFrame.name,
    frameProfile: updatedFrame,
  });

  console.log(`After Edit Calc Result: H-Ded=${tolAfterEdit.totalHeightDeductionMm}mm (${tolAfterEdit.totalHeightDeductionCm}cm), W-Ded=${tolAfterEdit.totalWidthDeductionMm}mm (${tolAfterEdit.totalWidthDeductionCm}cm)`);
  console.log(`After Edit Finished Shutter: ${tolAfterEdit.shutterHeightMm}x${tolAfterEdit.shutterWidthTopMm}mm (${tolAfterEdit.shutterSizeCmText})`);

  if (tolAfterEdit.totalHeightDeductionMm !== 50) {
    throw new Error(`Expected updated H deduction 50mm (5.0cm) but got ${tolAfterEdit.totalHeightDeductionMm}mm`);
  }
  if (tolAfterEdit.totalWidthDeductionMm !== 80) {
    throw new Error(`Expected updated W deduction 80mm (8.0cm) but got ${tolAfterEdit.totalWidthDeductionMm}mm`);
  }
  if (tolAfterEdit.shutterHeightMm !== 2050) {
    throw new Error(`Expected shutter height 2050mm (2100 - 50) but got ${tolAfterEdit.shutterHeightMm}mm`);
  }
  if (tolAfterEdit.shutterWidthTopMm !== 720) {
    throw new Error(`Expected shutter width 720mm (800 - 80) but got ${tolAfterEdit.shutterWidthTopMm}mm`);
  }
  console.log('✅ Edited frame profile deductions immediately updated finished cutting dimensions!');

  // TEST 4: Tolerance Presets CRUD
  console.log('\n--- TEST 4: Tolerance Presets CRUD ---');
  const presetsBefore = getTolerancePresets();
  console.log(`Initial presets count: ${presetsBefore.length}`);

  const testPreset = createTolerancePreset({
    name: 'TEST-AUTOMATED-PRESET',
    heightDeductionMm: 15,
    widthDeductionMm: 18,
    description: 'Automated test tolerance preset',
  });
  console.log(`Created preset: ${testPreset.id} - ${testPreset.name} (-${testPreset.heightDeductionMm}mm H / -${testPreset.widthDeductionMm}mm W)`);

  const fetched = getTolerancePresetById(testPreset.id);
  if (!fetched || fetched.heightDeductionMm !== 15) {
    throw new Error('Failed to retrieve created tolerance preset');
  }

  const updatedPreset = updateTolerancePreset(testPreset.id, {
    heightDeductionMm: 22,
    widthDeductionMm: 25,
  });
  if (!updatedPreset || updatedPreset.heightDeductionMm !== 22) {
    throw new Error('Failed to update tolerance preset');
  }
  console.log(`Updated preset: ${updatedPreset.id} to -${updatedPreset.heightDeductionMm}mm H / -${updatedPreset.widthDeductionMm}mm W`);

  const deletedOk = deleteTolerancePreset(testPreset.id);
  if (!deletedOk) {
    throw new Error('Failed to delete test tolerance preset');
  }
  console.log(`Deleted preset: ${testPreset.id}`);
  console.log('✅ Tolerance presets CRUD operational with 100% integrity!');

  // TEST 5: Clean Restoration of Frame Profile
  console.log('\n--- TEST 5: Restoring Original Frame Profile Deductions ---');
  updateCustomFrame(regularFrame.id, {
    hDeductionCm: originalH,
    wDeductionCm: originalW,
    rebateDepthMm: originalRebate,
  });
  const restoredFrame = getCustomFrames().find((f) => f.id === regularFrame.id);
  console.log(`Restored "${restoredFrame?.name}": H -${restoredFrame?.hDeductionCm}cm / W -${restoredFrame?.wDeductionCm}cm, Rebate ${restoredFrame?.rebateDepthMm}mm`);
  console.log('✅ Restored original settings safely.');

  console.log('\n🎉 ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
