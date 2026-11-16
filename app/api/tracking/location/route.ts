import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '@/lib/utils/dataPaths';

interface LocationPing {
  staffId: string;
  staffName: string;
  role: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  timestamp: string;
}

function getTrackingFilePath(): string {
  return path.join(getDataDir(), 'gps-tracking-store.json');
}

function loadTrackingData(): Record<string, LocationPing[]> {
  try {
    const file = getTrackingFilePath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading GPS tracking file:', err);
  }
  return {};
}

function saveTrackingData(data: Record<string, LocationPing[]>): void {
  try {
    const file = getTrackingFilePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving GPS tracking file:', err);
  }
}

// POST: Record GPS Ping
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      staffId = 'STAFF-01',
      staffName = 'Field Staff',
      role = 'DRIVER',
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      batteryLevel,
    } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Valid latitude and longitude required' }, { status: 400 });
    }

    const ping: LocationPing = {
      staffId,
      staffName,
      role,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      batteryLevel,
      timestamp: new Date().toISOString(),
    };

    const store = loadTrackingData();
    if (!store[staffId]) {
      store[staffId] = [];
    }
    // Keep last 100 breadcrumbs per staff member
    store[staffId].push(ping);
    if (store[staffId].length > 100) {
      store[staffId] = store[staffId].slice(-100);
    }
    saveTrackingData(store);

    return NextResponse.json({ success: true, recordedAt: ping.timestamp });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record location', details: err?.message }, { status: 500 });
  }
}

// GET: Fetch current location of all active staff
export async function GET(req: NextRequest) {
  try {
    const store = loadTrackingData();
    const activeStaff = Object.keys(store).map((staffId) => {
      const pings = store[staffId];
      const latest = pings[pings.length - 1];
      return {
        staffId,
        staffName: latest?.staffName || staffId,
        role: latest?.role || 'FIELD',
        latestPing: latest,
        breadcrumbCount: pings.length,
      };
    });

    return NextResponse.json({ success: true, activeStaff });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch tracking data', details: err?.message }, { status: 500 });
  }
}
