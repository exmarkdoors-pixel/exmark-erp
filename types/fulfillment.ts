// ── Fulfillment, Logistics, Installation & Warranty Types ──────────────────

export type DispatchStatus = 'SCHEDULED' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED';
export type InstallationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_APPROVED';

export interface DispatchRecord {
  id: string;
  dispatchNumber: string; // DSP-2026-001
  salesOrderId?: string | null;
  customerName: string;
  destinationAddress: string;
  deliveryDistrict: string;
  vehicleNumber: string; // e.g. KL-09-AH-4122
  driverName: string;
  driverPhone: string;
  eWayBillNo?: string | null;
  doorCount: number;
  dispatchDate: string;
  estimatedArrival?: string | null;
  status: DispatchStatus;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface InstallationRecord {
  id: string;
  installationNumber: string; // INS-2026-001
  salesOrderId?: string | null;
  dispatchId?: string | null;
  customerName: string;
  siteAddress: string;
  district: string;
  supervisorName: string;
  scheduledDate: string;
  completedDate?: string | null;
  doorCount: number;
  clientSignoffName?: string | null;
  clientFeedbackRating?: number | null; // 1 - 5 stars
  clientRemarks?: string | null;
  status: InstallationStatus;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface WarrantyCertificate {
  certificateNumber: string; // EXM-WRN-2026-XXXX
  salesOrderId?: string | null;
  customerName: string;
  siteAddress: string;
  district: string;
  warrantyPeriodYears: 10 | 15;
  validFrom: string;
  validUntil: string;
  coveredDoors: Array<{
    doorId: string;
    model: string;
    sizeMm: string;
  }>;
  coverageScope: string; // "FRP DOOR MATERIAL ONLY"
  explicitExclusions: string[]; // Hinges, locks, handles, paint, coatings
  bilingualCareInstructions: {
    english: string[];
    malayalam: string[];
  };
  issuedAt: string;
}
