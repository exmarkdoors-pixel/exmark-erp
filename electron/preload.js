/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  retryConnection: () => ipcRenderer.invoke('retry-connection'),
  checkLocalServer: () => ipcRenderer.invoke('check-local-server'),
  startLocalServer: () => ipcRenderer.invoke('start-local-server'),
  getDesktopStatus: () => ipcRenderer.invoke('get-desktop-status'),
  switchDesktopMode: (mode, clientUrl) => ipcRenderer.invoke('switch-desktop-mode', mode, clientUrl),
  openDataVaultFolder: () => ipcRenderer.invoke('open-data-vault'),
  toggleLanSharing: () => ipcRenderer.invoke('toggle-lan-sharing'),
  openLegacyOfflineUi: () => ipcRenderer.invoke('load-local-app'),
  printPage: () => window.print(),
});
