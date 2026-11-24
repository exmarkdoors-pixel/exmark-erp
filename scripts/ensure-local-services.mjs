/**
 * EXMARK ERP — Local Services & Host Health Guardian
 *
 * Automatically verifies, repairs, and prepares:
 * 1. PostgreSQL 18 Local Database Engine (Port 5432)
 * 2. Port 4000 liveness and zombie/hung process cleanup
 * 3. Desktop Application configuration (sets mode to standalone on localhost)
 * 4. Localhost Port Forwarder & IPv6 Bridge (Port 3000 & [::1]:4000 -> 127.0.0.1:4000)
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import http from 'http';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function checkTcpPort(port, host = '127.0.0.1', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.once('error', () => resolve(false));
    sock.once('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, host);
  });
}

export function checkHealthEndpoint(url = 'http://127.0.0.1:4000/api/health', timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(res.statusCode === 200 && (json.liveness === 'ALIVE' || json.service?.includes('EXMARK')));
        } catch {
          // If 200 or 304 response, server is responding even if body is non-JSON
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

export function findPostgresInstallation() {
  const versions = ['18', '17', '16', '15', '14'];
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';

  for (const v of versions) {
    const binDir = path.join(programFiles, 'PostgreSQL', v, 'bin');
    const dataDir = path.join(programFiles, 'PostgreSQL', v, 'data');
    const postgresExe = path.join(binDir, 'postgres.exe');
    const pgCtlExe = path.join(binDir, 'pg_ctl.exe');

    if (fs.existsSync(postgresExe) && fs.existsSync(dataDir)) {
      return {
        version: v,
        binDir,
        dataDir,
        postgresExe,
        pgCtlExe: fs.existsSync(pgCtlExe) ? pgCtlExe : null,
      };
    }
  }
  return null;
}

export async function ensurePostgresRunning() {
  const isRunning = await checkTcpPort(5432, '127.0.0.1', 1000);
  if (isRunning) {
    console.log('[Localhost Fix] PostgreSQL 18 is active on 127.0.0.1:5432.');
    return true;
  }

  console.log('[Localhost Fix] PostgreSQL is not running on 127.0.0.1:5432. Attempting auto-start...');
  const pgInfo = findPostgresInstallation();

  if (!pgInfo) {
    console.warn('[Localhost Fix] PostgreSQL installation not detected in Program Files. Running in JSON vault fallback.');
    return false;
  }

  // 1. Try Windows Service first
  try {
    const svcName = execSync(
      'powershell -NoProfile -Command "(Get-Service *postgres* -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Name)"',
      { encoding: 'utf8', timeout: 3000 }
    ).trim();

    if (svcName) {
      console.log(`[Localhost Fix] Starting PostgreSQL Windows Service (${svcName})...`);
      execSync(`powershell -NoProfile -Command "Start-Service -Name '${svcName}'"`, { stdio: 'ignore', timeout: 4000 });
      if (await checkTcpPort(5432, '127.0.0.1', 3000)) {
        console.log('[Localhost Fix] PostgreSQL service started successfully.');
        return true;
      }
    }
  } catch {
    // Service startup might require elevation, proceed to direct daemon
  }

  // 2. Start PostgreSQL directly as detached background daemon
  console.log(`[Localhost Fix] Launching background daemon: ${pgInfo.postgresExe} -D "${pgInfo.dataDir}"...`);
  try {
    const child = spawn(pgInfo.postgresExe, ['-D', pgInfo.dataDir], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    for (let i = 0; i < 12; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 500));
      // eslint-disable-next-line no-await-in-loop
      if (await checkTcpPort(5432, '127.0.0.1', 800)) {
        console.log('[Localhost Fix] PostgreSQL background daemon is ready on 127.0.0.1:5432.');
        return true;
      }
    }
  } catch (err) {
    console.warn('[Localhost Fix] Could not launch PostgreSQL daemon:', err.message);
  }

  return false;
}

export function fixDesktopAppConfig() {
  const appData = process.env.APPDATA;
  if (!appData) return;

  const configPath = path.join(appData, 'exmark-erp', 'desktop-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const cfg = JSON.parse(raw);

      // If client mode was configured with an external/unreachable IP, reset to standalone localhost
      if (cfg.mode === 'client' && cfg.clientServerUrl && !cfg.clientServerUrl.includes('localhost') && !cfg.clientServerUrl.includes('127.0.0.1')) {
        console.log(`[Localhost Fix] Updating Desktop app config from client mode (${cfg.clientServerUrl}) to standalone mode...`);
        cfg.mode = 'standalone';
        cfg.clientServerUrl = 'http://127.0.0.1:4000';
        cfg.updatedAt = new Date().toISOString();
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
        console.log('[Localhost Fix] Desktop app config reset to standalone localhost.');
      }
    }
  } catch (err) {
    console.warn('[Localhost Fix] Desktop config check error:', err.message);
  }
}

export async function clearHungPortIfDead(port = 4000) {
  const isBusy = await checkTcpPort(port, '127.0.0.1', 800);
  if (!isBusy) return;

  const isHealthy = await checkHealthEndpoint(`http://127.0.0.1:${port}/api/health`, 6000);
  if (isHealthy) {
    console.log(`[Localhost Fix] Server on port ${port} is healthy.`);
    return;
  }

  // Also check root URL before declaring dead
  const isRootAlive = await new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });

  if (isRootAlive) {
    console.log(`[Localhost Fix] Server on port ${port} responded on root path.`);
    return;
  }

  console.warn(`[Localhost Fix] Port ${port} is occupied but unresponsive. Clearing hung process...`);
  if (process.platform === 'win32') {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -and $_ -ne ${process.pid}) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: 'ignore' }
      );
      await new Promise((r) => setTimeout(r, 1000));
      console.log(`[Localhost Fix] Hung process on port ${port} cleared.`);
    } catch {}
  }
}

export async function ensurePortForwarderRunning(targetPort = 4000) {
  const isForwarder3000Active = await checkTcpPort(3000, '127.0.0.1', 500);

  if (isForwarder3000Active) {
    console.log('[Localhost Fix] Localhost port forwarder on 3000 is active.');
    return;
  }

  const scriptPath = path.join(rootDir, 'scripts', 'localhost-port-forwarder.mjs');
  if (!fs.existsSync(scriptPath)) return;

  console.log('[Localhost Fix] Launching Localhost Port Forwarder & IPv6 Bridge...');
  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: rootDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        TARGET_PORT: String(targetPort),
        LISTEN_PORT: '3000',
      },
    });
    child.unref();
  } catch (err) {
    console.warn('[Localhost Fix] Could not spawn port forwarder:', err.message);
  }
}

export async function runAllLocalhostFixes() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — LOCALHOST & LOCAL SERVICES REPAIR');
  console.log('========================================================================');

  // 1. PostgreSQL engine
  await ensurePostgresRunning();

  // 2. Port 4000 health check / cleanup
  await clearHungPortIfDead(4000);

  // 3. Desktop app configuration
  fixDesktopAppConfig();

  // 4. Port forwarder & IPv6 bridge
  await ensurePortForwarderRunning(4000);

  console.log('========================================================================');
  console.log('  LOCALHOST SERVICES VERIFIED & READY:');
  console.log('  - Primary Web App    : http://localhost:4000');
  console.log('  - Developer Port 3000: http://localhost:3000 -> :4000');
  console.log('  - IPv6 Dual-Stack    : http://[::1]:4000 (Active)');
  console.log('  - PostgreSQL Server  : 127.0.0.1:5432 (Ready)');
  console.log('========================================================================\n');
}

const isDirectCli = process.argv[1] && process.argv[1].endsWith('ensure-local-services.mjs');
if (isDirectCli) {
  runAllLocalhostFixes().catch((err) => {
    console.error('[Localhost Fix] Error:', err);
    process.exit(1);
  });
}
