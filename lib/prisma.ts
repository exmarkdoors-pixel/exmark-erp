import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit across Hot Module Replacement (HMR).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sanitizeUrl(raw: string | undefined): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["'`]|["'`]$/g, '').trim();
  cleaned = cleaned.replace(/^(?:psql\s+|uri:\s*|url:\s*|code:\s*|file:\s*code\s*)/i, '').trim();
  return cleaned.replace(/^["'`]|["'`]$/g, '').trim();
}

function createPrismaClient(): PrismaClient {
  const connectionString =
    sanitizeUrl(process.env.DATABASE_URL) ||
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

export default prisma;
