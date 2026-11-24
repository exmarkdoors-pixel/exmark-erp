import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getExpenseIntelligenceReport, simulateCostCutting } from '@/lib/services/expenseIntelligenceService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'finance');
    if (auth.errorResponse) return auth.errorResponse;

    const report = await getExpenseIntelligenceReport();
    return NextResponse.json({ success: true, data: report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate expense intelligence report';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'finance');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const activeIds: string[] = Array.isArray(body.activeSuggestionIds) ? body.activeSuggestionIds : [];

    const report = await getExpenseIntelligenceReport();
    const simulation = simulateCostCutting(report, { activeSuggestionIds: activeIds });

    return NextResponse.json({ success: true, data: simulation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to simulate cost-cutting savings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
