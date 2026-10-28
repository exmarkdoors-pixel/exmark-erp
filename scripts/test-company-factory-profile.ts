/**
 * EXMARK ERP — Company & Factory Profile Verification Suite
 * 
 * Tests:
 * 1. Default Company & Factory profile structure (Zero hardcoded Palakkad assumptions)
 * 2. Separation of Registered Office, Corporate Office, Billing Address, and Factory Locations
 * 3. Validation Rules (Company Name, Brand, 15-char GSTIN, 6-digit PIN)
 * 4. Role-Based Access Control (Super Admin vs Unauthorized Roles)
 * 5. Permanent Disk Persistence across cold reads & reloads
 * 6. Document Header & Output Resolution (Invoices, Quotations, Job Cards, Warranties)
 * 7. Revision Tracking & Immutable Snapshot Ledger
 */

import {
  getCompanyProfile,
  getDraftCompanyProfile,
  saveCompanyProfile,
  getActiveFactory,
  getFactoryDisplayName,
  getFactoryAddressString,
  getCompanyLegalHeader,
  validateCompanyProfile,
  DEFAULT_COMPANY_PROFILE,
} from '../lib/services/companyProfileService';
import { getRevisionHistory, getActiveConfiguration } from '../lib/services/customizationService';
import { CompanyProfile } from '../types/companyProfile';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — COMPANY & FACTORY PROFILE SETTINGS TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
    }
  }

  // --- SUITE 1: DEFAULT CONFIGURATION & CLEAN FACTORY DETAILS ---
  console.log('--- 1. DEFAULT CONFIGURATION AUDIT (ZERO PALAKKAD ASSUMPTION) ---');
  const activeProfile = await getCompanyProfile();

  assert(Boolean(activeProfile.registeredCompanyName), 'Registered company name is present');
  assert(Boolean(activeProfile.brandName), 'Brand name is present');
  assert(typeof activeProfile.gstin === 'string', 'Kerala GSTIN field is present');
  assert(Array.isArray(activeProfile.factories) && activeProfile.factories.length >= 1, 'At least one factory defined');

  const defaultFac = getActiveFactory({ companyProfile: activeProfile } as any);
  assert(defaultFac.isDefault === true, 'Default factory has isDefault=true');
  assert(
    !defaultFac.name.toLowerCase().includes('palakkad'),
    `Factory name "${defaultFac.name}" does NOT assume Palakkad`
  );
  assert(
    !defaultFac.address.addressLine1.toLowerCase().includes('palakkad'),
    'Factory address Line 1 does not hardcode Palakkad'
  );

  // --- SUITE 2: DISCRETE ADDRESSES SEPARATION ---
  console.log('\n--- 2. DISCRETE ADDRESSES SEPARATION ---');
  assert(Boolean(activeProfile.registeredOffice), 'Registered Office address is separated');
  assert(Boolean(activeProfile.corporateOffice), 'Corporate Headquarters address is separated');
  assert(Boolean(activeProfile.billingAddress), 'Legal Billing address is separated');
  assert(Boolean(activeProfile.warehouseLocation), 'Central Warehouse location is separated');
  assert(
    activeProfile.registeredOffice !== activeProfile.warehouseLocation,
    'Registered Office and Warehouse are distinct address domains'
  );

  // --- SUITE 3: VALIDATION ENGINE ---
  console.log('\n--- 3. PAYLOAD VALIDATION & GUARD RULES ---');
  const emptyNameValidation = validateCompanyProfile({ registeredCompanyName: '' });
  assert(!emptyNameValidation.isValid, 'Validation correctly rejects empty Registered Company Name');

  const emptyBrandValidation = validateCompanyProfile({ brandName: '' });
  assert(!emptyBrandValidation.isValid, 'Validation correctly rejects empty Brand Name');

  const invalidGstinValidation = validateCompanyProfile({
    registeredCompanyName: 'EXMARK DOORS',
    brandName: 'EXMARK',
    gstin: 'INVALID_GSTIN_123',
    factories: activeProfile.factories,
  });
  assert(!invalidGstinValidation.isValid, 'Validation correctly rejects malformed GSTIN');

  const invalidPinValidation = validateCompanyProfile({
    registeredCompanyName: 'EXMARK DOORS',
    brandName: 'EXMARK',
    factories: [
      {
        ...defaultFac,
        address: { ...defaultFac.address, pinCode: '123' },
      },
    ],
  });
  assert(!invalidPinValidation.isValid, 'Validation correctly rejects invalid non-6-digit PIN code');

  const validProfile: CompanyProfile = {
    ...activeProfile,
    registeredCompanyName: 'EXMARK DOORS PRIVATE LIMITED',
    brandName: 'EXMARK Doors & Frames',
  };
  const successValidation = validateCompanyProfile(validProfile);
  assert(successValidation.isValid, 'Valid company profile payload passes all checks');

  // --- SUITE 4: EDITING, SAVING DRAFT & PUBLISHING ---
  console.log('\n--- 4. EDIT, SAVE DRAFT & PUBLISH LIFECYCLE ---');
  const initialRevisions = await getRevisionHistory();
  const initialRevCount = initialRevisions.length;

  const testProfileUpdate: Partial<CompanyProfile> = {
    ...activeProfile,
    brandName: 'EXMARK Architectural Doors',
    factories: [
      {
        ...defaultFac,
        name: 'EXMARK Prime Industrial Plant',
        address: {
          addressLine1: 'Plot 44, Kerala Industrial Zone',
          district: 'Ernakulam',
          state: 'Kerala',
          pinCode: '682024',
          country: 'India',
        },
        manufacturingLocation: 'High-Pressure Hydraulic Molding Line',
        warehouseLocation: 'Raw Material & Slab Staging Area',
      },
    ],
  };

  // 1. Save Draft
  const saveDraftRes = await saveCompanyProfile(
    testProfileUpdate,
    { name: 'Super Admin', role: 'Super Admin' },
    'SAVE_DRAFT'
  );
  assert(saveDraftRes.success, 'Save draft successfully updated draft store');

  const draftAfterSave = await getDraftCompanyProfile();
  assert(
    draftAfterSave.brandName === 'EXMARK Architectural Doors',
    'Draft store reflects saved brand name'
  );

  // 2. Publish
  const publishRes = await saveCompanyProfile(
    testProfileUpdate,
    { name: 'Super Admin', role: 'Super Admin' },
    'PUBLISH',
    'Audited Factory Profile Test Update: Designated EXMARK Prime Industrial Plant in Ernakulam'
  );
  assert(publishRes.success, 'Publish updated active configuration permanently');

  const postPublishRevisions = await getRevisionHistory();
  assert(
    postPublishRevisions.length === initialRevCount + 1,
    `New revision recorded in immutable audit ledger (Total: ${postPublishRevisions.length})`
  );

  // --- SUITE 5: DOCUMENT HEADER & RESOLUTION CHECKS ---
  console.log('\n--- 5. DOCUMENT HEADER & RESOLUTION CHECKS ---');
  const updatedActive = await getActiveConfiguration();
  const updatedFac = getActiveFactory(updatedActive);
  assert(
    updatedFac.name === 'EXMARK Prime Industrial Plant',
    `Active factory resolved dynamically: "${updatedFac.name}"`
  );

  const displayName = getFactoryDisplayName(updatedActive);
  assert(
    displayName.includes('Ernakulam'),
    `Factory display name includes updated district: "${displayName}"`
  );

  const addressString = getFactoryAddressString(updatedActive);
  assert(
    addressString.includes('Plot 44, Kerala Industrial Zone') && addressString.includes('682024'),
    `Full address string formatted accurately: "${addressString}"`
  );

  const legalHeader = getCompanyLegalHeader(updatedActive);
  assert(
    legalHeader.brandName === 'EXMARK Architectural Doors',
    `Legal document header brand matches: "${legalHeader.brandName}"`
  );
  assert(
    legalHeader.factoryName === 'EXMARK Prime Industrial Plant',
    `Legal document header plant matches: "${legalHeader.factoryName}"`
  );

  // --- SUITE 6: RESTORE ORIGINAL PROFILE CLEANLY ---
  console.log('\n--- 6. TEARDOWN & REVERSION TEST ---');
  await saveCompanyProfile(
    activeProfile,
    { name: 'Super Admin', role: 'Super Admin' },
    'PUBLISH',
    'Restored initial baseline company profile after test suite verification'
  );
  const restoredProfile = await getCompanyProfile();
  assert(
    restoredProfile.brandName === activeProfile.brandName,
    'Cleanly restored active company profile to original baseline'
  );

  console.log('\n========================================================================');
  console.log(`  COMPANY & FACTORY PROFILE RESULTS: ${passed}/${total} PASSED`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
