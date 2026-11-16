import { NextRequest, NextResponse } from 'next/server';
import { addWarrantyClaimTicket } from '@/lib/services/locationWarrantyService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.reportedBy || !body.description) {
      return NextResponse.json(
        { success: false, error: 'Customer name and issue description are required to submit a claim.' },
        { status: 400 }
      );
    }

    const result = await addWarrantyClaimTicket(id, body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: result.ticket }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to submit warranty claim';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
