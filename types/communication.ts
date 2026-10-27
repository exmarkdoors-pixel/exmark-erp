// ── Shared Communication & Reports Types ────────────────────────────────────

export type WhatsAppDocumentType =
  | 'MEASUREMENT_CONFIRMATION'
  | 'QUOTATION'
  | 'INVOICE'
  | 'RECEIPT'
  | 'DISPATCH_ALERT'
  | 'WARRANTY_CERT';

export type WhatsAppMessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  documentType: WhatsAppDocumentType;
  documentId?: string | null;
  templateName: string;
  language: 'en' | 'ml'; // English or Malayalam
  providerMsgId?: string | null;
  status: WhatsAppMessageStatus;
  payload: Record<string, string | number>;
  sentAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export type CustomerConfirmationDecision = 'ACCEPT' | 'REJECT' | 'CORRECTION_REQUESTED';

export interface MeasurementConfirmationRecord {
  measurementId: string;
  refNumber: string;
  customerName: string;
  phone: string;
  siteName: string;
  district: string;
  totalOpenings: number;
  confirmationToken: string;
  expiresAt: string;
  decision?: CustomerConfirmationDecision | null;
  decisionRemarks?: string | null;
  decidedAt?: string | null;
}

export interface ReportDefinition {
  id: string;
  reportCode: string;
  title: string;
  category: 'SALES' | 'PRODUCTION' | 'FINANCE' | 'INVENTORY';
  description: string;
  columns: Array<{ key: string; label: string; format?: 'currency' | 'number' | 'date' | 'text' }>;
}

export interface ReportExecutionResult {
  reportCode: string;
  title: string;
  generatedAt: string;
  filterApplied: {
    startDate?: string;
    endDate?: string;
    district?: string;
    category?: string;
  };
  summaryMetrics: Record<string, string | number>;
  rows: Record<string, string | number>[];
}
