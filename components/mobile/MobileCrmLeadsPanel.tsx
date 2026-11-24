'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Phone,
  MessageCircle,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  Send,
  X,
  UserPlus,
  User,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import { MobileCustomerModal } from './MobileCustomerModal';

interface MobileLeadFollowUp {
  id: string;
  followUpDate: string;
  type: 'CALL' | 'VISIT' | 'EMAIL' | 'WHATSAPP';
  notes: string;
  createdAt: string;
}

interface MobileLead {
  id: string;
  leadCode?: string;
  title: string;
  client?: string;
  contactPerson?: string;
  phone: string;
  district: string;
  stage: string;
  doors?: string;
  doorCount?: number;
  value?: number | null;
  estimatedValue?: number | null;
  notes?: string;
  followUps?: MobileLeadFollowUp[];
  createdAt?: string;
}

const STAGE_OPTIONS = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'Inquiries' },
  { key: 'MEASUREMENT_SCHEDULED', label: 'Measurement' },
  { key: 'QUOTE_SENT', label: 'Quotation' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
];

export function MobileCrmLeadsPanel({ staffName }: { staffName: string }) {
  const [leads, setLeads] = useState<MobileLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  // Quick New Lead drawer
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newClient, setNewClient] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newDistrict, setNewDistrict] = useState<string>('Malappuram');
  const [newDoorCount, setNewDoorCount] = useState<string>('10');
  const [newNotes, setNewNotes] = useState<string>('');
  const [savingLead, setSavingLead] = useState<boolean>(false);

  // Follow-up modal state
  const [activeLead, setActiveLead] = useState<MobileLead | null>(null);
  const [followUpType, setFollowUpType] = useState<'CALL' | 'VISIT' | 'WHATSAPP'>('CALL');
  const [followUpDate, setFollowUpDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [savingFollowUp, setSavingFollowUp] = useState<boolean>(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/crm/leads');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setLeads(json.data);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== 'ALL' && l.stage !== stageFilter) return false;
      if (!q) return true;
      return [l.title, l.client, l.contactPerson, l.phone, l.district, l.leadCode]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [leads, search, stageFilter]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newClient.trim()) return;
    setSavingLead(true);
    try {
      const res = await apiFetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim() || `${newClient.trim()} Project`,
          client: newClient.trim() || newTitle.trim(),
          contactPerson: newClient.trim() || newTitle.trim(),
          phone: newPhone.trim(),
          district: newDistrict,
          stage: 'NEW',
          doorCount: Math.max(1, parseInt(newDoorCount, 10) || 1),
          doors: `${Math.max(1, parseInt(newDoorCount, 10) || 1)} FRP Doors`,
          notes: newNotes.trim() || `Logged on Android by ${staffName}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save lead');
      setShowAddForm(false);
      setNewTitle('');
      setNewClient('');
      setNewPhone('');
      setNewNotes('');
      await loadLeads();
      showToast('✓ New lead synced to Desktop ERP!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSavingLead(false);
    }
  };

  const handleStageChange = async (leadId: string, nextStage: string) => {
    try {
      const res = await apiFetch(`/api/crm/leads/${encodeURIComponent(leadId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l)));
        showToast('✓ Lead stage updated & synced!');
      }
    } catch {
      // ignore
    }
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !followUpNotes.trim()) return;
    setSavingFollowUp(true);
    try {
      const res = await apiFetch(`/api/crm/leads/${encodeURIComponent(activeLead.id)}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: followUpType,
          followUpDate,
          notes: `${followUpNotes.trim()} — (${staffName})`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to log follow-up');

      setFollowUpNotes('');
      await loadLeads();
      const updated = json.data as MobileLeadFollowUp;
      setActiveLead((prev) =>
        prev ? { ...prev, followUps: [...(prev.followUps || []), updated] } : null
      );
      showToast('✓ Customer follow-up logged to CRM!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to log follow-up');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const cleanDigits = (phone: string) => {
    const d = (phone || '').replace(/\D/g, '');
    if (d.length === 10) return `91${d}`;
    return d;
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Header Bar */}
      <div className="bg-[#0f172a] border border-blue-500/40 rounded-xl p-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black text-white">Live CRM Leads &amp; Follow-Ups</div>
          <div className="text-[10px] text-slate-400">
            {leads.length} Total Leads Synced • Executive: <strong className="text-blue-300">{staffName}</strong>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCustomerModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow"
            title="Register Master Customer into ERP"
          >
            <User className="w-3.5 h-3.5" />
            <span>+ Customer</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Lead</span>
          </button>
          <button
            type="button"
            onClick={loadLeads}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Quick New Field Lead Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLead}
          className="bg-[#0f172a] border border-blue-500/50 rounded-xl p-3 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-black text-blue-300 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Quick Field Lead Entry
            </span>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Customer / Party Name *"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
          />
          <input
            type="text"
            placeholder="Project / Site Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="tel"
              placeholder="Mobile Number *"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
            <input
              type="text"
              placeholder="District"
              value={newDistrict}
              onChange={(e) => setNewDistrict(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min="1"
              placeholder="Doors"
              value={newDoorCount}
              onChange={(e) => setNewDoorCount(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
            <input
              type="text"
              placeholder="Remark / Requirement"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <button
            type="submit"
            disabled={savingLead}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-black"
          >
            {savingLead ? 'Saving...' : 'Save Lead to CRM'}
          </button>
        </form>
      )}

      {/* Search + Stage Pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, mobile, district..."
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10.5px]">
          {STAGE_OPTIONS.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStageFilter(st.key)}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${
                stageFilter === st.key
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-[#0f172a] text-slate-300 border-slate-700'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="p-6 text-center bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-slate-400">
          {loading ? 'Syncing leads from ERP...' : 'No leads match this filter.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLeads.slice(0, 60).map((lead) => {
            const digits = cleanDigits(lead.phone);
            const fuCount = lead.followUps?.length || 0;
            return (
              <div
                key={lead.id}
                className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-white truncate">
                      {lead.client || lead.contactPerson || lead.title}
                    </div>
                    <div className="text-[10.5px] text-slate-400 truncate">{lead.title}</div>
                    <div className="text-[10px] text-cyan-300 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {lead.district}
                      </span>
                      <span>• {lead.doorCount || 1} Doors</span>
                      {fuCount > 0 && <span className="text-amber-300">• {fuCount} Follow-ups</span>}
                    </div>
                  </div>
                  <select
                    value={lead.stage}
                    onChange={(e) => handleStageChange(lead.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] text-emerald-300 font-bold"
                  >
                    <option value="NEW">Inquiry</option>
                    <option value="MEASUREMENT_SCHEDULED">Measure</option>
                    <option value="QUOTE_SENT">Quote</option>
                    <option value="NEGOTIATION">Negotiate</option>
                    <option value="WON">Won</option>
                  </select>
                </div>

                {/* 1-Tap Actions: Call, WhatsApp, Log Follow-Up */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80">
                  <a
                    href={lead.phone ? `tel:${lead.phone}` : '#'}
                    className="py-1.5 rounded-lg bg-slate-800 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  <a
                    href={
                      digits
                        ? `https://wa.me/${digits}?text=${encodeURIComponent(
                            `Hello ${lead.client || lead.contactPerson || ''}, greeting from EXMARK FRP Doors regarding your door requirement.`
                          )}`
                        : '#'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 rounded-lg bg-emerald-700/80 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLead(lead);
                      setFollowUpNotes('');
                    }}
                    className="py-1.5 rounded-lg bg-blue-600/80 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" /> Follow-Up
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-Up Drawer Modal */}
      {activeLead && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-2">
          <div className="w-full max-w-md bg-[#0B132B] border border-blue-500/50 rounded-2xl p-4 space-y-3 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <div className="font-black text-white text-sm">
                  {activeLead.client || activeLead.title}
                </div>
                <div className="text-[10px] text-slate-400">{activeLead.phone} • {activeLead.district}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="VISIT">Site Visit</option>
                </select>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <textarea
                rows={3}
                required
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Customer discussion, next callback date, quotation feedback..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
              <button
                type="submit"
                disabled={savingFollowUp}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{savingFollowUp ? 'Saving...' : 'Log Customer Follow-Up'}</span>
              </button>
            </form>

            {activeLead.followUps && activeLead.followUps.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Follow-Up History ({activeLead.followUps.length})
                </div>
                {activeLead.followUps.slice().reverse().map((fu) => (
                  <div key={fu.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex justify-between text-[10px] text-cyan-300 font-bold">
                      <span>{fu.type}</span>
                      <span>{fu.followUpDate}</span>
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5">{fu.notes}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Customer Creation Modal */}
      <MobileCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerCreated={(c) => {
          showToast(`✓ Master customer "${c.name}" registered & synced to Desktop ERP!`);
        }}
      />
    </div>
  );
}
