import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { recordContractorPayout } from '@/lib/services/contractorService';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, ['Super Admin', 'Management', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.contractorId || !body.amount || !body.paymentMode) {
      return NextResponse.json(
        { success: false, error: 'Contractor ID, amount, and payment mode are mandatory.' },
        { status: 400 }
      );
    }

    const amt = parseFloat(body.amount);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number.' },
        { status: 400 }
      );
    }

    const voucher = recordContractorPayout({
      contractorId: body.contractorId,
      amount: amt,
      paymentMode: body.paymentMode,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      recordedBy: body.recordedBy || 'Plant Accounts Desk',
    });

    return NextResponse.json({
      success: true,
      data: voucher,
      message: `Payout voucher ${voucher.voucherNumber} for ₹${amt.toLocaleString('en-IN')} recorded successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error recording contractor payout' },
      { status: 500 }
    );
  }
}
