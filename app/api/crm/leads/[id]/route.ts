import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getLead,
  updateLead,
  deleteLead,
} from '@/lib/services/crmService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'crm');
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: lead });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch lead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'crm', ['Super Admin', 'Management', 'Sales', 'Site Engineer']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();
    const updated = await updateLead(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'crm', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const success = await deleteLead(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete lead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
