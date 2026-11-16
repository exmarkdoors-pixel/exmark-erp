import { NextRequest, NextResponse } from 'next/server';
import {
  listTerritoryExpansion,
  saveTerritoryExpansion,
  simulateExpansion,
} from '@/lib/services/salesTargetService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const territories = await listTerritoryExpansion();

    const totalPotentialRevenue = territories.reduce((sum, t) => sum + t.monthlyPotentialRevenue, 0);
    const totalCurrentRevenue = territories.reduce((sum, t) => sum + t.currentMonthlyRevenue, 0);
    const totalTargetDealers = territories.reduce((sum, t) => sum + t.targetDealers, 0);
    const totalActiveDealers = territories.reduce((sum, t) => sum + t.activeDealers, 0);
    const totalDisplayRacks = territories.reduce((sum, t) => sum + t.installedDisplayRacks, 0);
    const averagePenetration = territories.length > 0
      ? Number((territories.reduce((sum, t) => sum + t.penetrationRatePercent, 0) / territories.length).toFixed(1))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        territories,
        summary: {
          totalPotentialRevenue,
          totalCurrentRevenue,
          totalTargetDealers,
          totalActiveDealers,
          totalDisplayRacks,
          averagePenetration,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch territory expansion data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    // Action 1: What-If simulation
    if (body.action === 'simulate') {
      const result = simulateExpansion({
        newSalesRepresentatives: Number(body.newSalesRepresentatives) || 0,
        newDealerRacks: Number(body.newDealerRacks) || 0,
        targetPenetrationGrowthPercent: Number(body.targetPenetrationGrowthPercent) || 0,
        averageDoorSellingPrice: Number(body.averageDoorSellingPrice) || 8200,
        averageDoorsPerDealerMonth: Number(body.averageDoorsPerDealerMonth) || 8,
        repMonthlySalaryCost: Number(body.repMonthlySalaryCost) || 30000,
        rackInstallationCost: Number(body.rackInstallationCost) || 15000,
      });
      return NextResponse.json({ success: true, data: result });
    }

    // Action 2: Save territories
    if (Array.isArray(body.territories)) {
      await saveTerritoryExpansion(body.territories);
      return NextResponse.json({ success: true, message: 'Territories updated successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid expansion request payload' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update expansion data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
