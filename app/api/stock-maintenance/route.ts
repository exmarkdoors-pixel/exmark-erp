import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import {
  adjustFinishedGoodsStock,
  adjustRawMaterialStock,
  createFgBufferReplenishmentOrder,
  getCompanyStockOverview,
  getFinishedGoodsInventory,
  getRawMaterialsInventory,
  getStockMaintenanceConfig,
  saveStockMaintenanceConfig,
} from '@/lib/services/stockMaintenanceService';

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

    return NextResponse.json(
      { success: false, error: `Unrecognized action "${action}"` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process stock maintenance action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
