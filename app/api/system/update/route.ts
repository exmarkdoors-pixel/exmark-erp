import { NextResponse } from 'next/server';
import { getSystemVersionInfo } from '@/lib/services/updateService';

export async function GET() {
  try {
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
