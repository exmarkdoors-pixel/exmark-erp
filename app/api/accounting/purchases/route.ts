import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  createExpense,
  createExpenseCategory,
  createPaymentOut,
  createPurchaseBill,
  deleteExpense,
  deleteExpenseCategory,
  deletePaymentOut,
  deletePurchaseBill,
  readAccountingStore,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const store = readAccountingStore();
    return NextResponse.json({
      success: true,
      data: {
        purchaseBills: store.purchaseBills,
        paymentsOut: store.paymentsOut,
        expenses: store.expenses,
        expenseCategories: store.expenseCategories,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load purchases & expenses ledger';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const kind = String(body.kind || '').toUpperCase();
    const createdBy = auth.user?.name || auth.user?.email || 'Super Admin';

    if (kind === 'PURCHASE_BILL') {
      const record = createPurchaseBill({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Purchase Bill ${record.billNumber} saved.` });
    }
    if (kind === 'PAYMENT_OUT') {
      const record = createPaymentOut({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Payment Out ${record.voucherNumber} recorded.` });
    }
    if (kind === 'EXPENSE') {
      const record = createExpense({ ...body, createdBy });
      return NextResponse.json({ success: true, data: record, message: `Expense ${record.voucherNumber} recorded.` });
    }
    if (kind === 'EXPENSE_CATEGORY') {
      const cat = createExpenseCategory({ name: body.name, description: body.description });
      return NextResponse.json({ success: true, data: cat, message: `Expense category "${cat.name}" created.` });
    }

    return NextResponse.json({ success: false, error: `Unsupported purchase/expense kind: ${kind}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save entry';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const kind = (searchParams.get('kind') || '').toUpperCase();
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });

    if (kind === 'PURCHASE_BILL') {
      deletePurchaseBill(id);
      return NextResponse.json({ success: true, message: 'Purchase bill deleted and journal reversed.' });
    }
    if (kind === 'PAYMENT_OUT') {
      deletePaymentOut(id);
      return NextResponse.json({ success: true, message: 'Payment Out deleted and bill balance restored.' });
    }
    if (kind === 'EXPENSE') {
      deleteExpense(id);
      return NextResponse.json({ success: true, message: 'Expense deleted and journal reversed.' });
    }
    if (kind === 'EXPENSE_CATEGORY') {
      const res = deleteExpenseCategory(id);
      return NextResponse.json({
        success: true,
        data: res,
        message:
          res.reassignedCount > 0
            ? `Category "${res.name}" deleted (${res.reassignedCount} expense(s) moved to Office & Misc).`
            : `Category "${res.name}" deleted.`,
      });
    }

    return NextResponse.json({ success: false, error: `Unsupported kind: ${kind}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete entry';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
