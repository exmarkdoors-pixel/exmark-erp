/* eslint-disable @typescript-eslint/no-require-imports */
// EXMARK ERP Electron Preload Script — Context Isolation Bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  printPage: () => window.print(),
});
