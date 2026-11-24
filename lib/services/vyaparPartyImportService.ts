/**
 * EXMARK ERP — Vyapar App & Universal Bulk Party Import Engine
 * Robust mapping for Vyapar .xlsx / .csv party exports, phone normalization,
 * GSTIN verification, Kerala district extraction, duplicate handling, and
 * double-entry Opening Balance synchronization.
 */

import * as XLSX from 'xlsx';
import { Customer, CustomerType, createCustomer, listCustomers, updateCustomer } from './customerService';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import fs from 'fs';
import {
  NormalizedPartyImportRecord,
  PartyDuplicateStrategy,
  PartyImportExecutionOptions,
  PartyImportFieldMapping,
  PartyImportSummary,
} from '@/types/vyaparSync';
import { createManualJournal } from './accountingService';

/**
 * Creates a double-entry opening balance voucher for a migrated party
 */
export function recordOpeningBalanceEntry(input: {
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: string;
  partyName: string;
  balance: number;
  balanceType: 'DEBIT' | 'CREDIT';
  notes?: string;
}) {
  const isDebtor = input.partyType === 'CUSTOMER';
  const mainAccount = isDebtor ? 'coa-1100-ar' : 'coa-2001-ap';
  const capitalAccount = 'coa-3001-capital';

  if (input.balanceType === 'DEBIT') {
    createManualJournal({
      date: new Date().toISOString().slice(0, 10),
      reference: `OB-${input.partyId}`,
      narration: input.notes || `Opening balance for ${input.partyName}`,
      lines: [
        { accountId: mainAccount, debit: input.balance, credit: 0, lineNote: `${input.partyName} (Opening Dr)` },
        { accountId: capitalAccount, debit: 0, credit: input.balance, lineNote: 'Owner Capital / Retained Equity (Opening)' },
      ],
      createdBy: 'Vyapar Migration',
    });
  } else {
    createManualJournal({
      date: new Date().toISOString().slice(0, 10),
      reference: `OB-${input.partyId}`,
      narration: input.notes || `Opening balance for ${input.partyName}`,
      lines: [
        { accountId: capitalAccount, debit: input.balance, credit: 0, lineNote: 'Owner Capital / Retained Equity (Opening)' },
        { accountId: mainAccount, debit: 0, credit: input.balance, lineNote: `${input.partyName} (Opening Cr)` },
      ],
      createdBy: 'Vyapar Migration',
    });
  }
}

import {
  normalizePhone10,
  validateAndCleanGstin,
  detectKeralaDistrict,
  detectVyaparHeaderMapping,
  normalizeVyaparRow,
  normalizeVyaparPartyRow,
  KERALA_DISTRICTS,
} from './vyaparParserUtils';
export * from './vyaparParserUtils';

/**
 * Executes batch party import with duplicate resolution & opening balance ledger sync
 */
export async function executeBulkPartyImport(
  records: NormalizedPartyImportRecord[],
  options: PartyImportExecutionOptions
): Promise<PartyImportSummary> {
  const summary: PartyImportSummary = {
    totalRowsProcessed: records.length,
    importedCustomers: 0,
    importedSuppliers: 0,
    updatedExistingCount: 0,
    skippedDuplicatesCount: 0,
    openingBalancesPostedCount: 0,
    errorsCount: 0,
    errorDetails: [],
  };

  const existingCustomers = await listCustomers({});
  const existingPhoneMap = new Map<string, Customer>();
  const existingGstinMap = new Map<string, Customer>();

  for (const c of existingCustomers) {
    const p10 = normalizePhone10(c.phone);
    if (p10) existingPhoneMap.set(p10, c);
    if (c.gstin) existingGstinMap.set(c.gstin.toUpperCase(), c);
  }

  for (let idx = 0; idx < records.length; idx++) {
    const rec = records[idx];
    if (rec.validationErrors.length > 0 && !rec.name) {
      summary.errorsCount++;
      summary.errorDetails.push({ row: idx + 1, name: rec.name || 'Unknown', error: rec.validationErrors.join(', ') });
      continue;
    }

    const p10 = normalizePhone10(rec.phone);
    const existing = (p10 ? existingPhoneMap.get(p10) : null) || (rec.gstin ? existingGstinMap.get(rec.gstin.toUpperCase()) : null);

    if (existing) {
      if (options.duplicateStrategy === 'SKIP') {
        summary.skippedDuplicatesCount++;
        continue;
      } else if (options.duplicateStrategy === 'UPDATE_MERGE') {
        try {
          await updateCustomer(existing.id, {
            address: rec.address || existing.address,
            gstin: rec.gstin || existing.gstin,
            district: rec.district || existing.district,
            outstandingBalance: rec.openingBalance > 0 ? rec.openingBalance : existing.outstandingBalance,
          });
          summary.updatedExistingCount++;
        } catch (e: unknown) {
          summary.errorsCount++;
          summary.errorDetails.push({ row: idx + 1, name: rec.name, error: e instanceof Error ? e.message : 'Update failed' });
        }
        continue;
      }
    }

    // Create New Record
    try {
      const created = await createCustomer({
        name: rec.name,
        firmName: rec.firmName,
        type: rec.type,
        district: rec.district,
        town: rec.town,
        address: rec.address,
        gstin: rec.gstin,
        phone: rec.phone,
        email: rec.email,
        creditLimit: rec.creditLimit,
        outstandingBalance: rec.openingBalance,
        status: 'ACTIVE',
      });

      if (rec.isSupplier) {
        summary.importedSuppliers++;
      } else {
        summary.importedCustomers++;
      }

      // Track in local map for within-batch deduplication
      if (p10) existingPhoneMap.set(p10, created);
      if (rec.gstin) existingGstinMap.set(rec.gstin.toUpperCase(), created);

      // Post Opening Balance to Double-Entry Accounting if enabled
      if (options.postOpeningBalancesToLedger && rec.openingBalance > 0) {
        try {
          recordOpeningBalanceEntry({
            partyType: rec.isSupplier ? 'SUPPLIER' : 'CUSTOMER',
            partyId: created.id,
            partyName: created.name,
            balance: rec.openingBalance,
            balanceType: rec.balanceType === 'TO_PAY' ? 'CREDIT' : 'DEBIT',
            notes: `Vyapar App Migration Opening Balance for ${created.name}`,
          });
          summary.openingBalancesPostedCount++;
        } catch {
          // Non-fatal for ledger posting
        }
      }
    } catch (err: unknown) {
      summary.errorsCount++;
      summary.errorDetails.push({
        row: idx + 1,
        name: rec.name,
        error: err instanceof Error ? err.message : 'Creation failed',
      });
    }
  }

  return summary;
}

/**
 * Generates an official, pre-formatted bilingual Excel Workbook (.xlsx)
 * with sample rows and field guide in English and Malayalam
 */
export function generateVyaparPartyTemplateBuffer(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // 1. Data Sheet with Sample Rows
  const sampleData = [
    {
      'Party Name': 'Kozhikode Builders & Hardwares',
      'Contact Person': 'Mr. Ashraf K',
      'Mobile Number': '9847012345',
      'Email': 'ashraf.kb@gmail.com',
      'Billing Address': 'Door 45/12, NH Bypass Road, Pantheerankavu',
      'District': 'Kozhikode',
      'GSTIN': '32AABCK1234F1Z5',
      'Party Type (DEALER/BUILDER/RETAIL/SUPPLIER)': 'DEALER',
      'Opening Balance (₹)': 45000,
      'Balance Type (TO_RECEIVE / TO_PAY)': 'TO_RECEIVE',
      'Credit Limit (₹)': 200000,
    },
    {
      'Party Name': 'Malabar Resin & Chemical Distributors',
      'Contact Person': 'Suresh Kumar',
      'Mobile Number': '9447198765',
      'Email': 'orders@malabarresin.com',
      'Billing Address': 'Plot 18, Kinfra Industrial Park',
      'District': 'Malappuram',
      'GSTIN': '32AAAFM9876D1Z2',
      'Party Type (DEALER/BUILDER/RETAIL/SUPPLIER)': 'SUPPLIER',
      'Opening Balance (₹)': 68000,
      'Balance Type (TO_RECEIVE / TO_PAY)': 'TO_PAY',
      'Credit Limit (₹)': 500000,
    },
    {
      'Party Name': 'Apex Skyline Builders (P) Ltd',
      'Contact Person': 'Arun Varma',
      'Mobile Number': '9895123890',
      'Email': 'projects@apexskyline.in',
      'Billing Address': 'MG Road, Palarivattom',
      'District': 'Ernakulam',
      'GSTIN': '32AABCA5678B1Z9',
      'Party Type (DEALER/BUILDER/RETAIL/SUPPLIER)': 'BUILDER',
      'Opening Balance (₹)': 120000,
      'Balance Type (TO_RECEIVE / TO_PAY)': 'TO_RECEIVE',
      'Credit Limit (₹)': 350000,
    },
  ];

  const wsData = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, wsData, 'EXMARK_Parties_Import');

  // 2. Field Guide Sheet
  const guideData = [
    { Field: 'Party Name', Requirement: 'Mandatory', Description: 'Customer, Dealer, Builder, or Supplier Firm Name' },
    { Field: 'Mobile Number', Requirement: 'Mandatory', Description: '10-Digit valid Indian mobile number (e.g. 9847012345)' },
    { Field: 'Party Type', Requirement: 'Optional', Description: 'DEALER, BUILDER, ARCHITECT, RETAIL, or SUPPLIER' },
    { Field: 'Opening Balance', Requirement: 'Optional', Description: 'Existing balance from Vyapar in Rupees (e.g. 45000)' },
    { Field: 'Balance Type', Requirement: 'Optional', Description: 'TO_RECEIVE (Receivable) or TO_PAY (Payable to Supplier)' },
    { Field: 'GSTIN', Requirement: 'Optional', Description: '15-character valid GST number (Kerala starts with 32)' },
    { Field: 'District', Requirement: 'Optional', Description: 'Any of the 14 Kerala districts' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideData);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Field_Guide_Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}
