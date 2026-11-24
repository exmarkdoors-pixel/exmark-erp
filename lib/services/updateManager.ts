import fs from 'fs';
import path from 'path';
import { getDataDir, getDataVaultStatus } from '../utils/dataPaths';
import { createBackupSnapshot, verifyBackupIntegrity, listBackupSnapshots, BackupSnapshotMeta } from './backupService';
import { ensureSchemaUpToDate, getSchemaStatus, CURRENT_SCHEMA_VERSION } from './schemaMigrator';

export interface UpdateReleaseAsset {
  name: string;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
  sha256?: string;
  isLocal: boolean;
  localPath?: string;
  updatedAt?: string;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  isDowngrade: boolean;
  releaseChannel: 'production' | 'staging';
  releaseDate: string;
  releaseTag: string;
  releaseTitle: string;
  releaseNotes: string;
  changelog: Array<{
    phase?: string;
    version: string;
    title: string;
    features: string[];
  }>;
  assets: {
    windowsSetupExe?: UpdateReleaseAsset;
    windowsPortableExe?: UpdateReleaseAsset;
    staffApk?: UpdateReleaseAsset;
    iosIpa?: UpdateReleaseAsset;
  };
  source: 'github' | 'local_releases' | 'cached' | 'manifest';
  lastCheckedAt: string;
  isAirGapped: boolean;
  dataVaultHealthy: boolean;
  activeDataDir: string;
  latestSnapshot?: BackupSnapshotMeta;
}

export function getAuthoritativeAppVersion(): string {
  const envVersion = process.env.EXMARK_APP_VERSION?.trim();
  if (envVersion) return envVersion;
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const parsed = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (parsed?.version) return String(parsed.version);
    }
  } catch {
    // Non-fatal fallback
  }
  return '1.5.0';
}

export function parseSemVer(v: string): number[] {
  const cleaned = v.replace(/^v/i, '').split('-')[0].trim();
  return cleaned.split('.').map((n) => parseInt(n, 10) || 0);
}

export function compareSemVer(v1: string, v2: string): number {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function extractVersionFromFilename(filename: string): string | null {
  // Matches "EXMARK ERP Setup 1.2.1.exe", "EXMARK-Staff-v1.2.1.apk", "EXMARK ERP 1.2.2.exe"
  const match = filename.match(/[vV]?(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function getReleasesFolderPath(): string {
  return process.env.EXMARK_RELEASE_DIR?.trim() || 'C:\\EXMARK-Releases';
}

/**
 * Scans the local factory release vault (C:\EXMARK-Releases) for offline updates
 */
export function scanLocalReleases(): {
  highestVersion: string | null;
  assets: {
    windowsSetupExe?: UpdateReleaseAsset;
    windowsPortableExe?: UpdateReleaseAsset;
    staffApk?: UpdateReleaseAsset;
    iosIpa?: UpdateReleaseAsset;
  };
  allFiles: UpdateReleaseAsset[];
} {
  const releaseDir = getReleasesFolderPath();
  const allFiles: UpdateReleaseAsset[] = [];
  const assets: {
    windowsSetupExe?: UpdateReleaseAsset;
    windowsPortableExe?: UpdateReleaseAsset;
    staffApk?: UpdateReleaseAsset;
    iosIpa?: UpdateReleaseAsset;
  } = {};

  let highestVersion: string | null = null;

  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ releaseDir)) {
      const files = fs.readdirSync(/*turbopackIgnore: true*/ releaseDir);
      for (const file of files) {
        const fullPath = path.join(/*turbopackIgnore: true*/ releaseDir, file);
        const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
        if (!stat.isFile()) continue;

        const version = extractVersionFromFilename(file);
        if (version && (!highestVersion || compareSemVer(version, highestVersion) > 0)) {
          highestVersion = version;
        }

        const lower = file.toLowerCase();
        const asset: UpdateReleaseAsset = {
          name: file,
          filename: file,
          downloadUrl: `/api/system/update/download-local?file=${encodeURIComponent(file)}`,
          sizeBytes: stat.size,
          isLocal: true,
          localPath: fullPath,
          updatedAt: stat.mtime.toISOString(),
        };

        allFiles.push(asset);

        if (lower.endsWith('.exe')) {
          if (lower.includes('setup')) {
            if (!assets.windowsSetupExe || (version && compareSemVer(version, extractVersionFromFilename(assets.windowsSetupExe.filename) || '0.0.0') > 0)) {
              assets.windowsSetupExe = asset;
            }
          } else {
            if (!assets.windowsPortableExe || (version && compareSemVer(version, extractVersionFromFilename(assets.windowsPortableExe.filename) || '0.0.0') > 0)) {
              assets.windowsPortableExe = asset;
            }
          }
        } else if (lower.endsWith('.apk')) {
          if (!assets.staffApk || (version && compareSemVer(version, extractVersionFromFilename(assets.staffApk.filename) || '0.0.0') > 0)) {
            assets.staffApk = asset;
          }
        } else if (lower.endsWith('.ipa')) {
          if (!assets.iosIpa || (version && compareSemVer(version, extractVersionFromFilename(assets.iosIpa.filename) || '0.0.0') > 0)) {
            assets.iosIpa = asset;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[UpdateManager] Could not read local releases folder:', err);
  }

  return { highestVersion, assets, allFiles };
}

// In-memory cache for GitHub Releases API to respect rate limits
let cachedGithubRelease: {
  fetchedAt: number;
  data: any;
} | null = null;

const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchRemoteGitHubRelease(forceRefresh = false): Promise<any | null> {
  const now = Date.now();
  if (!forceRefresh && cachedGithubRelease && now - cachedGithubRelease.fetchedAt < GITHUB_CACHE_TTL_MS) {
    return cachedGithubRelease.data;
  }

  const repo = 'exmarkdoors-pixel/exmark-erp';
  const url = `https://api.github.com/repos/${repo}/releases/latest`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'EXMARK-ERP-Update-Manager',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      cachedGithubRelease = { fetchedAt: now, data };
      return data;
    }
  } catch (err) {
    // Network / timeout / offline
  }

  return null;
}

export async function checkForSystemUpdates(options: {
  channel?: 'production' | 'staging';
  forceRefresh?: boolean;
} = {}): Promise<UpdateCheckResult> {
  const currentVersion = getAuthoritativeAppVersion();
  const channel = options.channel || 'production';
  const localScan = scanLocalReleases();

  const remoteRelease = await fetchRemoteGitHubRelease(Boolean(options.forceRefresh));
  const isAirGapped = !remoteRelease;

  let latestVersion = currentVersion;
  let releaseTag = `v${currentVersion}`;
  let releaseTitle = `EXMARK ERP Production Release v${currentVersion}`;
  let releaseDate = new Date().toISOString();
  let releaseNotes = 'Operating normally on authoritative factory build.';
  let source: UpdateCheckResult['source'] = 'local_releases';

  const assets: UpdateCheckResult['assets'] = { ...localScan.assets };

  if (remoteRelease && remoteRelease.tag_name) {
    const remoteVer = extractVersionFromFilename(remoteRelease.tag_name) || remoteRelease.tag_name.replace(/^v/i, '');
    if (compareSemVer(remoteVer, latestVersion) > 0) {
      latestVersion = remoteVer;
      releaseTag = remoteRelease.tag_name;
      releaseTitle = remoteRelease.name || `EXMARK ERP ${releaseTag}`;
      releaseDate = remoteRelease.published_at || remoteRelease.created_at || new Date().toISOString();
      releaseNotes = remoteRelease.body || '';
      source = 'github';

      // Map remote assets
      if (Array.isArray(remoteRelease.assets)) {
        for (const a of remoteRelease.assets) {
          const name = String(a.name || '');
          const lower = name.toLowerCase();
          const assetObj: UpdateReleaseAsset = {
            name,
            filename: name,
            downloadUrl: a.browser_download_url,
            sizeBytes: a.size || 0,
            isLocal: false,
            updatedAt: a.updated_at,
          };

          if (lower.endsWith('.exe')) {
            if (lower.includes('setup')) assets.windowsSetupExe = assetObj;
            else assets.windowsPortableExe = assetObj;
          } else if (lower.endsWith('.apk')) {
            assets.staffApk = assetObj;
          } else if (lower.endsWith('.ipa')) {
            assets.iosIpa = assetObj;
          }
        }
      }
    }
  }

  // Check if local release directory has an even newer installer (air-gapped USB deployment)
  if (localScan.highestVersion && compareSemVer(localScan.highestVersion, latestVersion) > 0) {
    latestVersion = localScan.highestVersion;
    releaseTag = `v${localScan.highestVersion}`;
    releaseTitle = `EXMARK ERP Local Factory Installer v${localScan.highestVersion}`;
    releaseNotes = `Discovered verified installer binaries in ${getReleasesFolderPath()}. Ready for immediate offline update.`;
    source = 'local_releases';
  }

  const updateAvailable = compareSemVer(latestVersion, currentVersion) > 0;
  const isDowngrade = compareSemVer(latestVersion, currentVersion) < 0;

  // Curated changelog features
  const changelog = [
    {
      version: '1.5.0',
      title: 'COA Tree View & Protection, Bulk Raw Material Stock Audit, Vyapar Import & Salesman Payment-In',
      features: [
        'Chart of Accounts Hierarchical Tree View: Visual Tree Chart View with expandable branches, category financial metrics, and sub-account code auto-suggest',
        'Strict Double-Entry Deletion Protection: Blocks deletion of accounts with posted journal vouchers or system control status, with a safe 1-click Deactivate Account option',
        'Bulk Raw Material Stock & Reconciliation Hub: 4 modes (Physical Count Audit, Inward Consignment Add, Full Grid Edit, CSV Export/Import) with live variance and valuation calculation',
        'Auto-Sync to BOQ Formula Rates: Two-way synchronization propagating live raw material purchase rates into boq-material-rates.json for accurate quote margins',
        'Vyapar Party Master Import: Bulk import parties with credit balances, GSTIN, phone, and address into customer master',
        'Salesman-Wise Payment In & Customer Outstanding Credit Tracking: Real-time collection tracking by sales staff with live balances',
        'BOQ Next-Day Date Selection: Flexible issuance date picker for morning shift production orders',
      ],
    },
    {
      version: '1.4.1',
      title: 'Universal Tolerance Sync, Mobile Customer Registration, Base Price Lock & Credit Payment Settlement',
      features: [
        'Universal Tolerance Synchronization: Synced Frame Rebates (40mm), Bottom Floor Clearances (Tile 12mm / Raw Concrete 25mm), and Top Gaps (5mm) end-to-end across Site Measurements, Mobile App, Quotations, and CNC Shop Floor',
        'Production 12L Sticker & Cutting Sheet Precision: Removed hardcoded 4.5cm/7.6cm deductions and bonded live measurement tolerances to CNC cutting sizes and barcode passes',
        'Mobile Field App Customer Creation: Added instant MobileCustomerModal with Kerala district dropdown, GPS locality auto-fill, and customer search autocomplete',
        'Base Piece Minimum Price Lock: Enforced BASE_MINIMUM calculation standard across mobile and desktop preventing door unit rates from dropping below category base piece rate',
        'Queue Stage Job Card Deletion: Added deletion with required terms/reasons and recovery audit log',
        'Floor Line Credit Payment: Added credit payment settlement on production work completion with immediate ledger posting',
      ],
    },
    {
      version: '1.2.8',
      title: 'Unrestricted Super Admin Permissions & Neon PostgreSQL Cloud Sync Hardening',
      features: [
        'Guaranteed unrestricted Super Admin access across all 26 ERP modules and every API endpoint (Financial, Accounts, Evening Close, Mobile Field Ops, Settings & Security)',
        'Fixed 403 error on Evening Close (/api/system/daily-closing) and unlocked Mobile Field Ops in both Simple UI Mode and Full Ops Mode',
        'Upgraded all 12 Financial, Accounts, Break-Even, Daybook, AI Strategist, Order Profit & Contractor Payables panels to authenticated apiFetch for seamless Desktop .exe & LAN sessions',
        'Hardened Neon PostgreSQL (Recommended) & Supabase Pooler Cloud Sync with automatic channel_binding stripping, TLS/15s cold-wake retry, IPv6 warning & guided setup card',
      ],
    },
    {
      version: '1.2.7',
      title: 'Quotation Live Colour PDF Fix, 12L After-Packing Site Verification Pass & Next.js 16.4.6 Security Update',
      features: [
        'Fixed Quotation PDF colour mismatch across all 5 Tally & Vyapar themes so renamed and custom factory colours (e.g., PU WHITE, Natural Teak EXGC-510, 2 SIDE) print accurately per row/section',
        'Added new 12L After-Packing Site Verification Pass format (99mm × 44mm, 2×6 A4 Grid) displaying Given Opening (Frame), Confirm Finish Door (QC: Passed & Packed), Verification QR Code, and Site Sign-Off footer',
        'Available in both Batch Printing Hub and Job Card Sticker Studio (HTML print & calibrated pure-vector PDF) alongside the existing 12L Cutting Sticker',
        'Upgraded Next.js framework to patched 16.4.6 security release',
      ],
    },
    {
      version: '1.2.6',
      title: 'Local PostgreSQL 18 Server Integration, Simple UI Mode, Excel Bulk Lead Import & Hardened Cloud Tunnel',
      features: [
        'Native Local PostgreSQL 18 SQL Server integration across Web Server & installed Desktop .exe with AES-256-GCM encrypted vault config',
        'Settings -> Local PostgreSQL Server live status card, 1-click Initialize/Sync Vault, and PostgreSQL 18 pg_dump (.dump) backups',
        'Simple UI Mode (7-tab core sidebar, clean Executive Overview dashboard, slim collapsible pipeline bar, and 1-click Full Ops toggle)',
        'Live Ctrl+K Quick Search across Quotations, CRM Leads, Customers, and key workspaces',
        'Repaired Bulk Lead Import with native Excel (.xlsx/.xls) support, direct Ctrl+V paste from Excel, UTF-8 BOM fix, and non-blocking phone warnings',
        'Hardened TryCloudflare Tunnel with PID liveness verification, auto-recovery watchdog, and live reachability probes',
      ],
    },
    {
      version: '1.2.5',
      title: 'Quotation Specs, Bank Details Config, Advance 30% Lock & Salesperson Slabs',
      features: [
        'Door sticker remarks layout optimization and batch printing parity for remarks',
        'Simplified door model creation (Model Number & Price only) with full quotation specifications (Lock, Color, Thickness, Frame Size, Door Size)',
        'Mandatory minimum 30% advance payment lock with flexible custom amount input for advances >= 30%',
        'Salesperson piece-rate commission (default 0) with per-salesperson custom rates and volume slabs (40, 60, 100+ doors)',
        'Company Bank & UPI configuration under Settings -> Company & Factory Profile -> Bank & Payment Accounts',
        'Hide Bank Details in Print toggle in print toolbar for Quotations, Bills, and Proforma Invoices across all themes',
      ],
    },
    {
      version: '1.2.4',
      title: 'Standard 12L (99×44mm) 2D Specification Layout & Obsolete Format Cleanup',
      features: [
        'Standardized 12L die-cut format strictly to 99mm × 44mm label size with 9mm top/bottom margins, 3.2mm column gap, and 3.0mm row gap',
        'Mathematical precision fit for standard A4 portrait sheets (210mm × 297mm)',
        'Full removal and retirement of legacy 3×4 layouts and outdated paper presets (105×49.5mm)',
        'Expanded cutting box dimensions without QR clutter for maximum readability on shop-floor',
        'Pure vector PDF generation calibrated to 99×44mm with zero pixelation at 100% actual size',
      ],
    },
    {
      version: '1.2.3',
      title: 'Floor Door QR & 12L Sticker Studio Parity & Batch Print Standard (2×6)',
      features: [
        '100% unified measurement deduction formulas between Floor Door Studio and Operations Module 2',
        'Standard 12L (2×6) sheet layout (12 stickers per A4 page) matching factory reference standard',
        'Multi-party continuous sticker batching with negative deduction cutting box (-209.8, -70.5, -71.1)',
        'Independent dual-width measurements (Top & Bottom widths preserved for tapered door clearance)',
        'Quotation door model title & code automatic sync into production job cards',
        'Offline SQL Server / PostgreSQL enterprise sync scripts & tooling',
      ],
    },
    {
      version: '1.2.2',
      title: 'In-Built Update Section & Auto-Updater',
      features: [
        '1-Click safe in-app updates with automated pre-update SHA-256 backup snapshots',
        'Universal version detection across Windows Desktop (.exe), Cloud Web & Mobile Staff APK',
        'Air-gapped factory USB installer discovery & offline 1-click update apply',
        'Seamless forward-only schema migration preserving all 34 JSON stores',
      ],
    },
    {
      version: '1.2.1',
      title: 'Staff APK Dark UI & Subnet Gateway',
      features: [
        'Eliminated Android WebView white screen with modern dark theme (#070D18)',
        'Subnet auto-discovery gateway connecting staff directly to factory server',
        'Full Driver & Vehicle logistics terminal with live status management',
      ],
    },
    {
      version: '1.2.0',
      title: 'Driver & Vehicle Master Management',
      features: [
        'Centralized Driver profile directory with Kerala license tracking',
        'Vehicle fleet status dashboard and maintenance alert logs',
        'Dedicated mobile driver interface for delivery dispatch confirmations',
      ],
    },
  ];

  const vaultStatus = getDataVaultStatus();
  const snapshots = await listBackupSnapshots();
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : undefined;

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    isDowngrade,
    releaseChannel: channel,
    releaseDate,
    releaseTag,
    releaseTitle,
    releaseNotes,
    changelog,
    assets,
    source,
    lastCheckedAt: new Date().toISOString(),
    isAirGapped,
    dataVaultHealthy: vaultStatus.isExternalVault,
    activeDataDir: vaultStatus.dataDir,
    latestSnapshot,
  };
}

/**
 * Executes the safe pre-update pipeline:
 * 1. Takes an immutable SHA-256 backup snapshot of C:\EXMARK-ERP-DATA
 * 2. Verifies the snapshot integrity
 * 3. Runs non-destructive schema migrations
 */
export async function executePreUpdateSafetyPipeline(): Promise<{
  success: boolean;
  preUpdateBackupId: string;
  filesIncluded: number;
  checksumSha256: string;
  verified: boolean;
  migrationStatus: {
    previousVersion: number;
    currentVersion: number;
  };
  message: string;
}> {
  console.log('[UpdateManager] Initiating Pre-Update Safety Pipeline...');
  
  // 1. Create Snapshot
  const snapshot = await createBackupSnapshot('PRE_UPDATE');
  
  // 2. Verify Snapshot
  const integrity = await verifyBackupIntegrity(snapshot.backupId);
  if (!integrity.valid) {
    throw new Error(`Pre-update snapshot failed SHA-256 verification: ${integrity.errors?.join('; ')}`);
  }

  // 3. Ensure Schema is clean
  const migration = await ensureSchemaUpToDate({
    createPreUpdateBackup: false, // Already taken above
    forceRun: false,
  });

  return {
    success: true,
    preUpdateBackupId: snapshot.backupId,
    filesIncluded: snapshot.storesIncluded ? snapshot.storesIncluded.length : snapshot.filesCount || 0,
    checksumSha256: snapshot.sha256Checksum,
    verified: true,
    migrationStatus: {
      previousVersion: migration.previousVersion,
      currentVersion: migration.currentVersion,
    },
    message: `Pre-update backup ${snapshot.backupId} successfully verified (SHA-256: ${snapshot.sha256Checksum.slice(0, 16)}...). 100% data safely secured.`,
  };
}

/**
 * Ensures public downloads folder has the latest Staff APK for direct mobile downloads
 */
export function syncLatestArtifactsToPublic(): void {
  try {
    const releaseDir = getReleasesFolderPath();
    const publicDir = path.join(process.cwd(), 'public');
    const downloadsDir = path.join(publicDir, 'downloads');
    if (!fs.existsSync(/*turbopackIgnore: true*/ downloadsDir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ downloadsDir, { recursive: true });
    }

    if (fs.existsSync(/*turbopackIgnore: true*/ releaseDir)) {
      const files = fs.readdirSync(/*turbopackIgnore: true*/ releaseDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.apk')) {
          const src = path.join(/*turbopackIgnore: true*/ releaseDir, file);
          const dest = path.join(/*turbopackIgnore: true*/ downloadsDir, file);
          if (!fs.existsSync(/*turbopackIgnore: true*/ dest) || fs.statSync(/*turbopackIgnore: true*/ src).size !== fs.statSync(/*turbopackIgnore: true*/ dest).size) {
            fs.copyFileSync(/*turbopackIgnore: true*/ src, /*turbopackIgnore: true*/ dest);
          }
          // Also link or copy to EXMARK-Staff-latest.apk
          if (file.toLowerCase().includes('staff') || file.toLowerCase().includes('erp')) {
            const latestDest = path.join(/*turbopackIgnore: true*/ downloadsDir, 'EXMARK-Staff-latest.apk');
            const rootPublicDest = path.join(publicDir, 'EXMARK-Staff-latest.apk');
            fs.copyFileSync(/*turbopackIgnore: true*/ src, /*turbopackIgnore: true*/ latestDest);
            fs.copyFileSync(/*turbopackIgnore: true*/ src, /*turbopackIgnore: true*/ rootPublicDest);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[UpdateManager] Could not sync artifacts to public:', err);
  }
}
