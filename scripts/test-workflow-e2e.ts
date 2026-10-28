import { createLead, listLeads } from '../lib/services/crmService';
import { createCustomer, listCustomers } from '../lib/services/customerService';
import { createMeasurement, getAllMeasurements } from '../lib/services/measurementService';
import { createBoq, addBoqItem, listBoqs } from '../lib/services/boqService';
import { createQuotation, listQuotations, convertToOrder } from '../lib/services/quotationService';
import { listProductionOrders } from '../lib/services/productionService';
import { POST as ordersPost } from '../app/api/orders/route';
import { readFileSync, writeFileSync } from 'fs';

async function runWorkflowTest() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — CUSTOMER-TO-PRODUCTION END-TO-END WORKFLOW TEST');
  console.log('========================================================================\n');

  const testStamp = Date.now();

  // Step 1: Create CRM Lead
  console.log('[Step 1] Creating new CRM Lead for Kerala District Project...');
  const lead = await createLead({
    title: `Skyline Horizon Builders (Test-${testStamp})`,
    contactPerson: 'K. R. Varma (Chief Project Architect)',
    phone: '+91 98470 12345',
    district: 'Ernakulam',
    stage: 'NEW',
    estimatedValue: 185000,
    notes: 'Premium 32mm FRP Molded Teak doors for luxury villa project in Kakkanad.',
  });
  console.log(`✓ Lead created: ID=${lead.id}, Title="${lead.title}"\n`);

  // Step 2: Convert/Create Verified Customer
  console.log('[Step 2] Registering customer in permanent customer registry...');
  const customer = await createCustomer({
    name: `Skyline Horizon Builders (Test-${testStamp})`,
    phone: '+91 98470 12345',
    email: `skyline.${testStamp}@example.com`,
    district: 'Ernakulam',
    town: 'Kakkanad',
    address: 'Horizon Heights, Near Infopark, Kakkanad, Kochi',
    gstin: '32AABCS1234F1Z8',
    type: 'BUILDER',
    creditLimit: 500000,
    outstandingBalance: 0,
    status: 'ACTIVE',
  });
  console.log(`✓ Customer created: ID=${customer.id}, Name="${customer.name}"\n`);

  // Step 3: Record Site Measurements
  console.log('[Step 3] Recording 4-point site measurements for customer openings...');
  const measurement = await createMeasurement({
    refNumber: `MSR-2026-TEST-${testStamp.toString().slice(-4)}`,
    customerId: customer.id,
    customerName: customer.name,
    orderRef: `EXM-SO-TEST-${testStamp.toString().slice(-4)}`,
    siteName: 'Horizon Villa Block A',
    siteAddress: 'Infopark Expressway, Kakkanad',
    district: 'Ernakulam',
    totalOpenings: 2,
    engineerName: 'Anoop Krishnan (Sr. Site Engineer)',
    date: new Date().toISOString().split('T')[0],
    rebateDepthMm: '38mm standard Kerala frame rebate',
    wallThicknessMm: '150mm RCC',
    notes: '4-point plumb verified. 12mm floor tile offset accounted.',
    status: 'VERIFIED',
    doors: [
      {
        id: `door-t1-${testStamp}`,
        doorNumber: 'D1 - Master Bed',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Burma Teak (Woodgrain PU)',
        hingeSide: 'Left Hand (LH) - Inward',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2100,
        heightRight: 2100,
        widthTop: 900,
        widthBottom: 900,
        wallThickness: '150mm',
        rebateDepth: '38mm',
        remarks: 'Zero out-of-square plumb variance.',
      },
      {
        id: `door-t2-${testStamp}`,
        doorNumber: 'D2 - Guest Bedroom',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Burma Teak (Woodgrain PU)',
        hingeSide: 'Right Hand (RH) - Inward',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2095,
        heightRight: 2095,
        widthTop: 850,
        widthBottom: 850,
        wallThickness: '150mm',
        rebateDepth: '38mm',
        remarks: 'Direct factory cutting tolerance ready.',
      },
    ],
  });
  console.log(`✓ Site measurement saved & verified: Ref=${measurement.refNumber}, Openings=${measurement.totalOpenings}\n`);

  // Step 4: Create Itemized BOQ
  console.log('[Step 4] Creating itemized door BOQ schedule...');
  const boq = await createBoq({
    projectName: 'Horizon Villa Block A',
    customerId: customer.id,
    customerName: customer.name,
    district: 'Ernakulam',
    status: 'DRAFT',
    notes: '18% GST applicable (HSN 3925.20.00).',
  });

  const updatedBoq = await addBoqItem(boq.id, {
    itemCode: 'FRP-MLD-32',
    model: 'FRP Molded Teak Architectural Door 2100x900mm',
    description: 'FRP Molded Teak Architectural Door 2100x900mm',
    productCategory: 'FRP',
    heightMm: 2100,
    widthMm: 900,
    quantity: 2,
    unitRate: 7800,
    amount: 15600,
    taxRate: 18,
    transportRate: 0,
    installationRate: 0,
  });
  console.log(`✓ BOQ created: ID=${updatedBoq.id}, Items=${updatedBoq.items.length}, Total=₹${updatedBoq.totalAmount}\n`);

  // Step 5: Generate Formal 18% GST Quotation
  console.log('[Step 5] Generating GST Quotation from verified BOQ and dimensions...');
  const quotation = await createQuotation({
    customerId: customer.id,
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    notes: '40% advance required before production release. Balance against delivery challan.',
    items: [
      {
        doorCategory: 'FRP_DOORS',
        doorModel: 'FRP Molded Teak (32mm) - 100% Waterproof',
        finishColor: 'Burma Teak (Woodgrain PU)',
        heightMm: 2100,
        widthMm: 900,
        thicknessMm: 32,
        quantity: 2,
        unitPrice: 7800,
        gstRate: 18,
        totalPrice: 15600,
      },
    ],
  });
  console.log(`✓ Quotation created: QuoteNumber=${quotation.quoteNumber}, Total=₹${quotation.totalAmount}\n`);

  // Step 6: Customer Acceptance & Conversion to Sales Order
  console.log('[Step 6] Customer accepts quotation -> converting to sales order...');
  const convertedQuote = await convertToOrder(quotation.id);
  console.log(`✓ Quotation status updated to: ${convertedQuote.status}\n`);

  // Step 7: Test Production Release Gate WITHOUT advance verification (MUST FAIL)
  console.log('[Step 7] Testing production release gate WITHOUT advance verification...');
  // Force advanceVerified to false in quotations store
  const storePath = 'data/quotations-store.json';
  const quotesRaw = JSON.parse(readFileSync(storePath, 'utf8')) as Array<{
    id: string;
    advanceVerified?: boolean;
    status?: string;
  }>;
  const qIdx = quotesRaw.findIndex((q) => q.id === quotation.id);
  quotesRaw[qIdx].advanceVerified = false;
  quotesRaw[qIdx].status = 'CONFIRMED';
  writeFileSync(storePath, JSON.stringify(quotesRaw, null, 2), 'utf8');

  const releaseAttemptRes = await ordersPost(
    new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: quotation.id,
        action: 'RELEASE_TO_PRODUCTION',
      }),
    })
  );
  const releaseAttemptData = await releaseAttemptRes.json();
  if (releaseAttemptRes.status === 400 && !releaseAttemptData.success) {
    console.log(`✓ SECURITY GATE ENFORCED: Release without advance correctly rejected: "${releaseAttemptData.error}"\n`);
  } else {
    throw new Error('CRITICAL FLAW: Production release succeeded without verified advance!');
  }

  // Step 8: Verify Advance Payment (Accounts Audit Signoff)
  console.log('[Step 8] Accounts department records and verifies 40% advance deposit...');
  const verifyAdvanceRes = await ordersPost(
    new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: quotation.id,
        action: 'VERIFY_ADVANCE',
      }),
    })
  );
  const verifyAdvanceData = await verifyAdvanceRes.json();
  if (!verifyAdvanceData.success) {
    throw new Error(`Advance verification failed: ${verifyAdvanceData.error}`);
  }
  console.log(`✓ Advance verified: ${verifyAdvanceData.message}\n`);

  // Step 9: Release to Production Floor with Job Cards
  console.log('[Step 9] Releasing confirmed & verified work order to Palakkad press lines...');
  const releaseSuccessRes = await ordersPost(
    new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: quotation.id,
        action: 'RELEASE_TO_PRODUCTION',
      }),
    })
  );
  const releaseSuccessData = await releaseSuccessRes.json();
  if (!releaseSuccessData.success) {
    throw new Error(`Production release failed: ${releaseSuccessData.error}`);
  }
  console.log(`✓ Production order released: ${releaseSuccessData.message}`);
  console.log(`  Job Card: ${releaseSuccessData.productionOrder.jobCardNumber}`);
  console.log(`  Doors created in manufacturing: ${releaseSuccessData.productionOrder.doors.length}`);
  console.log(`  First Door Serial: ${releaseSuccessData.productionOrder.doors[0].doorId}\n`);

  // Step 10: Verify Cold Database Persistence of All Workflow Entities
  console.log('[Step 10] Validating physical store persistence across all workflow entities...');
  const allLeads = await listLeads();
  const allCustomers = await listCustomers();
  const allMeasurements = await getAllMeasurements();
  const allBoqs = await listBoqs();
  const allQuotes = await listQuotations();
  const allProduction = await listProductionOrders();

  const foundLead = allLeads.find(l => l.id === lead.id);
  const foundCust = allCustomers.find(c => c.id === customer.id);
  const foundM = allMeasurements.find(m => m.id === measurement.id);
  const foundB = allBoqs.find(b => b.id === boq.id);
  const foundQ = allQuotes.find(q => q.id === quotation.id);
  const foundP = allProduction.find(p => p.salesOrderId === quotation.id);

  if (!foundLead || !foundCust || !foundM || !foundB || !foundQ || !foundP) {
    throw new Error('Persistence failure: One or more workflow entities failed to persist to disk stores!');
  }

  console.log('✓ All 6 workflow entities confirmed in permanent persistent database stores:');
  console.log(`  - Lead: ${foundLead.id} (${foundLead.title})`);
  console.log(`  - Customer: ${foundCust.id} (${foundCust.name})`);
  console.log(`  - Site Measurement: ${foundM.id} (${foundM.refNumber})`);
  console.log(`  - BOQ: ${foundB.id} (${foundB.projectName})`);
  console.log(`  - Quotation: ${foundQ.id} (${foundQ.quoteNumber})`);
  console.log(`  - Production Order: ${foundP.id} (${foundP.jobCardNumber})`);

  console.log('\n========================================================================');
  console.log('  ALL WORKFLOW TESTS PASSED: UNBROKEN CUSTOMER-TO-PRODUCTION PIPELINE');
  console.log('========================================================================');
}

runWorkflowTest().catch((err) => {
  console.error('Workflow test failed:', err);
  process.exit(1);
});
