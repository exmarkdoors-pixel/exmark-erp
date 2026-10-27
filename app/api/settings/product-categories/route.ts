import { NextResponse } from 'next/server';
import {
  getProductCategories,
  toggleCategoryEnabled,
  updateProductCategory,
  addProductCategory,
} from '@/lib/services/productCategoryService';

export async function GET() {
  try {
    const categories = await getProductCategories();
    const wpcCategory = categories.find((c) => c.code === 'WPC');
    const isWpcEnabled = Boolean(wpcCategory?.enabled);

    return NextResponse.json({
      success: true,
      data: categories,
      isWpcEnabled,
      primaryCategory: 'FRP',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching categories';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { code, enabled, updates } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Product category code is required.' },
        { status: 400 }
      );
    }

    let updated;
    if (typeof enabled === 'boolean') {
      updated = await toggleCategoryEnabled(code, enabled);
    } else if (updates) {
      updated = await updateProductCategory(code, updates);
    } else {
      return NextResponse.json(
        { success: false, error: 'Neither enabled state nor updates payload provided.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Category ${code} updated successfully.`,
      category: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating product category';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, description, fields, pricing, production, enabled, reportingVisibility } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'Category code and name are required.' },
        { status: 400 }
      );
    }

    const created = await addProductCategory({
      code,
      name,
      description: description || '',
      fields: fields || ['Thickness', 'Model Spec', 'Finish'],
      pricing: pricing || { baseRateSqFt: 180, standardGstPercent: 18, hsnCode: '3925.20.00' },
      production: production || { lineCode: `${code}-01`, lineName: `${name} Line`, cycleTimeMinutes: 45, qcCheckpoints: ['Dimensional Accuracy', 'Quality Finish'] },
      enabled: enabled ?? true,
      reportingVisibility: reportingVisibility ?? true,
    });

    return NextResponse.json({
      success: true,
      message: `New category ${code} added successfully.`,
      category: created,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error creating product category';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
