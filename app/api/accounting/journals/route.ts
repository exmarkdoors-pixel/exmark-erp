import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  createManualJournal,
  deleteManualJournal,
  readAccountingStore,
  updateManualJournal,
} from '@/lib/services/accountingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const sourceFilter = (searchParams.get('source') || 'ALL').toUpperCase();
    const store = readAccountingStore();
    const journals =
      sourceFilter === 'ALL'
        ? store.journals
        : store.journals.filter((j) => j.sourceType === sourceFilter);
    return NextResponse.json({ success: true, data: journals });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load journals';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const created = createManualJournal({
      ...body,
      createdBy: auth.user?.name || auth.user?.email || 'Super Admin',
    });
    return NextResponse.json({
      success: true,
      data: created,
      message: `Journal Entry ${created.journalNumber} posted cleanly.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to post journal entry';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'Missing journal id' }, { status: 400 });
    const updated = updateManualJournal(body.id, body);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Journal Entry ${updated.journalNumber} updated.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update journal entry';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'accounts');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ success: false, error: 'Missing journal id' }, { status: 400 });
    deleteManualJournal(id);
    return NextResponse.json({ success: true, message: 'Manual journal entry deleted.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete journal entry';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
