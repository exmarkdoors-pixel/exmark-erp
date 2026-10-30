import { NextRequest, NextResponse } from 'next/server';
import { bulkUploadCatalog } from '@/lib/services/catalogService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const categoryType = body.categoryType as 'MODELS' | 'COLOURS' | 'LOCKS';
    const items = body.items;

    if (!categoryType || !['MODELS', 'COLOURS', 'LOCKS'].includes(categoryType)) {
      return NextResponse.json(
        { success: false, error: 'Valid categoryType ("MODELS", "COLOURS", "LOCKS") is required.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'An array of items is required for bulk upload.' },
        { status: 400 }
      );
    }

    const result = await bulkUploadCatalog(categoryType, items);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk processing completed: ${result.inserted} inserted, ${result.updated} updated${
        result.errors.length > 0 ? `, with ${result.errors.length} errors` : ''
      }.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bulk upload processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
