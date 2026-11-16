import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getDataFilePath, getDataVaultStatus } from '@/lib/utils/dataPaths';
import { createBackupSnapshot, listBackupSnapshots } from '@/lib/services/backupService';
import { ensureSchemaUpToDate, getAppVersion, getSchemaStatus } from '@/lib/services/schemaMigrator';

function readCount(filename: string, nestedKey?: string): number {
  try {
    const filePath = getDataFilePath(filename);
    if (!fs.existsSync(filePath)) return 0;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (nestedKey && parsed && typeof parsed === 'object') {
      const val = parsed[nestedKey];
      return Array.isArray(val) ? val.length : 0;
    }
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function getReleaseDiagnostics() {
  const releaseDir = process.env.EXMARK_RELEASE_DIR?.trim() || 'C:\\EXMARK-Releases';
  const executablePath = process.env.EXMARK_EXECUTABLE_PATH?.trim() || null;
  const distCandidate = path.join(process.cwd(), 'dist');
  const workspaceDistDir = fs.existsSync(distCandidate) ? distCandidate : null;

  const packagedArtifacts: Array<{ name: string; sizeBytes: number; updatedAt: string }> = [];
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ releaseDir)) {
      for (const file of fs.readdirSync(/*turbopackIgnore: true*/ releaseDir)) {
        if (!file.toLowerCase().endsWith('.exe')) continue;
        const full = path.join(/*turbopackIgnore: true*/ releaseDir, file);
        const stat = fs.statSync(/*turbopackIgnore: true*/ full);
        if (stat.isFile()) {
          packagedArtifacts.push({
            name: file,
            sizeBytes: stat.size,
            updatedAt: stat.mtime.toISOString(),
          });
        }
      }
    }
  } catch {
    // Non-fatal if release folder is inaccessible
  }

  return {
    releaseDir,
    executablePath,
    workspaceDistDir,
    packagedArtifacts,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const vaultStatus = getDataVaultStatus();
    const schemaStatus = getSchemaStatus();
    const appVersion = getAppVersion();
    const snapshots = await listBackupSnapshots();
    const releaseInfo = getReleaseDiagnostics();

    const recordCounts = {
      customers: readCount('customers-store.json'),
      leads: readCount('leads-store.json'),
      quotations: readCount('quotations-store.json'),
      measurements: readCount('measurements-store.json'),
      production: readCount('production-store.json'),
      boqs: readCount('boq-store.json'),
      invoices: readCount('finance-store.json', 'invoices'),
      contractors: readCount('contractors-store.json', 'contractors'),
      purchases: readCount('purchases-store.json'),
      employees: readCount('employees-store.json'),
      users: readCount('users-store.json'),
    };

    return NextResponse.json({
      success: true,
      appVersion,
      schemaStatus,
      vaultStatus,
      releaseInfo,
      recordCounts,
      snapshots,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to inspect factory vault status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (body.action === 'CREATE_PRE_UPDATE_BACKUP') {
      const snapshot = await createBackupSnapshot('PRE_UPDATE');
      return NextResponse.json({
        success: true,
        message: `Pre-update backup ${snapshot.backupId} created and SHA-256 verified.`,
        snapshot,
      });
    }

    if (body.action === 'RUN_SCHEMA_MIGRATION') {
      const migration = await ensureSchemaUpToDate({
        createPreUpdateBackup: true,
        forceRun: Boolean(body.forceRun),
      });
      return NextResponse.json({
        success: true,
        message: migration.migrated
          ? `Migrated schema v${migration.previousVersion} -> v${migration.currentVersion} safely.`
          : `Schema already at latest v${migration.currentVersion}. Zero data loss verified.`,
        migration,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid vault action.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Vault operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
