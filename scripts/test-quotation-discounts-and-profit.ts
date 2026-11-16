import {
  calculateFrpDoorPrice,
  DEFAULT_FRP_RATE_CARD,
  WITHOUT_LOCK_DISCOUNT,
  WITHOUT_ACCESSORIES_DISCOUNT,
  WITHOUT_FRAME_DISCOUNT,
} from '../lib/services/frpPricingEngine';
import {
  calculateQuotationProfit,
  isRowWithoutFrame,
} from '../lib/utils/quotationProfit';
import { DEFAULT_FRAME_PROFILES } from '../lib/utils/frameDefaults';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runTests() {
  console.log('--- Testing FRP Pricing Engine Discounts ---');

  // Base standard door (80 x 210 cm, Cat A, Standard Frame, Standard Lock, Standard Color)
  const baseResult = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    settings: DEFAULT_FRP_RATE_CARD,
  });
  console.log('Base Cat A Door Unit Rate:', baseResult.finalUnitRate);

  // 1. Test Without Lock Discount (-₹300)
  const noLockResult = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    lockId: 'lock-none-discount',
    settings: DEFAULT_FRP_RATE_CARD,
  });
  assert(
    baseResult.finalUnitRate - noLockResult.finalUnitRate === Math.abs(WITHOUT_LOCK_DISCOUNT),
    `Without Lock discount correctly deducts ₹300 (Base: ${baseResult.finalUnitRate}, NoLock: ${noLockResult.finalUnitRate})`
  );

  // 2. Test Without Accessories Discount (-₹500)
  const noAccResult = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    withoutAccessories: true,
    settings: DEFAULT_FRP_RATE_CARD,
  });
  assert(
    baseResult.finalUnitRate - noAccResult.finalUnitRate === Math.abs(WITHOUT_ACCESSORIES_DISCOUNT),
    `Without Accessories discount correctly deducts ₹500 (Base: ${baseResult.finalUnitRate}, NoAcc: ${noAccResult.finalUnitRate})`
  );

  // 3. Test Without Frame Discount (-₹800)
  const noFrameResult = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    frameTypeId: 'FRM-005',
    settings: DEFAULT_FRP_RATE_CARD,
  });
  // Since default frame extra is 0, selecting FRM-005 (extra: -800) should reduce price by 800
  assert(
    baseResult.finalUnitRate - noFrameResult.finalUnitRate === Math.abs(WITHOUT_FRAME_DISCOUNT),
    `Without Frame discount correctly deducts ₹800 (Base: ${baseResult.finalUnitRate}, NoFrame: ${noFrameResult.finalUnitRate})`
  );

  // 4. Combined discounts: Without Lock (-300) + Without Accessories (-500) + Without Frame (-800) = -1600 total
  const allDiscountsResult = calculateFrpDoorPrice({
    category: 'A',
    height: 210,
    widthTop: 80,
    widthBottom: 80,
    unit: 'cm',
    lockId: 'lock-none-discount',
    withoutAccessories: true,
    frameTypeId: 'FRM-005',
    settings: DEFAULT_FRP_RATE_CARD,
  });
  assert(
    baseResult.finalUnitRate - allDiscountsResult.finalUnitRate === 1600,
    `Combined discounts correctly deduct ₹1600 (Base: ${baseResult.finalUnitRate}, Total Discounted: ${allDiscountsResult.finalUnitRate})`
  );

  console.log('\n--- Testing Advance Quotation Profit Calculator ---');

  // 5. Test 2-Gang piece-rate cutting labor (Door Cutting ₹100 + Frame Cutting ₹100)
  const profitWithFrame = calculateQuotationProfit({
    rows: [
      {
        id: '1',
        modelId: 'MOD-101',
        modelTitle: 'Teak Molded',
        unit: 'cm',
        height: 210,
        widthTop: 80,
        width: 80,
        qty: 5,
        rate: 7000,
        frameTypeId: 'FRM-REGULAR',
        frameTypeName: 'Regular Double Rebate',
        lockId: 'lock-cylindrical',
      },
    ],
  });

  assert(profitWithFrame.totalDoors === 5, 'Total doors is 5');
  assert(profitWithFrame.doorCuttingLaborCost === 5 * 100, `Door cutting labor is 5 × ₹100 = ₹500 (Got: ${profitWithFrame.doorCuttingLaborCost})`);
  assert(profitWithFrame.frameCuttingLaborCost === 5 * 100, `Frame cutting labor is 5 × ₹100 = ₹500 (Got: ${profitWithFrame.frameCuttingLaborCost})`);
  assert(profitWithFrame.timberCost > 0, `Timber cost calculated for framed doors (Got: ₹${profitWithFrame.timberCost})`);
  assert(profitWithFrame.lockBoxCost > 0, `Lock box cost included when lock is selected (Got: ₹${profitWithFrame.lockBoxCost})`);

  // 6. Test Without Frame (Shutter Only): Frame cutting labor & Timber must be ₹0
  const profitShutterOnly = calculateQuotationProfit({
    rows: [
      {
        id: '2',
        modelId: 'MOD-101',
        modelTitle: 'Teak Molded',
        unit: 'cm',
        height: 210,
        widthTop: 80,
        width: 80,
        qty: 5,
        rate: 6200,
        frameTypeId: 'FRM-005',
        frameTypeName: 'Without Frame (Shutter Only)',
        lockId: 'lock-none-discount', // Without lock
      },
    ],
  });

  assert(isRowWithoutFrame({ frameTypeId: 'FRM-005' }), 'isRowWithoutFrame returns true for FRM-005');
  assert(profitShutterOnly.doorCuttingLaborCost === 5 * 100, `Door cutting is still ₹500 (Got: ${profitShutterOnly.doorCuttingLaborCost})`);
  assert(profitShutterOnly.frameCuttingLaborCost === 0, `Frame cutting labor is skipped (₹0) on shutter only (Got: ${profitShutterOnly.frameCuttingLaborCost})`);
  assert(profitShutterOnly.timberCost < profitWithFrame.timberCost && profitShutterOnly.timberCost < 300, `Frame timber is skipped on shutter only (Framed: ₹${profitWithFrame.timberCost}, Shutter Only: ₹${profitShutterOnly.timberCost})`);
  assert(profitShutterOnly.lockBoxCost === 0, `Lock box cost is skipped (₹0) when without lock (Got: ${profitShutterOnly.lockBoxCost})`);
  assert(profitShutterOnly.estimatedNetProfit > 0, `Profit is positive (Got: ₹${profitShutterOnly.estimatedNetProfit})`);

  console.log('\n🎉 ALL 11 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
