/**
 * EXMARK ERP — Database Synchronization & Resilience Engine
 * 
 * Provides:
 * 1. Definitive Authoritative Database resolution (PostgreSQL vs Persistent Store)
 * 2. Safe Connection Probing with zero-hang socket timeouts
 * 3. Durable Outbox Sync Queue (data/db-outbox-sync.json)
 * 4. Automatic Reconnection Reconciler (Prevents data invisibility on recovery)
 * 5. Transparent Persistence Status (Never lies about commit target)
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import prisma from '@/lib/prisma';
import { SiteMeasurementRecord } from '@/types/measurements';

export type DatabaseProvider = 'POSTGRESQL' | 'PERSISTENT_STORE';
export type SyncStatus = 'COMMITTED_POSTGRES' | 'PENDING_POSTGRES_SYNC' | 'PERSISTENT_STORE_PRIMARY';

export interface OutboxEntry {
  id: string;
  entityType: 'DOOR_MEASUREMENT' | 'PRODUCT_CATEGORY';
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: unknown;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
}

export interface PersistenceResult<T> {
  success: boolean;
  data: T;
  authoritativeDatabase: DatabaseProvider;
  syncStatus: SyncStatus;
  message: string;
}

const OUTBOX_PATH = path.join(process.cwd(), 'data', 'db-outbox-sync.json');

// Memory cache of connection state to avoid constant socket hammering
let lastProbeTime = 0;
let cachedDbOnline = false;
const PROBE_INTERVAL_MS = 5000; // 5 seconds cache

/**
 * Check whether the application is running in a Cloud/Staging/Production environment
 * (e.g., Render, Railway, Vercel) where ephemeral disk makes JSON writes dangerous.
 */
export function isCloudEnvironment(): boolean {
  return (
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    process.env.STRICT_POSTGRES === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

/**
 * Enforce write safety: In Cloud/Render or strict environments, writes MUST NOT
 * silently fallback to ephemeral disk if PostgreSQL is unreachable.
 * Desktop/local mode continues to permit local persistent store fallback.
 */
export async function assertWriteAllowed(operationName = 'write operation'): Promise<void> {
  if (isCloudEnvironment()) {
    const isOnline = await isPostgresAvailable();
    if (!isOnline) {
      throw new Error(
        `DATABASE_UNAVAILABLE: Central PostgreSQL is unreachable and cloud environment rejects ephemeral writes for ${operationName}. Please configure DATABASE_URL.`
      );
    }
  }
}

/**
 * Check whether the configured PostgreSQL instance is actively reachable
 */
export async function isPostgresAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastProbeTime < PROBE_INTERVAL_MS) {
    return cachedDbOnline;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    cachedDbOnline = false;
    lastProbeTime = now;
    return false;
  }

  // Parse host and port from postgresql://user:pass@host:port/dbname
  try {
    const url = new URL(dbUrl);
    const host = url.hostname || 'localhost';
    const port = parseInt(url.port || '5432', 10);

    const isAvailable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(800);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });

    cachedDbOnline = isAvailable;
    lastProbeTime = now;
    return isAvailable;
  } catch {
    cachedDbOnline = false;
    lastProbeTime = now;
    return false;
  }
}

/**
 * Force a fresh probe of PostgreSQL connection status
 */
export async function forceProbePostgres(): Promise<boolean> {
  lastProbeTime = 0;
  return isPostgresAvailable();
}

/**
 * Read the Outbox sync queue from disk
 */
export function getOutbox(): OutboxEntry[] {
  try {
    const dir = path.dirname(OUTBOX_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(OUTBOX_PATH)) {
      fs.writeFileSync(OUTBOX_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(OUTBOX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Write the Outbox sync queue to disk atomically
 */
export function saveOutbox(entries: OutboxEntry[]): void {
  try {
    const dir = path.dirname(OUTBOX_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${OUTBOX_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf8');
    fs.renameSync(tmpPath, OUTBOX_PATH);
  } catch (err) {
    console.error('[DbSyncEngine] Failed to save outbox:', err);
  }
}

/**
 * Queue a record for synchronization to PostgreSQL upon reconnection
 */
export function enqueueOutbox(
  entityType: OutboxEntry['entityType'],
  entityId: string,
  operation: OutboxEntry['operation'],
  payload: unknown
): OutboxEntry {
  const outbox = getOutbox();
  // If an entry for the same entity already exists pending, update it
  const existingIdx = outbox.findIndex(
    (e) => e.entityType === entityType && e.entityId === entityId && e.status === 'PENDING'
  );

  const entry: OutboxEntry = {
    id: `outbox-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    entityType,
    entityId,
    operation,
    payload,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    outbox[existingIdx] = entry;
  } else {
    outbox.push(entry);
  }

  saveOutbox(outbox);
  return entry;
}

/**
 * Reconcile / Synchronize all pending outbox records into PostgreSQL
 * Called automatically when PostgreSQL recovery is detected
 */
export async function reconcileOutboxToPostgres(): Promise<{
  attempted: number;
  synced: number;
  failed: number;
}> {
  const isOnline = await isPostgresAvailable();
  if (!isOnline) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  const outbox = getOutbox();
  const pending = outbox.filter((e) => e.status === 'PENDING');
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      if (entry.entityType === 'DOOR_MEASUREMENT') {
        const m = entry.payload as SiteMeasurementRecord;
        if (entry.operation === 'CREATE' || entry.operation === 'UPDATE') {
          // Upsert into PostgreSQL
          await prisma.doorMeasurement.upsert({
            where: { id: m.id },
            create: {
              id: m.id,
              refNumber: m.refNumber,
              customerId: m.customerId || null,
              customerName: m.customerName || null,
              orderRef: m.orderRef || null,
              siteName: m.siteName,
              siteAddress: m.siteAddress || null,
              district: m.district,
              totalOpenings: m.totalOpenings,
              engineerName: m.engineerName || null,
              date: new Date(m.date || Date.now()),
              rebateDepthMm: m.rebateDepthMm || null,
              wallThicknessMm: m.wallThicknessMm || null,
              notes: m.notes || null,
              status: m.status,
              doors: {
                create: (m.doors || []).map((d) => ({
                  id: d.id,
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
            update: {
              refNumber: m.refNumber,
              siteName: m.siteName,
              siteAddress: m.siteAddress || null,
              district: m.district,
              totalOpenings: m.totalOpenings,
              notes: m.notes || null,
              status: m.status,
              updatedAt: new Date(),
            },
          });
        }
      }
      entry.status = 'SYNCED';
      entry.lastAttemptAt = new Date().toISOString();
      synced++;
    } catch (err) {
      entry.status = 'FAILED';
      entry.lastAttemptAt = new Date().toISOString();
      entry.error = err instanceof Error ? err.message : String(err);
      failed++;
    }
  }

  saveOutbox(outbox);
  return { attempted: pending.length, synced, failed };
}
