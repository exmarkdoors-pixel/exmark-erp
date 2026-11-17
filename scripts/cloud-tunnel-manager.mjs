/**
 * EXMARK ERP — Cloudflare Secure Tunnel Manager & Self-Healing Supervisor
 * 
 * Provides zero-cost, resilient global HTTPS connectivity for:
 * - Field staff mobile phones on 4G/5G
 * - Drivers on road deliveries across Kerala
 * - Remote showroom laptops in Calicut / Kochi / Bangalore
 * - Executive tablets & home laptops
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.EXMARK_DATA_DIR || 'C:\\EXMARK-ERP-DATA';

export const tunnelInfoPath = path.join(dataDir, 'cloud-tunnel.json');
export const publicGatewayPath = path.join(rootDir, 'public', 'cloud-gateway-url.json');
export const tunnelLogPath = path.join(dataDir, 'cloud-tunnel.log');
export const tunnelConfigPath = path.join(dataDir, 'cloud-tunnel-config.json');

const CANDIDATE_PATHS = [
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cloudflared', 'cloudflared.exe'),
];

export function findCloudflaredBin() {
  for (const candidate of CANDIDATE_PATHS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'cloudflared';
}

export function appendLog(message) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    // Rotate log if > 500 KB
    if (fs.existsSync(tunnelLogPath) && fs.statSync(tunnelLogPath).size > 512 * 1024) {
      const old = `${tunnelLogPath}.old`;
      try { if (fs.existsSync(old)) fs.unlinkSync(old); } catch {}
      fs.renameSync(tunnelLogPath, old);
    }
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
    fs.appendFileSync(tunnelLogPath, `[${timestamp}] ${message}\n`, 'utf8');
  } catch {}
}

export function isProcessAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {}
}

export function getTunnelConfig() {
  try {
    if (fs.existsSync(tunnelConfigPath)) {
      return JSON.parse(fs.readFileSync(tunnelConfigPath, 'utf8'));
    }
  } catch {}
  return {
    customDomain: process.env.CLOUDFLARE_CUSTOM_DOMAIN || null,
    tunnelToken: process.env.CLOUDFLARE_TUNNEL_TOKEN || null,
  };
}

export function saveTunnelConfig(cfg) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(tunnelConfigPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    appendLog(`Failed to save tunnel config: ${err.message}`);
  }
}

export function readTunnelState() {
  try {
    let state = null;
    if (fs.existsSync(publicGatewayPath)) {
      state = JSON.parse(fs.readFileSync(publicGatewayPath, 'utf8'));
    } else if (fs.existsSync(tunnelInfoPath)) {
      state = JSON.parse(fs.readFileSync(tunnelInfoPath, 'utf8'));
    }
    if (!state) return null;

    // Verify true process liveness
    if (state.active && state.pid) {
      const alive = isProcessAlive(state.pid);
      if (!alive) {
        state.active = false;
        state.reason = 'Process exited';
        writeTunnelState(state);
      }
    }
    return state;
  } catch {
    return null;
  }
}

export function writeTunnelState(payload) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const content = JSON.stringify(payload, null, 2);
    fs.writeFileSync(tunnelInfoPath, content, 'utf8');
    fs.writeFileSync(publicGatewayPath, content, 'utf8');
  } catch (err) {
    appendLog(`Could not save tunnel state: ${err.message}`);
  }
}

export function stopTunnel() {
  appendLog('Stopping Cloudflare Tunnel...');
  const state = readTunnelState();
  if (state?.pid && isProcessAlive(state.pid)) {
    killProcessTree(state.pid);
  }

  // Also kill any orphan cloudflared.exe on Windows
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
    } catch {}
  }

  writeTunnelState({
    active: false,
    tunnelUrl: null,
    staffMobileUrl: null,
    pid: null,
    stoppedAt: new Date().toISOString(),
  });
  appendLog('Cloudflare Tunnel stopped.');
}

/**
 * Start the Cloudflare Tunnel with supervision and auto-recovery
 */
export function startTunnel(port = 4000, options = {}) {
  const bin = findCloudflaredBin();
  const config = getTunnelConfig();
  const token = options.token || config.tunnelToken || process.env.CLOUDFLARE_TUNNEL_TOKEN;
  const customDomain = options.customDomain || config.customDomain || process.env.CLOUDFLARE_CUSTOM_DOMAIN;

  // Clean up any stale existing instance first
  stopTunnel();

  appendLog(`Starting Cloudflare Tunnel via: ${bin}`);
  appendLog(`Forwarding local ERP on port ${port} to Cloudflare edge...`);
  console.log(`[Cloud Tunnel] Starting Cloudflare Tunnel via: ${bin}`);
  console.log(`[Cloud Tunnel] Forwarding local ERP on port ${port} to global HTTPS...`);

  // Build command args
  let args = [];
  if (token) {
    appendLog('Using permanent Cloudflare Tunnel token.');
    args = ['tunnel', 'run', '--token', token];
  } else {
    appendLog('Using TryCloudflare zero-config temporary tunnel.');
    args = ['tunnel', '--url', `http://127.0.0.1:${port}`];
  }

  let restartCount = 0;
  const maxRestarts = 5;
  let activeUrl = customDomain || null;
  let child = null;

  function launch() {
    child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const childPid = child.pid;
    appendLog(`Spawned cloudflared PID ${childPid}`);

    const handleOutput = (data) => {
      const text = data.toString();
      appendLog(text.trim());

      // Look for https://*.trycloudflare.com
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
      if (match && !activeUrl) {
        activeUrl = match[0];
        const payload = {
          active: true,
          pid: childPid,
          tunnelUrl: activeUrl,
          staffMobileUrl: `${activeUrl}/mobile`,
          localPort: port,
          mode: token ? 'PERMANENT_NAMED_TUNNEL' : 'TRYCLOUDFLARE',
          connectedAt: new Date().toISOString(),
        };

        writeTunnelState(payload);

        console.log('\n======================================================');
        console.log('🚀 CLOUDFLARE SECURE TUNNEL ONLINE (GLOBAL HTTPS)');
        console.log('======================================================');
        console.log(`  Public Web ERP URL:     ${activeUrl}`);
        console.log(`  Staff Terminal (Mobile): ${activeUrl}/mobile`);
        console.log('  Works on: 4G/5G mobile data, Showroom laptops, Anywhere');
        console.log('======================================================\n');
      }

      // If permanent token, Cloudflare connects without printing a URL
      if (token && customDomain && (text.includes('Registered tunnel connection') || text.includes('Connection registered'))) {
        const payload = {
          active: true,
          pid: childPid,
          tunnelUrl: customDomain.startsWith('http') ? customDomain : `https://${customDomain}`,
          staffMobileUrl: `${customDomain.startsWith('http') ? customDomain : `https://${customDomain}`}/mobile`,
          localPort: port,
          mode: 'PERMANENT_NAMED_TUNNEL',
          connectedAt: new Date().toISOString(),
        };
        writeTunnelState(payload);
        console.log(`[Cloud Tunnel] Permanent Named Tunnel online at: ${payload.tunnelUrl}`);
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);

    child.on('exit', (code) => {
      appendLog(`cloudflared PID ${childPid} exited with code ${code}`);
      writeTunnelState({
        active: false,
        tunnelUrl: null,
        staffMobileUrl: null,
        pid: null,
        disconnectedAt: new Date().toISOString(),
      });

      // Watchdog auto-restart if exited unexpectedly
      if (options.keepAlive !== false && restartCount < maxRestarts) {
        restartCount++;
        const backoffMs = Math.min(1000 * Math.pow(2, restartCount), 15000);
        appendLog(`Watchdog: restarting tunnel in ${backoffMs / 1000}s (attempt ${restartCount}/${maxRestarts})...`);
        setTimeout(() => {
          activeUrl = customDomain || null;
          launch();
        }, backoffMs);
      }
    });

    return child;
  }

  // Graceful cleanup on node exit
  const handleProcessSignal = () => {
    appendLog('Parent process exiting, cleaning up child tunnel...');
    if (child?.pid) {
      killProcessTree(child.pid);
    }
    writeTunnelState({ active: false, pid: null });
    process.exit(0);
  };

  process.on('SIGINT', handleProcessSignal);
  process.on('SIGTERM', handleProcessSignal);

  return launch();
}

// CLI Execution handling
if (process.argv[1] && process.argv[1].endsWith('cloud-tunnel-manager.mjs')) {
  const args = process.argv.slice(2);
  const port = Number(process.env.ERP_PORT || 4000);

  if (args.includes('--stop')) {
    stopTunnel();
    process.exit(0);
  } else if (args.includes('--status')) {
    const state = readTunnelState();
    console.log(JSON.stringify(state, null, 2));
    process.exit(0);
  } else if (args.includes('--restart')) {
    stopTunnel();
    startTunnel(port);
  } else {
    startTunnel(port);
  }
}
