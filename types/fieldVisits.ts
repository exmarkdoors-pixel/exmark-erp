// ── Field Staff Customer Visits & Live GPS Route History Types ───────────────

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedKmph?: number;
  heading?: number;
  timestamp: string;
}

export type CustomerVisitStage =
  | 'NEW_LEAD'
  | 'SITE_SURVEY'
  | 'MEASUREMENT_TAKEN'
  | 'QUOTATION_SHARED'
  | 'PAYMENT_FOLLOWUP'
  | 'DISPATCH_DELIVERED';

export interface CustomerVisitRecord {
  id: string; // e.g. "VISIT-20261125-001"
  staffId: string;
  staffCode: string;
  staffName: string;
  staffRole: string;
  date: string; // YYYY-MM-DD
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  location: GeoCoordinate;
  formattedAddress: string; // Reverse-geocoded town/road
  selfieUrl: string; // Compressed JPEG with embedded GPS watermark
  siteType: 'VILLA' | 'APARTMENT' | 'COMMERCIAL' | 'RENOVATION' | 'BUILDER_PROJECT';
  stage: CustomerVisitStage;
  doorCountEstimate?: number;
  requirementsNotes?: string;
  followUpDate?: string;
  createdAt: string;
}

export interface GpsBreadcrumb {
  staffId: string;
  staffName: string;
  role: string;
  date: string; // YYYY-MM-DD
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  timestamp: string;
}

export interface StaffDailyRouteLog {
  staffId: string;
  staffName: string;
  employeeCode: string;
  date: string; // YYYY-MM-DD
  punchInTime?: string;
  punchInLocation?: { lat: number; lng: number; address: string };
  punchInSelfie?: string;
  punchOutTime?: string;
  punchOutLocation?: { lat: number; lng: number; address: string };
  punchOutSelfie?: string;
  waypoints: GpsBreadcrumb[];
  visits: CustomerVisitRecord[];
  totalDistanceKm: number;
  estimatedTravelBata: number;
}
