import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { getBackupDir, getDataDir, getDataFilePath, writeJsonSafe } from '../utils/dataPaths';
import { createBackupSnapshot } from './backupService';
import { DEFAULT_RATE_CARD } from './contractorService';
import { DEFAULT_ERP_CONFIG } from './customizationService';
import { resetDayBookTransactionalData } from './daybookImportService';
import { isPostgresAvailable } from './dbSyncEngine';

export interface FactoryResetOptions {
  cleanTestBackups?: boolean;
  resetEmployees?: boolean;
  inventoryZeroMode?: 'keep-zero' | 'clear';
  createPreResetBackup?: boolean;
}

export interface FactoryResetResult {
  success: boolean;
  dataDir: string;
  backupDir: string;
  preResetBackupId: string | null;
  wipedStores: string[];
  preservedStores: string[];
  removedTestBackups: number;
  postgresCleared: boolean;
  timestamp: string;
}

const TRANSACTION_ARRAY_STORES = [
  'customers-store.json',
  'leads-store.json',
  'quotations-store.json',
  'measurements-store.json',
  'production-store.json',
  'boq-store.json',
  'boq-extra-items.json',
  'purchases-store.json',
  'order-expenses-store.json',
  'whatsapp-store.json',
  'db-outbox-sync.json',
];

const PRESERVED_CONFIG_STORES = [
  'boq-material-rates.json',
  'pricing-rate-card.json',
  'custom-frames-store.json',
  'custom-tolerances-store.json',
  'fixed-overheads-store.json',
  'product-categories.json',
  'catalog-store.json',
  'users-store.json',
  'auth-config.json',
  'rbac-roles.json',
  'schema-version.json',
  'cloud-sync-state.json',
];

function writeJsonFile(filePath: string, data: unknown): void {
  writeJsonSafe(filePath, data);
}

function resetInventoryStore(mode: 'keep-zero' | 'clear'): void {
  const inventoryPath = getDataFilePath('inventory-store.json');
  if (mode === 'clear') {
    writeJsonFile(inventoryPath, []);
    return;
  }

  try {
    if (fs.existsSync(inventoryPath)) {
      const parsed = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
      if (Array.isArray(parsed)) {
        const now = new Date().toISOString();
        const zeroed = parsed.map((item) => ({
          ...item,
          currentStock: 0,
          status: 'LOW_STOCK',
          updatedAt: now,
        }));
        writeJsonFile(inventoryPath, zeroed);
        return;
      }
    }
  } catch {
    // Fall back to empty array if existing file cannot be parsed
  }
  writeJsonFile(inventoryPath, []);
}

function resetContractorsStore(): void {
  const storePath = getDataFilePath('contractors-store.json');
  let preservedRateCard = DEFAULT_RATE_CARD;
  try {
    if (fs.existsSync(storePath)) {
      const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (parsed?.rateCard && typeof parsed.rateCard === 'object') {
        preservedRateCard = { ...DEFAULT_RATE_CARD, ...parsed.rateCard };
      }
    }
  } catch {
    preservedRateCard = DEFAULT_RATE_CARD;
  }

  writeJsonFile(storePath, {
    contractors: [],
    rateCard: preservedRateCard,
    workRecords: [],
    payouts: [],
  });
}

function compactCustomizationRevisions(): void {
  const storePath = getDataFilePath('customization-store.json');
  let active = DEFAULT_ERP_CONFIG;
  let draft = DEFAULT_ERP_CONFIG;

  try {
    if (fs.existsSync(storePath)) {
      const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (parsed?.active) active = parsed.active;
      if (parsed?.draft) draft = parsed.draft;
    }
  } catch {
    // Keep defaults if unreadable
  }

  const now = new Date().toISOString();
  writeJsonFile(storePath, {
    active,
    draft,
    revisions: [
      {
        id: 'rev-factory-baseline-v1',
        version: 1,
        publishedAt: now,
        publishedBy: 'Factory Clean Start',
        changelog: 'Clean factory baseline v1.0 preserving company profile, pricing rules, and templates.',
        configSnapshot: active,
      },
    ],
  });
}

function cleanupOldTestBackups(preserveBackupId: string | null): number {
  let removed = 0;
  const dirs = [getBackupDir(), path.join(getDataDir(), 'backups')];
  if (!process.env.EXMARK_DATA_DIR?.trim() && !process.env.EXMARK_BACKUP_DIR?.trim()) {
    dirs.push(path.join(process.cwd(), 'backups'), path.join(process.cwd(), 'data', 'backups'));
  }
  const candidateDirs = Array.from(new Set(dirs));

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const entry of fs.readdirSync(dir)) {
        if (!entry.startsWith('EXM-BAK-')) continue;
        if (preserveBackupId && entry === preserveBackupId) continue;
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          removed += 1;
        }
      }
    } catch (err) {
      console.warn(`[FactoryReset] Warning cleaning backup dir ${dir}:`, err);
    }
  }

  return removed;
}

async function clearPostgresTransactions(): Promise<boolean> {
  const online = await isPostgresAvailable();
  if (!online) return false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({});
      await tx.dispatch.deleteMany({});
      await tx.invoice.deleteMany({});
      await tx.installation.deleteMany({});
      await tx.boqItem.deleteMany({});
      await tx.boqMaster.deleteMany({});
      await tx.doorMeasurementItem.deleteMany({});
      await tx.doorMeasurement.deleteMany({});
      await tx.productionOrder.deleteMany({});
      await tx.salesOrder.deleteMany({});
      await tx.quotationItem.deleteMany({});
      await tx.quotation.deleteMany({});
      await tx.purchaseItem.deleteMany({});
      await tx.purchase.deleteMany({});
      await tx.financialTarget.deleteMany({});
      await tx.whatsAppMessage.deleteMany({});
      await tx.auditLog.deleteMany({});
      await tx.lead.deleteMany({});
      await tx.customer.deleteMany({});
    });
    return true;
  } catch (err) {
    console.warn('[FactoryReset] PostgreSQL transaction clear skipped/failed:', err);
    return false;
  }
}

/**
 * Wipe all transactional data stores cleanly for a fresh factory start while preserving
 * calibrated BOQ material formulas, Lock Box kits, FRP rate card, frames, tolerances, and company profile.
 */
export async function resetAllModulesToZero(
  options: FactoryResetOptions = {}
): Promise<FactoryResetResult> {
  const {
    cleanTestBackups = true,
    resetEmployees = true,
    inventoryZeroMode = 'keep-zero',
    createPreResetBackup = true,
  } = options;

  let preResetBackupId: string | null = null;
  if (createPreResetBackup) {
    try {
      const snap = await createBackupSnapshot('PRE_RESET');
      preResetBackupId = snap.backupId;
    } catch (err) {
      console.warn('[FactoryReset] Pre-reset backup creation warning:', err);
    }
  }

  const wipedStores: string[] = [];

  for (const filename of TRANSACTION_ARRAY_STORES) {
    writeJsonFile(getDataFilePath(filename), []);
    wipedStores.push(filename);
  }

  if (resetEmployees) {
    writeJsonFile(getDataFilePath('employees-store.json'), []);
    wipedStores.push('employees-store.json');
  }

  writeJsonFile(getDataFilePath('boq-lock-readiness.json'), {});
  wipedStores.push('boq-lock-readiness.json');

  writeJsonFile(getDataFilePath('finance-store.json'), {
    invoices: [],
    payments: [],
    targets: [],
  });
  wipedStores.push('finance-store.json');

  writeJsonFile(getDataFilePath('fulfillment-store.json'), {
    dispatches: [],
    installations: [],
    warranties: [],
  });
  wipedStores.push('fulfillment-store.json');

  writeJsonFile(getDataFilePath('concurrency-store.json'), { versions: [] });
  wipedStores.push('concurrency-store.json');

  writeJsonFile(getDataFilePath('whatsapp-session.json'), {
    status: 'DISCONNECTED',
    connectedPhone: null,
  });
  wipedStores.push('whatsapp-session.json');

  resetContractorsStore();
  wipedStores.push('contractors-store.json (contractors cleared, rateCard preserved)');

  resetDayBookTransactionalData();
  wipedStores.push('daybook-imports-store.json (batches/entries cleared, customRules preserved)');

  resetInventoryStore(inventoryZeroMode);
  wipedStores.push(
    inventoryZeroMode === 'clear'
      ? 'inventory-store.json (cleared)'
      : 'inventory-store.json (stock set to 0)'
  );

  compactCustomizationRevisions();
  wipedStores.push('customization-store.json (revisions compacted to Baseline v1.0)');

  const removedTestBackups = cleanTestBackups
    ? cleanupOldTestBackups(preResetBackupId)
    : 0;

  const postgresCleared = await clearPostgresTransactions();

  return {
    success: true,
    dataDir: getDataDir(),
    backupDir: getBackupDir(),
    preResetBackupId,
    wipedStores,
    preservedStores: PRESERVED_CONFIG_STORES,
    removedTestBackups,
    postgresCleared,
    timestamp: new Date().toISOString(),
  };
}
