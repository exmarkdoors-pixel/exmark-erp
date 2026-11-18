export type CompanyBusinessType =
  | 'Door Manufacturing'
  | 'Trading & Wholesale'
  | 'Hardware & Plywood'
  | 'Interior & Contracting'
  | 'General Business';

export interface CompanySummary {
  id: string; // 'comp-default' or 'comp-<slug>-<rand>'
  legalName: string;
  brandName: string;
  businessType: CompanyBusinessType;
  financialYearStart: string; // e.g. '2026-04-01'
  phone?: string;
  email?: string;
  district?: string;
  state?: string;
  address?: string;
  gstEnabled: boolean;
  gstin?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRegistryStore {
  version: number;
  activeCompanyId: string;
  companies: CompanySummary[];
  updatedAt: string;
}

export interface CreateCompanyInput {
  legalName: string;
  brandName: string;
  businessType?: CompanyBusinessType;
  financialYearStart?: string;
  phone?: string;
  email?: string;
  district?: string;
  state?: string;
  address?: string;
  gstEnabled?: boolean;
  gstin?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  switchImmediately?: boolean;
}

export interface UpdateCompanyInput {
  legalName?: string;
  brandName?: string;
  businessType?: CompanyBusinessType;
  financialYearStart?: string;
  phone?: string;
  email?: string;
  district?: string;
  state?: string;
  address?: string;
  gstEnabled?: boolean;
  gstin?: string;
}
