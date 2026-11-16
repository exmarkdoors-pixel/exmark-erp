// ── EXMARK ERP — Logistics Fleet, Drivers & Vehicles Types ──────────────────

export type DriverStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
export type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE';
export type VehicleType = 'TRUCK' | 'PICKUP' | 'CONTAINER' | 'LCV' | 'OTHER';
export type OwnershipType = 'COMPANY_OWNED' | 'ATTACHED_CONTRACT' | 'RENTAL';

export interface DriverRecord {
  id: string;                      // e.g. "drv-2026-001"
  employeeCode: string;            // e.g. "DRV-01", "DRV-02"
  name: string;                    // e.g. "Ratheesh Driver", "Muhammed Shafi"
  phone: string;                   // e.g. "+91 94472 88123"
  drivingLicenseNo: string;        // e.g. "KL-09-2018-0044521"
  licenseExpiryDate?: string;      // e.g. "2032-05-15"
  defaultPin: string;              // 4-digit mobile terminal PIN, e.g. "1111"
  assignedVehicleNumber?: string;  // e.g. "KL-09-AW-8210"
  status: DriverStatus;            // 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'
  totalTripsCompleted: number;     // Stats counter
  emergencyContact?: string;       // Next of kin / family contact
  bloodGroup?: string;             // e.g. "O+", "B+"
  notes?: string;                  // Remarks / route preference
  createdAt: string;
  updatedAt: string;
}

export interface VehicleRecord {
  id: string;                      // e.g. "veh-2026-001"
  registrationNumber: string;      // e.g. "KL-09-AW-8210" (formatted, unique)
  model: string;                   // e.g. "Tata 407 Heavy Flatbed", "Mahindra Bolero Maxi Truck"
  vehicleType: VehicleType;        // 'TRUCK' | 'PICKUP' | 'CONTAINER' | 'LCV'
  doorCapacity: number;            // Max FRP door units (e.g. 15, 25, 40)
  fuelType: 'DIESEL' | 'ELECTRIC' | 'CNG';
  assignedDriverId?: string;       // Linked to DriverRecord.id
  assignedDriverName?: string;     // Cached for fast display
  assignedDriverPhone?: string;    // Cached for fast display
  insuranceExpiryDate?: string;    // Alerts when within 30 days
  fitnessExpiryDate?: string;      // Kerala MVD Fitness (FC) due date
  pollutionExpiryDate?: string;    // PUC certificate expiry
  status: VehicleStatus;           // 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE'
  ownershipType: OwnershipType;    // 'COMPANY_OWNED' | 'ATTACHED_CONTRACT' | 'RENTAL'
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetStore {
  drivers: DriverRecord[];
  vehicles: VehicleRecord[];
  version: number;
}

export interface FleetSummary {
  totalDrivers: number;
  activeDrivers: number;
  onLeaveDrivers: number;
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  totalDoorCapacity: number;
  expiringCertificatesCount: number;
}
