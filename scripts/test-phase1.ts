import {
  getProductCategories,
  isWpcEnabled,
  toggleCategoryEnabled,
  addProductCategory,
} from '../lib/services/productCategoryService';
import {
  getAllMeasurements,
  createMeasurement,
  updateMeasurement,
} from '../lib/services/measurementService';
import { canAccessModule } from '../lib/auth/roles';

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('EXMARK ERP - PHASE 1 AUDIT & STABILIZATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Role-Based Access Control & Permission Verification
  // ----------------------------------------------------
  console.log('--- 1. Testing Role-Based Authorization ---');
  assert(canAccessModule('Super Admin', 'settings'), 'Super Admin has settings access');
  assert(canAccessModule('Production', 'production'), 'Production role has production access');
  assert(!canAccessModule('Installation', 'settings'), 'Installation staff blocked from settings module');
  assert(canAccessModule('Installation', 'measurements'), 'Installation staff has measurements access');

  // ----------------------------------------------------
  // TEST 2: Product Categories (FRP Enabled, WPC Disabled by Default)
  // ----------------------------------------------------
  console.log('\n--- 2. Testing FRP-First & WPC Default Configuration ---');
  const categories = await getProductCategories();
  const frp = categories.find((c) => c.code === 'FRP');
  const wpc = categories.find((c) => c.code === 'WPC');

  assert(Boolean(frp), 'FRP product category exists');
  assert(Boolean(frp?.enabled), 'FRP is ENABLED by default');
  assert(Boolean(frp?.isPrimary), 'FRP is designated as PRIMARY product');

  assert(Boolean(wpc), 'WPC product category exists');
  const wpcInitialStatus = await isWpcEnabled();
  assert(wpcInitialStatus === false, 'WPC is DISABLED (OFF) by default');

  // Test toggling WPC ON
  console.log('Testing WPC toggle ON...');
  const wpcToggledOn = await toggleCategoryEnabled('WPC', true);
  assert(wpcToggledOn.enabled === true, 'WPC successfully toggled ON');
  assert((await isWpcEnabled()) === true, 'isWpcEnabled() returns true when toggled ON');

  // Test toggling WPC back OFF (preserving default state)
  console.log('Testing WPC toggle OFF (Restoring default state)...');
  const wpcToggledOff = await toggleCategoryEnabled('WPC', false);
  assert(wpcToggledOff.enabled === false, 'WPC successfully returned to DISABLED (OFF)');
  assert((await isWpcEnabled()) === false, 'isWpcEnabled() returns false when disabled');

  // Test primary FRP cannot be disabled
  let frpDisableBlocked = false;
  try {
    await toggleCategoryEnabled('FRP', false);
  } catch (err) {
    frpDisableBlocked = true;
  }
  assert(frpDisableBlocked, 'Primary FRP product category CANNOT be disabled (integrity preserved)');

  // Test adding future custom category
  console.log('Testing custom category registration...');
  const customCat = await addProductCategory({
    code: `TEST_HYBRID_${Date.now()}`,
    name: 'Solid Weather-Shield Hybrid Door',
    description: 'Exterior weather resistant composite hybrid door with teak finish',
    fields: ['Sub-core', 'Thermal Rating', 'Alu Cladding'],
    pricing: { baseRateSqFt: 215, standardGstPercent: 18, hsnCode: '3925.20.00' },
    production: { lineCode: 'HYB-01', lineName: 'Hybrid Press Line', cycleTimeMinutes: 50, qcCheckpoints: ['Weather Seal Check'] },
    enabled: true,
    reportingVisibility: true,
  });
  assert(Boolean(customCat.id), 'Future product category added dynamically');

  // ----------------------------------------------------
  // TEST 3: Site Door Measurement Button & Multi-Door Book Flow
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Door Measurement Book Flow ---');
  const testSiteBook = await createMeasurement({
    refNumber: `MSR-P1-${Date.now()}`,
    customerName: 'Kakkanad Premium Residences',
    orderRef: 'ORD-KPR-001',
    siteName: 'Skyline Kakkanad Tower A',
    district: 'Ernakulam',
    engineerName: 'Anoop Krishnan',
    date: '2026-10-27',
    status: 'DRAFT',
    totalOpenings: 2,
    wallThicknessMm: '150mm',
    rebateDepthMm: '38mm',
    doors: [
      {
        doorNumber: 'D1 - Main Entrance (FRP)',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'FRP Wrap-Around Monolithic Frame',
        colour: 'Burma Teak (Woodgrain PU)',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Mortise Lock (55mm Backset)',
        measurementUnit: 'MM',
        heightLeft: 2090,
        heightRight: 2090,
        widthTop: 890,
        widthBottom: 890,
        remarks: 'Main entry raw opening',
      },
      {
        doorNumber: 'D2 - Bedroom (FRP)',
        model: 'FRP CNC Carved Luxury Main Door (35mm with Inlay)',
        frameType: 'Granite Subframe (Tile / Marble Rebate)',
        colour: 'Walnut Dark Brown',
        hingeSide: 'Right Hand (RH)',
        lockType: 'Cylindrical Knob Lock',
        measurementUnit: 'INCH',
        heightLeft: 82.5,
        heightRight: 82.5,
        widthTop: 33.5,
        widthBottom: 33.5,
        remarks: 'Granite subframe',
      },
    ],
  });

  assert(Boolean(testSiteBook.id), 'Site measurement book created');
  assert(testSiteBook.doors.length === 2, 'Multiple doors successfully recorded in site book');
  assert(testSiteBook.doors[0].measurementUnit === 'MM', 'Door 1 recorded in MM unit');
  assert(testSiteBook.doors[1].measurementUnit === 'INCH', 'Door 2 recorded in INCH unit');

  // Update status to VERIFIED
  const updatedBook = await updateMeasurement(testSiteBook.id, {
    status: 'VERIFIED',
    notes: 'Site dimensions plumb verified and approved for manufacturing.',
  });
  assert(updatedBook.status === 'VERIFIED', 'Site book status updated to VERIFIED');

  // Verify retrieval
  const allBooks = await getAllMeasurements();
  const retrievedBook = allBooks.find((b) => b.id === testSiteBook.id);
  assert(Boolean(retrievedBook), 'Saved measurement book successfully retrieved from persistence store');

  console.log('\n====================================================');
  console.log(`PHASE 1 ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified! ✅`);
  console.log('====================================================\n');
}

runPhase1Tests().catch((err) => {
  console.error('Phase 1 test execution error:', err);
  process.exit(1);
});
