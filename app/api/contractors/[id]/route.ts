import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getContractorById,
  updateContractor,
  deleteContractor,
  getContractorWorkRecords,
  getContractorPayouts,
} from '@/lib/services/contractorService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const contractor = getContractorById(id);
    if (!contractor) {
      return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 });
    }

    const workRecords = getContractorWorkRecords(id);
    const payouts = getContractorPayouts(id);

    return NextResponse.json({
      success: true,
      data: {
        ...contractor,
        workRecords,
        payouts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error retrieving contractor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();
    const updated = updateContractor(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update contractor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req, undefined, ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const removed = deleteContractor(id);
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Gang not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete gang' },
      { status: 500 }
    );
  }
}
