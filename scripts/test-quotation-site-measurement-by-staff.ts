/**
 * Automated Test Suite: Site Measurements as Another Category by Staff Name & Android Cleartext Permitted
 */

import fs from 'fs';
import path from 'path';
import {
  getAllMeasurements,
  getMeasurementsByStaff,
} from '../lib/services/measurementService';
import {
  createQuotation,
} from '../lib/services/quotationService';

async function runTests() {
  console.log('\n========================================================================');
  console.log('  TEST SUITE: SITE MEASUREMENT BY STAFF & ANDROID CLEARTEXT ENGINE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc: string, cond: boolean) {
    total++;
    if (cond) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Retrieve all measurements with staff attribution
  console.log('--- Suite 1: Site Measurement Retrieval & Staff Attribution ---');
  const allMeasurements = await getAllMeasurements();
  assert('Site measurements exist and are populated', allMeasurements.length > 0);

  const m1 = allMeasurements[0];
  assert('Measurement has refNumber', Boolean(m1.refNumber));
  assert('Measurement has engineerName (Staff attribution)', Boolean(m1.engineerName));
  assert('Measurement has door opening items', Array.isArray(m1.doors) && m1.doors.length > 0);

  // TEST 2: Filter measurements by Staff Name
  console.log('\n--- Suite 2: Filter by Staff Name ---');
  const anoopMeasurements = await getMeasurementsByStaff('Anoop');
  assert('Filtered measurements by "Anoop" return records', anoopMeasurements.length > 0);
  assert(
    'All returned records match Anoop',
    anoopMeasurements.every((m) => m.engineerName?.toLowerCase().includes('anoop'))
  );

  const allFiltered = await getMeasurementsByStaff('ALL');
  assert('Passing "ALL" returns all measurements', allFiltered.length === allMeasurements.length);

  // TEST 3: Convert Site Measurement to Quotation with Category Tag
  console.log('\n--- Suite 3: Quotation Category & Staff Linking ---');
  const createdQuote = await createQuotation({
    customerId: m1.customerId || 'cust-test',
    customerName: m1.customerName || 'Test Customer',
    location: `${m1.siteName}, ${m1.district}`,
    date: '2026-11-15',
    validUntil: '2026-12-15',
    quotationCategory: 'SITE_MEASUREMENT',
    siteMeasurementId: m1.id,
    siteMeasurementRef: m1.refNumber,
    measuringStaffName: m1.engineerName || 'Anoop Krishnan',
    salespersonId: 'EMP-01',
    salespersonName: m1.engineerName || 'Anoop Krishnan',
    salespersonCode: 'ENG-01',
    items: (m1.doors || []).map((d) => ({
      doorCategory: 'FRP_DOORS',
      doorModel: d.model,
      heightMm: 2100,
      widthMm: 900,
      thicknessMm: 32,
      quantity: d.quantity || 1,
      unitPrice: d.unitPrice || 7500,
      gstRate: 0,
      totalPrice: (d.unitPrice || 7500) * (d.quantity || 1),
    })),
  });

  assert('Quotation created with quoteNumber', Boolean(createdQuote.quoteNumber));
  assert('Quotation category is SITE_MEASUREMENT', createdQuote.quotationCategory === 'SITE_MEASUREMENT');
  assert('Quotation has siteMeasurementRef', createdQuote.siteMeasurementRef === m1.refNumber);
  assert('Quotation has measuringStaffName', Boolean(createdQuote.measuringStaffName));
  assert('Quotation has salespersonName matching measuring staff', createdQuote.salespersonName === createdQuote.measuringStaffName);

  // TEST 4: Android Cleartext Traffic & Fallback Gateway Verification
  console.log('\n--- Suite 4: Android Cleartext & Fallback Gateway Files ---');
  const manifestPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  assert('AndroidManifest.xml contains usesCleartextTraffic="true"', manifestContent.includes('android:usesCleartextTraffic="true"'));
  assert('AndroidManifest.xml references networkSecurityConfig', manifestContent.includes('@xml/network_security_config'));

  const netSecPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');
  assert('network_security_config.xml exists', fs.existsSync(netSecPath));

  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  assert('public/index.html (Mobile Gateway fallback) exists', fs.existsSync(indexPath));
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert('public/index.html contains EXMARK ERP gateway shell', indexContent.includes('EXMARK ERP'));
  assert('public/index.html includes autoScanSubnet function', indexContent.includes('autoScanSubnet'));

  const capConfigPath = path.join(process.cwd(), 'capacitor.config.ts');
  const capContent = fs.readFileSync(capConfigPath, 'utf8');
  assert('capacitor.config.ts has cleartext: true', capContent.includes('cleartext: true'));
  assert('capacitor.config.ts has errorPath: "index.html"', capContent.includes("errorPath: 'index.html'"));

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
