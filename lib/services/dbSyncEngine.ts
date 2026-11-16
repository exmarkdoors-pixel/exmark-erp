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
import type { PrismaClient } from '@prisma/client';
import prisma, { getCloudPrismaClient, sanitizeDatabaseUrl } from '@/lib/prisma';
import { SiteMeasurementRecord } from '@/types/measurements';
import { ProductCategoryConfig } from '@/types/categories';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import { getActiveCloudDatabaseUrl } from './cloudSyncConfigService';

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

const getOutboxPath = () => getDataFilePath('db-outbox-sync.json');

// Memory cache of connection state to avoid constant socket hammering
let lastProbeTime = 0;
let cachedDbOnline = false;
const PROBE_INTERVAL_MS = 5000; // 5 seconds cache

/**
 * Check whether the application is running in a Cloud/Staging/Production environment
 * (e.g., Render, Railway, Vercel) where ephemeral disk makes JSON writes dangerous.
 * Local factory production workstations using EXMARK_DATA_DIR or EXMARK_LOCAL_FACTORY
 * remain permitted to persist safely to the externalized factory data vault.
 */
export function isCloudEnvironment(): boolean {
  if (
    process.env.EXMARK_LOCAL_FACTORY === 'true' ||
    (Boolean(process.env.EXMARK_DATA_DIR?.trim()) && process.env.STRICT_POSTGRES !== 'true')
  ) {
    return false;
  }
  return (
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
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

function sanitizeUrl(raw: string | undefined): string {
  return sanitizeDatabaseUrl(raw);
}

/**
 * Check whether the configured PostgreSQL instance is actively reachable
 */
export async function isPostgresAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastProbeTime < PROBE_INTERVAL_MS) {
    return cachedDbOnline;
  }

  const dbUrl = getActiveCloudDatabaseUrl() || sanitizeUrl(process.env.DATABASE_URL);
  if (!dbUrl) {
    cachedDbOnline = false;
    lastProbeTime = now;
    return false;
  }

  const isCloud = isCloudEnvironment();
  const isLocalhost = dbUrl.includes('localhost:5432') || dbUrl.includes('127.0.0.1');

  // In local development with default localhost placeholder, use fast TCP socket probe
  if (isLocalhost && !isCloud) {
    try {
      const isAvailable = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(600);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(5432, 'localhost');
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

  // Cloud or remote PostgreSQL probe: execute real query with SSL negotiation via dynamic Prisma pool
  try {
    const client = getCloudPrismaClient(dbUrl);
    const queryPromise = client.$queryRaw`SELECT 1 as alive`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Postgres probe timeout (3500ms)')), 3500)
    );

    await Promise.race([queryPromise, timeoutPromise]);
    cachedDbOnline = true;
    lastProbeTime = now;
    return true;
  } catch {
    // Fallback: If prisma client failed (e.g. before schema tables initialized), test TCP socket with 3500ms
    try {
      const url = new URL(dbUrl);
      const host = url.hostname || 'localhost';
      const port = parseInt(url.port || '5432', 10);

      const isAvailable = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3500);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
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
    const outboxPath = getOutboxPath();
    const dir = path.dirname(outboxPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(outboxPath)) {
      fs.writeFileSync(outboxPath, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(outboxPath, 'utf8');
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
    const outboxPath = getOutboxPath();
    const dir = path.dirname(outboxPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${outboxPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf8');
    fs.renameSync(tmpPath, outboxPath);
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
 * Called automatically when PostgreSQL recovery is detected or during cloud sync
 */
export async function reconcileOutboxToPostgres(clientOverride?: PrismaClient): Promise<{
  attempted: number;
  synced: number;
  failed: number;
}> {
  let client = clientOverride;
  if (!client) {
    const isOnline = await isPostgresAvailable();
    if (!isOnline) {
      return { attempted: 0, synced: 0, failed: 0 };
    }
    const dbUrl = getActiveCloudDatabaseUrl() || sanitizeUrl(process.env.DATABASE_URL);
    client = dbUrl ? getCloudPrismaClient(dbUrl) : prisma;
  }

  const outbox = getOutbox();
  const pending = outbox.filter((e) => e.status === 'PENDING');
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      if (entry.entityType === 'DOOR_MEASUREMENT') {
        if (entry.operation === 'DELETE') {
          await client.doorMeasurement.deleteMany({ where: { id: entry.entityId } });
        } else {
          const m = entry.payload as SiteMeasurementRecord;
          const mappedDoors = (m.doors || []).map((d) => ({
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
          }));

          await client.doorMeasurement.upsert({
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
              doors: { create: mappedDoors },
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
              doors: {
                deleteMany: {},
                create: mappedDoors,
              },
            },
          });
        }
      } else if (entry.entityType === 'PRODUCT_CATEGORY') {
        if (entry.operation === 'DELETE') {
          await client.productCategory.deleteMany({ where: { id: entry.entityId } });
        } else {
          const cat = entry.payload as ProductCategoryConfig;
          await client.productCategory.upsert({
            where: { code: cat.code },
            create: {
              id: cat.id,
              code: cat.code,
              name: cat.name,
              enabled: Boolean(cat.enabled),
              isPrimary: Boolean(cat.isPrimary),
              description: cat.description || null,
              fieldsConfig: cat.fields ? JSON.stringify(cat.fields) : null,
              pricingConfig: cat.pricing ? JSON.stringify(cat.pricing) : null,
              productionConfig: cat.production ? JSON.stringify(cat.production) : null,
              reportingVisibility: cat.reportingVisibility !== false,
            },
            update: {
              name: cat.name,
              enabled: Boolean(cat.enabled),
              isPrimary: Boolean(cat.isPrimary),
              description: cat.description || null,
              fieldsConfig: cat.fields ? JSON.stringify(cat.fields) : null,
              pricingConfig: cat.pricing ? JSON.stringify(cat.pricing) : null,
              productionConfig: cat.production ? JSON.stringify(cat.production) : null,
              reportingVisibility: cat.reportingVisibility !== false,
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
