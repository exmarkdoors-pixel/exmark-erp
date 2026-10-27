export type UserRole =
  | 'Super Admin'
  | 'Management'
  | 'Sales'
  | 'Accounts'
  | 'Production'
  | 'Inventory'
  | 'Purchase'
  | 'HR'
  | 'Installation';

export interface RoleConfig {
  name: UserRole;
  description: string;
  allowedModules: string[];
  badgeColor: string;
}

export const ERP_ROLES: Record<UserRole, RoleConfig> = {
  'Super Admin': {
    name: 'Super Admin',
    description: 'Unrestricted enterprise control, user security, audit logs, and plant configuration.',
    allowedModules: [
      'dashboard',
      'customers',
      'crm',
      'quotations',
      'measurements',
      'sales-orders',
      'production',
      'inventory',
      'purchases',
      'accounts',
      'employees',
      'dispatch',
      'marketing',
      'reports',
      'settings',
    ],
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  Management: {
    name: 'Management',
    description: 'Executive plant oversight, sales reports, financial metrics, and operational approvals.',
    allowedModules: [
      'dashboard',
      'customers',
      'crm',
      'quotations',
      'sales-orders',
      'production',
      'inventory',
      'purchases',
      'accounts',
      'employees',
      'dispatch',
      'reports',
    ],
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  Sales: {
    name: 'Sales',
    description: 'Dealer relations, builder inquiries, door quotations, site orders, and lead tracking.',
    allowedModules: [
      'dashboard',
      'customers',
      'crm',
      'quotations',
      'measurements',
      'sales-orders',
      'dispatch',
      'marketing',
      'reports',
    ],
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  Accounts: {
    name: 'Accounts',
    description: 'GST compliance (HSN 3925), e-Way bills, invoicing, dealer payment ledgers, and receivables.',
    allowedModules: [
      'dashboard',
      'customers',
      'quotations',
      'sales-orders',
      'purchases',
      'accounts',
      'reports',
    ],
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  Production: {
    name: 'Production',
    description: 'FRP hydraulic molding, WPC extrusion calibration, CNC carving, PU coating, and QA inspection.',
    allowedModules: [
      'dashboard',
      'measurements',
      'sales-orders',
      'production',
      'inventory',
      'dispatch',
    ],
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  Inventory: {
    name: 'Inventory',
    description: 'Resin silos, fiberglass rolls, WPC granules, locks, hinges, and warehouse bay control.',
    allowedModules: [
      'dashboard',
      'production',
      'inventory',
      'purchases',
      'dispatch',
    ],
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  Purchase: {
    name: 'Purchase',
    description: 'Procurement of raw chemical materials, polymer suppliers, vendor POs, and goods receipts.',
    allowedModules: [
      'dashboard',
      'inventory',
      'purchases',
      'accounts',
      'reports',
    ],
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  HR: {
    name: 'HR',
    description: 'Factory technician shift rosters, field engineers, employee records, and payroll attendance.',
    allowedModules: [
      'dashboard',
      'employees',
      'reports',
      'settings',
    ],
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  Installation: {
    name: 'Installation',
    description: 'Site door measurements, rebate depth checks, delivery fleet logistics, and client sign-off.',
    allowedModules: [
      'dashboard',
      'customers',
      'measurements',
      'sales-orders',
      'dispatch',
    ],
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
};

/**
 * Checks if a given role is allowed access to a specific navigation tab/module.
 */
export function canAccessModule(roleName: UserRole | string, moduleName: string): boolean {
  const roleConfig = ERP_ROLES[roleName as UserRole];
  if (!roleConfig) return false;
  return roleConfig.allowedModules.includes(moduleName);
}

/**
 * Checks if a user's role matches any of the allowed roles.
 */
export function hasRole(userRole: UserRole | string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}
