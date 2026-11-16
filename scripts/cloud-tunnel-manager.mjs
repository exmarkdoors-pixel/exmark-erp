/**
 * EXMARK ERP — Cloudflare Secure Tunnel Manager
 * 
 * Provides zero-cost, instant global HTTPS connectivity for:
 * - Field staff mobile phones on 4G/5G
 * - Drivers on road deliveries across Kerala
 * - Remote showroom laptops in Calicut / Kochi / Bangalore
 * - Executive tablets & home laptops
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.EXMARK_DATA_DIR || 'C:\\EXMARK-ERP-DATA';
const tunnelInfoPath = path.join(dataDir, 'cloud-tunnel.json');
const publicGatewayPath = path.join(rootDir, 'public', 'cloud-gateway-url.json');

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

export function startTunnel(port = 4000) {
  const bin = findCloudflaredBin();
  console.log(`[Cloud Tunnel] Starting Cloudflare Tunnel via: ${bin}`);
  console.log(`[Cloud Tunnel] Forwarding local ERP on port ${port} to global HTTPS...`);

  const child = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let activeUrl = null;

  const handleOutput = (data) => {
    const text = data.toString();
    // Look for https://*.trycloudflare.com
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
    if (match && !activeUrl) {
      activeUrl = match[0];
      const payload = {
        active: true,
        tunnelUrl: activeUrl,
        staffMobileUrl: `${activeUrl}/mobile`,
        localPort: port,
        connectedAt: new Date().toISOString(),
      };

      try {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(tunnelInfoPath, JSON.stringify(payload, null, 2), 'utf8');
        fs.writeFileSync(publicGatewayPath, JSON.stringify(payload, null, 2), 'utf8');
      } catch (err) {
        console.warn('[Cloud Tunnel] Could not save tunnel state:', err.message);
      }

      console.log('\n======================================================');
      console.log('🚀 CLOUDFLARE SECURE TUNNEL ONLINE (GLOBAL HTTPS)');
      console.log('======================================================');
      console.log(`  Public Web ERP URL:     ${activeUrl}`);
      console.log(`  Staff Terminal (Mobile): ${activeUrl}/mobile`);
      console.log('  Works on: 4G/5G mobile data, Showroom laptops, Anywhere');
      console.log('======================================================\n');
    }
  };

  child.stdout.on('data', handleOutput);
  child.stderr.on('data', handleOutput);

  child.on('exit', (code) => {
    console.log(`[Cloud Tunnel] Process exited with code ${code}`);
    try {
      if (fs.existsSync(tunnelInfoPath)) {
        const state = JSON.parse(fs.readFileSync(tunnelInfoPath, 'utf8'));
        state.active = false;
        state.disconnectedAt = new Date().toISOString();
        fs.writeFileSync(tunnelInfoPath, JSON.stringify(state, null, 2), 'utf8');
      }
    } catch {}
  });

  return child;
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('cloud-tunnel-manager.mjs')) {
  startTunnel(Number(process.env.ERP_PORT || 4000));
}
