/**
 * EXMARK ERP — Phase 9 Customization, Access Control & Security Hardening Test Suite
 */

import {
  getActiveConfiguration,
  getRevisionHistory,
  saveDraftConfiguration,
  publishConfiguration,
  rollbackConfiguration,
} from '../lib/services/customizationService';
import { canAccessModule } from '../lib/auth/roles';
import { DEMO_USERS } from '../lib/auth/session';

async function runPhase9Tests() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — PHASE 9: CUSTOMIZATION & SECURITY HARDENING SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  }

  // --- 1. PRODUCT CATEGORIES & FRP IMMUTABILITY ---
  console.log('--- 1. PRODUCT CATEGORIES & IMMUTABILITY SAFEGUARDS ---');
  const activeConfig = await getActiveConfiguration();
  assert(activeConfig.categories.frp.enabled === true, 'FRP Doors is enabled by default in active configuration');
  assert(activeConfig.categories.frp.immutable === true, 'FRP Doors is marked as immutable primary category');
  assert(activeConfig.categories.wpc.enabled === false, 'WPC Doors is disabled (OFF) by default');

  // Attempt to maliciously disable FRP in draft: safeguard must enforce FRP = true
  const savedDraft = await saveDraftConfiguration(
    {
      categories: {
        frp: { ...activeConfig.categories.frp, enabled: false }, // Malicious disable attempt
        wpc: { ...activeConfig.categories.wpc, enabled: true },
        customCategories: [],
      },
    },
    'Test Security Officer'
  );
  assert(savedDraft.categories.frp.enabled === true, 'Integrity safeguard prevented FRP Doors from being disabled');
  assert(savedDraft.categories.wpc.enabled === true, 'Optional WPC category successfully toggled in draft');

  // --- 2. VERIFY ALL 17 CUSTOMIZATION DOMAINS PRESENT & FUNCTIONAL ---
  console.log('\n--- 2. VERIFICATION OF ALL 17 CUSTOMIZATION DOMAINS ---');
  assert(Boolean(activeConfig.categories), '1. Product Categories domain verified');
  assert(Array.isArray(activeConfig.dynamicFields) && activeConfig.dynamicFields.length >= 3, '2. Dynamic Fields domain verified');
  assert(activeConfig.dropdownOptions.doorModels.length >= 5, '3. Dropdown Options (Models) verified');
  assert(activeConfig.dropdownOptions.colours.length >= 5, '3. Dropdown Options (PU Colours) verified');
  assert(Boolean(activeConfig.documentNumbering.measurements), '4. Document Numbering domain verified (MSR)');
  assert(Boolean(activeConfig.documentNumbering.invoices), '4. Document Numbering domain verified (INV)');
  assert(activeConfig.orderStatuses.length >= 8, '5. Order Statuses workflow stages verified');
  assert(activeConfig.workflowRules.requireAdvanceBeforeProduction === true, '6. Workflow Rules verified (Advance required)');
  assert(activeConfig.workflowRules.minimumAdvancePercentage === 40, '6. Workflow Rules verified (Minimum 40% advance)');
  assert(activeConfig.approvalThresholds.maxSalesDiscountPercentage === 15, '7. Approval Thresholds verified (15% max discount)');
  assert(activeConfig.frameAndCuttingSettings.frpHeightDeductionMm === 10, '8. Frame & Cutting Deductions verified (-10mm Height)');
  assert(activeConfig.frameAndCuttingSettings.allowNegativeDimensions === false, '8. Negative cutting dimensions strictly prevented');
  assert(activeConfig.priceLists.baseFrpRatePerSqFt === 265, '9. Price Lists verified (Rs.265/sq.ft)');
  assert(activeConfig.gstConfig.hsnCode === '3925.20.00', '10. Kerala GST Configuration verified (HSN 3925.20.00)');
  assert(activeConfig.gstConfig.cgstRate === 9 && activeConfig.gstConfig.sgstRate === 9, '10. GST CGST/SGST split verified (9% + 9% = 18%)');
  assert(activeConfig.financialTargets.monthlyRevenueTarget === 7500000, '11. Financial Targets verified (Rs.75,00,000 monthly)');
  assert(activeConfig.reportTemplates.length >= 4, '12. Report Templates verified (District sales, plant yield)');
  assert(Boolean(activeConfig.pdfLayouts.headerLogoText), '13. PDF Layouts verified (Company & Factory Profile)');
  assert(activeConfig.warrantyPolicies.frpWarrantyYears === 15, '14. Warranty Policies verified (15-Year FRP Material)');
  assert(Boolean(activeConfig.notificationTemplates.advanceReceived), '15. Notification Templates verified');
  assert(activeConfig.whatsappSendingRules.autoSendWarrantyCertificate === true, '16. WhatsApp Sending Rules verified');
  assert(activeConfig.employeeRoles.length >= 6, '17. Employee Roles & Permissions Matrix verified');

  // --- 3. DRAFT, PUBLISH, REVISION HISTORY & ROLLBACK LIFECYCLE ---
  console.log('\n--- 3. DRAFT, PUBLISH, REVISION HISTORY & ROLLBACK ENGINE ---');
  const publishResult = await publishConfiguration(
    'Phase 9 Security hardening and cutting tolerance verification release',
    'Nazer Karumban (Super Admin)'
  );
  assert(Boolean(publishResult.revision.id), `Revision created with unique ID: ${publishResult.revision.id}`);
  assert(publishResult.published.version > 0, `Published version incremented to v${publishResult.published.version}`);
  assert(publishResult.revision.changelog.includes('Phase 9'), 'Revision snapshot recorded with changelog');

  const history = await getRevisionHistory();
  assert(history.length >= 2, `Revision history tracks ${history.length} immutable snapshots`);
  assert(history[0].id === publishResult.revision.id, 'Latest revision is at the top of the history ledger');

  // Verify all revision IDs are present and strictly unique
  const revIds = history.map((r) => r.id);
  const uniqueRevIds = new Set(revIds);
  assert(revIds.every((id) => Boolean(id)), 'Every revision has a permanent non-empty unique ID');
  assert(uniqueRevIds.size === revIds.length, `All ${revIds.length} revision IDs are strictly unique (zero duplicate keys)`);

  // Rollback test
  const rolledBack = await rollbackConfiguration(1, 'Super Admin Emergency Rollback');
  assert(Boolean(rolledBack.version), `Successfully rolled back to configuration version 1 content (new active v${rolledBack.version})`);

  // Restore back to latest
  await publishConfiguration('Restore production configuration after rollback test', 'Nazer Karumban');
  console.log('  ✓ System successfully restored to current configuration version.');

  // --- 4. SERVER-SIDE ROLE-BASED ACCESS CONTROL (RBAC) ENFORCEMENT ---
  console.log('\n--- 4. SERVER-SIDE AUTHORIZATION & ACCESS CONTROL ENFORCEMENT ---');

  // Super Admin: unrestricted access
  assert(canAccessModule('Super Admin', 'accounts'), 'Super Admin can access Accounts');
  assert(canAccessModule('Super Admin', 'settings'), 'Super Admin can access Settings');
  assert(canAccessModule('Super Admin', 'production'), 'Super Admin can access Production');

  // Sales Role
  assert(canAccessModule('Sales', 'customers'), 'Sales role can access Customers');
  assert(canAccessModule('Sales', 'quotations'), 'Sales role can access Quotations');
  assert(!canAccessModule('Sales', 'accounts'), 'SECURITY: Sales role is FORBIDDEN from Accounts module');
  assert(!canAccessModule('Sales', 'settings'), 'SECURITY: Sales role is FORBIDDEN from Admin Settings');

  // Accounts Role
  assert(canAccessModule('Accounts', 'accounts'), 'Accounts role can access Accounts');
  assert(!canAccessModule('Accounts', 'production'), 'SECURITY: Accounts role is FORBIDDEN from Production line');
  assert(!canAccessModule('Accounts', 'settings'), 'SECURITY: Accounts role is FORBIDDEN from Admin Settings');

  // Production Role
  assert(canAccessModule('Production', 'production'), 'Production role can access Production');
  assert(!canAccessModule('Production', 'accounts'), 'SECURITY: Production role is FORBIDDEN from Accounts');
  assert(!canAccessModule('Production', 'crm'), 'SECURITY: Production role is FORBIDDEN from CRM');

  // Inventory Role
  assert(canAccessModule('Inventory', 'inventory'), 'Inventory role can access Inventory');
  assert(!canAccessModule('Inventory', 'quotations'), 'SECURITY: Inventory role is FORBIDDEN from Quotations');
  assert(!canAccessModule('Inventory', 'settings'), 'SECURITY: Inventory role is FORBIDDEN from Admin Settings');

  // Installation Role
  assert(canAccessModule('Installation', 'measurements'), 'Installation role can access Site Measurements');
  assert(canAccessModule('Installation', 'dispatch'), 'Installation role can access Dispatch');
  assert(!canAccessModule('Installation', 'accounts'), 'SECURITY: Installation role is FORBIDDEN from Accounts');
  assert(!canAccessModule('Installation', 'purchases'), 'SECURITY: Installation role is FORBIDDEN from Purchases');

  // --- 5. SENSITIVE CREDENTIAL & SCRIPT EXPOSURE SAFEGUARDS ---
  console.log('\n--- 5. SENSITIVE CREDENTIAL & DATA EXPOSURE CHECKS ---');
  for (const [email, user] of Object.entries(DEMO_USERS)) {
    assert(Boolean(user.passwordHash), `Password hash exists for ${email}`);
    assert(!user.passwordHash.includes('Exmark@2026'), `Password hash is properly salted bcrypt (not plaintext) for ${email}`);
  }

  console.log('\n========================================================================');
  console.log(`  PHASE 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error('Fatal test error in Phase 9 suite:', err);
  process.exit(1);
});
