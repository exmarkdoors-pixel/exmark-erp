/**
 * EXMARK ERP — Central Door Model Registry & Quotation Synchronization Service
 * 
 * Aggregates standard factory models across all Category rate cards (Cat A, B, C, D, F/E)
 * and dynamically synchronizes any custom model codes created or used in Quotations.
 */

import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';

export interface DoorModelOption {
  code: string;
  name: string;
  category: 'CAT_A' | 'CAT_B' | 'CAT_C' | 'CAT_D' | 'CAT_F';
  categoryLabel: string;
  defaultPrice: number;
  description: string;
  isCustom?: boolean;
}

export const STANDARD_DOOR_MODELS: DoorModelOption[] = [
  // Category A (Standard FRP Plain / Linear) — ₹6,800
  { code: 'EXM-A-101', name: 'Classic Single Panel Plain', category: 'CAT_A', categoryLabel: 'Category A', defaultPrice: 6800, description: 'Standard FRP Flush with perimeter PVC reinforcement' },
  { code: 'EXM-A-102', name: 'Twin Line Contemporary', category: 'CAT_A', categoryLabel: 'Category A', defaultPrice: 6800, description: 'Dual vertical micro-recessed groove' },
  { code: 'EXM-A-103', name: 'Horizontal Tri-Groove', category: 'CAT_A', categoryLabel: 'Category A', defaultPrice: 6800, description: 'Triple horizontal clean routing' },
  { code: 'EXM-A-121', name: 'Contemporary Flush Embossed', category: 'CAT_A', categoryLabel: 'Category A', defaultPrice: 6800, description: 'Single leaf flush embossed door' },

  // Category B (Design / Woodgrain Embossed Series) — ₹7,600
  { code: 'EXM-B-201', name: 'Kerala Royal Teak Woodgrain', category: 'CAT_B', categoryLabel: 'Category B', defaultPrice: 7600, description: 'Deep woodgrain texture with Kerala traditional panel styling' },
  { code: 'EXM-B-202', name: 'Geometric 4-Panel Classic', category: 'CAT_B', categoryLabel: 'Category B', defaultPrice: 7600, description: 'Embossed quad-panel architectural layout' },
  { code: 'EXM-B-203', name: 'Arch Top Heritage Villa', category: 'CAT_B', categoryLabel: 'Category B', defaultPrice: 7600, description: 'Curved top Roman arch embossed panel' },

  // Category C (Mica Laminated Hybrid / Two-Tone) — ₹8,400
  { code: 'EXM-C-301', name: 'Matte Charcoal & Oak Dual Tone', category: 'CAT_C', categoryLabel: 'Category C', defaultPrice: 8400, description: '1.0mm Exterior laminate fused to FRP core' },
  { code: 'EXM-C-302', name: 'Rosewood Timber Texture', category: 'CAT_C', categoryLabel: 'Category C', defaultPrice: 8400, description: 'Mica lamination with realistic rosewood grain' },

  // Category D (Deep Routed CNC Grooved) — ₹9,000
  { code: 'EXM-D-401', name: 'Diamond Lattice CNC Carved', category: 'CAT_D', categoryLabel: 'Category D', defaultPrice: 9000, description: 'Precision 3D CNC diamond pattern routing' },
  { code: 'EXM-D-402', name: 'Chevrons Art Deco Wave', category: 'CAT_D', categoryLabel: 'Category D', defaultPrice: 9000, description: 'Modern V-groove chevron wave routing' },

  // Category F / E (Heavy Duty Architectural & Metal Inlay) — ₹9,500
  { code: 'EXM-F-501', name: 'Brass Inlay Luxury Villa', category: 'CAT_F', categoryLabel: 'Category F', defaultPrice: 9500, description: 'Solid metallic gold/brass strip inlay' },
  { code: 'EXM-F-502', name: 'Heavy Acoustical Core Security', category: 'CAT_F', categoryLabel: 'Category F', defaultPrice: 9500, description: 'Reinforced high-density composite acoustical core' },
];

/**
 * Detects Category ('CAT_A' .. 'CAT_F') from model code prefix
 */
export function detectCategoryFromModelCode(code: string): 'CAT_A' | 'CAT_B' | 'CAT_C' | 'CAT_D' | 'CAT_F' {
  const upper = (code || '').toUpperCase().trim();
  if (upper.includes('-B-') || upper.startsWith('B-') || upper.includes('CAT_B') || upper.includes('CAT-B') || upper.startsWith('EXM-B')) return 'CAT_B';
  if (upper.includes('-C-') || upper.startsWith('C-') || upper.includes('CAT_C') || upper.includes('CAT-C') || upper.startsWith('EXM-C')) return 'CAT_C';
  if (upper.includes('-D-') || upper.startsWith('D-') || upper.includes('CAT_D') || upper.includes('CAT-D') || upper.startsWith('EXM-D')) return 'CAT_D';
  if (upper.includes('-F-') || upper.startsWith('F-') || upper.includes('-E-') || upper.includes('CAT_F') || upper.includes('CAT_E') || upper.startsWith('EXM-F')) return 'CAT_F';
  return 'CAT_A';
}

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
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
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
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(current, null, 2), 'utf8');
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
