/**
 * EXMARK ERP — Payroll Shift Policies, Factory Geofence & Attendance Config Store
 */

import fs from 'fs';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';
import type {
  EmployeeAttendancePolicy,
  FactoryGeofenceConfig,
  PayrollSystemConfig,
  ShiftConfiguration,
} from '@/types/payroll';
import type { StoredEmployee } from './employeeStore';

const POLICY_STORE_FILE = 'payroll-policies-store.json';

export const DEFAULT_FACTORY_GEOFENCE: FactoryGeofenceConfig = {
  factoryName: 'EXMARK DOORS Central Manufacturing Unit',
  latitude: 11.0512,
  longitude: 75.9928,
  radiusMeters: 200,
  address: 'Vengara Industrial Area, Malappuram, Kerala 676304',
  googleMapsApiKey: '',
};

export const DEFAULT_SHIFT_CONFIG: ShiftConfiguration = {
  shiftName: 'Factory General Shift (08:30 AM - 05:30 PM)',
  startTime: '08:30',
  endTime: '17:30',
  standardHours: 9,
  graceMinutesLate: 15,
  halfDayThresholdHours: 4.5,
  overtimeCalculationType: 'HOURLY_FIXED',
  customOvertimeHourlyRate: 120,
  latePenaltyPerInstance: 0,
};

export function getPayrollSystemConfig(): PayrollSystemConfig {
  try {
    const filePath = getDataFilePath(POLICY_STORE_FILE);
    if (!fs.existsSync(filePath)) {
      const init: PayrollSystemConfig = {
        geofence: { ...DEFAULT_FACTORY_GEOFENCE },
        defaultShift: { ...DEFAULT_SHIFT_CONFIG },
        employeePolicies: {},
      };
      writeJsonSafe(filePath, init);
      return init;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      geofence: { ...DEFAULT_FACTORY_GEOFENCE, ...(parsed?.geofence || {}) },
      defaultShift: { ...DEFAULT_SHIFT_CONFIG, ...(parsed?.defaultShift || {}) },
      employeePolicies: parsed?.employeePolicies || {},
    };
  } catch {
    return {
      geofence: { ...DEFAULT_FACTORY_GEOFENCE },
      defaultShift: { ...DEFAULT_SHIFT_CONFIG },
      employeePolicies: {},
    };
  }
}

export function savePayrollSystemConfig(config: PayrollSystemConfig): PayrollSystemConfig {
  const filePath = getDataFilePath(POLICY_STORE_FILE);
  writeJsonSafe(filePath, config);
  return config;
}

export function isFieldRoleByDefault(role?: string, department?: string): boolean {
  const text = `${role || ''} ${department || ''}`.toUpperCase();
  return (
    text.includes('DRIVER') ||
    text.includes('FIELD') ||
    text.includes('SITE') ||
    text.includes('SALES') ||
    text.includes('MARKETING') ||
    text.includes('INSTALL') ||
    text.includes('DELIVERY') ||
    text.includes('MEASUR')
  );
}

export function resolveEmployeePolicy(
  employeeId: string,
  emp?: StoredEmployee | { id: string; employeeCode?: string; name?: string; role?: string; department?: string }
): EmployeeAttendancePolicy {
  const cfg = getPayrollSystemConfig();
  const explicit = cfg.employeePolicies[employeeId];
  if (explicit) {
    return {
      ...explicit,
      shift: { ...cfg.defaultShift, ...(explicit.shift || {}) },
    };
  }

  const isField = isFieldRoleByDefault(emp?.role, emp?.department);
  return {
    employeeId,
    employeeCode: emp?.employeeCode || `EXM-EMP-${employeeId.slice(-3)}`,
    employeeName: emp?.name || 'Employee',
    punchMode: isField ? 'ANY_LOCATION' : 'GEOFENCED_FACTORY',
    enableLiveLocationTracking: isField,
    travelRatePerKm: isField ? 5 : 0,
    shift: { ...cfg.defaultShift },
  };
}
