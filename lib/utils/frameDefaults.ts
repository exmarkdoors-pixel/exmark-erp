export interface CustomFrameProfile {
  id: string; // e.g. FRM-REGULAR
  name: string; // e.g. "Regular Frame"
  material: 'FRP_WRAP' | 'WPC_SOLID' | 'COMPOSITE' | 'HARDWOOD' | 'NONE';
  wallThicknessMm: number; // e.g. 72, 95, 90, 40
  sectionWidthMm: number; // e.g. 50, 48, 58, 45, 25
  rebateDepthMm: number; // e.g. 35, 38, 40
  hDeductionCm: number; // Height deduction in cm (e.g. 4.5)
  wDeductionCm: number; // Width deduction in cm (e.g. 7.6)
  pieceRateCost?: number; // e.g. 125 (worker piece rate)
  sellingPrice?: number; // legacy standalone frame price
  quotationExtraRate?: number; // extra surcharge added per door in quotation (0 = Included)
  materialCost?: number; // Base raw material / procurement cost for frame profile (₹)
  woodThicknessCm?: number; // BOQ frame wood reeper thickness in cm (Regular = 2)
  woodWidthCm?: number; // BOQ frame wood reeper width in cm (Regular = 7)
  woodLengthDeductionCm?: number; // Subtractive allowance from total frame perimeter/height cm (Regular = 35)
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

const SEED_TIMESTAMP = '2026-11-10T00:00:00.000Z';

export const DEFAULT_FRAME_PROFILES: CustomFrameProfile[] = [
  {
    id: 'FRM-REGULAR',
    name: 'Regular Frame',
    material: 'FRP_WRAP',
    wallThicknessMm: 72,
    sectionWidthMm: 50,
    rebateDepthMm: 35,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 0,
    quotationExtraRate: 0,
    materialCost: 0,
    woodThicknessCm: 2,
    woodWidthCm: 7,
    woodLengthDeductionCm: 35,
    description: '72mm x 50mm Regular Door Frame (Default)',
    isDefault: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-MEDIUM',
    name: 'Medium Frame',
    material: 'FRP_WRAP',
    wallThicknessMm: 95,
    sectionWidthMm: 48,
    rebateDepthMm: 35,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 0,
    quotationExtraRate: 700,
    materialCost: 350,
    woodThicknessCm: 2,
    woodWidthCm: 7,
    woodLengthDeductionCm: 35,
    description: '95mm x 48mm Medium Section Frame (+₹700)',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-HEAVY',
    name: 'Heavy Frame',
    material: 'WPC_SOLID',
    wallThicknessMm: 95,
    sectionWidthMm: 58,
    rebateDepthMm: 38,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 0,
    quotationExtraRate: 1300,
    materialCost: 650,
    woodThicknessCm: 2,
    woodWidthCm: 7,
    woodLengthDeductionCm: 35,
    description: '95mm x 58mm Heavy-Duty Frame (+₹1,300)',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-SCHOOL',
    name: 'School Frame',
    material: 'COMPOSITE',
    wallThicknessMm: 90,
    sectionWidthMm: 45,
    rebateDepthMm: 35,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 0,
    quotationExtraRate: 200,
    woodThicknessCm: 2,
    woodWidthCm: 7,
    woodLengthDeductionCm: 35,
    description: '90mm x 45mm School / Institutional Frame (+₹200)',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-MINI',
    name: 'Mini Type',
    material: 'FRP_WRAP',
    wallThicknessMm: 40,
    sectionWidthMm: 25,
    rebateDepthMm: 25,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 1450,
    quotationExtraRate: 0,
    description: '40x25mm Slim Section (Mini Type Chowkhat Frame)',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-001',
    name: 'Bedroom 4x2 (100x50mm FRP Solid)',
    material: 'FRP_WRAP',
    wallThicknessMm: 100,
    sectionWidthMm: 50,
    rebateDepthMm: 35,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 1650,
    quotationExtraRate: 0,
    description: '100x50mm (4"x2") FRP wrapped moisture-proof frame',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-002',
    name: 'Bedroom 2x2.5 (50x65mm WPC Frame)',
    material: 'WPC_SOLID',
    wallThicknessMm: 65,
    sectionWidthMm: 50,
    rebateDepthMm: 35,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 2200,
    quotationExtraRate: 0,
    description: '50x65mm (2"x2.5") Heavy-duty solid WPC composite frame',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-003',
    name: 'Single Rebate Kerala Hardwood Frame (4" x 2.5")',
    material: 'HARDWOOD',
    wallThicknessMm: 100,
    sectionWidthMm: 65,
    rebateDepthMm: 35,
    hDeductionCm: 4.5,
    wDeductionCm: 7.6,
    pieceRateCost: 125,
    sellingPrice: 2850,
    quotationExtraRate: 0,
    description: 'Traditional Kerala hand-planed hardwood frame with mortise & tenon joints.',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-004',
    name: 'Double Rebate Acoustic Frame (5" x 2.5")',
    material: 'COMPOSITE',
    wallThicknessMm: 130,
    sectionWidthMm: 65,
    rebateDepthMm: 40,
    hDeductionCm: 5.0,
    wDeductionCm: 8.0,
    pieceRateCost: 125,
    sellingPrice: 2600,
    quotationExtraRate: 0,
    description: 'Double rebate frame for luxury soundproof master bedroom & home theatre doors.',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'FRM-005',
    name: 'Without Frame (Shutter Only)',
    material: 'NONE',
    wallThicknessMm: 0,
    sectionWidthMm: 0,
    rebateDepthMm: 0,
    hDeductionCm: 1.2,
    wDeductionCm: 1.0,
    pieceRateCost: 0,
    sellingPrice: -800,
    quotationExtraRate: -800,
    woodThicknessCm: 0,
    woodWidthCm: 0,
    woodLengthDeductionCm: 0,
    description: 'Door shutter supplied alone (Without Frame) — deducts ₹800 from unit rate.',
    isDefault: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export function getDefaultFrameProfile(frames?: CustomFrameProfile[]): CustomFrameProfile {
  const list = frames && frames.length > 0 ? frames : DEFAULT_FRAME_PROFILES;
  return (
    list.find((f) => f.isDefault) ||
    list.find((f) => f.id === 'FRM-REGULAR') ||
    list[0]
  );
}

export function formatFrameSectionLabel(
  frame: Pick<CustomFrameProfile, 'name' | 'wallThicknessMm' | 'sectionWidthMm'>
): string {
  if (frame.wallThicknessMm > 0 && frame.sectionWidthMm > 0) {
    return `${frame.name} (${frame.wallThicknessMm}×${frame.sectionWidthMm}mm)`;
  }
  return frame.name;
}
