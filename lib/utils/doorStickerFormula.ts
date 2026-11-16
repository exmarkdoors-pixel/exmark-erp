/**
 * EXMARK ERP — Shared Floor Door Sizing, Inch⇄CM Conversion & 12L Sticker Formula Engine
 */

export function cmToTapeInch(cmVal: number): string {
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

export function parseTapeInchToCm(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/"/g, '').trim();
  const parts = clean.split(/\s+/);
  let inches = 0;
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = parseFloat(parts[0]) || 0;
    const [num, den] = parts[1].split('/').map(Number);
    inches = whole + (num || 0) / (den || 1);
  } else if (clean.includes('/')) {
    const [num, den] = clean.split('/').map(Number);
    inches = (num || 0) / (den || 1);
  } else {
    inches = parseFloat(clean) || 0;
  }
  return Number((inches * 2.54).toFixed(2));
}

export interface StickerSizeInput {
  rawHeightCm: number;
  rawWidthTopCm: number;
  rawWidthBtmCm: number;
  widthLinked: boolean;
  hDeductionCm: number;
  wDeductionCm: number;
  hingeSide: 'L' | 'R';
  extraHAdjCm?: number;
  extraWAdjCm?: number;
}

export interface StickerSizeResult {
  hMinusCm: number;
  wMinusCm: number;
  finH: number;
  finTopW: number;
  finBtmW: number;
  finHText: string;
  finTopWText: string;
  finBtmWText: string;
  hLabel: 'H-LEFT' | 'H-RIGHT';
}

function roundTenthConservative(val: number): number {
  const fixed4 = Number(val.toFixed(4));
  return Math.max(0, Math.round(fixed4 * 10 - 1e-6) / 10);
}

/**
 * Computes 12L Sticker finished dimensions using Chowkhat Frame CM deductions.
 * Rounds to 1 decimal place cleanly (exact .05 halves round conservatively downward for fitting clearance).
 * Example (Mini Type 40x25mm: hDeductionCm = 4.5, wDeductionCm = 7.6):
 *   Raw 225.59 x T:77.15 / B:78.11 -> -221.1, TOP: -69.5, BTM: -70.5
 */
export function computeStickerSizes(input: StickerSizeInput): StickerSizeResult {
  const hMinus = Math.max(0, Number((input.hDeductionCm - (input.extraHAdjCm || 0)).toFixed(2)));
  const wMinus = Math.max(0, Number((input.wDeductionCm - (input.extraWAdjCm || 0)).toFixed(2)));

  const finH = roundTenthConservative(input.rawHeightCm - hMinus);
  const finTopW = roundTenthConservative(input.rawWidthTopCm - wMinus);
  const rawBtm = input.widthLinked ? input.rawWidthTopCm : input.rawWidthBtmCm;
  const finBtmW = roundTenthConservative(rawBtm - wMinus);

  // Workshop convention: Hinge R -> H-LEFT label on sticker, Hinge L -> H-RIGHT label
  const hLabel = input.hingeSide === 'L' ? 'H-RIGHT' : 'H-LEFT';

  return {
    hMinusCm: hMinus,
    wMinusCm: wMinus,
    finH,
    finTopW,
    finBtmW,
    finHText: `-${finH.toFixed(1)}`,
    finTopWText: `-${finTopW.toFixed(1)}`,
    finBtmWText: `-${finBtmW.toFixed(1)}`,
    hLabel,
  };
}
