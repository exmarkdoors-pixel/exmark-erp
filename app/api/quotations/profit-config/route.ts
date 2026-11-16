import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getBoqMaterialRates } from '@/lib/services/boqRateService';
import { getCustomFrames } from '@/lib/services/frameService';
import { getRateCard } from '@/lib/services/contractorService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'quotations', [
      'Super Admin',
      'Management',
      'Accounts',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const [boqRates, customFrames, contractorRates] = await Promise.all([
      getBoqMaterialRates(),
      Promise.resolve(getCustomFrames()),
      Promise.resolve(getRateCard()),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        boqRates,
        customFrames,
        contractorRates,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load quotation profit config';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
