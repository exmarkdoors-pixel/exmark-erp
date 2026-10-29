import { NextRequest, NextResponse } from 'next/server';
import {
  SYSTEM_REPORTS,
  generateReport,
  exportReportAsCsv,
  exportReportAsExcelXml,
  generateVideoReportSummary,
} from '@/lib/services/reportService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'reports');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const format = searchParams.get('format');

    if (!code) {
      return NextResponse.json({ success: true, data: SYSTEM_REPORTS });
    }

    if (format === 'video-summary') {
      const videoSummary = await generateVideoReportSummary(code);
      return NextResponse.json({ success: true, data: videoSummary });
    }

    const district = searchParams.get('district') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const report = await generateReport(code, {
      district,
      startDate,
      endDate,
    });

    if (format === 'csv') {
      const csvContent = exportReportAsCsv(report);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${code.toLowerCase()}_${Date.now()}.csv"`,
        },
      });
    }

    if (format === 'excel') {
      const excelXml = exportReportAsExcelXml(report);
      return new NextResponse(excelXml, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${code.toLowerCase()}_${Date.now()}.xls"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
