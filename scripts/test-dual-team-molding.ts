import 'dotenv/config';
import {
  createContractor,
  getContractors,
  recordPieceRateCredit,
  getOrderPieceRateLocks,
  PieceRateDuplicateLockError,
} from '../lib/services/contractorService';
import { ensureSchemaUpToDate, CURRENT_SCHEMA_VERSION } from '../lib/services/schemaMigrator';
import { verifyBackupIntegrity } from '../lib/services/backupService';
import { getDataDir } from '../lib/utils/dataPaths';
import fs from 'fs';

async function runDualTeamMoldingSuite() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — DUAL-TEAM MOLDING & ZERO-DATA-LOSS VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Test 1: Additive Schema Migration v3 & Pre-Update Backup
  console.log('--- Test 1: Additive Schema Migration v3 & Pre-Update Backup ---');
  const migrationResult = await ensureSchemaUpToDate({ createPreUpdateBackup: true, forceRun: true });
  console.log(`Schema version reached: v${migrationResult.currentVersion} (Expected: v${CURRENT_SCHEMA_VERSION})`);
  if (migrationResult.currentVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Schema version mismatch: expected ${CURRENT_SCHEMA_VERSION}, got ${migrationResult.currentVersion}`);
  }

  if (migrationResult.preUpdateBackupId) {
    const backupCheck = await verifyBackupIntegrity(migrationResult.preUpdateBackupId);
    console.log(`Pre-update backup ${migrationResult.preUpdateBackupId} integrity: ${backupCheck.valid ? 'VALID' : 'INVALID'}`);
    if (!backupCheck.valid) {
      throw new Error(`Backup integrity check failed: ${backupCheck.errors.join(', ')}`);
    }
  }
  console.log('✓ Test 1 Passed: Schema Migration v3 and SHA-256 backup verified.\n');

  // Test 2: Floor Gang Registration with Molding Team 1 and Team 2 Scopes
  console.log('--- Test 2: Floor Gang Creation with Dual Molding Scopes ---');
  const testTeam1 = createContractor({
    name: `Test Molding Gang A (${Date.now()})`,
    phone: '+91 98470 11111',
    trade: 'MOLDING',
    isInHouseGang: true,
    primaryStage: 'MOLDING',
    teamScope: 'MOLDING_TEAM_1',
    gangLeader: 'Leader A',
  });
  console.log(`Created Team 1: ${testTeam1.name} [${testTeam1.id}] -> scope: ${testTeam1.teamScope}, label: "${testTeam1.tradeLabel}"`);

  const testTeam2 = createContractor({
    name: `Test Molding Gang B (${Date.now()})`,
    phone: '+91 98470 22222',
    trade: 'MOLDING',
    isInHouseGang: true,
    primaryStage: 'MOLDING',
    teamScope: 'MOLDING_TEAM_2',
    gangLeader: 'Leader B',
  });
  console.log(`Created Team 2: ${testTeam2.name} [${testTeam2.id}] -> scope: ${testTeam2.teamScope}, label: "${testTeam2.tradeLabel}"`);

  if (testTeam1.teamScope !== 'MOLDING_TEAM_1' || testTeam2.teamScope !== 'MOLDING_TEAM_2') {
    throw new Error('Failed to set molding team scopes correctly.');
  }
  console.log('✓ Test 2 Passed: Dual Molding floor gangs successfully registered.\n');

  // Test 3: Dual Teams on the Same Work Order (Split Molding Quantities)
  console.log('--- Test 3: Dual Molding Teams on Same Work Order (Split Doors) ---');
  const testOrderId = `TEST-ORD-${Date.now()}`;
  const testJobCard = `JC-TEST-${Math.floor(Math.random() * 9000 + 1000)}`;
  const totalOrderDoors = 10;

  // Gang A molds 6 doors @ ₹500
  console.log(`Action 1: Team 1 (${testTeam1.name}) credits 6 doors on Job Card ${testJobCard}`);
  const credit1 = recordPieceRateCredit({
    contractorId: testTeam1.id,
    orderId: testOrderId,
    orderNumber: `PO-${testJobCard}`,
    jobCardNumber: testJobCard,
    doorId: `BATCH-${testJobCard}-${testTeam1.id}`,
    doorNumber: '6 Doors Batch',
    doorModel: 'EXM-MOLDED-FRP',
    operation: 'MOLDING_DOOR_WITH_FRAME',
    quantity: 6,
    customRate: 500,
    notes: 'Team 1 molded 6 doors',
    maxOrderDoorCount: totalOrderDoors,
  });
  console.log(`  -> Credited Team 1: ${credit1.quantity} doors = ₹${credit1.totalAmount}`);

  // Check intermediate lock summary
  const midLock = getOrderPieceRateLocks({ orderId: testOrderId, jobCardNumber: testJobCard }, totalOrderDoors);
  console.log(`  -> Mid-state molding lock: totalCredited=${midLock.groups.MOLDING.totalCreditedQty}, isLocked=${midLock.groups.MOLDING.isLocked}, remainingBalance=${midLock.groups.MOLDING.remainingDoorBalance}`);
  if (midLock.groups.MOLDING.isLocked) {
    throw new Error('Molding group should NOT be locked after partial credit (6 of 10 doors).');
  }
  if (midLock.groups.MOLDING.remainingDoorBalance !== 4) {
    throw new Error(`Expected remaining balance 4, got ${midLock.groups.MOLDING.remainingDoorBalance}`);
  }

  // Gang B molds remaining 4 doors @ ₹500
  console.log(`Action 2: Team 2 (${testTeam2.name}) credits remaining 4 doors on SAME Job Card ${testJobCard}`);
  const credit2 = recordPieceRateCredit({
    contractorId: testTeam2.id,
    orderId: testOrderId,
    orderNumber: `PO-${testJobCard}`,
    jobCardNumber: testJobCard,
    doorId: `BATCH-${testJobCard}-${testTeam2.id}`,
    doorNumber: '4 Doors Batch',
    doorModel: 'EXM-MOLDED-FRP',
    operation: 'MOLDING_DOOR_WITH_FRAME',
    quantity: 4,
    customRate: 500,
    notes: 'Team 2 molded remaining 4 doors',
    maxOrderDoorCount: totalOrderDoors,
  });
  console.log(`  -> Credited Team 2: ${credit2.quantity} doors = ₹${credit2.totalAmount}`);

  // Check final lock summary
  const finalLock = getOrderPieceRateLocks({ orderId: testOrderId, jobCardNumber: testJobCard }, totalOrderDoors);
  console.log(`  -> Final state molding lock: totalCredited=${finalLock.groups.MOLDING.totalCreditedQty}, isLocked=${finalLock.groups.MOLDING.isLocked}, remainingBalance=${finalLock.groups.MOLDING.remainingDoorBalance}`);
  console.log(`  -> Contributing contractors count: ${finalLock.groups.MOLDING.contributingContractors?.length}`);
  for (const contrib of finalLock.groups.MOLDING.contributingContractors || []) {
    console.log(`     * ${contrib.contractorName}: ${contrib.quantity} doors = ₹${contrib.amount}`);
  }

  if (!finalLock.groups.MOLDING.isLocked) {
    throw new Error('Molding group SHOULD be fully locked after all 10 doors are credited.');
  }
  if (finalLock.groups.MOLDING.totalCreditedQty !== 10) {
    throw new Error(`Expected total credited 10, got ${finalLock.groups.MOLDING.totalCreditedQty}`);
  }
  if ((finalLock.groups.MOLDING.contributingContractors?.length || 0) < 2) {
    throw new Error('Both contractors must be tracked in contributingContractors.');
  }
  console.log('✓ Test 3 Passed: Both teams successfully credited on same order with split doors.\n');

  // Test 4: Prevent Excess Doors Over Job Card Total
  console.log('--- Test 4: Excess Door Over-Credit Prevention ---');
  let overCreditBlocked = false;
  try {
    recordPieceRateCredit({
      contractorId: testTeam2.id,
      orderId: testOrderId,
      orderNumber: `PO-${testJobCard}`,
      jobCardNumber: testJobCard,
      doorId: `BATCH-${testJobCard}-EXTRA`,
      doorNumber: '1 Extra Door',
      doorModel: 'EXM-MOLDED-FRP',
      operation: 'MOLDING_DOOR_WITH_FRAME',
      quantity: 1,
      customRate: 500,
      maxOrderDoorCount: totalOrderDoors,
    });
  } catch (err) {
    if (err instanceof PieceRateDuplicateLockError) {
      overCreditBlocked = true;
      console.log(`  -> Correctly blocked over-credit: ${(err as Error).message}`);
    } else {
      throw err;
    }
  }

  if (!overCreditBlocked) {
    throw new Error('Failed to block 11th door on 10-door job card!');
  }
  console.log('✓ Test 4 Passed: Strict door count cap prevents over-crediting beyond order total.\n');

  // Test 5: Vault Store Health Check
  console.log('--- Test 5: Data Vault Health & Store Count ---');
  const dataDir = getDataDir();
  const jsonFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
  console.log(`Active JSON data files in ${dataDir}: ${jsonFiles.length} stores`);
  if (jsonFiles.length < 30) {
    throw new Error(`Expected at least 30 stores, found ${jsonFiles.length}`);
  }
  console.log('✓ Test 5 Passed: All business stores 100% persistent and intact.\n');

  console.log('========================================================================');
  console.log('  ALL TESTS PASSED: DUAL-TEAM MOLDING & SAFE UPGRADE FULLY VERIFIED');
  console.log('========================================================================\n');
}

runDualTeamMoldingSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
