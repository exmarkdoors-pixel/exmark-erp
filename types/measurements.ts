export interface DoorItemInput {
  id?: string;
  doorNumber: string;
  model: string;
  frameType: string;
  colour: string;
  hingeSide: string;
  lockType: string;
  measurementUnit: 'MM' | 'CM' | 'INCH';
  heightLeft: number;
  heightRight: number;
  widthTop: number;
  widthBottom: number;
  wallThickness?: string;
  rebateDepth?: string;
  remarks?: string;
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
