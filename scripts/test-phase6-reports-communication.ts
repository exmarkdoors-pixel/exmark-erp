import {
  SYSTEM_REPORTS,
  generateReport,
  exportReportAsCsv,
  exportReportAsExcelXml,
  generateVideoReportSummary,
} from '../lib/services/reportService';

import {
  listWhatsAppMessages,
  sendWhatsAppTemplateMessage,
  generateConfirmationToken,
  recordCustomerMeasurementDecision,
} from '../lib/services/communicationService';

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

async function runPhase6Tests() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — Phase 6: Universal Reporting, Multimodal & WhatsApp Suite');
  console.log('========================================================================\n');

  try {
    // ── 1. SYSTEM REPORTS DEFINITIONS & GENERATION ────────────────────────────
    console.log('--- 1. UNIVERSAL REPORTING GENERATION ---');
    assert(Array.isArray(SYSTEM_REPORTS) && SYSTEM_REPORTS.length >= 4, 'System reports catalog has at least 4 core definitions');

    // Test Sales by District report
    const salesReport = await generateReport('SALES_BY_DISTRICT', { district: 'Kozhikode' });
    assert(salesReport.reportCode === 'SALES_BY_DISTRICT', 'Generates SALES_BY_DISTRICT report');
    assert(salesReport.rows.length > 0, 'Sales report contains data rows');
    assert(Boolean(salesReport.summaryMetrics.totalRevenue), 'Calculates total revenue summary metric');

    // Test Production Line Efficiency report
    const prodReport = await generateReport('PRODUCTION_EFFICIENCY');
    assert(prodReport.reportCode === 'PRODUCTION_EFFICIENCY', 'Generates PRODUCTION_EFFICIENCY report');
    assert(prodReport.rows.some((r) => String(r.lineAssigned).includes('300 Ton')), 'Includes FRP Hydraulic Press Line');
    assert(Boolean(prodReport.summaryMetrics.overallQcPassRate), 'Calculates overall QC pass rate');

    // Test Receivables Aging Analysis report
    const agingReport = await generateReport('OUTSTANDING_RECEIVABLES_AGING');
    assert(agingReport.reportCode === 'OUTSTANDING_RECEIVABLES_AGING', 'Generates OUTSTANDING_RECEIVABLES_AGING report');
    assert(Boolean(agingReport.summaryMetrics.totalOutstanding), 'Calculates total outstanding receivables');

    // Test FRP Model Margins report
    const marginsReport = await generateReport('FRP_MODEL_MARGINS');
    assert(marginsReport.reportCode === 'FRP_MODEL_MARGINS', 'Generates FRP_MODEL_MARGINS report');
    assert(marginsReport.rows.some((r) => String(r.doorModel).includes('32mm Molded Teak')), 'Includes 32mm Molded Teakwood model');

    // ── 2. MULTI-FORMAT EXPORT ENGINE (CSV & EXCEL) ───────────────────────────
    console.log('\n--- 2. MULTI-FORMAT EXPORT ENGINE ---');
    const csv = exportReportAsCsv(salesReport);
    assert(typeof csv === 'string' && csv.length > 50, 'Generates valid CSV string');
    assert(csv.includes('EXMARK DOORS'), 'CSV header includes EXMARK DOORS branding');
    assert(csv.includes('Summary Metrics'), 'CSV includes Summary Metrics section');
    assert(csv.includes('Kerala District'), 'CSV includes column headers');

    const excelXml = exportReportAsExcelXml(salesReport);
    assert(typeof excelXml === 'string' && excelXml.startsWith('<?xml'), 'Generates valid Excel XML spreadsheet');
    assert(excelXml.includes('<Workbook') && excelXml.includes('</Workbook>'), 'Contains valid Excel XML Workbook tags');
    assert(excelXml.includes('<Worksheet') && excelXml.includes('</Worksheet>'), 'Contains valid Worksheet tags');

    // ── 3. MULTIMODAL VIDEO REPORT SUMMARY ENGINE ─────────────────────────────
    console.log('\n--- 3. MULTIMODAL VIDEO REPORT SUMMARY ENGINE ---');
    const videoSummary = await generateVideoReportSummary('PRODUCTION_EFFICIENCY');
    assert(videoSummary.reportCode === 'PRODUCTION_EFFICIENCY', 'Generates video report for production efficiency');
    assert(videoSummary.format === 'MP4_SPEC_1080P', 'Video format adheres to 1080p MP4 specification');
    assert(videoSummary.scenes.length === 3, 'Generates exactly 3 sequential video scenes');
    assert(videoSummary.totalDurationSeconds === 45, 'Total duration equals 45 seconds (3 x 15s)');
    assert(Boolean(videoSummary.executiveVoiceoverText), 'Generates executive voiceover summary');

    // Verify bilingual narrator script
    const scene1 = videoSummary.scenes[0];
    assert(Boolean(scene1.narratorScript.english), 'Scene contains English narrator script');
    assert(Boolean(scene1.narratorScript.malayalam), 'Scene contains Malayalam narrator script');

    // ── 4. OFFICIAL WHATSAPP CLOUD API ADAPTER ────────────────────────────────
    console.log('\n--- 4. WHATSAPP BUSINESS PLATFORM CLOUD API ---');
    // Test 10-digit number E.164 formatting
    const waMsg1 = await sendWhatsAppTemplateMessage({
      recipientPhone: '98470 12345',
      recipientName: 'Ar. Fathima Rahman',
      documentType: 'QUOTATION',
      documentId: 'QTN-2026-999',
      language: 'en',
      payload: { quoteNumber: 'QTN-2026-999', amount: '₹1,45,000' },
    });

    assert(waMsg1.recipientPhone === '+919847012345', 'Formats 10-digit phone number with +91 country prefix');
    assert(waMsg1.templateName === 'exmark_quotation_estimate', 'Assigns official Meta quotation template');
    assert(waMsg1.status === 'DELIVERED', 'Message status marked DELIVERED');

    // Test Malayalam template mapping
    const waMsgMl = await sendWhatsAppTemplateMessage({
      recipientPhone: '+91 94471 22334',
      recipientName: 'K. Balachandran',
      documentType: 'MEASUREMENT_CONFIRMATION',
      documentId: 'MSR-2026-888',
      language: 'ml',
      payload: { refNumber: 'MSR-2026-888', siteName: 'Palm Meadows' },
    });

    assert(waMsgMl.templateName === 'exmark_msr_confirm_ml', 'Assigns official Meta Malayalam confirmation template');
    assert(waMsgMl.language === 'ml', 'Message language recorded as Malayalam');

    // Test Invoice & Warranty templates
    const waInv = await sendWhatsAppTemplateMessage({
      recipientPhone: '98460 33445',
      recipientName: 'Skyline Projects',
      documentType: 'INVOICE',
      documentId: 'INV-2026-777',
      payload: { invoiceNumber: 'INV-2026-777', totalAmount: '₹2,36,000' },
    });
    assert(waInv.templateName === 'exmark_gst_invoice', 'Assigns exmark_gst_invoice template');

    const waWar = await sendWhatsAppTemplateMessage({
      recipientPhone: '98460 33445',
      recipientName: 'Skyline Projects',
      documentType: 'WARRANTY_CERT',
      documentId: 'EXM-WRN-2026-0001',
      payload: { certNumber: 'EXM-WRN-2026-0001', years: 15 },
    });
    assert(waWar.templateName === 'exmark_frp_warranty_certificate', 'Assigns exmark_frp_warranty_certificate template');

    // ── 5. CUSTOMER MEASUREMENT TOKEN & VERIFICATION ──────────────────────────
    console.log('\n--- 5. MEASUREMENT CONFIRMATION TOKEN & DECISION ---');
    const allMsr = await getAllMeasurements();
    const testMsr = allMsr[0];

    const tokenRecord = await generateConfirmationToken(testMsr);

    assert(Boolean(tokenRecord.confirmationToken), 'Confirmation token generated');
    assert(tokenRecord.confirmationToken.startsWith('tok_'), 'Token starts with tok_ prefix');
    assert(Boolean(tokenRecord.expiresAt), 'Token has 7-day expiration timestamp');

    // Decision recording
    const decision = await recordCustomerMeasurementDecision(
      testMsr.id,
      'ACCEPT',
      'Measurements verified against architectural civil drawings'
    );
    assert(decision.success === true, 'Customer decision successfully recorded');
    assert(decision.status === 'APPROVED', 'Measurement status updated to APPROVED upon customer acceptance');

    console.log('\n========================================================================');
    console.log(`  Phase 6 Suite Results: ${passed} PASSED / ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPhase6Tests();
