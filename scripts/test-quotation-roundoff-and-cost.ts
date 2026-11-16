import { calculateQuotationProfit } from '../lib/utils/quotationProfit';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function run() {
  console.log('--- Testing Round-off & Cost Logic ---');

  // Test Round-off scenario from user prompt:
  // e.g. "ചിലപ്പോൾ ഡോറുകൾ ഒക്കെ 7536 വരും. 36 എന്ത് ചെയ്യണം റൗണ്ട് ഓഫ് ചെയ്യണം."
  const rawTotal = 7536;
  const rem100 = rawTotal % 100; // 36
  const roundOffAmount = -rem100; // -36
  const finalGrandTotal = rawTotal + roundOffAmount; // 7500
  assert(finalGrandTotal === 7500, `Round-off 7536 by -36 yields exact 7500`);

  // Test Auto Round-Off logic
  function computeAutoRoundOff(total: number, currentRoundOff: number) {
    const rem100 = total % 100;
    const rem10 = total % 10;
    if (currentRoundOff === 0 && rem100 !== 0) {
      return -rem100;
    } else if (currentRoundOff === -rem100 && rem10 !== 0 && rem10 !== rem100) {
      return -rem10;
    }
    return 0;
  }

  assert(computeAutoRoundOff(7536, 0) === -36, `Auto-round 7536 gives -36`);
  assert(computeAutoRoundOff(2475, 0) === -75, `Auto-round 2475 gives -75`);
  assert(computeAutoRoundOff(2475, -75) === -5, `Second click auto-round 2475 gives -5`);

  // Test Profit Estimate with discount
  const profitEst = calculateQuotationProfit({
    rows: [
      {
        id: '1',
        modelId: 'MOD-101',
        modelTitle: 'EXM-A-101',
        unit: 'cm',
        height: 210,
        widthTop: 80,
        width: 80,
        qty: 1,
        rate: 7536,
      },
    ],
    discount: 36, // -36 roundoff/discount
  });

  assert(profitEst.netRevenue === 7500, `Net revenue with 36 discount is 7500`);
  assert(profitEst.rowEstimates.length === 1, `Has 1 row estimate`);
  assert(profitEst.rowEstimates[0].profit > 0, `Door row has positive profit: ₹${profitEst.rowEstimates[0].profit}`);

  console.log('All Round-off & Cost Logic tests passed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
