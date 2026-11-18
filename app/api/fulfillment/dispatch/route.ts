import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listDispatches,
  createDispatch,
  updateDispatchStatus,
} from '@/lib/services/fulfillmentService';
import { DispatchStatus } from '@/types/fulfillment';
import { autoBillCompletedDelivery } from '@/lib/services/autoDeliveryBillingService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'dispatch');
    if (auth.errorResponse) return auth.errorResponse;

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

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'dispatch');
    if (auth.errorResponse) return auth.errorResponse;

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
      deliveryDistrict: body.deliveryDistrict || 'Ernakulam',
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

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'dispatch');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.id || !body.status) {
      return NextResponse.json(
        { success: false, error: 'Dispatch ID and status are required' },
        { status: 400 }
      );
    }

    const updated = await updateDispatchStatus(body.id, body.status as DispatchStatus);

    let autoBilling = null;
    if (updated.status === 'DELIVERED') {
      try {
        autoBilling = autoBillCompletedDelivery({
          source: 'DISPATCH',
          sourceId: updated.id,
          salesOrderId: updated.salesOrderId,
          orderRef: updated.dispatchNumber || updated.id,
          customerName: updated.customerName,
          deliveryDate: updated.dispatchDate || new Date().toISOString().slice(0, 10),
          doorCount: updated.doorCount,
          overrideAmount: body.overrideAmount !== undefined ? Number(body.overrideAmount) : undefined,
          createdBy: auth.user?.name || 'Dispatch Completion',
        });
      } catch (billErr) {
        console.warn('[dispatch:auto-bill] Non-fatal auto-billing warning:', billErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      autoBilling,
      message: autoBilling?.billed
        ? `Delivery marked COMPLETED & auto-billed as ${autoBilling.invoiceNumber} (₹${(autoBilling.totalAmount || 0).toLocaleString('en-IN')}, Due ₹${(autoBilling.balanceDue || 0).toLocaleString('en-IN')}).`
        : autoBilling?.alreadyBilled
        ? `Delivery marked COMPLETED (already billed under ${autoBilling.invoiceNumber}).`
        : `Dispatch status updated to ${updated.status}.`,
    });
  } catch (error) {
    console.error('Failed to update dispatch status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
