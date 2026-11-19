import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getDailyClosingOverview,
  saveDailyClosingEntry,
  formatWhatsAppExecutiveReport,
} from '@/lib/services/dailyClosingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'finance', ['Super Admin', 'Management', 'Accounts', 'Plant Supervisor']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const targetDate = searchParams.get('date') || undefined;

    const overview = getDailyClosingOverview(targetDate);
    return NextResponse.json({ success: true, data: overview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load daily closing overview';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'finance', ['Super Admin', 'Management', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (body.action === 'GENERATE_WHATSAPP') {
      const overview = getDailyClosingOverview(body.entryDate);
      if (!overview.todayEntry) {
        return NextResponse.json({ success: false, error: 'No entry found for this date' }, { status: 404 });
      }
      const text = formatWhatsAppExecutiveReport(
        overview.todayEntry,
        overview.mtdBreakEven,
        overview.healthScorecard,
        overview.todayBoqConsumption
      );
      return NextResponse.json({ success: true, text });
    }

    const saved = saveDailyClosingEntry({
      entryDate: body.entryDate,
      enteredBy: auth.user?.name || body.enteredBy || 'Factory Manager',
      totalSalesRevenue: Number(body.totalSalesRevenue) || 0,
      doorsSold: Number(body.doorsSold) || 0,
      salesSplit: body.salesSplit,
      totalPurchases: Number(body.totalPurchases) || 0,
      purchaseSplit: body.purchaseSplit,
      totalExpenses: Number(body.totalExpenses) || 0,
      expenseSplit: body.expenseSplit,
      doorsProduced: Number(body.doorsProduced) || 0,
      openingCashInHand: body.openingCashInHand !== undefined ? Number(body.openingCashInHand) : undefined,
      closingCashInHand: body.closingCashInHand !== undefined ? Number(body.closingCashInHand) : undefined,
      shiftNotes: body.shiftNotes,
      weatherOrMarketEvent: body.weatherOrMarketEvent,
    });

    const overview = getDailyClosingOverview(saved.entryDate);
    const whatsappText = formatWhatsAppExecutiveReport(
      saved,
      overview.mtdBreakEven,
      overview.healthScorecard,
      overview.todayBoqConsumption
    );

    return NextResponse.json({
      success: true,
      entry: saved,
      overview,
      whatsappText,
      message: `Daily evening closing saved for ${saved.entryDate}. Synced to cloud.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save daily closing entry';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
