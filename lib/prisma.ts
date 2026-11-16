import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit across Hot Module Replacement (HMR).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  cloudClients: Map<string, PrismaClient> | undefined;
};

export function sanitizeDatabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["'`]|["'`]$/g, '').trim();
  cleaned = cleaned.replace(/^(?:psql\s+|uri:\s*|url:\s*|code:\s*|file:\s*code\s*)/i, '').trim();
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, '').trim();
  const authorityMatch = cleaned.match(/^([a-z0-9+.-]+:\/\/)([^/:?#]+):(.+)@([^/?#]+)(.*)$/i);
  if (authorityMatch) {
    const [, scheme, user, pass, hostPort, tail] = authorityMatch;
    const safePass = pass.replace(/#/g, '%23').replace(/@/g, '%40');
    cleaned = `${scheme}${user}:${safePass}@${hostPort}${tail}`;
  }
  return cleaned;
}

function createPrismaClient(explicitUrl?: string): PrismaClient {
  const connectionString =
    sanitizeDatabaseUrl(explicitUrl) ||
    sanitizeDatabaseUrl(process.env.EXMARK_CLOUD_DATABASE_URL) ||
    sanitizeDatabaseUrl(process.env.DATABASE_URL) ||
    'postgresql://postgres:postgres@localhost:5432/exmark_erp?schema=public';

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Returns a pooled PrismaClient for a specific sanitized PostgreSQL URL
 * (used when Cloud Sync is configured or updated at runtime without restarting).
 */
export function getCloudPrismaClient(overrideUrl?: string): PrismaClient {
  const cleanUrl =
    sanitizeDatabaseUrl(overrideUrl) ||
    sanitizeDatabaseUrl(process.env.EXMARK_CLOUD_DATABASE_URL) ||
    sanitizeDatabaseUrl(process.env.DATABASE_URL);

  if (!cleanUrl) {
    return prisma;
  }

  const key = crypto.createHash('sha256').update(cleanUrl).digest('hex');
  if (!globalForPrisma.cloudClients) {
    globalForPrisma.cloudClients = new Map<string, PrismaClient>();
  }

  const existing = globalForPrisma.cloudClients.get(key);
  if (existing) return existing;

  // Keep map small if user switches URLs multiple times during setup
  if (globalForPrisma.cloudClients.size >= 4) {
    const oldestKey = globalForPrisma.cloudClients.keys().next().value;
    if (oldestKey) {
      const oldClient = globalForPrisma.cloudClients.get(oldestKey);
      globalForPrisma.cloudClients.delete(oldestKey);
      oldClient?.$disconnect().catch(() => {});
    }
  }

  const client = createPrismaClient(cleanUrl);
  globalForPrisma.cloudClients.set(key, client);
  return client;
}

export default prisma;
