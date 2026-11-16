import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getContractors, createContractor, ContractorTrade } from '@/lib/services/contractorService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const trade = searchParams.get('trade') as ContractorTrade | null;
    const data = getContractors(trade || undefined);
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch contractors' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.name || !body.phone || !body.trade) {
      return NextResponse.json(
        { success: false, error: 'Name, phone number, and trade are mandatory.' },
        { status: 400 }
      );
    }

    const contractor = createContractor({
      name: body.name,
      phone: body.phone,
      trade: body.trade,
      isInHouseGang: body.isInHouseGang,
      gangLeader: body.gangLeader,
      memberNames: Array.isArray(body.memberNames) ? body.memberNames : undefined,
      primaryStage: body.primaryStage,
      teamScope: body.teamScope,
      upiId: body.upiId,
      bankAccount: body.bankAccount,
      ifscCode: body.ifscCode,
      bankName: body.bankName,
      openingBalance: typeof body.openingBalance === 'number' ? body.openingBalance : parseFloat(body.openingBalance) || 0,
      openingBalanceType: body.openingBalanceType || 'PAYABLE',
      openingBalanceDate: body.openingBalanceDate,
      openingBalanceNotes: body.openingBalanceNotes,
    });

    return NextResponse.json({ success: true, data: contractor }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create contractor' },
      { status: 500 }
    );
  }
}
