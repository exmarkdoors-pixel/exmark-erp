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
let dataPathsModule: typeof import('../utils/dataPaths') | null = null;

if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fsModule = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pathModule = require('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    dataPathsModule = require('../utils/dataPaths');
  } catch {
    // Browser or edge runtime
  }
}

export type FrpDoorCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export interface LockOption {
  id: string;
  name: string;
  type?: string;
  price: number; // Customer selling price / quotation surcharge
  costPrice?: number; // Store raw material / purchase cost for BOQ
  description?: string;
}

export interface ColourOption {
  id: string;
  name: string;
  code?: string;
  extraRate?: number; // Customer selling surcharge
  pigmentRatePerKg?: number; // Store raw material pigment rate in ₹/Kg for BOQ
  category?: 'WOOD_GRAIN' | 'SOLID_COLOR' | 'METALLIC' | 'CUSTOM';
}

export interface DoorThicknessOption {
  id: string;
  name: string;
  thicknessMm: number;
  extraRate: number;
  isDefault?: boolean;
}

export interface FrpRateCardSettings {
  maxWidthCm: number;              // default: 80
  maxHeightCm: number;             // default: 210
  extraSqftRate: number;           // default: 250 (₹250/sq.ft above 80×210 cm)
  highExtraMaxWidthCm?: number;    // default: 90
  highExtraMaxHeightCm?: number;   // default: 230
  highExtraSqftRate?: number;      // default: 450 (₹450/sq.ft above 90×230 cm / 22.28 sq.ft)
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
  doorThicknesses?: DoorThicknessOption[];
  defaultInstallationRatePerDoor?: number;
  defaultInstallationLabel?: string;
  updatedAt?: string;
}

export const DEFAULT_THICKNESS_OPTIONS: DoorThicknessOption[] = [
  { id: 'thk-28mm', name: '28mm Standard', thicknessMm: 28, extraRate: 0, isDefault: true },
  { id: 'thk-30mm', name: '30mm Door', thicknessMm: 30, extraRate: 200, isDefault: false },
];

export function getDefaultThicknessOption(options?: DoorThicknessOption[]): DoorThicknessOption {
  const list = options && options.length > 0 ? options : DEFAULT_THICKNESS_OPTIONS;
  return (
    list.find((t) => t.isDefault) ||
    list.find((t) => t.thicknessMm === 28) ||
    list[0]
  );
}

export function getDefaultLockOption(options?: LockOption[]): LockOption {
  const list = options && options.length > 0 ? options : DEFAULT_LOCK_OPTIONS;
  return (
    list.find((l) => l.name.toUpperCase().includes('BABY LATCH') && l.price >= 0) ||
    list.find((l) => l.id === 'lock-none') ||
    list.find((l) => l.id === 'lock-baby-latch') ||
    list.find((l) => l.name.toLowerCase().includes('baby latch')) ||
    list[0]
  );
}

export const WITHOUT_LOCK_DISCOUNT = -300;
export const WITHOUT_ACCESSORIES_DISCOUNT = -500;
export const WITHOUT_FRAME_DISCOUNT = -800;
export const SHUTTER_ONLY_DISCOUNT = -1500;

export type SupplyMode = 'FULL_SET' | 'NO_ACCESSORIES' | 'SHUTTER_ONLY';

export const DEFAULT_LOCK_OPTIONS: LockOption[] = [
  { id: 'lock-none-discount', name: 'Without Lock (-₹300)', type: 'Discount', price: -300, costPrice: 0, description: 'Customer supplies own lock hardware — deducts ₹300 per door' },
  { id: 'lock-none', name: 'BABY LATCH (Baby Latch Black)', type: 'Latch', price: 0, costPrice: 200, description: 'Includes 1 Baby Latch Black + Common Basic Kit (₹200 store box)' },
  { id: 'lock-pluspoint-black', name: 'PlusPoint Black', type: 'PlusPoint', price: 600, costPrice: 600, description: 'PlusPoint Black Lock + Common Basic Kit (₹600 box)' },
  { id: 'lock-black-latch-exmark', name: 'Black Latch Exmark', type: 'ExmarkLatch', price: 600, costPrice: 600, description: 'Black Latch Exmark + Common Basic Kit (₹600 box)' },
  { id: 'lock-antique-exmark', name: 'Antique Exmark', type: 'Antique', price: 600, costPrice: 600, description: 'Antique Exmark Lock + Common Basic Kit (₹600 box)' },
  { id: 'lock-mortise-60', name: 'Mortise Lock 60mm Brass Double Throw', type: 'Mortise', price: 850, costPrice: 500, description: 'Heavy brass mortise latch + 3 keys' },
  { id: 'lock-cyl-privacy', name: 'Cylindrical Knob Lock (Bathroom Privacy)', type: 'Cylindrical', price: 450, costPrice: 450, description: 'Stainless steel cylindrical keyless privacy knob' },
  { id: 'lock-baby-latch', name: 'Baby Latch / Tower Bolt Kit', type: 'Latch', price: 300, costPrice: 200, description: 'Dual brass baby latches + strike plate' },
  { id: 'lock-magnetic', name: 'Heavy Duty Magnetic Roller Catch', type: 'Magnetic', price: 250, costPrice: 250, description: 'Silent magnetic closure mechanism' },
  { id: 'lock-multipoint', name: 'Multipoint High Security Lock System', type: 'Security', price: 1450, costPrice: 1450, description: '3-point master shootbolt lock' },
  { id: 'lock-provision-only', name: 'Provision Only (No Hardware)', type: 'None', price: 0, costPrice: 0, description: 'Lock cutout provision only — 0 store lock box issued' },
];

export const DEFAULT_COLOUR_OPTIONS: ColourOption[] = [
  { id: 'col-teak-matte', name: 'Natural Teak Matte', code: '#8B5A2B', extraRate: 0, pigmentRatePerKg: 560, category: 'WOOD_GRAIN' },
  { id: 'col-rosewood-gloss', name: 'Rose Wood Glossy', code: '#58111A', extraRate: 0, pigmentRatePerKg: 580, category: 'WOOD_GRAIN' },
  { id: 'col-white-gloss', name: 'Pure White Glossy', code: '#F8F9FA', extraRate: 0, pigmentRatePerKg: 420, category: 'SOLID_COLOR' },
  { id: 'col-mahogany-dark', name: 'Mahogany Dark Grain', code: '#420D09', extraRate: 0, pigmentRatePerKg: 540, category: 'WOOD_GRAIN' },
  { id: 'col-eeti-wood', name: 'Eeti Wood Deep Grain', code: '#3B2219', extraRate: 0, pigmentRatePerKg: 600, category: 'WOOD_GRAIN' },
  { id: 'col-slate-grey', name: 'Slate Grey Solid', code: '#475569', extraRate: 0, pigmentRatePerKg: 450, category: 'SOLID_COLOR' },
  { id: 'col-ivory-cream', name: 'Ivory Cream Solid', code: '#FFFDD0', extraRate: 0, pigmentRatePerKg: 440, category: 'SOLID_COLOR' },
  { id: 'col-metallic-bronze', name: 'Metallic Bronze Luxury', code: '#A97142', extraRate: 350, pigmentRatePerKg: 650, category: 'METALLIC' },
];

export const DEFAULT_FRP_RATE_CARD: FrpRateCardSettings = {
  maxWidthCm: 80,
  maxHeightCm: 210,
  extraSqftRate: 250,
  highExtraMaxWidthCm: 90,
  highExtraMaxHeightCm: 230,
  highExtraSqftRate: 450,
  categoryPieceRates: {
    A: 7000,
    B: 7600,
    C: 8200,
    D: 8800,
    E: 9500,
  },
  belowSizeCalculationMode: 'DIVIDED_RATE',
  defaultInstallationRatePerDoor: 500,
  defaultInstallationLabel: 'Site Door & Frame Installation (Hardware & Fitting)',
  locks: DEFAULT_LOCK_OPTIONS,
  colours: DEFAULT_COLOUR_OPTIONS,
  doorThicknesses: DEFAULT_THICKNESS_OPTIONS,
};

function getStorePath(): string {
  if (dataPathsModule) {
    return dataPathsModule.getDataFilePath('pricing-rate-card.json');
  }
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
    if (!fsModule.existsSync(/*turbopackIgnore: true*/ storePath)) {
      const dir = pathModule.dirname(storePath);
      if (!fsModule.existsSync(/*turbopackIgnore: true*/ dir)) fsModule.mkdirSync(dir, { recursive: true });
      fsModule.writeFileSync(/*turbopackIgnore: true*/ storePath, JSON.stringify(DEFAULT_FRP_RATE_CARD, null, 2), 'utf8');
      return DEFAULT_FRP_RATE_CARD;
    }
    const raw = fsModule.readFileSync(/*turbopackIgnore: true*/ storePath, 'utf8');
    const parsed = JSON.parse(raw);
    const loadedLocks: LockOption[] =
      Array.isArray(parsed.locks) && parsed.locks.length > 0 ? parsed.locks : DEFAULT_LOCK_OPTIONS;
    const hasWithoutLockDiscount = loadedLocks.some(
      (l) => l.id === 'lock-none-discount' || l.name.toLowerCase().includes('without lock')
    );
    const mergedLocks = hasWithoutLockDiscount
      ? loadedLocks
      : [DEFAULT_LOCK_OPTIONS[0], ...loadedLocks];
    const sanitizedLocks = mergedLocks.map((l) => ({
      ...l,
      costPrice:
        l.costPrice !== undefined
          ? l.costPrice
          : (DEFAULT_LOCK_OPTIONS.find((d) => d.id === l.id)?.costPrice ?? (l.price > 0 ? l.price : 200)),
    }));

    const loadedColours: ColourOption[] =
      Array.isArray(parsed.colours) && parsed.colours.length > 0 ? parsed.colours : DEFAULT_COLOUR_OPTIONS;
    const sanitizedColours = loadedColours.map((c) => ({
      ...c,
      pigmentRatePerKg:
        c.pigmentRatePerKg !== undefined
          ? c.pigmentRatePerKg
          : (DEFAULT_COLOUR_OPTIONS.find((d) => d.id === c.id)?.pigmentRatePerKg ?? 560),
    }));

    return {
      ...DEFAULT_FRP_RATE_CARD,
      ...parsed,
      categoryPieceRates: {
        ...DEFAULT_FRP_RATE_CARD.categoryPieceRates,
        ...(parsed.categoryPieceRates || {}),
      },
      locks: sanitizedLocks,
      colours: sanitizedColours,
      doorThicknesses:
        Array.isArray(parsed.doorThicknesses) && parsed.doorThicknesses.length > 0
          ? parsed.doorThicknesses
          : DEFAULT_THICKNESS_OPTIONS,
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
      doorThicknesses:
        settings.doorThicknesses !== undefined
          ? settings.doorThicknesses
          : current.doorThicknesses || DEFAULT_THICKNESS_OPTIONS,
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
  isHighExtraSize: boolean;
  isBelowSize: boolean;
  extraSqft: number;
  extraCost: number;
  highThresholdSqft: number;
  tier2ExtraSqft: number;
  tier2ExtraCost: number;
  dividedRate: number;
  lockId?: string;
  lockPrice: number;
  colourId?: string;
  colourExtraRate: number;
  frameTypeId?: string;
  frameTypeName?: string;
  framePrice: number;
  thicknessId?: string;
  thicknessLabel?: string;
  thicknessExtraRate: number;
  withoutAccessories?: boolean;
  accessoriesAdjustment: number;
  withoutFrame?: boolean;
  frameAdjustment: number;
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
  frameTypeId?: string;
  frameTypeName?: string;
  framePrice?: number;
  thicknessId?: string;
  thicknessLabel?: string;
  thicknessExtraRate?: number;
  withoutAccessories?: boolean;
  supplyMode?: SupplyMode;
  withoutFrame?: boolean;
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

  // Standard Baseline Dimensions & Area (80 x 210 cm = 18.08 sq.ft)
  const standardMaxWCm = settings.maxWidthCm || 80;
  const standardMaxHCm = settings.maxHeightCm || 210;
  const standardSqft = parseFloat(((standardMaxWCm * standardMaxHCm) / 929.0304).toFixed(2)); // ~18.08 sq.ft

  // Oversize Tier-2 Baseline (90 x 230 cm = 22.28 sq.ft -> ₹450/sq.ft after this threshold)
  const highMaxWCm = settings.highExtraMaxWidthCm ?? 90;
  const highMaxHCm = settings.highExtraMaxHeightCm ?? 230;
  const highThresholdSqft = parseFloat(((highMaxWCm * highMaxHCm) / 929.0304).toFixed(2)); // ~22.28 sq.ft
  const highExtraSqftRate = settings.highExtraSqftRate ?? 450;

  // Check if door size is EXTRA (exceeds 80x210 cm standard sq.ft) or BELOW standard
  const isExtraSize = actualSqft > standardSqft;
  const isHighExtraSize = isExtraSize && highThresholdSqft > standardSqft && actualSqft > highThresholdSqft;
  const isBelowSize = actualSqft < standardSqft;

  let extraSqft = 0;
  let extraCost = 0;
  let tier2ExtraSqft = 0;
  let tier2ExtraCost = 0;
  let dividedRate = basePieceRate;
  let finalUnitRate = basePieceRate;
  let breakdown = '';

  if (isHighExtraSize) {
    const tier1Sqft = parseFloat((highThresholdSqft - standardSqft).toFixed(2));
    const tier1Cost = Math.round(tier1Sqft * settings.extraSqftRate);
    tier2ExtraSqft = parseFloat((actualSqft - highThresholdSqft).toFixed(2));
    tier2ExtraCost = Math.round(tier2ExtraSqft * highExtraSqftRate);
    extraSqft = parseFloat((actualSqft - standardSqft).toFixed(2));
    extraCost = tier1Cost + tier2ExtraCost;
    finalUnitRate = basePieceRate + extraCost;
    breakdown = `Base ₹${basePieceRate.toLocaleString('en-IN')} (${standardMaxWCm}×${standardMaxHCm} cm) + ${tier1Sqft} sq.ft @ ₹${settings.extraSqftRate} (+₹${tier1Cost.toLocaleString('en-IN')}) + Above ${highMaxWCm}×${highMaxHCm}cm: ${tier2ExtraSqft} sq.ft @ ₹${highExtraSqftRate}/sq.ft (+₹${tier2ExtraCost.toLocaleString('en-IN')})`;
  } else if (isExtraSize) {
    extraSqft = parseFloat((actualSqft - standardSqft).toFixed(2));
    extraCost = Math.round(extraSqft * settings.extraSqftRate);
    finalUnitRate = basePieceRate + extraCost;
    breakdown = `Base ₹${basePieceRate.toLocaleString('en-IN')} (${standardMaxWCm}×${standardMaxHCm} cm) + Extra ${extraSqft} sq.ft @ ₹${settings.extraSqftRate}/sq.ft (+₹${extraCost.toLocaleString('en-IN')})`;
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

  // Calculate Lock Hardware, Colour, Frame & Door Thickness Surcharges
  const locks = settings.locks || DEFAULT_LOCK_OPTIONS;
  const colours = settings.colours || DEFAULT_COLOUR_OPTIONS;
  const thicknesses = settings.doorThicknesses || DEFAULT_THICKNESS_OPTIONS;

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

  let thicknessExtraRate = 0;
  let thicknessLabel = params.thicknessLabel;
  if (params.thicknessExtraRate !== undefined && !isNaN(params.thicknessExtraRate)) {
    thicknessExtraRate = params.thicknessExtraRate;
  } else if (params.thicknessId) {
    const thk = thicknesses.find((t) => t.id === params.thicknessId);
    if (thk) {
      thicknessExtraRate = thk.extraRate || 0;
      thicknessLabel = thicknessLabel || thk.name;
    }
  }

  const isShutterOnly = params.supplyMode === 'SHUTTER_ONLY';
  const isNoAccessories = params.supplyMode === 'NO_ACCESSORIES' || Boolean(params.withoutAccessories);
  const withoutAccessories = isNoAccessories;

  let accessoriesAdjustment = 0;
  if (isShutterOnly) {
    accessoriesAdjustment = 0; // Handled under combined shutter only deduction
  } else if (isNoAccessories) {
    accessoriesAdjustment = WITHOUT_ACCESSORIES_DISCOUNT;
  }

  const withoutFrame =
    isShutterOnly ||
    Boolean(params.withoutFrame) ||
    params.frameTypeId === 'FRM-005' ||
    (params.frameTypeName ? params.frameTypeName.toLowerCase().includes('without frame') || params.frameTypeName.toLowerCase().includes('shutter only') : false);

  const rawFramePrice = params.framePrice !== undefined && !isNaN(params.framePrice) ? params.framePrice : 0;
  let frameAdjustment = 0;
  if (isShutterOnly) {
    frameAdjustment = SHUTTER_ONLY_DISCOUNT;
  } else if (withoutFrame) {
    frameAdjustment = rawFramePrice !== 0 && rawFramePrice < 0 ? rawFramePrice : WITHOUT_FRAME_DISCOUNT;
  } else {
    frameAdjustment = rawFramePrice;
  }

  finalUnitRate = Math.max(
    0,
    finalUnitRate + lockPrice + colourExtraRate + frameAdjustment + thicknessExtraRate + accessoriesAdjustment
  );

  if (isShutterOnly) {
    breakdown += ` + Shutter Only Discount (₹${SHUTTER_ONLY_DISCOUNT.toLocaleString('en-IN')})`;
  } else {
    if (frameAdjustment !== 0) {
      breakdown += ` + Frame${params.frameTypeName ? ` (${params.frameTypeName})` : ''} (${frameAdjustment > 0 ? '+' : ''}₹${frameAdjustment.toLocaleString('en-IN')})`;
    }
    if (accessoriesAdjustment !== 0) {
      breakdown += ` + Without Accessories (-₹${Math.abs(accessoriesAdjustment).toLocaleString('en-IN')})`;
    }
  }
  if (thicknessExtraRate > 0) {
    breakdown += ` + Thickness${thicknessLabel ? ` (${thicknessLabel})` : ''} (+₹${thicknessExtraRate.toLocaleString('en-IN')})`;
  }
  if (lockPrice !== 0) {
    breakdown += ` + Lock (${lockPrice > 0 ? '+' : ''}₹${lockPrice.toLocaleString('en-IN')})`;
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
    isHighExtraSize,
    isBelowSize,
    extraSqft,
    extraCost,
    highThresholdSqft,
    tier2ExtraSqft,
    tier2ExtraCost,
    dividedRate,
    lockId: params.lockId,
    lockPrice,
    colourId: params.colourId,
    colourExtraRate,
    frameTypeId: params.frameTypeId,
    frameTypeName: params.frameTypeName,
    framePrice: frameAdjustment,
    thicknessId: params.thicknessId,
    thicknessLabel,
    thicknessExtraRate,
    withoutAccessories,
    accessoriesAdjustment,
    withoutFrame,
    frameAdjustment,
    breakdown,
  };
}
