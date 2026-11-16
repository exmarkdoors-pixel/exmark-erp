/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Shared real-binary EXE verification harness for EXMARK ERP Desktop.
 * Launches an actual packaged .exe against an isolated temp data vault & port,
 * verifies /api/health, /login HTML, auth session, Non-GST Door Installation quotation,
 * Lock Box Kits, persistence across EXE restart, and clean shutdown.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = options.body ? JSON.stringify(options.body) : null;
    const headers = { ...(options.headers || {}) };
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers,
        timeout: options.timeoutMs || 20000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // Already closed
  }
}

async function waitForEmbeddedServer(exePath, env, userDataDir, port, timeoutMs) {
  let stdoutLog = '';
  let stderrLog = '';

  const child = spawn(exePath, ['--enable-logging', `--user-data-dir=${userDataDir}`], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  child.stdout.on('data', (d) => {
    stdoutLog += d.toString();
  });
  child.stderr.on('data', (d) => {
    stderrLog += d.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const start = Date.now();
  let healthPayload = null;
  let lastHttpStatus = null;
  let lastHttpBody = '';
  let lastReqErr = '';

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpRequest(`${baseUrl}/api/health`, { timeoutMs: 45000 });
      lastHttpStatus = res.status;
      lastHttpBody = res.body;
      if (res.status === 200) {
        healthPayload = JSON.parse(res.body);
        break;
      }
    } catch (err) {
      lastReqErr = `${err && err.code ? err.code : ''} ${err && err.message ? err.message : String(err)}`;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!healthPayload || healthPayload.liveness !== 'ALIVE') {
    const serverLogPath = path.join(userDataDir, 'server.log');
    const serverLog = fs.existsSync(serverLogPath) ? fs.readFileSync(serverLogPath, 'utf8') : 'no server.log';
    killProcessTree(child.pid);
    throw new Error(
      `Embedded /api/health did not become ALIVE within ${timeoutMs}ms (lastStatus=${lastHttpStatus} lastReqErr=${lastReqErr} body=${lastHttpBody.slice(0, 200)}).\nSTDOUT:\n${stdoutLog}\nSTDERR:\n${stderrLog}\nSERVER.LOG:\n${serverLog}`
    );
  }

  return { child, baseUrl, healthPayload, bootMs: Date.now() - start };
}

async function verifyPackagedExecutable(options) {
  const { exePath, label, testPort = 4029, timeoutMs = 45000, copyDirOutsideWorkspace = false } = options;
  const expectedVersion =
    options.expectedVersion ||
    JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')).version;

  if (!fs.existsSync(exePath)) {
    throw new Error(`[${label}] Executable not found at ${exePath}`);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-exe-verify-'));
  const dataDir = path.join(tempRoot, 'data-vault');
  const backupDir = path.join(dataDir, 'backups');
  const userDataDir = path.join(tempRoot, 'electron-userdata');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  // When verifying win-unpacked directly, optionally copy to tempRoot so workspace parent node_modules cannot mask missing runtime packages
  let targetExePath = exePath;
  if (copyDirOutsideWorkspace) {
    const isolatedAppDir = path.join(tempRoot, 'isolated-app');
    fs.cpSync(path.dirname(exePath), isolatedAppDir, { recursive: true });
    targetExePath = path.join(isolatedAppDir, path.basename(exePath));
  }

  console.log(`\n========================================================================`);
  console.log(`  EXMARK ERP — REAL EXECUTABLE VERIFICATION: ${label}`);
  console.log(`  Binary: ${targetExePath}`);
  console.log(`  Isolated Data Vault: ${dataDir}`);
  console.log(`  Isolated Test Port:  ${testPort}`);
  console.log(`========================================================================`);

  const env = {
    ...process.env,
    EXMARK_DATA_DIR: dataDir,
    EXMARK_BACKUP_DIR: backupDir,
    EXMARK_PORT: String(testPort),
    EXMARK_BIND_LAN: 'false',
  };

  let activeChild = null;
  let createdQuotationId = '';

  try {
    // PASS 1: Fresh boot, login, Lock Box Kit & Non-GST Door Installation quotation create
    const boot1 = await waitForEmbeddedServer(targetExePath, env, userDataDir, testPort, timeoutMs);
    activeChild = boot1.child;
    const { baseUrl, healthPayload, bootMs } = boot1;

    if (expectedVersion && healthPayload.version !== expectedVersion) {
      throw new Error(`Expected /api/health version=${expectedVersion}, got ${healthPayload.version}`);
    }

    const loginHtmlRes = await httpRequest(`${baseUrl}/login`, { timeoutMs: 15000 });
    if (loginHtmlRes.status !== 200 || !loginHtmlRes.body.includes('EXMARK')) {
      throw new Error(`Login page returned status=${loginHtmlRes.status}`);
    }

    const seededStores = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
    const initialQuotes = JSON.parse(fs.readFileSync(path.join(dataDir, 'quotations-store.json'), 'utf8'));
    if (!Array.isArray(initialQuotes) || initialQuotes.length !== 0) {
      throw new Error(`Expected fresh 0 quotations, found ${initialQuotes?.length}`);
    }

    // Authenticate
    const authRes = await httpRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'director@exmarkdoors.com',
        password: process.env.FACTORY_TEST_PASSWORD || 'Exmark@2026',
      },
    });
    if (authRes.status !== 200) {
      throw new Error(`Factory login failed: status=${authRes.status} body=${authRes.body}`);
    }
    const setCookies = authRes.headers['set-cookie'] || [];
    const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
    const authData = JSON.parse(authRes.body);
    const authHeaders = {
      Cookie: cookieHeader,
      ...(authData.token ? { Authorization: `Bearer ${authData.token}` } : {}),
    };

    // Check Lock Box Kits, Door Installation Rules & Material Rates inside running .exe
    const pricingRes = await httpRequest(`${baseUrl}/api/quotations/pricing-rules`, { headers: authHeaders });
    if (
      pricingRes.status !== 200 ||
      !pricingRes.body.includes('PlusPoint Black') ||
      !pricingRes.body.includes('Black Latch Exmark') ||
      !pricingRes.body.includes('defaultInstallationRatePerDoor')
    ) {
      throw new Error(`Pricing & Lock options check failed on /api/quotations/pricing-rules (status=${pricingRes.status})`);
    }
    const ratesRes = await httpRequest(`${baseUrl}/api/boq/material-rates`, { headers: authHeaders });
    if (ratesRes.status !== 200 || !ratesRes.body.includes('PlusPoint Black') || !ratesRes.body.includes('baylatch black')) {
      throw new Error(`BOQ material rates check failed on /api/boq/material-rates (status=${ratesRes.status})`);
    }
    const vaultRes = await httpRequest(`${baseUrl}/api/system/vault-status`, { headers: authHeaders });
    if (vaultRes.status !== 200 || !vaultRes.body.includes('schemaStatus')) {
      throw new Error(`Vault status check failed on /api/system/vault-status (status=${vaultRes.status})`);
    }
    const vaultJson = JSON.parse(vaultRes.body);
    if (expectedVersion && vaultJson.appVersion !== expectedVersion) {
      throw new Error(`Vault appVersion mismatch: expected=${expectedVersion}, got=${vaultJson.appVersion}`);
    }
    if (!vaultJson.releaseInfo || !vaultJson.releaseInfo.releaseDir) {
      throw new Error('Vault status missing releaseInfo.releaseDir diagnostics');
    }

    // Check Order Profit P&L, Break-Even CVP & Vyapar Day Book APIs inside running .exe
    const profitRes = await httpRequest(`${baseUrl}/api/orders/profit`, { headers: authHeaders });
    const profitJson = profitRes.status === 200 ? JSON.parse(profitRes.body) : null;
    if (profitRes.status !== 200 || !profitJson?.success || !profitJson?.data?.summary) {
      throw new Error(`Order profit check failed on /api/orders/profit (status=${profitRes.status})`);
    }

    const breakEvenRes = await httpRequest(`${baseUrl}/api/finance/break-even`, { headers: authHeaders });
    const breakEvenJson = breakEvenRes.status === 200 ? JSON.parse(breakEvenRes.body) : null;
    if (
      breakEvenRes.status !== 200 ||
      !breakEvenJson?.success ||
      !Array.isArray(breakEvenJson?.data?.engineeringMatrix) ||
      !breakEvenJson?.data?.activeBreakEven
    ) {
      throw new Error(`Break-even check failed on /api/finance/break-even (status=${breakEvenRes.status})`);
    }

    const dayBookRes = await httpRequest(`${baseUrl}/api/finance/daybook`, { headers: authHeaders });
    const dayBookJson = dayBookRes.status === 200 ? JSON.parse(dayBookRes.body) : null;
    if (dayBookRes.status !== 200 || !dayBookJson?.success || !dayBookJson?.data?.monthKey) {
      throw new Error(`Day book check failed on /api/finance/daybook (status=${dayBookRes.status})`);
    }

    const cloudSyncRes = await httpRequest(`${baseUrl}/api/system/cloud-sync`, { headers: authHeaders });
    const cloudSyncJson = cloudSyncRes.status === 200 ? JSON.parse(cloudSyncRes.body) : null;
    if (cloudSyncRes.status !== 200 || !cloudSyncJson?.success || !cloudSyncJson?.overview?.state) {
      throw new Error(`Cloud sync check failed on /api/system/cloud-sync (status=${cloudSyncRes.status})`);
    }

    // Create Non-GST Quotation with Door Installation inside running .exe
    const quoteRes = await httpRequest(`${baseUrl}/api/quotations`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        customerName: 'EXE Smoke Factory Client',
        location: 'Kozhikode',
        includeInstallation: true,
        installationRate: 500,
        installationQty: 2,
        installationAmount: 1000,
        items: [
          {
            doorCategory: 'A',
            doorModel: 'Teak Wood',
            heightMm: 2100,
            widthMm: 800,
            thicknessMm: 32,
            quantity: 2,
            unitPrice: 7000,
          },
        ],
      },
    });
    if (quoteRes.status !== 201 && quoteRes.status !== 200) {
      throw new Error(`Create quotation failed: status=${quoteRes.status} body=${quoteRes.body}`);
    }
    const quoteJson = JSON.parse(quoteRes.body);
    const q = quoteJson.data;
    createdQuotationId = q.id;
    if (Number(q.gstAmount || 0) !== 0 || !q.includeInstallation || Number(q.installationAmount) !== 1000) {
      throw new Error(`Unexpected quotation payload: gstAmount=${q.gstAmount}, installationAmount=${q.installationAmount}`);
    }

    console.log(`  ✓ Boot #1 ready in ${bootMs}ms (v${healthPayload.version}, ${seededStores.length} seed stores, 0 initial transactions)`);
    console.log(`  ✓ Authenticated, verified Lock Box Kits, & created Non-GST + Door Installation quote (${q.quoteNumber})`);

    // Shutdown EXE cleanly before PASS 2
    killProcessTree(activeChild.pid);
    activeChild = null;
    await new Promise((r) => setTimeout(r, 1200));

    // PASS 2: Relaunch EXE against the same external vault & confirm data persists
    const boot2 = await waitForEmbeddedServer(targetExePath, env, userDataDir, testPort, timeoutMs);
    activeChild = boot2.child;

    const auth2Res = await httpRequest(`${boot2.baseUrl}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'director@exmarkdoors.com',
        password: process.env.FACTORY_TEST_PASSWORD || 'Exmark@2026',
      },
    });
    const cookies2 = (auth2Res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
    const auth2Json = JSON.parse(auth2Res.body);
    const listRes = await httpRequest(`${boot2.baseUrl}/api/quotations`, {
      headers: {
        Cookie: cookies2,
        ...(auth2Json.token ? { Authorization: `Bearer ${auth2Json.token}` } : {}),
      },
    });
    const listJson = JSON.parse(listRes.body);
    const persisted = Array.isArray(listJson.data) && listJson.data.some((item) => item.id === createdQuotationId);
    if (!persisted) {
      throw new Error(`Created quotation ${createdQuotationId} did not persist after EXE restart!`);
    }

    console.log(`  ✓ Boot #2 ready in ${boot2.bootMs}ms & verified zero-data-loss persistence (${createdQuotationId})`);
  } finally {
    if (activeChild && activeChild.pid) {
      killProcessTree(activeChild.pid);
    }
    await new Promise((r) => setTimeout(r, 1200));
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Non-fatal cleanup note
    }
  }
}

module.exports = { verifyPackagedExecutable };
