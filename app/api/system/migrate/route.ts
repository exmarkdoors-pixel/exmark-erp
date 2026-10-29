import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import prisma from '@/lib/prisma';
import { isPostgresAvailable } from '@/lib/services/dbSyncEngine';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.AUTH_SECRET || 'dev_secret_exmark_erp_kerala_doors_manufacturing_stage4_auth_key';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  return token === expectedSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized: Valid Bearer AUTH_SECRET required' }, { status: 401 });
  }

  const postgresOnline = await isPostgresAvailable();
  let migrationStatus = 'UNKNOWN';
  let appliedMigrationsCount = 0;
  let tableCount = 0;

  if (postgresOnline) {
    try {
      // Check applied migrations table
      const migrations: any = await prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC
      `;
      appliedMigrationsCount = Array.isArray(migrations) ? migrations.length : 0;
      migrationStatus = appliedMigrationsCount > 0 ? 'UP_TO_DATE' : 'PENDING_MIGRATIONS';
    } catch {
      migrationStatus = 'SCHEMA_NOT_YET_INITIALIZED';
    }

    try {
      const tables: any = await prisma.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `;
      tableCount = Array.isArray(tables) ? tables.length : 0;
    } catch {
      tableCount = 0;
    }
  }

  return NextResponse.json({
    postgresOnline,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    directUrlConfigured: Boolean(process.env.DIRECT_URL),
    migrationStatus,
    appliedMigrationsCount,
    publicTablesCount: tableCount,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized: Valid Bearer AUTH_SECRET required' }, { status: 401 });
  }

  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    return NextResponse.json({ error: 'Neither DIRECT_URL nor DATABASE_URL is configured' }, { status: 400 });
  }

  try {
    const migrationEnv = {
      ...process.env,
      DATABASE_URL: directUrl,
    };

    const stdout = execSync('npx prisma migrate deploy', {
      env: migrationEnv,
      encoding: 'utf8',
      timeout: 60000,
    });

    return NextResponse.json({
      success: true,
      message: 'Prisma migrations deployed successfully',
      output: stdout,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Prisma migrate deploy failed',
        details: err.message || String(err),
        stdout: err.stdout?.toString(),
        stderr: err.stderr?.toString(),
      },
      { status: 500 }
    );
  }
}
