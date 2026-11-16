import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  addOrderExpense,
  computeOrderProfitSummaries,
  deleteOrderExpense,
  OrderExpenseCategory,
} from '@/lib/services/orderProfitService';

const VALID_CATEGORIES = new Set<OrderExpenseCategory>([
  'FREIGHT',
  'LOADING_UNLOADING',
  'COMMISSION',
  'REWORK',
  'OTHER',
]);

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId') || undefined;
    const includeProjectedCosts = searchParams.get('includeProjected') === 'true';

    const report = await computeOrderProfitSummaries({
      orderId,
      includeProjectedCosts,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to compute order profit';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const category = VALID_CATEGORIES.has(body?.category)
      ? (body.category as OrderExpenseCategory)
      : 'OTHER';

    const expense = await addOrderExpense({
      orderId: String(body?.orderId || ''),
      jobCardNumber: body?.jobCardNumber ? String(body.jobCardNumber) : undefined,
      category,
      description: String(body?.description || ''),
      amount: Number(body?.amount || 0),
      date: body?.date ? String(body.date) : undefined,
      vendorOrParty: body?.vendorOrParty ? String(body.vendorOrParty) : undefined,
      createdBy: auth.user?.name || auth.user?.email || 'Accounts',
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add direct order expense';
    const status = message.includes('required') || message.includes('greater than zero') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    let expenseId = searchParams.get('id') || '';
    if (!expenseId) {
      try {
        const body = await req.json();
        expenseId = String(body?.id || '');
      } catch {
        // empty body
      }
    }

    if (!expenseId) {
      return NextResponse.json(
        { success: false, error: 'Expense id is required' },
        { status: 400 }
      );
    }

    const removed = await deleteOrderExpense(expenseId);
    if (!removed) {
      return NextResponse.json(
        { success: false, error: 'Direct expense record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
