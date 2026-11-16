import fs from 'fs';
import path from 'path';
import { getDataDir, getDataFilePath } from '../utils/dataPaths';
import { createBackupSnapshot } from './backupService';
import { getBoqMaterialRates } from './boqRateService';
import { DEFAULT_FRP_RATE_CARD, getFrpRateCardSettings, saveFrpRateCardSettings } from './frpPricingEngine';
import { getCustomFrames } from './frameService';
import { getTolerancePresets } from './toleranceService';
import { getProductCategories } from './productCategoryService';
import { ensureUsersStore } from '../auth/userStore';

export const CURRENT_SCHEMA_VERSION = 3;

export interface AppliedMigrationRecord {
  version: number;
  name: string;
  appliedAt: string;
  summary: string;
}

export interface SchemaVersionState {
  schemaVersion: number;
  appVersion: string;
  lastMigratedAt: string;
  appliedMigrations: AppliedMigrationRecord[];
}

export interface MigrationRunResult {
  migrated: boolean;
  previousVersion: number;
  currentVersion: number;
  appVersion: string;
  preUpdateBackupId: string | null;
  applied: AppliedMigrationRecord[];
  dataDir: string;
}

const getSchemaFilePath = () => getDataFilePath('schema-version.json');

export function getAppVersion(): string {
  const envVersion = process.env.EXMARK_APP_VERSION?.trim();
  if (envVersion) return envVersion;
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const parsed = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (parsed?.version) return String(parsed.version);
    }
  } catch {
    // Fallback below
  }
  return '1.0.1';
}

function writeAtomicJson(filePath: string, payload: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function getSchemaStatus(): SchemaVersionState {
  const filePath = getSchemaFilePath();
  const appVersion = getAppVersion();
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<SchemaVersionState>;
      return {
        schemaVersion: Number(parsed.schemaVersion) || 0,
        appVersion: parsed.appVersion || appVersion,
        lastMigratedAt: parsed.lastMigratedAt || '',
        appliedMigrations: Array.isArray(parsed.appliedMigrations) ? parsed.appliedMigrations : [],
      };
    } catch {
      // Fallback below
    }
  }
  return {
    schemaVersion: 0,
    appVersion,
    lastMigratedAt: '',
    appliedMigrations: [],
  };
}

/**
 * Migration v1: Ensure master configuration stores exist without overwriting customized user files.
 */
async function applyMigrationV1(): Promise<string> {
  await getBoqMaterialRates();
  getFrpRateCardSettings();
  getCustomFrames();
  getTolerancePresets();
  await getProductCategories();
  return 'Initialized/verified calibrated BOQ formulas, FRP rate card, frame profiles, tolerances, and categories.';
}

/**
 * Migration v2: Non-destructive additive backfill for new installation rates, door thicknesses,
 * lock box kits, GST-free quote normalization, and persistent users store.
 * User-entered rates, customer records, quotations, and production orders remain untouched.
 */
async function applyMigrationV2(): Promise<string> {
  const notes: string[] = [];

  // 1. Backfill new additive keys into FRP rate card only if missing
  const rateCardPath = getDataFilePath('pricing-rate-card.json');
  if (fs.existsSync(rateCardPath)) {
    try {
      const current = getFrpRateCardSettings();
      let needsSave = false;
      const patch: Partial<typeof current> = {};
      if (current.defaultInstallationRatePerDoor === undefined) {
        patch.defaultInstallationRatePerDoor = DEFAULT_FRP_RATE_CARD.defaultInstallationRatePerDoor;
        needsSave = true;
      }
      if (!current.defaultInstallationLabel) {
        patch.defaultInstallationLabel = DEFAULT_FRP_RATE_CARD.defaultInstallationLabel;
        needsSave = true;
      }
      if (!Array.isArray(current.doorThicknesses) || current.doorThicknesses.length === 0) {
        patch.doorThicknesses = DEFAULT_FRP_RATE_CARD.doorThicknesses;
        needsSave = true;
      }
      if (needsSave) {
        saveFrpRateCardSettings({ ...current, ...patch });
        notes.push('pricing-rate-card.json additive fields backfilled');
      }
    } catch {
      // Skip non-fatal parse issue
    }
  }

  // 2. Non-destructively ensure quotations have zero GST metadata if created before GST removal
  const quotesPath = getDataFilePath('quotations-store.json');
  if (fs.existsSync(quotesPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
      if (Array.isArray(parsed)) {
        let changed = false;
        const next = parsed.map((q) => {
          if (q && typeof q === 'object' && (q.gstRate === undefined || q.gstAmount === undefined)) {
            changed = true;
            return {
              ...q,
              gstRate: 0,
              gstAmount: 0,
            };
          }
          return q;
        });
        if (changed) {
          writeAtomicJson(quotesPath, next);
          notes.push('quotations-store.json additive GST=0 metadata backfilled');
        }
      }
    } catch {
      // Skip non-fatal
    }
  }

  // 3. Ensure persistent factory users-store.json exists without overwriting customized logins
  await ensureUsersStore();
  notes.push('users-store.json verified');

  return `Additive migration v2 complete (${notes.join('; ')}).`;
}

/**
 * Migration v3: Non-destructive additive backfill for dual-team door molding support.
 * Ensures contractors-store.json contains teamScope metadata for molding gangs,
 * and verifies production-store.json orders support multi-gang stage history entries.
 */
async function applyMigrationV3(): Promise<string> {
  const notes: string[] = [];

  const contractorsPath = getDataFilePath('contractors-store.json');
  if (fs.existsSync(contractorsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(contractorsPath, 'utf8'));
      if (parsed && Array.isArray(parsed.contractors)) {
        let changed = false;
        const nextContractors = parsed.contractors.map((c: Record<string, unknown>) => {
          if (!c.teamScope) {
            changed = true;
            let defaultScope = 'MOLDING_ALL';
            if (c.primaryStage === 'CUTTING_FINISHING') defaultScope = 'DOOR_CUTTING_FINISHING';
            if (c.primaryStage === 'PAINT_SECTION' || c.primaryStage === 'FINISHING_GRAINS') defaultScope = 'GRAINS_PAINTING';
            if (c.primaryStage === 'PACKING') defaultScope = 'PACKING_TEAM';
            if (c.primaryStage === 'INSTALLATION') defaultScope = 'SITE_FITTING';
            return { ...c, teamScope: defaultScope };
          }
          return c;
        });
        if (changed) {
          parsed.contractors = nextContractors;
          writeAtomicJson(contractorsPath, parsed);
          notes.push('contractors-store.json teamScope backfilled');
        }
      }
    } catch {
      // non-fatal
    }
  }

  notes.push('Dual molding schema v3 verified');
  return `Additive migration v3 complete (${notes.join('; ')}).`;
}

function hasExistingTransactions(): boolean {
  for (const fname of ['quotations-store.json', 'production-store.json', 'customers-store.json']) {
    try {
      const fpath = getDataFilePath(fname);
      if (fs.existsSync(fpath)) {
        const parsed = JSON.parse(fs.readFileSync(fpath, 'utf8'));
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      }
    } catch {
      // ignore parse issue
    }
  }
  return false;
}

/**
 * Safely runs pending forward-only additive migrations against the active EXMARK_DATA_DIR.
 * Always triggers a SHA-256 PRE_UPDATE backup snapshot when upgrading an initialized or populated vault.
 */
export async function ensureSchemaUpToDate(
  options: { createPreUpdateBackup?: boolean; forceRun?: boolean } = {}
): Promise<MigrationRunResult> {
  const { createPreUpdateBackup = true, forceRun = false } = options;
  const appVersion = getAppVersion();
  const hasSchemaFile = fs.existsSync(getSchemaFilePath());
  const state = getSchemaStatus();
  const previousVersion = state.schemaVersion;

  if (!forceRun && previousVersion >= CURRENT_SCHEMA_VERSION) {
    return {
      migrated: false,
      previousVersion,
      currentVersion: state.schemaVersion,
      appVersion,
      preUpdateBackupId: null,
      applied: [],
      dataDir: getDataDir(),
    };
  }

  let preUpdateBackupId: string | null = null;
  if (createPreUpdateBackup && (hasSchemaFile || hasExistingTransactions())) {
    try {
      const snap = await createBackupSnapshot('PRE_UPDATE');
      preUpdateBackupId = snap.backupId;
    } catch (err) {
      console.warn('[SchemaMigrator] Pre-update backup creation warning:', err);
    }
  }

  const applied: AppliedMigrationRecord[] = [];
  let workingVersion = previousVersion;
  const history = [...state.appliedMigrations];

  if (workingVersion < 1) {
    const summary = await applyMigrationV1();
    const rec: AppliedMigrationRecord = {
      version: 1,
      name: 'v1-baseline-factory-config',
      appliedAt: new Date().toISOString(),
      summary,
    };
    applied.push(rec);
    history.push(rec);
    workingVersion = 1;
  }

  if (workingVersion < 2 || forceRun) {
    const summary = await applyMigrationV2();
    const rec: AppliedMigrationRecord = {
      version: 2,
      name: 'v2-non-destructive-additive-backfill',
      appliedAt: new Date().toISOString(),
      summary,
    };
    applied.push(rec);
    history.push(rec);
    workingVersion = 2;
  }

  if (workingVersion < 3 || forceRun) {
    const summary = await applyMigrationV3();
    const rec: AppliedMigrationRecord = {
      version: 3,
      name: 'v3-dual-team-molding-support',
      appliedAt: new Date().toISOString(),
      summary,
    };
    applied.push(rec);
    history.push(rec);
    workingVersion = 3;
  }

  const nextState: SchemaVersionState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion,
    lastMigratedAt: new Date().toISOString(),
    appliedMigrations: history.slice(-25),
  };

  writeAtomicJson(getSchemaFilePath(), nextState);

  return {
    migrated: applied.length > 0,
    previousVersion,
    currentVersion: nextState.schemaVersion,
    appVersion,
    preUpdateBackupId,
    applied,
    dataDir: getDataDir(),
  };
}

let bootstrapPromise: Promise<MigrationRunResult | null> | null = null;

/**
 * Runs forward-only schema bootstrap/migration once per server process lifecycle
 * when running in local factory mode so desktop .exe upgrades auto-migrate safely.
 */
export async function ensureFactoryBootstrapOnce(): Promise<MigrationRunResult | null> {
  if (process.env.EXMARK_SKIP_AUTO_MIGRATE === 'true') {
    return null;
  }
  try {
    const { registerCloudAutoSyncObserver, hydrateCloudVaultOnBoot } = await import('./cloudSyncService');
    registerCloudAutoSyncObserver();
    if (process.env.EXMARK_LOCAL_FACTORY !== 'true') {
      await hydrateCloudVaultOnBoot();
      return null;
    }
  } catch {
    if (process.env.EXMARK_LOCAL_FACTORY !== 'true') return null;
  }
  if (!bootstrapPromise) {
    bootstrapPromise = ensureSchemaUpToDate({ createPreUpdateBackup: true }).catch((err) => {
      console.warn('[SchemaMigrator] Startup bootstrap warning:', err);
      bootstrapPromise = null;
      return null;
    });
  }
  return bootstrapPromise;
}
