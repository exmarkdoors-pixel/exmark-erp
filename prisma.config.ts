import { defineConfig } from '@prisma/config';

function sanitizeUrl(raw: string | undefined): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["'`]|["'`]$/g, '').trim();
  cleaned = cleaned.replace(/^(?:psql\s+|uri:\s*|url:\s*|code:\s*|file:\s*code\s*)/i, '').trim();
  return cleaned.replace(/^["'`]|["'`]$/g, '').trim();
}

const resolvedUrl = sanitizeUrl(process.env.DIRECT_URL) || sanitizeUrl(process.env.DATABASE_URL) || 'postgresql://postgres:postgres@localhost:5432/exmark_erp?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: resolvedUrl,
  },
});
