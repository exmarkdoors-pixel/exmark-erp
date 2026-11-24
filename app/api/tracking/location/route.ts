import { NextRequest, NextResponse } from 'next/server';
import {
  getAllActiveLiveLocations,
  getIstDateString,
  getStaffDailyRouteLog,
  recordGpsBreadcrumb,
} from '@/lib/services/fieldTrackingService';

export const dynamic = 'force-dynamic';

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

    const ping = recordGpsBreadcrumb({
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
    });

    return NextResponse.json({ success: true, recordedAt: ping.timestamp });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record location';
    return NextResponse.json({ error: 'Failed to record location', details: msg }, { status: 500 });
  }
}

// GET: Fetch current live location of all active staff, or route history for a specific staff & date
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const date = searchParams.get('date') || getIstDateString();

    if (staffId) {
      const routeLog = getStaffDailyRouteLog(staffId, date);
      return NextResponse.json({ success: true, routeLog });
    }

    const activeStaff = getAllActiveLiveLocations();
    return NextResponse.json({ success: true, date, activeStaff });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch tracking data';
    return NextResponse.json({ error: 'Failed to fetch tracking data', details: msg }, { status: 500 });
  }
}
