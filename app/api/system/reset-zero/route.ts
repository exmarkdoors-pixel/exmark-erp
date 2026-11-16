import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { resetAllModulesToZero } from '@/lib/services/factoryResetService';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
    if (auth.errorResponse) return auth.errorResponse;

    let body: {
      confirmPhrase?: string;
      cleanTestBackups?: boolean;
      resetEmployees?: boolean;
      inventoryZeroMode?: 'keep-zero' | 'clear';
      createPreResetBackup?: boolean;
    } = {};

    try {
      const text = await req.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    if (
      body.confirmPhrase !== undefined &&
      body.confirmPhrase.trim() !== 'FRESH FACTORY START'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation phrase mismatch. Type FRESH FACTORY START to confirm.',
        },
        { status: 400 }
      );
    }

    const result = await resetAllModulesToZero({
      cleanTestBackups: body.cleanTestBackups ?? true,
      resetEmployees: body.resetEmployees ?? true,
      inventoryZeroMode: body.inventoryZeroMode ?? 'keep-zero',
      createPreResetBackup: body.createPreResetBackup ?? true,
    });

    return NextResponse.json({
      success: true,
      message: 'All factory transactions cleared to zero while preserving pricing & BOQ formulas.',
      result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset ERP data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
