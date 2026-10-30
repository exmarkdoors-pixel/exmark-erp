import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomer,
  updateCustomer,
  archiveCustomer,
} from '@/lib/services/customerService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'customers');
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const customer = await getCustomer(id);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: customer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch customer';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'customers', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();
    const updated = await updateCustomer(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update customer';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, 'customers', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const success = await archiveCustomer(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Customer archived' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive customer';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
