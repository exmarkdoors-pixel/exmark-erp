/**
 * EXMARK ERP — Location-Based Geotagged Warranty Service
 */

import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import {
  GeotaggedWarranty,
  WarrantyClaimTicket,
  WarrantyDoorScheduleItem,
} from '@/lib/types/projectRiskProfit';
import { haversineDistanceMeters } from './projectRiskProfitService';

const getStorePath = () => getDataFilePath('location-warranties-store.json');

const DEFAULT_SEED_WARRANTIES: GeotaggedWarranty[] = [
  {
    certificateNumber: 'EXM-WARR-2026-0042',
    salesOrderId: 'ORD-2026-101',
    quotationId: 'QTN-2026-001',
    customerName: 'Nazer Karumban',
    customerPhone: '+91 98471 23456',
    customerEmail: 'director@exmarkdoors.com',
    siteName: 'Karumban Heritage Villa',
    siteAddress: 'Near Town Juma Masjid, Vengara, Malappuram, Kerala',
    district: 'Malappuram',
    pinCode: '676505',
    landmark: 'Opposite Government Higher Secondary School',
    coordinates: {
      latitude: 11.0510,
      longitude: 76.0711,
      accuracyMeters: 8,
      capturedAt: '2026-11-10T09:30:00.000Z',
      source: 'DEVICE_GPS',
    },
    geofenceRadiusMeters: 500,
    googleMapsUrl: 'https://maps.google.com/?q=11.0510,76.0711',
    warrantyPeriodYears: 15,
    validFrom: '2026-11-10',
    validUntil: '2041-11-10',
    coverageScope: '100% Water, Termite & Borer Proof FRP Architectural Door Body and Polymer Core Integrity',
    explicitExclusions: [
      'SS Hinges, Tower Bolts, Handles, and Lock Hardware sets (covered under OEM 1-yr hardware warranty)',
      'Surface PU Paints, Foiling, and Cosmetic finish weathering caused by direct open weather acid rain',
      'Structural crack damage arising from civil foundation shift, earthquake, or accidental sledgehammer impact',
      'Unauthorized cutting/planing of FRP stiles exceeding the 5mm factory perimeter trimming tolerance',
    ],
    bilingualCareInstructions: {
      english: [
        'Clean door faces using mild liquid soap and a soft microfiber towel.',
        'Never clean FRP surfaces with undiluted floor acid, caustic soda, or wire scrubbers.',
        'Apply machine lubricant or WD-40 to SS 304 ball-bearing hinges every 6 months.',
      ],
      malayalam: [
        'Inspect hinges and hardware fasteners every 6 months to ensure smooth, unhindered operation.',
        'Protect finished surfaces from direct chemical spills or acid cleaners during tile washing.',
        'Wipe door leaf with soft damp microfiber cloth; do not use abrasive pads or metal wool.',
      ],
    },
    coveredDoors: [
      {
        doorId: 'EXM-DR-2026-001',
        doorNumber: 'D1 - Master Bed',
        model: 'EXM-FRP-TL101 (Teakwood Embossed)',
        dimensionsMm: '2085 x 888 mm',
        finishColor: 'Natural Teak Matte',
        frameType: 'WPC Extruded Heavy Frame (100x60mm)',
        lockType: 'Europa Mortise Lock',
        qrSerial: 'EXM-QR-98471-D1',
      },
      {
        doorId: 'EXM-DR-2026-002',
        doorNumber: 'D2 - Guest Bed',
        model: 'EXM-FRP-TL101 (Teakwood Embossed)',
        dimensionsMm: '2085 x 812 mm',
        finishColor: 'Natural Teak Matte',
        frameType: 'WPC Extruded Heavy Frame (100x60mm)',
        lockType: 'Cylindrical Knob Lock',
        qrSerial: 'EXM-QR-98471-D2',
      },
    ],
    claimsHistory: [],
    status: 'ACTIVE',
    issuedAt: '2026-11-10T10:00:00.000Z',
    issuedBy: 'Factory Quality Assurance (EXM-QA-01)',
  },
  {
    certificateNumber: 'EXM-WARR-2026-0043',
    salesOrderId: 'ORD-2026-102',
    quotationId: 'QTN-2026-002',
    customerName: 'Al-Madina Traders & Builders',
    customerPhone: '+91 94472 88910',
    siteName: 'Al-Madina Commercial Arcade',
    siteAddress: 'Bypass Junction, Kottakkal, Malappuram, Kerala',
    district: 'Malappuram',
    pinCode: '676503',
    landmark: 'Near Arya Vaidya Sala Main Entrance',
    coordinates: {
      latitude: 11.0012,
      longitude: 75.9984,
      accuracyMeters: 10,
      capturedAt: '2026-11-12T11:00:00.000Z',
      source: 'DEVICE_GPS',
    },
    geofenceRadiusMeters: 500,
    googleMapsUrl: 'https://maps.google.com/?q=11.0012,75.9984',
    warrantyPeriodYears: 10,
    validFrom: '2026-11-12',
    validUntil: '2036-11-12',
    coverageScope: '100% Water, Termite & Borer Proof FRP Architectural Door Body and Polymer Core Integrity',
    explicitExclusions: [
      'SS Hinges, Tower Bolts, Handles, and Lock Hardware sets',
      'Surface finish weathering from prolonged direct open sun exposure',
      'Damage arising from civil structure settlement',
    ],
    bilingualCareInstructions: {
      english: [
        'Clean door surfaces with mild soapy water and a soft cloth only.',
        'Never use acidic cleaners on FRP doors.',
      ],
      malayalam: [
        'Inspect hinges and hardware fasteners every 6 months to ensure smooth, unhindered operation.',
        'Protect finished surfaces from direct chemical spills or acid cleaners during tile washing.',
      ],
    },
    coveredDoors: [
      {
        doorId: 'EXM-DR-2026-003',
        doorNumber: 'GF-01',
        model: 'EXM-FRP-M201 (Commercial Moulded)',
        dimensionsMm: '2085 x 915 mm',
        finishColor: 'Walnut Dark Brown',
        frameType: 'WPC Extruded Frame',
        lockType: 'Standard Lever Lock',
        qrSerial: 'EXM-QR-94472-01',
      },
    ],
    claimsHistory: [],
    status: 'ACTIVE',
    issuedAt: '2026-11-12T12:00:00.000Z',
    issuedBy: 'Factory Quality Assurance (EXM-QA-01)',
  },
];

function readWarrantiesStore(): GeotaggedWarranty[] {
  try {
    const file = getStorePath();
    if (!fs.existsSync(file)) {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(DEFAULT_SEED_WARRANTIES, null, 2), 'utf8');
      return DEFAULT_SEED_WARRANTIES;
    }
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SEED_WARRANTIES;
  } catch (err) {
    console.error('[locationWarrantyService] Error reading store:', err);
    return DEFAULT_SEED_WARRANTIES;
  }
}

function writeWarrantiesStore(items: GeotaggedWarranty[]): void {
  try {
    const file = getStorePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('[locationWarrantyService] Error writing store:', err);
  }
}

export async function listLocationWarranties(district?: string, status?: string): Promise<GeotaggedWarranty[]> {
  const store = readWarrantiesStore();
  return store.filter((w) => {
    if (district && district !== 'ALL' && w.district.toLowerCase() !== district.toLowerCase()) {
      return false;
    }
    if (status && status !== 'ALL' && w.status !== status) {
      return false;
    }
    return true;
  });
}

export async function getLocationWarrantyById(idOrCert: string): Promise<GeotaggedWarranty | null> {
  const store = readWarrantiesStore();
  const clean = idOrCert.trim().toLowerCase();
  const found = store.find(
    (w) =>
      w.certificateNumber.toLowerCase() === clean ||
      (w.quotationId && w.quotationId.toLowerCase() === clean) ||
      (w.salesOrderId && w.salesOrderId.toLowerCase() === clean) ||
      w.coveredDoors.some((d) => d.doorId.toLowerCase() === clean || d.qrSerial.toLowerCase() === clean)
  );
  return found || null;
}

export async function createLocationWarranty(input: Partial<GeotaggedWarranty>): Promise<GeotaggedWarranty> {
  const store = readWarrantiesStore();
  const nextSeq = String(store.length + 42).padStart(4, '0');
  const certNumber = input.certificateNumber || `EXM-WARR-2026-${nextSeq}`;

  const validFrom = input.validFrom || new Date().toISOString().slice(0, 10);
  const years = input.warrantyPeriodYears || 15;
  const expDate = new Date(validFrom);
  expDate.setFullYear(expDate.getFullYear() + years);
  const validUntil = expDate.toISOString().slice(0, 10);

  const coords = input.coordinates || {
    latitude: 11.0510,
    longitude: 76.0711,
    accuracyMeters: 10,
    capturedAt: new Date().toISOString(),
    source: 'DEVICE_GPS',
  };

  const newWarranty: GeotaggedWarranty = {
    certificateNumber: certNumber,
    salesOrderId: input.salesOrderId || null,
    quotationId: input.quotationId || null,
    customerName: input.customerName || 'Direct Client',
    customerPhone: input.customerPhone || '',
    customerEmail: input.customerEmail || '',
    siteName: input.siteName || `${input.customerName || 'Customer'} Site`,
    siteAddress: input.siteAddress || `${input.district || 'Malappuram'}, Kerala`,
    district: input.district || 'Malappuram',
    pinCode: input.pinCode || '',
    landmark: input.landmark || '',
    coordinates: coords,
    geofenceRadiusMeters: input.geofenceRadiusMeters || 500,
    googleMapsUrl: `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`,
    warrantyPeriodYears: years,
    validFrom,
    validUntil,
    coverageScope:
      input.coverageScope ||
      '100% Water, Termite & Borer Proof FRP Architectural Door Body and Polymer Core Integrity',
    explicitExclusions: input.explicitExclusions || [
      'SS Hinges, Tower Bolts, Handles, and Lock Hardware sets',
      'Surface PU Paints, Foiling, and Cosmetic finish weathering',
      'Damage arising from civil structure settlement or accidental mechanical impact',
      'Unauthorized cutting/planing of FRP stiles exceeding factory perimeter trimming allowance',
    ],
    bilingualCareInstructions: input.bilingualCareInstructions || {
      english: [
        'Clean door surfaces with mild soapy water and a soft cloth only.',
        'Never use acidic cleaners or wire brushes on FRP doors.',
        'Lubricate hinges with machine oil every 6 months.',
      ],
      malayalam: [
        'Inspect hinges and hardware fasteners every 6 months to ensure smooth, unhindered operation.',
        'Protect finished surfaces from direct chemical spills or acid cleaners during tile washing.',
        'Wipe door leaf with soft damp microfiber cloth; do not use abrasive pads or metal wool.',
      ],
    },
    coveredDoors: Array.isArray(input.coveredDoors) && input.coveredDoors.length > 0
      ? input.coveredDoors
      : [
          {
            doorId: `EXM-DR-${Date.now().toString().slice(-4)}`,
            doorNumber: 'D1',
            model: 'EXM-FRP Standard Door',
            dimensionsMm: '2085 x 888 mm',
            finishColor: 'Teak Matte',
            frameType: 'WPC Extruded Frame',
            lockType: 'Standard Lock',
            qrSerial: `EXM-QR-${Date.now().toString().slice(-6)}`,
          },
        ],
    claimsHistory: [],
    status: 'ACTIVE',
    issuedAt: new Date().toISOString(),
    issuedBy: input.issuedBy || 'EXMARK Quality Assurance Unit',
  };

  store.unshift(newWarranty);
  writeWarrantiesStore(store);
  return newWarranty;
}

export async function verifyWarrantyLocation(
  certNumber: string,
  deviceLat: number,
  deviceLng: number
): Promise<{
  isVerified: boolean;
  distanceMeters: number;
  geofenceRadiusMeters: number;
  message: string;
  warranty: GeotaggedWarranty | null;
}> {
  const warranty = await getLocationWarrantyById(certNumber);
  if (!warranty) {
    return {
      isVerified: false,
      distanceMeters: -1,
      geofenceRadiusMeters: 500,
      message: `Warranty certificate "${certNumber}" was not found.`,
      warranty: null,
    };
  }

  const distMeters = haversineDistanceMeters(
    warranty.coordinates.latitude,
    warranty.coordinates.longitude,
    deviceLat,
    deviceLng
  );

  const radius = warranty.geofenceRadiusMeters || 500;
  const isVerified = distMeters <= radius;

  let message = '';
  if (isVerified) {
    message = `🟢 Site Location Verified: Your device is within ${distMeters}m of registered project site (${warranty.siteName}, ${warranty.district}). Warranty authentic & active.`;
  } else {
    const km = (distMeters / 1000).toFixed(1);
    message = `⚠️ Location Mismatch: Your current location is ${km} km away from registered project site (${warranty.siteName}, ${warranty.district}). Warranty is geographically registered to the original building structure.`;
  }

  return {
    isVerified,
    distanceMeters: distMeters,
    geofenceRadiusMeters: radius,
    message,
    warranty,
  };
}

export async function addWarrantyClaimTicket(
  certNumber: string,
  claimInput: Partial<WarrantyClaimTicket>
): Promise<{ success: boolean; ticket?: WarrantyClaimTicket; error?: string }> {
  const store = readWarrantiesStore();
  const clean = certNumber.trim().toLowerCase();
  const warrantyIndex = store.findIndex((w) => w.certificateNumber.toLowerCase() === clean);

  if (warrantyIndex === -1) {
    return { success: false, error: `Warranty certificate "${certNumber}" was not found.` };
  }

  const warranty = store[warrantyIndex];
  const ticketId = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

  let distMeters = 0;
  let isVerified = false;

  if (claimInput.deviceLat !== undefined && claimInput.deviceLng !== undefined) {
    distMeters = haversineDistanceMeters(
      warranty.coordinates.latitude,
      warranty.coordinates.longitude,
      claimInput.deviceLat,
      claimInput.deviceLng
    );
    isVerified = distMeters <= (warranty.geofenceRadiusMeters || 500);
  }

  const newTicket: WarrantyClaimTicket = {
    ticketId,
    reportedDate: new Date().toISOString().slice(0, 10),
    reportedBy: claimInput.reportedBy || warranty.customerName,
    contactPhone: claimInput.contactPhone || warranty.customerPhone,
    issueCategory: claimInput.issueCategory || 'SURFACE_BUBBLE',
    description: claimInput.description || 'Warranty service inspection requested.',
    photoUrls: claimInput.photoUrls || [],
    deviceLat: claimInput.deviceLat,
    deviceLng: claimInput.deviceLng,
    isLocationVerified: isVerified,
    distanceFromSiteMeters: distMeters,
    status: 'OPEN',
    technicianNotes: isVerified
      ? 'Geotag verified at registered site. Priority service inspection assigned.'
      : `Location mismatch detected (${(distMeters / 1000).toFixed(1)} km from site). Verification required before dispatch.`,
  };

  warranty.claimsHistory.unshift(newTicket);
  store[warrantyIndex] = warranty;
  writeWarrantiesStore(store);

  return { success: true, ticket: newTicket };
}
