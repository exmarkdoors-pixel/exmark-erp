import { NextResponse } from 'next/server';
import {
  listDispatches,
  createDispatch,
  updateDispatchStatus,
} from '@/lib/services/fulfillmentService';
import { DispatchStatus } from '@/types/fulfillment';

export async function GET() {
  try {
    const dispatches = await listDispatches();
    return NextResponse.json({ success: true, count: dispatches.length, data: dispatches });
  } catch (error) {
    console.error('Failed to list dispatches:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customerName || !body.destinationAddress || !body.vehicleNumber || !body.driverName) {
      return NextResponse.json(
        { success: false, error: 'Customer name, destination address, vehicle number, and driver name are required' },
        { status: 400 }
      );
    }

    const dispatch = await createDispatch({
      salesOrderId: body.salesOrderId || null,
      customerName: body.customerName,
      destinationAddress: body.destinationAddress,
      deliveryDistrict: body.deliveryDistrict || 'Palakkad',
      vehicleNumber: body.vehicleNumber,
      driverName: body.driverName,
      driverPhone: body.driverPhone || '',
      eWayBillNo: body.eWayBillNo || null,
      doorCount: Number(body.doorCount) || 1,
    });

    return NextResponse.json({ success: true, data: dispatch }, { status: 201 });
  } catch (error) {
    console.error('Failed to create dispatch:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id || !body.status) {
      return NextResponse.json(
        { success: false, error: 'Dispatch ID and status are required' },
        { status: 400 }
      );
    }

    const updated = await updateDispatchStatus(body.id, body.status as DispatchStatus);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update dispatch status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
