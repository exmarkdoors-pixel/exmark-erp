import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getProductionOrder } from '@/lib/services/productionService';
import { generateManufacturingBoq } from '@/lib/services/boqService';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Inventory',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const orderId = body?.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Production orderId is required' },
        { status: 400 }
      );
    }

    const order = await getProductionOrder(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: `Production order ${orderId} not found` },
        { status: 404 }
      );
    }

    const refreshed = await generateManufacturingBoq(order, true);
    return NextResponse.json({ success: true, data: refreshed });
  } catch (error) {
    console.error('Error recalculating Manufacturing Auto-BOQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate Manufacturing BOQ' },
      { status: 500 }
    );
  }
}
