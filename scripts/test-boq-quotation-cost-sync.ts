import { calculateDoorBatchBoq, BoqDoorInput } from '../lib/utils/boqFormulaEngine';
import { DEFAULT_LOCK_OPTIONS, DEFAULT_COLOUR_OPTIONS } from '../lib/services/frpPricingEngine';
import { DEFAULT_FRAME_PROFILES } from '../lib/utils/frameDefaults';
import { calculateQuotationProfit } from '../lib/utils/quotationProfit';
import { generateManufacturingBoq } from '../lib/services/boqService';
import { ProductionOrder, ProductionDoorItem } from '../lib/services/productionService';

async function runTests() {
  console.log('--- 1. Testing Master Defaults & Settings ---');
  
  // Verify Lock options have costPrice
  const plusPoint = DEFAULT_LOCK_OPTIONS.find(l => l.name.includes('PlusPoint'));
  console.log('PlusPoint Lock:', plusPoint?.name, 'Price:', plusPoint?.price, 'CostPrice:', plusPoint?.costPrice);
  if (!plusPoint || plusPoint.costPrice !== 600) {
    throw new Error(`Expected PlusPoint costPrice to be 600, got ${plusPoint?.costPrice}`);
  }

  // Verify Colour options have pigmentRatePerKg
  const teak = DEFAULT_COLOUR_OPTIONS.find(c => c.name.toLowerCase().includes('teak'));
  console.log('Teak Colour:', teak?.name, 'Pigment Rate:', teak?.pigmentRatePerKg);
  if (!teak || teak.pigmentRatePerKg !== 560) {
    throw new Error(`Expected Teak pigmentRatePerKg to be 560, got ${teak?.pigmentRatePerKg}`);
  }

  // Verify Frame profiles have materialCost
  const heavyFrame = DEFAULT_FRAME_PROFILES.find(f => f.id === 'FRM-HEAVY');
  console.log('Heavy Frame:', heavyFrame?.name, 'Material Cost:', heavyFrame?.materialCost);
  if (!heavyFrame || heavyFrame.materialCost !== 650) {
    throw new Error(`Expected Heavy Frame materialCost to be 650, got ${heavyFrame?.materialCost}`);
  }

  console.log('✅ Master Defaults verified successfully.\n');

  console.log('--- 2. Testing calculateDoorBatchBoq Cost Synchronization ---');
  const doorInputs: BoqDoorInput[] = [
    {
      doorNumber: 'D-1',
      heightCm: 200,
      widthCm: 80,
      quantity: 1,
      lockType: 'PlusPoint',
      lockCostPrice: 600,
      frameCostPrice: 650,
      extraItemsCost: 250,
    },
    {
      doorNumber: 'D-2',
      heightCm: 190,
      widthCm: 75,
      quantity: 1,
      lockType: 'BABY LATCH',
      lockCostPrice: 200,
      frameCostPrice: 0,
      extraItemsCost: 0,
    },
  ];

  const batchBoq = calculateDoorBatchBoq(
    doorInputs,
    DEFAULT_FRAME_PROFILES,
    {
      resinRatePerKg: 185,
      csm300RatePerKg: 190,
      woodRatePerCuFt: 850,
    }
  );

  const line1 = batchBoq.perDoorLines[0];
  console.log('Line 1 Costs:');
  console.log('  Chemical:', line1.chemicalCost);
  console.log('  Wood:', line1.woodCost);
  console.log('  Foam:', line1.foamCost);
  console.log('  Lock Cost:', line1.lockCost);
  console.log('  Frame Mat Cost:', line1.frameMaterialCost);
  console.log('  Extra Items Cost:', line1.extraItemsCost);
  console.log('  Total Door Cost:', line1.totalDoorCost);

  if (line1.lockCost !== 600) {
    throw new Error(`Expected line 1 lockCost to be 600, got ${line1.lockCost}`);
  }
  if (line1.frameMaterialCost !== 650) {
    throw new Error(`Expected line 1 frameMaterialCost to be 650, got ${line1.frameMaterialCost}`);
  }
  if (line1.extraItemsCost !== 250) {
    throw new Error(`Expected line 1 extraItemsCost to be 250, got ${line1.extraItemsCost}`);
  }

  const sumOfParts = line1.chemicalCost + line1.woodCost + line1.foamCost + line1.lockCost + line1.frameMaterialCost + line1.extraItemsCost;
  if (Math.abs(line1.totalDoorCost - sumOfParts) > 0.01) {
    throw new Error(`Expected line 1 totalDoorCost to match sum ${sumOfParts}, got ${line1.totalDoorCost}`);
  }

  console.log('Batch Totals:');
  console.log('  Total Frame Material Cost:', batchBoq.totalFrameMaterialCost);
  console.log('  Total Extra Items Cost:', batchBoq.totalExtraItemsCost);
  console.log('  Grand Total Cost:', batchBoq.grandTotalCost);

  if (batchBoq.totalFrameMaterialCost !== 650) {
    throw new Error(`Expected totalFrameMaterialCost to be 650, got ${batchBoq.totalFrameMaterialCost}`);
  }
  if (batchBoq.totalExtraItemsCost !== 250) {
    throw new Error(`Expected totalExtraItemsCost to be 250, got ${batchBoq.totalExtraItemsCost}`);
  }

  console.log('✅ calculateDoorBatchBoq verified successfully.\n');

  console.log('--- 3. Testing Quotation Profit Engine Sync ---');
  const profitResult = calculateQuotationProfit({
    rows: [
      {
        id: 'row-1',
        modelTitle: 'FRP Door Deluxe',
        height: 200,
        widthTop: 80,
        unit: 'cm',
        qty: 2,
        rate: 8500,
        lockId: 'lock-pluspoint-black',
        lockName: 'PlusPoint Black',
        lockCostPrice: 600,
        frameTypeId: 'FRM-HEAVY',
        frameTypeName: 'Heavy Frame',
        frameCostPrice: 650,
      },
    ],
    discount: 0,
    includeInstallation: false,
  });

  console.log('Quotation Profit Calculation:');
  console.log('  Total Estimated Cost:', profitResult.totalEstimatedCost);
  console.log('  Doors Revenue:', profitResult.doorsRevenue);
  console.log('  Net Revenue:', profitResult.netRevenue);
  console.log('  Estimated Net Profit:', profitResult.estimatedNetProfit);
  console.log('  Estimated Margin Percent:', profitResult.estimatedMarginPct + '%');

  if (profitResult.totalEstimatedCost <= 0 || profitResult.estimatedMarginPct <= 0) {
    throw new Error('Expected positive cost and margin in quotation profit calculation');
  }

  console.log('✅ Quotation Profit Engine verified successfully.\n');

  console.log('--- 4. Testing Production Order to BOQ Service Sync ---');
  const testDoor: any = {
    id: 'pdoor-1',
    doorNo: 101,
    doorNumber: 'D-101',
    location: 'Bed 1',
    finishedHeightMm: 2000,
    finishedWidthMm: 800,
    thicknessMm: 30,
    model: 'Woodgrain Solid',
    finishColor: 'Teak Wood',
    frameTypeName: 'Heavy Frame',
    lockType: 'PlusPoint Black',
    lockCostPrice: 600,
    frameCostPrice: 650,
    extraItemsCost: 150,
    quantity: 1,
    status: 'PENDING',
  };

  const dummyOrder: any = {
    id: 'PO-TEST-SYNC',
    orderNumber: 'PO-TEST-SYNC',
    source: 'QUOTATION',
    customerName: 'Test Sync Customer',
    siteName: 'Test Site',
    district: 'Ernakulam',
    doors: [testDoor],
    status: 'QUEUE_TO_FACTORY',
    priority: 'MEDIUM',
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const boqSheet = await generateManufacturingBoq(dummyOrder);
  console.log('BOQ Sheet ID:', boqSheet.id);
  console.log('BOQ Number:', boqSheet.boqNumber);
  console.log('Total Amount in BOQ Sheet:', boqSheet.totalAmount);
  console.log('Items Count:', boqSheet.items.length);
  console.log('Item 1 Unit Rate (Door Total Cost):', boqSheet.items[0]?.unitRate);
  console.log('BOQ Notes Summary:', boqSheet.notes);

  if (!boqSheet.id || boqSheet.items.length === 0 || boqSheet.items[0].unitRate <= 0) {
    throw new Error('Expected manufacturing BOQ to generate with positive unit rate');
  }

  if (!boqSheet.notes || !boqSheet.notes.includes('₹600')) {
    throw new Error(`Expected BOQ notes to reflect lock cost ₹600, got ${boqSheet.notes}`);
  }

  console.log('✅ Production Order to BOQ Service verified successfully!\n');
  console.log('🎉 ALL BOQ & QUOTATION COST SYNCHRONIZATION TESTS PASSED 100%!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
