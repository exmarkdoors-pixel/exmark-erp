/**
 * EXMARK ERP — FRP Door Auto Cost Calculator & Pricing Engine
 *
 * Rules:
 * 1. Standard Size Threshold: Maximum Width 80 cm, Maximum Height 210 cm (80 x 210 cm).
 * 2. Standard Threshold Area in Sq.Ft = (80 * 210) / (2.54 * 2.54 * 144) ≈ 18.0834 sq.ft.
 * 3. Standard Piece Rates (for doors within 80 x 210 cm):
 *    - Category A: ₹7,000 / piece
 *    - Category B: ₹7,600 / piece
 *    - Category C: ₹8,200 / piece
 *    - Category D: ₹8,800 / piece
 *    - Category E: ₹9,500 / piece
 * 4. Extra Size Calculation:
 *    - If size exceeds 80 cm width OR 210 cm height (actual sq.ft > standard 18.08 sq.ft):
 *      Extra Sq.Ft = Actual Sq.Ft - Standard Sq.Ft (18.08)
 *      Extra Cost = Extra Sq.Ft * Extra Sq.Ft Rate (default ₹250 / sq.ft)
 *      Final Rate = Base Piece Rate + Extra Cost
 * 5. Below Size Calculation:
 *    - If size is below standard (actual sq.ft < standard 18.08 sq.ft):
 *      Divided Rate = Math.round(Actual Sq.Ft * (Base Piece Rate / Standard Sq.Ft))
 *      (Or Base Piece Rate minimum if set to 'BASE_MINIMUM')
 * 6. Rate Card Customization:
 *    - Piece rates (A-E), extra sq.ft rate (₹250), max dimensions, and below-size calculation
 *      are fully editable and persisted for future quotations.
 */

// In isomorphic environments (client vs server), fs/path are loaded conditionally
let fsModule: typeof import('fs') | null = null;
let pathModule: typeof import('path') | null = null;

if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fsModule = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pathModule = require('path');
  } catch {
    // Browser or edge runtime
  }
}

export type FrpDoorCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export interface LockOption {
  id: string;
  name: string;
  type?: string;
  price: number;
  description?: string;
}

export interface ColourOption {
  id: string;
  name: string;
  code?: string;
  extraRate?: number;
  category?: 'WOOD_GRAIN' | 'SOLID_COLOR' | 'METALLIC' | 'CUSTOM';
}

export interface FrpRateCardSettings {
  maxWidthCm: number;        // default: 80
  maxHeightCm: number;       // default: 210
  extraSqftRate: number;     // default: 250 (₹250/sq.ft)
  categoryPieceRates: {
    A: number;               // default: 7000
    B: number;               // default: 7600
    C: number;               // default: 8200
    D: number;               // default: 8800
    E: number;               // default: 9500
  };
  belowSizeCalculationMode: 'DIVIDED_RATE' | 'BASE_MINIMUM'; // default: 'DIVIDED_RATE'
  locks?: LockOption[];
  colours?: ColourOption[];
  updatedAt?: string;
}

export const DEFAULT_LOCK_OPTIONS: LockOption[] = [
  { id: 'lock-none', name: 'Provision Only (No Hardware)', type: 'None', price: 0, description: 'Standard lock hole cutout mortise provision only' },
  { id: 'lock-mortise-60', name: 'Mortise Lock 60mm Brass Double Throw', type: 'Mortise', price: 850, description: 'Heavy brass mortise latch + 3 keys' },
  { id: 'lock-cyl-privacy', name: 'Cylindrical Knob Lock (Bathroom Privacy)', type: 'Cylindrical', price: 450, description: 'Stainless steel cylindrical keyless privacy knob' },
  { id: 'lock-baby-latch', name: 'Baby Latch / Tower Bolt Kit', type: 'Latch', price: 300, description: 'Dual brass baby latches + strike plate' },
  { id: 'lock-magnetic', name: 'Heavy Duty Magnetic Roller Catch', type: 'Magnetic', price: 250, description: 'Silent magnetic closure mechanism' },
  { id: 'lock-multipoint', name: 'Multipoint High Security Lock System', type: 'Security', price: 1450, description: '3-point master shootbolt lock' },
];

export const DEFAULT_COLOUR_OPTIONS: ColourOption[] = [
  { id: 'col-teak-matte', name: 'Natural Teak Matte', code: '#8B5A2B', extraRate: 0, category: 'WOOD_GRAIN' },
  { id: 'col-rosewood-gloss', name: 'Rose Wood Glossy', code: '#58111A', extraRate: 0, category: 'WOOD_GRAIN' },
  { id: 'col-white-gloss', name: 'Pure White Glossy', code: '#F8F9FA', extraRate: 0, category: 'SOLID_COLOR' },
  { id: 'col-mahogany-dark', name: 'Mahogany Dark Grain', code: '#420D09', extraRate: 0, category: 'WOOD_GRAIN' },
  { id: 'col-eeti-wood', name: 'Eeti Wood Deep Grain', code: '#3B2219', extraRate: 0, category: 'WOOD_GRAIN' },
  { id: 'col-slate-grey', name: 'Slate Grey Solid', code: '#475569', extraRate: 0, category: 'SOLID_COLOR' },
  { id: 'col-ivory-cream', name: 'Ivory Cream Solid', code: '#FFFDD0', extraRate: 0, category: 'SOLID_COLOR' },
  { id: 'col-metallic-bronze', name: 'Metallic Bronze Luxury', code: '#A97142', extraRate: 350, category: 'METALLIC' },
];

export const DEFAULT_FRP_RATE_CARD: FrpRateCardSettings = {
  maxWidthCm: 80,
  maxHeightCm: 210,
  extraSqftRate: 250,
  categoryPieceRates: {
    A: 7000,
    B: 7600,
    C: 8200,
    D: 8800,
    E: 9500,
  },
  belowSizeCalculationMode: 'DIVIDED_RATE',
  locks: DEFAULT_LOCK_OPTIONS,
  colours: DEFAULT_COLOUR_OPTIONS,
};

function getStorePath(): string {
  if (pathModule) {
    return pathModule.join(process.cwd(), 'data', 'pricing-rate-card.json');
  }
  return '';
}

/**
 * Loads persisted rate card settings, falling back to defaults.
 */
export function getFrpRateCardSettings(): FrpRateCardSettings {
  if (!fsModule || !pathModule) return DEFAULT_FRP_RATE_CARD;
  try {
    const storePath = getStorePath();
    if (!fsModule.existsSync(storePath)) {
      const dir = pathModule.dirname(storePath);
      if (!fsModule.existsSync(dir)) fsModule.mkdirSync(dir, { recursive: true });
      fsModule.writeFileSync(storePath, JSON.stringify(DEFAULT_FRP_RATE_CARD, null, 2), 'utf8');
      return DEFAULT_FRP_RATE_CARD;
    }
    const raw = fsModule.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FRP_RATE_CARD,
      ...parsed,
      categoryPieceRates: {
        ...DEFAULT_FRP_RATE_CARD.categoryPieceRates,
        ...(parsed.categoryPieceRates || {}),
      },
      locks: Array.isArray(parsed.locks) && parsed.locks.length > 0 ? parsed.locks : DEFAULT_LOCK_OPTIONS,
      colours: Array.isArray(parsed.colours) && parsed.colours.length > 0 ? parsed.colours : DEFAULT_COLOUR_OPTIONS,
    };
  } catch {
    return DEFAULT_FRP_RATE_CARD;
  }
}

/**
 * Saves updated rate card settings.
 */
export function saveFrpRateCardSettings(settings: Partial<FrpRateCardSettings>): FrpRateCardSettings {
  if (!fsModule || !pathModule) return DEFAULT_FRP_RATE_CARD;
  try {
    const storePath = getStorePath();
    const current = getFrpRateCardSettings();
    const updated: FrpRateCardSettings = {
      ...current,
      ...settings,
      categoryPieceRates: {
        ...current.categoryPieceRates,
        ...(settings.categoryPieceRates || {}),
      },
      locks: settings.locks !== undefined ? settings.locks : current.locks || DEFAULT_LOCK_OPTIONS,
      colours: settings.colours !== undefined ? settings.colours : current.colours || DEFAULT_COLOUR_OPTIONS,
      updatedAt: new Date().toISOString(),
    };
    const dir = pathModule.dirname(storePath);
    if (!fsModule.existsSync(dir)) fsModule.mkdirSync(dir, { recursive: true });
    fsModule.writeFileSync(storePath, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (err) {
    console.error('[frpPricingEngine] Failed to save settings:', err);
    return DEFAULT_FRP_RATE_CARD;
  }
}

export interface FrpPricingResult {
  category: FrpDoorCategory;
  basePieceRate: number;
  finalUnitRate: number;
  hCm: number;
  wCm: number;
  actualSqft: number;
  standardSqft: number;
  isExtraSize: boolean;
  isBelowSize: boolean;
  extraSqft: number;
  extraCost: number;
  dividedRate: number;
  lockId?: string;
  lockPrice: number;
  colourId?: string;
  colourExtraRate: number;
  breakdown: string;
}

/**
 * Parses fraction strings like "1/2", "3/8", "1/16" into decimal inches.
 */
export function parseFraction(frac?: string): number {
  if (!frac || frac === '0' || frac === '0/8' || frac === '0/16') return 0;
  const parts = frac.split('/');
  if (parts.length === 2) {
    const n = parseFloat(parts[0]);
    const d = parseFloat(parts[1]);
    return d > 0 ? n / d : 0;
  }
  return 0;
}

/**
 * Calculates FRP door unit rate based on dimensions, unit, and selected category.
 */
export function calculateFrpDoorPrice(params: {
  category: FrpDoorCategory;
  height: number;
  widthTop: number;
  widthBottom?: number;
  unit: 'cm' | 'mm' | 'inch';
  heightFraction?: string;
  widthTopFraction?: string;
  widthBottomFraction?: string;
  lockId?: string;
  lockPrice?: number;
  colourId?: string;
  colourExtraRate?: number;
  settings?: FrpRateCardSettings;
}): FrpPricingResult {
  const settings = params.settings || getFrpRateCardSettings();
  const category = params.category || 'A';
  const basePieceRate = settings.categoryPieceRates[category] ?? DEFAULT_FRP_RATE_CARD.categoryPieceRates[category];

  const wBottom = params.widthBottom !== undefined && !isNaN(params.widthBottom)
    ? params.widthBottom
    : params.widthTop;

  // 1. Convert height & average width to cm & inches
  let hInches = params.height;
  let wTopInches = params.widthTop;
  let wBtmInches = wBottom;

  if (params.unit === 'inch') {
    hInches = params.height + parseFraction(params.heightFraction);
    wTopInches = params.widthTop + parseFraction(params.widthTopFraction);
    wBtmInches = wBottom + parseFraction(params.widthBottomFraction || params.widthTopFraction);
  } else if (params.unit === 'cm') {
    hInches = params.height / 2.54;
    wTopInches = params.widthTop / 2.54;
    wBtmInches = wBottom / 2.54;
  } else if (params.unit === 'mm') {
    hInches = params.height / 25.4;
    wTopInches = params.widthTop / 25.4;
    wBtmInches = wBottom / 25.4;
  }

  const avgWidthInches = (wTopInches + wBtmInches) / 2;
  const hCm = parseFloat((hInches * 2.54).toFixed(1));
  const wCm = parseFloat((avgWidthInches * 2.54).toFixed(1));

  // Actual Square Feet
  const actualSqft = parseFloat(((hInches * avgWidthInches) / 144).toFixed(2));

  // Standard Baseline Dimensions & Area
  const standardMaxWCm = settings.maxWidthCm || 80;
  const standardMaxHCm = settings.maxHeightCm || 210;
  const standardSqft = parseFloat(((standardMaxWCm * standardMaxHCm) / 929.0304).toFixed(2)); // ~18.08 sq.ft

  // Check if door size is EXTRA (exceeds 80x210 cm standard sq.ft) or BELOW standard
  const isExtraSize = actualSqft > standardSqft;
  const isBelowSize = actualSqft < standardSqft;

  let extraSqft = 0;
  let extraCost = 0;
  let dividedRate = basePieceRate;
  let finalUnitRate = basePieceRate;
  let breakdown = '';

  if (isExtraSize) {
    extraSqft = parseFloat((actualSqft - standardSqft).toFixed(2));
    extraCost = Math.round(extraSqft * settings.extraSqftRate);
    finalUnitRate = basePieceRate + extraCost;
    breakdown = `Base ₹${basePieceRate.toLocaleString('en-IN')} (80×210 cm) + Extra ${extraSqft} sq.ft @ ₹${settings.extraSqftRate}/sq.ft (+₹${extraCost.toLocaleString('en-IN')})`;
  } else if (isBelowSize) {
    if (settings.belowSizeCalculationMode === 'DIVIDED_RATE') {
      const sqftUnitRate = basePieceRate / standardSqft;
      dividedRate = Math.round(actualSqft * sqftUnitRate);
      finalUnitRate = dividedRate;
      breakdown = `Below Standard (${actualSqft} sq.ft vs ${standardSqft} sq.ft) — Divided Rate @ ₹${sqftUnitRate.toFixed(1)}/sq.ft`;
    } else {
      finalUnitRate = basePieceRate;
      breakdown = `Below Standard (${actualSqft} sq.ft) — Base Piece Minimum ₹${basePieceRate.toLocaleString('en-IN')}`;
    }
  } else {
    finalUnitRate = basePieceRate;
    breakdown = `Standard Size (within ${standardMaxWCm}×${standardMaxHCm} cm) — Fixed Piece Rate ₹${basePieceRate.toLocaleString('en-IN')}`;
  }

  // Calculate Lock Hardware & Colour Surcharges
  const locks = settings.locks || DEFAULT_LOCK_OPTIONS;
  const colours = settings.colours || DEFAULT_COLOUR_OPTIONS;

  let lockPrice = 0;
  if (params.lockPrice !== undefined && !isNaN(params.lockPrice)) {
    lockPrice = params.lockPrice;
  } else if (params.lockId) {
    const l = locks.find((x) => x.id === params.lockId);
    if (l) lockPrice = l.price;
  }

  let colourExtraRate = 0;
  if (params.colourExtraRate !== undefined && !isNaN(params.colourExtraRate)) {
    colourExtraRate = params.colourExtraRate;
  } else if (params.colourId) {
    const c = colours.find((x) => x.id === params.colourId);
    if (c) colourExtraRate = c.extraRate || 0;
  }

  finalUnitRate += lockPrice + colourExtraRate;

  if (lockPrice > 0) {
    breakdown += ` + Lock (+₹${lockPrice.toLocaleString('en-IN')})`;
  }
  if (colourExtraRate > 0) {
    breakdown += ` + Finish (+₹${colourExtraRate.toLocaleString('en-IN')})`;
  }

  return {
    category,
    basePieceRate,
    finalUnitRate,
    hCm,
    wCm,
    actualSqft,
    standardSqft,
    isExtraSize,
    isBelowSize,
    extraSqft,
    extraCost,
    dividedRate,
    lockId: params.lockId,
    lockPrice,
    colourId: params.colourId,
    colourExtraRate,
    breakdown,
  };
}
