import { NextResponse } from 'next/server';
import {
  listDrivers,
  listVehicles,
  getFleetSummary,
} from '@/lib/services/fleetService';

export async function GET() {
  try {
    const [drivers, vehicles, summary] = await Promise.all([
      listDrivers(),
      listVehicles(),
      getFleetSummary(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        drivers,
        vehicles,
        summary,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch fleet data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
