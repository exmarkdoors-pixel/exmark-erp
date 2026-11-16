import { NextResponse } from 'next/server';
import { getAllAvailableDoorModels } from '@/lib/services/doorModelCatalogService';

export async function GET() {
  try {
    const models = getAllAvailableDoorModels();
    return NextResponse.json({ success: true, data: models });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch door models' },
      { status: 500 }
    );
  }
}
