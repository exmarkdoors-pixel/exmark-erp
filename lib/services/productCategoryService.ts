import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import { ProductCategoryConfig } from '@/types/categories';

export type { ProductCategoryConfig };

const CATEGORIES_STORE_PATH = path.join(process.cwd(), 'data', 'product-categories.json');

// Default initial state: FRP is Primary and Enabled; WPC is Optional and Disabled by default
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategoryConfig[] = [
  {
    id: 'cat-frp-01',
    code: 'FRP',
    name: 'FRP Architectural Doors',
    enabled: true,
    isPrimary: true,
    description: 'High-density fiber reinforced polymer doors with 100% water resistance, teak mold texture, CNC carving, and PU coating. Standard for Kerala residential, commercial & coastal installations.',
    fields: [
      'Core Density (kg/m3)',
      'Resin PU Matrix',
      'FRP Skin Thickness (mm)',
      'CNC Carved Motifs',
      'Hinge Handing (LH/RH)',
      'Lock Hardware Model',
      'Waterproof Guarantee Years',
    ],
    pricing: {
      baseRateSqFt: 185,
      standardGstPercent: 18,
      hsnCode: '3925.20.00',
      minimumOrderSqFt: 18,
    },
    production: {
      lineCode: 'FRP-LINE-01',
      lineName: 'High-Pressure Hydraulic Hot Press & CNC Line',
      cycleTimeMinutes: 45,
      defaultTemperatureC: 65,
      qcCheckpoints: [
        'Resin Gel & Cure Level Verification',
        'Caliper Skin Thickness Gauge',
        'Diagonal Plumb & 4-Corner Squareness',
        'Water Immersion Sealing Check',
        'CNC Carving Edge Smoothness',
      ],
    },
    reportingVisibility: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-wpc-02',
    code: 'WPC',
    name: 'WPC Composite Doors & Extruded Frames',
    enabled: false, // DISABLED BY DEFAULT as required by Section 1
    isPrimary: false,
    description: 'Wood plastic composite solid extrusion doors and rebated frames. Optional line disabled by default.',
    fields: [
      'Wall Rebate Depth (mm)',
      'Core Density (gm/cm3)',
      'Screw Holding Capacity (N)',
      'Extrusion Chamber Profile',
    ],
    pricing: {
      baseRateSqFt: 145,
      standardGstPercent: 18,
      hsnCode: '3918.90.00',
      minimumOrderSqFt: 15,
    },
    production: {
      lineCode: 'WPC-EXTRUDE-02',
      lineName: 'Twin-Screw Extrusion & Calibration Line',
      cycleTimeMinutes: 30,
      defaultTemperatureC: 175,
      qcCheckpoints: [
        'Profile Straightness & Warpage',
        'Rebate Dimension Tolerance',
        'Screw Torque Withdrawal Test',
      ],
    },
    reportingVisibility: false, // Hidden when disabled
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Ensure the local JSON store exists
 */
function ensureCategoryStore(): ProductCategoryConfig[] {
  try {
    const dir = path.dirname(CATEGORIES_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(CATEGORIES_STORE_PATH)) {
      fs.writeFileSync(CATEGORIES_STORE_PATH, JSON.stringify(DEFAULT_PRODUCT_CATEGORIES, null, 2), 'utf8');
      return DEFAULT_PRODUCT_CATEGORIES;
    }

    const raw = fs.readFileSync(CATEGORIES_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[ProductCategoryService] Error accessing store file, using in-memory defaults:', err);
  }
  return DEFAULT_PRODUCT_CATEGORIES;
}

/**
 * Persist categories to local store file
 */
function persistCategoriesToFile(categories: ProductCategoryConfig[]) {
  try {
    const dir = path.dirname(CATEGORIES_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CATEGORIES_STORE_PATH, JSON.stringify(categories, null, 2), 'utf8');
  } catch (err) {
    console.error('[ProductCategoryService] Failed to write to store file:', err);
  }
}

let isDbOffline = false;

/**
 * Get all product categories
 */
export async function getProductCategories(): Promise<ProductCategoryConfig[]> {
  if (!isDbOffline && process.env.DATABASE_URL) {
    try {
      const records = await prisma.productCategory.findMany({
        orderBy: { isPrimary: 'desc' },
      });

      if (records && records.length > 0) {
        return records.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          enabled: r.enabled,
          isPrimary: r.isPrimary,
          description: r.description || '',
          fields: r.fieldsConfig ? JSON.parse(r.fieldsConfig) : [],
          pricing: r.pricingConfig ? JSON.parse(r.pricingConfig) : { baseRateSqFt: 185, standardGstPercent: 18, hsnCode: '3925.20.00' },
          production: r.productionConfig ? JSON.parse(r.productionConfig) : { lineCode: 'FRP-01', lineName: 'FRP Line', cycleTimeMinutes: 45, qcCheckpoints: [] },
          reportingVisibility: r.reportingVisibility,
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      isDbOffline = true;
    }
  }

  return ensureCategoryStore();
}

/**
 * Check if WPC is enabled
 */
export async function isWpcEnabled(): Promise<boolean> {
  const categories = await getProductCategories();
  const wpc = categories.find((c) => c.code === 'WPC');
  return Boolean(wpc?.enabled);
}

/**
 * Toggle category enabled / disabled
 */
export async function toggleCategoryEnabled(code: string, enabled: boolean): Promise<ProductCategoryConfig> {
  const categories = ensureCategoryStore();
  const index = categories.findIndex((c) => c.code.toUpperCase() === code.toUpperCase());

  if (index === -1) {
    throw new Error(`Product category with code "${code}" not found.`);
  }

  if (categories[index].isPrimary && !enabled) {
    throw new Error(`Primary product category "${categories[index].name}" cannot be disabled.`);
  }

  const updated: ProductCategoryConfig = {
    ...categories[index],
    enabled,
    reportingVisibility: enabled,
    updatedAt: new Date().toISOString(),
  };

  categories[index] = updated;
  persistCategoriesToFile(categories);

  // Sync to database if available
  try {
    if (process.env.DATABASE_URL) {
      await prisma.productCategory.upsert({
        where: { code: updated.code },
        update: {
          enabled: updated.enabled,
          reportingVisibility: updated.reportingVisibility,
        },
        create: {
          id: updated.id,
          code: updated.code,
          name: updated.name,
          enabled: updated.enabled,
          isPrimary: updated.isPrimary,
          description: updated.description,
          fieldsConfig: JSON.stringify(updated.fields),
          pricingConfig: JSON.stringify(updated.pricing),
          productionConfig: JSON.stringify(updated.production),
          reportingVisibility: updated.reportingVisibility,
        },
      });

      await logAuditEvent({
        action: 'UPDATE',
        entityType: 'ORDER',
        entityId: updated.id,
        details: { categoryCode: updated.code, enabled: updated.enabled },
      });
    }
  } catch {
    // DB sync deferred
  }

  return updated;
}

/**
 * Add a new custom product category
 */
export async function addProductCategory(input: Omit<ProductCategoryConfig, 'id' | 'updatedAt' | 'isPrimary'>): Promise<ProductCategoryConfig> {
  const categories = ensureCategoryStore();
  const code = input.code.toUpperCase().trim();

  if (categories.some((c) => c.code.toUpperCase() === code)) {
    throw new Error(`Product category code "${code}" already exists.`);
  }

  const newCategory: ProductCategoryConfig = {
    ...input,
    id: `cat-${code.toLowerCase()}-${Date.now()}`,
    code,
    isPrimary: false,
    updatedAt: new Date().toISOString(),
  };

  const updatedList = [...categories, newCategory];
  persistCategoriesToFile(updatedList);

  try {
    if (process.env.DATABASE_URL) {
      await prisma.productCategory.create({
        data: {
          id: newCategory.id,
          code: newCategory.code,
          name: newCategory.name,
          enabled: newCategory.enabled,
          isPrimary: false,
          description: newCategory.description,
          fieldsConfig: JSON.stringify(newCategory.fields),
          pricingConfig: JSON.stringify(newCategory.pricing),
          productionConfig: JSON.stringify(newCategory.production),
          reportingVisibility: newCategory.reportingVisibility,
        },
      });
    }
  } catch {
    // DB sync deferred
  }

  return newCategory;
}

/**
 * Update full category details (pricing, production, fields)
 */
export async function updateProductCategory(code: string, updates: Partial<ProductCategoryConfig>): Promise<ProductCategoryConfig> {
  const categories = ensureCategoryStore();
  const index = categories.findIndex((c) => c.code.toUpperCase() === code.toUpperCase());

  if (index === -1) {
    throw new Error(`Category "${code}" not found.`);
  }

  const updated: ProductCategoryConfig = {
    ...categories[index],
    ...updates,
    id: categories[index].id,
    code: categories[index].code,
    isPrimary: categories[index].isPrimary,
    updatedAt: new Date().toISOString(),
  };

  categories[index] = updated;
  persistCategoriesToFile(categories);

  try {
    if (process.env.DATABASE_URL) {
      await prisma.productCategory.update({
        where: { code: updated.code },
        data: {
          name: updated.name,
          enabled: updated.enabled,
          description: updated.description,
          fieldsConfig: JSON.stringify(updated.fields),
          pricingConfig: JSON.stringify(updated.pricing),
          productionConfig: JSON.stringify(updated.production),
          reportingVisibility: updated.reportingVisibility,
        },
      });
    }
  } catch {
    // DB sync deferred
  }

  return updated;
}
