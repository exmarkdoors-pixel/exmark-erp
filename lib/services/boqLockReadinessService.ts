import { promises as fs } from 'fs';
import path from 'path';
import { getDataFilePath } from '@/lib/utils/dataPaths';

export type LockReadinessStatus =
  | 'PENDING_PURCHASE'
  | 'ORDERED'
  | 'IN_STOCK_RESERVED'
  | 'ISSUED_TO_FLOOR';

export interface LockReadinessRecord {
  key: string; // `${orderKey}::${lockBoxId}`
  orderKey: string;
  lockBoxId: string;
  status: LockReadinessStatus;
  note?: string;
  updatedAt: string;
}

const getStorePath = () => getDataFilePath('boq-lock-readiness.json');

async function readStore(): Promise<Record<string, LockReadinessRecord>> {
  const storePath = getStorePath();
  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, '{}', 'utf-8');
    return {};
  }
}

async function writeStore(records: Record<string, LockReadinessRecord>): Promise<void> {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(records, null, 2), 'utf-8');
}

export async function getAllLockReadiness(): Promise<Record<string, LockReadinessRecord>> {
  return readStore();
}

export async function setLockReadiness(input: {
  orderKey: string;
  lockBoxId: string;
  status: LockReadinessStatus;
  note?: string;
}): Promise<LockReadinessRecord> {
  const records = await readStore();
  const orderKey = (input.orderKey || 'GENERAL').trim();
  const lockBoxId = (input.lockBoxId || 'box-baby-latch-black').trim();
  const compositeKey = `${orderKey.toLowerCase()}::${lockBoxId.toLowerCase()}`;

  const next: LockReadinessRecord = {
    key: compositeKey,
    orderKey,
    lockBoxId,
    status: input.status,
    note: input.note?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  records[compositeKey] = next;
  await writeStore(records);
  return next;
}
