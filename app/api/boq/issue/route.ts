import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  BoqDoorInputMeta,
  ConsolidatedBatchPartyEntryInput,
  createBoqIssueVoucher,
  createConsolidatedBoqBatchVouchers,
  deleteBoqIssueVoucher,
  deleteConsolidatedBatchVouchers,
  findAlreadyIssuedDoorsInVouchers,
  getOrderIssuedValueSummary,
  listBoqIssueVouchers,
  listConsolidatedBatchSummaries,
} from '@/lib/services/boqIssueService';
import {
  DuplicateBoqIssueError,
  getProductionOrder,
  ProductionOrder,
  recordDoorMaterialIssue,
  unmarkDoorMaterialIssue,
} from '@/lib/services/productionService';

function extractDoorsMeta(order: ProductionOrder | null, doorIds: string[], fallbackNumbers?: string[]): BoqDoorInputMeta[] {
  if (!order) {
    return doorIds.map((did, idx) => ({
      doorId: did,
      doorNumber: fallbackNumbers?.[idx] || did,
      widthCm: 80,
      heightCm: 210,
    }));
  }
  const idSet = new Set(doorIds);
  const matched = order.doors.filter(
    (d) => idSet.has(d.id) || idSet.has(d.doorId) || idSet.has(d.doorNumber)
  );
  if (matched.length === 0) {
    return doorIds.map((did, idx) => ({
      doorId: did,
      doorNumber: fallbackNumbers?.[idx] || did,
      widthCm: 80,
      heightCm: 210,
    }));
  }
  return matched.map((d) => {
    const widthCm =
      d.rawWidthTopCm && d.rawWidthTopCm > 0
        ? d.rawWidthTopCm
        : d.finishedWidthMm && d.finishedWidthMm > 0
        ? d.finishedWidthMm / 10
        : 80;
    const heightCm =
      d.rawHeightCm && d.rawHeightCm > 0
        ? d.rawHeightCm
        : d.finishedHeightMm && d.finishedHeightMm > 0
        ? d.finishedHeightMm / 10
        : 210;
    return {
      doorId: d.id || d.doorId || d.doorNumber,
      doorNumber: d.doorNumber,
      widthCm,
      heightCm,
      sqFt: Number(((widthCm * heightCm) / 929.0304).toFixed(2)),
    };
  });
}

function checkOrderDuplicateDoors(
  order: ProductionOrder | null,
  resolvedOrderId: string,
  jobCardLabel: string,
  doorIds: string[]
): string | null {
  // Check live production-store.json flags first
  if (order) {
    const idSet = new Set(doorIds);
    const alreadyInOrder = order.doors.filter(
      (d) =>
        Boolean(d.materialIssued) &&
        (idSet.has(d.id) || idSet.has(d.doorId) || idSet.has(d.doorNumber))
    );
    if (alreadyInOrder.length > 0) {
      const list = alreadyInOrder
        .map((d) => `${d.doorNumber}${d.materialIssueBatchId ? ` [${d.materialIssueBatchId}]` : ''}`)
        .join(', ');
      return `${order.jobCardNumber || jobCardLabel} (${order.customerName}): Door(s) ${list} already issued`;
    }
  }

  // Cross-check active vouchers in boq-issue-log.json
  const voucherConflicts = findAlreadyIssuedDoorsInVouchers(resolvedOrderId, doorIds);
  if (voucherConflicts.length > 0) {
    const list = voucherConflicts
      .map((c) => `${c.doorNumber} [${c.consolidatedBatchNumber || c.voucherNumber}]`)
      .join(', ');
    return `${jobCardLabel}: Door(s) ${list} already have an active BOQ voucher`;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || '';
    const prodOrderId = searchParams.get('prodOrderId') || undefined;

    if (mode === 'consolidated') {
      const batches = listConsolidatedBatchSummaries();
      const totalIssuedValue = Math.round(
        batches.reduce((sum, b) => sum + (Number(b.totalValue) || 0), 0)
      );
      return NextResponse.json({
        success: true,
        data: batches,
        totalIssuedValue,
      });
    }

    const vouchers = listBoqIssueVouchers(prodOrderId);
    const totalIssuedValue = Math.round(
      vouchers.reduce((sum, v) => sum + (Number(v.totalIssuedValue) || 0), 0)
    );

    return NextResponse.json({
      success: true,
      data: vouchers,
      totalIssuedValue,
      ...(prodOrderId ? {} : { consolidatedBatches: listConsolidatedBatchSummaries() }),
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

    // ── CONSOLIDATED MULTI-PARTY BATCH ISSUE ──────────────────────────────────
    if (body.mode === 'CONSOLIDATED_BATCH' || Array.isArray(body.entries)) {
      const rawEntries: ConsolidatedBatchPartyEntryInput[] = Array.isArray(body.entries)
        ? body.entries
        : [];
      const resolvedEntries: ConsolidatedBatchPartyEntryInput[] = [];
      const duplicateErrors: string[] = [];

      for (const raw of rawEntries) {
        const pid = String(raw.prodOrderId || '').trim();
        const doorIds = Array.isArray(raw.doorIds)
          ? raw.doorIds.map((d: unknown) => String(d || '').trim()).filter(Boolean)
          : [];
        if (!pid || doorIds.length === 0) continue;

        const existingOrder = await getProductionOrder(pid);
        const resolvedId = existingOrder?.id || pid;
        const jobCardLabel = raw.jobCardNumber || existingOrder?.jobCardNumber || resolvedId;

        const dupErr = checkOrderDuplicateDoors(existingOrder, resolvedId, jobCardLabel, doorIds);
        if (dupErr) {
          duplicateErrors.push(dupErr);
          continue;
        }

        const doorsMeta = extractDoorsMeta(existingOrder, doorIds, raw.doorNumbers);
        const doorNumbers = doorsMeta.map((m) => m.doorNumber);
        const computedSqFt = doorsMeta.reduce((s, m) => s + (m.sqFt || 18.08), 0);

        resolvedEntries.push({
          prodOrderId: resolvedId,
          orderNumber:
            raw.orderNumber || existingOrder?.salesOrderId || existingOrder?.prodOrderNumber || resolvedId,
          jobCardNumber: jobCardLabel,
          customerName: raw.customerName || existingOrder?.customerName || 'Party Order',
          doorIds,
          doorNumbers,
          doorsMeta,
          selectedSqFt:
            Number(raw.selectedSqFt) > 0 ? Number(raw.selectedSqFt) : Number(computedSqFt.toFixed(2)),
        });
      }

      // HARD BLOCK THE ENTIRE BATCH if even 1 door in any party was already issued!
      if (duplicateErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            code: 'DUPLICATE_BOQ_ISSUE_BLOCKED',
            error: `BLOCKED — Duplicate BOQ issue prevented! ${duplicateErrors.join(' | ')}. Undo the original batch/voucher first if a re-issue is needed.`,
          },
          { status: 409 }
        );
      }

      if (resolvedEntries.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Select at least one party with pending doors before issuing.' },
          { status: 400 }
        );
      }

      const batchResult = createConsolidatedBoqBatchVouchers({
        entries: resolvedEntries,
        items: Array.isArray(body.items) ? body.items : [],
        shift: body.shift,
        gangName: body.gangName,
        issuedBy: body.issuedBy || auth.user?.name || 'Storekeeper',
        issueDate: body.issueDate,
        bufferPercent: body.bufferPercent,
        notes: body.notes,
      });

      const updatedOrders: ProductionOrder[] = [];
      let partiesClearedCount = 0;
      let partiesWithBalanceCount = 0;
      let totalBalanceDoorsLeft = 0;

      for (const voucher of batchResult.vouchers) {
        const updatedOrder = await recordDoorMaterialIssue(voucher.prodOrderId, {
          doorIds: voucher.doorIds,
          batchId: batchResult.consolidatedBatchNumber,
          gangName: voucher.gangName,
          totalIssuedValue: voucher.totalIssuedValue,
          notes: voucher.notes,
        });
        updatedOrders.push(updatedOrder);
        const pendingLeft = updatedOrder.doors.filter((d) => !d.materialIssued).length;
        if (pendingLeft === 0) {
          partiesClearedCount++;
        } else {
          partiesWithBalanceCount++;
          totalBalanceDoorsLeft += pendingLeft;
        }
      }

      const totalDoorsIssued = batchResult.vouchers.reduce((s, v) => s + v.doorsCount, 0);

      return NextResponse.json({
        success: true,
        data: {
          consolidatedBatchNumber: batchResult.consolidatedBatchNumber,
          vouchers: batchResult.vouchers,
          updatedOrders,
          totalBatchValue: batchResult.totalBatchValue,
          totalDoorsIssued,
          partiesClearedCount,
          partiesWithBalanceCount,
          totalBalanceDoorsLeft,
          consolidatedBatches: listConsolidatedBatchSummaries(),
        },
        message:
          totalBalanceDoorsLeft > 0
            ? `Issued Consolidated Batch ${batchResult.consolidatedBatchNumber}: ${totalDoorsIssued} doors across ${batchResult.vouchers.length} parties (₹${batchResult.totalBatchValue.toLocaleString('en-IN')}) — ${partiesClearedCount} cleared, ${totalBalanceDoorsLeft} balance door(s) kept for next day!`
            : `Issued Consolidated Batch ${batchResult.consolidatedBatchNumber}: All ${totalDoorsIssued} doors across ${batchResult.vouchers.length} parties (₹${batchResult.totalBatchValue.toLocaleString('en-IN')}) cleared from Pending!`,
      });
    }

    // ── SINGLE ORDER PARTIAL / FULL ISSUE ─────────────────────────────────────
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
    const jobCardLabel = body.jobCardNumber || existingOrder?.jobCardNumber || resolvedOrderId;

    // HARD ZERO-DUPLICATE GUARD BEFORE CREATING VOUCHER
    const dupErr = checkOrderDuplicateDoors(existingOrder, resolvedOrderId, jobCardLabel, doorIds);
    if (dupErr) {
      return NextResponse.json(
        {
          success: false,
          code: 'DUPLICATE_BOQ_ISSUE_BLOCKED',
          error: `BLOCKED — Duplicate BOQ issue prevented! ${dupErr}. Undo the original voucher first if a re-issue is needed.`,
        },
        { status: 409 }
      );
    }

    const doorsMeta = extractDoorsMeta(existingOrder, doorIds, body.doorNumbers);
    const doorNumbers = doorsMeta.map((m) => m.doorNumber);

    const voucher = createBoqIssueVoucher({
      prodOrderId: resolvedOrderId,
      orderNumber: body.orderNumber || existingOrder?.salesOrderId || existingOrder?.prodOrderNumber || resolvedOrderId,
      jobCardNumber: jobCardLabel,
      customerName: body.customerName || existingOrder?.customerName || 'Party Order',
      doorIds,
      doorNumbers,
      doorsMeta,
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
    if (error instanceof DuplicateBoqIssueError) {
      return NextResponse.json(
        { success: false, code: 'DUPLICATE_BOQ_ISSUE_BLOCKED', error: error.message },
        { status: 409 }
      );
    }
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
    const batchNumber = searchParams.get('batchNumber') || '';
    const id = searchParams.get('id') || '';

    if (batchNumber) {
      const removedList = deleteConsolidatedBatchVouchers(batchNumber);
      if (removedList.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Consolidated BOQ batch not found.' },
          { status: 404 }
        );
      }

      const updatedOrders: ProductionOrder[] = [];
      for (const removed of removedList) {
        try {
          const uo = await unmarkDoorMaterialIssue(
            removed.prodOrderId,
            removed.doorIds,
            batchNumber
          );
          updatedOrders.push(uo);
        } catch {
          // ignore if order deleted
        }
      }

      const restoredDoors = removedList.reduce((s, r) => s + r.doorsCount, 0);
      return NextResponse.json({
        success: true,
        data: {
          batchNumber,
          removedVouchers: removedList,
          updatedOrders,
          consolidatedBatches: listConsolidatedBatchSummaries(),
        },
        message: `Reversed Consolidated Batch ${batchNumber} — restored ${restoredDoors} door(s) across ${removedList.length} parties back to Pending.`,
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Voucher id or batchNumber is required.' }, { status: 400 });
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
        removed.consolidatedBatchNumber || removed.voucherNumber
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
