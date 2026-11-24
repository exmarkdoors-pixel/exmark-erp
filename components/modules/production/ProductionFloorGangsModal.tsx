'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  IndianRupee,
  Wrench,
} from 'lucide-react';
import type {
  Contractor,
  ContractorRateCard,
  ContractorTrade,
  FloorGangScope,
} from '@/lib/services/contractorService';

interface ProductionFloorGangsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const FLOOR_STAGE_OPTIONS: Array<{
  stage: string;
  trade: ContractorTrade;
  defaultScope: FloorGangScope;
  label: string;
}> = [
  { stage: 'MOLDING', trade: 'MOLDING', defaultScope: 'MOLDING_ALL', label: '1. Molding & Layup Gang' },
  {
    stage: 'CUTTING_FINISHING',
    trade: 'CUTTING_GRINDING',
    defaultScope: 'DOOR_CUTTING_FINISHING',
    label: '2. Cutting & Finishing (Door / Frame 2 Parties)',
  },
  {
    stage: 'PAINT_SECTION',
    trade: 'PAINTING',
    defaultScope: 'GRAINS_PAINTING',
    label: '3. Grains & Painting (1 Party)',
  },
  { stage: 'PACKING', trade: 'CUTTING_GRINDING', defaultScope: 'PACKING_TEAM', label: '4. Packing & Dispatch Team' },
  { stage: 'INSTALLATION', trade: 'SITE_FITTING', defaultScope: 'SITE_FITTING', label: '5. Site Installation Gang' },
];

const CUTTING_PARTY_SCOPES: Array<{ scope: FloorGangScope; label: string; hint: string }> = [
  {
    scope: 'DOOR_CUTTING_FINISHING',
    label: 'Team 1: Door Cutting & Finishing',
    hint: 'Separate ₹/Door piece-rate & lock group',
  },
  {
    scope: 'FRAME_CUTTING_FINISHING',
    label: 'Team 2: Frame Cutting & Finishing',
    hint: 'Separate ₹/Frame piece-rate & lock group',
  },
];

const MOLDING_PARTY_SCOPES: Array<{ scope: FloorGangScope; label: string; hint: string }> = [
  {
    scope: 'MOLDING_TEAM_1',
    label: 'Team 1: Door Molding & Layup (Gang A)',
    hint: 'Molding Team 1 — split piece-rate supported',
  },
  {
    scope: 'MOLDING_TEAM_2',
    label: 'Team 2: Door Molding & Layup (Gang B)',
    hint: 'Molding Team 2 — split piece-rate supported',
  },
  {
    scope: 'MOLDING_ALL',
    label: 'Combined / Single Molding Gang',
    hint: 'Standard full-order door & frame molding gang',
  },
];

function getScopeBadge(gang: Contractor): { text: string; cls: string } | null {
  if (gang.teamScope === 'MOLDING_TEAM_1') {
    return { text: 'Molding Team 1 (Gang A)', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
  }
  if (gang.teamScope === 'MOLDING_TEAM_2') {
    return { text: 'Molding Team 2 (Gang B)', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
  }
  if (gang.teamScope === 'MOLDING_ALL' || (gang.primaryStage === 'MOLDING' && !gang.teamScope)) {
    return { text: 'Molding (Full Gang)', cls: 'bg-blue-500/10 text-blue-300/80 border-blue-500/20' };
  }
  if (gang.teamScope === 'DOOR_CUTTING_FINISHING') {
    return { text: 'Party 1: Door Cutting & Finishing', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
  }
  if (gang.teamScope === 'FRAME_CUTTING_FINISHING') {
    return { text: 'Party 2: Frame Cutting & Finishing', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  }
  if (gang.teamScope === 'GRAINS_PAINTING' || gang.primaryStage === 'PAINT_SECTION' || gang.primaryStage === 'FINISHING_GRAINS') {
    return { text: 'Grains & Painting (1 Party)', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
  }
  if (gang.primaryStage === 'CUTTING_FINISHING') {
    return { text: 'Needs Door / Frame Tag', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  }
  return null;
}

export function ProductionFloorGangsModal({
  isOpen,
  onClose,
  onUpdated,
}: ProductionFloorGangsModalProps) {
  const [activeTab, setActiveTab] = useState<'GANGS' | 'RATES'>('GANGS');
  const [gangs, setGangs] = useState<Contractor[]>([]);
  const [rateCard, setRateCard] = useState<ContractorRateCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Add new gang form
  const [name, setName] = useState('');
  const [gangLeader, setGangLeader] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryStage, setPrimaryStage] = useState('MOLDING');
  const [teamScope, setTeamScope] = useState<FloorGangScope>('MOLDING_ALL');
  const [membersText, setMembersText] = useState('');
  const [upiId, setUpiId] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [gRes, rRes] = await Promise.all([
        fetch('/api/contractors'),
        fetch('/api/contractors/rates'),
      ]);
      const gJson = await gRes.json();
      const rJson = await rRes.json();
      if (gJson.success && Array.isArray(gJson.data)) setGangs(gJson.data);
      if (rJson.success && rJson.data) setRateCard(rJson.data);
    } catch {
      // ignore network flicker
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const notify = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddGang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      notify('err', 'Gang name and phone number are required.');
      return;
    }
    const stageMeta = FLOOR_STAGE_OPTIONS.find((s) => s.stage === primaryStage) || FLOOR_STAGE_OPTIONS[0];
    const resolvedScope: FloorGangScope =
      primaryStage === 'CUTTING_FINISHING'
        ? teamScope === 'FRAME_CUTTING_FINISHING'
          ? 'FRAME_CUTTING_FINISHING'
          : 'DOOR_CUTTING_FINISHING'
        : primaryStage === 'MOLDING'
          ? (teamScope === 'MOLDING_TEAM_1' || teamScope === 'MOLDING_TEAM_2' || teamScope === 'MOLDING_ALL')
            ? teamScope
            : 'MOLDING_ALL'
        : stageMeta.defaultScope;
    const memberNames = membersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          trade: stageMeta.trade,
          isInHouseGang: true,
          gangLeader: gangLeader.trim() || name.trim(),
          primaryStage,
          teamScope: resolvedScope,
          memberNames,
          upiId: upiId.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify('err', json.error || 'Could not create Floor Gang.');
        return;
      }
      setName('');
      setGangLeader('');
      setPhone('');
      setMembersText('');
      setUpiId('');
      notify('ok', `Floor Gang "${json.data.name}" added.`);
      await loadData();
      onUpdated?.();
    } catch {
      notify('err', 'Failed to save Floor Gang.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTeamScope = async (gang: Contractor, nextScope: FloorGangScope) => {
    try {
      const res = await fetch(`/api/contractors/${gang.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamScope: nextScope }),
      });
      const json = await res.json();
      if (json.success) {
        notify('ok', `${gang.name} tagged as ${nextScope === 'DOOR_CUTTING_FINISHING' ? 'Door Cutting & Finishing' : 'Frame Cutting & Finishing'}.`);
        await loadData();
        onUpdated?.();
      } else {
        notify('err', json.error || 'Could not update party tag.');
      }
    } catch {
      notify('err', 'Failed to update party tag.');
    }
  };

  const handleToggleGangStatus = async (gang: Contractor) => {
    const nextStatus = gang.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/contractors/${gang.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        notify('ok', `${gang.name} marked ${nextStatus}.`);
        await loadData();
        onUpdated?.();
      }
    } catch {
      notify('err', 'Failed to update gang status.');
    }
  };

  const handleDeleteGang = async (gang: Contractor) => {
    try {
      const res = await fetch(`/api/contractors/${gang.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        notify('ok', `Removed gang "${gang.name}".`);
        await loadData();
        onUpdated?.();
      } else {
        notify('err', json.error || 'Delete failed.');
      }
    } catch {
      notify('err', 'Delete failed.');
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateCard) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/contractors/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateCard),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRateCard(json.data);
        notify('ok', 'Floor Gang piece-rate card updated.');
        onUpdated?.();
      } else {
        notify('err', json.error || 'Failed to update piece-rate card.');
      }
    } catch {
      notify('err', 'Failed to update piece-rate card.');
    } finally {
      setIsSaving(false);
    }
  };

  const rateFields: Array<{ key: keyof ContractorRateCard; label: string; group: string }> = [
    { key: 'moldingDoorWithFrame', label: 'Molding: Door With Frame', group: 'Molding' },
    { key: 'moldingOnlyDoor', label: 'Molding: Only Door', group: 'Molding' },
    { key: 'moldingOnlyFrame', label: 'Molding: Only Frame', group: 'Molding' },
    { key: 'doorCutting', label: 'Party 1: Door Cutting & Finishing', group: 'Cutting & Finishing' },
    { key: 'frameCutting', label: 'Party 2: Frame Cutting & Finishing', group: 'Cutting & Finishing' },
    { key: 'doorGrainsWithPaint', label: 'Grains & Painting (Standard)', group: 'Grains & Painting' },
    { key: 'onlyClearCoat', label: 'Grains & Painting: Clear Coat', group: 'Grains & Painting' },
    { key: 'twoSidePaint', label: 'Grains & Painting: Two-Side Paint', group: 'Grains & Painting' },
    { key: 'siteFitting', label: 'Site Installation / Fitting', group: 'Site Fitting' },
  ];

  const doorCuttingCount = gangs.filter((g) => g.teamScope === 'DOOR_CUTTING_FINISHING').length;
  const frameCuttingCount = gangs.filter((g) => g.teamScope === 'FRAME_CUTTING_FINISHING').length;
  const grainsPaintCount = gangs.filter(
    (g) =>
      g.teamScope === 'GRAINS_PAINTING' ||
      g.primaryStage === 'PAINT_SECTION' ||
      g.primaryStage === 'FINISHING_GRAINS'
  ).length;
  const moldingTeam1Count = gangs.filter((g) => g.teamScope === 'MOLDING_TEAM_1').length;
  const moldingTeam2Count = gangs.filter((g) => g.teamScope === 'MOLDING_TEAM_2').length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0B132B] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                In-House Production Floor Gangs &amp; Piece Rates
              </h2>
              <p className="text-[11px] text-slate-400">
                Sub-contracted teams working inside the factory unit — per-stage Gang creation &amp; Piece-Rate ₹ Card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {toast && (
          <div
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              toast.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('GANGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GANGS'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Floor Gangs ({gangs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RATES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'RATES'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Piece-Rate Card (₹ / Door)</span>
          </button>
        </div>

        {activeTab === 'GANGS' ? (
          <div className="space-y-5">
            {/* Add Gang Form */}
            <form
              onSubmit={handleAddGang}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
            >
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Create In-House Floor Gang</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Gang Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shaji Molding Gang"
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Gang Leader</label>
                  <input
                    type="text"
                    value={gangLeader}
                    onChange={(e) => setGangLeader(e.target.value)}
                    placeholder="e.g. Shaji"
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9847..."
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Primary Floor Stage *</label>
                  <select
                    value={primaryStage}
                    onChange={(e) => {
                      const nextStage = e.target.value;
                      setPrimaryStage(nextStage);
                      const nextMeta = FLOOR_STAGE_OPTIONS.find((s) => s.stage === nextStage);
                      if (nextMeta) setTeamScope(nextMeta.defaultScope);
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  >
                    {FLOOR_STAGE_OPTIONS.map((opt) => (
                      <option key={opt.stage} value={opt.stage}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {primaryStage === 'MOLDING' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-blue-300 font-bold mb-1">
                      Door Molding Gang Role (Supports Dual Teams on Same Work Order) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {MOLDING_PARTY_SCOPES.map((party) => {
                        const selected = teamScope === party.scope;
                        return (
                          <button
                            key={party.scope}
                            type="button"
                            onClick={() => setTeamScope(party.scope)}
                            className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                              selected
                                ? 'bg-blue-500/20 border-blue-400 text-blue-200 font-bold'
                                : 'bg-[#070D1E] border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div>{party.label}</div>
                            <div className="text-[9px] text-slate-400 font-normal">{party.hint}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {primaryStage === 'CUTTING_FINISHING' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-cyan-300 font-bold mb-1">
                      Cutting &amp; Finishing Party Assignment (2 Separate Teams) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CUTTING_PARTY_SCOPES.map((party) => {
                        const selected = teamScope === party.scope;
                        return (
                          <button
                            key={party.scope}
                            type="button"
                            onClick={() => setTeamScope(party.scope)}
                            className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                              selected
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                                : 'bg-[#070D1E] border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div>{party.label}</div>
                            <div className="text-[9px] text-slate-400 font-normal">{party.hint}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {primaryStage === 'PAINT_SECTION' && (
                  <div className="sm:col-span-2 flex items-end">
                    <div className="w-full px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-200">
                      <strong>Grains &amp; Painting (1 Combined Section):</strong> Finishing Grains &amp; Painting are handled by a single combined party here.
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Workers / Members (comma sep)</label>
                  <input
                    type="text"
                    value={membersText}
                    onChange={(e) => setMembersText(e.target.value)}
                    placeholder="e.g. Unni, Riyas, Sunil"
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-1">UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="name@okicici"
                      className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : '+ Add Gang'}
                  </button>
                </div>
              </div>
            </form>

            {/* Section Party Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                <span className="text-blue-200 font-bold">Molding &rarr; Teams 1 &amp; 2</span>
                <span className="font-mono font-black text-blue-300">{moldingTeam1Count + moldingTeam2Count}</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                <span className="text-cyan-200 font-bold">Cutting &rarr; Party 1 (Door)</span>
                <span className="font-mono font-black text-cyan-300">{doorCuttingCount}</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
                <span className="text-sky-200 font-bold">Cutting &rarr; Party 2 (Frame)</span>
                <span className="font-mono font-black text-sky-300">{frameCuttingCount}</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                <span className="text-purple-200 font-bold">Grains &amp; Painting</span>
                <span className="font-mono font-black text-purple-300">{grainsPaintCount}</span>
              </div>
            </div>

            {/* Gangs Directory */}
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading floor gangs...</div>
            ) : gangs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                No production floor gangs added yet. Use the form above to register your unit gangs.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gangs.map((gang) => {
                  const scopeBadge = getScopeBadge(gang);
                  return (
                  <div
                    key={gang.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                              {gang.id}
                            </span>
                            <span className="text-sm font-black text-white">{gang.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {gang.tradeLabel} {gang.primaryStage ? `(${gang.primaryStage})` : ''} &bull; {gang.phone}
                          </div>
                          {scopeBadge && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${scopeBadge.cls}`}>
                                {scopeBadge.text}
                              </span>
                            </div>
                          )}
                          {gang.primaryStage === 'MOLDING' && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleAssignTeamScope(gang, 'MOLDING_TEAM_1')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  gang.teamScope === 'MOLDING_TEAM_1'
                                    ? 'bg-blue-600 border-blue-400 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500/50'
                                }`}
                              >
                                Tag: Team 1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignTeamScope(gang, 'MOLDING_TEAM_2')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  gang.teamScope === 'MOLDING_TEAM_2'
                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/50'
                                }`}
                              >
                                Tag: Team 2
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignTeamScope(gang, 'MOLDING_ALL')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  gang.teamScope === 'MOLDING_ALL' || !gang.teamScope
                                    ? 'bg-slate-700 border-slate-500 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                }`}
                              >
                                Tag: Full Gang
                              </button>
                            </div>
                          )}
                          {gang.primaryStage === 'CUTTING_FINISHING' && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleAssignTeamScope(gang, 'DOOR_CUTTING_FINISHING')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  gang.teamScope === 'DOOR_CUTTING_FINISHING'
                                    ? 'bg-cyan-600 border-cyan-400 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-500/50'
                                }`}
                              >
                                Tag: Door Team
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignTeamScope(gang, 'FRAME_CUTTING_FINISHING')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  gang.teamScope === 'FRAME_CUTTING_FINISHING'
                                    ? 'bg-sky-600 border-sky-400 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500/50'
                                }`}
                              >
                                Tag: Frame Team
                              </button>
                            </div>
                          )}
                          {gang.memberNames && gang.memberNames.length > 0 && (
                            <div className="text-[10px] text-slate-300 mt-1">
                              Members: <span className="text-slate-400">{gang.memberNames.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            gang.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {gang.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">
                          Doors: <strong className="text-white">{gang.totalDoorsCompleted}</strong>
                        </span>
                        <span className="text-slate-400">
                          Earned: <strong className="text-emerald-400">₹{gang.totalEarned.toLocaleString('en-IN')}</strong>
                        </span>
                        <span className="text-slate-400">
                          Due: <strong className="text-amber-300">₹{gang.balancePayable.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleGangStatus(gang)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-semibold cursor-pointer"
                        >
                          {gang.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGang(gang)}
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
                          title="Delete Floor Gang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveRates} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Piece-rate values below are automatically used when advancing orders across Production Floor columns or logging Gang piece-rate credits.
              </span>
            </div>

            {rateCard && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rateFields.map((rf) => (
                  <div
                    key={String(rf.key)}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1"
                  >
                    <span className="text-[10px] font-bold uppercase text-amber-400">{rf.group}</span>
                    <label className="block text-xs font-semibold text-white">{rf.label}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={Number(rateCard[rf.key] || 0)}
                        onChange={(e) =>
                          setRateCard({ ...rateCard, [rf.key]: Number(e.target.value) || 0 })
                        }
                        className="w-full px-2.5 py-1.5 bg-[#070D1E] border border-slate-700 rounded-lg text-xs font-mono font-bold text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Piece-Rate Card'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
