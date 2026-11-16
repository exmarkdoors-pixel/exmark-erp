import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  calculateProjectRisk,
  calculateProjectCostProfit,
} from '@/lib/services/projectRiskProfitService';
import { ProjectRiskInput, ProjectCostInput } from '@/lib/types/projectRiskProfit';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    const riskInput: ProjectRiskInput = {
      quotationId: body.quotationId,
      customerName: body.customerName,
      district: body.district,
      advancePercent: body.advancePercent !== undefined ? Number(body.advancePercent) : 50,
      quotedTotal: body.quotedTotal !== undefined ? Number(body.quotedTotal) : undefined,
      roadAccessibility: body.roadAccessibility,
      siteReadiness: body.siteReadiness,
      isMonsoonSeason: Boolean(body.isMonsoonSeason),
      itemRows: body.itemRows,
      totalDoorsCount: body.totalDoorsCount,
    };

    const riskAnalysis = calculateProjectRisk(riskInput);

    const costInput: ProjectCostInput = {
      quotationId: body.quotationId,
      customerName: body.customerName,
      district: body.district,
      totalDoors: body.totalDoors || body.totalDoorsCount || body.itemRows?.length || 1,
      itemRows: body.itemRows,
      includeInstallation: Boolean(body.includeInstallation),
      installationRate: body.installationRate,
      installationMode: body.installationMode,
      additionalDiscount: body.additionalDiscount,
      riskScore: riskAnalysis.overallScore,
    };

    const costProfitBreakdown = calculateProjectCostProfit(costInput);

    return NextResponse.json({
      success: true,
      riskAnalysis,
      costProfitBreakdown,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to calculate risk and profit';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
