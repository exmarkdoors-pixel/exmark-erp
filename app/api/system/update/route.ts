import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getSystemVersionInfo } from '@/lib/services/updateService';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const info = getSystemVersionInfo();
    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error('Failed to get system version info:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
