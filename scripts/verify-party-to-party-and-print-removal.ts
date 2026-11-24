/**
 * EXMARK ERP Verification Script
 * - Tests removal of browser print option from Floor Door QR module
 * - Tests Party to Party Payment creation, journal balance, ledger statements, reports & deletion
 */

import fs from 'fs';
import path from 'path';
import {
  createPartyToPartyPayment,
  listPartyToPartyPayments,
  deletePartyToPartyPayment,
  getAccountStatement,
  generateAccountingReport,
  readAccountingStore,
  SYSTEM_ACCOUNT_IDS,
} from '../lib/services/accountingService';
import { generateReport, SYSTEM_REPORTS } from '../lib/services/reportService';

async function runVerification() {
  console.log('=== [1/5] Verifying Floor Door QR Print Option Removal ===');
  const stickerModalPath = path.resolve(__dirname, '../components/modules/production/StickerPrintModal.tsx');
  const stickerModalCode = fs.readFileSync(stickerModalPath, 'utf8');

  if (stickerModalCode.includes('window.print()') || stickerModalCode.includes('Print 12L Stickers')) {
    throw new Error('FAIL: StickerPrintModal still contains direct browser print button!');
  }
  if (!stickerModalCode.includes('handleDownloadVectorPdf')) {
    throw new Error('FAIL: Download 12L Vector PDF is missing from StickerPrintModal!');
  }
  console.log('PASS: Direct browser print button removed. Vector PDF export remains primary calibrated output.');

  console.log('\n=== [2/5] Testing Party-to-Party Payment Creation & Balanced Journal ===');
  const testFromParty = 'Test Customer Builders';
  const testToParty = 'Test Resin Supplier Corp';
  const testAmount = 45000;
  const testDate = new Date().toISOString().slice(0, 10);

  const payment = createPartyToPartyPayment({
    date: testDate,
    fromPartyName: testFromParty,
    fromPartyType: 'CUSTOMER',
    toPartyName: testToParty,
    toPartyType: 'SUPPLIER',
    amount: testAmount,
    paymentMode: 'DIRECT_BANK',
    referenceNumber: 'TEST-NEFT-999888',
    narration: 'Automated test direct customer to resin supplier settlement',
    createdBy: 'System Verifier',
  });

  console.log(`Created P2P Payment: ${payment.voucherNumber} for ₹${payment.amount}`);
  if (!payment.voucherNumber.startsWith('P2P-')) {
    throw new Error(`FAIL: Invalid voucher number format: ${payment.voucherNumber}`);
  }

  const store = readAccountingStore();
  const journal = store.journals.find((j) => j.id === payment.journalEntryId);
  if (!journal) {
    throw new Error(`FAIL: Associated journal entry ${payment.journalEntryId} not found in store!`);
  }

  console.log(`Associated Journal: ${journal.journalNumber}`);
  console.log(`Journal Debit: ₹${journal.totalDebit}, Credit: ₹${journal.totalCredit}`);
  if (journal.totalDebit !== testAmount || journal.totalCredit !== testAmount) {
    throw new Error(`FAIL: Journal out of balance or mismatch! Total Debit: ${journal.totalDebit}, Total Credit: ${journal.totalCredit}`);
  }

  const drLine = journal.lines.find((l) => l.debit > 0);
  const crLine = journal.lines.find((l) => l.credit > 0);
  if (!drLine || !crLine) {
    throw new Error('FAIL: Missing debit or credit line in journal!');
  }
  console.log(`Debit Account: ${drLine.accountName} (₹${drLine.debit})`);
  console.log(`Credit Account: ${crLine.accountName} (₹${crLine.credit})`);
  console.log('PASS: P2P payment created with perfectly balanced double-entry contra journal.');

  console.log('\n=== [3/5] Testing Party Ledger Statements Sync ===');
  const customerStmt = getAccountStatement({
    mode: 'PARTY',
    partyName: testFromParty,
    partyType: 'CUSTOMER',
  });
  const customerHasP2p = customerStmt.lines.some((l) => l.voucherNumber === payment.voucherNumber || l.reference === journal.journalNumber);
  console.log(`Customer statement contains P2P voucher: ${customerHasP2p} (Total lines: ${customerStmt.lines.length})`);
  if (!customerHasP2p) {
    throw new Error('FAIL: P2P payment did not appear on customer receivable statement!');
  }

  const supplierStmt = getAccountStatement({
    mode: 'PARTY',
    partyName: testToParty,
    partyType: 'SUPPLIER',
  });
  const supplierHasP2p = supplierStmt.lines.some((l) => l.voucherNumber === payment.voucherNumber || l.reference === journal.journalNumber);
  console.log(`Supplier statement contains P2P voucher: ${supplierHasP2p} (Total lines: ${supplierStmt.lines.length})`);
  if (!supplierHasP2p) {
    throw new Error('FAIL: P2P payment did not appear on supplier payable statement!');
  }
  console.log('PASS: Both customer and supplier statements accurately show the P2P contra entry.');

  console.log('\n=== [4/5] Testing Reports: Accounting Report & Main Report Service ===');
  const p2pAccReport = generateAccountingReport('PARTY_TO_PARTY', {
    fromDate: '2000-01-01',
    toDate: '2099-12-31',
  }) as any;

  console.log(`Accounting Report Title: ${p2pAccReport.title}`);
  console.log(`Total Settlements: ${p2pAccReport.summary.totalSettlements}, Total Volume: ₹${p2pAccReport.summary.totalAmount}`);
  const foundInAccReport = p2pAccReport.payments.some((p: any) => p.id === payment.id);
  if (!foundInAccReport) {
    throw new Error('FAIL: Payment not found in Accounting Report PARTY_TO_PARTY!');
  }

  const repDefExists = SYSTEM_REPORTS.some((r) => r.reportCode === 'PARTY_TO_PARTY_SETTLEMENTS');
  if (!repDefExists) {
    throw new Error('FAIL: PARTY_TO_PARTY_SETTLEMENTS not in SYSTEM_REPORTS!');
  }

  const mainReport = await generateReport('PARTY_TO_PARTY_SETTLEMENTS', {
    startDate: '2000-01-01',
    endDate: '2099-12-31',
  });
  console.log(`Main Report Title: ${mainReport.title}`);
  console.log(`Main Report Rows: ${mainReport.rows.length}`);
  const foundInMainReport = mainReport.rows.some((r: any) => r.voucherNumber === payment.voucherNumber);
  if (!foundInMainReport) {
    throw new Error('FAIL: Payment not found in Main Report PARTY_TO_PARTY_SETTLEMENTS rows!');
  }
  console.log('PASS: Party-to-Party Reports in both Accounting and Main Report sections verified successfully.');

  console.log('\n=== [5/5] Testing P2P Deletion & Safe Journal Reversal ===');
  deletePartyToPartyPayment(payment.id);
  const storeAfter = readAccountingStore();
  const deletedFromP2p = !(storeAfter.partyToPartyPayments || []).some((p) => p.id === payment.id);
  const deletedFromJournals = !storeAfter.journals.some((j) => j.id === payment.journalEntryId);

  if (!deletedFromP2p || !deletedFromJournals) {
    throw new Error(`FAIL: Record or journal not deleted! inP2p: ${!deletedFromP2p}, inJournals: ${!deletedFromJournals}`);
  }
  console.log('PASS: P2P payment record deleted and corresponding journal entry reversed cleanly.');

  console.log('\n*** ALL 5 VERIFICATION CHECKS PASSED 100% ***');
}

runVerification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
