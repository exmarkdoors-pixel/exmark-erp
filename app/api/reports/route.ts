import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_REPORTS, generateReport } from '@/lib/services/reportService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: true, data: SYSTEM_REPORTS });
    }

    const district = searchParams.get('district') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const report = await generateReport(code, {
      district,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
