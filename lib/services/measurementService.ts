import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import { DoorItemInput, SiteMeasurementRecord } from '@/types/measurements';
import {
  isPostgresAvailable,
  assertWriteAllowed,
  enqueueOutbox,
  reconcileOutboxToPostgres,
  getOutbox,
  SyncStatus,
  DatabaseProvider,
} from './dbSyncEngine';

export type { DoorItemInput, SiteMeasurementRecord };

export interface MeasurementSaveResult {
  record: SiteMeasurementRecord;
  authoritativeDatabase: DatabaseProvider;
  syncStatus: SyncStatus;
  message: string;
}

const STORE_PATH = path.join(process.cwd(), 'data', 'measurements-store.json');

// Initial default seed measurements matching Kerala door sites
const INITIAL_RECORDS: SiteMeasurementRecord[] = [
  {
    id: 'dm-101',
    refNumber: 'MSR-2026-088',
    customerId: 'cust-2',
    customerName: 'Skyline Foundations, Ernakulam',
    orderRef: 'EXM-2026-1081',
    siteName: 'Skyline Palm Springs Tower B (Flats 101-108)',
    siteAddress: 'Infopark Expressway, Kakkanad, Kochi',
    district: 'Ernakulam',
    totalOpenings: 4,
    engineerName: 'Anoop Krishnan (Sr. Site Engineer)',
    date: '2026-10-25',
    rebateDepthMm: '100x65mm rebate with 12mm tile offset',
    wallThicknessMm: '125mm RCC wall',
    notes: 'Bathrooms have 12mm tile step rebate. Water-barrier threshold required.',
    status: 'SENT_TO_PRODUCTION',
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T14:30:00.000Z',
    doors: [
      {
        id: 'door-101-1',
        doorNumber: 'D1 - Master Bath (Flat 101)',
        model: 'WPC Solid Waterproof Bathroom Door (30mm)',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Frost White',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Bathroom Baby Latch / Coin-Turn Latch',
        measurementUnit: 'MM',
        heightLeft: 2095,
        heightRight: 2098,
        widthTop: 755,
        widthBottom: 752,
        wallThickness: '125mm',
        rebateDepth: '35mm',
        remarks: 'Bottom tile offset 12mm completed. Pre-fit sealing gasket.',
      },
      {
        id: 'door-101-2',
        doorNumber: 'D2 - Guest Bath (Flat 101)',
        model: 'WPC Solid Waterproof Bathroom Door (30mm)',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Frost White',
        hingeSide: 'Right Hand (RH)',
        lockType: 'Bathroom Baby Latch / Coin-Turn Latch',
        measurementUnit: 'MM',
        heightLeft: 2100,
        heightRight: 2102,
        widthTop: 750,
        widthBottom: 750,
        wallThickness: '125mm',
        rebateDepth: '35mm',
        remarks: 'Plumb vertical alignment verified.',
      },
      {
        id: 'door-101-3',
        doorNumber: 'D3 - Bed 1 (Flat 101)',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Burma Teak',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2125,
        heightRight: 2125,
        widthTop: 915,
        widthBottom: 914,
        wallThickness: '150mm',
        rebateDepth: '38mm',
        remarks: 'Architrave on outer hallway side.',
      },
      {
        id: 'door-101-4',
        doorNumber: 'D4 - Bed 2 (Flat 101)',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Burma Teak',
        hingeSide: 'Right Hand (RH)',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2125,
        heightRight: 2128,
        widthTop: 915,
        widthBottom: 916,
        wallThickness: '150mm',
        rebateDepth: '38mm',
        remarks: 'Standard bedroom rebate.',
      },
    ],
  },
  {
    id: 'dm-102',
    refNumber: 'MSR-2026-089',
    customerId: 'cust-1',
    customerName: 'Malabar Luxury Builders, Kozhikode',
    orderRef: 'EXM-2026-1082',
    siteName: 'Kallai Riverfront Luxury Villas (#12)',
    siteAddress: 'Feroke - Kallai Road, Kozhikode',
    district: 'Kozhikode',
    totalOpenings: 3,
    engineerName: 'Faisal Mohammed (Site Measurement Tech)',
    date: '2026-10-26',
    rebateDepthMm: '125x75mm heavy architrave fitting',
    wallThicknessMm: '200mm Laterite stone wall with plaster',
    notes: 'High coastal moisture exposure. Heavy teak carved skin required.',
    status: 'VERIFIED',
    createdAt: '2026-10-26T11:30:00.000Z',
    updatedAt: '2026-10-26T15:00:00.000Z',
    doors: [
      {
        id: 'door-102-1',
        doorNumber: 'D1 - Grand Main Entrance',
        model: 'FRP CNC Carved Luxury Main Door (35mm with Inlay)',
        frameType: 'FRP Wrap-Around Monolithic Frame',
        colour: 'Rosewood Classical Kerala Finish',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Digital Smart Lock Routing Prep',
        measurementUnit: 'MM',
        heightLeft: 2150,
        heightRight: 2152,
        widthTop: 1065,
        widthBottom: 1068,
        wallThickness: '200mm',
        rebateDepth: '45mm',
        remarks: 'Heavy antique brass stud accents. Double weather gasket.',
      },
      {
        id: 'door-102-2',
        doorNumber: 'D2 - Living to Courtyard',
        model: 'Solid Hybrid Weather-Shield Exterior Door (35mm)',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Burma Teak',
        hingeSide: 'Right Hand (RH)',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2130,
        heightRight: 2130,
        widthTop: 915,
        widthBottom: 915,
        wallThickness: '200mm',
        rebateDepth: '38mm',
        remarks: 'Direct monsoon rain exposure on exterior face.',
      },
      {
        id: 'door-102-3',
        doorNumber: 'D3 - Kitchen Service Entrance',
        model: 'WPC Heavy Frame & Shutter Combination (32mm)',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Walnut Dark Brown',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Cylindrical Knob Lock (SS 304)',
        measurementUnit: 'MM',
        heightLeft: 2100,
        heightRight: 2095,
        widthTop: 810,
        widthBottom: 812,
        wallThickness: '200mm',
        rebateDepth: '38mm',
        remarks: 'Laterite jamb slightly out of square on left.',
      },
    ],
  },
  {
    id: 'dm-103',
    refNumber: 'MSR-2026-090',
    customerId: 'cust-4',
    customerName: 'Ar. Sandeep Menon (Thrissur)',
    orderRef: 'EXM-2026-1080',
    siteName: 'Sobha City Villa #42 (Renovation)',
    siteAddress: 'Puzhakkal Padam, Thrissur',
    district: 'Thrissur',
    totalOpenings: 2,
    engineerName: 'Anoop Krishnan',
    date: '2026-10-27',
    rebateDepthMm: 'Standard 100mm masonry wall',
    wallThicknessMm: '100mm brick wall',
    notes: 'Draft measurements recorded for client review.',
    status: 'DRAFT',
    createdAt: '2026-10-27T09:00:00.000Z',
    updatedAt: '2026-10-27T09:00:00.000Z',
    doors: [
      {
        id: 'door-103-1',
        doorNumber: 'D1 - Dining to Utility',
        model: 'WPC Solid Waterproof Bathroom Door (30mm)',
        frameType: 'Existing Wooden Rebate Refit',
        colour: 'Frost White',
        hingeSide: 'Right Hand (RH)',
        lockType: 'Bathroom Baby Latch / Coin-Turn Latch',
        measurementUnit: 'MM',
        heightLeft: 2085,
        heightRight: 2088,
        widthTop: 760,
        widthBottom: 762,
        wallThickness: '100mm',
        rebateDepth: '35mm',
        remarks: 'Fitting into existing teak frame rebate.',
      },
      {
        id: 'door-103-2',
        doorNumber: 'D2 - Terrace Door',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Natural Teak Gold',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2110,
        heightRight: 2110,
        widthTop: 860,
        widthBottom: 860,
        wallThickness: '100mm',
        rebateDepth: '38mm',
        remarks: 'High wind and rain exposure on terrace.',
      },
    ],
  },
];

// In-memory cache for fast responsive reads
let cachedRecords: SiteMeasurementRecord[] | null = null;

function ensureFileStore(): SiteMeasurementRecord[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_RECORDS, null, 2), 'utf8');
      cachedRecords = INITIAL_RECORDS;
      return cachedRecords;
    }

    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedRecords = parsed;
      return parsed;
    }
    return INITIAL_RECORDS;
  } catch (err) {
    console.error('[MeasurementService] Failed to read store:', err);
    return cachedRecords || INITIAL_RECORDS;
  }
}

function persistToFile(records: SiteMeasurementRecord[]) {
  cachedRecords = records;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('[MeasurementService] Failed to write file store:', err);
  }
}

/**
 * Get all site measurements (attempts PostgreSQL, merges outbox, falls back to persistent store)
 */
export async function getAllMeasurements(): Promise<SiteMeasurementRecord[]> {
  const isOnline = await isPostgresAvailable();

  if (isOnline) {
    try {
      // Reconcile any pending outbox entries created during offline periods first
      await reconcileOutboxToPostgres();

      const dbRecords = await prisma.doorMeasurement.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          doors: true,
          customer: { select: { name: true, firmName: true } },
          measuredBy: { select: { firstName: true, lastName: true } },
        },
      });

      if (dbRecords && dbRecords.length > 0) {
        const mappedDb: SiteMeasurementRecord[] = dbRecords.map((m) => ({
          id: m.id,
          refNumber: m.refNumber,
          customerId: m.customerId,
          customerName: m.customerName || (m.customer ? `${m.customer.name} (${m.customer.firmName || ''})` : null),
          orderRef: m.orderRef,
          siteName: m.siteName,
          siteAddress: m.siteAddress,
          district: m.district,
          totalOpenings: m.totalOpenings,
          measuredById: m.measuredById,
          engineerName: m.engineerName || (m.measuredBy ? `${m.measuredBy.firstName} ${m.measuredBy.lastName}` : null),
          date: m.date ? m.date.toISOString().split('T')[0] : '',
          rebateDepthMm: m.rebateDepthMm,
          wallThicknessMm: m.wallThicknessMm,
          notes: m.notes,
          status: m.status as SiteMeasurementRecord['status'],
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          doors: (m.doors || []).map((d) => ({
            id: d.id,
            doorNumber: d.doorNumber,
            model: d.model,
            frameType: d.frameType,
            colour: d.colour,
            hingeSide: d.hingeSide,
            lockType: d.lockType,
            measurementUnit: (d.measurementUnit as 'MM' | 'CM' | 'INCH') || 'MM',
            heightLeft: Number(d.heightLeft),
            heightRight: Number(d.heightRight),
            widthTop: Number(d.widthTop),
            widthBottom: Number(d.widthBottom),
            wallThickness: d.wallThickness || undefined,
            rebateDepth: d.rebateDepth || undefined,
            remarks: d.remarks || undefined,
          })),
        }));

        // Merge with any pending outbox items that haven't synced yet
        const outbox = getOutbox().filter((e) => e.entityType === 'DOOR_MEASUREMENT' && e.status === 'PENDING');
        const pendingMeasurements = outbox.map((e) => e.payload as SiteMeasurementRecord);
        const combined = [...pendingMeasurements, ...mappedDb.filter((dbM) => !pendingMeasurements.some((p) => p.id === dbM.id))];

        // Mirror latest combined view to local persistent store for instant offline availability
        persistToFile(combined);
        return combined;
      }
    } catch (err) {
      console.warn('[MeasurementService] PostgreSQL read failed, reading from persistent store:', err);
    }
  }

  return ensureFileStore();
}

/**
 * Get a single site measurement by ID
 */
export async function getMeasurementById(id: string): Promise<SiteMeasurementRecord | null> {
  const all = await getAllMeasurements();
  return all.find((m) => m.id === id || m.refNumber === id) || null;
}

/**
 * Create a new site measurement with multiple doors
 * Supports strict PostgreSQL enforcement or resilient offline outbox synchronization
 */
export async function createMeasurement(
  input: Omit<SiteMeasurementRecord, 'id' | 'createdAt' | 'updatedAt'>,
  options?: { strictPostgres?: boolean }
): Promise<SiteMeasurementRecord> {
  const id = `dm-${Date.now()}`;
  const now = new Date().toISOString();

  // Generate reference number if missing
  const refNumber = input.refNumber || `MSR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const record: SiteMeasurementRecord = {
    ...input,
    id,
    refNumber,
    totalOpenings: input.doors?.length || 1,
    createdAt: now,
    updatedAt: now,
    doors: (input.doors || []).map((d, index) => ({
      ...d,
      id: d.id || `door-${Date.now()}-${index + 1}`,
      measurementUnit: d.measurementUnit || 'MM',
    })),
  };

  const isOnline = await isPostgresAvailable();
  await assertWriteAllowed('Site Measurement Creation');

  // If caller strictly demands PostgreSQL commitment and PostgreSQL is unavailable, fail safely
  if (options?.strictPostgres && !isOnline) {
    throw new Error('DATABASE_OFFLINE: PostgreSQL authoritative database is unreachable. Write rejected under strict consistency policy.');
  }

  let committedToPostgres = false;

  if (isOnline) {
    try {
      const created = await prisma.doorMeasurement.create({
        data: {
          id: record.id,
          refNumber: record.refNumber,
          customerId: record.customerId || null,
          customerName: record.customerName || null,
          orderRef: record.orderRef || null,
          siteName: record.siteName,
          siteAddress: record.siteAddress || null,
          district: record.district,
          totalOpenings: record.totalOpenings,
          measuredById: record.measuredById || null,
          engineerName: record.engineerName || null,
          date: new Date(record.date || Date.now()),
          rebateDepthMm: record.rebateDepthMm || null,
          wallThicknessMm: record.wallThicknessMm || null,
          notes: record.notes || null,
          status: record.status,
          doors: {
            create: record.doors.map((d) => ({
              doorNumber: d.doorNumber,
              model: d.model,
              frameType: d.frameType,
              colour: d.colour,
              hingeSide: d.hingeSide,
              lockType: d.lockType,
              measurementUnit: d.measurementUnit,
              heightLeft: d.heightLeft,
              heightRight: d.heightRight,
              widthTop: d.widthTop,
              widthBottom: d.widthBottom,
              wallThickness: d.wallThickness || null,
              rebateDepth: d.rebateDepth || null,
              remarks: d.remarks || null,
            })),
          },
        },
      });

      committedToPostgres = true;

      await logAuditEvent({
        action: 'CREATE',
        entityType: 'ORDER',
        entityId: created.id,
        details: { refNumber: created.refNumber, siteName: created.siteName, doorsCount: record.doors.length },
      });
    } catch (err) {
      if (options?.strictPostgres) {
        throw new Error(`DATABASE_WRITE_FAILED: Failed to commit to PostgreSQL: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('[MeasurementService] PostgreSQL write deferred to outbox queue:', err);
    }
  }

  // If not committed to PostgreSQL directly, enqueue in Outbox sync queue to prevent data loss or invisibility
  if (!committedToPostgres) {
    enqueueOutbox('DOOR_MEASUREMENT', record.id, 'CREATE', record);
  }

  // Write to durable local store atomically so it immediately survives F5 refresh & server restart
  const current = ensureFileStore();
  const updated = [record, ...current.filter((m) => m.id !== record.id)];
  persistToFile(updated);

  await logAuditEvent({
    action: 'CREATE',
    entityType: 'ORDER',
    entityId: record.id,
    details: {
      refNumber: record.refNumber,
      siteName: record.siteName,
      doors: record.doors.length,
      committedToPostgres,
    },
  });

  return record;
}

/**
 * Update an existing site measurement
 */
export async function updateMeasurement(
  id: string,
  input: Partial<SiteMeasurementRecord>,
  options?: { strictPostgres?: boolean }
): Promise<SiteMeasurementRecord> {
  const current = ensureFileStore();
  const existing = current.find((m) => m.id === id || m.refNumber === id);

  if (!existing) {
    throw new Error(`Site measurement record ${id} not found.`);
  }

  const updatedRecord: SiteMeasurementRecord = {
    ...existing,
    ...input,
    id: existing.id,
    refNumber: existing.refNumber,
    updatedAt: new Date().toISOString(),
    totalOpenings: input.doors ? input.doors.length : existing.totalOpenings,
    doors: input.doors || existing.doors,
  };

  const isOnline = await isPostgresAvailable();
  await assertWriteAllowed('Site Measurement Creation');

  if (options?.strictPostgres && !isOnline) {
    throw new Error('DATABASE_OFFLINE: PostgreSQL authoritative database is unreachable. Update rejected under strict consistency policy.');
  }

  let committedToPostgres = false;

  if (isOnline) {
    try {
      await prisma.doorMeasurement.update({
        where: { id: existing.id },
        data: {
          siteName: updatedRecord.siteName,
          siteAddress: updatedRecord.siteAddress,
          district: updatedRecord.district,
          customerName: updatedRecord.customerName,
          orderRef: updatedRecord.orderRef,
          engineerName: updatedRecord.engineerName,
          totalOpenings: updatedRecord.totalOpenings,
          rebateDepthMm: updatedRecord.rebateDepthMm,
          wallThicknessMm: updatedRecord.wallThicknessMm,
          notes: updatedRecord.notes,
          status: updatedRecord.status,
          date: new Date(updatedRecord.date),
        },
      });

      if (input.doors) {
        await prisma.doorMeasurementItem.deleteMany({
          where: { measurementId: existing.id },
        });

        await prisma.doorMeasurementItem.createMany({
          data: updatedRecord.doors.map((d) => ({
            measurementId: existing.id,
            doorNumber: d.doorNumber,
            model: d.model,
            frameType: d.frameType,
            colour: d.colour,
            hingeSide: d.hingeSide,
            lockType: d.lockType,
            measurementUnit: d.measurementUnit,
            heightLeft: d.heightLeft,
            heightRight: d.heightRight,
            widthTop: d.widthTop,
            widthBottom: d.widthBottom,
            wallThickness: d.wallThickness || null,
            rebateDepth: d.rebateDepth || null,
            remarks: d.remarks || null,
          })),
        });
      }

      committedToPostgres = true;
    } catch (err) {
      if (options?.strictPostgres) {
        throw new Error(`DATABASE_UPDATE_FAILED: Failed to update in PostgreSQL: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('[MeasurementService] PostgreSQL update deferred to outbox queue:', err);
    }
  }

  if (!committedToPostgres) {
    enqueueOutbox('DOOR_MEASUREMENT', updatedRecord.id, 'UPDATE', updatedRecord);
  }

  // Update persistent local store
  const updatedAll = current.map((m) => (m.id === existing.id ? updatedRecord : m));
  persistToFile(updatedAll);

  await logAuditEvent({
    action: 'UPDATE',
    entityType: 'ORDER',
    entityId: existing.id,
    details: { refNumber: existing.refNumber, status: updatedRecord.status },
  });

  return updatedRecord;
}
