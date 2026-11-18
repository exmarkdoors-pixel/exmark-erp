import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getBoqMaterialRates, saveBoqMaterialRates } from '@/lib/services/boqRateService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rates = await getBoqMaterialRates();
    return NextResponse.json({ success: true, data: rates });
  } catch (error) {
    console.error('Error fetching BOQ material rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load BOQ material rates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Purchase',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const updated = await saveBoqMaterialRates(body || {});
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error saving BOQ material rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save BOQ material rates' },
      { status: 500 }
    );
  }
}
