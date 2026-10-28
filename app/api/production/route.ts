import { NextRequest, NextResponse } from 'next/server';
import {
  listProductionOrders,
  createProductionOrder,
  ProductionFilter,
  ProductionStage,
  ProductionPriority,
} from '@/lib/services/productionService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const filter: ProductionFilter = {};

    const status = searchParams.get('status') as ProductionStage | null;
    if (status) filter.status = status;

    const lineAssigned = searchParams.get('lineAssigned');
    if (lineAssigned) filter.lineAssigned = lineAssigned;

    const priority = searchParams.get('priority') as ProductionPriority | null;
    if (priority) filter.priority = priority;

    const orders = await listProductionOrders(filter);
    return NextResponse.json({ success: true, data: orders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch production orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', ['Super Admin', 'Management', 'Production']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.customerName?.trim()) {
      return NextResponse.json({ success: false, error: 'Customer Name is required' }, { status: 400 });
    }
    if (!body.siteName?.trim()) {
      return NextResponse.json({ success: false, error: 'Site / Project Name is required' }, { status: 400 });
    }
    if (!body.district?.trim()) {
      return NextResponse.json({ success: false, error: 'Kerala District is required' }, { status: 400 });
    }
    if (!body.doors || !Array.isArray(body.doors) || body.doors.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one door opening is required' }, { status: 400 });
    }

    const order = await createProductionOrder({
      salesOrderId: body.salesOrderId || null,
      measurementRef: body.measurementRef || null,
      customerName: body.customerName.trim(),
      siteName: body.siteName.trim(),
      district: body.district.trim(),
      doorCategory: body.doorCategory || 'FRP_DOORS',
      lineAssigned: body.lineAssigned || 'Line 1: FRP Hydraulic Press (300 Ton)',
      priority: body.priority || 'NORMAL',
      tolerances: body.tolerances,
      doors: body.doors,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
