/**
 * EXMARK ARCHITECTURAL DOORS — PURE TOLERANCE & CUTTING DEDUCTION CALCULATOR
 * Client-safe pure math & formatting functions (Zero Node.js/fs dependencies).
 */

export type FloorCondition =
  | 'FINISHED_TILE'       // 12mm bottom clearance (finished tile level)
  | 'UNFINISHED_CONCRETE' // 25mm bottom clearance (unfinished raw slab, tiles pending)
  | 'CARPET'              // 15mm bottom clearance (carpet / vinyl threshold)
  | 'CUSTOM';             // User-specified mm clearance

export interface ToleranceSettings {
  defaultSideRebateMm: number;               // Standard frame rebate: 40mm per side
  defaultOperatingClearanceMm: number;       // Side clearance gap: 5mm total
  defaultBottomTileClearanceMm: number;      // Finished tile floor clearance: 12mm
  defaultBottomUnfinishedClearanceMm: number; // Raw concrete floor clearance: 25mm
  defaultTopGapMm: number;                   // Top head gap: 5mm
  stockMatchingToleranceMm: number;          // Dimensional match tolerance: ±2mm
  updatedAt?: string;
}

export const DEFAULT_TOLERANCE_SETTINGS: ToleranceSettings = {
  defaultSideRebateMm: 40,
  defaultOperatingClearanceMm: 5,
  defaultBottomTileClearanceMm: 12,
  defaultBottomUnfinishedClearanceMm: 25,
  defaultTopGapMm: 5,
  stockMatchingToleranceMm: 2,
};

export interface AppliedDoorTolerances {
  sideRebateMm: number;
  operatingClearanceMm: number;
  bottomFloorClearanceMm: number;
  topGapMm: number;
  floorCondition: FloorCondition;
  frameProfileName: string;
  isShutterOnly: boolean;

  // Total deductions
  totalWidthDeductionMm: number;
  totalHeightDeductionMm: number;
  totalWidthDeductionCm: number;
  totalHeightDeductionCm: number;

  // Finished cutting dimensions
  shutterHeightMm: number;
  shutterWidthTopMm: number;
  shutterWidthBottomMm: number;
  effectiveShutterWidthMm: number;
  shutterHeightCm: number;
  shutterWidthTopCm: number;
  shutterWidthBottomCm: number;
  isTapered: boolean;
  shutterSizeCmText: string;
  shutterTapeInchText: string;
}

export interface ToleranceInput {
  rawHeightMm: number;
  rawWidthTopMm: number;
  rawWidthBottomMm?: number;
  frameTypeName?: string;
  frameProfileId?: string;
  frameProfile?: {
    name?: string;
    hDeductionCm?: number;
    wDeductionCm?: number;
    rebateDepthMm?: number;
    sectionWidthMm?: number;
    wallThicknessMm?: number;
  };
  frameHDeductionMm?: number;
  frameWDeductionMm?: number;
  rebateDepthMm?: number;
  floorCondition?: FloorCondition;
  customSideRebateMm?: number;
  customBottomClearanceMm?: number;
  customTopGapMm?: number;
  customOperatingClearanceMm?: number;
  settingsOverrides?: Partial<ToleranceSettings>;
}

/**
 * Converts a centimeter value to standard Kerala workshop tape inches with fractions (e.g. 208.3 cm -> 82").
 */
export function cmToTapeInchFormatted(cmVal: number): string {
  if (!cmVal || isNaN(cmVal) || cmVal <= 0) return '0"';
  const totalInches = cmVal / 2.54;
  let whole = Math.floor(totalInches);
  const rem = totalInches - whole;
  let sixteenths = Math.round(rem * 16);
  if (sixteenths === 16) {
    whole += 1;
    sixteenths = 0;
  }
  if (sixteenths === 0) return `${whole}"`;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(sixteenths, 16);
  return `${whole} ${sixteenths / g}/${16 / g}"`;
}

/**
 * Computes exact shutter cutting dimensions and deductions deterministically from raw measurements.
 * Safe for client-side and server-side evaluation.
 */
export function computeDoorTolerances(
  input: ToleranceInput,
  activeDefaults?: Partial<ToleranceSettings>
): AppliedDoorTolerances {
  const defaults: ToleranceSettings = {
    ...DEFAULT_TOLERANCE_SETTINGS,
    ...(activeDefaults || {}),
    ...(input.settingsOverrides || {}),
  };

  const frameName = (input.frameTypeName || '').trim();
  const isShutterOnly =
    frameName.toLowerCase().includes('without frame') ||
    frameName.toLowerCase().includes('shutter only') ||
    frameName.toLowerCase().includes('only door');

  const floorCond: FloorCondition = input.floorCondition || 'FINISHED_TILE';

  // 1. Determine Bottom Floor Clearance
  let bottomClearanceMm: number;
  if (input.customBottomClearanceMm !== undefined && !isNaN(input.customBottomClearanceMm)) {
    bottomClearanceMm = input.customBottomClearanceMm;
  } else if (floorCond === 'UNFINISHED_CONCRETE') {
    bottomClearanceMm = defaults.defaultBottomUnfinishedClearanceMm; // 25mm
  } else if (floorCond === 'CARPET') {
    bottomClearanceMm = 15;
  } else {
    bottomClearanceMm = defaults.defaultBottomTileClearanceMm; // 12mm
  }

  // 2. Determine Top Gap Clearance
  const topGapMm =
    input.customTopGapMm !== undefined && !isNaN(input.customTopGapMm)
      ? input.customTopGapMm
      : defaults.defaultTopGapMm; // 5mm

  // 3. Determine Side Rebate & Operating Clearance
  let sideRebateMm: number;
  let operatingClearanceMm: number;

  const frameRebate =
    input.customSideRebateMm ??
    input.rebateDepthMm ??
    input.frameProfile?.rebateDepthMm;

  if (isShutterOnly) {
    sideRebateMm = 0;
    operatingClearanceMm = input.customOperatingClearanceMm ?? 10;
    bottomClearanceMm = Math.max(10, bottomClearanceMm);
  } else if (frameRebate !== undefined && !isNaN(frameRebate) && frameRebate > 0) {
    sideRebateMm = frameRebate;
    operatingClearanceMm = input.customOperatingClearanceMm ?? defaults.defaultOperatingClearanceMm;
  } else if (frameName.toLowerCase().includes('mini')) {
    // Mini frame 40x25: 35mm rebate per side + 5mm gap
    sideRebateMm = 35;
    operatingClearanceMm = input.customOperatingClearanceMm ?? defaults.defaultOperatingClearanceMm;
  } else if (frameName.toLowerCase().includes('4x2') || frameName.toLowerCase().includes('heavy')) {
    // Heavy 4x2 frame: 45mm rebate per side + 5mm gap
    sideRebateMm = 45;
    operatingClearanceMm = input.customOperatingClearanceMm ?? defaults.defaultOperatingClearanceMm;
  } else {
    // Standard Regular Frame: 40mm rebate per side + 5mm gap
    sideRebateMm = defaults.defaultSideRebateMm;
    operatingClearanceMm = input.customOperatingClearanceMm ?? defaults.defaultOperatingClearanceMm;
  }

  // 4. Calculate Total Deductions
  let totalWDeductMm: number;
  if (input.frameWDeductionMm !== undefined && !isNaN(input.frameWDeductionMm) && input.frameWDeductionMm > 0) {
    totalWDeductMm = input.frameWDeductionMm;
  } else if (
    input.frameProfile?.wDeductionCm !== undefined &&
    !isNaN(input.frameProfile.wDeductionCm) &&
    input.frameProfile.wDeductionCm > 0
  ) {
    totalWDeductMm = Math.round(input.frameProfile.wDeductionCm * 10);
  } else {
    totalWDeductMm = isShutterOnly
      ? operatingClearanceMm
      : (sideRebateMm * 2) + operatingClearanceMm;
  }

  let totalHDeductMm: number;
  if (input.frameHDeductionMm !== undefined && !isNaN(input.frameHDeductionMm) && input.frameHDeductionMm > 0) {
    totalHDeductMm = input.frameHDeductionMm;
  } else if (
    input.frameProfile?.hDeductionCm !== undefined &&
    !isNaN(input.frameProfile.hDeductionCm) &&
    input.frameProfile.hDeductionCm > 0
  ) {
    totalHDeductMm = Math.round(input.frameProfile.hDeductionCm * 10);
  } else {
    totalHDeductMm = bottomClearanceMm + topGapMm;
  }

  const totalWidthDeductionCm = parseFloat((totalWDeductMm / 10).toFixed(2));
  const totalHeightDeductionCm = parseFloat((totalHDeductMm / 10).toFixed(2));

  // 5. Finished Shutter Dimensions
  const rawH = input.rawHeightMm;
  const rawWTop = input.rawWidthTopMm;
  const rawWBtm =
    input.rawWidthBottomMm !== undefined && !isNaN(input.rawWidthBottomMm) && input.rawWidthBottomMm > 0
      ? input.rawWidthBottomMm
      : rawWTop;

  const shutterHeightMm = Math.max(100, Math.round(rawH - totalHDeductMm));
  const shutterWidthTopMm = Math.max(100, Math.round(rawWTop - totalWDeductMm));
  const shutterWidthBottomMm = Math.max(100, Math.round(rawWBtm - totalWDeductMm));
  const effectiveShutterWidthMm = Math.max(shutterWidthTopMm, shutterWidthBottomMm);

  const shutterHeightCm = parseFloat((shutterHeightMm / 10).toFixed(1));
  const shutterWidthTopCm = parseFloat((shutterWidthTopMm / 10).toFixed(1));
  const shutterWidthBottomCm = parseFloat((shutterWidthBottomMm / 10).toFixed(1));
  const isTapered = Math.abs(shutterWidthTopCm - shutterWidthBottomCm) >= 0.1;

  // 6. Text labels for Shop Floor and Mobile display
  const shutterSizeCmText = isTapered
    ? `${shutterHeightCm} × [TOP: ${shutterWidthTopCm} / BTM: ${shutterWidthBottomCm}] cm`
    : `${shutterHeightCm} × ${shutterWidthTopCm} cm`;

  const tapeH = cmToTapeInchFormatted(shutterHeightCm);
  const tapeWTop = cmToTapeInchFormatted(shutterWidthTopCm);
  const tapeWBtm = cmToTapeInchFormatted(shutterWidthBottomCm);
  const shutterTapeInchText = isTapered
    ? `${tapeH} × [T: ${tapeWTop} / B: ${tapeWBtm}]`
    : `${tapeH} × ${tapeWTop}`;

  return {
    sideRebateMm,
    operatingClearanceMm,
    bottomFloorClearanceMm: bottomClearanceMm,
    topGapMm,
    floorCondition: floorCond,
    frameProfileName: frameName || 'Regular 3x2 (70x45mm)',
    isShutterOnly,
    totalWidthDeductionMm: totalWDeductMm,
    totalHeightDeductionMm: totalHDeductMm,
    totalWidthDeductionCm,
    totalHeightDeductionCm,
    shutterHeightMm,
    shutterWidthTopMm,
    shutterWidthBottomMm,
    effectiveShutterWidthMm,
    shutterHeightCm,
    shutterWidthTopCm,
    shutterWidthBottomCm,
    isTapered,
    shutterSizeCmText,
    shutterTapeInchText,
  };
}
