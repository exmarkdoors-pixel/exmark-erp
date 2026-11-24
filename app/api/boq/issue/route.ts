import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import {
  BoqDoorInputMeta,
  BoqIssueSource,
  BoqIssueVoucherItem,
  BoqMaterialGroupFilter,
  computeServerFormulaBoqItems,
  ConsolidatedBatchPartyEntryInput,
  createBoqIssueVoucher,
  createConsolidatedBoqBatchVouchers,
  deleteBoqIssueVoucher,
  deleteConsolidatedBatchVouchers,
  findAlreadyIssuedDoorsInVouchers,
  getOrderIssuedValueSummary,
  listBoqIssueVouchers,
  listConsolidatedBatchSummaries,
  updateBoqIssueVoucher,
} from '@/lib/services/boqIssueService';
import {
  BOQ_ELIGIBLE_STAGES,
  DuplicateBoqIssueError,
  getProductionOrder,
  IneligibleBoqStageError,
  isDoorEligibleForBoqIssue,
  isOrderEligibleForBoqIssue,
  ProductionOrder,
  recordDoorMaterialIssue,
  unmarkDoorMaterialIssue,
  updateProductionOrderDoors,
} from '@/lib/services/productionService';
import { getBoqMaterialRates } from '@/lib/services/boqRateService';
import {
  adjustBoqMaterialsStockDelta,
  deductBoqMaterialsFromInventory,
  restoreBoqMaterialsToInventory,
} from '@/lib/services/stockMaintenanceService';
import { getCustomFrames } from '@/lib/services/frameService';
import type { BoqDoorInput } from '@/lib/utils/boqFormulaEngine';

function normalizeMaterialGroup(val: unknown): BoqMaterialGroupFilter {
  const s = String(val || 'ALL').toUpperCase();
  if (s === 'CHEMICALS' || s === 'WOOD_FOAM' || s === 'HARDWARE') return s;
  return 'ALL';
}

function getServerIstDateString(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

function extractBoqDoorsForCalculation(order: ProductionOrder | null, doorIds: string[]): BoqDoorInput[] {
  if (!order) return [];
  const idSet = new Set(doorIds);
  const matched = order.doors.filter(
    (d) => idSet.has(d.id) || idSet.has(d.doorId) || idSet.has(d.doorNumber)
  );
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
      id: d.id,
      doorId: d.doorId,
      doorNumber: d.doorNumber,
      widthCm,
      heightCm,
      frameTypeId: d.frameTypeId || 'FRM-REGULAR',
      frameTypeName: d.frameTypeName || 'Regular Frame',
      finishColor: d.finishColor || 'Natural Teak EXGC-510',
      lockId: d.lockId,
      lockType: d.lockType || 'Baby Latch Black',
      handing: d.handing || 'RH',
      quantity: 1,
    };
  });
}

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

  const voucherConflicts = findAlreadyIssuedDoorsInVouchers(resolvedOrderId, doorIds);
  if (voucherConflicts.length > 0) {
    const list = voucherConflicts
      .map((c) => `${c.doorNumber} [${c.consolidatedBatchNumber || c.voucherNumber}]`)
      .join(', ');
    return `${jobCardLabel}: Door(s) ${list} already have an active BOQ voucher`;
  }

  return null;
}

function checkOrderStageEligibility(
  order: ProductionOrder | null,
  doorIds: string[]
): string | null {
  if (!order) return null;
  const stageCheck = isOrderEligibleForBoqIssue(order);
  if (!stageCheck.eligible) {
    return stageCheck.reason || 'Order is not in Queue or Molding stage';
  }
  const idSet = new Set(doorIds);
  const targetDoors = order.doors.filter(
    (d) => idSet.has(d.id) || idSet.has(d.doorId) || idSet.has(d.doorNumber)
  );
  for (const door of targetDoors) {
    const doorCheck = isDoorEligibleForBoqIssue(door, order.status);
    if (!doorCheck.eligible) {
      return doorCheck.reason || `Door ${door.doorNumber} is past molding`;
    }
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
    const userRole = auth.user?.role || '';
    const isAdminOrMgmt = userRole === 'Super Admin' || userRole === 'Management';
    // ZERO-LOOPHOLE ENFORCEMENT:
    // Storekeeper (Inventory) role OR any request flagged formulaLocked ALWAYS uses server-calculated formula quantities,
    // authoritative server IST date, and authenticated staff identity — ignoring client-submitted prices/qty/dates/names!
    const isFormulaLocked = userRole === 'Inventory' || Boolean(body.formulaLocked);
    const materialGroup = normalizeMaterialGroup(body.materialGroup);
    const source: BoqIssueSource =
      body.source === 'ANDROID_APP' ? 'ANDROID_APP' : 'DESKTOP';
    // Authoritative date: Allow valid client-provided issueDate (e.g. logging yesterday's evening/night shift the next morning).
    // Defaults strictly to server IST date if omitted or invalid.
    const authoritativeDate =
      typeof body.issueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.issueDate.trim())
        ? body.issueDate.trim()
        : getServerIstDateString();
    const authoritativeIssuedBy = isFormulaLocked || !isAdminOrMgmt
      ? auth.user?.name || 'Storekeeper'
      : String(body.issuedBy || auth.user?.name || 'Storekeeper');
    const receiverName = body.receiverName ? String(body.receiverName).trim() : undefined;
    const receiverSignatureDataUrl =
      typeof body.receiverSignatureDataUrl === 'string' &&
      body.receiverSignatureDataUrl.startsWith('data:image/')
        ? body.receiverSignatureDataUrl.slice(0, 120000)
        : undefined;
    const deviceInfo =
      String(body.deviceInfo || req.headers.get('user-agent') || '').trim().slice(0, 140) || undefined;

    // ── CONSOLIDATED MULTI-PARTY BATCH ISSUE ──────────────────────────────────
    if (body.mode === 'CONSOLIDATED_BATCH' || Array.isArray(body.entries)) {
      const rawEntries: ConsolidatedBatchPartyEntryInput[] = Array.isArray(body.entries)
        ? body.entries
        : [];
      const resolvedEntries: ConsolidatedBatchPartyEntryInput[] = [];
      const allSelectedBoqDoors: BoqDoorInput[] = [];
      const duplicateErrors: string[] = [];
      const stageErrors: string[] = [];

      for (const raw of rawEntries) {
        const pid = String(raw.prodOrderId || '').trim();
        const doorIds = Array.isArray(raw.doorIds)
          ? raw.doorIds.map((d: unknown) => String(d || '').trim()).filter(Boolean)
          : [];
        if (!pid || doorIds.length === 0) continue;

        const existingOrder = await getProductionOrder(pid);
        const resolvedId = existingOrder?.id || pid;
        const jobCardLabel = raw.jobCardNumber || existingOrder?.jobCardNumber || resolvedId;

        // 1. Stage eligibility check (Queue -> Molding only!)
        const stageErr = checkOrderStageEligibility(existingOrder, doorIds);
        if (stageErr) {
          stageErrors.push(stageErr);
          continue;
        }

        // 2. Duplicate check
        const dupErr = checkOrderDuplicateDoors(existingOrder, resolvedId, jobCardLabel, doorIds);
        if (dupErr) {
          duplicateErrors.push(dupErr);
          continue;
        }

        const doorsMeta = extractDoorsMeta(existingOrder, doorIds, raw.doorNumbers);
        const doorNumbers = doorsMeta.map((m) => m.doorNumber);
        const computedSqFt = doorsMeta.reduce((s, m) => s + (m.sqFt || 18.08), 0);
        allSelectedBoqDoors.push(...extractBoqDoorsForCalculation(existingOrder, doorIds));

        resolvedEntries.push({
          prodOrderId: resolvedId,
          orderNumber:
            raw.orderNumber || existingOrder?.salesOrderId || existingOrder?.prodOrderNumber || resolvedId,
          jobCardNumber: jobCardLabel,
          customerName: raw.customerName || existingOrder?.customerName || 'Party Order',
          doorIds,
          doorNumbers,
          doorsMeta,
          selectedSqFt: Number(computedSqFt.toFixed(2)),
        });
      }

      if (stageErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            code: 'STAGE_NOT_ELIGIBLE_FOR_BOQ',
            error: `BLOCKED — Stage restriction: ${stageErrors.join(' | ')}. Raw chemical BOQ can only be issued for orders transitioning from Queue to Molding.`,
          },
          { status: 400 }
        );
      }

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

      let authoritativeItems: BoqIssueVoucherItem[] = Array.isArray(body.items) ? body.items : [];
      if (isFormulaLocked) {
        const [ratesConfig, framesCatalog] = await Promise.all([
          getBoqMaterialRates(),
          Promise.resolve(getCustomFrames()),
        ]);
        authoritativeItems = computeServerFormulaBoqItems(
          allSelectedBoqDoors,
          framesCatalog,
          ratesConfig,
          materialGroup
        );
      }

      const batchResult = createConsolidatedBoqBatchVouchers({
        entries: resolvedEntries,
        items: authoritativeItems,
        shift: body.shift,
        gangName: body.gangName,
        issuedBy: authoritativeIssuedBy,
        issuedByUserId: auth.user?.id,
        issueDate: authoritativeDate,
        bufferPercent: isFormulaLocked ? 0 : body.bufferPercent,
        notes: body.notes,
        source,
        formulaLocked: isFormulaLocked,
        materialGroup,
        receiverName,
        receiverSignatureDataUrl,
        deviceInfo,
      });

      // Automatically deduct raw materials from store ledger inventory
      await deductBoqMaterialsFromInventory(authoritativeItems).catch((e) =>
        console.warn('[boq:stock:deduct:batch] Non-fatal stock deduction warning:', e)
      );

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

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'BOQ_BATCH_ISSUED',
        entityType: 'INVENTORY',
        entityId: batchResult.consolidatedBatchNumber,
        details: {
          source,
          formulaLocked: isFormulaLocked,
          materialGroup,
          partiesCount: batchResult.vouchers.length,
          totalDoorsIssued,
          totalBatchValue: batchResult.totalBatchValue,
          gangName: body.gangName,
          receiverName,
          issuedBy: authoritativeIssuedBy,
        },
        userAgent: deviceInfo,
      }).catch(() => {});

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
          formulaLocked: isFormulaLocked,
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

    // 1. Stage eligibility check (Queue -> Molding only!)
    const stageErr = checkOrderStageEligibility(existingOrder, doorIds);
    if (stageErr) {
      return NextResponse.json(
        {
          success: false,
          code: 'STAGE_NOT_ELIGIBLE_FOR_BOQ',
          error: `BLOCKED — ${stageErr}`,
        },
        { status: 400 }
      );
    }

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

    let authoritativeItems: BoqIssueVoucherItem[] = Array.isArray(body.items) ? body.items : [];
    if (isFormulaLocked) {
      const [ratesConfig, framesCatalog] = await Promise.all([
        getBoqMaterialRates(),
        Promise.resolve(getCustomFrames()),
      ]);
      const boqDoors = extractBoqDoorsForCalculation(existingOrder, doorIds);
      authoritativeItems = computeServerFormulaBoqItems(
        boqDoors,
        framesCatalog,
        ratesConfig,
        materialGroup
      );
    }

    const voucher = createBoqIssueVoucher({
      prodOrderId: resolvedOrderId,
      orderNumber: body.orderNumber || existingOrder?.salesOrderId || existingOrder?.prodOrderNumber || resolvedOrderId,
      jobCardNumber: jobCardLabel,
      customerName: body.customerName || existingOrder?.customerName || 'Party Order',
      doorIds,
      doorNumbers,
      doorsMeta,
      items: authoritativeItems,
      shift: body.shift,
      gangName: body.gangName,
      issuedBy: authoritativeIssuedBy,
      issuedByUserId: auth.user?.id,
      issueDate: authoritativeDate,
      bufferPercent: isFormulaLocked ? 0 : body.bufferPercent,
      notes: body.notes,
      source,
      formulaLocked: isFormulaLocked,
      materialGroup,
      receiverName,
      receiverSignatureDataUrl,
      deviceInfo,
    });

    // Automatically deduct raw materials from store ledger inventory
    await deductBoqMaterialsFromInventory(authoritativeItems).catch((e) =>
      console.warn('[boq:stock:deduct:single] Non-fatal stock deduction warning:', e)
    );

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

    await logAuditEvent({
      userId: auth.user?.id || null,
      action: 'BOQ_ISSUED',
      entityType: 'INVENTORY',
      entityId: voucher.voucherNumber,
      details: {
        source,
        formulaLocked: isFormulaLocked,
        materialGroup,
        jobCardNumber: voucher.jobCardNumber,
        doorsCount: voucher.doorsCount,
        totalIssuedValue: voucher.totalIssuedValue,
        gangName: voucher.gangName,
        receiverName,
        issuedBy: authoritativeIssuedBy,
      },
      userAgent: deviceInfo,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        voucher,
        updatedOrder,
        allDoorsIssued,
        issuedDoorsCount,
        remainingPendingDoors,
        totalOrderIssuedValue: summary.totalIssuedValue,
        formulaLocked: isFormulaLocked,
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
    // STRICT ANTI-LOOPHOLE: ONLY Super Admin & Management (Desktop ERP) can reverse/undo an issued BOQ!
    // Storekeeper (Inventory) & Floor staff can NEVER delete or edit their own issued vouchers.
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
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
      const allBatchItems = removedList.flatMap((v) => v.items || []);
      await restoreBoqMaterialsToInventory(allBatchItems).catch(() => {});

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

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'BOQ_BATCH_REVERSED',
        entityType: 'INVENTORY',
        entityId: batchNumber,
        details: {
          reversedBy: auth.user?.name,
          vouchersRemoved: removedList.length,
        },
      }).catch(() => {});

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
    if (Array.isArray(removed.items) && removed.items.length > 0) {
      await restoreBoqMaterialsToInventory(removed.items).catch(() => {});
    }
    try {
      updatedOrder = await unmarkDoorMaterialIssue(
        removed.prodOrderId,
        removed.doorIds,
        removed.consolidatedBatchNumber || removed.voucherNumber
      );
    } catch {
      // Production order may have been archived/deleted
    }

    await logAuditEvent({
      userId: auth.user?.id || null,
      action: 'BOQ_VOUCHER_REVERSED',
      entityType: 'INVENTORY',
      entityId: removed.voucherNumber,
      details: {
        reversedBy: auth.user?.name,
        jobCardNumber: removed.jobCardNumber,
        doorsRestored: removed.doorsCount,
      },
    }).catch(() => {});

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

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const voucherId = body.id || body.voucherId;
    if (!voucherId) {
      return NextResponse.json({ success: false, error: 'Voucher ID is required.' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one material item is required.' }, { status: 400 });
    }
    const editReason = (body.editReason || body.reason || '').trim();
    if (!editReason || editReason.length < 3) {
      return NextResponse.json(
        { success: false, error: 'A valid modification reason (minimum 3 characters) is required.' },
        { status: 400 }
      );
    }

    const { updatedVoucher, deltaItems, previousVoucher, totalOrderIssuedValue } = updateBoqIssueVoucher({
      voucherId,
      items: body.items,
      issueDate: body.issueDate,
      gangName: body.gangName,
      shift: body.shift,
      notes: body.notes,
      editReason,
      editedBy: auth.user?.name || 'Authorized Staff',
      editedByUserId: auth.user?.id,
    });

    // Reconcile inventory stock with delta
    let stockAdjustment = null;
    if (deltaItems.length > 0) {
      stockAdjustment = await adjustBoqMaterialsStockDelta(
        deltaItems,
        updatedVoucher.voucherNumber,
        updatedVoucher.prodOrderId
      ).catch((e) => {
        console.warn('[boq:stock:delta] Non-fatal stock adjustment warning:', e);
        return null;
      });
    }

    // Update door allocations value on the production order if it exists
    let updatedOrder = null;
    try {
      const existingOrder = await getProductionOrder(updatedVoucher.prodOrderId);
      if (existingOrder && Array.isArray(existingOrder.doors)) {
        const allocMap = new Map<string, number>();
        (updatedVoucher.doorAllocations || []).forEach((da) => {
          if (da.doorId) allocMap.set(da.doorId, da.allocatedValue);
          if (da.doorNumber) allocMap.set(da.doorNumber, da.allocatedValue);
        });

        const updatedDoors = existingOrder.doors.map((d) => {
          const matchedVal =
            (d.id ? allocMap.get(d.id) : undefined) ??
            (d.doorId ? allocMap.get(d.doorId) : undefined) ??
            (d.doorNumber ? allocMap.get(d.doorNumber) : undefined);
          if (typeof matchedVal === 'number') {
            return { ...d, materialIssuedValue: matchedVal };
          }
          return d;
        });

        updatedOrder = await updateProductionOrderDoors(existingOrder.id, updatedDoors);
      }
    } catch {
      // Order door value sync non-fatal
    }

    // Log comprehensive audit event
    await logAuditEvent({
      userId: auth.user?.id || null,
      userName: auth.user?.name || null,
      action: 'BOQ_VOUCHER_EDITED',
      entityType: 'BOQ',
      entityId: updatedVoucher.voucherNumber,
      summary: `Edited BOQ Voucher ${updatedVoucher.voucherNumber} (Reason: ${editReason})`,
      details: {
        voucherNumber: updatedVoucher.voucherNumber,
        jobCardNumber: updatedVoucher.jobCardNumber,
        editReason,
        previousTotalValue: previousVoucher.totalIssuedValue,
        newTotalValue: updatedVoucher.totalIssuedValue,
        valueDelta: updatedVoucher.totalIssuedValue - previousVoucher.totalIssuedValue,
        deltaItemsCount: deltaItems.length,
        deltaSummary: deltaItems.map((d) => `${d.name}: ${d.deltaQty > 0 ? '+' : ''}${d.deltaQty} ${d.unit}`).join(', '),
        stockSummary: stockAdjustment?.summary || [],
        editedBy: auth.user?.name,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        updatedVoucher,
        deltaItems,
        stockAdjustment,
        updatedOrder,
        totalOrderIssuedValue,
      },
      message: `Updated ${updatedVoucher.voucherNumber} (₹${updatedVoucher.totalIssuedValue.toLocaleString('en-IN')}) — Inventory stock adjusted.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update BOQ voucher';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
