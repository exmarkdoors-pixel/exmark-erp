import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import {
  adjustFinishedGoodsStock,
  adjustRawMaterialStock,
  bulkUpdateRawMaterials,
  createFgBufferReplenishmentOrder,
  createRawMaterialItem,
  deleteRawMaterialItem,
  generateRawMaterialsCsv,
  getCompanyStockOverview,
  getFinishedGoodsInventory,
  getRawMaterialsInventory,
  getStockMaintenanceConfig,
  issueReworkMaterial,
  manualStockOut,
  saveStockMaintenanceConfig,
  updateRawMaterialItem,
} from '@/lib/services/stockMaintenanceService';
import {
  syncSingleStockItemToBoq,
  syncBoqRatesFromStockLedger,
} from '@/lib/services/boqRateService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'inventory', [
      'Super Admin',
      'Management',
      'Inventory',
      'Production',
      'Purchase',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    if (searchParams.get('export') === 'csv') {
      const csv = generateRawMaterialsCsv();
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="EXMARK-Raw-Materials-Stock-Audit.csv"',
        },
      });
    }

    const overview = getCompanyStockOverview();
    const rawMaterials = getRawMaterialsInventory();
    const finishedGoods = getFinishedGoodsInventory();
    const config = getStockMaintenanceConfig();

    return NextResponse.json({
      success: true,
      data: {
        overview,
        rawMaterials,
        finishedGoods,
        config,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock maintenance data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'inventory', [
      'Super Admin',
      'Management',
      'Inventory',
      'Production',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = String(body.action || '').toUpperCase();

    // 1. Update Company Consistent Target Stock Amount & Settings
    if (action === 'UPDATE_CONFIG') {
      const targetVal = Math.max(100000, Number(body.consistentTargetValuation) || 2500000);
      const autoDeduct = body.autoDeductBoqMaterials !== undefined ? Boolean(body.autoDeductBoqMaterials) : true;
      const updatedConfig = await saveStockMaintenanceConfig({
        consistentTargetValuation: targetVal,
        autoDeductBoqMaterials: autoDeduct,
        lowStockAlertEmail: body.lowStockAlertEmail ? String(body.lowStockAlertEmail).trim() : undefined,
      });

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: 'STOCK_CONFIG',
        details: { targetValuation: targetVal, autoDeduct },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: updatedConfig,
        message: `Company target stock baseline set to ₹${targetVal.toLocaleString('en-IN')}`,
      });
    }

    // 2. Adjust Raw Material Stock
    if (action === 'ADJUST_RM') {
      const itemId = String(body.id || body.itemId || '').trim();
      const adjustmentQty = Number(body.adjustment) || 0;
      const reason = String(body.reason || 'Manual Store Adjustment').trim();
      if (!itemId || adjustmentQty === 0) {
        return NextResponse.json(
          { success: false, error: 'Valid itemId and non-zero adjustment quantity are required.' },
          { status: 400 }
        );
      }

      const updatedItem = await adjustRawMaterialStock(itemId, adjustmentQty, reason);
      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: updatedItem.itemCode,
        details: { adjustmentQty, newStock: updatedItem.currentStock, reason },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: updatedItem,
        message: `Updated ${updatedItem.name}: new stock is ${updatedItem.currentStock} ${updatedItem.unit}`,
      });
    }

    // 3. Adjust Finished Goods Buffer Balance
    if (action === 'ADJUST_FG') {
      const itemId = String(body.id || body.itemId || '').trim();
      const adjustmentQty = Number(body.adjustment) || 0;
      const reason = String(body.reason || 'Manual FG Adjustment').trim();
      if (!itemId || adjustmentQty === 0) {
        return NextResponse.json(
          { success: false, error: 'Valid itemId and non-zero adjustment quantity are required.' },
          { status: 400 }
        );
      }

      const updatedFg = await adjustFinishedGoodsStock(itemId, adjustmentQty, reason);
      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: updatedFg.sku,
        details: { adjustmentQty, newBalance: updatedFg.currentBalance, reason },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: updatedFg,
        message: `Updated FG Buffer ${updatedFg.sku}: balance is now ${updatedFg.currentBalance} doors`,
      });
    }

    // 4. Create 1-Click Production Replenishment Order for FG Buffer
    if (action === 'REPLENISH_FG') {
      const fgItemId = String(body.fgItemId || body.id || '').trim();
      const qty = Math.max(1, Number(body.quantity) || 5);
      if (!fgItemId) {
        return NextResponse.json(
          { success: false, error: 'fgItemId is required to replenish buffer.' },
          { status: 400 }
        );
      }

      const result = await createFgBufferReplenishmentOrder(fgItemId, qty);
      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'PRODUCTION_CREATED',
        entityType: 'PRODUCTION',
        entityId: result.jobCardNumber,
        details: { fgItemId, quantity: qty, purpose: 'FG_BUFFER_REPLENISHMENT' },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: result,
        message: `Created internal replenishment Job Card ${result.jobCardNumber} for ${qty} door(s) heading to Queue!`,
      });
    }

    // 5. Create New Raw Material Item (+ Add New Stock)
    if (action === 'CREATE_RM') {
      const name = String(body.name || '').trim();
      const category = body.category || 'Consumables';
      const unit = String(body.unit || 'KG').trim();
      const currentStock = Number(body.currentStock) || 0;
      const minSafetyBuffer = Number(body.minSafetyBuffer) || 10;
      const targetStock = Number(body.targetStock) || minSafetyBuffer * 2;
      const unitCost = Number(body.unitCost) || 0;
      const warehouseLocation = String(body.warehouseLocation || 'Main Store Rack').trim();

      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Raw material name is required.' },
          { status: 400 }
        );
      }

      const created = await createRawMaterialItem({
        name,
        category,
        unit,
        currentStock,
        minSafetyBuffer,
        targetStock,
        unitCost,
        warehouseLocation,
        itemCode: body.itemCode ? String(body.itemCode).trim() : undefined,
      });

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: created.itemCode,
        details: { action: 'CREATE_RM', name: created.name, stock: created.currentStock },
      }).catch(() => {});

      // Auto-sync to BOQ formula rates if applicable
      const boqSync = await syncSingleStockItemToBoq(created).catch(() => ({
        synced: false as const,
        fieldName: undefined,
        newRate: undefined,
      }));
      const syncNote = boqSync.synced && boqSync.fieldName ? ` (Auto-synced to BOQ: ${boqSync.fieldName})` : '';

      return NextResponse.json({
        success: true,
        data: created,
        boqSync,
        message: `Added new raw material ${created.name} (${created.itemCode}) with ${created.currentStock} ${created.unit}!${syncNote}`,
      });
    }

    // 6. Update Raw Material Item (Edit Name, Rates, Buffers, Location)
    if (action === 'UPDATE_RM') {
      const id = String(body.id || body.itemId || '').trim();
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Raw material item ID is required to update.' },
          { status: 400 }
        );
      }

      const updated = await updateRawMaterialItem(id, {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        category: body.category !== undefined ? body.category : undefined,
        unit: body.unit !== undefined ? String(body.unit).trim() : undefined,
        warehouseLocation: body.warehouseLocation !== undefined ? String(body.warehouseLocation).trim() : undefined,
        minSafetyBuffer: body.minSafetyBuffer !== undefined ? Number(body.minSafetyBuffer) : undefined,
        targetStock: body.targetStock !== undefined ? Number(body.targetStock) : undefined,
        unitCost: body.unitCost !== undefined ? Number(body.unitCost) : undefined,
        currentStock: body.currentStock !== undefined ? Number(body.currentStock) : undefined,
      });

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: updated.itemCode,
        details: { action: 'UPDATE_RM', name: updated.name },
      }).catch(() => {});

      // Auto-sync to BOQ formula rates if applicable
      const boqSync = await syncSingleStockItemToBoq(updated).catch(() => ({
        synced: false as const,
        fieldName: undefined,
        newRate: undefined,
      }));
      const syncNote = boqSync.synced && boqSync.fieldName ? ` (Auto-synced to BOQ: ${boqSync.fieldName})` : '';

      return NextResponse.json({
        success: true,
        data: updated,
        boqSync,
        message: `Updated raw material item ${updated.name} (${updated.itemCode})!${syncNote}`,
      });
    }

    // 7. Bulk Sync All Raw Material Prices to BOQ Formulas
    if (action === 'SYNC_ALL_TO_BOQ') {
      const result = await syncBoqRatesFromStockLedger();
      return NextResponse.json({
        success: true,
        data: result,
        message: `Successfully synchronized ${result.updatedCount} material rate(s) from Stock Ledger into BOQ formulas!`,
      });
    }

    // 7b. Bulk Update Raw Materials (Physical Count, Consignment Inward, Grid Edit, CSV Import)
    if (action === 'BULK_UPDATE_RM') {
      const payload = body.payload || body;
      const result = await bulkUpdateRawMaterials(payload);

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: 'BULK_UPDATE_RM',
        details: {
          mode: payload.mode,
          updatedCount: result.updatedCount,
          netStockVariance: result.netStockVariance,
          netValuationDiff: result.netValuationDiff,
          reason: payload.reason,
          referenceNumber: payload.referenceNumber,
        },
      }).catch(() => {});

      const varianceSign = result.netStockVariance > 0 ? '+' : '';
      const valSign = result.netValuationDiff >= 0 ? '+' : '';
      return NextResponse.json({
        success: true,
        data: result,
        message: `Successfully updated ${result.updatedCount} raw material item(s) (Variance: ${varianceSign}${result.netStockVariance} KG, Valuation: ${valSign}₹${result.netValuationDiff.toLocaleString('en-IN')})`,
      });
    }

    // 7c. Export Raw Materials CSV Data
    if (action === 'EXPORT_RM_CSV') {
      const csv = generateRawMaterialsCsv();
      return NextResponse.json({
        success: true,
        data: { csv },
      });
    }

    // 8. Delete Raw Material Item (Clean up unwanted demo items)
    if (action === 'DELETE_RM') {
      const id = String(body.id || body.itemId || '').trim();
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Raw material item ID is required to delete.' },
          { status: 400 }
        );
      }

      const deleted = await deleteRawMaterialItem(id);

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: deleted.itemCode,
        details: { action: 'DELETE_RM', name: deleted.name },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: deleted,
        message: `Removed ${deleted.name} (${deleted.itemCode}) from store inventory.`,
      });
    }

    // 8. Manual Stock-Out (Floor Issue, Scrap, Damaged, Quality Rejection)
    if (action === 'MANUAL_STOCK_OUT') {
      const itemId = String(body.id || body.itemId || '').trim();
      const qty = Math.max(0, Number(body.quantity || body.qty) || 0);
      const reason = String(body.reason || 'Manual Floor Issue').trim();
      const department = body.department ? String(body.department).trim() : undefined;

      if (!itemId || qty <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid itemId and positive deduction quantity are required.' },
          { status: 400 }
        );
      }

      const updated = await manualStockOut(itemId, qty, reason, department);

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: updated.itemCode,
        details: { action: 'MANUAL_STOCK_OUT', qty, reason, department, remaining: updated.currentStock },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Deducted ${qty} ${updated.unit} of ${updated.name}. Remaining store stock: ${updated.currentStock} ${updated.unit}`,
      });
    }

    // 9. Issue Extra Materials for Rework Station & Book Rework Cost
    if (action === 'ISSUE_REWORK_MATERIAL') {
      const prodOrderId = String(body.prodOrderId || '').trim();
      const items = Array.isArray(body.items) ? body.items : [];
      const reason = String(body.reason || 'Defect Rectification').trim();

      if (!prodOrderId || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'prodOrderId and at least one material item are required for rework issue.' },
          { status: 400 }
        );
      }

      const result = await issueReworkMaterial({
        prodOrderId,
        jobCardNumber: body.jobCardNumber ? String(body.jobCardNumber).trim() : undefined,
        customerName: body.customerName ? String(body.customerName).trim() : undefined,
        reason,
        issuedBy: body.issuedBy || auth.user?.name || 'Storekeeper',
        items,
      });

      await logAuditEvent({
        userId: auth.user?.id || null,
        action: 'INVENTORY_COUNT_ADJUSTED',
        entityType: 'PRODUCTION',
        entityId: prodOrderId,
        details: { action: 'ISSUE_REWORK_MATERIAL', voucherNumber: result.voucherNumber, totalCost: result.totalCost },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: result,
        message: `Issued rework voucher ${result.voucherNumber}: Deducted ${result.deductedCount} item(s) from store and recorded ₹${result.totalCost.toLocaleString('en-IN')} rework cost.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unrecognized action "${action}"` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process stock maintenance action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'inventory', [
      'Super Admin',
      'Management',
      'Inventory',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('itemId');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required to delete.' },
        { status: 400 }
      );
    }

    const deleted = await deleteRawMaterialItem(id);
    await logAuditEvent({
      userId: auth.user?.id || null,
      action: 'INVENTORY_COUNT_ADJUSTED',
      entityType: 'INVENTORY',
      entityId: deleted.itemCode,
      details: { action: 'DELETE_RM', name: deleted.name },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: deleted,
      message: `Deleted ${deleted.name} (${deleted.itemCode}) from store.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete raw material item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
