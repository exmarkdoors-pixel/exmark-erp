/**
 * EXMARK ERP — Project Risk, Cost & Profit, and Location-Based Warranty Type Definitions
 */

export type ProjectRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProjectRiskFactor {
  key: string;
  category: 'CREDIT' | 'LOGISTICS' | 'CUSTOMIZATION' | 'SITE_WEATHER' | 'MATERIAL';
  title: string;
  score: number;       // Points contributed to overall risk (0 to maxScore)
  maxScore: number;    // Maximum points for this factor
  level: ProjectRiskLevel;
  description: string;
  mitigation: string;
}

export interface ProjectRiskInput {
  quotationId?: string;
  customerName?: string;
  district?: string;
  advancePercent?: number;
  quotedTotal?: number;
  roadAccessibility?: 'CONTAINER_40FT' | 'STANDARD_LORRY' | 'PICKUP_NARROW' | 'HILL_HAIRPIN_TERRAIN';
  siteReadiness?: 'READY_CLEARED' | 'PARTIAL_PLASTERING' | 'UNFINISHED_CIVIL';
  isMonsoonSeason?: boolean;
  itemRows?: Array<{
    widthInches?: number;
    heightInches?: number;
    width?: number;
    height?: number;
    unit?: string;
    qty?: number;
    thicknessLabel?: string;
    thicknessId?: string;
    frameTypeName?: string;
    lockId?: string;
  }>;
  totalDoorsCount?: number;
}

export interface ProjectRiskResult {
  overallScore: number;                 // 0 to 100
  riskLevel: ProjectRiskLevel;          // LOW, MEDIUM, HIGH, CRITICAL
  riskColor: string;                    // hex or tailwind class
  factors: ProjectRiskFactor[];
  recommendedContingencyBufferPct: number; // e.g. +3% to +8%
  recommendedAdvancePercent: number;    // e.g. 50% to 70%
  recommendedPackaging: string;
  mitigations: string[];
}

export interface ProjectCostInput {
  quotationId?: string;
  customerName?: string;
  district?: string;
  totalDoors?: number;
  itemRows?: any[];
  includeInstallation?: boolean;
  installationRate?: number;
  installationMode?: 'PER_DOOR' | 'FIXED_LUMP_SUM';
  additionalDiscount?: number;
  riskScore?: number;
}

export interface ProjectCostBreakdown {
  // Direct Materials
  resinChemicalsCost: number;
  gelcoatPigmentCost: number;
  fiberglassMatCost: number;
  internalCoreCost: number;
  framesWpcWoodCost: number;
  hardwareLocksHingesCost: number;
  totalDirectMaterials: number;

  // Direct Labor (Piece-rate Gangs)
  moldingGangCost: number;
  trimmingGangCost: number;
  finishingPaintGangCost: number;
  assemblyFittingCost: number;
  totalDirectLabor: number;

  // District Logistics & Freight
  baseFreightCost: number;
  distanceKm: number;
  mileageRatePerKm: number;
  transitPackagingCost: number;
  totalLogisticsFreight: number;

  // Installation
  installationGangLabor: number;

  // Factory Fixed Overheads Share
  fixedOverheadAbsorption: number;

  // Contingency & Safety Buffer
  contingencyRiskBuffer: number;

  // Total Cost of Project (COP)
  totalProjectCost: number;
}

export interface ProjectCostProfitResult {
  netQuotedRevenue: number;
  costBreakdown: ProjectCostBreakdown;
  totalCost: number;
  grossContributionMargin: number;      // Revenue - (Materials + Labor + Freight + Install)
  grossMarginPct: number;
  netProjectProfit: number;             // Revenue - Total Cost
  netMarginPct: number;
  breakEvenContractPrice: number;       // Minimum price with 0 profit
  targetPrice25Pct: number;             // Target selling price for 25% net margin
  targetPrice30Pct: number;             // Target selling price for 30% net margin
  marginHealth: 'EXCELLENT' | 'HEALTHY' | 'MARGINAL' | 'LOSS_WARNING';
}

export interface GeotaggedCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt?: string;
  source?: 'DEVICE_GPS' | 'MANUAL_MAP_PIN' | 'POSTAL_LOOKUP';
}

export interface WarrantyDoorScheduleItem {
  doorId: string;
  doorNumber: string;
  model: string;
  dimensionsMm: string;
  finishColor: string;
  frameType: string;
  lockType: string;
  qrSerial: string;
}

export interface WarrantyClaimTicket {
  ticketId: string;
  reportedDate: string;
  reportedBy: string;
  contactPhone: string;
  issueCategory: 'SURFACE_BUBBLE' | 'EDGE_DELAMINATION' | 'FRAME_WARPING' | 'HARDWARE_LOOSENING' | 'OTHER';
  description: string;
  photoUrls?: string[];
  deviceLat?: number;
  deviceLng?: number;
  isLocationVerified: boolean;
  distanceFromSiteMeters: number;
  status: 'OPEN' | 'INSPECTION_SCHEDULED' | 'RESOLVED' | 'REJECTED';
  technicianNotes?: string;
  resolvedAt?: string;
}

export interface GeotaggedWarranty {
  certificateNumber: string;            // e.g. EXM-WARR-2026-0042
  salesOrderId?: string | null;
  quotationId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  siteName: string;
  siteAddress: string;
  district: string;
  pinCode?: string;
  landmark?: string;
  coordinates: GeotaggedCoordinates;
  geofenceRadiusMeters: number;         // default 500m
  googleMapsUrl?: string;
  warrantyPeriodYears: number;          // e.g. 10 or 15
  validFrom: string;
  validUntil: string;
  coverageScope: string;
  explicitExclusions: string[];
  bilingualCareInstructions: {
    english: string[];
    malayalam: string[];
  };
  coveredDoors: WarrantyDoorScheduleItem[];
  claimsHistory: WarrantyClaimTicket[];
  status: 'ACTIVE' | 'EXPIRED' | 'VOIDED';
  issuedAt: string;
  issuedBy?: string;
}
