/**
 * EXMARK ERP — Localhost & Factory LAN Server Runner
 *
 * Ensures http://localhost:4000 (and http://<LAN-IP>:4000) boots cleanly with
 * output: 'standalone', loads .env.local (C:\EXMARK-ERP-DATA), opens browser
 * only after /api/health responds 200 (when --open is passed), and avoids
 * port-collision crashes if localhost:4000 is already running.
 */

import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';
import http from 'http';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function parseArgs(argv) {
  let port = Number(process.env.ERP_PORT || process.env.PORT || 4000);
  let host = process.env.HOSTNAME || '0.0.0.0';
  let openBrowser = false;
  let forceDev = false;
  let watch = false;
  let forceRebuild = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--open') openBrowser = true;
    else if (a === '--dev') forceDev = true;
    else if (a === '--watch') watch = true;
    else if (a === '--rebuild') forceRebuild = true;
    else if (a === '--port' && argv[i + 1]) port = Number(argv[++i]);
    else if (a === '--host' && argv[i + 1]) host = argv[++i];
    else if (/^\d{4,5}$/.test(a)) port = Number(a);
  }
  return { port, host, openBrowser, forceDev, watch, forceRebuild };
}

function loadEnvFiles() {
  const env = { ...process.env };
  for (const filename of ['.env', '.env.local']) {
    const full = path.join(rootDir, filename);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!env[key]) {
        env[key] = val;
      }
    }
  }
  return env;
}

function checkHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(res.statusCode === 200 && (json.liveness === 'ALIVE' || json.service === 'EXMARK-ERP' || (json.profile && json.profile.companyName && json.profile.companyName.includes('EXMARK'))));
        } catch {
          resolve(false);
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

function openUrlInBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

function copyDirSyncFresh(src, dest, overwriteChanged = false) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSyncFresh(s, d, overwriteChanged);
    } else if (entry.isFile()) {
      if (!fs.existsSync(d)) {
        fs.copyFileSync(s, d);
      } else if (overwriteChanged) {
        const sStat = fs.statSync(s);
        const dStat = fs.statSync(d);
        if (sStat.mtimeMs > dStat.mtimeMs || sStat.size !== dStat.size) {
          fs.copyFileSync(s, d);
        }
      }
    }
  }
}

function getLanUrls(port) {
  const urls = [];
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        urls.push(`http://${iface.address}:${port}`);
      }
    }
  }
  return urls;
}

function isTcpPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function clearHungPortProcess(port) {
  if (process.platform !== 'win32') return;
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -and $_ -ne ${process.pid}) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`,
      { stdio: 'ignore' }
    );
  } catch {
    // Ignore if already exited
  }
}

function ensureStandaloneAssetsReady(standaloneDir) {
  const staticSrc = path.join(rootDir, '.next', 'static');
  const publicSrc = path.join(rootDir, 'public');
  copyDirSyncFresh(staticSrc, path.join(standaloneDir, '.next', 'static'), true);
  copyDirSyncFresh(publicSrc, path.join(standaloneDir, 'public'), true);

  for (const pkg of ['@prisma', '.prisma', 'pg', 'pg-protocol', 'pg-types', 'pg-pool', 'pg-connection-string', 'bcryptjs']) {
    const srcPkg = path.join(rootDir, 'node_modules', pkg);
    const destPkg = path.join(standaloneDir, 'node_modules', pkg);
    const sentinel = pkg === 'pg-protocol' ? path.join(destPkg, 'dist', 'index.js') : destPkg;
    if (fs.existsSync(srcPkg) && !fs.existsSync(sentinel)) {
      copyDirSyncFresh(srcPkg, destPkg, false);
    }
  }
}

function getLatestMtimeMs(relPaths) {
  let latest = 0;
  const walk = (target) => {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (stat.mtimeMs > latest) latest = stat.mtimeMs;
      return;
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
        walk(path.join(target, entry.name));
      }
    }
  };
  for (const rel of relPaths) {
    walk(path.join(rootDir, rel));
  }
  return latest;
}

function hasValidStandaloneBundle(serverPath) {
  if (!fs.existsSync(serverPath)) return false;
  const standaloneDir = path.dirname(serverPath);
  const nextPkgJson = path.join(standaloneDir, 'node_modules', 'next', 'package.json');
  const nextStaticDir = path.join(rootDir, '.next', 'static');
  return fs.existsSync(nextPkgJson) && fs.existsSync(nextStaticDir);
}

function rebuildStandaloneNext() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('[EXMARK Localhost] Rebuilding production Next.js standalone bundle...');
  execSync(`${npmCmd} run build`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

async function main() {
  let { port, host, openBrowser, forceDev, watch, forceRebuild } = parseArgs(process.argv.slice(2));
  const loopbackUrl = `http://localhost:${port}`;
  const healthUrl = `http://127.0.0.1:${port}/api/health`;

  if (await checkHealth(healthUrl)) {
    console.log(`[EXMARK Localhost] Server is already running and healthy at ${loopbackUrl}`);
    for (const lanUrl of getLanUrls(port)) {
      console.log(`[EXMARK Localhost] Factory LAN URL: ${lanUrl}`);
    }
    if (openBrowser) {
      openUrlInBrowser(loopbackUrl);
    }
    return;
  }

  // Find next available port if requested port is occupied by an external service
  while (await isTcpPortBusy(port)) {
    if (await checkHealth(`http://127.0.0.1:${port}/api/health`)) {
      console.log(`[EXMARK Localhost] Server is already running and healthy at http://localhost:${port}`);
      for (const lanUrl of getLanUrls(port)) {
        console.log(`[EXMARK Localhost] Factory LAN URL: ${lanUrl}`);
      }
      if (openBrowser) {
        openUrlInBrowser(`http://localhost:${port}`);
      }
      return;
    }
    console.warn(`[EXMARK Localhost] Port ${port} is occupied by an external service. Shifting to port ${port + 1}...`);
    port++;
  }

  const loadedEnv = loadEnvFiles();
  const dataDir = loadedEnv.EXMARK_DATA_DIR || 'C:\\EXMARK-ERP-DATA';
  const backupDir = loadedEnv.EXMARK_BACKUP_DIR || path.join(dataDir, 'backups');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const serverEnv = {
    ...loadedEnv,
    PORT: String(port),
    HOSTNAME: host,
    EXMARK_DATA_DIR: dataDir,
    EXMARK_BACKUP_DIR: backupDir,
    EXMARK_BUNDLED_DATA_DIR: path.join(rootDir, 'data'),
    EXMARK_LOCAL_FACTORY: 'true',
    COOKIE_SECURE: 'false',
    EXMARK_CLOUD_DATABASE_URL: loadedEnv.EXMARK_CLOUD_DATABASE_URL || loadedEnv.DATABASE_URL || '',
    DATABASE_URL: loadedEnv.DATABASE_URL || '',
    DIRECT_URL: loadedEnv.DIRECT_URL || loadedEnv.DATABASE_URL || '',
    NEXT_TELEMETRY_DISABLED: '1',
  };

  const stagedStandaloneServer = path.join(rootDir, 'electron-staging', 'standalone', 'server.js');
  const nextStandaloneServer = path.join(rootDir, '.next', 'standalone', 'server.js');

  if (!forceDev) {
    const validBundle = hasValidStandaloneBundle(nextStandaloneServer);
    const isStale =
      validBundle &&
      getLatestMtimeMs(['app', 'components', 'lib', 'package.json']) > fs.statSync(nextStandaloneServer).mtimeMs;
    if (forceRebuild || !validBundle) {
      if (!validBundle && !forceRebuild) {
        console.warn('[EXMARK Localhost] Standalone bundle is missing or incomplete. Running clean build...');
      }
      rebuildStandaloneNext();
    } else if (isStale) {
      console.warn(
        '[EXMARK Localhost] WARNING: .next/standalone is older than source edits (app/, components/, lib/, or package.json). Pass --rebuild or run "npm run build" for fresh code.'
      );
    }
  }

  let activeChild = null;
  let stopping = false;
  let browserOpenedOnce = false;

  const stopGracefully = () => {
    stopping = true;
    if (activeChild && !activeChild.killed) {
      activeChild.kill();
    }
    process.exit(0);
  };
  process.on('SIGINT', stopGracefully);
  process.on('SIGTERM', stopGracefully);

  const launchServerProcess = () => {
    if (!forceDev && fs.existsSync(nextStandaloneServer)) {
      const standaloneDir = path.dirname(nextStandaloneServer);
      ensureStandaloneAssetsReady(standaloneDir);
      console.log(`[EXMARK Localhost] Starting production standalone server on ${loopbackUrl} (Vault: ${dataDir})...`);
      for (const lanUrl of getLanUrls(port)) {
        console.log(`[EXMARK Localhost] Factory LAN URL: ${lanUrl}`);
      }
      activeChild = spawn(process.execPath, [nextStandaloneServer], {
        cwd: standaloneDir,
        env: { ...serverEnv, NODE_ENV: 'production' },
        stdio: 'inherit',
      });
    } else if (!forceDev && fs.existsSync(stagedStandaloneServer)) {
      const standaloneDir = path.dirname(stagedStandaloneServer);
      console.log(`[EXMARK Localhost] Starting staged standalone server on ${loopbackUrl} (Vault: ${dataDir})...`);
      activeChild = spawn(process.execPath, [stagedStandaloneServer], {
        cwd: standaloneDir,
        env: { ...serverEnv, NODE_ENV: 'production' },
        stdio: 'inherit',
      });
    } else {
      console.log(`[EXMARK Localhost] Starting Next.js dev server on ${loopbackUrl} (Vault: ${dataDir})...`);
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      activeChild = spawn(npxCmd, ['next', 'dev', '-H', host, '-p', String(port)], {
        cwd: rootDir,
        env: serverEnv,
        shell: process.platform === 'win32',
        stdio: 'inherit',
      });
    }

    activeChild.on('exit', (code) => {
      if (stopping) return;
      if (watch) {
        console.warn(`[EXMARK Localhost] Server exited (code ${code}). Watchdog restarting in 2s...`);
        setTimeout(() => {
          if (!stopping) launchServerProcess();
        }, 2000);
        return;
      }
      process.exit(code || 0);
    });
  };

  launchServerProcess();

  if (openBrowser) {
    const start = Date.now();
    const timer = setInterval(async () => {
      if (await checkHealth(healthUrl)) {
        clearInterval(timer);
        if (!browserOpenedOnce) {
          browserOpenedOnce = true;
          console.log(`[EXMARK Localhost] Ready! Opening ${loopbackUrl}...`);
          openUrlInBrowser(loopbackUrl);
        }
      } else if (Date.now() - start > 60000) {
        clearInterval(timer);
      }
    }, 500);
  }
}

main().catch((err) => {
  console.error('[EXMARK Localhost] Fatal startup error:', err);
  process.exit(1);
});
