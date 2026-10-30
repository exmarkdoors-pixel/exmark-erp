export type MeasurementUnit = 'CM' | 'INCH' | 'MM';

export interface DoorItemInput {
  id?: string;
  doorNumber: string;               // e.g. "#D1"
  categoryName?: string;            // e.g. "Bath FRP Door"
  model: string;                    // e.g. "EXM-A-100 (₹7000)"
  sizePreset?: string;              // e.g. "Mini Size (72×50)"
  frameType: string;                // e.g. "WPC Solid Extruded 100x65mm Frame"
  colour: string;                   // e.g. "Natural Teak (EXGC-510)"
  insideColour?: string;            // e.g. "Inside Colour (ഇൻസൈഡ് കളർ)..."
  hingeSide: string;                // e.g. "Left Hand (LH) - Inward"
  lockType: string;                 // e.g. "Baby Latch (+₹200)"
  lockPrice?: number;               // e.g. 200
  measurementUnit: MeasurementUnit; // Default: 'CM'
  heightLeft: number;
  heightRight: number;
  widthTop: number;
  widthBottom: number;
  // Fractional Inch components (e.g. "0/8", "1/8", "1/2")
  fractionHeightLeft?: string;
  fractionHeightRight?: string;
  fractionWidthTop?: string;
  fractionWidthBottom?: string;
  quantity?: number;                // Default: 1
  wallThickness?: string;
  rebateDepth?: string;
  priceAdjustment?: number;         // e.g. -100, 0, +100
  basePrice?: number;               // e.g. 7000
  unitPrice?: number;               // e.g. 7500
  pricingMode?: 'PIECE' | 'SQFT';   // Default: 'PIECE'
  calculatedSqFt?: number;          // e.g. 17.78
  calculatedFrameRft?: number;      // e.g. 16
  remarks?: string;
  photoCount?: number;
}

export interface SiteMeasurementRecord {
  id: string;
  refNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  orderRef?: string | null;
  siteName: string;
  siteAddress?: string | null;
  district: string;
  totalOpenings: number;
  measuredById?: string | null;
  engineerName?: string | null;
  date: string;
  rebateDepthMm?: string | null;
  wallThicknessMm?: string | null;
  notes?: string | null;
  status: 'DRAFT' | 'VERIFIED' | 'APPROVED' | 'SENT_TO_PRODUCTION';
  createdAt: string;
  updatedAt: string;
  doors: DoorItemInput[];
}
