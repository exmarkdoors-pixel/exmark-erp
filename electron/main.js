/* eslint-disable @typescript-eslint/no-require-imports */
// EXMARK ERP — Self-Contained Windows Desktop Main Process
// Embeds full Next.js standalone production server using Electron's built-in Node runtime
// while preserving live factory data in C:\EXMARK-ERP-DATA across future .exe updates.

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const DEFAULT_PORT = Number(process.env.EXMARK_PORT || process.env.PORT || 4000);
const DEFAULT_DATA_DIR = 'C:\\EXMARK-ERP-DATA';
const DEFAULT_RELEASE_DIR = 'C:\\EXMARK-Releases';

function getReleaseFolderPath() {
  return process.env.EXMARK_RELEASE_DIR?.trim() || DEFAULT_RELEASE_DIR;
}

let mainWindow = null;
let localServerProcess = null;
let activeLocalPort = DEFAULT_PORT;
let activeBaseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
let isQuitting = false;
let serverLogStream = null;

function getConfigFilePath() {
  return path.join(app.getPath('userData'), 'desktop-config.json');
}

function getLegacyServerConfigPath() {
  return path.join(app.getPath('userData'), 'server-config.json');
}

function getSecretFilePath() {
  return path.join(app.getPath('userData'), 'machine-secret.key');
}

function getServerLogPath() {
  return path.join(app.getPath('userData'), 'server.log');
}

function getOrCreateMachineAuthSecret() {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim()) {
    return process.env.AUTH_SECRET.trim();
  }
  const secretPath = getSecretFilePath();
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, 'utf8');
    return generated;
  } catch (err) {
    console.warn('[Desktop Main] Could not persist machine secret:', err.message);
    return crypto.randomBytes(32).toString('hex');
  }
}

function resolveLocalPostgresDatabaseUrl(dataDir) {
  try {
    const cfgPath = path.join(dataDir, 'local-postgres.json');
    if (fs.existsSync(cfgPath)) {
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (raw && raw.enabled !== false) {
        let password = '';
        if (raw.passwordEnc && typeof raw.passwordEnc === 'string') {
          if (raw.passwordEnc.startsWith('enc1:')) {
            const keyPath = path.join(dataDir, '.vault-sync.key');
            if (fs.existsSync(keyPath)) {
              const keyHex = fs.readFileSync(keyPath, 'utf8').trim();
              if (/^[a-f0-9]{64}$/i.test(keyHex)) {
                const [, ivHex, tagHex, dataHex] = raw.passwordEnc.split(':');
                const decipher = crypto.createDecipheriv(
                  'aes-256-gcm',
                  Buffer.from(keyHex, 'hex'),
                  Buffer.from(ivHex, 'hex')
                );
                decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
                password = Buffer.concat([
                  decipher.update(Buffer.from(dataHex, 'hex')),
                  decipher.final(),
                ]).toString('utf8');
              }
            }
          } else {
            password = raw.passwordEnc;
          }
        }
        const host = (raw.host || '127.0.0.1').trim();
        const port = Number(raw.port || 5432);
        const user = encodeURIComponent((raw.user || 'postgres').trim());
        const pass = password ? `:${encodeURIComponent(password)}` : '';
        const db = encodeURIComponent((raw.database || 'exmark_erp').trim());
        return `postgresql://${user}${pass}@${host}:${port}/${db}?schema=public`;
      }
    }
  } catch (err) {
    console.warn('[Desktop Main] Could not resolve local-postgres.json:', err.message);
  }
  return '';
}

function loadDesktopConfig() {
  const defaults = {
    mode: 'standalone', // 'standalone' | 'client'
    bindLan: true,
    port: DEFAULT_PORT,
    dataDir: DEFAULT_DATA_DIR,
    clientServerUrl: '',
  };

  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(defaults, parsed);
    } else if (fs.existsSync(getLegacyServerConfigPath())) {
      // Preserve explicit custom server URL only if user configured a LAN/remote server previously
      const legacy = JSON.parse(fs.readFileSync(getLegacyServerConfigPath(), 'utf8'));
      if (legacy && legacy.serverUrl && !String(legacy.serverUrl).includes('onrender.com')) {
        defaults.clientServerUrl = String(legacy.serverUrl).trim().replace(/\/+$/, '');
      }
    }
  } catch (err) {
    console.warn('[Desktop Main] Could not load desktop config:', err.message);
  }

  // Honor explicit runtime environment overrides cleanly (used for isolated tests & custom deployments)
  if (process.env.EXMARK_DATA_DIR && process.env.EXMARK_DATA_DIR.trim()) {
    defaults.dataDir = path.resolve(process.env.EXMARK_DATA_DIR.trim());
  }
  if (process.env.EXMARK_SERVER_URL && process.env.EXMARK_SERVER_URL.trim()) {
    defaults.mode = 'client';
    defaults.clientServerUrl = process.env.EXMARK_SERVER_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.EXMARK_BIND_LAN === 'false') {
    defaults.bindLan = false;
  }

  return defaults;
}

function saveDesktopConfig(partial) {
  const current = loadDesktopConfig();
  const next = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  try {
    const configPath = getConfigFilePath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    console.error('[Desktop Main] Failed to write desktop config:', err.message);
  }
  return next;
}

function getStandalonePaths() {
  if (app.isPackaged) {
    const standaloneDir = path.join(process.resourcesPath, 'standalone');
    const serverJs = path.join(standaloneDir, 'server.js');
    const seedDir = path.join(process.resourcesPath, 'seed-data');
    const runtimeNode = path.join(process.resourcesPath, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
    return { standaloneDir, serverJs, seedDir, runtimeNode };
  }

  const projectRoot = path.join(__dirname, '..');
  const stagedDir = path.join(projectRoot, 'electron-staging', 'standalone');
  const nextStandaloneDir = path.join(projectRoot, '.next', 'standalone');
  const standaloneDir = fs.existsSync(path.join(stagedDir, 'server.js'))
    ? stagedDir
    : nextStandaloneDir;
  const runtimeNode = path.join(projectRoot, 'electron-staging', 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');

  return {
    standaloneDir,
    serverJs: path.join(standaloneDir, 'server.js'),
    seedDir: path.join(projectRoot, 'data'),
    runtimeNode,
    projectRoot,
  };
}

function seedVaultDirectory(dataDir, seedDir) {
  const resolvedDataDir = path.resolve(dataDir || DEFAULT_DATA_DIR);
  const backupsDir = path.join(resolvedDataDir, 'backups');

  try {
    fs.mkdirSync(resolvedDataDir, { recursive: true });
    fs.mkdirSync(backupsDir, { recursive: true });

    if (seedDir && fs.existsSync(seedDir)) {
      const files = fs.readdirSync(seedDir);
      for (const file of files) {
        if (!file.endsWith('.json') || file.endsWith('.tmp')) continue;
        const src = path.join(seedDir, file);
        const dest = path.join(resolvedDataDir, file);
        if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  } catch (err) {
    console.error('[Desktop Main] Vault initialization warning:', err.message);
  }

  return { dataDir: resolvedDataDir, backupsDir };
}

function checkHealthUrl(baseUrl, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const req = http.get(`${baseUrl}/api/health`, { timeout: timeoutMs }, (res) => {
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
    } catch {
      resolve(false);
    }
  });
}

function canBindPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen({ port, host: '0.0.0.0', exclusive: true });
  });
}

async function findAvailablePort(preferredPort) {
  const start = Number(preferredPort) || 4000;
  for (let p = start; p <= start + 25; p++) {
    // Skip port if something already binds it OR responds over localhost
    // eslint-disable-next-line no-await-in-loop
    const portFree = await canBindPort(p);
    if (!portFree) continue;
    // eslint-disable-next-line no-await-in-loop
    const alreadyHttp = await checkHealthUrl(`http://127.0.0.1:${p}`, 400);
    if (!alreadyHttp) {
      return p;
    }
  }
  return start + 26;
}

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const netIf of nets[name] || []) {
      if (netIf.family === 'IPv4' && !netIf.internal) {
        addresses.push(netIf.address);
      }
    }
  }
  return addresses;
}

function killEmbeddedServer() {
  if (serverLogStream) {
    try {
      serverLogStream.end();
    } catch {}
    serverLogStream = null;
  }

  if (!localServerProcess) return;

  const pid = localServerProcess.pid;
  localServerProcess = null;

  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {
    // Process may have already exited
  }
}

function loadConnectionScreen(params = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const connPath = path.join(__dirname, 'connection-screen.html');
  mainWindow.loadFile(connPath, { query: params });
}

function loadAppUrl(targetUrl) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  activeBaseUrl = String(targetUrl).replace(/\/+$/, '');
  console.log(`[Desktop Main] Loading ERP interface: ${targetUrl}`);
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.warn(`[Desktop Main] loadURL failed for ${targetUrl}:`, err.message);
    loadConnectionScreen({
      mode: loadDesktopConfig().mode,
      url: targetUrl,
      dataDir: loadDesktopConfig().dataDir,
      error: 'LOAD_FAILED',
      desc: err.message,
    });
  });
}

async function startEmbeddedStandaloneServer(options = {}) {
  const forceRestart = Boolean(options.forceRestart);
  const config = loadDesktopConfig();

  if (forceRestart) {
    killEmbeddedServer();
  }

  const paths = getStandalonePaths();
  const { dataDir, backupsDir } = seedVaultDirectory(config.dataDir, paths.seedDir);

  if (mainWindow && !mainWindow.isDestroyed()) {
    loadConnectionScreen({
      mode: 'booting',
      url: `http://127.0.0.1:${activeLocalPort}`,
      dataDir,
    });
  }

  // If unpackaged dev mode and no standalone server.js exists yet, check or launch dev Next server
  if (!app.isPackaged && !fs.existsSync(paths.serverJs)) {
    const devBaseUrl = `http://127.0.0.1:${config.port}`;
    const alreadyUp = await checkHealthUrl(devBaseUrl, 1200);
    if (alreadyUp) {
      activeLocalPort = config.port;
      activeBaseUrl = devBaseUrl;
      loadAppUrl(devBaseUrl);
      return true;
    }

    if (paths.projectRoot && fs.existsSync(path.join(paths.projectRoot, 'package.json'))) {
      activeLocalPort = await findAvailablePort(config.port);
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      localServerProcess = spawn(npmCmd, ['run', 'dev', '--', '-p', String(activeLocalPort)], {
        cwd: paths.projectRoot,
        stdio: 'ignore',
        shell: true,
        env: {
          ...process.env,
          PORT: String(activeLocalPort),
          EXMARK_DATA_DIR: dataDir,
          EXMARK_BACKUP_DIR: backupsDir,
          EXMARK_LOCAL_FACTORY: 'true',
          COOKIE_SECURE: 'false',
        },
      });
    }
  } else {
    if (!forceRestart) {
      const existingBaseUrl = `http://127.0.0.1:${config.port}`;
      if (await checkHealthUrl(existingBaseUrl, 1200)) {
        activeLocalPort = config.port;
        activeBaseUrl = existingBaseUrl;
        loadAppUrl(existingBaseUrl);
        buildApplicationMenu();
        return true;
      }
    }

    if (!fs.existsSync(paths.serverJs)) {
      const msg = `Embedded server bundle not found at ${paths.serverJs}`;
      console.error(`[Desktop Main] ${msg}`);
      loadConnectionScreen({
        mode: 'standalone',
        url: activeBaseUrl,
        dataDir,
        error: 'MISSING_BUNDLE',
        desc: msg,
      });
      return false;
    }

    if (localServerProcess && (await checkHealthUrl(`http://127.0.0.1:${activeLocalPort}`, 1000))) {
      loadAppUrl(`http://127.0.0.1:${activeLocalPort}`);
      return true;
    }

    killEmbeddedServer();
    activeLocalPort = await findAvailablePort(config.port);
    const bindHost = config.bindLan ? '0.0.0.0' : '127.0.0.1';
    const machineSecret = getOrCreateMachineAuthSecret();

    try {
      const logPath = getServerLogPath();
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      serverLogStream = fs.createWriteStream(logPath, { flags: 'w' });
    } catch {
      serverLogStream = null;
    }

    const useBundledNode = paths.runtimeNode && fs.existsSync(paths.runtimeNode);
    const serverExecutable = useBundledNode ? paths.runtimeNode : process.execPath;
    const localPgUrl = resolveLocalPostgresDatabaseUrl(dataDir);

    const serverEnv = {
      ...process.env,
      ...(useBundledNode ? {} : { ELECTRON_RUN_AS_NODE: '1' }),
      NODE_ENV: 'production',
      PORT: String(activeLocalPort),
      HOSTNAME: bindHost,
      EXMARK_DATA_DIR: dataDir,
      EXMARK_BACKUP_DIR: backupsDir,
      EXMARK_BUNDLED_DATA_DIR: paths.seedDir,
      EXMARK_LOCAL_FACTORY: 'true',
      EXMARK_APP_VERSION: app.getVersion(),
      EXMARK_RELEASE_DIR: getReleaseFolderPath(),
      ...(app.isPackaged ? { EXMARK_EXECUTABLE_PATH: process.execPath } : {}),
      ...(process.env.EXMARK_CLOUD_DATABASE_URL
        ? { EXMARK_CLOUD_DATABASE_URL: process.env.EXMARK_CLOUD_DATABASE_URL }
        : {}),
      COOKIE_SECURE: 'false',
      AUTH_SECRET: machineSecret,
      DATABASE_URL: localPgUrl || '',
      DIRECT_URL: localPgUrl || '',
      NEXT_TELEMETRY_DISABLED: '1',
    };

    console.log(`[Desktop Main] Launching embedded Next.js server (${paths.serverJs}) via ${useBundledNode ? 'bundled Node runtime' : 'ELECTRON_RUN_AS_NODE'} on ${bindHost}:${activeLocalPort}`);
    console.log(`[Desktop Main] Active external data vault: ${dataDir}`);
    if (localPgUrl) {
      console.log(`[Desktop Main] Local PostgreSQL SQL Server attached cleanly.`);
    }

    localServerProcess = spawn(serverExecutable, [paths.serverJs], {
      cwd: paths.standaloneDir,
      env: serverEnv,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (localServerProcess.stdout) {
      localServerProcess.stdout.on('data', (chunk) => {
        if (serverLogStream) serverLogStream.write(chunk);
      });
    }
    if (localServerProcess.stderr) {
      localServerProcess.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        if (serverLogStream) serverLogStream.write(chunk);
        console.error(`[Embedded Server ERR]: ${text.trim()}`);
      });
    }

    localServerProcess.on('exit', (code, signal) => {
      console.warn(`[Desktop Main] Embedded server exited (code=${code}, signal=${signal})`);
      localServerProcess = null;
    });
  }

  const targetLoopback = `http://127.0.0.1:${activeLocalPort}`;
  activeBaseUrl = targetLoopback;

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline && !isQuitting) {
    // Allow generous timeout once TCP connects so cold-start Defender scan & initial schema bootstrap complete cleanly,
    // while ECONNREFUSED fails immediately and retries every 300ms (normal subsequent boots finish in ~3-6s).
    // eslint-disable-next-line no-await-in-loop
    const healthy = await checkHealthUrl(targetLoopback, 45000);
    if (healthy) {
      console.log(`[Desktop Main] Embedded ERP engine healthy at ${targetLoopback}`);
      loadAppUrl(targetLoopback);
      buildApplicationMenu();
      return true;
    }
    if (!localServerProcess && app.isPackaged) {
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 300));
  }

  loadConnectionScreen({
    mode: 'standalone',
    url: targetLoopback,
    dataDir,
    error: 'ENGINE_TIMEOUT',
    desc: `Embedded ERP engine did not become ready on port ${activeLocalPort}. Check server log at ${getServerLogPath()}.`,
  });
  return false;
}

function isLoopbackUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

function getNavigationBaseUrl() {
  const config = loadDesktopConfig();
  if (config.mode === 'client' && config.clientServerUrl) {
    return config.clientServerUrl;
  }
  return activeBaseUrl || `http://127.0.0.1:${activeLocalPort}`;
}

function navigateToTab(tab) {
  const base = getNavigationBaseUrl();
  loadAppUrl(`${base}/?tab=${encodeURIComponent(tab)}`);
}

function buildApplicationMenu() {
  const config = loadDesktopConfig();
  const isClient = config.mode === 'client';
  const lanIps = getLanAddresses();
  const primaryLanIp = lanIps[0] || '127.0.0.1';
  const lanUrl = `http://${primaryLanIp}:${activeLocalPort}`;
  const hasLocalPg = Boolean(resolveLocalPostgresDatabaseUrl(config.dataDir));

  const menuTemplate = [
    {
      label: 'EXMARK ERP',
      submenu: [
        { label: `EXMARK ERP Desktop v${app.getVersion()}`, enabled: false },
        { label: `Mode: ${isClient ? 'Client Terminal' : 'Embedded Standalone Factory Server'}`, enabled: false },
        { type: 'separator' },
        {
          label: 'Restart Embedded Factory Server',
          click: () => {
            saveDesktopConfig({ mode: 'standalone' });
            startEmbeddedStandaloneServer({ forceRestart: true });
          },
        },
        {
          label: 'Connection & Mode Center...',
          accelerator: 'CmdOrCtrl+M',
          click: () =>
            loadConnectionScreen({
              mode: config.mode,
              url: getNavigationBaseUrl(),
              dataDir: config.dataDir,
            }),
        },
        { type: 'separator' },
        { label: 'Quit Application', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Factory Vault & Network',
      submenu: [
        {
          label: `Active Vault: ${config.dataDir}`,
          enabled: false,
        },
        {
          label: `SQL Engine: ${hasLocalPg ? 'Local PostgreSQL 18 (Configured)' : 'JSON Vault Mode (Local PG Not Configured)'}`,
          enabled: false,
        },
        {
          label: 'Local PostgreSQL & Cloud Sync Settings...',
          click: () => navigateToTab('settings'),
        },
        { type: 'separator' },
        {
          label: 'Open Live Data Vault Folder in Explorer',
          click: () => {
            const { dataDir } = seedVaultDirectory(config.dataDir, getStandalonePaths().seedDir);
            shell.openPath(dataDir);
          },
        },
        {
          label: 'Open EXE Releases Folder (C:\\EXMARK-Releases)',
          click: () => {
            const releaseDir = getReleaseFolderPath();
            fs.mkdirSync(releaseDir, { recursive: true });
            shell.openPath(releaseDir);
          },
        },
        {
          label: 'Change Data Vault Folder...',
          click: async () => {
            if (!mainWindow) return;
            const picked = await dialog.showOpenDialog(mainWindow, {
              title: 'Select Persistent EXMARK ERP Data Vault Folder',
              defaultPath: config.dataDir,
              properties: ['openDirectory', 'createDirectory'],
            });
            if (!picked.canceled && picked.filePaths[0]) {
              saveDesktopConfig({ dataDir: picked.filePaths[0], mode: 'standalone' });
              await startEmbeddedStandaloneServer({ forceRestart: true });
            }
          },
        },
        { type: 'separator' },
        {
          label: `LAN Wi-Fi Sharing: ${config.bindLan ? 'ENABLED (0.0.0.0)' : 'LOCALHOST ONLY (127.0.0.1)'}`,
          click: async () => {
            const nextBind = !config.bindLan;
            saveDesktopConfig({ bindLan: nextBind });
            if (config.mode === 'standalone') {
              await startEmbeddedStandaloneServer({ forceRestart: true });
            }
            buildApplicationMenu();
          },
        },
        {
          label: `Copy LAN URL for Workshop Tablets & Phones (${lanUrl})`,
          enabled: !isClient && config.bindLan,
          click: () => {
            clipboard.writeText(lanUrl);
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'LAN URL Copied',
                message: `Factory Wi-Fi Network URL copied to clipboard:\n\n${lanUrl}`,
                detail: 'Open this URL in workshop tablets, phones, or EXMARK Client Terminals connected to the same factory router.',
              });
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Switch to Embedded Standalone Mode (This PC Vault)',
          type: 'radio',
          checked: !isClient,
          click: () => {
            saveDesktopConfig({ mode: 'standalone' });
            startEmbeddedStandaloneServer({ forceRestart: true });
          },
        },
        {
          label: 'Switch to Client Terminal Mode (Connect Master PC)',
          type: 'radio',
          checked: isClient,
          click: () =>
            loadConnectionScreen({
              mode: 'client',
              url: config.clientServerUrl || 'http://192.168.1.100:4000',
              dataDir: config.dataDir,
            }),
        },
      ],
    },
    {
      label: 'Operations',
      submenu: [
        { label: 'Dashboard & KPI Overview', click: () => navigateToTab('dashboard') },
        { label: 'CRM & WhatsApp Leads Pipeline', click: () => navigateToTab('crm') },
        { label: 'Quotations, Auto Pricing & Installation', click: () => navigateToTab('quotations') },
        { label: 'Sales Orders & Production Lock', click: () => navigateToTab('orders') },
        { label: 'BOQ, Lock Box Kits & Store Requisition', click: () => navigateToTab('bom') },
        {
          label: 'Production Floor Kanban & Gangs',
          accelerator: 'CmdOrCtrl+P',
          click: () => navigateToTab('production'),
        },
        { label: '12L & 4"×2" Thermal Sticker Print', click: () => navigateToTab('batchPrint') },
        {
          label: 'Packing, Dispatch & Delivery Challan',
          accelerator: 'CmdOrCtrl+D',
          click: () => navigateToTab('dispatch'),
        },
        { label: 'Purchase Orders (PO)', click: () => navigateToTab('purchases') },
        {
          label: 'Accounts, Profit P&L, Break-Even & Vyapar',
          accelerator: 'CmdOrCtrl+I',
          click: () => navigateToTab('accounts'),
        },
        {
          label: 'TotalX Attendance, Geo-Selfie & GMap Payroll',
          click: () => loadAppUrl(`${getNavigationBaseUrl()}/?tab=employees&subtab=payroll`),
        },
        { label: 'Executive Reports & PDF Export', click: () => navigateToTab('reports') },
        { type: 'separator' },
        { label: 'Backup, Update Vault & Factory Reset', click: () => navigateToTab('backup') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Software Updates...',
          accelerator: 'CmdOrCtrl+U',
          click: () => navigateToTab('backup'),
        },
        {
          label: 'Open EXE Releases Folder (C:\\EXMARK-Releases)',
          click: () => {
            const releaseDir = getReleaseFolderPath();
            fs.mkdirSync(releaseDir, { recursive: true });
            shell.openPath(releaseDir);
          },
        },
        { type: 'separator' },
        {
          label: 'View Embedded Server Log',
          click: () => {
            const logPath = getServerLogPath();
            if (fs.existsSync(logPath)) {
              shell.openPath(logPath);
            } else if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Server Log',
                message: 'No embedded server log written yet.',
              });
            }
          },
        },
        {
          label: 'Factory Technical Support (WhatsApp)',
          click: async () => {
            await shell.openExternal('https://wa.me/919447928866?text=EXMARK%20ERP%20Desktop%20Support');
          },
        },
        { type: 'separator' },
        {
          label: `About EXMARK ERP v${app.getVersion()}...`,
          click: () => {
            if (!mainWindow) return;
            const cfg = loadDesktopConfig();
            const pgConfigured = Boolean(resolveLocalPostgresDatabaseUrl(cfg.dataDir));
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About EXMARK ERP',
              message: `EXMARK ERP Desktop v${app.getVersion()}`,
              detail: [
                'EXMARK DOORS PRIVATE LIMITED',
                'Enterprise FRP & WPC Architectural Doors Platform',
                '',
                `Active Data Vault: ${cfg.dataDir}`,
                `SQL Engine: ${pgConfigured ? 'Local PostgreSQL 18 (Configured)' : 'Local JSON Vault'}`,
                `Runtime: Electron ${process.versions.electron} • Node ${process.versions.node}`,
                `Server URL: ${getNavigationBaseUrl()}`,
              ].join('\n'),
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

function isSameAppOrigin(url) {
  if (!url) return false;
  if (url.startsWith('about:') || url.startsWith('blob:')) return true;
  try {
    const target = new URL(url);
    const active = new URL(getNavigationBaseUrl());
    const localHosts = new Set(['127.0.0.1', 'localhost', active.hostname]);
    return localHosts.has(target.hostname) && (target.port === active.port || target.port === String(activeLocalPort));
  } catch {
    return false;
  }
}

function createMainWindow() {
  const icoPath = path.join(__dirname, '../public/icons/icon.ico');
  const svgPath = path.join(__dirname, '../public/icons/icon-512.svg');
  const iconPath = fs.existsSync(icoPath) ? icoPath : fs.existsSync(svgPath) ? svgPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: `EXMARK ERP v${app.getVersion()} — Enterprise FRP Architectural Doors Platform`,
    icon: iconPath,
    backgroundColor: '#070D1E',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    callback({ cancel: false, responseHeaders });
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return;
    if (validatedURL && validatedURL.includes('connection-screen.html')) return;
    if (validatedURL && validatedURL.includes('index.html')) return;

    console.warn(`[Desktop Main] Page load failed: ${validatedURL} (${errorCode}: ${errorDescription})`);
    const config = loadDesktopConfig();
    loadConnectionScreen({
      mode: config.mode,
      url: validatedURL || getNavigationBaseUrl(),
      dataDir: config.dataDir,
      error: String(errorCode),
      desc: errorDescription || 'Failed to load ERP server.',
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSameAppOrigin(url)) {
      return { action: 'allow' };
    }
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildApplicationMenu();

  const config = loadDesktopConfig();
  if (config.mode === 'client' && config.clientServerUrl) {
    if (isLoopbackUrl(config.clientServerUrl)) {
      checkHealthUrl(config.clientServerUrl, 1200).then((isAlive) => {
        if (isAlive) {
          loadAppUrl(config.clientServerUrl);
        } else {
          console.log('[Desktop Main] Localhost URL configured while local server stopped — auto-starting Embedded Standalone Mode.');
          saveDesktopConfig({ mode: 'standalone' });
          buildApplicationMenu();
          startEmbeddedStandaloneServer();
        }
      });
    } else {
      checkHealthUrl(config.clientServerUrl, 1500).then((isAlive) => {
        if (isAlive) {
          loadAppUrl(config.clientServerUrl);
        } else {
          console.warn(`[Desktop Main] Remote server ${config.clientServerUrl} is unreachable. Auto-fallback to Embedded Standalone Mode.`);
          saveDesktopConfig({ mode: 'standalone' });
          buildApplicationMenu();
          startEmbeddedStandaloneServer();
        }
      });
    }
  } else {
    startEmbeddedStandaloneServer();
  }
}

// Single-instance enforcement
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(createMainWindow);
}

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
}));
ipcMain.handle('get-server-url', () => getNavigationBaseUrl());
ipcMain.handle('set-server-url', async (event, url) => {
  const clean = String(url || '').trim().replace(/\/+$/, '');
  if (!clean) return getNavigationBaseUrl();
  if (isLoopbackUrl(clean)) {
    const isAlive = await checkHealthUrl(clean, 1000);
    if (!isAlive) {
      saveDesktopConfig({ mode: 'standalone' });
      buildApplicationMenu();
      await startEmbeddedStandaloneServer({ forceRestart: false });
      return activeBaseUrl;
    }
  }
  saveDesktopConfig({ mode: 'client', clientServerUrl: clean });
  killEmbeddedServer();
  buildApplicationMenu();
  loadAppUrl(clean);
  return clean;
});
ipcMain.handle('retry-connection', () => {
  const config = loadDesktopConfig();
  if (config.mode === 'client' && config.clientServerUrl) {
    loadAppUrl(config.clientServerUrl);
  } else {
    startEmbeddedStandaloneServer({ forceRestart: true });
  }
});
ipcMain.handle('load-local-app', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
});
ipcMain.handle('open-devtools', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.openDevTools();
});
ipcMain.handle('check-local-server', () => checkHealthUrl(`http://127.0.0.1:${activeLocalPort}`, 1500));
ipcMain.handle('start-local-server', async () => {
  saveDesktopConfig({ mode: 'standalone' });
  return startEmbeddedStandaloneServer({ forceRestart: false });
});
ipcMain.handle('get-desktop-status', async () => {
  const config = loadDesktopConfig();
  const healthy = await checkHealthUrl(getNavigationBaseUrl(), 1000);
  return {
    ...config,
    activeLocalPort,
    activeUrl: getNavigationBaseUrl(),
    lanUrls: getLanAddresses().map((ip) => `http://${ip}:${activeLocalPort}`),
    isPackaged: app.isPackaged,
    healthy,
  };
});
ipcMain.handle('switch-desktop-mode', async (event, mode, clientUrl) => {
  if (mode === 'client' && clientUrl) {
    const clean = String(clientUrl).trim().replace(/\/+$/, '');
    if (isLoopbackUrl(clean)) {
      const isAlive = await checkHealthUrl(clean, 1000);
      if (!isAlive) {
        saveDesktopConfig({ mode: 'standalone' });
        buildApplicationMenu();
        const ok = await startEmbeddedStandaloneServer({ forceRestart: false });
        return { mode: 'standalone', ok, activeUrl: activeBaseUrl };
      }
    }
    saveDesktopConfig({ mode: 'client', clientServerUrl: clean });
    killEmbeddedServer();
    buildApplicationMenu();
    loadAppUrl(clean);
    return { mode: 'client', activeUrl: clean };
  }
  saveDesktopConfig({ mode: 'standalone' });
  buildApplicationMenu();
  const ok = await startEmbeddedStandaloneServer({ forceRestart: false });
  return { mode: 'standalone', ok, activeUrl: activeBaseUrl };
});
ipcMain.handle('open-data-vault', () => {
  const config = loadDesktopConfig();
  const { dataDir } = seedVaultDirectory(config.dataDir, getStandalonePaths().seedDir);
  return shell.openPath(dataDir);
});
ipcMain.handle('toggle-lan-sharing', async () => {
  const config = loadDesktopConfig();
  const nextBind = !config.bindLan;
  saveDesktopConfig({ bindLan: nextBind });
  if (config.mode === 'standalone') {
    await startEmbeddedStandaloneServer({ forceRestart: true });
  }
  buildApplicationMenu();
  return { bindLan: nextBind };
});

ipcMain.handle('open-releases-folder', () => {
  const releaseDir = getReleaseFolderPath();
  fs.mkdirSync(releaseDir, { recursive: true });
  return shell.openPath(releaseDir);
});

ipcMain.handle('launch-update-installer', async (event, installerPath) => {
  try {
    let resolved = installerPath;
    if (!resolved) {
      const releaseDir = getReleaseFolderPath();
      if (fs.existsSync(releaseDir)) {
        const parseVer = (name) => {
          const m = String(name).match(/(\d+)\.(\d+)\.(\d+)/);
          return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
        };
        const files = fs
          .readdirSync(releaseDir)
          .filter((f) => f.toLowerCase().endsWith('.exe'))
          .sort((a, b) => {
            const va = parseVer(a);
            const vb = parseVer(b);
            for (let i = 0; i < 3; i++) {
              if (vb[i] !== va[i]) return vb[i] - va[i];
            }
            const aSetup = a.toLowerCase().includes('setup') ? 1 : 0;
            const bSetup = b.toLowerCase().includes('setup') ? 1 : 0;
            return bSetup - aSetup;
          });
        if (files.length > 0) {
          resolved = path.join(releaseDir, files[0]);
        }
      }
    }
    if (!resolved || !fs.existsSync(resolved)) {
      throw new Error(`Installer file not found: ${resolved || 'None specified'}`);
    }

    console.log('[Desktop Main] Launching detached installer update:', resolved);
    const child = spawn(resolved, [], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    setTimeout(() => {
      app.quit();
    }, 1000);

    return { success: true, launched: resolved };
  } catch (err) {
    console.error('[Desktop Main] Failed to launch installer:', err.message);
    return { success: false, error: err.message };
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  killEmbeddedServer();
});

app.on('will-quit', () => {
  isQuitting = true;
  killEmbeddedServer();
});

app.on('window-all-closed', () => {
  isQuitting = true;
  killEmbeddedServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

process.on('exit', () => {
  killEmbeddedServer();
});
