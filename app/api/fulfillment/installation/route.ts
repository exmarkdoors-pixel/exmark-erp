import { NextResponse } from 'next/server';
import {
  listInstallations,
  createInstallation,
  completeInstallationSignoff,
} from '@/lib/services/fulfillmentService';

export async function GET() {
  try {
    const installations = await listInstallations();
    return NextResponse.json({ success: true, count: installations.length, data: installations });
  } catch (error) {
    console.error('Failed to list installations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customerName || !body.siteAddress || !body.supervisorName) {
      return NextResponse.json(
        { success: false, error: 'Customer name, site address, and supervisor name are required' },
        { status: 400 }
      );
    }

    const installation = await createInstallation({
      salesOrderId: body.salesOrderId || null,
      dispatchId: body.dispatchId || null,
      customerName: body.customerName,
      siteAddress: body.siteAddress,
      district: body.district || 'Ernakulam',
      supervisorName: body.supervisorName,
      scheduledDate: body.scheduledDate || new Date().toISOString().split('T')[0],
      doorCount: Number(body.doorCount) || 1,
    });

    return NextResponse.json({ success: true, data: installation }, { status: 201 });
  } catch (error) {
    console.error('Failed to create installation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id || !body.clientSignoffName || body.feedbackRating === undefined) {
      return NextResponse.json(
        { success: false, error: 'Installation ID, client signoff name, and feedback rating are required' },
        { status: 400 }
      );
    }

    const updated = await completeInstallationSignoff({
      id: body.id,
      clientSignoffName: body.clientSignoffName,
      feedbackRating: Number(body.feedbackRating),
      remarks: body.remarks || '',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to complete installation signoff:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
