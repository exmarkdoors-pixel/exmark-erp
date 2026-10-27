/* eslint-disable @typescript-eslint/no-require-imports */
// EXMARK ERP — Windows Desktop Application Electron Main Process
// Supports multi-office computers connected to central cloud/LAN ERP

const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
const ERP_SERVER_URL = process.env.EXMARK_SERVER_URL || 'http://localhost:3000';

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window if a second instance is launched
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createMainWindow);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 768,
    title: 'EXMARK ERP — Kerala FRP Architectural Doors',
    icon: path.join(__dirname, '../public/icons/icon-512.svg'),
    backgroundColor: '#0B132B',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const menuTemplate = [
    {
      label: 'EXMARK ERP',
      submenu: [
        { label: 'About EXMARK Doors', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences / Plant Connection', accelerator: 'CmdOrCtrl+,', click: () => {
          if (mainWindow) mainWindow.loadURL(`${ERP_SERVER_URL}/?tab=settings`);
        }},
        { type: 'separator' },
        { label: 'Quit Application', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Operations',
      submenu: [
        { label: 'Door Measurement Book', accelerator: 'CmdOrCtrl+M', click: () => {
          if (mainWindow) mainWindow.loadURL(`${ERP_SERVER_URL}/?tab=measurements`);
        }},
        { label: 'Job Cards & Cutting', accelerator: 'CmdOrCtrl+P', click: () => {
          if (mainWindow) mainWindow.loadURL(`${ERP_SERVER_URL}/?tab=production`);
        }},
        { label: 'Fleet Dispatches', accelerator: 'CmdOrCtrl+D', click: () => {
          if (mainWindow) mainWindow.loadURL(`${ERP_SERVER_URL}/?tab=dispatch`);
        }},
        { label: 'GST Accounts & Invoices', accelerator: 'CmdOrCtrl+I', click: () => {
          if (mainWindow) mainWindow.loadURL(`${ERP_SERVER_URL}/?tab=accounts`);
        }},
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
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

  // Load cloud or local ERP server
  mainWindow.loadURL(ERP_SERVER_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for desktop integration
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
}));

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
