import { promises as fs } from 'fs';
import path from 'path';
import {
  BoqMaterialRatesConfig,
  DEFAULT_BOQ_MATERIAL_RATES,
  mergeBoqMaterialRates,
  LockBoxProfile,
} from '@/lib/utils/boqFormulaEngine';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import {
  getRawMaterialsInventory,
  RawMaterialStockItem,
} from './stockMaintenanceService';

const getRatesFilePath = () => getDataFilePath('boq-material-rates.json');

async function ensureRatesFile(): Promise<BoqMaterialRatesConfig> {
  const ratesFilePath = getRatesFilePath();
  try {
    const raw = await fs.readFile(ratesFilePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BoqMaterialRatesConfig>;
    const merged = mergeBoqMaterialRates(parsed);
    // Respect deleted pigment keys if stored explicitly
    if (parsed.pigmentRatesByColour && typeof parsed.pigmentRatesByColour === 'object') {
      merged.pigmentRatesByColour = {
        Default:
          Number(parsed.pigmentRatesByColour.Default) ||
          DEFAULT_BOQ_MATERIAL_RATES.pigmentRatesByColour.Default,
        ...parsed.pigmentRatesByColour,
      };
    }
    return merged;
  } catch {
    const defaults = mergeBoqMaterialRates(DEFAULT_BOQ_MATERIAL_RATES);
    await fs.mkdir(path.dirname(ratesFilePath), { recursive: true });
    await fs.writeFile(ratesFilePath, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
}

export async function getBoqMaterialRates(): Promise<BoqMaterialRatesConfig> {
  return ensureRatesFile();
}

export async function saveBoqMaterialRates(
  payload: Partial<BoqMaterialRatesConfig> & { resetToDefaults?: boolean }
): Promise<BoqMaterialRatesConfig> {
  const ratesFilePath = getRatesFilePath();
  if (payload.resetToDefaults) {
    const defaults = mergeBoqMaterialRates(DEFAULT_BOQ_MATERIAL_RATES);
    defaults.updatedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(ratesFilePath), { recursive: true });
    await fs.writeFile(ratesFilePath, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }

  const current = await ensureRatesFile();
  const next = mergeBoqMaterialRates({
    ...current,
    ...payload,
    lockReeper: {
      ...current.lockReeper,
      ...(payload.lockReeper || {}),
    },
    hingeReeper: {
      ...current.hingeReeper,
      ...(payload.hingeReeper || {}),
    },
    foamSheet: {
      ...current.foamSheet,
      ...(payload.foamSheet || {}),
    },
  });

  if (payload.pigmentRatesByColour && typeof payload.pigmentRatesByColour === 'object') {
    const sanitizedPigments: Record<string, number> = {};
    for (const [k, v] of Object.entries(payload.pigmentRatesByColour)) {
      const cleanKey = k.trim();
      const numVal = Number(v);
      if (cleanKey && Number.isFinite(numVal) && numVal >= 0) {
        sanitizedPigments[cleanKey] = numVal;
      }
    }
    if (!Number.isFinite(sanitizedPigments.Default)) {
      sanitizedPigments.Default = current.pigmentRatesByColour.Default ?? 480;
    }
    next.pigmentRatesByColour = sanitizedPigments;
  } else {
    next.pigmentRatesByColour = current.pigmentRatesByColour;
  }

  if (Array.isArray(payload.lockBoxProfiles)) {
    next.lockBoxProfiles = payload.lockBoxProfiles
      .filter((p) => p && typeof p.name === 'string' && p.name.trim().length > 0)
      .map((p) => ({
        id: (p.id || `box-${Date.now()}`).trim(),
        name: p.name.trim(),
        matchKeywords: Array.isArray(p.matchKeywords)
          ? p.matchKeywords.map((k) => String(k).trim()).filter(Boolean)
          : [p.name.trim().toLowerCase()],
        boxCost: Math.max(0, Number(p.boxCost) || 0),
        isNoHardware: Boolean(p.isNoHardware),
        items: Array.isArray(p.items)
          ? p.items
              .filter((it) => it && typeof it.name === 'string' && it.name.trim().length > 0)
              .map((it) => ({
                id: (it.id || `kit-${Date.now()}-${Math.floor(Math.random() * 100)}`).trim(),
                name: it.name.trim(),
                qtyPerBox: Math.max(0, Number(it.qtyPerBox) || 0),
                unit: (it.unit || 'Pcs').trim(),
              }))
          : [],
      }));
  } else {
    next.lockBoxProfiles = current.lockBoxProfiles;
  }

  next.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(ratesFilePath), { recursive: true });
  await fs.writeFile(ratesFilePath, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

// ── Stock Ledger Name & Price Sync to BOQ Engine ──────────────────────────

export interface StockBoqRateDiff {
  boqKey: string;
  label: string;
  unit: string;
  stockItemId: string;
  stockItemCode: string;
  stockItemName: string;
  currentBoqRate: number;
  stockUnitCost: number;
  variance: number; // stockUnitCost - currentBoqRate
  category: string;
  applyTarget: 'field' | 'pigment' | 'lock';
  targetKey?: string;
}

export interface StockBoqSyncResult {
  updatedCount: number;
  updatedRates: BoqMaterialRatesConfig;
  diffs: StockBoqRateDiff[];
  syncedAt: string;
}

export function extractPigmentShadeName(stockItemName: string): string {
  const clean = stockItemName
    .replace(/EXGC-\d+/gi, '')
    .replace(/pigment\s*(paste)?/gi, '')
    .replace(/uv-stabilized/gi, '')
    .replace(/pu\s*/gi, '')
    .replace(/gelcoat\s*[\/\-]?/gi, '')
    .trim();

  const lower = clean.toLowerCase();
  if (lower.includes('teak')) return 'Natural Teak';
  if (lower.includes('rose') || lower.includes('rosewood')) return 'Rose Wood';
  if (lower.includes('walnut') || lower.includes('waln')) return 'Walnut';
  if (lower.includes('mahogany')) return 'Mahogany';
  if (lower.includes('eeti')) return 'Eeti Wood';
  if (lower.includes('slate') || lower.includes('grey') || lower.includes('gray')) return 'Slate Grey';
  if (lower.includes('ivory')) return 'Ivory Cream';
  if (lower.includes('pu white') || lower.includes('pure white')) return 'PU WHITE';
  if (lower.includes('white')) return 'White';
  if (lower.includes('cherry')) return 'Cherry';
  if (lower.includes('2 side')) return '2 SIDE';

  return clean || 'Custom Shade';
}

export async function getStockToBoqComparison(): Promise<StockBoqRateDiff[]> {
  const currentRates = await getBoqMaterialRates();
  const rawMaterials = getRawMaterialsInventory();
  const diffs: StockBoqRateDiff[] = [];

  // 1. Resin (Prefer GP Resin RAW-RES-02, or RAW-RES-01, or name matches resin)
  const resinItem =
    rawMaterials.find((r) => r.itemCode === 'RAW-RES-02') ||
    rawMaterials.find((r) => r.itemCode === 'RAW-RES-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('resin') && r.category === 'Chemicals') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('resin'));
  if (resinItem) {
    diffs.push({
      boqKey: 'resinRatePerKg',
      label: 'Polyester Resin',
      unit: '₹/Kg',
      stockItemId: resinItem.id,
      stockItemCode: resinItem.itemCode,
      stockItemName: resinItem.name,
      currentBoqRate: currentRates.resinRatePerKg,
      stockUnitCost: resinItem.unitCost,
      variance: Number((resinItem.unitCost - currentRates.resinRatePerKg).toFixed(2)),
      category: 'Chemicals',
      applyTarget: 'field',
    });
  }

  // 2. Gelcoat
  const gelItem =
    rawMaterials.find((r) => r.itemCode === 'RAW-GEL-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('gelcoat') || r.name.toLowerCase().includes('gel coat'));
  if (gelItem) {
    diffs.push({
      boqKey: 'gelRatePerKg',
      label: 'UV Gelcoat',
      unit: '₹/Kg',
      stockItemId: gelItem.id,
      stockItemCode: gelItem.itemCode,
      stockItemName: gelItem.name,
      currentBoqRate: currentRates.gelRatePerKg,
      stockUnitCost: gelItem.unitCost,
      variance: Number((gelItem.unitCost - currentRates.gelRatePerKg).toFixed(2)),
      category: 'Chemicals',
      applyTarget: 'field',
    });
  }

  // 3. Catalyst (MEKP)
  const catItem =
    rawMaterials.find((r) => r.itemCode === 'CHM-CAT-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('catalyst') || r.name.toLowerCase().includes('mekp'));
  if (catItem) {
    diffs.push({
      boqKey: 'catalystRatePerKg',
      label: 'MEKP Catalyst',
      unit: '₹/Kg',
      stockItemId: catItem.id,
      stockItemCode: catItem.itemCode,
      stockItemName: catItem.name,
      currentBoqRate: currentRates.catalystRatePerKg,
      stockUnitCost: catItem.unitCost,
      variance: Number((catItem.unitCost - currentRates.catalystRatePerKg).toFixed(2)),
      category: 'Chemicals',
      applyTarget: 'field',
    });
  }

  // 4. Accelerator (Cobalt)
  const accItem =
    rawMaterials.find((r) => r.itemCode === 'CHM-ACC-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('accelerator') || r.name.toLowerCase().includes('cobalt'));
  if (accItem) {
    diffs.push({
      boqKey: 'acceleratorRatePerKg',
      label: 'Cobalt Accelerator',
      unit: '₹/Kg',
      stockItemId: accItem.id,
      stockItemCode: accItem.itemCode,
      stockItemName: accItem.name,
      currentBoqRate: currentRates.acceleratorRatePerKg,
      stockUnitCost: accItem.unitCost,
      variance: Number((accItem.unitCost - currentRates.acceleratorRatePerKg).toFixed(2)),
      category: 'Chemicals',
      applyTarget: 'field',
    });
  }

  // 5. CSM 300 Fiberglass Mat
  const csmItem =
    rawMaterials.find((r) => r.itemCode === 'RAW-FBR-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('csm 300') || r.name.toLowerCase().includes('csm300')) ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('csm') || (r.category === 'Fiberglass' && r.name.toLowerCase().includes('mat')));
  if (csmItem) {
    diffs.push({
      boqKey: 'csm300RatePerKg',
      label: 'CSM 300 Glass Mat',
      unit: '₹/Kg',
      stockItemId: csmItem.id,
      stockItemCode: csmItem.itemCode,
      stockItemName: csmItem.name,
      currentBoqRate: currentRates.csm300RatePerKg,
      stockUnitCost: csmItem.unitCost,
      variance: Number((csmItem.unitCost - currentRates.csm300RatePerKg).toFixed(2)),
      category: 'Fiberglass',
      applyTarget: 'field',
    });
  }

  // 6. Rigid Foam Core Sheet
  const foamItem =
    rawMaterials.find((r) => r.itemCode === 'CORE-FOAM-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('foam'));
  if (foamItem) {
    const currentFoamCost = currentRates.foamSheet?.costPerSheet ?? 250;
    diffs.push({
      boqKey: 'foamSheet.costPerSheet',
      label: 'PU Rigid Foam Sheet',
      unit: '₹/Sheet',
      stockItemId: foamItem.id,
      stockItemCode: foamItem.itemCode,
      stockItemName: foamItem.name,
      currentBoqRate: currentFoamCost,
      stockUnitCost: foamItem.unitCost,
      variance: Number((foamItem.unitCost - currentFoamCost).toFixed(2)),
      category: 'Core & Structural',
      applyTarget: 'field',
    });
  }

  // 7. Wood Timber Reeper
  const woodItem =
    rawMaterials.find((r) => r.itemCode === 'CORE-TMB-01') ||
    rawMaterials.find((r) => r.name.toLowerCase().includes('timber') || r.name.toLowerCase().includes('wood') || r.name.toLowerCase().includes('batten'));
  if (woodItem) {
    diffs.push({
      boqKey: 'woodRatePerCuFt',
      label: 'Timber / Wood Batten',
      unit: '₹/Cu.Ft',
      stockItemId: woodItem.id,
      stockItemCode: woodItem.itemCode,
      stockItemName: woodItem.name,
      currentBoqRate: currentRates.woodRatePerCuFt,
      stockUnitCost: woodItem.unitCost,
      variance: Number((woodItem.unitCost - currentRates.woodRatePerCuFt).toFixed(2)),
      category: 'Core & Structural',
      applyTarget: 'field',
    });
  }

  // 8. Pigments
  const pigmentItems = rawMaterials.filter(
    (r) => r.category === 'Pigments' || r.itemCode.startsWith('PIG-') || r.name.toLowerCase().includes('pigment')
  );
  for (const pig of pigmentItems) {
    const shadeKey = extractPigmentShadeName(pig.name);
    const currentRate = currentRates.pigmentRatesByColour[shadeKey] ?? currentRates.pigmentRatesByColour.Default ?? 480;
    diffs.push({
      boqKey: `pigment:${shadeKey}`,
      label: `Pigment: ${shadeKey}`,
      unit: '₹/Kg',
      stockItemId: pig.id,
      stockItemCode: pig.itemCode,
      stockItemName: pig.name,
      currentBoqRate: currentRate,
      stockUnitCost: pig.unitCost,
      variance: Number((pig.unitCost - currentRate).toFixed(2)),
      category: 'Pigments',
      applyTarget: 'pigment',
      targetKey: shadeKey,
    });
  }

  // 9. Hardware & Locks
  const hardwareItems = rawMaterials.filter((r) => r.category === 'Hardware' || r.itemCode.startsWith('HRD-'));
  for (const prof of currentRates.lockBoxProfiles || []) {
    const matchedHrd = hardwareItems.find((h) => {
      const lower = h.name.toLowerCase();
      if (lower.includes(prof.name.toLowerCase())) return true;
      return (prof.matchKeywords || []).some((kw) => lower.includes(kw.toLowerCase()));
    });
    if (matchedHrd) {
      diffs.push({
        boqKey: `lock:${prof.id}`,
        label: `Lock Box: ${prof.name}`,
        unit: '₹/Box',
        stockItemId: matchedHrd.id,
        stockItemCode: matchedHrd.itemCode,
        stockItemName: matchedHrd.name,
        currentBoqRate: prof.boxCost,
        stockUnitCost: matchedHrd.unitCost,
        variance: Number((matchedHrd.unitCost - prof.boxCost).toFixed(2)),
        category: 'Hardware',
        applyTarget: 'lock',
        targetKey: prof.id,
      });
    }
  }

  return diffs;
}

export async function syncBoqRatesFromStockLedger(
  selectedKeys?: string[]
): Promise<StockBoqSyncResult> {
  const currentRates = await getBoqMaterialRates();
  const diffs = await getStockToBoqComparison();
  const isSelected = (key: string) => !selectedKeys || selectedKeys.length === 0 || selectedKeys.includes(key);

  const nextRates: Partial<BoqMaterialRatesConfig> = { ...currentRates };
  const updatedPigments: Record<string, number> = { ...(currentRates.pigmentRatesByColour || {}) };
  const updatedLocks = [...(currentRates.lockBoxProfiles || [])];
  let updatedCount = 0;

  for (const diff of diffs) {
    if (!isSelected(diff.boqKey)) continue;

    if (diff.applyTarget === 'field') {
      if (diff.boqKey === 'resinRatePerKg') {
        nextRates.resinRatePerKg = diff.stockUnitCost;
        updatedCount++;
      } else if (diff.boqKey === 'gelRatePerKg') {
        nextRates.gelRatePerKg = diff.stockUnitCost;
        updatedCount++;
      } else if (diff.boqKey === 'catalystRatePerKg') {
        nextRates.catalystRatePerKg = diff.stockUnitCost;
        updatedCount++;
      } else if (diff.boqKey === 'acceleratorRatePerKg') {
        nextRates.acceleratorRatePerKg = diff.stockUnitCost;
        updatedCount++;
      } else if (diff.boqKey === 'csm300RatePerKg') {
        nextRates.csm300RatePerKg = diff.stockUnitCost;
        updatedCount++;
      } else if (diff.boqKey === 'woodRatePerCuFt') {
        nextRates.woodRatePerCuFt = diff.stockUnitCost;
        updatedCount++;
      } else if (diff.boqKey === 'foamSheet.costPerSheet') {
        nextRates.foamSheet = {
          ...(currentRates.foamSheet || { widthCm: 50, heightCm: 100, doorsPerSheet: 12 }),
          costPerSheet: diff.stockUnitCost,
        };
        updatedCount++;
      }
    } else if (diff.applyTarget === 'pigment' && diff.targetKey) {
      updatedPigments[diff.targetKey] = diff.stockUnitCost;
      updatedCount++;
    } else if (diff.applyTarget === 'lock' && diff.targetKey) {
      const lockIdx = updatedLocks.findIndex((l) => l.id === diff.targetKey);
      if (lockIdx !== -1) {
        updatedLocks[lockIdx] = {
          ...updatedLocks[lockIdx],
          boxCost: diff.stockUnitCost,
        };
        updatedCount++;
      }
    }
  }

  nextRates.pigmentRatesByColour = updatedPigments;
  nextRates.lockBoxProfiles = updatedLocks;

  const saved = await saveBoqMaterialRates(nextRates);

  return {
    updatedCount,
    updatedRates: saved,
    diffs,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncSingleStockItemToBoq(
  item: RawMaterialStockItem
): Promise<{ synced: boolean; fieldName?: string; newRate?: number }> {
  if (!item || !Number.isFinite(item.unitCost) || item.unitCost <= 0) {
    return { synced: false };
  }

  const currentRates = await getBoqMaterialRates();
  const lowerName = item.name.toLowerCase();
  const code = (item.itemCode || '').toUpperCase();
  const updates: Partial<BoqMaterialRatesConfig> = {};
  let fieldName = '';

  if (code.startsWith('RAW-RES') || lowerName.includes('resin')) {
    updates.resinRatePerKg = item.unitCost;
    fieldName = 'Resin (resinRatePerKg)';
  } else if (code.startsWith('RAW-GEL') || lowerName.includes('gelcoat') || lowerName.includes('gel coat')) {
    updates.gelRatePerKg = item.unitCost;
    fieldName = 'Gelcoat (gelRatePerKg)';
  } else if (code.startsWith('CHM-CAT') || lowerName.includes('catalyst') || lowerName.includes('mekp')) {
    updates.catalystRatePerKg = item.unitCost;
    fieldName = 'Catalyst (catalystRatePerKg)';
  } else if (code.startsWith('CHM-ACC') || lowerName.includes('accelerator') || lowerName.includes('cobalt')) {
    updates.acceleratorRatePerKg = item.unitCost;
    fieldName = 'Accelerator (acceleratorRatePerKg)';
  } else if (code.startsWith('RAW-FBR-01') || lowerName.includes('csm 300') || lowerName.includes('csm300')) {
    updates.csm300RatePerKg = item.unitCost;
    fieldName = 'CSM 300 (csm300RatePerKg)';
  } else if (code.startsWith('CORE-FOAM') || lowerName.includes('foam')) {
    updates.foamSheet = {
      ...(currentRates.foamSheet || { widthCm: 50, heightCm: 100, doorsPerSheet: 12 }),
      costPerSheet: item.unitCost,
    };
    fieldName = 'Foam Sheet (costPerSheet)';
  } else if (code.startsWith('CORE-TMB') || lowerName.includes('timber') || lowerName.includes('wood batten')) {
    updates.woodRatePerCuFt = item.unitCost;
    fieldName = 'Wood Timber (woodRatePerCuFt)';
  } else if (item.category === 'Pigments' || code.startsWith('PIG-') || lowerName.includes('pigment')) {
    const shadeKey = extractPigmentShadeName(item.name);
    updates.pigmentRatesByColour = {
      ...(currentRates.pigmentRatesByColour || {}),
      [shadeKey]: item.unitCost,
    };
    fieldName = `Pigment Colour (${shadeKey})`;
  } else if (item.category === 'Hardware' || code.startsWith('HRD-LCK')) {
    const locks = [...(currentRates.lockBoxProfiles || [])];
    const matchIdx = locks.findIndex((l) => {
      if (lowerName.includes(l.name.toLowerCase())) return true;
      return (l.matchKeywords || []).some((kw) => lowerName.includes(kw.toLowerCase()));
    });
    if (matchIdx !== -1) {
      locks[matchIdx] = { ...locks[matchIdx], boxCost: item.unitCost };
      updates.lockBoxProfiles = locks;
      fieldName = `Lock Box (${locks[matchIdx].name})`;
    }
  }

  if (fieldName && Object.keys(updates).length > 0) {
    await saveBoqMaterialRates(updates);
    return { synced: true, fieldName, newRate: item.unitCost };
  }

  return { synced: false };
}

export function getLiveStockItemsForBoqExtra(): Array<{
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  status: string;
}> {
  const all = getRawMaterialsInventory();
  return all.map((it) => ({
    id: it.id,
    itemCode: it.itemCode,
    name: it.name,
    category: it.category,
    unit: it.unit,
    unitCost: it.unitCost,
    currentStock: it.currentStock,
    status: it.status,
  }));
}

