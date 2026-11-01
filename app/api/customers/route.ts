import { NextRequest, NextResponse } from 'next/server';
import {
  listCustomers,
  createCustomer,
  deleteCustomer,
  deleteMultipleCustomers,
  clearAllCustomers,
  CustomerFilter,
  CustomerType,
  CustomerStatus,
} from '@/lib/services/customerService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'customers');
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const filter: CustomerFilter = {};

    const search = searchParams.get('search');
    if (search) filter.search = search;

    const type = searchParams.get('type') as CustomerType | null;
    if (type) filter.type = type;

    const district = searchParams.get('district');
    if (district) filter.district = district;

    const status = searchParams.get('status') as CustomerStatus | null;
    if (status) filter.status = status;

    const customers = await listCustomers(filter);
    return NextResponse.json({ success: true, data: customers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch customers';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'customers', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: 'Customer Name is required' }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ success: false, error: 'Customer Type is required' }, { status: 400 });
    }
    if (!body.district?.trim()) {
      return NextResponse.json({ success: false, error: 'Kerala District is required' }, { status: 400 });
    }
    if (!body.town?.trim()) {
      return NextResponse.json({ success: false, error: 'Town/City is required' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const customer = await createCustomer({
      name: body.name.trim(),
      firmName: body.firmName?.trim() || undefined,
      type: body.type,
      district: body.district.trim(),
      town: body.town.trim(),
      address: body.address?.trim() || undefined,
      gstin: body.gstin?.trim() || null,
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      creditLimit: Number(body.creditLimit) || 0,
      outstandingBalance: Number(body.outstandingBalance) || 0,
      status: body.status || 'ACTIVE',
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create customer';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'customers', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty if deleting via query param ?id=...
    }

    if (body.all === true) {
      const res = await clearAllCustomers();
      return NextResponse.json({
        success: true,
        message: `All ${res.count} customer records have been deleted. Clean fresh start ready.`,
        deletedCount: res.count,
      });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const res = await deleteMultipleCustomers(body.ids);
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${res.count} customer records.`,
        deletedCount: res.count,
      });
    }

    if (id) {
      const ok = await deleteCustomer(id);
      if (!ok) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Customer successfully deleted.' });
    }

    return NextResponse.json(
      { success: false, error: 'Missing customer id, ids array, or all: true flag' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete customer(s)';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
