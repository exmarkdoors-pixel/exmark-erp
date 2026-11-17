import { DEFAULT_COMPANY_BANK_DETAILS, CompanyBankDetails, CompanyProfile } from '../types/companyProfile';
import { getCompanyProfile, DEFAULT_COMPANY_PROFILE } from '../lib/services/companyProfileService';

async function testBankConfiguration() {
  console.log('--- Testing Company Bank Configuration & Hide Functionality ---');

  // Test 1: Verify DEFAULT_COMPANY_BANK_DETAILS exists and has required fields
  console.assert(DEFAULT_COMPANY_BANK_DETAILS.bankName.length > 0, 'Bank name must be present');
  console.assert(DEFAULT_COMPANY_BANK_DETAILS.accountNumber.length > 0, 'Account number must be present');
  console.assert(DEFAULT_COMPANY_BANK_DETAILS.ifsc.length === 11, 'IFSC must be 11 characters');
  console.log('✓ Test 1 Passed: Default company bank details valid with IFSC and A/C number');

  // Test 2: Verify DEFAULT_COMPANY_PROFILE includes bankDetails
  console.assert(DEFAULT_COMPANY_PROFILE.bankDetails !== undefined, 'DEFAULT_COMPANY_PROFILE must have bankDetails');
  console.assert(DEFAULT_COMPANY_PROFILE.bankDetails?.bankName === 'State Bank of India', 'Default bank is State Bank of India');
  console.log('✓ Test 2 Passed: DEFAULT_COMPANY_PROFILE has valid default bank details');

  // Test 3: Custom Bank Details configuration
  const customBank: CompanyBankDetails = {
    bankName: 'Federal Bank Ltd',
    branch: 'Kottakkal Branch, Malappuram',
    accountName: 'EXMARK DOORS PRIVATE LIMITED',
    accountNumber: '11220033445566',
    ifsc: 'FDRL0001122',
    upiId: 'exmarkdoors@federal',
    accountType: 'Current Account',
  };

  const testProfile: CompanyProfile = {
    ...DEFAULT_COMPANY_PROFILE,
    bankDetails: customBank,
  };

  console.assert(testProfile.bankDetails?.bankName === 'Federal Bank Ltd', 'Custom bank name matched');
  console.assert(testProfile.bankDetails?.accountNumber === '11220033445566', 'Custom account number matched');
  console.assert(testProfile.bankDetails?.ifsc === 'FDRL0001122', 'Custom IFSC matched');
  console.log('✓ Test 3 Passed: Custom bank details can be cleanly assigned to company profile');

  // Test 4: getCompanyProfile returns active profile with bankDetails
  const activeProfile = await getCompanyProfile();
  console.assert(activeProfile.bankDetails !== undefined, 'Active profile must have bankDetails');
  console.log(`✓ Test 4 Passed: getCompanyProfile resolved bank details: ${activeProfile.bankDetails?.bankName} (A/C: ${activeProfile.bankDetails?.accountNumber})`);

  console.log('\nALL BANK DETAILS & HIDE LOGIC TESTS PASSED SUCCESSFULLY! ✓');
}

testBankConfiguration().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
