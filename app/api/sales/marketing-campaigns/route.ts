import { NextRequest, NextResponse } from 'next/server';
import {
  listMarketingCampaigns,
  saveMarketingCampaign,
} from '@/lib/services/salesTargetService';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management', 'Sales']);
    if (auth.errorResponse) return auth.errorResponse;

    const campaigns = await listMarketingCampaigns();

    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + c.actualSpend, 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0);
    const totalOrdersWon = campaigns.reduce((sum, c) => sum + c.ordersWon, 0);
    const totalRevenueWon = campaigns.reduce((sum, c) => sum + c.revenueWon, 0);
    const blendedCAC = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
    const blendedROI = totalSpend > 0 ? Number(((totalRevenueWon / totalSpend) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        summary: {
          totalBudget,
          totalSpend,
          totalLeads,
          totalOrdersWon,
          totalRevenueWon,
          blendedCAC,
          blendedROI,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch marketing campaigns';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: 'Campaign Name is required' }, { status: 400 });
    }

    const campaign = await saveMarketingCampaign({
      id: body.id || `camp-${Date.now().toString(36)}`,
      name: body.name.trim(),
      channel: body.channel || 'ARCHITECT_OUTREACH',
      territory: body.territory?.trim() || 'Kerala Territory',
      budget: Number(body.budget) || 100000,
      actualSpend: Number(body.actualSpend) || 0,
      leadsGenerated: Number(body.leadsGenerated) || 0,
      ordersWon: Number(body.ordersWon) || 0,
      revenueWon: Number(body.revenueWon) || 0,
      roiPercent: Number(body.roiPercent) || 0,
      startDate: body.startDate || new Date().toISOString().slice(0, 10),
      endDate: body.endDate || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      status: body.status || 'ACTIVE',
      notes: body.notes?.trim() || undefined,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save marketing campaign';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
