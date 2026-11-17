import { cmToTapeInch, parseTapeInchToCm, computeStickerSizes } from '../lib/utils/doorStickerFormula';
import { getCustomFrames, createCustomFrame, updateCustomFrame, deleteCustomFrame } from '../lib/services/frameService';
import { getDefaultFrameProfile, formatFrameSectionLabel } from '../lib/utils/frameDefaults';
import {
  calculateFrpDoorPrice,
  getFrpRateCardSettings,
  saveFrpRateCardSettings,
  getDefaultThicknessOption,
} from '../lib/services/frpPricingEngine';
import { createProductionOrder, updateProductionOrderDoors, deleteProductionOrder } from '../lib/services/productionService';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed [${label}]: expected "${expected}", got "${actual}"`);
  }
}

async function runTests() {
  console.log('🧪 Testing Floor Door Formulas, Inch⇄CM Conversions & 12L Sticker Calculations...\n');

  // 1. Verify Mini Type Frame Profile in frameService
  const frames = getCustomFrames();
  const miniType = frames.find((f) => f.id === 'FRM-MINI' || f.name === 'Mini Type');
  if (!miniType) throw new Error('Mini Type frame profile missing from frameService');
  assertEqual(miniType.hDeductionCm, 4.5, 'Mini Type H deduction');
  assertEqual(miniType.wDeductionCm, 7.6, 'Mini Type W deduction');
  console.log('✓ Verified Mini Type frame preset: H -4.5 cm, W -7.6 cm');

  // 1b. Verify Regular (72x50mm default), Medium (95x48), Heavy (95x58), School (90x45) Frame Presets & Pricing
  const defFrame = getDefaultFrameProfile(frames);
  assertEqual(defFrame.id, 'FRM-REGULAR', 'Default frame ID is FRM-REGULAR');
  assertEqual(defFrame.wallThicknessMm, 72, 'Regular Frame thickness 72mm');
  assertEqual(defFrame.sectionWidthMm, 50, 'Regular Frame width 50mm');
  assertEqual(formatFrameSectionLabel(defFrame), 'Regular Frame (72×50mm)', 'Formatted Regular Frame label');

  const expectedPresets = [
    { id: 'FRM-MEDIUM', name: 'Medium Frame', w: 95, s: 48, extra: 700 },
    { id: 'FRM-HEAVY', name: 'Heavy Frame', w: 95, s: 58, extra: 1300 },
    { id: 'FRM-SCHOOL', name: 'School Frame', w: 90, s: 45, extra: 200 },
  ];
  assertEqual(defFrame.quotationExtraRate, 0, 'Regular Frame quotationExtraRate 0');
  for (const p of expectedPresets) {
    const found = frames.find((f) => f.id === p.id);
    if (!found) throw new Error(`Preset frame missing: ${p.id}`);
    assertEqual(found.wallThicknessMm, p.w, `${p.name} wallThicknessMm`);
    assertEqual(found.sectionWidthMm, p.s, `${p.name} sectionWidthMm`);
    assertEqual(found.quotationExtraRate, p.extra, `${p.name} quotationExtraRate`);
    assertEqual(found.isDefault, false, `${p.name} is not default`);
  }

  const settings = getFrpRateCardSettings();
  const defThk = getDefaultThicknessOption(settings.doorThicknesses);
  assertEqual(defThk.thicknessMm, 28, 'Default door thickness is 28mm');
  assertEqual(defThk.extraRate, 0, 'Default 28mm extraRate is 0');
  const thk30 = (settings.doorThicknesses || []).find((t) => t.thicknessMm === 30);
  if (!thk30) throw new Error('30mm door thickness preset missing');
  assertEqual(thk30.extraRate, 200, '30mm door additional price is ₹200');

  const baseQuoteCalc = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    frameTypeId: defFrame.id,
    frameTypeName: formatFrameSectionLabel(defFrame),
    framePrice: defFrame.quotationExtraRate || 0,
    thicknessId: defThk.id,
    thicknessLabel: defThk.name,
    thicknessExtraRate: defThk.extraRate,
    settings,
  });
  const catAPrice = settings.categoryPieceRates?.A ?? 6800;
  assertEqual(baseQuoteCalc.finalUnitRate, catAPrice, 'Cat A + Regular Frame + 28mm');

  const heavyAnd30mmCalc = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    frameTypeId: 'FRM-HEAVY',
    frameTypeName: 'Heavy Frame (95×58mm)',
    framePrice: 1300,
    thicknessId: thk30.id,
    thicknessLabel: thk30.name,
    thicknessExtraRate: thk30.extraRate,
    settings,
  });
  assertEqual(heavyAnd30mmCalc.finalUnitRate, catAPrice + 1300 + 200, 'Cat A + Heavy Frame (1300) + 30mm (200)');

  const medium28Calc = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    frameTypeId: 'FRM-MEDIUM',
    frameTypeName: 'Medium Frame (95×48mm)',
    framePrice: 700,
    thicknessId: defThk.id,
    thicknessExtraRate: 0,
    settings,
  });
  assertEqual(medium28Calc.finalUnitRate, catAPrice + 700, 'Cat A + Medium Frame (700)');

  const school30Calc = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    frameTypeId: 'FRM-SCHOOL',
    frameTypeName: 'School Frame (90×45mm)',
    framePrice: 200,
    thicknessId: thk30.id,
    thicknessExtraRate: 200,
    settings,
  });
  assertEqual(school30Calc.finalUnitRate, catAPrice + 200 + 200, 'Cat A + School Frame (200) + 30mm (200)');

  // 1c. Verify Tier-2 Oversize Threshold: > 90x230 cm (22.28 sq.ft) @ ₹450/sq.ft
  const atThresholdCalc = calculateFrpDoorPrice({
    category: 'A',
    height: 230,
    widthTop: 90,
    widthBottom: 90,
    unit: 'cm',
    settings: { ...settings, extraSqftRate: 350, highExtraMaxWidthCm: 90, highExtraMaxHeightCm: 230, highExtraSqftRate: 450 },
  });
  assertEqual(atThresholdCalc.highThresholdSqft, 22.28, '90x230 cm equals 22.28 sq.ft');
  assertEqual(atThresholdCalc.isHighExtraSize, false, 'Exact 90x230 cm is within Tier 1');
  assertEqual(atThresholdCalc.finalUnitRate, catAPrice + Math.round((22.28 - 18.08) * 350), '90x230 cm Tier 1');

  const overThresholdCalc = calculateFrpDoorPrice({
    category: 'A',
    height: 240,
    widthTop: 100,
    widthBottom: 100,
    unit: 'cm',
    settings: { ...settings, extraSqftRate: 350, highExtraMaxWidthCm: 90, highExtraMaxHeightCm: 230, highExtraSqftRate: 450 },
  });
  assertEqual(overThresholdCalc.isHighExtraSize, true, '100x240 cm (25.83 sq.ft) exceeds 22.28 sq.ft');
  assertEqual(overThresholdCalc.tier2ExtraSqft, 3.55, 'Tier 2 excess sq.ft = 25.83 - 22.28 = 3.55');
  assertEqual(overThresholdCalc.tier2ExtraCost, Math.round(3.55 * 450), 'Tier 2 cost billed @ ₹450/sq.ft');
  assertEqual(overThresholdCalc.finalUnitRate, catAPrice + Math.round(4.20 * 350) + Math.round(3.55 * 450), 'Two-tier oversize total');

  const equivalentAreaOverCalc = calculateFrpDoorPrice({
    category: 'A',
    height: 220,
    widthTop: 95,
    widthBottom: 95,
    unit: 'cm',
    settings: { ...settings, extraSqftRate: 350, highExtraMaxWidthCm: 90, highExtraMaxHeightCm: 230, highExtraSqftRate: 450 },
  });
  assertEqual(equivalentAreaOverCalc.actualSqft, 22.50, '95x220 cm equals 22.50 sq.ft (> 22.28 sq.ft)');
  assertEqual(equivalentAreaOverCalc.isHighExtraSize, true, 'Equivalent sq.ft > 22.28 triggers ₹450 Tier 2');

  console.log('✓ Verified Frame Extra Rates (+700/+1300/+200), 28mm/30mm (+200), & >90×230 cm (₹450/sq.ft) Tier-2 rules');

  // 2. Verify sample rows matching factory floor reference photo (with negative cutting notation)
  const samples = [
    {
      name: 'Door #1',
      hCm: 225.59,
      topCm: 77.15,
      btmCm: 78.11,
      expHInch: '88 13/16"',
      expTopInch: '30 3/8"',
      expBtmInch: '30 3/4"',
      expHOut: '-221.1',
      expTopOut: '-69.5',
      expBtmOut: '-70.5',
    },
    {
      name: 'Door #2',
      hCm: 207.96,
      topCm: 80.01,
      btmCm: 78.90,
      expHInch: '81 7/8"',
      expTopInch: '31 1/2"',
      expBtmInch: '31 1/16"',
      expHOut: '-203.5',
      expTopOut: '-72.4',
      expBtmOut: '-71.3',
    },
    {
      name: 'Door #3',
      hCm: 205.58,
      topCm: 79.06,
      btmCm: 78.74,
      expHInch: '80 15/16"',
      expTopInch: '31 1/8"',
      expBtmInch: '31"',
      expHOut: '-201.1',
      expTopOut: '-71.5',
      expBtmOut: '-71.1',
    },
    {
      name: 'Door #4',
      hCm: 203.20,
      topCm: 77.95,
      btmCm: 78.27,
      expHInch: '80"',
      expTopInch: '30 11/16"',
      expBtmInch: '30 13/16"',
      expHOut: '-198.7',
      expTopOut: '-70.3',
      expBtmOut: '-70.7',
    },
    {
      name: 'Door #5',
      hCm: 204.31,
      topCm: 78.11,
      btmCm: 77.95,
      expHInch: '80 7/16"',
      expTopInch: '30 3/4"',
      expBtmInch: '30 11/16"',
      expHOut: '-199.8',
      expTopOut: '-70.5',
      expBtmOut: '-70.3',
    },
    {
      name: 'Door #6 (User Case: Top 80cm, Bottom 81cm)',
      hCm: 210.0,
      topCm: 80.0,
      btmCm: 81.0,
      expHInch: '82 11/16"',
      expTopInch: '31 1/2"',
      expBtmInch: '31 7/8"',
      expHOut: '-205.5',
      expTopOut: '-72.4',
      expBtmOut: '-73.4',
    },
  ];

  for (const s of samples) {
    assertEqual(cmToTapeInch(s.hCm), s.expHInch, `${s.name} H inch`);
    assertEqual(cmToTapeInch(s.topCm), s.expTopInch, `${s.name} Top W inch`);
    assertEqual(cmToTapeInch(s.btmCm), s.expBtmInch, `${s.name} Btm W inch`);

    const res = computeStickerSizes({
      rawHeightCm: s.hCm,
      rawWidthTopCm: s.topCm,
      rawWidthBtmCm: s.btmCm,
      widthLinked: false,
      hDeductionCm: miniType.hDeductionCm,
      wDeductionCm: miniType.wDeductionCm,
      hingeSide: 'R',
    });

    assertEqual(res.hLabel, 'H-LEFT', `${s.name} hLabel for Hinge R`);
    assertEqual(res.finHText, s.expHOut, `${s.name} Sticker Height`);
    assertEqual(res.finTopWText, s.expTopOut, `${s.name} Sticker Top W`);
    assertEqual(res.finBtmWText, s.expBtmOut, `${s.name} Sticker Btm W`);
    console.log(`✓ ${s.name}: ${s.hCm}×[T:${s.topCm}/B:${s.btmCm}] -> ${res.hLabel} ${res.finHText} | TOP ${res.finTopWText} | BTM ${res.finBtmWText}`);
  }

  // 3. Verify Parse Tape Inch back to CM
  assertEqual(parseTapeInchToCm('80"'), 203.2, 'Parse 80" to CM');
  assertEqual(parseTapeInchToCm('30 3/4"'), 78.11, 'Parse 30 3/4" to CM');

  // 4. Verify Custom Frame CRUD with custom CM deductions & quotationExtraRate
  const tmpFrame = createCustomFrame({
    name: 'Test Slim 35x25 Frame',
    wallThicknessMm: 35,
    sectionWidthMm: 25,
    hDeductionCm: 3.8,
    wDeductionCm: 6.4,
    quotationExtraRate: 450,
  });
  assertEqual(tmpFrame.hDeductionCm, 3.8, 'Created custom frame H deduction');
  assertEqual(tmpFrame.quotationExtraRate, 450, 'Created custom frame quotation extra rate');
  const updFrame = updateCustomFrame(tmpFrame.id, { hDeductionCm: 4.0, quotationExtraRate: 550 });
  assertEqual(updFrame?.hDeductionCm, 4.0, 'Updated custom frame H deduction');
  assertEqual(updFrame?.quotationExtraRate, 550, 'Updated custom frame quotation extra rate');
  assertEqual(deleteCustomFrame(tmpFrame.id), true, 'Deleted test custom frame');
  console.log('✓ Custom Frame CM deduction & quotation extra CRUD passed');

  // 5. Verify ProductionDoorItem update persistence (remark, swing, frameTypeId, top/btm cm)
  const testOrder = await createProductionOrder({
    customerName: 'LIMBRA KUTTILANGADI',
    siteName: 'Kuttilangadi Site',
    district: 'Malappuram',
    doors: [
      {
        doorNumber: 'Door #1',
        model: 'EXM-A-118',
        rawHeightMm: 2256,
        rawWidthMm: 772,
        rawWidthBottomMm: 781,
        rawHeightCm: 225.59,
        rawWidthTopCm: 77.15,
        rawWidthBtmCm: 78.11,
        frameTypeId: 'FRM-MINI',
        swing: 'INWARD',
        remark: 'BOTTOM REMARK TEST',
        handing: 'RH',
        lockType: 'Baby Latch',
        finishColor: 'Natural Teak',
      },
    ],
  });

  const modifiedDoors = testOrder.doors.map((d) => ({
    ...d,
    swing: 'OUTWARD' as const,
    remark: 'URGENT CUT',
  }));
  const saved = await updateProductionOrderDoors(testOrder.id, modifiedDoors);
  assertEqual(saved.doors[0].swing, 'OUTWARD', 'Saved door swing');
  assertEqual(saved.doors[0].remark, 'URGENT CUT', 'Saved door remark');
  await deleteProductionOrder(testOrder.id);
  console.log('✓ Production order door persistence & cleanup passed');

  // 6. Verify Door Installation Default Rate in FRP Rate Card Settings & cleanup
  const origRate = settings.defaultInstallationRatePerDoor ?? 500;
  assertEqual(origRate, 500, 'Default door installation rate ₹500');
  const updatedRateSettings = saveFrpRateCardSettings({ defaultInstallationRatePerDoor: 650 });
  assertEqual(updatedRateSettings.defaultInstallationRatePerDoor, 650, 'Saved custom installation rate ₹650');
  saveFrpRateCardSettings({ defaultInstallationRatePerDoor: origRate });
  console.log('✓ Quotation Door Installation rate card settings CRUD & cleanup passed');

  console.log('\n🎉 ALL FLOOR DOOR FORMULA & 12L STICKER TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
