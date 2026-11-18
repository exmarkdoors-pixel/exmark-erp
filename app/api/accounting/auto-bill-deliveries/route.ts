import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  autoBillAllCompletedDeliveries,
  autoBillCompletedDelivery,
  scanPendingDeliveredParties,
} from '@/lib/services/autoDeliveryBillingService';
import { updateAccountingSettings } from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const scan = scanPendingDeliveredParties();
    return NextResponse.json({
      success: true,
      data: {
        autoBillOnDelivery: scan.autoBillOnDelivery,
        pendingCount: scan.pendingItems.length,
        pendingItems: scan.pendingItems,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to scan completed deliveries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const action = String(body?.action || 'SYNC_ALL').toUpperCase();
    const actor = auth.user?.name || 'Super Admin';

    if (action === 'TOGGLE_AUTO_BILL') {
      const updated = updateAccountingSettings({ autoBillOnDelivery: Boolean(body?.enabled) });
      return NextResponse.json({
        success: true,
        data: updated,
        message: updated.autoBillOnDelivery
          ? 'Auto-Bill Completed Deliveries is now ENABLED.'
          : 'Auto-Bill Completed Deliveries paused.',
      });
    }

    if (action === 'BILL_SINGLE') {
      const res = autoBillCompletedDelivery({
        source: body?.source || 'DISPATCH',
        sourceId: String(body?.sourceId || `manual-${Date.now()}`),
        salesOrderId: body?.salesOrderId,
        orderRef: body?.orderRef,
        customerName: body?.customerName,
        deliveryDate: body?.deliveryDate,
        doorCount: Number(body?.doorCount) || 1,
        overrideAmount: body?.overrideAmount !== undefined ? Number(body.overrideAmount) : undefined,
        overrideAdvance: body?.overrideAdvance !== undefined ? Number(body.overrideAdvance) : undefined,
        createdBy: actor,
        forceEvenIfDisabled: true,
      });
      return NextResponse.json({
        success: res.billed || res.alreadyBilled,
        data: res,
        message: res.billed
          ? `Posted Sales Entry ${res.invoiceNumber} (₹${(res.totalAmount || 0).toLocaleString('en-IN')}) for ${res.customerName}.`
          : res.alreadyBilled
          ? `Already billed under ${res.invoiceNumber}.`
          : res.skippedReason || 'Could not bill delivery.',
      });
    }

    const batch = autoBillAllCompletedDeliveries(actor);
    return NextResponse.json({
      success: true,
      data: batch,
      message:
        batch.billedCount > 0
          ? `Auto-billed ${batch.billedCount} completed delivery party(ies) into the Sales Ledger.`
          : batch.needsAmountCount > 0
          ? `${batch.needsAmountCount} delivered party(ies) require a net amount before posting.`
          : 'All completed deliveries are already up-to-date in the Sales Ledger.',
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Auto-billing failed' },
      { status: 400 }
    );
  }
}
