/**
 * Verification Script: Corporate ERP Domain Categories and Sub-Categories
 * Validates:
 * 1. 7 Primary Enterprise Domains schema & completeness
 * 2. 35+ Sub-categories with bilingual metadata (English & Malayalam)
 * 3. Tab ID to Domain mapping resolution
 * 4. Deep-linking breadcrumb resolution
 */

import {
  CORPORATE_ERP_DOMAINS,
  getAllCorporateSubCategories,
  getCategoryByTabId,
  getCorporateBreadcrumb,
  CorporateDomainId,
} from '../types/corporateNavigation';

function runVerification() {
  console.log('=== STARTING CORPORATE ERP CATEGORIES VERIFICATION ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  // 1. Verify 7 Enterprise Domains
  assert(
    CORPORATE_ERP_DOMAINS.length === 7,
    `Expected exactly 7 primary enterprise domains, found: ${CORPORATE_ERP_DOMAINS.length}`
  );

  const expectedDomainIds: CorporateDomainId[] = [
    'sales',
    'purchases',
    'manufacturing',
    'accounting',
    'stock',
    'logistics',
    'settings',
  ];

  const actualDomainIds = CORPORATE_ERP_DOMAINS.map((d) => d.id);
  assert(
    expectedDomainIds.every((id) => actualDomainIds.includes(id)),
    `All 7 expected domain IDs exist: ${expectedDomainIds.join(', ')}`
  );

  // 2. Verify Domain Properties & Malayalam Labels
  CORPORATE_ERP_DOMAINS.forEach((domain) => {
    assert(
      Boolean(domain.label && domain.labelMl && domain.code && domain.icon && domain.subCategories?.length),
      `Domain [${domain.code}] "${domain.label}" (${domain.labelMl}) has valid metadata and ${domain.subCategories.length} sub-categories`
    );
  });

  // 3. Verify Sub-Categories Completeness (35+ Sub-categories)
  const allSubs = getAllCorporateSubCategories();
  assert(
    allSubs.length >= 35,
    `Total sub-categories count is ${allSubs.length} (>= 35 required)`
  );

  allSubs.forEach((sub) => {
    assert(
      Boolean(sub.id && sub.label && sub.labelMl && sub.tabId && sub.icon && sub.badge),
      `Sub-category [${sub.id}] "${sub.label}" (${sub.labelMl}) [Badge: ${sub.badge}] [Tab: ${sub.tabId}] is valid`
    );
  });

  // 4. Verify Domain Resolution by Tab ID
  const salesDomain = getCategoryByTabId('quotations');
  assert(salesDomain?.id === 'sales', `Tab 'quotations' maps to domain 'sales'`);

  const purchasesDomain = getCategoryByTabId('purchases');
  assert(purchasesDomain?.id === 'purchases', `Tab 'purchases' maps to domain 'purchases'`);

  const prodDomain = getCategoryByTabId('production');
  assert(prodDomain?.id === 'manufacturing', `Tab 'production' maps to domain 'manufacturing'`);

  const batchPrintDomain = getCategoryByTabId('batch-print');
  assert(batchPrintDomain?.id === 'manufacturing', `Tab 'batch-print' maps to domain 'manufacturing'`);

  const accDomain = getCategoryByTabId('accounts');
  assert(accDomain?.id === 'accounting', `Tab 'accounts' maps to domain 'accounting'`);

  const stockDomain = getCategoryByTabId('inventory');
  assert(stockDomain?.id === 'stock', `Tab 'inventory' maps to domain 'stock'`);

  const logisticsDomain = getCategoryByTabId('dispatch');
  assert(logisticsDomain?.id === 'logistics', `Tab 'dispatch' maps to domain 'logistics'`);

  const settingsDomain = getCategoryByTabId('settings');
  assert(settingsDomain?.id === 'settings', `Tab 'settings' maps to domain 'settings'`);

  // 5. Verify Deep-Linking Breadcrumb Resolution
  const readyStockBreadcrumb = getCorporateBreadcrumb('inventory', 'READY_STOCK');
  assert(
    readyStockBreadcrumb.category?.id === 'stock' &&
      readyStockBreadcrumb.subCategory?.id === 'ready-stock-doors',
    `Deep link ('inventory', 'READY_STOCK') resolves to domain '${readyStockBreadcrumb.category?.label}' -> '${readyStockBreadcrumb.subCategory?.label}'`
  );

  const cashBankBreadcrumb = getCorporateBreadcrumb('accounts', 'CASH_BANK');
  assert(
    cashBankBreadcrumb.category?.id === 'accounting' &&
      cashBankBreadcrumb.subCategory?.id === 'cash-bank-book',
    `Deep link ('accounts', 'CASH_BANK') resolves to domain '${cashBankBreadcrumb.category?.label}' -> '${cashBankBreadcrumb.subCategory?.label}'`
  );

  const partyToPartyBreadcrumb = getCorporateBreadcrumb('accounts', 'PARTY_TO_PARTY');
  assert(
    partyToPartyBreadcrumb.category?.id === 'accounting' &&
      partyToPartyBreadcrumb.subCategory?.id === 'party-to-party',
    `Deep link ('accounts', 'PARTY_TO_PARTY') resolves to domain '${partyToPartyBreadcrumb.category?.label}' -> '${partyToPartyBreadcrumb.subCategory?.label}'`
  );

  const staffAccessBreadcrumb = getCorporateBreadcrumb('settings', 'staff_access');
  assert(
    staffAccessBreadcrumb.category?.id === 'settings' &&
      staffAccessBreadcrumb.subCategory?.id === 'rbac-staff-security',
    `Deep link ('settings', 'staff_access') resolves to domain '${staffAccessBreadcrumb.category?.label}' -> '${staffAccessBreadcrumb.subCategory?.label}'`
  );

  console.log(`\n=== VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);

  if (passedTests === totalTests) {
    console.log('ALL CORPORATE ERP DOMAIN & SUB-CATEGORY CHECKS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('SOME CHECKS FAILED!');
    process.exit(1);
  }
}

runVerification();
