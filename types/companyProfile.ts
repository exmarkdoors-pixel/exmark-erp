/**
 * EXMARK ERP — Company & Factory Profile Types
 * Supports distinct legal entities, multi-factory topologies, and discrete address domains.
 */

export interface AddressDetails {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  district: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface FactoryProfile {
  id: string;
  name: string; // e.g. "Central Manufacturing Unit"
  code: string; // e.g. "FAC-01"
  isDefault: boolean;
  status: 'Operational' | 'Maintenance' | 'Planned';
  address: AddressDetails;
  manufacturingLocation: string; // Specific floor / plant unit / industrial plot
  warehouseLocation: string; // Raw material, resin & door storage zone
  phone: string;
  email: string;
  plantManager?: string;
  pressCapacityPerDay?: number;
  hydraulicPressLines?: number;
  notes?: string;
}

export interface CompanyProfile {
  registeredCompanyName: string;
  brandName: string;
  logoUrl: string;
  website: string;
  email: string;
  phone: string;
  gstin: string;
  panNumber?: string;
  cinNumber?: string;

  // Separate physical and legal address domains
  registeredOffice: AddressDetails;
  corporateOffice: AddressDetails;
  billingAddress: AddressDetails;
  warehouseLocation: AddressDetails;

  // Multi-factory architecture (with single default active initially)
  factories: FactoryProfile[];
  defaultFactoryId: string;

  lastUpdated?: string;
  updatedBy?: string;
}

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
