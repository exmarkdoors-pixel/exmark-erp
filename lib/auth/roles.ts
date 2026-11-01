export type UserRole =
  | 'Super Admin'
  | 'Management'
  | 'Sales'
  | 'Accounts'
  | 'Production'
  | 'Inventory'
  | 'Purchase'
  | 'HR'
  | 'Installation'
  | 'Plant Supervisor'
  | 'Site Engineer'
  | 'QC Inspector';

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
      'sales',
      'production',
      'bom',
      'quality',
      'maintenance',
      'job-work',
      'batch-print',
      'inventory',
      'purchases',
      'gate-pass',
      'dispatch',
      'installation',
      'accounts',
      'employees',
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
      'sales',
      'production',
      'bom',
      'quality',
      'maintenance',
      'job-work',
      'batch-print',
      'inventory',
      'purchases',
      'gate-pass',
      'dispatch',
      'installation',
      'accounts',
      'employees',
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
      'sales',
      'batch-print',
      'dispatch',
      'installation',
      'gate-pass',
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
      'sales',
      'purchases',
      'job-work',
      'gate-pass',
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
      'sales',
      'production',
      'bom',
      'quality',
      'maintenance',
      'job-work',
      'batch-print',
      'inventory',
      'gate-pass',
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
      'bom',
      'quality',
      'inventory',
      'purchases',
      'gate-pass',
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
      'job-work',
      'gate-pass',
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
      'sales',
      'installation',
      'gate-pass',
      'dispatch',
    ],
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
  'Plant Supervisor': {
    name: 'Plant Supervisor',
    description: 'Plant Floor Operations, Hydraulic Press release, BOM Store issue, and 12L Sticker Batch Print.',
    allowedModules: [
      'dashboard',
      'measurements',
      'sales-orders',
      'production',
      'bom',
      'quality',
      'maintenance',
      'job-work',
      'batch-print',
      'inventory',
      'reports',
    ],
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  'Site Engineer': {
    name: 'Site Engineer',
    description: 'Site Opening Measurements, Masonry tolerances, Quotations, and Door Measurement Book.',
    allowedModules: [
      'dashboard',
      'crm',
      'quotations',
      'measurements',
      'sales-orders',
      'installation',
      'reports',
    ],
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  'QC Inspector': {
    name: 'QC Inspector',
    description: 'IS 14856:2000 Quality Inspection, Shop-floor Tick Sheets, and QC Certification.',
    allowedModules: [
      'dashboard',
      'measurements',
      'production',
      'quality',
      'batch-print',
      'reports',
    ],
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
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
