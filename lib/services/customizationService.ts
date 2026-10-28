import fs from 'fs';
import path from 'path';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE, FactoryProfile } from '@/types/companyProfile';

export interface DynamicFieldDef {
  id: string;
  module: 'measurements' | 'customers' | 'orders' | 'production' | 'finance';
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'dropdown' | 'boolean';
  options?: string[];
  isRequired: boolean;
  isActive: boolean;
}

export interface ERPConfiguration {
  version: number;
  lastUpdated: string;
  updatedBy: string;

  // 0. Company & Factory Profile
  companyProfile: CompanyProfile;

  // 1. Product Categories
  categories: {
    frp: { id: string; name: string; enabled: boolean; isDefault: boolean; immutable: boolean };
    wpc: { id: string; name: string; enabled: boolean; isDefault: boolean; immutable: boolean };
    customCategories: Array<{ id: string; name: string; enabled: boolean; isDefault: boolean }>;
  };

  // 2. Dynamic Fields
  dynamicFields: DynamicFieldDef[];

  // 3. Dropdown Options Master
  dropdownOptions: {
    doorModels: string[];
    frameTypes: string[];
    colours: string[];
    hingeSides: string[];
    lockTypes: string[];
  };

  // 4. Document Numbering
  documentNumbering: {
    measurements: { prefix: string; yearDigits: number; padding: number };
    quotations: { prefix: string; yearDigits: number; padding: number };
    orders: { prefix: string; yearDigits: number; padding: number };
    invoices: { prefix: string; yearDigits: number; padding: number };
    payments: { prefix: string; yearDigits: number; padding: number };
    jobCards: { prefix: string; yearDigits: number; padding: number };
    doors: { prefix: string; yearDigits: number; padding: number };
    warranty: { prefix: string; yearDigits: number; padding: number };
  };

  // 5. Order Statuses
  orderStatuses: Array<{
    code: string;
    label: string;
    color: string;
    description: string;
    isFinal: boolean;
  }>;

  // 6. Workflow Rules
  workflowRules: {
    requireMeasurementBeforeCutting: boolean;
    requireAdvanceBeforeProduction: boolean;
    minimumAdvancePercentage: number;
    requireCustomerConfirmationBeforeQuotation: boolean;
    autoLockIssuedInvoices: boolean;
  };

  // 7. Approval Thresholds
  approvalThresholds: {
    maxSalesDiscountPercentage: number;
    highValueOrderThreshold: number;
    creditLimitThreshold: number;
    managerOverrideReasonMandatory: boolean;
  };

  // 8. Frame and Cutting Tolerances (Deterministic, never invented)
  frameAndCuttingSettings: {
    frpHeightDeductionMm: number;
    frpWidthDeductionMm: number;
    wpcHeightDeductionMm: number;
    wpcWidthDeductionMm: number;
    graniteSubframeOffsetMm: number;
    allowNegativeDimensions: boolean;
  };

  // 9. Price Lists
  priceLists: {
    baseFrpRatePerSqFt: number;
    baseWpcRatePerSqFt: number;
    cncCarvingSurchargePerSqFt: number;
    digitalLockRoutingPrepCharge: number;
    standardInstallationChargePerDoor: number;
    currency: string;
  };

  // 10. GST Configuration
  gstConfig: {
    companyName: string;
    gstin: string;
    hsnCode: string;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    stateCode: string;
    eWayBillThreshold: number;
  };

  // 11. Financial Targets
  financialTargets: {
    monthlyRevenueTarget: number;
    monthlyCollectionsTarget: number;
    monthlyFrpDoorsTarget: number;
    minGrossMarginPercentage: number;
  };

  // 12. Report Templates
  reportTemplates: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    defaultInterval: string;
  }>;

  // 13. PDF Layouts
  pdfLayouts: {
    headerLogoText: string;
    plantAddress: string;
    contactPhone: string;
    contactEmail: string;
    includeQrCode: boolean;
    showBilingualKeralaCare: boolean;
    authorizedSignatoryTitle: string;
  };

  // 14. Warranty Policies
  warrantyPolicies: {
    frpWarrantyYears: number;
    wpcWarrantyYears: number;
    coveredComponents: string;
    excludedComponents: string;
    mandatoryAnnualInspection: boolean;
  };

  // 15. Notification Templates
  notificationTemplates: {
    quotationSent: string;
    advanceReceived: string;
    dispatchScheduled: string;
    installationComplete: string;
  };

  // 16. WhatsApp Sending Rules
  whatsappSendingRules: {
    autoSendMeasurementConfirmation: boolean;
    autoSendDispatchNotification: boolean;
    autoSendWarrantyCertificate: boolean;
    confirmationLinkExpiryHours: number;
    bilingualMalayalam: boolean;
  };

  // 17. Employee Roles & Permissions Matrix
  employeeRoles: Array<{
    roleName: string;
    description: string;
    allowedModules: string[];
    canApproveProduction: boolean;
    canAuthorizeFinance: boolean;
    canManageUsers: boolean;
    canPublishSettings: boolean;
  }>;
}

export interface ConfigurationRevision {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  changelog: string;
  configSnapshot: ERPConfiguration;
}

export interface CustomizationStore {
  active: ERPConfiguration;
  draft: ERPConfiguration;
  revisions: ConfigurationRevision[];
}

const STORE_PATH = path.join(process.cwd(), 'data', 'customization-store.json');

// Default initial ERP configuration
export const DEFAULT_ERP_CONFIG: ERPConfiguration = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'Nazer Karumban (Super Admin)',

  // 0. Company & Factory Profile
  companyProfile: DEFAULT_COMPANY_PROFILE,

  // 1. Product Categories (FRP enabled immutable, WPC optional OFF)
  categories: {
    frp: {
      id: 'cat-frp-01',
      name: 'FRP Doors (Fiberglass Reinforced Polymer)',
      enabled: true,
      isDefault: true,
      immutable: true,
    },
    wpc: {
      id: 'cat-wpc-02',
      name: 'WPC Doors (Wood Plastic Composite)',
      enabled: false,
      isDefault: false,
      immutable: false,
    },
    customCategories: [],
  },

  // 2. Dynamic Fields
  dynamicFields: [
    {
      id: 'df-01',
      module: 'measurements',
      fieldKey: 'subframeOffset',
      fieldLabel: 'Subframe Granite Offset (mm)',
      fieldType: 'number',
      isRequired: false,
      isActive: true,
    },
    {
      id: 'df-02',
      module: 'customers',
      fieldKey: 'siteEngineerMobile',
      fieldLabel: 'Site Engineer Mobile #2',
      fieldType: 'text',
      isRequired: false,
      isActive: true,
    },
    {
      id: 'df-03',
      module: 'orders',
      fieldKey: 'projectPhase',
      fieldLabel: 'Building Phase / Block',
      fieldType: 'text',
      isRequired: false,
      isActive: true,
    },
  ],

  // 3. Dropdown Options
  dropdownOptions: {
    doorModels: [
      'FRP Molded Teak (32mm) - 100% Waterproof',
      'FRP CNC Carved Luxury Main Door (35mm with Inlay)',
      'Commercial Fire-Retardant FRP Door (38mm)',
      'Solid Hybrid Weather-Shield Exterior Door (35mm)',
      'WPC Solid Waterproof Bathroom Door (30mm)',
      'WPC Heavy Frame & Shutter Combination (32mm)',
    ],
    frameTypes: [
      'WPC Solid Extruded 100x65mm Frame',
      'FRP Wrap-Around Monolithic Frame',
      'Granite Subframe (Tile / Marble Rebate)',
      'Existing Wooden Rebate Refit',
      'No Frame (Shutter Only - Pre-hung)',
    ],
    colours: [
      'Burma Teak (Woodgrain PU)',
      'Frost White (High Gloss Waterproof)',
      'Natural Teak Gold (Matte UV)',
      'Walnut Dark Brown',
      'Rosewood Classical Kerala Finish',
      'Mahogany Antique',
    ],
    hingeSides: [
      'Left Hand (LH) - Inward',
      'Right Hand (RH) - Inward',
      'Left Hand Reverse (LHR)',
      'Right Hand Reverse (RHR)',
    ],
    lockTypes: [
      'Mortise Lock 60mm Backset with Brass Handles',
      'Bathroom Baby Latch / Coin-Turn Latch',
      'Cylindrical Knob Lock (SS 304)',
      'Digital Smart Lock Routing Prep',
      'Deadbolt & Tower Bolt Only',
    ],
  },

  // 4. Document Numbering
  documentNumbering: {
    measurements: { prefix: 'MSR', yearDigits: 4, padding: 4 },
    quotations: { prefix: 'QTN', yearDigits: 4, padding: 4 },
    orders: { prefix: 'ORD', yearDigits: 4, padding: 4 },
    invoices: { prefix: 'INV', yearDigits: 4, padding: 4 },
    payments: { prefix: 'RCT', yearDigits: 4, padding: 4 },
    jobCards: { prefix: 'JOB', yearDigits: 4, padding: 4 },
    doors: { prefix: 'EXM-DR', yearDigits: 4, padding: 4 },
    warranty: { prefix: 'EXM-WRN', yearDigits: 4, padding: 4 },
  },

  // 5. Order Statuses
  orderStatuses: [
    { code: 'DRAFT', label: 'Draft', color: 'amber', description: 'Created by sales executive', isFinal: false },
    { code: 'AWAITING_ADVANCE', label: 'Awaiting Advance', color: 'blue', description: 'Quotation accepted, waiting for 40% deposit', isFinal: false },
    { code: 'PAYMENT_VERIFIED', label: 'Payment Verified', color: 'emerald', description: 'Advance payment reconciled by Accounts', isFinal: false },
    { code: 'CONFIRMED', label: 'Confirmed', color: 'indigo', description: 'Verified dimensions and advance confirmed', isFinal: false },
    { code: 'IN_PRODUCTION', label: 'In Production', color: 'purple', description: 'Job card active on CNC/press line', isFinal: false },
    { code: 'READY_TO_DISPATCH', label: 'Ready to Dispatch', color: 'teal', description: 'Packed with barcode stickers attached', isFinal: false },
    { code: 'DELIVERED', label: 'Delivered', color: 'emerald', description: 'Delivered and signed off on site', isFinal: true },
    { code: 'CANCELLED', label: 'Cancelled', color: 'rose', description: 'Order voided with mandatory reason', isFinal: true },
  ],

  // 6. Workflow Rules
  workflowRules: {
    requireMeasurementBeforeCutting: true,
    requireAdvanceBeforeProduction: true,
    minimumAdvancePercentage: 40,
    requireCustomerConfirmationBeforeQuotation: false,
    autoLockIssuedInvoices: true,
  },

  // 7. Approval Thresholds
  approvalThresholds: {
    maxSalesDiscountPercentage: 15,
    highValueOrderThreshold: 500000,
    creditLimitThreshold: 200000,
    managerOverrideReasonMandatory: true,
  },

  // 8. Frame & Cutting Deductions
  frameAndCuttingSettings: {
    frpHeightDeductionMm: 10,
    frpWidthDeductionMm: 8,
    wpcHeightDeductionMm: 12,
    wpcWidthDeductionMm: 10,
    graniteSubframeOffsetMm: 12,
    allowNegativeDimensions: false,
  },

  // 9. Price Lists
  priceLists: {
    baseFrpRatePerSqFt: 265,
    baseWpcRatePerSqFt: 290,
    cncCarvingSurchargePerSqFt: 75,
    digitalLockRoutingPrepCharge: 450,
    standardInstallationChargePerDoor: 650,
    currency: 'INR',
  },

  // 10. GST Configuration
  gstConfig: {
    companyName: 'EXMARK DOORS PRIVATE LIMITED',
    gstin: '32AABCE1234F1Z5',
    hsnCode: '3925.20.00',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    stateCode: '32',
    eWayBillThreshold: 50000,
  },

  // 11. Financial Targets
  financialTargets: {
    monthlyRevenueTarget: 7500000,
    monthlyCollectionsTarget: 6500000,
    monthlyFrpDoorsTarget: 450,
    minGrossMarginPercentage: 35,
  },

  // 12. Report Templates
  reportTemplates: [
    { id: 'rpt-dist', name: '14 Kerala Districts Sales Ledger', category: 'Sales', description: 'District breakdown across Kerala', defaultInterval: 'Monthly' },
    { id: 'rpt-eff', name: 'Factory Production Efficiency & Yield', category: 'Production', description: 'Daily molded units vs press capacity', defaultInterval: 'Weekly' },
    { id: 'rpt-aging', name: 'Dealer Receivables Aging Ledger', category: 'Finance', description: '30 / 60 / 90 day balance tracking', defaultInterval: 'Weekly' },
    { id: 'rpt-margin', name: 'FRP vs WPC Gross Margin Comparison', category: 'Management', description: 'Unit contribution margin analysis', defaultInterval: 'Monthly' },
  ],

  // 13. PDF Layouts
  pdfLayouts: {
    headerLogoText: 'EXMARK DOORS • Manufacturing Operations',
    plantAddress: 'Kerala Manufacturing Unit [Address Pending Configuration]',
    contactPhone: '+91 484 290 8800',
    contactEmail: 'sales@exmarkdoors.com',
    includeQrCode: true,
    showBilingualKeralaCare: true,
    authorizedSignatoryTitle: 'For EXMARK DOORS PRIVATE LIMITED — Authorized Signatory',
  },

  // 14. Warranty Policies
  warrantyPolicies: {
    frpWarrantyYears: 15,
    wpcWarrantyYears: 10,
    coveredComponents: 'FRP Door Slab & Monolithic Material Integrity (Zero water absorption, zero rot, termite-proof)',
    excludedComponents: 'Hinges, locks, handles, paint/PU topcoat weathering, civil building structural settlement',
    mandatoryAnnualInspection: true,
  },

  // 15. Notification Templates
  notificationTemplates: {
    quotationSent: 'Dear {customerName}, your EXMARK Door quotation {quoteNumber} for {doorsCount} doors totaling Rs.{totalAmount} is ready. View: {link}',
    advanceReceived: 'Received advance of Rs.{amount} for order {orderNumber}. Thank you for choosing EXMARK Doors.',
    dispatchScheduled: 'Your EXMARK Doors order {orderNumber} has been dispatched via vehicle {vehicleNumber}. Driver: {driverName} ({driverPhone}).',
    installationComplete: 'Installation for {doorsCount} doors at {siteName} completed with 5-star signoff. Warranty issued: {warrantyNumber}.',
  },

  // 16. WhatsApp Sending Rules
  whatsappSendingRules: {
    autoSendMeasurementConfirmation: true,
    autoSendDispatchNotification: true,
    autoSendWarrantyCertificate: true,
    confirmationLinkExpiryHours: 72,
    bilingualMalayalam: true,
  },

  // 17. Employee Roles & Permissions Matrix
  employeeRoles: [
    {
      roleName: 'Super Admin',
      description: 'Unrestricted enterprise control, user security, audit logs, and plant configuration.',
      allowedModules: ['dashboard', 'customers', 'crm', 'quotations', 'measurements', 'sales-orders', 'production', 'inventory', 'purchases', 'accounts', 'employees', 'dispatch', 'marketing', 'reports', 'settings'],
      canApproveProduction: true,
      canAuthorizeFinance: true,
      canManageUsers: true,
      canPublishSettings: true,
    },
    {
      roleName: 'Sales',
      description: 'Dealer relations, builder inquiries, door quotations, site orders, and lead tracking.',
      allowedModules: ['dashboard', 'customers', 'crm', 'quotations', 'measurements', 'sales-orders', 'dispatch', 'marketing', 'reports'],
      canApproveProduction: false,
      canAuthorizeFinance: false,
      canManageUsers: false,
      canPublishSettings: false,
    },
    {
      roleName: 'Accounts',
      description: 'GST compliance (HSN 3925), e-Way bills, invoicing, dealer payment ledgers, and receivables.',
      allowedModules: ['dashboard', 'customers', 'quotations', 'sales-orders', 'purchases', 'accounts', 'reports'],
      canApproveProduction: false,
      canAuthorizeFinance: true,
      canManageUsers: false,
      canPublishSettings: false,
    },
    {
      roleName: 'Production',
      description: 'FRP hydraulic molding, WPC extrusion calibration, CNC carving, PU coating, and QA inspection.',
      allowedModules: ['dashboard', 'measurements', 'sales-orders', 'production', 'inventory', 'dispatch'],
      canApproveProduction: true,
      canAuthorizeFinance: false,
      canManageUsers: false,
      canPublishSettings: false,
    },
    {
      roleName: 'Inventory',
      description: 'Resin silos, fiberglass rolls, WPC granules, locks, hinges, and warehouse bay control.',
      allowedModules: ['dashboard', 'production', 'inventory', 'purchases', 'dispatch'],
      canApproveProduction: false,
      canAuthorizeFinance: false,
      canManageUsers: false,
      canPublishSettings: false,
    },
    {
      roleName: 'Installation',
      description: 'Site door measurements, rebate depth checks, delivery fleet logistics, and client sign-off.',
      allowedModules: ['dashboard', 'customers', 'measurements', 'sales-orders', 'dispatch'],
      canApproveProduction: false,
      canAuthorizeFinance: false,
      canManageUsers: false,
      canPublishSettings: false,
    },
  ],
};

function getNextVersion(revisions: ConfigurationRevision[]): number {
  if (!revisions || revisions.length === 0) return 1;
  const maxVersion = revisions.reduce((max, r) => Math.max(max, Number(r.version) || 0), 0);
  return maxVersion + 1;
}

function readStore(): CustomizationStore {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(STORE_PATH)) {
      const initial: CustomizationStore = {
        active: DEFAULT_ERP_CONFIG,
        draft: DEFAULT_ERP_CONFIG,
        revisions: [
          {
            id: 'rev-init-v1',
            version: 1,
            publishedAt: new Date().toISOString(),
            publishedBy: 'Nazer Karumban (Super Admin)',
            changelog: 'Initial production system baseline with FRP primary and all 17 customization domains configured.',
            configSnapshot: DEFAULT_ERP_CONFIG,
          },
        ],
      };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }

    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    let modified = false;

    // Ensure company & factory profile is present
    if (parsed.active && !parsed.active.companyProfile) {
      parsed.active.companyProfile = DEFAULT_COMPANY_PROFILE;
      modified = true;
    }
    if (parsed.draft && !parsed.draft.companyProfile) {
      parsed.draft.companyProfile = DEFAULT_COMPANY_PROFILE;
      modified = true;
    }

    // Cleanse any legacy hardcoded Palakkad entries in active & draft PDF layouts
    if (parsed.active?.pdfLayouts?.plantAddress?.includes('Palakkad')) {
      parsed.active.pdfLayouts.plantAddress = 'Kerala Manufacturing Unit [Address Pending Configuration]';
      parsed.active.pdfLayouts.headerLogoText = 'EXMARK DOORS • Manufacturing Operations';
      modified = true;
    }
    if (parsed.draft?.pdfLayouts?.plantAddress?.includes('Palakkad')) {
      parsed.draft.pdfLayouts.plantAddress = 'Kerala Manufacturing Unit [Address Pending Configuration]';
      parsed.draft.pdfLayouts.headerLogoText = 'EXMARK DOORS • Manufacturing Operations';
      modified = true;
    }

    // Migrate existing revisions to guarantee stable unique ID on each
    if (Array.isArray(parsed.revisions)) {
      parsed.revisions = parsed.revisions.map((rev: ConfigurationRevision, index: number) => {
        if (!rev.id) {
          const ts = new Date(rev.publishedAt || Date.now()).getTime();
          rev.id = `rev-${ts}-v${rev.version}-${index + 1}`;
          modified = true;
        }
        return rev;
      });
    }

    if (modified) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(parsed, null, 2), 'utf8');
    }

    return parsed;
  } catch (err) {
    console.error('[CustomizationService] Failed to read store:', err);
    return {
      active: DEFAULT_ERP_CONFIG,
      draft: DEFAULT_ERP_CONFIG,
      revisions: [],
    };
  }
}

function writeStore(store: CustomizationStore) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[CustomizationService] Failed to write store:', err);
  }
}

/**
 * Get active configuration
 */
export async function getActiveConfiguration(): Promise<ERPConfiguration> {
  const store = readStore();
  return store.active;
}

/**
 * Get draft configuration
 */
export async function getDraftConfiguration(): Promise<ERPConfiguration> {
  const store = readStore();
  return store.draft;
}

/**
 * Get all revision history
 */
export async function getRevisionHistory(): Promise<ConfigurationRevision[]> {
  const store = readStore();
  return store.revisions;
}

/**
 * Save draft configuration without publishing
 */
export async function saveDraftConfiguration(
  draftInput: Partial<ERPConfiguration>,
  user: string
): Promise<ERPConfiguration> {
  const store = readStore();
  const updatedDraft: ERPConfiguration = {
    ...store.draft,
    ...draftInput,
    // Integrity rule: FRP cannot be disabled
    categories: {
      ...store.draft.categories,
      ...(draftInput.categories || {}),
      frp: {
        ...store.draft.categories.frp,
        enabled: true, // Always immutable true
      },
    },
    lastUpdated: new Date().toISOString(),
    updatedBy: user,
  };

  store.draft = updatedDraft;
  writeStore(store);

  await logAuditEvent({
    action: 'SETTINGS_DRAFT_SAVED',
    entityType: 'SETTINGS',
    details: { user, version: updatedDraft.version },
  });

  return updatedDraft;
}

/**
 * Publish draft configuration, increment version, and record snapshot in revision history
 */
export async function publishConfiguration(
  changelog: string,
  publishedBy: string
): Promise<{ published: ERPConfiguration; revision: ConfigurationRevision }> {
  const store = readStore();
  const nextVersion = getNextVersion(store.revisions);
  const now = new Date().toISOString();
  const revId = `rev-${Date.now()}-v${nextVersion}`;

  const publishedConfig: ERPConfiguration = {
    ...store.draft,
    version: nextVersion,
    lastUpdated: now,
    updatedBy: publishedBy,
    // Enforce FRP immutable safeguard
    categories: {
      ...store.draft.categories,
      frp: {
        ...store.draft.categories.frp,
        enabled: true,
      },
    },
  };

  const newRevision: ConfigurationRevision = {
    id: revId,
    version: nextVersion,
    publishedAt: now,
    publishedBy,
    changelog: changelog || `Published version ${nextVersion} updates.`,
    configSnapshot: publishedConfig,
  };

  store.active = publishedConfig;
  store.draft = publishedConfig; // Draft resets to active published state
  store.revisions = [newRevision, ...store.revisions];

  writeStore(store);

  await logAuditEvent({
    action: 'SETTINGS_PUBLISHED',
    entityType: 'SETTINGS',
    details: { version: nextVersion, publishedBy, changelog, revisionId: revId },
  });

  return { published: publishedConfig, revision: newRevision };
}

/**
 * Rollback configuration to a previous revision version or revision ID
 */
export async function rollbackConfiguration(
  targetIdentifier: number | string,
  rolledBackBy: string
): Promise<ERPConfiguration> {
  const store = readStore();
  const revision = store.revisions.find(
    (r) => r.id === String(targetIdentifier) || r.version === Number(targetIdentifier)
  );

  if (!revision) {
    throw new Error(`Revision "${targetIdentifier}" not found in history.`);
  }

  const nextVersion = getNextVersion(store.revisions);
  const now = new Date().toISOString();
  const revId = `rev-${Date.now()}-v${nextVersion}-rb${revision.version}`;

  const rolledBackConfig: ERPConfiguration = {
    ...revision.configSnapshot,
    version: nextVersion,
    lastUpdated: now,
    updatedBy: `${rolledBackBy} (Rolled back to v${revision.version})`,
  };

  const rollbackRevision: ConfigurationRevision = {
    id: revId,
    version: nextVersion,
    publishedAt: now,
    publishedBy: rolledBackBy,
    changelog: `Rollback to settings from Version ${revision.version} (originally published ${new Date(revision.publishedAt).toLocaleDateString()})`,
    configSnapshot: rolledBackConfig,
  };

  store.active = rolledBackConfig;
  store.draft = rolledBackConfig;
  store.revisions = [rollbackRevision, ...store.revisions];
  writeStore(store);

  await logAuditEvent({
    action: 'SETTINGS_ROLLBACK',
    entityType: 'SETTINGS',
    details: { targetVersion: revision.version, newVersion: nextVersion, rolledBackBy, revisionId: revId },
  });

  return rolledBackConfig;
}
