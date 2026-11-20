import { NextRequest, NextResponse } from 'next/server';
import {
  listQuotations,
  createQuotation,
  QuotationFilter,
  QuotationStatus,
} from '@/lib/services/quotationService';
import { authorizeRequest } from '@/lib/auth/authorization';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const filter: QuotationFilter = {};

    const status = searchParams.get('status') as QuotationStatus | null;
    if (status) filter.status = status;

    const customerId = searchParams.get('customerId');
    if (customerId) filter.customerId = customerId;

    const quotations = await listQuotations(filter);
    return NextResponse.json({ success: true, data: quotations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quotations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    const customerId = body.customerId?.trim() || (body.customerName?.trim() ? 'DIRECT-CLIENT' : '');
    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer is required' }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one door item is required' }, { status: 400 });
    }

    const quotation = await createQuotation({
      customerId,
      customerName: body.customerName?.trim() || undefined,
      location: body.location?.trim() || undefined,
      itemsSummary: body.itemsSummary?.trim() || undefined,
      leadId: body.leadId || null,
      date: body.date || new Date().toISOString().split('T')[0],
      validUntil: body.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      discount: body.discount ? Number(body.discount) : 0,
      overrideSubtotal: body.overrideSubtotal !== undefined ? Number(body.overrideSubtotal) : undefined,
      overrideTotalAmount: body.overrideTotalAmount !== undefined ? Number(body.overrideTotalAmount) : undefined,
      advancePercent: body.advancePercent !== undefined ? Number(body.advancePercent) : undefined,
      advanceAmount: body.advanceAmount !== undefined ? Number(body.advanceAmount) : undefined,
      includeInstallation: body.includeInstallation !== undefined ? Boolean(body.includeInstallation) : undefined,
      installationMode: body.installationMode,
      installationRate: body.installationRate !== undefined ? Number(body.installationRate) : undefined,
      installationQty: body.installationQty !== undefined ? Number(body.installationQty) : undefined,
      installationNotes: body.installationNotes,
      installationAmount: body.installationAmount !== undefined ? Number(body.installationAmount) : undefined,
      includeTransportation: body.includeTransportation !== undefined ? Boolean(body.includeTransportation) : undefined,
      transportationMode: body.transportationMode,
      transportationRate: body.transportationRate !== undefined ? Number(body.transportationRate) : undefined,
      transportationDistanceKm: body.transportationDistanceKm !== undefined ? Number(body.transportationDistanceKm) : undefined,
      transportationVehicleType: body.transportationVehicleType,
      transportationNotes: body.transportationNotes,
      transportationAmount: body.transportationAmount !== undefined ? Number(body.transportationAmount) : undefined,
      itemRows: Array.isArray(body.itemRows) ? body.itemRows : undefined,
      source: body.source || undefined,
      salespersonId: body.salespersonId || undefined,
      salespersonName: body.salespersonName || undefined,
      salespersonCode: body.salespersonCode || undefined,
      commissionPercent: body.commissionPercent !== undefined ? Number(body.commissionPercent) : undefined,
      commissionAmount: body.commissionAmount !== undefined ? Number(body.commissionAmount) : undefined,
      commissionStatus: body.commissionStatus || undefined,
      territoryDistrict: body.territoryDistrict || undefined,
      notes: body.notes?.trim() || undefined,
      items: body.items.map((item: {
        doorCategory?: string;
        doorModel: string;
        heightMm: number;
        widthMm: number;
        thicknessMm?: number;
        coreType?: string;
        finishColor?: string;
        quantity: number;
        unitPrice: number;
        gstRate?: number;
        totalPrice?: number;
      }) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          doorCategory: (item.doorCategory as 'FRP_DOORS' | 'WPC_DOORS') || 'FRP_DOORS',
          doorModel: item.doorModel,
          heightMm: Number(item.heightMm) || 2100,
          widthMm: Number(item.widthMm) || 900,
          thicknessMm: Number(item.thicknessMm) || 32,
          coreType: item.coreType,
          finishColor: item.finishColor,
          quantity: qty,
          unitPrice,
          gstRate: 0,
          totalPrice: item.totalPrice ?? (qty * unitPrice),
        };
      }),
    });

    await logAuditEvent({
      userId: auth.user?.id || null,
      userName: auth.user?.name || null,
      action: 'CREATE',
      entityType: 'QUOTATION',
      entityId: quotation.quoteNumber || quotation.id,
      summary: `Created Quotation ${quotation.quoteNumber || quotation.id} for ${quotation.customerName || customerId} (₹${quotation.totalAmount.toLocaleString('en-IN')})`,
      details: {
        quoteNumber: quotation.quoteNumber,
        customerName: quotation.customerName,
        itemsCount: quotation.items.length,
        totalAmount: quotation.totalAmount,
        discount: quotation.discount,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: quotation }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
