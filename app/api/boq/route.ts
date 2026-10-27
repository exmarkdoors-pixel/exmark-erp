import { NextRequest, NextResponse } from 'next/server';
import {
  listBoqs,
  createBoq,
  BoqFilter,
  BoqStatus,
} from '@/lib/services/boqService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter: BoqFilter = {};

    const status = searchParams.get('status') as BoqStatus | null;
    if (status) filter.status = status;

    const district = searchParams.get('district');
    if (district) filter.district = district;

    const customerId = searchParams.get('customerId');
    if (customerId) filter.customerId = customerId;

    const boqs = await listBoqs(filter);
    return NextResponse.json({ success: true, data: boqs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BOQs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.customerName?.trim()) {
      return NextResponse.json({ success: false, error: 'Customer Name is required' }, { status: 400 });
    }
    if (!body.projectName?.trim()) {
      return NextResponse.json({ success: false, error: 'Project Name is required' }, { status: 400 });
    }
    if (!body.district?.trim()) {
      return NextResponse.json({ success: false, error: 'District is required' }, { status: 400 });
    }

    const boq = await createBoq({
      customerId: body.customerId || null,
      customerName: body.customerName.trim(),
      projectName: body.projectName.trim(),
      siteAddress: body.siteAddress?.trim() || undefined,
      district: body.district.trim(),
      revisionNumber: body.revisionNumber ? Number(body.revisionNumber) : 1,
      status: body.status || 'DRAFT',
      notes: body.notes?.trim() || undefined,
      originalImport: body.originalImport || null,
    });

    return NextResponse.json({ success: true, data: boq }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create BOQ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
