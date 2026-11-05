/* eslint-disable @typescript-eslint/no-require-imports */
// EXMARK ERP — Windows Desktop Application Electron Main Process
// Resilient Multi-Terminal Plant & Regional Office Architecture

const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
const CLOUD_STAGING_URL = 'https://exmark-erp-staging.onrender.com';
const LOCAL_DEV_URL = 'http://127.0.0.1:3000';

function checkLocalServer(callback) {
  try {
    const req = http.get(`${LOCAL_DEV_URL}/api/health`, { timeout: 2000 }, (res) => {
      callback(res.statusCode === 200);
    });
    req.on('error', () => {
      // Also test localhost if 127.0.0.1 failed
      const req2 = http.get('http://localhost:3000/api/health', { timeout: 2000 }, (res2) => {
        callback(res2.statusCode === 200);
      });
      req2.on('error', () => callback(false));
      req2.on('timeout', () => {
        req2.destroy();
        callback(false);
      });
    });
    req.on('timeout', () => {
      req.destroy();
      callback(false);
    });
  } catch {
    callback(false);
  }
}

function getConfigFilePath() {
  return path.join(app.getPath('userData'), 'server-config.json');
}

function getStoredServerUrl() {
  if (process.env.EXMARK_SERVER_URL) {
    return process.env.EXMARK_SERVER_URL.trim().replace(/\/+$/, '');
  }
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.serverUrl) {
        return data.serverUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch (err) {
    console.warn('[Desktop Main] Could not read stored server config:', err.message);
  }
  return CLOUD_STAGING_URL;
}

function saveServerUrl(url) {
  try {
    const configPath = getConfigFilePath();
    const cleanUrl = url.trim().replace(/\/+$/, '');
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: cleanUrl, updatedAt: new Date().toISOString() }, null, 2));
    return cleanUrl;
  } catch (err) {
    console.error('[Desktop Main] Failed to write server config:', err.message);
    return url;
  }
}

// Enforce single instance lock
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

function loadLocalDesktopApp() {
  if (!mainWindow) return;
  const localIndex = path.join(__dirname, 'index.html');
  console.log(`[Desktop Main] Loading bundled local desktop UI: ${localIndex}`);
  mainWindow.loadFile(localIndex);
}

function loadRemoteUrl(targetUrl) {
  if (!mainWindow) return;
  console.log(`[Desktop Main] Loading remote ERP URL: ${targetUrl}`);
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.warn(`[Desktop Main] loadURL failed: ${err.message}. Loading bundled local desktop UI.`);
    loadLocalDesktopApp();
  });
}

function createMainWindow() {
  const iconPath = path.join(__dirname, '../public/icons/icon-512.svg');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'EXMARK ERP — Kerala FRP Architectural Doors Enterprise Platform',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
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

  // Strip restrictive headers to ensure seamless rendering of print previews & embedded ERP forms
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    callback({ cancel: false, responseHeaders });
  });

  const menuTemplate = [
    {
      label: 'EXMARK ERP',
      submenu: [
        { label: 'About EXMARK Doors', role: 'about' },
        { type: 'separator' },
        {
          label: 'Desktop Terminal Home (Offline Workstation)',
          accelerator: 'CmdOrCtrl+H',
          click: () => loadLocalDesktopApp(),
        },
        {
          label: 'Open Cloud ERP Platform (Render)',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            saveServerUrl(CLOUD_STAGING_URL);
            loadRemoteUrl(CLOUD_STAGING_URL);
          },
        },
        {
          label: 'Connect to Localhost Server (Port 3000)',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            saveServerUrl(LOCAL_DEV_URL);
            loadRemoteUrl(LOCAL_DEV_URL);
          },
        },
        { type: 'separator' },
        { label: 'Quit Application', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Server Connection',
      submenu: [
        {
          label: '🌐 Cloud Enterprise Server (Render)',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            saveServerUrl(CLOUD_STAGING_URL);
            loadRemoteUrl(CLOUD_STAGING_URL);
          },
        },
        {
          label: '💻 Local Developer Server (http://127.0.0.1:3000)',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            saveServerUrl(LOCAL_DEV_URL);
            loadRemoteUrl(LOCAL_DEV_URL);
          },
        },
        {
          label: '🔌 Offline Standalone Workstation Mode',
          accelerator: 'CmdOrCtrl+3',
          click: () => loadLocalDesktopApp(),
        },
        { type: 'separator' },
        {
          label: '🔄 Reconnect Current Server',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => loadRemoteUrl(getStoredServerUrl()),
        },
      ],
    },
    {
      label: 'Operations',
      submenu: [
        {
          label: 'CRM & WhatsApp Leads Pipeline',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=crm`),
        },
        {
          label: 'Quotations & FRP Auto Pricing (80x210 cm)',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=quotations`),
        },
        {
          label: 'Sales Orders & 40% Advance Gatekeeper',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=orders`),
        },
        {
          label: 'BOM & Material Requisition Store Slip',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=bom`),
        },
        {
          label: 'Job Cards & Cutting Deductions',
          accelerator: 'CmdOrCtrl+P',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=production`),
        },
        {
          label: 'Quality Control (IS 14856:2000 Inspection)',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=qc`),
        },
        {
          label: 'Batch Sticker Printing (A4 12-Up & Thermal)',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=batchPrint`),
        },
        {
          label: 'Fleet Dispatches & Gate Passes',
          accelerator: 'CmdOrCtrl+D',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=dispatch`),
        },
        {
          label: 'GST Accounts & Invoices (18% GST)',
          accelerator: 'CmdOrCtrl+I',
          click: () => loadRemoteUrl(`${getStoredServerUrl()}/?tab=accounts`),
        },
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
          label: 'Factory Technical Support',
          click: async () => {
            await shell.openExternal('https://wa.me/919447012345?text=EXMARK%20ERP%20Desktop%20Support');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Fallback to local desktop interface if remote load fails
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Desktop Main] Failed to load URL: ${validatedURL} (Code: ${errorCode}, ${errorDescription})`);
    
    // Ignore canceled/aborted user navigations
    if (errorCode === -3) return;

    // If local file failed, don't loop
    if (validatedURL.includes('index.html')) return;

    // Instantly recover by loading the offline desktop dashboard
    loadLocalDesktopApp();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Desktop Main] Renderer content ready.');
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Default launch sequence:
  // 1. If EXMARK_SERVER_URL is explicitly passed in environment, use that
  // 2. Otherwise auto-detect if local ERP server (http://127.0.0.1:3000) is running
  // 3. If local server is not running, connect directly to configured cloud ERP platform
  // 4. Fall back to bundled offline workstation UI only if network/server is completely unreachable
  if (process.env.EXMARK_SERVER_URL) {
    loadRemoteUrl(process.env.EXMARK_SERVER_URL);
  } else {
    checkLocalServer((isLocalActive) => {
      if (isLocalActive) {
        console.log('[Desktop Main] Localhost Next.js server detected on port 3000. Loading full local ERP.');
        loadRemoteUrl(LOCAL_DEV_URL);
      } else {
        const targetServer = getStoredServerUrl();
        console.log(`[Desktop Main] Local server not running on port 3000. Connecting to primary ERP platform: ${targetServer}`);
        loadRemoteUrl(targetServer);
      }
    });
  }
}

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
}));
ipcMain.handle('get-server-url', () => getStoredServerUrl());
ipcMain.handle('set-server-url', (event, url) => {
  const clean = saveServerUrl(url);
  loadRemoteUrl(clean);
  return clean;
});
ipcMain.handle('retry-connection', () => {
  loadRemoteUrl(getStoredServerUrl());
});
ipcMain.handle('load-local-app', () => {
  loadLocalDesktopApp();
});
ipcMain.handle('open-devtools', () => {
  if (mainWindow) mainWindow.webContents.openDevTools();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
