import { NextRequest, NextResponse } from 'next/server';
import { getMeasurementById } from '@/lib/services/measurementService';
import {
  generateConfirmationToken,
  recordCustomerMeasurementDecision,
} from '@/lib/services/communicationService';
import { CustomerConfirmationDecision } from '@/types/communication';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const msr = await getMeasurementById(id);
    if (!msr) {
      return NextResponse.json({ success: false, error: 'Measurement not found' }, { status: 404 });
    }

    const tokenRecord = await generateConfirmationToken(msr);
    return NextResponse.json({
      success: true,
      data: {
        tokenRecord,
        measurement: msr,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate confirmation token';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.decision) {
      return NextResponse.json({ success: false, error: 'Decision (ACCEPT, REJECT, CORRECTION_REQUESTED) is required' }, { status: 400 });
    }

    const result = await recordCustomerMeasurementDecision(
      id,
      body.decision as CustomerConfirmationDecision,
      body.remarks
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record customer decision';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
