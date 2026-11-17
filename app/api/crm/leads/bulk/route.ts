import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { createLeadsBulk, LeadCreateInput, LeadStage } from '@/lib/services/crmService';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'crm', ['Super Admin', 'Management', 'Sales', 'Site Engineer']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const rawLeads = Array.isArray(body.leads) ? body.leads : [];

    if (rawLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid leads provided for bulk import.' },
        { status: 400 }
      );
    }

    const preparedLeads: LeadCreateInput[] = [];

    for (const item of rawLeads) {
      const title = String(item.title || item.client || 'New Lead').trim();
      const client = String(item.client || item.contactPerson || title).trim();
      const contactPerson = String(item.contactPerson || client).trim();
      const phone = String(item.phone || '').trim();
      const district = String(item.district || 'Ernakulam').trim();

      if (!phone) continue; // Skip invalid phone rows

      // Map frontend stage keys to LeadStage
      let stage: LeadStage = 'NEW';
      const stageStr = String(item.stage || '').toLowerCase();
      if (stageStr.includes('measure')) stage = 'MEASUREMENT_SCHEDULED';
      else if (stageStr.includes('quote') || stageStr.includes('quotation')) stage = 'QUOTE_SENT';
      else if (stageStr.includes('negotiat')) stage = 'NEGOTIATION';
      else if (stageStr === 'won') stage = 'WON';
      else if (stageStr === 'lost') stage = 'LOST';

      const numVal = item.value ? Number(item.value) : (item.estimatedValue ? Number(item.estimatedValue) : 0);
      const doorCount = item.doorCount ? Math.max(1, parseInt(String(item.doorCount), 10) || 1) : 1;

      preparedLeads.push({
        customerId: item.customerId || null,
        title,
        client,
        contactPerson,
        phone,
        district,
        stage,
        estimatedValue: numVal,
        value: numVal,
        doors: item.doors || 'FRP & WPC Doors',
        doorCount,
        assignedToId: item.assignedToId || null,
        notes: item.notes ? String(item.notes).trim() : undefined,
      });
    }

    if (preparedLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'None of the provided rows contained valid phone numbers.' },
        { status: 400 }
      );
    }

    const createdLeads = await createLeadsBulk(preparedLeads);

    return NextResponse.json({
      success: true,
      count: createdLeads.length,
      data: createdLeads,
      message: `Successfully imported ${createdLeads.length} leads.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import bulk leads';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
