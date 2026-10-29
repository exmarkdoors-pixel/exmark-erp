import { NextRequest, NextResponse } from 'next/server';
import { findDoorBySerial, confirmStickerRemoval } from '@/lib/services/productionService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ doorId: string }> }
) {
  try {
    const { doorId } = await params;
    const result = await findDoorBySerial(doorId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: `Door with ID "${doorId}" was not found.` },
        { status: 404 }
      );
    }

    const { order, door } = result;
    const heightInches = (door.finishedHeightMm / 25.4).toFixed(1);
    const widthInches = (door.finishedWidthMm / 25.4).toFixed(1);

    return NextResponse.json({
      success: true,
      data: {
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
        jobCardNumber: order.jobCardNumber,
        prodOrderNumber: order.prodOrderNumber,
        customerName: order.customerName,
        siteName: order.siteName,
        district: order.district,
        doorCategory: order.doorCategory,
        lineAssigned: order.lineAssigned,
        batchNumber: order.batchNumber,
        productionStatus: order.status,
        qcStatus: door.qcStatus,
        qcInspection: door.qcInspection || null,
        stickerRemovedAt: door.stickerRemovedAt || null,
        stickerRemovedBy: door.stickerRemovedBy || null,
        stickerRemovalNotes: door.stickerRemovalNotes || null,
        lifecycle: [
          {
            stage: 'ORDER_RELEASE',
            name: 'Job Card Released',
            completed: true,
            timestamp: order.createdAt,
          },
          {
            stage: 'MANUFACTURING',
            name: 'FRP Pressing & Routing',
            completed: order.status !== 'QUEUED',
            current: ['MOLDING', 'CNC_ROUTING', 'PU_COATING'].includes(order.status),
            timestamp: order.startedAt || null,
          },
          {
            stage: 'QA_INSPECTION',
            name: 'Final Quality Inspection',
            completed: door.qcStatus === 'PASSED' || order.status === 'COMPLETED',
            current: order.status === 'QA_INSPECTION',
            timestamp: door.qcInspection?.inspectedAt || null,
          },
          {
            stage: 'DISPATCH',
            name: 'Packaging & Dispatch',
            completed: order.status === 'COMPLETED',
            current: false,
          },
          {
            stage: 'INSTALLATION_SIGN_OFF',
            name: 'Site Installation & Handover',
            completed: Boolean(door.stickerRemovedAt),
            current: !door.stickerRemovedAt && order.status === 'COMPLETED',
            timestamp: door.stickerRemovedAt || null,
          },
        ],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query door tracking data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ doorId: string }> }
) {
  try {
    const { doorId } = await params;
    const body = await req.json();

    if (body.action === 'CONFIRM_STICKER_REMOVAL') {
      if (!body.confirmedBy?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Confirmed By name is required' },
          { status: 400 }
        );
      }

      const result = await confirmStickerRemoval(doorId, body.confirmedBy, body.notes);
      return NextResponse.json({
        success: true,
        message: 'Protective sticker removal confirmed successfully.',
        data: result.door,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update door tracking';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
