/**
 * EXMARK ERP — Automated Cloud Deployment Migration Runner
 * 
 * Safely runs `npx prisma migrate deploy` during cloud builds (Render / CI)
 * when DIRECT_URL or DATABASE_URL is configured, without exposing secrets.
 * Skips gracefully in local developer builds.
 */

import { execSync } from 'child_process';

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const isCloud = Boolean(
  process.env.RENDER || 
  process.env.VERCEL || 
  process.env.STRICT_POSTGRES === 'true'
);
const isLocalhost = !directUrl || directUrl.includes('localhost:5432') || directUrl.includes('127.0.0.1');

if (isCloud && !isLocalhost) {
  console.log('========================================================================');
  console.log('  EXMARK ERP — CLOUD SCHEMA MIGRATION DEPLOYMENT');
  console.log('========================================================================');
  console.log('[Deploy Migration] Cloud environment detected (Render / Staging).');
  console.log('[Deploy Migration] Deploying pending Prisma migrations to central PostgreSQL...');

  try {
    const migrationEnv = {
      ...process.env,
      // Prisma migration engine uses DIRECT_URL for session-compatible DDL migrations
      DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
    };

    execSync('npx prisma migrate deploy', {
      env: migrationEnv,
      stdio: 'inherit',
    });

    console.log('[Deploy Migration] ✓ All Prisma migrations deployed and schema verified.');
    console.log('========================================================================\n');
  } catch (err) {
    console.warn('========================================================================');
    console.warn('[Deploy Migration] ⚠️ Automatic build-time database migration did not complete.');
    console.warn('[Deploy Migration] Error details:', err instanceof Error ? err.message : String(err));
    console.warn('[Deploy Migration] Proceeding with Next.js build to maintain service availability.');
    console.warn('[Deploy Migration] Schema migrations can be triggered remotely via /api/system/migrate');
    console.warn('========================================================================\n');
    // If STRICT_BUILD_MIGRATION is explicitly requested, fail build; otherwise permit build to proceed
    if (process.env.STRICT_BUILD_MIGRATION === 'true') {
      process.exit(1);
    }
  }
} else {
  console.log('[Deploy Migration] Local development or non-cloud build: skipping cloud database migration.');
}
