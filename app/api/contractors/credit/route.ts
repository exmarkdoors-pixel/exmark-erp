import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getOrderPieceRateLocks,
  PieceRateDuplicateLockError,
  recordPieceRateCredit,
} from '@/lib/services/contractorService';
import { getProductionOrder } from '@/lib/services/productionService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId') || '';
    const orderNumber = searchParams.get('orderNumber') || undefined;
    const jobCardNumber = searchParams.get('jobCardNumber') || undefined;
    const totalDoorsParam = searchParams.get('totalDoors');

    if (!orderId && !jobCardNumber && !orderNumber) {
      return NextResponse.json(
        { success: false, error: 'orderId or jobCardNumber is required.' },
        { status: 400 }
      );
    }

    let resolvedDoors = totalDoorsParam ? Number(totalDoorsParam) : 0;
    if (!resolvedDoors && orderId) {
      const order = await getProductionOrder(orderId);
      if (order) {
        resolvedDoors = order.doors?.length || order.quantity || 1;
      }
    }

    const summary = getOrderPieceRateLocks(
      { orderId: orderId || jobCardNumber || orderNumber || '', orderNumber, jobCardNumber },
      resolvedDoors || 1
    );

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to inspect piece-rate locks',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.contractorId || !body.orderId || !body.operation) {
      return NextResponse.json(
        { success: false, error: 'contractorId, orderId, and operation are required.' },
        { status: 400 }
      );
    }

    const order = await getProductionOrder(String(body.orderId));
    const maxOrderDoorCount = order ? order.doors?.length || order.quantity || 1 : undefined;

    const record = recordPieceRateCredit({
      contractorId: body.contractorId,
      orderId: body.orderId,
      orderNumber: body.orderNumber || order?.prodOrderNumber || body.orderId,
      jobCardNumber: body.jobCardNumber || order?.jobCardNumber,
      doorId: body.doorId || 'BATCH-DOOR',
      doorNumber: body.doorNumber || 'All Doors',
      doorModel: body.doorModel || 'FRP Molded',
      operation: body.operation,
      quantity: Number(body.quantity) || 1,
      customRate: body.customRate !== undefined ? Number(body.customRate) : undefined,
      notes: body.notes,
      maxOrderDoorCount,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof PieceRateDuplicateLockError) {
      return NextResponse.json(
        {
          success: false,
          code: 'PIECE_RATE_LOCKED',
          lockGroup: error.lockGroup,
          error: error.message,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record piece rate credit',
      },
      { status: 500 }
    );
  }
}
