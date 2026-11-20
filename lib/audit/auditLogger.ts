import fs from 'fs';
import prisma from '@/lib/prisma';
import { isPostgresAvailable } from '@/lib/services/dbSyncEngine';
import { getDataFilePath, writeJsonSafe } from '@/lib/utils/dataPaths';

export interface AuditLogInput {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'APPROVAL'
    | 'STATUS_CHANGE'
    | 'ACCESS_DENIED'
    | 'SETTINGS_DRAFT_SAVED'
    | 'SETTINGS_PUBLISHED'
    | 'SETTINGS_ROLLBACK'
    | 'BOQ_ISSUED'
    | 'BOQ_VOUCHER_EDITED'
    | 'BOQ_BATCH_REVERSED'
    | 'BOQ_VOUCHER_REVERSED'
    | 'INVENTORY_COUNT_ADJUSTED'
    | string;
  entityType:
    | 'USER'
    | 'AUTH'
    | 'ORDER'
    | 'QUOTATION'
    | 'PRODUCTION'
    | 'INVENTORY'
    | 'BOQ'
    | 'PAYMENT'
    | 'FINANCE'
    | 'CUSTOMER'
    | 'PURCHASE'
    | 'SETTINGS'
    | string;
  entityId?: string | null;
  summary?: string;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string; // ISO string
  userId: string | null;
  userName: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// In-memory buffer for fast runtime queries
const memoryAuditLogs: AuditLogRecord[] = [];
const MAX_PERSISTED_AUDIT_LOGS = 10000;

function readAuditStore(): AuditLogRecord[] {
  try {
    const filePath = getDataFilePath('audit-logs-store.json');
    if (!fs.existsSync(filePath)) {
      writeJsonSafe(filePath, []);
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAuditStore(records: AuditLogRecord[]): void {
  try {
    const filePath = getDataFilePath('audit-logs-store.json');
    writeJsonSafe(filePath, records);
  } catch (err) {
    console.error('[AuditLogger] Failed to write store:', err);
  }
}

function buildDefaultSummary(input: AuditLogInput): string {
  if (input.summary && input.summary.trim()) {
    return input.summary.trim();
  }
  const entityDesc = input.entityId ? `${input.entityType} #${input.entityId}` : input.entityType;
  switch (input.action) {
    case 'CREATE':
      return `Created new ${entityDesc}`;
    case 'UPDATE':
      return `Updated details of ${entityDesc}`;
    case 'DELETE':
      return `Deleted ${entityDesc}`;
    case 'BOQ_ISSUED':
      return `Issued raw materials for BOQ voucher ${input.entityId || ''}`.trim();
    case 'BOQ_VOUCHER_EDITED':
      return `Edited issued BOQ voucher ${input.entityId || ''}`.trim();
    case 'BOQ_BATCH_REVERSED':
    case 'BOQ_VOUCHER_REVERSED':
      return `Reversed BOQ voucher ${input.entityId || ''}`.trim();
    case 'INVENTORY_COUNT_ADJUSTED':
      return `Adjusted inventory stock for ${input.entityId || 'materials'}`;
    case 'SETTINGS_PUBLISHED':
      return `Published system configuration settings`;
    case 'STATUS_CHANGE':
      return `Changed status for ${entityDesc}`;
    default:
      return `${input.action} on ${entityDesc}`;
  }
}

/**
 * Server-side audit logging function for EXMARK ERP compliance.
 * Persists permanently to JSON store and attempts PostgreSQL write.
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  const parsedDetails: Record<string, unknown> | null =
    typeof input.details === 'object' && input.details !== null
      ? (input.details as Record<string, unknown>)
      : typeof input.details === 'string'
      ? { message: input.details }
      : null;

  const serializedDetails = parsedDetails ? JSON.stringify(parsedDetails) : null;
  const summary = buildDefaultSummary(input);
  const now = new Date();

  const record: AuditLogRecord = {
    id: `audit-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    userId: input.userId || null,
    userName: input.userName || (input.userId ? `User (${input.userId})` : 'System / Staff'),
    userRole: input.userRole || null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId || null,
    summary,
    details: parsedDetails,
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
  };

  // 1. Write to PostgreSQL if active
  try {
    if (await isPostgresAvailable()) {
      await prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId || null,
          details: serializedDetails,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
        },
      });
    }
  } catch {
    // Database write deferred, continue with local JSON store
  }

  // 2. Write to persistent JSON store
  try {
    const all = readAuditStore();
    all.unshift(record);
    if (all.length > MAX_PERSISTED_AUDIT_LOGS) {
      all.length = MAX_PERSISTED_AUDIT_LOGS;
    }
    writeAuditStore(all);
  } catch (err) {
    console.error('[AuditLogger] Store write failed:', err);
  }

  // 3. Keep in-memory cache updated
  memoryAuditLogs.unshift(record);
  if (memoryAuditLogs.length > 200) {
    memoryAuditLogs.pop();
  }
}

export interface AuditLogQueryParams {
  search?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogQueryResult {
  logs: AuditLogRecord[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: {
    totalEvents: number;
    todayCount: number;
    createCount: number;
    editCount: number;
    deleteCount: number;
  };
}

/**
 * Fast search & filter query engine across persisted audit logs.
 */
export function queryAuditLogs(params: AuditLogQueryParams = {}): AuditLogQueryResult {
  const all = readAuditStore();

  const search = (params.search || '').trim().toLowerCase();
  const actionFilter = (params.action || 'ALL').toUpperCase();
  const entityFilter = (params.entityType || 'ALL').toUpperCase();
  const userFilter = (params.userId || '').trim().toLowerCase();
  const fromDate = params.fromDate ? new Date(params.fromDate) : null;
  const toDate = params.toDate ? new Date(params.toDate) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  // Compute metrics across entire dataset
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayCount = 0;
  let createCount = 0;
  let editCount = 0;
  let deleteCount = 0;

  for (const log of all) {
    if (log.timestamp && log.timestamp.startsWith(todayStr)) {
      todayCount++;
    }
    const a = (log.action || '').toUpperCase();
    if (a.includes('CREATE') || a === 'BOQ_ISSUED') {
      createCount++;
    } else if (a.includes('UPDATE') || a.includes('EDIT') || a === 'BOQ_VOUCHER_EDITED') {
      editCount++;
    } else if (a.includes('DELETE') || a.includes('REVERSE') || a.includes('CANCEL')) {
      deleteCount++;
    }
  }

  // Apply filters
  const filtered = all.filter((log) => {
    if (actionFilter !== 'ALL') {
      const a = (log.action || '').toUpperCase();
      if (actionFilter === 'CREATE' && !a.includes('CREATE') && a !== 'BOQ_ISSUED') return false;
      if (actionFilter === 'UPDATE' && !a.includes('UPDATE') && !a.includes('EDIT') && a !== 'BOQ_VOUCHER_EDITED')
        return false;
      if (actionFilter === 'DELETE' && !a.includes('DELETE') && !a.includes('REVERSE') && !a.includes('CANCEL'))
        return false;
      if (actionFilter === 'BOQ' && !a.startsWith('BOQ_')) return false;
      if (
        actionFilter !== 'CREATE' &&
        actionFilter !== 'UPDATE' &&
        actionFilter !== 'DELETE' &&
        actionFilter !== 'BOQ' &&
        a !== actionFilter
      ) {
        return false;
      }
    }

    if (entityFilter !== 'ALL') {
      const e = (log.entityType || '').toUpperCase();
      if (e !== entityFilter) return false;
    }

    if (userFilter) {
      const uname = (log.userName || '').toLowerCase();
      const uid = (log.userId || '').toLowerCase();
      if (!uname.includes(userFilter) && !uid.includes(userFilter)) return false;
    }

    if (fromDate || toDate) {
      const t = new Date(log.timestamp);
      if (fromDate && t < fromDate) return false;
      if (toDate && t > toDate) return false;
    }

    if (search) {
      const haystack = `${log.summary} ${log.action} ${log.entityType} ${log.entityId || ''} ${
        log.userName || ''
      } ${JSON.stringify(log.details || '')}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(5, Math.min(200, Number(params.limit) || 25));
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedLogs = filtered.slice(startIndex, startIndex + limit);

  return {
    logs: paginatedLogs,
    totalCount,
    page,
    limit,
    totalPages,
    metrics: {
      totalEvents: all.length,
      todayCount,
      createCount,
      editCount,
      deleteCount,
    },
  };
}

/**
 * Retrieve recent audit logs (backward compatible with existing callers)
 */
export async function getRecentAuditLogs(limit = 20): Promise<AuditLogRecord[]> {
  const result = queryAuditLogs({ limit, page: 1 });
  return result.logs;
}

/**
 * Generate CSV representation of audit logs for download.
 */
export function exportAuditLogsToCsv(params: AuditLogQueryParams = {}): string {
  const { logs } = queryAuditLogs({ ...params, limit: 10000, page: 1 });

  const escapeField = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    'Timestamp (IST)',
    'Action Type',
    'Module / Entity',
    'Record Identifier',
    'User Name',
    'User ID',
    'Summary',
    'Details JSON',
    'IP Address',
  ];

  const rows = logs.map((log) => [
    escapeField(new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
    escapeField(log.action),
    escapeField(log.entityType),
    escapeField(log.entityId || '-'),
    escapeField(log.userName || '-'),
    escapeField(log.userId || '-'),
    escapeField(log.summary),
    escapeField(log.details ? JSON.stringify(log.details) : ''),
    escapeField(log.ipAddress || '-'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
