import fs from 'fs';
import path from 'path';
import {
  WhatsAppMessage,
  WhatsAppDocumentType,
  CustomerConfirmationDecision,
  MeasurementConfirmationRecord,
} from '@/types/communication';
import { updateMeasurement } from './measurementService';

const STORE_PATH = path.join(process.cwd(), 'data', 'whatsapp-store.json');

function readStore(): WhatsAppMessage[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WhatsAppMessage[]) : [];
  } catch {
    return [];
  }
}

function writeStore(messages: WhatsAppMessage[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error('[communicationService] Failed to write store:', err);
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── WhatsApp Official Cloud API Service ───────────────────────────────────────

export async function listWhatsAppMessages(filter?: {
  recipientPhone?: string;
  documentType?: WhatsAppDocumentType;
}): Promise<WhatsAppMessage[]> {
  const all = readStore();
  return all.filter((m) => {
    if (filter?.recipientPhone && !m.recipientPhone.includes(filter.recipientPhone)) return false;
    if (filter?.documentType && m.documentType !== filter.documentType) return false;
    return true;
  });
}

export async function sendWhatsAppTemplateMessage(input: {
  recipientPhone: string;
  recipientName: string;
  documentType: WhatsAppDocumentType;
  documentId?: string | null;
  language?: 'en' | 'ml';
  payload: Record<string, string | number>;
}): Promise<WhatsAppMessage> {
  const all = readStore();

  // Clean phone number (must start with country code +91)
  let cleanPhone = input.recipientPhone.replace(/[\s-]/g, '');
  if (!cleanPhone.startsWith('+')) {
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else {
      cleanPhone = `+${cleanPhone}`;
    }
  }

  // Template name mapping
  let templateName = 'exmark_notification';
  switch (input.documentType) {
    case 'MEASUREMENT_CONFIRMATION':
      templateName = input.language === 'ml' ? 'exmark_msr_confirm_ml' : 'exmark_msr_confirm_en';
      break;
    case 'QUOTATION':
      templateName = 'exmark_quotation_estimate';
      break;
    case 'INVOICE':
      templateName = 'exmark_gst_invoice';
      break;
    case 'RECEIPT':
      templateName = 'exmark_payment_receipt';
      break;
    case 'DISPATCH_ALERT':
      templateName = 'exmark_dispatch_tracking';
      break;
    case 'WARRANTY_CERT':
      templateName = 'exmark_frp_warranty_certificate';
      break;
  }

  const messageId = generateId('wa');
  const providerMsgId = `wamid.HBgM${Date.now()}Exmark`;

  const newMsg: WhatsAppMessage = {
    id: messageId,
    recipientPhone: cleanPhone,
    recipientName: input.recipientName,
    documentType: input.documentType,
    documentId: input.documentId || null,
    templateName,
    language: input.language || 'en',
    providerMsgId,
    status: 'DELIVERED', // Simulated instant Meta Cloud delivery
    payload: input.payload,
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  all.unshift(newMsg);
  writeStore(all);
  return newMsg;
}

// ── Customer Measurement Confirmation Service ─────────────────────────────────

export async function generateConfirmationToken(measurement: {
  id: string;
  refNumber: string;
  customerName?: string | null;
  phone?: string | null;
  siteName: string;
  district: string;
  totalOpenings?: number;
}): Promise<MeasurementConfirmationRecord> {
  const token = `tok_${measurement.id.slice(-6)}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days validity

  return {
    measurementId: measurement.id,
    refNumber: measurement.refNumber,
    customerName: measurement.customerName || 'Customer',
    phone: measurement.phone || '+91 94470 00000',
    siteName: measurement.siteName,
    district: measurement.district,
    totalOpenings: measurement.totalOpenings || 1,
    confirmationToken: token,
    expiresAt,
    decision: null,
  };
}

export async function recordCustomerMeasurementDecision(
  measurementId: string,
  decision: CustomerConfirmationDecision,
  remarks?: string
): Promise<{ success: boolean; measurementId: string; status: string; remarks?: string }> {
  // Update status in measurement service
  let newStatus: 'APPROVED' | 'VERIFIED' | 'DRAFT' = 'VERIFIED';
  if (decision === 'ACCEPT') {
    newStatus = 'APPROVED';
  } else if (decision === 'CORRECTION_REQUESTED') {
    newStatus = 'DRAFT';
  }

  await updateMeasurement(measurementId, {
    status: newStatus,
    notes: remarks ? `[Customer Decision: ${decision}] ${remarks}` : undefined,
  });

  return {
    success: true,
    measurementId,
    status: newStatus,
    remarks,
  };
}
