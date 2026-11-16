import { promises as fs } from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';

export type ExtraBoqItemCategory =
  | 'Chemical'
  | 'Consumable'
  | 'Timber / Wood'
  | 'Hardware'
  | 'Packing'
  | 'Other';

export interface BoqExtraItem {
  id: string;
  orderKey: string;
  itemName: string;
  category: ExtraBoqItemCategory;
  specNote: string;
  quantity: number;
  unit: string;
  unitRate: number;
  amount: number;
  issueShift?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  issueDate?: string;
  gangName?: string;
  isFloorConsumable?: boolean;
  poNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoqExtraItemInput {
  orderKey: string;
  itemName: string;
  category?: ExtraBoqItemCategory;
  specNote?: string;
  quantity: number;
  unit?: string;
  unitRate: number;
  issueShift?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  issueDate?: string;
  gangName?: string;
  isFloorConsumable?: boolean;
  poNumber?: string | null;
}

const getStorePath = () => getDataFilePath('boq-extra-items.json');

async function readStore(): Promise<BoqExtraItem[]> {
  const storePath = getStorePath();
  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BoqExtraItem[]) : [];
  } catch {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, '[]', 'utf-8');
    return [];
  }
}

async function writeStore(items: BoqExtraItem[]): Promise<void> {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(items, null, 2), 'utf-8');
}

export async function listBoqExtraItems(orderKeys?: string[]): Promise<BoqExtraItem[]> {
  const all = await readStore();
  if (!orderKeys || orderKeys.length === 0) return all;
  const keySet = new Set(orderKeys.map((k) => k.trim().toLowerCase()).filter(Boolean));
  return all.filter((item) => keySet.has(item.orderKey.trim().toLowerCase()));
}

export async function addBoqExtraItem(
  input: CreateBoqExtraItemInput
): Promise<BoqExtraItem> {
  const all = await readStore();
  const qty = Math.max(0, Number(input.quantity) || 0);
  const rate = Math.max(0, Number(input.unitRate) || 0);
  const now = new Date().toISOString();

  const item: BoqExtraItem = {
    id: `EXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderKey: (input.orderKey || 'GENERAL').trim(),
    itemName: input.itemName.trim(),
    category: input.category || 'Consumable',
    specNote: (input.specNote || '').trim(),
    quantity: qty,
    unit: (input.unit || 'Nos').trim(),
    unitRate: rate,
    amount: Number((qty * rate).toFixed(2)),
    issueShift: input.issueShift || 'MORNING',
    issueDate: input.issueDate || now.slice(0, 10),
    gangName: input.gangName?.trim() || undefined,
    isFloorConsumable: Boolean(input.isFloorConsumable || input.orderKey === 'FLOOR-CONSUMABLES'),
    poNumber: input.poNumber || null,
    createdAt: now,
    updatedAt: now,
  };

  all.push(item);
  await writeStore(all);
  return item;
}

export async function updateBoqExtraItem(
  id: string,
  patch: Partial<CreateBoqExtraItemInput>
): Promise<BoqExtraItem | null> {
  const all = await readStore();
  const idx = all.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const current = all[idx];
  const nextQty =
    patch.quantity !== undefined ? Math.max(0, Number(patch.quantity) || 0) : current.quantity;
  const nextRate =
    patch.unitRate !== undefined ? Math.max(0, Number(patch.unitRate) || 0) : current.unitRate;

  const updated: BoqExtraItem = {
    ...current,
    orderKey: patch.orderKey !== undefined ? patch.orderKey.trim() : current.orderKey,
    itemName: patch.itemName !== undefined ? patch.itemName.trim() : current.itemName,
    category: patch.category !== undefined ? patch.category : current.category,
    specNote: patch.specNote !== undefined ? patch.specNote.trim() : current.specNote,
    quantity: nextQty,
    unit: patch.unit !== undefined ? patch.unit.trim() : current.unit,
    unitRate: nextRate,
    amount: Number((nextQty * nextRate).toFixed(2)),
    issueShift: patch.issueShift !== undefined ? patch.issueShift : current.issueShift,
    issueDate: patch.issueDate !== undefined ? patch.issueDate : current.issueDate,
    gangName: patch.gangName !== undefined ? patch.gangName.trim() : current.gangName,
    isFloorConsumable:
      patch.isFloorConsumable !== undefined ? Boolean(patch.isFloorConsumable) : current.isFloorConsumable,
    poNumber: patch.poNumber !== undefined ? patch.poNumber : current.poNumber,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  await writeStore(all);
  return updated;
}

export async function deleteBoqExtraItem(id: string): Promise<boolean> {
  const all = await readStore();
  const filtered = all.filter((item) => item.id !== id);
  if (filtered.length === all.length) return false;
  await writeStore(filtered);
  return true;
}
