import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  clonePreviousMonthlySheet,
  commitDayBookImport,
  deleteDayBookBatch,
  deleteDayBookEntry,
  getMonthlyAccountingSummary,
  previewDayBookUpload,
  saveMonthlyAccountingSheet,
  updateDayBookEntry,
} from '@/lib/services/daybookImportService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const summary = getMonthlyAccountingSummary(month);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load monthly accounting data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = String(body?.action || '');

    if (action === 'PREVIEW') {
      const preview = previewDayBookUpload({
        fileBase64: body.fileBase64 ? String(body.fileBase64) : undefined,
        rawText: body.rawText ? String(body.rawText) : undefined,
        fileName: body.fileName ? String(body.fileName) : undefined,
        defaultMonth: String(body.defaultMonth || new Date().toISOString().slice(0, 7)),
        columnOverride: body.columnOverride || undefined,
      });
      return NextResponse.json({ success: true, data: preview });
    }

    if (action === 'COMMIT_IMPORT') {
      const committed = commitDayBookImport({
        fileName: String(body.fileName || 'Vyapar Export'),
        detectedFormat: body.detectedFormat || 'VYAPAR_EXPENSE_CATEGORY',
        sourceType: body.sourceType || 'XLSX',
        rowsSkippedBanner: Number(body.rowsSkippedBanner || 0),
        rowsSkippedTotals: Number(body.rowsSkippedTotals || 0),
        skipDuplicates: body.skipDuplicates !== false,
        rows: Array.isArray(body.rows) ? body.rows : [],
      });
      return NextResponse.json({ success: true, data: committed }, { status: 201 });
    }

    if (action === 'SAVE_MONTH_SHEET') {
      const saved = saveMonthlyAccountingSheet({
        monthKey: String(body.monthKey || new Date().toISOString().slice(0, 7)),
        salaries: Array.isArray(body.salaries) ? body.salaries : [],
        expenses: Array.isArray(body.expenses) ? body.expenses : [],
        manualDoorsSold: body.manualDoorsSold !== undefined ? Number(body.manualDoorsSold) : undefined,
        manualSalesRevenue:
          body.manualSalesRevenue !== undefined ? Number(body.manualSalesRevenue) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
      });
      return NextResponse.json({ success: true, data: saved }, { status: 201 });
    }

    if (action === 'CLONE_PREVIOUS_MONTH') {
      const cloned = clonePreviousMonthlySheet(
        String(body.fromMonth || ''),
        String(body.toMonth || new Date().toISOString().slice(0, 7))
      );
      return NextResponse.json({ success: true, data: cloned }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: `Unsupported action "${action}"` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Day Book / Monthly Accounting action failed';
    const isClientError =
      message.includes('empty') ||
      message.includes('Invalid') ||
      message.includes('detect columns') ||
      message.includes('No saved monthly') ||
      message.includes('legacy .xls');
    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body?.entryId) {
      return NextResponse.json({ success: false, error: 'entryId is required' }, { status: 400 });
    }

    const updated = updateDayBookEntry({
      entryId: String(body.entryId),
      bucket: body.bucket,
      includedInBreakEven: body.includedInBreakEven,
      saveRuleKeyword: body.saveRuleKeyword,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update imported row';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const entryId = searchParams.get('entryId');

    if (batchId) {
      const removed = deleteDayBookBatch(batchId);
      return removed
        ? NextResponse.json({ success: true })
        : NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    if (entryId) {
      const removed = deleteDayBookEntry(entryId);
      return removed
        ? NextResponse.json({ success: true })
        : NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: false, error: 'batchId or entryId query param required' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete Day Book record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
