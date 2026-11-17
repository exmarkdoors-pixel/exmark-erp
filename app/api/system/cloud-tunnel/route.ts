import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import QRCode from 'qrcode';

const dataDir = process.env.EXMARK_DATA_DIR || 'C:\\EXMARK-ERP-DATA';
const tunnelInfoPath = path.join(dataDir, 'cloud-tunnel.json');
const publicGatewayPath = path.join(process.cwd(), 'public', 'cloud-gateway-url.json');

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
    if (fs.existsSync(publicGatewayPath)) {
      const raw = fs.readFileSync(publicGatewayPath, 'utf8');
      return JSON.parse(raw);
    }
    if (fs.existsSync(tunnelInfoPath)) {
      const raw = fs.readFileSync(tunnelInfoPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const tunnelState = readTunnelState();
    const lanIp = getLocalLanIp();
    const port = Number(tunnelState?.localPort || process.env.ERP_PORT || 4000);
    const lanUrl = `http://${lanIp}:${port}`;

    const active = Boolean(tunnelState?.active && tunnelState?.tunnelUrl);
    const globalUrl = tunnelState?.tunnelUrl || null;
    const staffMobileUrl = tunnelState?.staffMobileUrl || (globalUrl ? `${globalUrl}/mobile` : `${lanUrl}/mobile`);
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

    return NextResponse.json({
      success: true,
      active,
      tunnelUrl: globalUrl,
      staffMobileUrl,
      primaryUrl,
      lanIp,
      lanUrl,
      localPort: port,
      connectedAt: tunnelState?.connectedAt || null,
      qrGlobal,
      qrMobile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query cloud tunnel state';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Attempt to launch or check tunnel process
    const scriptPath = path.join(process.cwd(), 'scripts', 'cloud-tunnel-manager.mjs');
    if (fs.existsSync(scriptPath)) {
      const nodeExe = process.execPath;
      const child = spawn(nodeExe, [scriptPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
    }

    return NextResponse.json({
      success: true,
      message: 'Cloud tunnel manager process initiated. Please wait 3-5 seconds for the global HTTPS URL to connect.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to launch cloud tunnel';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
