/**
 * EXMARK ERP — Vyapar App & Universal Bulk Party Parser Utilities
 * Pure client-safe parsing, phone normalization, GSTIN cleaning,
 * Kerala district detection, and header auto-mapping.
 * Safe to import in both Client and Server components.
 */

import { CustomerType } from './customerService';
import {
  NormalizedPartyImportRecord,
  PartyImportFieldMapping,
} from '@/types/vyaparSync';

export const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

/**
 * Normalizes an Indian phone number to exactly 10 digits
 */
export function normalizePhone10(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10);
}

/**
 * Normalizes and validates an Indian GSTIN (15 characters)
 */
export function validateAndCleanGstin(rawGstin?: string): { gstin: string | null; isValid: boolean } {
  if (!rawGstin) return { gstin: null, isValid: true };
  const cleaned = String(rawGstin).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 0) return { gstin: null, isValid: true };
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isValid = gstinRegex.test(cleaned);
  return { gstin: cleaned, isValid };
}

/**
 * Matches Town or Address against Kerala 14 Districts
 */
export function detectKeralaDistrict(addressOrTown?: string, fallback = 'Malappuram'): string {
  if (!addressOrTown) return fallback;
  const lower = addressOrTown.toLowerCase();
  for (const d of KERALA_DISTRICTS) {
    if (lower.includes(d.toLowerCase())) return d;
  }
  // Common Kerala industrial clusters mapping
  if (lower.includes('cochin') || lower.includes('kochi') || lower.includes('aluva') || lower.includes('angamaly')) return 'Ernakulam';
  if (lower.includes('calicut') || lower.includes('feroke') || lower.includes('pantheerankavu')) return 'Kozhikode';
  if (lower.includes('trivandrum') || lower.includes('kazhakootam')) return 'Thiruvananthapuram';
  if (lower.includes('manjeri') || lower.includes('perinthalmanna') || lower.includes('tirur') || lower.includes('edappal')) return 'Malappuram';
  if (lower.includes('palghat') || lower.includes('ottapalam')) return 'Palakkad';
  if (lower.includes('chalakudy') || lower.includes('guruvayur') || lower.includes('kunnamkulam')) return 'Thrissur';

  return fallback;
}

/**
 * Automatically inspects headers from a Vyapar or generic spreadsheet and creates mapping
 */
export function detectVyaparHeaderMapping(headers: string[]): PartyImportFieldMapping {
  const mapping: PartyImportFieldMapping = {
    partyName: '',
    phone: '',
  };

  const cleanMap = headers.map((h) => ({
    original: h,
    lower: h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''),
  }));

  for (const h of cleanMap) {
    // Party Name
    if (!mapping.partyName) {
      if (
        h.lower.includes('partyname') ||
        h.lower.includes('customername') ||
        h.lower.includes('suppliername') ||
        h.lower === 'party' ||
        h.lower === 'name' ||
        h.lower === 'client'
      ) {
        mapping.partyName = h.original;
        continue;
      }
    }

    // Phone / Mobile
    if (!mapping.phone) {
      if (
        h.lower.includes('phone') ||
        h.lower.includes('mobile') ||
        h.lower.includes('contact') ||
        h.lower.includes('phno') ||
        h.lower.includes('cell')
      ) {
        mapping.phone = h.original;
        continue;
      }
    }

    // Email
    if (!mapping.email && (h.lower.includes('email') || h.lower.includes('mail'))) {
      mapping.email = h.original;
      continue;
    }

    // Address
    if (!mapping.billingAddress && (h.lower.includes('address') || h.lower.includes('billing') || h.lower.includes('location'))) {
      mapping.billingAddress = h.original;
      continue;
    }

    // GSTIN
    if (!mapping.gstin && (h.lower.includes('gst') || h.lower.includes('tin') || h.lower.includes('taxno'))) {
      mapping.gstin = h.original;
      continue;
    }

    // District / State
    if (!mapping.district && (h.lower.includes('district') || h.lower.includes('state') || h.lower.includes('city') || h.lower.includes('town'))) {
      mapping.district = h.original;
      continue;
    }

    // Party Type
    if (!mapping.partyType && (h.lower.includes('partytype') || h.lower.includes('customertype') || h.lower.includes('type') || h.lower.includes('role'))) {
      mapping.partyType = h.original;
      continue;
    }

    // Opening Balance
    if (!mapping.openingBalance && (h.lower.includes('openingbalance') || h.lower.includes('openbal') || h.lower.includes('balance') || h.lower.includes('bal'))) {
      mapping.openingBalance = h.original;
      continue;
    }

    // Balance Type (To Receive / To Pay)
    if (!mapping.balanceType && (h.lower.includes('balancetype') || h.lower.includes('toreceive') || h.lower.includes('topay') || h.lower.includes('drcr'))) {
      mapping.balanceType = h.original;
      continue;
    }

    // Credit Limit
    if (!mapping.creditLimit && (h.lower.includes('creditlimit') || h.lower.includes('limit'))) {
      mapping.creditLimit = h.original;
      continue;
    }
  }

  // Fallback for Party Name and Phone if not matched
  if (!mapping.partyName && headers.length > 0) mapping.partyName = headers[0];
  if (!mapping.phone && headers.length > 1) mapping.phone = headers[1];

  return mapping;
}

/**
 * Normalizes a single row into a validated NormalizedPartyImportRecord
 */
export function normalizeVyaparRow(
  row: Record<string, string>,
  mapping: PartyImportFieldMapping,
  defaultCustomerType: CustomerType = 'DEALER',
  defaultDistrict = 'Malappuram',
  rowIndex = 1
): NormalizedPartyImportRecord {
  const errors: string[] = [];

  const rawName = String(row[mapping.partyName] || '').trim();
  if (!rawName) {
    errors.push(`Row ${rowIndex}: Missing Party Name`);
  }

  const rawPhone = String(mapping.phone ? row[mapping.phone] : '').trim();
  const phone10 = normalizePhone10(rawPhone);
  if (!phone10 || phone10.length !== 10) {
    errors.push(`Row ${rowIndex}: Invalid Phone Number "${rawPhone}"`);
  }

  const rawGstin = mapping.gstin ? String(row[mapping.gstin] || '').trim() : undefined;
  const { gstin, isValid: isGstValid } = validateAndCleanGstin(rawGstin);
  if (!isGstValid) {
    errors.push(`Row ${rowIndex}: Invalid GSTIN format "${rawGstin}"`);
  }

  const rawAddress = mapping.billingAddress ? String(row[mapping.billingAddress] || '').trim() : '';
  const rawDistrict = mapping.district ? String(row[mapping.district] || '').trim() : '';
  const district = detectKeralaDistrict(`${rawDistrict} ${rawAddress}`, defaultDistrict);

  // Classify Party Type
  let type: CustomerType = defaultCustomerType;
  let isSupplier = false;
  if (mapping.partyType && row[mapping.partyType]) {
    const pt = String(row[mapping.partyType]).toUpperCase().trim();
    if (pt.includes('SUPPLIER') || pt.includes('VENDOR')) {
      isSupplier = true;
    } else if (pt.includes('BUILDER') || pt.includes('CONTRACTOR')) {
      type = 'BUILDER';
    } else if (pt.includes('ARCHITECT')) {
      type = 'ARCHITECT';
    } else if (pt.includes('RETAIL') || pt.includes('DIRECT') || pt.includes('INDIVIDUAL')) {
      type = 'RETAIL';
    } else {
      type = 'DEALER';
    }
  }

  // Parse Opening Balance
  let openingBalance = 0;
  if (mapping.openingBalance && row[mapping.openingBalance]) {
    const rawBal = String(row[mapping.openingBalance]).replace(/[^0-9.-]/g, '');
    const num = parseFloat(rawBal);
    if (!isNaN(num)) openingBalance = Math.abs(num);
  }

  let balanceType: 'TO_RECEIVE' | 'TO_PAY' = isSupplier ? 'TO_PAY' : 'TO_RECEIVE';
  if (mapping.balanceType && row[mapping.balanceType]) {
    const bt = String(row[mapping.balanceType]).toUpperCase().trim();
    if (bt.includes('PAY') || bt.includes('CR') || bt.includes('CREDIT')) {
      balanceType = 'TO_PAY';
    } else {
      balanceType = 'TO_RECEIVE';
    }
  }

  // Parse Credit Limit
  let creditLimit = 100000;
  if (mapping.creditLimit && row[mapping.creditLimit]) {
    const rawCl = String(row[mapping.creditLimit]).replace(/[^0-9.]/g, '');
    const num = parseFloat(rawCl);
    if (!isNaN(num) && num > 0) creditLimit = num;
  }

  return {
    id: `vyapar-imp-${Date.now()}-${rowIndex}`,
    name: rawName,
    firmName: rawName,
    phone: phone10 || rawPhone,
    email: mapping.email ? String(row[mapping.email] || '').trim() : undefined,
    address: rawAddress,
    gstin: gstin || undefined,
    district,
    town: rawAddress ? rawAddress.split(',')[0].trim() : district,
    type,
    isSupplier,
    openingBalance,
    balanceType,
    creditLimit,
    status: 'ACTIVE',
    validationErrors: errors,
  };
}

export const normalizeVyaparPartyRow = normalizeVyaparRow;
