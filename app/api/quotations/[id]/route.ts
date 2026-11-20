import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { logAuditEvent } from '@/lib/audit/auditLogger';
import {
  getQuotation,
  updateQuotation,
  deleteQuotation,
} from '@/lib/services/quotationService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'quotations');
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const quotation = await getQuotation(id);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: quotation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales', 'Site Engineer']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();
    const updated = await updateQuotation(id, body);

    await logAuditEvent({
      userId: auth.user?.id || null,
      userName: auth.user?.name || null,
      action: 'UPDATE',
      entityType: 'QUOTATION',
      entityId: updated.quotationNumber || id,
      summary: `Updated Quotation ${updated.quotationNumber || id} (₹${updated.totalAmount.toLocaleString('en-IN')})`,
      details: {
        quotationNumber: updated.quotationNumber,
        customerName: updated.customerName,
        status: updated.status,
        totalAmount: updated.totalAmount,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const success = await deleteQuotation(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }

    await logAuditEvent({
      userId: auth.user?.id || null,
      userName: auth.user?.name || null,
      action: 'DELETE',
      entityType: 'QUOTATION',
      entityId: id,
      summary: `Deleted Quotation #${id}`,
      details: { quotationId: id, deletedBy: auth.user?.name },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Quotation deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
