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

    const title = body.title?.trim();
    const client = body.client?.trim() || body.contactPerson?.trim() || title;
    const contactPerson = body.contactPerson?.trim() || client;
    const phone = body.phone?.trim();
    const district = body.district?.trim() || 'Ernakulam';

    if (!title) {
      return NextResponse.json({ success: false, error: 'Lead Title/Project Name is required' }, { status: 400 });
    }
    if (!contactPerson) {
      return NextResponse.json({ success: false, error: 'Contact Person or Client Name is required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    // Map frontend stage keys to LeadStage enum if needed
    let stage: LeadStage = 'NEW';
    if (body.stage === 'measurement' || body.stage === 'MEASUREMENT_SCHEDULED') stage = 'MEASUREMENT_SCHEDULED';
    else if (body.stage === 'quotation' || body.stage === 'QUOTE_SENT') stage = 'QUOTE_SENT';
    else if (body.stage === 'negotiation' || body.stage === 'NEGOTIATION') stage = 'NEGOTIATION';
    else if (body.stage === 'WON') stage = 'WON';
    else if (body.stage === 'LOST') stage = 'LOST';

    const numValue = body.value ? Number(body.value) : (body.estimatedValue ? Number(body.estimatedValue) : null);

    const lead = await createLead({
      customerId: body.customerId || null,
      title,
      client,
      contactPerson,
      phone,
      district,
      stage,
      estimatedValue: numValue,
      value: numValue,
      doors: body.doors?.trim() || undefined,
      doorCount: body.doorCount ? Number(body.doorCount) : undefined,
      assignedToId: body.assignedToId || null,
      notes: body.notes?.trim() || undefined,
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
