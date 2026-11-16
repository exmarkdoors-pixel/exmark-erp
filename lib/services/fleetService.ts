import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';
import { assertWriteAllowed } from './dbSyncEngine';
import { listDispatches } from './fulfillmentService';
import { upsertFactoryUser, deleteFactoryUser, ensureUsersStore } from '../auth/userStore';
import {
  DriverRecord,
  VehicleRecord,
  FleetStore,
  FleetSummary,
  DriverStatus,
  VehicleStatus,
} from '@/types/fleet';

const getStorePath = () => getDataFilePath('fleet-store.json');

const INITIAL_FLEET_STORE: FleetStore = {
  version: 1,
  drivers: [
    {
      id: 'drv-2026-001',
      employeeCode: 'DRV-01',
      name: 'Ratheesh Driver',
      phone: '+91 94472 88123',
      drivingLicenseNo: 'KL-09-2018-0044521',
      licenseExpiryDate: '2032-05-15',
      defaultPin: '1111',
      assignedVehicleNumber: 'KL-09-AW-8210',
      status: 'ACTIVE',
      totalTripsCompleted: 14,
      bloodGroup: 'B+',
      emergencyContact: '+91 94470 11223 (Wife)',
      notes: 'Experienced heavy vehicle driver across Kozhikode, Malappuram & Palakkad hill routes.',
      createdAt: '2026-11-01T08:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
    {
      id: 'drv-2026-002',
      employeeCode: 'DRV-02',
      name: 'Muhammed Shafi',
      phone: '+91 94471 88992',
      drivingLicenseNo: 'KL-10-2019-0012891',
      licenseExpiryDate: '2034-08-20',
      defaultPin: '1122',
      assignedVehicleNumber: 'KL-08-CC-2219',
      status: 'ACTIVE',
      totalTripsCompleted: 8,
      bloodGroup: 'O+',
      emergencyContact: '+91 98471 55667 (Brother)',
      notes: 'Specializes in Cochin / Ernakulam commercial tower deliveries and apartment sites.',
      createdAt: '2026-11-03T09:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
    {
      id: 'drv-2026-003',
      employeeCode: 'DRV-03',
      name: 'Suresh Babu',
      phone: '+91 98460 33441',
      drivingLicenseNo: 'KL-55-2021-0089123',
      licenseExpiryDate: '2036-01-10',
      defaultPin: '1133',
      assignedVehicleNumber: 'KL-55-B-4412',
      status: 'ACTIVE',
      totalTripsCompleted: 5,
      bloodGroup: 'A+',
      emergencyContact: '+91 98460 99887 (Father)',
      notes: 'North Kerala express driver (Kannur, Kasaragod & Wayanad ghat section).',
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
  ],
  vehicles: [
    {
      id: 'veh-2026-001',
      registrationNumber: 'KL-09-AW-8210',
      model: 'Tata 407 Heavy Flatbed',
      vehicleType: 'TRUCK',
      doorCapacity: 25,
      fuelType: 'DIESEL',
      assignedDriverId: 'drv-2026-001',
      assignedDriverName: 'Ratheesh Driver',
      assignedDriverPhone: '+91 94472 88123',
      fitnessExpiryDate: '2027-02-15',
      insuranceExpiryDate: '2027-03-31',
      pollutionExpiryDate: '2026-12-15',
      status: 'ACTIVE',
      ownershipType: 'COMPANY_OWNED',
      notes: 'Factory flagship 25-door distribution truck with custom steel vertical divider racks.',
      createdAt: '2026-11-01T08:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
    {
      id: 'veh-2026-002',
      registrationNumber: 'KL-08-CC-2219',
      model: 'Mahindra Bolero Maxi Truck',
      vehicleType: 'PICKUP',
      doorCapacity: 14,
      fuelType: 'DIESEL',
      assignedDriverId: 'drv-2026-002',
      assignedDriverName: 'Muhammed Shafi',
      assignedDriverPhone: '+91 94471 88992',
      fitnessExpiryDate: '2027-01-10',
      insuranceExpiryDate: '2026-12-30',
      pollutionExpiryDate: '2027-04-10',
      status: 'ACTIVE',
      ownershipType: 'COMPANY_OWNED',
      notes: 'Agile delivery pickup for tight residential villa roads and urban site drops.',
      createdAt: '2026-11-03T09:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
    {
      id: 'veh-2026-003',
      registrationNumber: 'KL-55-B-4412',
      model: 'Ashok Leyland Bada Dost',
      vehicleType: 'LCV',
      doorCapacity: 18,
      fuelType: 'DIESEL',
      assignedDriverId: 'drv-2026-003',
      assignedDriverName: 'Suresh Babu',
      assignedDriverPhone: '+91 98460 33441',
      fitnessExpiryDate: '2027-06-15',
      insuranceExpiryDate: '2027-08-20',
      pollutionExpiryDate: '2027-02-28',
      status: 'ACTIVE',
      ownershipType: 'COMPANY_OWNED',
      notes: 'Medium capacity LCV for North Kerala regional transfers.',
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
  ],
};

function readFleetStore(): FleetStore {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, JSON.stringify(INITIAL_FLEET_STORE, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(INITIAL_FLEET_STORE));
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || 1,
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
    };
  } catch (err) {
    console.error('[fleetService] Failed to read fleet store, fallback to seed:', err);
    return JSON.parse(JSON.stringify(INITIAL_FLEET_STORE));
  }
}

function writeFleetStore(store: FleetStore): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${storePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmp, storePath);
  } catch (err) {
    console.error('[fleetService] Failed to write fleet store:', err);
    throw new Error('Failed to persist fleet records to storage');
  }
}

export function formatRegistrationNumber(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export function generateNextDriverCode(drivers: DriverRecord[]): string {
  let max = 0;
  for (const d of drivers) {
    const m = d.employeeCode?.match(/DRV-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `DRV-${String(max + 1).padStart(2, '0')}`;
}

// ── DRIVERS CRUD ────────────────────────────────────────────────────────────

export async function listDrivers(): Promise<DriverRecord[]> {
  const store = readFleetStore();
  return store.drivers;
}

export async function getDriverById(id: string): Promise<DriverRecord | null> {
  const store = readFleetStore();
  return store.drivers.find((d) => d.id === id) || null;
}

export async function createDriver(input: {
  employeeCode?: string;
  name: string;
  phone: string;
  drivingLicenseNo: string;
  licenseExpiryDate?: string;
  defaultPin?: string;
  assignedVehicleNumber?: string;
  status?: DriverStatus;
  bloodGroup?: string;
  emergencyContact?: string;
  notes?: string;
}): Promise<DriverRecord> {
  await assertWriteAllowed('create driver');

  const trimmedName = input.name?.trim();
  if (!trimmedName) throw new Error('Driver Name is required.');
  const trimmedPhone = input.phone?.trim();
  if (!trimmedPhone) throw new Error('Driver Phone is required.');
  const trimmedPin = (input.defaultPin || '1111').trim();
  if (!/^\d{4}$/.test(trimmedPin)) {
    throw new Error('Driver Mobile PIN must be exactly 4 digits (e.g. 1111).');
  }

  const store = readFleetStore();
  const code = (input.employeeCode?.trim().toUpperCase()) || generateNextDriverCode(store.drivers);

  // Check unique employee code
  if (store.drivers.some((d) => d.employeeCode.toUpperCase() === code)) {
    throw new Error(`Driver with Employee Code "${code}" already exists.`);
  }

  // Check unique phone number
  const digits = trimmedPhone.replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    const phoneConflict = store.drivers.some(
      (d) => d.phone.replace(/\D/g, '').slice(-10) === digits
    );
    if (phoneConflict) {
      throw new Error(`Another driver is already registered with phone ${trimmedPhone}.`);
    }
  }

  const now = new Date().toISOString();
  const newDriver: DriverRecord = {
    id: `drv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeCode: code,
    name: trimmedName,
    phone: trimmedPhone,
    drivingLicenseNo: input.drivingLicenseNo?.trim() || 'KL-MVD-PENDING',
    licenseExpiryDate: input.licenseExpiryDate || undefined,
    defaultPin: trimmedPin,
    assignedVehicleNumber: input.assignedVehicleNumber ? formatRegistrationNumber(input.assignedVehicleNumber) : undefined,
    status: input.status || 'ACTIVE',
    totalTripsCompleted: 0,
    bloodGroup: input.bloodGroup?.trim(),
    emergencyContact: input.emergencyContact?.trim(),
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  store.drivers.unshift(newDriver);

  // If assigned a vehicle, link the vehicle back to this driver
  if (newDriver.assignedVehicleNumber) {
    const veh = store.vehicles.find((v) => v.registrationNumber === newDriver.assignedVehicleNumber);
    if (veh) {
      veh.assignedDriverId = newDriver.id;
      veh.assignedDriverName = newDriver.name;
      veh.assignedDriverPhone = newDriver.phone;
      veh.updatedAt = now;
    }
  }

  writeFleetStore(store);

  // Sync to users-store.json so driver can immediately log in on /mobile
  try {
    await upsertFactoryUser({
      name: newDriver.name,
      employeeCode: newDriver.employeeCode,
      phone: newDriver.phone,
      role: 'Driver',
      department: 'Delivery Logistics & Fleet',
      quickPin: newDriver.defaultPin,
      isActive: newDriver.status === 'ACTIVE',
    });
  } catch (err) {
    console.warn('[fleetService] Warning: Could not auto-sync user account for driver:', err);
  }

  return newDriver;
}

export async function updateDriver(
  id: string,
  input: {
    employeeCode?: string;
    name?: string;
    phone?: string;
    drivingLicenseNo?: string;
    licenseExpiryDate?: string;
    defaultPin?: string;
    assignedVehicleNumber?: string;
    status?: DriverStatus;
    bloodGroup?: string;
    emergencyContact?: string;
    notes?: string;
  }
): Promise<DriverRecord> {
  await assertWriteAllowed('update driver');

  const store = readFleetStore();
  const idx = store.drivers.findIndex((d) => d.id === id);
  if (idx === -1) {
    throw new Error(`Driver with ID "${id}" was not found.`);
  }

  const existing = store.drivers[idx];
  const now = new Date().toISOString();

  // Validate Code uniqueness if changed
  if (input.employeeCode && input.employeeCode.trim().toUpperCase() !== existing.employeeCode.toUpperCase()) {
    const targetCode = input.employeeCode.trim().toUpperCase();
    if (store.drivers.some((d) => d.id !== id && d.employeeCode.toUpperCase() === targetCode)) {
      throw new Error(`Another driver with code "${targetCode}" already exists.`);
    }
  }

  // Validate PIN if changed
  if (input.defaultPin !== undefined) {
    if (!/^\d{4}$/.test(input.defaultPin.trim())) {
      throw new Error('Driver Mobile PIN must be exactly 4 digits.');
    }
  }

  const updatedVehicleNumber =
    input.assignedVehicleNumber !== undefined
      ? input.assignedVehicleNumber ? formatRegistrationNumber(input.assignedVehicleNumber) : undefined
      : existing.assignedVehicleNumber;

  const updatedDriver: DriverRecord = {
    ...existing,
    employeeCode: input.employeeCode?.trim().toUpperCase() || existing.employeeCode,
    name: input.name?.trim() || existing.name,
    phone: input.phone?.trim() || existing.phone,
    drivingLicenseNo: input.drivingLicenseNo !== undefined ? input.drivingLicenseNo.trim() : existing.drivingLicenseNo,
    licenseExpiryDate: input.licenseExpiryDate !== undefined ? input.licenseExpiryDate : existing.licenseExpiryDate,
    defaultPin: input.defaultPin?.trim() || existing.defaultPin,
    assignedVehicleNumber: updatedVehicleNumber,
    status: input.status || existing.status,
    bloodGroup: input.bloodGroup !== undefined ? input.bloodGroup.trim() : existing.bloodGroup,
    emergencyContact: input.emergencyContact !== undefined ? input.emergencyContact.trim() : existing.emergencyContact,
    notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
    updatedAt: now,
  };

  store.drivers[idx] = updatedDriver;

  // Sync vehicle assignments
  for (const v of store.vehicles) {
    if (v.assignedDriverId === id && v.registrationNumber !== updatedVehicleNumber) {
      v.assignedDriverId = undefined;
      v.assignedDriverName = undefined;
      v.assignedDriverPhone = undefined;
      v.updatedAt = now;
    } else if (updatedVehicleNumber && v.registrationNumber === updatedVehicleNumber) {
      v.assignedDriverId = updatedDriver.id;
      v.assignedDriverName = updatedDriver.name;
      v.assignedDriverPhone = updatedDriver.phone;
      v.updatedAt = now;
    }
  }

  writeFleetStore(store);

  // Sync user in users-store.json
  try {
    const users = await ensureUsersStore();
    const existingUser = users.find(
      (u) =>
        u.employeeCode?.toUpperCase() === existing.employeeCode.toUpperCase() ||
        (existing.phone && u.phone && u.phone.replace(/\D/g, '').slice(-10) === existing.phone.replace(/\D/g, '').slice(-10))
    );

    await upsertFactoryUser({
      id: existingUser?.id,
      name: updatedDriver.name,
      employeeCode: updatedDriver.employeeCode,
      phone: updatedDriver.phone,
      role: 'Driver',
      department: 'Delivery Logistics & Fleet',
      quickPin: updatedDriver.defaultPin,
      isActive: updatedDriver.status === 'ACTIVE',
    });
  } catch (err) {
    console.warn('[fleetService] Warning: Could not update driver user account:', err);
  }

  return updatedDriver;
}

export async function deleteDriver(id: string): Promise<boolean> {
  await assertWriteAllowed('delete driver');

  const store = readFleetStore();
  const idx = store.drivers.findIndex((d) => d.id === id);
  if (idx === -1) return false;

  const target = store.drivers[idx];

  // In-use safeguard: check active dispatches
  const dispatches = await listDispatches();
  const activeDispatch = dispatches.find(
    (dsp) =>
      (dsp.driverName.toLowerCase() === target.name.toLowerCase() ||
        (target.phone && dsp.driverPhone && dsp.driverPhone.replace(/\D/g, '').slice(-10) === target.phone.replace(/\D/g, '').slice(-10))) &&
      (dsp.status === 'SCHEDULED' || dsp.status === 'LOADED' || dsp.status === 'IN_TRANSIT')
  );

  if (activeDispatch) {
    throw new Error(
      `Cannot delete driver "${target.name}" because they are assigned to an active trip (${activeDispatch.dispatchNumber} • ${activeDispatch.status}). Complete delivery or reassign first.`
    );
  }

  // Clear vehicle assignment
  for (const v of store.vehicles) {
    if (v.assignedDriverId === id || v.registrationNumber === target.assignedVehicleNumber) {
      v.assignedDriverId = undefined;
      v.assignedDriverName = undefined;
      v.assignedDriverPhone = undefined;
      v.updatedAt = new Date().toISOString();
    }
  }

  store.drivers.splice(idx, 1);
  writeFleetStore(store);

  // Deactivate/delete from user store
  try {
    const users = await ensureUsersStore();
    const matchedUser = users.find(
      (u) =>
        u.employeeCode?.toUpperCase() === target.employeeCode.toUpperCase() ||
        (target.phone && u.phone && u.phone.replace(/\D/g, '').slice(-10) === target.phone.replace(/\D/g, '').slice(-10))
    );
    if (matchedUser) {
      await deleteFactoryUser(matchedUser.id);
    }
  } catch (err) {
    console.warn('[fleetService] Warning: Could not remove deleted driver from users-store:', err);
  }

  return true;
}

// ── VEHICLES CRUD ───────────────────────────────────────────────────────────

export async function listVehicles(): Promise<VehicleRecord[]> {
  const store = readFleetStore();
  return store.vehicles;
}

export async function getVehicleById(id: string): Promise<VehicleRecord | null> {
  const store = readFleetStore();
  return store.vehicles.find((v) => v.id === id) || null;
}

export async function createVehicle(input: {
  registrationNumber: string;
  model: string;
  vehicleType?: any;
  doorCapacity: number;
  fuelType?: 'DIESEL' | 'ELECTRIC' | 'CNG';
  assignedDriverId?: string;
  insuranceExpiryDate?: string;
  fitnessExpiryDate?: string;
  pollutionExpiryDate?: string;
  status?: VehicleStatus;
  ownershipType?: any;
  notes?: string;
}): Promise<VehicleRecord> {
  await assertWriteAllowed('create vehicle');

  const regNo = formatRegistrationNumber(input.registrationNumber);
  if (!regNo) throw new Error('Vehicle Registration Number is required.');
  const trimmedModel = input.model?.trim();
  if (!trimmedModel) throw new Error('Vehicle Model/Make is required.');
  const capacity = Number(input.doorCapacity);
  if (!capacity || capacity <= 0) {
    throw new Error('Door Capacity must be greater than 0.');
  }

  const store = readFleetStore();
  if (store.vehicles.some((v) => v.registrationNumber === regNo)) {
    throw new Error(`Vehicle with registration number "${regNo}" already exists.`);
  }

  let driverName: string | undefined;
  let driverPhone: string | undefined;
  if (input.assignedDriverId) {
    const d = store.drivers.find((drv) => drv.id === input.assignedDriverId);
    if (d) {
      driverName = d.name;
      driverPhone = d.phone;
      d.assignedVehicleNumber = regNo;
      d.updatedAt = new Date().toISOString();
    }
  }

  const now = new Date().toISOString();
  const newVehicle: VehicleRecord = {
    id: `veh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    registrationNumber: regNo,
    model: trimmedModel,
    vehicleType: input.vehicleType || 'TRUCK',
    doorCapacity: capacity,
    fuelType: input.fuelType || 'DIESEL',
    assignedDriverId: input.assignedDriverId || undefined,
    assignedDriverName: driverName,
    assignedDriverPhone: driverPhone,
    insuranceExpiryDate: input.insuranceExpiryDate || undefined,
    fitnessExpiryDate: input.fitnessExpiryDate || undefined,
    pollutionExpiryDate: input.pollutionExpiryDate || undefined,
    status: input.status || 'ACTIVE',
    ownershipType: input.ownershipType || 'COMPANY_OWNED',
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  store.vehicles.unshift(newVehicle);
  writeFleetStore(store);
  return newVehicle;
}

export async function updateVehicle(
  id: string,
  input: {
    registrationNumber?: string;
    model?: string;
    vehicleType?: any;
    doorCapacity?: number;
    fuelType?: 'DIESEL' | 'ELECTRIC' | 'CNG';
    assignedDriverId?: string | null;
    insuranceExpiryDate?: string;
    fitnessExpiryDate?: string;
    pollutionExpiryDate?: string;
    status?: VehicleStatus;
    ownershipType?: any;
    notes?: string;
  }
): Promise<VehicleRecord> {
  await assertWriteAllowed('update vehicle');

  const store = readFleetStore();
  const idx = store.vehicles.findIndex((v) => v.id === id);
  if (idx === -1) {
    throw new Error(`Vehicle with ID "${id}" was not found.`);
  }

  const existing = store.vehicles[idx];
  const now = new Date().toISOString();

  let targetReg = existing.registrationNumber;
  if (input.registrationNumber) {
    targetReg = formatRegistrationNumber(input.registrationNumber);
    if (targetReg !== existing.registrationNumber) {
      if (store.vehicles.some((v) => v.id !== id && v.registrationNumber === targetReg)) {
        throw new Error(`Another vehicle with registration "${targetReg}" already exists.`);
      }
    }
  }

  let driverId = existing.assignedDriverId;
  let driverName = existing.assignedDriverName;
  let driverPhone = existing.assignedDriverPhone;

  if (input.assignedDriverId !== undefined) {
    if (input.assignedDriverId === null || input.assignedDriverId === '') {
      driverId = undefined;
      driverName = undefined;
      driverPhone = undefined;
      // Clear link on old driver
      for (const d of store.drivers) {
        if (d.assignedVehicleNumber === existing.registrationNumber) {
          d.assignedVehicleNumber = undefined;
          d.updatedAt = now;
        }
      }
    } else {
      const d = store.drivers.find((drv) => drv.id === input.assignedDriverId);
      if (d) {
        driverId = d.id;
        driverName = d.name;
        driverPhone = d.phone;
        d.assignedVehicleNumber = targetReg;
        d.updatedAt = now;
      }
    }
  }

  const updatedVehicle: VehicleRecord = {
    ...existing,
    registrationNumber: targetReg,
    model: input.model?.trim() || existing.model,
    vehicleType: input.vehicleType || existing.vehicleType,
    doorCapacity: input.doorCapacity !== undefined ? Number(input.doorCapacity) : existing.doorCapacity,
    fuelType: input.fuelType || existing.fuelType,
    assignedDriverId: driverId,
    assignedDriverName: driverName,
    assignedDriverPhone: driverPhone,
    insuranceExpiryDate: input.insuranceExpiryDate !== undefined ? input.insuranceExpiryDate : existing.insuranceExpiryDate,
    fitnessExpiryDate: input.fitnessExpiryDate !== undefined ? input.fitnessExpiryDate : existing.fitnessExpiryDate,
    pollutionExpiryDate: input.pollutionExpiryDate !== undefined ? input.pollutionExpiryDate : existing.pollutionExpiryDate,
    status: input.status || existing.status,
    ownershipType: input.ownershipType || existing.ownershipType,
    notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
    updatedAt: now,
  };

  store.vehicles[idx] = updatedVehicle;

  // If reg number changed, update any driver referring to old reg
  if (targetReg !== existing.registrationNumber) {
    for (const d of store.drivers) {
      if (d.assignedVehicleNumber === existing.registrationNumber) {
        d.assignedVehicleNumber = targetReg;
        d.updatedAt = now;
      }
    }
  }

  writeFleetStore(store);
  return updatedVehicle;
}

export async function deleteVehicle(id: string): Promise<boolean> {
  await assertWriteAllowed('delete vehicle');

  const store = readFleetStore();
  const idx = store.vehicles.findIndex((v) => v.id === id);
  if (idx === -1) return false;

  const target = store.vehicles[idx];

  // In-use safeguard: check active dispatches
  const dispatches = await listDispatches();
  const activeDispatch = dispatches.find(
    (dsp) =>
      dsp.vehicleNumber.toUpperCase() === target.registrationNumber.toUpperCase() &&
      (dsp.status === 'SCHEDULED' || dsp.status === 'LOADED' || dsp.status === 'IN_TRANSIT')
  );

  if (activeDispatch) {
    throw new Error(
      `Cannot delete vehicle "${target.registrationNumber}" because it is currently assigned to an active trip (${activeDispatch.dispatchNumber} • ${activeDispatch.status}). Complete delivery or reassign first.`
    );
  }

  // Clear assigned vehicle on driver
  for (const d of store.drivers) {
    if (d.assignedVehicleNumber === target.registrationNumber) {
      d.assignedVehicleNumber = undefined;
      d.updatedAt = new Date().toISOString();
    }
  }

  store.vehicles.splice(idx, 1);
  writeFleetStore(store);
  return true;
}

// ── FLEET SUMMARY ───────────────────────────────────────────────────────────

export async function getFleetSummary(): Promise<FleetSummary> {
  const store = readFleetStore();
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let expiringCertificatesCount = 0;
  for (const v of store.vehicles) {
    for (const d of [v.fitnessExpiryDate, v.insuranceExpiryDate, v.pollutionExpiryDate]) {
      if (d) {
        const exp = new Date(d);
        if (exp >= now && exp <= thirtyDaysLater) {
          expiringCertificatesCount++;
        }
      }
    }
  }

  return {
    totalDrivers: store.drivers.length,
    activeDrivers: store.drivers.filter((d) => d.status === 'ACTIVE').length,
    onLeaveDrivers: store.drivers.filter((d) => d.status === 'ON_LEAVE').length,
    totalVehicles: store.vehicles.length,
    activeVehicles: store.vehicles.filter((v) => v.status === 'ACTIVE').length,
    maintenanceVehicles: store.vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length,
    totalDoorCapacity: store.vehicles
      .filter((v) => v.status === 'ACTIVE')
      .reduce((sum, v) => sum + (v.doorCapacity || 0), 0),
    expiringCertificatesCount,
  };
}
