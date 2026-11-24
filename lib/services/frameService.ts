import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import {
  CustomFrameProfile,
  DEFAULT_FRAME_PROFILES,
} from '@/lib/utils/frameDefaults';

export type { CustomFrameProfile };

const getStorePath = () => getDataFilePath('custom-frames-store.json');

const DEFAULT_FRAMES: CustomFrameProfile[] = DEFAULT_FRAME_PROFILES;

function normalizeFrame(frame: Partial<CustomFrameProfile> & { id: string; name: string }): CustomFrameProfile {
  const isNone =
    frame.material === 'NONE' ||
    frame.name.toLowerCase().includes('only door') ||
    frame.name.toLowerCase().includes('without frame') ||
    frame.id === 'FRM-005';
  const defaultExtraRate = isNone ? -800 : 0;
  return {
    id: frame.id,
    name: isNone && !frame.name.toLowerCase().includes('without frame') ? 'Without Frame (Shutter Only)' : frame.name,
    material: frame.material || (isNone ? 'NONE' : 'FRP_WRAP'),
    materialCost:
      frame.materialCost !== undefined
        ? Number(frame.materialCost)
        : (DEFAULT_FRAMES.find((d) => d.id === frame.id)?.materialCost ?? (isNone ? 0 : 0)),
    wallThicknessMm: Number(frame.wallThicknessMm ?? 72),
    sectionWidthMm: Number(frame.sectionWidthMm ?? 50),
    rebateDepthMm: Number(frame.rebateDepthMm ?? 35),
    hDeductionCm: frame.hDeductionCm !== undefined ? Number(frame.hDeductionCm) : isNone ? 1.2 : 4.5,
    wDeductionCm: frame.wDeductionCm !== undefined ? Number(frame.wDeductionCm) : isNone ? 1.0 : 7.6,
    pieceRateCost: frame.pieceRateCost ?? (isNone ? 0 : 125),
    sellingPrice:
      frame.sellingPrice !== undefined && Number(frame.sellingPrice) !== 0
        ? Number(frame.sellingPrice)
        : defaultExtraRate,
    quotationExtraRate:
      frame.quotationExtraRate !== undefined && Number(frame.quotationExtraRate) !== 0
        ? Number(frame.quotationExtraRate)
        : defaultExtraRate,
    woodThicknessCm: frame.woodThicknessCm !== undefined ? Number(frame.woodThicknessCm) : isNone ? 0 : 2,
    woodWidthCm: frame.woodWidthCm !== undefined ? Number(frame.woodWidthCm) : isNone ? 0 : 7,
    woodLengthDeductionCm:
      frame.woodLengthDeductionCm !== undefined ? Number(frame.woodLengthDeductionCm) : isNone ? 0 : 35,
    description: frame.description || '',
    isDefault: Boolean(frame.isDefault),
    createdAt: frame.createdAt || new Date().toISOString(),
    updatedAt: frame.updatedAt || new Date().toISOString(),
  };
}

function readStore(): CustomFrameProfile[] {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, JSON.stringify(DEFAULT_FRAMES, null, 2), 'utf8');
      return DEFAULT_FRAMES;
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FRAMES;
    const normalized = parsed.map(normalizeFrame);
    // Ensure Mini Type exists if upgrading from an older v1 file
    if (!normalized.some((f) => f.id === 'FRM-MINI' || f.name.toLowerCase() === 'mini type')) {
      const miniDefault = DEFAULT_FRAMES.find((f) => f.id === 'FRM-MINI');
      if (miniDefault) {
        normalized.push(miniDefault);
        writeStore(normalized);
      }
    }
    return normalized;
  } catch {
    return DEFAULT_FRAMES;
  }
}

function writeStore(frames: CustomFrameProfile[]): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(frames, null, 2), 'utf8');
  } catch (err) {
    console.error('[frameService] Failed to write store:', err);
  }
}

export function getCustomFrames(): CustomFrameProfile[] {
  return readStore();
}

export function getCustomFrameById(id: string): CustomFrameProfile | null {
  const all = readStore();
  return all.find((f) => f.id === id) || null;
}

export function createCustomFrame(input: {
  name: string;
  material?: 'FRP_WRAP' | 'WPC_SOLID' | 'COMPOSITE' | 'HARDWOOD' | 'NONE';
  materialCost?: number;
  wallThicknessMm?: number;
  sectionWidthMm?: number;
  rebateDepthMm?: number;
  hDeductionCm?: number;
  wDeductionCm?: number;
  pieceRateCost?: number;
  sellingPrice?: number;
  quotationExtraRate?: number;
  woodThicknessCm?: number;
  woodWidthCm?: number;
  woodLengthDeductionCm?: number;
  description?: string;
  isDefault?: boolean;
}): CustomFrameProfile {
  const all = readStore();
  const id = `FRM-${String(all.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
  const now = new Date().toISOString();

  if (input.isDefault) {
    all.forEach((f) => (f.isDefault = false));
  }

  const isNone = input.material === 'NONE';
  const newFrame: CustomFrameProfile = {
    id,
    name: input.name.trim(),
    material: input.material || 'FRP_WRAP',
    materialCost: input.materialCost !== undefined ? Number(input.materialCost) : 0,
    wallThicknessMm: Number(input.wallThicknessMm ?? 72),
    sectionWidthMm: Number(input.sectionWidthMm ?? 50),
    rebateDepthMm: Number(input.rebateDepthMm ?? 35),
    hDeductionCm: input.hDeductionCm !== undefined ? Number(input.hDeductionCm) : 4.5,
    wDeductionCm: input.wDeductionCm !== undefined ? Number(input.wDeductionCm) : 7.6,
    pieceRateCost: input.pieceRateCost !== undefined ? Number(input.pieceRateCost) : 125,
    sellingPrice: input.sellingPrice !== undefined ? Number(input.sellingPrice) : 0,
    quotationExtraRate: input.quotationExtraRate !== undefined ? Number(input.quotationExtraRate) : 0,
    woodThicknessCm: input.woodThicknessCm !== undefined ? Number(input.woodThicknessCm) : isNone ? 0 : 2,
    woodWidthCm: input.woodWidthCm !== undefined ? Number(input.woodWidthCm) : isNone ? 0 : 7,
    woodLengthDeductionCm:
      input.woodLengthDeductionCm !== undefined ? Number(input.woodLengthDeductionCm) : isNone ? 0 : 35,
    description: input.description?.trim() || '',
    isDefault: all.length === 0 ? true : Boolean(input.isDefault),
    createdAt: now,
    updatedAt: now,
  };

  all.push(newFrame);
  writeStore(all);
  return newFrame;
}

export function updateCustomFrame(
  id: string,
  updates: Partial<Omit<CustomFrameProfile, 'id' | 'createdAt'>>
): CustomFrameProfile | null {
  const all = readStore();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return null;

  if (updates.isDefault) {
    all.forEach((f) => (f.isDefault = false));
  }

  const updated: CustomFrameProfile = {
    ...all[idx],
    ...updates,
    hDeductionCm: updates.hDeductionCm !== undefined ? Number(updates.hDeductionCm) : all[idx].hDeductionCm,
    wDeductionCm: updates.wDeductionCm !== undefined ? Number(updates.wDeductionCm) : all[idx].wDeductionCm,
    rebateDepthMm: updates.rebateDepthMm !== undefined ? Number(updates.rebateDepthMm) : all[idx].rebateDepthMm,
    wallThicknessMm: updates.wallThicknessMm !== undefined ? Number(updates.wallThicknessMm) : all[idx].wallThicknessMm,
    sectionWidthMm: updates.sectionWidthMm !== undefined ? Number(updates.sectionWidthMm) : all[idx].sectionWidthMm,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export function deleteCustomFrame(id: string): boolean {
  const all = readStore();
  const removed = all.find((f) => f.id === id);
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  if (removed?.isDefault && filtered.length > 0 && !filtered.some((f) => f.isDefault)) {
    filtered[0].isDefault = true;
  }
  writeStore(filtered);
  return true;
}
