'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  Ruler,
  FileText,
  CreditCard,
  Layers,
  Truck,
  CheckCircle2,
  Copy,
  ExternalLink,
  History,
  Phone,
  Clock,
  Building2,
  Check,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateKey,
  sanitizeWhatsAppPhone,
  isValidWhatsAppPhone,
  buildWhatsAppUrl,
  WhatsAppTemplateContext,
} from '@/lib/services/whatsappService';

export interface WhatsAppLeadData {
  id: string;
  leadCode?: string;
  title: string;
  client: string;
  contactPerson?: string;
  phone: string;
  district: string;
  doors?: string;
  doorCount?: number;
  value: number;
  stage: string;
}

export interface WhatsAppLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: WhatsAppLeadData | null;
  onMessageLogged?: (leadId: string, notes: string) => void;
}

export function WhatsAppLeadModal({
  isOpen,
  onClose,
  lead,
  onMessageLogged,
}: WhatsAppLeadModalProps) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<WhatsAppTemplateKey>('inquiry_welcome');
  const [messageText, setMessageText] = useState('');
  const [autoLogToCrm, setAutoLogToCrm] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; followUpDate: string; notes: string }>>([]);
  const [customPhone, setCustomPhone] = useState('');
  const [recipientRole, setRecipientRole] = useState<'CLIENT' | 'SITE_ENGINEER' | 'FACTORY_SUPERVISOR' | 'ACCOUNTS' | 'CUSTOM'>('CLIENT');
  const [recipientLabel, setRecipientLabel] = useState('');

  // Sync state when lead or template changes
  useEffect(() => {
    if (!lead) return;

    if (recipientRole === 'CLIENT') {
      setCustomPhone(lead.phone || '');
      setRecipientLabel(lead.contactPerson || lead.client);
    }

    const ctx: WhatsAppTemplateContext = {
      leadCode: lead.leadCode,
      title: lead.title,
      client: lead.client,
      contactPerson: lead.contactPerson || lead.client,
      phone: customPhone || lead.phone,
      district: lead.district,
      doors: lead.doors,
      doorCount: lead.doorCount,
      value: lead.value,
      stage: lead.stage,
      companyName: 'EXMARK DOORS',
    };

    const template = WHATSAPP_TEMPLATES[selectedTemplateKey];
    if (template) {
      setMessageText(template.render(ctx));
    }
  }, [lead, selectedTemplateKey, recipientRole]);

  const handleSelectRecipientRole = (role: 'CLIENT' | 'SITE_ENGINEER' | 'FACTORY_SUPERVISOR' | 'ACCOUNTS' | 'CUSTOM') => {
    if (!lead) return;
    setRecipientRole(role);
    if (role === 'CLIENT') {
      setCustomPhone(lead.phone);
      setRecipientLabel(lead.contactPerson || lead.client);
      setSelectedTemplateKey('inquiry_welcome');
    } else if (role === 'SITE_ENGINEER') {
      setCustomPhone('+91 98471 22334');
      setRecipientLabel('Er. Rahul Varma (Site Engineer)');
      setSelectedTemplateKey('forward_engineer');
    } else if (role === 'FACTORY_SUPERVISOR') {
      setCustomPhone('+91 97455 66778');
      setRecipientLabel('Plant Head Sasi (Factory Floor)');
      setSelectedTemplateKey('forward_production');
    } else if (role === 'ACCOUNTS') {
      setCustomPhone('+91 98950 11223');
      setRecipientLabel('Accounts Officer Biju');
      setSelectedTemplateKey('forward_accounts');
    }
  };

  // Fetch previous WhatsApp history for this lead
  useEffect(() => {
    if (!isOpen || !lead) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/crm/leads/${lead.id}/whatsapp`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.history)) {
            setHistoryItems(json.history);
          }
        }
      } catch (e) {
        console.error('Failed to load WhatsApp history:', e);
      }
    };

    fetchHistory();
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const sanitizedPhone = sanitizeWhatsAppPhone(customPhone || lead.phone);
  const validPhone = isValidWhatsAppPhone(customPhone || lead.phone);

  const handleTemplateSelect = (key: WhatsAppTemplateKey) => {
    setSelectedTemplateKey(key);
    const ctx: WhatsAppTemplateContext = {
      leadCode: lead.leadCode,
      title: lead.title,
      client: lead.client,
      contactPerson: lead.contactPerson || lead.client,
      phone: customPhone || lead.phone,
      district: lead.district,
      doors: lead.doors,
      doorCount: lead.doorCount,
      value: lead.value,
      stage: lead.stage,
      companyName: 'EXMARK DOORS',
    };
    setMessageText(WHATSAPP_TEMPLATES[key].render(ctx));
  };

  const handleInsertTag = (tag: string) => {
    setMessageText((prev) => `${prev} ${tag}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendWhatsApp = async () => {
    if (!messageText.trim() || !sanitizedPhone) return;

    setIsSending(true);
    try {
      // 1. Post to ERP API to log the follow-up record
      if (autoLogToCrm) {
        const res = await fetch(`/api/crm/leads/${lead.id}/whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: selectedTemplateKey,
            messageText: messageText.trim(),
            autoLog: true,
            phone: customPhone || lead.phone,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.followUp) {
            setHistoryItems((prev) => [json.followUp, ...prev]);
            if (onMessageLogged) {
              onMessageLogged(lead.id, json.followUp.notes);
            }
          }
        }
      }

      // 2. Open WhatsApp Web / App
      const targetUrl = buildWhatsAppUrl(sanitizedPhone, messageText);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');

      // Keep modal open or close based on preference, here we close after brief confirmation
      setTimeout(() => {
        setIsSending(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error dispatching WhatsApp message:', err);
      // Fallback: direct browser open
      const fallbackUrl = buildWhatsAppUrl(sanitizedPhone, messageText);
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      setIsSending(false);
    }
  };

  const templateIcons: Record<WhatsAppTemplateKey, React.ReactNode> = {
    inquiry_welcome: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
    measurement_booking: <Ruler className="w-3.5 h-3.5 text-cyan-400" />,
    quote_submitted: <FileText className="w-3.5 h-3.5 text-purple-400" />,
    advance_request: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />,
    production_update: <Layers className="w-3.5 h-3.5 text-blue-400" />,
    dispatch_alert: <Truck className="w-3.5 h-3.5 text-rose-400" />,
    forward_engineer: <Ruler className="w-3.5 h-3.5 text-amber-400" />,
    forward_production: <Layers className="w-3.5 h-3.5 text-cyan-400" />,
    forward_accounts: <CreditCard className="w-3.5 h-3.5 text-purple-400" />,
    custom: <MessageSquare className="w-3.5 h-3.5 text-slate-400" />,
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-slate-800 bg-[#131d36] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <MessageSquare className="w-5 h-5 fill-emerald-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm sm:text-base">
                  WhatsApp CRM Lead Dispatcher
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Direct wa.me
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                {lead.title} &bull; <span className="text-slate-300 font-medium">{lead.client}</span> ({lead.district})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* RECIPIENT MODE & FORWARD SELECTOR BAR */}
          <div className="bg-gradient-to-r from-slate-900 via-[#101b33] to-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Forward / Dispatch To:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleSelectRecipientRole('CLIENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  recipientRole === 'CLIENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Client / Buyer</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientRole('SITE_ENGINEER')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  recipientRole === 'SITE_ENGINEER'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Site Engineer</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientRole('FACTORY_SUPERVISOR')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  recipientRole === 'FACTORY_SUPERVISOR'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Plant Supervisor</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientRole('ACCOUNTS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  recipientRole === 'ACCOUNTS'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Accounts</span>
              </button>
            </div>
          </div>

          {/* TARGET RECIPIENT & PHONE ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                Recipient Contact
              </label>
              <div className="font-bold text-white text-xs truncate">
                {recipientLabel || lead.contactPerson || lead.client}
              </div>
              <div className="text-[10px] text-slate-400">
                {recipientRole === 'CLIENT' ? lead.client : `Internal Team (${recipientRole})`}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                WhatsApp Mobile Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="+91 94470 12345"
                  className="w-full bg-[#162038] border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="text-[10px] text-slate-400 pt-0.5 flex items-center gap-1">
                <span>Sanitized:</span>
                <span className="font-mono text-emerald-400 font-semibold">{sanitizedPhone || 'None'}</span>
                {!validPhone && <span className="text-amber-400">(Verify digits)</span>}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                Project Value & Doors
              </label>
              <div className="font-extrabold text-emerald-400 text-xs">
                ₹{lead.value.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-cyan-400 truncate">{lead.doors || 'FRP / WPC Doors'}</div>
            </div>
          </div>

          {/* TEMPLATE PICKER TABS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-300 font-bold text-xs">Kerala Door Message Templates:</span>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3 h-3" />
                <span>Past WhatsApp History ({historyItems.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(WHATSAPP_TEMPLATES) as WhatsAppTemplateKey[]).map((key) => {
                const tpl = WHATSAPP_TEMPLATES[key];
                const isSelected = selectedTemplateKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTemplateSelect(key)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      {templateIcons[key]}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {tpl.category}
                      </span>
                    </div>
                    <div className="font-bold text-[11px] leading-tight truncate">{tpl.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAST WHATSAPP HISTORY (EXPANDABLE) */}
          {showHistory && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 max-h-36 overflow-y-auto">
              <div className="font-bold text-slate-300 text-[11px] flex items-center gap-1">
                <History className="w-3 h-3 text-cyan-400" />
                <span>Previous Outgoing WhatsApp Messages to this Lead:</span>
              </div>
              {historyItems.length === 0 ? (
                <div className="text-slate-500 text-[10px] italic">No previous WhatsApp dispatches logged yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {historyItems.map((item) => (
                    <div key={item.id} className="text-[10px] p-2 bg-[#12192e] rounded border border-slate-800">
                      <div className="flex justify-between text-slate-400 font-mono text-[9px]">
                        <span>{new Date(item.followUpDate).toLocaleString('en-IN')}</span>
                        <span className="text-emerald-400 font-bold">Dispatched</span>
                      </div>
                      <div className="text-slate-200 mt-0.5">{item.notes}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TWO COLUMN COMPOSER & WHATSAPP CHAT PREVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: MESSAGE COMPOSER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold text-xs">Editable Message Body:</label>
                <span className="text-[10px] text-slate-500 font-mono">{messageText.length} characters</span>
              </div>

              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-[#11192e] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs leading-relaxed focus:border-emerald-500 focus:outline-none font-sans"
                placeholder="Type your WhatsApp message..."
              />

              {/* QUICK INSERT TAGS */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold">Quick Insert:</span>
                <button
                  type="button"
                  onClick={() => handleInsertTag(`*${lead.contactPerson || lead.client}*`)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-semibold cursor-pointer"
                >
                  + Contact
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag(`*${lead.title}*`)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-semibold cursor-pointer"
                >
                  + Project
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag(`*₹${lead.value.toLocaleString('en-IN')}*`)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-semibold cursor-pointer"
                >
                  + Value
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('HDFC Bank A/C: 50200067891234, IFSC: HDFC0001234')}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-semibold cursor-pointer"
                >
                  + Bank Details
                </button>
              </div>
            </div>

            {/* RIGHT: REALISTIC WHATSAPP CHAT BUBBLE PREVIEW */}
            <div className="space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  WhatsApp Chat Bubble Preview
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">wa.me preview</span>
              </div>

              {/* WHATSAPP CHAT CONTAINER */}
              <div className="flex-1 bg-[#0b141a] rounded-xl border border-slate-800 p-3.5 flex flex-col justify-between min-h-[220px]">
                {/* WHATSAPP OUTGOING BUBBLE */}
                <div className="self-end max-w-[95%] bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none p-3 shadow-md text-xs relative space-y-1">
                  <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                    {messageText || '(Empty message)'}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696a0] pt-1">
                    <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-cyan-400 font-bold">✓✓</span>
                  </div>
                </div>

                <div className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-800/80">
                  🔒 End-to-end encrypted dispatch directly to {sanitizedPhone}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-[#131d36] flex flex-col sm:flex-row justify-between items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={autoLogToCrm}
              onChange={(e) => setAutoLogToCrm(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
            />
            <span>Automatically record in CRM Follow-up Timeline</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isSending || !sanitizedPhone}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>{isSending ? 'Launching...' : 'Send via WhatsApp'}</span>
              <ExternalLink className="w-3 h-3 text-emerald-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
