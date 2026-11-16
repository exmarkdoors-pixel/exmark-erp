/**
 * EXMARK ERP — Central Door Model Registry & Quotation Synchronization Service
 * 
 * Aggregates standard factory models across all Category rate cards (Cat A, B, C, D, F/E)
 * and dynamically synchronizes any custom model codes created or used in Quotations.
 */

import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import {
  DoorModelOption,
  STANDARD_DOOR_MODELS,
  detectCategoryFromModelCode,
} from '../types/doorModelCatalog';

export * from '../types/doorModelCatalog';

function getCustomStorePath(): string {
  try {
    return getDataFilePath('door-models-store.json');
  } catch {
    return path.join(process.cwd(), 'data', 'door-models-store.json');
  }
}

function readCustomStore(): DoorModelOption[] {
  try {
    const file = getCustomStorePath();
    if (fs.existsSync(/*turbopackIgnore: true*/ file)) {
      const parsed = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveCustomDoorModel(model: Partial<DoorModelOption>): DoorModelOption {
  const code = (model.code || '').trim().toUpperCase();
  if (!code) throw new Error('Model code is required');

  const cat = model.category || detectCategoryFromModelCode(code);
  const fullModel: DoorModelOption = {
    code,
    name: model.name || code,
    category: cat,
    categoryLabel: `Category ${cat.replace('CAT_', '')}`,
    defaultPrice: Number(model.defaultPrice) || (cat === 'CAT_B' ? 7600 : cat === 'CAT_C' ? 8400 : cat === 'CAT_D' ? 9000 : cat === 'CAT_F' ? 9500 : 6800),
    description: model.description || 'Custom factory door model',
    isCustom: true,
  };

  const current = readCustomStore();
  const existingIdx = current.findIndex((m) => m.code.toUpperCase() === code);
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...fullModel };
  } else {
    current.push(fullModel);
  }

  try {
    const file = getCustomStorePath();
    fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
    fs.writeFileSync(/*turbopackIgnore: true*/ file, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.warn('[DoorModelCatalog] Failed to persist custom model:', err);
  }

  return fullModel;
}

/**
 * Returns all available models, combining standard models with persisted custom models
 * and any models dynamically discovered from saved Quotations.
 */
export function getAllAvailableDoorModels(): DoorModelOption[] {
  const modelMap = new Map<string, DoorModelOption>();

  // 1. Seed standard models
  for (const m of STANDARD_DOOR_MODELS) {
    modelMap.set(m.code.toUpperCase(), m);
  }

  // 2. Load persisted custom models from door-models-store.json
  const customModels = readCustomStore();
  for (const cm of customModels) {
    modelMap.set(cm.code.toUpperCase(), cm);
  }

  // 3. Discover custom models from saved quotations (Server-side safe)
  try {
    if (typeof window === 'undefined') {
      const { listQuotations } = require('./quotationService');
      const quotes = listQuotations();
      for (const q of quotes) {
        if (Array.isArray(q.items)) {
          for (const item of q.items) {
            const code = (item.doorModel || '').trim();
            if (code && !modelMap.has(code.toUpperCase())) {
              const cat = detectCategoryFromModelCode(code);
              modelMap.set(code.toUpperCase(), {
                code,
                name: code,
                category: cat,
                categoryLabel: `Category ${cat.replace('CAT_', '')}`,
                defaultPrice: item.unitPrice || 6800,
                description: `Quotation model (${q.quoteNumber || q.id})`,
                isCustom: true,
              });
            }
          }
        }
        if (Array.isArray(q.itemRows)) {
          for (const row of q.itemRows) {
            const code = (row.modelCode || row.modelTitle || '').trim();
            if (code && !modelMap.has(code.toUpperCase())) {
              const cat = detectCategoryFromModelCode(code);
              modelMap.set(code.toUpperCase(), {
                code,
                name: code,
                category: cat,
                categoryLabel: `Category ${cat.replace('CAT_', '')}`,
                defaultPrice: row.rate || 6800,
                description: `Quotation row model (${q.quoteNumber || q.id})`,
                isCustom: true,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal if quotation file is not readable
  }

  return Array.from(modelMap.values());
}
