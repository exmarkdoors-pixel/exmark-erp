import { NextRequest, NextResponse } from 'next/server';
import {
  listFinancialTargets,
  createFinancialTarget,
} from '@/lib/services/financeService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts', ['Super Admin', 'Management', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const targets = await listFinancialTargets();
    return NextResponse.json({ success: true, data: targets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch financial targets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'accounts', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.targetPeriod?.trim()) {
      return NextResponse.json({ success: false, error: 'Target Period (e.g. 2026-11) is required' }, { status: 400 });
    }
    if (!body.salesRevenueTarget || Number(body.salesRevenueTarget) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid Sales Revenue Target is required' }, { status: 400 });
    }
    if (!body.collectionsTarget || Number(body.collectionsTarget) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid Collections Target is required' }, { status: 400 });
    }
    if (!body.frpDoorQuantityTarget || Number(body.frpDoorQuantityTarget) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid FRP Door Quantity Target is required' }, { status: 400 });
    }

    const target = await createFinancialTarget({
      targetPeriod: body.targetPeriod.trim(),
      periodType: body.periodType || 'MONTHLY',
      salesRevenueTarget: Number(body.salesRevenueTarget),
      collectionsTarget: Number(body.collectionsTarget),
      frpDoorQuantityTarget: Number(body.frpDoorQuantityTarget),
      grossProfitTarget: body.grossProfitTarget ? Number(body.grossProfitTarget) : undefined,
      expenseBudget: body.expenseBudget ? Number(body.expenseBudget) : undefined,
    });

    return NextResponse.json({ success: true, data: target }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create financial target';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
