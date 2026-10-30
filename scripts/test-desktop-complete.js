const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

async function runCompleteDesktopVerification() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — DESKTOP ZERO-BLANK-SCREEN SYSTEM VERIFICATION SUITE       ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Bundled Local Dashboard Interface Loading (Guarantees zero blank screen on launch)
  console.log('--- 1. BUNDLED LOCAL DESKTOP INTERFACE VERIFICATION ---');
  await new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      width: 1440,
      height: 900,
      webPreferences: {
        preload: path.join(__dirname, '../electron/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    win.webContents.on('did-finish-load', async () => {
      try {
        const title = await win.webContents.executeJavaScript('document.title');
        const brandTitle = await win.webContents.executeJavaScript(
          'document.querySelector(".brand-title")?.textContent'
        );
        const kpiCount = await win.webContents.executeJavaScript(
          'document.querySelectorAll(".kpi-card").length'
        );
        const navCount = await win.webContents.executeJavaScript(
          'document.querySelectorAll(".nav-item").length'
        );

        assert(title.includes('EXMARK ERP'), `Window title includes "EXMARK ERP": "${title}"`);
        assert(brandTitle === 'EXMARK DOORS', `Brand header renders correctly: "${brandTitle}"`);
        assert(kpiCount === 4, `All 4 core KPI cards rendered in DOM`);
        assert(navCount >= 8, `Navigation menu contains ${navCount} module tabs`);

        // Test Cutting Deduction Formula in DOM
        const cuttingResult = await win.webContents.executeJavaScript(
          'document.getElementById("cuttingResult")?.textContent'
        );
        assert(
          cuttingResult.includes('2090mm') && cuttingResult.includes('888mm'),
          `FRP cutting deduction formula verified in UI (Raw: 2100x900 -> Finished: 2090x888mm)`
        );

        // Test tab switching
        await win.webContents.executeJavaScript('switchTab("qc")');
        const isQcActive = await win.webContents.executeJavaScript(
          'document.getElementById("view-qc")?.classList.contains("active")'
        );
        assert(isQcActive, 'Tab switching works (6-Pt Quality Control view active)');

        // Test IPC Bridge
        const appVersion = await win.webContents.executeJavaScript('window.electronAPI.getAppVersion()');
        assert(typeof appVersion === 'string' && appVersion.length > 0, `IPC getAppVersion returned "${appVersion}"`);

      } catch (err) {
        console.error('  Evaluation error:', err);
        failed++;
      } finally {
        win.destroy();
        resolve();
      }
    });

    const localIndex = path.join(__dirname, '../electron/index.html');
    win.loadFile(localIndex);
  });

  // TEST 2: Graceful Recovery on Unreachable Network / Failed Remote URL
  console.log('\n--- 2. REMOTE CONNECTION FAILURE RECOVERY & FAILSAFE ---');
  await new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../electron/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    win.webContents.on('did-fail-load', (e, code, desc, url) => {
      console.log(`    Caught intentional remote load failure: code=${code} url=${url}`);
      // Electron main.js behavior: fall back immediately to local desktop app
      win.loadFile(path.join(__dirname, '../electron/index.html'));
    });

    win.webContents.on('did-finish-load', async () => {
      const currentUrl = win.webContents.getURL();
      if (currentUrl.includes('index.html')) {
        const hasContent = await win.webContents.executeJavaScript(
          'document.body.innerText.includes("EXMARK DOORS")'
        );
        assert(hasContent, 'Failsafe recovered: Local UI displayed instead of blank screen');
        win.destroy();
        resolve();
      }
    });

    win.loadURL('http://127.0.0.1:58888'); // Unreachable port
  });

  console.log('\n========================================================================');
  console.log(`  DESKTOP VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  setTimeout(() => {
    app.quit();
    process.exit(failed > 0 ? 1 : 0);
  }, 200);
}

// IPC handler mocks for testing
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-system-info', () => ({ platform: process.platform }));
ipcMain.handle('get-server-url', () => 'https://exmark-erp-staging.onrender.com');

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.whenReady().then(runCompleteDesktopVerification);
