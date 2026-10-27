import { NextRequest, NextResponse } from 'next/server';
import {
  listLeads,
  createLead,
  LeadFilter,
  LeadStage,
} from '@/lib/services/crmService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter: LeadFilter = {};

    const stage = searchParams.get('stage') as LeadStage | null;
    if (stage) filter.stage = stage;

    const district = searchParams.get('district');
    if (district) filter.district = district;

    const customerId = searchParams.get('customerId');
    if (customerId) filter.customerId = customerId;

    const leads = await listLeads(filter);
    return NextResponse.json({ success: true, data: leads });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch leads';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: 'Lead Title/Project Name is required' }, { status: 400 });
    }
    if (!body.contactPerson?.trim()) {
      return NextResponse.json({ success: false, error: 'Contact Person is required' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }
    if (!body.district?.trim()) {
      return NextResponse.json({ success: false, error: 'Kerala District is required' }, { status: 400 });
    }

    const lead = await createLead({
      customerId: body.customerId || null,
      title: body.title.trim(),
      contactPerson: body.contactPerson.trim(),
      phone: body.phone.trim(),
      district: body.district.trim(),
      stage: body.stage || 'NEW',
      estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null,
      assignedToId: body.assignedToId || null,
      notes: body.notes?.trim() || undefined,
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
