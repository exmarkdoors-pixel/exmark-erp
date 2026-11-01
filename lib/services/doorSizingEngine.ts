/**
 * EXMARK ARCHITECTURAL DOORS — PRECISION FRAME DEDUCTION & SIZING ENGINE
 * Computes exact shutter sizes from outer frame dimensions based on factory frame profiles.
 * Incorporates BIS IS 14856:2000 manufacturing standards, 3-point hinge distribution,
 * lock mortise centers, square footage and running feet calculations.
 */

export type FramePresetKey =
  | 'regular_3x2'
  | 'mini'
  | 'bedroom_4x2'
  | 'bedroom_2x2_5'
  | 'school_90x45';

export interface FramePresetConfig {
  key: FramePresetKey;
  name: string;
  wDedMm: number;
  hDedMm: number;
  description: string;
  defaultApplication: string;
}

export const FRAME_DEDUCTION_PRESETS: Record<FramePresetKey, FramePresetConfig> = {
  regular_3x2: {
    key: 'regular_3x2',
    name: 'Regular 3x2',
    wDedMm: 7,
    hDedMm: 14,
    description: 'Standard residential frame profile (70×45mm or 3×2")',
    defaultApplication: 'Internal Bed / Living Room Doors',
  },
  mini: {
    key: 'mini',
    name: 'Mini Type',
    wDedMm: 6,
    hDedMm: 12,
    description: 'Compact frame profile for tight masonry openings',
    defaultApplication: 'Toilet / Bathroom & Balcony Utility Doors',
  },
  bedroom_4x2: {
    key: 'bedroom_4x2',
    name: 'Bedroom 4x2',
    wDedMm: 8,
    hDedMm: 15,
    description: 'Heavy timber / deep jamb frame profile (100×50mm)',
    defaultApplication: 'Master Bedroom & Entrance Double Rebate Doors',
  },
  bedroom_2x2_5: {
    key: 'bedroom_2x2_5',
    name: 'Bedroom 2x2.5',
    wDedMm: 7,
    hDedMm: 14,
    description: 'Standard builder apartment frame profile',
    defaultApplication: 'High-Rise Builder Apartment Doors',
  },
  school_90x45: {
    key: 'school_90x45',
    name: 'School 90x45mm',
    wDedMm: 8,
    hDedMm: 16,
    description: 'Institutional heavy-duty frame profile',
    defaultApplication: 'Schools, Hospitals & Commercial Projects',
  },
};

export interface DoorSizingInput {
  frameWidthMm: number;
  frameHeightMm: number;
  frameWidthBottomMm?: number;
  presetKey?: FramePresetKey;
  customSideRebateMm?: number;
  customBottomClearanceMm?: number;
  customTopGapMm?: number;
}

export interface DoorSizingOutput {
  frameWidthMm: number;
  frameHeightMm: number;
  doorWidthMm: number;
  doorHeightMm: number;
  doorWidthBottomMm: number;
  effectiveWidthMm: number;
  shutterSizeMm: string;
  shutterSizeCm: string;
  shutterSizeInches: string;
  shutterTapeDisplay: string;
  squareFeet: number;
  runningFeet: number;
  hingePositionsMm: [number, number, number];
  lockCenterMm: number;
  presetApplied: FramePresetConfig;
}

/**
 * Calculates finished door shutter dimensions, hinge layouts, and surface area.
 */
export function calculateDoorSizing(input: DoorSizingInput): DoorSizingOutput {
  const presetKey = input.presetKey || 'regular_3x2';
  const preset = FRAME_DEDUCTION_PRESETS[presetKey] || FRAME_DEDUCTION_PRESETS.regular_3x2;

  // Deduction values (use custom overrides if provided, else use preset)
  const wDed = input.customSideRebateMm !== undefined ? input.customSideRebateMm : preset.wDedMm;
  const hDed =
    input.customBottomClearanceMm !== undefined && input.customTopGapMm !== undefined
      ? input.customBottomClearanceMm + input.customTopGapMm
      : preset.hDedMm;

  const doorWidthMm = Math.max(100, Math.round(input.frameWidthMm - wDed));
  const doorWidthBottomMm = input.frameWidthBottomMm
    ? Math.max(100, Math.round(input.frameWidthBottomMm - wDed))
    : doorWidthMm;
  const doorHeightMm = Math.max(100, Math.round(input.frameHeightMm - hDed));

  const effectiveWidthMm = Math.max(doorWidthMm, doorWidthBottomMm);

  // Imperial conversions
  const widthInches = (effectiveWidthMm / 25.4).toFixed(2);
  const heightInches = (doorHeightMm / 25.4).toFixed(2);
  const widthCm = (effectiveWidthMm / 10).toFixed(1);
  const heightCm = (doorHeightMm / 10).toFixed(1);

  // Area metrics: 1 sq.ft = 92903.04 mm², 1 running foot = 304.8 mm
  const squareFeet = parseFloat(((effectiveWidthMm * doorHeightMm) / 92903.04).toFixed(2));
  const runningFeet = parseFloat((((2 * doorHeightMm) + effectiveWidthMm) / 304.8).toFixed(2));

  // 3-Point Hinge positioning: Top at 150mm, Midpoint, Bottom at height - 200mm
  const hingePositionsMm: [number, number, number] = [
    150,
    Math.round(doorHeightMm / 2),
    Math.max(300, doorHeightMm - 200),
  ];

  // Standard lock mortise centerline (1000mm from shutter bottom)
  const lockCenterMm = 1000;

  return {
    frameWidthMm: input.frameWidthMm,
    frameHeightMm: input.frameHeightMm,
    doorWidthMm,
    doorHeightMm,
    doorWidthBottomMm,
    effectiveWidthMm,
    shutterSizeMm: `${effectiveWidthMm} × ${doorHeightMm} mm`,
    shutterSizeCm: `${heightCm} × ${widthCm} cm`,
    shutterSizeInches: `${heightInches}" × ${widthInches}"`,
    shutterTapeDisplay: `${heightInches}" × ${widthInches}" (${heightCm} × ${widthCm} cm)`,
    squareFeet,
    runningFeet,
    hingePositionsMm,
    lockCenterMm,
    presetApplied: preset,
  };
}

export function parseInchFraction(frac?: string): number {
  if (!frac || frac === '0') return 0;
  const parts = frac.trim().split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
  }
  return 0;
}

export function decimalToInchFraction(decimalInches: number): { whole: number; fraction: string } {
  const whole = Math.floor(decimalInches);
  const rem = decimalInches - whole;
  const sixteenths = Math.round(rem * 16);
  if (sixteenths <= 0) return { whole, fraction: '0' };
  if (sixteenths >= 16) return { whole: whole + 1, fraction: '0' };
  if (sixteenths % 8 === 0) return { whole, fraction: `${sixteenths / 8}/2` };
  if (sixteenths % 4 === 0) return { whole, fraction: `${sixteenths / 4}/4` };
  if (sixteenths % 2 === 0) return { whole, fraction: `${sixteenths / 2}/8` };
  return { whole, fraction: `${sixteenths}/16` };
}

export function formatDimensionDisplay(
  height: number,
  widthTop: number,
  widthBottomOrUnit?: number | 'cm' | 'mm' | 'inch',
  unitOrHFrac?: 'cm' | 'mm' | 'inch' | string,
  hFracOrWTopFrac?: string,
  wTopFracOrWBtmFrac?: string,
  wBottomFrac?: string
): string {
  if (typeof widthBottomOrUnit === 'string') {
    const unit = widthBottomOrUnit as 'cm' | 'mm' | 'inch';
    const hFrac = typeof unitOrHFrac === 'string' ? unitOrHFrac : '0';
    const wFrac = typeof hFracOrWTopFrac === 'string' ? hFracOrWTopFrac : '0';

    if (unit === 'inch') {
      const hText = hFrac && hFrac !== '0' ? `${height} ${hFrac}"` : `${height}"`;
      const wText = wFrac && wFrac !== '0' ? `${widthTop} ${wFrac}"` : `${widthTop}"`;
      return `${hText} × ${wText}`;
    }
    return `${height} × ${widthTop} ${unit}`;
  }

  const wBtm = typeof widthBottomOrUnit === 'number' && !isNaN(widthBottomOrUnit) ? widthBottomOrUnit : widthTop;
  const unit = (typeof unitOrHFrac === 'string' && ['cm', 'mm', 'inch'].includes(unitOrHFrac))
    ? (unitOrHFrac as 'cm' | 'mm' | 'inch')
    : 'inch';
  const hFrac = typeof hFracOrWTopFrac === 'string' ? hFracOrWTopFrac : '0';
  const wTopFrac = typeof wTopFracOrWBtmFrac === 'string' ? wTopFracOrWBtmFrac : '0';
  const wBtmFrac = typeof wBottomFrac === 'string' ? wBottomFrac : wTopFrac;

  if (unit === 'inch') {
    const hText = hFrac && hFrac !== '0' ? `${height} ${hFrac}"` : `${height}"`;
    const wTopText = wTopFrac && wTopFrac !== '0' ? `${widthTop} ${wTopFrac}"` : `${widthTop}"`;
    const wBtmText = wBtmFrac && wBtmFrac !== '0' ? `${wBtm} ${wBtmFrac}"` : `${wBtm}"`;

    if (wTopText === wBtmText) {
      return `${hText} × ${wTopText}`;
    }
    return `${hText} × [Top: ${wTopText} / Btm: ${wBtmText}]`;
  }

  if (widthTop === wBtm) {
    return `${height} × ${widthTop} ${unit}`;
  }
  return `${height} × [Top: ${widthTop} / Btm: ${wBtm}] ${unit}`;
}

export function calculateSqFt(
  h: number,
  wTop: number,
  wBottom?: number,
  unit: 'cm' | 'mm' | 'inch' = 'cm',
  hFrac?: string,
  wTopFrac?: string,
  wBottomFrac?: string
): string {
  const wBtm = wBottom !== undefined && !isNaN(wBottom) ? wBottom : wTop;
  let hInches = h;
  let wTopInches = wTop;
  let wBtmInches = wBtm;

  if (unit === 'inch') {
    hInches = h + parseInchFraction(hFrac);
    wTopInches = wTop + parseInchFraction(wTopFrac);
    wBtmInches = wBtm + parseInchFraction(wBottomFrac ?? wTopFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wTopInches = wTop / 2.54;
    wBtmInches = wBtm / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wTopInches = wTop / 25.4;
    wBtmInches = wBtm / 25.4;
  }

  const avgWidthInches = (wTopInches + wBtmInches) / 2;
  return ((hInches * avgWidthInches) / 144).toFixed(2);
}
