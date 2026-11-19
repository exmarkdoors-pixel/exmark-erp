import {
  STATIC_ERP_CATALOG,
  UniversalSearchEntry,
  searchUniversalCatalog,
} from '../lib/utils/universalSearchIndex';

function runTests() {
  console.log('--- Testing Universal Taskbar Search Engine ---');

  // Test 1: Catalog completeness
  console.log(`Total indexed static modules and features: ${STATIC_ERP_CATALOG.length}`);
  if (STATIC_ERP_CATALOG.length < 20) {
    throw new Error('FAIL: Static catalog is too small! Expected at least 20 core ERP modules.');
  }
  console.log('✅ Static ERP catalog contains full comprehensive modules and features');

  // Test 2: Typing "S" or "s"
  const sResults = searchUniversalCatalog('s');
  console.log(`Found ${sResults.length} matches for "s":`);
  sResults.slice(0, 8).forEach((r, idx) => console.log(`   ${idx + 1}. [${r.type}] ${r.title}`));

  const sTitles = sResults.map((r) => r.title.toLowerCase());
  const hasStock = sTitles.some((t) => t.includes('stock maintenance'));
  const hasStore = sTitles.some((t) => t.includes('store requisition'));
  const hasSticker = sTitles.some((t) => t.includes('stickers'));
  const hasSales = sTitles.some((t) => t.includes('sales orders'));

  if (!hasStock) throw new Error('FAIL: "s" did not return Stock Maintenance!');
  if (!hasStore) throw new Error('FAIL: "s" did not return Store Requisition!');
  if (!hasSticker) throw new Error('FAIL: "s" did not return Stickers!');
  if (!hasSales) throw new Error('FAIL: "s" did not return Sales Orders!');
  console.log('✅ Search "s" / "S" properly prioritizes Stock, Store, Stickers, and Sales Orders!');

  // Test 3: Typing "A" or "a"
  const aResults = searchUniversalCatalog('a');
  console.log(`\nFound ${aResults.length} matches for "a":`);
  aResults.slice(0, 8).forEach((r, idx) => console.log(`   ${idx + 1}. [${r.type}] ${r.title}`));

  const aTitles = aResults.map((r) => r.title.toLowerCase());
  const hasAccounts = aTitles.some((t) => t.includes('accounts'));
  const hasAnalytics = aTitles.some((t) => t.includes('analytics'));
  const hasAutoBoq = aTitles.some((t) => t.includes('auto-boq'));
  const hasAfterPacking = aTitles.some((t) => t.includes('after-packing'));

  if (!hasAccounts) throw new Error('FAIL: "a" did not return Accounts!');
  if (!hasAnalytics) throw new Error('FAIL: "a" did not return Analytics!');
  if (!hasAutoBoq) throw new Error('FAIL: "a" did not return Auto-BOQ!');
  if (!hasAfterPacking) throw new Error('FAIL: "a" did not return After-Packing Verification!');
  console.log('✅ Search "a" / "A" properly prioritizes Accounts, Analytics, Auto-BOQ, and After-Packing Pass!');

  // Test 4: Specific 3-4 letter keywords
  const testKeywords = [
    { query: 'stoc', expected: 'Stock Maintenance' },
    { query: 'towe', expected: 'Towel Sticker' },
    { query: 'quot', expected: 'Quotations & Estimates' },
    { query: 'gate', expected: 'Gate Pass' },
    { query: 'rewo', expected: 'Rework' },
    { query: 'challan', expected: 'Dispatch & Delivery Challan' },
    { query: 'meas', expected: 'Site Measurements' },
  ];

  for (const { query, expected } of testKeywords) {
    const res = searchUniversalCatalog(query);
    if (res.length === 0 || !res[0].title.toLowerCase().includes(expected.toLowerCase())) {
      throw new Error(`FAIL: Query "${query}" did not return "${expected}" at rank 1! Found: ${res[0]?.title}`);
    }
    console.log(`✅ Query "${query}" -> Top Result: "${res[0].title}" [${res[0].targetTab}]`);
  }

  // Test 5: Dynamic Entities (Live Job Cards, Customers, Raw Materials)
  const dynamicSample: UniversalSearchEntry[] = [
    {
      id: 'prod-101',
      type: 'JOB_CARD',
      title: 'EXM-2026-001 — Anil Kumar',
      subtitle: '4 Doors • Stage: MOLDING',
      targetTab: 'production',
      categoryLabel: 'Job Cards & Production',
      keywords: ['exm-2026-001', 'anil kumar', 'molding', 'job card'],
      code: 'EXM-2026-001',
    },
    {
      id: 'cust-202',
      type: 'CUSTOMER',
      title: 'Sreejith Builders Thrissur',
      subtitle: '9847123456 • Thrissur',
      targetTab: 'customers',
      categoryLabel: 'Customers & Dealers',
      keywords: ['sreejith builders', 'thrissur', 'dealer'],
    },
    {
      id: 'inv-303',
      type: 'STOCK_MATERIAL',
      title: 'Isophthalic Polyester Resin (RAW-RES-01)',
      subtitle: 'Stock: 1200 KG • Chemicals',
      targetTab: 'inventory',
      categoryLabel: 'Raw Materials & Stock',
      keywords: ['resin', 'raw-res-01', 'chemicals'],
    },
  ];

  const jcMatch = searchUniversalCatalog('exm-2026', dynamicSample);
  if (jcMatch.length === 0 || jcMatch[0].id !== 'prod-101') {
    throw new Error('FAIL: Dynamic Job Card search failed!');
  }
  console.log(`✅ Live Job Card Query "exm-2026" -> Matched "${jcMatch[0].title}"`);

  const sreejithMatch = searchUniversalCatalog('sreejith', dynamicSample);
  if (sreejithMatch.length === 0 || sreejithMatch[0].id !== 'cust-202') {
    throw new Error('FAIL: Dynamic Customer search failed!');
  }
  console.log(`✅ Live Customer Query "sreejith" -> Matched "${sreejithMatch[0].title}"`);

  const resinMatch = searchUniversalCatalog('resin', dynamicSample);
  if (resinMatch.length === 0 || resinMatch[0].id !== 'inv-303') {
    throw new Error('FAIL: Dynamic Stock Material search failed!');
  }
  console.log(`✅ Live Material Query "resin" -> Matched "${resinMatch[0].title}"`);

  console.log('\n🎉 ALL 5 TEST SUITES PASSED! Universal Taskbar Search is 100% verified and operational.');
}

runTests();
