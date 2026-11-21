import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import {
  getProductionOrder,
  updateProductionStage,
  updateProductionOrderDoors,
  markProductionBoqIssued,
  toggleProductionInstallation,
  deleteProductionOrder,
  cancelQueuedProductionOrder,
  ProductionOrder,
  ProductionStage,
  DuplicateBoqIssueError,
  IneligibleBoqStageError,
} from '@/lib/services/productionService';
import { generateManufacturingBoq, generatePaintBoq } from '@/lib/services/boqService';
import {
  Contractor,
  ContractorOperationType,
  getContractors,
  getOperationLockGroup,
  getOrderPieceRateLocks,
  getRateForOperation,
  recordPieceRateCreditIfUnpaid,
} from '@/lib/services/contractorService';
import { getStageLockGroup } from '@/lib/utils/pieceRateLocks';
import { autoBillCompletedDelivery } from '@/lib/services/autoDeliveryBillingService';

interface StageCreditAssignmentInput {
  gangId?: string;
  operation?: ContractorOperationType;
  customRate?: number | string;
  quantity?: number;
  doorIds?: string[];
  skipCredit?: boolean;
}

function applyOneTimeStageCredits(params: {
  order: ProductionOrder;
  contractor: Contractor;
  operation: ContractorOperationType;
  customRate?: number;
  notePrefix: string;
}): { creditedCount: number; skippedCount: number; skippedReason: string | null } {
  const doorsCount = params.order.doors?.length || params.order.quantity || 1;
  let creditedCount = 0;
  let skippedCount = 0;
  let skippedReason: string | null = null;

  for (const door of params.order.doors) {
    const res = recordPieceRateCreditIfUnpaid({
      contractorId: params.contractor.id,
      orderId: params.order.id,
      orderNumber: params.order.prodOrderNumber || params.order.id,
      jobCardNumber: params.order.jobCardNumber,
      doorId: door.doorId,
      doorNumber: door.doorNumber,
      doorModel: door.model,
      operation: params.operation,
      quantity: 1,
      customRate: params.customRate,
      notes: `${params.notePrefix} (${door.doorNumber})`,
      maxOrderDoorCount: doorsCount,
    });

    if (res.created) {
      creditedCount++;
    } else {
      skippedCount++;
      skippedReason = res.skippedReason || skippedReason;
    }
  }

  return { creditedCount, skippedCount, skippedReason };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'production');
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const order = await getProductionOrder(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'QC Inspector',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();

    if (body.action === 'RECALL_FROM_FLOOR') {
      const { recallDoorsFromFloor } = await import('@/lib/services/productionService');
      const updated = await recallDoorsFromFloor(id, body.doorIds);
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Order doors successfully pulled back from floor and returned to Pending Molding.',
      });
    }

    if (body.action === 'UPDATE_DOOR_STAGES') {
      const { updateDoorStages } = await import('@/lib/services/productionService');
      const updated = await updateDoorStages(id, {
        doorIds: body.doorIds || [],
        targetStage: body.targetStage,
        gangId: body.gangId,
        gangName: body.gangName,
        doorMolderName: body.doorMolderName,
        frameMolderName: body.frameMolderName,
        moldingShift: body.moldingShift,
        operation: body.operation,
        notes: body.notes,
      });

      // Record piece-rate credit for only these doors if gangId is supplied and not skipped
      let creditedCount = 0;
      if (body.gangId && !body.skipCredit && body.operation) {
        const { getContractorById, recordPieceRateCreditIfUnpaid } = await import('@/lib/services/contractorService');
        const contractor = getContractorById(body.gangId);
        if (contractor) {
          const doorIdSet = new Set(body.doorIds || []);
          for (const doorObj of updated.doors) {
            if (doorIdSet.has(doorObj.id) || doorIdSet.has(doorObj.doorId)) {
              const res = recordPieceRateCreditIfUnpaid({
                contractorId: contractor.id,
                orderId: updated.id,
                orderNumber: updated.prodOrderNumber || updated.id,
                jobCardNumber: updated.jobCardNumber,
                doorId: doorObj.doorId || doorObj.id,
                doorNumber: doorObj.doorNumber,
                doorModel: doorObj.model,
                operation: body.operation,
                quantity: 1,
                customRate: body.customRate,
                notes: `${body.operation.replace(/_/g, ' ')} (${doorObj.doorNumber})`,
                maxOrderDoorCount: updated.doors.length,
              });
              if (res.created) creditedCount++;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: updated,
        creditedCount,
        message: `Updated ${body.doorIds?.length || 0} doors to ${body.targetStage} (${creditedCount} piece-rate credited).`,
      });
    }

    if (body.action === 'ISSUE_DOOR_MATERIALS') {
      const { recordDoorMaterialIssue } = await import('@/lib/services/productionService');
      const updated = await recordDoorMaterialIssue(id, {
        doorIds: body.doorIds || [],
        batchId: body.batchId,
        gangName: body.gangName,
        totalIssuedValue: body.totalIssuedValue,
        notes: body.notes,
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: `Marked materials issued for ${body.doorIds?.length || 0} doors.`,
      });
    }

    if (body.action === 'ASSIGN_MOLDING_GANG') {
      const { stampDoorsMoldingGang } = await import('@/lib/services/productionService');
      const assignments = (body.doorAssignments || []).map((a: any) => ({
        doorId: a.doorId,
        gangId: a.gangId || body.gangId,
        gangName: a.gangName || body.gangName,
        doorMolderName: a.doorMolderName || body.doorMolderName,
        frameMolderName: a.frameMolderName || body.frameMolderName,
        moldingShift: a.moldingShift || body.moldingShift,
        moldingNotes: a.moldingNotes,
      }));
      const updated = await stampDoorsMoldingGang(id, assignments);

      // Record piece-rate credit if gangId is supplied and not skipped
      let creditedCount = 0;
      if (body.gangId && !body.skipCredit) {
        const { getContractorById, recordPieceRateCreditIfUnpaid } = await import('@/lib/services/contractorService');
        const contractor = getContractorById(body.gangId);
        if (contractor) {
          for (const a of assignments) {
            const doorObj = updated.doors.find((d) => d.id === a.doorId || d.doorId === a.doorId);
            if (doorObj) {
              const res = recordPieceRateCreditIfUnpaid({
                contractorId: contractor.id,
                orderId: updated.id,
                orderNumber: updated.prodOrderNumber || updated.id,
                jobCardNumber: updated.jobCardNumber,
                doorId: doorObj.doorId || doorObj.id,
                doorNumber: doorObj.doorNumber,
                doorModel: doorObj.model,
                operation: body.operation || 'MOLDING_ONLY_DOOR',
                quantity: 1,
                workerName: a.doorMolderName,
                frameWorkerName: a.frameMolderName,
                notes: `Molding Shift Heat Batch (${doorObj.doorNumber})`,
                maxOrderDoorCount: updated.doors.length,
              });
              if (res.created) creditedCount++;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: updated,
        creditedCount,
        message: `Assigned ${assignments.length} doors to molding gang (${creditedCount} piece-rate credited).`,
      });
    }

    if (body.action === 'UPDATE_DOOR_ARTISANS') {
      const { updateDoorArtisans } = await import('@/lib/services/productionService');
      const updated = await updateDoorArtisans(id, body.doorId, {
        doorMolderName: body.doorMolderName,
        frameMolderName: body.frameMolderName,
        moldingShift: body.moldingShift,
        gangId: body.gangId,
        gangName: body.gangName,
        moldingNotes: body.moldingNotes,
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Door artisans updated successfully.',
      });
    }

    if (body.action === 'MARK_BOQ_ISSUED') {
      try {
        const updated = await markProductionBoqIssued(id);
        return NextResponse.json({ success: true, data: updated });
      } catch (err) {
        if (err instanceof IneligibleBoqStageError) {
          return NextResponse.json(
            { success: false, code: 'STAGE_NOT_ELIGIBLE_FOR_BOQ', error: err.message },
            { status: 400 }
          );
        }
        if (err instanceof DuplicateBoqIssueError) {
          return NextResponse.json(
            { success: false, code: 'DUPLICATE_BOQ_ISSUE_BLOCKED', error: err.message, duplicates: err.duplicates },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    if (body.action === 'TOGGLE_INSTALLATION') {
      const updated = await toggleProductionInstallation(id, Boolean(body.includeInstallation));
      return NextResponse.json({ success: true, data: updated });
    }

    if (Array.isArray(body.doors) && !body.stage) {
      const updated = await updateProductionOrderDoors(id, body.doors);
      try {
        await generateManufacturingBoq(updated, true);
      } catch (e) {
        console.error('BOQ door-sync error:', e);
      }
      return NextResponse.json({ success: true, data: updated });
    }

    if (!body.stage && !Array.isArray(body.assignments)) {
      return NextResponse.json(
        { success: false, error: 'Production stage or doors update payload is required' },
        { status: 400 }
      );
    }

    const prevOrder = await getProductionOrder(id);
    if (!prevOrder) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }

    const rawStage = (body.stage as ProductionStage) || prevOrder.status;
    const stage: ProductionStage =
      rawStage === 'FINISHING_GRAINS' ? 'PAINT_SECTION' : rawStage;
    const targetOrderStage: ProductionStage = body.keepCurrentStage ? prevOrder.status : stage;

    const prevStatus = prevOrder.status;
    const contractors = getContractors();
    const doorsCount = prevOrder.doors?.length || prevOrder.quantity || 0;
    const lockSummary = getOrderPieceRateLocks(
      {
        orderId: prevOrder.id,
        orderNumber: prevOrder.prodOrderNumber,
        jobCardNumber: prevOrder.jobCardNumber,
      },
      doorsCount || 1
    );

    const assignmentsInput: StageCreditAssignmentInput[] = Array.isArray(body.assignments)
      ? body.assignments
      : [];

    // Multi-party stage handling (used by Cutting & Finishing: Door Team + Frame Team, and Dual Molding Gangs)
    if (assignmentsInput.length > 0) {
      const notesSummary: string[] = [];
      const gangNames: string[] = [];
      const opNames: string[] = [];
      const skipReasons: string[] = [];
      const doorAssignments: Array<{ doorId: string; gangId: string; gangName: string; moldingNotes?: string }> = [];
      let anyCredited = false;
      let anySkippedLocked = false;
      let totalAmountMeta = 0;

      try {
        if (stage === 'MOLDING') {
          await generateManufacturingBoq(prevOrder);
        } else if (stage === 'PAINT_SECTION' || stage === 'PU_COATING') {
          await generatePaintBoq(prevOrder);
        }

        if (body.skipAutoCredit !== true && doorsCount > 0) {
          for (const item of assignmentsInput) {
            if (item.skipCredit || !item.gangId || !item.operation) continue;
            const contractor = contractors.find((c) => c.id === item.gangId);
            if (!contractor) continue;

            const grp = getOperationLockGroup(item.operation);
            const grpLock = lockSummary.groups[grp];
            if (grpLock?.isLocked) {
              anySkippedLocked = true;
              const msg = `${grpLock.label} already paid once (${grpLock.contractorName} — ₹${grpLock.totalAmountCredited})`;
              skipReasons.push(msg);
              notesSummary.push(msg);
              continue;
            }

            const parsedRate =
              item.customRate !== undefined &&
              item.customRate !== '' &&
              !Number.isNaN(Number(item.customRate))
                ? Number(item.customRate)
                : getRateForOperation(item.operation);

            if (Array.isArray(item.doorIds) && item.doorIds.length > 0) {
              const matchedDoors = prevOrder.doors.filter(
                (d) => item.doorIds?.includes(d.id) || item.doorIds?.includes(d.doorId)
              );
              for (const doorItem of matchedDoors) {
                doorAssignments.push({
                  doorId: doorItem.doorId || doorItem.id,
                  gangId: contractor.id,
                  gangName: contractor.name,
                  moldingNotes: `${stage} (${contractor.name}) - Door ${doorItem.doorNumber || doorItem.doorId}`,
                });

                const creditRes = recordPieceRateCreditIfUnpaid({
                  contractorId: contractor.id,
                  orderId: prevOrder.id,
                  orderNumber: prevOrder.prodOrderNumber || prevOrder.id,
                  jobCardNumber: prevOrder.jobCardNumber,
                  doorId: doorItem.doorId,
                  doorNumber: doorItem.doorNumber,
                  doorModel: doorItem.model,
                  operation: item.operation,
                  quantity: 1,
                  customRate: parsedRate,
                  notes: `${stage} — ${contractor.name} (${doorItem.doorNumber})`,
                  maxOrderDoorCount: doorsCount,
                });

                if (creditRes.created) {
                  anyCredited = true;
                  totalAmountMeta += parsedRate;
                } else if (creditRes.skippedReason) {
                  anySkippedLocked = true;
                  skipReasons.push(creditRes.skippedReason);
                }
              }

              gangNames.push(contractor.name);
              opNames.push(item.operation);
              const totalDoorsAmt = parsedRate * matchedDoors.length;
              notesSummary.push(
                `${contractor.name} (${matchedDoors.length} Doors: ${matchedDoors.map((d) => d.doorNumber).join(', ')} — ₹${totalDoorsAmt.toLocaleString('en-IN')})`
              );
            } else if (item.quantity && item.quantity > 0) {
              const qtyToCredit = Math.min(item.quantity, doorsCount);
              const batchDoorId = `BATCH-${prevOrder.jobCardNumber}-${contractor.id}`;
              const creditRes = recordPieceRateCreditIfUnpaid({
                contractorId: contractor.id,
                orderId: prevOrder.id,
                orderNumber: prevOrder.prodOrderNumber || prevOrder.id,
                jobCardNumber: prevOrder.jobCardNumber,
                doorId: batchDoorId,
                doorNumber: `${qtyToCredit} Doors Batch`,
                doorModel: prevOrder.doors?.[0]?.model || 'FRP Door System',
                operation: item.operation,
                quantity: qtyToCredit,
                customRate: parsedRate,
                notes: `${stage} — ${contractor.name} (${qtyToCredit} Doors)`,
                maxOrderDoorCount: doorsCount,
              });

              if (creditRes.created) {
                anyCredited = true;
                gangNames.push(contractor.name);
                opNames.push(item.operation);
                const amt = parsedRate * qtyToCredit;
                totalAmountMeta += amt;
                notesSummary.push(
                  `${contractor.name} (${qtyToCredit} Doors ₹${amt.toLocaleString('en-IN')})`
                );
              } else if (creditRes.skippedReason) {
                anySkippedLocked = true;
                skipReasons.push(creditRes.skippedReason);
              }
            } else {
              const res = applyOneTimeStageCredits({
                order: prevOrder,
                contractor,
                operation: item.operation,
                customRate: parsedRate,
                notePrefix: `${stage} — ${contractor.name}`,
              });

              if (res.creditedCount > 0) {
                anyCredited = true;
                gangNames.push(contractor.name);
                opNames.push(item.operation);
                const amt = parsedRate * res.creditedCount;
                totalAmountMeta += amt;
                notesSummary.push(
                  `${contractor.name} (${item.operation === 'FRAME_CUTTING' ? 'Frame' : 'Door'} ₹${amt.toLocaleString('en-IN')})`
                );
              } else if (res.skippedReason) {
                anySkippedLocked = true;
                skipReasons.push(res.skippedReason);
              }
            }
          }
        }
      } catch (autoErr) {
        console.warn('[production:stage:multi] Non-fatal auto-action warning:', autoErr);
      }

      const finalOrder = await updateProductionStage(
        id,
        targetOrderStage,
        gangNames.length > 0 || anySkippedLocked || doorAssignments.length > 0
          ? {
              gangId: gangNames.length > 0 ? gangNames.join(',') : undefined,
              gangName: gangNames.length > 0 ? gangNames.join(' + ') : undefined,
              operation: opNames.length > 0 ? opNames.join('+') : undefined,
              amount: totalAmountMeta,
              doorAssignments: doorAssignments.length > 0 ? doorAssignments : undefined,
              isRework: !anyCredited && anySkippedLocked,
              reworkReason:
                !anyCredited && anySkippedLocked && body.reworkReason
                  ? String(body.reworkReason)
                  : undefined,
              pieceRateSkippedReason:
                skipReasons.length > 0 ? skipReasons.join(' | ') : undefined,
            }
          : undefined
      );

      return NextResponse.json({
        success: true,
        data: finalOrder,
        pieceRateSkipped: !anyCredited && anySkippedLocked,
        pieceRateMessage:
          notesSummary.length > 0
            ? notesSummary.join(' • ')
            : skipReasons.length > 0
            ? skipReasons.join(' • ')
            : undefined,
      });
    }

    const explicitGang = body.gangId ? contractors.find((c) => c.id === body.gangId) : undefined;
    const customRateNum =
      body.customRate !== undefined && body.customRate !== '' && !Number.isNaN(Number(body.customRate))
        ? Number(body.customRate)
        : undefined;

    const requestedGroup = body.operation
      ? getOperationLockGroup(String(body.operation))
      : getStageLockGroup(stage);
    const alreadyPaidLock = requestedGroup ? lockSummary.groups[requestedGroup] : null;
    const isAlreadyLocked = Boolean(alreadyPaidLock?.isLocked);
    const isReworkMove = Boolean(body.isRework) || isAlreadyLocked;
    const shouldAttemptCredit = body.skipAutoCredit !== true && doorsCount > 0 && !isAlreadyLocked;

    const stageMeta =
      explicitGang || isReworkMove || Array.isArray(body.doorAssignments)
        ? {
            gangId: explicitGang?.id,
            gangName: explicitGang?.name,
            operation: (body.operation as string) || undefined,
            amount:
              shouldAttemptCredit && customRateNum !== undefined
                ? customRateNum * doorsCount
                : 0,
            doorAssignments: Array.isArray(body.doorAssignments) ? body.doorAssignments : undefined,
            isRework: isReworkMove,
            reworkReason: body.reworkReason ? String(body.reworkReason) : undefined,
            pieceRateSkippedReason: isAlreadyLocked
              ? `Already paid once (${alreadyPaidLock?.contractorName} — ₹${alreadyPaidLock?.totalAmountCredited}) — Rework is ₹0`
              : undefined,
          }
        : undefined;

    const updated = await updateProductionStage(id, targetOrderStage, stageMeta);

    let pieceRateSkipped = false;
    let pieceRateMessage: string | undefined = isAlreadyLocked
      ? `One-time lock active: ${alreadyPaidLock?.label} already paid once — Rework moved with ₹0 extra charge.`
      : undefined;

    if (isAlreadyLocked && body.skipAutoCredit !== true) {
      pieceRateSkipped = true;
    }

    // ── Auto-Creation of BOQs & Strict 1× Floor Gang Piece-Rate Crediting ──
    try {
      if (stage === 'MOLDING') {
        await generateManufacturingBoq(updated);
      } else if (stage === 'PAINT_SECTION' || stage === 'PU_COATING') {
        await generatePaintBoq(updated);
      }

      if (shouldAttemptCredit) {
        let targetContractor: Contractor | undefined = explicitGang;
        let targetOp: ContractorOperationType | null = explicitGang && body.operation
          ? (body.operation as ContractorOperationType)
          : null;
        let notePrefix = `${stage} — ${explicitGang?.name || 'Floor Gang'}`;

        if (!targetOp && prevStatus !== stage) {
          if (stage === 'MOLDING') {
            targetContractor = contractors.find((c) => c.trade === 'MOLDING') || contractors[0];
            targetOp = 'MOLDING_DOOR_WITH_FRAME';
            notePrefix = `Molding door & frame for ${updated.customerName}`;
          } else if (stage === 'CUTTING_FINISHING' || stage === 'CNC_ROUTING') {
            targetContractor =
              contractors.find((c) => c.teamScope === 'DOOR_CUTTING_FINISHING') ||
              contractors.find((c) => c.trade === 'CUTTING_GRINDING') ||
              contractors[1] ||
              contractors[0];
            targetOp = 'DOOR_CUTTING';
            notePrefix = `Door Cutting & Finishing`;
          } else if (stage === 'PAINT_SECTION' || stage === 'PU_COATING') {
            targetContractor =
              contractors.find((c) => c.teamScope === 'GRAINS_PAINTING') ||
              contractors.find((c) => c.trade === 'PAINTING') ||
              contractors[2] ||
              contractors[0];
            targetOp = 'DOOR_GRAINS_WITH_PAINT';
            notePrefix = `Grains & Painting`;
          } else if (stage === 'INSTALLATION') {
            targetContractor =
              contractors.find((c) => c.trade === 'SITE_FITTING') || contractors[3] || contractors[0];
            targetOp = 'SITE_FITTING';
            notePrefix = `Site fitting & installation for ${updated.siteName}`;
          }
        }

        if (targetContractor && targetOp) {
          const result = applyOneTimeStageCredits({
            order: updated,
            contractor: targetContractor,
            operation: targetOp,
            customRate: explicitGang ? customRateNum : undefined,
            notePrefix,
          });
          if (result.skippedCount > 0 && result.creditedCount === 0) {
            pieceRateSkipped = true;
            pieceRateMessage = result.skippedReason || pieceRateMessage;
          }
        }
      }
    } catch (autoErr) {
      console.warn('[production:stage:auto] Non-fatal auto-action warning:', autoErr);
    }

    // Auto-bill completed delivery party into Sales Ledger (Non-GST, idempotent)
    let autoBilling = null;
    if (
      String(updated.status || '').toUpperCase() === 'DELIVERED' ||
      String(body.stage || '').toUpperCase() === 'DELIVERED' ||
      String(body.stage || '').toUpperCase() === 'COMPLETED'
    ) {
      try {
        autoBilling = autoBillCompletedDelivery({
          source: 'PRODUCTION',
          sourceId: updated.id,
          salesOrderId: updated.salesOrderId,
          orderRef: updated.measurementRef || updated.jobCardNumber || updated.prodOrderNumber || updated.id,
          productionOrderId: updated.id,
          customerName: updated.customerName,
          deliveryDate: new Date().toISOString().slice(0, 10),
          doorCount: updated.doors?.length || updated.quantity || 1,
          createdBy: auth.user?.name || 'Production Delivery',
        });
      } catch (billErr) {
        console.warn('[production:auto-bill] Non-fatal auto-billing warning:', billErr);
      }
    }

    await logAuditEvent({
      userId: auth.user?.id || null,
      userName: auth.user?.name || null,
      action: 'STATUS_CHANGE',
      entityType: 'ORDER',
      entityId: updated.jobCardNumber || updated.id,
      summary: `Transitioned Job Card ${updated.jobCardNumber} to stage ${updated.status}`,
      details: {
        jobCardNumber: updated.jobCardNumber,
        newStage: updated.status,
        customerName: updated.customerName,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: updated,
      pieceRateSkipped,
      pieceRateMessage,
      autoBilling,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 409) {
      const message = error instanceof Error ? error.message : 'Duplicate BOQ issue blocked';
      return NextResponse.json({ success: false, code: 'DUPLICATE_BOQ_ISSUE_BLOCKED', error: message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Failed to update production stage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'production', ['Super Admin', 'Management', 'Production', 'Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const order = await getProductionOrder(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }

    const reasonCode = (body.reasonCode || '').trim();
    const reasonNotes = (body.reasonNotes || '').trim();
    const reverseBoq = Boolean(body.reverseBoq);
    const termsAccepted = Boolean(body.termsAccepted);

    // If order is in QUEUED stage, enforce cancellation validation
    if (order.status === 'QUEUED') {
      if (!reasonCode) {
        return NextResponse.json(
          { success: false, error: 'A cancellation reason code is required to delete a queued job card.' },
          { status: 400 }
        );
      }
      if (reasonCode === 'OTHER' && reasonNotes.length < 10) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please provide a detailed explanation (minimum 10 characters) when choosing "Other" reason.',
          },
          { status: 400 }
        );
      }

      const result = await cancelQueuedProductionOrder(id, {
        reasonCode,
        reasonNotes,
        reverseBoq,
        termsAccepted,
        cancelledBy: auth.user?.name || 'Authorized Operator',
      });

      await logAuditEvent({
        userId: auth.user?.id || null,
        userName: auth.user?.name || null,
        action: 'CANCEL_JOB_CARD',
        entityType: 'ORDER',
        entityId: id,
        summary: `Cancelled Job Card #${order.jobCardNumber} in QUEUED stage (${reasonCode})`,
        details: {
          orderId: id,
          jobCardNumber: order.jobCardNumber,
          customerName: order.customerName,
          reasonCode,
          reasonNotes,
          reverseBoq,
          deletedBy: auth.user?.name,
          cancelledAt: result.cancelledRecord.cancelledAt,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Job Card #${order.jobCardNumber} cancelled & archived successfully.`,
        archived: result.cancelledRecord,
      });
    }

    // If order has already passed QUEUED stage, reject deletion
    return NextResponse.json(
      {
        success: false,
        error: `Job Card #${order.jobCardNumber} has already progressed to "${order.status}". Deletion is strictly reserved for the Queue stage before physical floor molding. For orders in molding or beyond, use the WIP Scrap / Salvage protocol.`,
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
