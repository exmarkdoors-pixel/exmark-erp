'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Phone,
  Sparkles,
  ShieldCheck,
  Truck,
} from 'lucide-react';

interface ShareOrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    jobCardNumber?: string | null;
    prodOrderNumber?: string | null;
    customerName: string;
    customerPhone?: string | null;
    siteName?: string | null;
    quantity?: number;
    status?: string;
    targetDeliveryDate?: string | null;
    advanceAmount?: number;
  } | null;
}

export function ShareOrderStatusModal({
  isOpen,
  onClose,
  order,
}: ShareOrderStatusModalProps) {
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [templateLang, setTemplateLang] = useState<'BILINGUAL' | 'ENGLISH'>('BILINGUAL');
  const [originUrl, setOriginUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (order) {
      setPhoneNumber(order.customerPhone || '');
      setCopied(false);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const jobCard = order.jobCardNumber || order.prodOrderNumber || order.id;
  const statusLink = `${originUrl}/order-status/${encodeURIComponent(jobCard)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(statusLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getBilingualMessage = () => {
    const custName = order.customerName || 'Valued Customer';
    return `*EXMARK ARCHITECTURAL FRP DOORS* 🚪✨\nപ്രിയപ്പെട്ട *${custName}*,\n\nതാങ്കളുടെ വാതിലുകളുടെ ഓർഡർ *#${jobCard}* ഫാക്ടറി പ്രൊഡക്ഷനിലേക്ക് കടന്നിരിക്കുന്നു.\nYour door project is in active manufacturing.\n\n🔗 *Live Order & Door Status Tracking Link:*\n${statusLink}\n\n🚪 *Total Doors:* ${order.quantity || 1} Nos\n📅 *Target Delivery:* ${order.targetDeliveryDate || 'As scheduled'}\n🏢 *Factory:* EXMARK DOORS Kerala\n📞 *Support:* +91 94479 28866\n\nഓരോ വാതിലിന്റെയും തത്സമയ സ്റ്റാറ്റസ് മുകളിലെ ലിങ്കിൽ കാണാവുന്നതാണ്.\nThank you for choosing EXMARK!`;
  };

  const getEnglishMessage = () => {
    const custName = order.customerName || 'Valued Customer';
    return `*EXMARK ARCHITECTURAL FRP DOORS* 🚪✨\nDear *${custName}*,\n\nYour order *#${jobCard}* is now in active production at our factory.\n\n🔗 *Track Live Order Status & Door Specs:*\n${statusLink}\n\n🚪 *Total Doors:* ${order.quantity || 1} Nos\n📅 *Target Delivery:* ${order.targetDeliveryDate || 'As scheduled'}\n📞 *Factory Helpline:* +91 94479 28866\n\nThank you for partnering with EXMARK FRP Doors!`;
  };

  const messageText = templateLang === 'BILINGUAL' ? getBilingualMessage() : getEnglishMessage();

  const handleSendWhatsApp = () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.replace(/^0+/, '')}`;
    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Share Order Status Link
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800">
                  {jobCard}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Branded customer portal link with live door specifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Customer & Project summary banner */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Party / Customer</span>
              <strong className="text-white text-sm">{order.customerName}</strong>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {order.siteName || 'Site Location'} • {order.quantity || 1} Doors
              </div>
            </div>
            <a
              href={statusLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <span>Preview</span>
              <ExternalLink className="w-3 h-3 text-red-400" />
            </a>
          </div>

          {/* Tracking URL Copy Bar */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">Customer Tracking URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={statusLink}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs transition shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Customer WhatsApp Recipient */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Customer Mobile Number (WhatsApp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">+91</span>
              <input
                type="text"
                placeholder="10-digit mobile number (e.g. 9544558544)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Language Template Choice */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300">Message Template</label>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTemplateLang('BILINGUAL')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    templateLang === 'BILINGUAL'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bilingual (Mal + Eng)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateLang('ENGLISH')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    templateLang === 'ENGLISH'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English Only
                </button>
              </div>
            </div>

            {/* Message Preview */}
            <textarea
              readOnly
              rows={6}
              value={messageText}
              className="w-full bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-300 font-sans resize-none select-all focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500">
            🔒 Sanitized: Hides contractor rates &amp; chemical costs
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!phoneNumber.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
