import { CustomFrameProfile, DEFAULT_FRAME_PROFILES } from './frameDefaults';

export const CM2_PER_SQFT = 929.0304;
export const CM_PER_FOOT = 30.48;
export const CM3_PER_CUFT = 28316.8466;

export type FrameLengthMode =
  | 'FRAME_3SIDE_MINUS_DED'
  | 'FRAME_2H_MINUS_DED'
  | 'SINGLE_H_MINUS_DED';

export interface ReeperSpecConfig {
  thicknessCm: number;
  widthCm: number;
  lengthCm: number;
  pcsPerDoor: number;
}

export interface FoamSheetSpecConfig {
  widthCm: number;
  heightCm: number;
  doorsPerSheet: number;
  costPerSheet: number;
}

export interface LockKitComponentItem {
  id: string;
  name: string;
  qtyPerBox: number;
  unit: string;
}

export interface LockBoxProfile {
  id: string;
  name: string;
  matchKeywords: string[];
  boxCost: number;
  isNoHardware?: boolean;
  items: LockKitComponentItem[];
}

export function buildCommonBasicKitItems(primaryLockName?: string): LockKitComponentItem[] {
  const base: LockKitComponentItem[] = [];
  if (primaryLockName && primaryLockName.trim()) {
    base.push({
      id: 'item-primary-lock',
      name: primaryLockName.trim(),
      qtyPerBox: 1,
      unit: 'Pcs',
    });
  }
  base.push(
    { id: 'item-tower-bolt', name: 'Tower Bolt', qtyPerBox: 1, unit: 'Pcs' },
    { id: 'item-hinges', name: 'Hinges', qtyPerBox: 3, unit: 'Pcs' },
    { id: 'item-wood-screw-3', name: 'Wood Screw 3"', qtyPerBox: 10, unit: 'Pcs' },
    { id: 'item-screw-19x6', name: 'Screw 19×6', qtyPerBox: 7, unit: 'Pcs' },
    { id: 'item-screw-25x6', name: 'Screw 25×6', qtyPerBox: 27, unit: 'Pcs' },
    { id: 'item-screw-32x6', name: 'Screw 32×6', qtyPerBox: 9, unit: 'Pcs' },
    { id: 'item-plug-6mm', name: 'Plug 6mm', qtyPerBox: 12, unit: 'Pcs' },
    { id: 'item-door-push', name: 'Door Push', qtyPerBox: 1, unit: 'Pcs' }
  );
  return base;
}

export const DEFAULT_LOCK_BOX_PROFILES: LockBoxProfile[] = [
  {
    id: 'box-baby-latch-black',
    name: 'Baby Latch Black',
    matchKeywords: ['baby latch black', 'baylatch black', 'baby latch', 'latch'],
    boxCost: 200,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Baby Latch Black'),
  },
  {
    id: 'box-pluspoint-black',
    name: 'PlusPoint Black',
    matchKeywords: ['pluspoint black', 'pluspoint', 'plus point'],
    boxCost: 600,
    isNoHardware: false,
    items: buildCommonBasicKitItems('PlusPoint Black Lock'),
  },
  {
    id: 'box-black-latch-exmark',
    name: 'Black Latch Exmark',
    matchKeywords: ['black latch exmark', 'black latch'],
    boxCost: 600,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Black Latch Exmark Lock'),
  },
  {
    id: 'box-antique-exmark',
    name: 'Antique Exmark',
    matchKeywords: ['antique exmark', 'antique'],
    boxCost: 600,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Antique Exmark Lock'),
  },
  {
    id: 'box-mortise-std',
    name: 'Mortise Lock Box',
    matchKeywords: ['mortise cylinder', 'mortise lock', 'mortise'],
    boxCost: 500,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Mortise Lock'),
  },
  {
    id: 'box-cylindrical',
    name: 'Cylindrical Knob Lock Box',
    matchKeywords: ['cylindrical knob', 'cylindrical', 'privacy knob'],
    boxCost: 450,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Cylindrical Knob Lock'),
  },
  {
    id: 'box-multipoint',
    name: 'Multipoint High Security Box',
    matchKeywords: ['multipoint', 'high security'],
    boxCost: 1450,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Multipoint Security Lock'),
  },
  {
    id: 'box-magnetic',
    name: 'Magnetic Roller Catch Box',
    matchKeywords: ['magnetic roller', 'magnetic'],
    boxCost: 250,
    isNoHardware: false,
    items: buildCommonBasicKitItems('Magnetic Roller Catch'),
  },
  {
    id: 'box-no-lock',
    name: 'Provision Only (No Lock Hardware)',
    matchKeywords: ['provision', 'no hardware', 'no lock', 'plain', 'without lock', 'lock-none-discount', 'without'],
    boxCost: 0,
    isNoHardware: true,
    items: [],
  },
];

export interface BoqMaterialRatesConfig {
  baseDoorWidthCm: number;
  baseDoorHeightCm: number;
  frameLengthMode: FrameLengthMode;

  // Baseline material quantities for a normal 80x210 cm door with frame
  resinKg: number;
  gelKg: number;
  catalystGrams: number;
  acceleratorGrams: number;
  csm300Kg: number;
  pigmentGrams: number;

  // Fixed door shutter wood reeper dimensions per door
  lockReeper: ReeperSpecConfig;
  hingeReeper: ReeperSpecConfig;

  // Rigid foam sheet spec (1 sheet for 12 doors, 50x100 cm @ Rs 250/sheet)
  foamSheet: FoamSheetSpecConfig;

  // Unit prices (INR)
  resinRatePerKg: number;
  gelRatePerKg: number;
  catalystRatePerKg: number;
  acceleratorRatePerKg: number;
  csm300RatePerKg: number;
  woodRatePerCuFt: number;
  pigmentRatesByColour: Record<string, number>;
  lockBoxProfiles: LockBoxProfile[];
  updatedAt?: string;
}

export const DEFAULT_BOQ_MATERIAL_RATES: BoqMaterialRatesConfig = {
  baseDoorWidthCm: 80,
  baseDoorHeightCm: 210,
  frameLengthMode: 'FRAME_3SIDE_MINUS_DED',

  resinKg: 8.0,
  gelKg: 1.5,
  catalystGrams: 180,
  acceleratorGrams: 100,
  csm300Kg: 3.5,
  pigmentGrams: 250,

  lockReeper: {
    thicknessCm: 2,
    widthCm: 12,
    lengthCm: 15,
    pcsPerDoor: 2,
  },
  hingeReeper: {
    thicknessCm: 2,
    widthCm: 4,
    lengthCm: 16,
    pcsPerDoor: 3,
  },

  foamSheet: {
    widthCm: 50,
    heightCm: 100,
    doorsPerSheet: 12,
    costPerSheet: 250,
  },

  resinRatePerKg: 210,
  gelRatePerKg: 290,
  catalystRatePerKg: 550,
  acceleratorRatePerKg: 780,
  csm300RatePerKg: 195,
  woodRatePerCuFt: 1450,
  pigmentRatesByColour: {
    Default: 480,
    'Natural Teak': 560,
    'Rose Wood': 580,
    Mahogany: 540,
    'Eeti Wood': 600,
    'Slate Grey': 450,
    'Ivory Cream': 440,
    'PU WHITE': 520,
    Walnut: 550,
    Cherry: 520,
    White: 420,
    '2 SIDE': 580,
  },
  lockBoxProfiles: DEFAULT_LOCK_BOX_PROFILES,
};

export interface BoqDoorInput {
  id?: string;
  doorId?: string;
  doorNumber?: string;
  widthCm?: number;
  heightCm?: number;
  widthMm?: number;
  heightMm?: number;
  sqFtOverride?: number;
  frameTypeId?: string;
  frameTypeName?: string;
  finishColor?: string;
  lockId?: string;
  lockType?: string;
  handing?: 'LH' | 'RH';
  quantity?: number;
  stage?: string;
  materialIssued?: boolean;
  materialIssuedAt?: string;
  materialIssueBatchId?: string;
  materialIssuedToGang?: string;
  materialIssuedValue?: number;
}

export interface LockBoxBreakdown {
  profileId: string;
  boxName: string;
  isNoHardware: boolean;
  doorsCount: number;
  lhCount: number;
  rhCount: number;
  boxCost: number;
  totalBoxCost: number;
  itemsPerBox: LockKitComponentItem[];
  aggregatedComponents: Array<{
    id: string;
    name: string;
    qtyPerBox: number;
    totalQty: number;
    unit: string;
  }>;
}

export interface ConsolidatedLockKitComponent {
  id: string;
  name: string;
  totalQty: number;
  unit: string;
}

export interface PigmentColourBreakdown {
  colourLabel: string;
  matchedRateKey: string;
  doorsCount: number;
  sqFt: number;
  pigmentGrams: number;
  pigmentKg: number;
  ratePerKg: number;
  cost: number;
}

export interface FrameWoodBreakdown {
  frameId: string;
  frameName: string;
  doorsCount: number;
  woodThicknessCm: number;
  woodWidthCm: number;
  woodLengthDeductionCm: number;
  totalLengthCm: number;
  runningFt: number;
  cuFt: number;
  cost: number;
}

export interface DoorBoqLineCalculation {
  doorNumber: string;
  quantity: number;
  widthCm: number;
  heightCm: number;
  areaSqFt: number;
  scaleFactor: number;
  finishColor: string;
  matchedPigmentKey: string;
  pigmentRatePerKg: number;
  frameId: string;
  frameName: string;
  resinKg: number;
  gelKg: number;
  catalystGrams: number;
  acceleratorGrams: number;
  csm300Kg: number;
  pigmentGrams: number;
  pigmentCost: number;
  frameWoodLengthCm: number;
  frameWoodRunningFt: number;
  frameWoodCuFt: number;
  lockReeperCuFt: number;
  hingeReeperCuFt: number;
  totalWoodCuFt: number;
  woodCost: number;
  foamSheetsExact: number;
  foamCost: number;
  chemicalCost: number;
  totalDoorCost: number;
}

export interface BatchBoqCalculation {
  totalDoors: number;
  totalSqFt: number;
  baseDoorSqFt: number;
  averageScaleFactor: number;

  // Group A: Chemicals & CSM 300 GSM
  resinKg: number;
  resinCost: number;
  gelKg: number;
  gelCost: number;
  catalystGrams: number;
  catalystKg: number;
  catalystCost: number;
  acceleratorGrams: number;
  acceleratorKg: number;
  acceleratorCost: number;
  csm300Kg: number;
  csm300Cost: number;
  pigmentGrams: number;
  pigmentKg: number;
  pigmentCost: number;
  pigmentByColour: PigmentColourBreakdown[];

  // Group B: Wood Reeper (Cubic Feet & Running Feet)
  frameWoodTotalLengthCm: number;
  frameWoodRunningFt: number;
  frameWoodCuFt: number;
  frameWoodCost: number;
  frameWoodBreakdown: FrameWoodBreakdown[];

  lockReeperCuFt: number;
  lockReeperVolumeCm3: number;
  lockReeperCost: number;

  hingeReeperCuFt: number;
  hingeReeperVolumeCm3: number;
  hingeReeperCost: number;

  shutterWoodCuFt: number;
  totalWoodCuFt: number;
  totalWoodCost: number;

  // Group C: Rigid Foam Sheet (1 sheet / 12 doors, 50x100 cm @ Rs 250/sheet)
  foamSheetsExact: number;
  foamSheetsPurchaseCeil: number;
  foamCost: number;

  // Group E: Lock Boxes & Basic Hardware Packing Kits
  lockBoxBreakdown: LockBoxBreakdown[];
  consolidatedLockKitHardware: ConsolidatedLockKitComponent[];
  totalLockBoxes: number;
  totalLockBoxCost: number;

  // Totals
  totalChemicalCost: number;
  grandTotalCost: number;
  combinedWithLockTotalCost: number;
  costPerDoor: number;
  combinedCostPerDoor: number;
  costPerSqFt: number;
  perDoorLines: DoorBoqLineCalculation[];
}

export function cmToRunningFeet(cm: number): number {
  return cm / CM_PER_FOOT;
}

export function cm3ToCuFt(cm3: number): number {
  return cm3 / CM3_PER_CUFT;
}

export function computeDoorSqFt(widthCm: number, heightCm: number): number {
  return (widthCm * heightCm) / CM2_PER_SQFT;
}

function cloneLockBoxProfiles(profiles: LockBoxProfile[]): LockBoxProfile[] {
  return profiles.map((p) => ({
    ...p,
    matchKeywords: Array.isArray(p.matchKeywords) ? [...p.matchKeywords] : [],
    items: Array.isArray(p.items) ? p.items.map((it) => ({ ...it })) : [],
  }));
}

export function mergeBoqMaterialRates(
  partial?: Partial<BoqMaterialRatesConfig> | null
): BoqMaterialRatesConfig {
  if (!partial) {
    return {
      ...DEFAULT_BOQ_MATERIAL_RATES,
      lockReeper: { ...DEFAULT_BOQ_MATERIAL_RATES.lockReeper },
      hingeReeper: { ...DEFAULT_BOQ_MATERIAL_RATES.hingeReeper },
      foamSheet: { ...DEFAULT_BOQ_MATERIAL_RATES.foamSheet },
      pigmentRatesByColour: { ...DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour },
      lockBoxProfiles: cloneLockBoxProfiles(DEFAULT_LOCK_BOX_PROFILES),
    };
  }

  const incomingProfiles =
    Array.isArray(partial.lockBoxProfiles) && partial.lockBoxProfiles.length > 0
      ? partial.lockBoxProfiles
      : DEFAULT_LOCK_BOX_PROFILES;

  return {
    ...DEFAULT_BOQ_MATERIAL_RATES,
    ...partial,
    lockReeper: {
      ...DEFAULT_BOQ_MATERIAL_RATES.lockReeper,
      ...(partial.lockReeper || {}),
    },
    hingeReeper: {
      ...DEFAULT_BOQ_MATERIAL_RATES.hingeReeper,
      ...(partial.hingeReeper || {}),
    },
    foamSheet: {
      ...DEFAULT_BOQ_MATERIAL_RATES.foamSheet,
      ...(partial.foamSheet || {}),
    },
    pigmentRatesByColour: {
      ...DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour,
      ...(partial.pigmentRatesByColour || {}),
    },
    lockBoxProfiles: cloneLockBoxProfiles(incomingProfiles),
  };
}

export function resolveLockBoxForDoor(
  lockId: string | undefined,
  lockType: string | undefined,
  profiles: LockBoxProfile[] = DEFAULT_LOCK_BOX_PROFILES
): LockBoxProfile {
  const catalog = profiles && profiles.length > 0 ? profiles : DEFAULT_LOCK_BOX_PROFILES;
  const cleanId = (lockId || '').trim().toLowerCase();
  const cleanType = (lockType || '').trim().toLowerCase();

  // Check explicit ID first
  if (cleanId && cleanId !== 'lock-none') {
    if (cleanId === 'lock-none-discount' || cleanId.includes('without-lock') || cleanId.includes('without lock')) {
      const noLock = catalog.find((p) => p.id === 'box-no-lock');
      if (noLock) return noLock;
    }
    const byId = catalog.find((p) => p.id.toLowerCase() === cleanId);
    if (byId) return byId;
  }

  // Exact profile name match
  if (cleanType) {
    const byExactName = catalog.find((p) => p.name.trim().toLowerCase() === cleanType);
    if (byExactName) return byExactName;

    // Longest keyword match across all profiles (so 'black latch exmark' beats 'latch')
    const keywordCandidates: Array<{ profile: LockBoxProfile; kwLen: number }> = [];
    for (const profile of catalog) {
      for (const kw of profile.matchKeywords || []) {
        const cleanKw = kw.trim().toLowerCase();
        if (cleanKw && cleanType.includes(cleanKw)) {
          keywordCandidates.push({ profile, kwLen: cleanKw.length });
        }
      }
      const pNameLower = profile.name.trim().toLowerCase();
      if (pNameLower && cleanType.includes(pNameLower)) {
        keywordCandidates.push({ profile, kwLen: pNameLower.length });
      }
    }
    if (keywordCandidates.length > 0) {
      keywordCandidates.sort((a, b) => b.kwLen - a.kwLen);
      return keywordCandidates[0].profile;
    }

    // If user typed a brand-new lock name not yet in lockBoxProfiles, preserve it as an ad-hoc box with Common Basic Kit
    if (cleanType !== 'baby latch' && !cleanType.includes('provision') && !cleanType.includes('no hardware')) {
      return {
        id: `box-adhoc-${cleanType.replace(/[^a-z0-9]+/g, '-')}`,
        name: (lockType || '').trim(),
        matchKeywords: [cleanType],
        boxCost: 600,
        isNoHardware: false,
        items: buildCommonBasicKitItems((lockType || '').trim()),
      };
    }
  }

  return catalog.find((p) => p.id === 'box-baby-latch-black') || catalog[0];
}

export function resolvePigmentRateForColour(
  finishColor: string | undefined,
  pigmentRatesByColour: Record<string, number>
): { matchedKey: string; ratePerKg: number } {
  const defaultRate = pigmentRatesByColour.Default ?? DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour.Default;
  const raw = (finishColor || '').trim();
  if (!raw) {
    return { matchedKey: 'Default', ratePerKg: defaultRate };
  }

  const normalized = raw.toLowerCase();
  const entries = Object.entries(pigmentRatesByColour).filter(
    ([k, v]) => Number.isFinite(v) && k.trim().length > 0
  );

  // 1. Exact case-insensitive match
  const exact = entries.find(([k]) => k.trim().toLowerCase() === normalized);
  if (exact) {
    return { matchedKey: exact[0], ratePerKg: exact[1] };
  }

  // 2. Longest keyword substring match (e.g. "Natural Teak EXGC-510" -> "Natural Teak")
  const substringMatches = entries
    .filter(([k]) => k.toLowerCase() !== 'default' && normalized.includes(k.trim().toLowerCase()))
    .sort((a, b) => b[0].length - a[0].length);
  if (substringMatches.length > 0) {
    return { matchedKey: substringMatches[0][0], ratePerKg: substringMatches[0][1] };
  }

  // 3. Reverse substring or token match (e.g. "Teak" matching "Natural Teak")
  const tokens = normalized.split(/[\s\-_/(),]+/).filter((t) => t.length >= 3);
  for (const token of tokens) {
    const tokenMatch = entries.find(
      ([k]) => k.toLowerCase() !== 'default' && k.toLowerCase().includes(token)
    );
    if (tokenMatch) {
      return { matchedKey: tokenMatch[0], ratePerKg: tokenMatch[1] };
    }
  }

  return { matchedKey: 'Default', ratePerKg: defaultRate };
}

export function resolveFrameProfileForBoq(
  frameTypeId: string | undefined,
  frameTypeName: string | undefined,
  framesList: CustomFrameProfile[] = DEFAULT_FRAME_PROFILES
): CustomFrameProfile {
  const catalog = framesList.length > 0 ? framesList : DEFAULT_FRAME_PROFILES;

  if (frameTypeId) {
    const byId = catalog.find((f) => f.id.toLowerCase() === frameTypeId.trim().toLowerCase());
    if (byId) return byId;
  }

  if (frameTypeName) {
    const clean = frameTypeName.trim().toLowerCase();
    const byExactName = catalog.find((f) => f.name.trim().toLowerCase() === clean);
    if (byExactName) return byExactName;

    const byPartial = catalog.find((f) => {
      const fn = f.name.trim().toLowerCase();
      return clean.includes(fn) || fn.includes(clean);
    });
    if (byPartial) return byPartial;
  }

  return (
    catalog.find((f) => f.isDefault || f.id === 'FRM-REGULAR' || f.id === 'FRM-001') ||
    catalog[0]
  );
}

export function computeFrameWoodLengthCm(
  widthCm: number,
  heightCm: number,
  deductionCm: number,
  mode: FrameLengthMode
): number {
  let rawLen = 0;
  if (mode === 'FRAME_3SIDE_MINUS_DED') {
    rawLen = 2 * heightCm + widthCm - deductionCm;
  } else if (mode === 'FRAME_2H_MINUS_DED') {
    rawLen = 2 * heightCm - deductionCm;
  } else {
    rawLen = heightCm - deductionCm;
  }
  return Math.max(0, rawLen);
}

export function calculateDoorBatchBoq(
  doors: BoqDoorInput[],
  framesList: CustomFrameProfile[] = DEFAULT_FRAME_PROFILES,
  ratesInput?: Partial<BoqMaterialRatesConfig> | null
): BatchBoqCalculation {
  const rates = mergeBoqMaterialRates(ratesInput);
  const baseDoorSqFt = computeDoorSqFt(rates.baseDoorWidthCm, rates.baseDoorHeightCm);

  const perDoorLines: DoorBoqLineCalculation[] = [];
  const pigmentMap = new Map<string, PigmentColourBreakdown>();
  const frameMap = new Map<string, FrameWoodBreakdown>();
  const lockMap = new Map<string, LockBoxBreakdown>();
  const consolidatedHardwareMap = new Map<string, ConsolidatedLockKitComponent>();

  let totalDoors = 0;
  let totalSqFt = 0;
  let resinKg = 0;
  let gelKg = 0;
  let catalystGrams = 0;
  let acceleratorGrams = 0;
  let csm300Kg = 0;
  let pigmentGrams = 0;
  let pigmentCost = 0;

  let frameWoodTotalLengthCm = 0;
  let frameWoodRunningFt = 0;
  let frameWoodCuFt = 0;
  let lockReeperCuFt = 0;
  let lockReeperVolumeCm3 = 0;
  let hingeReeperCuFt = 0;
  let hingeReeperVolumeCm3 = 0;

  const singleLockCm3 =
    rates.lockReeper.thicknessCm *
    rates.lockReeper.widthCm *
    rates.lockReeper.lengthCm *
    rates.lockReeper.pcsPerDoor;
  const singleLockCuFt = cm3ToCuFt(singleLockCm3);

  const singleHingeCm3 =
    rates.hingeReeper.thicknessCm *
    rates.hingeReeper.widthCm *
    rates.hingeReeper.lengthCm *
    rates.hingeReeper.pcsPerDoor;
  const singleHingeCuFt = cm3ToCuFt(singleHingeCm3);

  doors.forEach((door, idx) => {
    const qty = Math.max(1, Number(door.quantity ?? 1));
    let wCm = Number(door.widthCm || 0);
    let hCm = Number(door.heightCm || 0);
    if (!wCm && door.widthMm) wCm = Number(door.widthMm) / 10;
    if (!hCm && door.heightMm) hCm = Number(door.heightMm) / 10;

    let singleAreaSqFt = 0;
    if (wCm > 0 && hCm > 0) {
      singleAreaSqFt = computeDoorSqFt(wCm, hCm);
    } else if (door.sqFtOverride && door.sqFtOverride > 0) {
      singleAreaSqFt = door.sqFtOverride;
      const ratio = Math.sqrt(singleAreaSqFt / baseDoorSqFt);
      wCm = rates.baseDoorWidthCm * ratio;
      hCm = rates.baseDoorHeightCm * ratio;
    } else {
      wCm = rates.baseDoorWidthCm;
      hCm = rates.baseDoorHeightCm;
      singleAreaSqFt = baseDoorSqFt;
    }

    const totalLineSqFt = singleAreaSqFt * qty;
    const singleScale = baseDoorSqFt > 0 ? singleAreaSqFt / baseDoorSqFt : 1;
    const totalScale = singleScale * qty;

    const lineResinKg = totalScale * rates.resinKg;
    const lineGelKg = totalScale * rates.gelKg;
    const lineCatalystG = totalScale * rates.catalystGrams;
    const lineAccelG = totalScale * rates.acceleratorGrams;
    const lineCsmKg = totalScale * rates.csm300Kg;
    const linePigmentG = totalScale * rates.pigmentGrams;

    const finishColor = (door.finishColor || 'Standard').trim() || 'Standard';
    const { matchedKey, ratePerKg } = resolvePigmentRateForColour(
      finishColor,
      rates.pigmentRatesByColour
    );
    const linePigmentCost = (linePigmentG / 1000) * ratePerKg;

    const frame = resolveFrameProfileForBoq(door.frameTypeId, door.frameTypeName, framesList);
    const isNoFrame =
      frame.material === 'NONE' ||
      frame.name.toLowerCase().includes('only door') ||
      frame.id.toUpperCase() === 'FRM-005' ||
      frame.woodThicknessCm === 0 ||
      frame.woodWidthCm === 0;

    const fwThick = isNoFrame ? 0 : frame.woodThicknessCm ?? 2;
    const fwWidth = isNoFrame ? 0 : frame.woodWidthCm ?? 7;
    const fwDed = isNoFrame ? 0 : frame.woodLengthDeductionCm ?? 35;

    const singleFrameLenCm =
      isNoFrame || fwThick <= 0 || fwWidth <= 0
        ? 0
        : computeFrameWoodLengthCm(wCm, hCm, fwDed, rates.frameLengthMode);

    const lineFrameLenCm = singleFrameLenCm * qty;
    const lineFrameRft = cmToRunningFeet(lineFrameLenCm);
    const lineFrameVolCm3 = fwThick * fwWidth * lineFrameLenCm;
    const lineFrameCuFt = cm3ToCuFt(lineFrameVolCm3);

    const lineLockCm3 = singleLockCm3 * qty;
    const lineLockCuFt = singleLockCuFt * qty;
    const lineHingeCm3 = singleHingeCm3 * qty;
    const lineHingeCuFt = singleHingeCuFt * qty;
    const lineTotalWoodCuFt = lineFrameCuFt + lineLockCuFt + lineHingeCuFt;
    const lineWoodCost = lineTotalWoodCuFt * rates.woodRatePerCuFt;

    const lineFoamSheets =
      rates.foamSheet.doorsPerSheet > 0 ? qty / rates.foamSheet.doorsPerSheet : 0;
    const lineFoamCost = lineFoamSheets * rates.foamSheet.costPerSheet;

    const lineChemicalCost =
      lineResinKg * rates.resinRatePerKg +
      lineGelKg * rates.gelRatePerKg +
      (lineCatalystG / 1000) * rates.catalystRatePerKg +
      (lineAccelG / 1000) * rates.acceleratorRatePerKg +
      lineCsmKg * rates.csm300RatePerKg +
      linePigmentCost;

    totalDoors += qty;
    totalSqFt += totalLineSqFt;
    resinKg += lineResinKg;
    gelKg += lineGelKg;
    catalystGrams += lineCatalystG;
    acceleratorGrams += lineAccelG;
    csm300Kg += lineCsmKg;
    pigmentGrams += linePigmentG;
    pigmentCost += linePigmentCost;

    frameWoodTotalLengthCm += lineFrameLenCm;
    frameWoodRunningFt += lineFrameRft;
    frameWoodCuFt += lineFrameCuFt;
    lockReeperVolumeCm3 += lineLockCm3;
    lockReeperCuFt += lineLockCuFt;
    hingeReeperVolumeCm3 += lineHingeCm3;
    hingeReeperCuFt += lineHingeCuFt;

    // Pigment colour bucket
    const existingPigment = pigmentMap.get(matchedKey);
    if (existingPigment) {
      existingPigment.doorsCount += qty;
      existingPigment.sqFt += totalLineSqFt;
      existingPigment.pigmentGrams += linePigmentG;
      existingPigment.pigmentKg = existingPigment.pigmentGrams / 1000;
      existingPigment.cost += linePigmentCost;
    } else {
      pigmentMap.set(matchedKey, {
        colourLabel: matchedKey === 'Default' ? finishColor : matchedKey,
        matchedRateKey: matchedKey,
        doorsCount: qty,
        sqFt: totalLineSqFt,
        pigmentGrams: linePigmentG,
        pigmentKg: linePigmentG / 1000,
        ratePerKg,
        cost: linePigmentCost,
      });
    }

    // Frame wood bucket
    const existingFrame = frameMap.get(frame.id);
    if (existingFrame) {
      existingFrame.doorsCount += qty;
      existingFrame.totalLengthCm += lineFrameLenCm;
      existingFrame.runningFt += lineFrameRft;
      existingFrame.cuFt += lineFrameCuFt;
      existingFrame.cost = existingFrame.cuFt * rates.woodRatePerCuFt;
    } else {
      frameMap.set(frame.id, {
        frameId: frame.id,
        frameName: frame.name,
        doorsCount: qty,
        woodThicknessCm: fwThick,
        woodWidthCm: fwWidth,
        woodLengthDeductionCm: fwDed,
        totalLengthCm: lineFrameLenCm,
        runningFt: lineFrameRft,
        cuFt: lineFrameCuFt,
        cost: lineFrameCuFt * rates.woodRatePerCuFt,
      });
    }

    // Lock Box Kit bucket (Group E)
    const lockProfile = resolveLockBoxForDoor(door.lockId, door.lockType, rates.lockBoxProfiles);
    const handing = (door.handing || 'RH').toUpperCase() === 'LH' ? 'LH' : 'RH';
    const isLh = handing === 'LH';
    const existingLock = lockMap.get(lockProfile.id);
    if (existingLock) {
      existingLock.doorsCount += qty;
      existingLock.lhCount += isLh ? qty : 0;
      existingLock.rhCount += !isLh ? qty : 0;
      existingLock.totalBoxCost = existingLock.doorsCount * existingLock.boxCost;
      existingLock.aggregatedComponents = existingLock.itemsPerBox.map((it) => ({
        id: it.id,
        name: it.name,
        qtyPerBox: it.qtyPerBox,
        totalQty: Number((it.qtyPerBox * existingLock.doorsCount).toFixed(2)),
        unit: it.unit,
      }));
    } else {
      const clonedItems = (lockProfile.items || []).map((it) => ({ ...it }));
      lockMap.set(lockProfile.id, {
        profileId: lockProfile.id,
        boxName: lockProfile.name,
        isNoHardware: Boolean(lockProfile.isNoHardware),
        doorsCount: qty,
        lhCount: isLh ? qty : 0,
        rhCount: !isLh ? qty : 0,
        boxCost: lockProfile.boxCost || 0,
        totalBoxCost: qty * (lockProfile.boxCost || 0),
        itemsPerBox: clonedItems,
        aggregatedComponents: clonedItems.map((it) => ({
          id: it.id,
          name: it.name,
          qtyPerBox: it.qtyPerBox,
          totalQty: Number((it.qtyPerBox * qty).toFixed(2)),
          unit: it.unit,
        })),
      });
    }

    if (!lockProfile.isNoHardware) {
      for (const it of lockProfile.items || []) {
        const key = `${it.name.trim().toLowerCase()}::${it.unit.trim().toLowerCase()}`;
        const addQty = Number(it.qtyPerBox) * qty;
        const prev = consolidatedHardwareMap.get(key);
        if (prev) {
          prev.totalQty = Number((prev.totalQty + addQty).toFixed(2));
        } else {
          consolidatedHardwareMap.set(key, {
            id: it.id,
            name: it.name.trim(),
            totalQty: Number(addQty.toFixed(2)),
            unit: it.unit.trim(),
          });
        }
      }
    }

    perDoorLines.push({
      doorNumber: door.doorNumber || `Door ${idx + 1}`,
      quantity: qty,
      widthCm: Number(wCm.toFixed(2)),
      heightCm: Number(hCm.toFixed(2)),
      areaSqFt: totalLineSqFt,
      scaleFactor: totalScale,
      finishColor,
      matchedPigmentKey: matchedKey,
      pigmentRatePerKg: ratePerKg,
      frameId: frame.id,
      frameName: frame.name,
      resinKg: lineResinKg,
      gelKg: lineGelKg,
      catalystGrams: lineCatalystG,
      acceleratorGrams: lineAccelG,
      csm300Kg: lineCsmKg,
      pigmentGrams: linePigmentG,
      pigmentCost: linePigmentCost,
      frameWoodLengthCm: lineFrameLenCm,
      frameWoodRunningFt: lineFrameRft,
      frameWoodCuFt: lineFrameCuFt,
      lockReeperCuFt: lineLockCuFt,
      hingeReeperCuFt: lineHingeCuFt,
      totalWoodCuFt: lineTotalWoodCuFt,
      woodCost: lineWoodCost,
      foamSheetsExact: lineFoamSheets,
      foamCost: lineFoamCost,
      chemicalCost: lineChemicalCost,
      totalDoorCost: lineChemicalCost + lineWoodCost + lineFoamCost,
    });
  });

  const catalystKg = catalystGrams / 1000;
  const acceleratorKg = acceleratorGrams / 1000;
  const pigmentKg = pigmentGrams / 1000;

  const resinCost = resinKg * rates.resinRatePerKg;
  const gelCost = gelKg * rates.gelRatePerKg;
  const catalystCost = catalystKg * rates.catalystRatePerKg;
  const acceleratorCost = acceleratorKg * rates.acceleratorRatePerKg;
  const csm300Cost = csm300Kg * rates.csm300RatePerKg;

  const frameWoodCost = frameWoodCuFt * rates.woodRatePerCuFt;
  const lockReeperCost = lockReeperCuFt * rates.woodRatePerCuFt;
  const hingeReeperCost = hingeReeperCuFt * rates.woodRatePerCuFt;
  const shutterWoodCuFt = lockReeperCuFt + hingeReeperCuFt;
  const totalWoodCuFt = frameWoodCuFt + shutterWoodCuFt;
  const totalWoodCost = totalWoodCuFt * rates.woodRatePerCuFt;

  const foamSheetsExact =
    rates.foamSheet.doorsPerSheet > 0 ? totalDoors / rates.foamSheet.doorsPerSheet : 0;
  const foamSheetsPurchaseCeil = totalDoors > 0 ? Math.ceil(foamSheetsExact) : 0;
  const foamCost = foamSheetsExact * rates.foamSheet.costPerSheet;

  const totalChemicalCost =
    resinCost + gelCost + catalystCost + acceleratorCost + csm300Cost + pigmentCost;
  const grandTotalCost = totalChemicalCost + totalWoodCost + foamCost;

  const lockBoxBreakdown = Array.from(lockMap.values());
  const totalLockBoxes = lockBoxBreakdown
    .filter((b) => !b.isNoHardware)
    .reduce((sum, b) => sum + b.doorsCount, 0);
  const totalLockBoxCost = lockBoxBreakdown.reduce((sum, b) => sum + b.totalBoxCost, 0);
  const combinedWithLockTotalCost = grandTotalCost + totalLockBoxCost;

  return {
    totalDoors,
    totalSqFt,
    baseDoorSqFt,
    averageScaleFactor: totalSqFt > 0 && baseDoorSqFt > 0 ? totalSqFt / baseDoorSqFt : 0,

    resinKg,
    resinCost,
    gelKg,
    gelCost,
    catalystGrams,
    catalystKg,
    catalystCost,
    acceleratorGrams,
    acceleratorKg,
    acceleratorCost,
    csm300Kg,
    csm300Cost,
    pigmentGrams,
    pigmentKg,
    pigmentCost,
    pigmentByColour: Array.from(pigmentMap.values()),

    frameWoodTotalLengthCm,
    frameWoodRunningFt,
    frameWoodCuFt,
    frameWoodCost,
    frameWoodBreakdown: Array.from(frameMap.values()),

    lockReeperCuFt,
    lockReeperVolumeCm3,
    lockReeperCost,

    hingeReeperCuFt,
    hingeReeperVolumeCm3,
    hingeReeperCost,

    shutterWoodCuFt,
    totalWoodCuFt,
    totalWoodCost,

    foamSheetsExact,
    foamSheetsPurchaseCeil,
    foamCost,

    lockBoxBreakdown,
    consolidatedLockKitHardware: Array.from(consolidatedHardwareMap.values()),
    totalLockBoxes,
    totalLockBoxCost,

    totalChemicalCost,
    grandTotalCost,
    combinedWithLockTotalCost,
    costPerDoor: totalDoors > 0 ? grandTotalCost / totalDoors : 0,
    combinedCostPerDoor: totalDoors > 0 ? combinedWithLockTotalCost / totalDoors : 0,
    costPerSqFt: totalSqFt > 0 ? grandTotalCost / totalSqFt : 0,
    perDoorLines,
  };
}
