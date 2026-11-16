import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { ERP_ROLES, UserRole } from './roles';

export interface StoredRbacPolicy {
  roles: Record<string, string[]>;
  updatedAt: string;
  updatedBy?: string;
}

const RBAC_STORE_FILE = 'rbac-roles.json';

function getRbacStorePath(): string {
  return getDataFilePath(RBAC_STORE_FILE);
}

/**
 * Returns default role -> allowedModules map derived from static ERP_ROLES.
 */
export function getDefaultRbacMap(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [role, cfg] of Object.entries(ERP_ROLES)) {
    out[role] = [...cfg.allowedModules];
  }
  return out;
}

/**
 * Loads persisted RBAC module permissions from EXMARK_DATA_DIR/rbac-roles.json,
 * initializing defaults cleanly when missing and enforcing baseline safety for Super Admin.
 */
export function getRbacPermissions(): StoredRbacPolicy {
  const defaults = getDefaultRbacMap();
  const storePath = getRbacStorePath();

  if (fs.existsSync(storePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8')) as Partial<StoredRbacPolicy>;
      if (parsed && parsed.roles && typeof parsed.roles === 'object') {
        const merged: Record<string, string[]> = { ...defaults };
        for (const roleKey of Object.keys(ERP_ROLES)) {
          if (Array.isArray(parsed.roles[roleKey])) {
            merged[roleKey] = Array.from(new Set(parsed.roles[roleKey].map(String)));
          }
        }
        // Super Admin must always retain core administration access so plant cannot lock itself out
        const saSet = new Set(merged['Super Admin'] || defaults['Super Admin']);
        saSet.add('dashboard');
        saSet.add('settings');
        saSet.add('employees');
        merged['Super Admin'] = Array.from(saSet);

        return {
          roles: merged,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          updatedBy: parsed.updatedBy,
        };
      }
    } catch {
      // Fall back to baseline defaults below
    }
  }

  return {
    roles: defaults,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resolves effective allowed modules for a user, honoring an explicit per-user
 * module override when present or falling back to persisted Role permissions.
 */
export function resolveEffectiveModules(
  roleName: UserRole | string,
  customAllowedModules?: string[] | null
): string[] {
  const policy = getRbacPermissions();
  const baseRoleModules = Array.isArray(policy.roles[roleName]) ? policy.roles[roleName] : [];
  const source = Array.isArray(customAllowedModules) ? customAllowedModules : baseRoleModules;
  const set = new Set(source.map((m) => String(m).trim()).filter(Boolean));
  set.add('dashboard');
  if (roleName === 'Super Admin') {
    set.add('settings');
    set.add('employees');
    set.add('measurements');
    set.add('quotations');
  }
  if (set.has('quotations')) {
    set.add('measurements');
  }
  return Array.from(set);
}

/**
 * Checks dynamic persisted module permission for a given role.
 */
export function canRoleAccessModuleDynamic(roleName: UserRole | string, moduleName: string): boolean {
  const policy = getRbacPermissions();
  const allowed = policy.roles[roleName];
  if (!Array.isArray(allowed)) return false;
  return allowed.includes(moduleName);
}

/**
 * Checks whether a specific user (role + optional per-user module override) may access a module.
 */
export function canUserAccessModule(
  roleName: UserRole | string,
  moduleName: string,
  customAllowedModules?: string[] | null
): boolean {
  return resolveEffectiveModules(roleName, customAllowedModules).includes(moduleName);
}

/**
 * Persists custom role -> module permission matrix to EXMARK_DATA_DIR/rbac-roles.json.
 */
export function saveRbacPermissions(
  rolesInput: Record<string, string[]>,
  updatedBy?: string
): StoredRbacPolicy {
  const defaults = getDefaultRbacMap();
  const nextRoles: Record<string, string[]> = { ...defaults };

  for (const roleKey of Object.keys(ERP_ROLES)) {
    const incoming = rolesInput[roleKey];
    if (Array.isArray(incoming)) {
      nextRoles[roleKey] = Array.from(new Set(incoming.map((m) => String(m).trim()).filter(Boolean)));
    }
  }

  // Always protect Super Admin lockout recovery routes
  const saSet = new Set(nextRoles['Super Admin'] || defaults['Super Admin']);
  saSet.add('dashboard');
  saSet.add('settings');
  saSet.add('employees');
  nextRoles['Super Admin'] = Array.from(saSet);

  const saved: StoredRbacPolicy = {
    roles: nextRoles,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || 'Super Admin',
  };

  const storePath = getRbacStorePath();
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${storePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(saved, null, 2), 'utf8');
  fs.renameSync(tmpPath, storePath);

  return saved;
}
