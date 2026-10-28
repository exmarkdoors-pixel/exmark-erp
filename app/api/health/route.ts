import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isPostgresAvailable, getOutbox } from '@/lib/services/dbSyncEngine';
import { getCompanyProfile, getActiveFactory } from '@/lib/services/companyProfileService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const postgresOnline = await isPostgresAvailable();
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

  const authoritativeStore = postgresOnline ? 'POSTGRESQL' : 'PERSISTENT_JSON_STORE';

  return NextResponse.json({
    status: 'OK',
    service: 'EXMARK ERP Enterprise Platform',
    version: '2.4.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    deploymentStage: process.env.STAGE || 'staging',
    responseTimeMs,
    database: {
      authoritativeStore,
      postgresReachable: postgresOnline,
      connectionMode: postgresOnline ? 'CENTRAL_CLOUD_POSTGRES' : 'LOCAL_PERSISTENT_FALLBACK',
      pendingOutboxSync: pendingOutboxCount,
    },
    storage: {
      jsonStoresReachable: storesExist,
      activeStoresCount: storeCount,
      healthy: storesExist && storeCount >= 10,
    },
    companyProfile: {
      brand: profile.brandName,
      company: profile.registeredCompanyName,
      activeFactory: activeFactory.name,
      factoryDistrict: activeFactory.address?.district || 'Unassigned',
    },
  });
}
