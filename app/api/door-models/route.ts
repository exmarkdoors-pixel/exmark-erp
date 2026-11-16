import { NextResponse } from 'next/server';
import {
  getAllAvailableDoorModels,
  saveCustomDoorModel,
  DoorModelOption,
} from '@/lib/services/doorModelCatalogService';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.code) {
      return NextResponse.json(
        { success: false, error: 'Model code is required' },
        { status: 400 }
      );
    }
    const saved = saveCustomDoorModel(body);
    const allModels = getAllAvailableDoorModels();
    return NextResponse.json({ success: true, data: saved, allModels });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save door model' },
      { status: 500 }
    );
  }
}
