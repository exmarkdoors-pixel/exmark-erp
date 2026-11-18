import fs from 'fs';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';

// ── 1. QUALITY CONTROL (IQC / IPQC / FQC) ─────────────────────────────────────

export type QcStage = 'IQC' | 'IPQC' | 'FQC';

export interface QcInspectionRecord {
  id: string;
  stage: QcStage;
  stageLabel: string;
  itemRef: string;
  description: string;
  inspectorName: string;
  inspectionDate: string;
  parameters: Array<{
    name: string;
    targetSpec: string;
    actualObserved: string;
    passed: boolean;
  }>;
  verdict: 'PASSED' | 'REJECTED' | 'CONDITIONAL_PASS';
  defectType?: 'BLISTER_VOID' | 'WARPAGE' | 'COLOR_VARIATION' | 'THICKNESS_DEVIATION' | 'ROUTING_MISALIGNMENT' | 'NONE';
  actionTaken?: string;
  qcStampBarcode: string;
  createdAt?: string;
}

const QC_FILE = 'qc-inspections-store.json';

function readJsonList<T>(filename: string, fallback: T[]): T[] {
  const filePath = getDataFilePath(filename);
  if (!fs.existsSync(filePath)) {
    writeJsonSafe(filePath, fallback);
    return [...fallback];
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(raw) ? raw : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function listQcInspections(): QcInspectionRecord[] {
  return readJsonList<QcInspectionRecord>(QC_FILE, []);
}

export function createQcInspection(input: Partial<QcInspectionRecord>): QcInspectionRecord {
  const list = listQcInspections();
  const stage: QcStage = input.stage === 'IQC' || input.stage === 'IPQC' || input.stage === 'FQC' ? input.stage : 'FQC';
  const stageLabel =
    input.stageLabel ||
    (stage === 'IQC' ? 'Incoming Material QC' : stage === 'IPQC' ? 'In-Process Floor QC' : 'Final Pre-Dispatch QA');
  const seq = String(list.length + 101).padStart(3, '0');
  const year = new Date().getFullYear();
  const id = input.id?.trim() || `QC-${year}-${seq}`;
  const nowStr = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const record: QcInspectionRecord = {
    id,
    stage,
    stageLabel,
    itemRef: String(input.itemRef || `BATCH-${seq}`).trim(),
    description: String(input.description || 'FRP Molded Door Inspection').trim(),
    inspectorName: String(input.inspectorName || 'QA Inspector').trim(),
    inspectionDate: input.inspectionDate || nowStr,
    parameters:
      Array.isArray(input.parameters) && input.parameters.length > 0
        ? input.parameters
        : [{ name: 'Surface & Dimensional Tolerance', targetSpec: '±1.0 mm / Zero defects', actualObserved: 'Verified', passed: true }],
    verdict: input.verdict === 'REJECTED' || input.verdict === 'CONDITIONAL_PASS' ? input.verdict : 'PASSED',
    defectType: input.defectType || 'NONE',
    actionTaken: input.actionTaken?.trim() || '',
    qcStampBarcode: input.qcStampBarcode || `EXM-QC-${year}-${seq}`,
    createdAt: new Date().toISOString(),
  };

  const next = [record, ...list];
  writeJsonSafe(getDataFilePath(QC_FILE), next);
  return record;
}

export function updateQcInspection(id: string, patch: Partial<QcInspectionRecord>): QcInspectionRecord {
  const list = listQcInspections();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error('QC inspection record not found.');
  const updated: QcInspectionRecord = { ...list[idx], ...patch, id };
  list[idx] = updated;
  writeJsonSafe(getDataFilePath(QC_FILE), list);
  return updated;
}

export function deleteQcInspection(id: string): void {
  const list = listQcInspections();
  const next = list.filter((i) => i.id !== id);
  writeJsonSafe(getDataFilePath(QC_FILE), next);
}

// ── 2. PLANT MAINTENANCE & OEE ────────────────────────────────────────────────

export interface PlantMachineRecord {
  id: string;
  name: string;
  category: 'FRP Master Mold' | 'Hand Power Tool' | 'Manual Spray Gun' | 'Workshop Setup';
  location: string;
  status: 'OPERATIONAL' | 'PREVENTIVE_DUE' | 'BREAKDOWN' | 'CALIBRATION';
  tonnageOrPower: string;
  lastServiceDate: string;
  nextServiceDueDate: string;
  totalRunHours: number;
  oeeAvailability: number;
  oeePerformance: number;
  oeeQuality: number;
  activeOperator: string;
}

export interface MaintenanceTicketRecord {
  id: string;
  machineId: string;
  machineName: string;
  type: 'PREVENTIVE' | 'BREAKDOWN' | 'CALIBRATION';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  assignedEngineer: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reportedDate: string;
  downtimeMinutes: number;
}

interface MaintenanceStore {
  machines: PlantMachineRecord[];
  tickets: MaintenanceTicketRecord[];
}

const MAINT_FILE = 'plant-maintenance-store.json';

const DEFAULT_MACHINES: PlantMachineRecord[] = [
  {
    id: 'MLD-ROYAL-01',
    name: 'Royal Teak FRP Master Door Mold (80" × 34")',
    category: 'FRP Master Mold',
    location: 'Station 1 - Hand Layup Bay',
    status: 'OPERATIONAL',
    tonnageOrPower: 'Manual Gel-Coat & Wax Release',
    lastServiceDate: new Date().toISOString().slice(0, 10),
    nextServiceDueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    totalRunHours: 420,
    oeeAvailability: 97.5,
    oeePerformance: 95.0,
    oeeQuality: 99.2,
    activeOperator: 'Molding Gang A',
  },
  {
    id: 'SAW-HAND-01',
    name: 'Bosch Industrial Circular Sizing Saw & Edge Grinder',
    category: 'Hand Power Tool',
    location: 'Station 2 - Cutting & Finishing Bay',
    status: 'OPERATIONAL',
    tonnageOrPower: '2.2 kW Single Phase',
    lastServiceDate: new Date().toISOString().slice(0, 10),
    nextServiceDueDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    totalRunHours: 310,
    oeeAvailability: 96.0,
    oeePerformance: 94.5,
    oeeQuality: 98.8,
    activeOperator: 'Cutting Gang B',
  },
  {
    id: 'SPR-PU-01',
    name: 'HVLP Pneumatic Paint & Clear-Coat Spray Compressor',
    category: 'Manual Spray Gun',
    location: 'Station 4 - Painting & Polishing Booth',
    status: 'OPERATIONAL',
    tonnageOrPower: '5 HP Dual Tank Compressor',
    lastServiceDate: new Date().toISOString().slice(0, 10),
    nextServiceDueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    totalRunHours: 275,
    oeeAvailability: 95.8,
    oeePerformance: 93.0,
    oeeQuality: 99.0,
    activeOperator: 'Painting Gang D',
  },
];

export function readMaintenanceStore(): MaintenanceStore {
  const filePath = getDataFilePath(MAINT_FILE);
  if (!fs.existsSync(filePath)) {
    const initial: MaintenanceStore = { machines: DEFAULT_MACHINES, tickets: [] };
    writeJsonSafe(filePath, initial);
    return initial;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<MaintenanceStore>;
    return {
      machines: Array.isArray(raw.machines) && raw.machines.length > 0 ? raw.machines : DEFAULT_MACHINES,
      tickets: Array.isArray(raw.tickets) ? raw.tickets : [],
    };
  } catch {
    return { machines: DEFAULT_MACHINES, tickets: [] };
  }
}

export function createPlantMachine(input: Partial<PlantMachineRecord>): PlantMachineRecord {
  const store = readMaintenanceStore();
  const id = input.id?.trim() || `EQP-${Date.now().toString().slice(-5)}`;
  const today = new Date().toISOString().slice(0, 10);
  const record: PlantMachineRecord = {
    id,
    name: String(input.name || 'Factory Equipment').trim(),
    category: input.category || 'Workshop Setup',
    location: String(input.location || 'Main Production Floor').trim(),
    status: input.status || 'OPERATIONAL',
    tonnageOrPower: String(input.tonnageOrPower || 'Standard').trim(),
    lastServiceDate: input.lastServiceDate || today,
    nextServiceDueDate: input.nextServiceDueDate || today,
    totalRunHours: Number(input.totalRunHours) || 0,
    oeeAvailability: Number(input.oeeAvailability ?? 96),
    oeePerformance: Number(input.oeePerformance ?? 95),
    oeeQuality: Number(input.oeeQuality ?? 99),
    activeOperator: String(input.activeOperator || 'Plant Staff').trim(),
  };
  store.machines.unshift(record);
  writeJsonSafe(getDataFilePath(MAINT_FILE), store);
  return record;
}

export function updatePlantMachine(id: string, patch: Partial<PlantMachineRecord>): PlantMachineRecord {
  const store = readMaintenanceStore();
  const idx = store.machines.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error('Equipment / mold not found.');
  store.machines[idx] = { ...store.machines[idx], ...patch, id };
  writeJsonSafe(getDataFilePath(MAINT_FILE), store);
  return store.machines[idx];
}

export function createMaintenanceTicket(input: Partial<MaintenanceTicketRecord>): MaintenanceTicketRecord {
  const store = readMaintenanceStore();
  const machine = store.machines.find((m) => m.id === input.machineId);
  const seq = String(store.tickets.length + 101).padStart(3, '0');
  const year = new Date().getFullYear();
  const record: MaintenanceTicketRecord = {
    id: input.id?.trim() || `TKT-${year}-${seq}`,
    machineId: input.machineId || machine?.id || 'GENERAL',
    machineName: input.machineName || machine?.name || 'Workshop Equipment',
    type: input.type || 'PREVENTIVE',
    priority: input.priority || 'MEDIUM',
    title: String(input.title || 'Scheduled Service / Repair').trim(),
    description: String(input.description || '').trim(),
    assignedEngineer: String(input.assignedEngineer || 'Plant Maintenance Tech').trim(),
    status: input.status || 'OPEN',
    reportedDate: input.reportedDate || new Date().toISOString().slice(0, 10),
    downtimeMinutes: Number(input.downtimeMinutes) || 0,
  };
  store.tickets.unshift(record);
  if (record.type === 'BREAKDOWN' && machine) {
    machine.status = 'BREAKDOWN';
  }
  writeJsonSafe(getDataFilePath(MAINT_FILE), store);
  return record;
}

export function updateMaintenanceTicket(id: string, patch: Partial<MaintenanceTicketRecord>): MaintenanceTicketRecord {
  const store = readMaintenanceStore();
  const idx = store.tickets.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error('Maintenance ticket not found.');
  store.tickets[idx] = { ...store.tickets[idx], ...patch, id };
  if (store.tickets[idx].status === 'RESOLVED') {
    const machine = store.machines.find((m) => m.id === store.tickets[idx].machineId);
    if (machine && machine.status === 'BREAKDOWN') {
      machine.status = 'OPERATIONAL';
      machine.lastServiceDate = new Date().toISOString().slice(0, 10);
    }
  }
  writeJsonSafe(getDataFilePath(MAINT_FILE), store);
  return store.tickets[idx];
}

export function deleteMaintenanceTicket(id: string): void {
  const store = readMaintenanceStore();
  store.tickets = store.tickets.filter((t) => t.id !== id);
  writeJsonSafe(getDataFilePath(MAINT_FILE), store);
}

// ── 3. SUBCONTRACTING / JOB WORK CHALLANS (NON-GST) ───────────────────────────

export interface JobWorkChallanRecord {
  id: string;
  challanDate: string;
  vendorName: string;
  vendorGstin: string;
  vendorDistrict: string;
  processType: 'GLASS_INSERT' | 'BRASS_INLAY' | 'PU_LACQUER' | 'ALU_POWDER_COAT';
  processLabel: string;
  itemsSummary: string;
  quantityDoors: number;
  taxableMaterialValue: number;
  expectedReturnDate: string;
  daysRemainingSection143: number;
  status: 'SENT_TO_VENDOR' | 'IN_PROCESSING' | 'RETURNED_RECEIVED' | 'INSPECTION_PENDING';
  jobCharges: number;
  eWayBillNo?: string;
  notes: string;
}

const JOB_WORK_FILE = 'job-work-challans-store.json';

export function listJobWorkChallans(): JobWorkChallanRecord[] {
  return readJsonList<JobWorkChallanRecord>(JOB_WORK_FILE, []);
}

export function createJobWorkChallan(input: Partial<JobWorkChallanRecord>): JobWorkChallanRecord {
  const list = listJobWorkChallans();
  const seq = String(list.length + 101).padStart(3, '0');
  const year = new Date().getFullYear();
  const processType = input.processType || 'GLASS_INSERT';
  const defaultLabels: Record<JobWorkChallanRecord['processType'], string> = {
    GLASS_INSERT: 'Decorative Glass Insert & Beveling',
    BRASS_INLAY: 'CNC Brass / SS Inlay Groove',
    PU_LACQUER: 'High-Gloss PU Lacquer & Polish',
    ALU_POWDER_COAT: 'Powder Coating / Hardware Finish',
  };
  const record: JobWorkChallanRecord = {
    id: input.id?.trim() || `JW-${year}-${seq}`,
    challanDate: input.challanDate || new Date().toISOString().slice(0, 10),
    vendorName: String(input.vendorName || '').trim() || 'Subcontracting Vendor',
    vendorGstin: '',
    vendorDistrict: String(input.vendorDistrict || 'Malappuram').trim(),
    processType,
    processLabel: input.processLabel?.trim() || defaultLabels[processType],
    itemsSummary: String(input.itemsSummary || 'FRP Door Batch').trim(),
    quantityDoors: Math.max(1, Number(input.quantityDoors) || 1),
    taxableMaterialValue: Math.max(0, Number(input.taxableMaterialValue) || 0),
    expectedReturnDate: input.expectedReturnDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    daysRemainingSection143: Number(input.daysRemainingSection143 ?? 365),
    status: input.status || 'SENT_TO_VENDOR',
    jobCharges: Math.max(0, Number(input.jobCharges) || 0),
    eWayBillNo: input.eWayBillNo?.trim() || undefined,
    notes: String(input.notes || '').trim(),
  };
  writeJsonSafe(getDataFilePath(JOB_WORK_FILE), [record, ...list]);
  return record;
}

export function updateJobWorkChallan(id: string, patch: Partial<JobWorkChallanRecord>): JobWorkChallanRecord {
  const list = listJobWorkChallans();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Job work challan not found.');
  list[idx] = { ...list[idx], ...patch, id };
  writeJsonSafe(getDataFilePath(JOB_WORK_FILE), list);
  return list[idx];
}

export function deleteJobWorkChallan(id: string): void {
  const list = listJobWorkChallans();
  writeJsonSafe(getDataFilePath(JOB_WORK_FILE), list.filter((c) => c.id !== id));
}

// ── 4. SECURITY GATE PASSES (NRGP / RGP / INWARD) ─────────────────────────────

export type GatePassType = 'NRGP_OUTWARD' | 'RGP_OUTWARD' | 'INWARD_MATERIAL';

export interface GatePassItemRecord {
  id: string;
  passType: GatePassType;
  passTypeLabel: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  destinationOrParty: string;
  materialManifest: string;
  unitsCount: number;
  invoiceOrRef: string;
  eWayBillNo?: string;
  securityGuardName: string;
  issuedTimestamp: string;
  returnDueTimestamp?: string;
  status: 'GATE_CLEARED' | 'LOADING_BAY' | 'PENDING_RETURN' | 'CLOSED';
  notes: string;
}

const GATE_PASS_FILE = 'gate-passes-store.json';

export function listGatePasses(): GatePassItemRecord[] {
  return readJsonList<GatePassItemRecord>(GATE_PASS_FILE, []);
}

export function createGatePass(input: Partial<GatePassItemRecord>): GatePassItemRecord {
  const list = listGatePasses();
  const seq = String(list.length + 101).padStart(3, '0');
  const year = new Date().getFullYear();
  const passType: GatePassType = input.passType || 'NRGP_OUTWARD';
  const labels: Record<GatePassType, string> = {
    NRGP_OUTWARD: 'Non-Returnable (Direct Dispatch)',
    RGP_OUTWARD: 'Returnable (Job Work / Tools)',
    INWARD_MATERIAL: 'Inward Material Entry',
  };
  const nowStr = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const record: GatePassItemRecord = {
    id: input.id?.trim() || `GP-${year}-${seq}`,
    passType,
    passTypeLabel: input.passTypeLabel?.trim() || labels[passType],
    vehicleNo: String(input.vehicleNo || 'KL-09').trim().toUpperCase(),
    driverName: String(input.driverName || 'Driver').trim(),
    driverPhone: String(input.driverPhone || '').trim(),
    destinationOrParty: String(input.destinationOrParty || '').trim() || 'Client Site',
    materialManifest: String(input.materialManifest || 'FRP Doors & Frames').trim(),
    unitsCount: Math.max(1, Number(input.unitsCount) || 1),
    invoiceOrRef: String(input.invoiceOrRef || `DC-${year}-${seq}`).trim(),
    eWayBillNo: input.eWayBillNo?.trim() || undefined,
    securityGuardName: String(input.securityGuardName || 'Main Gate Security').trim(),
    issuedTimestamp: input.issuedTimestamp || nowStr,
    returnDueTimestamp: input.returnDueTimestamp?.trim() || undefined,
    status: input.status || (passType === 'RGP_OUTWARD' ? 'PENDING_RETURN' : 'LOADING_BAY'),
    notes: String(input.notes || '').trim(),
  };
  writeJsonSafe(getDataFilePath(GATE_PASS_FILE), [record, ...list]);
  return record;
}

export function updateGatePass(id: string, patch: Partial<GatePassItemRecord>): GatePassItemRecord {
  const list = listGatePasses();
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) throw new Error('Gate pass not found.');
  list[idx] = { ...list[idx], ...patch, id };
  writeJsonSafe(getDataFilePath(GATE_PASS_FILE), list);
  return list[idx];
}

export function deleteGatePass(id: string): void {
  const list = listGatePasses();
  writeJsonSafe(getDataFilePath(GATE_PASS_FILE), list.filter((g) => g.id !== id));
}
