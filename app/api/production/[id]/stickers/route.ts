import { NextRequest, NextResponse } from 'next/server';
import { getProductionOrder } from '@/lib/services/productionService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getProductionOrder(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }

    const stickers = order.doors.map((door) => {
      const heightInches = (door.finishedHeightMm / 25.4).toFixed(1);
      const widthInches = (door.finishedWidthMm / 25.4).toFixed(1);
      return {
        brand: 'EXMARK DOORS',
        tagline: 'Kerala Premium FRP Doors',
        jobCardNumber: order.jobCardNumber,
        prodOrderNumber: order.prodOrderNumber,
        customerName: order.customerName,
        siteName: order.siteName,
        district: order.district,
        doorId: door.doorId,
        doorNumber: door.doorNumber,
        model: door.model,
        finishColor: door.finishColor,
        handing: door.handing,
        lockType: door.lockType,
        finishedHeightMm: door.finishedHeightMm,
        finishedWidthMm: door.finishedWidthMm,
        finishedSizeInches: `${heightInches}" x ${widthInches}"`,
        rawHeightMm: door.rawHeightMm,
        rawWidthMm: door.rawWidthMm,
        qrPayload: door.qrPayload,
        mfgDate: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        jobCardNumber: order.jobCardNumber,
        totalStickers: stickers.length,
        stickers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stickers';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
