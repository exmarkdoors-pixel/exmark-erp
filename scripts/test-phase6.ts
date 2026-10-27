import { runAiStrategistAnalysis } from '../lib/services/aiStrategistService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  EXMARK ERP — Phase 6 AI Financial Strategist Suite ');
  console.log('====================================================\n');

  try {
    console.log('--- AI STRATEGIST ANALYTICAL ENGINE TESTS ---');
    const result = await runAiStrategistAnalysis();

    assert(typeof result.financialHealthScore === 'number', 'Computes financial health score');
    assert(result.financialHealthScore >= 0 && result.financialHealthScore <= 100, 'Health score is bounded between 0 and 100');
    assert(typeof result.dsoDays === 'number', 'Calculates Days Sales Outstanding (DSO)');
    assert(typeof result.cashRunwayMonths === 'number', 'Calculates Cash Runway in months');
    assert(typeof result.highMarginFRPSharePercentage === 'number', 'Calculates premium FRP door product share %');

    // 2. Strategic Directives
    console.log('\n--- STRATEGIC ACTION DIRECTIVES TESTS ---');
    assert(result.recommendations.length >= 3, 'Generates at least 3 prioritized strategic directives');
    assert(
      result.recommendations.some((r) => r.category === 'CASH_FLOW'),
      'Includes Cash Flow directive (advance payment requirement)'
    );
    assert(
      result.recommendations.some((r) => r.category === 'PRICING'),
      'Includes Pricing directive (pushing Molded Teak / CNC carved models)'
    );

    // 3. Governance Safeguards & Barriers
    console.log('\n--- GOVERNANCE BARRIERS & SAFEGUARDS TESTS ---');
    assert(
      result.governanceSummary.canExecutePayments === false,
      'STRICT GOVERNANCE: AI engine cannot execute payments autonomously'
    );
    assert(
      result.governanceSummary.canAlterLedger === false,
      'STRICT GOVERNANCE: AI engine cannot alter general ledger postings'
    );
    assert(
      result.governanceSummary.requiresExecutiveApproval === true,
      'STRICT GOVERNANCE: All recommendations require Director authorization'
    );

    // 4. Forecasting Scenarios
    console.log('\n--- FORECASTING SCENARIOS TESTS ---');
    assert(result.scenarios.length === 3, 'Produces exactly 3 stress-tested forecast scenarios');

    const conservative = result.scenarios.find((s) => s.scenario === 'CONSERVATIVE');
    const baseCase = result.scenarios.find((s) => s.scenario === 'BASE_CASE');
    const expansion = result.scenarios.find((s) => s.scenario === 'EXPANSION_GROWTH');

    assert(!!conservative, 'Includes CONSERVATIVE monsoon seasonality scenario');
    assert(!!baseCase, 'Includes BASE_CASE operational scenario');
    assert(!!expansion, 'Includes EXPANSION_GROWTH Northern Kerala dealer scenario');

    assert(
      conservative!.projectedRevenue < baseCase!.projectedRevenue,
      'Conservative scenario revenue is lower than base case (-15% monsoon dip)'
    );
    assert(
      expansion!.projectedRevenue > baseCase!.projectedRevenue,
      'Expansion scenario revenue is higher than base case (+25% expansion)'
    );
    assert(
      conservative!.assumptions.length > 0,
      'Scenarios contain explicit mathematical assumptions'
    );

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  PHASE 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
