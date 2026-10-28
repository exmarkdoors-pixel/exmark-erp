import { NextRequest, NextResponse } from 'next/server';
import { getMeasurementById, updateMeasurement } from '@/lib/services/measurementService';
import { getSession } from '@/lib/auth/session';
import { canAccessModule } from '@/lib/auth/roles';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const measurement = await getMeasurementById(id);

    if (!measurement) {
      return NextResponse.json(
        { success: false, error: 'Site measurement record not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: measurement, measurement });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve measurement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (session && !canAccessModule(session.role, 'measurements')) {
      return NextResponse.json(
        { success: false, error: `Access denied. Role ${session.role} cannot modify site measurements.` },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    const updated = await updateMeasurement(id, body);

    return NextResponse.json({
      success: true,
      data: updated,
      measurement: updated,
      message: `Site measurement ${updated.refNumber} updated successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update measurement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
