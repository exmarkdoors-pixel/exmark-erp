'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Package,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles,
  UserCheck,
  PenTool,
  Trash2,
  ShieldCheck,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  BoqDoorInput,
  BoqMaterialRatesConfig,
  calculateDoorBatchBoq,
  DEFAULT_BOQ_MATERIAL_RATES,
  mergeBoqMaterialRates,
} from '@/lib/utils/boqFormulaEngine';
import { CustomFrameProfile, DEFAULT_FRAME_PROFILES } from '@/lib/utils/frameDefaults';
import type {
  BoqIssueShift,
  BoqIssueVoucherRecord,
  BoqMaterialGroupFilter,
} from '@/lib/services/boqIssueService';

interface MobileOrderDoor extends BoqDoorInput {
  id: string;
  doorId: string;
  doorNumber: string;
  materialIssued?: boolean;
  materialIssueBatchId?: string;
}

interface MobileProdOrder {
  id: string;
  orderNumber: string;
  jobCardNumber: string;
  customerName: string;
  doors: MobileOrderDoor[];
  boqIssuedAt?: string | null;
}

interface MobileStoreBoqPanelProps {
  staffName: string;
  staffRole: string;
}

export function MobileStoreBoqPanel({ staffName }: MobileStoreBoqPanelProps) {
  const [subTab, setSubTab] = useState<'ISSUE' | 'LOG'>('ISSUE');
  const [issueMode, setIssueMode] = useState<'CONSOLIDATED' | 'SINGLE'>('CONSOLIDATED');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<MobileProdOrder[]>([]);
  const [framesCatalog, setFramesCatalog] = useState<CustomFrameProfile[]>(DEFAULT_FRAME_PROFILES);
  const [ratesConfig, setRatesConfig] = useState<BoqMaterialRatesConfig>(DEFAULT_BOQ_MATERIAL_RATES);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string }>>([]);
  const [todayVouchers, setTodayVouchers] = useState<BoqIssueVoucherRecord[]>([]);

  // Selection states
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [doorKeysByOrder, setDoorKeysByOrder] = useState<Record<string, string[]>>({});
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [singleOrderId, setSingleOrderId] = useState<string>('');
  const [materialGroup, setMaterialGroup] = useState<BoqMaterialGroupFilter>('ALL');

  // Handover proof states
  const [gangName, setGangName] = useState<string>('');
  const [shift, setShift] = useState<BoqIssueShift>('MORNING');
  const [receiverName, setReceiverName] = useState<string>('');
  const [hasSigned, setHasSigned] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Signature canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  const getDoorKey = (d: MobileOrderDoor, idx = 0): string =>
    d.id || d.doorId || d.doorNumber || `d-${idx}`;

  const loadLiveStoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, ratesRes, framesRes, contRes, vouchersRes] = await Promise.all([
        apiFetch('/api/production').then((r) => r.json()).catch(() => null),
        apiFetch('/api/boq/material-rates').then((r) => r.json()).catch(() => null),
        apiFetch('/api/settings/frames').then((r) => r.json()).catch(() => null),
        apiFetch('/api/contractors').then((r) => r.json()).catch(() => null),
        apiFetch('/api/boq/issue').then((r) => r.json()).catch(() => null),
      ]);

      if (prodRes?.success && Array.isArray(prodRes.data)) {
        const mapped: MobileProdOrder[] = prodRes.data.map((p: any) => {
          const rawDoors = Array.isArray(p.doors) ? p.doors : [];
          const doors: MobileOrderDoor[] = rawDoors.map((d: any, idx: number) => ({
            id: d.id || `dr-${idx}`,
            doorId: d.doorId || `EXM-DR-${idx + 1}`,
            doorNumber: d.doorNumber || `D-${idx + 1}`,
            widthCm:
              d.rawWidthTopCm && d.rawWidthTopCm > 0
                ? d.rawWidthTopCm
                : d.finishedWidthMm && d.finishedWidthMm > 0
                ? d.finishedWidthMm / 10
                : 80,
            heightCm:
              d.rawHeightCm && d.rawHeightCm > 0
                ? d.rawHeightCm
                : d.finishedHeightMm && d.finishedHeightMm > 0
                ? d.finishedHeightMm / 10
                : 210,
            frameTypeId: d.frameTypeId || 'FRM-REGULAR',
            frameTypeName: d.frameTypeName || 'Regular Frame',
            finishColor: d.finishColor || 'Natural Teak EXGC-510',
            lockId: d.lockId,
            lockType: d.lockType || 'Baby Latch Black',
            handing: d.handing || 'RH',
            quantity: 1,
            materialIssued: Boolean(d.materialIssued),
            materialIssueBatchId: d.materialIssueBatchId,
          }));
          return {
            id: p.id,
            orderNumber: p.salesOrderId || p.prodOrderNumber || p.id,
            jobCardNumber: p.jobCardNumber || p.prodOrderNumber,
            customerName: p.customerName || 'Party Order',
            doors,
            boqIssuedAt: p.boqIssuedAt || null,
          };
        });
        setOrders(mapped);

        const pendingList = mapped.filter((o) => o.doors.some((d) => !d.materialIssued));
        if (pendingList.length > 0 && !singleOrderId) {
          setSingleOrderId(pendingList[0].id);
        }
      }

      if (ratesRes?.success && ratesRes.data) {
        const merged = mergeBoqMaterialRates(ratesRes.data);
        if (ratesRes.data.pigmentRatesByColour) {
          merged.pigmentRatesByColour = ratesRes.data.pigmentRatesByColour;
        }
        setRatesConfig(merged);
      }
      if (framesRes?.success && Array.isArray(framesRes.data) && framesRes.data.length > 0) {
        setFramesCatalog(framesRes.data);
      }
      if (contRes?.success && Array.isArray(contRes.data)) {
        const list = contRes.data.map((c: any) => ({ id: c.id, name: c.name }));
        setContractors(list);
        if (list.length > 0 && !gangName) {
          setGangName(list[0].name);
        }
      }
      if (vouchersRes?.success && Array.isArray(vouchersRes.data)) {
        setTodayVouchers(vouchersRes.data.slice(0, 25));
      }
    } finally {
      setLoading(false);
    }
  }, [gangName, singleOrderId]);

  useEffect(() => {
    loadLiveStoreData();
  }, [loadLiveStoreData]);

  // Only pending / balance orders are selectable for issuing!
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.doors.some((d) => !d.materialIssued)),
    [orders]
  );

  const getSelectedPendingDoorsForOrder = useCallback(
    (ord: MobileProdOrder): MobileOrderDoor[] => {
      const pending = ord.doors.filter((d) => !d.materialIssued);
      if (pending.length === 0) return [];
      const explicit = doorKeysByOrder[ord.id];
      if (Array.isArray(explicit)) {
        const set = new Set(explicit);
        return pending.filter((d, i) => set.has(getDoorKey(d, i)));
      }
      return pending;
    },
    [doorKeysByOrder]
  );

  const toggleOrderInBatch = (ord: MobileProdOrder) => {
    const pending = ord.doors.filter((d) => !d.materialIssued);
    if (pending.length === 0) return;
    setSelectedOrderIds((prev) => {
      if (prev.includes(ord.id)) return prev.filter((id) => id !== ord.id);
      setDoorKeysByOrder((m) => ({
        ...m,
        [ord.id]: m[ord.id]?.length ? m[ord.id] : pending.map((d, i) => getDoorKey(d, i)),
      }));
      return [...prev, ord.id];
    });
  };

  const stepOrderDoors = (ord: MobileProdOrder, nextCount: number) => {
    const pending = ord.doors.filter((d) => !d.materialIssued);
    const clamped = Math.max(0, Math.min(pending.length, nextCount));
    const keys = pending.slice(0, clamped).map((d, i) => getDoorKey(d, i));
    setDoorKeysByOrder((prev) => ({ ...prev, [ord.id]: keys }));
    if (issueMode === 'CONSOLIDATED') {
      if (clamped > 0 && !selectedOrderIds.includes(ord.id)) {
        setSelectedOrderIds((prev) => [...prev, ord.id]);
      } else if (clamped === 0) {
        setSelectedOrderIds((prev) => prev.filter((id) => id !== ord.id));
      }
    }
  };

  const toggleDoorKey = (ord: MobileProdOrder, doorKey: string) => {
    const target = ord.doors.find((d, i) => getDoorKey(d, i) === doorKey);
    if (!target || target.materialIssued) return; // HARD LOCK
    const current = getSelectedPendingDoorsForOrder(ord).map((d, i) => getDoorKey(d, i));
    const next = current.includes(doorKey)
      ? current.filter((k) => k !== doorKey)
      : [...current, doorKey];
    setDoorKeysByOrder((prev) => ({ ...prev, [ord.id]: next }));
    if (issueMode === 'CONSOLIDATED') {
      if (next.length > 0 && !selectedOrderIds.includes(ord.id)) {
        setSelectedOrderIds((prev) => [...prev, ord.id]);
      } else if (next.length === 0) {
        setSelectedOrderIds((prev) => prev.filter((id) => id !== ord.id));
      }
    }
  };

  const activeTargetOrders = useMemo(() => {
    if (issueMode === 'SINGLE') {
      const found = pendingOrders.find((o) => o.id === singleOrderId) || pendingOrders[0];
      return found ? [found] : [];
    }
    return pendingOrders.filter((o) => selectedOrderIds.includes(o.id));
  }, [issueMode, pendingOrders, singleOrderId, selectedOrderIds]);

  const activeDoors = useMemo(
    () => activeTargetOrders.flatMap((o) => getSelectedPendingDoorsForOrder(o)),
    [activeTargetOrders, getSelectedPendingDoorsForOrder]
  );

  // Read-only live formula preview (server will independently recalculate & enforce the exact same formula!)
  const previewBoq = useMemo(
    () => calculateDoorBatchBoq(activeDoors, framesCatalog, ratesConfig),
    [activeDoors, framesCatalog, ratesConfig]
  );

  const previewValue = useMemo(() => {
    const incChem = materialGroup === 'ALL' || materialGroup === 'CHEMICALS';
    const incWood = materialGroup === 'ALL' || materialGroup === 'WOOD_FOAM';
    const incHard = materialGroup === 'ALL' || materialGroup === 'HARDWARE';
    let total = 0;
    if (incChem) total += Math.round(previewBoq.totalChemicalCost);
    if (incWood) total += Math.round(previewBoq.totalWoodCost + previewBoq.foamCost);
    if (incHard) total += Math.round(previewBoq.totalLockBoxCost);
    return total;
  }, [previewBoq, materialGroup]);

  // Signature Pad Drawing Handlers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    isDrawingRef.current = true;
    setHasSigned(true);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSigned(false);
  };

  const handleConfirmImmutableIssue = async () => {
    if (!isOnline) {
      setNotice({
        type: 'error',
        text: 'Offline: Connect to Factory Wi-Fi to issue BOQ (prevents duplicate issues).',
      });
      return;
    }
    if (activeDoors.length === 0) {
      setNotice({ type: 'error', text: 'Select at least 1 pending door first.' });
      return;
    }
    const cleanGang = gangName.trim();
    if (!cleanGang) {
      setNotice({ type: 'error', text: 'Select or enter the receiving Floor Gang / Team.' });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
    try {
      const signatureDataUrl =
        hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;

      let payload: Record<string, unknown>;
      if (issueMode === 'CONSOLIDATED') {
        const entries = activeTargetOrders
          .map((ord) => {
            const chosen = getSelectedPendingDoorsForOrder(ord);
            return {
              prodOrderId: ord.id,
              orderNumber: ord.orderNumber,
              jobCardNumber: ord.jobCardNumber,
              customerName: ord.customerName,
              doorIds: chosen.map((d, i) => getDoorKey(d, i)),
              doorNumbers: chosen.map((d) => d.doorNumber),
            };
          })
          .filter((e) => e.doorIds.length > 0);

        payload = {
          mode: 'CONSOLIDATED_BATCH',
          entries,
          formulaLocked: true,
          source: 'ANDROID_APP',
          materialGroup,
          shift,
          gangName: cleanGang,
          receiverName: receiverName.trim() || cleanGang,
          receiverSignatureDataUrl: signatureDataUrl,
        };
      } else {
        const ord = activeTargetOrders[0];
        const chosen = getSelectedPendingDoorsForOrder(ord);
        payload = {
          prodOrderId: ord.id,
          orderNumber: ord.orderNumber,
          jobCardNumber: ord.jobCardNumber,
          customerName: ord.customerName,
          doorIds: chosen.map((d, i) => getDoorKey(d, i)),
          doorNumbers: chosen.map((d) => d.doorNumber),
          formulaLocked: true,
          source: 'ANDROID_APP',
          materialGroup,
          shift,
          gangName: cleanGang,
          receiverName: receiverName.trim() || cleanGang,
          receiverSignatureDataUrl: signatureDataUrl,
        };
      }

      const res = await apiFetch('/api/boq/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Issue blocked (HTTP ${res.status})`);
      }

      setNotice({
        type: 'success',
        text: json.message || 'BOQ issued & permanently locked on Factory ERP!',
      });
      setSelectedOrderIds([]);
      setDoorKeysByOrder({});
      setReceiverName('');
      clearSignature();
      await loadLiveStoreData();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to issue BOQ',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Live Security & Connection Strip */}
      <div className="bg-[#0f172a] border border-orange-500/40 rounded-xl p-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>Store BOQ Issue (Zero-Edit Locked)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Staff: <strong className="text-slate-200">{staffName}</strong> • Server Formula Locked
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
              isOnline
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Live ERP' : 'Offline Locked'}
          </span>
          <button
            type="button"
            onClick={loadLiveStoreData}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Sync with Factory ERP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setSubTab('ISSUE')}
          className={`py-2 rounded-xl font-black flex items-center justify-center gap-1.5 border transition ${
            subTab === 'ISSUE'
              ? 'bg-orange-600 text-white border-orange-400 shadow'
              : 'bg-[#0f172a] text-slate-300 border-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Issue BOQ ({pendingOrders.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('LOG')}
          className={`py-2 rounded-xl font-black flex items-center justify-center gap-1.5 border transition ${
            subTab === 'LOG'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow'
              : 'bg-[#0f172a] text-slate-300 border-slate-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Issued Log ({todayVouchers.length})</span>
        </button>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {subTab === 'ISSUE' ? (
        <div className="space-y-3">
          {/* Consolidated vs Single Mode */}
          <div className="flex gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setIssueMode('CONSOLIDATED')}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                issueMode === 'CONSOLIDATED'
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Party Batch</span>
            </button>
            <button
              type="button"
              onClick={() => setIssueMode('SINGLE')}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                issueMode === 'SINGLE'
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Single Order</span>
            </button>
          </div>

          {/* Pending / Balance Parties List */}
          {pendingOrders.length === 0 ? (
            <div className="p-6 text-center bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-emerald-300 font-bold">
              ✓ All active production orders have BOQ issued! Zero pending doors.
            </div>
          ) : issueMode === 'SINGLE' ? (
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 space-y-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">
                Select Pending Job Card
              </label>
              <select
                value={singleOrderId}
                onChange={(e) => setSingleOrderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-bold"
              >
                {pendingOrders.map((o) => {
                  const pend = o.doors.filter((d) => !d.materialIssued).length;
                  const iss = o.doors.length - pend;
                  return (
                    <option key={o.id} value={o.id}>
                      {iss > 0 ? `[BAL ${pend}/${o.doors.length}]` : `[PENDING ${pend}]`} {o.jobCardNumber} — {o.customerName}
                    </option>
                  );
                })}
              </select>

              {activeTargetOrders[0] && (() => {
                const ord = activeTargetOrders[0];
                const pending = ord.doors.filter((d) => !d.materialIssued);
                const chosen = getSelectedPendingDoorsForOrder(ord);
                const chosenSet = new Set(chosen.map((d, i) => getDoorKey(d, i)));
                return (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">
                        Doors Today: {chosen.length} / {pending.length} Pending
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => stepOrderDoors(ord, chosen.length - 1)}
                          className="w-7 h-7 rounded bg-slate-800 text-white font-black"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => stepOrderDoors(ord, chosen.length + 1)}
                          className="w-7 h-7 rounded bg-slate-800 text-white font-black"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => stepOrderDoors(ord, pending.length)}
                          className="px-2 h-7 rounded bg-emerald-700 text-white text-[10px] font-bold"
                        >
                          All {pending.length}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {ord.doors.map((door, idx) => {
                        const dKey = getDoorKey(door, idx);
                        const locked = Boolean(door.materialIssued);
                        const checked = !locked && chosenSet.has(dKey);
                        return (
                          <button
                            key={dKey}
                            type="button"
                            disabled={locked}
                            onClick={() => toggleDoorKey(ord, dKey)}
                            className={`p-2 rounded-lg border text-left text-[11px] flex items-center justify-between ${
                              locked
                                ? 'bg-emerald-950/30 border-emerald-800/50 text-slate-400 opacity-70'
                                : checked
                                ? 'bg-amber-950/60 border-amber-500 text-white font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="truncate">
                              {door.doorNumber} ({door.widthCm}×{door.heightCm})
                            </span>
                            <span>{locked ? '🔒' : checked ? '✓' : '○'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-2">
              {pendingOrders.map((ord) => {
                const isChecked = selectedOrderIds.includes(ord.id);
                const pending = ord.doors.filter((d) => !d.materialIssued);
                const issuedCount = ord.doors.length - pending.length;
                const chosen = isChecked ? getSelectedPendingDoorsForOrder(ord) : [];
                const chosenSet = new Set(chosen.map((d, i) => getDoorKey(d, i)));
                const isExpanded = Boolean(expandedOrderIds[ord.id]);
                const balAfter = Math.max(0, pending.length - chosen.length);

                return (
                  <div
                    key={ord.id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      isChecked
                        ? 'bg-emerald-950/30 border-emerald-500/70'
                        : 'bg-[#0f172a] border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOrderInBatch(ord)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-600"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">
                            {ord.customerName.split('(')[0].trim()}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {ord.jobCardNumber} • {ord.doors.length} Total
                          </div>
                        </div>
                      </label>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-black shrink-0 ${
                          issuedCount > 0
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {issuedCount > 0 ? `${pending.length} Bal (${issuedCount}/${ord.doors.length})` : `${pending.length} Pending`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Today:</span>
                        <button
                          type="button"
                          onClick={() => stepOrderDoors(ord, chosen.length - 1)}
                          disabled={chosen.length <= 0}
                          className="w-7 h-7 rounded bg-slate-800 text-white font-black disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="font-mono font-black text-emerald-300 min-w-[40px] text-center">
                          {chosen.length}/{pending.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => stepOrderDoors(ord, chosen.length + 1)}
                          disabled={chosen.length >= pending.length}
                          className="w-7 h-7 rounded bg-slate-800 text-white font-black disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isChecked && balAfter > 0 && (
                          <span className="text-[10px] font-bold text-amber-300">Bal: {balAfter}</span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderIds((p) => ({ ...p, [ord.id]: !p[ord.id] }))
                          }
                          className="px-2 py-1 rounded bg-slate-800 text-cyan-300 text-[10px] font-bold flex items-center gap-0.5"
                        >
                          <span>Doors</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800/80">
                        {ord.doors.map((door, idx) => {
                          const dKey = getDoorKey(door, idx);
                          const locked = Boolean(door.materialIssued);
                          const checked = !locked && isChecked && chosenSet.has(dKey);
                          return (
                            <button
                              key={dKey}
                              type="button"
                              disabled={locked}
                              onClick={() => toggleDoorKey(ord, dKey)}
                              className={`px-2 py-1.5 rounded border text-[10px] flex items-center justify-between ${
                                locked
                                  ? 'bg-emerald-950/30 border-emerald-800/40 text-slate-400 opacity-70'
                                  : checked
                                  ? 'bg-amber-950/60 border-amber-500 text-white font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="truncate">{door.doorNumber}</span>
                              <span>{locked ? '🔒' : checked ? '✓' : '○'}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Material Group Pills (Server-Locked Formula Quantities!) */}
          {activeDoors.length > 0 && (
            <>
              <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-300 uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Formula Materials ({activeDoors.length} Doors • {previewBoq.totalSqFt.toFixed(1)} Sq.Ft)
                  </span>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    ₹{previewValue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  {(
                    [
                      { key: 'ALL', label: 'All Items' },
                      { key: 'CHEMICALS', label: 'Chemicals' },
                      { key: 'WOOD_FOAM', label: 'Wood/Foam' },
                      { key: 'HARDWARE', label: 'Locks' },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setMaterialGroup(g.key)}
                      className={`py-1.5 rounded-lg font-bold border ${
                        materialGroup === g.key
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Read-Only Formula Numbers */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  {(materialGroup === 'ALL' || materialGroup === 'CHEMICALS') && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Resin:</span>
                        <strong className="text-emerald-300">{previewBoq.resinKg.toFixed(2)} Kg</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gelcoat:</span>
                        <strong className="text-emerald-300">{previewBoq.gelKg.toFixed(2)} Kg</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">CSM 300:</span>
                        <strong className="text-amber-300">{previewBoq.csm300Kg.toFixed(2)} Kg</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cat / Acc:</span>
                        <strong className="text-cyan-300">
                          {Math.round(previewBoq.catalystGrams)}/{Math.round(previewBoq.acceleratorGrams)}g
                        </strong>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-slate-400">Pigment Paste:</span>
                        <strong className="text-purple-300">{Math.round(previewBoq.pigmentGrams)} gm</strong>
                      </div>
                    </>
                  )}
                  {(materialGroup === 'ALL' || materialGroup === 'WOOD_FOAM') && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Wood:</span>
                        <strong className="text-amber-200">{previewBoq.totalWoodCuFt.toFixed(3)} CuFt</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Foam:</span>
                        <strong className="text-sky-300">{previewBoq.foamSheetsExact.toFixed(2)} Sh</strong>
                      </div>
                    </>
                  )}
                  {(materialGroup === 'ALL' || materialGroup === 'HARDWARE') && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-400">Lock Kit Boxes:</span>
                      <strong className="text-rose-300">{previewBoq.totalLockBoxes} Boxes</strong>
                    </div>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-400">
                  🔒 Formula locked ({ratesConfig.resinKg} kg / {previewBoq.baseDoorSqFt.toFixed(2)} sq.ft). Quantities &amp; ₹ rates are recalculated on the Factory ERP server.
                </p>
              </div>

              {/* Handover Accountability + Finger Signature */}
              <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 space-y-2.5 text-xs">
                <div className="font-black text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Floor Team Handover Proof</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      Floor Team / Gang *
                    </label>
                    {contractors.length > 0 ? (
                      <select
                        value={gangName}
                        onChange={(e) => setGangName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold text-xs"
                      >
                        {contractors.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={gangName}
                        onChange={(e) => setGangName(e.target.value)}
                        placeholder="e.g. Molding Team A"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Shift</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value as BoqIssueShift)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-200 font-bold text-xs"
                    >
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="EVENING">Evening</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Receiver Name (Collected By)
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Name of floor staff collecting materials"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  />
                </div>

                {/* On-Screen Finger Signature Box */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <PenTool className="w-3 h-3 text-cyan-400" />
                      Receiver Finger Signature (2-Second Sign)
                    </span>
                    {hasSigned && (
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-rose-400 font-bold flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={96}
                    onPointerDown={startDraw}
                    onPointerMove={moveDraw}
                    onPointerUp={endDraw}
                    onPointerCancel={endDraw}
                    className="w-full h-24 rounded-lg bg-slate-950 border border-dashed border-cyan-500/50 touch-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleConfirmImmutableIssue}
                  disabled={isSubmitting || !isOnline || activeDoors.length === 0}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Locking & Syncing to ERP...'
                      : `Confirm & Issue ${activeDoors.length} Door${activeDoors.length === 1 ? '' : 's'} (₹${previewValue.toLocaleString('en-IN')})`}
                  </span>
                </button>
                <p className="text-center text-[9.5px] text-amber-300/90 font-semibold">
                  ⚠️ Write-Once Action: Issued BOQ cannot be edited or deleted from Android.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        /* READ-ONLY ISSUED LOG (ZERO EDIT / ZERO DELETE) */
        <div className="space-y-2">
          {todayVouchers.length === 0 ? (
            <div className="p-6 text-center bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-slate-400">
              No BOQ vouchers issued yet.
            </div>
          ) : (
            todayVouchers.map((v) => (
              <div
                key={v.id}
                className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-amber-300">
                    {v.consolidatedBatchNumber || v.voucherNumber}
                  </span>
                  <span className="font-mono font-black text-emerald-400">
                    ₹{Math.round(v.totalIssuedValue).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-white">
                  {v.customerName.split('(')[0].trim()} ({v.jobCardNumber}) • {v.doorsCount} Doors
                </div>
                <div className="text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {v.issueDate} ({v.shift}) • {v.gangName}
                  </span>
                  <span className="text-emerald-400 font-bold">🔒 Locked</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
