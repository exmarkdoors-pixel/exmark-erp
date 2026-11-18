import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import { getLocalPostgresUrl } from '@/lib/services/localPostgresConfig';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit across Hot Module Replacement (HMR).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
  cloudClients: Map<string, PrismaClient> | undefined;
};

export type PostgresProviderKind =
  | 'NEON'
  | 'SUPABASE_POOLER'
  | 'SUPABASE_DIRECT_IPV6'
  | 'LOCAL'
  | 'CUSTOM';

export interface PostgresProviderInfo {
  kind: PostgresProviderKind;
  label: string;
  isRemote: boolean;
  warning?: string;
}

export function detectPostgresProvider(rawUrl: string | undefined): PostgresProviderInfo {
  const cleaned = (rawUrl || '').trim().toLowerCase();
  if (!cleaned) {
    return { kind: 'LOCAL', label: 'Local PostgreSQL', isRemote: false };
  }
  if (cleaned.includes('.neon.tech')) {
    return { kind: 'NEON', label: 'Neon PostgreSQL', isRemote: true };
  }
  if (cleaned.includes('.pooler.supabase.com')) {
    return { kind: 'SUPABASE_POOLER', label: 'Supabase Pooler (IPv4)', isRemote: true };
  }
  if (/\.supabase\.co(?:[:/]|$)/i.test(cleaned)) {
    return {
      kind: 'SUPABASE_DIRECT_IPV6',
      label: 'Supabase Direct (IPv6)',
      isRemote: true,
      warning:
        'Supabase Direct URLs (db.*.supabase.co) are IPv6-only and often fail on IPv4 broadband. Use Supabase Session Pooler (*.pooler.supabase.com:5432) or Neon PostgreSQL.',
    };
  }
  if (cleaned.includes('127.0.0.1') || cleaned.includes('localhost')) {
    return { kind: 'LOCAL', label: 'Local PostgreSQL', isRemote: false };
  }
  return { kind: 'CUSTOM', label: 'Remote PostgreSQL', isRemote: true };
}

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

  // Normalize cloud provider query parameters (Neon channel_binding, TLS sslmode, Supabase :6543 pgbouncer)
  try {
    const parsed = new URL(cleaned);
    const hostLower = parsed.hostname.toLowerCase();
    const isRemoteCloud =
      hostLower.endsWith('.neon.tech') ||
      hostLower.endsWith('.supabase.com') ||
      hostLower.endsWith('.supabase.co') ||
      hostLower.endsWith('.render.com');

    // Neon dashboards often append channel_binding=require which can cause SASL failures in Node pg
    if (parsed.searchParams.has('channel_binding')) {
      parsed.searchParams.delete('channel_binding');
    }
    if (isRemoteCloud && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }
    if (hostLower.includes('pooler.supabase.com') && parsed.port === '6543' && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }
    cleaned = parsed.toString();
  } catch {
    // Preserve sanitized raw string if URL parser rejects non-standard syntax
  }

  return cleaned;
}

export function resolveEffectiveDatabaseUrl(explicitUrl?: string): string {
  return (
    sanitizeDatabaseUrl(explicitUrl) ||
    sanitizeDatabaseUrl(getLocalPostgresUrl()) ||
    sanitizeDatabaseUrl(process.env.DATABASE_URL) ||
    sanitizeDatabaseUrl(process.env.EXMARK_CLOUD_DATABASE_URL) ||
    'postgresql://postgres:postgres@127.0.0.1:5432/exmark_erp?schema=public'
  );
}

function createPrismaClient(explicitUrl?: string): PrismaClient {
  const connectionString = resolveEffectiveDatabaseUrl(explicitUrl);
  const provider = detectPostgresProvider(connectionString);
  const adapter = provider.isRemote
    ? new PrismaPg({
        connectionString,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        ssl: { rejectUnauthorized: false },
      })
    : new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

function getOrCreateDefaultPrisma(): PrismaClient {
  const effectiveUrl = resolveEffectiveDatabaseUrl();
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl === effectiveUrl) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== effectiveUrl) {
    globalForPrisma.prisma.$disconnect().catch(() => {});
  }

  const nextClient = createPrismaClient(effectiveUrl);
  globalForPrisma.prisma = nextClient;
  globalForPrisma.prismaUrl = effectiveUrl;
  return nextClient;
}

/**
 * Forces Prisma client re-initialization after Local PostgreSQL config changes at runtime.
 */
export function resetPrismaClient(): void {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaUrl = undefined;
  }
  if (globalForPrisma.cloudClients) {
    for (const client of globalForPrisma.cloudClients.values()) {
      client.$disconnect().catch(() => {});
    }
    globalForPrisma.cloudClients.clear();
  }
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateDefaultPrisma();
    const val = Reflect.get(client, prop, receiver);
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

/**
 * Returns a pooled PrismaClient for a specific sanitized PostgreSQL URL
 * (used when Cloud Sync or Local PostgreSQL is configured or updated at runtime).
 */
export function getCloudPrismaClient(overrideUrl?: string): PrismaClient {
  const cleanUrl = resolveEffectiveDatabaseUrl(overrideUrl);

  if (!cleanUrl) {
    return getOrCreateDefaultPrisma();
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
