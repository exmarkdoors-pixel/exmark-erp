import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';

export interface CustomTolerancePreset {
  id: string; // e.g. TOL-001
  name: string; // e.g. "Standard Flooring Clearance"
  heightDeductionMm: number; // e.g. 10
  widthDeductionMm: number; // e.g. 10
  applicableFor: 'ALL' | 'DOOR_WITH_FRAME' | 'ONLY_DOOR' | 'DOUBLE_DOOR';
  description: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

const getStorePath = () => getDataFilePath('custom-tolerances-store.json');

const DEFAULT_PRESETS: CustomTolerancePreset[] = [
  {
    id: 'TOL-001',
    name: 'Standard Flooring Clearance (-10mm H / -10mm W)',
    heightDeductionMm: 10,
    widthDeductionMm: 10,
    applicableFor: 'ALL',
    description: 'Standard 8mm bottom tile floor clearance + 2mm top frame rebate gap, with 5mm each side hinge/strike clearance.',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TOL-002',
    name: 'Only Door in Existing Frame (-12mm H / -12mm W)',
    heightDeductionMm: 12,
    widthDeductionMm: 12,
    applicableFor: 'ONLY_DOOR',
    description: 'Generous tolerance for replacing existing wooden/concrete frame doors where plumb and squareness may have settled.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TOL-003',
    name: 'Tight Tile / Bathroom Clearance (-6mm H / -6mm W)',
    heightDeductionMm: 6,
    widthDeductionMm: 6,
    applicableFor: 'DOOR_WITH_FRAME',
    description: 'Minimal tolerance for precision laser-measured tiles with waterproof threshold rubber beading.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TOL-004',
    name: 'Heavy Kerala Monsoon Clearance (-14mm H / -10mm W)',
    heightDeductionMm: 14,
    widthDeductionMm: 10,
    applicableFor: 'ALL',
    description: 'Extra bottom floor gap for heavy rain splashing resistance and floor water drain clearing.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TOL-005',
    name: 'Double Door Center Clearance (-10mm H / -16mm W)',
    heightDeductionMm: 10,
    widthDeductionMm: 16,
    applicableFor: 'DOUBLE_DOOR',
    description: 'Double leaf door deduction accounting for center meeting T-astragal and double hinge rebating.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function readStore(): CustomTolerancePreset[] {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, JSON.stringify(DEFAULT_PRESETS, null, 2), 'utf8');
      return DEFAULT_PRESETS;
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRESETS;
  } catch {
    return DEFAULT_PRESETS;
  }
}

function writeStore(presets: CustomTolerancePreset[]): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(presets, null, 2), 'utf8');
  } catch (err) {
    console.error('[toleranceService] Failed to write store:', err);
  }
}

export function getTolerancePresets(): CustomTolerancePreset[] {
  return readStore();
}

export function getTolerancePresetById(id: string): CustomTolerancePreset | null {
  const all = readStore();
  return all.find((p) => p.id === id) || null;
}

export function createTolerancePreset(input: {
  name: string;
  heightDeductionMm: number;
  widthDeductionMm: number;
  applicableFor?: 'ALL' | 'DOOR_WITH_FRAME' | 'ONLY_DOOR' | 'DOUBLE_DOOR';
  description?: string;
  isDefault?: boolean;
}): CustomTolerancePreset {
  const all = readStore();
  const id = `TOL-${String(all.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  if (input.isDefault) {
    all.forEach((p) => (p.isDefault = false));
  }

  const newPreset: CustomTolerancePreset = {
    id,
    name: input.name.trim(),
    heightDeductionMm: Number(input.heightDeductionMm) || 10,
    widthDeductionMm: Number(input.widthDeductionMm) || 10,
    applicableFor: input.applicableFor || 'ALL',
    description: input.description?.trim() || '',
    isDefault: Boolean(input.isDefault),
    createdAt: now,
    updatedAt: now,
  };

  all.push(newPreset);
  writeStore(all);
  return newPreset;
}

export function updateTolerancePreset(
  id: string,
  updates: Partial<Omit<CustomTolerancePreset, 'id' | 'createdAt'>>
): CustomTolerancePreset | null {
  const all = readStore();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  if (updates.isDefault) {
    all.forEach((p) => (p.isDefault = false));
  }

  const updated: CustomTolerancePreset = {
    ...all[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  writeStore(all);
  return updated;
}

export function deleteTolerancePreset(id: string): boolean {
  const all = readStore();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}
