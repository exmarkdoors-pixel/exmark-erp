import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { ALL_ERP_MODULES, ERP_ROLES, UserRole } from './roles';

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
        // Super Admin ALWAYS retains unrestricted access to EVERY ERP module (Financial, Accounts, Mobile Field, Evening Close, Settings, etc.)
        const saSet = new Set([...ALL_ERP_MODULES, ...(merged['Super Admin'] || [])]);
        merged['Super Admin'] = Array.from(saSet);

        // Roles with 'accounts' automatically include 'finance' and 'daily-closing' for Evening Close compatibility
        for (const roleKey of Object.keys(merged)) {
          if (merged[roleKey].includes('accounts')) {
            const roleSet = new Set(merged[roleKey]);
            roleSet.add('finance');
            roleSet.add('daily-closing');
            merged[roleKey] = Array.from(roleSet);
          }
        }

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
 * Super Admin ALWAYS receives every module unconditionally.
 */
export function resolveEffectiveModules(
  roleName: UserRole | string,
  customAllowedModules?: string[] | null
): string[] {
  if (roleName === 'Super Admin') {
    const policy = getRbacPermissions();
    const extra = Array.isArray(policy.roles['Super Admin']) ? policy.roles['Super Admin'] : [];
    const custom = Array.isArray(customAllowedModules) ? customAllowedModules : [];
    return Array.from(new Set([...ALL_ERP_MODULES, ...extra, ...custom]));
  }
  const policy = getRbacPermissions();
  const baseRoleModules = Array.isArray(policy.roles[roleName]) ? policy.roles[roleName] : [];
  const source = Array.isArray(customAllowedModules) ? customAllowedModules : baseRoleModules;
  const set = new Set(source.map((m) => String(m).trim()).filter(Boolean));
  set.add('dashboard');
  if (set.has('quotations')) {
    set.add('measurements');
  }
  if (set.has('accounts')) {
    set.add('finance');
    set.add('daily-closing');
  }
  return Array.from(set);
}

/**
 * Checks dynamic persisted module permission for a given role.
 */
export function canRoleAccessModuleDynamic(roleName: UserRole | string, moduleName: string): boolean {
  if (roleName === 'Super Admin') return true;
  const policy = getRbacPermissions();
  const allowed = policy.roles[roleName];
  if (!Array.isArray(allowed)) return false;
  if (moduleName === 'finance' || moduleName === 'daily-closing') {
    return allowed.includes(moduleName) || allowed.includes('accounts');
  }
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
  if (roleName === 'Super Admin') return true;
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

  // Always guarantee Super Admin has unrestricted access to every system module
  nextRoles['Super Admin'] = Array.from(new Set([...ALL_ERP_MODULES, ...(nextRoles['Super Admin'] || [])]));

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
