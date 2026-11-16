import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  calculateDoorBatchBoq,
  cm3ToCuFt,
  cmToRunningFeet,
  computeDoorSqFt,
  DEFAULT_BOQ_MATERIAL_RATES,
  resolvePigmentRateForColour,
} from '../lib/utils/boqFormulaEngine';
import { DEFAULT_FRAME_PROFILES } from '../lib/utils/frameDefaults';
import { getCustomFrames, updateCustomFrame } from '../lib/services/frameService';
import { getBoqMaterialRates, saveBoqMaterialRates } from '../lib/services/boqRateService';
import { generateManufacturingBoq } from '../lib/services/boqService';
import {
  addBoqExtraItem,
  deleteBoqExtraItem,
  listBoqExtraItems,
  updateBoqExtraItem,
} from '../lib/services/boqExtraItemsService';
import { getAllLockReadiness, setLockReadiness } from '../lib/services/boqLockReadinessService';
import { buildCommonBasicKitItems, DEFAULT_LOCK_BOX_PROFILES } from '../lib/utils/boqFormulaEngine';

function approxEqual(actual: number, expected: number, tol = 1e-4, label = ''): void {
  const diff = Math.abs(actual - expected);
  assert(
    diff <= tol,
    `${label ? label + ': ' : ''}Expected ${expected} (±${tol}), got ${actual}`
  );
}

async function runTests() {
  console.log('🧪 Running Auto-BOQ Material Calculation Tests...');

  const filesToBackup = [
    path.join(process.cwd(), 'data', 'custom-frames-store.json'),
    path.join(process.cwd(), 'data', 'boq-material-rates.json'),
    path.join(process.cwd(), 'data', 'boq-store.json'),
    path.join(process.cwd(), 'data', 'boq-extra-items.json'),
    path.join(process.cwd(), 'data', 'boq-lock-readiness.json'),
  ];

  const backups = new Map<string, string | null>();
  for (const fp of filesToBackup) {
    backups.set(fp, fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null);
  }

  try {
    // 1. Baseline 80x210 cm single door with Regular Frame
    const single = calculateDoorBatchBoq(
      [
        {
          doorNumber: 'TEST-D1',
          widthCm: 80,
          heightCm: 210,
          frameTypeId: 'FRM-REGULAR',
          frameTypeName: 'Regular Frame',
          finishColor: 'Natural Teak EXGC-510',
          quantity: 1,
        },
      ],
      DEFAULT_FRAME_PROFILES,
      DEFAULT_BOQ_MATERIAL_RATES
    );

    const expectedBaseSqFt = computeDoorSqFt(80, 210);
    approxEqual(single.baseDoorSqFt, 18.083369, 1e-4, 'baseDoorSqFt');
    approxEqual(single.totalSqFt, expectedBaseSqFt, 1e-4, 'single totalSqFt');
    approxEqual(single.resinKg, 8.0, 1e-4, 'Resin 8kg');
    approxEqual(single.gelKg, 1.5, 1e-4, 'Gelcoat 1.5kg');
    approxEqual(single.catalystGrams, 180, 1e-4, 'Catalyst 180g');
    approxEqual(single.acceleratorGrams, 100, 1e-4, 'Accelerator 100g');
    approxEqual(single.csm300Kg, 3.5, 1e-4, 'CSM 300 GSM 3.5kg');
    approxEqual(single.pigmentGrams, 250, 1e-4, 'Pigment 250g');

    // Frame Wood (3-side minus 35cm ded): (2*210 + 80 - 35) = 465 cm
    const expectedLenCm = 2 * 210 + 80 - 35;
    approxEqual(single.frameWoodTotalLengthCm, expectedLenCm, 1e-4, 'Frame wood length cm');
    approxEqual(
      single.frameWoodRunningFt,
      cmToRunningFeet(expectedLenCm),
      1e-4,
      'Frame running ft'
    );
    approxEqual(
      single.frameWoodCuFt,
      cm3ToCuFt(2 * 7 * expectedLenCm),
      1e-4,
      'Frame wood cu.ft'
    );

    // Shutter Wood: Lock (2*12*15*2 = 720 cm3) + Hinge (2*4*16*3 = 384 cm3)
    approxEqual(single.lockReeperVolumeCm3, 720, 1e-4, 'Lock reeper cm3');
    approxEqual(single.hingeReeperVolumeCm3, 384, 1e-4, 'Hinge reeper cm3');
    approxEqual(single.lockReeperCuFt, cm3ToCuFt(720), 1e-4, 'Lock reeper cu.ft');
    approxEqual(single.hingeReeperCuFt, cm3ToCuFt(384), 1e-4, 'Hinge reeper cu.ft');
    approxEqual(single.shutterWoodCuFt, cm3ToCuFt(1104), 1e-4, 'Total shutter cu.ft');

    // Foam sheet (1 / 12 @ Rs 250)
    approxEqual(single.foamSheetsExact, 1 / 12, 1e-4, 'Single door foam sheet fraction');
    assert.strictEqual(single.foamSheetsPurchaseCeil, 1, 'Single door purchase ceil = 1');
    approxEqual(single.foamCost, 250 / 12, 1e-4, 'Single door foam cost');

    // 2. Alternate Frame Length Mode: FRAME_2H_MINUS_DED -> (2*210 - 35) = 385 cm
    const twoH = calculateDoorBatchBoq(
      [{ widthCm: 80, heightCm: 210, frameTypeId: 'FRM-REGULAR', quantity: 1 }],
      DEFAULT_FRAME_PROFILES,
      { ...DEFAULT_BOQ_MATERIAL_RATES, frameLengthMode: 'FRAME_2H_MINUS_DED' }
    );
    approxEqual(twoH.frameWoodTotalLengthCm, 385, 1e-4, '2H minus ded length');
    approxEqual(twoH.frameWoodCuFt, cm3ToCuFt(2 * 7 * 385), 1e-4, '2H frame cu.ft');

    // 3. 12-Door Batch -> Exact 1 Foam Sheet @ Rs 250
    const batch12 = calculateDoorBatchBoq(
      Array.from({ length: 12 }, (_, idx) => ({
        doorNumber: `D-${idx + 1}`,
        widthCm: 80,
        heightCm: 210,
        frameTypeId: 'FRM-REGULAR',
        finishColor: 'Rose Wood Glossy',
      })),
      DEFAULT_FRAME_PROFILES,
      DEFAULT_BOQ_MATERIAL_RATES
    );
    assert.strictEqual(batch12.totalDoors, 12);
    approxEqual(batch12.resinKg, 96, 1e-4, '12 doors resin');
    approxEqual(batch12.gelKg, 18, 1e-4, '12 doors gel');
    approxEqual(batch12.catalystGrams, 2160, 1e-4, '12 doors catalyst');
    approxEqual(batch12.acceleratorGrams, 1200, 1e-4, '12 doors accelerator');
    approxEqual(batch12.csm300Kg, 42, 1e-4, '12 doors csm300');
    approxEqual(batch12.pigmentGrams, 3000, 1e-4, '12 doors pigment');
    approxEqual(batch12.foamSheetsExact, 1.0, 1e-4, '12 doors = 1 foam sheet');
    assert.strictEqual(batch12.foamSheetsPurchaseCeil, 1);
    approxEqual(batch12.foamCost, 250, 1e-4, '12 doors = Rs 250 foam cost');

    // 4. Proportional Sq.Ft Scaling on 90x220 cm door
    const large = calculateDoorBatchBoq(
      [{ widthCm: 90, heightCm: 220, frameTypeId: 'FRM-REGULAR', finishColor: 'Ivory Cream' }],
      DEFAULT_FRAME_PROFILES,
      DEFAULT_BOQ_MATERIAL_RATES
    );
    const scaleRatio = (90 * 220) / (80 * 210);
    approxEqual(large.resinKg, 8.0 * scaleRatio, 1e-4, '90x220 scaled resin');
    approxEqual(large.csm300Kg, 3.5 * scaleRatio, 1e-4, '90x220 scaled CSM');
    approxEqual(large.shutterWoodCuFt, cm3ToCuFt(1104), 1e-4, '90x220 shutter wood stays fixed');

    // 5. Colour-Wise Pigment Rate Resolution
    const roseRate = resolvePigmentRateForColour(
      'Rose Wood Glossy',
      DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour
    );
    const ivoryRate = resolvePigmentRateForColour(
      'Ivory Cream Solid',
      DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour
    );
    const eetiRate = resolvePigmentRateForColour(
      'Eeti Wood Deep Grain',
      DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour
    );
    assert.strictEqual(roseRate.ratePerKg, 580);
    assert.strictEqual(ivoryRate.ratePerKg, 440);
    assert.strictEqual(eetiRate.ratePerKg, 600);
    assert(eetiRate.ratePerKg > ivoryRate.ratePerKg, 'Different colours must price differently');

    // 6. Only Door (FRM-005) has 0 frame wood while shutter wood remains
    const doorOnly = calculateDoorBatchBoq(
      [{ widthCm: 80, heightCm: 210, frameTypeId: 'FRM-005', frameTypeName: 'Only Door' }],
      DEFAULT_FRAME_PROFILES,
      DEFAULT_BOQ_MATERIAL_RATES
    );
    approxEqual(doorOnly.frameWoodCuFt, 0, 1e-6, 'Only Door has 0 frame wood');
    approxEqual(doorOnly.shutterWoodCuFt, cm3ToCuFt(1104), 1e-4, 'Only Door keeps shutter wood');

    // 7. Update another frame wood dimension in settings & verify dynamic recalculation
    const updatedMedium = updateCustomFrame('FRM-MEDIUM', {
      woodThicknessCm: 3,
      woodWidthCm: 9,
      woodLengthDeductionCm: 30,
    });
    assert(updatedMedium, 'FRM-MEDIUM should update in frameService');
    const liveFrames = getCustomFrames();
    const mediumBoq = calculateDoorBatchBoq(
      [{ widthCm: 80, heightCm: 210, frameTypeId: 'FRM-MEDIUM' }],
      liveFrames,
      DEFAULT_BOQ_MATERIAL_RATES
    );
    const medLen = 2 * 210 + 80 - 30;
    approxEqual(mediumBoq.frameWoodCuFt, cm3ToCuFt(3 * 9 * medLen), 1e-4, 'Updated FRM-MEDIUM wood');

    // 8. BOQ Rates API service + generateManufacturingBoq integration
    await saveBoqMaterialRates({
      pigmentRatesByColour: {
        ...DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour,
        'Cobalt Blue': 650,
      },
    });
    const storedRates = await getBoqMaterialRates();
    assert.strictEqual(storedRates.pigmentRatesByColour['Cobalt Blue'], 650);

    const generatedMfg = await generateManufacturingBoq({
      id: 'TEST-ORD-BOQ-001',
      jobCardNumber: 'JC-TEST-001',
      customerName: 'BOQ Verification Client',
      siteName: 'Vengara Test Site',
      district: 'Malappuram',
      doors: [
        {
          doorNumber: 'D-101',
          model: 'Hand-Craft Flush Door',
          rawHeightCm: 210,
          rawWidthTopCm: 80,
          frameTypeId: 'FRM-MEDIUM',
          frameTypeName: 'Medium Frame',
          finishColor: 'Cobalt Blue',
        },
      ],
    });
    assert(generatedMfg.notes?.includes('Resin 8.00kg'), 'Manufacturing BOQ notes include 8.00kg Resin');
    assert(generatedMfg.notes?.includes('CSM 300 3.50kg'), 'Manufacturing BOQ notes include CSM 300');
    assert(generatedMfg.items[0].description?.includes('₹650/kg'), 'Manufacturing BOQ uses custom pigment rate');

    // 9. Force recalculation updates revisionNumber & new pigment rate in-place
    await saveBoqMaterialRates({
      pigmentRatesByColour: {
        ...DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour,
        'Cobalt Blue': 700,
      },
    });
    const recalcMfg = await generateManufacturingBoq(
      {
        id: 'TEST-ORD-BOQ-001',
        jobCardNumber: 'JC-TEST-001',
        customerName: 'BOQ Verification Client',
        siteName: 'Vengara Test Site',
        district: 'Malappuram',
        doors: [
          {
            doorNumber: 'D-101',
            model: 'Hand-Craft Flush Door',
            rawHeightCm: 210,
            rawWidthTopCm: 80,
            frameTypeId: 'FRM-MEDIUM',
            frameTypeName: 'Medium Frame',
            finishColor: 'Cobalt Blue',
          },
        ],
      },
      true
    );
    assert.strictEqual(recalcMfg.id, generatedMfg.id, 'Force recalculate preserves BOQ id');
    assert.strictEqual(recalcMfg.boqNumber, generatedMfg.boqNumber, 'Force recalculate preserves boqNumber');
    assert.strictEqual(recalcMfg.revisionNumber, 2, 'Force recalculate increments revisionNumber');
    assert(recalcMfg.items[0].description?.includes('₹700/kg'), 'Force recalculate picks up new ₹700/kg shade rate');

    // 10. Extra Issued Store Items CRUD (Group D)
    const createdExtra = await addBoqExtraItem({
      orderKey: 'TEST-ORD-BOQ-001',
      itemName: '2K Auto Putty',
      category: 'Chemical',
      specNote: 'Extra issue test',
      quantity: 2,
      unit: 'Kg',
      unitRate: 280,
    });
    assert.strictEqual(createdExtra.amount, 560, 'Extra item amount = 2 * 280 = 560');

    const listedExtra = await listBoqExtraItems(['TEST-ORD-BOQ-001']);
    assert.strictEqual(listedExtra.length, 1);

    const updatedExtra = await updateBoqExtraItem(createdExtra.id, { quantity: 3, unitRate: 300 });
    assert(updatedExtra && updatedExtra.amount === 900, 'Updated extra item amount = 3 * 300 = 900');

    const removed = await deleteBoqExtraItem(createdExtra.id);
    assert.strictEqual(removed, true, 'Extra item deleted cleanly');
    assert.strictEqual((await listBoqExtraItems(['TEST-ORD-BOQ-001'])).length, 0);

    // 11. Lock Box Hardware Kits (Baby Latch Black ₹200, PlusPoint Black ₹600, Black Latch Exmark ₹600, Antique Exmark ₹600)
    const lockBatch = calculateDoorBatchBoq(
      [
        { widthCm: 80, heightCm: 210, lockType: 'Baby Latch Black', handing: 'RH' },
        { widthCm: 80, heightCm: 210, lockType: 'PlusPoint Black', handing: 'LH' },
        { widthCm: 80, heightCm: 210, lockType: 'Black Latch Exmark', handing: 'RH' },
        { widthCm: 80, heightCm: 210, lockType: 'Antique Exmark', handing: 'LH' },
        { widthCm: 80, heightCm: 210, lockType: 'Provision Only (No Hardware)', handing: 'RH' },
      ],
      DEFAULT_FRAME_PROFILES,
      DEFAULT_BOQ_MATERIAL_RATES
    );

    assert.strictEqual(lockBatch.totalLockBoxes, 4, '4 doors need Lock Boxes (Provision Only excluded)');
    assert.strictEqual(lockBatch.totalLockBoxCost, 2000, '200 + 600 + 600 + 600 = 2000');

    const getHw = (name: string) =>
      lockBatch.consolidatedLockKitHardware.find((c) => c.name === name)?.totalQty || 0;
    assert.strictEqual(getHw('Tower Bolt'), 4, '4 Tower Bolts');
    assert.strictEqual(getHw('Hinges'), 12, '4 × 3 = 12 Hinges');
    assert.strictEqual(getHw('Wood Screw 3"'), 40, '4 × 10 = 40 Wood Screw 3"');
    assert.strictEqual(getHw('Screw 19×6'), 28, '4 × 7 = 28 Screw 19×6');
    assert.strictEqual(getHw('Screw 25×6'), 108, '4 × 27 = 108 Screw 25×6');
    assert.strictEqual(getHw('Screw 32×6'), 36, '4 × 9 = 36 Screw 32×6');
    assert.strictEqual(getHw('Plug 6mm'), 48, '4 × 12 = 48 Plug 6mm');
    assert.strictEqual(getHw('Door Push'), 4, '4 Door Push');

    // Edit/Add/Delete Kit item persistence test
    const editedProfiles = DEFAULT_LOCK_BOX_PROFILES.map((p) => {
      if (p.id !== 'box-baby-latch-black') return p;
      return {
        ...p,
        boxCost: 225,
        items: [
          ...buildCommonBasicKitItems('Baby Latch Black').filter((it) => it.name !== 'Door Push'),
          { id: 'kit-lbracket', name: 'Corner L-Bracket', qtyPerBox: 2, unit: 'Pcs' },
        ],
      };
    });
    await saveBoqMaterialRates({ lockBoxProfiles: editedProfiles });
    const latestRates = await getBoqMaterialRates();
    const customLockBatch = calculateDoorBatchBoq(
      [{ widthCm: 80, heightCm: 210, lockType: 'BABY LATCH', handing: 'LH' }],
      DEFAULT_FRAME_PROFILES,
      latestRates
    );
    assert.strictEqual(customLockBatch.totalLockBoxCost, 225, 'Edited Baby Latch Black box cost persisted');
    assert.strictEqual(
      customLockBatch.consolidatedLockKitHardware.find((c) => c.name === 'Corner L-Bracket')?.totalQty,
      2,
      'Added L-Bracket kit item calculated'
    );
    assert.strictEqual(
      customLockBatch.consolidatedLockKitHardware.find((c) => c.name === 'Door Push'),
      undefined,
      'Deleted Door Push item removed'
    );
    assert.strictEqual(customLockBatch.lockBoxBreakdown[0].lhCount, 1, 'LH handing tracked cleanly');

    // Lock readiness API service persistence test
    const savedReady = await setLockReadiness({
      orderKey: 'TEST-ORD-BOQ-001',
      lockBoxId: 'box-pluspoint-black',
      status: 'ORDERED',
      note: 'Ordered for dispatch rush',
    });
    assert.strictEqual(savedReady.status, 'ORDERED');
    const readinessMap = await getAllLockReadiness();
    assert.strictEqual(readinessMap['test-ord-boq-001::box-pluspoint-black']?.status, 'ORDERED');

    console.log('✅ All Auto-BOQ Formula & Frame Wood Settings tests PASSED!');
  } finally {
    // Restore original JSON files so repo state stays pristine
    for (const [fp, content] of backups.entries()) {
      if (content === null) {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } else {
        fs.writeFileSync(fp, content, 'utf8');
      }
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
