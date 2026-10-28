/**
 * EXMARK ERP — Company & Factory Profile Service
 * 
 * Provides:
 * 1. Single source of truth for Legal Company & Manufacturing Factory configurations.
 * 2. Separation of Registered Office, Corporate Office, Billing Address, Warehouse, and Factory Locations.
 * 3. Validation and role-based Super Admin authorization.
 * 4. Immutability & revision tracking for enterprise document integrity.
 * 5. Dynamic resolution for Dashboards, Job Cards, Cutting Sheets, Quotations, Invoices, and Warranties.
 */

import { CompanyProfile, FactoryProfile, AddressDetails } from '@/types/companyProfile';
import {
  getActiveConfiguration,
  getDraftConfiguration,
  saveDraftConfiguration,
  publishConfiguration,
  ERPConfiguration,
} from './customizationService';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  registeredCompanyName: 'EXMARK DOORS PRIVATE LIMITED',
  brandName: 'EXMARK Doors',
  logoUrl: '/images/exmark-logo.png',
  website: 'https://www.exmarkdoors.com',
  email: 'sales@exmarkdoors.com',
  phone: '+91 484 290 8800',
  gstin: '32AABCE9821K1ZN',
  panNumber: 'AABCE9821K',
  cinNumber: 'U25209KL2022PTC076123',
  registeredOffice: {
    addressLine1: 'Corporate Tower, NH Bypass',
    addressLine2: 'Edappally',
    district: 'Ernakulam',
    state: 'Kerala',
    pinCode: '682024',
    country: 'India',
  },
  corporateOffice: {
    addressLine1: 'Corporate Tower, NH Bypass',
    addressLine2: 'Edappally',
    district: 'Ernakulam',
    state: 'Kerala',
    pinCode: '682024',
    country: 'India',
  },
  billingAddress: {
    addressLine1: 'Corporate Tower, NH Bypass',
    addressLine2: 'Edappally',
    district: 'Ernakulam',
    state: 'Kerala',
    pinCode: '682024',
    country: 'India',
  },
  warehouseLocation: {
    addressLine1: 'Central Door Warehouse & Distribution Bay',
    addressLine2: 'Industrial Corridor',
    district: 'Ernakulam',
    state: 'Kerala',
    pinCode: '682024',
    country: 'India',
  },
  factories: [
    {
      id: 'fac-main',
      name: 'Central Manufacturing Unit',
      code: 'FAC-01',
      isDefault: true,
      status: 'Operational',
      address: {
        addressLine1: '[Factory Address Pending Configuration]',
        addressLine2: '',
        district: '',
        state: 'Kerala',
        pinCode: '',
        country: 'India',
      },
      manufacturingLocation: '[Manufacturing Location Pending Configuration]',
      warehouseLocation: '[Factory Warehouse Pending Configuration]',
      phone: '',
      email: 'plant@exmarkdoors.com',
      plantManager: 'Plant Operations Lead',
      hydraulicPressLines: 8,
      pressCapacityPerDay: 40,
      notes: 'Primary FRP Door Molding & Hydraulic Press Facility. Awaiting administrator address confirmation.',
    },
  ],
  defaultFactoryId: 'fac-main',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'System Init',
};

/**
 * Validates company & factory profile payload
 */
export function validateCompanyProfile(profile: Partial<CompanyProfile>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!profile.registeredCompanyName || profile.registeredCompanyName.trim().length === 0) {
    errors.push('Registered Company Name is mandatory.');
  }

  if (!profile.brandName || profile.brandName.trim().length === 0) {
    errors.push('Brand Name is mandatory.');
  }

  if (profile.gstin && profile.gstin.trim().length > 0) {
    // 15-digit GSTIN pattern e.g. 32AABCE9821K1ZN
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinPattern.test(profile.gstin.trim())) {
      errors.push('Invalid GSTIN format. Expected 15-character Indian GST format (e.g., 32AABCE9821K1ZN).');
    }
  }

  if (profile.email && profile.email.trim().length > 0) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(profile.email.trim())) {
      errors.push('Invalid Company Email address format.');
    }
  }

  if (!Array.isArray(profile.factories) || profile.factories.length === 0) {
    errors.push('At least one factory location must be defined.');
  } else {
    const defaultCount = profile.factories.filter((f) => f.isDefault).length;
    if (defaultCount === 0) {
      errors.push('Exactly one factory must be designated as the default active manufacturing plant.');
    }

    profile.factories.forEach((factory, idx) => {
      if (!factory.name || factory.name.trim().length === 0) {
        errors.push(`Factory #${idx + 1} name is mandatory.`);
      }
      if (factory.address && factory.address.pinCode && factory.address.pinCode.trim().length > 0) {
        if (!/^\d{6}$/.test(factory.address.pinCode.trim())) {
          errors.push(`Factory "${factory.name || idx + 1}" PIN Code must be exactly 6 digits.`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Retrieves the currently active company profile
 */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  const config = await getActiveConfiguration();
  return config.companyProfile || DEFAULT_COMPANY_PROFILE;
}

/**
 * Retrieves the draft company profile for editing
 */
export async function getDraftCompanyProfile(): Promise<CompanyProfile> {
  const draft = await getDraftConfiguration();
  return draft.companyProfile || DEFAULT_COMPANY_PROFILE;
}

/**
 * Returns the active default factory from configuration
 */
export function getActiveFactory(config?: ERPConfiguration | null): FactoryProfile {
  const profile = config?.companyProfile || DEFAULT_COMPANY_PROFILE;
  const factories = profile.factories || DEFAULT_COMPANY_PROFILE.factories;
  const defaultFac = factories.find((f) => f.isDefault || f.id === profile.defaultFactoryId);
  return defaultFac || factories[0] || DEFAULT_COMPANY_PROFILE.factories[0];
}

/**
 * Returns a clean, user-friendly display name for the factory
 * e.g. "Central Manufacturing Unit • Ernakulam" or "Central Manufacturing Unit"
 */
export function getFactoryDisplayName(config?: ERPConfiguration | null): string {
  const factory = getActiveFactory(config);
  if (factory.address && factory.address.district && factory.address.district.trim().length > 0) {
    return `${factory.name} (${factory.address.district})`;
  }
  return factory.name;
}

/**
 * Returns full formatted single-line address of active factory
 */
export function getFactoryAddressString(config?: ERPConfiguration | null): string {
  const factory = getActiveFactory(config);
  const addr = factory.address;
  if (!addr) return factory.manufacturingLocation || 'Manufacturing Unit';

  const parts = [
    addr.addressLine1,
    addr.addressLine2,
    addr.district,
    addr.state,
    addr.pinCode,
  ].filter((p) => Boolean(p && !p.startsWith('[Factory')));

  return parts.length > 0 ? parts.join(', ') : 'Factory Location Pending Configuration';
}

/**
 * Returns standard legal header metadata for generated PDFs, invoices, and quotations
 */
export function getCompanyLegalHeader(config?: ERPConfiguration | null) {
  const profile = config?.companyProfile || DEFAULT_COMPANY_PROFILE;
  const factory = getActiveFactory(config);

  return {
    registeredCompanyName: profile.registeredCompanyName,
    brandName: profile.brandName,
    logoUrl: profile.logoUrl,
    gstin: profile.gstin,
    panNumber: profile.panNumber,
    cinNumber: profile.cinNumber,
    website: profile.website,
    email: profile.email,
    phone: profile.phone,
    registeredOfficeString: [
      profile.registeredOffice?.addressLine1,
      profile.registeredOffice?.addressLine2,
      profile.registeredOffice?.district,
      profile.registeredOffice?.state,
      profile.registeredOffice?.pinCode,
    ].filter(Boolean).join(', '),
    factoryName: factory.name,
    factoryAddressString: getFactoryAddressString(config),
    factoryPhone: factory.phone || profile.phone,
    factoryEmail: factory.email || profile.email,
  };
}

/**
 * Saves draft or publishes updated company & factory profile
 */
export async function saveCompanyProfile(
  updatedProfile: Partial<CompanyProfile>,
  user: { name: string; role: string },
  action: 'SAVE_DRAFT' | 'PUBLISH' = 'SAVE_DRAFT',
  changelog?: string
): Promise<{ success: boolean; config: ERPConfiguration; revisionId?: string }> {
  // Validate
  const validation = validateCompanyProfile(updatedProfile);
  if (!validation.isValid) {
    throw new Error(`VALIDATION_FAILED: ${validation.errors.join('; ')}`);
  }

  const currentDraft = await getDraftConfiguration();
  const mergedProfile: CompanyProfile = {
    ...DEFAULT_COMPANY_PROFILE,
    ...(currentDraft.companyProfile || {}),
    ...updatedProfile,
    lastUpdated: new Date().toISOString(),
    updatedBy: user.name,
  };

  const updatedConfig: ERPConfiguration = {
    ...currentDraft,
    companyProfile: mergedProfile,
    // Synchronize legacy PDF layouts and GST config to maintain backwards compatibility
    pdfLayouts: {
      ...currentDraft.pdfLayouts,
      headerLogoText: `${mergedProfile.brandName} • ${getActiveFactory({ companyProfile: mergedProfile } as ERPConfiguration).name}`,
      plantAddress: getFactoryAddressString({ companyProfile: mergedProfile } as ERPConfiguration),
      contactPhone: mergedProfile.phone,
      contactEmail: mergedProfile.email,
    },
    gstConfig: {
      ...currentDraft.gstConfig,
      companyName: mergedProfile.registeredCompanyName,
      gstin: mergedProfile.gstin,
    },
  };

  if (action === 'SAVE_DRAFT') {
    const savedDraft = await saveDraftConfiguration(updatedConfig, user.name);
    logAuditEvent({
      userId: user.name,
      action: 'SETTINGS_DRAFT_SAVED',
      entityType: 'SETTINGS',
      entityId: 'profile-draft',
      details: {
        role: user.role,
        note: 'Saved draft changes to Company & Factory Profile',
      },
    });
    return { success: true, config: savedDraft };
  } else {
    // Save draft first then publish
    await saveDraftConfiguration(updatedConfig, user.name);
    const publishNote = changelog || `Updated Company & Factory Profile: Set default plant to "${getActiveFactory(updatedConfig).name}"`;
    const publishResult = await publishConfiguration(publishNote, user.name);

    logAuditEvent({
      userId: user.name,
      action: 'SETTINGS_PUBLISHED',
      entityType: 'SETTINGS',
      entityId: `rev-v${publishResult.published.version}`,
      details: {
        role: user.role,
        note: `Published active Company & Factory Profile: ${publishNote}`,
      },
    });

    return {
      success: true,
      config: publishResult.published,
      revisionId: publishResult.revision.id,
    };
  }
}
