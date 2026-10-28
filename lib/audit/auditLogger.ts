import prisma from '@/lib/prisma';

export interface AuditLogInput {
  userId?: string | null;
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
    | string;
  entityType:
    | 'USER'
    | 'AUTH'
    | 'ORDER'
    | 'QUOTATION'
    | 'PRODUCTION'
    | 'INVENTORY'
    | 'PAYMENT'
    | 'CUSTOMER'
    | 'SETTINGS'
    | string;
  entityId?: string | null;
  details?: Record<string, unknown> | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// In-memory buffer for audit logs when database is not yet migrated
const memoryAuditLogs: (AuditLogInput & { id: string; createdAt: Date })[] = [];

/**
 * Server-side audit logging function for EXMARK ERP compliance.
 * Attempts database write with seamless in-memory fallback.
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  const serializedDetails =
    typeof input.details === 'object' && input.details !== null
      ? JSON.stringify(input.details)
      : (input.details as string) || null;

  try {
    if (process.env.DATABASE_URL) {
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
      return;
    }
  } catch {
    // If database connection is not active or table does not exist, safely fall back to memory
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuditLogger Fallback] Database write deferred, saved to memory buffer:', input.action, input.entityType);
    }
  }

  // Push to memory audit logs
  memoryAuditLogs.unshift({
    ...input,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date(),
  });

  if (memoryAuditLogs.length > 100) {
    memoryAuditLogs.pop();
  }
}

/**
 * Retrieve recent audit logs (from DB or memory fallback)
 */
export async function getRecentAuditLogs(limit = 20) {
  try {
    if (process.env.DATABASE_URL) {
      const logs = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true, role: { select: { name: true } } },
          },
        },
      });
      if (logs.length > 0) return logs;
    }
  } catch {
    // Fall back to memory
  }

  return memoryAuditLogs.slice(0, limit);
}
