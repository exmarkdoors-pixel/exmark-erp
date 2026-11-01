import { NextRequest, NextResponse } from 'next/server';
import { resetAllModulesToZero } from '@/scripts/reset-all-modules-zero';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    const result = resetAllModulesToZero();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to reset ERP modules to zero:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
