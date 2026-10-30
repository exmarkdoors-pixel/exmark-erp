import fs from 'fs';
import path from 'path';
import { CatalogMaster, DoorModelCatalogItem, ColourCatalogItem, LockCatalogItem, DEFAULT_CATALOG } from '@/types/catalog';
import { logAuditEvent } from '@/lib/audit/auditLogger';

const STORE_PATH = path.join(process.cwd(), 'data', 'catalog-store.json');

let cachedCatalog: CatalogMaster | null = null;

function readStore(): CatalogMaster {
  if (cachedCatalog) return cachedCatalog;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_CATALOG, null, 2), 'utf8');
      cachedCatalog = DEFAULT_CATALOG;
      return cachedCatalog;
    }

    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.models) && Array.isArray(parsed.colours) && Array.isArray(parsed.locks)) {
      cachedCatalog = parsed;
      return parsed;
    }
    cachedCatalog = DEFAULT_CATALOG;
    return DEFAULT_CATALOG;
  } catch (err) {
    console.error('[CatalogService] Failed reading catalog store:', err);
    return DEFAULT_CATALOG;
  }
}

function writeStore(data: CatalogMaster): void {
  try {
    cachedCatalog = data;
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[CatalogService] Failed writing catalog store:', err);
  }
}

// ── GET FULL CATALOG ───────────────────────────────────────────────────────────
export async function getCatalogMaster(): Promise<CatalogMaster> {
  return readStore();
}

// ── MODELS CRUD ────────────────────────────────────────────────────────────────
export async function saveDoorModel(item: Partial<DoorModelCatalogItem> & { name: string }): Promise<DoorModelCatalogItem> {
  const catalog = readStore();
  const id = item.id || `EXM-M-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const existingIndex = catalog.models.findIndex((m) => m.id === id || m.code === item.code);
  const modelRecord: DoorModelCatalogItem = {
    id,
    code: item.code || id,
    name: item.name,
    category: item.category || 'Bath FRP Door',
    basePrice: Number(item.basePrice) || 7000,
    ratePerSqFt: Number(item.ratePerSqFt) || 395,
    defaultThickness: item.defaultThickness || '32mm',
    description: item.description || '',
    isActive: item.isActive !== false,
    createdAt: existingIndex >= 0 ? catalog.models[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    catalog.models[existingIndex] = modelRecord;
  } else {
    catalog.models.push(modelRecord);
  }

  catalog.lastUpdated = now;
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
    entityType: 'INVENTORY',
    entityId: modelRecord.id,
    details: { model: modelRecord.name, basePrice: modelRecord.basePrice, ratePerSqFt: modelRecord.ratePerSqFt },
  });

  return modelRecord;
}

export async function deleteDoorModel(id: string): Promise<boolean> {
  const catalog = readStore();
  const filtered = catalog.models.filter((m) => m.id !== id && m.code !== id);
  if (filtered.length === catalog.models.length) return false;

  catalog.models = filtered;
  catalog.lastUpdated = new Date().toISOString();
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: 'DELETE',
    entityType: 'INVENTORY',
    entityId: id,
    details: { deletedModelId: id },
  });

  return true;
}

// ── COLOURS CRUD ───────────────────────────────────────────────────────────────
export async function saveColour(item: Partial<ColourCatalogItem> & { name: string }): Promise<ColourCatalogItem> {
  const catalog = readStore();
  const id = item.id || `clr-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const existingIndex = catalog.colours.findIndex((c) => c.id === id || (item.code && c.code === item.code));
  const colourRecord: ColourCatalogItem = {
    id,
    code: item.code || `EXGC-${Math.floor(100 + Math.random() * 899)}`,
    name: item.name,
    finishType: item.finishType || 'Woodgrain PU',
    hexColor: item.hexColor || '#B57434',
    description: item.description || '',
    isActive: item.isActive !== false,
    createdAt: existingIndex >= 0 ? catalog.colours[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    catalog.colours[existingIndex] = colourRecord;
  } else {
    catalog.colours.push(colourRecord);
  }

  catalog.lastUpdated = now;
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
    entityType: 'INVENTORY',
    entityId: colourRecord.id,
    details: { colour: colourRecord.name, code: colourRecord.code },
  });

  return colourRecord;
}

export async function deleteColour(id: string): Promise<boolean> {
  const catalog = readStore();
  const filtered = catalog.colours.filter((c) => c.id !== id && c.code !== id);
  if (filtered.length === catalog.colours.length) return false;

  catalog.colours = filtered;
  catalog.lastUpdated = new Date().toISOString();
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: 'DELETE',
    entityType: 'INVENTORY',
    entityId: id,
    details: { deletedColourId: id },
  });

  return true;
}

// ── LOCKS CRUD ─────────────────────────────────────────────────────────────────
export async function saveLock(item: Partial<LockCatalogItem> & { name: string }): Promise<LockCatalogItem> {
  const catalog = readStore();
  const id = item.id || `lck-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const existingIndex = catalog.locks.findIndex((l) => l.id === id || l.name === item.name);
  const lockRecord: LockCatalogItem = {
    id,
    name: item.name,
    lockType: item.lockType || 'Baby Latch',
    price: Number(item.price) || 0,
    description: item.description || '',
    isActive: item.isActive !== false,
    createdAt: existingIndex >= 0 ? catalog.locks[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    catalog.locks[existingIndex] = lockRecord;
  } else {
    catalog.locks.push(lockRecord);
  }

  catalog.lastUpdated = now;
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
    entityType: 'INVENTORY',
    entityId: lockRecord.id,
    details: { lock: lockRecord.name, price: lockRecord.price },
  });

  return lockRecord;
}

export async function deleteLock(id: string): Promise<boolean> {
  const catalog = readStore();
  const filtered = catalog.locks.filter((l) => l.id !== id);
  if (filtered.length === catalog.locks.length) return false;

  catalog.locks = filtered;
  catalog.lastUpdated = new Date().toISOString();
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: 'DELETE',
    entityType: 'INVENTORY',
    entityId: id,
    details: { deletedLockId: id },
  });

  return true;
}

// ── BULK UPLOAD & UPDATE ───────────────────────────────────────────────────────
export interface BulkUploadResult {
  inserted: number;
  updated: number;
  errors: string[];
}

export async function bulkUploadCatalog(
  categoryType: 'MODELS' | 'COLOURS' | 'LOCKS',
  items: Array<Record<string, unknown>>
): Promise<BulkUploadResult> {
  const result: BulkUploadResult = { inserted: 0, updated: 0, errors: [] };
  const catalog = readStore();
  const now = new Date().toISOString();

  if (categoryType === 'MODELS') {
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const name = String(raw.name || raw.model || '').trim();
      const code = String(raw.code || raw.id || name.split(' ')[0] || '').trim();
      if (!name) {
        result.errors.push(`Row #${i + 1}: Name is required.`);
        continue;
      }

      const existingIndex = catalog.models.findIndex((m) => (code && m.code === code) || m.name === name);
      const record: DoorModelCatalogItem = {
        id: code || `EXM-M-${Date.now()}-${i}`,
        code: code || `EXM-${i}`,
        name,
        category: String(raw.category || 'Bath FRP Door').trim(),
        basePrice: parseFloat(String(raw.basePrice || raw.price || '7000')) || 7000,
        ratePerSqFt: parseFloat(String(raw.ratePerSqFt || raw.rate || '395')) || 395,
        defaultThickness: String(raw.defaultThickness || raw.thickness || '32mm').trim(),
        description: String(raw.description || '').trim(),
        isActive: raw.isActive !== false && raw.isActive !== 'false',
        createdAt: existingIndex >= 0 ? catalog.models[existingIndex].createdAt : now,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        catalog.models[existingIndex] = record;
        result.updated += 1;
      } else {
        catalog.models.push(record);
        result.inserted += 1;
      }
    }
  } else if (categoryType === 'COLOURS') {
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const name = String(raw.name || raw.colour || '').trim();
      const code = String(raw.code || raw.id || '').trim();
      if (!name) {
        result.errors.push(`Row #${i + 1}: Colour Name is required.`);
        continue;
      }

      const existingIndex = catalog.colours.findIndex((c) => (code && c.code === code) || c.name === name);
      const record: ColourCatalogItem = {
        id: code || `clr-${Date.now()}-${i}`,
        code: code || `EXGC-${Math.floor(100 + Math.random() * 899)}`,
        name,
        finishType: String(raw.finishType || 'Woodgrain PU').trim(),
        hexColor: String(raw.hexColor || '#B57434').trim(),
        description: String(raw.description || '').trim(),
        isActive: raw.isActive !== false && raw.isActive !== 'false',
        createdAt: existingIndex >= 0 ? catalog.colours[existingIndex].createdAt : now,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        catalog.colours[existingIndex] = record;
        result.updated += 1;
      } else {
        catalog.colours.push(record);
        result.inserted += 1;
      }
    }
  } else if (categoryType === 'LOCKS') {
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const name = String(raw.name || raw.lock || '').trim();
      if (!name) {
        result.errors.push(`Row #${i + 1}: Lock Name is required.`);
        continue;
      }

      const existingIndex = catalog.locks.findIndex((l) => l.name === name || (raw.id && l.id === raw.id));
      const record: LockCatalogItem = {
        id: String(raw.id || `lck-${Date.now()}-${i}`),
        name,
        lockType: String(raw.lockType || raw.type || 'Baby Latch').trim(),
        price: parseFloat(String(raw.price || raw.surcharge || '0')) || 0,
        description: String(raw.description || '').trim(),
        isActive: raw.isActive !== false && raw.isActive !== 'false',
        createdAt: existingIndex >= 0 ? catalog.locks[existingIndex].createdAt : now,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        catalog.locks[existingIndex] = record;
        result.updated += 1;
      } else {
        catalog.locks.push(record);
        result.inserted += 1;
      }
    }
  }

  catalog.lastUpdated = now;
  catalog.version += 1;
  writeStore(catalog);

  await logAuditEvent({
    action: 'UPDATE',
    entityType: 'INVENTORY',
    entityId: `bulk-${categoryType.toLowerCase()}`,
    details: { categoryType, inserted: result.inserted, updated: result.updated, errorsCount: result.errors.length },
  });

  return result;
}
