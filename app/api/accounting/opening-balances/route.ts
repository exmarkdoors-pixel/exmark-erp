import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  bulkUpdateOpeningBalances,
  getOpeningBalancesSnapshot,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = getOpeningBalancesSnapshot();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to load opening balances' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    const autoBalanceToCapital = Boolean(body?.autoBalanceToCapital);
    const snapshot = bulkUpdateOpeningBalances(entries, autoBalanceToCapital);
    return NextResponse.json({
      success: true,
      data: snapshot,
      message: snapshot.isBalanced
        ? 'Opening balances saved and balanced (Total Dr = Total Cr).'
        : `Opening balances saved (Difference: ₹${Math.abs(snapshot.difference).toLocaleString('en-IN')}).`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save opening balances' },
      { status: 400 }
    );
  }
}
