/**
 * Automated Verification Script for Unified Factory ERP Workflow Bonding
 * Validates:
 * 1. UnifiedBondingPipelineBar existence & stages
 * 2. Mandatory 40% Advance Deposit Gatekeeper logic & RecordAdvanceModal
 * 3. 12L Stickers & Batch Print Hub (3 engines: 12L A4 labels, IS 14856:2000 QC PDF, A4 Master Schedule)
 * 4. BOM Factory Store Requisition Hub (Resin, CSM 450, PU Core, Polish, Hinges, Screws) & Issue Slip
 * 5. Direct Convert to Sales Order bonding from Door Measurement Book
 * 6. Live Next.js Dev Server HTTP check
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('=== RUNNING UNIFIED FACTORY ERP BONDING VERIFICATIONS ===\n');

// 1. UnifiedBondingPipelineBar verification
const pipelineBarPath = path.join(__dirname, '..', 'components', 'layout', 'UnifiedBondingPipelineBar.tsx');
assert(fs.existsSync(pipelineBarPath), 'UnifiedBondingPipelineBar.tsx component exists');
const pipelineContent = fs.readFileSync(pipelineBarPath, 'utf8');
assert(pipelineContent.includes('Quotation') && pipelineContent.includes('കൊട്ടേഷൻ'), 'Pipeline includes Quotation (കൊട്ടേഷൻ)');
assert(pipelineContent.includes('Measurement Book') && pipelineContent.includes('അളവ് പുസ്തകം'), 'Pipeline includes Measurement Book (അളവ് പുസ്തകം)');
assert(pipelineContent.includes('Sales Order') && pipelineContent.includes('സെയിൽസ് ഓർഡർ'), 'Pipeline includes Sales Order (സെയിൽസ് ഓർഡർ)');
assert(pipelineContent.includes('BOM & Store') && pipelineContent.includes('മെറ്റീരിയൽ ഇഷ്യൂ'), 'Pipeline includes BOM & Store Slip (മെറ്റീരിയൽ ഇഷ്യൂ)');
assert(pipelineContent.includes('Plant Press') && pipelineContent.includes('ഹൈഡ്രോളിക് പ്രസ്സ്'), 'Pipeline includes Plant Press (ഹൈഡ്രോളിക് പ്രസ്സ്)');
assert(pipelineContent.includes('Tax Invoice & Bill') && pipelineContent.includes('ജി.എസ്.ടി ബിൽ'), 'Pipeline includes Tax Invoice (ജി.എസ്.ടി ബിൽ)');

// 2. Mandatory 40% Advance Deposit Modal
const recordAdvanceModalPath = path.join(__dirname, '..', 'components', 'modules', 'sales', 'RecordAdvanceModal.tsx');
assert(fs.existsSync(recordAdvanceModalPath), 'RecordAdvanceModal.tsx component exists');
const recordAdvanceContent = fs.readFileSync(recordAdvanceModalPath, 'utf8');
assert(recordAdvanceContent.includes('0.40'), 'Mandatory 40% minimum calculation present in RecordAdvanceModal');
assert(recordAdvanceContent.includes('calculatedPercent >= 40'), 'Eligibility check >= 40% present');
assert(recordAdvanceContent.includes('paymentMode'), 'Payment mode selection (UPI, NEFT/RTGS, Cheque, Cash) present');
assert(recordAdvanceContent.includes('utrNumber'), 'Reference/UTR number capture present');

// 3. 12L Stickers & Batch Print Hub
const batchPrintHubPath = path.join(__dirname, '..', 'components', 'modules', 'production', 'BatchPrintHub.tsx');
assert(fs.existsSync(batchPrintHubPath), 'BatchPrintHub.tsx component exists');
const batchPrintContent = fs.readFileSync(batchPrintHubPath, 'utf8');
assert(batchPrintContent.includes('12L FACTORY SHUTTER STICKERS'), 'Format 1: 12L Die-Cut A4 Stickers engine present');
assert(batchPrintContent.includes('IS 14856 : 2000'), 'Format 2: Bureau of Indian Standards IS 14856:2000 QC PDF engine present');
assert(batchPrintContent.includes('PARTY-WISE A4 MASTER DOOR PRODUCTION & CUTTING SCHEDULE'), 'Format 3: Party-wise A4 Master Cutting Schedule engine present');
assert(batchPrintContent.includes('selectedOrderIds'), 'Multi-order checkbox selection present');
assert(batchPrintContent.includes('partyFilter'), 'Filter by Party dropdown present');

// 4. BOM Factory Store Requisition Hub
const storeReqPath = path.join(__dirname, '..', 'components', 'modules', 'engineering', 'StoreRequisitionHub.tsx');
assert(fs.existsSync(storeReqPath), 'StoreRequisitionHub.tsx component exists');
const storeReqContent = fs.readFileSync(storeReqPath, 'utf8');
assert(storeReqContent.includes('0.30'), 'Resin calculation formula (0.30 kg/sq.ft) present');
assert(storeReqContent.includes('0.15'), 'Fiberglass CSM 450 calculation formula (0.15 kg/sq.ft) present');
assert(storeReqContent.includes('STORE MATERIAL REQUISITION') && storeReqContent.includes('ISSUE SLIP'), 'Printable Store Issue Slip modal present');
assert(storeReqContent.includes('Requisition Raised by') && storeReqContent.includes('Materials Issued by'), 'Supervisor & Storekeeper signatures present');

// 5. Door Measurement Book Direct Conversion
const doorMeasModalPath = path.join(__dirname, '..', 'components', 'modules', 'DoorMeasurementModal.tsx');
const doorMeasContent = fs.readFileSync(doorMeasModalPath, 'utf8');
assert(doorMeasContent.includes('handleConvertToSalesOrder'), 'handleConvertToSalesOrder function present');
assert(doorMeasContent.includes('Convert to Order ➡️'), 'Direct Convert to Order action button present');

// 6. Dual Sticker Print Formats (A4 12L Compact vs Continuous Thermal Roll 4"x2")
assert(batchPrintContent.includes('THERMAL_ROLL'), 'Thermal Roll format mode supported in BatchPrintHub');
assert(batchPrintContent.includes('67mm'), 'Exact 67mm card height enforced on A4 12L compact to prevent overflow');
assert(batchPrintContent.includes('100mm') && batchPrintContent.includes('50mm'), 'Single Continuous Thermal Roll 100mm x 50mm (4"x2") supported');
assert(batchPrintContent.includes('IS 14856:2000 QC PASS'), 'IS 14856:2000 QC PASS badge on thermal label present');

// 7. Consolidated Multi-Party Batch BOQ
assert(storeReqContent.includes('Consolidated Multi-Party BOQ') || storeReqContent.includes('പല പാർട്ടികളുടെ ആകെ BOQ'), 'Consolidated Multi-Party BOQ toggle present in StoreRequisitionHub');
assert(storeReqContent.includes('selectedBatchOrderIds'), 'Multi-order batch selection state present');
assert(storeReqContent.includes('MR-BATCH-'), 'Batch Requisition slip format supported');

// 8. Door Measurement Book Bulk 12L Sticker Selector
const moduleViewsPath = path.join(__dirname, '..', 'components', 'modules', 'ModuleViews.tsx');
const moduleViewsContent = fs.readFileSync(moduleViewsPath, 'utf8');
assert(moduleViewsContent.includes('meas-bulk-12l-sticker-btn'), 'meas-bulk-12l-sticker-btn present in DoorMeasurementsView');
assert(moduleViewsContent.includes('Bulk 12L Sticker Print from Measurement Book'), 'Bulk 12L Sticker Print modal present in DoorMeasurementsView');

// 9. RBAC Permissions Matrix & Role Switcher
const navbarPath = path.join(__dirname, '..', 'components', 'layout', 'Navbar.tsx');
const navbarContent = fs.readFileSync(navbarPath, 'utf8');
assert(navbarContent.includes('Active Role:'), 'Active Role Selector present in Navbar');
assert(navbarContent.includes('Plant Supervisor') && navbarContent.includes('Site Engineer') && navbarContent.includes('QC Inspector'), 'Extended operational roles supported in Navbar');
assert(navbarContent.includes('Role-Based Access Control (RBAC) Permissions'), 'Super Admin RBAC Permission Matrix modal present');

// 10. Mobile Responsive Bottom Navigation Bar
const homePagePath = path.join(__dirname, '..', 'app', 'page.tsx');
const homePageContent = fs.readFileSync(homePagePath, 'utf8');
assert(homePageContent.includes('Mobile Bottom Navigation'), 'Mobile Responsive Bottom Navigation Bar present in app/page.tsx');
assert(homePageContent.includes('md:hidden fixed bottom-0'), 'Fixed bottom styling present on mobile nav');
assert(homePageContent.includes('12L Print'), '12L Print touch target present on mobile bottom nav');

// 11. Interactive QC Floor Checklist & Printable Physical Tick-Sheet
const qcHubPath = path.join(__dirname, '..', 'components', 'modules', 'quality', 'QualityControlHub.tsx');
const qcHubContent = fs.readFileSync(qcHubPath, 'utf8');
assert(qcHubContent.includes('Quality Control (QC) Floor Checklist & Digital Inspection'), 'Interactive Floor QC Checklist table present in QualityControlHub');
assert(qcHubContent.includes('Print Floor QC Sheet (പ്രിന്റ് ടിക്ക് ഷീറ്റ്)'), 'Print Floor QC Sheet action button present');
assert(qcHubContent.includes('PHYSICAL INSPECTION TICK-SHEET (IS 14856 : 2000 PROTOCOL)'), 'Physical QC Clipboard Sheet with [ ] tick-boxes present');

// 12. Next.js Server HTTP Check
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET',
};

const req = http.request(options, (res) => {
  assert(res.statusCode === 200, `Next.js Dev Server responds with HTTP ${res.statusCode}`);

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log('ALL WORKFLOW BONDING REQUIREMENTS SUCCESSFULLY VERIFIED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', (e) => {
  console.error(`Dev server check failed: ${e.message}`);
  process.exit(1);
});

req.end();
