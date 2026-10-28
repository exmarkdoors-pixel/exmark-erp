import { NextRequest, NextResponse } from 'next/server';
import {
  listWhatsAppMessages,
  sendWhatsAppTemplateMessage,
} from '@/lib/services/communicationService';
import { WhatsAppDocumentType } from '@/types/communication';
import { authorizeRequest } from '@/lib/auth/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, ['Super Admin', 'Management', 'Sales', 'Accounts', 'Installation']);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get('documentType') as WhatsAppDocumentType | null;
    const phone = searchParams.get('phone') || undefined;

    const messages = await listWhatsAppMessages({
      documentType: documentType || undefined,
      recipientPhone: phone,
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, ['Super Admin', 'Management', 'Sales', 'Installation']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.recipientPhone?.trim()) {
      return NextResponse.json({ success: false, error: 'Recipient phone number is required' }, { status: 400 });
    }
    if (!body.documentType) {
      return NextResponse.json({ success: false, error: 'Document type is required' }, { status: 400 });
    }

    const message = await sendWhatsAppTemplateMessage({
      recipientPhone: body.recipientPhone.trim(),
      recipientName: body.recipientName?.trim() || 'Customer',
      documentType: body.documentType as WhatsAppDocumentType,
      documentId: body.documentId || null,
      language: body.language || 'en',
      payload: body.payload || {},
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send WhatsApp message';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
