import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  queryAuditLogs,
  exportAuditLogsToCsv,
  AuditLogQueryParams,
} from '@/lib/audit/auditLogger';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', [
      'Super Admin',
      'Management',
      'Plant Supervisor',
      'Supervisor',
      'Admin',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const exportCsv = searchParams.get('export') === 'csv';

    const params: AuditLogQueryParams = {
      search,
      action,
      entityType,
      userId,
      fromDate,
      toDate,
      page,
      limit,
    };

    if (exportCsv) {
      const csv = exportAuditLogsToCsv(params);
      const filename = `exmark-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const result = queryAuditLogs(params);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query audit logs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', [
      'Super Admin',
      'Management',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json().catch(() => ({}));
    const params: AuditLogQueryParams = {
      search: body.search,
      action: body.action,
      entityType: body.entityType,
      userId: body.userId,
      fromDate: body.fromDate,
      toDate: body.toDate,
    };

    const csv = exportAuditLogsToCsv(params);
    const filename = `exmark-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export audit logs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
