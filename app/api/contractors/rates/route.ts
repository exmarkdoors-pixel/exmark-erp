import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getRateCard, updateRateCard } from '@/lib/services/contractorService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCard = getRateCard();
    return NextResponse.json({ success: true, data: rateCard });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch rate card' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const updated = updateRateCard(body);
    return NextResponse.json({ success: true, data: updated, message: 'Contractor piece-rate card updated successfully.' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update rate card' },
      { status: 500 }
    );
  }
}
