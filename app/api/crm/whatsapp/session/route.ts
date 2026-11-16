import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authorizeRequest } from '@/lib/auth/authorization';
import { WhatsAppSession, DEFAULT_WHATSAPP_SESSION } from '@/lib/services/whatsappService';
import { getDataFilePath } from '@/lib/utils/dataPaths';

const getSessionFile = () => getDataFilePath('whatsapp-session.json');

function getSession(): WhatsAppSession {
  try {
    const sessionFile = getSessionFile();
    if (!fs.existsSync(sessionFile)) {
      fs.writeFileSync(sessionFile, JSON.stringify(DEFAULT_WHATSAPP_SESSION, null, 2), 'utf8');
      return DEFAULT_WHATSAPP_SESSION;
    }
    const raw = fs.readFileSync(sessionFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WHATSAPP_SESSION;
  }
}

function saveSession(session: WhatsAppSession): void {
  try {
    const sessionFile = getSessionFile();
    const dir = path.dirname(sessionFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save WhatsApp session:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'crm');
    if (auth.errorResponse) return auth.errorResponse;

    const session = getSession();
    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve WhatsApp session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'crm', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const current = getSession();

    const updated: WhatsAppSession = {
      connected: body.connected !== undefined ? Boolean(body.connected) : true,
      phoneNumber: body.phoneNumber?.trim() || current.phoneNumber || '+91 94470 12345',
      accountName: body.accountName?.trim() || 'EXMARK DOORS Official Plant HQ',
      deviceName: body.deviceName?.trim() || 'Chrome 124 (Windows Desktop)',
      batteryLevel: body.batteryLevel !== undefined ? Number(body.batteryLevel) : 95,
      lastSyncedAt: new Date().toISOString(),
      apiMode: body.apiMode === 'CLOUD_API' ? 'CLOUD_API' : 'WEB_DIRECT',
    };

    saveSession(updated);
    return NextResponse.json({ success: true, session: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update WhatsApp session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'crm', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const disconnected: WhatsAppSession = {
      connected: false,
      phoneNumber: '',
      accountName: 'Unlinked',
      deviceName: 'Disconnected',
      batteryLevel: 0,
      lastSyncedAt: new Date().toISOString(),
      apiMode: 'WEB_DIRECT',
    };
    saveSession(disconnected);
    return NextResponse.json({ success: true, session: disconnected });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect WhatsApp session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
