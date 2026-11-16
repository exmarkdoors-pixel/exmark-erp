'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Send,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Share2,
} from 'lucide-react';
import { WhatsAppSession, DEFAULT_WHATSAPP_SESSION, sanitizeWhatsAppPhone } from '@/lib/services/whatsappService';

export interface ShareableQuotation {
  id: string;
  customerName: string;
  customerPhone?: string;
  phone?: string;
  location?: string;
  date?: string;
  itemsSummary?: string;
  items?: any[];
  grandTotal?: number;
  totalAmount?: number;
  subtotal?: number;
  advanceAmount?: number;
  advancePercent?: number;
  salespersonName?: string;
  notes?: string;
  [key: string]: any;
}

interface WhatsAppQuoteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: ShareableQuotation | null;
  onOpenWhatsAppLogin?: () => void;
}

export function WhatsAppQuoteShareModal({
  isOpen,
  onClose,
  quotation,
  onOpenWhatsAppLogin,
}: WhatsAppQuoteShareModalProps) {
  const [session, setSession] = useState<WhatsAppSession>(DEFAULT_WHATSAPP_SESSION);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [language, setLanguage] = useState<'bilingual' | 'en' | 'ml'>('bilingual');
  const [includeTrackingLink, setIncludeTrackingLink] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Fetch live WhatsApp session state
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/crm/whatsapp/session')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && data.session) {
          setSession(data.session);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Set recipient phone from quotation customer when modal opens
  useEffect(() => {
    if (quotation) {
      setRecipientPhone(quotation.customerPhone || quotation.phone || '');
      setSendSuccess(null);
      setSendError(null);
    }
  }, [quotation]);

  if (!isOpen || !quotation) return null;

  // Resolve active host for the live customer order status portal
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
  const trackingUrl = `${origin}/order-status/${encodeURIComponent(quotation.id)}`;

  // Generate message text
  const generateMessage = () => {
    const q = quotation;
    const totalVal = Number(q.grandTotal ?? q.totalAmount ?? 0);
    const cleanTotal = totalVal.toLocaleString('en-IN');
    const cleanAdv = Number(q.advanceAmount ?? Math.round(totalVal * 0.5)).toLocaleString('en-IN');
    const advPercent = q.advancePercent || 50;

    if (language === 'ml') {
      return `🏢 *EXMARK DOORS PRIVATE LIMITED*
*ഫാക്ടറി കൊട്ടേഷൻ വിവരം*

📋 *കൊട്ടേഷൻ നമ്പർ*: ${q.id}
👤 *കസ്റ്റമർ*: ${q.customerName}
📍 *സ്ഥലം*: ${q.location || 'Kerala'}
📅 *തീയതി*: ${q.date || new Date().toISOString().slice(0, 10)}
🚪 *ഡോറുകൾ*: ${q.itemsSummary || `${q.items?.length || 1} FRP/WPC Doors`}
💰 *ആകെ തുക*: ₹${cleanTotal}
💵 *ആവശ്യമായ അഡ്വാൻസ് (${advPercent}%)*: ₹${cleanAdv}

${includeTrackingLink ? `🔍 *നിങ്ങളുടെ ഓർഡർ സ്റ്റാറ്റസ് ഓൺലൈനായി കാണുക*:\n${trackingUrl}\n\n` : ''}കൂടുതൽ വിവരങ്ങൾക്ക് വിളിക്കുക: +91 94470 12345
*EXMARK DOORS — ഭംഗിയും ഉറപ്പും ആജീവനാന്തം*`;
    }

    if (language === 'en') {
      return `🏢 *EXMARK DOORS PRIVATE LIMITED*
*Official Factory Quotation & Specifications*

📋 *Quotation Ref*: ${q.id}
👤 *Client / Project*: ${q.customerName}
📍 *Project Location*: ${q.location || 'Kerala'}
📅 *Date*: ${q.date || new Date().toISOString().slice(0, 10)}
🚪 *Door Schedule*: ${q.itemsSummary || `${q.items?.length || 1} FRP/WPC Doors`}
💰 *Quotation Value*: ₹${cleanTotal}
💵 *Required Advance (${advPercent}%)*: ₹${cleanAdv}

${includeTrackingLink ? `🔍 *Live Customer Order Tracking Portal*:\n${trackingUrl}\n\n` : ''}For confirmations or custom revisions, reply directly to this WhatsApp.
*EXMARK DOORS — Certified ISO 9001:2015 Manufacturing Plant*`;
    }

    // Default Bilingual (English + Malayalam)
    return `🏢 *EXMARK DOORS PRIVATE LIMITED*
*Factory Quotation / ഫാക്ടറി കൊട്ടേഷൻ*

📋 *Ref / കൊട്ടേഷൻ നമ്പർ*: ${q.id}
👤 *Customer / കസ്റ്റമർ*: ${q.customerName}
📍 *Location / സ്ഥലം*: ${q.location || 'Kerala'}
🚪 *Door Openings*: ${q.itemsSummary || `${q.items?.length || 1} FRP Doors`}
💰 *Total Value / ആകെ തുക*: ₹${cleanTotal}
💵 *Advance Required (${advPercent}%)*: ₹${cleanAdv}

${includeTrackingLink ? `🔍 *Live Customer Order Status Link / ഓൺലൈൻ ട്രാക്കിംഗ്*:\n${trackingUrl}\n\n` : ''}For inquiries & delivery schedule: +91 94470 12345
*EXMARK DOORS — FRP Molded & WPC Composite Doors*`;
  };

  const messageText = generateMessage();

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSendViaSession = async () => {
    const cleanPhone = sanitizeWhatsAppPhone(recipientPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setSendError('Please enter a valid 10-digit mobile number with country code (e.g. +91 98471 23456).');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      // 1. Log message to communication store
      const res = await fetch('/api/communication/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: cleanPhone,
          recipientName: quotation.customerName,
          documentType: 'QUOTATION',
          documentId: quotation.id,
          language: language === 'ml' ? 'ml' : 'en',
          payload: {
            quoteNumber: quotation.id,
            customerName: quotation.customerName,
            location: quotation.location,
            grandTotal: quotation.grandTotal ?? quotation.totalAmount ?? 0,
            advanceAmount: quotation.advanceAmount ?? 0,
            trackingUrl,
            messageSnippet: messageText,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendSuccess(`✓ Quotation ${quotation.id} sent successfully via WhatsApp to ${cleanPhone}!`);
        // Also open WhatsApp web or desktop client if requested
        setTimeout(() => {
          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }, 600);
      } else {
        // Fallback to wa.me deep link
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        setSendSuccess(`Opened WhatsApp Web / App to complete send to ${cleanPhone}.`);
      }
    } catch {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setSendSuccess(`Opened WhatsApp to dispatch message.`);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenDirectWhatsApp = () => {
    const cleanPhone = sanitizeWhatsAppPhone(recipientPhone);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#10172a] border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-b border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>WhatsApp Quotation Dispatcher</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {quotation.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Send factory quote, specifications, and live tracking link to customer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WhatsApp Connection Status Banner */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                session.connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-rose-500'
              }`}
            />
            {session.connected ? (
              <span className="text-slate-300 font-medium">
                Inbuilt WhatsApp: <strong className="text-emerald-400">{session.phoneNumber}</strong> ({session.deviceName})
              </span>
            ) : (
              <span className="text-amber-300 font-medium">
                Inbuilt WhatsApp: Disconnected (Web link will be used)
              </span>
            )}
          </div>
          {!session.connected && onOpenWhatsAppLogin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWhatsAppLogin();
              }}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
            >
              Pair Device
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Recipient Phone & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Recipient WhatsApp Phone *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+91 98471 23456"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Smartphone className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Template Language
              </label>
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLanguage('bilingual')}
                  className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    language === 'bilingual' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bilingual
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    language === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ml')}
                  className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    language === 'ml' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  മലയാളം
                </button>
              </div>
            </div>
          </div>

          {/* Customer & Quote Summary Banner */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white text-sm">{quotation.customerName}</div>
              <div className="text-slate-400 text-[11px]">
                {quotation.location} • {quotation.itemsSummary || 'FRP Architectural Doors'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-bold font-mono text-base">
                ₹{Number(quotation.grandTotal ?? quotation.totalAmount ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-amber-400 font-mono text-[11px]">
                Adv: ₹{Number(quotation.advanceAmount ?? Math.round(Number(quotation.grandTotal ?? quotation.totalAmount ?? 0) * 0.5)).toLocaleString('en-IN')} ({quotation.advancePercent || 50}%)
              </div>
            </div>
          </div>

          {/* Toggle for Live Tracking Link */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={includeTrackingLink}
              onChange={(e) => setIncludeTrackingLink(e.target.checked)}
              className="rounded accent-emerald-600 cursor-pointer w-4 h-4"
            />
            <div className="text-[11px]">
              <span className="font-semibold text-slate-200">Include Live Customer Order Tracking Portal Link</span>
              <span className="block text-slate-500 font-mono text-[10px] truncate max-w-sm">
                {trackingUrl}
              </span>
            </div>
          </label>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300">
                Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="w-full bg-[#070D1E] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {messageText}
            </pre>
          </div>

          {/* Feedback messages */}
          {sendSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sendSuccess}</span>
            </div>
          )}

          {sendError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
              {sendError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDirectWhatsApp}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              title="Open directly in WhatsApp Web or WhatsApp Desktop Application"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>WhatsApp Web</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaSession}
              disabled={isSending}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/50 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send WhatsApp Quote'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
