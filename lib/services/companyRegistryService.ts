import fs from 'fs';
import path from 'path';
import {
  COMPANIES_REGISTRY_FILENAME,
  DEFAULT_COMPANY_ID,
  getCompanyDataDir,
  getRootDataDir,
  invalidateActiveCompanyCache,
  writeJsonSafe,
} from '@/lib/utils/dataPaths';
import type {
  CompanyBusinessType,
  CompanyRegistryStore,
  CompanySummary,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '@/types/companyRegistry';
import { DEFAULT_COMPANY_BANK_DETAILS, DEFAULT_COMPANY_PROFILE, type CompanyProfile } from '@/types/companyProfile';
import { DEFAULT_ERP_CONFIG } from './customizationService';

function getRegistryPath(): string {
  return path.join(getRootDataDir(), COMPANIES_REGISTRY_FILENAME);
}

function defaultFinancialYearStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

function readExistingDefaultProfile(): Partial<CompanyProfile> | null {
  try {
    const customPath = path.join(getRootDataDir(), 'customization-store.json');
    if (!fs.existsSync(customPath)) return null;
    const raw = JSON.parse(fs.readFileSync(customPath, 'utf8'));
    return raw?.active?.companyProfile || raw?.companyProfile || null;
  } catch {
    return null;
  }
}

function buildDefaultCompanySummary(): CompanySummary {
  const existing = readExistingDefaultProfile();
  const now = new Date().toISOString();
  return {
    id: DEFAULT_COMPANY_ID,
    legalName: existing?.registeredCompanyName || DEFAULT_COMPANY_PROFILE.registeredCompanyName,
    brandName: existing?.brandName || DEFAULT_COMPANY_PROFILE.brandName,
    businessType: 'Door Manufacturing',
    financialYearStart: defaultFinancialYearStart(),
    phone: existing?.phone || DEFAULT_COMPANY_PROFILE.phone,
    email: existing?.email || DEFAULT_COMPANY_PROFILE.email,
    district: existing?.registeredOffice?.district || 'Ernakulam',
    state: existing?.registeredOffice?.state || 'Kerala',
    address: existing?.registeredOffice?.addressLine1 || DEFAULT_COMPANY_PROFILE.registeredOffice.addressLine1,
    gstEnabled: false,
    gstin: existing?.gstin || '',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function readCompanyRegistry(): CompanyRegistryStore {
  const regPath = getRegistryPath();
  if (!fs.existsSync(regPath)) {
    const initial: CompanyRegistryStore = {
      version: 1,
      activeCompanyId: DEFAULT_COMPANY_ID,
      companies: [buildDefaultCompanySummary()],
      updatedAt: new Date().toISOString(),
    };
    writeJsonSafe(regPath, initial);
    invalidateActiveCompanyCache();
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(regPath, 'utf8')) as Partial<CompanyRegistryStore>;
    const companies =
      Array.isArray(parsed.companies) && parsed.companies.length > 0
        ? parsed.companies
        : [buildDefaultCompanySummary()];
    const hasDefault = companies.some((c) => c.id === DEFAULT_COMPANY_ID);
    if (!hasDefault) {
      companies.unshift(buildDefaultCompanySummary());
    }
    const activeCompanyId =
      parsed.activeCompanyId && companies.some((c) => c.id === parsed.activeCompanyId)
        ? parsed.activeCompanyId
        : DEFAULT_COMPANY_ID;
    return {
      version: parsed.version || 1,
      activeCompanyId,
      companies,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    const fallback: CompanyRegistryStore = {
      version: 1,
      activeCompanyId: DEFAULT_COMPANY_ID,
      companies: [buildDefaultCompanySummary()],
      updatedAt: new Date().toISOString(),
    };
    writeJsonSafe(regPath, fallback);
    invalidateActiveCompanyCache();
    return fallback;
  }
}

function saveCompanyRegistry(store: CompanyRegistryStore): void {
  store.updatedAt = new Date().toISOString();
  writeJsonSafe(getRegistryPath(), store);
  invalidateActiveCompanyCache();
}

export function listCompanies(): {
  activeCompanyId: string;
  activeCompany: CompanySummary;
  companies: CompanySummary[];
} {
  const reg = readCompanyRegistry();
  const activeCompany = reg.companies.find((c) => c.id === reg.activeCompanyId) || reg.companies[0];
  return {
    activeCompanyId: activeCompany.id,
    activeCompany,
    companies: reg.companies,
  };
}

function slugifyId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 6);
  return `comp-${slug || 'unit'}-${rand}`;
}

function initializeCompanyVault(company: CompanySummary, input: CreateCompanyInput): void {
  const companyDir = getCompanyDataDir(company.id);
  fs.mkdirSync(companyDir, { recursive: true });

  const now = new Date().toISOString();
  const addressObj = {
    addressLine1: input.address?.trim() || `${company.brandName} Main Office`,
    addressLine2: '',
    district: company.district || 'Malappuram',
    state: company.state || 'Kerala',
    pinCode: '',
    country: 'India',
  };

  const companyProfile: CompanyProfile = {
    ...DEFAULT_COMPANY_PROFILE,
    registeredCompanyName: company.legalName,
    brandName: company.brandName,
    phone: company.phone || '',
    email: company.email || '',
    gstin: company.gstEnabled ? company.gstin || '' : '',
    panNumber: '',
    cinNumber: '',
    website: '',
    registeredOffice: addressObj,
    corporateOffice: addressObj,
    billingAddress: addressObj,
    warehouseLocation: { ...addressObj, addressLine1: `${company.brandName} Warehouse & Dispatch` },
    factories: [
      {
        id: 'fac-main',
        name: `${company.brandName} Primary Unit`,
        code: 'UNIT-01',
        isDefault: true,
        status: 'Operational',
        address: addressObj,
        manufacturingLocation: `${company.district || 'Kerala'} Main Unit`,
        warehouseLocation: `${company.brandName} Store`,
        phone: company.phone || '',
        email: company.email || '',
        plantManager: 'Operations Lead',
        hydraulicPressLines: 4,
        pressCapacityPerDay: 20,
        notes: `Initialized ${company.businessType} facility.`,
      },
    ],
    defaultFactoryId: 'fac-main',
    bankDetails: {
      ...DEFAULT_COMPANY_BANK_DETAILS,
      accountName: company.legalName,
      bankName: input.bankName?.trim() || '',
      accountNumber: input.accountNumber?.trim() || '',
      ifsc: input.ifscCode?.trim().toUpperCase() || '',
      upiId: input.upiId?.trim() || '',
    },
    lastUpdated: now,
    updatedBy: 'Company Creation Wizard',
  };

  // Seed clean customization-store.json with full DEFAULT_ERP_CONFIG + this company's own profile
  const customStorePath = path.join(companyDir, 'customization-store.json');
  const activeConfig = {
    ...DEFAULT_ERP_CONFIG,
    version: 1,
    lastUpdated: now,
    updatedBy: 'Company Creation Wizard',
    companyProfile,
    pdfLayouts: {
      ...DEFAULT_ERP_CONFIG.pdfLayouts,
      headerLogoText: `${company.brandName} • ${company.businessType}`,
      plantAddress: `${addressObj.addressLine1}${addressObj.district ? `, ${addressObj.district}` : ''}${addressObj.state ? `, ${addressObj.state}` : ''}`,
    },
  };
  writeJsonSafe(customStorePath, {
    active: activeConfig,
    draft: activeConfig,
    revisions: [
      {
        id: `rev-init-${Date.now()}`,
        version: 1,
        publishedAt: now,
        publishedBy: 'Company Creation Wizard',
        changelog: `Created company "${company.legalName}" (${company.brandName}).`,
        configSnapshot: activeConfig,
      },
    ],
  });

  // Seed clean empty stores so new company starts with 0 records (never inherits default company data)
  const emptyListStores = [
    'customers-store.json',
    'crm-leads-store.json',
    'quotations-store.json',
    'measurements-store.json',
    'orders-store.json',
    'production-orders.json',
    'inventory-store.json',
    'purchases-store.json',
    'qc-inspections-store.json',
    'job-work-challans-store.json',
    'gate-passes-store.json',
    'daily-closing-store.json',
    'contractors-store.json',
  ];
  for (const filename of emptyListStores) {
    const filePath = path.join(/*turbopackIgnore: true*/ companyDir, filename);
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      writeJsonSafe(filePath, []);
    }
  }

  // Initialize accounting settings (gstEnabled) inside the new company's accounting ledger store
  const accPath = path.join(companyDir, 'accounting-ledger-store.json');
  if (!fs.existsSync(accPath)) {
    writeJsonSafe(accPath, {
      version: 1,
      settings: { gstEnabled: Boolean(company.gstEnabled) },
      accounts: [],
      expenseCategories: [],
      cashBankAccounts: [],
      salesInvoices: [],
      paymentsIn: [],
      creditNotes: [],
      otherIncomes: [],
      purchaseBills: [],
      paymentsOut: [],
      expenses: [],
      contraTransfers: [],
      journals: [],
      updatedAt: now,
    });
  }
}

export function createCompany(input: CreateCompanyInput): {
  company: CompanySummary;
  activeCompanyId: string;
  companies: CompanySummary[];
} {
  const legalName = String(input.legalName || '').trim();
  const brandName = String(input.brandName || '').trim() || legalName;
  if (!legalName) throw new Error('Company Legal Name is required.');

  const reg = readCompanyRegistry();
  if (reg.companies.some((c) => c.legalName.toLowerCase() === legalName.toLowerCase())) {
    throw new Error(`A company named "${legalName}" already exists.`);
  }

  const now = new Date().toISOString();
  const company: CompanySummary = {
    id: slugifyId(brandName),
    legalName,
    brandName,
    businessType: (input.businessType as CompanyBusinessType) || 'Door Manufacturing',
    financialYearStart: input.financialYearStart?.trim() || defaultFinancialYearStart(),
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    district: input.district?.trim() || 'Malappuram',
    state: input.state?.trim() || 'Kerala',
    address: input.address?.trim() || '',
    gstEnabled: Boolean(input.gstEnabled ?? false),
    gstin: input.gstEnabled ? input.gstin?.trim().toUpperCase() || '' : '',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  initializeCompanyVault(company, input);

  reg.companies.push(company);
  if (input.switchImmediately !== false) {
    reg.activeCompanyId = company.id;
  }
  saveCompanyRegistry(reg);

  return {
    company,
    activeCompanyId: reg.activeCompanyId,
    companies: reg.companies,
  };
}

export function switchActiveCompany(companyId: string): {
  activeCompanyId: string;
  activeCompany: CompanySummary;
  companies: CompanySummary[];
} {
  const reg = readCompanyRegistry();
  const target = reg.companies.find((c) => c.id === companyId);
  if (!target) {
    throw new Error('Selected company was not found.');
  }
  reg.activeCompanyId = target.id;
  saveCompanyRegistry(reg);
  return {
    activeCompanyId: target.id,
    activeCompany: target,
    companies: reg.companies,
  };
}

export function updateCompanyMeta(companyId: string, patch: UpdateCompanyInput): CompanySummary {
  const reg = readCompanyRegistry();
  const idx = reg.companies.findIndex((c) => c.id === companyId);
  if (idx < 0) throw new Error('Company not found.');

  const existing = reg.companies[idx];
  const updated: CompanySummary = {
    ...existing,
    legalName: patch.legalName !== undefined ? String(patch.legalName).trim() || existing.legalName : existing.legalName,
    brandName: patch.brandName !== undefined ? String(patch.brandName).trim() || existing.brandName : existing.brandName,
    businessType: patch.businessType || existing.businessType,
    financialYearStart: patch.financialYearStart || existing.financialYearStart,
    phone: patch.phone !== undefined ? patch.phone.trim() : existing.phone,
    email: patch.email !== undefined ? patch.email.trim() : existing.email,
    district: patch.district !== undefined ? patch.district.trim() : existing.district,
    state: patch.state !== undefined ? patch.state.trim() : existing.state,
    address: patch.address !== undefined ? patch.address.trim() : existing.address,
    gstEnabled: patch.gstEnabled !== undefined ? Boolean(patch.gstEnabled) : existing.gstEnabled,
    gstin: patch.gstin !== undefined ? patch.gstin.trim().toUpperCase() : existing.gstin,
    updatedAt: new Date().toISOString(),
  };
  reg.companies[idx] = updated;
  saveCompanyRegistry(reg);

  // Also sync gstEnabled into that company's accounting-ledger-store.json if it exists
  try {
    const accPath = path.join(getCompanyDataDir(companyId), 'accounting-ledger-store.json');
    if (fs.existsSync(accPath)) {
      const raw = JSON.parse(fs.readFileSync(accPath, 'utf8'));
      raw.settings = { ...(raw.settings || {}), gstEnabled: updated.gstEnabled };
      writeJsonSafe(accPath, raw);
    }
  } catch {
    // Non-fatal
  }

  return updated;
}

export function deleteCompany(companyId: string): { deletedId: string; legalName: string } {
  const reg = readCompanyRegistry();
  if (companyId === DEFAULT_COMPANY_ID) {
    throw new Error('The primary default company cannot be deleted.');
  }
  if (reg.activeCompanyId === companyId) {
    throw new Error('Switch to another company first before deleting the active company.');
  }
  const target = reg.companies.find((c) => c.id === companyId);
  if (!target) throw new Error('Company not found.');

  reg.companies = reg.companies.filter((c) => c.id !== companyId);
  saveCompanyRegistry(reg);

  // Remove isolated company folder cleanly
  try {
    const dir = getCompanyDataDir(companyId);
    const rootDir = getRootDataDir();
    if (path.resolve(dir) !== path.resolve(rootDir) && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors if locked
  }

  return { deletedId: target.id, legalName: target.legalName };
}
