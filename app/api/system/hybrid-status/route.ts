import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import QRCode from 'qrcode';
import { getDataDir, getDataFilePath } from '@/lib/utils/dataPaths';
import { listBackupSnapshots } from '@/lib/services/backupService';
import { authorizeRequest } from '@/lib/auth/authorization';

const tunnelInfoPath = getDataFilePath('cloud-tunnel.json');
const publicGatewayPath = path.join(process.cwd(), 'public', 'cloud-gateway-url.json');

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
    if (state.active && state.pid) {
      if (!isProcessAlive(state.pid)) {
        state.active = false;
        state.reason = 'Process exited';
      }
    }
    return state;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const dataDir = getDataDir();
    let localStoresCount = 0;
    try {
      if (fs.existsSync(dataDir)) {
        localStoresCount = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).length;
      }
    } catch {}

    const snapshots = await listBackupSnapshots();
    const lastBackup = snapshots[0] || null;

    const tunnelState = readTunnelState();
    const lanIp = getLocalLanIp();
    const port = Number(tunnelState?.localPort || process.env.ERP_PORT || 4000);
    const lanUrl = `http://${lanIp}:${port}`;

    const active = Boolean(tunnelState?.active && tunnelState?.tunnelUrl && isProcessAlive(tunnelState?.pid));
    const globalUrl = active ? tunnelState.tunnelUrl : null;
    const staffMobileUrl = active ? tunnelState.staffMobileUrl : `${lanUrl}/mobile`;
    const primaryUrl = globalUrl || lanUrl;

    let qrGlobal: string | null = null;
    let qrMobile: string | null = null;

    try {
      if (primaryUrl) {
        qrGlobal = await QRCode.toDataURL(primaryUrl, { width: 280, margin: 2 });
      }
      if (staffMobileUrl) {
        qrMobile = await QRCode.toDataURL(staffMobileUrl, { width: 280, margin: 2 });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      hybrid: {
        architecture: 'HYBRID_LOCAL_MASTER_WITH_CLOUD_GATEWAY',
        dataLossProtection: 'ACTIVE',
        localVault: {
          path: dataDir,
          isExternal: Boolean(process.env.EXMARK_DATA_DIR?.trim()),
          storesCount: localStoresCount,
          lastBackupTimestamp: lastBackup?.timestamp || null,
          totalBackupsCount: snapshots.length,
          status: 'HEALTHY_AUTHORITATIVE_MASTER',
        },
        cloudGateway: {
          active,
          tunnelUrl: globalUrl,
          staffMobileUrl,
          lanUrl,
          lanIp,
          localPort: port,
          connectedAt: tunnelState?.connectedAt || null,
          qrGlobal,
          qrMobile,
          mode: tunnelState?.mode || 'TRYCLOUDFLARE',
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query hybrid status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
