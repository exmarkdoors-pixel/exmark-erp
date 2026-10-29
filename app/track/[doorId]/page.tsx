'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  QrCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Building2,
  MapPin,
  Ruler,
  Check,
  Sparkles,
} from 'lucide-react';

interface TrackingData {
  doorId: string;
  doorNumber: string;
  model: string;
  finishColor: string;
  handing: string;
  lockType: string;
  finishedHeightMm: number;
  finishedWidthMm: number;
  finishedSizeInches: string;
  rawHeightMm: number;
  rawWidthMm: number;
  jobCardNumber: string;
  prodOrderNumber: string;
  customerName: string;
  siteName: string;
  district: string;
  doorCategory: string;
  lineAssigned: string;
  batchNumber: string;
  productionStatus: string;
  qcStatus: string;
  qcInspection?: {
    inspectedAt: string;
    inspectorName: string;
    decision: string;
    defectType?: string;
    reworkNotes?: string;
  } | null;
  stickerRemovedAt?: string | null;
  stickerRemovedBy?: string | null;
  stickerRemovalNotes?: string | null;
  lifecycle: Array<{
    stage: string;
    name: string;
    completed: boolean;
    current?: boolean;
    timestamp?: string | null;
  }>;
}

export default function DoorTrackingPage() {
  const params = useParams();
  const doorId = typeof params?.doorId === 'string' ? params.doorId : '';

  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmedBy, setConfirmedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = () => {
    if (!doorId) return;
    setIsLoading(true);
    fetch(`/api/track/${doorId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || 'Door record not found');
        }
      })
      .catch((err) => {
        setError(err.message || 'Network error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [doorId]);

  const handleConfirmStickerRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedBy.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/track/${doorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONFIRM_STICKER_REMOVAL',
          confirmedBy: confirmedBy.trim(),
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessToast('Protective QR sticker removal confirmed & registered.');
        loadData();
      } else {
        alert(json.error || 'Failed to confirm removal');
      }
    } catch {
      alert('Error updating sticker removal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Verifying Door QR Authentication...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 p-6 rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-lg font-bold text-white">Door Record Not Found</h1>
          <p className="text-xs text-slate-300">
            {error || `No registered manufacturing record matches serial "${doorId}".`}
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Return to EXMARK ERP
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-900/40 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] tracking-widest uppercase font-bold text-red-500">
              Live QR Tracking & Lifecycle
            </span>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>EXMARK DOORS</span>
              <span className="text-xs font-mono font-normal bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                KERALA
              </span>
            </h1>
            <p className="text-xs text-slate-400">Authentic Composite FRP Door Authentication</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <QrCode className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {successToast && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Door Profile Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Serial Door ID</span>
              <span className="text-lg font-mono font-black text-white">{data.doorId}</span>
              <span className="text-xs text-red-400 font-semibold block">{data.doorNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Job Card Ref</span>
              <span className="text-xs font-mono font-bold text-slate-200">{data.jobCardNumber}</span>
              <span className="text-[10px] font-mono text-slate-400 block">{data.batchNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Finished Size</span>
              <span className="font-mono font-bold text-white block">
                {data.finishedHeightMm} x {data.finishedWidthMm} mm
              </span>
              <span className="text-[10px] font-mono text-slate-400">({data.finishedSizeInches})</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Model & Finish</span>
              <span className="font-semibold text-white block truncate">{data.model}</span>
              <span className="text-[10px] text-red-400">{data.finishColor}</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Handing / Lock</span>
              <span className="font-bold text-white block">{data.handing} Handing</span>
              <span className="text-[10px] text-slate-400 truncate block">{data.lockType}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-400 border-t border-slate-800/80 gap-1">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.customerName} — {data.siteName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>{data.district}, Kerala</span>
            </div>
          </div>
        </div>

        {/* Manufacturing & QC Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            Quality Control & Factory Stage
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Shop Floor Status</span>
                <span className="text-xs font-bold text-white">{data.productionStatus.replace('_', ' ')}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {data.productionStatus}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block">QA Inspection</span>
                <span className="text-xs font-bold text-white">
                  {data.qcStatus === 'PASSED' ? 'Certified QC Passed' : 'Inspection Pending'}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  data.qcStatus === 'PASSED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {data.qcStatus}
              </span>
            </div>
          </div>

          {data.qcInspection && (
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>QA Inspector: {data.qcInspection.inspectorName}</span>
                <span>{new Date(data.qcInspection.inspectedAt).toLocaleString()}</span>
              </div>
              {data.qcInspection.defectType && data.qcInspection.defectType !== 'NONE' && (
                <div className="text-red-400 text-[11px]">
                  Rework Note: {data.qcInspection.reworkNotes || data.qcInspection.defectType}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lifecycle Stepper */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            Door Lifecycle Milestones
          </h2>

          <div className="space-y-3">
            {data.lifecycle.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    step.completed
                      ? 'bg-emerald-600 text-white'
                      : step.current
                      ? 'bg-red-600 text-white ring-4 ring-red-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step.completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${step.completed ? 'text-white' : 'text-slate-400'}`}>
                      {step.name}
                    </span>
                    {step.timestamp && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(step.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temporary QR Sticker Removal Workflow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Temporary Protective QR Sticker Workflow</h2>
              <p className="text-[11px] text-slate-400">
                To prevent paint or adhesive marks, remove this sticker after installation is verified.
              </p>
            </div>
          </div>

          {data.stickerRemovedAt ? (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Protective Sticker Removal Confirmed</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Confirmed by <span className="font-semibold text-white">{data.stickerRemovedBy}</span> on{' '}
                {new Date(data.stickerRemovedAt).toLocaleString()}.
              </p>
              {data.stickerRemovalNotes && (
                <p className="text-[10px] text-slate-400 italic">&ldquo;{data.stickerRemovalNotes}&rdquo;</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleConfirmStickerRemoval} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
              <p className="text-xs text-slate-300">
                Has this door been completely installed at site and surface inspected? Confirm sticker removal below:
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Your Full Name (Technician, Site Supervisor or Customer)"
                  value={confirmedBy}
                  onChange={(e) => setConfirmedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Optional site inspection remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !confirmedBy.trim()}
                className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Confirming Removal...' : 'Confirm Sticker Removed & Surface Checked'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-[10px] text-slate-500">
          EXMARK DOORS • Premium FRP Composite Solutions • ISO Certified Kerala Manufacturing
        </div>
      </div>
    </div>
  );
}
