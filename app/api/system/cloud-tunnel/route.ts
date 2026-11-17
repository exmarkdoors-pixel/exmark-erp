import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import QRCode from 'qrcode';
import { getDataDir, getDataFilePath } from '@/lib/utils/dataPaths';

const tunnelInfoPath = getDataFilePath('cloud-tunnel.json');
const publicGatewayPath = path.join(process.cwd(), 'public', 'cloud-gateway-url.json');
const tunnelLogPath = getDataFilePath('cloud-tunnel.log');
const tunnelConfigPath = getDataFilePath('cloud-tunnel-config.json');

function isProcessAlive(pid: number | null | undefined): boolean {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getLocalLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function readTunnelState() {
  try {
    let state = null;
    if (fs.existsSync(tunnelInfoPath)) {
      state = JSON.parse(fs.readFileSync(tunnelInfoPath, 'utf8'));
    } else if (fs.existsSync(publicGatewayPath)) {
      state = JSON.parse(fs.readFileSync(publicGatewayPath, 'utf8'));
    }
    if (!state) return null;

    // Verify true process liveness: if pid is missing or dead, mark active: false
    if (state.active) {
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

function writeTunnelState(payload: any) {
  try {
    getDataDir();
    const content = JSON.stringify(payload, null, 2);
    fs.writeFileSync(tunnelInfoPath, content, 'utf8');
    fs.writeFileSync(publicGatewayPath, content, 'utf8');
  } catch {}
}

function readRecentLogs(lineCount = 35): string[] {
  try {
    if (!fs.existsSync(tunnelLogPath)) return [];
    const text = fs.readFileSync(tunnelLogPath, 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.slice(-lineCount);
  } catch {
    return [];
  }
}

function readConfig() {
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

export async function GET(req: NextRequest) {
  try {
    const tunnelState = readTunnelState();
    const lanIp = getLocalLanIp();
    const port = Number(tunnelState?.localPort || process.env.ERP_PORT || 4000);
    const lanUrl = `http://${lanIp}:${port}`;

    const active = Boolean(tunnelState?.active && tunnelState?.tunnelUrl && isProcessAlive(tunnelState?.pid));
    const globalUrl = active ? tunnelState.tunnelUrl : null;
    const staffMobileUrl = active ? tunnelState.staffMobileUrl : `${lanUrl}/mobile`;
    const primaryUrl = globalUrl || lanUrl;

    // Generate QR Code data URLs
    let qrGlobal: string | null = null;
    let qrMobile: string | null = null;

    try {
      if (primaryUrl) {
        qrGlobal = await QRCode.toDataURL(primaryUrl, { width: 300, margin: 2 });
      }
      if (staffMobileUrl) {
        qrMobile = await QRCode.toDataURL(staffMobileUrl, { width: 300, margin: 2 });
      }
    } catch (qrErr) {
      console.warn('[cloud-tunnel route] QR code generation error:', qrErr);
    }

    const logs = readRecentLogs(30);
    const config = readConfig();

    return NextResponse.json({
      success: true,
      active,
      tunnelUrl: globalUrl,
      staffMobileUrl,
      primaryUrl,
      lanIp,
      lanUrl,
      localPort: port,
      pid: tunnelState?.pid || null,
      mode: tunnelState?.mode || (config.tunnelToken ? 'PERMANENT_NAMED_TUNNEL' : 'TRYCLOUDFLARE'),
      connectedAt: tunnelState?.connectedAt || null,
      qrGlobal,
      qrMobile,
      logs,
      config: {
        hasToken: Boolean(config.tunnelToken),
        customDomain: config.customDomain || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query cloud tunnel state';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'START').toUpperCase();
    const scriptPath = path.join(process.cwd(), 'scripts', 'cloud-tunnel-manager.mjs');
    const nodeExe = process.execPath;

    // 1. SAVE CONFIG (Permanent Named Tunnel token or custom domain)
    if (action === 'SAVE_CONFIG') {
      const newConfig = {
        customDomain: body.customDomain?.trim() || null,
        tunnelToken: body.tunnelToken?.trim() || null,
      };
      getDataDir();
      fs.writeFileSync(tunnelConfigPath, JSON.stringify(newConfig, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: 'Cloudflare tunnel configuration saved cleanly.',
      });
    }

    // 2. STOP TUNNEL
    if (action === 'STOP') {
      const child = spawn(nodeExe, [scriptPath, '--stop'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      writeTunnelState({ active: false, pid: null, tunnelUrl: null, staffMobileUrl: null, stoppedAt: new Date().toISOString() });

      return NextResponse.json({
        success: true,
        active: false,
        message: 'Cloudflare tunnel stopped cleanly.',
      });
    }

    // 3. START OR RESTART TUNNEL
    if (action === 'START' || action === 'RESTART') {
      // Clear stale state first
      writeTunnelState({
        active: false,
        pid: null,
        tunnelUrl: null,
        staffMobileUrl: null,
        status: 'CONNECTING',
        startedAt: new Date().toISOString(),
      });

      // Spawn supervisor process
      const child = spawn(nodeExe, [scriptPath, '--restart'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      // Poll for up to 6 seconds for the new URL to be assigned
      const startTime = Date.now();
      let assignedState: any = null;

      while (Date.now() - startTime < 6000) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const current = readTunnelState();
        if (current?.active && current?.tunnelUrl && isProcessAlive(current?.pid)) {
          assignedState = current;
          break;
        }
      }

      const lanIp = getLocalLanIp();
      const port = Number(assignedState?.localPort || process.env.ERP_PORT || 4000);
      const lanUrl = `http://${lanIp}:${port}`;
      const globalUrl = assignedState?.tunnelUrl || null;
      const primaryUrl = globalUrl || lanUrl;

      let qrGlobal: string | null = null;
      let qrMobile: string | null = null;

      if (primaryUrl) {
        qrGlobal = await QRCode.toDataURL(primaryUrl, { width: 300, margin: 2 }).catch(() => null);
      }
      if (assignedState?.staffMobileUrl) {
        qrMobile = await QRCode.toDataURL(assignedState.staffMobileUrl, { width: 300, margin: 2 }).catch(() => null);
      }

      return NextResponse.json({
        success: true,
        active: Boolean(assignedState?.active),
        tunnelUrl: globalUrl,
        staffMobileUrl: assignedState?.staffMobileUrl || `${lanUrl}/mobile`,
        primaryUrl,
        lanIp,
        lanUrl,
        qrGlobal,
        qrMobile,
        logs: readRecentLogs(25),
        message: assignedState?.active
          ? 'Cloudflare Secure Tunnel connected successfully!'
          : 'Tunnel initiated. Cloudflare edge connection is resolving in the background.',
      });
    }

    // 4. PROBE / PING TEST
    if (action === 'PROBE') {
      const state = readTunnelState();
      if (!state?.active || !state?.tunnelUrl) {
        return NextResponse.json({ success: true, reachable: false, reason: 'Tunnel is not marked active.' });
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const probeRes = await fetch(`${state.tunnelUrl}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return NextResponse.json({
          success: true,
          reachable: probeRes.ok,
          status: probeRes.status,
          url: state.tunnelUrl,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          reachable: false,
          error: err.message,
          url: state.tunnelUrl,
        });
      }
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute cloud tunnel action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
