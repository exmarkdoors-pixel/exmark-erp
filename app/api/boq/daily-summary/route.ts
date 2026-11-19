import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getDailyEveningBoqSummary } from '@/lib/services/boqIssueService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'production', [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const targetDate = searchParams.get('date') || undefined;

    const summary = getDailyEveningBoqSummary(targetDate);
    return NextResponse.json({ success: true, data: summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate daily evening BOQ summary';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
