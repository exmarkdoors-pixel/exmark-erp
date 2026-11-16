import { NextRequest, NextResponse } from 'next/server';
import { getSanitizedCustomerOrderStatus } from '@/lib/services/orderStatusService';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order identifier is required' },
        { status: 400 }
      );
    }

    const decodedId = decodeURIComponent(orderId).trim();
    const data = await getSanitizedCustomerOrderStatus(decodedId);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: `Order with reference "${decodedId}" was not found. Please verify the Job Card number or Quotation number.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in /api/order-status/[orderId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
