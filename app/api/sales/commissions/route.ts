import { NextRequest, NextResponse } from 'next/server';
import {
  listCommissions,
  payoutCommissions,
  calculateCommissionForQuote,
  updateQuotationCommissionOverride,
  updateStaffCommissionScheme,
} from '@/lib/services/salesTargetService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const salespersonId = searchParams.get('salespersonId') || undefined;
    const period = searchParams.get('period') || undefined;
    const status = searchParams.get('status') || undefined;

    const commissions = await listCommissions({ salespersonId, period, status });

    const totalEarned = commissions.reduce((sum, c) => sum + (c.totalCommissionAmount || 0), 0);
    const totalAccrued = commissions
      .filter((c) => c.status === 'ACCRUED')
      .reduce((sum, c) => sum + (c.totalCommissionAmount || 0), 0);
    const totalPaid = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + (c.totalCommissionAmount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        commissions,
        summary: {
          totalEarned,
          totalAccrued,
          totalPaid,
          count: commissions.length,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commissions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts', ['Super Admin', 'Management', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    // Action 1: Preview quote commission
    if (body.action === 'preview') {
      const calc = await calculateCommissionForQuote({
        orderAmount: Number(body.orderAmount) || 0,
        advancePercent: Number(body.advancePercent) || 0,
        doorCount: Number(body.doorCount) || 1,
        premiumPuCount: Number(body.premiumPuCount) || 0,
        salespersonId: body.salespersonId,
        targetPeriod: body.targetPeriod,
        commissionType: body.commissionType,
        commissionRate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
      });
      return NextResponse.json({ success: true, data: calc });
    }

    // Action 2: Batch Payout
    if (body.action === 'payout') {
      if (!Array.isArray(body.commissionIds) || body.commissionIds.length === 0) {
        return NextResponse.json({ success: false, error: 'At least one commission ID is required for payout' }, { status: 400 });
      }
      const paidBy = auth.user?.name || 'Accounts Team';
      const payoutRef = body.payoutRef?.trim() || `PAY-${Date.now().toString(36).toUpperCase()}`;
      const paymentMode = body.paymentMode || 'NEFT/BANK_TRANSFER';

      const result = await payoutCommissions(body.commissionIds, payoutRef, paidBy, paymentMode);
      return NextResponse.json({ success: true, data: result });
    }

    // Action 3: Update Quotation Commission Override (Percentage vs Per Piece)
    if (body.action === 'update-commission' || body.action === 'override') {
      const { quotationId, commissionType, commissionRate, notes } = body;
      if (!quotationId) {
        return NextResponse.json({ success: false, error: 'quotationId is required' }, { status: 400 });
      }
      const rate = Number(commissionRate);
      if (isNaN(rate) || rate < 0) {
        return NextResponse.json({ success: false, error: 'Valid commissionRate number is required' }, { status: 400 });
      }
      const type = commissionType === 'PER_PIECE' ? 'PER_PIECE' : 'PERCENTAGE';
      const result = await updateQuotationCommissionOverride(quotationId, type, rate, notes);
      return NextResponse.json({ success: true, data: result });
    }

    // Action 4: Update Staff Commission Scheme
    if (body.action === 'update-staff-scheme') {
      const { employeeId, commissionType, commissionRate, targetPeriod } = body;
      if (!employeeId) {
        return NextResponse.json({ success: false, error: 'employeeId is required' }, { status: 400 });
      }
      const rate = Number(commissionRate);
      const type = commissionType === 'PER_PIECE' ? 'PER_PIECE' : 'PERCENTAGE';
      const result = await updateStaffCommissionScheme(employeeId, type, rate, targetPeriod);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'Valid action (preview | payout | update-commission | update-staff-scheme) is required' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process commission action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const { quotationId, commissionType, commissionRate, notes } = body;
    if (!quotationId) {
      return NextResponse.json({ success: false, error: 'quotationId is required' }, { status: 400 });
    }
    const rate = Number(commissionRate);
    if (isNaN(rate) || rate < 0) {
      return NextResponse.json({ success: false, error: 'Valid commissionRate number is required' }, { status: 400 });
    }
    const type = commissionType === 'PER_PIECE' ? 'PER_PIECE' : 'PERCENTAGE';
    const result = await updateQuotationCommissionOverride(quotationId, type, rate, notes);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to patch commission';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
