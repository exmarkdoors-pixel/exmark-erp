/**
 * EXMARK ERP — WhatsApp Lead Management & Message Engine
 * Universal deep-linking & templating service for Kerala Door CRM.
 */

export interface WhatsAppTemplateContext {
  leadCode?: string;
  title: string;
  client: string;
  contactPerson?: string;
  phone: string;
  district?: string;
  doors?: string;
  doorCount?: number;
  value?: number;
  stage?: string;
  quoteNumber?: string;
  advancePercentage?: number;
  advanceAmount?: number;
  siteEngineerName?: string;
  siteEngineerPhone?: string;
  visitDate?: string;
  companyName?: string;
  companyPhone?: string;
}

export type WhatsAppTemplateKey =
  | 'inquiry_welcome'
  | 'measurement_booking'
  | 'quote_submitted'
  | 'advance_request'
  | 'production_update'
  | 'dispatch_alert'
  | 'custom';

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey;
  title: string;
  category: 'Inquiry' | 'Site Visit' | 'Quotation' | 'Finance' | 'Production' | 'Dispatch' | 'General';
  description: string;
  iconName: string;
  render: (ctx: WhatsAppTemplateContext) => string;
}

/**
 * Sanitizes phone numbers into clean E.164 format without '+' or special characters.
 * Defaults to Indian country code '91' if missing.
 * e.g. "+91 94470 12345" -> "919447012345"
 * e.g. "09895054321"     -> "919895054321"
 * e.g. "97450 67890"     -> "919745067890"
 */
export function sanitizeWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Remove leading 0 (common in Indian trunk dialing e.g. 098950...)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // If 10 digits (standard Indian mobile without country code), prepend '91'
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
}

/**
 * Validates if the phone number is a valid 10-13 digit international format.
 */
export function isValidWhatsAppPhone(rawPhone: string): boolean {
  const sanitized = sanitizeWhatsAppPhone(rawPhone);
  return sanitized.length >= 11 && sanitized.length <= 14;
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, WhatsAppTemplate> = {
  inquiry_welcome: {
    key: 'inquiry_welcome',
    title: 'Inquiry Welcome & Catalog',
    category: 'Inquiry',
    description: 'Welcome new project inquiries and share Kerala door product range.',
    iconName: 'Sparkles',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      const company = ctx.companyName || 'EXMARK DOORS';
      const doors = ctx.doors || 'FRP Architectural & Moisture-Proof Doors';
      return (
        `👋 *Hello ${contact},*\n\n` +
        `Thank you for reaching out to *${company}* regarding *${ctx.title}* (${ctx.district || 'Kerala'}).\n\n` +
        `We have received your requirement for:\n` +
        `🚪 *Requirement:* ${doors}\n` +
        `📋 *Inquiry Code:* ${ctx.leadCode || 'NEW-LEAD'}\n\n` +
        `Our factory sales engineer will connect with you shortly with our latest finish options (Teak Woodgrain, White Oak & PU Colors) and rate cards.\n\n` +
        `_EXMARK DOORS — Precision Engineered Architectural Doors & Frames._`
      );
    },
  },

  measurement_booking: {
    key: 'measurement_booking',
    title: 'Site Tape Measurement Schedule',
    category: 'Site Visit',
    description: 'Confirm site engineer tape measurement booking date and contact.',
    iconName: 'Ruler',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      const engineer = ctx.siteEngineerName || 'Factory Site Engineer';
      const engineerPhone = ctx.siteEngineerPhone || '+91 94470 12345';
      const visitDate = ctx.visitDate || 'within 48 hours';
      return (
        `📐 *Site Measurement Confirmation — EXMARK DOORS*\n\n` +
        `Dear *${contact}*,\n` +
        `Site tape measurement for your project *${ctx.title}* in *${ctx.district || 'Kerala'}* has been scheduled.\n\n` +
        `👷‍♂️ *Assigned Site Engineer:* ${engineer}\n` +
        `📞 *Engineer Contact:* ${engineerPhone}\n` +
        `🗓️ *Scheduled Date:* ${visitDate}\n\n` +
        `Our engineer will measure opening heights, widths, and frame rebates to calculate exact factory door shutter sizes.\n\n` +
        `Please ensure site accessibility. Thank you!`
      );
    },
  },

  quote_submitted: {
    key: 'quote_submitted',
    title: 'GST Quotation Submitted',
    category: 'Quotation',
    description: 'Share quotation total, 18% GST estimate, and sample review details.',
    iconName: 'FileText',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      const formattedVal = ctx.value ? `₹${ctx.value.toLocaleString('en-IN')}` : 'Estimate attached';
      const quoteNo = ctx.quoteNumber || `QTE-2026-${ctx.leadCode?.split('-').pop() || '01'}`;
      return (
        `📋 *Official Quotation — EXMARK DOORS*\n\n` +
        `Dear *${contact}*,\n` +
        `We are pleased to submit the formal GST quotation for *${ctx.title}*.\n\n` +
        `📄 *Quotation Ref:* ${quoteNo}\n` +
        `🚪 *Specification:* ${ctx.doors || 'FRP / WPC Solid Core Doors'}\n` +
        `💰 *Total Estimate (inc. 18% GST):* ${formattedVal}\n` +
        `🛡️ *Warranty:* 5-Year Factory Warranty (IS 14856:2000 compliant)\n\n` +
        `Kindly review the detailed rate breakdown. Let us know if you need any adjustments in hardware mortise or finishes.\n\n` +
        `Best regards,\n` +
        `*EXMARK Sales Team*`
      );
    },
  },

  advance_request: {
    key: 'advance_request',
    title: '40% Advance Payment Gatekeeper',
    category: 'Finance',
    description: 'Request 40% advance deposit to release order to hydraulic press.',
    iconName: 'CreditCard',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      const totalVal = ctx.value || 0;
      const pct = ctx.advancePercentage || 40;
      const advanceAmount = ctx.advanceAmount || (totalVal > 0 ? Math.round((totalVal * pct) / 100) : 0);
      const advDisplay = advanceAmount > 0 ? `₹${advanceAmount.toLocaleString('en-IN')}` : `${pct}% of total quote`;

      return (
        `🔒 *Production Release — Advance Payment Request*\n\n` +
        `Dear *${contact}*,\n` +
        `Your door specifications for *${ctx.title}* have been verified.\n\n` +
        `As per factory production policy, a *${pct}% Advance Deposit (${advDisplay})* is required to initiate raw materials reservation and hydraulic press scheduling.\n\n` +
        `🏦 *Bank Account Details:*\n` +
        `• *Beneficiary:* EXMARK DOORS PRIVATE LIMITED\n` +
        `• *Bank:* HDFC Bank Ltd\n` +
        `• *Account No:* 50200067891234\n` +
        `• *IFSC Code:* HDFC0001234\n` +
        `• *Branch:* Kochi Main, Kerala\n` +
        `• *UPI ID:* exmarkdoors@hdfcbank\n\n` +
        `Kindly share the payment UTR / transaction receipt upon transfer so we can issue your Work Order.`
      );
    },
  },

  production_update: {
    key: 'production_update',
    title: 'Manufacturing & Press Update',
    category: 'Production',
    description: 'Notify client when shutters enter press bonding or pass QC.',
    iconName: 'Layers',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      return (
        `🏭 *Production Floor Update — EXMARK DOORS*\n\n` +
        `Dear *${contact}*,\n` +
        `Good news! Your order *${ctx.leadCode || ''}* (*${ctx.title}*) has progressed on our plant floor:\n\n` +
        `✅ *Status:* Hydraulic Press Bonding & PU Polish Complete\n` +
        `🔍 *Quality Control:* 100% Passed (IS 14856:2000 Dimensional & Screw-Holding Inspection)\n` +
        `📦 *Packaging:* Corner-protected & moisture-sealed\n\n` +
        `Our logistics desk will contact you regarding delivery dispatch.`
      );
    },
  },

  dispatch_alert: {
    key: 'dispatch_alert',
    title: 'Dispatch & Vehicle Gate Pass Alert',
    category: 'Dispatch',
    description: 'Vehicle KL number, driver contact, and gate pass details.',
    iconName: 'Truck',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      return (
        `🚚 *Dispatched — EXMARK DOORS*\n\n` +
        `Dear *${contact}*,\n` +
        `Your doors for *${ctx.title}* have been loaded and dispatched from our factory.\n\n` +
        `📋 *Gate Pass:* GP-2026-${Math.floor(1000 + Math.random() * 9000)}\n` +
        `🚪 *Door Count:* ${ctx.doorCount || ctx.doors || 'As per delivery challan'}\n` +
        `📍 *Destination:* ${ctx.district || 'Site Location'}\n\n` +
        `Please ensure site unloading personnel are ready upon truck arrival. Thank you for choosing EXMARK!`
      );
    },
  },

  custom: {
    key: 'custom',
    title: 'Custom Freeform Message',
    category: 'General',
    description: 'Compose custom text with quick-insert tags.',
    iconName: 'MessageSquare',
    render: (ctx) => {
      const contact = ctx.contactPerson || ctx.client || 'Valued Client';
      return (
        `Dear ${contact},\n\n` +
        `Regarding your project "${ctx.title}" with EXMARK DOORS...\n\n` +
        `Best regards,\nEXMARK DOORS`
      );
    },
  },
};

/**
 * Builds standard universal wa.me deep link.
 */
export function buildWhatsAppUrl(rawPhone: string, messageText: string): string {
  const phone = sanitizeWhatsAppPhone(rawPhone);
  const encodedText = encodeURIComponent(messageText.trim());
  return `https://wa.me/${phone}?text=${encodedText}`;
}

/**
 * Builds desktop application deep link (whatsapp:// protocol).
 */
export function buildWhatsAppAppUrl(rawPhone: string, messageText: string): string {
  const phone = sanitizeWhatsAppPhone(rawPhone);
  const encodedText = encodeURIComponent(messageText.trim());
  return `whatsapp://send?phone=${phone}&text=${encodedText}`;
}
