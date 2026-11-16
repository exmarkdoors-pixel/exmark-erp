'use client';

import React, { useState } from 'react';
import { X, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';
import StoreRequisitionHub from '../engineering/StoreRequisitionHub';

interface StageBoqModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  stageType?: 'MANUFACTURING' | 'PAINTING';
}

export function StageBoqModal({ isOpen, onClose, orderId }: StageBoqModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncRecord = async () => {
    if (!orderId) return;
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/boq/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSyncNotice(`Synced ${json.data.boqNumber} (Rev ${json.data.revisionNumber}) cleanly.`);
        setTimeout(() => setSyncNotice(null), 4000);
      }
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#0B132B] border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-black text-white">
                Unified Auto-BOQ, Extra Issue Items &amp; Store Slip
              </h2>
              <p className="text-[11px] text-slate-400">
                Single source of truth synced between Production Floor and Store Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncNotice && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {syncNotice}
              </span>
            )}
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncRecord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/50 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Accounting Snapshot'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <StoreRequisitionHub initialOrderId={orderId} embeddedModalMode />
        </div>
      </div>
    </div>
  );
}
