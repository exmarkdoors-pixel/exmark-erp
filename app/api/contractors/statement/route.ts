import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getContractorWeeklyStatement } from '@/lib/services/contractorService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Accounts',
      'Production',
      'Plant Supervisor',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!contractorId) {
      return NextResponse.json(
        { success: false, error: 'contractorId query parameter is required.' },
        { status: 400 }
      );
    }

    const statement = getContractorWeeklyStatement(contractorId, startDate, endDate);
    return NextResponse.json({ success: true, data: statement });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error generating weekly statement' },
      { status: 500 }
    );
  }
}
