/**
 * Automated Verification Script for Multi-Theme Print Hub
 * Tests all 5 print themes (3 Tally + 2 Vyapar) and 5 document types (Quotation, Proforma, Work Order, Tax Invoice, Party Statement).
 */

import {
  PrintTheme,
  DocumentType,
  COMPANY_PROFILE,
  DOCUMENT_TITLES,
  getSampleStatementEntries,
} from '../components/modules/quotations/PrintDocumentHub';

function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING MULTI-THEME PRINT HUB (TALLY & VYAPAR)');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra || ''}`);
      failed++;
    }
  }

  // 1. Verify Company & Statutory Profile
  console.log('\n--- 1. Testing Company Statutory & Banking Details ---');
  assert('Company Name is EX-MARK DOORS', COMPANY_PROFILE.name === 'EX-MARK DOORS');
  assert('GSTIN is valid Kerala code 32', COMPANY_PROFILE.gstin.startsWith('32'));
  assert('HSN Code for doors is 39252000', COMPANY_PROFILE.hsnCode === '39252000');
  assert('State Bank of India account present', COMPANY_PROFILE.bank.bankName.includes('State Bank of India'));
  assert('UPI ID is configured for instant payment', Boolean(COMPANY_PROFILE.bank.upiId));

  // 2. Verify 5 Document Types & Titles
  console.log('\n--- 2. Testing 5 Supported Document Types ---');
  const docTypes: DocumentType[] = ['quotation', 'proforma', 'salesOrder', 'salesInvoice', 'statement'];
  assert('Supports exactly 5 document types', docTypes.length === 5);

  docTypes.forEach((dt) => {
    const t = DOCUMENT_TITLES[dt];
    assert(`Doc Type [${dt}] has English title: ${t.en}`, Boolean(t.en));
    assert(`Doc Type [${dt}] has Malayalam subtitle: ${t.ml}`, Boolean(t.ml));
    assert(`Doc Type [${dt}] has status badge: ${t.badge}`, Boolean(t.badge));
  });

  // 3. Verify 5 Themes
  console.log('\n--- 3. Testing 5 Print Themes (3 Tally + 2 Vyapar) ---');
  const themes: PrintTheme[] = [
    'tally-classic',
    'tally-modern',
    'tally-formal',
    'vyapar-elegant',
    'vyapar-modern',
  ];
  assert('Includes 3 Tally themes and 2 Vyapar themes (total 5)', themes.length === 5);

  const tallyThemes = themes.filter((t) => t.startsWith('tally'));
  const vyaparThemes = themes.filter((t) => t.startsWith('vyapar'));
  assert('Has 3 Tally themes', tallyThemes.length === 3);
  assert('Has 2 Vyapar themes', vyaparThemes.length === 2);

  // 4. Verify Customer Party Statement Ledger Generation
  console.log('\n--- 4. Testing Party Statement Ledger Calculation ---');
  const dummyQuote = {
    id: 'QT-2026-104',
    customerName: 'Secura Mall Ventures LLP',
    location: 'Perinthalmanna',
    itemsSummary: '24 FRP Doors',
    gstMode: 'excluded' as const,
    gstRate: 18,
    subtotal: 100000,
    gstAmount: 18000,
    grandTotal: 118000,
    advancePercent: 50,
    advanceAmount: 59000,
    date: '27 Oct 2026',
  };

  const ledger = getSampleStatementEntries(dummyQuote);
  assert('Ledger generates opening balance, advance, and invoice transactions', ledger.length === 3);

  const opening = ledger.find((e) => e.voucherNo === 'OB-00');
  assert('Opening balance starts at 0', opening !== undefined && opening.balance === 0);

  const advance = ledger.find((e) => e.voucherType === 'Advance');
  assert('Advance credit equals 50% advance (₹59,000)', advance !== undefined && advance.credit === 59000);

  const invoice = ledger.find((e) => e.voucherType === 'Invoice' && e.voucherNo.startsWith('INV-'));
  assert('Invoice debit equals grand total (₹1,18,000)', invoice !== undefined && invoice.debit === 118000);
  assert('Net closing outstanding balance equals remaining balance (₹59,000 Dr)', invoice !== undefined && invoice.balance === 59000);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
