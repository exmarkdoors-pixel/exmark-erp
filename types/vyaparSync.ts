// ── Vyapar App & Universal Bulk Party Import Types ──────────────────────────

import { CustomerType } from '@/lib/services/customerService';

export interface VyaparRawPartyRow {
  partyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  state?: string;
  district?: string;
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'DEALER' | 'BUILDER' | 'RETAIL' | string;
  openingBalance?: number | string;
  balanceType?: 'TO_RECEIVE' | 'TO_PAY' | 'DEBIT' | 'CREDIT' | string;
  creditLimit?: number | string;
  [key: string]: unknown;
}

export interface PartyImportFieldMapping {
  partyName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress?: string;
  gstin?: string;
  district?: string;
  partyType?: string;
  openingBalance?: string;
  balanceType?: string;
  creditLimit?: string;
}

export interface NormalizedPartyImportRecord {
  id: string;
  name: string;
  firmName?: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  district: string;
  town: string;
  type: CustomerType;
  isSupplier: boolean;
  openingBalance: number;
  balanceType: 'TO_RECEIVE' | 'TO_PAY';
  creditLimit: number;
  status: 'ACTIVE';
  validationErrors: string[];
}

export type PartyDuplicateStrategy = 'SKIP' | 'UPDATE_MERGE' | 'CREATE_NEW';

export interface PartyImportExecutionOptions {
  duplicateStrategy: PartyDuplicateStrategy;
  defaultCustomerType: CustomerType;
  postOpeningBalancesToLedger: boolean;
  defaultDistrict?: string;
  importAsSuppliers?: boolean;
}

export interface PartyImportSummary {
  totalRowsProcessed: number;
  importedCustomers: number;
  importedSuppliers: number;
  updatedExistingCount: number;
  skippedDuplicatesCount: number;
  openingBalancesPostedCount: number;
  errorsCount: number;
  errorDetails: Array<{ row: number; name: string; error: string }>;
}
