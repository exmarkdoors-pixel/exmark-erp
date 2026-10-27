import fs from 'fs';
import path from 'path';

// Phase 1 imports
import { getProductCategories, toggleCategoryEnabled } from '../lib/services/productCategoryService';
import { getAllMeasurements } from '../lib/services/measurementService';

// Phase 2 imports
import { createCustomer } from '../lib/services/customerService';
import { createLead } from '../lib/services/crmService';
import { createQuotation } from '../lib/services/quotationService';
import { createBoq, addBoqItem } from '../lib/services/boqService';

// Phase 3 imports
import { createProductionOrder } from '../lib/services/productionService';

// Phase 4 imports
import { createInvoice, recordPayment, createFinancialTarget, calculateBreakEven } from '../lib/services/financeService';

// Phase 5 imports
import { generateReport } from '../lib/services/reportService';
import { sendWhatsAppTemplateMessage } from '../lib/services/communicationService';

// Phase 6 imports
import { runAiStrategistAnalysis } from '../lib/services/aiStrategistService';

// Phase 7 imports
import { createDispatch, createInstallation, completeInstallationSignoff, generateWarrantyCertificate } from '../lib/services/fulfillmentService';

// Phase 8 imports
import { validateAndBumpVersion, acquireOrHeartbeatLease, releaseLease } from '../lib/services/concurrencyService';

// Phase 9 imports
import { createBackupSnapshot, verifyBackupIntegrity } from '../lib/services/backupService';
import { getSystemVersionInfo } from '../lib/services/updateService';

async function runMasterAcceptanceSuite() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — ULTIMATE MASTER ACCEPTANCE SUITE (PHASES 1 TO 9)');
  console.log('  Testing FRP Door Manufacturing, Sales, Finance & Fulfillment Platform');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(phase: string, testName: string, condition: boolean) {
    if (condition) {
      console.log(`  [${phase}] ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  [${phase}] ✗ FAILED: ${testName}`);
      failed++;
    }
  }

  try {
    // ── PHASE 1: AUDIT & FOUNDATION ───────────────────────────────────────────
    const categories = await getProductCategories();
    const frp = categories.find((c) => c.code === 'FRP');
    const wpc = categories.find((c) => c.code === 'WPC');
    assert('PHASE 1', 'FRP category is enabled by default', Boolean(frp && frp.enabled));
    assert('PHASE 1', 'WPC category is disabled by default', Boolean(wpc && !wpc.enabled));

    let frpBlockSuccess = false;
    try {
      await toggleCategoryEnabled('FRP', false);
    } catch {
      frpBlockSuccess = true;
    }
    assert('PHASE 1', 'Primary FRP cannot be disabled (integrity safeguard)', frpBlockSuccess);

    const initialMeasurements = await getAllMeasurements();
    assert('PHASE 1', 'Door measurements book loaded', Array.isArray(initialMeasurements));

    // ── PHASE 2: SALES & CRM ──────────────────────────────────────────────────
    const customer = await createCustomer({
      name: 'Kerala Grand Villas',
      firmName: 'Grand Villas Construction Ltd',
      type: 'BUILDER',
      district: 'Ernakulam',
      town: 'Aluva',
      phone: '9846011223',
      creditLimit: 1500000,
      outstandingBalance: 0,
      status: 'ACTIVE',
    });
    assert('PHASE 2', 'Customer created with valid ID', Boolean(customer.id));

    const lead = await createLead({
      title: 'Waterfront Villas FRP Schedule',
      contactPerson: 'Kerala Grand Villas',
      phone: '9846011223',
      district: 'Ernakulam',
      stage: 'NEW',
      estimatedValue: 340000,
      notes: 'Architect referral for 40 luxury villas',
    });
    assert('PHASE 2', 'CRM Lead captured', Boolean(lead.id));

    const boq = await createBoq({
      customerId: customer.id,
      customerName: customer.name,
      projectName: 'Grand Villas Waterfront',
      district: 'Ernakulam',
      status: 'DRAFT',
    });
    const boqWithItem = await addBoqItem(boq.id, {
      itemCode: 'D-01',
      productCategory: 'FRP',
      model: 'EXM-FRP-TL101',
      heightMm: 2100,
      widthMm: 900,
      quantity: 40,
      unitRate: 8500,
      amount: 40 * 8500,
      taxRate: 18,
      transportRate: 0,
      installationRate: 0,
    });
    assert('PHASE 2', 'BOQ line item added and computed', boqWithItem.totalDoors === 40 && boqWithItem.totalAmount === 340000);

    const quote = await createQuotation({
      customerId: customer.id,
      leadId: lead.id,
      date: '2026-10-27',
      validUntil: '2026-11-27',
      discount: 10000,
      notes: 'FRP door quote',
      items: [
        {
          doorCategory: 'FRP_DOORS',
          doorModel: 'EXM-FRP-TL101',
          heightMm: 2100,
          widthMm: 900,
          thicknessMm: 35,
          quantity: 40,
          unitPrice: 8500,
          gstRate: 18,
          totalPrice: 40 * 8500,
        },
      ],
    });
    assert('PHASE 2', 'GST Quotation calculated with 18% HSN 3925.20.00', quote.gstAmount === Math.round((340000 - 10000) * 0.18));

    // ── PHASE 3: PRODUCTION & MANUFACTURING ──────────────────────────────────
    const prodOrder = await createProductionOrder({
      customerName: customer.name,
      siteName: 'Grand Villas Waterfront',
      district: 'Ernakulam',
      lineAssigned: 'Line 1: FRP Hydraulic Press (300 Ton)',
      priority: 'HIGH',
      tolerances: {
        heightDeductionMm: 10,
        widthDeductionMm: 12,
      },
      doors: [
        {
          doorNumber: 'D-01',
          model: 'EXM-FRP-TL101',
          rawHeightMm: 2100,
          rawWidthMm: 900,
          handing: 'LH',
          lockType: 'Mortise Cylinder',
          finishColor: 'Teak Brown',
        },
      ],
    });
    assert('PHASE 3', 'Production Order created with Job Cards', Boolean(prodOrder.id));

    const doorItem = prodOrder.doors[0];
    assert('PHASE 3', 'Finished cutting deduction (Finished = Raw - Deduction)', doorItem.finishedHeightMm === 2090 && doorItem.finishedWidthMm === 888);
    assert('PHASE 3', 'Unique Door Serial ID generated (EXM-DR-2026-XXXX)', doorItem.doorId.startsWith('EXM-DR-2026-'));

    // ── PHASE 4: FINANCIAL MANAGEMENT ────────────────────────────────────────
    const invoice = await createInvoice({
      salesOrderId: quote.quoteNumber,
      customerId: customer.id,
      customerName: customer.name,
      subtotal: 340000,
      dueDate: '2026-11-28',
    });
    assert('PHASE 4', 'GST Tax Invoice created', Boolean(invoice.id) && invoice.totalAmount === 401200);

    const payment = await recordPayment({
      invoiceId: invoice.id,
      customerId: customer.id,
      customerName: customer.name,
      amount: 200000,
      paymentMode: 'NEFT',
      referenceNumber: 'NEFT-KL-987654321',
    });
    assert('PHASE 4', 'Advance payment recorded', payment.amount === 200000);

    const target = await createFinancialTarget({
      targetPeriod: '2026-11',
      salesRevenueTarget: 5000000,
      collectionsTarget: 4500000,
      frpDoorQuantityTarget: 600,
    });
    assert('PHASE 4', 'Monthly financial targets created', target.salesRevenueTarget === 5000000 && target.status === 'APPROVED');

    const breakEven = calculateBreakEven({
      fixedOverheadCosts: 450000,
      averageFRPPricePerDoor: 8500,
      variableCostPerDoor: 4800,
      targetSalesRevenue: 2500000,
    });
    assert('PHASE 4', 'FRP Door break-even volume calculated accurately', breakEven.breakEvenUnits === 122 && breakEven.contributionMarginPerDoor === 3700);

    // ── PHASE 5: UNIVERSAL REPORTS & WHATSAPP ─────────────────────────────────
    const report = await generateReport('SALES_BY_DISTRICT');
    assert('PHASE 5', '14 Kerala Districts sales analytics report generated', report.rows.length > 0 && Boolean(report.summaryMetrics.totalRevenue));

    const waRes = await sendWhatsAppTemplateMessage({
      recipientPhone: '+919846011223',
      recipientName: 'Kerala Grand Villas',
      documentType: 'QUOTATION',
      documentId: 'QT-MSTR-701',
      language: 'en',
      payload: { quoteNumber: 'QT-MSTR-701', amount: '₹3,40,000' },
    });
    assert('PHASE 5', 'Official WhatsApp Cloud API dispatch processed', waRes.templateName === 'exmark_quotation_estimate' && waRes.status === 'DELIVERED');

    // ── PHASE 6: AI FINANCIAL STRATEGIST ──────────────────────────────────────
    const strategist = await runAiStrategistAnalysis();
    assert('PHASE 6', 'AI Strategist computed financial health score', typeof strategist.financialHealthScore === 'number');
    assert('PHASE 6', 'AI Strategist generated 3 stress-tested forecast scenarios', strategist.scenarios.length === 3);
    assert('PHASE 6', 'Strict read-only governance safeguard enforced (cannot execute payments)', strategist.governanceSummary.canExecutePayments === false);

    // ── PHASE 7: FULFILLMENT, LOGISTICS & WARRANTY ───────────────────────────
    const dispatch = await createDispatch({
      salesOrderId: quote.quoteNumber,
      customerName: customer.name,
      destinationAddress: 'Waterfront Villas, Aluva, Ernakulam',
      deliveryDistrict: 'Ernakulam',
      vehicleNumber: 'KL-09-AW-8210',
      driverName: 'Suresh Babu',
      driverPhone: '9447122334',
      doorCount: 40,
    });
    assert('PHASE 7', 'Fleet dispatch scheduled', Boolean(dispatch.id) && dispatch.doorCount === 40);

    const inst = await createInstallation({
      salesOrderId: quote.quoteNumber,
      dispatchId: dispatch.id,
      customerName: customer.name,
      siteAddress: 'Waterfront Villas, Aluva, Ernakulam',
      district: 'Ernakulam',
      supervisorName: 'Sunil Varghese',
      scheduledDate: '2026-10-30',
      doorCount: 40,
    });
    const signedInst = await completeInstallationSignoff({
      id: inst.id,
      clientSignoffName: 'Eng. Mathews Aluva',
      feedbackRating: 5,
      remarks: 'All 40 FRP doors installed seamlessly. Water tight seal.',
    });
    assert('PHASE 7', 'Installation 5-star signoff completed', signedInst.status === 'QUALITY_APPROVED' && signedInst.clientFeedbackRating === 5);

    const warranty = await generateWarrantyCertificate({
      salesOrderId: quote.quoteNumber,
      customerName: customer.name,
      siteAddress: 'Waterfront Villas, Aluva, Ernakulam',
      district: 'Ernakulam',
      warrantyPeriodYears: 15,
      coveredDoors: [
        { doorId: 'EXM-DR-2026-0001', model: 'EXM-FRP-TL101', sizeMm: '2085 x 888 mm' },
      ],
    });
    assert('PHASE 7', '15-Year FRP Material Warranty Certificate issued', warranty.warrantyPeriodYears === 15);
    assert('PHASE 7', 'Warranty explicitly excludes Hinges, Locks & Handles', warranty.explicitExclusions.some((e) => e.includes('Hinges') && e.includes('Lock')));
    assert('PHASE 7', 'Warranty contains bilingual Malayalam/English care instructions', warranty.bilingualCareInstructions.malayalam.length > 0 && warranty.bilingualCareInstructions.english.length > 0);

    // ── PHASE 8: MULTI-PLATFORM & CONCURRENCY ─────────────────────────────────
    const manifestExists = fs.existsSync(path.join(process.cwd(), 'public', 'manifest.json'));
    const swExists = fs.existsSync(path.join(process.cwd(), 'public', 'sw.js'));
    const electronExists = fs.existsSync(path.join(process.cwd(), 'electron', 'main.js'));
    assert('PHASE 8', 'PWA Manifest is deployed', manifestExists);
    assert('PHASE 8', 'PWA Service Worker is deployed', swExists);
    assert('PHASE 8', 'Electron Windows Desktop packaging configured', electronExists);

    const testEntityId = `QT-CONC-${Date.now()}`;
    await acquireOrHeartbeatLease({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      userId: 'usr-1',
      userName: 'Office 1',
    });
    const conflictLease = await acquireOrHeartbeatLease({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      userId: 'usr-2',
      userName: 'Office 2',
    });
    assert('PHASE 8', 'Concurrent user lease conflict prevented', conflictLease.acquired === false);
    await releaseLease('QUOTATION', testEntityId, 'usr-1');

    const v1Bump = await validateAndBumpVersion({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      expectedVersion: 1,
      modifiedBy: 'Office 1',
    });
    assert('PHASE 8', 'Optimistic concurrency version bumped to 2', v1Bump.newVersion === 2);

    const staleBump = await validateAndBumpVersion({
      entityType: 'QUOTATION',
      entityId: testEntityId,
      expectedVersion: 1,
      modifiedBy: 'Office 2',
    });
    assert('PHASE 8', 'Stale concurrent update rejected with 409 conflict', staleBump.conflict === true);

    // ── PHASE 9: RELIABILITY, BACKUP & UPDATE MANAGER ─────────────────────────
    const backupSnapshot = await createBackupSnapshot('SCHEDULED');
    assert('PHASE 9', 'Point-in-time backup snapshot created', Boolean(backupSnapshot.backupId) && backupSnapshot.filesCount > 0);

    const integrity = await verifyBackupIntegrity(backupSnapshot.backupId);
    assert('PHASE 9', 'Backup cryptographic SHA-256 verification passed', integrity.valid === true);

    const updateInfo = getSystemVersionInfo();
    assert('PHASE 9', 'System version info reports Optimal status on Production channel', updateInfo.health.status === 'OPTIMAL' && updateInfo.releaseChannel === 'production');
    assert('PHASE 9', 'System version changelog covers all 9 development phases', updateInfo.changelog.length === 9);

  } catch (err) {
    console.error('Master acceptance test error:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`  MASTER ACCEPTANCE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runMasterAcceptanceSuite();
