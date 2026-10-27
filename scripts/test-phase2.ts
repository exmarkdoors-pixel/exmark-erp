import { listCustomers, createCustomer, getCustomer, updateCustomer } from '../lib/services/customerService';
import { listLeads, createLead, getLead, addFollowUp } from '../lib/services/crmService';
import { listQuotations, createQuotation, convertToOrder } from '../lib/services/quotationService';
import { listBoqs, createBoq, addBoqItem, convertToQuotation } from '../lib/services/boqService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  EXMARK ERP — Phase 2 Automated Verification Suite ');
  console.log('====================================================\n');

  try {
    // 1. Customer Service tests
    console.log('--- CUSTOMER SERVICE TESTS ---');
    const customers = await listCustomers();
    assert(Array.isArray(customers), 'listCustomers returns an array');

    const newCust = await createCustomer({
      name: 'Test Dealer Kochi',
      firmName: 'Kochi Doors & Plywoods',
      type: 'DEALER',
      district: 'Ernakulam',
      town: 'Aluva',
      phone: '+91 98470 99999',
      creditLimit: 200000,
      outstandingBalance: 0,
      status: 'ACTIVE',
    });
    assert(!!newCust.id && newCust.customerCode.startsWith('EXM-CUST-'), 'createCustomer assigns ID and EXM-CUST code');

    const fetchedCust = await getCustomer(newCust.id);
    assert(fetchedCust?.name === 'Test Dealer Kochi', 'getCustomer retrieves created customer');

    const updatedCust = await updateCustomer(newCust.id, { town: 'Edappally' });
    assert(updatedCust?.town === 'Edappally', 'updateCustomer modifies fields correctly');

    // 2. CRM & Leads tests
    console.log('\n--- CRM & LEADS TESTS ---');
    const leads = await listLeads();
    assert(Array.isArray(leads), 'listLeads returns an array');

    const newLead = await createLead({
      title: 'Kakkanad IT Park Villa',
      contactPerson: 'Mr. Unnikrishnan',
      phone: '+91 94471 88888',
      district: 'Ernakulam',
      stage: 'NEW',
      estimatedValue: 350000,
      notes: 'Wants 20 molded teak FRP doors',
    });
    assert(!!newLead.id && newLead.leadCode.startsWith('LEAD-2026-'), 'createLead creates lead with code');

    const fetchedLead = await getLead(newLead.id);
    assert(fetchedLead?.contactPerson === 'Mr. Unnikrishnan', 'getLead retrieves created lead');

    const followUp = await addFollowUp(newLead.id, {
      followUpDate: new Date().toISOString(),
      type: 'CALL',
      notes: 'Client confirmed site readiness for door frame measurement',
    });
    assert(!!followUp.id && followUp.leadId === newLead.id, 'addFollowUp records interaction');

    // 3. Quotation & Pricing tests
    console.log('\n--- QUOTATION & PRICING TESTS ---');
    const quotations = await listQuotations();
    assert(Array.isArray(quotations), 'listQuotations returns an array');

    const newQuote = await createQuotation({
      customerId: newCust.id,
      leadId: newLead.id,
      date: '2026-10-27',
      validUntil: '2026-11-27',
      discount: 5000,
      notes: 'FRP door rate includes packaging and loading at factory gate',
      items: [
        {
          doorCategory: 'FRP_DOORS',
          doorModel: '32mm Molded Teak FRP Door',
          heightMm: 2100,
          widthMm: 900,
          thicknessMm: 32,
          quantity: 10,
          unitPrice: 8000,
          gstRate: 18,
          totalPrice: 80000,
        },
        {
          doorCategory: 'FRP_DOORS',
          doorModel: '30mm Waterproof Solid Bathroom FRP Door',
          heightMm: 2100,
          widthMm: 750,
          thicknessMm: 30,
          quantity: 5,
          unitPrice: 6000,
          gstRate: 18,
          totalPrice: 30000,
        },
      ],
    });
    assert(!!newQuote.id && newQuote.quoteNumber.startsWith('QTN-2026-'), 'createQuotation assigns quoteNumber');
    assert(newQuote.subtotal === 110000, 'Subtotal correctly calculated (80,000 + 30,000 = 110,000)');
    // Discount = 5000 -> Taxable = 105,000 -> 18% GST = 18,900 -> Total = 123,900
    assert(newQuote.gstAmount === 18900, '18% GST correctly calculated on discounted subtotal');
    assert(newQuote.totalAmount === 123900, 'Grand total correctly computed');

    const convertedOrder = await convertToOrder(newQuote.id);
    assert(convertedOrder.status === 'CONVERTED', 'convertToOrder marks quotation status as CONVERTED');

    // 4. BOQ Architecture tests
    console.log('\n--- BOQ (BILL OF QUANTITIES) TESTS ---');
    const boqs = await listBoqs();
    assert(Array.isArray(boqs), 'listBoqs returns an array');

    const newBoq = await createBoq({
      customerId: newCust.id,
      customerName: newCust.name,
      projectName: 'Green Valley Villas Wayanad',
      district: 'Wayanad',
      status: 'DRAFT',
      notes: 'Architect schedule for 12 villas',
    });
    assert(!!newBoq.id && newBoq.boqNumber.startsWith('BOQ-2026-'), 'createBoq assigns BOQ-2026-NNN');

    const updatedBoqWithItem = await addBoqItem(newBoq.id, {
      itemCode: 'D-01',
      productCategory: 'FRP',
      model: '32mm CNC Routed Teak Finish',
      heightMm: 2100,
      widthMm: 900,
      quantity: 12,
      unitRate: 8500,
      amount: 102000,
      taxRate: 18,
      transportRate: 0,
      installationRate: 0,
    });
    assert(updatedBoqWithItem.totalDoors === 12, 'BOQ door count recalculated accurately');
    assert(updatedBoqWithItem.totalAmount === 102000, 'BOQ total amount recalculated accurately');

    const convertedBoq = await convertToQuotation(newBoq.id);
    assert(convertedBoq.status === 'CONVERTED_TO_QUOTATION', 'convertToQuotation transitions BOQ state');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
