import { NextRequest, NextResponse } from 'next/server';
import { getAllMeasurements, createMeasurement } from '@/lib/services/measurementService';
import { getSession } from '@/lib/auth/session';
import { canAccessModule } from '@/lib/auth/roles';

export async function GET() {
  try {
    const measurements = await getAllMeasurements();
    return NextResponse.json({
      success: true,
      count: measurements.length,
      data: measurements,
      measurements,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch measurements';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    // Permission check
    if (session && !canAccessModule(session.role, 'measurements')) {
      return NextResponse.json(
        { success: false, error: `Access denied. Role ${session.role} cannot record site measurements.` },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Field validation
    if (!body.siteName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Site Name is required.' },
        { status: 400 }
      );
    }

    if (!body.district?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kerala District is required.' },
        { status: 400 }
      );
    }

    if (!body.doors || !Array.isArray(body.doors) || body.doors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one door opening measurement must be added.' },
        { status: 400 }
      );
    }

    // Validate each door opening
    for (let i = 0; i < body.doors.length; i++) {
      const d = body.doors[i];
      if (!d.doorNumber?.trim()) {
        return NextResponse.json(
          { success: false, error: `Door #${i + 1}: Door Number / Label is required.` },
          { status: 400 }
        );
      }
      if (!d.model?.trim()) {
        return NextResponse.json(
          { success: false, error: `Door #${d.doorNumber || i + 1}: Model is required.` },
          { status: 400 }
        );
      }
      if (!d.heightLeft || d.heightLeft <= 0 || !d.heightRight || d.heightRight <= 0) {
        return NextResponse.json(
          { success: false, error: `Door #${d.doorNumber}: Valid positive Height Left and Right measurements are required.` },
          { status: 400 }
        );
      }
      if (!d.widthTop || d.widthTop <= 0 || !d.widthBottom || d.widthBottom <= 0) {
        return NextResponse.json(
          { success: false, error: `Door #${d.doorNumber}: Valid positive Width Top and Bottom measurements are required.` },
          { status: 400 }
        );
      }
    }

    const strictPostgres = req.headers.get('x-require-postgres') === 'true';

    const created = await createMeasurement(
      {
        refNumber: body.refNumber,
        customerId: body.customerId,
        customerName: body.customerName,
        orderRef: body.orderRef,
        siteName: body.siteName,
        siteAddress: body.siteAddress,
        district: body.district,
        totalOpenings: body.doors.length,
        measuredById: body.measuredById,
        engineerName: body.engineerName || session?.name || 'Anoop Krishnan',
        date: body.date || new Date().toISOString().split('T')[0],
        rebateDepthMm: body.rebateDepthMm,
        wallThicknessMm: body.wallThicknessMm,
        notes: body.notes,
        status: body.status || 'DRAFT',
        doors: body.doors,
      },
      { strictPostgres }
    );

    return NextResponse.json({
      success: true,
      data: created,
      measurement: created,
      persisted: true,
      message: `Site measurement ${created.refNumber} saved successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save measurement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
