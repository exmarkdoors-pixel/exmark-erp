'use client';

import React, { useState } from 'react';
import { X, Send, MessageSquare, AlertCircle } from 'lucide-react';
import { WhatsAppDocumentType, WhatsAppMessage } from '@/types/communication';

interface WhatsAppSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: (msg: WhatsAppMessage) => void;
  initialRecipientPhone?: string;
  initialRecipientName?: string;
  initialDocumentType?: WhatsAppDocumentType;
  initialDocumentId?: string;
}

export function WhatsAppSendModal({
  isOpen,
  onClose,
  onSent,
  initialRecipientPhone = '+91 94470 12345',
  initialRecipientName = 'Client / Dealer',
  initialDocumentType = 'MEASUREMENT_CONFIRMATION',
  initialDocumentId = '',
}: WhatsAppSendModalProps) {
  const [recipientPhone, setRecipientPhone] = useState(initialRecipientPhone);
  const [recipientName, setRecipientName] = useState(initialRecipientName);
  const [documentType, setDocumentType] = useState<WhatsAppDocumentType>(initialDocumentType);
  const [language, setLanguage] = useState<'en' | 'ml'>('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTemplatePreview = () => {
    if (language === 'ml') {
      switch (documentType) {
        case 'MEASUREMENT_CONFIRMATION':
          return `നമസ്കാരം ${recipientName || 'സർ/മാഡം'}, EXMARK DOORS-ൽ നിന്നുള്ള നിങ്ങളുടെ സൈറ്റ് ഡോർ അളവുകൾ തയ്യാറായിട്ടുണ്ട്. ദയവായി താഴെ നൽകിയിരിക്കുന്ന ലിങ്ക് വഴി അളവുകൾ പരിശോധിച്ച് സ്ഥിരീകരിക്കുക:\n🔗 https://exmarkdoors.com/confirm/${initialDocumentId || 'msr-demo'}`;
        case 'QUOTATION':
          return `നമസ്കാരം ${recipientName}, EXMARK FRP ഡോറുകൾക്കുള്ള നിങ്ങളുടെ കൊട്ടേഷൻ എസ്റ്റിമേറ്റ് തയ്യാറായിട്ടുണ്ട്. 18% GST ഉൾപ്പെടെയുള്ള വിവരങ്ങൾ ഇതോടൊപ്പം അറ്റാച്ച് ചെയ്തിരിക്കുന്നു.`;
        case 'INVOICE':
          return `പ്രിയ ${recipientName}, EXMARK DOORS ടാക്സ് ഇൻവോയ്സ് ഇതോടൊപ്പം ചേർക്കുന്നു. Kerala HSN 3925. നന്ദി!`;
        default:
          return `നമസ്കാരം ${recipientName}, EXMARK DOORS-ൽ നിന്നുള്ള അറിയിപ്പ്.`;
      }
    } else {
      switch (documentType) {
        case 'MEASUREMENT_CONFIRMATION':
          return `Dear ${recipientName || 'Customer'}, your EXMARK Site Door Measurements (${initialDocumentId || 'MSR-2026-001'}) have been verified. Please inspect finished cutting sizes and tap below to confirm:\n🔗 https://exmarkdoors.com/confirm/${initialDocumentId || 'msr-demo'}`;
        case 'QUOTATION':
          return `Dear ${recipientName}, your official quotation estimate for EXMARK Premium FRP Doors is ready with 18% GST. Total estimate is attached.`;
        case 'INVOICE':
          return `Dear ${recipientName}, your EXMARK GST Tax Invoice has been generated. e-Way bill and vehicle dispatch details attached.`;
        case 'RECEIPT':
          return `Payment Received: Dear ${recipientName}, we have received your payment. Official EXMARK receipt is attached. Thank you!`;
        case 'DISPATCH_ALERT':
          return `Dispatch Alert: Your FRP door consignment has been loaded and dispatched via vehicle. Driver details attached.`;
        case 'WARRANTY_CERT':
          return `Dear ${recipientName}, your EXMARK 10-Year FRP Door Material Warranty Certificate has been registered.`;
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipientPhone.trim()) {
      setError('Recipient phone number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/communication/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: recipientPhone.trim(),
          recipientName: recipientName.trim(),
          documentType,
          documentId: initialDocumentId || null,
          language,
          payload: {
            customerName: recipientName,
            documentId: initialDocumentId || 'DOC-2026',
            company: 'EXMARK DOORS',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send WhatsApp message');
      }

      if (onSent) onSent(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Official WhatsApp Business Communication
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Meta Cloud API Template Messaging • Kerala Bilingual Support
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Document / Alert Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as WhatsAppDocumentType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              >
                <option value="MEASUREMENT_CONFIRMATION">Measurement Confirmation</option>
                <option value="QUOTATION">Quotation Estimate PDF</option>
                <option value="INVOICE">Tax Invoice & e-Way Bill</option>
                <option value="RECEIPT">Payment Receipt</option>
                <option value="DISPATCH_ALERT">Vehicle Dispatch Alert</option>
                <option value="WARRANTY_CERT">FRP Warranty Certificate</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Template Language
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    language === 'en'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ml')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    language === 'ml'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  മലയാളം
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Recipient Customer Name *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Er. Jacob Roy"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                WhatsApp Phone Number (+91) *
              </label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+91 94470 12345"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Template Message Live Preview */}
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
              Meta Approved Template Live Preview:
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {getTemplatePreview()}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Transmitting...' : 'Send WhatsApp Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
