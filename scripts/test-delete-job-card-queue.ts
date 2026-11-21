import {
  cancelQueuedProductionOrder,
  getCancelledJobCards,
  ProductionOrder,
} from '../lib/services/productionService';
import fs from 'fs';
import { getDataFilePath } from '../lib/utils/dataPaths';

async function runTest() {
  console.log('🧪 Starting Test: Delete Job Card in QUEUED Stage with Reasons & Terms');

  const storePath = getDataFilePath('production-store.json');
  const cancelledStorePath = getDataFilePath('cancelled-job-cards.json');

  // Read current active store
  const raw = fs.readFileSync(storePath, 'utf8');
  const initialOrders: ProductionOrder[] = JSON.parse(raw);

  const testOrderId = `TEST-ORD-QUEUE-${Date.now()}`;
  const testJcNumber = `JC-TEST-${Date.now().toString().slice(-4)}`;

  const dummyOrder: ProductionOrder = {
    id: testOrderId,
    prodOrderNumber: `PRD-${testJcNumber}`,
    jobCardNumber: testJcNumber,
    customerName: 'Test Kerala Customer',
    siteName: 'Test Calicut Site',
    district: 'Kozhikode',
    doorCategory: 'FRP_DOORS',
    quantity: 2,
    lineAssigned: 'LINE_1',
    batchNumber: 'BATCH-TEST-1',
    priority: 'NORMAL',
    status: 'QUEUED',
    boqIssuedAt: new Date().toISOString(),
    tolerancesApplied: { heightDeductionMm: 20, widthDeductionMm: 10 },
    doors: [
      {
        id: `dr-1-${Date.now()}`,
        doorId: `EXM-DR-${Date.now()}-1`,
        doorNumber: 'D1',
        model: 'EXM-CLASSIC-01',
        rawHeightMm: 2100,
        rawWidthMm: 900,
        finishedHeightMm: 2080,
        finishedWidthMm: 890,
        stage: 'QUEUED',
        materialIssued: true,
      },
      {
        id: `dr-2-${Date.now()}`,
        doorId: `EXM-DR-${Date.now()}-2`,
        doorNumber: 'D2',
        model: 'EXM-CLASSIC-01',
        rawHeightMm: 2100,
        rawWidthMm: 900,
        finishedHeightMm: 2080,
        finishedWidthMm: 890,
        stage: 'QUEUED',
        materialIssued: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Insert dummy order into active store
    initialOrders.push(dummyOrder);
    fs.writeFileSync(storePath, JSON.stringify(initialOrders, null, 2), 'utf8');
    console.log(`✅ Step 1: Created test queued order #${testJcNumber}`);

    // 2. Test missing reason code -> should fail
    let errorCaught = false;
    try {
      await cancelQueuedProductionOrder(testOrderId, {
        reasonCode: '',
      });
    } catch (e: any) {
      errorCaught = true;
      console.log(`✅ Step 2: Missing reason code was correctly rejected: "${e.message}"`);
    }
    if (!errorCaught) throw new Error('Failed: Missing reason code should have thrown!');

    // 3. Test reason 'OTHER' with short notes -> should fail
    errorCaught = false;
    try {
      await cancelQueuedProductionOrder(testOrderId, {
        reasonCode: 'OTHER',
        reasonNotes: 'short',
      });
    } catch (e: any) {
      errorCaught = true;
      console.log(`✅ Step 3: 'OTHER' with short notes was correctly rejected: "${e.message}"`);
    }
    if (!errorCaught) throw new Error("Failed: Short notes for 'OTHER' should have thrown!");

    // 4. Test stage guard: change order to 'MOLDING' -> should fail deletion
    const currentOrders: ProductionOrder[] = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const idx = currentOrders.findIndex((o) => o.id === testOrderId);
    currentOrders[idx].status = 'MOLDING';
    fs.writeFileSync(storePath, JSON.stringify(currentOrders, null, 2), 'utf8');

    errorCaught = false;
    try {
      await cancelQueuedProductionOrder(testOrderId, {
        reasonCode: 'CUSTOMER_CANCELLED',
        reasonNotes: 'Customer cancelled order before production',
      });
    } catch (e: any) {
      errorCaught = true;
      console.log(`✅ Step 4: Deletion on MOLDING stage was correctly blocked by stage guard: "${e.message}"`);
    }
    if (!errorCaught) throw new Error('Failed: Deletion in MOLDING stage should have been blocked!');

    // Reset status back to 'QUEUED'
    currentOrders[idx].status = 'QUEUED';
    fs.writeFileSync(storePath, JSON.stringify(currentOrders, null, 2), 'utf8');

    // 5. Successful Cancellation with valid reason and terms
    const result = await cancelQueuedProductionOrder(testOrderId, {
      reasonCode: 'CUSTOMER_CANCELLED',
      reasonNotes: 'Party called and cancelled order due to site delay',
      reverseBoq: true,
      termsAccepted: true,
      cancelledBy: 'QA Automated Test',
    });

    console.log(`✅ Step 5: Order successfully cancelled: ${result.success}`);
    console.log(`   Archived Record ID: ${result.cancelledRecord.id}`);
    console.log(`   Reason Code: ${result.cancelledRecord.reasonCode}`);
    console.log(`   BOQ Reversed: ${result.cancelledRecord.reverseBoq}`);

    // Verify order is removed from active store
    const afterOrders: ProductionOrder[] = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const existsInActive = afterOrders.some((o) => o.id === testOrderId);
    if (existsInActive) throw new Error('Failed: Order still exists in active production store!');
    console.log('✅ Step 6: Verified order is completely removed from active production store.');

    // Verify order is archived in cancelled-job-cards.json
    const cancelledRecords = getCancelledJobCards();
    const archived = cancelledRecords.find((c) => c.id === testOrderId);
    if (!archived) throw new Error('Failed: Order was not found in cancelled-job-cards.json!');
    if (archived.reasonCode !== 'CUSTOMER_CANCELLED') throw new Error('Failed: Reason code mismatch in archive!');
    if (!archived.reverseBoq) throw new Error('Failed: reverseBoq was not recorded as true!');
    console.log('✅ Step 7: Verified order is preserved in cancelled-job-cards.json for Zero Data Loss.');

    // Clean up archive record created for test
    const cleanCancelled = cancelledRecords.filter((c) => c.id !== testOrderId);
    fs.writeFileSync(cancelledStorePath, JSON.stringify(cleanCancelled, null, 2), 'utf8');
    console.log('✅ Step 8: Cleaned up test record from archive store.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Deletion in QUEUED stage with terms and reasons is robust.');
  } finally {
    // Ensure active store is restored to clean state
    const finalOrders: ProductionOrder[] = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const cleanOrders = finalOrders.filter((o) => o.id !== testOrderId);
    fs.writeFileSync(storePath, JSON.stringify(cleanOrders, null, 2), 'utf8');
  }
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
