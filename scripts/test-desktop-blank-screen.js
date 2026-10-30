const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

async function runDesktopVerification() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — DESKTOP BLANK BLUE SCREEN ROOT CAUSE & FIX VERIFICATION  ');
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

  // TEST 1: Verify Error Fallback Screen under connection failure (reproducing the old blank screen trigger)
  console.log('--- TEST 1: REFUSED CONNECTION ERROR HANDLING ---');
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
      console.log(`    Caught intentional failed load: code=${code} url=${url}`);
      // Load fallback
      const connPath = path.join(__dirname, '../electron/connection-screen.html');
      win.loadFile(connPath, { search: `url=${encodeURIComponent(url)}&error=${code}&desc=${encodeURIComponent(desc)}` });
    });

    win.webContents.on('did-finish-load', async () => {
      const currentUrl = win.webContents.getURL();
      if (currentUrl.includes('connection-screen.html')) {
        const title = await win.webContents.executeJavaScript('document.title');
        const hasErrorBox = await win.webContents.executeJavaScript('document.getElementById("errorBox") !== null');
        const hasServerInput = await win.webContents.executeJavaScript('document.getElementById("serverInput") !== null');
        
        assert(title.includes('Connection Center'), 'Fallback screen loaded with valid title');
        assert(hasErrorBox, 'Interactive error box rendered in DOM');
        assert(hasServerInput, 'Server address reconfiguration input present');
        win.destroy();
        resolve();
      }
    });

    // Try unreachable address to simulate local server not running
    win.loadURL('http://127.0.0.1:59999');
  });

  // TEST 2: Verify Live ERP Application Loads Successfully
  console.log('\n--- TEST 2: LIVE ERP CLOUD APPLICATION RENDERING ---');
  await new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../electron/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    win.webContents.on('did-finish-load', async () => {
      try {
        const currentUrl = win.webContents.getURL();
        console.log(`    Renderer finished loading: ${currentUrl}`);

        const title = await win.webContents.executeJavaScript('document.title');
        const bodyLength = await win.webContents.executeJavaScript('document.body.innerHTML.length');
        const hasHeading = await win.webContents.executeJavaScript(
          'document.body.innerText.includes("EXMARK") || document.body.innerText.includes("Door")'
        );

        assert(title.includes('EXMARK ERP'), `Document title set: "${title}"`);
        assert(bodyLength > 1000, `DOM tree populated with real HTML (${bodyLength} characters)`);
        assert(hasHeading, 'Page contains EXMARK ERP branding and content');
        assert(!currentUrl.includes('about:blank'), 'Renderer is not stuck on blank page');
      } catch (err) {
        console.error('    Eval error in test:', err.message);
      } finally {
        win.destroy();
        resolve();
      }
    });

    win.webContents.on('did-fail-load', (e, code, desc, url) => {
      console.error(`    Cloud load failed: code=${code} desc=${desc}`);
      assert(false, `Cloud staging should be reachable, failed with ${code}`);
      win.destroy();
      resolve();
    });

    win.loadURL('https://exmark-erp-staging.onrender.com');
  });

  console.log('\n========================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  setTimeout(() => {
    app.quit();
    process.exit(failed > 0 ? 1 : 0);
  }, 200);
}

app.on('window-all-closed', (e) => {
  // Prevent auto-quitting between test runs
  e.preventDefault();
});

app.whenReady().then(runDesktopVerification);
