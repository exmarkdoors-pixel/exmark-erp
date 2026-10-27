import {
  listWhatsAppMessages,
  sendWhatsAppTemplateMessage,
  generateConfirmationToken,
  recordCustomerMeasurementDecision,
} from '../lib/services/communicationService';
import { generateReport, SYSTEM_REPORTS } from '../lib/services/reportService';
import { getAllMeasurements } from '../lib/services/measurementService';

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
  console.log('  EXMARK ERP — Phase 5 Reports & WhatsApp Suite     ');
  console.log('====================================================\n');

  try {
    // 1. WhatsApp Template Messaging Service
    console.log('--- WHATSAPP META CLOUD API TESTS ---');
    const initialMsgs = await listWhatsAppMessages();
    assert(Array.isArray(initialMsgs), 'listWhatsAppMessages returns array');

    // Test English quotation message
    const waMsgEn = await sendWhatsAppTemplateMessage({
      recipientPhone: '94470 12345', // Missing +91 country code, service should format
      recipientName: 'Ar. Ananya Nair',
      documentType: 'QUOTATION',
      documentId: 'QTN-2026-444',
      language: 'en',
      payload: { quoteNumber: 'QTN-2026-444', amount: '₹1,95,000' },
    });

    assert(waMsgEn.recipientPhone === '+919447012345', 'Formats 10-digit Kerala phone with +91 country code');
    assert(waMsgEn.templateName === 'exmark_quotation_estimate', 'Assigns official Meta quotation template');
    assert(waMsgEn.status === 'DELIVERED', 'Message status is DELIVERED');

    // Test Malayalam measurement confirmation message
    const waMsgMl = await sendWhatsAppTemplateMessage({
      recipientPhone: '+91 98470 99887',
      recipientName: 'M. K. Basheer',
      documentType: 'MEASUREMENT_CONFIRMATION',
      documentId: 'MSR-2026-001',
      language: 'ml',
      payload: { refNumber: 'MSR-2026-001' },
    });

    assert(waMsgMl.templateName === 'exmark_msr_confirm_ml', 'Assigns Malayalam measurement confirmation template');
    assert(waMsgMl.language === 'ml', 'Message language recorded as ml');

    // 2. Customer Confirmation Portal Workflow
    console.log('\n--- CUSTOMER MEASUREMENT CONFIRMATION TESTS ---');
    const measurements = await getAllMeasurements();
    const testMsr = measurements[0] || {
      id: 'msr-demo-1',
      refNumber: 'MSR-2026-001',
      customerName: 'Malabar Luxury Builders',
      siteName: 'Heritage Villa',
      district: 'Kozhikode',
    };

    const tokenRecord = await generateConfirmationToken(testMsr);
    assert(tokenRecord.confirmationToken.startsWith('tok_'), 'Generates secure customer confirmation token');
    assert(!!tokenRecord.expiresAt, 'Assigns 7-day expiration timestamp to token');

    // Test Customer Acceptance
    const acceptRes = await recordCustomerMeasurementDecision(
      testMsr.id,
      'ACCEPT',
      'Civil engineer verified all bathroom door handings.'
    );
    assert(acceptRes.success === true, 'Successfully records customer acceptance');
    assert(acceptRes.status === 'APPROVED', 'Transitions measurement status to APPROVED');

    // Test Request Correction
    const corrRes = await recordCustomerMeasurementDecision(
      testMsr.id,
      'CORRECTION_REQUESTED',
      'Please re-check Kitchen door height.'
    );
    assert(corrRes.status === 'DRAFT', 'Transitions measurement status to DRAFT for engineer review');

    // 3. Universal Business Reports Generator
    console.log('\n--- UNIVERSAL REPORTS ENGINE TESTS ---');
    assert(SYSTEM_REPORTS.length === 4, 'System defines 4 standard executive reports');

    // Test Sales by District
    const salesReport = await generateReport('SALES_BY_DISTRICT');
    assert(salesReport.rows.length > 0, 'Sales by District returns active Kerala districts');
    assert(!!salesReport.summaryMetrics.totalRevenue, 'Includes total revenue summary metric');

    // Test Production Efficiency
    const prodReport = await generateReport('PRODUCTION_EFFICIENCY');
    assert(prodReport.rows.length >= 3, 'Production efficiency covers all plant lines');
    assert(!!prodReport.summaryMetrics.overallQcPassRate, 'Computes overall factory QC pass rate');

    // Test Receivables Aging
    const agingReport = await generateReport('OUTSTANDING_RECEIVABLES_AGING');
    assert(Array.isArray(agingReport.rows), 'Aging report returns invoice rows');
    assert(!!agingReport.summaryMetrics.totalOutstanding, 'Computes total outstanding exposure');

    // Test FRP Margins
    const marginsReport = await generateReport('FRP_MODEL_MARGINS');
    assert(marginsReport.rows.some((r) => r.doorModel.toString().includes('Molded Teak')), 'Includes FRP Molded Teak model');
    assert(!!marginsReport.summaryMetrics.totalFRPRevenue, 'Includes gross FRP revenue metric');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
