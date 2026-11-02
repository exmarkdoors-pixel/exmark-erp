import { NextRequest, NextResponse } from 'next/server';
import { getLead, addFollowUp, listFollowUps } from '@/lib/services/crmService';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateKey,
  buildWhatsAppUrl,
  sanitizeWhatsAppPhone,
  isValidWhatsAppPhone,
  WhatsAppTemplateContext,
} from '@/lib/services/whatsappService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await getLead(id);

    if (!lead) {
      return NextResponse.json({ success: false, error: `Lead ${id} not found` }, { status: 404 });
    }

    const context: WhatsAppTemplateContext = {
      leadCode: lead.leadCode,
      title: lead.title,
      client: lead.contactPerson || lead.title,
      contactPerson: lead.contactPerson,
      phone: lead.phone,
      district: lead.district,
      value: lead.estimatedValue || undefined,
      stage: lead.stage,
      companyName: 'EXMARK DOORS',
    };

    // Pre-render templates with lead's live context
    const renderedTemplates = Object.entries(WHATSAPP_TEMPLATES).map(([key, tpl]) => ({
      key,
      title: tpl.title,
      category: tpl.category,
      description: tpl.description,
      defaultMessage: tpl.render(context),
    }));

    // Fetch previous WhatsApp follow-ups for this lead
    const allFollowUps = await listFollowUps(id);
    const whatsappHistory = allFollowUps.filter((fu) => fu.type === 'WHATSAPP');

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        leadCode: lead.leadCode,
        title: lead.title,
        contactPerson: lead.contactPerson,
        phone: lead.phone,
        sanitizedPhone: sanitizeWhatsAppPhone(lead.phone),
        isValidPhone: isValidWhatsAppPhone(lead.phone),
        district: lead.district,
        stage: lead.stage,
      },
      templates: renderedTemplates,
      history: whatsappHistory,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch WhatsApp lead data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ success: false, error: `Lead ${id} not found` }, { status: 404 });
    }

    const messageText: string = body.messageText?.trim() || '';
    if (!messageText) {
      return NextResponse.json({ success: false, error: 'Message text cannot be empty' }, { status: 400 });
    }

    const templateKey: WhatsAppTemplateKey = body.templateKey || 'custom';
    const autoLog: boolean = body.autoLog !== false;
    const targetPhone: string = body.phone || lead.phone;

    const sanitizedPhone = sanitizeWhatsAppPhone(targetPhone);
    if (!sanitizedPhone) {
      return NextResponse.json({ success: false, error: 'Target phone number is invalid' }, { status: 400 });
    }

    const whatsappUrl = buildWhatsAppUrl(sanitizedPhone, messageText);

    let loggedFollowUp = null;
    if (autoLog) {
      const templateTitle = WHATSAPP_TEMPLATES[templateKey]?.title || 'Custom Message';
      const notesSnippet = messageText.length > 250 ? `${messageText.slice(0, 247)}...` : messageText;
      loggedFollowUp = await addFollowUp(id, {
        followUpDate: new Date().toISOString(),
        type: 'WHATSAPP',
        notes: `[WhatsApp: ${templateTitle}] ${notesSnippet}`,
        completedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      whatsappUrl,
      sanitizedPhone,
      followUp: loggedFollowUp,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process WhatsApp action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
