import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  isPostgresAvailable,
  getOutbox,
  isCloudEnvironment,
  getPostgresConnectionMode,
} from '@/lib/services/dbSyncEngine';
import { getLocalPostgresUrl } from '@/lib/services/localPostgresConfig';
import { getCloudSyncOverview } from '@/lib/services/cloudSyncService';
import { getCompanyProfile, getActiveFactory } from '@/lib/services/companyProfileService';
import { ensureFactoryBootstrapOnce, getAppVersion } from '@/lib/services/schemaMigrator';
import { getDataDir } from '@/lib/utils/dataPaths';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  await ensureFactoryBootstrapOnce();
  const postgresOnline = await isPostgresAvailable();
  const isCloud = isCloudEnvironment();
  const outbox = getOutbox();
  const pendingOutboxCount = outbox.filter((item) => item.status === 'PENDING').length;

  // Check persistent store health
  const dataDir = getDataDir();
  const storesExist = fs.existsSync(dataDir);
  let storeCount = 0;
  if (storesExist) {
    storeCount = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).length;
  }

  const profile = await getCompanyProfile();
  const activeFactory = getActiveFactory();
  const cloudSync = await getCloudSyncOverview().catch(() => null);
  const responseTimeMs = Date.now() - startTime;

  // Liveness is ALWAYS ALIVE if Next.js server is successfully handling this HTTP request
  const liveness = 'ALIVE';

  // Readiness represents actual database and persistent storage operational readiness
  let readiness: 'READY' | 'DEGRADED' | 'NOT_READY';
  let readinessReason: string;

  const pgMode = getPostgresConnectionMode();
  const hasLocalPg = Boolean(getLocalPostgresUrl());

  if (postgresOnline) {
    readiness = 'READY';
    readinessReason =
      pgMode === 'LOCAL_FACTORY_POSTGRES'
        ? 'Local PostgreSQL SQL server is connected and authoritative.'
        : 'Central PostgreSQL database is connected and authoritative.';
  } else if (!isCloud && storesExist && storeCount >= 10) {
    readiness = 'DEGRADED';
    readinessReason = 'Running in local desktop mode on persistent JSON stores (PostgreSQL offline).';
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
      version: getAppVersion(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      deploymentStage: process.env.STAGE || 'staging',
      isCloudEnvironment: isCloud,
      responseTimeMs,
      database: {
        authoritativeStore,
        postgresReachable: postgresOnline,
        connectionMode: postgresOnline
          ? pgMode === 'LOCAL_FACTORY_POSTGRES'
            ? 'LOCAL_FACTORY_POSTGRES'
            : 'CENTRAL_CLOUD_POSTGRES'
          : 'LOCAL_PERSISTENT_FALLBACK',
        pendingOutboxSync: pendingOutboxCount,
        configured: Boolean(hasLocalPg || process.env.DATABASE_URL || cloudSync?.secretsSummary.hasDatabaseUrl),
      },
      cloudSync: cloudSync
        ? {
            enabled: cloudSync.state.enabled,
            postgresEnabled: cloudSync.state.postgresEnabled,
            postgresConfigured: cloudSync.secretsSummary.hasDatabaseUrl,
            driveEnabled: cloudSync.state.driveEnabled,
            driveMode: cloudSync.state.driveMode,
            dirtyStoresCount: cloudSync.state.dirtyStores.length,
            lastPostgresSyncAt: cloudSync.state.lastPostgresSyncAt,
            lastDriveBackupAt: cloudSync.state.lastDriveBackupAt,
          }
        : null,
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
