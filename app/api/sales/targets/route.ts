import { NextRequest, NextResponse } from 'next/server';
import {
  listStaffTargets,
  saveStaffTarget,
  getSalespersonLeaderboard,
  getCurrentPeriodKey,
} from '@/lib/services/salesTargetService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || getCurrentPeriodKey();
    const withLeaderboard = searchParams.get('leaderboard') === 'true';

    const targets = await listStaffTargets(period);
    const leaderboard = withLeaderboard ? await getSalespersonLeaderboard(period) : undefined;

    return NextResponse.json({
      success: true,
      data: {
        period,
        targets,
        leaderboard,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sales targets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.employeeId?.trim()) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }
    if (!body.revenueTarget || Number(body.revenueTarget) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid Revenue Target is required' }, { status: 400 });
    }

    const saved = await saveStaffTarget({
      id: body.id || `tgt-${body.employeeCode?.toLowerCase() || 'emp'}-${body.targetPeriod || getCurrentPeriodKey()}`,
      employeeId: body.employeeId.trim(),
      employeeCode: body.employeeCode?.trim() || 'EXM-SALES',
      employeeName: body.employeeName?.trim() || 'Sales Representative',
      department: body.department?.trim() || 'Sales & Projects',
      territoryDistrict: body.territoryDistrict?.trim() || 'Kerala Territory',
      targetPeriod: body.targetPeriod?.trim() || getCurrentPeriodKey(),
      periodType: body.periodType || 'MONTHLY',
      revenueTarget: Number(body.revenueTarget),
      doorQuantityTarget: Number(body.doorQuantityTarget) || 60,
      collectionTarget: Number(body.collectionTarget) || Math.round(Number(body.revenueTarget) * 0.5),
      newClientsTarget: Number(body.newClientsTarget) || 3,
      commissionPlanId: body.commissionPlanId || 'comm-plan-kerala-standard',
      commissionType: body.commissionType === 'PER_PIECE' ? 'PER_PIECE' : 'PERCENTAGE',
      commissionRate: Number(body.commissionRate ?? (body.commissionType === 'PER_PIECE' ? (body.perPieceRate ?? 150) : (body.baseCommissionPercent ?? 2.5))),
      baseCommissionPercent: Number(body.baseCommissionPercent ?? (body.commissionRate ?? 2.5)),
      perPieceRate: body.commissionType === 'PER_PIECE' ? Number(body.commissionRate ?? 150) : Number(body.perPieceRate ?? 150),
      expansionDistricts: Array.isArray(body.expansionDistricts) ? body.expansionDistricts : (body.territoryDistrict ? [body.territoryDistrict] : ['Malappuram']),
      quarterlyDoorTarget: body.quarterlyDoorTarget ? Number(body.quarterlyDoorTarget) : undefined,
      quarterlyRevenueTarget: body.quarterlyRevenueTarget ? Number(body.quarterlyRevenueTarget) : undefined,
      expansionNotes: body.expansionNotes || undefined,
      achievedRevenue: Number(body.achievedRevenue) || 0,
      achievedDoors: Number(body.achievedDoors) || 0,
      achievedCollections: Number(body.achievedCollections) || 0,
      achievedNewClients: Number(body.achievedNewClients) || 0,
      earnedCommission: Number(body.earnedCommission) || 0,
      pendingCommission: Number(body.pendingCommission) || 0,
      paidCommission: Number(body.paidCommission) || 0,
      status: body.status || 'ACTIVE',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save staff sales target';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
