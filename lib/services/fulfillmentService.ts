import fs from 'fs';
import path from 'path';
import {
  DispatchRecord,
  InstallationRecord,
  WarrantyCertificate,
  DispatchStatus,
} from '@/types/fulfillment';

export interface FulfillmentStore {
  dispatches: DispatchRecord[];
  installations: InstallationRecord[];
  warranties: WarrantyCertificate[];
}

const STORE_PATH = path.join(process.cwd(), 'data', 'fulfillment-store.json');

function readStore(): FulfillmentStore {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      const initial: FulfillmentStore = { dispatches: [], installations: [], warranties: [] };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const valid = parsed as FulfillmentStore;
    return {
      dispatches: Array.isArray(valid.dispatches) ? valid.dispatches : [],
      installations: Array.isArray(valid.installations) ? valid.installations : [],
      warranties: Array.isArray(valid.warranties) ? valid.warranties : [],
    };
  } catch {
    return { dispatches: [], installations: [], warranties: [] };
  }
}

function writeStore(store: FulfillmentStore): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[fulfillmentService] Failed to write store:', err);
  }
}

function generateDispatchNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `DSP-2026-${num}`;
}

function generateInstallationNumber(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `INS-2026-${num}`;
}

function generateWarrantyNumber(count: number): string {
  const num = String(count + 1).padStart(4, '0');
  return `EXM-WRN-2026-${num}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Dispatches ────────────────────────────────────────────────────────────────

export async function listDispatches(): Promise<DispatchRecord[]> {
  const store = readStore();
  return store.dispatches;
}

export async function createDispatch(input: {
  salesOrderId?: string | null;
  customerName: string;
  destinationAddress: string;
  deliveryDistrict: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  eWayBillNo?: string | null;
  doorCount: number;
}): Promise<DispatchRecord> {
  const store = readStore();
  const newDispatch: DispatchRecord = {
    id: generateId('dsp'),
    dispatchNumber: generateDispatchNumber(store.dispatches.length),
    salesOrderId: input.salesOrderId || null,
    customerName: input.customerName,
    destinationAddress: input.destinationAddress,
    deliveryDistrict: input.deliveryDistrict,
    vehicleNumber: input.vehicleNumber,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    eWayBillNo: input.eWayBillNo || null,
    doorCount: input.doorCount,
    dispatchDate: new Date().toISOString().split('T')[0],
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.dispatches.push(newDispatch);
  writeStore(store);
  return newDispatch;
}

export async function updateDispatchStatus(id: string, status: DispatchStatus): Promise<DispatchRecord> {
  const store = readStore();
  const idx = store.dispatches.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Dispatch ${id} not found`);

  store.dispatches[idx].status = status;
  store.dispatches[idx].updatedAt = new Date().toISOString();
  writeStore(store);
  return store.dispatches[idx];
}

// ── Installations ─────────────────────────────────────────────────────────────

export async function listInstallations(): Promise<InstallationRecord[]> {
  const store = readStore();
  return store.installations;
}

export async function createInstallation(input: {
  salesOrderId?: string | null;
  dispatchId?: string | null;
  customerName: string;
  siteAddress: string;
  district: string;
  supervisorName: string;
  scheduledDate: string;
  doorCount: number;
}): Promise<InstallationRecord> {
  const store = readStore();
  const newInst: InstallationRecord = {
    id: generateId('ins'),
    installationNumber: generateInstallationNumber(store.installations.length),
    salesOrderId: input.salesOrderId || null,
    dispatchId: input.dispatchId || null,
    customerName: input.customerName,
    siteAddress: input.siteAddress,
    district: input.district,
    supervisorName: input.supervisorName,
    scheduledDate: input.scheduledDate,
    doorCount: input.doorCount,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.installations.push(newInst);
  writeStore(store);
  return newInst;
}

export async function completeInstallationSignoff(input: {
  id: string;
  clientSignoffName: string;
  feedbackRating: number;
  remarks?: string;
}): Promise<InstallationRecord> {
  const store = readStore();
  const idx = store.installations.findIndex((i) => i.id === input.id);
  if (idx === -1) throw new Error(`Installation ${input.id} not found`);

  store.installations[idx].status = 'QUALITY_APPROVED';
  store.installations[idx].clientSignoffName = input.clientSignoffName;
  store.installations[idx].clientFeedbackRating = input.feedbackRating;
  store.installations[idx].clientRemarks = input.remarks || null;
  store.installations[idx].completedDate = new Date().toISOString().split('T')[0];
  store.installations[idx].updatedAt = new Date().toISOString();

  writeStore(store);
  return store.installations[idx];
}

// ── Warranty Certificate Management ───────────────────────────────────────────

export async function generateWarrantyCertificate(input: {
  salesOrderId?: string | null;
  customerName: string;
  siteAddress: string;
  district: string;
  warrantyPeriodYears?: 10 | 15;
  coveredDoors: Array<{ doorId: string; model: string; sizeMm: string }>;
}): Promise<WarrantyCertificate> {
  const store = readStore();
  const years = input.warrantyPeriodYears || 10;
  const validFrom = new Date().toISOString().split('T')[0];
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + years);
  const validUntil = expiryDate.toISOString().split('T')[0];

  const cert: WarrantyCertificate = {
    certificateNumber: generateWarrantyNumber(store.warranties.length),
    salesOrderId: input.salesOrderId || null,
    customerName: input.customerName,
    siteAddress: input.siteAddress,
    district: input.district,
    warrantyPeriodYears: years,
    validFrom,
    validUntil,
    coveredDoors: input.coveredDoors,
    coverageScope: 'FRP DOOR MATERIAL ONLY (100% Water, Termite & Borer Proof Body)',
    explicitExclusions: [
      'SS Hinges, Tower Bolts, Handles, and Lock Hardware sets',
      'Surface PU Paints, Foiling, and Cosmetic finish weathering',
      'Damage arising from civil structure settlement or accidental mechanical impact',
      'Unapproved modifications, thermal burns, or acidic chemical washing',
    ],
    bilingualCareInstructions: {
      english: [
        'Clean door surfaces with mild soapy water and a soft cotton cloth only.',
        'Never use acidic floor cleaners, wire brushes, or harsh solvents on FRP doors.',
        'Ensure SS hinges are lubricated with silicone or machine oil every 6 months.',
      ],
      malayalam: [
        'ഡോർ വൃത്തിയാക്കാൻ വീര്യം കുറഞ്ഞ സോപ്പ് വെള്ളവും കോട്ടൺ തുണിയും മാത്രം ഉപയോഗിക്കുക.',
        'ആസിഡ്, ഫിനോയിൽ അല്ലെങ്കിൽ കഠിനമായ കെമിക്കലുകൾ ഡോറിൽ ഒഴിക്കരുത്.',
        'ഹിഞ്ചുകൾ (Hinges) 6 മാസത്തിലൊരിക്കൽ ഓയിൽ ഇട്ട് സുഗമമായി പ്രവർത്തിക്കുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക.',
      ],
    },
    issuedAt: new Date().toISOString(),
  };

  store.warranties.push(cert);
  writeStore(store);
  return cert;
}

export async function listWarranties(): Promise<WarrantyCertificate[]> {
  const store = readStore();
  return store.warranties;
}
