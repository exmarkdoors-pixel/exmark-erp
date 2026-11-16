import { promises as fs } from 'fs';
import path from 'path';
import {
  BoqMaterialRatesConfig,
  DEFAULT_BOQ_MATERIAL_RATES,
  mergeBoqMaterialRates,
} from '@/lib/utils/boqFormulaEngine';
import { getDataFilePath } from '@/lib/utils/dataPaths';

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
