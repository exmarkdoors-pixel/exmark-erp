import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotation,
  updateQuotation,
  deleteQuotation,
} from '@/lib/services/quotationService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await getQuotation(id);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: quotation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateQuotation(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteQuotation(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Quotation deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
