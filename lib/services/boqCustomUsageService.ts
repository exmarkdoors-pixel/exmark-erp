import { promises as fs } from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';

export interface BoqCustomItemOverride {
  customQty?: number;
  customRate?: number;
  note?: string;
  excluded?: boolean;
}

export interface BoqCustomUsageRecord {
  batchKey: string; // e.g. "CONSOLIDATED_BATCH" or orderId
  bufferPercent: number; // e.g. 0, 5, 10, 15
  overrides: Record<string, BoqCustomItemOverride>;
  supervisorNotes?: string;
  updatedBy?: string;
  updatedAt: string;
}

const getStorePath = () => getDataFilePath('boq-custom-usage.json');

async function readStore(): Promise<Record<string, BoqCustomUsageRecord>> {
  const storePath = getStorePath();
  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    try {
      await fs.mkdir(path.dirname(storePath), { recursive: true });
      await fs.writeFile(storePath, '{}', 'utf-8');
    } catch {
      // ignore
    }
    return {};
  }
}

async function writeStore(data: Record<string, BoqCustomUsageRecord>): Promise<void> {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), 'utf-8');
}

const DYNAMIC_NON_PERSISTENT_BATCH_KEYS = new Set(['CONSOLIDATED_BATCH', 'CUSTOM_SIMULATOR']);

export async function getBoqCustomUsage(batchKey: string): Promise<BoqCustomUsageRecord | null> {
  // Never serve stale global customQty overrides for dynamic multi-party consolidated batches
  // so Required Qty always scales dynamically from the Calculation Basis formula (e.g. 8 kg / 18.08 sq.ft).
  if (DYNAMIC_NON_PERSISTENT_BATCH_KEYS.has(batchKey)) {
    return null;
  }
  const store = await readStore();
  return store[batchKey] || null;
}

export async function saveBoqCustomUsage(
  batchKey: string,
  payload: {
    bufferPercent?: number;
    overrides?: Record<string, BoqCustomItemOverride>;
    supervisorNotes?: string;
    updatedBy?: string;
  }
): Promise<BoqCustomUsageRecord> {
  const nowIso = new Date().toISOString();
  if (DYNAMIC_NON_PERSISTENT_BATCH_KEYS.has(batchKey)) {
    // Strip stale disk record if any existed; return ephemeral response without polluting future batches
    const store = await readStore();
    if (store[batchKey]) {
      delete store[batchKey];
      await writeStore(store);
    }
    return {
      batchKey,
      bufferPercent: payload.bufferPercent || 0,
      overrides: payload.overrides || {},
      supervisorNotes: payload.supervisorNotes || '',
      updatedBy: payload.updatedBy || 'Factory Supervisor',
      updatedAt: nowIso,
    };
  }
  const store = await readStore();
  const existing = store[batchKey];
  const updated: BoqCustomUsageRecord = {
    batchKey,
    bufferPercent: payload.bufferPercent !== undefined ? payload.bufferPercent : (existing?.bufferPercent || 0),
    overrides: payload.overrides !== undefined ? payload.overrides : (existing?.overrides || {}),
    supervisorNotes: payload.supervisorNotes !== undefined ? payload.supervisorNotes : (existing?.supervisorNotes || ''),
    updatedBy: payload.updatedBy || 'Factory Supervisor',
    updatedAt: nowIso,
  };

  store[batchKey] = updated;
  await writeStore(store);
  return updated;
}

export async function clearBoqCustomUsage(batchKey: string): Promise<boolean> {
  const store = await readStore();
  if (store[batchKey]) {
    delete store[batchKey];
    await writeStore(store);
    return true;
  }
  return false;
}
