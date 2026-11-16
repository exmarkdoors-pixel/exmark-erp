/**
 * Automated Verification Suite for:
 * 1. Project Risk Calculation Engine
 * 2. Project Cost & Profit Stack Calculation
 * 3. Location-Based Future Warranty Verification & Geofencing
 * 4. Localhost Port 3000 -> 4000 Forwarding
 */

import {
  calculateProjectRisk,
  calculateProjectCostProfit,
  haversineDistanceMeters,
  KERALA_DISTRICT_LOGISTICS,
} from '../lib/services/projectRiskProfitService';

import {
  listLocationWarranties,
  getLocationWarrantyById,
  verifyWarrantyLocation,
  createLocationWarranty,
} from '../lib/services/locationWarrantyService';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PROJECT RISK, PROFIT & WARRANTY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. RISK CALCULATION TESTS
  console.log('--- 1. PROJECT RISK CALCULATION ENGINE ---');
  // Scenario A: Safe project (Malappuram, 50% advance, standard sizes, plain terrain)
  const lowRisk = calculateProjectRisk({
    district: 'Malappuram',
    totalDoorsCount: 10,
    advancePercent: 50,
    siteReadiness: 'READY_CLEARED',
    isMonsoonSeason: false,
  });

  assert(lowRisk.riskLevel === 'LOW' || lowRisk.riskLevel === 'MEDIUM', `Safe project risk level is ${lowRisk.riskLevel}`);
  assert(lowRisk.recommendedContingencyBufferPct <= 4, `Safe project contingency is ${lowRisk.recommendedContingencyBufferPct}%`);

  // Scenario B: High risk project (Wayanad highland ghats, 20% advance, non-standard doors, monsoon)
  const highRisk = calculateProjectRisk({
    district: 'Wayanad',
    totalDoorsCount: 24,
    advancePercent: 20,
    siteReadiness: 'UNFINISHED_CIVIL',
    isMonsoonSeason: true,
  });

  assert(highRisk.overallScore > lowRisk.overallScore, `Wayanad risk (${highRisk.overallScore}) is greater than Malappuram safe (${lowRisk.overallScore})`);
  assert(highRisk.riskLevel === 'HIGH' || highRisk.riskLevel === 'CRITICAL', `Highland monsoon project risk level is ${highRisk.riskLevel}`);
  assert(highRisk.mitigations.length >= 2, `Highland project receives ${highRisk.mitigations.length} mitigations`);
  assert(highRisk.recommendedContingencyBufferPct >= 6, `Highland contingency buffer is ${highRisk.recommendedContingencyBufferPct}%`);

  // 2. COST & PROFIT STACK TESTS
  console.log('\n--- 2. COST & PROFIT STACK ENGINE ---');
  const costProfit = calculateProjectCostProfit({
    totalDoors: 10,
    district: 'Malappuram',
    includeInstallation: true,
    installationMode: 'PER_DOOR',
    installationRate: 500,
    additionalDiscount: 2000,
    riskScore: 25,
  });

  assert(costProfit.netQuotedRevenue > 0, `Net Quoted Revenue calculated: ₹${costProfit.netQuotedRevenue}`);
  assert(costProfit.costBreakdown.totalDirectMaterials > 0, `Direct materials BOM total calculated: ₹${costProfit.costBreakdown.totalDirectMaterials}`);
  assert(costProfit.costBreakdown.totalDirectLabor > 0, `Floor gang piece-rate labor calculated: ₹${costProfit.costBreakdown.totalDirectLabor}`);
  assert(costProfit.costBreakdown.fixedOverheadAbsorption === 3500, `Fixed overhead (₹350 * 10 doors) is ₹${costProfit.costBreakdown.fixedOverheadAbsorption}`);
  assert(costProfit.totalCost > 0, `Cost of Project (COP) calculated: ₹${costProfit.totalCost}`);
  assert(costProfit.netProjectProfit > 0, `Net Profit is positive: ₹${costProfit.netProjectProfit} (${costProfit.netMarginPct}%)`);
  assert(costProfit.breakEvenContractPrice < costProfit.netQuotedRevenue, `Breakeven price (₹${costProfit.breakEvenContractPrice}) is below Quoted Revenue (₹${costProfit.netQuotedRevenue})`);
  assert(costProfit.targetPrice25Pct > costProfit.totalCost, `Target 25% ROI price is ₹${costProfit.targetPrice25Pct}`);

  // 3. HAVERSINE DISTANCE & GEOFENCING TESTS
  console.log('\n--- 3. HAVERSINE DISTANCE & LOCATION GEOFENCING ---');
  // Distance between Malappuram plant (11.0510, 76.0711) and Vengara site (11.0250, 75.9800) ~ 10.3 km
  const distMeters = haversineDistanceMeters(11.0510, 76.0711, 11.0250, 75.9800);
  assert(distMeters > 9500 && distMeters < 11500, `Haversine distance calculated accurately: ${(distMeters / 1000).toFixed(2)} km`);

  // Same coordinates within 10 meters
  const closeMeters = haversineDistanceMeters(11.0250, 75.9800, 11.0251, 75.9801);
  assert(closeMeters < 50, `Sub-50m coordinates resolved accurately: ${closeMeters.toFixed(1)} meters`);

  // Geotagged Warranty Verification
  const testWarranties = await listLocationWarranties();
  assert(testWarranties.length >= 1, `Found ${testWarranties.length} geotagged warranty certificates`);

  const sampleCert = testWarranties[0];
  console.log(`  Targeting Certificate: ${sampleCert.certificateNumber} (${sampleCert.customerName})`);

  // Verify within geofence (< 500m)
  const insideResult = await verifyWarrantyLocation(
    sampleCert.certificateNumber,
    sampleCert.coordinates.latitude + 0.0005, // ~55m away
    sampleCert.coordinates.longitude + 0.0005
  );
  assert(insideResult.isVerified === true, `Nearby scan verified within geofence (${insideResult.distanceMeters}m <= ${insideResult.geofenceRadiusMeters}m)`);
  assert(insideResult.message.includes('Verified'), `Status message confirms site location verification`);

  // Verify outside geofence (> 500m)
  const outsideResult = await verifyWarrantyLocation(
    sampleCert.certificateNumber,
    sampleCert.coordinates.latitude + 0.05, // ~5.5 km away
    sampleCert.coordinates.longitude + 0.05
  );
  assert(outsideResult.isVerified === false, `Distant scan detected as outside geofence (${outsideResult.distanceMeters}m > ${outsideResult.geofenceRadiusMeters}m)`);
  assert(outsideResult.message.includes('Mismatch'), `Status message warns about location mismatch`);

  // 4. HTTP REDIRECT & API TESTS
  console.log('\n--- 4. HTTP ENDPOINTS & PORT FORWARDER ---');
  try {
    const res3000 = await fetch('http://localhost:3000', { redirect: 'manual' });
    const location = res3000.headers.get('location');
    assert(
      res3000.status === 307 && (location?.includes(':4000') ?? false),
      `Port 3000 successfully redirected to port 4000 (status: ${res3000.status}, target: ${location})`
    );
  } catch (err: any) {
    console.error(`  ❌ Failed port 3000 test: ${err.message}`);
    failed++;
  }

  try {
    const res4000 = await fetch('http://localhost:4000');
    assert(res4000.status === 200, `Port 4000 Next.js server responded with HTTP ${res4000.status}`);
  } catch (err: any) {
    console.error(`  ❌ Failed port 4000 test: ${err.message}`);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
