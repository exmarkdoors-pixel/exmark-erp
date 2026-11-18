import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  createBoqIssueVoucher,
  deleteBoqIssueVoucher,
  getOrderIssuedValueSummary,
  listBoqIssueVouchers,
} from '@/lib/services/boqIssueService';
import {
  getProductionOrder,
  recordDoorMaterialIssue,
  unmarkDoorMaterialIssue,
} from '@/lib/services/productionService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const prodOrderId = searchParams.get('prodOrderId') || undefined;

    const vouchers = listBoqIssueVouchers(prodOrderId);
    const totalIssuedValue = Math.round(
      vouchers.reduce((sum, v) => sum + (Number(v.totalIssuedValue) || 0), 0)
    );

    return NextResponse.json({
      success: true,
      data: vouchers,
      totalIssuedValue,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BOQ issue vouchers';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Inventory',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const prodOrderId = String(body.prodOrderId || '').trim();
    const doorIds: string[] = Array.isArray(body.doorIds)
      ? body.doorIds.map((d: unknown) => String(d || '').trim()).filter(Boolean)
      : [];

    if (!prodOrderId) {
      return NextResponse.json(
        { success: false, error: 'prodOrderId is required to issue BOQ materials.' },
        { status: 400 }
      );
    }
    if (doorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Select at least one door before issuing BOQ materials.' },
        { status: 400 }
      );
    }

    const existingOrder = await getProductionOrder(prodOrderId);
    const resolvedOrderId = existingOrder?.id || prodOrderId;
    const doorNumbers: string[] = Array.isArray(body.doorNumbers) && body.doorNumbers.length > 0
      ? body.doorNumbers
      : existingOrder
      ? existingOrder.doors
          .filter(
            (d) =>
              doorIds.includes(d.id) ||
              doorIds.includes(d.doorId) ||
              doorIds.includes(d.doorNumber)
          )
          .map((d) => d.doorNumber)
      : doorIds;

    const voucher = createBoqIssueVoucher({
      prodOrderId: resolvedOrderId,
      orderNumber: body.orderNumber || existingOrder?.salesOrderId || existingOrder?.prodOrderNumber || resolvedOrderId,
      jobCardNumber: body.jobCardNumber || existingOrder?.jobCardNumber || resolvedOrderId,
      customerName: body.customerName || existingOrder?.customerName || 'Party Order',
      doorIds,
      doorNumbers,
      items: Array.isArray(body.items) ? body.items : [],
      shift: body.shift,
      gangName: body.gangName,
      issuedBy: body.issuedBy || auth.user?.name || 'Storekeeper',
      issueDate: body.issueDate,
      bufferPercent: body.bufferPercent,
      notes: body.notes,
    });

    const updatedOrder = await recordDoorMaterialIssue(resolvedOrderId, {
      doorIds,
      batchId: voucher.voucherNumber,
      gangName: voucher.gangName,
      totalIssuedValue: voucher.totalIssuedValue,
      notes: voucher.notes,
    });

    const issuedDoorsCount = updatedOrder.doors.filter((d) => Boolean(d.materialIssued)).length;
    const totalDoorsCount = updatedOrder.doors.length;
    const remainingPendingDoors = Math.max(0, totalDoorsCount - issuedDoorsCount);
    const allDoorsIssued = totalDoorsCount > 0 && remainingPendingDoors === 0;
    const summary = getOrderIssuedValueSummary(resolvedOrderId);

    return NextResponse.json({
      success: true,
      data: {
        voucher,
        updatedOrder,
        allDoorsIssued,
        issuedDoorsCount,
        remainingPendingDoors,
        totalOrderIssuedValue: summary.totalIssuedValue,
      },
      message: allDoorsIssued
        ? `Issued ${voucher.voucherNumber} (₹${voucher.totalIssuedValue.toLocaleString('en-IN')}) — All ${totalDoorsCount} doors issued & cleared from Pending!`
        : `Issued ${voucher.voucherNumber} for ${voucher.doorsCount} door(s) (₹${voucher.totalIssuedValue.toLocaleString('en-IN')}) — ${remainingPendingDoors} door(s) still Pending.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to issue BOQ materials';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ success: false, error: 'Voucher id is required.' }, { status: 400 });
    }

    const removed = deleteBoqIssueVoucher(id);
    if (!removed) {
      return NextResponse.json({ success: false, error: 'BOQ issue voucher not found.' }, { status: 404 });
    }

    let updatedOrder = null;
    try {
      updatedOrder = await unmarkDoorMaterialIssue(
        removed.prodOrderId,
        removed.doorIds,
        removed.voucherNumber
      );
    } catch {
      // Production order may have been archived/deleted; voucher removal still succeeded
    }

    const summary = getOrderIssuedValueSummary(removed.prodOrderId);
    return NextResponse.json({
      success: true,
      data: {
        removedVoucher: removed,
        updatedOrder,
        totalOrderIssuedValue: summary.totalIssuedValue,
      },
      message: `Reversed ${removed.voucherNumber} and restored ${removed.doorsCount} door(s) back to Pending.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reverse BOQ issue voucher';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
