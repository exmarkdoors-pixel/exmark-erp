import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isPostgresAvailable, getOutbox, isCloudEnvironment } from '@/lib/services/dbSyncEngine';
import { getCompanyProfile, getActiveFactory } from '@/lib/services/companyProfileService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const postgresOnline = await isPostgresAvailable();
  const isCloud = isCloudEnvironment();
  const outbox = getOutbox();
  const pendingOutboxCount = outbox.filter((item) => item.status === 'PENDING').length;

  // Check persistent store health
  const dataDir = path.join(process.cwd(), 'data');
  const storesExist = fs.existsSync(dataDir);
  let storeCount = 0;
  if (storesExist) {
    storeCount = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).length;
  }

  const profile = await getCompanyProfile();
  const activeFactory = getActiveFactory();
  const responseTimeMs = Date.now() - startTime;

  // Liveness is ALWAYS ALIVE if Next.js server is successfully handling this HTTP request
  const liveness = 'ALIVE';

  // Readiness represents actual database and persistent storage operational readiness
  let readiness: 'READY' | 'DEGRADED' | 'NOT_READY';
  let readinessReason: string;

  if (postgresOnline) {
    readiness = 'READY';
    readinessReason = 'Central PostgreSQL database is connected and authoritative.';
  } else if (!isCloud && storesExist && storeCount >= 10) {
    readiness = 'DEGRADED';
    readinessReason = 'Running in local desktop development mode on persistent JSON stores.';
  } else {
    readiness = 'NOT_READY';
    readinessReason = isCloud
      ? 'Central PostgreSQL (DATABASE_URL) is not connected. Cloud ephemeral disk rejects writes to protect data.'
      : 'Neither PostgreSQL nor local persistent JSON data stores are available.';
  }

  // In cloud environment, if database is NOT ready, return HTTP 503 Service Unavailable for readiness probes
  // while liveness check still reports ALIVE in body.
  const httpStatus = isCloud && readiness === 'NOT_READY' ? 503 : 200;

  const authoritativeStore = postgresOnline ? 'POSTGRESQL' : 'PERSISTENT_JSON_STORE';

  return NextResponse.json(
    {
      liveness,
      readiness,
      readinessReason,
      service: 'EXMARK ERP Enterprise Platform',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      deploymentStage: process.env.STAGE || 'staging',
      isCloudEnvironment: isCloud,
      responseTimeMs,
      database: {
        authoritativeStore,
        postgresReachable: postgresOnline,
        connectionMode: postgresOnline ? 'CENTRAL_CLOUD_POSTGRES' : 'LOCAL_PERSISTENT_FALLBACK',
        pendingOutboxSync: pendingOutboxCount,
        configured: Boolean(process.env.DATABASE_URL),
      },
      storage: {
        jsonStoresReachable: storesExist,
        activeStoresCount: storeCount,
        healthy: storesExist && storeCount >= 10,
        durable: !isCloud,
      },
      companyProfile: {
        brand: profile.brandName,
        company: profile.registeredCompanyName,
        activeFactory: activeFactory.name,
        factoryDistrict: activeFactory.address?.district || 'Unassigned',
      },
    },
    { status: httpStatus }
  );
}
