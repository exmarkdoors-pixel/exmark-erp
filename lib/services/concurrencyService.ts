import fs from 'fs';
import path from 'path';

export interface ConcurrencyRecord {
  entityType: 'MEASUREMENT' | 'QUOTATION' | 'SALES_ORDER' | 'JOB_CARD' | 'CUSTOMER';
  entityId: string;
  version: number;
  lastModifiedAt: string;
  lastModifiedBy: string;
}

export interface ActiveSessionLease {
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  terminalIp?: string;
  leaseAcquiredAt: string;
  expiresAt: string;
}

export interface ConcurrencyStore {
  versions: ConcurrencyRecord[];
  leases: ActiveSessionLease[];
}

const STORE_PATH = path.join(process.cwd(), 'data', 'concurrency-store.json');
const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minute lock lease

function readStore(): ConcurrencyStore {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      const initial: ConcurrencyStore = { versions: [], leases: [] };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const valid = parsed as ConcurrencyStore;
    return {
      versions: Array.isArray(valid.versions) ? valid.versions : [],
      leases: Array.isArray(valid.leases) ? valid.leases : [],
    };
  } catch {
    return { versions: [], leases: [] };
  }
}

function writeStore(store: ConcurrencyStore): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[concurrencyService] Failed to write store:', err);
  }
}

/**
 * Validates optimistic concurrency version.
 * If expectedVersion matches current version, increments version by 1 and returns success.
 * If expectedVersion is less than current version, returns a CONFLICT error.
 */
export async function validateAndBumpVersion(input: {
  entityType: ConcurrencyRecord['entityType'];
  entityId: string;
  expectedVersion: number;
  modifiedBy: string;
}): Promise<{
  success: boolean;
  newVersion?: number;
  currentVersion?: number;
  conflict?: boolean;
  message?: string;
}> {
  const store = readStore();
  const existing = store.versions.find(
    (v) => v.entityType === input.entityType && v.entityId === input.entityId
  );

  const nowIso = new Date().toISOString();

  // If entity is not yet tracked in concurrency store
  if (!existing) {
    const newVersion = input.expectedVersion === 0 ? 1 : input.expectedVersion + 1;
    const newRecord: ConcurrencyRecord = {
      entityType: input.entityType,
      entityId: input.entityId,
      version: newVersion,
      lastModifiedAt: nowIso,
      lastModifiedBy: input.modifiedBy,
    };
    store.versions.push(newRecord);
    writeStore(store);
    return { success: true, newVersion };
  }

  // Check version match
  if (existing.version !== input.expectedVersion) {
    return {
      success: false,
      conflict: true,
      currentVersion: existing.version,
      message: `Conflict detected: Record was modified by ${existing.lastModifiedBy} at ${existing.lastModifiedAt}. Current version is ${existing.version}, but you submitted based on version ${input.expectedVersion}. Please reload to avoid overwriting recent changes.`,
    };
  }

  // Increment version
  existing.version += 1;
  existing.lastModifiedAt = nowIso;
  existing.lastModifiedBy = input.modifiedBy;
  writeStore(store);

  return { success: true, newVersion: existing.version };
}

/**
 * Acquire or refresh an editing lease on an entity to alert concurrent office users.
 */
export async function acquireOrHeartbeatLease(input: {
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  terminalIp?: string;
}): Promise<{ acquired: boolean; activeLease?: ActiveSessionLease; conflictUser?: string }> {
  const store = readStore();
  const now = Date.now();

  // Purge expired leases
  store.leases = store.leases.filter((l) => new Date(l.expiresAt).getTime() > now);

  const existingLease = store.leases.find(
    (l) => l.entityType === input.entityType && l.entityId === input.entityId
  );

  if (existingLease && existingLease.userId !== input.userId) {
    // Another user holds an active unexpired lease
    return {
      acquired: false,
      conflictUser: existingLease.userName,
      activeLease: existingLease,
    };
  }

  const expiresAt = new Date(now + LEASE_DURATION_MS).toISOString();

  if (existingLease) {
    // Refresh heartbeat
    existingLease.expiresAt = expiresAt;
  } else {
    // Add new lease
    store.leases.push({
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      userName: input.userName,
      terminalIp: input.terminalIp,
      leaseAcquiredAt: new Date(now).toISOString(),
      expiresAt,
    });
  }

  writeStore(store);
  return { acquired: true };
}

/**
 * Release editing lease when user closes modal or navigates away.
 */
export async function releaseLease(
  entityType: string,
  entityId: string,
  userId: string
): Promise<void> {
  const store = readStore();
  store.leases = store.leases.filter(
    (l) => !(l.entityType === entityType && l.entityId === entityId && l.userId === userId)
  );
  writeStore(store);
}

/**
 * Get current version of an entity.
 */
export async function getEntityVersion(
  entityType: ConcurrencyRecord['entityType'],
  entityId: string
): Promise<number> {
  const store = readStore();
  const existing = store.versions.find(
    (v) => v.entityType === entityType && v.entityId === entityId
  );
  return existing ? existing.version : 1;
}
