/**
 * EXMARK ERP — Operational Mobile Staff Types & Role Mappings
 * Safe for both Client Components and Server code (zero fs / path / Node-only dependencies).
 */

export type MobileStaffRole =
  | 'DRIVER'
  | 'FIELD_STAFF'
  | 'INSTALLER'
  | 'FLOOR'
  | 'STORE_KEEPER'
  | 'SALES_CRM'
  | 'MANAGER';

export interface OperationalStaffSpec {
  id: string;
  employeeCode: string;
  name: string;
  roleName: string;
  department: string;
  email: string;
  phone: string;
  mobileRole: MobileStaffRole;
  defaultPin: string;
  badgeColor: string;
  description: string;
}

export const OPERATIONAL_STAFF_SPECS: OperationalStaffSpec[] = [
  {
    id: 'usr-mobile-drv-01',
    employeeCode: 'DRV-01',
    name: 'Ratheesh Driver',
    roleName: 'Driver',
    department: 'Delivery Logistics & Fleet',
    email: 'driver@exmarkdoors.com',
    phone: '+91 94472 88123',
    mobileRole: 'DRIVER',
    defaultPin: '1111',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Vehicle Delivery Logistics, Route Map Navigation & Customer Sign-off',
  },
  {
    id: 'usr-mobile-fld-01',
    employeeCode: 'FLD-01',
    name: 'Anas Site Measurer',
    roleName: 'Site Engineer',
    department: 'Site Measurements & Architectural Survey',
    email: 'field@exmarkdoors.com',
    phone: '+91 97455 11987',
    mobileRole: 'FIELD_STAFF',
    defaultPin: '2222',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Site Door Measurement, Opening Schedules & Instant WhatsApp Quotations',
  },
  {
    id: 'usr-mobile-inst-01',
    employeeCode: 'INST-01',
    name: 'Jafar Installation Lead',
    roleName: 'Installation',
    department: 'Door Fitting & Site Installation',
    email: 'installer@exmarkdoors.com',
    phone: '+91 98950 44321',
    mobileRole: 'INSTALLER',
    defaultPin: '3333',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: '6-Point Door Fitting Checklist, Before/After Photos & Customer Handover',
  },
  {
    id: 'usr-mobile-flr-01',
    employeeCode: 'FLR-01',
    name: 'Haris Floor Operator',
    roleName: 'Production',
    department: 'FRP Molding & CNC Shop Floor',
    email: 'floor@exmarkdoors.com',
    phone: '+91 98470 55432',
    mobileRole: 'FLOOR',
    defaultPin: '4444',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Plant Floor QR Scanner, Job Card Stages & 12L Sticker Verification',
  },
  {
    id: 'usr-mobile-str-01',
    employeeCode: 'STR-01',
    name: 'Shafeek Storekeeper',
    roleName: 'Inventory',
    department: 'Factory Store & Raw Material Issue',
    email: 'store@exmarkdoors.com',
    phone: '+91 98472 66110',
    mobileRole: 'STORE_KEEPER',
    defaultPin: '6666',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    description: 'Tamper-Proof Store BOQ Material Issue (Formula-Locked • Zero Edit/Undo)',
  },
  {
    id: 'usr-mobile-sls-01',
    employeeCode: 'SLS-01',
    name: 'Riyas Sales & CRM',
    roleName: 'Sales',
    department: 'CRM Leads & Customer Follow-Ups',
    email: 'sales@exmarkdoors.com',
    phone: '+91 98473 77220',
    mobileRole: 'SALES_CRM',
    defaultPin: '7777',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Live CRM Leads Pipeline, 1-Tap Call/WhatsApp & Customer Follow-Up Logs',
  },
  {
    id: 'usr-mobile-mgr-01',
    employeeCode: 'MGR-01',
    name: 'Salman Factory Manager',
    roleName: 'Plant Supervisor',
    department: 'Management & Operations Oversight',
    email: 'manager@exmarkdoors.com',
    phone: '+91 98471 99887',
    mobileRole: 'MANAGER',
    defaultPin: '5555',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Plant Floor Overview, Team GPS Tracking, Stage Bottlenecks & Daily Orders',
  },
];

/**
 * Maps any factory role/department to its corresponding mobile operational role.
 */
export function mapUserToMobileRole(roleName?: string, department?: string): MobileStaffRole {
  const r = (roleName || '').toLowerCase();
  const d = (department || '').toLowerCase();

  if (r.includes('driver') || d.includes('driver') || d.includes('logistics') || d.includes('delivery')) {
    return 'DRIVER';
  }
  if (r.includes('inventory') || r.includes('store') || d.includes('store') || d.includes('warehouse')) {
    return 'STORE_KEEPER';
  }
  if (r.includes('site') || r.includes('measur') || d.includes('measur')) {
    return 'FIELD_STAFF';
  }
  if (r.includes('sales') || r.includes('crm') || d.includes('crm') || d.includes('sales')) {
    return 'SALES_CRM';
  }
  if (r.includes('install') || d.includes('fitting') || d.includes('install')) {
    return 'INSTALLER';
  }
  if (
    r.includes('prod') ||
    r.includes('molding') ||
    r.includes('operator') ||
    r.includes('qc') ||
    d.includes('floor') ||
    d.includes('cnc')
  ) {
    return 'FLOOR';
  }
  if (
    r.includes('super admin') ||
    r.includes('supervisor') ||
    r.includes('manage') ||
    d.includes('manage') ||
    r.includes('director')
  ) {
    return 'MANAGER';
  }

  return 'FLOOR';
}
